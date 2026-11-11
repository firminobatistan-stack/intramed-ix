import {
  TournamentEvent,
  Registration,
  FinancialAuditLog,
  TurmaDefinition,
} from '../types/domain';

export const TURMAS_MEDICINA: TurmaDefinition[] = [
  {
    turma: '21',
    number: 21,
    roman: 'XXI',
    name: 'Sanguinária',
    fullName: 'Sanguinária • T21',
    teamId: 'sanguinaria',
    crestUrl: '/assets/teams/sanguinaria.jpg',
    primaryColor: '#DC2626',
    badgeBg: 'bg-red-950/90 border-red-500/40 text-red-200',
    textColor: 'text-red-600',
    description: 'Turma 21',
  },
  {
    turma: '22',
    number: 22,
    roman: 'XXII',
    name: 'Predadora',
    fullName: 'Predadora • T22',
    teamId: 'predadora',
    crestUrl: '/assets/teams/predadora.jpg',
    primaryColor: '#CA8A04',
    badgeBg: 'bg-amber-950/90 border-amber-500/40 text-amber-200',
    textColor: 'text-amber-600',
    description: 'Turma 22',
  },
  {
    turma: '23',
    number: 23,
    roman: 'XXIII',
    name: 'Tormenta',
    fullName: 'Tormenta • T23',
    teamId: 'tormenta',
    crestUrl: '/assets/teams/tormenta.png',
    primaryColor: '#0284C7',
    badgeBg: 'bg-cyan-950/90 border-cyan-500/40 text-cyan-200',
    textColor: 'text-sky-600',
    description: 'Turma 23',
  },
  {
    turma: '24',
    number: 24,
    roman: 'XXIV',
    name: 'Colossal',
    fullName: 'Colossal • T24',
    teamId: 'colossal',
    crestUrl: '/assets/teams/colossal.jpg',
    primaryColor: '#065F46',
    badgeBg: 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200',
    textColor: 'text-emerald-600',
    description: 'Turma 24',
  },
  {
    turma: '25',
    number: 25,
    roman: 'XXV',
    name: 'Soberana',
    fullName: 'Soberana • T25',
    teamId: 'soberana',
    crestUrl: '/assets/teams/soberana.png',
    primaryColor: '#6B0F24',
    badgeBg: 'bg-[#4A0817] border-amber-400/40 text-amber-200',
    textColor: 'text-[#6B0F24]',
    description: 'Turma 25',
  },
];

export const INITIAL_TOURNAMENT_EVENT: TournamentEvent = {
  id: 'intramed-ix-2026',
  title: 'INTRAMED IX — Jogos Universitários de Medicina',
  edition: 'IX',
  year: 2026,
  description:
    'Maior competição esportiva universitária de Medicina do Maranhão, organizada pela A.A.A. Cangaceira. Inscrições por modalidade com valores exclusivos para sócios associados.',
  startDateIso: '2026-11-20T07:00:00Z',
  endDateIso: '2026-11-29T22:00:00Z',
  status: 'open_for_registrations',
  lots: [
    {
      id: 'lote-1-cangaceira',
      eventId: 'intramed-ix-2026',
      name: '1º Lote Oficial — IntraMed IX',
      priceMember: 50.0, // Preço Sócio da Atlética (R$ 50,00)
      priceNonMember: 60.0, // Preço Não Sócio (R$ 60,00)
      priceGuest: 65.0, // Preço Atleta Convidado — Restrito à Turma 21 (1 Masc / 1 Fem)
      startDateIso: '2026-10-01T00:00:00Z',
      endDateIso: '2026-11-20T23:59:59Z',
      isActive: true,
    },
    {
      id: 'lote-2-cangaceira',
      eventId: 'intramed-ix-2026',
      name: '2º Lote Final',
      priceMember: 60.0,
      priceNonMember: 75.0,
      priceGuest: 80.0,
      startDateIso: '2026-11-21T00:00:00Z',
      endDateIso: '2026-11-28T23:59:59Z',
      isActive: false,
    },
  ],
};

export function resolveLotAuthorizedPrice(
  lotId?: string,
  memberStatus?: string,
  requestedMemberDiscount?: boolean,
  isGuestAthlete?: boolean
): number {
  const lot =
    INITIAL_TOURNAMENT_EVENT.lots.find((l) => l.id === lotId) ||
    INITIAL_TOURNAMENT_EVENT.lots.find((l) => l.isActive) ||
    INITIAL_TOURNAMENT_EVENT.lots[0];
  if (isGuestAthlete) {
    return lot.priceGuest ?? 65.0;
  }
  if (memberStatus === 'aprovado') {
    return lot.priceMember;
  }
  if (memberStatus === 'rejeitado' || memberStatus === 'nao_solicitado') {
    return lot.priceNonMember;
  }
  return requestedMemberDiscount ? lot.priceMember : lot.priceNonMember;
}

export const INITIAL_DEMO_REGISTRATIONS: Registration[] = [];

export const INITIAL_FINANCIAL_AUDIT_LOGS: FinancialAuditLog[] = [];
