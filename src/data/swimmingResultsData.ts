export type SwimmingTeamId =
  | 'predadora'
  | 'tormenta'
  | 'sanguinaria'
  | 'colossal'
  | 'soberana';

export interface SwimmingResultRow {
  placement: number;
  name: string;
  teamId: SwimmingTeamId;
  timeDisplay: string;
  points: number;
  disqualified?: boolean;
}

export interface SwimmingEventResult {
  id: string;
  number: number;
  title: string;
  gender: 'feminino' | 'masculino';
  kind: 'individual' | 'revezamento';
  results: SwimmingResultRow[];
}

export interface SwimmingTeamSummary {
  position: number;
  teamId: SwimmingTeamId;
  teamName: string;
  femIndividualPts: number;
  femRelayPts: number;
  femTotalPts: number;
  mascIndividualPts: number;
  mascRelayPts: number;
  mascTotalPts: number;
  totalSwimmingPts: number;
  /** Pontuação padrão [10, 7, 4, 3, 0] × 1,5 aplicada na Classificação Geral */
  generalChampionshipPts: number;
  goldMedals: number;
  silverMedals: number;
  bronzeMedals: number;
}

export interface SwimmingIndividualRankingRow {
  rank: number;
  name: string;
  teamId: SwimmingTeamId;
  gender: 'feminino' | 'masculino';
  totalPoints: number;
  eventsCount: number;
  gold: number;
  silver: number;
  bronze: number;
  bestPlacement: number;
  eventsSummary: Array<{
    eventTitle: string;
    placement: number;
    timeDisplay: string;
    points: number;
    disqualified?: boolean;
  }>;
}

export const SWIMMING_TEAM_META: Record<
  SwimmingTeamId,
  { name: string; tag: string; color: string; crestUrl: string }
> = {
  predadora: {
    name: 'Predadora',
    tag: 'T22',
    color: '#18181B',
    crestUrl: '/assets/teams/predadora.jpg',
  },
  tormenta: {
    name: 'Tormenta',
    tag: 'T23',
    color: '#0369A1',
    crestUrl: '/assets/teams/tormenta.png',
  },
  sanguinaria: {
    name: 'Sanguinária',
    tag: 'T21',
    color: '#B91C1C',
    crestUrl: '/assets/teams/sanguinaria.jpg',
  },
  colossal: {
    name: 'Colossal',
    tag: 'T24',
    color: '#047857',
    crestUrl: '/assets/teams/colossal.jpg',
  },
  soberana: {
    name: 'Soberana',
    tag: 'T25',
    color: '#9F1239',
    crestUrl: '/assets/teams/soberana.png',
  },
};

