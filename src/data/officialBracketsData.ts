import {
  Match,
  BracketStructure,
  UniversalModalityBracket,
  ModalitySlug,
} from '../types/domain';

interface TeamSeedInfo {
  id: string;
  name: string;
  crestUrl: string;
}

const OFFICIAL_TEAMS_MAP: Record<string, TeamSeedInfo> = {
  sanguinaria: {
    id: 'sanguinaria',
    name: 'Sanguinária',
    crestUrl: '/assets/teams/sanguinaria.jpg',
  },
  soberana: {
    id: 'soberana',
    name: 'Soberana',
    crestUrl: '/assets/teams/soberana.png',
  },
  tormenta: {
    id: 'tormenta',
    name: 'Tormenta',
    crestUrl: '/assets/teams/tormenta.png',
  },
  colossal: {
    id: 'colossal',
    name: 'Colossal',
    crestUrl: '/assets/teams/colossal.jpg',
  },
  predadora: {
    id: 'predadora',
    name: 'Predadora',
    crestUrl: '/assets/teams/predadora.jpg',
  },
};

export interface BracketSeedDefinition {
  modalityId: string;
  modalityName: string;
  sportSlug: ModalitySlug;
  seed1: string;
  seed2: string;
  seed3: string;
  seed4: string;
  seed5: string;
}

/**
 * Relação Completa dos 16 Chaveamentos Oficiais Consolidados do IntraMed IX.
 * Todas as modalidades seguem rigorosamente a estrutura eliminatória para 5 equipes:
 * - Quartas: Cabeça 1 × Cabeça 2
 * - Semifinal 1: Cabeça 3 × Vencedor das Quartas
 * - Semifinal 2: Cabeça 4 × Cabeça 5
 * - Final: Vencedor Semifinal 1 × Vencedor Semifinal 2
 */
