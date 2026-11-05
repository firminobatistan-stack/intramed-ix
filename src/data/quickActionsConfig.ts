import { MatchEventType, ModalitySlug } from '../types/domain';

export interface QuickActionDef {
  type: MatchEventType;
  label: string;
  shortBadge: string;
  pointsDelta?: number;
  requiresAthlete: boolean;
  requiresSecondaryAthlete?: boolean;
  accentColor: 'blue' | 'yellow' | 'red' | 'neutral';
}

const FUTSAL_QUICK_ACTIONS: QuickActionDef[] = [
  {
    type: 'goal',
    label: 'GOL',
    shortBadge: '⚽',
    pointsDelta: 1,
    requiresAthlete: true,
    requiresSecondaryAthlete: true,
    accentColor: 'blue',
  },
  {
    type: 'penalty_goal',
    label: 'GOL DE PÊNALTI',
    shortBadge: '🥅',
    pointsDelta: 1,
    requiresAthlete: true,
    accentColor: 'blue',
  },
  {
    type: 'direct_free_throw',
    label: 'TIRO LIVRE (10m)',
    shortBadge: '🎯',
    pointsDelta: 1,
    requiresAthlete: true,
    accentColor: 'blue',
  },
  {
    type: 'foul',
    label: 'FALTA ACUMULADA',
    shortBadge: '⚠️',
    requiresAthlete: true,
    accentColor: 'neutral',
  },
  {
    type: 'yellow_card',
    label: 'CARTÃO',
    shortBadge: '🟨',
    requiresAthlete: true,
    accentColor: 'yellow',
  },
  {
    type: 'expulsion',
    label: 'EXPULSÃO',
    shortBadge: '🟥',
    requiresAthlete: true,
    accentColor: 'red',
  },
  {
    type: 'substitution',
    label: 'SUBSTITUIÇÃO',
    shortBadge: '🔄',
    requiresAthlete: true,
    requiresSecondaryAthlete: true,
    accentColor: 'neutral',
  },
  {
    type: 'timeout',
    label: 'PEDIDO DE TEMPO',
    shortBadge: '⏱️',
    requiresAthlete: false,
    accentColor: 'neutral',
  },
];

const HANDEBOL_QUICK_ACTIONS: QuickActionDef[] = [
  {
    type: 'goal',
    label: 'GOL',
    shortBadge: '🤾',
    pointsDelta: 1,
    requiresAthlete: true,
    accentColor: 'blue',
  },
  {
    type: 'seven_meters',
    label: 'GOL 7 METROS',
    shortBadge: '7m',
    pointsDelta: 1,
    requiresAthlete: true,
    accentColor: 'blue',
  },
  {
    type: 'suspension_2min',
    label: '2 MINUTOS',
    shortBadge: '⏱️ 2m',
    requiresAthlete: true,
    accentColor: 'yellow',
  },
  {
    type: 'yellow_card',
    label: 'ADVERTÊNCIA (AMARELO)',
    shortBadge: '🟨',
    requiresAthlete: true,
    accentColor: 'yellow',
  },
  {
    type: 'expulsion',
    label: 'DESQUALIFICAÇÃO (VERMELHO)',
    shortBadge: '🟥',
    requiresAthlete: true,
    accentColor: 'red',
  },
  {
    type: 'disqualification',
    label: 'RELATÓRIO (AZUL)',
    shortBadge: '🟦',
    requiresAthlete: true,
    accentColor: 'blue',
  },
  {
    type: 'substitution',
    label: 'SUBSTITUIÇÃO',
    shortBadge: '🔄',
    requiresAthlete: true,
    requiresSecondaryAthlete: true,
    accentColor: 'neutral',
  },
  {
    type: 'timeout',
    label: 'TEMPO TÉCNICO (TTO)',
    shortBadge: '⏸️',
    requiresAthlete: false,
    accentColor: 'neutral',
  },
];

