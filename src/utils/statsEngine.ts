import {
  Athlete,
  AthleteMatchLogItem,
  DerivedAthleteModalityStats,
  DerivedTeamStats,
  LeaderboardEntry,
  Match,
  MatchEvent,
  MatchEventType,
  MatchLineupEntry,
  MatchSheet,
  ModalitySlug,
  PeriodScoreEntry,
  StandingEntry,
  Team,
  TeamRecentMatchCapsule,
} from '../types/domain';
import { formatMsToSwimmingTime } from '../data/sportRulesConfig';

/**
 * Gera um ID único criptograficamente seguro (com fallback para ambientes legados).
 */
export function generateUniqueId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

/**
 * Deduplica eventos pelo ID único e filtra eventos removidos (isDeleted === true).
 * Garante idempotência absoluta: editar ou remover um evento atualiza os totais sem duplicação.
 */
export function getValidUniqueEvents(events: MatchEvent[]): MatchEvent[] {
  const seen = new Set<string>();
  const valid: MatchEvent[] = [];
  for (const ev of events) {
    if (ev.isDeleted) continue;
    if (seen.has(ev.id)) continue;
    seen.add(ev.id);
    valid.push(ev);
  }
  return valid;
}

/**
 * Função única centralizada para calcular a pontuação de um evento de súmula (Item 8 da Auditoria).
 */
export function getEventPointsDelta(ev: {
  type: MatchEventType;
  pointsDelta?: number;
}): number {
  if (typeof ev.pointsDelta === 'number' && !Number.isNaN(ev.pointsDelta)) {
    return ev.pointsDelta;
  }
  switch (ev.type) {
    case 'goal':
    case 'point_1':
    case 'set_point':
    case 'seven_meters':
    case 'penalty_goal':
    case 'direct_free_throw':
    case 'volleyball_ace':
    case 'volleyball_block':
    case 'volleyball_attack':
    case 'volleyball_opponent_error':
      return 1;
    case 'point_2':
      return 2;
    case 'point_3':
      return 3;
    default:
      return 0;
  }
}

export function isFoulEventType(type: MatchEventType): boolean {
  return (
    type === 'foul' ||
    type === 'team_foul' ||
    type === 'technical_foul' ||
    type === 'unsportsmanlike_foul'
  );
}

/**
 * Recalcula de forma pura e determinística o placar, parciais por período/set, sets vencidos,
 * faltas do período atual e pedidos de tempo a partir da lista de eventos válidos (Item 15 da Auditoria).
 */
