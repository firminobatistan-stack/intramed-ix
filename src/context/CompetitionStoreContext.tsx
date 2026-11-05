import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  Athlete,
  DerivedAthleteModalityStats,
  DerivedTeamStats,
  LeaderboardEntry,
  Match,
  MatchSheet,
  MatchEvent,
  MatchLineupEntry,
  ModalitySlug,
  StandingEntry,
  SwimmingStrokeType,
  Team,
  TournamentPhaseType,
  UserProfile,
  TurmaMedicina,
  RegistrationPaymentStatus,
  MemberStatus,
} from '../types/domain';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import {
  OFFICIAL_MODALITIES,
  INITIAL_MATCHES,
  INITIAL_TEAMS,
  INITIAL_ATHLETES,
} from '../data/officialData';
import {
  MODALITY_RULE_ENGINE,
  formatSecondsToClock,
  formatMsToSwimmingTime,
} from '../data/sportRulesConfig';
import { buildInitialTestWorkbench } from '../data/testWorkbench';
import { matchSound } from '../utils/soundEffects';
import {
  computeAthleteModalityStats,
  computeModalityLeaderboard,
  computeModalityStandings,
  computeTeamStats,
  generateUniqueId,
  getEventPointsDelta,
  isFoulEventType,
  recomputeMatchAndSheetFromEvents,
} from '../utils/statsEngine';

interface NewEventPayload {
  type: MatchEvent['type'];
  typeLabel: string;
  teamSide?: 'home' | 'away' | null;
  athleteId?: string | null;
  athleteName?: string | null;
  athleteNumber?: number | null;
  secondaryAthleteId?: string | null;
  secondaryAthleteName?: string | null;
  secondaryAthleteNumber?: number | null;
  pointsDelta?: number;
  foulReason?: string;
  notes?: string;
}

interface EditEventPayload {
  eventId: string;
  teamSide?: 'home' | 'away' | null;
  athleteId?: string | null;
  athleteName?: string | null;
  athleteNumber?: number | null;
  matchClockDisplay?: string;
  notes?: string;
  reason?: string;
}

export interface AppNotificationItem {
  id: string;
  title: string;
  description: string;
  category: 'match_start' | 'score' | 'result' | 'competition';
  timestampIso: string;
  isRead: boolean;
  matchId?: string;
  modalityId?: ModalitySlug;
}

interface CompetitionStoreContextValue {
  isTestMode: boolean;
  setTestMode: (enabled: boolean) => void;
  resetTestEnvironment: () => void;
  isOnline: boolean;
  pendingSyncCount: number;
  visibleMatches: Match[];
  getMatchById: (matchId: string) => Match | undefined;
  getSheetByMatchId: (matchId: string) => MatchSheet | undefined;
  favoriteModalityIds: ModalitySlug[];
  favoriteTeamIds: string[];
  favoriteAthleteIds: string[];
  toggleFavoriteModality: (modalityId: ModalitySlug) => void;
  toggleFavoriteTeam: (teamId: string) => void;
  toggleFavoriteAthlete: (athleteId: string) => void;
  notifications: AppNotificationItem[];
  markAllNotificationsAsRead: () => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
  startOrResumeTimer: (matchId: string) => void;
  pauseTimer: (matchId: string) => void;
  resetPeriodTimer: (matchId: string) => void;
  endCurrentPeriod: (matchId: string) => void;
  startNextPeriod: (matchId: string) => void;
  startOvertimePeriod: (matchId: string) => void;
  configureMatchCategoryRule: (matchId: string, categoryName: string) => void;
  recordMatchEvent: (matchId: string, payload: NewEventPayload) => void;
  editMatchEvent: (matchId: string, payload: EditEventPayload) => void;
  deleteMatchEvent: (matchId: string, eventId: string, reason?: string) => void;
  dismissReleasedSuspension: (matchId: string, suspensionId: string) => void;
  cancelActiveTimeout: (matchId: string) => void;
  toggleLineupRole: (
    matchId: string,
    teamSide: 'home' | 'away',
    athleteId: string,
    field: 'isStarter' | 'isCaptain' | 'isGoalkeeper' | 'isPairMember'
  ) => void;
  finishCurrentSet: (matchId: string) => void;
  recordTableTennisPoint: (
    matchId: string,
    subMatchId: string,
    side: 'home' | 'away'
  ) => void;
  finishTableTennisSet: (matchId: string, subMatchId: string) => void;
  selectActiveSubMatch: (matchId: string, index: number) => void;
  setSwimmingStrokeAndDistance: (
    matchId: string,
    stroke: SwimmingStrokeType,
    distanceLabel: string
  ) => void;
  registerSwimmingLaneTime: (
    matchId: string,
    laneNumber: number,
    timeMs: number | null,
    status?: 'ready' | 'finished' | 'dsq' | 'dns'
  ) => void;
  updateRefereeMetadata: (
    matchId: string,
    data: {
      refereeName?: string;
      assistantRefereeName?: string;
      tableOfficialName?: string;
      timekeeperName?: string;
      twentyFourSecOperatorName?: string;
      refereeNotes?: string;
    }
  ) => void;
  finalizeMatch: (matchId: string) => void;
  reopenMatchForCorrection: (matchId: string) => void;
  visibleTeams: Team[];
  visibleAthletes: Athlete[];
  getTeamById: (teamId: string) => Team | undefined;
  getAthleteById: (athleteId: string) => Athlete | undefined;
  getAthletesByTeam: (teamId: string, modalityId?: ModalitySlug) => Athlete[];
  getAthleteStats: (
    athleteId: string,
    modalityId: ModalitySlug
  ) => DerivedAthleteModalityStats | null;
  getTeamStats: (
    teamId: string,
    modalityId?: ModalitySlug
  ) => DerivedTeamStats | null;
  getModalityStandings: (modalityId: ModalitySlug | 'all') => StandingEntry[];
  getModalityLeaderboard: (modalityId: ModalitySlug) => {
    title: string;
    metricUnit: string;
    entries: LeaderboardEntry[];
  };
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  canEditAthleteProfile: (athleteId: string) => boolean;
  canOperateOfficialData: () => boolean;
  canOperateMatch: (matchId?: string) => boolean;
  unlockMatchAsTableOfficial: (
    matchId: string,
    passwordInput: string,
    officialName?: string
  ) => { ok: boolean; error?: string };
  updateMatchTablePassword: (matchId: string, newPassword: string) => boolean;
  updateAthleteAvatar: (athleteId: string, avatarDataUrl: string) => boolean;
  updateTeamCrest: (teamId: string, crestDataUrl: string) => void;
  updateAthletePersonalInfo: (
    athleteId: string,
    data: {
      name?: string;
      position?: string;
      jerseyNumber?: number | null;
      bio?: string | null;
      instagramHandle?: string | null;
      modalityIds?: ModalitySlug[];
      avatarUrl?: string | null;
    }
  ) => boolean;
  upsertParticipantAthlete: (payload: {
    id?: string;
    name: string;
    email?: string | null;
    teamId: string;
    turma?: TurmaMedicina | null;
    turmaLabel?: string | null;
    jerseyNumber?: number | null;
    position?: string | null;
    bio?: string | null;
    instagramHandle?: string | null;
    avatarUrl?: string | null;
    modalityIds?: ModalitySlug[];
    registrationId?: string | null;
    paymentStatus?: RegistrationPaymentStatus;
    memberStatus?: MemberStatus;
    autoLogin?: boolean;
  }) => Athlete;
  registerTeam: (payload: {
    name: string;
    shortName?: string;
    crestUrl?: string | null;
    modalityIds: ModalitySlug[];
  }) => Team;
  registerAthlete: (payload: {
    name: string;
    teamId: string;
    jerseyNumber?: number | null;
    position?: string | null;
    avatarUrl?: string | null;
    modalityIds: ModalitySlug[];
  }) => { ok: boolean; error?: string; athlete?: Athlete };
  createOfficialMatch: (payload: {
    modalityId: ModalitySlug;
    categoryName: string;
    phase: TournamentPhaseType;
    phaseLabel: string;
    homeTeamId: string;
    awayTeamId: string;
    scheduledDate?: string;
    scheduledTime?: string;
    venue?: string;
    tableOfficialPassword?: string;
  }) => Match | null;
}

const STORAGE_KEY_STATE = 'intramed_ix_live_engine_v3';
const BROADCAST_CHANNEL_NAME = 'intramed_ix_live_sync_channel';
const OPERATOR_TOKEN_SESSION_KEY = 'intramed_operator_jwt';

function generateRandomMatchPin(modalityId: string): string {
  const prefix = modalityId.slice(0, 3).toUpperCase();
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `MESA-${prefix}-${suffix}`;
}

export function getStoredOperatorToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(OPERATOR_TOKEN_SESSION_KEY);
  } catch {
    return null;
  }
}

