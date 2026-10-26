import {
  SportModality,
  Team,
  Athlete,
  Match,
  StandingEntry,
  ModalityStatisticItem,
  BracketStructure,
  UserProfile,
  ModalitySlug,
} from '../types/domain';

/**
 * Repositório Oficial de Dados — INTRAMED IX
 * Contém as 10 modalidades oficiais e as 5 Equipes Oficiais dos Períodos de Medicina UEMA:
 * 1. COLOSSAL (Verde & Dourado • MEDUEMA TXXIV)
 * 2. SOBERANA (Grená & Ouro • MEDUEMA XXV)
 * 3. SANGUINÁRIA (Vermelho Vivo & Fogo • TURMA XXI)
 * 4. PREDADORA (Amarelo Ouro & Preto • MED UEMA XXII)
 * 5. TORMENTA (Pré-pronta para o escudo oficial • Medicina UEMA)
 */
export const OFFICIAL_MODALITIES: SportModality[] = [
  {
    id: 'futsal',
    name: 'Futsal',
    iconKey: 'futsal',
    categories: [],
  },
  {
    id: 'basquete',
    name: 'Basquete',
    iconKey: 'basquete',
    categories: [],
  },
  {
    id: 'handebol',
    name: 'Handebol',
    iconKey: 'handebol',
    categories: [],
  },
  {
    id: 'volei',
    name: 'Vôlei',
    iconKey: 'volei',
    categories: [],
  },
  {
    id: 'volei-de-praia',
    name: 'Vôlei de Praia',
    iconKey: 'volei-de-praia',
    categories: [],
  },
  {
    id: 'truco',
    name: 'Truco',
    iconKey: 'truco',
    categories: [],
  },
  {
    id: 'sinuca',
    name: 'Sinuca',
    iconKey: 'sinuca',
    categories: [],
  },
  {
    id: 'natacao',
    name: 'Natação',
    iconKey: 'natacao',
    categories: [],
  },
  {
    id: 'poker',
    name: 'Poker',
    iconKey: 'poker',
    categories: [],
  },
  {
    id: 'tenis-de-mesa',
    name: 'Tênis de Mesa',
    iconKey: 'tenis-de-mesa',
    categories: [],
  },
];

export const ALL_MODALITY_SLUGS: ModalitySlug[] = OFFICIAL_MODALITIES.map((m) => m.id);

export interface OfficialTournamentModality {
  id: string;
  name: string;
  sportSlug: ModalitySlug;
  type: 'coletiva' | 'individual';
  gender: 'feminino' | 'masculino';
  weight: 2 | 1;
  points1st: number;
  points2nd: number;
  points3rd: number;
  points4th: number;
}

/**
 * 16 MODALIDADES OFICIAIS DO INTRAMED IX (Regulamento Atualizado):
 * - 8 Coletivas (Peso 2: 20, 14, 8, 6 pontos)
 * - 8 Individuais (Peso 1: 10, 7, 4, 3 pontos)
 */