export function recomputeMatchAndSheetFromEvents(
  match: Match,
  sheet: MatchSheet,
  initialHomeLineup?: MatchLineupEntry[],
  initialAwayLineup?: MatchLineupEntry[]
): { match: Match; sheet: MatchSheet } {
  const validEvents = getValidUniqueEvents(sheet.events);

  // Ordena cronologicamente do mais antigo para o mais recente para reproduzir substituições
  const chronological = [...validEvents].reverse();

  // Inicializa parciais zeradas preservando isFinished de períodos já encerrados
  const periodMap = new Map<number, PeriodScoreEntry>();
  for (const ps of sheet.periodScores) {
    periodMap.set(ps.periodNumber, {
      ...ps,
      homeScore: 0,
      awayScore: 0,
    });
  }

  let homeTotalPoints = 0;
  let awayTotalPoints = 0;
  let homeFoulsCurrentPeriod = 0;
  let awayFoulsCurrentPeriod = 0;
  let homeTimeoutsUsed = 0;
  let awayTimeoutsUsed = 0;

  let homeLineup = (initialHomeLineup || sheet.homeLineup).map((l) => ({ ...l }));
  let awayLineup = (initialAwayLineup || sheet.awayLineup).map((l) => ({ ...l }));

  for (const ev of chronological) {
    const delta = getEventPointsDelta(ev);
    if (delta > 0 && (ev.teamSide === 'home' || ev.teamSide === 'away')) {
      const pNum = ev.periodNumber || 1;
      const existingPeriod = periodMap.get(pNum) || {
        periodNumber: pNum,
        label: ev.periodLabel || `P${pNum}`,
        homeScore: 0,
        awayScore: 0,
        isFinished: false,
      };
      if (ev.teamSide === 'home') {
        existingPeriod.homeScore += delta;
        homeTotalPoints += delta;
      } else {
        existingPeriod.awayScore += delta;
        awayTotalPoints += delta;
      }
      periodMap.set(pNum, existingPeriod);
    }

    if (isFoulEventType(ev.type) && ev.periodNumber === sheet.timer.currentPeriod) {
      if (ev.teamSide === 'home') homeFoulsCurrentPeriod += 1;
      if (ev.teamSide === 'away') awayFoulsCurrentPeriod += 1;
    }

    if (ev.type === 'timeout' && ev.periodNumber === sheet.timer.currentPeriod) {
      if (ev.teamSide === 'home') homeTimeoutsUsed += 1;
      if (ev.teamSide === 'away') awayTimeoutsUsed += 1;
    }

    if (
      ev.type === 'substitution' &&
      ev.teamSide &&
      ev.athleteId &&
      ev.secondaryAthleteId
    ) {
      const applySub = (list: MatchLineupEntry[]) =>
        list.map((entry) => {
          if (entry.athleteId === ev.athleteId) return { ...entry, isStarter: false };
          if (entry.athleteId === ev.secondaryAthleteId)
            return { ...entry, isStarter: true };
          return entry;
        });
      if (ev.teamSide === 'home') {
        homeLineup = applySub(homeLineup);
      } else {
        awayLineup = applySub(awayLineup);
      }
    }
  }

  const nextPeriodScores = Array.from(periodMap.values()).sort(
    (a, b) => a.periodNumber - b.periodNumber
  );

  // Calcula placar principal conforme o modelo da modalidade
  let finalHomeScore = homeTotalPoints;
  let finalAwayScore = awayTotalPoints;
  let homeSetsWon = match.homeTeam.setsWon ?? 0;
  let awaySetsWon = match.awayTeam.setsWon ?? 0;

  if (sheet.scoringModel === 'sets_points') {
    homeSetsWon = 0;
    awaySetsWon = 0;
    for (const ps of nextPeriodScores) {
      if (ps.isFinished) {
        if (ps.homeScore > ps.awayScore) homeSetsWon += 1;
        else if (ps.awayScore > ps.homeScore) awaySetsWon += 1;
      }
    }
    finalHomeScore = homeSetsWon;
    finalAwayScore = awaySetsWon;
  } else if (sheet.scoringModel === 'team_submatches' && sheet.subMatches) {
    finalHomeScore = sheet.subMatches.filter((sm) => sm.winnerSide === 'home').length;
    finalAwayScore = sheet.subMatches.filter((sm) => sm.winnerSide === 'away').length;
  }

  const activeSuspensions = sheet.activeSuspensions.filter((s) =>
    validEvents.some((e) => e.id === s.eventId)
  );

  const hasValidTimeoutInPeriod = validEvents.some(
    (e) => e.type === 'timeout' && e.periodNumber === sheet.timer.currentPeriod
  );
  const nextActiveTimeout = hasValidTimeoutInPeriod ? sheet.activeTimeout : null;

  return {
    match: {
      ...match,
      homeTeam: {
        ...match.homeTeam,
        score: finalHomeScore,
        setsWon: sheet.scoringModel === 'sets_points' ? homeSetsWon : match.homeTeam.setsWon,
      },
      awayTeam: {
        ...match.awayTeam,
        score: finalAwayScore,
        setsWon: sheet.scoringModel === 'sets_points' ? awaySetsWon : match.awayTeam.setsWon,
      },
    },
    sheet: {
      ...sheet,
      periodScores: nextPeriodScores,
      homeFoulsCurrentPeriod,
      awayFoulsCurrentPeriod,
      homeTimeoutsUsed,
      awayTimeoutsUsed,
      homeLineup,
      awayLineup,
      activeSuspensions,
      activeTimeout: nextActiveTimeout,
    },
  };
}

/**
 * Verifica se um evento pertence a um atleta exclusivamente por ID estável,
 * usando igualdade exata de nome+equipe apenas quando o evento antigo não possuir athleteId (Item 20 da Auditoria).
 */
function eventMatchesAthlete(
  ev: MatchEvent,
  athlete: Athlete,
  expectedSide?: 'home' | 'away'
): boolean {
  if (ev.athleteId) {
    return ev.athleteId === athlete.id;
  }
  if (expectedSide && ev.teamSide && ev.teamSide !== expectedSide) {
    return false;
  }
  if (
    ev.athleteName &&
    ev.athleteName.trim().toLowerCase() === athlete.name.trim().toLowerCase()
  ) {
    return true;
  }
  return false;
}

/**
 * Calcula as estatísticas básicas de um atleta em uma modalidade específica a partir das súmulas.
 */
