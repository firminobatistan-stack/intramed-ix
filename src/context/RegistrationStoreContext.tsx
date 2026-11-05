import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  TournamentEvent,
  Registration,
  FinancialAuditLog,
  RegistrationLot,
  ModalitySlug,
  TurmaMedicina,
} from '../types/domain';
import {
  INITIAL_TOURNAMENT_EVENT,
  INITIAL_DEMO_REGISTRATIONS,
  INITIAL_FINANCIAL_AUDIT_LOGS,
  resolveLotAuthorizedPrice,
} from '../data/registrationData';
import { OFFICIAL_MODALITIES } from '../data/officialData';
import {
  useCompetitionStore,
  getStoredOperatorToken,
} from './CompetitionStoreContext';
import { generateUniqueId } from '../utils/statsEngine';
import { enqueueOfflineMutation } from '../utils/offlineSyncQueue';

const REGISTRATIONS_STORAGE_KEY = 'intramed_registrations_store_v1';
const MY_REGISTRATIONS_KEY = 'intramed_my_registered_ids_v1';
const LOCAL_ATHLETE_CREDENTIALS_KEY = 'intramed_athlete_credentials_v2';
const SYNC_CHANNEL_NAME = 'intramed_registration_channel';

/**
 * Gera hash unidirecional para verificação offline sem armazenar senha em texto puro no localStorage.
 */
export function computeClientCredentialDigest(rawPassword: string): string {
  const clean = rawPassword.trim();
  let h1 = 0xdeadbeef ^ clean.length;
  let h2 = 0x41c6ce57 ^ clean.length;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `h2_${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0)
    .toString(16)
    .padStart(8, '0')}`;
}

export interface CreateRegistrationPayload {
  eventId: string;
  lotId: string;
  athleteName: string;
  athleteEmail: string;
  athletePhone: string;
  athleteDocument: string;
  accountUsername?: string;
  accountPassword?: string;
  turma: TurmaMedicina;
  turmaLabel: string;
  teamId: string;
  teamName: string;
  modalityId?: ModalitySlug | 'todas';
  modalityName?: string;
  selectedModalities?: ModalitySlug[];
  categoryName: string;
  requestedMemberDiscount: boolean;
  memberDocumentProofUrl?: string;
  avatarUrl?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
  bio?: string | null;
  instagramHandle?: string | null;
}

interface RegistrationContextValue {
  tournamentEvent: TournamentEvent;
  registrations: Registration[];
  myRegistrations: Registration[];
  hasCompletedRegistration: boolean;
  auditLogs: FinancialAuditLog[];
  activeLot: RegistrationLot | undefined;
  createRegistration: (payload: CreateRegistrationPayload) => Promise<Registration>;
  updateRegistrationSocialProfile: (
    registrationId: string,
    data: {
      athleteName?: string;
      avatarUrl?: string | null;
      jerseyNumber?: number | null;
      position?: string | null;
      bio?: string | null;
      instagramHandle?: string | null;
      selectedModalities?: ModalitySlug[];
    }
  ) => Promise<void>;
  validateMemberDiscount: (
    registrationId: string,
    approved: boolean,
    notes?: string
  ) => Promise<void>;
  simulatePaymentConfirmation: (
    registrationId: string,
    method: 'pix' | 'credit_card',
    simulatedMpPaymentId?: string
  ) => Promise<void>;
  cancelRegistration: (registrationId: string, reason?: string) => Promise<void>;
  getRegistrationById: (id: string) => Registration | undefined;
  getMyRegistrations: (query: string) => Registration[];
}

const RegistrationContext = createContext<RegistrationContextValue | null>(null);

const pushRegistrationToCloud = (reg: Registration, accountPassword?: string) => {
  if (typeof window === 'undefined') return;
  try {
    const cleanReg = JSON.parse(JSON.stringify(reg));
    if (accountPassword) {
      cleanReg.accountPassword = accountPassword;
    }
    enqueueOfflineMutation('registrations', reg.id, cleanReg);
  } catch {
    // Silencioso
  }
};

/**
 * Calcula o preço vigente oficial pelo lote configurado para inscrições pendentes.
 */