export const OFFICIAL_CONFIGURED_SEEDS: BracketSeedDefinition[] = [
  // 1. FUTSAL MASCULINO
  {
    modalityId: 'futsal-masc',
    modalityName: 'Futsal Masculino',
    sportSlug: 'futsal',
    seed1: 'sanguinaria',
    seed2: 'soberana',
    seed3: 'tormenta',
    seed4: 'colossal',
    seed5: 'predadora',
  },
  // 2. FUTSAL FEMININO
  {
    modalityId: 'futsal-fem',
    modalityName: 'Futsal Feminino',
    sportSlug: 'futsal',
    seed1: 'tormenta',
    seed2: 'sanguinaria',
    seed3: 'soberana',
    seed4: 'predadora',
    seed5: 'colossal',
  },
  // 3. VÔLEI FEMININO
  {
    modalityId: 'volei-fem',
    modalityName: 'Vôlei Feminino',
    sportSlug: 'volei',
    seed1: 'sanguinaria',
    seed2: 'colossal',
    seed3: 'soberana',
    seed4: 'predadora',
    seed5: 'tormenta',
  },
  // 4. VÔLEI MASCULINO
  {
    modalityId: 'volei-masc',
    modalityName: 'Vôlei Masculino',
    sportSlug: 'volei',
    seed1: 'predadora',
    seed2: 'sanguinaria',
    seed3: 'tormenta',
    seed4: 'soberana',
    seed5: 'colossal',
  },
  // 5. BASQUETE FEMININO (Deduplicada com item 17)
  {
    modalityId: 'basquete-fem',
    modalityName: 'Basquete Feminino',
    sportSlug: 'basquete',
    seed1: 'predadora',
    seed2: 'soberana',
    seed3: 'colossal',
    seed4: 'sanguinaria',
    seed5: 'tormenta',
  },
  // 6. TÊNIS DE MESA MASCULINO
  {
    modalityId: 'tenis-mesa-masc',
    modalityName: 'Tênis de Mesa Masculino',
    sportSlug: 'tenis-de-mesa',
    seed1: 'predadora',
    seed2: 'colossal',
    seed3: 'sanguinaria',
    seed4: 'tormenta',
    seed5: 'soberana',
  },
  // 7. TÊNIS DE MESA FEMININO
  {
    modalityId: 'tenis-mesa-fem',
    modalityName: 'Tênis de Mesa Feminino',
    sportSlug: 'tenis-de-mesa',
    seed1: 'sanguinaria',
    seed2: 'predadora',
    seed3: 'tormenta',
    seed4: 'colossal',
    seed5: 'soberana',
  },
  // 8. SINUCA FEMININA
  {
    modalityId: 'sinuca-fem',
    modalityName: 'Sinuca Feminina',
    sportSlug: 'sinuca',
    seed1: 'soberana',
    seed2: 'predadora',
    seed3: 'tormenta',
    seed4: 'sanguinaria',
    seed5: 'colossal',
  },
  // 9. SINUCA MASCULINA
  {
    modalityId: 'sinuca-masc',
    modalityName: 'Sinuca Masculina',
    sportSlug: 'sinuca',
    seed1: 'sanguinaria',
    seed2: 'tormenta',
    seed3: 'soberana',
    seed4: 'predadora',
    seed5: 'colossal',
  },
  // 10. HANDEBOL MASCULINO
  {
    modalityId: 'handebol-masc',
    modalityName: 'Handebol Masculino',
    sportSlug: 'handebol',
    seed1: 'tormenta',
    seed2: 'soberana',
    seed3: 'colossal',
    seed4: 'predadora',
    seed5: 'sanguinaria',
  },
  // 11. HANDEBOL FEMININO
  {
    modalityId: 'handebol-fem',
    modalityName: 'Handebol Feminino',
    sportSlug: 'handebol',
    seed1: 'colossal',
    seed2: 'tormenta',
    seed3: 'sanguinaria',
    seed4: 'predadora',
    seed5: 'soberana',
  },
  // 12. BASQUETE MASCULINO
  {
    modalityId: 'basquete-masc',
    modalityName: 'Basquete Masculino',
    sportSlug: 'basquete',
    seed1: 'colossal',
    seed2: 'predadora',
    seed3: 'sanguinaria',
    seed4: 'tormenta',
    seed5: 'soberana',
  },
  // 13. VÔLEI DE PRAIA MASCULINO
  {
    modalityId: 'volei-praia-masc',
    modalityName: 'Vôlei de Praia Masculino',
    sportSlug: 'volei-de-praia',
    seed1: 'sanguinaria',
    seed2: 'soberana',
    seed3: 'tormenta',
    seed4: 'colossal',
    seed5: 'predadora',
  },
  // 14. VÔLEI DE PRAIA FEMININO
  {
    modalityId: 'volei-praia-fem',
    modalityName: 'Vôlei de Praia Feminino',
    sportSlug: 'volei-de-praia',
    seed1: 'colossal',
    seed2: 'tormenta',
    seed3: 'predadora',
    seed4: 'sanguinaria',
    seed5: 'soberana',
  },
  // 15. TRUCO FEMININO
  {
    modalityId: 'truco-fem',
    modalityName: 'Truco Feminino',
    sportSlug: 'truco',
    seed1: 'tormenta',
    seed2: 'predadora',
    seed3: 'soberana',
    seed4: 'colossal',
    seed5: 'sanguinaria',
  },
  // 16. TRUCO MASCULINO
  {
    modalityId: 'truco-masc',
    modalityName: 'Truco Masculino',
    sportSlug: 'truco',
    seed1: 'colossal',
    seed2: 'soberana',
    seed3: 'predadora',
    seed4: 'tormenta',
    seed5: 'sanguinaria',
  },
];

export const CONFIGURED_MODALITY_IDS = new Set(
  OFFICIAL_CONFIGURED_SEEDS.map((s) => s.modalityId)
);

/**
 * TABELA OFICIAL DE HORÁRIOS E LOCAIS — IX INTRAMED CANGACEIRA
 * Mapeamento exato conforme planilha oficial da Comissão Organizadora.
 * Locais:
 * - Natação: Escola José Castro (Sexta 20/11 das 07:00 às 11:00)
 * - Vôlei de Quadra: Bayma
 * - Basquete e Handebol: Escola Antenor Viana
 * - Futsal: Quadra Oficial
 * - Sinuca e Vôlei de Praia: Arena AMK Sports (Sábado 28/11 a partir das 16:00)
 */
export const OFFICIAL_MATCH_SCHEDULE_MAP: Record<
  string,
  { scheduledDate: string; scheduledTime: string; venue: string }
