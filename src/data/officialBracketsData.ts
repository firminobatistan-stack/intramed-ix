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

interface BracketSeedDefinition {
  modalityId: string;
  modalityName: string;
  sportSlug: ModalitySlug;
  seed1: string;
  seed2: string;
  seed3: string;
  seed4: string;
  seed5: string;
}

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
  // 5. BASQUETE FEMININO
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
];

export const CONFIGURED_MODALITY_IDS = new Set(
  OFFICIAL_CONFIGURED_SEEDS.map((s) => s.modalityId)
);

function buildModalityMatchesAndBracket(def: BracketSeedDefinition): {
  matches: Match[];
  bracket: BracketStructure;
  universalBracket: UniversalModalityBracket;
} {
  const t1 = OFFICIAL_TEAMS_MAP[def.seed1] || { id: def.seed1, name: def.seed1, crestUrl: null };
  const t2 = OFFICIAL_TEAMS_MAP[def.seed2] || { id: def.seed2, name: def.seed2, crestUrl: null };
  const t3 = OFFICIAL_TEAMS_MAP[def.seed3] || { id: def.seed3, name: def.seed3, crestUrl: null };
  const t4 = OFFICIAL_TEAMS_MAP[def.seed4] || { id: def.seed4, name: def.seed4, crestUrl: null };
  const t5 = OFFICIAL_TEAMS_MAP[def.seed5] || { id: def.seed5, name: def.seed5, crestUrl: null };

  const qfMatchId = `match_${def.modalityId}_qf`;
  const sf1MatchId = `match_${def.modalityId}_sf1`;
  const sf2MatchId = `match_${def.modalityId}_sf2`;
  const finalMatchId = `match_${def.modalityId}_final`;

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
    scheduledDate: null,
    scheduledTime: null,
    venue: null,
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
    scheduledDate: null,
    scheduledTime: null,
    venue: null,
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
    scheduledDate: null,
    scheduledTime: null,
    venue: null,
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

  // 4. Final: Vencedor da Semifinal 1 × Vencedor da Semifinal 2
  const finalMatch: Match = {
    id: finalMatchId,
    modalityId: def.sportSlug,
    modalityName: def.modalityName,
    categoryId: def.modalityId,
    categoryName: def.modalityName,
    phase: 'final',
    phaseLabel: 'Grande Final',
    status: 'scheduled',
    scheduledDate: null,
    scheduledTime: null,
    venue: null,
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

  const bracket: BracketStructure = {
    modalityId: def.sportSlug,
    categoryId: def.modalityId,
    isConfigured: true,
    quarterfinals: [
      {
        id: `slot_${def.modalityId}_qf`,
        phase: 'quarterfinals',
        orderIndex: 0,
        nextSlotId: `slot_${def.modalityId}_sf1`,
        match: qfMatch,
      },
    ],
    semifinals: [
      {
        id: `slot_${def.modalityId}_sf1`,
        phase: 'semifinals',
        orderIndex: 0,
        nextSlotId: `slot_${def.modalityId}_final`,
        match: sf1Match,
      },
      {
        id: `slot_${def.modalityId}_sf2`,
        phase: 'semifinals',
        orderIndex: 1,
        nextSlotId: `slot_${def.modalityId}_final`,
        match: sf2Match,
      },
    ],
    final: {
      id: `slot_${def.modalityId}_final`,
      phase: 'final',
      orderIndex: 0,
      match: finalMatch,
    },
  };

  const universalBracket: UniversalModalityBracket = {
    modalityId: def.modalityId,
    modalityName: def.modalityName,
    format: 'single_elimination',
    formatLabel: 'Mata-mata Oficial • 5 Equipes',
    category: def.modalityId,
    isPublished: true,
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
            scheduledDate: null,
            scheduledTime: null,
            venue: null,
            status: 'scheduled',
            homeTeam: qfMatch.homeTeam,
            awayTeam: qfMatch.awayTeam,
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
            scheduledDate: null,
            scheduledTime: null,
            venue: null,
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
            scheduledDate: null,
            scheduledTime: null,
            venue: null,
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
            scheduledDate: null,
            scheduledTime: null,
            venue: null,
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

export const OFFICIAL_TOURNAMENT_MATCHES: Match[] = allBuilt.flatMap((b) => b.matches);

export const OFFICIAL_INITIAL_BRACKETS: Record<string, BracketStructure> = {};
export const OFFICIAL_UNIVERSAL_BRACKETS: Record<string, UniversalModalityBracket> = {};

for (const item of allBuilt) {
  const catId = item.bracket.categoryId || item.bracket.modalityId;
  OFFICIAL_INITIAL_BRACKETS[catId] = item.bracket;
  OFFICIAL_UNIVERSAL_BRACKETS[catId] = item.universalBracket;
}