function normalizePendingRegistrationPrice(reg: Registration): Registration {
  const normalizedModName =
    reg.modalityName?.includes('10 Modalidades')
      ? 'Passaporte Geral (Todas as 16 Modalidades)'
      : reg.modalityName;
  if (reg.paymentStatus === 'pago') {
    return normalizedModName !== reg.modalityName
      ? { ...reg, modalityName: normalizedModName }
      : reg;
  }
  const expectedPrice = resolveLotAuthorizedPrice(
    reg.lotId,
    reg.memberStatus,
    reg.requestedMemberDiscount
  );
  if (reg.authorizedPrice === expectedPrice && normalizedModName === reg.modalityName) {
    return reg;
  }
  return {
    ...reg,
    modalityName: normalizedModName,
    authorizedPrice: expectedPrice,
  };
}

/**
 * Mascara dados pessoais sensíveis (CPF e Telefone) de terceiros ao salvar no localStorage (Item 21 da Auditoria).
 */
function sanitizeRegistrationPiiForLocalCache(
  reg: Registration,
  myIds: string[],
  isAdmin: boolean
): Registration {
  const normalized = normalizePendingRegistrationPrice(reg);
  if (isAdmin || myIds.includes(normalized.id)) {
    return normalized;
  }
  const cleanDoc = (normalized.athleteDocument || '').replace(/\D/g, '');
  return {
    ...normalized,
    athleteDocument:
      cleanDoc.length >= 4 ? `***.***.*${cleanDoc.slice(-4)}` : '***',
    athletePhone: '',
    memberDocumentProofUrl: null,
  };
}