> = {
  // =========================================================================
  // SEXTA-FEIRA, 20/11/2026 — NATAÇÃO (07h-11h) & VÔLEI DE QUADRA (Bayma)
  // =========================================================================
  'match_volei-fem_qf': {
    scheduledDate: '20/11 (Sex)',
    scheduledTime: '15:00',
    venue: 'Bayma',
  },
  'match_volei-masc_qf': {
    scheduledDate: '20/11 (Sex)',
    scheduledTime: '16:00',
    venue: 'Bayma',
  },
  'match_volei-fem_sf2': {
    scheduledDate: '20/11 (Sex)',
    scheduledTime: '17:00',
    venue: 'Bayma',
  },
  'match_volei-masc_sf2': {
    scheduledDate: '20/11 (Sex)',
    scheduledTime: '18:00',
    venue: 'Bayma',
  },
  'match_volei-fem_sf1': {
    scheduledDate: '20/11 (Sex)',
    scheduledTime: '19:00',
    venue: 'Bayma',
  },
  'match_volei-masc_sf1': {
    scheduledDate: '20/11 (Sex)',
    scheduledTime: '20:00',
    venue: 'Bayma',
  },

  // =========================================================================
  // SÁBADO, 21/11/2026 — BASQUETE & HANDEBOL (Escola Antenor Viana)
  // =========================================================================
  'match_basquete-masc_qf': {
    scheduledDate: '21/11 (Sáb)',
    scheduledTime: '08:00',
    venue: 'Escola Antenor Viana',
  },
  'match_basquete-fem_qf': {
    scheduledDate: '21/11 (Sáb)',
    scheduledTime: '09:00',
    venue: 'Escola Antenor Viana',
  },
  'match_handebol-masc_qf': {
    scheduledDate: '21/11 (Sáb)',
    scheduledTime: '10:00',
    venue: 'Escola Antenor Viana',
  },
  'match_handebol-fem_qf': {
    scheduledDate: '21/11 (Sáb)',
    scheduledTime: '11:00',
    venue: 'Escola Antenor Viana',
  },
  'match_basquete-masc_sf2': {
    scheduledDate: '21/11 (Sáb)',
    scheduledTime: '15:00',
    venue: 'Escola Antenor Viana',
  },
  'match_basquete-fem_sf2': {
    scheduledDate: '21/11 (Sáb)',
    scheduledTime: '16:00',
    venue: 'Escola Antenor Viana',
  },
  'match_basquete-masc_sf1': {
    scheduledDate: '21/11 (Sáb)',
    scheduledTime: '17:00',
    venue: 'Escola Antenor Viana',
  },
  'match_basquete-fem_sf1': {
    scheduledDate: '21/11 (Sáb)',
    scheduledTime: '18:00',
    venue: 'Escola Antenor Viana',
  },

  // =========================================================================
  // DOMINGO, 22/11/2026 — SEMIFINAIS HANDEBOL & FUTSAL (Quartas + Semifinais)
  // =========================================================================
  'match_handebol-masc_sf2': {
    scheduledDate: '22/11 (Dom)',
    scheduledTime: '08:00',
    venue: 'Escola Antenor Viana',
  },
  'match_handebol-fem_sf2': {
    scheduledDate: '22/11 (Dom)',
    scheduledTime: '09:00',
    venue: 'Escola Antenor Viana',
  },
  'match_handebol-masc_sf1': {
    scheduledDate: '22/11 (Dom)',
    scheduledTime: '10:00',
    venue: 'Escola Antenor Viana',
  },
  'match_handebol-fem_sf1': {
    scheduledDate: '22/11 (Dom)',
    scheduledTime: '11:00',
    venue: 'Escola Antenor Viana',
  },
  'match_futsal-masc_qf': {
    scheduledDate: '22/11 (Dom)',
    scheduledTime: '15:00',
    venue: 'Quadra Oficial',
  },
  'match_futsal-fem_qf': {
    scheduledDate: '22/11 (Dom)',
    scheduledTime: '16:00',
    venue: 'Quadra Oficial',
  },
  'match_futsal-masc_sf2': {
    scheduledDate: '22/11 (Dom)',
    scheduledTime: '17:00',
    venue: 'Quadra Oficial',
  },
  'match_futsal-fem_sf2': {
    scheduledDate: '22/11 (Dom)',
    scheduledTime: '18:00',
    venue: 'Quadra Oficial',
  },
  'match_futsal-masc_sf1': {
    scheduledDate: '22/11 (Dom)',
    scheduledTime: '19:00',
    venue: 'Quadra Oficial',
  },
  'match_futsal-fem_sf1': {
    scheduledDate: '22/11 (Dom)',
    scheduledTime: '20:00',
    venue: 'Quadra Oficial',
  },

  // =========================================================================
  // SÁBADO, 28/11/2026 — TÊNIS DE MESA (08h-12h) & SINUCA / VÔLEI DE PRAIA (16h-21h)
  // =========================================================================
  'match_tenis-mesa-masc_qf': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '08:00',
    venue: 'Arena Tênis de Mesa',
  },
  'match_tenis-mesa-fem_qf': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '08:30',
    venue: 'Arena Tênis de Mesa',
  },
  'match_tenis-mesa-masc_sf2': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '09:00',
    venue: 'Arena Tênis de Mesa',
  },
  'match_tenis-mesa-fem_sf2': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '09:30',
    venue: 'Arena Tênis de Mesa',
  },
  'match_tenis-mesa-masc_sf1': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '10:00',
    venue: 'Arena Tênis de Mesa',
  },
  'match_tenis-mesa-fem_sf1': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '10:30',
    venue: 'Arena Tênis de Mesa',
  },
  'match_tenis-mesa-masc_final': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '11:00',
    venue: 'Arena Tênis de Mesa',
  },
  'match_tenis-mesa-fem_final': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '11:30',
    venue: 'Arena Tênis de Mesa',
  },

  // Sinuca — Arena AMK Sports (Inscrição das duplas até sexta-feira 27/11/2026)
  'match_sinuca-masc_qf': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '16:00',
    venue: 'Arena AMK Sports',
  },
  'match_sinuca-fem_qf': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '16:30',
    venue: 'Arena AMK Sports',
  },
  'match_sinuca-masc_sf2': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '17:00',
    venue: 'Arena AMK Sports',
  },
  'match_sinuca-fem_sf2': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '17:30',
    venue: 'Arena AMK Sports',
  },
  'match_sinuca-masc_sf1': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '18:00',
    venue: 'Arena AMK Sports',
  },
  'match_sinuca-fem_sf1': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '18:30',
    venue: 'Arena AMK Sports',
  },
  'match_sinuca-masc_final': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '19:30',
    venue: 'Arena AMK Sports',
  },
  'match_sinuca-fem_final': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '20:00',
    venue: 'Arena AMK Sports',
  },

  // Vôlei de Praia (VP) & Happy Hour — Arena AMK Sports (16h às 21h)
  'match_volei-praia-masc_qf': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '16:00',
    venue: 'Arena AMK Sports',
  },
  'match_volei-praia-fem_qf': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '16:30',
    venue: 'Arena AMK Sports',
  },
  'match_volei-praia-masc_sf2': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '17:30',
    venue: 'Arena AMK Sports',
  },
  'match_volei-praia-fem_sf2': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '18:00',
    venue: 'Arena AMK Sports',
  },
  'match_volei-praia-masc_sf1': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '19:00',
    venue: 'Arena AMK Sports',
  },
  'match_volei-praia-fem_sf1': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '19:30',
    venue: 'Arena AMK Sports',
  },
  'match_volei-praia-masc_final': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '20:15',
    venue: 'Arena AMK Sports',
  },
  'match_volei-praia-fem_final': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '20:45',
    venue: 'Arena AMK Sports',
  },

  // Truco — Arena AMK Sports (Happy Hour 28/11)
  'match_truco-fem_qf': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '16:00',
    venue: 'Arena AMK Sports',
  },
  'match_truco-masc_qf': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '16:30',
    venue: 'Arena AMK Sports',
  },
  'match_truco-fem_sf2': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '17:30',
    venue: 'Arena AMK Sports',
  },
  'match_truco-masc_sf2': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '18:00',
    venue: 'Arena AMK Sports',
  },
  'match_truco-fem_sf1': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '19:00',
    venue: 'Arena AMK Sports',
  },
  'match_truco-masc_sf1': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '19:30',
    venue: 'Arena AMK Sports',
  },
  'match_truco-fem_final': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '20:15',
    venue: 'Arena AMK Sports',
  },
  'match_truco-masc_final': {
    scheduledDate: '28/11 (Sáb)',
    scheduledTime: '20:45',
    venue: 'Arena AMK Sports',
  },

  // =========================================================================
  // DOMINGO, 29/11/2026 — GRANDES FINAIS COLETIVAS & PREMIAÇÕES (20h-22h)
  // =========================================================================
  'match_basquete-masc_final': {
    scheduledDate: '29/11 (Dom)',
    scheduledTime: '09:00',
    venue: 'Escola Antenor Viana',
  },
  'match_basquete-fem_final': {
    scheduledDate: '29/11 (Dom)',
    scheduledTime: '10:00',
    venue: 'Escola Antenor Viana',
  },
  'match_volei-fem_final': {
    scheduledDate: '29/11 (Dom)',
    scheduledTime: '11:00',
    venue: 'Bayma',
  },
  'match_volei-masc_final': {
    scheduledDate: '29/11 (Dom)',
    scheduledTime: '12:00',
    venue: 'Bayma',
  },
  'match_handebol-fem_final': {
    scheduledDate: '29/11 (Dom)',
    scheduledTime: '16:00',
    venue: 'Escola Antenor Viana',
  },
  'match_handebol-masc_final': {
    scheduledDate: '29/11 (Dom)',
    scheduledTime: '17:00',
    venue: 'Escola Antenor Viana',
  },
  'match_futsal-fem_final': {
    scheduledDate: '29/11 (Dom)',
    scheduledTime: '18:00',
    venue: 'Quadra Oficial',
  },
  'match_futsal-masc_final': {
    scheduledDate: '29/11 (Dom)',
    scheduledTime: '19:00',
    venue: 'Quadra Oficial',
  },
};