export const TOURNAMENT_16_MODALITIES: OfficialTournamentModality[] = [
  // 8 Coletivas (Peso 2)
  {
    id: 'volei-fem',
    name: 'Vôlei Feminino',
    sportSlug: 'volei',
    type: 'coletiva',
    gender: 'feminino',
    weight: 2,
    points1st: 20,
    points2nd: 14,
    points3rd: 8,
    points4th: 6,
  },
  {
    id: 'volei-masc',
    name: 'Vôlei Masculino',
    sportSlug: 'volei',
    type: 'coletiva',
    gender: 'masculino',
    weight: 2,
    points1st: 20,
    points2nd: 14,
    points3rd: 8,
    points4th: 6,
  },
  {
    id: 'basquete-fem',
    name: 'Basquete Feminino',
    sportSlug: 'basquete',
    type: 'coletiva',
    gender: 'feminino',
    weight: 2,
    points1st: 20,
    points2nd: 14,
    points3rd: 8,
    points4th: 6,
  },
  {
    id: 'basquete-masc',
    name: 'Basquete Masculino',
    sportSlug: 'basquete',
    type: 'coletiva',
    gender: 'masculino',
    weight: 2,
    points1st: 20,
    points2nd: 14,
    points3rd: 8,
    points4th: 6,
  },
  {
    id: 'handebol-fem',
    name: 'Handebol Feminino',
    sportSlug: 'handebol',
    type: 'coletiva',
    gender: 'feminino',
    weight: 2,
    points1st: 20,
    points2nd: 14,
    points3rd: 8,
    points4th: 6,
  },
  {
    id: 'handebol-masc',
    name: 'Handebol Masculino',
    sportSlug: 'handebol',
    type: 'coletiva',
    gender: 'masculino',
    weight: 2,
    points1st: 20,
    points2nd: 14,
    points3rd: 8,
    points4th: 6,
  },
  {
    id: 'futsal-fem',
    name: 'Futsal Feminino',
    sportSlug: 'futsal',
    type: 'coletiva',
    gender: 'feminino',
    weight: 2,
    points1st: 20,
    points2nd: 14,
    points3rd: 8,
    points4th: 6,
  },
  {
    id: 'futsal-masc',
    name: 'Futsal Masculino',
    sportSlug: 'futsal',
    type: 'coletiva',
    gender: 'masculino',
    weight: 2,
    points1st: 20,
    points2nd: 14,
    points3rd: 8,
    points4th: 6,
  },

  // 8 Individuais (Peso 1)
  {
    id: 'sinuca-fem',
    name: 'Sinuca Feminina',
    sportSlug: 'sinuca',
    type: 'individual',
    gender: 'feminino',
    weight: 1,
    points1st: 10,
    points2nd: 7,
    points3rd: 4,
    points4th: 3,
  },
  {
    id: 'sinuca-masc',
    name: 'Sinuca Masculina',
    sportSlug: 'sinuca',
    type: 'individual',
    gender: 'masculino',
    weight: 1,
    points1st: 10,
    points2nd: 7,
    points3rd: 4,
    points4th: 3,
  },
  {
    id: 'truco-fem',
    name: 'Truco Feminino',
    sportSlug: 'truco',
    type: 'individual',
    gender: 'feminino',
    weight: 1,
    points1st: 10,
    points2nd: 7,
    points3rd: 4,
    points4th: 3,
  },
  {
    id: 'truco-masc',
    name: 'Truco Masculino',
    sportSlug: 'truco',
    type: 'individual',
    gender: 'masculino',
    weight: 1,
    points1st: 10,
    points2nd: 7,
    points3rd: 4,
    points4th: 3,
  },
  {
    id: 'volei-praia-fem',
    name: 'Vôlei de Praia Feminino',
    sportSlug: 'volei-de-praia',
    type: 'individual',
    gender: 'feminino',
    weight: 1,
    points1st: 10,
    points2nd: 7,
    points3rd: 4,
    points4th: 3,
  },
  {
    id: 'volei-praia-masc',
    name: 'Vôlei de Praia Masculino',
    sportSlug: 'volei-de-praia',
    type: 'individual',
    gender: 'masculino',
    weight: 1,
    points1st: 10,
    points2nd: 7,
    points3rd: 4,
    points4th: 3,
  },
  {
    id: 'tenis-mesa-fem',
    name: 'Tênis de Mesa Feminino',
    sportSlug: 'tenis-de-mesa',
    type: 'individual',
    gender: 'feminino',
    weight: 1,
    points1st: 10,
    points2nd: 7,
    points3rd: 4,
    points4th: 3,
  },
  {
    id: 'tenis-mesa-masc',
    name: 'Tênis de Mesa Masculino',
    sportSlug: 'tenis-de-mesa',
    type: 'individual',
    gender: 'masculino',
    weight: 1,
    points1st: 10,
    points2nd: 7,
    points3rd: 4,
    points4th: 3,
  },
];