export const SWIMMING_EVENTS: SwimmingEventResult[] = [
  {
    id: '25m-livre-fem',
    number: 1,
    title: '25m Livre Feminino',
    gender: 'feminino',
    kind: 'individual',
    results: [
      { placement: 1, name: 'Lísnia', teamId: 'tormenta', timeDisplay: '16,85', points: 10 },
      { placement: 2, name: 'Lara', teamId: 'predadora', timeDisplay: '18,88', points: 7 },
      { placement: 3, name: 'Maria Eduarda', teamId: 'predadora', timeDisplay: '20,68', points: 4 },
      { placement: 4, name: 'Laís', teamId: 'colossal', timeDisplay: '22,20', points: 3 },
      { placement: 5, name: 'Andressa', teamId: 'sanguinaria', timeDisplay: '22,47', points: 2 },
      { placement: 6, name: 'Letícia', teamId: 'soberana', timeDisplay: '22,58', points: 1 },
      { placement: 7, name: 'Maria Cândida', teamId: 'tormenta', timeDisplay: '25,78', points: 0 },
      { placement: 8, name: 'Andrezza', teamId: 'sanguinaria', timeDisplay: '29,78', points: 0 },
    ],
  },
  {
    id: '25m-livre-masc',
    number: 2,
    title: '25m Livre Masculino',
    gender: 'masculino',
    kind: 'individual',
    results: [
      { placement: 1, name: 'Franco', teamId: 'predadora', timeDisplay: '14,81', points: 10 },
      { placement: 2, name: 'Esdras', teamId: 'soberana', timeDisplay: '15,12', points: 7 },
      { placement: 3, name: 'Manoel', teamId: 'sanguinaria', timeDisplay: '15,90', points: 4 },
      { placement: 4, name: 'Caio Renan', teamId: 'tormenta', timeDisplay: '16,13', points: 3 },
      { placement: 5, name: 'Pedro Vitor', teamId: 'predadora', timeDisplay: '16,42', points: 2 },
      { placement: 6, name: 'Fernando', teamId: 'tormenta', timeDisplay: '17,19', points: 1 },
      { placement: 7, name: 'Daniel', teamId: 'sanguinaria', timeDisplay: '17,51', points: 0 },
      { placement: 8, name: 'Pedro Vitor', teamId: 'colossal', timeDisplay: '18,37', points: 0 },
      { placement: 9, name: 'Nalbert', teamId: 'colossal', timeDisplay: '21,68', points: 0 },
    ],
  },
  {
    id: '25m-peito-fem',
    number: 3,
    title: '25m Peito Feminino',
    gender: 'feminino',
    kind: 'individual',
    results: [
      { placement: 1, name: 'Rafaela', teamId: 'predadora', timeDisplay: '24,88', points: 10 },
      { placement: 2, name: 'Maria Eduarda', teamId: 'predadora', timeDisplay: '26,56', points: 7 },
      { placement: 3, name: 'Emilly', teamId: 'tormenta', timeDisplay: '30,30', points: 4 },
      { placement: 4, name: 'Ana Beatriz', teamId: 'sanguinaria', timeDisplay: '37,25', points: 3 },
      { placement: 5, name: 'Iza', teamId: 'colossal', timeDisplay: '43,87', points: 2 },
      { placement: 6, name: 'Maria Vitória', teamId: 'soberana', timeDisplay: '49,30', points: 1 },
      { placement: 7, name: 'Luiza', teamId: 'sanguinaria', timeDisplay: '55,91', points: 0 },
      { placement: 8, name: 'Emily L.', teamId: 'colossal', timeDisplay: 'DESCLASSIFICADA', points: 0, disqualified: true },
    ],
  },
  {
    id: '25m-peito-masc',
    number: 4,
    title: '25m Peito Masculino',
    gender: 'masculino',
    kind: 'individual',
    results: [
      { placement: 1, name: 'Esdras', teamId: 'soberana', timeDisplay: '20,20', points: 10 },
      { placement: 2, name: 'Rhuan', teamId: 'sanguinaria', timeDisplay: '21,95', points: 7 },
      { placement: 3, name: 'Pedro Vitor', teamId: 'predadora', timeDisplay: '22,44', points: 4 },
      { placement: 4, name: 'Daniel', teamId: 'sanguinaria', timeDisplay: '23,82', points: 3 },
      { placement: 5, name: 'Caio Arthur', teamId: 'tormenta', timeDisplay: '40,35', points: 2 },
      { placement: 6, name: 'Uelisson', teamId: 'colossal', timeDisplay: '41,64', points: 1 },
    ],
  },
  {
    id: '25m-costas-fem',
    number: 5,
    title: '25m Costas Feminino',
    gender: 'feminino',
    kind: 'individual',
    results: [
      { placement: 1, name: 'Lísnia', teamId: 'tormenta', timeDisplay: '21,26', points: 10 },
      { placement: 2, name: 'Lara', teamId: 'predadora', timeDisplay: '27,67', points: 7 },
      { placement: 3, name: 'Maria Virgínia', teamId: 'colossal', timeDisplay: '30,47', points: 4 },
      { placement: 4, name: 'Nicole', teamId: 'sanguinaria', timeDisplay: '30,98', points: 3 },
      { placement: 5, name: 'Andrezza', teamId: 'sanguinaria', timeDisplay: '33,52', points: 2 },
      { placement: 6, name: 'Danisla', teamId: 'predadora', timeDisplay: '34,59', points: 1 },
      { placement: 7, name: 'Yasmin', teamId: 'soberana', timeDisplay: '46,41', points: 0 },
    ],
  },
  {
    id: '25m-costas-masc',
    number: 6,
    title: '25m Costas Masculino',
    gender: 'masculino',
    kind: 'individual',
    results: [
      { placement: 1, name: 'Gabriel Lucas', teamId: 'predadora', timeDisplay: '20,67', points: 10 },
      { placement: 2, name: 'Lucas', teamId: 'soberana', timeDisplay: '25,64', points: 7 },
      { placement: 3, name: 'Manoel', teamId: 'sanguinaria', timeDisplay: '27,03', points: 4 },
      { placement: 4, name: 'Samuel', teamId: 'predadora', timeDisplay: '27,55', points: 3 },
      { placement: 5, name: 'David', teamId: 'colossal', timeDisplay: '28,41', points: 2 },
      { placement: 6, name: 'Rhuan', teamId: 'sanguinaria', timeDisplay: '28,98', points: 1 },
      { placement: 7, name: 'A. Naby', teamId: 'tormenta', timeDisplay: '39,31', points: 0 },
    ],
  },
  {
    id: '25m-borboleta-fem',
    number: 7,
    title: '25m Borboleta Feminino',
    gender: 'feminino',
    kind: 'individual',
    results: [
      { placement: 1, name: 'Rafaela', teamId: 'predadora', timeDisplay: '20,89', points: 10 },
      { placement: 2, name: 'Emilly', teamId: 'tormenta', timeDisplay: '28,79', points: 7 },
      { placement: 3, name: 'Iza', teamId: 'colossal', timeDisplay: '29,14', points: 4 },
      { placement: 4, name: 'Andressa', teamId: 'sanguinaria', timeDisplay: '33,25', points: 3 },
      { placement: 5, name: 'Maria Cândida', teamId: 'tormenta', timeDisplay: '40,58', points: 2 },
      { placement: 6, name: 'Luiza', teamId: 'sanguinaria', timeDisplay: '44,37', points: 1 },
      { placement: 7, name: 'Letícia', teamId: 'soberana', timeDisplay: 'DESCLASSIFICADA', points: 0, disqualified: true },
      { placement: 8, name: 'Yasmin', teamId: 'soberana', timeDisplay: 'DESCLASSIFICADA', points: 0, disqualified: true },
    ],
  },
  {
    id: '25m-borboleta-masc',
    number: 8,
    title: '25m Borboleta Masculino',
    gender: 'masculino',
    kind: 'individual',
    results: [
      { placement: 1, name: 'Fernando', teamId: 'tormenta', timeDisplay: '18,61', points: 10 },
      { placement: 2, name: 'Paulo Vitor', teamId: 'colossal', timeDisplay: '21,01', points: 7 },
      { placement: 3, name: 'André', teamId: 'sanguinaria', timeDisplay: '21,78', points: 4 },
      { placement: 4, name: 'A. Gabriel', teamId: 'sanguinaria', timeDisplay: '25,10', points: 3 },
      { placement: 5, name: 'Samuel', teamId: 'predadora', timeDisplay: '26,87', points: 2 },
      { placement: 6, name: 'Pedro Lucas', teamId: 'soberana', timeDisplay: '30,30', points: 1 },
    ],
  },
  {
    id: '4x25m-livre-fem',
    number: 9,
    title: '4x25m Livre Feminino',
    gender: 'feminino',
    kind: 'revezamento',
    results: [
      { placement: 1, name: 'PREDADORA', teamId: 'predadora', timeDisplay: '01:27,36', points: 20 },
      { placement: 2, name: 'TORMENTA', teamId: 'tormenta', timeDisplay: '01:34,10', points: 14 },
      { placement: 3, name: 'COLOSSAL', teamId: 'colossal', timeDisplay: '01:48,08', points: 8 },
      { placement: 4, name: 'SANGUINÁRIA', teamId: 'sanguinaria', timeDisplay: '01:50,63', points: 6 },
      { placement: 5, name: 'SOBERANA', teamId: 'soberana', timeDisplay: 'DESCLASSIFICADAS', points: 0, disqualified: true },
    ],
  },
  {
    id: '4x25m-livre-masc',
    number: 10,
    title: '4x25m Livre Masculino',
    gender: 'masculino',
    kind: 'revezamento',
    results: [
      { placement: 1, name: 'PREDADORA', teamId: 'predadora', timeDisplay: '01:08,38', points: 20 },
      { placement: 2, name: 'SANGUINÁRIA', teamId: 'sanguinaria', timeDisplay: '01:15,10', points: 14 },
      { placement: 3, name: 'SOBERANA', teamId: 'soberana', timeDisplay: '01:18,62', points: 8 },
      { placement: 4, name: 'COLOSSAL', teamId: 'colossal', timeDisplay: '01:38,36', points: 6 },
      { placement: 5, name: 'TORMENTA', teamId: 'tormenta', timeDisplay: 'DESCLASSIFICADOS', points: 0, disqualified: true },
    ],
  },
  {
    id: '4x25m-medley-fem',
    number: 11,
    title: '4x25m Medley Feminino',
    gender: 'feminino',
    kind: 'revezamento',
    results: [
      { placement: 1, name: 'PREDADORA', teamId: 'predadora', timeDisplay: '01:43,96', points: 20 },
      { placement: 2, name: 'TORMENTA', teamId: 'tormenta', timeDisplay: '01:54,65', points: 14 },
      { placement: 3, name: 'COLOSSAL', teamId: 'colossal', timeDisplay: '02:00,65', points: 8 },
      { placement: 4, name: 'SANGUINÁRIA', teamId: 'sanguinaria', timeDisplay: '02:15,56', points: 6 },
      { placement: 5, name: 'SOBERANA', teamId: 'soberana', timeDisplay: 'DESCLASSIFICADAS', points: 0, disqualified: true },
    ],
  },
  {
    id: '4x25m-medley-masc',
    number: 12,
    title: '4x25m Medley Masculino',
    gender: 'masculino',
    kind: 'revezamento',
    results: [
      { placement: 1, name: 'PREDADORA', teamId: 'predadora', timeDisplay: '01:26,98', points: 20 },
      { placement: 2, name: 'SANGUINÁRIA', teamId: 'sanguinaria', timeDisplay: '01:33,34', points: 14 },
      { placement: 3, name: 'TORMENTA', teamId: 'tormenta', timeDisplay: '01:54,82', points: 8 },
      { placement: 4, name: 'COLOSSAL', teamId: 'colossal', timeDisplay: '02:01,51', points: 6 },
      { placement: 5, name: 'SOBERANA', teamId: 'soberana', timeDisplay: 'DESCLASSIFICADOS', points: 0, disqualified: true },
    ],
  },
];

