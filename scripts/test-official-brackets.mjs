// Test verification for IntraMed Stage 1 Official Brackets
import {
  OFFICIAL_CONFIGURED_SEEDS,
  CONFIGURED_MODALITY_IDS,
  OFFICIAL_TOURNAMENT_MATCHES,
  OFFICIAL_INITIAL_BRACKETS,
  OFFICIAL_UNIVERSAL_BRACKETS
} from '../src/data/officialBracketsData.ts';

console.log('--- TEST: OFFICIAL BRACKET STRUCTURE AUDIT ---');

// 1. Verify exact 9 modalities
console.log(`Configured modality count: ${CONFIGURED_MODALITY_IDS.size}`);
if (CONFIGURED_MODALITY_IDS.size !== 9) {
  throw new Error(`Expected 9 modalities, got ${CONFIGURED_MODALITY_IDS.size}`);
}

const expectedModalities = [
  'futsal-masc',
  'futsal-fem',
  'volei-fem',
  'volei-masc',
  'basquete-fem',
  'tenis-mesa-masc',
  'tenis-mesa-fem',
  'sinuca-fem',
  'sinuca-masc'
];

for (const modId of expectedModalities) {
  if (!CONFIGURED_MODALITY_IDS.has(modId)) {
    throw new Error(`Missing expected modality: ${modId}`);
  }
}
console.log('✓ All 9 specified modalities are present in CONFIGURED_MODALITY_IDS');

// 2. Verify total matches: 9 * 4 = 36 matches
console.log(`Total tournament matches: ${OFFICIAL_TOURNAMENT_MATCHES.length}`);
if (OFFICIAL_TOURNAMENT_MATCHES.length !== 36) {
  throw new Error(`Expected 36 matches, got ${OFFICIAL_TOURNAMENT_MATCHES.length}`);
}
console.log('✓ Exactly 36 matches created (4 per modality: QF, SF1, SF2, FIN)');

// 3. Verify dates, times, venues are null
for (const match of OFFICIAL_TOURNAMENT_MATCHES) {
  if (match.scheduledDate !== null || match.scheduledTime !== null || match.venue !== null) {
    throw new Error(`Match ${match.id} has non-null schedule or venue! Date: ${match.scheduledDate}, Time: ${match.scheduledTime}, Venue: ${match.venue}`);
  }
}
console.log('✓ All 36 matches have null scheduledDate, scheduledTime, and venue');

// 4. Verify exact seeds per modality
for (const modId of expectedModalities) {
  const seedDef = OFFICIAL_CONFIGURED_SEEDS.find(s => s.modalityId === modId);
  if (!seedDef) {
    throw new Error(`Modality ${modId} not found in OFFICIAL_CONFIGURED_SEEDS`);
  }

  // Modality matches
  const modMatches = OFFICIAL_TOURNAMENT_MATCHES.filter(m => m.categoryId === modId);
  if (modMatches.length !== 4) {
    throw new Error(`Modality ${modId} does not have exactly 4 matches (has ${modMatches.length})`);
  }

  const qf = modMatches.find(m => m.phase === 'quarterfinals');
  const sf1 = modMatches.find(m => m.phase === 'semifinals' && m.id.endsWith('_sf1'));
  const sf2 = modMatches.find(m => m.phase === 'semifinals' && m.id.endsWith('_sf2'));
  const fin = modMatches.find(m => m.phase === 'final');

  if (!qf || !sf1 || !sf2 || !fin) {
    throw new Error(`Modality ${modId} missing round structures: qf=${!!qf}, sf1=${!!sf1}, sf2=${!!sf2}, fin=${!!fin}`);
  }

  // QF: Seed 1 vs Seed 2
  if (qf.homeTeam.teamId !== seedDef.seed1 || qf.awayTeam.teamId !== seedDef.seed2) {
    throw new Error(`Modality ${modId} QF mismatch. Expected ${seedDef.seed1} vs ${seedDef.seed2}, got ${qf.homeTeam.teamId} vs ${qf.awayTeam.teamId}`);
  }

  // SF1: Seed 3 vs QF winner (placeholder null)
  if (sf1.homeTeam.teamId !== seedDef.seed3 || sf1.awayTeam.teamId !== null) {
    throw new Error(`Modality ${modId} SF1 mismatch. Expected ${seedDef.seed3} vs null, got ${sf1.homeTeam.teamId} vs ${sf1.awayTeam.teamId}`);
  }

  // SF2: Seed 4 vs Seed 5
  if (sf2.homeTeam.teamId !== seedDef.seed4 || sf2.awayTeam.teamId !== seedDef.seed5) {
    throw new Error(`Modality ${modId} SF2 mismatch. Expected ${seedDef.seed4} vs ${seedDef.seed5}, got ${sf2.homeTeam.teamId} vs ${sf2.awayTeam.teamId}`);
  }

  // FIN: SF1 winner vs SF2 winner (both null)
  if (fin.homeTeam.teamId !== null || fin.awayTeam.teamId !== null) {
    throw new Error(`Modality ${modId} FIN mismatch. Expected null vs null, got ${fin.homeTeam.teamId} vs ${fin.awayTeam.teamId}`);
  }

  console.log(`✓ ${modId}: Seeds & Matchups verified: [QF: ${seedDef.seed1} vs ${seedDef.seed2}] -> [SF1: ${seedDef.seed3} vs QF] & [SF2: ${seedDef.seed4} vs ${seedDef.seed5}] -> [FIN: SF1 vs SF2]`);
}