const BASQUETE_QUICK_ACTIONS: QuickActionDef[] = [
  {
    type: 'point_1',
    label: '+1 LANCE LIVRE',
    shortBadge: '+1',
    pointsDelta: 1,
    requiresAthlete: true,
    accentColor: 'blue',
  },
  {
    type: 'point_2',
    label: '+2 PONTOS',
    shortBadge: '+2',
    pointsDelta: 2,
    requiresAthlete: true,
    accentColor: 'blue',
  },
  {
    type: 'point_3',
    label: '+3 PONTOS',
    shortBadge: '+3',
    pointsDelta: 3,
    requiresAthlete: true,
    accentColor: 'yellow',
  },
  {
    type: 'foul',
    label: 'FALTA PESSOAL',
    shortBadge: '⚠️',
    requiresAthlete: true,
    accentColor: 'neutral',
  },
  {
    type: 'technical_foul',
    label: 'FALTA TÉCNICA (T)',
    shortBadge: '🇹',
    requiresAthlete: true,
    accentColor: 'yellow',
  },
  {
    type: 'unsportsmanlike_foul',
    label: 'ANTIDESPORTIVA (U)',
    shortBadge: '🇺',
    requiresAthlete: true,
    accentColor: 'yellow',
  },
  {
    type: 'team_foul',
    label: 'FALTA EQUIPE',
    shortBadge: '🛡️',
    requiresAthlete: false,
    accentColor: 'neutral',
  },
  {
    type: 'substitution',
    label: 'SUBSTITUIÇÃO',
    shortBadge: '🔄',
    requiresAthlete: true,
    requiresSecondaryAthlete: true,
    accentColor: 'neutral',
  },
  {
    type: 'timeout',
    label: 'TIMEOUT',
    shortBadge: '⏱️',
    requiresAthlete: false,
    accentColor: 'neutral',
  },
  {
    type: 'disqualification',
    label: 'DESQUALIFICADO',
    shortBadge: '🟥',
    requiresAthlete: true,
    accentColor: 'red',
  },
];

const VOLEI_BASE_QUICK_ACTIONS: QuickActionDef[] = [
  {
    type: 'set_point',
    label: '+1 PONTO (DIRETO)',
    shortBadge: '🏐 +1',
    pointsDelta: 1,
    requiresAthlete: false,
    accentColor: 'blue',
  },
  {
    type: 'volleyball_attack',
    label: 'ATAQUE (PONTO)',
    shortBadge: '💥',
    pointsDelta: 1,
    requiresAthlete: true,
    accentColor: 'blue',
  },
  {
    type: 'volleyball_block',
    label: 'BLOQUEIO (PONTO)',
    shortBadge: '🧱',
    pointsDelta: 1,
    requiresAthlete: true,
    accentColor: 'blue',
  },
  {
    type: 'volleyball_ace',
    label: 'ACE / SAQUE',
    shortBadge: '🎯',
    pointsDelta: 1,
    requiresAthlete: true,
    accentColor: 'blue',
  },
  {
    type: 'volleyball_opponent_error',
    label: 'ERRO ADVERSÁRIO',
    shortBadge: '❌',
    pointsDelta: 1,
    requiresAthlete: false,
    accentColor: 'neutral',
  },
  {
    type: 'timeout',
    label: 'TIMEOUT (30s)',
    shortBadge: '⏱️',
    requiresAthlete: false,
    accentColor: 'neutral',
  },
  {
    type: 'yellow_card',
    label: 'SANÇÃO / CARTÃO',
    shortBadge: '🟨',
    requiresAthlete: true,
    accentColor: 'yellow',
  },
];

const VOLEI_QUADRA_QUICK_ACTIONS: QuickActionDef[] = [
  ...VOLEI_BASE_QUICK_ACTIONS,
  {
    type: 'substitution',
    label: 'SUBSTITUIÇÃO',
    shortBadge: '🔄',
    requiresAthlete: true,
    requiresSecondaryAthlete: true,
    accentColor: 'neutral',
  },
];

const DEFAULT_QUICK_ACTIONS: QuickActionDef[] = [
  {
    type: 'table_note',
    label: 'REGISTRAR OCORRÊNCIA',
    shortBadge: '📝',
    requiresAthlete: false,
    accentColor: 'neutral',
  },
];

export function getQuickActionsForModality(modalityId: ModalitySlug): QuickActionDef[] {
  switch (modalityId) {
    case 'futsal':
      return FUTSAL_QUICK_ACTIONS;
    case 'handebol':
      return HANDEBOL_QUICK_ACTIONS;
    case 'basquete':
      return BASQUETE_QUICK_ACTIONS;
    case 'volei':
      return VOLEI_QUADRA_QUICK_ACTIONS;
    case 'volei-de-praia':
      return VOLEI_BASE_QUICK_ACTIONS;
    default:
      return DEFAULT_QUICK_ACTIONS;
  }
}