export function computeAthleteModalityStats(
  athlete: Athlete,
  modalityId: ModalitySlug,
  matches: Match[],
  sheetsByMatchId: Record<string, MatchSheet>
): DerivedAthleteModalityStats {
  const modalityMatches = matches.filter((m) => m.modalityId === modalityId);

  let matchesPlayed = 0;
  let officialMatchesPlayed = 0;
  let liveMatchesPlayed = 0;
  let startersCount = 0;

  let goals = 0;
  let yellowCards = 0;
  let redCards = 0;
  let suspensions2Min = 0;

  let pointsTotal = 0;
  let baskets3Pt = 0;
  let baskets2Pt = 0;
  let freeThrows1Pt = 0;
  let fouls = 0;

  let setsParticipated = 0;
  let teamWinsInVolley = 0;

  let subMatchesPlayed = 0;
  let subMatchesWon = 0;

  let heatsRaced = 0;
  let bestTimeMs: number | null = null;
  let bestPlacement: number | null = null;
  let podiumsCount = 0;

  const matchLogs: AthleteMatchLogItem[] = [];

  for (const match of modalityMatches) {
    const sheet = sheetsByMatchId[match.id];
    if (!sheet) continue;

    const isHomeTeamMatch = match.homeTeam.teamId === athlete.teamId;
    const isAwayTeamMatch = match.awayTeam.teamId === athlete.teamId;

    const inHomeLineup = sheet.homeLineup.find(
      (entry) =>
        entry.athleteId === athlete.id ||
        (!entry.athleteId &&
          isHomeTeamMatch &&
          entry.athleteName.trim().toLowerCase() === athlete.name.trim().toLowerCase())
    );
    const inAwayLineup = sheet.awayLineup.find(
      (entry) =>
        entry.athleteId === athlete.id ||
        (!entry.athleteId &&
          isAwayTeamMatch &&
          entry.athleteName.trim().toLowerCase() === athlete.name.trim().toLowerCase())
    );

    const expectedSide: 'home' | 'away' | undefined = inHomeLineup
      ? 'home'
      : inAwayLineup
      ? 'away'
      : isHomeTeamMatch
      ? 'home'
      : isAwayTeamMatch
      ? 'away'
      : undefined;

    const validEvents = getValidUniqueEvents(sheet.events);
    const athleteEvents = validEvents.filter((ev) =>
      eventMatchesAthlete(ev, athlete, expectedSide)
    );

    // Natação: verifica raias por athleteId exato (ou nome exato se não houver ID)
    const swimLane = (sheet.swimmingLanes || []).find(
      (l) =>
        l.athleteId === athlete.id ||
        (!l.athleteId &&
          l.athleteName.trim().toLowerCase() === athlete.name.trim().toLowerCase())
    );

    // Tênis de Mesa: verifica sub-partidas por athleteId exato (sem `.includes()` que causava colisão "Ana"/"Mariana")
    const ttSubs = (sheet.subMatches || []).filter(
      (sm) =>
        sm.homeAthleteId === athlete.id ||
        sm.awayAthleteId === athlete.id ||
        (!sm.homeAthleteId &&
          sm.homeAthleteName.trim().toLowerCase() ===
            athlete.name.trim().toLowerCase()) ||
        (!sm.awayAthleteId &&
          sm.awayAthleteName.trim().toLowerCase() ===
            athlete.name.trim().toLowerCase())
    );

    const participated =
      Boolean(inHomeLineup || inAwayLineup) ||
      athleteEvents.length > 0 ||
      Boolean(swimLane) ||
      ttSubs.length > 0;

    if (!participated) continue;

    const teamSide: 'home' | 'away' =
      inAwayLineup || (!inHomeLineup && isAwayTeamMatch) ? 'away' : 'home';
    const isStarter = Boolean(inHomeLineup?.isStarter || inAwayLineup?.isStarter);
    const hasMatchStarted =
      match.status === 'live' ||
      match.status === 'halftime' ||
      match.status === 'finished' ||
      validEvents.length > 0 ||
      Boolean(swimLane && swimLane.registeredTimeMs !== null);

    if (hasMatchStarted) {
      matchesPlayed += 1;
      if (match.status === 'finished' || sheet.isClosed) {
        officialMatchesPlayed += 1;
      } else if (match.status === 'live' || match.status === 'halftime') {
        liveMatchesPlayed += 1;
      }
      if (isStarter) {
        startersCount += 1;
      }
    }

    let matchGoals = 0;
    let matchPoints = 0;
    let match3Pt = 0;
    let match2Pt = 0;
    let match1Pt = 0;
    let matchYC = 0;
    let matchRC = 0;
    let matchSusp = 0;
    let matchFouls = 0;

    for (const ev of athleteEvents) {
      switch (ev.type) {
        case 'goal':
        case 'penalty_goal':
        case 'seven_meters':
        case 'direct_free_throw':
          matchGoals += 1;
          break;
        case 'point_3':
          match3Pt += 1;
          matchPoints += 3;
          break;
        case 'point_2':
          match2Pt += 1;
          matchPoints += 2;
          break;
        case 'point_1':
          match1Pt += 1;
          matchPoints += 1;
          break;
        case 'yellow_card':
          matchYC += 1;
          break;
        case 'red_card':
        case 'expulsion':
        case 'disqualification':
          matchRC += 1;
          break;
        case 'suspension_2min':
          matchSusp += 1;
          break;
        case 'foul':
        case 'technical_foul':
        case 'unsportsmanlike_foul':
          matchFouls += 1;
          break;
        default:
          break;
      }
    }

    goals += matchGoals;
    pointsTotal += matchPoints;
    baskets3Pt += match3Pt;
    baskets2Pt += match2Pt;
    freeThrows1Pt += match1Pt;
    yellowCards += matchYC;
    redCards += matchRC;
    suspensions2Min += matchSusp;
    fouls += matchFouls;

    let matchSets = 0;
    if (modalityId === 'volei' || modalityId === 'volei-de-praia') {
      matchSets = sheet.periodScores.filter(
        (ps) => ps.homeScore > 0 || ps.awayScore > 0 || ps.isFinished
      ).length;
      setsParticipated += matchSets;

      const homeScore = match.homeTeam.score ?? 0;
      const awayScore = match.awayTeam.score ?? 0;
      if (
        match.status === 'finished' &&
        ((teamSide === 'home' && homeScore > awayScore) ||
          (teamSide === 'away' && awayScore > homeScore))
      ) {
        teamWinsInVolley += 1;
      }
    }

    let matchSubWins = 0;
    if (ttSubs.length > 0) {
      for (const sm of ttSubs) {
        const isHomeSub =
          sm.homeAthleteId === athlete.id ||
          (!sm.homeAthleteId &&
            sm.homeAthleteName.trim().toLowerCase() ===
              athlete.name.trim().toLowerCase());
        if (sm.status === 'finished' || sm.homeSetsWon > 0 || sm.awaySetsWon > 0) {
          subMatchesPlayed += 1;
          if (
            (isHomeSub && sm.winnerSide === 'home') ||
            (!isHomeSub && sm.winnerSide === 'away')
          ) {
            subMatchesWon += 1;
            matchSubWins += 1;
          }
        }
      }
    }

    let matchSwimFormatted: string | null = null;
    let matchSwimPlacement: number | null = null;
    if (swimLane && swimLane.registeredTimeMs !== null && swimLane.status === 'finished') {
      heatsRaced += 1;
      matchSwimFormatted =
        swimLane.formattedTime || formatMsToSwimmingTime(swimLane.registeredTimeMs);
      matchSwimPlacement = swimLane.placement;
      if (bestTimeMs === null || swimLane.registeredTimeMs < bestTimeMs) {
        bestTimeMs = swimLane.registeredTimeMs;
      }
      if (swimLane.placement !== null) {
        if (bestPlacement === null || swimLane.placement < bestPlacement) {
          bestPlacement = swimLane.placement;
        }
        if (swimLane.placement >= 1 && swimLane.placement <= 3) {
          podiumsCount += 1;
        }
      }
    }

    const teamSlot = teamSide === 'home' ? match.homeTeam : match.awayTeam;
    const oppSlot = teamSide === 'home' ? match.awayTeam : match.homeTeam;

    matchLogs.push({
      matchId: match.id,
      modalityId: match.modalityId,
      modalityName: match.modalityName,
      phaseLabel: match.phaseLabel,
      status: match.status,
      isOfficialValidated: match.status === 'finished' && sheet.isClosed,
      scheduledDate: match.scheduledDate,
      teamSide,
      teamName: teamSlot.teamName || 'Equipe',
      opponentName: oppSlot.teamName || 'Adversário',
      teamScore: teamSlot.score,
      opponentScore: oppSlot.score,
      isStarter,
      goals: matchGoals,
      pointsTotal: matchPoints,
      baskets3Pt: match3Pt,
      baskets2Pt: match2Pt,
      freeThrows1Pt: match1Pt,
      yellowCards: matchYC,
      redCards: matchRC,
      suspensions2Min: matchSusp,
      fouls: matchFouls,
      setsParticipated: matchSets,
      subMatchesWon: matchSubWins,
      bestSwimmingTimeFormatted: matchSwimFormatted,
      swimmingPlacement: matchSwimPlacement,
    });
  }

  return {
    athleteId: athlete.id,
    modalityId,
    matchesPlayed,
    officialMatchesPlayed,
    liveMatchesPlayed,
    startersCount,
    goals,
    yellowCards,
    redCards,
    suspensions2Min,
    pointsTotal,
    baskets3Pt,
    baskets2Pt,
    freeThrows1Pt,
    fouls,
    setsParticipated,
    teamWinsInVolley,
    subMatchesPlayed,
    subMatchesWon,
    heatsRaced,
    bestTimeMs,
    bestTimeFormatted: bestTimeMs !== null ? formatMsToSwimmingTime(bestTimeMs) : null,
    podiumsCount,
    bestPlacement,
    matchLogs,
  };
}

