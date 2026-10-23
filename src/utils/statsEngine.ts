import {
  Athlete,
  AthleteMatchLogItem,
  DerivedAthleteModalityStats,
  DerivedTeamStats,
  LeaderboardEntry,
  Match,
  MatchEvent,
  MatchSheet,
  ModalitySlug,
  StandingEntry,
  Team,
  TeamRecentMatchCapsule,
} from '../types/domain';
import { formatMsToSwimmingTime } from '../data/sportRulesConfig';

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
 * Verifica se um evento pertence a um atleta (por ID estável ou fallback seguro de nome+camisa na escalação).
 */
function eventMatchesAthlete(
  ev: MatchEvent,
  athleteId: string,
  athleteName?: string
): boolean {
  if (ev.athleteId && ev.athleteId === athleteId) return true;
  if (
    !ev.athleteId &&
    athleteName &&
    ev.athleteName &&
    ev.athleteName.trim().toLowerCase() === athleteName.trim().toLowerCase()
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

    const inHomeLineup = sheet.homeLineup.find(
      (entry) =>
        entry.athleteId === athlete.id ||
        entry.athleteName.trim().toLowerCase() === athlete.name.trim().toLowerCase()
    );
    const inAwayLineup = sheet.awayLineup.find(
      (entry) =>
        entry.athleteId === athlete.id ||
        entry.athleteName.trim().toLowerCase() === athlete.name.trim().toLowerCase()
    );

    const validEvents = getValidUniqueEvents(sheet.events);
    const athleteEvents = validEvents.filter((ev) =>
      eventMatchesAthlete(ev, athlete.id, athlete.name)
    );

    // Natação: verifica raias
    const swimLane = (sheet.swimmingLanes || []).find(
      (l) =>
        l.athleteId === athlete.id ||
        l.athleteName.trim().toLowerCase() === athlete.name.trim().toLowerCase()
    );

    // Tênis de Mesa: verifica sub-partidas
    const ttSubs = (sheet.subMatches || []).filter(
      (sm) =>
        sm.homeAthleteId === athlete.id ||
        sm.awayAthleteId === athlete.id ||
        sm.homeAthleteName.toLowerCase().includes(athlete.name.toLowerCase()) ||
        sm.awayAthleteName.toLowerCase().includes(athlete.name.toLowerCase())
    );

    const participated =
      Boolean(inHomeLineup || inAwayLineup) ||
      athleteEvents.length > 0 ||
      Boolean(swimLane) ||
      ttSubs.length > 0;

    if (!participated) continue;

    const teamSide: 'home' | 'away' = inAwayLineup ? 'away' : 'home';
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

    // Contabiliza eventos básicos daquela partida
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

    // Vôlei e Vôlei de Praia: apenas participação coletiva em sets (sem pontos individuais)
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

    // Tênis de Mesa: sub-partidas individuais
    let matchSubWins = 0;
    if (ttSubs.length > 0) {
      for (const sm of ttSubs) {
        const isHomeSub =
          sm.homeAthleteId === athlete.id ||
          sm.homeAthleteName.toLowerCase().includes(athlete.name.toLowerCase());
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

    // Natação: tempo de raia e colocação
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

    if (
      match.status === 'finished' ||
      match.status === 'live' ||
      match.status === 'halftime'
    ) {
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
    recentCapsules: recentCapsules.slice(0, 5),
  };
}

/**
 * Gera a Tabela de Classificação (Standings) automaticamente a partir das partidas da modalidade.
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

  // Inicializa equipes inscritas na modalidade
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

  for (const match of filteredMatches) {
    if (
      match.status !== 'finished' &&
      match.status !== 'live' &&
      match.status !== 'halftime'
    ) {
      continue;
    }

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

    if (hScore > aScore) {
      homeRow.won += 1;
      homeRow.points += 3;
      awayRow.lost += 1;
    } else if (aScore > hScore) {
      awayRow.won += 1;
      awayRow.points += 3;
      homeRow.lost += 1;
    } else {
      homeRow.drawn += 1;
      awayRow.drawn += 1;
      homeRow.points += 1;
      awayRow.points += 1;
    }
  }

  const rows = Array.from(map.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.won !== a.won) return b.won - a.won;
    if (b.scoreDifference !== a.scoreDifference) {
      return b.scoreDifference - a.scoreDifference;
    }
    if (b.scoreFor !== a.scoreFor) return b.scoreFor - a.scoreFor;
    return a.teamName.localeCompare(b.teamName);
  });

  return rows.map((row, idx) => ({
    ...row,
    position: idx + 1,
  }));
}

/**
 * Calcula o Ranking de Atletas (Leaderboard) básico e objetivo para a modalidade selecionada:
 * - Futsal / Handebol: Artilharia (Gols marcados);
 * - Basquete: Cestinhas (Pontos Totais e Cestas de 3 Pts);
 * - Natação: Melhores Tempos Oficiais (menor tempo em ms);
 * - Tênis de Mesa: Mais Vitórias Individuais;
 * - Vôlei / Vôlei de Praia: Participação em Sets/Vitórias coletivas (sem pontos individuais fictícios).
 */
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

  // Ordenação específica: Natação ordena pelo menor tempo; demais pelo maior valor
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
