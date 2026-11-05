import {
  Athlete,
  Match,
  MatchLineupEntry,
  MatchSheet,
  Team,
} from '../types/domain';
import { OFFICIAL_MODALITIES, INITIAL_TEAMS } from './officialData';
import { MODALITY_RULE_ENGINE } from './sportRulesConfig';

/**
 * Gera escalação neutra exclusivamente para o MODO DE TESTE (sem nomes de pessoas reais ou fictícias).
 */
export function createNeutralTestLineup(
  teamKey: 'home' | 'away',
  count: number,
  startersCount: number,
  hasGoalkeeper: boolean,
  isPairs: boolean
): MatchLineupEntry[] {
  const numbers = [1, 4, 7, 8, 9, 10, 11, 12, 14, 15];
  const sideLabel = teamKey === 'home' ? 'Casa' : 'Visitante';
  return Array.from({ length: count }).map((_, idx) => {
    const num = isPairs ? idx + 1 : numbers[idx] || idx + 1;
    return {
      athleteId: `test-${teamKey}-ath-${num}`,
      athleteName: `Atleta ${sideLabel} #${num}`,
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
export function buildInitialTestWorkbench(): {
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
      name: `Atleta Casa #${num}`,
      avatarUrl: null,
      jerseyNumber: num,
      position: positions[idx] || 'Atleta',
      teamId: 'colossal',
      modalityIds: allModalitySlugs,
      isTestOnly: true,
    })),
    ...numbers.map((num, idx) => ({
      id: `test-away-ath-${num}`,
      name: `Atleta Visitante #${num}`,
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
      venue:
        mod.id === 'natacao'
          ? 'Piscina Oficial'
          : mod.id === 'volei-de-praia'
          ? 'Quadra de Areia'
          : 'Ginásio Oficial',
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
      tableOfficialPassword: `MESA-${mod.id.slice(0, 3).toUpperCase()}-${101 + index}`,
      isTestData: true,
      revision: 1,
    };

    const periodScores = Array.from({ length: catRule.periodsCount }).map((_, idx) => ({
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
      subMatches:
        mod.id === 'tenis-de-mesa'
          ? [
              {
                id: 'tt-sub-1',
                orderNumber: 1,
                label: '1º Jogo Individual',
                homeAthleteId: 'test-home-ath-1',
                homeAthleteName: 'Atleta Casa #1',
                awayAthleteId: 'test-away-ath-1',
                awayAthleteName: 'Atleta Visitante #1',
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
                homeAthleteName: 'Atleta Casa #4',
                awayAthleteId: 'test-away-ath-4',
                awayAthleteName: 'Atleta Visitante #4',
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
                homeAthleteName: 'Atleta Casa #7',
                awayAthleteId: 'test-away-ath-7',
                awayAthleteName: 'Atleta Visitante #7',
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
                athleteName: `Atleta ${isHomeSide ? 'Casa' : 'Visitante'} #${num}`,
                teamName: isHomeSide ? homeTeamObj.name : awayTeamObj.name,
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
      revision: 1,
    };

    matches.push(match);
    sheets[matchId] = sheet;
  });

  return { teams, athletes, matches, sheets };
}
