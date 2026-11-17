import {
  MatchLineupEntry,
  MatchSheet,
  VolleyballSetRotationConfig,
} from '../types/domain';
import { getEventPointsDelta, getValidUniqueEvents } from './statsEngine';

export interface DerivedVolleyballRotationState {
  setNumber: number;
  initialServingSide: 'home' | 'away';
  currentServingSide: 'home' | 'away';
  /** Posições em quadra no momento atual: [P1 (Saque), P2, P3, P4, P5, P6] */
  homeCourt: Array<MatchLineupEntry | null>;
  awayCourt: Array<MatchLineupEntry | null>;
  /** Ordem inicial (0x0) do set: [P1, P2, P3, P4, P5, P6] */
  homeInitialCourt: Array<MatchLineupEntry | null>;
  awayInitialCourt: Array<MatchLineupEntry | null>;
  currentServer: MatchLineupEntry | null;
  homeRotationsCount: number;
  awayRotationsCount: number;
  pointsPlayedInSet: number;
  isConfigured: boolean;
}

/**
 * Rotaciona 6 posições de quadra no sentido horário oficial (Regras FIVB 7.6.2 / 12.2.2.2):
 * P2 -> P1 (vai para o saque), P3 -> P2, P4 -> P3, P5 -> P4, P6 -> P5, P1 -> P6.
 */
export function rotateVolleyballPositionsClockwise<T>(
  positions: [T, T, T, T, T, T] | T[]
): T[] {
  if (positions.length < 6) return [...positions];
  return [
    positions[1],
    positions[2],
    positions[3],
    positions[4],
    positions[5],
    positions[0],
  ];
}

/**
 * Monta o array inicial de 6 athleteIds [P1..P6] de uma equipe,
 * respeitando a configuração salva do set e preenchendo eventuais vagas vazias com titulares da escalação.
 */
export function resolveSixStartingIds(
  savedOrder: Array<string | null> | undefined,
  lineup: MatchLineupEntry[]
): Array<string | null> {
  const validAthleteIds = new Set(lineup.map((l) => l.athleteId));
  const result: Array<string | null> = [null, null, null, null, null, null];
  const used = new Set<string>();

  if (Array.isArray(savedOrder)) {
    for (let i = 0; i < 6; i++) {
      const candidate = savedOrder[i] || null;
      if (candidate && validAthleteIds.has(candidate) && !used.has(candidate)) {
        result[i] = candidate;
        used.add(candidate);
      }
    }
  }

  // Preenche slots vazios automaticamente com titulares (ou atletas escalados) ainda não alocados
  const startersFirst = [
    ...lineup.filter((l) => l.isStarter && !l.isDisqualified),
    ...lineup.filter((l) => !l.isStarter && !l.isDisqualified),
  ];

  for (let i = 0; i < 6; i++) {
    if (!result[i]) {
      const nextAvailable = startersFirst.find((l) => !used.has(l.athleteId));
      if (nextAvailable) {
        result[i] = nextAvailable.athleteId;
        used.add(nextAvailable.athleteId);
      }
    }
  }

  return result;
}

/**
 * Calcula de forma 100% determinística a rotação atual da quadra de Voleibol
 * a partir da formação inicial do set e do replay cronológico de pontos e substituições.
 *
 * Regras Oficiais FIVB / CBV implementadas:
 * - Regra 7.1.2: No Set 2 (e alternadamente nos sets seguintes antes do tie-break), o 1º saque padrão alterna em relação ao Set 1.
 * - Regra 7.6 & 12.2.1: No início do set (0 × 0), saca o atleta posicionado em P1 (Zona I — Defesa Direita) da equipe com o 1º saque, SEM rodar antes do primeiro ponto.
 * - Regra 12.2.2.1 (Break point): Se a equipe que já estava sacando marca o ponto, NINGUÉM roda e o mesmo atleta em P1 continua sacando.
 * - Regra 12.2.2.2 (Side-out / Recuperação de saque): Se a equipe recebedora ganha o rali, ela conquista o direito ao saque e RODA 1 posição no sentido horário (P2 -> P1, P3 -> P2, P4 -> P3, P5 -> P4, P6 -> P5, P1 -> P6) antes de sacar. A outra equipe NÃO roda.
 * - Regra 15.5 (Substituição): O atleta substituto assume exatamente a mesma posição na ordem de rotação do jogador substituído.
 */
