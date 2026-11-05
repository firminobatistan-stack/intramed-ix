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
} from '../data/registrationData';
import { OFFICIAL_MODALITIES } from '../data/officialData';
import { useCompetitionStore } from './CompetitionStoreContext';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';

const REGISTRATIONS_STORAGE_KEY = 'intramed_registrations_store_v1';
const MY_REGISTRATIONS_KEY = 'intramed_my_registered_ids_v1';
const SYNC_CHANNEL_NAME = 'intramed_registration_channel';

export interface CreateRegistrationPayload {
  eventId: string;
  lotId: string;
  athleteName: string;
  athleteEmail: string;
  athletePhone: string;
  athleteDocument: string;
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

const pushRegistrationToCloud = (reg: Registration) => {
  if (typeof window === 'undefined') return;
  try {
    const cleanReg = JSON.parse(JSON.stringify(reg));
    fetch('/api/cloud-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collectionName: 'registrations',
        docId: reg.id,
        data: cleanReg,
      }),
    }).catch(() => {
      fetch('https://intramedix.vercel.app/api/cloud-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionName: 'registrations',
          docId: reg.id,
          data: cleanReg,
        }),
      }).catch(() => {});
    });
  } catch {
    // Silencioso
  }
};

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
          return parsed.registrations;
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

  // Salva no LocalStorage e sincroniza com abas abertas
  useEffect(() => {
    try {
      localStorage.setItem(
        REGISTRATIONS_STORAGE_KEY,
        JSON.stringify({ registrations, auditLogs })
      );
    } catch {
      // Quota exceeded
    }
  }, [registrations, auditLogs]);

  // Garante que toda inscrição existente na plataforma tenha seu perfil social de atleta publicado
  // para que todos os usuários vejam os inscritos na rede social e nas equipes
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
          setRegistrations(ev.data.registrations);
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

  // Sincronização em tempo real via Cloud Firestore
  useEffect(() => {
    try {
      const colRef = collection(db, 'registrations');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const firestoreList: Registration[] = [];
            snapshot.forEach((snap) => {
              firestoreList.push(snap.data() as Registration);
            });
            setRegistrations((prev) => {
              const byId = new Map<string, Registration>();
              for (const r of prev) byId.set(r.id, r);
              for (const fr of firestoreList) {
                const ex = byId.get(fr.id);
                byId.set(fr.id, ex ? { ...ex, ...fr } : fr);
              }
              const merged = Array.from(byId.values());
              merged.sort(
                (a, b) =>
                  new Date(b.createdAtIso).getTime() -
                  new Date(a.createdAtIso).getTime()
              );
              return merged;
            });
          }
        },
        (error) => {
          console.warn('Firestore onSnapshot notice:', error.message);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn('Failed to attach Firestore listener:', err);
    }
  }, []);

  // Sincronização em tempo real via API Cloud Sync (/api/cloud-sync) entre diferentes dispositivos
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncWithCloudServer = async () => {
      try {
        const res = await fetch('/api/cloud-sync').catch(() =>
          fetch('https://intramedix.vercel.app/api/cloud-sync')
        );
        if (!res || !res.ok) return;
        const payload = await res.json();
        if (!payload || !Array.isArray(payload.registrations)) return;

        if (payload.registrations.length > 0) {
          setRegistrations((prev) => {
            const byId = new Map<string, Registration>();
            for (const r of prev) byId.set(r.id, r);
            let hasDiff = false;
            for (const cr of payload.registrations as Registration[]) {
              if (!cr || !cr.id) continue;
              const ex = byId.get(cr.id);
              if (
                !ex ||
                ex.updatedAtIso !== cr.updatedAtIso ||
                ex.paymentStatus !== cr.paymentStatus ||
                ex.memberStatus !== cr.memberStatus ||
                ex.avatarUrl !== cr.avatarUrl ||
                ex.jerseyNumber !== cr.jerseyNumber
              ) {
                byId.set(cr.id, ex ? { ...ex, ...cr } : cr);
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
        }
      } catch {
        // Silencioso
      }
    };

    syncWithCloudServer();
    const interval = setInterval(syncWithCloudServer, 5000);
    return () => clearInterval(interval);
  }, []);

  const broadcastState = (regs: Registration[], logs: FinancialAuditLog[]) => {
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
  };

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
        throw new Error('Nenhum lote de inscrição ativo encontrado para o evento.');
      }

      const isSocioRequested = payload.requestedMemberDiscount;
      const initialPrice = isSocioRequested
        ? lot.priceMember
        : lot.priceNonMember;

      const regId = `reg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const linkedAthleteId = `ath-${regId}`;
      const chosenModalities =
        payload.selectedModalities && payload.selectedModalities.length > 0
          ? payload.selectedModalities
          : OFFICIAL_MODALITIES.map((m) => m.id);

      const newRegistration: Registration = {
        id: regId,
        eventId: payload.eventId,
        lotId: lot.id,
        userId: `usr-${linkedAthleteId}`,
        linkedAthleteId,
        athleteName: payload.athleteName.trim(),
        athleteEmail: payload.athleteEmail.trim(),
        athletePhone: payload.athletePhone.trim(),
        athleteDocument: payload.athleteDocument.trim(),
        turma: payload.turma,
        turmaLabel: payload.turmaLabel,
        teamId: payload.teamId,
        teamName: payload.teamName,
        modalityId: payload.modalityId || 'todas',
        modalityName: payload.modalityName || 'Passaporte Geral (Todas as 10 Modalidades)',
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
        createdAtIso: new Date().toISOString(),
        updatedAtIso: new Date().toISOString(),
      };

      // Cria/atualiza o perfil público do atleta na comunidade e autentica o usuário na hora
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
        id: `audit-${Date.now().toString(36)}`,
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
        timestampIso: new Date().toISOString(),
      };

      setRegistrations((prev) => {
        const next = [newRegistration, ...prev];
        setAuditLogs((prevLogs) => {
          const nextLogs = [auditEntry, ...prevLogs];
          broadcastState(next, nextLogs);
          return nextLogs;
        });
        return next;
      });

      // Persistência em nuvem (Cloud Firestore + Servidor Cloud Sync)
      pushRegistrationToCloud(newRegistration);
      try {
        const cleanReg = JSON.parse(JSON.stringify(newRegistration));
        await setDoc(doc(db, 'registrations', newRegistration.id), cleanReg);
      } catch (err) {
        console.warn('Firestore setDoc registration notice:', err);
      }

      // Persistência local dos IDs inscritos neste dispositivo
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
    [tournamentEvent, activeLot, upsertParticipantAthlete]
  );

  // ATUALIZAR PERFIL SOCIAL VINCULADO À INSCRIÇÃO
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
      setRegistrations((prev) => {
        const target = prev.find((r) => r.id === registrationId);
        if (!target) return prev;

        const updated: Registration = {
          ...target,
          athleteName:
            data.athleteName !== undefined && data.athleteName.trim()
              ? data.athleteName.trim()
              : target.athleteName,
          avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : target.avatarUrl,
          jerseyNumber:
            data.jerseyNumber !== undefined ? data.jerseyNumber : target.jerseyNumber,
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
        };

        const nextRegs = prev.map((r) => (r.id === registrationId ? updated : r));
        broadcastState(nextRegs, auditLogs);
        pushRegistrationToCloud(updated);

        try {
          const cleanReg = JSON.parse(JSON.stringify(updated));
          setDoc(doc(db, 'registrations', registrationId), cleanReg, { merge: true }).catch(
            () => {}
          );
        } catch {
          // Silencioso
        }

        return nextRegs;
      });
    },
    [auditLogs]
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

      setRegistrations((prev) => {
        const target = prev.find((r) => r.id === registrationId);
        if (!target) return prev;

        const lot = tournamentEvent.lots.find((l) => l.id === target.lotId) || activeLot;
        const finalPrice = approved
          ? (lot ? lot.priceMember : target.authorizedPrice)
          : (lot ? lot.priceNonMember : target.authorizedPrice);

        const updated: Registration = {
          ...target,
          memberStatus: approved ? 'aprovado' : 'rejeitado',
          paymentStatus: 'pendente', // Desbloqueia o atleta para pagar
          authorizedPrice: finalPrice,
          memberNotes: notes || (approved ? 'Aprovado pela Diretoria' : 'Rejeitado pela Diretoria'),
          validatedByAdminId: currentUser?.id || 'admin-root',
          validatedByAdminName: currentUser?.name || 'Administrador IntraMed',
          validatedAtIso: new Date().toISOString(),
          updatedAtIso: new Date().toISOString(),
        };

        const auditEntry: FinancialAuditLog = {
          id: `audit-${Date.now().toString(36)}`,
          entity: 'registration',
          entityId: target.id,
          action: approved ? 'APROVAR_SOCIO' : 'REJEITAR_SOCIO',
          adminUserId: currentUser?.id,
          adminUserName: currentUser?.name || 'Administrador IntraMed',
          metadata: {
            athleteName: target.athleteName,
            previousPrice: target.authorizedPrice,
            newAuthorizedPrice: finalPrice,
            justification: notes || (approved ? 'Sócio verificado na lista oficial' : 'Não localizado na lista de associados'),
          },
          timestampIso: new Date().toISOString(),
        };

        const nextRegs = prev.map((r) => (r.id === registrationId ? updated : r));
        setAuditLogs((prevLogs) => {
          const nextLogs = [auditEntry, ...prevLogs];
          broadcastState(nextRegs, nextLogs);
          return nextLogs;
        });

        pushRegistrationToCloud(updated);

        try {
          updateDoc(doc(db, 'registrations', registrationId), {
            memberStatus: updated.memberStatus,
            paymentStatus: updated.paymentStatus,
            authorizedPrice: updated.authorizedPrice,
            memberNotes: updated.memberNotes,
            validatedByAdminId: updated.validatedByAdminId,
            validatedByAdminName: updated.validatedByAdminName,
            validatedAtIso: updated.validatedAtIso,
            updatedAtIso: updated.updatedAtIso,
          }).catch((err) => console.warn('Firestore updateDoc validateMemberDiscount notice:', err));
        } catch (err) {
          console.warn('Firestore updateDoc notice:', err);
        }

        return nextRegs;
      });
    },
    [canOperateOfficialData, tournamentEvent, activeLot, currentUser]
  );

  // 3. SIMULAÇÃO / CONFIRMAÇÃO DE PAGAMENTO (PIX & MERCADO PAGO)
  const simulatePaymentConfirmation = useCallback(
    async (
      registrationId: string,
      method: 'pix' | 'credit_card',
      simulatedMpPaymentId?: string
    ): Promise<void> => {
      const paymentId =
        simulatedMpPaymentId ||
        `MP-${method.toUpperCase()}-${Math.floor(1000000000 + Math.random() * 9000000000)}`;

      setRegistrations((prev) => {
        const target = prev.find((r) => r.id === registrationId);
        if (!target) return prev;

        const updated: Registration = {
          ...target,
          paymentStatus: 'pago',
          paymentMethod: method,
          mpPaymentId: paymentId,
          paidAtIso: new Date().toISOString(),
          updatedAtIso: new Date().toISOString(),
        };

        const auditEntry: FinancialAuditLog = {
          id: `audit-${Date.now().toString(36)}`,
          entity: 'payment',
          entityId: target.id,
          action: 'CONFIRMAR_PAGAMENTO_WEBHOOK',
          adminUserName: 'Mercado Pago Gateway (Confirmado)',
          metadata: {
            athleteName: target.athleteName,
            amount: target.authorizedPrice,
            method,
            mpPaymentId: paymentId,
            status: 'approved',
          },
          timestampIso: new Date().toISOString(),
        };

        const nextRegs = prev.map((r) => (r.id === registrationId ? updated : r));
        setAuditLogs((prevLogs) => {
          const nextLogs = [auditEntry, ...prevLogs];
          broadcastState(nextRegs, nextLogs);
          return nextLogs;
        });

        pushRegistrationToCloud(updated);

        try {
          updateDoc(doc(db, 'registrations', registrationId), {
            paymentStatus: updated.paymentStatus,
            paymentMethod: updated.paymentMethod,
            mpPaymentId: updated.mpPaymentId,
            paidAtIso: updated.paidAtIso,
            updatedAtIso: updated.updatedAtIso,
          }).catch((err) => console.warn('Firestore updateDoc payment notice:', err));
        } catch (err) {
          console.warn('Firestore updateDoc payment notice:', err);
        }

        return nextRegs;
      });
    },
    []
  );

  // 4. CANCELAMENTO DE INSCRIÇÃO
  const cancelRegistration = useCallback(
    async (registrationId: string, reason?: string): Promise<void> => {
      setRegistrations((prev) => {
        const target = prev.find((r) => r.id === registrationId);
        if (!target) return prev;

        const updated: Registration = {
          ...target,
          paymentStatus: 'cancelado',
          memberNotes: reason ? `Cancelada: ${reason}` : target.memberNotes,
          updatedAtIso: new Date().toISOString(),
        };

        const auditEntry: FinancialAuditLog = {
          id: `audit-${Date.now().toString(36)}`,
          entity: 'registration',
          entityId: target.id,
          action: 'CANCELAR_INSCRICAO',
          adminUserName: currentUser?.name || 'Usuário / Mesa',
          metadata: {
            reason: reason || 'Cancelamento solicitado',
          },
          timestampIso: new Date().toISOString(),
        };

        const nextRegs = prev.map((r) => (r.id === registrationId ? updated : r));
        setAuditLogs((prevLogs) => {
          const nextLogs = [auditEntry, ...prevLogs];
          broadcastState(nextRegs, nextLogs);
          return nextLogs;
        });

        pushRegistrationToCloud(updated);

        try {
          updateDoc(doc(db, 'registrations', registrationId), {
            paymentStatus: updated.paymentStatus,
            memberNotes: updated.memberNotes,
            updatedAtIso: updated.updatedAtIso,
          }).catch((err) => console.warn('Firestore updateDoc cancel notice:', err));
        } catch (err) {
          console.warn('Firestore updateDoc notice:', err);
        }

        return nextRegs;
      });
    },
    [currentUser]
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
          r.userId === q ||
          r.athleteEmail.toLowerCase() === q ||
          r.athleteDocument.includes(q) ||
          r.athleteName.toLowerCase().includes(q)
      );
    },
    [registrations]
  );

  const myRegistrations = useMemo(() => {
    return registrations.filter((r) => {
      if (myRegisteredIds.includes(r.id)) return true;
      if (currentUser?.email && r.athleteEmail.toLowerCase() === currentUser.email.toLowerCase()) return true;
      if (currentUser?.linkedAthleteId && r.linkedAthleteId === currentUser.linkedAthleteId) return true;
      if (currentUser?.id && r.userId === currentUser.id) return true;
      return false;
    });
  }, [registrations, myRegisteredIds, currentUser]);

  const hasCompletedRegistration = myRegistrations.length > 0;

  const value = useMemo(
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

export const useRegistrationStore = (): RegistrationContextValue => {
  const ctx = useContext(RegistrationContext);
  if (!ctx) {
    throw new Error(
      'useRegistrationStore deve ser utilizado dentro de um <RegistrationProvider>.'
    );
  }
  return ctx;
};
