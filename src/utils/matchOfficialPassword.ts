const MODALITY_PASSWORD_PREFIX: Record<string, string> = {
  futsal: 'futsal',
  basquete: 'basquete',
  handebol: 'handebol',
  volei: 'volei',
  'volei-de-praia': 'voleidepraia',
  'tenis-de-mesa': 'tenisdemesa',
  sinuca: 'sinuca',
  truco: 'truco',
};

const TEAM_ID_TO_TURMA: Record<string, number> = {
  sanguinaria: 21,
  predadora: 22,
  tormenta: 23,
  colossal: 24,
  soberana: 25,
};

function resolveTeamTurma(team?: { teamId?: string | null; teamName?: string | null } | null): number | null {
  if (!team) return null;
  const rawName = String(team.teamName || '').trim().toLowerCase();
  if (
    !rawName ||
    rawName.includes('vencedor') ||
    rawName.includes('vj1') ||
    rawName.includes('a definir') ||
    rawName.includes('semifinal') ||
    rawName.includes('quartas')
  ) {
    return null;
  }
  const cleanId = String(team.teamId || '').trim().toLowerCase();
  if (cleanId && TEAM_ID_TO_TURMA[cleanId]) {
    return TEAM_ID_TO_TURMA[cleanId];
  }
  for (const [id, turma] of Object.entries(TEAM_ID_TO_TURMA)) {
    if (rawName.includes(id) || (id === 'sanguinaria' && rawName.includes('sanguin'))) {
      return turma;
    }
  }
  return null;
}

/**
 * Computes the official match mesario password dynamically:
 * `<modalityPrefix><smallerTurma><largerTurma><m|f>` (e.g. `volei2124f`, `voleidepraia2324f`, `tenisdemesa2122f`).
 * Returns null for swimming (`natacao`) or matches whose teams are not yet decided (e.g. VJ1 / Vencedor).
 */
export function computeOfficialMatchMesarioPassword(match?: {
  id?: string;
  modalityId?: string | null;
  modalityName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  homeTeam?: { teamId?: string | null; teamName?: string | null } | null;
  awayTeam?: { teamId?: string | null; teamName?: string | null } | null;
} | null): string | null {
  if (!match) return null;
  const modId = String(match.modalityId || '').trim().toLowerCase();
  if (!modId || modId === 'natacao') return null;

  const prefix = MODALITY_PASSWORD_PREFIX[modId];
  if (!prefix) return null;

  const homeTurma = resolveTeamTurma(match.homeTeam);
  const awayTurma = resolveTeamTurma(match.awayTeam);
  if (!homeTurma || !awayTurma || homeTurma === awayTurma) {
    return null;
  }

  const [tMin, tMax] = [homeTurma, awayTurma].sort((a, b) => a - b);

  const catHint = `${match.categoryId || ''} ${match.categoryName || ''} ${match.id || ''}`.toLowerCase();
  const genderSuffix =
    catHint.includes('fem') ? 'f' : catHint.includes('masc') ? 'm' : null;
  if (!genderSuffix) return null;

  return `${prefix}${tMin}${tMax}${genderSuffix}`;
}