function buildModalityMatchesAndBracket(def: BracketSeedDefinition): {
  matches: Match[];
  bracket: BracketStructure;
  universalBracket: UniversalModalityBracket;
} {
  const t1 = OFFICIAL_TEAMS_MAP[def.seed1] || { id: def.seed1, name: def.seed1, crestUrl: '' };
  const t2 = OFFICIAL_TEAMS_MAP[def.seed2] || { id: def.seed2, name: def.seed2, crestUrl: '' };
  const t3 = OFFICIAL_TEAMS_MAP[def.seed3] || { id: def.seed3, name: def.seed3, crestUrl: '' };
  const t4 = OFFICIAL_TEAMS_MAP[def.seed4] || { id: def.seed4, name: def.seed4, crestUrl: '' };
  const t5 = OFFICIAL_TEAMS_MAP[def.seed5] || { id: def.seed5, name: def.seed5, crestUrl: '' };

  const qfMatchId = `match_${def.modalityId}_qf`;
  const sf1MatchId = `match_${def.modalityId}_sf1`;
  const sf2MatchId = `match_${def.modalityId}_sf2`;
  const finalMatchId = `match_${def.modalityId}_final`;

  const qfSched = OFFICIAL_MATCH_SCHEDULE_MAP[qfMatchId];
  const sf1Sched = OFFICIAL_MATCH_SCHEDULE_MAP[sf1MatchId];
  const sf2Sched = OFFICIAL_MATCH_SCHEDULE_MAP[sf2MatchId];
  const finalSched = OFFICIAL_MATCH_SCHEDULE_MAP[finalMatchId];

  // 1. Quartas de Final: Cabeça 1 × Cabeça 2
  const qfMatch: Match = {
    id: qfMatchId,
    modalityId: def.sportSlug,
    modalityName: def.modalityName,
    categoryId: def.modalityId,
    categoryName: def.modalityName,
    phase: 'quarterfinals',
    phaseLabel: 'Quartas de Final',
    status: 'scheduled',
    scheduledDate: qfSched?.scheduledDate ?? null,
    scheduledTime: qfSched?.scheduledTime ?? null,
    venue: qfSched?.venue ?? null,
    homeTeam: {
      teamId: t1.id,
      teamName: t1.name,
      crestUrl: t1.crestUrl,
      score: null,
    },
    awayTeam: {
      teamId: t2.id,
      teamName: t2.name,
      crestUrl: t2.crestUrl,
      score: null,
    },
  };

  // 2. Semifinal 1: Cabeça 3 × Vencedor do Confronto 1 (Quartas)
  const sf1Match: Match = {
    id: sf1MatchId,
    modalityId: def.sportSlug,
    modalityName: def.modalityName,
    categoryId: def.modalityId,
    categoryName: def.modalityName,
    phase: 'semifinals',
    phaseLabel: 'Semifinal 1',
    status: 'scheduled',
    scheduledDate: sf1Sched?.scheduledDate ?? null,
    scheduledTime: sf1Sched?.scheduledTime ?? null,
    venue: sf1Sched?.venue ?? null,
    homeTeam: {
      teamId: t3.id,
      teamName: t3.name,
      crestUrl: t3.crestUrl,
      score: null,
    },
    awayTeam: {
      teamId: null,
      teamName: `Vencedor de ${t1.name} × ${t2.name}`,
      crestUrl: null,
      score: null,
    },
  };

  // 3. Semifinal 2: Cabeça 4 × Cabeça 5
  const sf2Match: Match = {
    id: sf2MatchId,
    modalityId: def.sportSlug,
    modalityName: def.modalityName,
    categoryId: def.modalityId,
    categoryName: def.modalityName,
    phase: 'semifinals',
    phaseLabel: 'Semifinal 2',
    status: 'scheduled',
    scheduledDate: sf2Sched?.scheduledDate ?? null,
    scheduledTime: sf2Sched?.scheduledTime ?? null,
    venue: sf2Sched?.venue ?? null,
    homeTeam: {
      teamId: t4.id,
      teamName: t4.name,
      crestUrl: t4.crestUrl,
      score: null,
    },
    awayTeam: {
      teamId: t5.id,
      teamName: t5.name,
      crestUrl: t5.crestUrl,
      score: null,
    },
  };

  // 4. Grande Final: Vencedor Semifinal 1 × Vencedor Semifinal 2
  const finalMatch: Match = {
    id: finalMatchId,
    modalityId: def.sportSlug,
    modalityName: def.modalityName,
    categoryId: def.modalityId,
    categoryName: def.modalityName,
    phase: 'final',
    phaseLabel: 'Grande Final',
    status: 'scheduled',
    scheduledDate: finalSched?.scheduledDate ?? null,
    scheduledTime: finalSched?.scheduledTime ?? null,
    venue: finalSched?.venue ?? null,
    homeTeam: {
      teamId: null,
      teamName: 'Vencedor Semifinal 1',
      crestUrl: null,
      score: null,
    },
    awayTeam: {
      teamId: null,
      teamName: 'Vencedor Semifinal 2',
      crestUrl: null,
      score: null,
    },
  };

  const matches = [qfMatch, sf1Match, sf2Match, finalMatch];

  // Estrutura clássica de BracketStructure
  const bracket: BracketStructure = {
    modalityId: def.sportSlug,
    categoryId: def.modalityId,
    isConfigured: true,
    quarterfinals: [
      {
        id: `slot_${qfMatch.id}`,
        phase: 'quarterfinals',
        orderIndex: 0,
        match: qfMatch,
      },
    ],
    semifinals: [
      {
        id: `slot_${sf1Match.id}`,
        phase: 'semifinals',
        orderIndex: 0,
        match: sf1Match,
      },
      {
        id: `slot_${sf2Match.id}`,
        phase: 'semifinals',
        orderIndex: 1,
        match: sf2Match,
      },
    ],
    final: {
      id: `slot_${finalMatch.id}`,
      phase: 'final',
      orderIndex: 0,
      match: finalMatch,
    },
  };

  // Estrutura UniversalModalityBracket
  const universalBracket: UniversalModalityBracket = {
    modalityId: def.modalityId,
    modalityName: def.modalityName,
    format: 'single_elimination',
    formatLabel: 'Mata-mata 5 Equipes',
    category: def.modalityId,
    isPublished: true,
    publishedAtIso: new Date().toISOString(),
    stages: [
      {
        id: `${def.modalityId}_stage_qf`,
        phase: 'quarterfinals',
        label: 'Quartas de Final',
        matches: [
          {
            id: qfMatch.id,
            modalityId: def.modalityId,
            phase: 'quarterfinals',
            phaseLabel: 'Quartas de Final',
            orderIndex: 0,
            scheduledDate: qfMatch.scheduledDate ?? null,
            scheduledTime: qfMatch.scheduledTime ?? null,
            venue: qfMatch.venue ?? null,
            status: 'scheduled',
            homeTeam: qfMatch.homeTeam,
            awayTeam: qfMatch.awayTeam,
            homeSource: { type: 'team', label: t1.name },
            awaySource: { type: 'team', label: t2.name },
            nextMatchId: sf1Match.id,
            nextMatchTarget: 'away',
          },
        ],
      },
      {
        id: `${def.modalityId}_stage_sf`,
        phase: 'semifinals',
        label: 'Semifinais',
        matches: [
          {
            id: sf1Match.id,
            modalityId: def.modalityId,
            phase: 'semifinals',
            phaseLabel: 'Semifinal 1',
            orderIndex: 0,
            scheduledDate: sf1Match.scheduledDate ?? null,
            scheduledTime: sf1Match.scheduledTime ?? null,
            venue: sf1Match.venue ?? null,
            status: 'scheduled',
            homeTeam: sf1Match.homeTeam,
            awayTeam: sf1Match.awayTeam,
            homeSource: { type: 'team', label: t3.name },
            awaySource: { type: 'winner_of', sourceMatchId: qfMatch.id, label: `Vencedor de ${t1.name} × ${t2.name}` },
            nextMatchId: finalMatch.id,
            nextMatchTarget: 'home',
          },
          {
            id: sf2Match.id,
            modalityId: def.modalityId,
            phase: 'semifinals',
            phaseLabel: 'Semifinal 2',
            orderIndex: 1,
            scheduledDate: sf2Match.scheduledDate ?? null,
            scheduledTime: sf2Match.scheduledTime ?? null,
            venue: sf2Match.venue ?? null,
            status: 'scheduled',
            homeTeam: sf2Match.homeTeam,
            awayTeam: sf2Match.awayTeam,
            homeSource: { type: 'team', label: t4.name },
            awaySource: { type: 'team', label: t5.name },
            nextMatchId: finalMatch.id,
            nextMatchTarget: 'away',
          },
        ],
      },
      {
        id: `${def.modalityId}_stage_final`,
        phase: 'final',
        label: 'Grande Final',
        matches: [
          {
            id: finalMatch.id,
            modalityId: def.modalityId,
            phase: 'final',
            phaseLabel: 'Grande Final',
            orderIndex: 0,
            scheduledDate: finalMatch.scheduledDate ?? null,
            scheduledTime: finalMatch.scheduledTime ?? null,
            venue: finalMatch.venue ?? null,
            status: 'scheduled',
            homeTeam: finalMatch.homeTeam,
            awayTeam: finalMatch.awayTeam,
            homeSource: { type: 'winner_of', sourceMatchId: sf1Match.id, label: 'Vencedor Semifinal 1' },
            awaySource: { type: 'winner_of', sourceMatchId: sf2Match.id, label: 'Vencedor Semifinal 2' },
          },
        ],
      },
    ],
  };

  return { matches, bracket, universalBracket };
}