/**
 * Calcula as estatísticas coletivas de uma equipe (Período) a partir das partidas e súmulas.
 */
export function computeTeamStats(
  team: Team,
  matches: Match[],
  sheetsByMatchId: Record<string, MatchSheet>,
  modalityFilter?: ModalitySlug
): DerivedTeamStats {
  const teamMatches = matches.filter((m) => {
    if (modalityFilter && m.modalityId !== modalityFilter) return false;
    return (
      m.homeTeam.teamId === team.id ||
      m.awayTeam.teamId === team.id ||
      m.homeTeam.teamName === team.name ||
      m.awayTeam.teamName === team.name
    );
  });

  let matchesPlayed = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsOrPointsFor = 0;
  let goalsOrPointsAgainst = 0;
  let yellowCards = 0;
  let redCards = 0;

  const recentCapsules: TeamRecentMatchCapsule[] = [];

  for (const match of teamMatches) {
    const isHome =
      match.homeTeam.teamId === team.id || match.homeTeam.teamName === team.name;
    const mySlot = isHome ? match.homeTeam : match.awayTeam;
    const oppSlot = isHome ? match.awayTeam : match.homeTeam;
    const mySide: 'home' | 'away' = isHome ? 'home' : 'away';

    const myScore = mySlot.score ?? 0;
    const oppScore = oppSlot.score ?? 0;

    let outcome: TeamRecentMatchCapsule['outcome'] = 'PENDING';

    if (match.status === 'finished') {
      matchesPlayed += 1;
      goalsOrPointsFor += myScore;
      goalsOrPointsAgainst += oppScore;

      if (myScore > oppScore) {
        wins += 1;
        outcome = 'W';
      } else if (myScore < oppScore) {
        losses += 1;
        outcome = 'L';
      } else {
        draws += 1;
        outcome = 'D';
      }
    }

    const sheet = sheetsByMatchId[match.id];
    if (sheet) {
      const validEvents = getValidUniqueEvents(sheet.events);
      for (const ev of validEvents) {
        if (ev.teamSide !== mySide) continue;
        if (ev.type === 'yellow_card') yellowCards += 1;
        if (
          ev.type === 'red_card' ||
          ev.type === 'expulsion' ||
          ev.type === 'disqualification'
        ) {
          redCards += 1;
        }
      }
    }

    recentCapsules.push({
      matchId: match.id,
      modalityId: match.modalityId,
      modalityName: match.modalityName,
      opponentName: oppSlot.teamName || 'Adversário',
      opponentCrestUrl: oppSlot.crestUrl,
      teamScore: mySlot.score,
      opponentScore: oppSlot.score,
      status: match.status,
      outcome,
    });
  }

  // Pega as 5 partidas mais recentes (priorizando jogos ao vivo ou encerrados mais recentes — Item 30 da Auditoria)
  const orderedCapsules = [...recentCapsules].reverse().slice(0, 5);

  return {
    teamId: team.id,
    teamName: team.name,
    crestUrl: team.crestUrl,
    matchesPlayed,
    wins,
    draws,
    losses,
    goalsOrPointsFor,
    goalsOrPointsAgainst,
    yellowCards,
    redCards,
    recentCapsules: orderedCapsules,
  };
}

