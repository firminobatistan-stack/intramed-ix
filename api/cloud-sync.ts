import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  CloudCollectionMap,
  createSignedOperatorToken,
  extractBearerOrHeaderToken,
  getCloudStore,
  hashSecretPin,
  MirrorDocumentToFirestoreRest,
  sanitizeMatchForPublic,
  sanitizeRegistrationForPublic,
  saveCloudStore,
  verifyMasterAdminPassword,
  verifySignedOperatorToken,
  computeAuthorizedServerPrice,
} from './_lib/serverStore';

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
  const isAdmin = authTokenPayload?.role === 'admin';
  const isMesarioForMatch =
    authTokenPayload?.role === 'mesario' && authTokenPayload.matchId === docId;

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
    const merged: Record<string, unknown> = {
      ...(existing || {}),
      ...incoming,
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

      return {
        allowed: true,
        sanitizedData: {
          ...incoming,
          id: docId,
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

  const store = getCloudStore();
  const rawToken = extractBearerOrHeaderToken(req.headers as Record<string, unknown>);
  const verifiedToken = verifySignedOperatorToken(rawToken);
  const isAdminRequest = verifiedToken?.role === 'admin';

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

    const publicRegistrations = isAdminRequest
      ? Object.values(store.registrations)
      : Object.values(store.registrations).map((r) => sanitizeRegistrationForPublic(r));

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
    });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
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