export const RegistrationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    currentUser,
    canOperateOfficialData,
    upsertParticipantAthlete,
  } = useCompetitionStore();

  const [tournamentEvent] = useState<TournamentEvent>(INITIAL_TOURNAMENT_EVENT);

  const [myRegisteredIds, setMyRegisteredIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(MY_REGISTRATIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [registrations, setRegistrations] = useState<Registration[]>(() => {
    try {
      const saved = localStorage.getItem(REGISTRATIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.registrations)) {
          return (parsed.registrations as Registration[]).map((r) =>
            normalizePendingRegistrationPrice(r)
          );
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_DEMO_REGISTRATIONS;
  });

  const [auditLogs, setAuditLogs] = useState<FinancialAuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(REGISTRATIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.auditLogs)) {
          return parsed.auditLogs;
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_FINANCIAL_AUDIT_LOGS;
  });

  const syncedRegSignaturesRef = useRef<Map<string, string>>(new Map());

  // Salva no LocalStorage com Debounce e proteção LGPD para inscrições de terceiros (Itens 21 e 22 da Auditoria)
  useEffect(() => {
    const isAdmin = canOperateOfficialData();
    const timer = setTimeout(() => {
      try {
        const safeRegs = registrations.map((r) =>
          sanitizeRegistrationPiiForLocalCache(r, myRegisteredIds, isAdmin)
        );
        localStorage.setItem(
          REGISTRATIONS_STORAGE_KEY,
          JSON.stringify({ registrations: safeRegs, auditLogs })
        );
      } catch {
        // Quota exceeded
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [registrations, auditLogs, myRegisteredIds, canOperateOfficialData]);

  // Garante que toda inscrição existente na plataforma tenha seu perfil social de atleta publicado localmente,
  // sem disparar amplificação de escrita na nuvem a cada ciclo de polling (Item 24 da Auditoria)
  useEffect(() => {
    if (!registrations || registrations.length === 0) return;

    registrations.forEach((reg) => {
      if (reg.paymentStatus === 'cancelado') return;
      const sig = `${reg.updatedAtIso}_${reg.paymentStatus}_${reg.memberStatus}_${reg.avatarUrl || ''}_${reg.jerseyNumber || ''}_${reg.position || ''}`;
      if (syncedRegSignaturesRef.current.get(reg.id) === sig) return;
      syncedRegSignaturesRef.current.set(reg.id, sig);

      upsertParticipantAthlete({
        id: reg.linkedAthleteId || `ath-${reg.id}`,
        name: reg.athleteName,
        email: reg.athleteEmail,
        teamId: reg.teamId,
        turma: reg.turma,
        turmaLabel: reg.turmaLabel,
        jerseyNumber: reg.jerseyNumber ?? null,
        position: reg.position || 'Atleta Inscrito',
        bio: reg.bio ?? null,
        instagramHandle: reg.instagramHandle ?? null,
        avatarUrl: reg.avatarUrl ?? null,
        modalityIds:
          reg.selectedModalities && reg.selectedModalities.length > 0
            ? reg.selectedModalities
            : OFFICIAL_MODALITIES.map((m) => m.id),
        registrationId: reg.id,
        paymentStatus: reg.paymentStatus,
        memberStatus: reg.memberStatus,
        autoLogin: false,
      });
    });
  }, [registrations, upsertParticipantAthlete]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);

    channel.onmessage = (ev) => {
      if (ev.data && ev.data.type === 'SYNC_REGISTRATIONS') {
        if (Array.isArray(ev.data.registrations)) {
          setRegistrations(
            (ev.data.registrations as Registration[]).map((r) =>
              normalizePendingRegistrationPrice(r)
            )
          );
        }
        if (Array.isArray(ev.data.auditLogs)) {
          setAuditLogs(ev.data.auditLogs);
        }
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  // Recebe as inscrições do polling unificado do CompetitionStoreContext (fonte única de verdade via /api/cloud-sync)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleCloudRegistrations = (ev: Event) => {
      const customEv = ev as CustomEvent<Registration[]>;
      const remoteList = customEv.detail;
      if (!Array.isArray(remoteList) || remoteList.length === 0) return;

      setRegistrations((prev) => {
        const byId = new Map<string, Registration>();
        for (const r of prev) byId.set(r.id, r);
        let hasDiff = false;

        for (const cr of remoteList) {
          if (!cr || !cr.id) continue;
          const ex = byId.get(cr.id);
          const exRev = ex?.revision ?? 0;
          const crRev = cr.revision ?? 0;
          const isNewerTime =
            !ex ||
            (cr.updatedAtIso &&
              ex.updatedAtIso &&
              new Date(cr.updatedAtIso).getTime() >
                new Date(ex.updatedAtIso).getTime());

          if (
            !ex ||
            crRev > exRev ||
            (crRev >= exRev &&
              (isNewerTime ||
                ex.paymentStatus !== cr.paymentStatus ||
                ex.memberStatus !== cr.memberStatus))
          ) {
            // Se este dispositivo é o titular da inscrição e o servidor mascarou o CPF no GET público, preserva o CPF local do titular
            const mergedReg: Registration = normalizePendingRegistrationPrice(
              ex
                ? {
                    ...ex,
                    ...cr,
                    athleteDocument:
                      cr.athleteDocument?.startsWith('***') && ex.athleteDocument
                        ? ex.athleteDocument
                        : cr.athleteDocument,
                    athletePhone: cr.athletePhone || ex.athletePhone,
                  }
                : cr
            );
            byId.set(cr.id, mergedReg);
            hasDiff = true;
          }
        }

        if (!hasDiff) return prev;
        const merged = Array.from(byId.values());
        merged.sort(
          (a, b) =>
            new Date(b.createdAtIso).getTime() -
            new Date(a.createdAtIso).getTime()
        );
        return merged;
      });
    };

    window.addEventListener(
      'intramed-cloud-registrations',
      handleCloudRegistrations
    );
    return () => {
      window.removeEventListener(
        'intramed-cloud-registrations',
        handleCloudRegistrations
      );
    };
  }, []);

  const broadcastState = useCallback(
    (regs: Registration[], logs: FinancialAuditLog[]) => {
      if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
      try {
        const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
        channel.postMessage({
          type: 'SYNC_REGISTRATIONS',
          registrations: regs,
          auditLogs: logs,
        });
        channel.close();
      } catch {
        // Silencioso
      }
    },
    []
  );

  const activeLot = useMemo(() => {
    return (
      tournamentEvent.lots.find((l) => l.isActive) || tournamentEvent.lots[0]
    );
  }, [tournamentEvent]);

  // 1. CRIAR INSCRIÇÃO + CRIAR PERFIL SOCIAL DO ATLETA + LOGIN AUTOMÁTICO
  const createRegistration = useCallback(
    async (payload: CreateRegistrationPayload): Promise<Registration> => {
      const lot =
        tournamentEvent.lots.find((l) => l.id === payload.lotId) || activeLot;

      if (!lot) {
        throw new Error(
          'Nenhum lote de inscrição ativo encontrado para o evento.'
        );
      }

      const isSocioRequested = payload.requestedMemberDiscount;
      const initialPrice = isSocioRequested
        ? lot.priceMember
        : lot.priceNonMember;

      const regId = generateUniqueId('reg');
      const linkedAthleteId = `ath-${regId}`;
      const chosenModalities =
        payload.selectedModalities && payload.selectedModalities.length > 0
          ? payload.selectedModalities
          : OFFICIAL_MODALITIES.map((m) => m.id);

      const nowIso = new Date().toISOString();
      const resolvedUsername =
        payload.accountUsername?.trim().toLowerCase() ||
        payload.athleteEmail.trim().toLowerCase().split('@')[0] ||
        payload.athleteEmail.trim().toLowerCase();

      const newRegistration: Registration = {
        id: regId,
        eventId: payload.eventId,
        lotId: lot.id,
        userId: `usr-${linkedAthleteId}`,
        linkedAthleteId,
        accountUsername: resolvedUsername,
        hasAccountPassword: Boolean(payload.accountPassword?.trim()),
        athleteName: payload.athleteName.trim(),
        athleteEmail: payload.athleteEmail.trim(),
        athletePhone: payload.athletePhone.trim(),
        athleteDocument: payload.athleteDocument.trim(),
        turma: payload.turma,
        turmaLabel: payload.turmaLabel,
        teamId: payload.teamId,
        teamName: payload.teamName,
        modalityId: payload.modalityId || 'todas',
        modalityName:
          payload.modalityName ||
          'Passaporte Geral (Todas as 16 Modalidades)',
        selectedModalities: chosenModalities,
        categoryName: payload.categoryName,
        requestedMemberDiscount: isSocioRequested,
        memberStatus: isSocioRequested ? 'pendente' : 'nao_solicitado',
        memberDocumentProofUrl: payload.memberDocumentProofUrl || null,
        memberNotes: isSocioRequested
          ? 'Aguardando validação da diretoria da Atlética Cangaceira.'
          : undefined,
        paymentStatus: isSocioRequested
          ? 'aguardando_validacao'
          : 'pendente',
        authorizedPrice: initialPrice,
        avatarUrl: payload.avatarUrl || null,
        jerseyNumber: payload.jerseyNumber ?? null,
        position: payload.position?.trim() || 'Atleta Inscrito',
        bio: payload.bio?.trim() || null,
        instagramHandle: payload.instagramHandle?.trim() || null,
        createdAtIso: nowIso,
        updatedAtIso: nowIso,
        revision: 1,
      };

      upsertParticipantAthlete({
        id: linkedAthleteId,
        name: newRegistration.athleteName,
        email: newRegistration.athleteEmail,
        teamId: newRegistration.teamId,
        turma: newRegistration.turma,
        turmaLabel: newRegistration.turmaLabel,
        jerseyNumber: newRegistration.jerseyNumber,
        position: newRegistration.position,
        bio: newRegistration.bio,
        instagramHandle: newRegistration.instagramHandle,
        avatarUrl: newRegistration.avatarUrl,
        modalityIds: chosenModalities,
        registrationId: newRegistration.id,
        paymentStatus: newRegistration.paymentStatus,
        memberStatus: newRegistration.memberStatus,
        autoLogin: true,
      });

      const auditEntry: FinancialAuditLog = {
        id: generateUniqueId('audit'),
        entity: 'registration',
        entityId: newRegistration.id,
        action: 'CRIAR_INSCRICAO',
        adminUserName: payload.athleteName,
        metadata: {
          requestedMemberDiscount: isSocioRequested,
          authorizedPrice: initialPrice,
          lotName: lot.name,
          modality: payload.modalityName,
        },
        timestampIso: nowIso,
      };

      const nextRegs = [newRegistration, ...registrations];
      const nextLogs = [auditEntry, ...auditLogs];
      setRegistrations(nextRegs);
      setAuditLogs(nextLogs);
      broadcastState(nextRegs, nextLogs);

      pushRegistrationToCloud(newRegistration, payload.accountPassword?.trim());
      try {
        localStorage.removeItem('intramed_athlete_credentials_v1');
        if (payload.accountPassword?.trim()) {
          const digest = computeClientCredentialDigest(payload.accountPassword);
          const savedCredsRaw = localStorage.getItem(LOCAL_ATHLETE_CREDENTIALS_KEY);
          const savedCreds: Record<string, { regId: string; passDigest: string }> =
            savedCredsRaw ? JSON.parse(savedCredsRaw) : {};
          savedCreds[resolvedUsername] = {
            regId: newRegistration.id,
            passDigest: digest,
          };
          savedCreds[newRegistration.athleteEmail.toLowerCase()] = {
            regId: newRegistration.id,
            passDigest: digest,
          };
          localStorage.setItem(LOCAL_ATHLETE_CREDENTIALS_KEY, JSON.stringify(savedCreds));
        }
      } catch {
        // Silencioso
      }

      try {
        setMyRegisteredIds((prevIds) => {
          const nextIds = prevIds.includes(newRegistration.id)
            ? prevIds
            : [...prevIds, newRegistration.id];
          localStorage.setItem(MY_REGISTRATIONS_KEY, JSON.stringify(nextIds));
          return nextIds;
        });
      } catch {
        // Silencioso
      }

      return newRegistration;
    },
    [
      tournamentEvent,
      activeLot,
      upsertParticipantAthlete,
      registrations,
      auditLogs,
      broadcastState,
    ]
  );

  // ATUALIZAR PERFIL SOCIAL VINCULADO À INSCRIÇÃO (Sem efeitos colaterais dentro do setState — Item 14 da Auditoria)
  const updateRegistrationSocialProfile = useCallback(
    async (
      registrationId: string,
      data: {
        athleteName?: string;
        avatarUrl?: string | null;
        jerseyNumber?: number | null;
        position?: string | null;
        bio?: string | null;
        instagramHandle?: string | null;
        selectedModalities?: ModalitySlug[];
      }
    ): Promise<void> => {
      const target = registrations.find((r) => r.id === registrationId);
      if (!target) return;

      const updated: Registration = {
        ...target,
        athleteName:
          data.athleteName !== undefined && data.athleteName.trim()
            ? data.athleteName.trim()
            : target.athleteName,
        avatarUrl:
          data.avatarUrl !== undefined ? data.avatarUrl : target.avatarUrl,
        jerseyNumber:
          data.jerseyNumber !== undefined
            ? data.jerseyNumber
            : target.jerseyNumber,
        position: data.position !== undefined ? data.position : target.position,
        bio: data.bio !== undefined ? data.bio : target.bio,
        instagramHandle:
          data.instagramHandle !== undefined
            ? data.instagramHandle
            : target.instagramHandle,
        selectedModalities:
          data.selectedModalities !== undefined
            ? data.selectedModalities
            : target.selectedModalities,
        updatedAtIso: new Date().toISOString(),
        revision: (target.revision ?? 0) + 1,
      };

      const nextRegs = registrations.map((r) =>
        r.id === registrationId ? updated : r
      );
      setRegistrations(nextRegs);
      broadcastState(nextRegs, auditLogs);
      pushRegistrationToCloud(updated);
    },
    [registrations, auditLogs, broadcastState]
  );

  // 2. VALIDAÇÃO MANUAL DE SÓCIO POR ADMINISTRADOR
  const validateMemberDiscount = useCallback(
    async (
      registrationId: string,
      approved: boolean,
      notes?: string
    ): Promise<void> => {
      const isAdmin = canOperateOfficialData();
      if (!isAdmin) {
        throw new Error(
          'Permissão negada: Apenas administradores e organizadores da Atlética podem validar a condição de sócio.'
        );
      }

      const target = registrations.find((r) => r.id === registrationId);
      if (!target) return;

      const lot =
        tournamentEvent.lots.find((l) => l.id === target.lotId) || activeLot;
      const finalPrice = approved
        ? lot
          ? lot.priceMember
          : target.authorizedPrice
        : lot
        ? lot.priceNonMember
        : target.authorizedPrice;

      const nowIso = new Date().toISOString();
      const updated: Registration = {
        ...target,
        memberStatus: approved ? 'aprovado' : 'rejeitado',
        paymentStatus: 'pendente',
        authorizedPrice: finalPrice,
        memberNotes:
          notes ||
          (approved ? 'Aprovado pela Diretoria' : 'Rejeitado pela Diretoria'),
        validatedByAdminId: currentUser?.id || 'admin-root',
        validatedByAdminName: currentUser?.name || 'Administrador IntraMed',
        validatedAtIso: nowIso,
        updatedAtIso: nowIso,
        revision: (target.revision ?? 0) + 1,
      };

      const auditEntry: FinancialAuditLog = {
        id: generateUniqueId('audit'),
        entity: 'registration',
        entityId: target.id,
        action: approved ? 'APROVAR_SOCIO' : 'REJEITAR_SOCIO',
        adminUserId: currentUser?.id,
        adminUserName: currentUser?.name || 'Administrador IntraMed',
        metadata: {
          athleteName: target.athleteName,
          previousPrice: target.authorizedPrice,
          newAuthorizedPrice: finalPrice,
          justification:
            notes ||
            (approved
              ? 'Sócio verificado na lista oficial'
              : 'Não localizado na lista de associados'),
        },
        timestampIso: nowIso,
      };

      const nextRegs = registrations.map((r) =>
        r.id === registrationId ? updated : r
      );
      const nextLogs = [auditEntry, ...auditLogs];
      setRegistrations(nextRegs);
      setAuditLogs(nextLogs);
      broadcastState(nextRegs, nextLogs);
      pushRegistrationToCloud(updated);
    },
    [
      canOperateOfficialData,
      registrations,
      auditLogs,
      tournamentEvent,
      activeLot,
      currentUser,
      broadcastState,
    ]
  );

  // 3. CONFIRMAÇÃO DE PAGAMENTO (Somente após checagem do servidor ou ação explícita de Admin autenticado — Item 6 da Auditoria)
  const simulatePaymentConfirmation = useCallback(
    async (
      registrationId: string,
      method: 'pix' | 'credit_card',
      verifiedMpPaymentId?: string
    ): Promise<void> => {
      const isAdmin = canOperateOfficialData();
      // Se não for Admin com token e não houver um ID numérico real verificado pelo endpoint do Mercado Pago, recusa!
      if (!isAdmin && (!verifiedMpPaymentId || !/^\d{5,25}$/.test(verifiedMpPaymentId))) {
        throw new Error(
          'A confirmação de pagamento exige verificação oficial junto ao servidor do Mercado Pago.'
        );
      }

      const paymentId =
        verifiedMpPaymentId ||
        `ADMIN-CONF-${Date.now()}`;

      const target = registrations.find((r) => r.id === registrationId);
      if (!target) return;

      const nowIso = new Date().toISOString();
      const updated: Registration = {
        ...target,
        paymentStatus: 'pago',
        paymentMethod: method,
        mpPaymentId: paymentId,
        paidAtIso: nowIso,
        updatedAtIso: nowIso,
        revision: (target.revision ?? 0) + 1,
      };

      const auditEntry: FinancialAuditLog = {
        id: generateUniqueId('audit'),
        entity: 'payment',
        entityId: target.id,
        action: 'CONFIRMAR_PAGAMENTO_WEBHOOK',
        adminUserName: isAdmin
          ? currentUser?.name || 'Comissão Organizadora'
          : 'Mercado Pago Gateway (Confirmado)',
        metadata: {
          athleteName: target.athleteName,
          amount: target.authorizedPrice,
          method,
          mpPaymentId: paymentId,
          status: 'approved',
        },
        timestampIso: nowIso,
      };

      const nextRegs = registrations.map((r) =>
        r.id === registrationId ? updated : r
      );
      const nextLogs = [auditEntry, ...auditLogs];
      setRegistrations(nextRegs);
      setAuditLogs(nextLogs);
      broadcastState(nextRegs, nextLogs);

      if (isAdmin) {
        pushRegistrationToCloud(updated);
      }
    },
    [canOperateOfficialData, registrations, auditLogs, currentUser, broadcastState]
  );

  // 4. CANCELAMENTO DE INSCRIÇÃO
  const cancelRegistration = useCallback(
    async (registrationId: string, reason?: string): Promise<void> => {
      const target = registrations.find((r) => r.id === registrationId);
      if (!target) return;

      const nowIso = new Date().toISOString();
      const updated: Registration = {
        ...target,
        paymentStatus: 'cancelado',
        memberNotes: reason ? `Cancelada: ${reason}` : target.memberNotes,
        updatedAtIso: nowIso,
        revision: (target.revision ?? 0) + 1,
      };

      const auditEntry: FinancialAuditLog = {
        id: generateUniqueId('audit'),
        entity: 'registration',
        entityId: target.id,
        action: 'CANCELAR_INSCRICAO',
        adminUserName: currentUser?.name || 'Usuário / Mesa',
        metadata: {
          reason: reason || 'Cancelamento solicitado',
        },
        timestampIso: nowIso,
      };

      const nextRegs = registrations.map((r) =>
        r.id === registrationId ? updated : r
      );
      const nextLogs = [auditEntry, ...auditLogs];
      setRegistrations(nextRegs);
      setAuditLogs(nextLogs);
      broadcastState(nextRegs, nextLogs);
      pushRegistrationToCloud(updated);
    },
    [registrations, auditLogs, currentUser, broadcastState]
  );

  const getRegistrationById = useCallback(
    (id: string) => registrations.find((r) => r.id === id),
    [registrations]
  );

  const getMyRegistrations = useCallback(
    (query: string) => {
      const q = query.toLowerCase().trim();
      if (!q) return [];
      return registrations.filter(
        (r) =>
          r.athleteEmail.toLowerCase().includes(q) ||
          r.athleteDocument.toLowerCase().includes(q) ||
          r.athleteName.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
      );
    },
    [registrations]
  );

  const myRegistrations = useMemo(() => {
    return registrations.filter((r) => {
      if (myRegisteredIds.includes(r.id)) return true;
      if (
        currentUser?.email &&
        r.athleteEmail.toLowerCase() === currentUser.email.toLowerCase()
      ) {
        return true;
      }
      if (
        currentUser?.linkedAthleteId &&
        r.linkedAthleteId === currentUser.linkedAthleteId
      ) {
        return true;
      }
      return false;
    });
  }, [registrations, myRegisteredIds, currentUser]);

  const hasCompletedRegistration = useMemo(
    () => myRegistrations.some((r) => r.paymentStatus !== 'cancelado'),
    [myRegistrations]
  );

  const value = useMemo<RegistrationContextValue>(
    () => ({
      tournamentEvent,
      registrations,
      myRegistrations,
      hasCompletedRegistration,
      auditLogs,
      activeLot,
      createRegistration,
      updateRegistrationSocialProfile,
      validateMemberDiscount,
      simulatePaymentConfirmation,
      cancelRegistration,
      getRegistrationById,
      getMyRegistrations,
    }),
    [
      tournamentEvent,
      registrations,
      myRegistrations,
      hasCompletedRegistration,
      auditLogs,
      activeLot,
      createRegistration,
      updateRegistrationSocialProfile,
      validateMemberDiscount,
      simulatePaymentConfirmation,
      cancelRegistration,
      getRegistrationById,
      getMyRegistrations,
    ]
  );

  return (
    <RegistrationContext.Provider value={value}>
      {children}
    </RegistrationContext.Provider>
  );
};

export function useRegistrationStore(): RegistrationContextValue {
  const ctx = useContext(RegistrationContext);
  if (!ctx) {
    throw new Error(
      'useRegistrationStore deve ser utilizado dentro de RegistrationProvider'
    );
  }
  return ctx;
}