/**
 * Gera a Tabela de Classificação (Standings) automaticamente a partir das partidas da fase classificatória.
 * Corrige o Item 19 da Auditoria:
 * - Contabiliza apenas partidas finalizadas (`status === 'finished'`) da fase de grupos (`phase === 'group_stage'`);
 * - Aplica pontuação específica por modalidade (Vôlei: 2x0=3pts, 2x1=2pts/1pt; Basquete: V=2pts, D=1pt; Futsal/Handebol: 3/1/0);
 * - Inclui critério de desempate por Confronto Direto entre duas equipes empatadas em pontos.
 */
export function computeModalityStandings(
  modalityId: ModalitySlug | 'all',
  teams: Team[],
  matches: Match[]
): StandingEntry[] {
  const filteredMatches =
    modalityId === 'all'
      ? matches
      : matches.filter((m) => m.modalityId === modalityId);

  const map = new Map<string, StandingEntry>();

  for (const team of teams) {
    if (modalityId !== 'all' && !team.modalityIds.includes(modalityId)) continue;
    map.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      crestUrl: team.crestUrl,
      position: 0,
      points: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      scoreFor: 0,
      scoreAgainst: 0,
      scoreDifference: 0,
    });
  }

  // Registra confronto direto: headToHead.get(`${teamA}__${teamB}`) = pontos de A contra B
  const headToHeadPoints = new Map<string, number>();
  const addH2H = (teamA: string, teamB: string, ptsA: number) => {
    const key = `${teamA}__${teamB}`;
    headToHeadPoints.set(key, (headToHeadPoints.get(key) || 0) + ptsA);
  };

  for (const match of filteredMatches) {
    // Apenas jogos encerrados da fase classificatória entram na tabela de grupos
    if (match.status !== 'finished') continue;
    if (match.phase && match.phase !== 'group_stage') continue;

    const homeKey = match.homeTeam.teamId || match.homeTeam.teamName || '';
    const awayKey = match.awayTeam.teamId || match.awayTeam.teamName || '';
    if (!homeKey || !awayKey) continue;

    if (!map.has(homeKey)) {
      map.set(homeKey, {
        teamId: homeKey,
        teamName: match.homeTeam.teamName || homeKey,
        crestUrl: match.homeTeam.crestUrl,
        position: 0,
        points: 0,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        scoreFor: 0,
        scoreAgainst: 0,
        scoreDifference: 0,
      });
    }
    if (!map.has(awayKey)) {
      map.set(awayKey, {
        teamId: awayKey,
        teamName: match.awayTeam.teamName || awayKey,
        crestUrl: match.awayTeam.crestUrl,
        position: 0,
        points: 0,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        scoreFor: 0,
        scoreAgainst: 0,
        scoreDifference: 0,
      });
    }

    const homeRow = map.get(homeKey)!;
    const awayRow = map.get(awayKey)!;

    const hScore = match.homeTeam.score ?? 0;
    const aScore = match.awayTeam.score ?? 0;

    homeRow.played += 1;
    awayRow.played += 1;
    homeRow.scoreFor += hScore;
    homeRow.scoreAgainst += aScore;
    awayRow.scoreFor += aScore;
    awayRow.scoreAgainst += hScore;
    homeRow.scoreDifference = homeRow.scoreFor - homeRow.scoreAgainst;
    awayRow.scoreDifference = awayRow.scoreFor - awayRow.scoreAgainst;

    const isVolley =
      match.modalityId === 'volei' || match.modalityId === 'volei-de-praia';
    const isBasketball = match.modalityId === 'basquete';

    if (hScore > aScore) {
      homeRow.won += 1;
      awayRow.lost += 1;
      if (isVolley) {
        // Vôlei (melhor de 3 ou 5): vitória por 2x1 ou 3x2 dá 2 pts ao vencedor e 1 pt ao perdedor; 2x0 ou 3x0/3x1 dá 3 pts e 0 pt
        const isTiebreakSetWin = hScore - aScore === 1 && aScore >= 1;
        const winPts = isTiebreakSetWin ? 2 : 3;
        const losePts = isTiebreakSetWin ? 1 : 0;
        homeRow.points += winPts;
        awayRow.points += losePts;
        addH2H(homeKey, awayKey, winPts);
        addH2H(awayKey, homeKey, losePts);
      } else if (isBasketball) {
        // FIBA: 2 pontos por vitória, 1 ponto por derrota jogada
        homeRow.points += 2;
        awayRow.points += 1;
        addH2H(homeKey, awayKey, 2);
        addH2H(awayKey, homeKey, 1);
      } else {
        homeRow.points += 3;
        addH2H(homeKey, awayKey, 3);
      }
    } else if (aScore > hScore) {
      awayRow.won += 1;
      homeRow.lost += 1;
      if (isVolley) {
        const isTiebreakSetWin = aScore - hScore === 1 && hScore >= 1;
        const winPts = isTiebreakSetWin ? 2 : 3;
        const losePts = isTiebreakSetWin ? 1 : 0;
        awayRow.points += winPts;
        homeRow.points += losePts;
        addH2H(awayKey, homeKey, winPts);
        addH2H(homeKey, awayKey, losePts);
      } else if (isBasketball) {
        awayRow.points += 2;
        homeRow.points += 1;
        addH2H(awayKey, homeKey, 2);
        addH2H(homeKey, awayKey, 1);
      } else {
        awayRow.points += 3;
        addH2H(awayKey, homeKey, 3);
      }
    } else {
      homeRow.drawn += 1;
      awayRow.drawn += 1;
      homeRow.points += 1;
      awayRow.points += 1;
      addH2H(homeKey, awayKey, 1);
      addH2H(awayKey, homeKey, 1);
    }
  }

  const rows = Array.from(map.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    // 1º Desempate: Confronto direto
    const aVsB = headToHeadPoints.get(`${a.teamId}__${b.teamId}`) || 0;
    const bVsA = headToHeadPoints.get(`${b.teamId}__${a.teamId}`) || 0;
    if (aVsB !== bVsA) return bVsA - aVsB;
    // 2º Desempate: Número de vitórias
    if (b.won !== a.won) return b.won - a.won;
    // 3º Desempate: Saldo de gols/pontos/sets
    if (b.scoreDifference !== a.scoreDifference) {
      return b.scoreDifference - a.scoreDifference;
    }
    // 4º Desempate: Gols/Pontos pró
    if (b.scoreFor !== a.scoreFor) return b.scoreFor - a.scoreFor;
    return a.teamName.localeCompare(b.teamName);
  });

  return rows.map((row, idx) => ({
    ...row,
    position: idx + 1,
  }));
}

