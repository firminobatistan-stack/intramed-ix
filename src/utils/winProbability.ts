import { Match, MatchSheet } from '../types/domain';

export interface WinProbabilityResult {
  homePct: number;
  drawPct: number;
  awayPct: number;
  supportsDraw: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calcula a probabilidade percentual de vitória de cada equipe (e empate quando aplicável)
 * com base no placar atual, na modalidade e no andamento/tempo da partida.
 */
export function computeLiveWinProbability(
  match?: Match | null,
  sheet?: MatchSheet | null
): WinProbabilityResult {
  if (!match) {
    return { homePct: 50, drawPct: 0, awayPct: 50, supportsDraw: false };
  }

  const scoringModel =
    sheet?.scoringModel ||
    (match.modalityId === 'volei' || match.modalityId === 'volei-de-praia'
      ? 'sets_points'
      : match.modalityId === 'basquete'
      ? 'points_quarters'
      : 'goals_timed');

  const supportsDraw =
    scoringModel === 'goals_timed' || scoringModel === 'modular_table';

  const homeScore = match.homeTeam.score ?? 0;
  const awayScore = match.awayTeam.score ?? 0;

  // Partida encerrada: resultado definitivo
  if (match.status === 'finished') {
    if (homeScore > awayScore) {
      return { homePct: 100, drawPct: 0, awayPct: 0, supportsDraw };
    }
    if (awayScore > homeScore) {
      return { homePct: 0, drawPct: 0, awayPct: 100, supportsDraw };
    }
    return supportsDraw
      ? { homePct: 0, drawPct: 100, awayPct: 0, supportsDraw }
      : { homePct: 50, drawPct: 0, awayPct: 50, supportsDraw: false };
  }

  // Partida ainda não iniciada
  if (match.status === 'scheduled') {
    return supportsDraw
      ? { homePct: 38, drawPct: 24, awayPct: 38, supportsDraw: true }
      : { homePct: 50, drawPct: 0, awayPct: 50, supportsDraw: false };
  }

  // Progresso estimado da partida (0.0 -> 1.0)
  let progress = 0.25;
  if (sheet?.timer) {
    const totalPeriods = Math.max(1, sheet.timer.totalPeriods || 2);
    const currentPeriod = clamp(sheet.timer.currentPeriod || 1, 1, totalPeriods);
    const initialSec = Math.max(1, sheet.timer.initialPeriodSeconds || 600);
    const periodProgress = clamp(
      (sheet.timer.elapsedSeconds ??
        initialSec - (sheet.timer.remainingSeconds ?? initialSec)) /
        initialSec,
      0,
      1
    );

    progress = clamp(
      (currentPeriod - 1 + periodProgress) / totalPeriods,
      0.04,
      0.98
    );
  }

  // Modalidades de Sets (Vôlei / Vôlei de Praia): sem empate
  if (scoringModel === 'sets_points') {
    const setDiff = homeScore - awayScore;
    const currentPeriodNum = sheet?.timer?.currentPeriod || 1;
    const currentSetObj =
      sheet?.periodScores?.find((p) => p.periodNumber === currentPeriodNum) ||
      sheet?.periodScores?.[0];
    const setPointDiff =
      (currentSetObj?.homeScore ?? 0) - (currentSetObj?.awayScore ?? 0);

    const logit = setDiff * 1.75 + setPointDiff * 0.14;
    const rawHome = 1 / (1 + Math.exp(-logit));
    const homePct = clamp(Math.round(rawHome * 100), 2, 98);
    return {
      homePct,
      drawPct: 0,
      awayPct: 100 - homePct,
      supportsDraw: false,
    };
  }

  const diff = homeScore - awayScore;

  // Basquete / Pontos por quarto (empate muito raro)
  if (scoringModel === 'points_quarters') {
    const scale = 0.11 + progress * 0.22;
    const rawDraw =
      diff === 0 ? 0.06 + 0.08 * progress : 0.04 * Math.exp(-0.18 * diff * diff);
    const winPool = 1 - rawDraw;
    const homeShare = 1 / (1 + Math.exp(-scale * diff));

    const drawPct = Math.round(rawDraw * 100);
    const homePct = clamp(Math.round(winPool * homeShare * 100), 1, 99 - drawPct);
    const awayPct = Math.max(0, 100 - drawPct - homePct);
    return { homePct, drawPct, awayPct, supportsDraw: false };
  }

  // Futsal / Handebol / Gols cronometrados (com empate possível)
  const k = 0.78 + progress * 1.18;
  const rawDraw =
    diff === 0
      ? 0.26 + 0.34 * progress
      : 0.24 * (1 - 0.65 * progress) * Math.exp(-0.55 * diff * diff);

  const drawPct = clamp(Math.round(rawDraw * 100), 1, 70);
  const winPool = 100 - drawPct;
  const homeShare = 1 / (1 + Math.exp(-k * diff));

  const homePct = clamp(Math.round(winPool * homeShare), 1, winPool - 1);
  const awayPct = Math.max(1, winPool - homePct);

  return { homePct, drawPct, awayPct, supportsDraw: true };
}