// Pontuação padrão [10, 7, 4, 3, 0] × 1,5 na Classificação Geral
export const SWIMMING_GENERAL_WEIGHT_MULTIPLIER = 1.5;
export const SWIMMING_GENERAL_BASE_POINTS = [10, 7, 4, 3, 0] as const;

export const SWIMMING_TEAM_TOTALS: SwimmingTeamSummary[] = [
  {
    position: 1,
    teamId: 'predadora',
    teamName: 'Predadora',
    femIndividualPts: 46,
    femRelayPts: 40,
    femTotalPts: 86,
    mascIndividualPts: 31,
    mascRelayPts: 40,
    mascTotalPts: 71,
    totalSwimmingPts: 157,
    generalChampionshipPts: 15, // 10 * 1.5
    goldMedals: 8,
    silverMedals: 3,
    bronzeMedals: 2,
  },
  {
    position: 2,
    teamId: 'tormenta',
    teamName: 'Tormenta',
    femIndividualPts: 33,
    femRelayPts: 28,
    femTotalPts: 61,
    mascIndividualPts: 16,
    mascRelayPts: 8,
    mascTotalPts: 24,
    totalSwimmingPts: 85,
    generalChampionshipPts: 10.5, // 7 * 1.5
    goldMedals: 3,
    silverMedals: 3,
    bronzeMedals: 2,
  },
  {
    position: 3,
    teamId: 'sanguinaria',
    teamName: 'Sanguinária',
    femIndividualPts: 14,
    femRelayPts: 12,
    femTotalPts: 26,
    mascIndividualPts: 26,
    mascRelayPts: 28,
    mascTotalPts: 56,
    totalSwimmingPts: 82,
    generalChampionshipPts: 6, // 4 * 1.5
    goldMedals: 0,
    silverMedals: 3,
    bronzeMedals: 3,
  },
  {
    position: 4,
    teamId: 'colossal',
    teamName: 'Colossal',
    femIndividualPts: 13,
    femRelayPts: 16,
    femTotalPts: 29,
    mascIndividualPts: 10,
    mascRelayPts: 12,
    mascTotalPts: 22,
    totalSwimmingPts: 51,
    generalChampionshipPts: 4.5, // 3 * 1.5
    goldMedals: 0,
    silverMedals: 1,
    bronzeMedals: 4,
  },
  {
    position: 5,
    teamId: 'soberana',
    teamName: 'Soberana',
    femIndividualPts: 2,
    femRelayPts: 0,
    femTotalPts: 2,
    mascIndividualPts: 25,
    mascRelayPts: 8,
    mascTotalPts: 33,
    totalSwimmingPts: 35,
    generalChampionshipPts: 0, // 0 * 1.5
    goldMedals: 1,
    silverMedals: 2,
    bronzeMedals: 1,
  },
];