export function setStoredOperatorToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      sessionStorage.setItem(OPERATOR_TOKEN_SESSION_KEY, token);
    } else {
      sessionStorage.removeItem(OPERATOR_TOKEN_SESSION_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

interface PersistedEngineState {
  isTestMode: boolean;
  officialTeams: Team[];
  officialAthletes: Athlete[];
  officialMatches: Match[];
  officialSheets: Record<string, MatchSheet>;
  testTeams: Team[];
  testAthletes: Athlete[];
  testMatches: Match[];
  testSheets: Record<string, MatchSheet>;
  currentUser: UserProfile | null;
  pendingSyncCount: number;
  favoriteModalityIds: ModalitySlug[];
  favoriteTeamIds: string[];
  favoriteAthleteIds: string[];
  notifications: AppNotificationItem[];
}

const CompetitionStoreContext = createContext<CompetitionStoreContextValue | null>(
  null
);

export const CompetitionStoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<PersistedEngineState>(() => {
    const initialTest = buildInitialTestWorkbench();
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATE);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<PersistedEngineState>;
        if (parsed && Array.isArray(parsed.testMatches)) {
          const mergeTeamsWithDefaults = (
            savedList?: Team[],
            fallbackList: Team[] = INITIAL_TEAMS
          ): Team[] => {
            if (!savedList || savedList.length === 0) return fallbackList;
            const merged = [...fallbackList];
            for (const custom of savedList) {
              const existingIdx = merged.findIndex((t) => t.id === custom.id);
              if (existingIdx >= 0) {
                merged[existingIdx] = {
                  ...merged[existingIdx],
                  ...custom,
                  crestUrl: custom.crestUrl || merged[existingIdx].crestUrl,
                  theme: merged[existingIdx].theme || custom.theme,
                  turmaLabel: merged[existingIdx].turmaLabel,
                  mascotLabel: merged[existingIdx].mascotLabel,
                };
              } else if (!custom.id.startsWith('test-team-')) {
                merged.push(custom);
              }
            }
            return merged;
          };

          const hasAdminSession =
            typeof window !== 'undefined' &&
            sessionStorage.getItem('intramed_admin_session') === 'true';

          let resolvedUser: UserProfile | null = null;
          if (parsed.currentUser && parsed.currentUser.role === 'atleta') {
            resolvedUser = parsed.currentUser;
          } else if (hasAdminSession && parsed.currentUser) {
            resolvedUser = parsed.currentUser;
          }

          return {
            isTestMode: Boolean(hasAdminSession && parsed.isTestMode),
            officialTeams: mergeTeamsWithDefaults(parsed.officialTeams, INITIAL_TEAMS),
            officialAthletes: parsed.officialAthletes || INITIAL_ATHLETES,
            officialMatches: parsed.officialMatches || INITIAL_MATCHES,
            officialSheets: parsed.officialSheets || {},
            testTeams: mergeTeamsWithDefaults(parsed.testTeams, initialTest.teams),
            testAthletes:
              parsed.testAthletes && parsed.testAthletes.length > 0
                ? parsed.testAthletes
                : initialTest.athletes,
            testMatches: parsed.testMatches,
            testSheets: parsed.testSheets || initialTest.sheets,
            currentUser: resolvedUser,
            pendingSyncCount: parsed.pendingSyncCount || 0,
            favoriteModalityIds: parsed.favoriteModalityIds || [],
            favoriteTeamIds: parsed.favoriteTeamIds || [],
            favoriteAthleteIds: parsed.favoriteAthleteIds || [],
            notifications: parsed.notifications || [],
          };
        }
      }
    } catch {
      // Fallback para estado inicial limpo
    }
    return {
      isTestMode: false,
      officialTeams: INITIAL_TEAMS,
      officialAthletes: INITIAL_ATHLETES,
      officialMatches: INITIAL_MATCHES,
      officialSheets: {},
      testTeams: initialTest.teams,
      testAthletes: initialTest.athletes,
      testMatches: initialTest.matches,
      testSheets: initialTest.sheets,
      currentUser: null,
      pendingSyncCount: 0,
      favoriteModalityIds: [],
      favoriteTeamIds: [],
      favoriteAthleteIds: [],
      notifications: [],
    };
  });

  const [unlockedMatchIds, setUnlockedMatchIds] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem('intramed_unlocked_match_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Ref atualizada para evitar closure obsoleta no intervalo do cronômetro (Item 12 da Auditoria)
  const unlockedMatchIdsRef = useRef<string[]>(unlockedMatchIds);
  useEffect(() => {
    unlockedMatchIdsRef.current = unlockedMatchIds;
  }, [unlockedMatchIds]);

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const channelRef = useRef<BroadcastChannel | null>(null);
  const isApplyingRemoteUpdate = useRef(false);
  const lastCloudUpdatedAtRef = useRef<string>('');

  // Fila de sincronização fora do setState para eliminar efeitos colaterais duplicados (Item 14 da Auditoria)
  const syncQueueRef = useRef<
    Array<{ collectionName: string; docId: string; data: unknown }>
  >([]);

  const enqueueCloudSync = useCallback(
    (collectionName: string, docId: string, data: unknown) => {
      syncQueueRef.current.push({ collectionName, docId, data });
    },
    []
  );

  const isUserAdmin = (user: UserProfile | null): boolean => {
    if (!user) return false;
    return (
      user.role === 'administrador' ||
      user.role === 'organizacao' ||
      user.role === 'moderador'
    );
  };

  const syncDocToFirestore = useCallback(
    (collectionName: string, docId: string, data: unknown) => {
      try {
        const cleanData = JSON.parse(JSON.stringify(data));
        setDoc(doc(db, collectionName, docId), cleanData, { merge: true }).catch(
          () => {}
        );
        if (typeof window !== 'undefined') {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          const opToken = getStoredOperatorToken();
          if (opToken) {
            headers['Authorization'] = `Bearer ${opToken}`;
          }
          fetch('/api/cloud-sync', {
            method: 'POST',
            headers,
            body: JSON.stringify({ collectionName, docId, data: cleanData }),
          }).catch(() => {});
        }
      } catch {
        // Silencioso
      }
    },
    []
  );

  // Processa a fila de sincronização fora do setState
  useEffect(() => {
    if (syncQueueRef.current.length === 0) return;
    const items = syncQueueRef.current.splice(0, syncQueueRef.current.length);
    for (const item of items) {
      syncDocToFirestore(item.collectionName, item.docId, item.data);
    }
  });

  // Sincronização entre abas do mesmo navegador
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.onmessage = (ev) => {
        if (
          ev.data &&
          ev.data.type === 'STATE_SYNC' &&
          ev.data.payload &&
          typeof ev.data.payload === 'object'
        ) {
          isApplyingRemoteUpdate.current = true;
          setState(ev.data.payload);
        }
      };
      channelRef.current = bc;
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_STATE && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            isApplyingRemoteUpdate.current = true;
            setState(parsed);
          }
        } catch {
          // Ignore malformed JSON
        }
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      setState((prev) => ({ ...prev, pendingSyncCount: 0 }));
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('storage', handleStorage);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      channelRef.current?.close();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Persistência em localStorage com Debounce de 600ms e sanitização de segredos para evitar travamentos e QuotaExceeded (Itens 21 e 22 da Auditoria)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const isAdmin = isUserAdmin(state.currentUser);
        const sanitizedOfficialMatches = isAdmin
          ? state.officialMatches
          : state.officialMatches.map((m) => {
              const { tableOfficialPassword: _pin, ...rest } = m;
              return rest as Match;
            });

        const stateToPersist: PersistedEngineState = {
          ...state,
          officialMatches: sanitizedOfficialMatches,
        };

        localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(stateToPersist));
        if (!isApplyingRemoteUpdate.current && channelRef.current) {
          channelRef.current.postMessage({
            type: 'STATE_SYNC',
            payload: stateToPersist,
          });
        }
        isApplyingRemoteUpdate.current = false;
      } catch {
        // Caso o localStorage atinja o limite de quota por fotos grandes, remove avatares em base64 apenas do cache local
        try {
          const slimAthletes = state.officialAthletes.map((a) => ({
            ...a,
            avatarUrl:
              a.avatarUrl && a.avatarUrl.startsWith('data:') ? null : a.avatarUrl,
          }));
          localStorage.setItem(
            STORAGE_KEY_STATE,
            JSON.stringify({ ...state, officialAthletes: slimAthletes })
          );
        } catch {
          // Ignore
        }
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [state]);

  // Sincronização em Tempo Real com Cloud Firestore (com verificação de revisão/timestamp para nunca reverter lançamentos mais novos)
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    try {
      const unsubAthletes = onSnapshot(
        collection(db, 'athletes'),
        (snap) => {
          if (snap.empty) return;
          const remoteAthletes = snap.docs.map((d) => ({
            ...(d.data() as Athlete),
            id: d.id,
          }));
          setState((prev) => {
            const byId = new Map<string, Athlete>();
            for (const a of prev.officialAthletes) byId.set(a.id, a);
            for (const r of remoteAthletes) {
              if (!r.isTestOnly) {
                const existing = byId.get(r.id);
                byId.set(r.id, existing ? { ...existing, ...r } : r);
              }
            }
            const nextAthletes = Array.from(byId.values());
            isApplyingRemoteUpdate.current = true;
            return {
              ...prev,
              officialAthletes: nextAthletes,
            };
          });
        },
        () => {}
      );
      unsubs.push(unsubAthletes);

      const unsubTeams = onSnapshot(
        collection(db, 'teams'),
        (snap) => {
          if (snap.empty) return;
          const remoteTeams = snap.docs.map((d) => ({
            ...(d.data() as Team),
            id: d.id,
          }));
          setState((prev) => {
            const byId = new Map<string, Team>();
            for (const t of prev.officialTeams) byId.set(t.id, t);
            for (const rt of remoteTeams) {
              if (!rt.isTestOnly) {
                const ex = byId.get(rt.id);
                byId.set(rt.id, ex ? { ...ex, ...rt } : rt);
              }
            }
            isApplyingRemoteUpdate.current = true;
            return {
              ...prev,
              officialTeams: Array.from(byId.values()),
            };
          });
        },
        () => {}
      );
      unsubs.push(unsubTeams);

      const unsubMatches = onSnapshot(
        collection(db, 'matches'),
        (snap) => {
          if (snap.empty) return;
          const remoteMatches = snap.docs.map((d) => ({
            ...(d.data() as Match),
            id: d.id,
          }));
          setState((prev) => {
            const byId = new Map<string, Match>();
            for (const m of prev.officialMatches) byId.set(m.id, m);
            let changed = false;
            for (const rm of remoteMatches) {
              if (!rm.isTestData) {
                const ex = byId.get(rm.id);
                const exRev = ex?.revision ?? 0;
                const rmRev = rm.revision ?? 0;
                if (!ex || rmRev >= exRev) {
                  byId.set(rm.id, ex ? { ...ex, ...rm } : rm);
                  changed = true;
                }
              }
            }
            if (!changed) return prev;
            isApplyingRemoteUpdate.current = true;
            return {
              ...prev,
              officialMatches: Array.from(byId.values()),
            };
          });
        },
        () => {}
      );
      unsubs.push(unsubMatches);

      const unsubSheets = onSnapshot(
        collection(db, 'match_sheets'),
        (snap) => {
          if (snap.empty) return;
          setState((prev) => {
            const nextSheets = { ...prev.officialSheets };
            let changed = false;
            snap.docs.forEach((d) => {
              const rs = d.data() as MatchSheet;
              if (!rs.isTestMode && rs.matchId) {
                const ex = nextSheets[rs.matchId];
                const exRev = ex?.revision ?? 0;
                const rsRev = rs.revision ?? 0;
                const isNewerIso =
                  !ex ||
                  (rs.lastUpdatedIso &&
                    ex.lastUpdatedIso &&
                    rs.lastUpdatedIso > ex.lastUpdatedIso);

                if (!ex || rsRev > exRev || (rsRev === exRev && isNewerIso)) {
                  nextSheets[rs.matchId] = rs;
                  changed = true;
                }
              }
            });
            if (!changed) return prev;
            isApplyingRemoteUpdate.current = true;
            return {
              ...prev,
              officialSheets: nextSheets,
            };
          });
        },
        () => {}
      );
      unsubs.push(unsubSheets);
    } catch {
      // Fallback offline gracioso
    }

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, []);

  // Sincronização em tempo real via API Cloud Sync (/api/cloud-sync) com `?since=` e comparação estrita `>` (Itens 10, 23 da Auditoria)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const fetchCloudSnapshot = async () => {
      try {
        const headers: Record<string, string> = {};
        const opToken = getStoredOperatorToken();
        if (opToken) {
          headers['Authorization'] = `Bearer ${opToken}`;
        }
        const sinceQuery = lastCloudUpdatedAtRef.current
          ? `?since=${encodeURIComponent(lastCloudUpdatedAtRef.current)}`
          : '';
        const res = await fetch(`/api/cloud-sync${sinceQuery}`, { headers });
        if (!res || !res.ok) return;
        const payload = await res.json();
        if (!payload || !payload.success || payload.notModified) return;

        if (payload.updatedAtIso) {
          lastCloudUpdatedAtRef.current = payload.updatedAtIso;
        }

        // Dispara evento customizado para o RegistrationStoreContext aproveitar o mesmo payload sem fazer um 2º polling!
        if (Array.isArray(payload.registrations)) {
          window.dispatchEvent(
            new CustomEvent('intramed-cloud-registrations', {
              detail: payload.registrations,
            })
          );
        }

        setState((prev) => {
          let changed = false;

          let nextAthletes = prev.officialAthletes;
          if (Array.isArray(payload.athletes) && payload.athletes.length > 0) {
            const byId = new Map<string, Athlete>();
            for (const a of prev.officialAthletes) byId.set(a.id, a);
            for (const r of payload.athletes as Athlete[]) {
              if (r && r.id && !r.isTestOnly) {
                const ex = byId.get(r.id);
                if (
                  !ex ||
                  ex.name !== r.name ||
                  ex.avatarUrl !== r.avatarUrl ||
                  ex.jerseyNumber !== r.jerseyNumber ||
                  ex.position !== r.position ||
                  ex.paymentStatus !== r.paymentStatus ||
                  ex.memberStatus !== r.memberStatus
                ) {
                  byId.set(r.id, ex ? { ...ex, ...r } : r);
                  changed = true;
                }
              }
            }
            if (changed) {
              nextAthletes = Array.from(byId.values());
            }
          }

          let nextTeams = prev.officialTeams;
          if (Array.isArray(payload.teams) && payload.teams.length > 0) {
            const byId = new Map<string, Team>();
            for (const t of prev.officialTeams) byId.set(t.id, t);
            let teamChanged = false;
            for (const rt of payload.teams as Team[]) {
              if (rt && rt.id && !rt.isTestOnly) {
                const ex = byId.get(rt.id);
                if (!ex || ex.crestUrl !== rt.crestUrl || ex.name !== rt.name) {
                  byId.set(rt.id, ex ? { ...ex, ...rt } : rt);
                  teamChanged = true;
                  changed = true;
                }
              }
            }
            if (teamChanged) {
              nextTeams = Array.from(byId.values());
            }
          }

          let nextMatches = prev.officialMatches;
          if (Array.isArray(payload.matches) && payload.matches.length > 0) {
            const byId = new Map<string, Match>();
            for (const m of prev.officialMatches) byId.set(m.id, m);
            let matchChanged = false;
            for (const rm of payload.matches as Match[]) {
              if (rm && rm.id && !rm.isTestData) {
                const ex = byId.get(rm.id);
                const exRev = ex?.revision ?? 0;
                const rmRev = rm.revision ?? 0;
                // Só aceita o remoto se a revisão for maior ou se mudou status/placar sem regredir revisão
                if (
                  !ex ||
                  rmRev > exRev ||
                  (rmRev === exRev &&
                    (ex.status !== rm.status ||
                      ex.homeTeam?.score !== rm.homeTeam?.score ||
                      ex.awayTeam?.score !== rm.awayTeam?.score))
                ) {
                  byId.set(rm.id, ex ? { ...ex, ...rm, tableOfficialPassword: rm.tableOfficialPassword ?? ex.tableOfficialPassword } : rm);
                  matchChanged = true;
                  changed = true;
                }
              }
            }
            if (matchChanged) {
              nextMatches = Array.from(byId.values());
            }
          }

          let nextSheets = prev.officialSheets;
          if (Array.isArray(payload.match_sheets) && payload.match_sheets.length > 0) {
            let sheetChanged = false;
            const copySheets = { ...prev.officialSheets };
            for (const rs of payload.match_sheets as MatchSheet[]) {
              if (rs && rs.matchId && !rs.isTestMode) {
                const ex = copySheets[rs.matchId];
                const exRev = ex?.revision ?? 0;
                const rsRev = rs.revision ?? 0;
                const isStrictlyNewerTime =
                  !ex ||
                  (rs.lastUpdatedIso &&
                    ex.lastUpdatedIso &&
                    new Date(rs.lastUpdatedIso).getTime() >
                      new Date(ex.lastUpdatedIso).getTime());

                // Correção crítica Item 10 da Auditoria: usa `>` em vez de `!==` para jamais substituir súmula local mais nova por snapshot antigo
                if (
                  !ex ||
                  rsRev > exRev ||
                  (rsRev >= exRev && isStrictlyNewerTime && !ex.timer.isRunning)
                ) {
                  copySheets[rs.matchId] = rs;
                  sheetChanged = true;
                  changed = true;
                }
              }
            }
            if (sheetChanged) {
              nextSheets = copySheets;
            }
          }

          if (!changed) return prev;

          isApplyingRemoteUpdate.current = true;
          return {
            ...prev,
            officialAthletes: nextAthletes,
            officialTeams: nextTeams,
            officialMatches: nextMatches,
            officialSheets: nextSheets,
          };
        });
      } catch {
        // Silencioso
      }
    };

    fetchCloudSnapshot();
    const interval = setInterval(fetchCloudSnapshot, 4500);
    return () => clearInterval(interval);
  }, []);

  // Motor de Cronômetro Preciso por Timestamp Real (`lastTickTimestamp` + `Date.now()`)
  // Corrige Itens 11, 12, 13, 14, 22 e 27 da Auditoria:
  // - Não atrasa quando o celular bloqueia a tela ou a aba fica em segundo plano;
  // - Opera tanto em `officialSheets` quanto em `testSheets` simultaneamente;
  // - Quando chega a 00:00, encerra o período formalmente (marca periodScores.isFinished, cria evento period_end e toca buzina);
  // - Não clona `matches` se nenhum status mudou.
  useEffect(() => {
    const interval = setInterval(() => {
      const nowMs = Date.now();

      setState((prev) => {
        const checkCollectionHasRunning = (sheetsMap: Record<string, MatchSheet>) =>
          Object.values(sheetsMap).some(
            (s) =>
              s.timer.isRunning ||
              (s.activeTimeout && s.activeTimeout.isActive) ||
              s.activeSuspensions.some(
                (susp) => !susp.isReleased && susp.remainingSeconds > 0 && s.timer.isRunning
              )
          );

        const officialRunning = checkCollectionHasRunning(prev.officialSheets);
        const testRunning = checkCollectionHasRunning(prev.testSheets);

        if (!officialRunning && !testRunning) return prev;

        const processCollection = (
          sheetsMap: Record<string, MatchSheet>,
          matchesList: Match[],
          isTestCollection: boolean
        ): {
          sheetsMap: Record<string, MatchSheet>;
          matchesList: Match[];
          anyChanged: boolean;
          matchesChanged: boolean;
        } => {
          const updatedSheets = { ...sheetsMap };
          let updatedMatches = matchesList;
          let anyChanged = false;
          let matchesChanged = false;

          for (const mId of Object.keys(updatedSheets)) {
            const sheet = updatedSheets[mId];
            const engine = MODALITY_RULE_ENGINE[sheet.modalityId];
            let sheetChanged = false;
            let nextTimer = { ...sheet.timer };
            let nextTimeout = sheet.activeTimeout ? { ...sheet.activeTimeout } : null;
            let nextSuspensions = sheet.activeSuspensions;
            let nextPeriodScores = sheet.periodScores;
            let nextEvents = sheet.events;

            // Calcula quantos segundos reais se passaram desde o último tick (protege contra aba em background)
            const prevTickMs = nextTimer.lastTickTimestamp || nowMs - 1000;
            const deltaSeconds = Math.max(
              1,
              Math.min(30, Math.round((nowMs - prevTickMs) / 1000))
            );

            // 1. Contador de Timeout / Tempo Técnico
            if (nextTimeout && nextTimeout.isActive) {
              sheetChanged = true;
              if (nextTimeout.remainingSeconds <= deltaSeconds) {
                nextTimeout = null;
                matchSound.playBuzzer();
              } else {
                nextTimeout.remainingSeconds -= deltaSeconds;
              }
            }

            // 2. Cronômetro Principal da Partida + Exclusões de 2 Minutos
            if (nextTimer.isRunning) {
              sheetChanged = true;
              nextTimer.elapsedSeconds += deltaSeconds;
              nextTimer.lastTickTimestamp = nowMs;

              if (engine.timerDirection === 'countdown') {
                nextTimer.remainingSeconds = Math.max(
                  0,
                  nextTimer.remainingSeconds - deltaSeconds
                );

                // Item 27 da Auditoria: ao chegar a 0, finaliza o período com evento, status halftime e buzina
                if (nextTimer.remainingSeconds === 0) {
                  nextTimer.isRunning = false;
                  nextTimer.lastTickTimestamp = null;
                  const isLastRegularPeriod =
                    nextTimer.currentPeriod >= nextTimer.totalPeriods;
                  nextTimer.lifecycle = isLastRegularPeriod
                    ? 'period_ended'
                    : 'interval';

                  nextPeriodScores = sheet.periodScores.map((p) =>
                    p.periodNumber === nextTimer.currentPeriod
                      ? { ...p, isFinished: true }
                      : p
                  );

                  const endEvent: MatchEvent = {
                    id: generateUniqueId('ev'),
                    matchId: mId,
                    type: 'period_end',
                    typeLabel: `Fim — ${nextTimer.periodLabel}`,
                    periodNumber: nextTimer.currentPeriod,
                    periodLabel: nextTimer.periodLabel,
                    matchClockDisplay: '00:00',
                    createdAtIso: new Date().toISOString(),
                    auditHistory: [],
                  };
                  nextEvents = [endEvent, ...sheet.events];

                  matchSound.playBuzzer();

                  if (!isLastRegularPeriod) {
                    const mIdx = updatedMatches.findIndex((m) => m.id === mId);
                    if (mIdx >= 0 && updatedMatches[mIdx].status !== 'halftime') {
                      if (!matchesChanged) {
                        updatedMatches = [...updatedMatches];
                        matchesChanged = true;
                      }
                      updatedMatches[mIdx] = {
                        ...updatedMatches[mIdx],
                        status: 'halftime',
                      };
                    }
                  }
                }
              }

              // Punições de 2 minutos
              if (sheet.activeSuspensions.length > 0) {
                nextSuspensions = sheet.activeSuspensions.map((susp) => {
                  if (susp.isReleased || susp.remainingSeconds <= 0) {
                    return { ...susp, remainingSeconds: 0, isReleased: true };
                  }
                  const rem = Math.max(0, susp.remainingSeconds - deltaSeconds);
                  if (rem === 0 && !susp.isReleased) {
                    matchSound.playConfirmBeep();
                  }
                  return {
                    ...susp,
                    remainingSeconds: rem,
                    isReleased: rem <= 0,
                  };
                });
              }
            }

            if (sheetChanged) {
              anyChanged = true;
              const isOperatorForThisMatch =
                isUserAdmin(prev.currentUser) ||
                unlockedMatchIdsRef.current.includes(mId);

              const nextSheetObj: MatchSheet = {
                ...sheet,
                timer: nextTimer,
                activeTimeout: nextTimeout,
                activeSuspensions: nextSuspensions,
                periodScores: nextPeriodScores,
                events: nextEvents,
                // Só atualiza `lastUpdatedIso` e envia para a nuvem se este aparelho for o operador da partida!
                lastUpdatedIso: isOperatorForThisMatch
                  ? new Date().toISOString()
                  : sheet.lastUpdatedIso,
              };
              updatedSheets[mId] = nextSheetObj;

              if (
                !isTestCollection &&
                isOperatorForThisMatch &&
                (nextTimer.elapsedSeconds % 3 === 0 || !nextTimer.isRunning)
              ) {
                enqueueCloudSync('match_sheets', mId, nextSheetObj);
              }
            }
          }

          return {
            sheetsMap: updatedSheets,
            matchesList: updatedMatches,
            anyChanged,
            matchesChanged,
          };
        };

        const officialRes = officialRunning
          ? processCollection(prev.officialSheets, prev.officialMatches, false)
          : null;
        const testRes = testRunning
          ? processCollection(prev.testSheets, prev.testMatches, true)
          : null;

        if (!officialRes?.anyChanged && !testRes?.anyChanged) return prev;

        return {
          ...prev,
          ...(officialRes?.anyChanged
            ? {
                officialSheets: officialRes.sheetsMap,
                ...(officialRes.matchesChanged
                  ? { officialMatches: officialRes.matchesList }
                  : {}),
              }
            : {}),
          ...(testRes?.anyChanged
            ? {
                testSheets: testRes.sheetsMap,
                ...(testRes.matchesChanged ? { testMatches: testRes.matchesList } : {}),
              }
            : {}),
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [enqueueCloudSync]);

  const updateMatchAndSheet = useCallback(
    (
      matchId: string,
      updater: (match: Match, sheet: MatchSheet) => { match: Match; sheet: MatchSheet }
    ) => {
      setState((prev) => {
        const hasMatchUnlock = unlockedMatchIdsRef.current.includes(matchId);
        if (!isUserAdmin(prev.currentUser) && !hasMatchUnlock) return prev;
        const isTest = matchId.startsWith('test-');
        const matchesList = isTest ? [...prev.testMatches] : [...prev.officialMatches];
        const sheetsMap = isTest ? { ...prev.testSheets } : { ...prev.officialSheets };

        const matchIdx = matchesList.findIndex((m) => m.id === matchId);
        const currentSheet = sheetsMap[matchId];
        if (matchIdx === -1 || !currentSheet) return prev;

        const { match: nextMatch, sheet: nextSheet } = updater(
          matchesList[matchIdx],
          currentSheet
        );

        const nextRevision = (currentSheet.revision ?? 0) + 1;
        const finalizedMatch: Match = {
          ...nextMatch,
          revision: (matchesList[matchIdx].revision ?? 0) + 1,
        };
        const finalizedSheet: MatchSheet = {
          ...nextSheet,
          syncStatus: isOnline ? 'synced' : 'pending_sync',
          lastUpdatedIso: new Date().toISOString(),
          revision: nextRevision,
        };

        matchesList[matchIdx] = finalizedMatch;
        sheetsMap[matchId] = finalizedSheet;

        if (!isTest) {
          enqueueCloudSync('matches', finalizedMatch.id, finalizedMatch);
          enqueueCloudSync('match_sheets', finalizedMatch.id, finalizedSheet);
        }

        return {
          ...prev,
          ...(isTest
            ? { testMatches: matchesList, testSheets: sheetsMap }
            : { officialMatches: matchesList, officialSheets: sheetsMap }),
          pendingSyncCount: isOnline ? prev.pendingSyncCount : prev.pendingSyncCount + 1,
        };
      });
    },
    [isOnline, enqueueCloudSync]
  );

  const setTestMode = useCallback((enabled: boolean) => {
    setState((prev) => {
      if (enabled && !isUserAdmin(prev.currentUser)) return prev;
      return {
        ...prev,
        isTestMode: enabled,
      };
    });
  }, []);

  const resetTestEnvironment = useCallback(() => {
    const fresh = buildInitialTestWorkbench();
    setState((prev) => {
      if (!isUserAdmin(prev.currentUser)) return prev;
      return {
        ...prev,
        testTeams: fresh.teams,
        testAthletes: fresh.athletes,
        testMatches: fresh.matches,
        testSheets: fresh.sheets,
      };
    });
  }, []);

  const visibleMatches = state.isTestMode ? state.testMatches : state.officialMatches;
  const visibleTeams = state.isTestMode ? state.testTeams : state.officialTeams;
  const visibleAthletes = state.isTestMode ? state.testAthletes : state.officialAthletes;
  const activeSheetsMap = state.isTestMode ? state.testSheets : state.officialSheets;

  const getMatchById = useCallback(
    (matchId: string): Match | undefined => {
      if (matchId.startsWith('test-')) {
        return state.testMatches.find((m) => m.id === matchId);
      }
      return state.officialMatches.find((m) => m.id === matchId);
    },
    [state.testMatches, state.officialMatches]
  );

  const getSheetByMatchId = useCallback(
    (matchId: string): MatchSheet | undefined => {
      if (matchId.startsWith('test-')) {
        return state.testSheets[matchId];
      }
      return state.officialSheets[matchId];
    },
    [state.testSheets, state.officialSheets]
  );

  const getCurrentMatchClockDisplay = (sheet: MatchSheet): string => {
    const engine = MODALITY_RULE_ENGINE[sheet.modalityId];
    if (engine.timerDirection === 'countdown') {
      return formatSecondsToClock(sheet.timer.remainingSeconds);
    }
    if (engine.timerDirection === 'countup') {
      return formatSecondsToClock(sheet.timer.elapsedSeconds);
    }
    return sheet.timer.periodLabel;
  };

  // CONTROLES DO CRONÔMETRO
  const startOrResumeTimer = useCallback(
    (matchId: string) => {
      updateMatchAndSheet(matchId, (match, sheet) => {
        if (sheet.isClosed) return { match, sheet };
        const wasNotStarted = sheet.timer.lifecycle === 'not_started';
        const nextEvents = [...sheet.events];

        if (wasNotStarted) {
          nextEvents.unshift({
            id: generateUniqueId('ev'),
            matchId,
            type: 'period_start',
            typeLabel: `Início — ${sheet.timer.periodLabel}`,
            periodNumber: sheet.timer.currentPeriod,
            periodLabel: sheet.timer.periodLabel,
            matchClockDisplay: getCurrentMatchClockDisplay(sheet),
            createdAtIso: new Date().toISOString(),
            auditHistory: [],
          });
        }

        return {
          match: {
            ...match,
            status: 'live',
          },
          sheet: {
            ...sheet,
            events: nextEvents,
            timer: {
              ...sheet.timer,
              isRunning: true,
              lifecycle: 'running',
              lastTickTimestamp: Date.now(),
            },
          },
        };
      });
    },
    [updateMatchAndSheet]
  );

  const pauseTimer = useCallback(
    (matchId: string) => {
      updateMatchAndSheet(matchId, (match, sheet) => ({
        match,
        sheet: {
          ...sheet,
          timer: {
            ...sheet.timer,
            isRunning: false,
            lifecycle: 'paused',
            lastTickTimestamp: null,
          },
        },
      }));
    },
    [updateMatchAndSheet]
  );

  const resetPeriodTimer = useCallback(
    (matchId: string) => {
      updateMatchAndSheet(matchId, (match, sheet) => ({
        match,
        sheet: {
          ...sheet,
          timer: {
            ...sheet.timer,
            remainingSeconds: sheet.timer.initialPeriodSeconds,
            elapsedSeconds: 0,
            isRunning: false,
            lifecycle: 'not_started',
            lastTickTimestamp: null,
          },
        },
      }));
    },
    [updateMatchAndSheet]
  );

  const endCurrentPeriod = useCallback(
    (matchId: string) => {
      updateMatchAndSheet(matchId, (match, sheet) => {
        const updatedPeriods = sheet.periodScores.map((p) =>
          p.periodNumber === sheet.timer.currentPeriod
            ? { ...p, isFinished: true }
            : p
        );

        const engine = MODALITY_RULE_ENGINE[sheet.modalityId];
        const endClockStr =
          engine.timerDirection === 'countdown'
            ? '00:00'
            : getCurrentMatchClockDisplay(sheet);

        // Item 37 da Auditoria: "Fim — {periodLabel}" para evitar "Fim do Prorrogação"
        const endEvent: MatchEvent = {
          id: generateUniqueId('ev'),
          matchId,
          type: 'period_end',
          typeLabel: `Fim — ${sheet.timer.periodLabel}`,
          periodNumber: sheet.timer.currentPeriod,
          periodLabel: sheet.timer.periodLabel,
          matchClockDisplay: endClockStr,
          createdAtIso: new Date().toISOString(),
          auditHistory: [],
        };

        const isLastRegularPeriod =
          sheet.timer.currentPeriod >= sheet.timer.totalPeriods;

        matchSound.playBuzzer();

        return {
          match: {
            ...match,
            status: isLastRegularPeriod ? match.status : 'halftime',
          },
          sheet: {
            ...sheet,
            periodScores: updatedPeriods,
            events: [endEvent, ...sheet.events],
            timer: {
              ...sheet.timer,
              isRunning: false,
              remainingSeconds:
                engine.timerDirection === 'countdown'
                  ? 0
                  : sheet.timer.remainingSeconds,
              lifecycle: isLastRegularPeriod ? 'period_ended' : 'interval',
              lastTickTimestamp: null,
            },
          },
        };
      });
    },
    [updateMatchAndSheet]
  );

  const startNextPeriod = useCallback(
    (matchId: string) => {
      updateMatchAndSheet(matchId, (match, sheet) => {
        const nextPeriodNum = sheet.timer.currentPeriod + 1;
        const engine = MODALITY_RULE_ENGINE[sheet.modalityId];
        const nextLabel =
          engine.scoringModel === 'points_quarters'
            ? `${nextPeriodNum}º Quarto (P${nextPeriodNum})`
            : engine.scoringModel === 'sets_points'
            ? `Set ${nextPeriodNum}`
            : `${nextPeriodNum}º Período`;

        const existsInPeriods = sheet.periodScores.some(
          (p) => p.periodNumber === nextPeriodNum
        );
        const nextPeriodScores = existsInPeriods
          ? sheet.periodScores
          : [
              ...sheet.periodScores,
              {
                periodNumber: nextPeriodNum,
                label:
                  engine.scoringModel === 'points_quarters'
                    ? `P${nextPeriodNum}`
                    : engine.scoringModel === 'sets_points'
                    ? `Set ${nextPeriodNum}`
                    : `${nextPeriodNum}º Período`,
                homeScore: 0,
                awayScore: 0,
                isFinished: false,
              },
            ];

        return {
          match: {
            ...match,
            status: 'live',
          },
          sheet: {
            ...sheet,
            periodScores: nextPeriodScores,
            homeFoulsCurrentPeriod: 0,
            awayFoulsCurrentPeriod: 0,
            homeTimeoutsUsed: 0,
            awayTimeoutsUsed: 0,
            timer: {
              ...sheet.timer,
              currentPeriod: nextPeriodNum,
              periodLabel: nextLabel,
              remainingSeconds: sheet.timer.initialPeriodSeconds,
              elapsedSeconds: 0,
              isRunning: false,
              lifecycle: 'not_started',
              lastTickTimestamp: null,
            },
          },
        };
      });
    },
    [updateMatchAndSheet]
  );

  const startOvertimePeriod = useCallback(
    (matchId: string) => {
      updateMatchAndSheet(matchId, (match, sheet) => {
        const engine = MODALITY_RULE_ENGINE[sheet.modalityId];
        const catRule =
          engine.defaultCategoryRules[match.categoryName || ''] ||
          Object.values(engine.defaultCategoryRules)[0];
        const otDuration = catRule.overtimeDurationSeconds || 300;
        const nextPeriodNum = sheet.periodScores.length + 1;

        return {
          match: {
            ...match,
            status: 'live',
          },
          sheet: {
            ...sheet,
            homeFoulsCurrentPeriod: 0,
            awayFoulsCurrentPeriod: 0,
            periodScores: [
              ...sheet.periodScores,
              {
                periodNumber: nextPeriodNum,
                label: 'PR',
                homeScore: 0,
                awayScore: 0,
                isFinished: false,
              },
            ],
            timer: {
              ...sheet.timer,
              currentPeriod: nextPeriodNum,
              periodLabel: 'Prorrogação',
              initialPeriodSeconds: otDuration,
              remainingSeconds: otDuration,
              elapsedSeconds: 0,
              isRunning: false,
              lifecycle: 'overtime',
              lastTickTimestamp: null,
            },
          },
        };
      });
    },
    [updateMatchAndSheet]
  );

  // Item 28 da Auditoria: redimensiona `periodScores` quando a regra de categoria muda
  const configureMatchCategoryRule = useCallback(
    (matchId: string, categoryName: string) => {
      updateMatchAndSheet(matchId, (match, sheet) => {
        const engine = MODALITY_RULE_ENGINE[sheet.modalityId];
        const rule = engine.defaultCategoryRules[categoryName];
        if (!rule) return { match, sheet };

        const resizedPeriodScores = Array.from({ length: rule.periodsCount }).map(
          (_, idx) => {
            const existing = sheet.periodScores.find(
              (p) => p.periodNumber === idx + 1
            );
            if (existing) return existing;
            return {
              periodNumber: idx + 1,
              label:
                engine.scoringModel === 'sets_points' ||
                engine.scoringModel === 'team_submatches'
                  ? `Set ${idx + 1}`
                  : engine.scoringModel === 'points_quarters'
                  ? `P${idx + 1}`
                  : `${idx + 1}º Período`,
              homeScore: 0,
              awayScore: 0,
              isFinished: false,
            };
          }
        );

        return {
          match: {
            ...match,
            categoryName: rule.categoryName,
          },
          sheet: {
            ...sheet,
            periodScores: resizedPeriodScores,
            timer: {
              ...sheet.timer,
              currentPeriod: 1,
              totalPeriods: rule.periodsCount,
              initialPeriodSeconds: rule.periodDurationSeconds,
              remainingSeconds: rule.periodDurationSeconds,
              elapsedSeconds: 0,
              isRunning: false,
              lifecycle: 'not_started',
              lastTickTimestamp: null,
            },
          },
        };
      });
    },
    [updateMatchAndSheet]
  );

  // REGISTRO DE EVENTOS EM TEMPO REAL
  const recordMatchEvent = useCallback(
    (matchId: string, payload: NewEventPayload) => {
      updateMatchAndSheet(matchId, (match, sheet) => {
        if (sheet.isClosed) return { match, sheet };

        const clockStr = getCurrentMatchClockDisplay(sheet);
        const teamName =
          payload.teamSide === 'home'
            ? match.homeTeam.teamName
            : payload.teamSide === 'away'
            ? match.awayTeam.teamName
            : null;
        const teamId =
          payload.teamSide === 'home'
            ? match.homeTeam.teamId
            : payload.teamSide === 'away'
            ? match.awayTeam.teamId
            : null;

        const newEvent: MatchEvent = {
          id: generateUniqueId('ev'),
          matchId,
          type: payload.type,
          typeLabel: payload.typeLabel,
          teamSide: payload.teamSide,
          teamId,
          teamName,
          athleteId: payload.athleteId,
          athleteName: payload.athleteName,
          athleteNumber: payload.athleteNumber,
          secondaryAthleteId: payload.secondaryAthleteId,
          secondaryAthleteName: payload.secondaryAthleteName,
          secondaryAthleteNumber: payload.secondaryAthleteNumber,
          periodNumber: sheet.timer.currentPeriod,
          periodLabel: sheet.timer.periodLabel,
          matchClockDisplay: clockStr,
          createdAtIso: new Date().toISOString(),
          pointsDelta: payload.pointsDelta,
          foulReason: payload.foulReason,
          notes: payload.notes,
          auditHistory: [],
        };

        let nextSuspensions = [...sheet.activeSuspensions];
        let nextActiveTimeout = sheet.activeTimeout;
        let nextTimer = { ...sheet.timer };
        let nextHomeLineup = [...sheet.homeLineup];
        let nextAwayLineup = [...sheet.awayLineup];

        // Punição Temporária de 2 Minutos (Item 27 da Auditoria: cálculo de retorno para countdown e countup)
        if (payload.type === 'suspension_2min' && payload.teamSide) {
          const engine = MODALITY_RULE_ENGINE[sheet.modalityId];
          let returnClockStr = '00:00';
          if (engine.timerDirection === 'countdown') {
            if (sheet.timer.remainingSeconds >= 120) {
              returnClockStr = formatSecondsToClock(
                sheet.timer.remainingSeconds - 120
              );
            } else {
              const carryOver = 120 - sheet.timer.remainingSeconds;
              const nextPerRem = Math.max(
                0,
                sheet.timer.initialPeriodSeconds - carryOver
              );
              returnClockStr = `${formatSecondsToClock(nextPerRem)} (Próx. Per.)`;
            }
          } else {
            returnClockStr = formatSecondsToClock(sheet.timer.elapsedSeconds + 120);
          }

          nextSuspensions.unshift({
            id: generateUniqueId('susp'),
            eventId: newEvent.id,
            teamSide: payload.teamSide,
            teamName: teamName || 'Equipe',
            athleteId: payload.athleteId || 'ath',
            athleteName: payload.athleteName || 'Atleta',
            athleteNumber: payload.athleteNumber,
            startedAtMatchClock: clockStr,
            durationSeconds: 120,
            remainingSeconds: 120,
            expectedReturnMatchClock: returnClockStr,
            isReleased: false,
          });
        }

        // Substituição
        if (
          payload.type === 'substitution' &&
          payload.teamSide &&
          payload.athleteId &&
          payload.secondaryAthleteId
        ) {
          const updateList = (list: MatchLineupEntry[]) =>
            list.map((entry) => {
              if (entry.athleteId === payload.athleteId) {
                return { ...entry, isStarter: false };
              }
              if (entry.athleteId === payload.secondaryAthleteId) {
                return { ...entry, isStarter: true };
              }
              return entry;
            });

          if (payload.teamSide === 'home') {
            nextHomeLineup = updateList(nextHomeLineup);
          } else {
            nextAwayLineup = updateList(nextAwayLineup);
          }
        }

        // Timeout / Tempo Técnico
        if (payload.type === 'timeout' && payload.teamSide) {
          const engine = MODALITY_RULE_ENGINE[sheet.modalityId];
          const catRule =
            engine.defaultCategoryRules[match.categoryName || ''] ||
            Object.values(engine.defaultCategoryRules)[0];
          const timeoutSecs = catRule?.timeoutDurationSeconds || 60;

          nextTimer = {
            ...nextTimer,
            isRunning: false,
            lifecycle:
              nextTimer.lifecycle === 'running' ? 'paused' : nextTimer.lifecycle,
            lastTickTimestamp: null,
          };

          nextActiveTimeout = {
            isActive: true,
            teamSide: payload.teamSide,
            teamName: teamName || 'Equipe',
            remainingSeconds: timeoutSecs,
            totalSeconds: timeoutSecs,
          };
        }

        const draftSheet: MatchSheet = {
          ...sheet,
          events: [newEvent, ...sheet.events],
          activeSuspensions: nextSuspensions,
          activeTimeout: nextActiveTimeout,
          homeLineup: nextHomeLineup,
          awayLineup: nextAwayLineup,
          timer: nextTimer,
        };

        const recomputed = recomputeMatchAndSheetFromEvents(match, draftSheet);

        return {
          match: {
            ...recomputed.match,
            status:
              recomputed.match.status === 'scheduled'
                ? 'live'
                : recomputed.match.status,
          },
          sheet: recomputed.sheet,
        };
      });
    },
    [updateMatchAndSheet]
  );

  // CORREÇÃO / EDIÇÃO DE EVENTO COM REGISTRO DE AUDITORIA E RECÁLCULO PURO (Item 15 da Auditoria)
  const editMatchEvent = useCallback(
    (matchId: string, payload: EditEventPayload) => {
      updateMatchAndSheet(matchId, (match, sheet) => {
        const target = sheet.events.find((e) => e.id === payload.eventId);
        if (!target || target.isDeleted) return { match, sheet };

        const prevSummary = `${target.typeLabel} • ${target.teamName || ''} • ${
          target.athleteName || 'Sem atleta'
        } (${target.matchClockDisplay})`;

        const nextTeamSide =
          payload.teamSide !== undefined ? payload.teamSide : target.teamSide;
        const nextTeamName =
          nextTeamSide === 'home'
            ? match.homeTeam.teamName
            : nextTeamSide === 'away'
            ? match.awayTeam.teamName
            : target.teamName;

        const nextAthleteName =
          payload.athleteName !== undefined ? payload.athleteName : target.athleteName;
        const nextClock =
          payload.matchClockDisplay !== undefined
            ? payload.matchClockDisplay
            : target.matchClockDisplay;

        const newSummary = `${target.typeLabel} • ${nextTeamName || ''} • ${
          nextAthleteName || 'Sem atleta'
        } (${nextClock})`;

        const updatedEvents = sheet.events.map((ev) => {
          if (ev.id !== payload.eventId) return ev;
          return {
            ...ev,
            teamSide: nextTeamSide,
            teamName: nextTeamName,
            athleteId:
              payload.athleteId !== undefined ? payload.athleteId : ev.athleteId,
            athleteName: nextAthleteName,
            athleteNumber:
              payload.athleteNumber !== undefined
                ? payload.athleteNumber
                : ev.athleteNumber,
            matchClockDisplay: nextClock,
            notes: payload.notes !== undefined ? payload.notes : ev.notes,
            auditHistory: [
              ...ev.auditHistory,
              {
                id: generateUniqueId('aud'),
                timestampIso: new Date().toISOString(),
                operatorRole: 'Mesa Operadora',
                action: 'edited' as const,
                previousSummary: prevSummary,
                newSummary,
                reason: payload.reason || 'Correção de lançamento na súmula',
              },
            ],
          };
        });

        const draftSheet: MatchSheet = {
          ...sheet,
          events: updatedEvents,
        };

        return recomputeMatchAndSheetFromEvents(match, draftSheet);
      });
    },
    [updateMatchAndSheet]
  );

  // EXCLUSÃO DE EVENTO COM RECÁLCULO TOTAL (Placar, Sets, Faltas, Timeouts e Substituições — Item 15 da Auditoria)
  const deleteMatchEvent = useCallback(
    (matchId: string, eventId: string, reason?: string) => {
      updateMatchAndSheet(matchId, (match, sheet) => {
        const target = sheet.events.find((e) => e.id === eventId);
        if (!target || target.isDeleted) return { match, sheet };

        const prevSummary = `${target.typeLabel} • ${target.teamName || ''} • ${
          target.athleteName || 'Sem atleta'
        } (${target.matchClockDisplay})`;

        // Se o evento excluído foi uma substituição, desfazemos a troca de titularidade
        let nextHomeLineup = [...sheet.homeLineup];
        let nextAwayLineup = [...sheet.awayLineup];
        if (
          target.type === 'substitution' &&
          target.teamSide &&
          target.athleteId &&
          target.secondaryAthleteId
        ) {
          const revertSub = (list: MatchLineupEntry[]) =>
            list.map((entry) => {
              if (entry.athleteId === target.athleteId) {
                return { ...entry, isStarter: true };
              }
              if (entry.athleteId === target.secondaryAthleteId) {
                return { ...entry, isStarter: false };
              }
              return entry;
            });
          if (target.teamSide === 'home') {
            nextHomeLineup = revertSub(nextHomeLineup);
          } else {
            nextAwayLineup = revertSub(nextAwayLineup);
          }
        }

        const updatedEvents = sheet.events.map((ev) => {
          if (ev.id !== eventId) return ev;
          return {
            ...ev,
            isDeleted: true,
            auditHistory: [
              ...ev.auditHistory,
              {
                id: generateUniqueId('aud'),
                timestampIso: new Date().toISOString(),
                operatorRole: 'Mesa Operadora',
                action: 'deleted' as const,
                previousSummary: prevSummary,
                newSummary: 'Evento anulado pela arbitragem/mesa',
                reason: reason || 'Exclusão confirmada pelo operador',
              },
            ],
          };
        });

        const draftSheet: MatchSheet = {
          ...sheet,
          events: updatedEvents,
          homeLineup: nextHomeLineup,
          awayLineup: nextAwayLineup,
          activeTimeout:
            target.type === 'timeout' ? null : sheet.activeTimeout,
        };

        return recomputeMatchAndSheetFromEvents(match, draftSheet);
      });
    },
    [updateMatchAndSheet]
  );

  const dismissReleasedSuspension = useCallback(
    (matchId: string, suspensionId: string) => {
      updateMatchAndSheet(matchId, (match, sheet) => ({
        match,
        sheet: {
          ...sheet,
          activeSuspensions: sheet.activeSuspensions.filter(
            (s) => s.id !== suspensionId
          ),
        },
      }));
    },
    [updateMatchAndSheet]
  );

  const cancelActiveTimeout = useCallback(
    (matchId: string) => {
      updateMatchAndSheet(matchId, (match, sheet) => ({
        match,
        sheet: {
          ...sheet,
          activeTimeout: null,
        },
      }));
    },
    [updateMatchAndSheet]
  );

  const toggleLineupRole = useCallback(
    (
      matchId: string,
      teamSide: 'home' | 'away',
      athleteId: string,
      field: 'isStarter' | 'isCaptain' | 'isGoalkeeper' | 'isPairMember'
    ) => {
      updateMatchAndSheet(matchId, (match, sheet) => {
        const list =
          teamSide === 'home' ? [...sheet.homeLineup] : [...sheet.awayLineup];

        const updated = list.map((item) => {
          if (field === 'isCaptain') {
            return {
              ...item,
              isCaptain: item.athleteId === athleteId ? !item.isCaptain : false,
            };
          }
          if (field === 'isGoalkeeper') {
            return {
              ...item,
              isGoalkeeper:
                item.athleteId === athleteId ? !item.isGoalkeeper : false,
            };
          }
          if (item.athleteId === athleteId) {
            return { ...item, [field]: !item[field] };
          }
          return item;
        });

        return {
          match,
          sheet: {
            ...sheet,
            ...(teamSide === 'home'
              ? { homeLineup: updated }
              : { awayLineup: updated }),
          },
        };
      });
    },
    [updateMatchAndSheet]
  );

  // ENCERRAMENTO DE SET (VÔLEI / VÔLEI DE PRAIA — Item 16 da Auditoria: valida set empatado e encerra a partida ao atingir maioria dos sets)
  const finishCurrentSet = useCallback(
    (matchId: string) => {
      updateMatchAndSheet(matchId, (match, sheet) => {
        if (sheet.isClosed) return { match, sheet };
        const currentSetObj = sheet.periodScores.find(
          (p) => p.periodNumber === sheet.timer.currentPeriod
        );
        if (!currentSetObj) return { match, sheet };

        // Bloqueia encerrar set empatado (ex: 0x0 ou 24x24)
        if (currentSetObj.homeScore === currentSetObj.awayScore) {
          return { match, sheet };
        }

        const updatedPeriods = sheet.periodScores.map((p) =>
          p.periodNumber === sheet.timer.currentPeriod
            ? { ...p, isFinished: true }
            : p
        );

        const nextHomeSets = updatedPeriods.filter(
          (p) => p.isFinished && p.homeScore > p.awayScore
        ).length;
        const nextAwaySets = updatedPeriods.filter(
          (p) => p.isFinished && p.awayScore > p.homeScore
        ).length;

        const engine = MODALITY_RULE_ENGINE[sheet.modalityId];
        const catRule =
          engine.defaultCategoryRules[match.categoryName || ''] ||
          Object.values(engine.defaultCategoryRules)[0];
        const setsToWin =
          catRule?.setsToWin || Math.ceil(sheet.timer.totalPeriods / 2);

        const matchDecided =
          nextHomeSets >= setsToWin || nextAwaySets >= setsToWin;

        const setEndEvent: MatchEvent = {
          id: generateUniqueId('ev'),
          matchId,
          type: 'set_end',
          typeLabel: `Fim — ${sheet.timer.periodLabel} (${currentSetObj.homeScore} × ${currentSetObj.awayScore})`,
          periodNumber: sheet.timer.currentPeriod,
          periodLabel: sheet.timer.periodLabel,
          matchClockDisplay: `Set ${sheet.timer.currentPeriod}`,
          createdAtIso: new Date().toISOString(),
          auditHistory: [],
        };

        const nextSetNumber = sheet.timer.currentPeriod + 1;
        const hasMoreSets =
          !matchDecided && nextSetNumber <= sheet.timer.totalPeriods;

        const finalPeriods =
          hasMoreSets &&
          !updatedPeriods.some((p) => p.periodNumber === nextSetNumber)
            ? [
                ...updatedPeriods,
                {
                  periodNumber: nextSetNumber,
                  label: `Set ${nextSetNumber}`,
                  homeScore: 0,
                  awayScore: 0,
                  isFinished: false,
                },
              ]
            : updatedPeriods;

        matchSound.playBuzzer();

        return {
          match: {
            ...match,
            status: matchDecided ? 'finished' : 'live',
            homeTeam: {
              ...match.homeTeam,
              score: nextHomeSets,
              setsWon: nextHomeSets,
              isWinner: matchDecided ? nextHomeSets > nextAwaySets : false,
            },
            awayTeam: {
              ...match.awayTeam,
              score: nextAwaySets,
              setsWon: nextAwaySets,
              isWinner: matchDecided ? nextAwaySets > nextHomeSets : false,
            },
          },
          sheet: {
            ...sheet,
            periodScores: finalPeriods,
            events: [setEndEvent, ...sheet.events],
            homeTimeoutsUsed: 0,
            awayTimeoutsUsed: 0,
            isClosed: matchDecided ? true : sheet.isClosed,
            closedAtIso: matchDecided ? new Date().toISOString() : sheet.closedAtIso,
            timer: {
              ...sheet.timer,
              currentPeriod: hasMoreSets ? nextSetNumber : sheet.timer.currentPeriod,
              periodLabel: hasMoreSets
                ? `Set ${nextSetNumber}`
                : sheet.timer.periodLabel,
              lifecycle: matchDecided ? 'match_ended' : sheet.timer.lifecycle,
            },
          },
        };
      });
    },
    [updateMatchAndSheet]
  );

  // TÊNIS DE MESA (Item 17 da Auditoria: respeita súmula fechada, bloqueia sub-partida já finalizada, ativa próxima sub-partida e encerra confronto em 2 vitórias)
  const recordTableTennisPoint = useCallback(
    (matchId: string, subMatchId: string, side: 'home' | 'away') => {
      updateMatchAndSheet(matchId, (match, sheet) => {
        if (sheet.isClosed || !sheet.subMatches) return { match, sheet };
        const targetSm = sheet.subMatches.find((s) => s.id === subMatchId);
        if (!targetSm || targetSm.status === 'finished') return { match, sheet };

        const updatedSubMatches = sheet.subMatches.map((sm) => {
          if (sm.id !== subMatchId) return sm;
          return {
            ...sm,
            status: 'live' as const,
            currentSetHomePoints:
              side === 'home'
                ? sm.currentSetHomePoints + 1
                : sm.currentSetHomePoints,
            currentSetAwayPoints:
              side === 'away'
                ? sm.currentSetAwayPoints + 1
                : sm.currentSetAwayPoints,
          };
        });

        const activeSm = updatedSubMatches.find((s) => s.id === subMatchId);
        const ev: MatchEvent = {
          id: generateUniqueId('ev'),
          matchId,
          type: 'set_point',
          typeLabel: `Ponto (${activeSm?.label || 'Partida'})`,
          teamSide: side,
          teamName:
            side === 'home' ? match.homeTeam.teamName : match.awayTeam.teamName,
          athleteId:
            side === 'home' ? activeSm?.homeAthleteId : activeSm?.awayAthleteId,
          athleteName:
            side === 'home' ? activeSm?.homeAthleteName : activeSm?.awayAthleteName,
          periodNumber: sheet.timer.currentPeriod,
          periodLabel: activeSm?.label || 'Tênis de Mesa',
          matchClockDisplay: `${activeSm?.currentSetHomePoints ?? 0}×${
            activeSm?.currentSetAwayPoints ?? 0
          }`,
          createdAtIso: new Date().toISOString(),
          auditHistory: [],
        };

        return {
          match: {
            ...match,
            status: 'live',
          },
          sheet: {
            ...sheet,
            subMatches: updatedSubMatches,
            events: [ev, ...sheet.events],
          },
        };
      });
    },
    [updateMatchAndSheet]
  );

  const finishTableTennisSet = useCallback(
    (matchId: string, subMatchId: string) => {
      updateMatchAndSheet(matchId, (match, sheet) => {
        if (sheet.isClosed || !sheet.subMatches) return { match, sheet };
        const targetSm = sheet.subMatches.find((s) => s.id === subMatchId);
        if (
          !targetSm ||
          targetSm.status === 'finished' ||
          targetSm.currentSetHomePoints === targetSm.currentSetAwayPoints
        ) {
          return { match, sheet };
        }

        const updatedSubMatches = sheet.subMatches.map((sm) => {
          if (sm.id !== subMatchId) return sm;
          const homeWon = sm.currentSetHomePoints > sm.currentSetAwayPoints;
          const awayWon = sm.currentSetAwayPoints > sm.currentSetHomePoints;
          const nextHomeSets = sm.homeSetsWon + (homeWon ? 1 : 0);
          const nextAwaySets = sm.awaySetsWon + (awayWon ? 1 : 0);
          const isSubMatchFinished = nextHomeSets >= 2 || nextAwaySets >= 2;

          return {
            ...sm,
            homeSetsWon: nextHomeSets,
            awaySetsWon: nextAwaySets,
            currentSetHomePoints: 0,
            currentSetAwayPoints: 0,
            status: isSubMatchFinished ? ('finished' as const) : ('live' as const),
            winnerSide: isSubMatchFinished
              ? nextHomeSets > nextAwaySets
                ? ('home' as const)
                : ('away' as const)
              : null,
          };
        });

        const totalHomeTeamMatchesWon = updatedSubMatches.filter(
          (sm) => sm.winnerSide === 'home'
        ).length;
        const totalAwayTeamMatchesWon = updatedSubMatches.filter(
          (sm) => sm.winnerSide === 'away'
        ).length;

        const matchDecided =
          totalHomeTeamMatchesWon >= 2 || totalAwayTeamMatchesWon >= 2;

        // Ativa automaticamente a próxima sub-partida pendente se o confronto ainda não acabou
        let nextActiveIndex = sheet.activeSubMatchIndex ?? 0;
        if (!matchDecided) {
          const nextPendingIdx = updatedSubMatches.findIndex(
            (sm) => sm.status !== 'finished'
          );
          if (nextPendingIdx >= 0) {
            nextActiveIndex = nextPendingIdx;
            updatedSubMatches[nextPendingIdx] = {
              ...updatedSubMatches[nextPendingIdx],
              status: 'live',
            };
          }
        }

        return {
          match: {
            ...match,
            status: matchDecided ? 'finished' : match.status,
            homeTeam: {
              ...match.homeTeam,
              score: totalHomeTeamMatchesWon,
              isWinner: matchDecided
                ? totalHomeTeamMatchesWon > totalAwayTeamMatchesWon
                : false,
            },
            awayTeam: {
              ...match.awayTeam,
              score: totalAwayTeamMatchesWon,
              isWinner: matchDecided
                ? totalAwayTeamMatchesWon > totalHomeTeamMatchesWon
                : false,
            },
          },
          sheet: {
            ...sheet,
            subMatches: updatedSubMatches,
            activeSubMatchIndex: nextActiveIndex,
            isClosed: matchDecided ? true : sheet.isClosed,
            closedAtIso: matchDecided ? new Date().toISOString() : sheet.closedAtIso,
          },
        };
      });
    },
    [updateMatchAndSheet]
  );

  const selectActiveSubMatch = useCallback(
    (matchId: string, index: number) => {
      updateMatchAndSheet(matchId, (match, sheet) => ({
        match,
        sheet: {
          ...sheet,
          activeSubMatchIndex: index,
        },
      }));
    },
    [updateMatchAndSheet]
  );

  // NATAÇÃO (Item 30 da Auditoria: tempos empatados recebem a mesma colocação olímpica)
  const setSwimmingStrokeAndDistance = useCallback(
    (matchId: string, stroke: SwimmingStrokeType, distanceLabel: string) => {
      updateMatchAndSheet(matchId, (match, sheet) => ({
        match: {
          ...match,
          categoryName: `${stroke} • ${distanceLabel}`,
        },
        sheet: {
          ...sheet,
          swimmingStroke: stroke,
          swimmingDistanceLabel: distanceLabel,
        },
      }));
    },
    [updateMatchAndSheet]
  );

  const registerSwimmingLaneTime = useCallback(
    (
      matchId: string,
      laneNumber: number,
      timeMs: number | null,
      status: 'ready' | 'finished' | 'dsq' | 'dns' = 'finished'
    ) => {
      updateMatchAndSheet(matchId, (match, sheet) => {
        if (!sheet.swimmingLanes) return { match, sheet };

        const rawUpdated = sheet.swimmingLanes.map((lane) => {
          if (lane.laneNumber !== laneNumber) return lane;
          return {
            ...lane,
            registeredTimeMs: status === 'finished' ? timeMs : null,
            formattedTime:
              status === 'finished' && timeMs !== null
                ? formatMsToSwimmingTime(timeMs)
                : status === 'dsq'
                ? 'DSQ'
                : status === 'dns'
                ? 'DNS'
                : null,
            status,
          };
        });

        const finishedSorted = [...rawUpdated]
          .filter((l) => l.status === 'finished' && l.registeredTimeMs !== null)
          .sort((a, b) => (a.registeredTimeMs || 0) - (b.registeredTimeMs || 0));

        // Atribui mesma colocação em caso de empate exato em milissegundos
        const rankedLanes = rawUpdated.map((lane) => {
          if (lane.status !== 'finished' || lane.registeredTimeMs === null) {
            return { ...lane, placement: null };
          }
          const firstWithSameTimeIdx = finishedSorted.findIndex(
            (f) => f.registeredTimeMs === lane.registeredTimeMs
          );
          return {
            ...lane,
            placement: firstWithSameTimeIdx >= 0 ? firstWithSameTimeIdx + 1 : null,
          };
        });

        const laneObj = rankedLanes.find((l) => l.laneNumber === laneNumber);
        const swimEvent: MatchEvent = {
          id: generateUniqueId('ev'),
          matchId,
          type: 'swimming_time',
          typeLabel: `Tempo Registrado — Raia ${laneNumber}`,
          athleteId: laneObj?.athleteId,
          athleteName: laneObj?.athleteName,
          teamName: laneObj?.teamName,
          periodNumber: 1,
          periodLabel: sheet.swimmingStroke || 'Prova',
          matchClockDisplay: laneObj?.formattedTime || '--:--',
          createdAtIso: new Date().toISOString(),
          notes: laneObj?.placement ? `${laneObj.placement}º Lugar parcial` : undefined,
          auditHistory: [],
        };

        return {
          match: {
            ...match,
            status: 'live',
          },
          sheet: {
            ...sheet,
            swimmingLanes: rankedLanes,
            events: [swimEvent, ...sheet.events],
          },
        };
      });
    },
    [updateMatchAndSheet]
  );

  const updateRefereeMetadata = useCallback(
    (
      matchId: string,
      data: {
        refereeName?: string;
        assistantRefereeName?: string;
        tableOfficialName?: string;
        timekeeperName?: string;
        twentyFourSecOperatorName?: string;
        refereeNotes?: string;
      }
    ) => {
      updateMatchAndSheet(matchId, (match, sheet) => ({
        match,
        sheet: {
          ...sheet,
          refereeName:
            data.refereeName !== undefined ? data.refereeName : sheet.refereeName,
          assistantRefereeName:
            data.assistantRefereeName !== undefined
              ? data.assistantRefereeName
              : sheet.assistantRefereeName,
          tableOfficialName:
            data.tableOfficialName !== undefined
              ? data.tableOfficialName
              : sheet.tableOfficialName,
          timekeeperName:
            data.timekeeperName !== undefined
              ? data.timekeeperName
              : sheet.timekeeperName,
          twentyFourSecOperatorName:
            data.twentyFourSecOperatorName !== undefined
              ? data.twentyFourSecOperatorName
              : sheet.twentyFourSecOperatorName,
          refereeNotes:
            data.refereeNotes !== undefined
              ? data.refereeNotes
              : sheet.refereeNotes,
        },
      }));
    },
    [updateMatchAndSheet]
  );

  // Item 18 da Auditoria: limpa timeouts/suspensões ao encerrar e zera `isWinner` ao reabrir
  const finalizeMatch = useCallback(
    (matchId: string) => {
      updateMatchAndSheet(matchId, (match, sheet) => {
        const homeScore = match.homeTeam.score ?? 0;
        const awayScore = match.awayTeam.score ?? 0;
        const isSwimming = sheet.scoringModel === 'swimming_heats';

        return {
          match: {
            ...match,
            status: 'finished',
            homeTeam: {
              ...match.homeTeam,
              isWinner: isSwimming ? false : homeScore > awayScore,
            },
            awayTeam: {
              ...match.awayTeam,
              isWinner: isSwimming ? false : awayScore > homeScore,
            },
          },
          sheet: {
            ...sheet,
            isClosed: true,
            closedAtIso: new Date().toISOString(),
            activeTimeout: null,
            activeSuspensions: sheet.activeSuspensions.map((s) => ({
              ...s,
              remainingSeconds: 0,
              isReleased: true,
            })),
            timer: {
              ...sheet.timer,
              isRunning: false,
              lifecycle: 'match_ended',
              lastTickTimestamp: null,
            },
          },
        };
      });
    },
    [updateMatchAndSheet]
  );

  const reopenMatchForCorrection = useCallback(
    (matchId: string) => {
      updateMatchAndSheet(matchId, (match, sheet) => ({
        match: {
          ...match,
          status: 'live',
          homeTeam: {
            ...match.homeTeam,
            isWinner: false,
          },
          awayTeam: {
            ...match.awayTeam,
            isWinner: false,
          },
        },
        sheet: {
          ...sheet,
          isClosed: false,
          closedAtIso: null,
          timer: {
            ...sheet.timer,
            lifecycle: 'paused',
            lastTickTimestamp: null,
          },
        },
      }));
    },
    [updateMatchAndSheet]
  );

  // FAVORITOS & NOTIFICAÇÕES
  const toggleFavoriteModality = useCallback((modalityId: ModalitySlug) => {
    setState((prev) => {
      const exists = prev.favoriteModalityIds.includes(modalityId);
      const next = exists
        ? prev.favoriteModalityIds.filter((id) => id !== modalityId)
        : [...prev.favoriteModalityIds, modalityId];
      return {
        ...prev,
        favoriteModalityIds: next,
      };
    });
  }, []);

  const toggleFavoriteTeam = useCallback((teamId: string) => {
    setState((prev) => {
      const exists = prev.favoriteTeamIds.includes(teamId);
      const next = exists
        ? prev.favoriteTeamIds.filter((id) => id !== teamId)
        : [...prev.favoriteTeamIds, teamId];
      return {
        ...prev,
        favoriteTeamIds: next,
      };
    });
  }, []);

  const toggleFavoriteAthlete = useCallback((athleteId: string) => {
    setState((prev) => {
      const exists = prev.favoriteAthleteIds.includes(athleteId);
      const next = exists
        ? prev.favoriteAthleteIds.filter((id) => id !== athleteId)
        : [...prev.favoriteAthleteIds, athleteId];
      return {
        ...prev,
        favoriteAthleteIds: next,
      };
    });
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
    }));
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    }));
  }, []);

  const clearNotifications = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: [],
    }));
  }, []);

  // CONSULTAS DE EQUIPES, ATLETAS E ESTATÍSTICAS DERIVADAS
  const getTeamById = useCallback(
    (teamId: string): Team | undefined => {
      return (
        state.officialTeams.find((t) => t.id === teamId) ||
        state.testTeams.find((t) => t.id === teamId)
      );
    },
    [state.officialTeams, state.testTeams]
  );

  const getAthleteById = useCallback(
    (athleteId: string): Athlete | undefined => {
      return (
        state.officialAthletes.find((a) => a.id === athleteId) ||
        state.testAthletes.find((a) => a.id === athleteId)
      );
    },
    [state.officialAthletes, state.testAthletes]
  );

  const getAthletesByTeam = useCallback(
    (teamId: string, modalityId?: ModalitySlug): Athlete[] => {
      return visibleAthletes.filter((a) => {
        if (a.teamId !== teamId) return false;
        if (modalityId && !a.modalityIds.includes(modalityId)) return false;
        return true;
      });
    },
    [visibleAthletes]
  );

  const getAthleteStats = useCallback(
    (
      athleteId: string,
      modalityId: ModalitySlug
    ): DerivedAthleteModalityStats | null => {
      const athlete = getAthleteById(athleteId);
      if (!athlete) return null;
      return computeAthleteModalityStats(
        athlete,
        modalityId,
        visibleMatches,
        activeSheetsMap
      );
    },
    [getAthleteById, visibleMatches, activeSheetsMap]
  );

  const getTeamStats = useCallback(
    (teamId: string, modalityId?: ModalitySlug): DerivedTeamStats | null => {
      const team = getTeamById(teamId);
      if (!team) return null;
      return computeTeamStats(
        team,
        visibleMatches,
        activeSheetsMap,
        modalityId
      );
    },
    [getTeamById, visibleMatches, activeSheetsMap]
  );

  const getModalityStandings = useCallback(
    (modalityId: ModalitySlug | 'all'): StandingEntry[] => {
      return computeModalityStandings(modalityId, visibleTeams, visibleMatches);
    },
    [visibleTeams, visibleMatches]
  );

  const getModalityLeaderboard = useCallback(
    (modalityId: ModalitySlug) => {
      return computeModalityLeaderboard(
        modalityId,
        visibleAthletes,
        visibleTeams,
        visibleMatches,
        activeSheetsMap
      );
    },
    [visibleAthletes, visibleTeams, visibleMatches, activeSheetsMap]
  );

  // PERMISSÕES E AUTENTICAÇÃO
  const setCurrentUser = useCallback((user: UserProfile | null) => {
    if (typeof window !== 'undefined') {
      if (
        user &&
        (user.role === 'administrador' ||
          user.role === 'organizacao' ||
          user.role === 'moderador')
      ) {
        sessionStorage.setItem('intramed_admin_session', 'true');
      } else {
        sessionStorage.removeItem('intramed_admin_session');
        setStoredOperatorToken(null);
      }
    }

    setState((prev) => ({
      ...prev,
      currentUser: user,
      isTestMode:
        user &&
        (user.role === 'administrador' ||
          user.role === 'organizacao' ||
          user.role === 'moderador')
          ? prev.isTestMode
          : false,
    }));
  }, []);

  const canOperateOfficialData = useCallback((): boolean => {
    if (!state.currentUser) return false;
    return (
      state.currentUser.role === 'administrador' ||
      state.currentUser.role === 'organizacao' ||
      state.currentUser.role === 'moderador'
    );
  }, [state.currentUser]);

  const canOperateMatch = useCallback(
    (matchId?: string): boolean => {
      if (canOperateOfficialData()) return true;
      if (!matchId) return false;
      return unlockedMatchIds.includes(matchId);
    },
    [canOperateOfficialData, unlockedMatchIds]
  );

  const unlockMatchAsTableOfficial = useCallback(
    (
      matchId: string,
      passwordInput: string,
      officialName?: string
    ): { ok: boolean; error?: string } => {
      const cleanPass = passwordInput.trim();
      if (!cleanPass) {
        return {
          ok: false,
          error: 'Digite a senha da partida ou a senha da organização.',
        };
      }

      const match =
        state.officialMatches.find((m) => m.id === matchId) ||
        state.testMatches.find((m) => m.id === matchId);

      // Solicita token assinado no servidor em background para autorizar escritas em /api/cloud-sync
      if (typeof window !== 'undefined') {
        fetch('/api/cloud-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'verify_operator_pin',
            matchId,
            password: cleanPass,
            officialName: officialName?.trim() || undefined,
            expectedClientPin: match?.tableOfficialPassword || undefined,
          }),
        })
          .then((r) => r.json())
          .then((resData) => {
            if (resData?.ok && resData?.token) {
              setStoredOperatorToken(resData.token);
            }
          })
          .catch(() => {});
      }

      // 1. Senha mestra da Comissão desbloqueia o modo Admin completo
      if (cleanPass.toLowerCase() === 'bicoduro') {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('intramed_admin_session', 'true');
        }
        setCurrentUser({
          id: 'usr-admin-intramed',
          name: officialName?.trim()
            ? `Comissão (${officialName.trim()})`
            : 'Comissão Organizadora • A.A.A. Cangaceira',
          email: 'organizacao@intramed.uema.br',
          avatarUrl: '/assets/atletica/logo.png',
          teamId: null,
          teamName: 'Arbitragem & Organização INTRAMED IX',
          modalityIds: [],
          role: 'administrador',
          linkedAthleteId: null,
        });
        return { ok: true };
      }

      // 2. Verifica a senha exclusiva do mesário cadastrada para esta partida
      if (!match) {
        return { ok: false, error: 'Partida não localizada.' };
      }

      const expectedPin = (match.tableOfficialPassword || '').trim();
      if (!expectedPin) {
        return {
          ok: false,
          error:
            'A senha de mesário desta partida ainda não foi definida pela comissão. Use a senha geral da organização.',
        };
      }

      if (cleanPass.toLowerCase() !== expectedPin.toLowerCase()) {
        return {
          ok: false,
          error:
            'Senha da partida incorreta. Confira o código com a comissão organizadora.',
        };
      }

      setUnlockedMatchIds((prev) => {
        const next = prev.includes(matchId) ? prev : [...prev, matchId];
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(
            'intramed_unlocked_match_ids',
            JSON.stringify(next)
          );
        }
        return next;
      });

      if (officialName && officialName.trim()) {
        const cleanOfficial = officialName.trim();
        setState((prev) => {
          const isTest = matchId.startsWith('test-');
          const sheetsMap = isTest
            ? { ...prev.testSheets }
            : { ...prev.officialSheets };
          const currentSheet = sheetsMap[matchId];
          if (!currentSheet) return prev;
          const updatedSheet: MatchSheet = {
            ...currentSheet,
            tableOfficialName: cleanOfficial,
            lastUpdatedIso: new Date().toISOString(),
            revision: (currentSheet.revision ?? 0) + 1,
          };
          sheetsMap[matchId] = updatedSheet;
          if (!isTest) {
            enqueueCloudSync('match_sheets', matchId, updatedSheet);
          }
          return {
            ...prev,
            ...(isTest ? { testSheets: sheetsMap } : { officialSheets: sheetsMap }),
          };
        });
      }

      return { ok: true };
    },
    [state.officialMatches, state.testMatches, setCurrentUser, enqueueCloudSync]
  );

  const updateMatchTablePassword = useCallback(
    (matchId: string, newPassword: string): boolean => {
      if (!canOperateOfficialData()) return false;
      const cleanPin = newPassword.trim().toUpperCase();

      if (typeof window !== 'undefined' && cleanPin) {
        const opToken = getStoredOperatorToken();
        fetch('/api/cloud-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(opToken ? { Authorization: `Bearer ${opToken}` } : {}),
          },
          body: JSON.stringify({
            action: 'set_match_pin',
            matchId,
            newPin: cleanPin,
          }),
        }).catch(() => {});
      }

      setState((prev) => {
        const isTest = matchId.startsWith('test-');
        const list = isTest ? [...prev.testMatches] : [...prev.officialMatches];
        const idx = list.findIndex((m) => m.id === matchId);
        if (idx === -1) return prev;
        const updatedMatch: Match = {
          ...list[idx],
          tableOfficialPassword: cleanPin || null,
          hasTableOfficialPassword: Boolean(cleanPin),
          revision: (list[idx].revision ?? 0) + 1,
        };
        list[idx] = updatedMatch;
        if (!isTest) {
          enqueueCloudSync('matches', matchId, updatedMatch);
        }
        return {
          ...prev,
          ...(isTest ? { testMatches: list } : { officialMatches: list }),
        };
      });
      return true;
    },
    [canOperateOfficialData, enqueueCloudSync]
  );

  const canEditAthleteProfile = useCallback(
    (athleteId: string): boolean => {
      if (!state.currentUser) return false;
      if (
        state.currentUser.role === 'administrador' ||
        state.currentUser.role === 'organizacao'
      ) {
        return true;
      }
      return (
        state.currentUser.role === 'atleta' &&
        state.currentUser.linkedAthleteId === athleteId
      );
    },
    [state.currentUser]
  );

  const updateAthleteAvatar = useCallback(
    (athleteId: string, avatarDataUrl: string): boolean => {
      if (!canEditAthleteProfile(athleteId)) return false;
      setState((prev) => {
        const updateList = (list: Athlete[]) =>
          list.map((a) => {
            if (a.id === athleteId) {
              const updated = { ...a, avatarUrl: avatarDataUrl };
              if (!updated.isTestOnly) {
                enqueueCloudSync('athletes', athleteId, updated);
              }
              return updated;
            }
            return a;
          });
        const nextUser =
          prev.currentUser && prev.currentUser.linkedAthleteId === athleteId
            ? { ...prev.currentUser, avatarUrl: avatarDataUrl }
            : prev.currentUser;
        return {
          ...prev,
          officialAthletes: updateList(prev.officialAthletes),
          testAthletes: updateList(prev.testAthletes),
          currentUser: nextUser,
        };
      });
      return true;
    },
    [canEditAthleteProfile, enqueueCloudSync]
  );

  const updateTeamCrest = useCallback(
    (teamId: string, crestDataUrl: string) => {
      setState((prev) => {
        if (!isUserAdmin(prev.currentUser)) return prev;
        const updateTeams = (list: Team[]) =>
          list.map((t) => {
            if (t.id === teamId) {
              const updated = { ...t, crestUrl: crestDataUrl };
              if (!updated.isTestOnly) {
                enqueueCloudSync('teams', teamId, updated);
              }
              return updated;
            }
            return t;
          });
        const updateMatches = (list: Match[]) =>
          list.map((m) => ({
            ...m,
            homeTeam:
              m.homeTeam.teamId === teamId
                ? { ...m.homeTeam, crestUrl: crestDataUrl }
                : m.homeTeam,
            awayTeam:
              m.awayTeam.teamId === teamId
                ? { ...m.awayTeam, crestUrl: crestDataUrl }
                : m.awayTeam,
          }));
        return {
          ...prev,
          officialTeams: updateTeams(prev.officialTeams),
          testTeams: updateTeams(prev.testTeams),
          officialMatches: updateMatches(prev.officialMatches),
          testMatches: updateMatches(prev.testMatches),
        };
      });
    },
    [enqueueCloudSync]
  );

  const updateAthletePersonalInfo = useCallback(
    (
      athleteId: string,
      data: {
        name?: string;
        position?: string;
        jerseyNumber?: number | null;
        bio?: string | null;
        instagramHandle?: string | null;
        modalityIds?: ModalitySlug[];
        avatarUrl?: string | null;
      }
    ): boolean => {
      if (!canEditAthleteProfile(athleteId)) return false;
      setState((prev) => {
        let updatedAthleteObj: Athlete | null = null;
        const updateList = (list: Athlete[]) =>
          list.map((a) => {
            if (a.id === athleteId) {
              const updated: Athlete = {
                ...a,
                name:
                  data.name !== undefined && data.name.trim()
                    ? data.name.trim()
                    : a.name,
                position: data.position !== undefined ? data.position : a.position,
                jerseyNumber:
                  data.jerseyNumber !== undefined
                    ? data.jerseyNumber
                    : a.jerseyNumber,
                bio: data.bio !== undefined ? data.bio : a.bio,
                instagramHandle:
                  data.instagramHandle !== undefined
                    ? data.instagramHandle
                    : a.instagramHandle,
                modalityIds:
                  data.modalityIds !== undefined && data.modalityIds.length > 0
                    ? data.modalityIds
                    : a.modalityIds,
                avatarUrl:
                  data.avatarUrl !== undefined ? data.avatarUrl : a.avatarUrl,
              };
              updatedAthleteObj = updated;
              if (!updated.isTestOnly) {
                enqueueCloudSync('athletes', athleteId, updated);
              }
              return updated;
            }
            return a;
          });

        const nextOfficial = updateList(prev.officialAthletes);
        const nextTest = updateList(prev.testAthletes);

        let nextUser = prev.currentUser;
        if (
          nextUser &&
          nextUser.linkedAthleteId === athleteId &&
          updatedAthleteObj
        ) {
          const ua = updatedAthleteObj as Athlete;
          nextUser = {
            ...nextUser,
            name: ua.name,
            avatarUrl: ua.avatarUrl,
            modalityIds: ua.modalityIds,
          };
        }

        return {
          ...prev,
          officialAthletes: nextOfficial,
          testAthletes: nextTest,
          currentUser: nextUser,
        };
      });
      return true;
    },
    [canEditAthleteProfile, enqueueCloudSync]
  );

  // Item 24 da Auditoria: `upsertParticipantAthlete` só envia escrita à nuvem se os campos do atleta realmente mudaram (elimina loop cascata de escritas)
  const upsertParticipantAthlete = useCallback(
    (payload: {
      id?: string;
      name: string;
      email?: string | null;
      teamId: string;
      turma?: TurmaMedicina | null;
      turmaLabel?: string | null;
      jerseyNumber?: number | null;
      position?: string | null;
      bio?: string | null;
      instagramHandle?: string | null;
      avatarUrl?: string | null;
      modalityIds?: ModalitySlug[];
      registrationId?: string | null;
      paymentStatus?: RegistrationPaymentStatus;
      memberStatus?: MemberStatus;
      autoLogin?: boolean;
      skipCloudSync?: boolean;
    }): Athlete => {
      const cleanName = payload.name.trim();
      const cleanEmail = payload.email?.trim().toLowerCase() || null;
      const defaultModalities: ModalitySlug[] =
        payload.modalityIds && payload.modalityIds.length > 0
          ? payload.modalityIds
          : OFFICIAL_MODALITIES.map((m) => m.id);

      const existing = state.officialAthletes.find(
        (a) =>
          (payload.id && a.id === payload.id) ||
          (payload.registrationId && a.registrationId === payload.registrationId) ||
          (cleanEmail && a.email?.toLowerCase() === cleanEmail) ||
          (a.teamId === payload.teamId &&
            a.name.trim().toLowerCase() === cleanName.toLowerCase())
      );

      const resolvedId =
        existing?.id ||
        payload.id ||
        (payload.registrationId
          ? `ath-${payload.registrationId}`
          : generateUniqueId('ath'));

      const athleteRecord: Athlete = {
        id: resolvedId,
        name: cleanName || existing?.name || 'Atleta IntraMed',
        email: cleanEmail || existing?.email || null,
        teamId: payload.teamId || existing?.teamId || 'sanguinaria',
        turma: payload.turma ?? existing?.turma ?? null,
        turmaLabel: payload.turmaLabel ?? existing?.turmaLabel ?? null,
        jerseyNumber: payload.jerseyNumber ?? existing?.jerseyNumber ?? null,
        position: payload.position?.trim() || existing?.position || 'Atleta Oficial',
        bio: payload.bio ?? existing?.bio ?? null,
        instagramHandle:
          payload.instagramHandle ?? existing?.instagramHandle ?? null,
        avatarUrl: payload.avatarUrl ?? existing?.avatarUrl ?? null,
        modalityIds: defaultModalities,
        registrationId: payload.registrationId ?? existing?.registrationId ?? null,
        paymentStatus: payload.paymentStatus ?? existing?.paymentStatus,
        memberStatus: payload.memberStatus ?? existing?.memberStatus,
        isTestOnly: false,
      };

      const hasChanged =
        !existing ||
        existing.name !== athleteRecord.name ||
        existing.teamId !== athleteRecord.teamId ||
        existing.jerseyNumber !== athleteRecord.jerseyNumber ||
        existing.position !== athleteRecord.position ||
        existing.avatarUrl !== athleteRecord.avatarUrl ||
        existing.paymentStatus !== athleteRecord.paymentStatus ||
        existing.memberStatus !== athleteRecord.memberStatus;

      if (hasChanged && !payload.skipCloudSync) {
        enqueueCloudSync('athletes', athleteRecord.id, athleteRecord);
      }

      if (hasChanged || payload.autoLogin) {
        setState((prev) => {
          const existsIdx = prev.officialAthletes.findIndex(
            (a) => a.id === athleteRecord.id
          );
          const nextOfficialAthletes =
            existsIdx >= 0
              ? prev.officialAthletes.map((a, i) =>
                  i === existsIdx ? { ...a, ...athleteRecord } : a
                )
              : [athleteRecord, ...prev.officialAthletes];

          const teamObj = prev.officialTeams.find(
            (t) => t.id === athleteRecord.teamId
          );

          let nextUser = prev.currentUser;
          if (payload.autoLogin) {
            nextUser = {
              id: `usr-${athleteRecord.id}`,
              name: athleteRecord.name,
              email:
                athleteRecord.email ||
                `${athleteRecord.id}@medicina.uema.br`,
              avatarUrl: athleteRecord.avatarUrl,
              role: 'atleta',
              teamId: athleteRecord.teamId,
              teamName:
                teamObj?.name ||
                athleteRecord.turmaLabel ||
                'Equipe Medicina UEMA',
              linkedAthleteId: athleteRecord.id,
              modalityIds: athleteRecord.modalityIds,
            };
          }

          return {
            ...prev,
            officialAthletes: nextOfficialAthletes,
            currentUser: nextUser,
          };
        });
      }

      return athleteRecord;
    },
    [state.officialAthletes, enqueueCloudSync]
  );

  const registerTeam = useCallback(
    (payload: {
      name: string;
      shortName?: string;
      crestUrl?: string | null;
      modalityIds: ModalitySlug[];
    }): Team => {
      const id = generateUniqueId('team');
      const newTeam: Team = {
        id,
        name: payload.name.trim(),
        shortName:
          payload.shortName?.trim() ||
          payload.name.trim().slice(0, 3).toUpperCase(),
        crestUrl: payload.crestUrl || null,
        modalityIds:
          payload.modalityIds.length > 0
            ? payload.modalityIds
            : OFFICIAL_MODALITIES.map((m) => m.id),
      };

      setState((prev) => {
        if (!isUserAdmin(prev.currentUser)) return prev;
        if (prev.isTestMode) {
          return {
            ...prev,
            testTeams: [...prev.testTeams, newTeam],
          };
        }
        enqueueCloudSync('teams', newTeam.id, newTeam);
        return {
          ...prev,
          officialTeams: [...prev.officialTeams, newTeam],
        };
      });

      return newTeam;
    },
    [enqueueCloudSync]
  );

  const registerAthlete = useCallback(
    (payload: {
      name: string;
      teamId: string;
      jerseyNumber?: number | null;
      position?: string | null;
      avatarUrl?: string | null;
      modalityIds: ModalitySlug[];
    }): { ok: boolean; error?: string; athlete?: Athlete } => {
      if (!isUserAdmin(state.currentUser)) {
        return {
          ok: false,
          error:
            'Apenas Administradores ou Mesários autenticados podem cadastrar atletas.',
        };
      }
      const cleanName = payload.name.trim();
      if (!cleanName || !payload.teamId) {
        return {
          ok: false,
          error: 'Informe o nome do atleta e o período/equipe.',
        };
      }

      const pool = state.isTestMode ? state.testAthletes : state.officialAthletes;
      const duplicate = pool.find(
        (a) =>
          a.teamId === payload.teamId &&
          a.name.trim().toLowerCase() === cleanName.toLowerCase()
      );
      if (duplicate) {
        return {
          ok: false,
          error:
            'Este atleta já está inscrito neste período. Edite as modalidades dele sem duplicar o perfil.',
        };
      }

      const newAthlete: Athlete = {
        id: `${state.isTestMode ? 'test-' : ''}${generateUniqueId('ath')}`,
        name: cleanName,
        teamId: payload.teamId,
        jerseyNumber: payload.jerseyNumber ?? null,
        position: payload.position?.trim() || 'Atleta',
        avatarUrl: payload.avatarUrl || null,
        modalityIds:
          payload.modalityIds.length > 0 ? payload.modalityIds : ['futsal'],
        isTestOnly: state.isTestMode,
      };

      setState((prev) => {
        const targetMatches = prev.isTestMode
          ? prev.testMatches
          : prev.officialMatches;
        const targetSheets = {
          ...(prev.isTestMode ? prev.testSheets : prev.officialSheets),
        };

        for (const m of targetMatches) {
          if (!newAthlete.modalityIds.includes(m.modalityId)) continue;
          const s = targetSheets[m.id];
          if (!s || s.isClosed) continue;

          if (m.homeTeam.teamId === newAthlete.teamId) {
            const existsInHome = s.homeLineup.some(
              (l) => l.athleteId === newAthlete.id
            );
            if (!existsInHome) {
              targetSheets[m.id] = {
                ...s,
                homeLineup: [
                  ...s.homeLineup,
                  {
                    athleteId: newAthlete.id,
                    athleteName: newAthlete.name,
                    jerseyNumber: newAthlete.jerseyNumber,
                    isStarter: s.homeLineup.length < 5,
                  },
                ],
              };
            }
          } else if (m.awayTeam.teamId === newAthlete.teamId) {
            const existsInAway = s.awayLineup.some(
              (l) => l.athleteId === newAthlete.id
            );
            if (!existsInAway) {
              targetSheets[m.id] = {
                ...s,
                awayLineup: [
                  ...s.awayLineup,
                  {
                    athleteId: newAthlete.id,
                    athleteName: newAthlete.name,
                    jerseyNumber: newAthlete.jerseyNumber,
                    isStarter: s.awayLineup.length < 5,
                  },
                ],
              };
            }
          }
        }

        if (prev.isTestMode) {
          return {
            ...prev,
            testAthletes: [...prev.testAthletes, newAthlete],
            testSheets: targetSheets,
          };
        }
        enqueueCloudSync('athletes', newAthlete.id, newAthlete);
        return {
          ...prev,
          officialAthletes: [...prev.officialAthletes, newAthlete],
          officialSheets: targetSheets,
        };
      });

      return { ok: true, athlete: newAthlete };
    },
    [
      state.isTestMode,
      state.testAthletes,
      state.officialAthletes,
      state.currentUser,
      enqueueCloudSync,
    ]
  );

  const createOfficialMatch = useCallback(
    (payload: {
      modalityId: ModalitySlug;
      categoryName: string;
      phase: TournamentPhaseType;
      phaseLabel: string;
      homeTeamId: string;
      awayTeamId: string;
      scheduledDate?: string;
      scheduledTime?: string;
      venue?: string;
      tableOfficialPassword?: string;
    }): Match | null => {
      if (!isUserAdmin(state.currentUser)) return null;
      const teamsPool = state.isTestMode ? state.testTeams : state.officialTeams;
      const athletesPool = state.isTestMode
        ? state.testAthletes
        : state.officialAthletes;

      const homeTeam = teamsPool.find((t) => t.id === payload.homeTeamId);
      const awayTeam = teamsPool.find((t) => t.id === payload.awayTeamId);
      const modality = OFFICIAL_MODALITIES.find(
        (m) => m.id === payload.modalityId
      );
      if (!homeTeam || !awayTeam || !modality) return null;

      const prefix = state.isTestMode ? 'test-' : '';
      const matchId = `${prefix}${generateUniqueId('match')}`;
      const sheetId = `${prefix}${generateUniqueId('sheet')}`;
      const engine = MODALITY_RULE_ENGINE[payload.modalityId];
      const catRule =
        engine.defaultCategoryRules[payload.categoryName] ||
        Object.values(engine.defaultCategoryRules)[0];

      const homePlayers = athletesPool.filter(
        (a) =>
          a.teamId === homeTeam.id && a.modalityIds.includes(payload.modalityId)
      );
      const awayPlayers = athletesPool.filter(
        (a) =>
          a.teamId === awayTeam.id && a.modalityIds.includes(payload.modalityId)
      );

      // Item 8 da Auditoria: código aleatório de 8 caracteres para o mesário
      const generatedPin =
        payload.tableOfficialPassword?.trim().toUpperCase() ||
        generateRandomMatchPin(payload.modalityId);

      const newMatch: Match = {
        id: matchId,
        modalityId: payload.modalityId,
        modalityName: modality.name,
        categoryName: payload.categoryName,
        phase: payload.phase,
        phaseLabel: payload.phaseLabel,
        status: 'scheduled',
        scheduledDate: payload.scheduledDate || 'Hoje',
        scheduledTime: payload.scheduledTime || '19:00',
        venue: payload.venue || 'Ginásio Oficial',
        homeTeam: {
          teamId: homeTeam.id,
          teamName: homeTeam.name,
          crestUrl: homeTeam.crestUrl || null,
          score: 0,
          setsWon: 0,
          isWinner: false,
        },
        awayTeam: {
          teamId: awayTeam.id,
          teamName: awayTeam.name,
          crestUrl: awayTeam.crestUrl || null,
          score: 0,
          setsWon: 0,
          isWinner: false,
        },
        matchSheetId: sheetId,
        tableOfficialPassword: generatedPin,
        hasTableOfficialPassword: true,
        isTestData: state.isTestMode,
        revision: 1,
      };

      const periodScores = Array.from({ length: catRule.periodsCount }).map(
        (_, idx) => ({
          periodNumber: idx + 1,
          label:
            engine.scoringModel === 'sets_points' ||
            engine.scoringModel === 'team_submatches'
              ? `Set ${idx + 1}`
              : engine.scoringModel === 'points_quarters'
              ? `P${idx + 1}`
              : `${idx + 1}º Período`,
          homeScore: 0,
          awayScore: 0,
          isFinished: false,
        })
      );

      const newSheet: MatchSheet = {
        id: sheetId,
        matchId,
        modalityId: payload.modalityId,
        scoringModel: engine.scoringModel,
        isTestMode: state.isTestMode,
        homeLineup: homePlayers.map((p, idx) => ({
          athleteId: p.id,
          athleteName: p.name,
          jerseyNumber: p.jerseyNumber,
          isStarter: idx < 5,
          isCaptain: idx === 0,
        })),
        awayLineup: awayPlayers.map((p, idx) => ({
          athleteId: p.id,
          athleteName: p.name,
          jerseyNumber: p.jerseyNumber,
          isStarter: idx < 5,
          isCaptain: idx === 0,
        })),
        timer: {
          currentPeriod: 1,
          totalPeriods: catRule.periodsCount,
          periodLabel:
            engine.scoringModel === 'sets_points'
              ? 'Set 1'
              : engine.scoringModel === 'points_quarters'
              ? '1º Quarto (P1)'
              : '1º Período',
          remainingSeconds: catRule.periodDurationSeconds,
          initialPeriodSeconds: catRule.periodDurationSeconds,
          elapsedSeconds: 0,
          isRunning: false,
          lifecycle: 'not_started',
          lastTickTimestamp: null,
        },
        periodScores,
        events: [],
        activeSuspensions: [],
        activeTimeout: null,
        homeTimeoutsUsed: 0,
        awayTimeoutsUsed: 0,
        homeFoulsCurrentPeriod: 0,
        awayFoulsCurrentPeriod: 0,
        refereeNotes: '',
        isClosed: false,
        closedAtIso: null,
        syncStatus: 'synced',
        lastUpdatedIso: new Date().toISOString(),
        revision: 1,
      };

      setState((prev) => {
        if (prev.isTestMode) {
          return {
            ...prev,
            testMatches: [newMatch, ...prev.testMatches],
            testSheets: { ...prev.testSheets, [matchId]: newSheet },
          };
        }
        enqueueCloudSync('matches', newMatch.id, newMatch);
        enqueueCloudSync('match_sheets', newSheet.matchId, newSheet);
        return {
          ...prev,
          officialMatches: [newMatch, ...prev.officialMatches],
          officialSheets: { ...prev.officialSheets, [matchId]: newSheet },
        };
      });

      return newMatch;
    },
    [
      state.isTestMode,
      state.testTeams,
      state.officialTeams,
      state.testAthletes,
      state.officialAthletes,
      state.currentUser,
      enqueueCloudSync,
    ]
  );

  // Item 22 da Auditoria: Context value memoizado com `useMemo` para evitar re-renders desnecessários
  const contextValue = useMemo<CompetitionStoreContextValue>(
    () => ({
      isTestMode: state.isTestMode,
      setTestMode,
      resetTestEnvironment,
      isOnline,
      pendingSyncCount: state.pendingSyncCount,
      visibleMatches,
      getMatchById,
      getSheetByMatchId,
      favoriteModalityIds: state.favoriteModalityIds,
      favoriteTeamIds: state.favoriteTeamIds,
      favoriteAthleteIds: state.favoriteAthleteIds,
      toggleFavoriteModality,
      toggleFavoriteTeam,
      toggleFavoriteAthlete,
      notifications: state.notifications,
      markAllNotificationsAsRead,
      markNotificationAsRead,
      clearNotifications,
      startOrResumeTimer,
      pauseTimer,
      resetPeriodTimer,
      endCurrentPeriod,
      startNextPeriod,
      startOvertimePeriod,
      configureMatchCategoryRule,
      recordMatchEvent,
      editMatchEvent,
      deleteMatchEvent,
      dismissReleasedSuspension,
      cancelActiveTimeout,
      toggleLineupRole,
      finishCurrentSet,
      recordTableTennisPoint,
      finishTableTennisSet,
      selectActiveSubMatch,
      setSwimmingStrokeAndDistance,
      registerSwimmingLaneTime,
      updateRefereeMetadata,
      finalizeMatch,
      reopenMatchForCorrection,
      visibleTeams,
      visibleAthletes,
      getTeamById,
      getAthleteById,
      getAthletesByTeam,
      getAthleteStats,
      getTeamStats,
      getModalityStandings,
      getModalityLeaderboard,
      currentUser: state.currentUser,
      setCurrentUser,
      canEditAthleteProfile,
      canOperateOfficialData,
      canOperateMatch,
      unlockMatchAsTableOfficial,
      updateMatchTablePassword,
      updateAthleteAvatar,
      updateTeamCrest,
      updateAthletePersonalInfo,
      upsertParticipantAthlete,
      registerTeam,
      registerAthlete,
      createOfficialMatch,
    }),
    [
      state.isTestMode,
      setTestMode,
      resetTestEnvironment,
      isOnline,
      state.pendingSyncCount,
      visibleMatches,
      getMatchById,
      getSheetByMatchId,
      state.favoriteModalityIds,
      state.favoriteTeamIds,
      state.favoriteAthleteIds,
      toggleFavoriteModality,
      toggleFavoriteTeam,
      toggleFavoriteAthlete,
      state.notifications,
      markAllNotificationsAsRead,
      markNotificationAsRead,
      clearNotifications,
      startOrResumeTimer,
      pauseTimer,
      resetPeriodTimer,
      endCurrentPeriod,
      startNextPeriod,
      startOvertimePeriod,
      configureMatchCategoryRule,
      recordMatchEvent,
      editMatchEvent,
      deleteMatchEvent,
      dismissReleasedSuspension,
      cancelActiveTimeout,
      toggleLineupRole,
      finishCurrentSet,
      recordTableTennisPoint,
      finishTableTennisSet,
      selectActiveSubMatch,
      setSwimmingStrokeAndDistance,
      registerSwimmingLaneTime,
      updateRefereeMetadata,
      finalizeMatch,
      reopenMatchForCorrection,
      visibleTeams,
      visibleAthletes,
      getTeamById,
      getAthleteById,
      getAthletesByTeam,
      getAthleteStats,
      getTeamStats,
      getModalityStandings,
      getModalityLeaderboard,
      state.currentUser,
      setCurrentUser,
      canEditAthleteProfile,
      canOperateOfficialData,
      canOperateMatch,
      unlockMatchAsTableOfficial,
      updateMatchTablePassword,
      updateAthleteAvatar,
      updateTeamCrest,
      updateAthletePersonalInfo,
      upsertParticipantAthlete,
      registerTeam,
      registerAthlete,
      createOfficialMatch,
    ]
  );

  return (
    <CompetitionStoreContext.Provider value={contextValue}>
      {children}
    </CompetitionStoreContext.Provider>
  );
};

export function useCompetitionStore(): CompetitionStoreContextValue {
  const ctx = useContext(CompetitionStoreContext);
  if (!ctx) {
    throw new Error(
      'useCompetitionStore deve ser utilizado dentro de CompetitionStoreProvider'
    );
  }
  return ctx;
}