export function computeLiveVolleyballRotation(
  sheet: MatchSheet,
  targetSetNumber?: number
): DerivedVolleyballRotationState {
  const setNumber = targetSetNumber ?? (sheet.timer.currentPeriod || 1);
  const configs = sheet.volleyballSetConfigs || {};
  const currentConfig: VolleyballSetRotationConfig | undefined = configs[setNumber];

  // Se o set atual ainda não teve o 1º saque configurado, alterna em relação ao Set 1 conforme Regra FIVB 7.1.2
  const set1InitialServer = configs[1]?.initialServingSide || 'home';
  const defaultInitialServer: 'home' | 'away' =
    setNumber % 2 === 0
      ? set1InitialServer === 'home'
        ? 'away'
        : 'home'
      : set1InitialServer;

  const initialServingSide: 'home' | 'away' =
    currentConfig?.initialServingSide || defaultInitialServer;

  const homeInitialIds = resolveSixStartingIds(
    currentConfig?.homeInitialOrder,
    sheet.homeLineup
  );
  const awayInitialIds = resolveSixStartingIds(
    currentConfig?.awayInitialOrder,
    sheet.awayLineup
  );

  const isConfigured = Boolean(
    currentConfig &&
      ((currentConfig.homeInitialOrder &&
        currentConfig.homeInitialOrder.some(Boolean)) ||
        (currentConfig.awayInitialOrder &&
          currentConfig.awayInitialOrder.some(Boolean)))
  );

  let homeIds = [...homeInitialIds];
  let awayIds = [...awayInitialIds];
  let currentServingSide: 'home' | 'away' = initialServingSide;
  let homeRotationsCount = 0;
  let awayRotationsCount = 0;
  let pointsPlayedInSet = 0;

  // Eventos em sheet.events são armazenados do mais recente para o mais antigo; invertemos para replay cronológico fiel
  const validSetEvents = getValidUniqueEvents(sheet.events)
    .filter((ev) => ev.periodNumber === setNumber)
    .reverse();

  for (const ev of validSetEvents) {
    // 1. Substituição: troca a posição exata na rotação
    if (
      ev.type === 'substitution' &&
      ev.teamSide &&
      ev.athleteId &&
      ev.secondaryAthleteId
    ) {
      if (ev.teamSide === 'home') {
        const outIdx = homeIds.findIndex((id) => id === ev.athleteId);
        if (outIdx >= 0 && !homeIds.includes(ev.secondaryAthleteId)) {
          homeIds[outIdx] = ev.secondaryAthleteId;
        }
      } else if (ev.teamSide === 'away') {
        const outIdx = awayIds.findIndex((id) => id === ev.athleteId);
        if (outIdx >= 0 && !awayIds.includes(ev.secondaryAthleteId)) {
          awayIds[outIdx] = ev.secondaryAthleteId;
        }
      }
      continue;
    }

    // 2. Ponto marcado no set
    const delta = getEventPointsDelta(ev);
    if (delta > 0 && (ev.teamSide === 'home' || ev.teamSide === 'away')) {
      for (let step = 0; step < delta; step++) {
        pointsPlayedInSet += 1;
        if (ev.teamSide !== currentServingSide) {
          // Side-out! Direito ao saque muda de lado e SOMENTE a equipe que ganhou o saque roda 1 posição no sentido horário
          currentServingSide = ev.teamSide;
          if (currentServingSide === 'home') {
            homeIds = rotateVolleyballPositionsClockwise(homeIds);
            homeRotationsCount += 1;
          } else {
            awayIds = rotateVolleyballPositionsClockwise(awayIds);
            awayRotationsCount += 1;
          }
        }
        // Break point (ev.teamSide === currentServingSide): ninguém roda, mesmo sacador permanece em P1
      }
    }
  }

  // 3. Ajuste manual eventual aplicado pela mesa/arbitragem
  const homeOffset = (((currentConfig?.homeManualRotationOffset ?? 0) % 6) + 6) % 6;
  for (let i = 0; i < homeOffset; i++) {
    homeIds = rotateVolleyballPositionsClockwise(homeIds);
  }

  const awayOffset = (((currentConfig?.awayManualRotationOffset ?? 0) % 6) + 6) % 6;
  for (let i = 0; i < awayOffset; i++) {
    awayIds = rotateVolleyballPositionsClockwise(awayIds);
  }

  const mapIdToLineup = (
    id: string | null,
    lineup: MatchLineupEntry[]
  ): MatchLineupEntry | null => {
    if (!id) return null;
    return lineup.find((a) => a.athleteId === id) || null;
  };

  const homeCourt = homeIds.map((id) => mapIdToLineup(id, sheet.homeLineup));
  const awayCourt = awayIds.map((id) => mapIdToLineup(id, sheet.awayLineup));
  const homeInitialCourt = homeInitialIds.map((id) =>
    mapIdToLineup(id, sheet.homeLineup)
  );
  const awayInitialCourt = awayInitialIds.map((id) =>
    mapIdToLineup(id, sheet.awayLineup)
  );

  const currentServer =
    currentServingSide === 'home' ? homeCourt[0] || null : awayCourt[0] || null;

  return {
    setNumber,
    initialServingSide,
    currentServingSide,
    homeCourt,
    awayCourt,
    homeInitialCourt,
    awayInitialCourt,
    currentServer,
    homeRotationsCount,
    awayRotationsCount,
    pointsPlayedInSet,
    isConfigured,
  };
}
