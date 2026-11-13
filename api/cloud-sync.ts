import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  appendServerSyncLog,
  checkFirestoreHealth,
  FirestoreHealthReport,
  CloudCollectionMap,
  computeAuthorizedServerPrice,
  createSignedOperatorToken,
  decodeProfileMetadata,
  DEFAULT_LAUNCH_CONFIG,
  DeleteDocumentFromFirestoreRest,
  encodeProfileMetadata,
  ensureCloudStoreHydrated,
  extractBearerOrHeaderToken,
  firebaseAuthSignIn,
  firebaseAuthSendPasswordReset,
  firebaseAuthSignUp,
  firebaseAuthUpdateProfile,
  firebaseAuthVerifyIdToken,
  getCloudStore,
  handleNonApprovedPaymentStatusOnServer,
  hashPassword,
  hashSecretPin,
  isMasterAccount,
  isPurgedTestRecord,
  markRegistrationPaidOnServer,
  MASTER_MODERATOR_EMAIL,
  MirrorDocumentToFirestoreRest,
  OFFICIAL_SERVER_LOTS,
  parseJsonSafe,
  parseSafeBody,
  protectMasterAccount,
  PublicLaunchConfig,
  sanitizeMatchForPublic,
  sanitizeRegistrationForPublic,
  sanitizeUserProfileForPublic,
  saveCloudStore,
  USER_ROLE_LEVELS,
  UserRole,
  verifyMasterAdminPassword,
  verifySignedOperatorToken,
} from './_lib/serverStore.js';

const ALLOWED_COLLECTIONS = new Set([
  'registrations',
  'athletes',
  'teams',
  'matches',
  'match_sheets',
  'profiles',
  'users',
  'brackets',
  'posts',
  'post_likes',
  'post_comments',
  'user_follows',
  'user_saves',
  'social_notifications',
]);

