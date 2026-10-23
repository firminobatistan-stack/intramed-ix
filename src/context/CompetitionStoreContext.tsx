import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
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
} from '../types/domain';
import {
  OFFICIAL_MODALITIES,
  INITIAL_MATCHES,
  INITIAL_TEAMS,
  INITIAL_ATHLETES,
  INITIAL_USER_PROFILE,
} from '../data/officialData';
import {
  MODALITY_RULE_ENGINE,
  formatSecondsToClock,
  formatMsToSwimmingTime,
} from '../data/sportRulesConfig';
import {
  computeAthleteModalityStats,
  computeModalityLeaderboard,
  computeModalityStandings,
  computeTeamStats,
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
  // Favoritos & Personalização (Seção 13 do Master Prompt)
  favoriteModalityIds: ModalitySlug[];
  favoriteTeamIds: string[];
  favoriteAthleteIds: string[];
  toggleFavoriteModality: (modalityId: ModalitySlug) => void;
  toggleFavoriteTeam: (teamId: string) => void;
  toggleFavoriteAthlete: (athleteId: string) => void;
  // Notificações & Central de Alertas (Seção 14 do Master Prompt)
  notifications: AppNotificationItem[];
  markAllNotificationsAsRead: () => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
  // Controles de Cronômetro e Período
  startOrResumeTimer: (matchId: string) => void;
  pauseTimer: (matchId: string) => void;
  resetPeriodTimer: (matchId: string) => void;
  endCurrentPeriod: (matchId: string) => void;
  startNextPeriod: (matchId: string) => void;
  startOvertimePeriod: (matchId: string) => void;
  // Configuração de Categoria / Tempo (ex: Masculino 2x20 vs Feminino 2x15)
  configureMatchCategoryRule: (matchId: string, categoryName: string) => void;
  // Registro, Edição e Exclusão de Eventos com Auditoria
  recordMatchEvent: (matchId: string, payload: NewEventPayload) => void;
  editMatchEvent: (matchId: string, payload: EditEventPayload) => void;
  deleteMatchEvent: (matchId: string, eventId: string, reason?: string) => void;
  // Controles de Timeout e Punições 2 min
  dismissReleasedSuspension: (matchId: string, suspensionId: string) => void;
  cancelActiveTimeout: (matchId: string) => void;
  // Escalação
  toggleLineupRole: (
    matchId: string,
    teamSide: 'home' | 'away',
    athleteId: string,
    field: 'isStarter' | 'isCaptain' | 'isGoalkeeper' | 'isPairMember'
  ) => void;
  // Específicos de Vôlei / Sets
  finishCurrentSet: (matchId: string) => void;
  // Específicos de Tênis de Mesa (Sub-partidas por equipe)
  recordTableTennisPoint: (
    matchId: string,
    subMatchId: string,
    side: 'home' | 'away'
  ) => void;
  finishTableTennisSet: (matchId: string, subMatchId: string) => void;
  selectActiveSubMatch: (matchId: string, index: number) => void;
  // Específicos de Natação (Provas e Raias)
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
  // Observações e Finalização da Súmula
  updateRefereeMetadata: (
    matchId: string,
    data: { refereeName?: string; tableOfficialName?: string; refereeNotes?: string }
  ) => void;
  finalizeMatch: (matchId: string) => void;
  reopenMatchForCorrection: (matchId: string) => void;
  // Equipes, Atletas, Autenticação e Estatísticas Derivadas (Sem Duplicação)
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
  updateAthleteAvatar: (athleteId: string, avatarDataUrl: string) => boolean;
  updateTeamCrest: (teamId: string, crestDataUrl: string) => void;
  updateAthletePersonalInfo: (
    athleteId: string,
    data: { position?: string; jerseyNumber?: number | null }
  ) => boolean;
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
  }) => Match | null;
}

const STORAGE_KEY_STATE = 'intramed_ix_live_engine_v1';
const BROADCAST_CHANNEL_NAME = 'intramed_ix_live_sync_channel';

/**
 * Gera escalação neutra exclusivamente para o MODO DE TESTE (sem nomes de pessoas reais ou fictícias).
 */
function createNeutralTestLineup(
  teamKey: 'home' | 'away',
  count: number,
  startersCount: number,
  hasGoalkeeper: boolean,
  isPairs: boolean
): MatchLineupEntry[] {
  const numbers = [1, 4, 7, 8, 9, 10, 11, 12, 14, 15];
  return Array.from({ length: count }).map((_, idx) => {
    const num = isPairs ? idx + 1 : numbers[idx] || idx + 1;
    return {
      athleteId: `test-${teamKey}-ath-${num}`,
      athleteName: `Atleta #${num}`,
      jerseyNumber: num,
      isStarter: idx < startersCount,
      isCaptain: idx === 0,
      isGoalkeeper: hasGoalkeeper && idx === 0,
      isPairMember: isPairs && idx < 2,
    };
  });
}

/**
 * Constrói a bancada completa do MODO DE TESTE para todas as 10 modalidades oficiais.
 * Estritamente isolada dos dados oficiais e rotulada como MODO DE TESTE.
 */