export const INITIAL_TEAMS: Team[] = [
  {
    id: 'colossal',
    name: 'Colossal',
    shortName: 'COL',
    turmaLabel: 'MEDUEMA TXXIV',
    mascotLabel: 'Crocodilo Colossal',
    crestUrl: '/assets/teams/colossal.jpg',
    theme: {
      colorLabel: 'Verde Esmeralda & Dourado',
      primaryHex: '#065F46',
      secondaryHex: '#022C22',
      accentHex: '#FACC15',
      badgeBgClass: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40',
      badgeTextClass: 'text-emerald-700',
      ringClass: 'ring-emerald-500',
    },
    modalityIds: ALL_MODALITY_SLUGS,
  },
  {
    id: 'soberana',
    name: 'Soberana',
    shortName: 'SOB',
    turmaLabel: 'MEDUEMA XXV',
    mascotLabel: 'Águia Imperial Soberana',
    crestUrl: '/assets/teams/soberana.png',
    theme: {
      colorLabel: 'Grená Imperial & Ouro',
      primaryHex: '#6B0F24',
      secondaryHex: '#3B0612',
      accentHex: '#F59E0B',
      badgeBgClass: 'bg-[#4A0817] text-amber-300 border-amber-400/40',
      badgeTextClass: 'text-[#6B0F24]',
      ringClass: 'ring-[#6B0F24]',
    },
    modalityIds: ALL_MODALITY_SLUGS,
  },
  {
    id: 'sanguinaria',
    name: 'Sanguinária',
    shortName: 'SAN',
    turmaLabel: 'TURMA XXI • MED UEMA',
    mascotLabel: 'Dragão Rubro Sanguinário',
    crestUrl: '/assets/teams/sanguinaria.jpg',
    theme: {
      colorLabel: 'Vermelho Vivo & Chamas',
      primaryHex: '#DC2626',
      secondaryHex: '#7F1D1D',
      accentHex: '#FACC15',
      badgeBgClass: 'bg-red-950/90 text-red-300 border-red-500/40',
      badgeTextClass: 'text-red-600',
      ringClass: 'ring-red-600',
    },
    modalityIds: ALL_MODALITY_SLUGS,
  },
  {
    id: 'predadora',
    name: 'Predadora',
    shortName: 'PRE',
    turmaLabel: 'MED UEMA XXII',
    mascotLabel: 'Onça-Pintada Predadora',
    crestUrl: '/assets/teams/predadora.jpg',
    theme: {
      colorLabel: 'Amarelo Ouro & Preto',
      primaryHex: '#CA8A04',
      secondaryHex: '#18181B',
      accentHex: '#FACC15',
      badgeBgClass: 'bg-amber-400 text-zinc-950 border-amber-500',
      badgeTextClass: 'text-amber-600',
      ringClass: 'ring-amber-400',
    },
    modalityIds: ALL_MODALITY_SLUGS,
  },
  {
    id: 'tormenta',
    name: 'Tormenta',
    shortName: 'TOR',
    turmaLabel: 'MED UEMA XXIII',
    mascotLabel: 'Leviatã / Serpente Marinha Tormenta',
    crestUrl: '/assets/teams/tormenta.png',
    theme: {
      colorLabel: 'Azul Ciano, Marinho & Laranja',
      primaryHex: '#0284C7',
      secondaryHex: '#082F49',
      accentHex: '#38BDF8',
      badgeBgClass: 'bg-sky-950/90 text-sky-300 border-sky-400/40',
      badgeTextClass: 'text-sky-600',
      ringClass: 'ring-sky-400',
    },
    modalityIds: ALL_MODALITY_SLUGS,
  },
];

// Estado oficial inicial de atletas e partidas aguarda cadastro
export const INITIAL_ATHLETES: Athlete[] = [];
export const INITIAL_MATCHES: Match[] = [];
export const INITIAL_STANDINGS: Record<string, StandingEntry[]> = {};
export const INITIAL_STATISTICS: Record<string, ModalityStatisticItem[]> = {};
export const INITIAL_BRACKETS: Record<string, BracketStructure> = {};
export const INITIAL_USER_PROFILE: UserProfile | null = null;
