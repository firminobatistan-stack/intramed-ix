import { getCloudStore } from '../api/_lib/serverStore.ts';

const store = getCloudStore();
console.log('--- SERVER STORE TEST ---');
console.log('Matches in store:', Object.keys(store.matches || {}).length);
console.log('Brackets in store:', Object.keys(store.brackets || {}).length);
console.log('Bracket published flag:', store.launch_config?.bracketPublished);

const sampleBracket = store.brackets?.['futsal-masc'];
console.log('Sample bracket futsal-masc exists:', !!sampleBracket);
if (sampleBracket) {
  console.log('Stages count:', sampleBracket.stages?.length);
}

const sampleMatch = store.matches?.['match_futsal-masc_qf'];
console.log('Sample match match_futsal-masc_qf exists:', !!sampleMatch);
if (sampleMatch) {
  console.log('Match home:', sampleMatch.homeTeam?.teamName, 'vs away:', sampleMatch.awayTeam?.teamName);
  console.log('Match dates/venue:', { date: sampleMatch.scheduledDate, time: sampleMatch.scheduledTime, venue: sampleMatch.venue });
}

console.log('--- SERVER STORE AUDIT SUCCESS ---');