function normalizeAthleteKey(name: string, teamId: SwimmingTeamId, gender: string): string {
  const cleanName = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return `${cleanName}__${teamId}__${gender}`;
}

export function computeSwimmingIndividualRankings(
  genderFilter: 'all' | 'feminino' | 'masculino' = 'all'
): SwimmingIndividualRankingRow[] {
  const map = new Map<string, Omit<SwimmingIndividualRankingRow, 'rank'>>();

  for (const ev of SWIMMING_EVENTS) {
    if (ev.kind !== 'individual') continue;
    if (genderFilter !== 'all' && ev.gender !== genderFilter) continue;

    for (const row of ev.results) {
      const key = normalizeAthleteKey(row.name, row.teamId, ev.gender);
      const existing = map.get(key) || {
        name: row.name,
        teamId: row.teamId,
        gender: ev.gender,
        totalPoints: 0,
        eventsCount: 0,
        gold: 0,
        silver: 0,
        bronze: 0,
        bestPlacement: 99,
        eventsSummary: [],
      };

      existing.totalPoints += row.points;
      existing.eventsCount += 1;
      if (!row.disqualified) {
        if (row.placement === 1) existing.gold += 1;
        else if (row.placement === 2) existing.silver += 1;
        else if (row.placement === 3) existing.bronze += 1;
        if (row.placement < existing.bestPlacement) {
          existing.bestPlacement = row.placement;
        }
      }
      existing.eventsSummary.push({
        eventTitle: ev.title,
        placement: row.placement,
        timeDisplay: row.timeDisplay,
        points: row.points,
        disqualified: row.disqualified,
      });

      map.set(key, existing);
    }
  }

  const sorted = Array.from(map.values()).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    if (b.bronze !== a.bronze) return b.bronze - a.bronze;
    if (a.bestPlacement !== b.bestPlacement) return a.bestPlacement - b.bestPlacement;
    return a.name.localeCompare(b.name, 'pt-BR');
  });

  return sorted.map((row, idx) => ({
    ...row,
    rank: idx + 1,
  }));
}