function buildInitialTestWorkbench(): {
  teams: Team[];
  athletes: Athlete[];
  matches: Match[];
  sheets: Record<string, MatchSheet>;
} {
  const allModalitySlugs = OFFICIAL_MODALITIES.map((m) => m.id);
  const teams: Team[] = INITIAL_TEAMS.map((t) => ({
    ...t,
    isTestOnly: true,
  }));

  const numbers = [1, 4, 7, 8, 9, 10, 11, 12];
  const positions = [
    'Goleiro / Fixo',
    'Fixo / Armador',
    'Ala Direita',
    'Ala Esquerda',
    'Pivô',
    'Armador / Ala',
    'Ala-Pivô',
    'Universal',
  ];

  const athletes: Athlete[] = [
    ...numbers.map((num, idx) => ({
      id: `test-home-ath-${num}`,
      name: `Atleta #${num}`,
      avatarUrl: null,
      jerseyNumber: num,
      position: positions[idx] || 'Atleta',
      teamId: 'colossal',
      modalityIds: allModalitySlugs,
      isTestOnly: true,
    })),
    ...numbers.map((num, idx) => ({
      id: `test-away-ath-${num}`,
      name: `Atleta #${num}`,
      avatarUrl: null,
      jerseyNumber: num,
      position: positions[idx] || 'Atleta',
      teamId: 'soberana',
      modalityIds: allModalitySlugs,
      isTestOnly: true,
    })),
  ];

  const matches: Match[] = [];
  const sheets: Record<string, MatchSheet> = {};

  const phaseByIndex: Array<{ phase: Match['phase']; label: string }> = [
    { phase: 'semifinals', label: 'Semifinal' },
    { phase: 'quarterfinals', label: 'Quartas de Final' },
    { phase: 'group_stage', label: 'Fase Classificatória' },
  ];

  const pairings: Array<[string, string]> = [
    ['colossal', 'soberana'],
    ['sanguinaria', 'predadora'],
    ['soberana', 'sanguinaria'],
    ['predadora', 'colossal'],
    ['colossal', 'tormenta'],
  ];

  OFFICIAL_MODALITIES.forEach((mod, index) => {
    const matchId = `test-match-${mod.id}`;
    const sheetId = `test-sheet-${mod.id}`;
    const engine = MODALITY_RULE_ENGINE[mod.id];
    const defaultCatKey = Object.keys(engine.defaultCategoryRules)[0] || 'Geral';
    const catRule = engine.defaultCategoryRules[defaultCatKey];
    const phaseInfo = phaseByIndex[index % phaseByIndex.length];

    const isSwimming = engine.scoringModel === 'swimming_heats';
    const isPairs = engine.supportsPairs;
    const [homeId, awayId] = pairings[index % pairings.length];
    const homeTeamObj = teams.find((t) => t.id === homeId) || teams[0];
    const awayTeamObj = teams.find((t) => t.id === awayId) || teams[1];

    const match: Match = {
      id: matchId,
      modalityId: mod.id,
      modalityName: mod.name,
      categoryId: `cat-${defaultCatKey.toLowerCase()}`,
      categoryName: catRule.categoryName,
      phase: phaseInfo.phase,
      phaseLabel: phaseInfo.label,
      status: 'scheduled',
      scheduledDate: 'Modo de Teste',
      scheduledTime: '--:--',
      venue: mod.id === 'natacao' ? 'Piscina Oficial' : mod.id === 'volei-de-praia' ? 'Quadra de Areia' : 'Ginásio Oficial',
      homeTeam: {
        teamId: homeTeamObj.id,
        teamName: isSwimming ? 'Série Oficial' : homeTeamObj.name,
        crestUrl: homeTeamObj.crestUrl || null,
        score: 0,
        setsWon: 0,
        isWinner: false,
      },
      awayTeam: {
        teamId: awayTeamObj.id,
        teamName: isSwimming ? 'Raias 1 a 6' : awayTeamObj.name,
        crestUrl: awayTeamObj.crestUrl || null,
        score: 0,
        setsWon: 0,
        isWinner: false,
      },
      matchSheetId: sheetId,
      isTestData: true,
    };

    const periodScores = Array.from({ length: catRule.periodsCount }).map((_, idx) => ({
      periodNumber: idx + 1,
      label:
        engine.scoringModel === 'sets_points' || engine.scoringModel === 'team_submatches'
          ? `Set ${idx + 1}`
          : engine.scoringModel === 'points_quarters'
          ? `P${idx + 1}`
          : `${idx + 1}º Período`,
      homeScore: 0,
      awayScore: 0,
      isFinished: false,
    }));

    const sheet: MatchSheet = {
      id: sheetId,
      matchId,
      modalityId: mod.id,
      scoringModel: engine.scoringModel,
      isTestMode: true,
      homeLineup: createNeutralTestLineup(
        'home',
        isPairs ? 2 : 8,
        isPairs ? 2 : 5,
        engine.supportsGoalkeeper,
        isPairs
      ),
      awayLineup: createNeutralTestLineup(
        'away',
        isPairs ? 2 : 8,
        isPairs ? 2 : 5,
        engine.supportsGoalkeeper,
        isPairs
      ),
      timer: {
        currentPeriod: 1,
        totalPeriods: catRule.periodsCount,
        periodLabel:
          engine.scoringModel === 'sets_points'
            ? 'Set 1'
            : engine.scoringModel === 'swimming_heats'
            ? 'Prova Oficial'
            : engine.scoringModel === 'points_quarters'
            ? '1º Quarto (P1)'
            : '1º Período',
        remainingSeconds: catRule.periodDurationSeconds,
        initialPeriodSeconds: catRule.periodDurationSeconds,
        elapsedSeconds: 0,
        isRunning: false,
        lifecycle: 'not_started',
      },
      periodScores,
      events: [],
      activeSuspensions: [],
      activeTimeout: null,
      homeTimeoutsUsed: 0,
      awayTimeoutsUsed: 0,
      homeFoulsCurrentPeriod: 0,
      awayFoulsCurrentPeriod: 0,
      subMatches:
        mod.id === 'tenis-de-mesa'
          ? [
              {
                id: 'tt-sub-1',
                orderNumber: 1,
                label: '1º Jogo Individual',
                homeAthleteId: 'test-home-ath-1',
                homeAthleteName: 'Atleta #1',
                awayAthleteId: 'test-away-ath-1',
                awayAthleteName: 'Atleta #1',
                homeSetsWon: 0,
                awaySetsWon: 0,
                currentSetHomePoints: 0,
                currentSetAwayPoints: 0,
                status: 'live',
                winnerSide: null,
              },
              {
                id: 'tt-sub-2',
                orderNumber: 2,
                label: '2º Jogo Individual',
                homeAthleteId: 'test-home-ath-4',
                homeAthleteName: 'Atleta #4',
                awayAthleteId: 'test-away-ath-4',
                awayAthleteName: 'Atleta #4',
                homeSetsWon: 0,
                awaySetsWon: 0,
                currentSetHomePoints: 0,
                currentSetAwayPoints: 0,
                status: 'pending',
                winnerSide: null,
              },
              {
                id: 'tt-sub-3',
                orderNumber: 3,
                label: '3º Jogo Decisivo',
                homeAthleteId: 'test-home-ath-7',
                homeAthleteName: 'Atleta #7',
                awayAthleteId: 'test-away-ath-7',
                awayAthleteName: 'Atleta #7',
                homeSetsWon: 0,
                awaySetsWon: 0,
                currentSetHomePoints: 0,
                currentSetAwayPoints: 0,
                status: 'pending',
                winnerSide: null,
              },
            ]
          : undefined,
      activeSubMatchIndex: 0,
      swimmingStroke: mod.id === 'natacao' ? 'Crawl' : undefined,
      swimmingDistanceLabel: mod.id === 'natacao' ? '50m Livre' : undefined,
      swimmingLanes:
        mod.id === 'natacao'
          ? [1, 2, 3, 4, 5, 6].map((lane, idx) => {
              const isHomeSide = idx % 2 === 0;
              const num = [1, 4, 7][Math.floor(idx / 2)] || 1;
              return {
                laneNumber: lane,
                athleteId: `test-${isHomeSide ? 'home' : 'away'}-ath-${num}`,
                athleteName: `Atleta #${num}`,
                teamName: isHomeSide ? 'Equipe 1' : 'Equipe 2',
                registeredTimeMs: null,
                formattedTime: null,
                status: 'ready',
                placement: null,
              };
            })
          : undefined,
      refereeNotes: '',
      refereeName: '',
      tableOfficialName: '',
      isClosed: false,
      closedAtIso: null,
      syncStatus: 'synced',
      lastUpdatedIso: new Date().toISOString(),
    };

    matches.push(match);
    sheets[matchId] = sheet;
  });

  return { teams, athletes, matches, sheets };
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
          // Garante que as 5 equipes oficiais (Colossal, Soberana, Sanguinária, Predadora e Tormenta)
          // estejam sempre sincronizadas com seus escudos e temas atuais
          const mergeTeamsWithDefaults = (savedList?: Team[], fallbackList: Team[] = INITIAL_TEAMS): Team[] => {
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

          return {
            isTestMode: Boolean(parsed.isTestMode),
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
            currentUser:
              parsed.currentUser !== undefined
                ? parsed.currentUser
                : INITIAL_USER_PROFILE,
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
      isTestMode: false, // Aplicação oficial inicia limpa sem dados fictícios
      officialTeams: INITIAL_TEAMS,
      officialAthletes: INITIAL_ATHLETES,
      officialMatches: INITIAL_MATCHES,
      officialSheets: {},
      testTeams: initialTest.teams,
      testAthletes: initialTest.athletes,
      testMatches: initialTest.matches,
      testSheets: initialTest.sheets,
      currentUser: INITIAL_USER_PROFILE,
      pendingSyncCount: 0,
      favoriteModalityIds: [],
      favoriteTeamIds: [],
      favoriteAthleteIds: [],
      notifications: [],
    };
  });

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const channelRef = useRef<BroadcastChannel | null>(null);
  const isApplyingRemoteUpdate = useRef(false);

  // Sincronização entre abas (Placar ao Vivo em uma aba + Súmula do Operador em outra)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.onmessage = (ev) => {
        if (ev.data && ev.data.type === 'STATE_SYNC') {
          isApplyingRemoteUpdate.current = true;
          setState(ev.data.payload);
        }
      };
      channelRef.current = bc;
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_STATE && e.newValue) {
        try {
          isApplyingRemoteUpdate.current = true;
          setState(JSON.parse(e.newValue));
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

  // Persistir e transmitir sempre que o estado mudar localmente
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(state));
      if (!isApplyingRemoteUpdate.current && channelRef.current) {
        channelRef.current.postMessage({ type: 'STATE_SYNC', payload: state });
      }
      isApplyingRemoteUpdate.current = false;
    } catch {
      // Ignore quota errors
    }
  }, [state]);

  // Motor de Cronômetro Centralizado (1 segundo) — alimenta cronômetro principal, punições 2min e timeouts
  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => {
        const targetSheets = prev.isTestMode ? prev.testSheets : prev.officialSheets;
        const hasAnyRunning = Object.values(targetSheets).some(
          (s) =>
            s.timer.isRunning ||
            (s.activeTimeout && s.activeTimeout.isActive) ||
            s.activeSuspensions.some((susp) => !susp.isReleased && susp.remainingSeconds > 0 && s.timer.isRunning)
        );

        if (!hasAnyRunning) return prev;

        const updatedSheets = { ...targetSheets };
        const updatedMatches = [...(prev.isTestMode ? prev.testMatches : prev.officialMatches)];

        Object.keys(updatedSheets).forEach((mId) => {
          const sheet = updatedSheets[mId];
          const engine = MODALITY_RULE_ENGINE[sheet.modalityId];
          let changed = false;
          let nextTimer = { ...sheet.timer };
          let nextTimeout = sheet.activeTimeout ? { ...sheet.activeTimeout } : null;
          let nextSuspensions = sheet.activeSuspensions;

          // 1. Contador de Timeout / Tempo Técnico
          if (nextTimeout && nextTimeout.isActive) {
            changed = true;
            if (nextTimeout.remainingSeconds <= 1) {
              nextTimeout = null;
            } else {
              nextTimeout.remainingSeconds -= 1;
            }
          }

          // 2. Cronômetro Principal da Partida + Exclusões de 2 Minutos
          if (nextTimer.isRunning) {
            changed = true;
            nextTimer.elapsedSeconds += 1;

            if (engine.timerDirection === 'countdown') {
              if (nextTimer.remainingSeconds > 0) {
                nextTimer.remainingSeconds -= 1;
              }
              if (nextTimer.remainingSeconds === 0) {
                nextTimer.isRunning = false;
                nextTimer.lifecycle = 'period_ended';
              }
            }

            // Atualiza contadores individuais de punição temporária (2 min) sincronizados com a bola rolando
            if (sheet.activeSuspensions.length > 0) {
              nextSuspensions = sheet.activeSuspensions.map((susp) => {
                if (susp.isReleased || susp.remainingSeconds <= 0) {
                  return { ...susp, remainingSeconds: 0, isReleased: true };
                }
                const rem = susp.remainingSeconds - 1;
                return {
                  ...susp,
                  remainingSeconds: rem,
                  isReleased: rem <= 0,
                };
              });
            }
          }

          if (changed) {
            updatedSheets[mId] = {
              ...sheet,
              timer: nextTimer,
              activeTimeout: nextTimeout,
              activeSuspensions: nextSuspensions,
              lastUpdatedIso: new Date().toISOString(),
            };
          }
        });

        if (prev.isTestMode) {
          return {
            ...prev,
            testMatches: updatedMatches,
            testSheets: updatedSheets,
          };
        }
        return {
          ...prev,
          officialMatches: updatedMatches,
          officialSheets: updatedSheets,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const isUserAdmin = (user: UserProfile | null): boolean => {
    if (!user) return false;
    return (
      user.role === 'administrador' ||
      user.role === 'organizacao' ||
      user.role === 'moderador'
    );
  };

  const updateMatchAndSheet = useCallback(
    (
      matchId: string,
      updater: (match: Match, sheet: MatchSheet) => { match: Match; sheet: MatchSheet }
    ) => {
      setState((prev) => {
        if (!isUserAdmin(prev.currentUser)) return prev;
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

        matchesList[matchIdx] = nextMatch;
        sheetsMap[matchId] = {
          ...nextSheet,
          syncStatus: isOnline ? 'synced' : 'pending_sync',
          lastUpdatedIso: new Date().toISOString(),
        };

        return {
          ...prev,
          ...(isTest
            ? { testMatches: matchesList, testSheets: sheetsMap }
            : { officialMatches: matchesList, officialSheets: sheetsMap }),
          pendingSyncCount: isOnline ? prev.pendingSyncCount : prev.pendingSyncCount + 1,
        };
      });
    },
    [isOnline]
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
            id: `ev-${Date.now()}`,
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

        const endEvent: MatchEvent = {
          id: `ev-${Date.now()}`,
          matchId,
          type: 'period_end',
          typeLabel: `Fim do ${sheet.timer.periodLabel}`,
          periodNumber: sheet.timer.currentPeriod,
          periodLabel: sheet.timer.periodLabel,
          matchClockDisplay: '00:00',
          createdAtIso: new Date().toISOString(),
          auditHistory: [],
        };

        const isLastRegularPeriod =
          sheet.timer.currentPeriod >= sheet.timer.totalPeriods;

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
              remainingSeconds: 0,
              lifecycle: isLastRegularPeriod ? 'period_ended' : 'interval',
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
            timer: {
              ...sheet.timer,
              currentPeriod: nextPeriodNum,
              periodLabel: nextLabel,
              remainingSeconds: sheet.timer.initialPeriodSeconds,
              elapsedSeconds: 0,
              isRunning: false,
              lifecycle: 'not_started',
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
          engine.defaultCategoryRules[match.categoryName || 'Masculino'] ||
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
            },
          },
        };
      });
    },
    [updateMatchAndSheet]
  );

  const configureMatchCategoryRule = useCallback(
    (matchId: string, categoryName: string) => {
      updateMatchAndSheet(matchId, (match, sheet) => {
        const engine = MODALITY_RULE_ENGINE[sheet.modalityId];
        const rule = engine.defaultCategoryRules[categoryName];
        if (!rule) return { match, sheet };

        return {
          match: {
            ...match,
            categoryName: rule.categoryName,
          },
          sheet: {
            ...sheet,
            timer: {
              ...sheet.timer,
              totalPeriods: rule.periodsCount,
              initialPeriodSeconds: rule.periodDurationSeconds,
              remainingSeconds: rule.periodDurationSeconds,
              elapsedSeconds: 0,
              isRunning: false,
              lifecycle: 'not_started',
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
          id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

        let nextHomeScore = match.homeTeam.score ?? 0;
        let nextAwayScore = match.awayTeam.score ?? 0;
        let nextPeriodScores = [...sheet.periodScores];
        let nextHomeFouls = sheet.homeFoulsCurrentPeriod;
        let nextAwayFouls = sheet.awayFoulsCurrentPeriod;
        let nextHomeTimeouts = sheet.homeTimeoutsUsed;
        let nextAwayTimeouts = sheet.awayTimeoutsUsed;
        let nextActiveTimeout = sheet.activeTimeout;
        let nextSuspensions = [...sheet.activeSuspensions];
        let nextTimer = { ...sheet.timer };
        let nextHomeLineup = [...sheet.homeLineup];
        let nextAwayLineup = [...sheet.awayLineup];

        // 1. Atualização de Placar (Gol, +1, +2, +3, Ponto de Set, 7 Metros, Pênalti)
        const delta =
          payload.pointsDelta ??
          (payload.type === 'goal' ||
          payload.type === 'point_1' ||
          payload.type === 'set_point' ||
          payload.type === 'seven_meters' ||
          payload.type === 'penalty_goal'
            ? 1
            : payload.type === 'point_2'
            ? 2
            : payload.type === 'point_3'
            ? 3
            : 0);

        if (delta > 0 && payload.teamSide) {
          if (sheet.scoringModel === 'sets_points') {
            // Em modalidades de sets, os pontos vão para o set atual e o placar principal mostra os sets vencidos (ou atualiza parcial)
            nextPeriodScores = nextPeriodScores.map((ps) => {
              if (ps.periodNumber !== sheet.timer.currentPeriod) return ps;
              return {
                ...ps,
                homeScore:
                  payload.teamSide === 'home' ? ps.homeScore + delta : ps.homeScore,
                awayScore:
                  payload.teamSide === 'away' ? ps.awayScore + delta : ps.awayScore,
              };
            });
          } else {
            if (payload.teamSide === 'home') nextHomeScore += delta;
            if (payload.teamSide === 'away') nextAwayScore += delta;

            nextPeriodScores = nextPeriodScores.map((ps) => {
              if (ps.periodNumber !== sheet.timer.currentPeriod) return ps;
              return {
                ...ps,
                homeScore:
                  payload.teamSide === 'home' ? ps.homeScore + delta : ps.homeScore,
                awayScore:
                  payload.teamSide === 'away' ? ps.awayScore + delta : ps.awayScore,
              };
            });
          }
        }

        // 2. Contabilização de Faltas da Equipe no Período
        if (
          (payload.type === 'foul' || payload.type === 'team_foul') &&
          payload.teamSide
        ) {
          if (payload.teamSide === 'home') nextHomeFouls += 1;
          if (payload.teamSide === 'away') nextAwayFouls += 1;
        }

        // 3. Punição Temporária de 2 Minutos (Handebol etc.)
        if (payload.type === 'suspension_2min' && payload.teamSide) {
          const returnSecs = Math.max(0, sheet.timer.remainingSeconds - 120);
          nextSuspensions.unshift({
            id: `susp-${Date.now()}`,
            eventId: newEvent.id,
            teamSide: payload.teamSide,
            teamName: teamName || 'Equipe',
            athleteId: payload.athleteId || 'ath',
            athleteName: payload.athleteName || 'Atleta',
            athleteNumber: payload.athleteNumber,
            startedAtMatchClock: clockStr,
            durationSeconds: 120,
            remainingSeconds: 120,
            expectedReturnMatchClock: formatSecondsToClock(returnSecs),
            isReleased: false,
          });
        }

        // 4. Substituição: atualiza titulares/reservas automaticamente
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

        // 5. Timeout / Tempo Técnico
        if (payload.type === 'timeout' && payload.teamSide) {
          const engine = MODALITY_RULE_ENGINE[sheet.modalityId];
          const catRule =
            engine.defaultCategoryRules[match.categoryName || 'Masculino'] ||
            Object.values(engine.defaultCategoryRules)[0];
          const timeoutSecs = catRule?.timeoutDurationSeconds || 60;

          if (payload.teamSide === 'home') nextHomeTimeouts += 1;
          if (payload.teamSide === 'away') nextAwayTimeouts += 1;

          nextTimer = {
            ...nextTimer,
            isRunning: false,
            lifecycle: nextTimer.lifecycle === 'running' ? 'paused' : nextTimer.lifecycle,
          };

          nextActiveTimeout = {
            isActive: true,
            teamSide: payload.teamSide,
            teamName: teamName || 'Equipe',
            remainingSeconds: timeoutSecs,
            totalSeconds: timeoutSecs,
          };
        }

        return {
          match: {
            ...match,
            status: match.status === 'scheduled' ? 'live' : match.status,
            homeTeam: {
              ...match.homeTeam,
              score: nextHomeScore,
            },
            awayTeam: {
              ...match.awayTeam,
              score: nextAwayScore,
            },
          },
          sheet: {
            ...sheet,
            events: [newEvent, ...sheet.events],
            periodScores: nextPeriodScores,
            homeFoulsCurrentPeriod: nextHomeFouls,
            awayFoulsCurrentPeriod: nextAwayFouls,
            homeTimeoutsUsed: nextHomeTimeouts,
            awayTimeoutsUsed: nextAwayTimeouts,
            activeTimeout: nextActiveTimeout,
            activeSuspensions: nextSuspensions,
            homeLineup: nextHomeLineup,
            awayLineup: nextAwayLineup,
            timer: nextTimer,
          },
        };
      });
    },
    [updateMatchAndSheet]
  );

  // CORREÇÃO / EDIÇÃO DE EVENTO COM REGISTRO DE AUDITORIA (Item 25)
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

        // Se mudou o lado da equipe em um evento de pontuação, ajusta o placar automaticamente
        let nextHomeScore = match.homeTeam.score ?? 0;
        let nextAwayScore = match.awayTeam.score ?? 0;
        let nextPeriodScores = [...sheet.periodScores];

        const delta =
          target.pointsDelta ??
          (target.type === 'goal' ||
          target.type === 'point_1' ||
          target.type === 'set_point' ||
          target.type === 'seven_meters' ||
          target.type === 'penalty_goal'
            ? 1
            : target.type === 'point_2'
            ? 2
            : target.type === 'point_3'
            ? 3
            : 0);

        if (
          delta > 0 &&
          target.teamSide &&
          nextTeamSide &&
          target.teamSide !== nextTeamSide
        ) {
          if (sheet.scoringModel !== 'sets_points') {
            if (target.teamSide === 'home') {
              nextHomeScore = Math.max(0, nextHomeScore - delta);
              nextAwayScore += delta;
            } else {
              nextAwayScore = Math.max(0, nextAwayScore - delta);
              nextHomeScore += delta;
            }
          }
          nextPeriodScores = nextPeriodScores.map((ps) => {
            if (ps.periodNumber !== target.periodNumber) return ps;
            if (target.teamSide === 'home') {
              return {
                ...ps,
                homeScore: Math.max(0, ps.homeScore - delta),
                awayScore: ps.awayScore + delta,
              };
            }
            return {
              ...ps,
              awayScore: Math.max(0, ps.awayScore - delta),
              homeScore: ps.homeScore + delta,
            };
          });
        }

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
                id: `aud-${Date.now()}`,
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

        return {
          match: {
            ...match,
            homeTeam: { ...match.homeTeam, score: nextHomeScore },
            awayTeam: { ...match.awayTeam, score: nextAwayScore },
          },
          sheet: {
            ...sheet,
            events: updatedEvents,
            periodScores: nextPeriodScores,
          },
        };
      });
    },
    [updateMatchAndSheet]
  );

  // EXCLUSÃO DE EVENTO COM CONFIRMAÇÃO E AUDITORIA (Item 25)
  const deleteMatchEvent = useCallback(
    (matchId: string, eventId: string, reason?: string) => {
      updateMatchAndSheet(matchId, (match, sheet) => {
        const target = sheet.events.find((e) => e.id === eventId);
        if (!target || target.isDeleted) return { match, sheet };

        const delta =
          target.pointsDelta ??
          (target.type === 'goal' ||
          target.type === 'point_1' ||
          target.type === 'set_point' ||
          target.type === 'seven_meters' ||
          target.type === 'penalty_goal'
            ? 1
            : target.type === 'point_2'
            ? 2
            : target.type === 'point_3'
            ? 3
            : 0);

        let nextHomeScore = match.homeTeam.score ?? 0;
        let nextAwayScore = match.awayTeam.score ?? 0;
        let nextPeriodScores = [...sheet.periodScores];
        let nextHomeFouls = sheet.homeFoulsCurrentPeriod;
        let nextAwayFouls = sheet.awayFoulsCurrentPeriod;

        if (delta > 0 && target.teamSide) {
          if (sheet.scoringModel !== 'sets_points') {
            if (target.teamSide === 'home') {
              nextHomeScore = Math.max(0, nextHomeScore - delta);
            } else {
              nextAwayScore = Math.max(0, nextAwayScore - delta);
            }
          }
          nextPeriodScores = nextPeriodScores.map((ps) => {
            if (ps.periodNumber !== target.periodNumber) return ps;
            return {
              ...ps,
              homeScore:
                target.teamSide === 'home'
                  ? Math.max(0, ps.homeScore - delta)
                  : ps.homeScore,
              awayScore:
                target.teamSide === 'away'
                  ? Math.max(0, ps.awayScore - delta)
                  : ps.awayScore,
            };
          });
        }

        if (
          (target.type === 'foul' || target.type === 'team_foul') &&
          target.teamSide &&
          target.periodNumber === sheet.timer.currentPeriod
        ) {
          if (target.teamSide === 'home') {
            nextHomeFouls = Math.max(0, nextHomeFouls - 1);
          } else {
            nextAwayFouls = Math.max(0, nextAwayFouls - 1);
          }
        }

        const prevSummary = `${target.typeLabel} • ${target.teamName || ''} • ${
          target.athleteName || 'Sem atleta'
        } (${target.matchClockDisplay})`;

        const updatedEvents = sheet.events.map((ev) => {
          if (ev.id !== eventId) return ev;
          return {
            ...ev,
            isDeleted: true,
            auditHistory: [
              ...ev.auditHistory,
              {
                id: `aud-${Date.now()}`,
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

        const nextSuspensions = sheet.activeSuspensions.filter(
          (s) => s.eventId !== eventId
        );

        return {
          match: {
            ...match,
            homeTeam: { ...match.homeTeam, score: nextHomeScore },
            awayTeam: { ...match.awayTeam, score: nextAwayScore },
          },
          sheet: {
            ...sheet,
            events: updatedEvents,
            periodScores: nextPeriodScores,
            homeFoulsCurrentPeriod: nextHomeFouls,
            awayFoulsCurrentPeriod: nextAwayFouls,
            activeSuspensions: nextSuspensions,
          },
        };
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

  // ESCALAÇÃO (Titulares, Reservas, Capitão, Goleiro, Dupla)
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

  // ENCERRAMENTO DE SET (VÔLEI / VÔLEI DE PRAIA)
  const finishCurrentSet = useCallback(
    (matchId: string) => {
      updateMatchAndSheet(matchId, (match, sheet) => {
        const currentSetObj = sheet.periodScores.find(
          (p) => p.periodNumber === sheet.timer.currentPeriod
        );
        if (!currentSetObj) return { match, sheet };

        const homeWonSet = currentSetObj.homeScore > currentSetObj.awayScore;
        const awayWonSet = currentSetObj.awayScore > currentSetObj.homeScore;

        const nextHomeSets = (match.homeTeam.setsWon ?? 0) + (homeWonSet ? 1 : 0);
        const nextAwaySets = (match.awayTeam.setsWon ?? 0) + (awayWonSet ? 1 : 0);

        const updatedPeriods = sheet.periodScores.map((p) =>
          p.periodNumber === sheet.timer.currentPeriod
            ? { ...p, isFinished: true }
            : p
        );

        const setEndEvent: MatchEvent = {
          id: `ev-${Date.now()}`,
          matchId,
          type: 'set_end',
          typeLabel: `Fim do ${sheet.timer.periodLabel} (${currentSetObj.homeScore} × ${currentSetObj.awayScore})`,
          periodNumber: sheet.timer.currentPeriod,
          periodLabel: sheet.timer.periodLabel,
          matchClockDisplay: `Set ${sheet.timer.currentPeriod}`,
          createdAtIso: new Date().toISOString(),
          auditHistory: [],
        };

        const nextSetNumber = sheet.timer.currentPeriod + 1;
        const hasMoreSets = nextSetNumber <= sheet.timer.totalPeriods;

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

        return {
          match: {
            ...match,
            status: 'live',
            homeTeam: {
              ...match.homeTeam,
              score: nextHomeSets,
              setsWon: nextHomeSets,
            },
            awayTeam: {
              ...match.awayTeam,
              score: nextAwaySets,
              setsWon: nextAwaySets,
            },
          },
          sheet: {
            ...sheet,
            periodScores: finalPeriods,
            events: [setEndEvent, ...sheet.events],
            timer: {
              ...sheet.timer,
              currentPeriod: hasMoreSets ? nextSetNumber : sheet.timer.currentPeriod,
              periodLabel: hasMoreSets
                ? `Set ${nextSetNumber}`
                : sheet.timer.periodLabel,
            },
          },
        };
      });
    },
    [updateMatchAndSheet]
  );

  // TÊNIS DE MESA: Sub-partidas dentro do confronto de equipes
  const recordTableTennisPoint = useCallback(
    (matchId: string, subMatchId: string, side: 'home' | 'away') => {
      updateMatchAndSheet(matchId, (match, sheet) => {
        if (!sheet.subMatches) return { match, sheet };

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
          id: `ev-${Date.now()}`,
          matchId,
          type: 'set_point',
          typeLabel: `Ponto (${activeSm?.label || 'Partida'})`,
          teamSide: side,
          teamName:
            side === 'home' ? match.homeTeam.teamName : match.awayTeam.teamName,
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
        if (!sheet.subMatches) return { match, sheet };

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

        return {
          match: {
            ...match,
            homeTeam: { ...match.homeTeam, score: totalHomeTeamMatchesWon },
            awayTeam: { ...match.awayTeam, score: totalAwayTeamMatchesWon },
          },
          sheet: {
            ...sheet,
            subMatches: updatedSubMatches,
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

  // NATAÇÃO: Provas por Estilo e Raias com Classificação Automática
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

        // Calcula automaticamente a colocação (1º, 2º, 3º...) ordenada pelo menor tempo
        const finishedSorted = [...rawUpdated]
          .filter((l) => l.status === 'finished' && l.registeredTimeMs !== null)
          .sort((a, b) => (a.registeredTimeMs || 0) - (b.registeredTimeMs || 0));

        const rankedLanes = rawUpdated.map((lane) => {
          if (lane.status !== 'finished' || lane.registeredTimeMs === null) {
            return { ...lane, placement: null };
          }
          const place =
            finishedSorted.findIndex((f) => f.laneNumber === lane.laneNumber) + 1;
          return { ...lane, placement: place };
        });

        const laneObj = rankedLanes.find((l) => l.laneNumber === laneNumber);
        const swimEvent: MatchEvent = {
          id: `ev-${Date.now()}`,
          matchId,
          type: 'swimming_time',
          typeLabel: `Tempo Registrado — Raia ${laneNumber}`,
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

  // METADADOS DE ARBITRAGEM E ENCERRAMENTO DA SÚMULA
  const updateRefereeMetadata = useCallback(
    (
      matchId: string,
      data: {
        refereeName?: string;
        tableOfficialName?: string;
        refereeNotes?: string;
      }
    ) => {
      updateMatchAndSheet(matchId, (match, sheet) => ({
        match,
        sheet: {
          ...sheet,
          refereeName:
            data.refereeName !== undefined ? data.refereeName : sheet.refereeName,
          tableOfficialName:
            data.tableOfficialName !== undefined
              ? data.tableOfficialName
              : sheet.tableOfficialName,
          refereeNotes:
            data.refereeNotes !== undefined
              ? data.refereeNotes
              : sheet.refereeNotes,
        },
      }));
    },
    [updateMatchAndSheet]
  );

  const finalizeMatch = useCallback(
    (matchId: string) => {
      updateMatchAndSheet(matchId, (match, sheet) => {
        const homeScore = match.homeTeam.score ?? 0;
        const awayScore = match.awayTeam.score ?? 0;

        return {
          match: {
            ...match,
            status: 'finished',
            homeTeam: {
              ...match.homeTeam,
              isWinner: homeScore > awayScore,
            },
            awayTeam: {
              ...match.awayTeam,
              isWinner: awayScore > homeScore,
            },
          },
          sheet: {
            ...sheet,
            isClosed: true,
            closedAtIso: new Date().toISOString(),
            timer: {
              ...sheet.timer,
              isRunning: false,
              lifecycle: 'match_ended',
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
        },
        sheet: {
          ...sheet,
          isClosed: false,
          closedAtIso: null,
          timer: {
            ...sheet.timer,
            lifecycle: 'paused',
          },
        },
      }));
    },
    [updateMatchAndSheet]
  );

  // FAVORITOS & PERSONALIZAÇÃO
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

  // NOTIFICAÇÕES & CENTRAL DE ALERTAS
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

  // CONSULTAS DE EQUIPES, ATLETAS E ESTATÍSTICAS DERIVADAS (SEM DUPLICAÇÃO)
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
    setState((prev) => ({
      ...prev,
      currentUser: user,
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
          list.map((a) =>
            a.id === athleteId ? { ...a, avatarUrl: avatarDataUrl } : a
          );
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
    [canEditAthleteProfile]
  );

  const updateTeamCrest = useCallback((teamId: string, crestDataUrl: string) => {
    setState((prev) => {
      if (!isUserAdmin(prev.currentUser)) return prev;
      const updateTeams = (list: Team[]) =>
        list.map((t) => (t.id === teamId ? { ...t, crestUrl: crestDataUrl } : t));
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
  }, []);

  const updateAthletePersonalInfo = useCallback(
    (
      athleteId: string,
      data: { position?: string; jerseyNumber?: number | null }
    ): boolean => {
      if (!canEditAthleteProfile(athleteId)) return false;
      setState((prev) => {
        const updateList = (list: Athlete[]) =>
          list.map((a) =>
            a.id === athleteId
              ? {
                  ...a,
                  position:
                    data.position !== undefined ? data.position : a.position,
                  jerseyNumber:
                    data.jerseyNumber !== undefined
                      ? data.jerseyNumber
                      : a.jerseyNumber,
                }
              : a
          );
        return {
          ...prev,
          officialAthletes: updateList(prev.officialAthletes),
          testAthletes: updateList(prev.testAthletes),
        };
      });
      return true;
    },
    [canEditAthleteProfile]
  );

  // CADASTRO UNIFICADO DE EQUIPES (PERÍODOS), ATLETAS E PARTIDAS
  const registerTeam = useCallback(
    (payload: {
      name: string;
      shortName?: string;
      crestUrl?: string | null;
      modalityIds: ModalitySlug[];
    }): Team => {
      const id = `team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
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
        return {
          ...prev,
          officialTeams: [...prev.officialTeams, newTeam],
        };
      });

      return newTeam;
    },
    []
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
          error: 'Apenas Administradores ou Mesários autenticados podem cadastrar atletas.',
        };
      }
      const cleanName = payload.name.trim();
      if (!cleanName || !payload.teamId) {
        return { ok: false, error: 'Informe o nome do atleta e o período/equipe.' };
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
        id: `${state.isTestMode ? 'test-' : ''}ath-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 6)}`,
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
        // Também injeta automaticamente o atleta nas escalações das súmulas abertas daquela equipe e modalidade
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
        return {
          ...prev,
          officialAthletes: [...prev.officialAthletes, newAthlete],
          officialSheets: targetSheets,
        };
      });

      return { ok: true, athlete: newAthlete };
    },
    [state.isTestMode, state.testAthletes, state.officialAthletes, state.currentUser]
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
      const matchId = `${prefix}match-${Date.now()}`;
      const sheetId = `${prefix}sheet-${Date.now()}`;
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
        isTestData: state.isTestMode,
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
      };

      setState((prev) => {
        if (prev.isTestMode) {
          return {
            ...prev,
            testMatches: [newMatch, ...prev.testMatches],
            testSheets: { ...prev.testSheets, [matchId]: newSheet },
          };
        }
        return {
          ...prev,
          officialMatches: [newMatch, ...prev.officialMatches],
          officialSheets: { ...prev.officialSheets, [matchId]: newSheet },
        };
      });

      return newMatch;
    },
    [state.isTestMode, state.testTeams, state.officialTeams, state.testAthletes, state.officialAthletes, state.currentUser]
  );

  return (
    <CompetitionStoreContext.Provider
      value={{
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
        updateAthleteAvatar,
        updateTeamCrest,
        updateAthletePersonalInfo,
        registerTeam,
        registerAthlete,
        createOfficialMatch,
      }}
    >
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