export function computeModalityLeaderboard(
  modalityId: ModalitySlug,
  athletes: Athlete[],
  teams: Team[],
  matches: Match[],
  sheetsByMatchId: Record<string, MatchSheet>
): { title: string; metricUnit: string; entries: LeaderboardEntry[] } {
  const teamMap = new Map<string, Team>(teams.map((t) => [t.id, t]));
  const rawEntries: LeaderboardEntry[] = [];

  for (const athlete of athletes) {
    if (!athlete.modalityIds.includes(modalityId)) continue;
    const stats = computeAthleteModalityStats(
      athlete,
      modalityId,
      matches,
      sheetsByMatchId
    );
    const team = teamMap.get(athlete.teamId);
    const teamName = team?.name || 'Período';
    const teamCrestUrl = team?.crestUrl || null;

    if (modalityId === 'futsal' || modalityId === 'handebol') {
      if (stats.goals <= 0) continue;
      rawEntries.push({
        rank: 0,
        athleteId: athlete.id,
        athleteName: athlete.name,
        avatarUrl: athlete.avatarUrl,
        jerseyNumber: athlete.jerseyNumber,
        teamId: athlete.teamId,
        teamName,
        teamCrestUrl,
        modalityId,
        matchesPlayed: stats.matchesPlayed,
        primaryValue: stats.goals,
        primaryDisplay: `${stats.goals} ${stats.goals === 1 ? 'gol' : 'gols'}`,
        secondaryDisplay: `${stats.matchesPlayed} ${
          stats.matchesPlayed === 1 ? 'jogo' : 'jogos'
        }`,
        hasLivePartial: stats.liveMatchesPlayed > 0,
      });
    } else if (modalityId === 'basquete') {
      if (stats.pointsTotal <= 0) continue;
      rawEntries.push({
        rank: 0,
        athleteId: athlete.id,
        athleteName: athlete.name,
        avatarUrl: athlete.avatarUrl,
        jerseyNumber: athlete.jerseyNumber,
        teamId: athlete.teamId,
        teamName,
        teamCrestUrl,
        modalityId,
        matchesPlayed: stats.matchesPlayed,
        primaryValue: stats.pointsTotal,
        primaryDisplay: `${stats.pointsTotal} pts`,
        secondaryDisplay: `${stats.baskets3Pt}x 3Pts • ${stats.baskets2Pt}x 2Pts`,
        hasLivePartial: stats.liveMatchesPlayed > 0,
      });
    } else if (modalityId === 'natacao') {
      if (stats.bestTimeMs === null) continue;
      rawEntries.push({
        rank: 0,
        athleteId: athlete.id,
        athleteName: athlete.name,
        avatarUrl: athlete.avatarUrl,
        jerseyNumber: athlete.jerseyNumber,
        teamId: athlete.teamId,
        teamName,
        teamCrestUrl,
        modalityId,
        matchesPlayed: stats.heatsRaced,
        primaryValue: stats.bestTimeMs,
        primaryDisplay: stats.bestTimeFormatted || '--:--.--',
        secondaryDisplay: stats.bestPlacement
          ? `${stats.bestPlacement}º lugar na bateria`
          : 'Tempo oficial',
        hasLivePartial: stats.liveMatchesPlayed > 0,
      });
    } else if (modalityId === 'tenis-de-mesa') {
      if (stats.subMatchesWon <= 0 && stats.subMatchesPlayed <= 0) continue;
      rawEntries.push({
        rank: 0,
        athleteId: athlete.id,
        athleteName: athlete.name,
        avatarUrl: athlete.avatarUrl,
        jerseyNumber: athlete.jerseyNumber,
        teamId: athlete.teamId,
        teamName,
        teamCrestUrl,
        modalityId,
        matchesPlayed: stats.subMatchesPlayed,
        primaryValue: stats.subMatchesWon,
        primaryDisplay: `${stats.subMatchesWon} ${
          stats.subMatchesWon === 1 ? 'vitória' : 'vitórias'
        }`,
        secondaryDisplay: `${stats.subMatchesPlayed} jogos individuais`,
        hasLivePartial: stats.liveMatchesPlayed > 0,
      });
    } else if (modalityId === 'volei' || modalityId === 'volei-de-praia') {
      if (stats.setsParticipated <= 0) continue;
      rawEntries.push({
        rank: 0,
        athleteId: athlete.id,
        athleteName: athlete.name,
        avatarUrl: athlete.avatarUrl,
        jerseyNumber: athlete.jerseyNumber,
        teamId: athlete.teamId,
        teamName,
        teamCrestUrl,
        modalityId,
        matchesPlayed: stats.matchesPlayed,
        primaryValue: stats.setsParticipated,
        primaryDisplay: `${stats.setsParticipated} sets`,
        secondaryDisplay: `${stats.matchesPlayed} ${
          stats.matchesPlayed === 1 ? 'partida' : 'partidas'
        } na quadra`,
        hasLivePartial: stats.liveMatchesPlayed > 0,
      });
    }
  }

  rawEntries.sort((a, b) => {
    if (modalityId === 'natacao') {
      if (a.primaryValue !== b.primaryValue) {
        return a.primaryValue - b.primaryValue;
      }
    } else {
      if (b.primaryValue !== a.primaryValue) {
        return b.primaryValue - a.primaryValue;
      }
    }
    if (a.matchesPlayed !== b.matchesPlayed) {
      return a.matchesPlayed - b.matchesPlayed;
    }
    return a.athleteName.localeCompare(b.athleteName);
  });

  const entries = rawEntries.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));

  const metaByModality: Record<
    ModalitySlug,
    { title: string; metricUnit: string }
  > = {
    futsal: { title: 'Artilharia do Futsal', metricUnit: 'Gols Marcados' },
    handebol: { title: 'Artilharia do Handebol', metricUnit: 'Gols Marcados' },
    basquete: { title: 'Cestinhas do Basquete', metricUnit: 'Pontos Convertidos' },
    natacao: { title: 'Melhores Tempos Oficiais', metricUnit: 'Cronometragem' },
    'tenis-de-mesa': {
      title: 'Destaques Individuais • Tênis de Mesa',
      metricUnit: 'Vitórias Individuais',
    },
    volei: {
      title: 'Participação em Quadra • Vôlei (Coletivo)',
      metricUnit: 'Sets Disputados',
    },
    'volei-de-praia': {
      title: 'Participação • Vôlei de Praia (Duplas)',
      metricUnit: 'Sets Disputados',
    },
    truco: { title: 'Destaques do Truco', metricUnit: 'Partidas' },
    sinuca: { title: 'Destaques da Sinuca', metricUnit: 'Partidas' },
    poker: { title: 'Destaques do Poker', metricUnit: 'Mesas' },
  };

  return {
    title: metaByModality[modalityId].title,
    metricUnit: metaByModality[modalityId].metricUnit,
    entries,
  };
}