function canClientWriteDocument(
  collectionName: string,
  docId: string,
  incoming: Record<string, unknown>,
  existing: Record<string, unknown> | undefined,
  authTokenPayload: ReturnType<typeof verifySignedOperatorToken>
): { allowed: boolean; sanitizedData: Record<string, unknown>; reason?: string } {
  const roleLevel = authTokenPayload?.role
    ? USER_ROLE_LEVELS[authTokenPayload.role as UserRole] || (authTokenPayload.role === 'admin' ? 4 : 0)
    : 0;
  const isAdmin = roleLevel >= 4;
  const isMesarioForMatch =
    (authTokenPayload?.role === 'mesario' || roleLevel >= 4) &&
    (!authTokenPayload?.matchId || authTokenPayload.matchId === docId);

  const nowIso = new Date().toISOString();
  const prevRevision = Number(existing?.revision || 0);
  const incomingRevision = Number(incoming.revision || 0);

  if (
    (collectionName === 'registrations' ||
      collectionName === 'athletes' ||
      collectionName === 'users' ||
      collectionName === 'profiles') &&
    isPurgedTestRecord(incoming)
  ) {
    return {
      allowed: false,
      sanitizedData: {},
      reason: 'Conta de teste bloqueada/expurgada.',
    };
  }

  // ProteÃ§Ã£o contra sobrescrita por cliente desatualizado (Item 10 da Auditoria)
  if (
    existing &&
    prevRevision > 0 &&
    incomingRevision > 0 &&
    incomingRevision < prevRevision
  ) {
    return {
      allowed: false,
      sanitizedData: existing,
      reason: 'VersÃ£o local desatualizada em relaÃ§Ã£o ao servidor.',
    };
  }

  // 1. SÃºmulas e Partidas: exigem Admin ou MesÃ¡rio autenticado para aquela partida
  if (collectionName === 'matches' || collectionName === 'match_sheets') {
    if (!isAdmin && !isMesarioForMatch) {
      return {
        allowed: false,
        sanitizedData: existing || {},
        reason: 'OperaÃ§Ã£o restrita Ã  comissÃ£o ou ao mesÃ¡rio autenticado da partida.',
      };
    }

    // MesÃ¡rio nÃ£o pode alterar a senha da partida
    // ConcorrÃªncia de eventos da sÃºmula: faz uniÃ£o determinÃ­stica por ID de evento para evitar perda de lances simultÃ¢neos
    let mergedEvents = incoming.events;
    if (
      collectionName === 'match_sheets' &&
      Array.isArray(existing?.events) &&
      Array.isArray(incoming.events)
    ) {
      const incomingIds = new Set(
        (incoming.events as Array<{ id?: string }>).map((ev) => String(ev?.id || ''))
      );
      // Se for uma adiÃ§Ã£o normal (tamanho maior ou igual), preserva eventos recentes que possam ter chegado em paralelo
      if (incoming.events.length >= (existing.events as unknown[]).length) {
        const extraFromExisting = (
          existing.events as Array<{ id?: string; createdAtIso?: string }>
        ).filter((ev) => ev?.id && !incomingIds.has(String(ev.id)));
        if (extraFromExisting.length > 0) {
          mergedEvents = [...incoming.events, ...extraFromExisting];
        }
      }
    }

    const merged: Record<string, unknown> = {
      ...(existing || {}),
      ...incoming,
      ...(mergedEvents !== undefined ? { events: mergedEvents } : {}),
      id: docId,
      revision: Math.max(prevRevision + 1, incomingRevision),
      lastUpdatedIso: nowIso,
    };

    if (!isAdmin && existing && 'tableOfficialPassword' in existing) {
      merged.tableOfficialPassword = existing.tableOfficialPassword;
    }

    return { allowed: true, sanitizedData: merged };
  }

  // 2. Equipes: criaÃ§Ã£o/ediÃ§Ã£o de escudo restrita a Admin (ou seed inicial se ainda nÃ£o existir)
  if (collectionName === 'teams') {
    if (existing && !isAdmin) {
      return {
        allowed: false,
        sanitizedData: existing,
        reason: 'Apenas administradores podem editar equipes oficiais.',
      };
    }
    return {
      allowed: true,
      sanitizedData: {
        ...(existing || {}),
        ...incoming,
        id: docId,
        revision: Math.max(prevRevision + 1, incomingRevision),
      },
    };
  }

  // 3. InscriÃ§Ãµes: criaÃ§Ã£o pÃºblica ou ediÃ§Ã£o de perfil social; campos financeiros protegidos!
  if (collectionName === 'registrations') {
    if (!existing) {
      // ValidaÃ§Ã£o de Atleta Convidado (R$ 65,00): restrito Ã  Turma 21, mÃ¡x 1 Masculino e 1 Feminino
      const isGuestAthlete = Boolean(incoming.isGuestAthlete);
      if (isGuestAthlete) {
        const turmaStr = String(incoming.turma || '').trim();
        const teamIdStr = String(incoming.teamId || '').trim().toLowerCase();
        if (turmaStr !== '21' && teamIdStr !== 'sanguinaria') {
          return {
            allowed: false,
            sanitizedData: {},
            reason:
              'A categoria de Atleta Convidado (R$ 65,00) Ã© restrita exclusivamente Ã  Turma 21 (SanguinÃ¡ria).',
          };
        }
        const catStr = String(incoming.categoryName || 'Masculino').trim();
        const store = getCloudStore();
        const existingGuestInGender = Object.values(store.registrations || {}).find(
          (r) =>
            r &&
            String(r.id) !== docId &&
            r.paymentStatus !== 'cancelado' &&
            Boolean(r.isGuestAthlete) &&
            (String(r.turma || '') === '21' || String(r.teamId || '') === 'sanguinaria') &&
            String(r.categoryName || '').toLowerCase() === catStr.toLowerCase()
        );
        if (existingGuestInGender) {
          return {
            allowed: false,
            sanitizedData: {},
            reason: `O limite de 1 Atleta Convidado ${catStr} para a Turma 21 jÃ¡ foi preenchido.`,
          };
        }
      }

      // CriaÃ§Ã£o de nova inscriÃ§Ã£o: calcula preÃ§o no servidor e impede que nasÃ§a como 'pago' ou 'aprovado' sem ser Admin
      const requestedSocio = isGuestAthlete ? false : Boolean(incoming.requestedMemberDiscount);
      const safeMemberStatus = isAdmin
        ? String(incoming.memberStatus || (requestedSocio ? 'pendente' : 'nao_solicitado'))
        : requestedSocio
        ? 'pendente'
        : 'nao_solicitado';

      const safePaymentStatus = isAdmin
        ? String(incoming.paymentStatus || (requestedSocio ? 'aguardando_validacao' : 'pendente'))
        : requestedSocio
        ? 'aguardando_validacao'
        : 'pendente';

      const serverPrice = computeAuthorizedServerPrice(
        String(incoming.lotId || 'lote-1-cangaceira'),
        safeMemberStatus,
        requestedSocio,
        isGuestAthlete
      );

      const rawAccountPassword =
        typeof incoming.accountPassword === 'string' && incoming.accountPassword.trim()
          ? incoming.accountPassword.trim()
          : '';
      const accountPasswordHash = rawAccountPassword
        ? hashSecretPin(rawAccountPassword)
        : typeof incoming.accountPasswordHash === 'string'
        ? incoming.accountPasswordHash
        : undefined;
      const { accountPassword: _omitRawPass, ...safeIncoming } = incoming;

      return {
        allowed: true,
        sanitizedData: {
          ...safeIncoming,
          id: docId,
          accountUsername:
            typeof incoming.accountUsername === 'string' && incoming.accountUsername.trim()
              ? incoming.accountUsername.trim().toLowerCase()
              : String(incoming.athleteEmail || '').trim().toLowerCase(),
          ...(accountPasswordHash ? { accountPasswordHash } : {}),
          hasAccountPassword: Boolean(accountPasswordHash),
          isGuestAthlete,
          requestedMemberDiscount: requestedSocio,
          memberStatus: safeMemberStatus,
          paymentStatus: safePaymentStatus,
          authorizedPrice: serverPrice,
          revision: 1,
          updatedAtIso: nowIso,
        },
      };
    }

    // AtualizaÃ§Ã£o de inscriÃ§Ã£o jÃ¡ existente:
    if (isAdmin) {
      const nextMemberStatus = String(incoming.memberStatus || existing.memberStatus || 'nao_solicitado');
      const isGuest = Boolean(incoming.isGuestAthlete ?? existing.isGuestAthlete);
      const serverPrice = computeAuthorizedServerPrice(
        String(incoming.lotId || existing.lotId || 'lote-1-cangaceira'),
        nextMemberStatus,
        Boolean(incoming.requestedMemberDiscount ?? existing.requestedMemberDiscount),
        isGuest
      );

      return {
        allowed: true,
        sanitizedData: {
          ...existing,
          ...incoming,
          id: docId,
          isGuestAthlete: isGuest,
          authorizedPrice: serverPrice,
          revision: Math.max(prevRevision + 1, incomingRevision),
          updatedAtIso: nowIso,
        },
      };
    }

    // Cliente comum sÃ³ pode atualizar seus campos de perfil social (foto, camisa, posiÃ§Ã£o, bio, modalidades)
    // Nunca pode promover `paymentStatus` para `'pago'` nem `memberStatus` para `'aprovado'` nem reduzir `authorizedPrice`
    return {
      allowed: true,
      sanitizedData: {
        ...existing,
        athleteName: incoming.athleteName ?? existing.athleteName,
        avatarUrl: incoming.avatarUrl !== undefined ? incoming.avatarUrl : existing.avatarUrl,
        jerseyNumber: incoming.jerseyNumber !== undefined ? incoming.jerseyNumber : existing.jerseyNumber,
        position: incoming.position !== undefined ? incoming.position : existing.position,
        bio: incoming.bio !== undefined ? incoming.bio : existing.bio,
        instagramHandle:
          incoming.instagramHandle !== undefined
            ? incoming.instagramHandle
            : existing.instagramHandle,
        selectedModalities:
          incoming.selectedModalities !== undefined
            ? incoming.selectedModalities
            : existing.selectedModalities,
        // Preserva campos financeiros selados pelo servidor
        paymentStatus: existing.paymentStatus,
        memberStatus: existing.memberStatus,
        authorizedPrice: existing.authorizedPrice,
        mpPaymentId: existing.mpPaymentId,
        paidAtIso: existing.paidAtIso,
        revision: prevRevision + 1,
        updatedAtIso: nowIso,
      },
    };
  }

  // 4. Atletas: permite criar/atualizar perfil social do atleta, preservando status financeiro real
  if (collectionName === 'athletes') {
    const regId = String(incoming.registrationId || existing?.registrationId || '');
    const store = getCloudStore();
    const linkedReg = regId ? store.registrations[regId] : undefined;

    return {
      allowed: true,
      sanitizedData: {
        ...(existing || {}),
        ...incoming,
        id: docId,
        paymentStatus: linkedReg?.paymentStatus ?? existing?.paymentStatus ?? incoming.paymentStatus,
        memberStatus: linkedReg?.memberStatus ?? existing?.memberStatus ?? incoming.memberStatus,
        revision: Math.max(prevRevision + 1, incomingRevision),
        updatedAtIso: nowIso,
      },
    };
  }

  // 5. Perfis PÃºblicos: permite criaÃ§Ã£o/atualizaÃ§Ã£o de perfil de participante/usuÃ¡rio
  if (collectionName === 'profiles') {
    return {
      allowed: true,
      sanitizedData: {
        ...(existing || {}),
        ...incoming,
        id: docId,
        userId: String(incoming.userId || docId),
        revision: Math.max(prevRevision + 1, incomingRevision),
        updatedAtIso: nowIso,
      },
    };
  }

  // 6. ColeÃ§Ãµes Sociais (posts, likes, comments, follows, saves, notifications)
  if (
    collectionName === 'posts' ||
    collectionName === 'post_likes' ||
    collectionName === 'post_comments' ||
    collectionName === 'user_follows' ||
    collectionName === 'user_saves' ||
    collectionName === 'social_notifications'
  ) {
    if (!authTokenPayload) {
      return { allowed: false, sanitizedData: {}, reason: 'AutenticaÃ§Ã£o necessÃ¡ria para operaÃ§Ãµes sociais.' };
    }
    return {
      allowed: true,
      sanitizedData: {
        ...(existing || {}),
        ...incoming,
        id: docId,
        revision: Math.max(prevRevision + 1, incomingRevision),
        updatedAtIso: nowIso,
      },
    };
  }

  return { allowed: false, sanitizedData: {}, reason: 'ColeÃ§Ã£o nÃ£o autorizada.' };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Intramed-Token'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const isForceHydrate = req.query.force === 'true';
  const store = await ensureCloudStoreHydrated(isForceHydrate);
  const rawToken = extractBearerOrHeaderToken(req.headers as Record<string, unknown>);
  const verifiedToken = verifySignedOperatorToken(rawToken);
  const operatorRoleLevel = verifiedToken?.role
    ? USER_ROLE_LEVELS[verifiedToken.role as UserRole] || (verifiedToken.role === 'admin' ? 4 : 0)
    : 0;
  const isAdminRequest = operatorRoleLevel >= 4;
  const isMasterRequest = verifiedToken?.role === 'moderador_master' || operatorRoleLevel >= 5;

  // GET: Retorna snapshot sincronizado (com suporte a ?since=updatedAtIso, ?force=true e projeÃ§Ã£o LGPD sem PII/senhas)
  if (req.method === 'GET') {
    const isForce = req.query.force === 'true';
    const sinceParam = typeof req.query.since === 'string' ? req.query.since : null;
    if (!isForce && sinceParam && sinceParam === store.updatedAtIso) {
      return res.status(200).json({
        success: true,
        notModified: true,
        updatedAtIso: store.updatedAtIso,
      });
    }

    const normalizeRegServerPrice = (reg: Record<string, unknown>) => {
      if (reg.paymentStatus === 'pago') return reg;
      const expected = computeAuthorizedServerPrice(
        String(reg.lotId || 'lote-1-cangaceira'),
        String(reg.memberStatus || 'nao_solicitado'),
        Boolean(reg.requestedMemberDiscount),
        Boolean(reg.isGuestAthlete)
      );
      return { ...reg, authorizedPrice: expected };
    };

    const launchConfig: PublicLaunchConfig = store.launch_config || DEFAULT_LAUNCH_CONFIG;
    const isPublicProfilesVisible = Boolean(launchConfig.publicProfilesVisible || isAdminRequest);
    const isPublicPricesVisible = Boolean(launchConfig.publicPricesVisible || isAdminRequest);

    const rawRegistrations = Object.values(store.registrations).filter(
      (r) => !isPurgedTestRecord(r)
    );

    const publicRegistrations = isPublicProfilesVisible
      ? (isAdminRequest
          ? rawRegistrations.map((r) => normalizeRegServerPrice(r))
          : rawRegistrations.map((r) =>
              sanitizeRegistrationForPublic(normalizeRegServerPrice(r))
            ))
      : (isAdminRequest
          ? rawRegistrations.map((r) => normalizeRegServerPrice(r))
          : []);

    // Atletas e elencos do torneio oficial sÃ£o informaÃ§Ãµes esportivas pÃºblicas da competiÃ§Ã£o
    // e devem ser entregues a todos os dispositivos (celular e desktop) para evitar silos locais
    const publicAthletes = Object.values(store.athletes).filter(
      (a) => !isPurgedTestRecord(a)
    );

    // Perfis pÃºblicos sanitizados (sem senhas, CPF ou telefone) para descoberta da comunidade e dados do usuÃ¡rio
    const publicProfiles = Object.values(store.profiles || {})
      .filter((p) => !isPurgedTestRecord(p))
      .map(sanitizeUserProfileForPublic);

    const publicMatches = Object.values(store.matches).map((m) =>
      sanitizeMatchForPublic(m, isAdminRequest)
    );

    const sanitizedLots = Object.entries(OFFICIAL_SERVER_LOTS).reduce(
      (acc, [lotKey, lotVal]) => {
        acc[lotKey] = {
          ...lotVal,
          priceMember: isPublicPricesVisible ? lotVal.priceMember : null,
          priceNonMember: isPublicPricesVisible ? lotVal.priceNonMember : null,
          priceGuest: isPublicPricesVisible ? lotVal.priceGuest ?? 65.0 : null,
        };
        return acc;
      },
      {} as Record<string, any>
    );

    const firestoreHealth = await checkFirestoreHealth(req.query.refreshDiagnostics === 'true');

    return res.status(200).json({
      success: true,
      updatedAtIso: store.updatedAtIso,
      launchConfig,
      registrations: publicRegistrations,
      athletes: publicAthletes,
      teams: Object.values(store.teams),
      matches: publicMatches,
      match_sheets: Object.values(store.match_sheets),
      profiles: publicProfiles,
      posts: Object.values(store.posts || {}),
      brackets: store.brackets || {},
      lots: sanitizedLots,
      syncLogs: isAdminRequest ? store.sync_logs || [] : [],
      diagnostics: {
        firebaseProjectId: 'gen-lang-client-0847910166',
        firebaseAuthStatus: 'operational',
        firestore: firestoreHealth,
        multiDeviceSync: 'active',
        serverStoreCounts: {
          matches: Object.keys(store.matches).length,
          brackets: Object.keys(store.brackets || {}).length,
          teams: Object.keys(store.teams).length,
          athletes: Object.keys(store.athletes).length,
          profiles: Object.keys(store.profiles || {}).length,
          registrations: Object.keys(store.registrations).length,
          users: Object.keys(store.users || {}).length,
        },
        cacheVersion: '2.2.0-centralized-firebase',
      },
    });
  }

  if (req.method === 'POST') {
    const body = parseSafeBody(req.body);
    const { action, collectionName, docId, data, batch } = body;

    // AÃ‡ÃƒO 1: AutenticaÃ§Ã£o no Servidor para Admin ou MesÃ¡rio (Itens 4 e 8 da Auditoria)
    if (action === 'verify_operator_pin') {
      const passwordInput = String(body.password || '').trim();
      const matchId = body.matchId ? String(body.matchId).trim() : undefined;
      const officialName = body.officialName ? String(body.officialName).trim() : undefined;

      if (!passwordInput) {
        return res.status(400).json({ ok: false, error: 'Informe a senha de acesso.' });
      }

      // 1a. Senha mestra da ComissÃ£o Organizadora
      if (verifyMasterAdminPassword(passwordInput)) {
        const token = createSignedOperatorToken({
          role: 'admin',
          officialName: officialName || 'ComissÃ£o Organizadora',
        });
        return res.status(200).json({
          ok: true,
          role: 'admin',
          token,
        });
      }

      // 1b. Senha individual do MesÃ¡rio da Partida
      if (matchId) {
        const secretEntry = store.match_secrets[matchId];
        const matchDoc = store.matches[matchId];
        const fallbackPin = String(
          matchDoc?.tableOfficialPassword || body.expectedClientPin || ''
        ).trim();

        const inputHash = hashSecretPin(passwordInput);
        const matchesStoredSecret =
          secretEntry && secretEntry.pinHash === inputHash;
        const matchesFallbackPin =
          fallbackPin &&
          fallbackPin.toLowerCase() === passwordInput.toLowerCase();

        if (matchesStoredSecret || matchesFallbackPin) {
          // Se estava apenas no fallback, promove para hash secreto
          if (!secretEntry && fallbackPin) {
            store.match_secrets[matchId] = {
              pinHash: hashSecretPin(fallbackPin),
              pinDisplay: fallbackPin,
              updatedAtIso: new Date().toISOString(),
            };
          }

          if (officialName && store.match_sheets[matchId]) {
            store.match_sheets[matchId] = {
              ...store.match_sheets[matchId],
              tableOfficialName: officialName,
              lastUpdatedIso: new Date().toISOString(),
            };
          }

          saveCloudStore(store);

          const token = createSignedOperatorToken({
            role: 'mesario',
            matchId,
            officialName: officialName || 'MesÃ¡rio Oficial',
          });

          return res.status(200).json({
            ok: true,
            role: 'mesario',
            matchId,
            token,
          });
        }

        return res.status(401).json({
          ok: false,
          error: 'Senha da partida incorreta. Confira o cÃ³digo com a comissÃ£o organizadora.',
        });
      }

      return res.status(401).json({
        ok: false,
        error: 'Senha administrativa incorreta.',
      });
    }

    // AÃ‡ÃƒO 2: Definir / Atualizar Senha do MesÃ¡rio de uma Partida (Restrito a Admin)
    if (action === 'set_match_pin') {
      if (!isAdminRequest) {
        return res.status(403).json({
          ok: false,
          error: 'Apenas administradores autenticados podem alterar a senha do mesÃ¡rio.',
        });
      }
      const matchId = String(body.matchId || '').trim();
      const newPin = String(body.newPin || '').trim().toUpperCase();
      if (!matchId || !newPin) {
        return res.status(400).json({ ok: false, error: 'Partida e nova senha sÃ£o obrigatÃ³rias.' });
      }

      store.match_secrets[matchId] = {
        pinHash: hashSecretPin(newPin),
        pinDisplay: newPin,
        updatedAtIso: new Date().toISOString(),
      };
      if (store.matches[matchId]) {
        store.matches[matchId] = {
          ...store.matches[matchId],
          tableOfficialPassword: newPin,
          revision: Number(store.matches[matchId].revision || 0) + 1,
        };
      }
      saveCloudStore(store);
      return res.status(200).json({ ok: true, matchId });
    }

    // AÃ‡ÃƒO 2B: Login da Conta do Atleta (UsuÃ¡rio/E-mail + Senha criada no cadastro)
    if (action === 'athlete_login') {
      const identifierInput = String(body.identifier || '')
        .trim()
        .toLowerCase();
      const passwordInput = String(body.password || '').trim();
      const cleanDocInput = identifierInput.replace(/\D/g, '');

      if (!identifierInput) {
        return res
          .status(400)
          .json({ ok: false, error: 'Informe seu usuÃ¡rio ou e-mail.' });
      }

      const allRegs = Object.values(store.registrations);
      const matchedReg = allRegs.find((r) => {
        const email = String(r.athleteEmail || '')
          .trim()
          .toLowerCase();
        const username = String(r.accountUsername || '')
          .trim()
          .toLowerCase();
        const docClean = String(r.athleteDocument || '').replace(/\D/g, '');
        return (
          email === identifierInput ||
          (username && username === identifierInput) ||
          (cleanDocInput.length >= 6 && docClean === cleanDocInput)
        );
      });

      if (!matchedReg) {
        return res.status(404).json({
          ok: false,
          error: 'Conta nÃ£o encontrada no servidor.',
        });
      }

      const storedHash = String(matchedReg.accountPasswordHash || '');
      if (!storedHash) {
        return res.status(401).json({
          ok: false,
          error: 'Esta inscriÃ§Ã£o ainda nÃ£o possui senha configurada. Crie uma senha no cadastro ou contate a organizaÃ§Ã£o.',
        });
      }

      const inputPinHash = hashSecretPin(passwordInput);
      const inputPassHash = hashPassword(passwordInput);
      const isAthletePassValid =
        passwordInput && (inputPinHash === storedHash || inputPassHash === storedHash);

      if (!isAthletePassValid) {
        return res.status(401).json({
          ok: false,
          error: 'Senha incorreta para esta conta.',
        });
      }

      return res.status(200).json({
        ok: true,
        registration: sanitizeRegistrationForPublic(matchedReg),
      });
    }

    // AÃ‡ÃƒO 2C-1: Cadastro Real de UsuÃ¡rio e Perfil Social (/api/cloud-sync -> register_user)
    if (action === 'register_user') {
      const nameInput = String(body.name || '').trim();
      const emailInput = String(body.email || '').trim().toLowerCase();
      const passwordInput = String(body.password || '').trim();
      const turmaInput = String(body.turma || '').trim();
      const turmaLabelInput = String(body.turmaLabel || '').trim();
      const teamIdInput = String(body.teamId || '').trim();
      const teamNameInput = String(body.teamName || '').trim();
      const bioInput = String(body.bio || '').trim();
      const instagramInput = String(body.instagramHandle || '').trim();
      const avatarUrlInput = body.avatarUrl && typeof body.avatarUrl === 'string' ? body.avatarUrl : null;

      if (!nameInput || nameInput.length < 2) {
        return res.status(400).json({ ok: false, error: 'Nome completo deve possuir no mÃ­nimo 2 caracteres.' });
      }

      if (!emailInput || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(emailInput)) {
        return res.status(400).json({ ok: false, error: 'E-mail informado possui formato invÃ¡lido.' });
      }

      if (!passwordInput || passwordInput.length < 6) {
        return res.status(400).json({ ok: false, error: 'A senha de acesso deve possuir no mÃ­nimo 6 caracteres.' });
      }

      if (!store.users) store.users = {};
      if (!store.profiles) store.profiles = {};

      // 1. Cria a conta no provedor central de autenticaÃ§Ã£o (Firebase Auth)
      let authResult = await firebaseAuthSignUp(emailInput, passwordInput);
      let recoveredOrphanAccount = false;
      if (!authResult.ok && authResult.error?.includes('JÃ¡ existe')) {
        // RecuperaÃ§Ã£o: o e-mail jÃ¡ existe no Firebase Auth (cadastro anterior interrompido,
        // registro apagado do banco ou login Google prÃ©vio). Se a senha confere, reconcilia e entra.
        const signInAttempt = await firebaseAuthSignIn(emailInput, passwordInput);
        if (signInAttempt.ok && signInAttempt.user) {
          authResult = { ok: true, user: signInAttempt.user };
          recoveredOrphanAccount = true;
        } else {
          return res.status(409).json({
            ok: false,
            code: 'EMAIL_EXISTS',
            error:
              'Este e-mail jÃ¡ possui cadastro (via Google ou tentativa anterior). Use "Continuar com o Google", entre pela aba "Entrar" ou toque em "Esqueci minha senha" para redefinir.',
          });
        }
      }
      if (!authResult.ok) {
        return res.status(authResult.error?.includes('JÃ¡ existe') ? 409 : 400).json({
          ok: false,
          error: authResult.error || 'NÃ£o foi possÃ­vel cadastrar a conta no provedor central de autenticaÃ§Ã£o.',
        });
      }

      const firebaseUid = authResult.user?.localId || `usr_${Date.now()}`;
      const userId = firebaseUid;
      const nowIso = new Date().toISOString();

      // Procura se o usuÃ¡rio jÃ¡ possui inscriÃ§Ã£o no evento
      const existingReg = Object.values(store.registrations).find(
        (r) => String(r.athleteEmail || '').trim().toLowerCase() === emailInput
      );

      const role: UserRole = existingReg && existingReg.paymentStatus === 'pago' ? 'atleta' : 'visitante';
      const linkedAthleteId = existingReg ? (existingReg.linkedAthleteId as string) || `ath-${existingReg.id}` : null;

      // 2. Empacota e persiste os metadados do perfil no provedor central
      const profileMetadataPayload = {
        userId,
        turma: turmaInput || (existingReg?.turma as string) || null,
        turmaLabel: turmaLabelInput || (existingReg?.turmaLabel as string) || null,
        teamId: teamIdInput || (existingReg?.teamId as string) || null,
        teamName: teamNameInput || (existingReg?.teamName as string) || null,
        bio: bioInput || (existingReg?.bio as string) || null,
        instagramHandle: instagramInput || (existingReg?.instagramHandle as string) || null,
        role,
        linkedAthleteId,
      };
      const encodedMetadata = encodeProfileMetadata(profileMetadataPayload);

      if (authResult.user?.idToken) {
        void firebaseAuthUpdateProfile({
          idToken: authResult.user.idToken,
          displayName: nameInput,
          photoUrl: encodedMetadata,
        });
      }

      const userRecord = {
        id: userId,
        email: emailInput,
        name: nameInput,
        passwordHash: hashPassword(passwordInput),
        role,
        linkedAthleteId,
        registrationId: existingReg ? existingReg.id : null,
        isActive: true,
        mustChangePassword: false,
        createdAtIso: nowIso,
        updatedAtIso: nowIso,
        lastLoginAtIso: nowIso,
      };

      const profileRecord = {
        id: userId,
        userId,
        displayName: nameInput,
        avatarUrl: avatarUrlInput || (existingReg?.avatarUrl as string) || null,
        turma: turmaInput || (existingReg?.turma as string) || null,
        turmaLabel: turmaLabelInput || (existingReg?.turmaLabel as string) || null,
        teamId: teamIdInput || (existingReg?.teamId as string) || null,
        teamName: teamNameInput || (existingReg?.teamName as string) || null,
        bio: bioInput || (existingReg?.bio as string) || null,
        instagramHandle: instagramInput || (existingReg?.instagramHandle as string) || null,
        isAthlete: Boolean(linkedAthleteId),
        linkedAthleteId,
        favoriteModalityIds: [],
        createdAtIso: nowIso,
        updatedAtIso: nowIso,
      };

      store.users[userId] = userRecord;
      store.users[emailInput] = userRecord;
      if (recoveredOrphanAccount && store.profiles[userId]) {
        // Conta recuperada: preserva dados de perfil jÃ¡ existentes (foto, bio, turma editadas)
        const prevProfile = store.profiles[userId] as Record<string, unknown>;
        for (const [key, val] of Object.entries(prevProfile)) {
          if (val !== null && val !== undefined && val !== '') {
            (profileRecord as Record<string, unknown>)[key] = val;
          }
        }
        profileRecord.updatedAtIso = nowIso;
      }
      store.profiles[userId] = profileRecord;
      store.updatedAtIso = nowIso;

      saveCloudStore(store);
      await MirrorDocumentToFirestoreRest('users', userId, userRecord);
      await MirrorDocumentToFirestoreRest('profiles', userId, profileRecord);

      // Emite token assinado seguro
      const token = createSignedOperatorToken({
        role,
        email: emailInput,
        officialName: nameInput,
        userId,
        mustChangePassword: false,
      });

      return res.status(201).json({
        ok: true,
        token,
        user: {
          id: userId,
          email: emailInput,
          name: nameInput,
          role,
          linkedAthleteId,
        },
        profile: sanitizeUserProfileForPublic(profileRecord),
      });
    }

    // AÃ‡ÃƒO 2C-1B: Login / Cadastro Unificado com Conta Google (/api/cloud-sync -> google_login)
    if (action === 'google_login') {
      const idTokenInput = String(body.idToken || '').trim();
      if (!idTokenInput) {
        return res.status(400).json({ ok: false, error: 'Token de autenticaÃ§Ã£o do Google ausente.' });
      }

      const verifyRes = await firebaseAuthVerifyIdToken(idTokenInput);
      if (!verifyRes.ok || !verifyRes.user) {
        return res.status(401).json({
          ok: false,
          error: verifyRes.error || 'NÃ£o foi possÃ­vel validar sua conta Google junto ao Firebase.',
        });
      }

      if (!store.users) store.users = {};
      if (!store.profiles) store.profiles = {};

      const fbUser = verifyRes.user;
      const userId = fbUser.localId;
      const userEmail = String(fbUser.email || body.email || '').trim().toLowerCase();
      const nowIso = new Date().toISOString();

      const existingUser = store.users[userId] || (userEmail ? store.users[userEmail] : undefined);
      const existingProfile = store.profiles[userId] || (existingUser?.id ? store.profiles[String(existingUser.id)] : undefined);

      const userName =
        String(existingUser?.name || fbUser.displayName || body.displayName || userEmail.split('@')[0] || 'Participante IntraMed').trim();

      const googleAvatar =
        (existingProfile?.avatarUrl as string) ||
        fbUser.photoUrl ||
        (typeof body.photoUrl === 'string' && body.photoUrl ? body.photoUrl : null);

      const existingReg = Object.values(store.registrations).find(
        (r) => userEmail && String(r.athleteEmail || '').trim().toLowerCase() === userEmail
      );

      let userRole: UserRole = (existingUser?.role as UserRole) || 'visitante';
      if (isMasterAccount(userEmail)) {
        userRole = 'moderador_master';
      } else if (store.admin_users?.[userEmail]?.role) {
        userRole = store.admin_users[userEmail].role as UserRole;
      } else if (existingReg && existingReg.paymentStatus === 'pago') {
        userRole = 'atleta';
      }

      const linkedAthleteId =
        (existingUser?.linkedAthleteId as string) ||
        (existingProfile?.linkedAthleteId as string) ||
        (existingReg ? (existingReg.linkedAthleteId as string) || `ath-${existingReg.id}` : null);

      const userRecord: Record<string, unknown> = {
        ...(existingUser || {}),
        id: userId,
        email: userEmail,
        name: userName,
        authProvider: 'google',
        role: userRole,
        linkedAthleteId,
        registrationId: existingReg ? existingReg.id : existingUser?.registrationId || null,
        isActive: true,
        mustChangePassword: false,
        createdAtIso: existingUser?.createdAtIso || nowIso,
        updatedAtIso: nowIso,
        lastLoginAtIso: nowIso,
      };

      const profileRecord: Record<string, unknown> = {
        ...(existingProfile || {}),
        id: userId,
        userId,
        displayName: (existingProfile?.displayName as string) || userName,
        avatarUrl: googleAvatar,
        turma: existingProfile?.turma || (existingReg?.turma as string) || (body.turma as string) || null,
        turmaLabel: existingProfile?.turmaLabel || (existingReg?.turmaLabel as string) || (body.turmaLabel as string) || null,
        teamId: existingProfile?.teamId || (existingReg?.teamId as string) || (body.teamId as string) || null,
        teamName: existingProfile?.teamName || (existingReg?.teamName as string) || (body.teamName as string) || null,
        bio: existingProfile?.bio || (existingReg?.bio as string) || null,
        instagramHandle: existingProfile?.instagramHandle || (existingReg?.instagramHandle as string) || null,
        role: userRole,
        isAthlete: userRole === 'atleta' || Boolean(existingReg && existingReg.paymentStatus === 'pago'),
        linkedAthleteId,
        favoriteModalityIds: existingProfile?.favoriteModalityIds || [],
        createdAtIso: existingProfile?.createdAtIso || nowIso,
        updatedAtIso: nowIso,
      };

      store.users[userId] = userRecord;
      if (userEmail) {
        store.users[userEmail] = userRecord;
      }
      store.profiles[userId] = profileRecord;
      store.updatedAtIso = nowIso;

      saveCloudStore(store);
      await MirrorDocumentToFirestoreRest('users', userId, userRecord);
      await MirrorDocumentToFirestoreRest('profiles', userId, profileRecord);

      const token = createSignedOperatorToken({
        role: userRole,
        email: userEmail,
        officialName: userName,
        userId,
        mustChangePassword: false,
      });

      return res.status(200).json({
        ok: true,
        token,
        isNewUser: !existingUser,
        user: {
          id: userId,
          email: userEmail,
          name: userName,
          role: userRole,
          linkedAthleteId,
        },
        profile: sanitizeUserProfileForPublic(profileRecord),
      });
    }

    // AÃ‡ÃƒO 2C-2: Login Unificado (/api/cloud-sync -> user_login)
    if (action === 'user_login') {
      const identifierInput = String(body.email || body.identifier || '').trim().toLowerCase();
      const passwordInput = String(body.password || '').trim();

      if (!identifierInput || !passwordInput) {
        return res.status(400).json({ ok: false, error: 'E-mail e senha sÃ£o obrigatÃ³rios.' });
      }

      if (!store.users) store.users = {};
      if (!store.profiles) store.profiles = {};

      // 1. AutenticaÃ§Ã£o prioritÃ¡ria contra o provedor central (Firebase Auth)
      const authLoginRes = await firebaseAuthSignIn(identifierInput, passwordInput);
      if (authLoginRes.ok && authLoginRes.user) {
        const authUser = authLoginRes.user;
        const userId = authUser.localId;
        const userEmail = authUser.email;
        const userName = authUser.displayName || identifierInput.split('@')[0];
        const meta = decodeProfileMetadata(authUser.photoUrl);

        // Auto-reconciliaÃ§Ã£o: se o container serverless da Vercel foi reciclado, restaura o usuÃ¡rio e perfil
        const existingUser = store.users[userId] || store.users[userEmail];
        if (existingUser && existingUser.isActive === false) {
          return res.status(403).json({
            ok: false,
            error: 'Esta conta foi desativada pela diretoria da A.A.A. Cangaceira. Entre em contato com a organizaÃ§Ã£o.',
          });
        }
        const userRole: UserRole = (existingUser?.role as UserRole) || (meta?.role as UserRole) || 'visitante';
        const linkedAthleteId = (existingUser?.linkedAthleteId as string) || (meta?.linkedAthleteId as string) || null;

        const userRecord = {
          ...(existingUser || {}),
          id: userId,
          email: userEmail,
          name: userName,
          passwordHash: hashPassword(passwordInput),
          role: userRole,
          linkedAthleteId,
          isActive: true,
          mustChangePassword: false,
          createdAtIso: existingUser?.createdAtIso || new Date().toISOString(),
          updatedAtIso: new Date().toISOString(),
          lastLoginAtIso: new Date().toISOString(),
        };

        const existingProfile = store.profiles[userId];
        const profileRecord = {
          id: userId,
          userId,
          displayName: (existingProfile?.displayName as string) || userName,
          avatarUrl: existingProfile?.avatarUrl || null,
          turma: existingProfile?.turma || (meta?.turma as string) || null,
          turmaLabel: existingProfile?.turmaLabel || (meta?.turmaLabel as string) || null,
          teamId: existingProfile?.teamId || (meta?.teamId as string) || null,
          teamName: existingProfile?.teamName || (meta?.teamName as string) || null,
          bio: existingProfile?.bio || (meta?.bio as string) || null,
          instagramHandle: existingProfile?.instagramHandle || (meta?.instagramHandle as string) || null,
          isAthlete: Boolean(linkedAthleteId),
          linkedAthleteId,
          favoriteModalityIds: existingProfile?.favoriteModalityIds || [],
          createdAtIso: existingProfile?.createdAtIso || new Date().toISOString(),
          updatedAtIso: new Date().toISOString(),
        };

        store.users[userId] = userRecord;
        store.users[userEmail] = userRecord;
        store.profiles[userId] = profileRecord;
        saveCloudStore(store);
        await MirrorDocumentToFirestoreRest('users', userId, userRecord);
        await MirrorDocumentToFirestoreRest('profiles', userId, profileRecord);

        const token = createSignedOperatorToken({
          role: userRole,
          email: userEmail,
          officialName: userName,
          userId,
          mustChangePassword: false,
        });

        return res.status(200).json({
          ok: true,
          token,
          user: {
            id: userId,
            email: userEmail,
            name: userName,
            role: userRole,
            linkedAthleteId,
          },
          profile: sanitizeUserProfileForPublic(profileRecord),
        });
      }

      // 2. Fallback para contas locais / administrativas
      const inputHash = hashPassword(passwordInput);
      const inputPinHash = hashSecretPin(passwordInput);

      // Busca em users existentes
      const foundUser = store.users[identifierInput] || Object.values(store.users).find((u) => u.email === identifierInput);
      if (foundUser) {
        const storedHash = String(foundUser.passwordHash || '');
        if (storedHash === inputHash) {
          const userId = String(foundUser.id);
          const userName = String(foundUser.name);
          const userEmail = String(foundUser.email);
          const userRole = (foundUser.role as UserRole) || 'visitante';
          const profileRecord = store.profiles[userId] || {
            id: userId,
            userId,
            displayName: userName,
            turma: null,
            turmaLabel: null,
            teamId: null,
            teamName: null,
            bio: null,
            instagramHandle: null,
            isAthlete: false,
            favoriteModalityIds: [],
            createdAtIso: new Date().toISOString(),
            updatedAtIso: new Date().toISOString(),
          };

          const token = createSignedOperatorToken({
            role: userRole,
            email: userEmail,
            officialName: userName,
            userId,
            mustChangePassword: false,
          });

          return res.status(200).json({
            ok: true,
            token,
            user: {
              id: userId,
              email: userEmail,
              name: userName,
              role: userRole,
              linkedAthleteId: foundUser.linkedAthleteId || null,
            },
            profile: sanitizeUserProfileForPublic(profileRecord),
          });
        }
      }

      // Busca em admin_users
      const adminFound = adminUsers[identifierInput];
      if (adminFound) {
        const storedHash = String(adminFound.passwordHash || '');
        const isInitial = Boolean(adminFound.mustChangePassword) && passwordInput === 'campeao2027';
        if (storedHash === inputHash || isInitial) {
          const userId = String(adminFound.id || 'usr_master_cangaceira');
          const userName = String(adminFound.name || 'AtlÃ©tica Cangaceira');
          const userEmail = String(adminFound.email || identifierInput);
          const userRole = (adminFound.role as UserRole) || 'moderador_master';

          const token = createSignedOperatorToken({
            role: userRole,
            email: userEmail,
            officialName: userName,
            userId,
            mustChangePassword: Boolean(adminFound.mustChangePassword),
          });

          return res.status(200).json({
            ok: true,
            token,
            role: userRole,
            mustChangePassword: Boolean(adminFound.mustChangePassword),
            user: {
              id: userId,
              email: userEmail,
              name: userName,
              role: userRole,
            },
          });
        }
      }

      // Se falhou no Firebase Auth e nas credenciais do servidor, rejeita com 401
      return res.status(401).json({ ok: false, error: 'E-mail ou senha incorreto.' });
    }

    // AÃ‡ÃƒO 2C-3: AlteraÃ§Ã£o de Senha do UsuÃ¡rio (/api/cloud-sync -> change_user_password)
    if (action === 'change_user_password') {
      const emailInput = String(body.email || verifiedToken?.email || '').trim().toLowerCase();
      const currentPassword = String(body.currentPassword || '').trim();
      const newPassword = String(body.newPassword || '').trim();

      if (!emailInput) {
        return res.status(400).json({ ok: false, error: 'IdentificaÃ§Ã£o de usuÃ¡rio necessÃ¡ria.' });
      }

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ ok: false, error: 'A nova senha deve possuir no mÃ­nimo 6 caracteres.' });
      }

      const users = store.users || {};
      const user = users[emailInput] || Object.values(users).find((u) => u.email === emailInput);

      if (!user) {
        return res.status(404).json({ ok: false, error: 'Conta de usuÃ¡rio nÃ£o localizada no servidor.' });
      }

      // Se nÃ£o hÃ¡ token vÃ¡lido jÃ¡ autenticado, exige a senha atual
      if (!verifiedToken?.email) {
        if (!currentPassword) {
          return res.status(401).json({ ok: false, error: 'Informe a senha atual para autorizar a redefiniÃ§Ã£o.' });
        }
        const currHash = hashPassword(currentPassword);
        if (currHash !== user.passwordHash) {
          return res.status(401).json({ ok: false, error: 'Senha atual incorreta.' });
        }
      }

      user.passwordHash = hashPassword(newPassword);
      user.updatedAtIso = new Date().toISOString();
      saveCloudStore(store);

      await MirrorDocumentToFirestoreRest('users', String(user.id), user);
      if (user.email) {
        await MirrorDocumentToFirestoreRest('users', String(user.email), user);
      }

      return res.status(200).json({ ok: true, message: 'Senha atualizada com sucesso no banco de dados!' });
    }

    // AÃ‡ÃƒO 2C-4: AtualizaÃ§Ã£o de Perfil Social (/api/cloud-sync -> update_user_profile)
    if (action === 'reset_password') {
      const emailInput = String(body.email || '').trim().toLowerCase();
      if (!emailInput || !emailInput.includes('@')) {
        return res.status(400).json({ ok: false, error: 'Informe um e-mail válido.' });
      }
      const resetRes = await firebaseAuthSendPasswordReset(emailInput);
      if (!resetRes.ok) {
        return res.status(400).json({
          ok: false,
          error: resetRes.error || 'Não foi possível enviar o e-mail de redefinição.',
        });
      }
      return res.status(200).json({
        ok: true,
        message: `E-mail de redefinição enviado para ${emailInput}. Verifique sua caixa de entrada e spam.`,
      });
    }

    if (action === 'update_user_profile') {
      const targetUserId = String(body.userId || body.id || '').trim();
      if (!targetUserId) {
        return res.status(400).json({ ok: false, error: 'ID do perfil nÃ£o informado.' });
      }

      // ValidaÃ§Ã£o de autorizaÃ§Ã£o: somente o prÃ³prio usuÃ¡rio ou admin pode editar
      const isSelf =
        Boolean(verifiedToken) &&
        (verifiedToken.userId === targetUserId ||
          (verifiedToken.email || '').toLowerCase() ===
            String(store.users?.[targetUserId]?.email || '').toLowerCase());
      if (!isAdminRequest && !isSelf) {
        return res.status(403).json({ ok: false, error: 'VocÃª nÃ£o tem permissÃ£o para editar o perfil de outro usuÃ¡rio.' });
      }

      if (!store.profiles) store.profiles = {};
      const existingProfile = store.profiles[targetUserId] || {
        id: targetUserId,
        userId: targetUserId,
        createdAtIso: new Date().toISOString(),
      };

      const nowIso = new Date().toISOString();
      const updatedProfile = {
        ...existingProfile,
        displayName: typeof body.displayName === 'string' && body.displayName.trim() ? body.displayName.trim() : existingProfile.displayName,
        avatarUrl: body.avatarUrl !== undefined ? body.avatarUrl : existingProfile.avatarUrl,
        coverUrl: body.coverUrl !== undefined ? body.coverUrl : existingProfile.coverUrl,
        turma: body.turma !== undefined ? body.turma : existingProfile.turma,
        turmaLabel: body.turmaLabel !== undefined ? body.turmaLabel : existingProfile.turmaLabel,
        teamId: body.teamId !== undefined ? body.teamId : existingProfile.teamId,
        teamName: body.teamName !== undefined ? body.teamName : existingProfile.teamName,
        bio: body.bio !== undefined ? body.bio : existingProfile.bio,
        instagramHandle: body.instagramHandle !== undefined ? body.instagramHandle : existingProfile.instagramHandle,
        favoriteModalityIds: Array.isArray(body.favoriteModalityIds) ? body.favoriteModalityIds : existingProfile.favoriteModalityIds || [],
        updatedAtIso: nowIso,
      };

      store.profiles[targetUserId] = updatedProfile;
      store.updatedAtIso = nowIso;
      saveCloudStore(store);

      await MirrorDocumentToFirestoreRest('profiles', targetUserId, updatedProfile);

      return res.status(200).json({
        ok: true,
        profile: sanitizeUserProfileForPublic(updatedProfile),
      });
    }

    // AÃ‡ÃƒO 2C-5: Listagem e Pesquisa de Perfis PÃºblicos (/api/cloud-sync -> list_public_profiles)
    if (action === 'list_public_profiles') {
      const launchCfg = store.launch_config || DEFAULT_LAUNCH_CONFIG;
      if (launchCfg.publicProfilesVisible === false && !isAdminRequest) {
        return res.status(200).json({
          ok: true,
          profiles: [],
          total: 0,
          message: 'A lista de participantes e perfis estÃ¡ temporariamente oculta durante a fase de divulgaÃ§Ã£o.',
        });
      }

      const query = String(body.query || '').trim().toLowerCase();
      const filterTurma = String(body.turma || '').trim();
      const filterTeam = String(body.teamId || '').trim();
      const onlyAthletes = Boolean(body.onlyAthletes);

      const allProfiles = Object.values(store.profiles || {}).map(sanitizeUserProfileForPublic);

      const filtered = allProfiles.filter((p) => {
        if (onlyAthletes && !p.isAthlete) return false;
        if (filterTurma && p.turma !== filterTurma) return false;
        if (filterTeam && p.teamId !== filterTeam) return false;
        if (query) {
          const matchName = String(p.displayName || '').toLowerCase().includes(query);
          const matchTurma = String(p.turmaLabel || '').toLowerCase().includes(query);
          const matchTeam = String(p.teamName || '').toLowerCase().includes(query);
          const matchBio = String(p.bio || '').toLowerCase().includes(query);
          return matchName || matchTurma || matchTeam || matchBio;
        }
        return true;
      });

      return res.status(200).json({
        ok: true,
        profiles: filtered,
        total: filtered.length,
      });
    }

    // AÃ‡ÃƒO SOCIAL 1: ValidaÃ§Ã£o de SessÃ£o Server-Side (/api/cloud-sync -> validate_session)
    if (action === 'validate_session') {
      if (!verifiedToken) {
        return res.status(401).json({ ok: false, error: 'SessÃ£o invÃ¡lida, inexistente ou expirada.' });
      }
      const tokenEmail = (verifiedToken.email || '').toLowerCase().trim();
      const tokenUid = verifiedToken.userId || '';

      const userRec = (tokenUid && store.users?.[tokenUid]) || (tokenEmail && store.users?.[tokenEmail]);
      const adminRec = tokenEmail && store.admin_users?.[tokenEmail];

      if (!userRec && !adminRec) {
        return res.status(401).json({ ok: false, error: 'UsuÃ¡rio nÃ£o localizado na base oficial central.' });
      }

      const effectiveUid = tokenUid || (adminRec ? adminRec.id : (userRec ? userRec.id : ''));
      const effectiveProfile = (effectiveUid && store.profiles?.[effectiveUid]) || (tokenEmail && store.profiles?.[tokenEmail]) || null;

      return res.status(200).json({
        ok: true,
        user: {
          id: effectiveUid,
          email: tokenEmail || (userRec?.email as string) || '',
          name: (verifiedToken.officialName || userRec?.name || adminRec?.name || 'Participante') as string,
          role: verifiedToken.role,
          linkedAthleteId: userRec?.linkedAthleteId || null,
        },
        profile: effectiveProfile ? sanitizeUserProfileForPublic(effectiveProfile) : null,
      });
    }

    // AÃ‡ÃƒO SOCIAL 2: Listagem de PublicaÃ§Ãµes do Feed (/api/cloud-sync -> list_posts)
    if (action === 'list_posts') {
      const currentUid = verifiedToken?.userId || (verifiedToken?.email ? verifiedToken.email.toLowerCase() : null);
      const teamFilter = body.teamId ? String(body.teamId).trim() : null;
      const authorFilter = body.authorUid ? String(body.authorUid).trim() : null;
      const onlySaved = Boolean(body.onlySaved);
      const limit = Math.min(Math.max(Number(body.limit) || 25, 1), 60);
      const offset = Math.max(Number(body.offset) || 0, 0);

      const allPosts = Object.values(store.posts || {});

      // Mapeia salvos pelo usuÃ¡rio logado
      const mySavedPostIds = new Set<string>();
      if (currentUid && store.user_saves) {
        for (const save of Object.values(store.user_saves)) {
          if (save?.userId === currentUid && save?.postId) {
            mySavedPostIds.add(String(save.postId));
          }
        }
      }

      // Mapeia curtidas pelo usuÃ¡rio logado
      const myLikedPostIds = new Set<string>();
      if (currentUid && store.post_likes) {
        for (const like of Object.values(store.post_likes)) {
          if (like?.userId === currentUid && like?.postId) {
            myLikedPostIds.add(String(like.postId));
          }
        }
      }

      const filtered = allPosts.filter((post) => {
        if (!post || !post.id) return false;
        if (authorFilter && post.authorUid !== authorFilter) return false;
        if (teamFilter && post.authorTeamId !== teamFilter && post.teamTag !== teamFilter) return false;
        if (onlySaved) {
          if (!currentUid || !mySavedPostIds.has(String(post.id))) return false;
        }
        return true;
      });

      // Ordena por data decrescente
      filtered.sort((a, b) => {
        const tA = new Date(String(a.createdAtIso || 0)).getTime();
        const tB = new Date(String(b.createdAtIso || 0)).getTime();
        return tB - tA;
      });

      const paginated = filtered.slice(offset, offset + limit).map((post) => ({
        ...post,
        isLikedByMe: currentUid ? myLikedPostIds.has(String(post.id)) : false,
        isSavedByMe: currentUid ? mySavedPostIds.has(String(post.id)) : false,
      }));

      return res.status(200).json({
        ok: true,
        posts: paginated,
        total: filtered.length,
        hasMore: offset + limit < filtered.length,
      });
    }

    // AÃ‡ÃƒO SOCIAL 3: CriaÃ§Ã£o de PublicaÃ§Ã£o (/api/cloud-sync -> create_post)
    if (action === 'create_post') {
      if (!verifiedToken) {
        return res.status(401).json({ ok: false, error: 'Apenas usuÃ¡rios autenticados podem publicar no feed.' });
      }
      const authorUid = verifiedToken.userId || (verifiedToken.email ? verifiedToken.email.toLowerCase() : '');
      const content = String(body.content || '').trim();
      const images = Array.isArray(body.images) ? body.images.slice(0, 4) : [];

      if (!content && images.length === 0) {
        return res.status(400).json({ ok: false, error: 'A publicaÃ§Ã£o precisa conter texto ou pelo menos uma imagem.' });
      }
      if (content.length > 2000) {
        return res.status(400).json({ ok: false, error: 'O texto da publicaÃ§Ã£o nÃ£o pode ultrapassar 2.000 caracteres.' });
      }

      const profile = (authorUid && store.profiles?.[authorUid]) || null;
      const user = (authorUid && store.users?.[authorUid]) || null;
      const postId = `post_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const nowIso = new Date().toISOString();

      const newPost: Record<string, unknown> = {
        id: postId,
        authorUid,
        authorName: (profile?.displayName || verifiedToken.officialName || user?.name || 'Participante') as string,
        authorAvatarUrl: (profile?.avatarUrl || null) as string | null,
        authorTurma: (profile?.turma || null) as string | null,
        authorTurmaLabel: (profile?.turmaLabel || null) as string | null,
        authorTeamId: (profile?.teamId || null) as string | null,
        authorTeamName: (profile?.teamName || null) as string | null,
        isAuthorAthlete: Boolean(profile?.isAthlete || profile?.linkedAthleteId || user?.linkedAthleteId),
        authorRole: verifiedToken.role,
        content,
        images,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        teamTag: body.teamTag ? String(body.teamTag).trim() : (profile?.teamId || null),
        modalityTag: body.modalityTag ? String(body.modalityTag).trim() : null,
        createdAtIso: nowIso,
        updatedAtIso: nowIso,
      };

      if (!store.posts) store.posts = {};
      store.posts[postId] = newPost;

      if (profile) {
        profile.postsCount = (Number(profile.postsCount) || 0) + 1;
        profile.updatedAtIso = nowIso;
        store.profiles[authorUid] = profile;
        await MirrorDocumentToFirestoreRest('profiles', authorUid, profile);
      }

      store.updatedAtIso = nowIso;
      saveCloudStore(store);
      await MirrorDocumentToFirestoreRest('posts', postId, newPost);

      return res.status(201).json({
        ok: true,
        post: { ...newPost, isLikedByMe: false, isSavedByMe: false },
      });
    }

    // AÃ‡ÃƒO SOCIAL 4: EdiÃ§Ã£o de PublicaÃ§Ã£o (/api/cloud-sync -> update_post)
    if (action === 'update_post') {
      if (!verifiedToken) {
        return res.status(401).json({ ok: false, error: 'AutenticaÃ§Ã£o necessÃ¡ria para editar publicaÃ§Ãµes.' });
      }
      const postId = String(body.postId || '').trim();
      const newContent = String(body.content || '').trim();

      const existingPost = store.posts?.[postId];
      if (!existingPost) {
        return res.status(404).json({ ok: false, error: 'PublicaÃ§Ã£o nÃ£o encontrada.' });
      }

      const authorUid = verifiedToken.userId || (verifiedToken.email ? verifiedToken.email.toLowerCase() : '');
      const isAuthor = String(existingPost.authorUid) === authorUid;

      if (!isAuthor && !isAdmin) {
        return res.status(403).json({ ok: false, error: 'VocÃª nÃ£o tem permissÃ£o para editar publicaÃ§Ãµes de terceiros.' });
      }

      if (!newContent && (!Array.isArray(existingPost.images) || existingPost.images.length === 0)) {
        return res.status(400).json({ ok: false, error: 'O conteÃºdo da publicaÃ§Ã£o nÃ£o pode ficar vazio.' });
      }

      const nowIso = new Date().toISOString();
      existingPost.content = newContent;
      if (Array.isArray(body.images)) {
        existingPost.images = body.images.slice(0, 4);
      }
      existingPost.updatedAtIso = nowIso;

      store.posts[postId] = existingPost;
      store.updatedAtIso = nowIso;
      saveCloudStore(store);
      await MirrorDocumentToFirestoreRest('posts', postId, existingPost);

      return res.status(200).json({
        ok: true,
        post: existingPost,
      });
    }

    // AÃ‡ÃƒO SOCIAL 5: ExclusÃ£o de PublicaÃ§Ã£o (/api/cloud-sync -> delete_post)
    if (action === 'delete_post') {
      if (!verifiedToken) {
        return res.status(401).json({ ok: false, error: 'AutenticaÃ§Ã£o necessÃ¡ria para excluir publicaÃ§Ãµes.' });
      }
      const postId = String(body.postId || '').trim();
      const existingPost = store.posts?.[postId];

      if (!existingPost) {
        return res.status(404).json({ ok: false, error: 'PublicaÃ§Ã£o nÃ£o encontrada.' });
      }

      const authorUid = verifiedToken.userId || (verifiedToken.email ? verifiedToken.email.toLowerCase() : '');
      const isAuthor = String(existingPost.authorUid) === authorUid;

      if (!isAuthor && !isAdmin) {
        return res.status(403).json({ ok: false, error: 'VocÃª nÃ£o tem permissÃ£o para excluir esta publicaÃ§Ã£o.' });
      }

      delete store.posts[postId];
      await DeleteDocumentFromFirestoreRest('posts', postId);

      // Decrementa o contador de posts do autor
      const postAuthorUid = String(existingPost.authorUid);
      if (store.profiles?.[postAuthorUid]) {
        const prof = store.profiles[postAuthorUid];
        prof.postsCount = Math.max((Number(prof.postsCount) || 1) - 1, 0);
        prof.updatedAtIso = new Date().toISOString();
        await MirrorDocumentToFirestoreRest('profiles', postAuthorUid, prof);
      }

      // Remove comentÃ¡rios e curtidas associados
      if (store.post_comments) {
        for (const [cId, comm] of Object.entries(store.post_comments)) {
          if (comm?.postId === postId) {
            delete store.post_comments[cId];
            await DeleteDocumentFromFirestoreRest('post_comments', cId);
          }
        }
      }
      if (store.post_likes) {
        for (const [lId, like] of Object.entries(store.post_likes)) {
          if (like?.postId === postId) {
            delete store.post_likes[lId];
            await DeleteDocumentFromFirestoreRest('post_likes', lId);
          }
        }
      }

      saveCloudStore(store);
      return res.status(200).json({ ok: true, deletedPostId: postId });
    }

    // AÃ‡ÃƒO SOCIAL 6: Curtir / Descurtir PublicaÃ§Ã£o (/api/cloud-sync -> toggle_like)
    if (action === 'toggle_like') {
      if (!verifiedToken) {
        return res.status(401).json({ ok: false, error: 'AutenticaÃ§Ã£o necessÃ¡ria para curtir publicaÃ§Ãµes.' });
      }
      const postId = String(body.postId || '').trim();
      const currentUid = verifiedToken.userId || (verifiedToken.email ? verifiedToken.email.toLowerCase() : '');

      const post = store.posts?.[postId];
      if (!post) {
        return res.status(404).json({ ok: false, error: 'PublicaÃ§Ã£o nÃ£o encontrada.' });
      }

      if (!store.post_likes) store.post_likes = {};
      const likeKey = `${postId}_${currentUid}`;
      const existingLike = store.post_likes[likeKey];
      const nowIso = new Date().toISOString();

      if (existingLike) {
        // Remover curtida
        delete store.post_likes[likeKey];
        await DeleteDocumentFromFirestoreRest('post_likes', likeKey);
        post.likesCount = Math.max((Number(post.likesCount) || 1) - 1, 0);
        post.updatedAtIso = nowIso;
        store.posts[postId] = post;
        saveCloudStore(store);
        await MirrorDocumentToFirestoreRest('posts', postId, post);

        return res.status(200).json({ ok: true, isLiked: false, likesCount: post.likesCount });
      } else {
        // Inserir curtida idempotente
        const likeRecord = {
          id: likeKey,
          postId,
          userId: currentUid,
          createdAtIso: nowIso,
        };
        store.post_likes[likeKey] = likeRecord;
        await MirrorDocumentToFirestoreRest('post_likes', likeKey, likeRecord);

        post.likesCount = (Number(post.likesCount) || 0) + 1;
        post.updatedAtIso = nowIso;
        store.posts[postId] = post;
        saveCloudStore(store);
        await MirrorDocumentToFirestoreRest('posts', postId, post);

        // NotificaÃ§Ã£o para o autor da publicaÃ§Ã£o (se nÃ£o for a si mesmo)
        const authorUid = String(post.authorUid);
        if (authorUid && authorUid !== currentUid) {
          if (!store.social_notifications) store.social_notifications = {};
          const notifId = `notif_like_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const notifRecord = {
            id: notifId,
            recipientUid: authorUid,
            actorUid: currentUid,
            actorName: verifiedToken.officialName || 'Um participante',
            actorAvatarUrl: store.profiles?.[currentUid]?.avatarUrl || null,
            type: 'like',
            title: 'Nova curtida',
            message: `${verifiedToken.officialName || 'Um participante'} curtiu sua publicaÃ§Ã£o.`,
            targetPostId: postId,
            isRead: false,
            createdAtIso: nowIso,
          };
          store.social_notifications[notifId] = notifRecord;
          await MirrorDocumentToFirestoreRest('social_notifications', notifId, notifRecord);
        }

        return res.status(200).json({ ok: true, isLiked: true, likesCount: post.likesCount });
      }
    }

    // AÃ‡ÃƒO SOCIAL 7: Listar ComentÃ¡rios (/api/cloud-sync -> list_comments)
    if (action === 'list_comments') {
      const postId = String(body.postId || '').trim();
      if (!postId) {
        return res.status(400).json({ ok: false, error: 'ID da publicaÃ§Ã£o Ã© obrigatÃ³rio.' });
      }

      const allComments = Object.values(store.post_comments || {});
      const postComments = allComments.filter((c) => c && c.postId === postId);

      postComments.sort((a, b) => {
        const tA = new Date(String(a.createdAtIso || 0)).getTime();
        const tB = new Date(String(b.createdAtIso || 0)).getTime();
        return tA - tB;
      });

      return res.status(200).json({
        ok: true,
        comments: postComments,
        total: postComments.length,
      });
    }

    // AÃ‡ÃƒO SOCIAL 8: Criar ComentÃ¡rio (/api/cloud-sync -> create_comment)
    if (action === 'create_comment') {
      if (!verifiedToken) {
        return res.status(401).json({ ok: false, error: 'AutenticaÃ§Ã£o necessÃ¡ria para comentar.' });
      }
      const postId = String(body.postId || '').trim();
      const content = String(body.content || '').trim();

      if (!postId || !content) {
        return res.status(400).json({ ok: false, error: 'PublicaÃ§Ã£o e conteÃºdo do comentÃ¡rio sÃ£o obrigatÃ³rios.' });
      }
      if (content.length > 500) {
        return res.status(400).json({ ok: false, error: 'O comentÃ¡rio deve possuir no mÃ¡ximo 500 caracteres.' });
      }

      const post = store.posts?.[postId];
      if (!post) {
        return res.status(404).json({ ok: false, error: 'PublicaÃ§Ã£o nÃ£o localizada.' });
      }

      const currentUid = verifiedToken.userId || (verifiedToken.email ? verifiedToken.email.toLowerCase() : '');
      const profile = (currentUid && store.profiles?.[currentUid]) || null;
      const commentId = `comm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const nowIso = new Date().toISOString();

      const newComment = {
        id: commentId,
        postId,
        authorUid: currentUid,
        authorName: (profile?.displayName || verifiedToken.officialName || 'Participante') as string,
        authorAvatarUrl: (profile?.avatarUrl || null) as string | null,
        authorTurma: (profile?.turma || null) as string | null,
        authorTeamId: (profile?.teamId || null) as string | null,
        isAuthorAthlete: Boolean(profile?.isAthlete || profile?.linkedAthleteId),
        content,
        createdAtIso: nowIso,
      };

      if (!store.post_comments) store.post_comments = {};
      store.post_comments[commentId] = newComment;

      post.commentsCount = (Number(post.commentsCount) || 0) + 1;
      post.updatedAtIso = nowIso;
      store.posts[postId] = post;

      saveCloudStore(store);
      await MirrorDocumentToFirestoreRest('post_comments', commentId, newComment);
      await MirrorDocumentToFirestoreRest('posts', postId, post);

      // NotificaÃ§Ã£o para o autor da publicaÃ§Ã£o (se diferente de quem comentou)
      const authorUid = String(post.authorUid);
      if (authorUid && authorUid !== currentUid) {
        if (!store.social_notifications) store.social_notifications = {};
        const notifId = `notif_comm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const snippet = content.length > 40 ? `${content.slice(0, 37)}...` : content;
        const notifRecord = {
          id: notifId,
          recipientUid: authorUid,
          actorUid: currentUid,
          actorName: verifiedToken.officialName || 'Um participante',
          actorAvatarUrl: profile?.avatarUrl || null,
          type: 'comment',
          title: 'Novo comentÃ¡rio',
          message: `${verifiedToken.officialName || 'Um participante'} comentou: "${snippet}"`,
          targetPostId: postId,
          targetCommentId: commentId,
          isRead: false,
          createdAtIso: nowIso,
        };
        store.social_notifications[notifId] = notifRecord;
        await MirrorDocumentToFirestoreRest('social_notifications', notifId, notifRecord);
      }

      return res.status(201).json({
        ok: true,
        comment: newComment,
        commentsCount: post.commentsCount,
      });
    }

    // AÃ‡ÃƒO SOCIAL 9: Excluir ComentÃ¡rio (/api/cloud-sync -> delete_comment)
    if (action === 'delete_comment') {
      if (!verifiedToken) {
        return res.status(401).json({ ok: false, error: 'AutenticaÃ§Ã£o necessÃ¡ria para excluir comentÃ¡rio.' });
      }
      const commentId = String(body.commentId || '').trim();
      const comment = store.post_comments?.[commentId];

      if (!comment) {
        return res.status(404).json({ ok: false, error: 'ComentÃ¡rio nÃ£o encontrado.' });
      }

      const currentUid = verifiedToken.userId || (verifiedToken.email ? verifiedToken.email.toLowerCase() : '');
      const post = comment.postId ? store.posts?.[String(comment.postId)] : null;
      const isCommentAuthor = comment.authorUid === currentUid;
      const isPostAuthor = post && post.authorUid === currentUid;

      if (!isCommentAuthor && !isPostAuthor && !isAdmin) {
        return res.status(403).json({ ok: false, error: 'VocÃª nÃ£o tem permissÃ£o para excluir este comentÃ¡rio.' });
      }

      delete store.post_comments[commentId];
      await DeleteDocumentFromFirestoreRest('post_comments', commentId);

      if (post) {
        post.commentsCount = Math.max((Number(post.commentsCount) || 1) - 1, 0);
        post.updatedAtIso = new Date().toISOString();
        store.posts[post.id as string] = post;
        await MirrorDocumentToFirestoreRest('posts', post.id as string, post);
      }

      saveCloudStore(store);
      return res.status(200).json({ ok: true, deletedCommentId: commentId, commentsCount: post?.commentsCount || 0 });
    }

    // AÃ‡ÃƒO SOCIAL 10: Seguir / Deixar de Seguir (/api/cloud-sync -> toggle_follow)
    if (action === 'toggle_follow') {
      if (!verifiedToken) {
        return res.status(401).json({ ok: false, error: 'AutenticaÃ§Ã£o necessÃ¡ria para seguir participantes.' });
      }
      const targetUid = String(body.targetUid || '').trim();
      const currentUid = verifiedToken.userId || (verifiedToken.email ? verifiedToken.email.toLowerCase() : '');

      if (!targetUid || targetUid === currentUid) {
        return res.status(400).json({ ok: false, error: 'VocÃª nÃ£o pode seguir a si mesmo ou perfil invÃ¡lido.' });
      }

      if (!store.user_follows) store.user_follows = {};
      const followKey = `${currentUid}_${targetUid}`;
      const existingFollow = store.user_follows[followKey];
      const nowIso = new Date().toISOString();

      const targetProfile = store.profiles?.[targetUid];
      const myProfile = store.profiles?.[currentUid];

      if (existingFollow) {
        // Deixar de seguir
        delete store.user_follows[followKey];
        await DeleteDocumentFromFirestoreRest('user_follows', followKey);

        if (targetProfile) {
          targetProfile.followersCount = Math.max((Number(targetProfile.followersCount) || 1) - 1, 0);
          targetProfile.updatedAtIso = nowIso;
          await MirrorDocumentToFirestoreRest('profiles', targetUid, targetProfile);
        }
        if (myProfile) {
          myProfile.followingCount = Math.max((Number(myProfile.followingCount) || 1) - 1, 0);
          myProfile.updatedAtIso = nowIso;
          await MirrorDocumentToFirestoreRest('profiles', currentUid, myProfile);
        }

        saveCloudStore(store);
        return res.status(200).json({
          ok: true,
          isFollowing: false,
          followersCount: targetProfile?.followersCount || 0,
        });
      } else {
        // ComeÃ§ar a seguir
        const followRecord = {
          id: followKey,
          followerUid: currentUid,
          followingUid: targetUid,
          createdAtIso: nowIso,
        };
        store.user_follows[followKey] = followRecord;
        await MirrorDocumentToFirestoreRest('user_follows', followKey, followRecord);

        if (targetProfile) {
          targetProfile.followersCount = (Number(targetProfile.followersCount) || 0) + 1;
          targetProfile.updatedAtIso = nowIso;
          await MirrorDocumentToFirestoreRest('profiles', targetUid, targetProfile);
        }
        if (myProfile) {
          myProfile.followingCount = (Number(myProfile.followingCount) || 0) + 1;
          myProfile.updatedAtIso = nowIso;
          await MirrorDocumentToFirestoreRest('profiles', currentUid, myProfile);
        }

        // NotificaÃ§Ã£o para a pessoa seguida
        if (!store.social_notifications) store.social_notifications = {};
        const notifId = `notif_flw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const notifRecord = {
          id: notifId,
          recipientUid: targetUid,
          actorUid: currentUid,
          actorName: verifiedToken.officialName || 'Um participante',
          actorAvatarUrl: myProfile?.avatarUrl || null,
          type: 'follow',
          title: 'Novo seguidor',
          message: `${verifiedToken.officialName || 'Um participante'} comeÃ§ou a seguir seu perfil.`,
          isRead: false,
          createdAtIso: nowIso,
        };
        store.social_notifications[notifId] = notifRecord;
        await MirrorDocumentToFirestoreRest('social_notifications', notifId, notifRecord);
      }

      saveCloudStore(store);
      return res.status(200).json({
        ok: true,
        isFollowing: true,
        followersCount: targetProfile?.followersCount || 0,
      });
    }

    // AÃ‡ÃƒO SOCIAL 11: Listar Seguidores e Seguindo (/api/cloud-sync -> list_network)
    if (action === 'list_network') {
      const targetUid = String(body.targetUid || verifiedToken?.userId || '').trim();
      const currentUid = verifiedToken?.userId || (verifiedToken?.email ? verifiedToken.email.toLowerCase() : null);
      const mode = body.mode === 'following' ? 'following' : 'followers';

      if (!targetUid) {
        return res.status(400).json({ ok: false, error: 'Identificador do participante nÃ£o informado.' });
      }

      const allFollows = Object.values(store.user_follows || {});
      const matchedUids: string[] = [];

      for (const f of allFollows) {
        if (!f) continue;
        if (mode === 'followers' && f.followingUid === targetUid) {
          matchedUids.push(String(f.followerUid));
        } else if (mode === 'following' && f.followerUid === targetUid) {
          matchedUids.push(String(f.followingUid));
        }
      }

      const profiles = matchedUids
        .map((uid) => {
          const prof = store.profiles?.[uid];
          if (!prof) return null;
          const sanitized = sanitizeUserProfileForPublic(prof);
          const isFollowing = currentUid ? Boolean(store.user_follows?.[`${currentUid}_${uid}`]) : false;
          const isFollower = currentUid ? Boolean(store.user_follows?.[`${uid}_${currentUid}`]) : false;
          return {
            ...sanitized,
            isFollowing,
            isFollower,
          };
        })
        .filter(Boolean);

      return res.status(200).json({
        ok: true,
        mode,
        profiles,
        total: profiles.length,
      });
    }

    // AÃ‡ÃƒO SOCIAL 12: Salvar / Desalvar PublicaÃ§Ã£o (/api/cloud-sync -> toggle_save_post)
    if (action === 'toggle_save_post') {
      if (!verifiedToken) {
        return res.status(401).json({ ok: false, error: 'AutenticaÃ§Ã£o necessÃ¡ria para salvar publicaÃ§Ãµes.' });
      }
      const postId = String(body.postId || '').trim();
      const currentUid = verifiedToken.userId || (verifiedToken.email ? verifiedToken.email.toLowerCase() : '');

      if (!store.user_saves) store.user_saves = {};
      const saveKey = `${currentUid}_${postId}`;
      const existingSave = store.user_saves[saveKey];
      const nowIso = new Date().toISOString();

      if (existingSave) {
        delete store.user_saves[saveKey];
        await DeleteDocumentFromFirestoreRest('user_saves', saveKey);
        saveCloudStore(store);
        return res.status(200).json({ ok: true, isSaved: false });
      } else {
        const saveRecord = {
          id: saveKey,
          userId: currentUid,
          postId,
          savedAtIso: nowIso,
        };
        store.user_saves[saveKey] = saveRecord;
        saveCloudStore(store);
        await MirrorDocumentToFirestoreRest('user_saves', saveKey, saveRecord);
        return res.status(200).json({ ok: true, isSaved: true });
      }
    }

    // AÃ‡ÃƒO SOCIAL 13: Listar NotificaÃ§Ãµes Sociais (/api/cloud-sync -> list_social_notifications)
    if (action === 'list_social_notifications') {
      if (!verifiedToken) {
        return res.status(401).json({ ok: false, error: 'AutenticaÃ§Ã£o necessÃ¡ria para ler notificaÃ§Ãµes.' });
      }
      const currentUid = verifiedToken.userId || (verifiedToken.email ? verifiedToken.email.toLowerCase() : '');
      const allNotifs = Object.values(store.social_notifications || {});
      const userNotifs = allNotifs.filter((n) => n && n.recipientUid === currentUid);

      userNotifs.sort((a, b) => {
        const tA = new Date(String(a.createdAtIso || 0)).getTime();
        const tB = new Date(String(b.createdAtIso || 0)).getTime();
        return tB - tA;
      });

      const unreadCount = userNotifs.filter((n) => !n.isRead).length;

      return res.status(200).json({
        ok: true,
        notifications: userNotifs.slice(0, 50),
        unreadCount,
      });
    }

    // AÃ‡ÃƒO SOCIAL 14: Marcar NotificaÃ§Ã£o como Lida (/api/cloud-sync -> mark_notification_read)
    if (action === 'mark_notification_read') {
      if (!verifiedToken) {
        return res.status(401).json({ ok: false, error: 'AutenticaÃ§Ã£o necessÃ¡ria.' });
      }
      const currentUid = verifiedToken.userId || (verifiedToken.email ? verifiedToken.email.toLowerCase() : '');
      const notifId = String(body.notificationId || '').trim();

      if (!store.social_notifications) store.social_notifications = {};

      if (notifId === 'all') {
        for (const n of Object.values(store.social_notifications)) {
          if (n && n.recipientUid === currentUid) {
            n.isRead = true;
            await MirrorDocumentToFirestoreRest('social_notifications', n.id as string, n);
          }
        }
      } else if (store.social_notifications[notifId]) {
        const notif = store.social_notifications[notifId];
        if (notif.recipientUid === currentUid) {
          notif.isRead = true;
          await MirrorDocumentToFirestoreRest('social_notifications', notifId, notif);
        }
      }

      saveCloudStore(store);
      return res.status(200).json({ ok: true });
    }

    // AÃ‡ÃƒO 2C-6: AtualizaÃ§Ã£o Centralizada do Modo de LanÃ§amento PÃºblico (Restrito Ã  ComissÃ£o / Master)
    if (action === 'update_launch_config') {
      if (!isAdminRequest) {
        return res.status(403).json({
          ok: false,
          error: 'Apenas a ComissÃ£o Organizadora pode alterar os parÃ¢metros de lanÃ§amento pÃºblico.',
        });
      }

      const newConfig = body.launchConfig || {};
      store.launch_config = {
        ...(store.launch_config || DEFAULT_LAUNCH_CONFIG),
        ...newConfig,
      };
      saveCloudStore(store);
      await MirrorDocumentToFirestoreRest('system_config', 'launch_config', store.launch_config as any);

      return res.status(200).json({
        ok: true,
        message: 'ConfiguraÃ§Ãµes de lanÃ§amento pÃºblico atualizadas com sucesso.',
        launchConfig: store.launch_config,
      });
    }

    // AÃ‡ÃƒO 2C-7: Salvamento / ImportaÃ§Ã£o de Chaveamento Oficial (Restrito Ã  ComissÃ£o)
    if (action === 'save_bracket' || action === 'import_bracket') {
      if (!isAdminRequest) {
        return res.status(403).json({
          ok: false,
          error: 'Apenas a ComissÃ£o Organizadora pode cadastrar ou importar chaveamentos oficiais.',
        });
      }

      const bracketData = body.bracket;
      const modalityId = String(body.modalityId || bracketData?.modalityId || '').trim();

      if (!modalityId || !bracketData) {
        return res.status(400).json({
          ok: false,
          error: 'Dados do chaveamento e identificador da modalidade sÃ£o obrigatÃ³rios.',
        });
      }

      if (!store.brackets) store.brackets = {};
      store.brackets[modalityId] = bracketData;
      saveCloudStore(store);
      await MirrorDocumentToFirestoreRest('brackets', modalityId, bracketData);

      return res.status(200).json({
        ok: true,
        message: 'Chaveamento oficial salvo com sucesso!',
        bracket: bracketData,
      });
    }

    // AÃ‡ÃƒO 2D: Login Administrativo com Hierarquia RBAC (NÃ­veis 1 a 5)
    if (action === 'admin_login') {
      const emailInput = String(body.email || body.identifier || '')
        .trim()
        .toLowerCase();
      const passwordInput = String(body.password || '').trim();

      if (!emailInput || !passwordInput) {
        return res.status(400).json({
          ok: false,
          error: 'E-mail e senha sÃ£o obrigatÃ³rios.',
        });
      }

      // 1. ValidaÃ§Ã£o primÃ¡ria no Google Firebase Auth (PersistÃªncia Centralizada Oficial)
      let fbUser: any = null;
      let fbAuthSuccess = false;
      try {
        const fbRes = await firebaseAuthSignIn(emailInput, passwordInput);
        if (fbRes.ok && fbRes.user) {
          fbUser = fbRes.user;
          fbAuthSuccess = true;
        }
      } catch {
        // Prossegue para checagem local se falha temporÃ¡ria de rede
      }

      const adminUsers = store.admin_users || {};
      let user = adminUsers[emailInput] || adminUsers['usr_master_cangaceira'];

      const inputHash = hashPassword(passwordInput);
      const isLocalInitial =
        Boolean(user?.mustChangePassword) &&
        (passwordInput === (process.env.INTRAMED_MASTER_INITIAL_PASSWORD || 'campeao2027'));
      const isLocalHashValid = Boolean(user && inputHash === user.passwordHash);

      if (!fbAuthSuccess && !isLocalHashValid && !isLocalInitial) {
        return res.status(401).json({
          ok: false,
          error: 'Senha ou e-mail administrativo incorreto.',
        });
      }

      // Determina mustChangePassword com base nos metadados centrais
      let mustChange = false;
      if (fbUser) {
        const meta = decodeProfileMetadata(fbUser.photoUrl);
        if (meta && typeof meta.mustChangePassword === 'boolean') {
          mustChange = meta.mustChangePassword;
        } else {
          mustChange = passwordInput === (process.env.INTRAMED_MASTER_INITIAL_PASSWORD || 'campeao2027');
        }
      } else if (user) {
        mustChange = Boolean(user.mustChangePassword);
      }

      const userRole = (user?.role as UserRole) || 'moderador_master';
      const token = createSignedOperatorToken({
        role: userRole,
        email: emailInput,
        officialName: (user?.name as string) || 'AtlÃ©tica Cangaceira',
        mustChangePassword: mustChange,
      });

      if (!user) {
        user = {
          id: fbUser?.localId || 'usr_master_cangaceira',
          email: emailInput,
          name: 'AtlÃ©tica Cangaceira',
          role: 'moderador_master',
          organization: 'AssociaÃ§Ã£o AtlÃ©tica AcadÃªmica de Medicina UEMA â€“ Cangaceira',
          mustChangePassword: mustChange,
          isActive: true,
          updatedAtIso: new Date().toISOString(),
        };
        store.admin_users[emailInput] = user;
      } else {
        user.mustChangePassword = mustChange;
        user.lastLoginAtIso = new Date().toISOString();
      }
      saveCloudStore(store);

      return res.status(200).json({
        ok: true,
        token,
        role: userRole,
        mustChangePassword: mustChange,
        user: {
          id: user.id || fbUser?.localId || 'usr_master_cangaceira',
          email: emailInput,
          name: user.name || 'AtlÃ©tica Cangaceira',
          role: userRole,
          organization: user.organization || 'AssociaÃ§Ã£o AtlÃ©tica AcadÃªmica de Medicina UEMA â€“ Cangaceira',
          mustChangePassword: mustChange,
        },
      });
    }

    // AÃ‡ÃƒO 2E: AlteraÃ§Ã£o de Senha (Primeiro Acesso ObrigatÃ³rio ou Troca PeriÃ³dica)
    if (action === 'change_admin_password') {
      const emailInput = String(body.email || verifiedToken?.email || MASTER_MODERATOR_EMAIL).trim().toLowerCase();
      const currentPassword = String(body.currentPassword || '').trim();
      const newPassword = String(body.newPassword || '').trim();
      const confirmPassword = String(body.confirmPassword || '').trim();

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
          ok: false,
          error: 'A nova senha deve possuir no mÃ­nimo 6 caracteres.',
        });
      }

      if (confirmPassword && newPassword !== confirmPassword) {
        return res.status(400).json({
          ok: false,
          error: 'A confirmaÃ§Ã£o de senha nÃ£o confere.',
        });
      }

      // Autentica no Firebase Auth com a senha atual ou a inicial para obter o idToken
      let fbIdToken: string | null = null;
      const passwordsToTry = [currentPassword, 'campeao2027'].filter(Boolean);

      for (const passTry of passwordsToTry) {
        const signRes = await firebaseAuthSignIn(emailInput, passTry);
        if (signRes.ok && signRes.user?.idToken) {
          fbIdToken = signRes.user.idToken;
          break;
        }
      }

      if (!fbIdToken) {
        // Se ainda nÃ£o existir no Firebase Auth, registra diretamente com a nova senha
        const upRes = await firebaseAuthSignUp(emailInput, newPassword);
        if (upRes.ok && upRes.user?.idToken) {
          fbIdToken = upRes.user.idToken;
        } else if (!verifiedToken?.email && !currentPassword) {
          return res.status(401).json({
            ok: false,
            error: 'Informe a senha atual ou inicial para autorizar a redefiniÃ§Ã£o.',
          });
        }
      }

      // Grava no Google Firebase Auth de forma permanente e centralizada
      const meta = {
        role: 'moderador_master',
        name: 'AtlÃ©tica Cangaceira',
        organization: 'AssociaÃ§Ã£o AtlÃ©tica AcadÃªmica de Medicina UEMA â€“ Cangaceira',
        mustChangePassword: false,
        updatedAtIso: new Date().toISOString(),
      };

      if (fbIdToken) {
        await firebaseAuthUpdateProfile({
          idToken: fbIdToken,
          password: newPassword,
          displayName: 'AtlÃ©tica Cangaceira',
          photoUrl: encodeProfileMetadata(meta),
        });
      }

      // Atualiza tambÃ©m no store local
      const adminUsers = store.admin_users || {};
      const user = adminUsers[emailInput] || adminUsers['usr_master_cangaceira'] || {
        id: 'usr_master_cangaceira',
        email: emailInput,
        name: 'AtlÃ©tica Cangaceira',
        role: 'moderador_master',
        organization: 'AssociaÃ§Ã£o AtlÃ©tica AcadÃªmica de Medicina UEMA â€“ Cangaceira',
        isActive: true,
      };

      const nowIso = new Date().toISOString();
      user.passwordHash = hashPassword(newPassword);
      user.mustChangePassword = false;
      user.updatedAtIso = nowIso;
      store.admin_users[emailInput] = user;
      store.admin_users['usr_master_cangaceira'] = user;

      if (!store.admin_audit_logs) {
        store.admin_audit_logs = [];
      }
      store.admin_audit_logs.push({
        id: `audit_${Date.now()}_pwd`,
        action: 'password_change',
        performedByEmail: emailInput,
        performedByRole: 'moderador_master',
        targetEmail: emailInput,
        timestampIso: nowIso,
        details: 'Senha administrativa redefinida e salva permanentemente no Firebase Auth; pendÃªncia de primeiro acesso removida.',
      });

      saveCloudStore(store);

      // Emite novo token desbloqueado
      const newToken = createSignedOperatorToken({
        role: 'moderador_master',
        email: emailInput,
        officialName: 'AtlÃ©tica Cangaceira',
        mustChangePassword: false,
      });

      return res.status(200).json({
        ok: true,
        token: newToken,
        message: 'Senha atualizada com sucesso no banco central!',
        mustChangePassword: false,
        user: {
          id: user.id || 'usr_master_cangaceira',
          email: emailInput,
          name: user.name || 'AtlÃ©tica Cangaceira',
          role: 'moderador_master',
          organization: user.organization,
          mustChangePassword: false,
        },
      });
    }

    // AÃ‡ÃƒO 2F: Listagem de UsuÃ¡rios e Atletas com GestÃ£o RBAC (Restrito a Moderador / Master)
    if (action === 'list_admin_users') {
      if (!isAdminRequest) {
        return res.status(403).json({
          ok: false,
          error: 'Apenas moderadores e master podem visualizar a listagem completa de usuÃ¡rios.',
        });
      }

      const adminUsers = Object.values(store.admin_users || {}).map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        organization: u.organization,
        isActive: u.isActive !== false,
        mustChangePassword: Boolean(u.mustChangePassword),
        createdAtIso: u.createdAtIso,
        lastLoginAtIso: u.lastLoginAtIso,
      }));

      const auditLogs = (store.admin_audit_logs || []).slice(-50).reverse();

      return res.status(200).json({
        ok: true,
        users: adminUsers,
        auditLogs: isMasterRequest ? auditLogs : [],
      });
    }

    // AÃ‡ÃƒO 2G: AtualizaÃ§Ã£o de Papel/Cargo (Exclusivo do Moderador Master NÃ­vel 5)
    if (action === 'update_user_role') {
      if (!isMasterRequest) {
        return res.status(403).json({
          ok: false,
          error: 'Apenas o Moderador Master (NÃ­vel 5) pode alterar os cargos de usuÃ¡rios.',
        });
      }

      const targetEmail = String(body.targetEmail || '').trim().toLowerCase();
      const targetRole = String(body.targetRole || '').trim().toLowerCase() as UserRole;
      const validRoles: UserRole[] = ['usuario', 'atleta', 'mesario', 'moderador'];

      if (!targetEmail || !targetRole) {
        return res.status(400).json({
          ok: false,
          error: 'E-mail alvo e novo cargo sÃ£o obrigatÃ³rios.',
        });
      }

      if (!validRoles.includes(targetRole)) {
        return res.status(400).json({
          ok: false,
          error: 'Cargo invÃ¡lido para atribuiÃ§Ã£o. O cargo Moderador Master Ã© Ãºnico e intransferÃ­vel.',
        });
      }

      // Blindagem: Moderador Master nÃ£o pode ser rebaixado
      if (isMasterAccount(targetEmail)) {
        return res.status(403).json({
          ok: false,
          error: `OperaÃ§Ã£o negada: A conta Moderador Master (${MASTER_MODERATOR_EMAIL}) nÃ£o pode ser alterada.`,
        });
      }

      const adminUsers = store.admin_users || {};
      let targetUser = adminUsers[targetEmail];
      const nowIso = new Date().toISOString();

      if (!targetUser) {
        // Cria usuÃ¡rio no admin_users se ainda nÃ£o existia
        targetUser = {
          id: `usr_${Date.now()}`,
          email: targetEmail,
          name: String(body.targetName || targetEmail.split('@')[0]),
          role: targetRole,
          organization: 'AssociaÃ§Ã£o AtlÃ©tica AcadÃªmica de Medicina UEMA â€“ Cangaceira',
          isActive: true,
          mustChangePassword: true,
          createdAtIso: nowIso,
          updatedAtIso: nowIso,
        };
        adminUsers[targetEmail] = targetUser;
      } else {
        targetUser.role = targetRole;
        targetUser.updatedAtIso = nowIso;
      }

      if (!store.admin_audit_logs) {
        store.admin_audit_logs = [];
      }
      store.admin_audit_logs.push({
        id: `audit_${Date.now()}_role`,
        action: 'update_role',
        performedByEmail: verifiedToken?.email || 'master',
        performedByRole: 'moderador_master',
        targetEmail,
        timestampIso: nowIso,
        details: `Cargo alterado para ${targetRole}`,
      });

      saveCloudStore(store);

      return res.status(200).json({
        ok: true,
        message: `Cargo do usuÃ¡rio ${targetEmail} atualizado para ${targetRole}.`,
        user: {
          email: targetUser.email,
          role: targetUser.role,
        },
      });
    }

    // AÃ‡ÃƒO 2H: AtivaÃ§Ã£o / DesativaÃ§Ã£o de UsuÃ¡rio (Exclusivo do Moderador Master NÃ­vel 5)
    if (action === 'toggle_user_active') {
      if (!isMasterRequest) {
        return res.status(403).json({
          ok: false,
          error: 'Apenas o Moderador Master pode ativar ou desativar acessos.',
        });
      }

      const targetEmail = String(body.targetEmail || '').trim().toLowerCase();
      const isActive = Boolean(body.isActive);

      if (isMasterAccount(targetEmail) && !isActive) {
        return res.status(403).json({
          ok: false,
          error: 'A conta Moderador Master nÃ£o pode ser desativada.',
        });
      }

      const adminUsers = store.admin_users || {};
      const targetUser = adminUsers[targetEmail];

      if (!targetUser) {
        return res.status(404).json({
          ok: false,
          error: 'UsuÃ¡rio nÃ£o encontrado.',
        });
      }

      targetUser.isActive = isActive;
      targetUser.updatedAtIso = new Date().toISOString();

      if (!store.admin_audit_logs) {
        store.admin_audit_logs = [];
      }
      store.admin_audit_logs.push({
        id: `audit_${Date.now()}_status`,
        action: 'toggle_active',
        performedByEmail: verifiedToken?.email || 'master',
        performedByRole: 'moderador_master',
        targetEmail,
        timestampIso: new Date().toISOString(),
        details: `Conta ${isActive ? 'reativada' : 'desativada'}`,
      });

      saveCloudStore(store);

      return res.status(200).json({
        ok: true,
        message: `Status da conta ${targetEmail} alterado para ${isActive ? 'Ativa' : 'Inativa'}.`,
      });
    }

    // AÃ‡ÃƒO 2I: ValidaÃ§Ã£o e Auditoria de SÃ³cios da AtlÃ©tica
    if (action === 'review_member_status') {
      if (!isAdminRequest) {
        return res.status(403).json({
          ok: false,
          error: 'Apenas a moderaÃ§Ã£o pode aprovar ou rejeitar comprovaÃ§Ã£o de sÃ³cios.',
        });
      }

      const registrationId = String(body.registrationId || '').trim();
      const approved = Boolean(body.approved);
      const justification = String(body.justification || '').trim();

      const reg = store.registrations[registrationId];
      if (!reg) {
        return res.status(404).json({
          ok: false,
          error: 'InscriÃ§Ã£o nÃ£o encontrada.',
        });
      }

      const nowIso = new Date().toISOString();
      reg.isMember = approved;
      reg.memberStatus = approved ? 'aprovado' : 'rejeitado';
      reg.memberVerificationStatus = approved ? 'approved' : 'rejected';
      reg.paymentStatus = reg.paymentStatus === 'pago' ? 'pago' : 'pendente';
      reg.authorizedPrice = computeAuthorizedServerPrice(
        String(reg.lotId || 'lote-1-cangaceira'),
        String(reg.memberStatus),
        Boolean(reg.requestedMemberDiscount),
        Boolean(reg.isGuestAthlete)
      );
      if (!approved && justification) {
        reg.rejectionReason = justification;
      }
      reg.memberVerifiedAtIso = nowIso;
      reg.memberVerifiedBy = verifiedToken?.email || 'moderaÃ§Ã£o';
      reg.updatedAtIso = nowIso;
      reg.revision = Number(reg.revision || 0) + 1;

      if (!store.admin_audit_logs) {
        store.admin_audit_logs = [];
      }
      store.admin_audit_logs.push({
        id: `audit_${Date.now()}_member`,
        action: approved ? 'approve_member' : 'reject_member',
        performedByEmail: verifiedToken?.email || 'moderaÃ§Ã£o',
        performedByRole: verifiedToken?.role || 'moderador',
        targetId: registrationId,
        timestampIso: nowIso,
        details: approved
          ? 'Comprovante de sÃ³cio aprovado'
          : `Comprovante rejeitado: ${justification || 'Sem justificativa'}`,
      });

      saveCloudStore(store);
      await MirrorDocumentToFirestoreRest('registrations', registrationId, reg);

      return res.status(200).json({
        ok: true,
        message: approved ? 'CondiÃ§Ã£o de sÃ³cio aprovada!' : 'SolicitaÃ§Ã£o de sÃ³cio rejeitada.',
        registration: sanitizeRegistrationForPublic(reg),
      });
    }

    // AÃ‡ÃƒO 2C: ReconciliaÃ§Ã£o Geral de Pagamentos Pendentes no Mercado Pago (Restrito a Admin)
    if (action === 'reconcile_pending_payments') {
      if (!isAdminRequest) {
        return res.status(403).json({
          ok: false,
          error: 'Apenas administradores podem acionar a reconciliaÃ§Ã£o com o Mercado Pago.',
        });
      }

      const mpAccessToken = (process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
      if (!mpAccessToken) {
        return res.status(500).json({
          ok: false,
          error: 'Credencial MERCADOPAGO_ACCESS_TOKEN nÃ£o disponÃ­vel nesta instÃ¢ncia.',
        });
      }

      const pendingRegs = Object.values(store.registrations).filter(
        (r) => r.paymentStatus !== 'pago'
      );

      let reconciledCount = 0;
      const checkedDetails: Array<{ id: string; status: string; paymentId?: string }> = [];

      for (const reg of pendingRegs) {
        const regId = String(reg.id || '');
        const existingPaymentId = String(reg.mpPaymentId || '').trim();

        try {
          let paymentData: Record<string, unknown> | null = null;
          if (existingPaymentId && /^\d{5,25}$/.test(existingPaymentId)) {
            const checkRes = await fetch(
              `https://api.mercadopago.com/v1/payments/${encodeURIComponent(existingPaymentId)}`,
              { headers: { Authorization: `Bearer ${mpAccessToken}` } }
            );
            const parsed = await parseJsonSafe(checkRes);
            paymentData = parsed.data;
          } else if (regId) {
            const searchRes = await fetch(
              `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(
                regId
              )}&sort=date_created&criteria=desc&limit=1`,
              { headers: { Authorization: `Bearer ${mpAccessToken}` } }
            );
            const searchParsed = await parseJsonSafe(searchRes);
            const results = searchParsed.data?.results as Array<Record<string, unknown>> | undefined;
            if (Array.isArray(results) && results.length > 0) {
              paymentData = results[0];
            }
          }

          if (paymentData) {
            const status = String(paymentData.status || '');
            const txAmount = Number(paymentData.transaction_amount || 0);
            const pId = String(paymentData.id || existingPaymentId);

            if (status === 'approved') {
              const expectedMin = computeAuthorizedServerPrice(
                String(reg.lotId || 'lote-1-cangaceira'),
                String(reg.memberStatus || 'nao_solicitado'),
                Boolean(reg.requestedMemberDiscount),
                Boolean(reg.isGuestAthlete)
              );
              if (txAmount + 0.01 >= expectedMin) {
                const method: 'pix' | 'credit_card' =
                  paymentData.payment_type_id === 'credit_card' ||
                  paymentData.payment_method_id !== 'pix'
                    ? 'credit_card'
                    : 'pix';

                await markRegistrationPaidOnServer({
                  registrationId: regId,
                  mpPaymentId: pId,
                  paymentMethod: method,
                  paidAmount: txAmount,
                });
                reconciledCount++;
                checkedDetails.push({ id: regId, status: 'approved', paymentId: pId });
              }
            } else if (
              status === 'refunded' ||
              status === 'charged_back' ||
              status === 'cancelled' ||
              status === 'rejected'
            ) {
              await handleNonApprovedPaymentStatusOnServer({
                registrationId: regId,
                mpPaymentId: pId,
                mpStatus: status,
                statusDetail: String(paymentData.status_detail || ''),
              });
              checkedDetails.push({ id: regId, status, paymentId: pId });
            }
          }
        } catch {
          // Continua para o prÃ³ximo registro
        }
      }

      appendServerSyncLog({
        category: 'payment_reconcile',
        level: 'info',
        message: `ReconciliaÃ§Ã£o manual concluÃ­da: ${reconciledCount} pagamentos aprovados de ${pendingRegs.length} verificados`,
        details: { pendingTotal: pendingRegs.length, reconciledCount, checkedDetails },
      });

      return res.status(200).json({
        ok: true,
        checkedTotal: pendingRegs.length,
        reconciledCount,
        details: checkedDetails,
      });
    }

    // AÃ‡ÃƒO 3: SincronizaÃ§Ã£o em Lote (Batch)
    if (Array.isArray(batch)) {
      for (const item of batch) {
        const col = String(item?.collectionName || '');
        const id = String(item?.docId || '');
        const payload = item?.data as Record<string, unknown>;
        if (col && id && payload && ALLOWED_COLLECTIONS.has(col)) {
          const targetCol = col as keyof Omit<CloudCollectionMap, 'updatedAtIso' | 'match_secrets'>;
          const check = canClientWriteDocument(
            col,
            id,
            payload,
            store[targetCol][id],
            verifiedToken
          );
          if (check.allowed) {
            store[targetCol][id] = check.sanitizedData;
            await MirrorDocumentToFirestoreRest(col, id, check.sanitizedData);
            if (col === 'matches' && typeof payload.tableOfficialPassword === 'string' && payload.tableOfficialPassword.trim()) {
              const cleanPin = payload.tableOfficialPassword.trim().toUpperCase();
              store.match_secrets[id] = {
                pinHash: hashSecretPin(cleanPin),
                pinDisplay: cleanPin,
                updatedAtIso: new Date().toISOString(),
              };
            }
          }
        }
      }
      saveCloudStore(store);
      return res.status(200).json({
        success: true,
        updatedAtIso: store.updatedAtIso,
      });
    }

    // AÃ‡ÃƒO 4: SincronizaÃ§Ã£o de Documento Ãšnico com Whitelist e Versionamento
    const colStr = String(collectionName || '');
    const idStr = String(docId || '');
    if (colStr && idStr && data && ALLOWED_COLLECTIONS.has(colStr)) {
      const targetCol = colStr as keyof Omit<CloudCollectionMap, 'updatedAtIso' | 'match_secrets'>;
      const check = canClientWriteDocument(
        colStr,
        idStr,
        data as Record<string, unknown>,
        store[targetCol][idStr],
        verifiedToken
      );

      if (!check.allowed) {
        return res.status(403).json({
          error: check.reason || 'Escrita nÃ£o autorizada para este documento.',
        });
      }

      store[targetCol][idStr] = check.sanitizedData;

      if (
        colStr === 'matches' &&
        typeof (data as Record<string, unknown>).tableOfficialPassword === 'string' &&
        String((data as Record<string, unknown>).tableOfficialPassword).trim()
      ) {
        const cleanPin = String((data as Record<string, unknown>).tableOfficialPassword)
          .trim()
          .toUpperCase();
        store.match_secrets[idStr] = {
          pinHash: hashSecretPin(cleanPin),
          pinDisplay: cleanPin,
          updatedAtIso: new Date().toISOString(),
        };
      }

      saveCloudStore(store);
      await MirrorDocumentToFirestoreRest(colStr, idStr, check.sanitizedData);

      return res.status(200).json({
        success: true,
        updatedAtIso: store.updatedAtIso,
        revision: check.sanitizedData.revision,
      });
    }

    return res.status(400).json({ error: 'Payload invÃ¡lido para sincronizaÃ§Ã£o.' });
  }

  return res.status(405).json({ error: 'MÃ©todo nÃ£o permitido.' });
}
