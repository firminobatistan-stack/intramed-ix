// Test verification for IntraMed Stage 2 - All 16 Official Tournament Brackets
import {
  OFFICIAL_CONFIGURED_SEEDS,
  CONFIGURED_MODALITY_IDS,
  OFFICIAL_TOURNAMENT_MATCHES,
  OFFICIAL_INITIAL_BRACKETS,
  OFFICIAL_UNIVERSAL_BRACKETS
} from '../src/data/officialBracketsData.ts';

console.log('=== TEST: ALL 16 OFFICIAL MODALITIES BRACKET AUDIT ===');

// 1. Verify exact 16 unique modalities
console.log(`Configured unique modality count: ${CONFIGURED_MODALITY_IDS.size}`);
if (CONFIGURED_MODALITY_IDS.size !== 16) {
  throw new Error(`Expected exactly 16 modalities, got ${CONFIGURED_MODALITY_IDS.size}`);
}

const expected16Modalities = [
  'futsal-masc',
  'futsal-fem',
  'volei-fem',
  'volei-masc',
  'basquete-fem',
  'tenis-mesa-masc',
  'tenis-mesa-fem',
  'sinuca-fem',
  'sinuca-masc',
  'handebol-masc',
  'handebol-fem',
  'basquete-masc',
  'volei-praia-masc',
  'volei-praia-fem',
  'truco-fem',
  'truco-masc'
];

for (const modId of expected16Modalities) {
  if (!CONFIGURED_MODALITY_IDS.has(modId)) {
    throw new Error(`Missing expected modality: ${modId}`);
  }
}
console.log('✓ All 16 specified modalities are present in CONFIGURED_MODALITY_IDS');

// 2. Verify total matches: 16 * 4 = 64 matches
console.log(`Total tournament matches: ${OFFICIAL_TOURNAMENT_MATCHES.length}`);
if (OFFICIAL_TOURNAMENT_MATCHES.length !== 64) {
  throw new Error(`Expected 64 matches (16 x 4), got ${OFFICIAL_TOURNAMENT_MATCHES.length}`);
}
console.log('✓ Exactly 64 matches created (4 per modality: QF, SF1, SF2, FIN)');

// 3. Verify dates, times, venues are null
for (const match of OFFICIAL_TOURNAMENT_MATCHES) {
  if (match.scheduledDate !== null || match.scheduledTime !== null || match.venue !== null) {
    throw new Error(`Match ${match.id} has non-null schedule or venue! Date: ${match.scheduledDate}, Time: ${match.scheduledTime}, Venue: ${match.venue}`);
  }
}
console.log('✓ All 64 matches have null scheduledDate, scheduledTime, and venue');

// 4. Verify exact seeds per modality
for (const modId of expected16Modalities) {
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

  console.log(`✓ ${modId.padEnd(16)}: [QF: ${seedDef.seed1} × ${seedDef.seed2}] -> [SF1: ${seedDef.seed3} × QF] & [SF2: ${seedDef.seed4} × ${seedDef.seed5}] -> [FIN: SF1 × SF2]`);
}

// 5. Verify Bracket structures
for (const modId of expected16Modalities) {
  const ub = OFFICIAL_UNIVERSAL_BRACKETS[modId];
  if (!ub || ub.stages.length !== 3) {
    throw new Error(`Universal bracket invalid for ${modId}`);
  }
  if (!ub.isPublished) {
    throw new Error(`Universal bracket not published for ${modId}`);
  }
}
console.log('✓ All 16 universal brackets initialized with 3 stages (Quartas, Semifinal, Final) and isPublished=true');

console.log('\n=== ALL 16 MODALITIES AUDIT TESTS PASSED SUCCESSFULLY! ===');
