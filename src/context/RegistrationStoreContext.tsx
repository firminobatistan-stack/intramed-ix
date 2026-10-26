import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
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
import { useCompetitionStore } from './CompetitionStoreContext';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';

const REGISTRATIONS_STORAGE_KEY = 'intramed_registrations_store_v1';
const SYNC_CHANNEL_NAME = 'intramed_registration_channel';

interface CreateRegistrationPayload {
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
  categoryName: string;
  requestedMemberDiscount: boolean;
  memberDocumentProofUrl?: string;
}

interface RegistrationContextValue {
  tournamentEvent: TournamentEvent;
  registrations: Registration[];
  auditLogs: FinancialAuditLog[];
  activeLot: RegistrationLot | undefined;
  createRegistration: (payload: CreateRegistrationPayload) => Promise<Registration>;
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

export const RegistrationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentUser, canOperateOfficialData } = useCompetitionStore();

  const [tournamentEvent] = useState<TournamentEvent>(INITIAL_TOURNAMENT_EVENT);

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
            firestoreList.sort(
              (a, b) =>
                new Date(b.createdAtIso).getTime() -
                new Date(a.createdAtIso).getTime()
            );
            setRegistrations(firestoreList);
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

  // 1. CRIAR INSCRIÇÃO (Backend Rules Protection)
  const createRegistration = useCallback(
    async (payload: CreateRegistrationPayload): Promise<Registration> => {
      const lot =
        tournamentEvent.lots.find((l) => l.id === payload.lotId) || activeLot;

      if (!lot) {
        throw new Error('Nenhum lote de inscrição ativo encontrado para o evento.');
      }

      // Regra de Ouro: A solicitação de sócio NUNCA concede o desconto diretamente.
      // Inscrição fica aguardando validação manual e o valor sócio fica travado após aprovação.
      const isSocioRequested = payload.requestedMemberDiscount;
      const initialPrice = isSocioRequested
        ? lot.priceMember
        : lot.priceNonMember;

      const newRegistration: Registration = {
        id: `reg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        eventId: payload.eventId,
        lotId: lot.id,
        userId: currentUser?.id || `user-anon-${Date.now()}`,
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
        createdAtIso: new Date().toISOString(),
        updatedAtIso: new Date().toISOString(),
      };

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

      // Persistência em nuvem no Cloud Firestore
      try {
        await setDoc(doc(db, 'registrations', newRegistration.id), newRegistration);
      } catch (err) {
        console.warn('Firestore setDoc registration notice:', err);
      }

      return newRegistration;
    },
    [tournamentEvent, activeLot, currentUser]
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

        // Sincroniza validação de sócio no Cloud Firestore
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

        // Sincroniza pagamento confirmado no Cloud Firestore
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

        // Sincroniza cancelamento no Cloud Firestore
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

  const value = useMemo(
    () => ({
      tournamentEvent,
      registrations,
      auditLogs,
      activeLot,
      createRegistration,
      validateMemberDiscount,
      simulatePaymentConfirmation,
      cancelRegistration,
      getRegistrationById,
      getMyRegistrations,
    }),
    [
      tournamentEvent,
      registrations,
      auditLogs,
      activeLot,
      createRegistration,
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