const allBuilt = OFFICIAL_CONFIGURED_SEEDS.map(buildModalityMatchesAndBracket);

// Prova Oficial de Natação (Sexta-feira, 20/11/2026 das 07:00 às 11:00 — Escola José Castro)
export const OFFICIAL_SWIMMING_MATCH: Match = {
  id: 'match_natacao_geral_final',
  modalityId: 'natacao',
  modalityName: 'Natação (Provas Oficiais)',
  categoryId: 'natacao-geral',
  categoryName: 'Natação Masc. & Fem.',
  phase: 'final',
  phaseLabel: 'Baterias & Finais (07h às 11h)',
  status: 'scheduled',
  scheduledDate: '20/11 (Sex)',
  scheduledTime: '07:00',
  venue: 'Escola José Castro',
  homeTeam: {
    teamId: 'sanguinaria',
    teamName: 'Sanguinária / Predadora / Tormenta',
    crestUrl: '/assets/teams/sanguinaria.jpg',
    score: null,
  },
  awayTeam: {
    teamId: 'colossal',
    teamName: 'Colossal / Soberana',
    crestUrl: '/assets/teams/colossal.jpg',
    score: null,
  },
};

export const OFFICIAL_TOURNAMENT_MATCHES: Match[] = [
  OFFICIAL_SWIMMING_MATCH,
  ...allBuilt.flatMap((b) => b.matches),
];

export const OFFICIAL_INITIAL_BRACKETS: Record<string, BracketStructure> = {};
export const OFFICIAL_UNIVERSAL_BRACKETS: Record<string, UniversalModalityBracket> = {};

for (const item of allBuilt) {
  const catId = item.bracket.categoryId || item.bracket.modalityId;
  OFFICIAL_INITIAL_BRACKETS[catId] = item.bracket;
  OFFICIAL_UNIVERSAL_BRACKETS[catId] = item.universalBracket;
}
