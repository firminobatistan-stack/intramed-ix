import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  appendServerSyncLog,
  CloudCollectionMap,
  computeAuthorizedServerPrice,
  createSignedOperatorToken,
  ensureCloudStoreHydrated,
  extractBearerOrHeaderToken,
  getCloudStore,
  handleNonApprovedPaymentStatusOnServer,
  hashPassword,
  hashSecretPin,
  isMasterAccount,
  markRegistrationPaidOnServer,
  MASTER_MODERATOR_EMAIL,
  MirrorDocumentToFirestoreRest,
  parseJsonSafe,
  parseSafeBody,
  protectMasterAccount,
  sanitizeMatchForPublic,
  sanitizeRegistrationForPublic,
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

  // Proteção contra sobrescrita por cliente desatualizado (Item 10 da Auditoria)
  if (
    existing &&
    prevRevision > 0 &&
    incomingRevision > 0 &&
    incomingRevision < prevRevision
  ) {
    return {
      allowed: false,
      sanitizedData: existing,
      reason: 'Versão local desatualizada em relação ao servidor.',
    };
  }

  // 1. Súmulas e Partidas: exigem Admin ou Mesário autenticado para aquela partida
  if (collectionName === 'matches' || collectionName === 'match_sheets') {
    if (!isAdmin && !isMesarioForMatch) {
      return {
        allowed: false,
        sanitizedData: existing || {},
        reason: 'Operação restrita à comissão ou ao mesário autenticado da partida.',
      };
    }

    // Mesário não pode alterar a senha da partida
    // Concorrência de eventos da súmula: faz união determinística por ID de evento para evitar perda de lances simultâneos
    let mergedEvents = incoming.events;
    if (
      collectionName === 'match_sheets' &&
      Array.isArray(existing?.events) &&
      Array.isArray(incoming.events)
    ) {
      const incomingIds = new Set(
        (incoming.events as Array<{ id?: string }>).map((ev) => String(ev?.id || ''))
      );
      // Se for uma adição normal (tamanho maior ou igual), preserva eventos recentes que possam ter chegado em paralelo
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

  // 2. Equipes: criação/edição de escudo restrita a Admin (ou seed inicial se ainda não existir)
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

  // 3. Inscrições: criação pública ou edição de perfil social; campos financeiros protegidos!
  if (collectionName === 'registrations') {
    if (!existing) {
      // Criação de nova inscrição: calcula preço no servidor e impede que nasça como 'pago' ou 'aprovado' sem ser Admin
      const requestedSocio = Boolean(incoming.requestedMemberDiscount);
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
        requestedSocio
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
          memberStatus: safeMemberStatus,
          paymentStatus: safePaymentStatus,
          authorizedPrice: serverPrice,
          revision: 1,
          updatedAtIso: nowIso,
        },
      };
    }

    // Atualização de inscrição já existente:
    if (isAdmin) {
      const nextMemberStatus = String(incoming.memberStatus || existing.memberStatus || 'nao_solicitado');
      const serverPrice = computeAuthorizedServerPrice(
        String(incoming.lotId || existing.lotId || 'lote-1-cangaceira'),
        nextMemberStatus,
        Boolean(incoming.requestedMemberDiscount ?? existing.requestedMemberDiscount)
      );

      return {
        allowed: true,
        sanitizedData: {
          ...existing,
          ...incoming,
          id: docId,
          authorizedPrice: serverPrice,
          revision: Math.max(prevRevision + 1, incomingRevision),
          updatedAtIso: nowIso,
        },
      };
    }

    // Cliente comum só pode atualizar seus campos de perfil social (foto, camisa, posição, bio, modalidades)
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

  return { allowed: false, sanitizedData: {}, reason: 'Coleção não autorizada.' };
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

  const store = await ensureCloudStoreHydrated();
  const rawToken = extractBearerOrHeaderToken(req.headers as Record<string, unknown>);
  const verifiedToken = verifySignedOperatorToken(rawToken);
  const operatorRoleLevel = verifiedToken?.role
    ? USER_ROLE_LEVELS[verifiedToken.role as UserRole] || (verifiedToken.role === 'admin' ? 4 : 0)
    : 0;
  const isAdminRequest = operatorRoleLevel >= 4;
  const isMasterRequest = verifiedToken?.role === 'moderador_master' || operatorRoleLevel >= 5;

  // GET: Retorna snapshot sincronizado (com suporte a ?since=updatedAtIso e projeção LGPD sem PII/senhas)
  if (req.method === 'GET') {
    const sinceParam = typeof req.query.since === 'string' ? req.query.since : null;
    if (sinceParam && sinceParam === store.updatedAtIso) {
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
        Boolean(reg.requestedMemberDiscount)
      );
      return { ...reg, authorizedPrice: expected };
    };

    const publicRegistrations = isAdminRequest
      ? Object.values(store.registrations).map((r) => normalizeRegServerPrice(r))
      : Object.values(store.registrations).map((r) =>
          sanitizeRegistrationForPublic(normalizeRegServerPrice(r))
        );

    const publicMatches = Object.values(store.matches).map((m) =>
      sanitizeMatchForPublic(m, isAdminRequest)
    );

    return res.status(200).json({
      success: true,
      updatedAtIso: store.updatedAtIso,
      registrations: publicRegistrations,
      athletes: Object.values(store.athletes),
      teams: Object.values(store.teams),
      matches: publicMatches,
      match_sheets: Object.values(store.match_sheets),
      syncLogs: isAdminRequest ? store.sync_logs || [] : [],
    });
  }

  if (req.method === 'POST') {
    const body = parseSafeBody(req.body);
    const { action, collectionName, docId, data, batch } = body;

    // AÇÃO 1: Autenticação no Servidor para Admin ou Mesário (Itens 4 e 8 da Auditoria)
    if (action === 'verify_operator_pin') {
      const passwordInput = String(body.password || '').trim();
      const matchId = body.matchId ? String(body.matchId).trim() : undefined;
      const officialName = body.officialName ? String(body.officialName).trim() : undefined;

      if (!passwordInput) {
        return res.status(400).json({ ok: false, error: 'Informe a senha de acesso.' });
      }

      // 1a. Senha mestra da Comissão Organizadora
      if (verifyMasterAdminPassword(passwordInput)) {
        const token = createSignedOperatorToken({
          role: 'admin',
          officialName: officialName || 'Comissão Organizadora',
        });
        return res.status(200).json({
          ok: true,
          role: 'admin',
          token,
        });
      }

      // 1b. Senha individual do Mesário da Partida
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
            officialName: officialName || 'Mesário Oficial',
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
          error: 'Senha da partida incorreta. Confira o código com a comissão organizadora.',
        });
      }

      return res.status(401).json({
        ok: false,
        error: 'Senha administrativa incorreta.',
      });
    }

    // AÇÃO 2: Definir / Atualizar Senha do Mesário de uma Partida (Restrito a Admin)
    if (action === 'set_match_pin') {
      if (!isAdminRequest) {
        return res.status(403).json({
          ok: false,
          error: 'Apenas administradores autenticados podem alterar a senha do mesário.',
        });
      }
      const matchId = String(body.matchId || '').trim();
      const newPin = String(body.newPin || '').trim().toUpperCase();
      if (!matchId || !newPin) {
        return res.status(400).json({ ok: false, error: 'Partida e nova senha são obrigatórias.' });
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

    // AÇÃO 2B: Login da Conta do Atleta (Usuário/E-mail + Senha criada no cadastro)
    if (action === 'athlete_login') {
      const identifierInput = String(body.identifier || '')
        .trim()
        .toLowerCase();
      const passwordInput = String(body.password || '').trim();
      const cleanDocInput = identifierInput.replace(/\D/g, '');

      if (!identifierInput) {
        return res
          .status(400)
          .json({ ok: false, error: 'Informe seu usuário ou e-mail.' });
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
          error: 'Conta não encontrada no servidor.',
        });
      }

      const storedHash = String(matchedReg.accountPasswordHash || '');
      if (!storedHash) {
        return res.status(401).json({
          ok: false,
          error: 'Esta inscrição ainda não possui senha configurada. Crie uma senha no cadastro ou contate a organização.',
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

    // AÇÃO 2D: Login Administrativo com Hierarquia RBAC (Níveis 1 a 5)
    if (action === 'admin_login') {
      const emailInput = String(body.email || body.identifier || '')
        .trim()
        .toLowerCase();
      const passwordInput = String(body.password || '').trim();

      if (!emailInput || !passwordInput) {
        return res.status(400).json({
          ok: false,
          error: 'E-mail e senha são obrigatórios.',
        });
      }

      const adminUsers = store.admin_users || {};
      const user = adminUsers[emailInput];

      if (!user) {
        return res.status(401).json({
          ok: false,
          error: 'Usuário administrativo não encontrado.',
        });
      }

      if (user.isActive === false) {
        return res.status(403).json({
          ok: false,
          error: 'Conta inativa ou suspensa. Contate o Moderador Master da Atlética.',
        });
      }

      const inputHash = hashPassword(passwordInput);
      const isInitialPassValid =
        Boolean(user.mustChangePassword) &&
        (passwordInput === (process.env.INTRAMED_MASTER_INITIAL_PASSWORD || 'campeao2027') ||
          inputHash === user.passwordHash);

      const isPasswordValid = inputHash === user.passwordHash || isInitialPassValid;

      if (!isPasswordValid) {
        return res.status(401).json({
          ok: false,
          error: 'Senha administrativa incorreta.',
        });
      }

      const mustChange = Boolean(user.mustChangePassword);
      const userRole = (user.role as UserRole) || 'moderador';
      const token = createSignedOperatorToken({
        role: userRole,
        email: user.email as string,
        officialName: (user.name as string) || 'Operador',
        mustChangePassword: mustChange,
      });

      // Atualiza último login
      user.lastLoginAtIso = new Date().toISOString();
      saveCloudStore(store);

      return res.status(200).json({
        ok: true,
        token,
        role: userRole,
        mustChangePassword: mustChange,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organization: user.organization,
          mustChangePassword: mustChange,
        },
      });
    }

    // AÇÃO 2E: Alteração de Senha (Primeiro Acesso Obrigatório ou Troca Periódica)
    if (action === 'change_admin_password') {
      const emailInput = String(body.email || verifiedToken?.email || MASTER_MODERATOR_EMAIL).trim().toLowerCase();
      const currentPassword = String(body.currentPassword || '').trim();
      const newPassword = String(body.newPassword || '').trim();
      const confirmPassword = String(body.confirmPassword || '').trim();

      const adminUsers = store.admin_users || {};
      const user = adminUsers[emailInput];

      if (!user) {
        return res.status(404).json({
          ok: false,
          error: 'Usuário administrativo não localizado no servidor.',
        });
      }

      // Se não há token assinado na sessão, exige validação explícita da senha atual / inicial
      if (!verifiedToken?.email) {
        if (!currentPassword) {
          return res.status(401).json({
            ok: false,
            error: 'Informe a senha atual ou inicial para autorizar a redefinição.',
          });
        }
        const inputHash = hashPassword(currentPassword);
        const isInitial =
          Boolean(user.mustChangePassword) &&
          (currentPassword === (process.env.INTRAMED_MASTER_INITIAL_PASSWORD || 'campeao2027') ||
            inputHash === user.passwordHash);

        if (inputHash !== user.passwordHash && !isInitial) {
          return res.status(401).json({
            ok: false,
            error: 'Senha atual incorreta.',
          });
        }
      }

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
          ok: false,
          error: 'A nova senha deve possuir no mínimo 6 caracteres.',
        });
      }

      if (confirmPassword && newPassword !== confirmPassword) {
        return res.status(400).json({
          ok: false,
          error: 'A confirmação de senha não confere.',
        });
      }

      const nowIso = new Date().toISOString();
      user.passwordHash = hashPassword(newPassword);
      user.mustChangePassword = false;
      user.updatedAtIso = nowIso;

      if (!store.admin_audit_logs) {
        store.admin_audit_logs = [];
      }
      store.admin_audit_logs.push({
        id: `audit_${Date.now()}_pwd`,
        action: 'password_change',
        performedByEmail: user.email as string,
        performedByRole: user.role as string,
        targetEmail: user.email as string,
        timestampIso: nowIso,
        details: 'Senha alterada com sucesso; pendência de primeiro acesso removida.',
      });

      saveCloudStore(store);
      void MirrorDocumentToFirestoreRest('admin_users', emailInput, user);
      void MirrorDocumentToFirestoreRest('admin_users', 'usr_master_cangaceira', user);

      // Emite novo token desbloqueado
      const newToken = createSignedOperatorToken({
        role: (user.role as UserRole) || 'moderador',
        email: user.email as string,
        officialName: (user.name as string) || 'Operador',
        mustChangePassword: false,
      });

      return res.status(200).json({
        ok: true,
        token: newToken,
        message: 'Senha atualizada com sucesso!',
        mustChangePassword: false,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organization: user.organization,
          mustChangePassword: false,
        },
      });
    }

    // AÇÃO 2F: Listagem de Usuários e Atletas com Gestão RBAC (Restrito a Moderador / Master)
    if (action === 'list_admin_users') {
      if (!isAdminRequest) {
        return res.status(403).json({
          ok: false,
          error: 'Apenas moderadores e master podem visualizar a listagem completa de usuários.',
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

    // AÇÃO 2G: Atualização de Papel/Cargo (Exclusivo do Moderador Master Nível 5)
    if (action === 'update_user_role') {
      if (!isMasterRequest) {
        return res.status(403).json({
          ok: false,
          error: 'Apenas o Moderador Master (Nível 5) pode alterar os cargos de usuários.',
        });
      }

      const targetEmail = String(body.targetEmail || '').trim().toLowerCase();
      const targetRole = String(body.targetRole || '').trim().toLowerCase() as UserRole;
      const validRoles: UserRole[] = ['usuario', 'atleta', 'mesario', 'moderador'];

      if (!targetEmail || !targetRole) {
        return res.status(400).json({
          ok: false,
          error: 'E-mail alvo e novo cargo são obrigatórios.',
        });
      }

      if (!validRoles.includes(targetRole)) {
        return res.status(400).json({
          ok: false,
          error: 'Cargo inválido para atribuição. O cargo Moderador Master é único e intransferível.',
        });
      }

      // Blindagem: Moderador Master não pode ser rebaixado
      if (isMasterAccount(targetEmail)) {
        return res.status(403).json({
          ok: false,
          error: `Operação negada: A conta Moderador Master (${MASTER_MODERATOR_EMAIL}) não pode ser alterada.`,
        });
      }

      const adminUsers = store.admin_users || {};
      let targetUser = adminUsers[targetEmail];
      const nowIso = new Date().toISOString();

      if (!targetUser) {
        // Cria usuário no admin_users se ainda não existia
        targetUser = {
          id: `usr_${Date.now()}`,
          email: targetEmail,
          name: String(body.targetName || targetEmail.split('@')[0]),
          role: targetRole,
          organization: 'Associação Atlética Acadêmica de Medicina UEMA – Cangaceira',
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
        message: `Cargo do usuário ${targetEmail} atualizado para ${targetRole}.`,
        user: {
          email: targetUser.email,
          role: targetUser.role,
        },
      });
    }

    // AÇÃO 2H: Ativação / Desativação de Usuário (Exclusivo do Moderador Master Nível 5)
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
          error: 'A conta Moderador Master não pode ser desativada.',
        });
      }

      const adminUsers = store.admin_users || {};
      const targetUser = adminUsers[targetEmail];

      if (!targetUser) {
        return res.status(404).json({
          ok: false,
          error: 'Usuário não encontrado.',
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

    // AÇÃO 2I: Validação e Auditoria de Sócios da Atlética
    if (action === 'review_member_status') {
      if (!isAdminRequest) {
        return res.status(403).json({
          ok: false,
          error: 'Apenas a moderação pode aprovar ou rejeitar comprovação de sócios.',
        });
      }

      const registrationId = String(body.registrationId || '').trim();
      const approved = Boolean(body.approved);
      const justification = String(body.justification || '').trim();

      const reg = store.registrations[registrationId];
      if (!reg) {
        return res.status(404).json({
          ok: false,
          error: 'Inscrição não encontrada.',
        });
      }

      const nowIso = new Date().toISOString();
      reg.isMember = approved;
      reg.memberStatus = approved ? 'aprovado' : 'rejeitado';
      reg.memberVerificationStatus = approved ? 'approved' : 'rejected';
      if (!approved && justification) {
        reg.rejectionReason = justification;
      }
      reg.memberVerifiedAtIso = nowIso;
      reg.memberVerifiedBy = verifiedToken?.email || 'moderação';

      if (!store.admin_audit_logs) {
        store.admin_audit_logs = [];
      }
      store.admin_audit_logs.push({
        id: `audit_${Date.now()}_member`,
        action: approved ? 'approve_member' : 'reject_member',
        performedByEmail: verifiedToken?.email || 'moderação',
        performedByRole: verifiedToken?.role || 'moderador',
        targetId: registrationId,
        timestampIso: nowIso,
        details: approved
          ? 'Comprovante de sócio aprovado'
          : `Comprovante rejeitado: ${justification || 'Sem justificativa'}`,
      });

      saveCloudStore(store);
      void MirrorDocumentToFirestoreRest('registrations', registrationId, reg);

      return res.status(200).json({
        ok: true,
        message: approved ? 'Condição de sócio aprovada!' : 'Solicitação de sócio rejeitada.',
        registration: sanitizeRegistrationForPublic(reg),
      });
    }

    // AÇÃO 2C: Reconciliação Geral de Pagamentos Pendentes no Mercado Pago (Restrito a Admin)
    if (action === 'reconcile_pending_payments') {
      if (!isAdminRequest) {
        return res.status(403).json({
          ok: false,
          error: 'Apenas administradores podem acionar a reconciliação com o Mercado Pago.',
        });
      }

      const mpAccessToken = (process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
      if (!mpAccessToken) {
        return res.status(500).json({
          ok: false,
          error: 'Credencial MERCADOPAGO_ACCESS_TOKEN não disponível nesta instância.',
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
                Boolean(reg.requestedMemberDiscount)
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
          // Continua para o próximo registro
        }
      }

      appendServerSyncLog({
        category: 'payment_reconcile',
        level: 'info',
        message: `Reconciliação manual concluída: ${reconciledCount} pagamentos aprovados de ${pendingRegs.length} verificados`,
        details: { pendingTotal: pendingRegs.length, reconciledCount, checkedDetails },
      });

      return res.status(200).json({
        ok: true,
        checkedTotal: pendingRegs.length,
        reconciledCount,
        details: checkedDetails,
      });
    }

    // AÇÃO 3: Sincronização em Lote (Batch)
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
            void MirrorDocumentToFirestoreRest(col, id, check.sanitizedData);
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

    // AÇÃO 4: Sincronização de Documento Único com Whitelist e Versionamento
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
          error: check.reason || 'Escrita não autorizada para este documento.',
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
      void MirrorDocumentToFirestoreRest(colStr, idStr, check.sanitizedData);

      return res.status(200).json({
        success: true,
        updatedAtIso: store.updatedAtIso,
        revision: check.sanitizedData.revision,
      });
    }

    return res.status(400).json({ error: 'Payload inválido para sincronização.' });
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}