// 5. Verify Bracket structures
for (const modId of expectedModalities) {
  const ub = OFFICIAL_UNIVERSAL_BRACKETS[modId];
  if (!ub || ub.stages.length !== 3) {
    throw new Error(`Universal bracket invalid for ${modId}`);
  }
}
console.log('✓ All 9 universal brackets initialized with 3 stages (Quartas, Semifinal, Final)');

// 6. Test Winner Resolution Functionality (Progression simulation)
function resolveMatchWinner(match) {
  if (!match || match.status !== 'finished') return null;
  const hScore = match.homeScore ?? match.homeTeam?.score;
  const aScore = match.awayScore ?? match.awayTeam?.score;
  if (hScore === null || hScore === undefined || aScore === null || aScore === undefined) return null;
  if (hScore > aScore) {
    return { id: match.homeTeam.teamId, name: match.homeTeam.teamName };
  } else if (aScore > hScore) {
    return { id: match.awayTeam.teamId, name: match.awayTeam.teamName };
  }
  return null;
}

// Test progression on futsal-masc:
const qfMatch = {
  status: 'finished',
  homeTeam: { teamId: 'sanguinaria', teamName: 'Sanguinária', score: 3 },
  awayTeam: { teamId: 'soberana', teamName: 'Soberana', score: 1 },
  homeScore: 3,
  awayScore: 1
};
const qfWinner = resolveMatchWinner(qfMatch);
if (qfWinner?.id !== 'sanguinaria') {
  throw new Error(`Expected QF winner sanguinaria, got ${qfWinner?.id}`);
}
console.log(`✓ Automatic progression simulation: QF winner is ${qfWinner.name} (${qfWinner.id})`);

const sf1Match = {
  status: 'finished',
  homeTeam: { teamId: 'tormenta', teamName: 'Tormenta', score: 2 },
  awayTeam: { teamId: qfWinner.id, teamName: qfWinner.name, score: 4 },
  homeScore: 2,
  awayScore: 4
};
const sf1Winner = resolveMatchWinner(sf1Match);
if (sf1Winner?.id !== 'sanguinaria') {
  throw new Error(`Expected SF1 winner sanguinaria, got ${sf1Winner?.id}`);
}
console.log(`✓ Automatic progression simulation: SF1 winner is ${sf1Winner.name} (${sf1Winner.id})`);

const sf2Match = {
  status: 'finished',
  homeTeam: { teamId: 'colossal', teamName: 'Colossal', score: 5 },
  awayTeam: { teamId: 'predadora', teamName: 'Predadora', score: 2 },
  homeScore: 5,
  awayScore: 2
};
const sf2Winner = resolveMatchWinner(sf2Match);
if (sf2Winner?.id !== 'colossal') {
  throw new Error(`Expected SF2 winner colossal, got ${sf2Winner?.id}`);
}
console.log(`✓ Automatic progression simulation: SF2 winner is ${sf2Winner.name} (${sf2Winner.id})`);

const finalMatch = {
  status: 'finished',
  homeTeam: { teamId: sf1Winner.id, teamName: sf1Winner.name, score: 3 },
  awayTeam: { teamId: sf2Winner.id, teamName: sf2Winner.name, score: 2 },
  homeScore: 3,
  awayScore: 2
};
const champion = resolveMatchWinner(finalMatch);
if (champion?.id !== 'sanguinaria') {
  throw new Error(`Expected Champion sanguinaria, got ${champion?.id}`);
}
console.log(`✓ Automatic progression simulation: Final Champion is ${champion.name} (${champion.id})`);

console.log('\n--- ALL AUDIT TESTS PASSED SUCCESSFULLY! ---');
