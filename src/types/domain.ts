/**
 * Arquitetura de Domínio Oficial — INTRAMED IX
 * Inclui Motor de Súmula ao Vivo, Marcador de Placar, Auditoria e Sincronização.
 * Nenhum dado fictício oficial é instanciado.
 */

// 1. USUÁRIOS E PERMISSÕES
export type UserRole = 'atleta' | 'organizacao' | 'moderador' | 'administrador';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: UserRole;
  teamId?: string | null;
  teamName?: string | null;
  linkedAthleteId?: string | null;
  modalityIds: string[];
  registrationCode?: string | null;
}

// 2. MODALIDADES E CONFIGURAÇÃO DE REGRAS
export type ModalitySlug =
  | 'futsal'
  | 'basquete'
  | 'handebol'
  | 'volei'
  | 'volei-de-praia'
  | 'truco'
  | 'sinuca'
  | 'natacao'
  | 'poker'
  | 'tenis-de-mesa';

export type ModalityIconKey = ModalitySlug;

export type ScoringModelType =
  | 'goals_timed'      // Futsal, Handebol
  | 'points_quarters'  // Basquete
  | 'sets_points'      // Vôlei, Vôlei de Praia
  | 'team_submatches'  // Tênis de Mesa
  | 'swimming_heats'   // Natação
  | 'modular_table';   // Truco, Sinuca, Poker (aguardando regulamento)

export interface CategoryRuleConfig {
  categoryName: string; // Ex: 'Masculino', 'Feminino', 'Geral'
  periodsCount: number;
  periodDurationSeconds: number;
  hasOvertime: boolean;
  overtimeDurationSeconds: number;
  timeoutDurationSeconds: number;
  maxTimeoutsPerPeriod: number;
  teamFoulLimitPerPeriod?: number;
  setsToWin?: number;
  pointsPerSet?: number;
  decidingSetPoints?: number;
}

export interface ModalityRuleEngineConfig {
  modalityId: ModalitySlug;
  scoringModel: ScoringModelType;
  timerDirection: 'countdown' | 'countup' | 'none';
  supportsCards: boolean;
  supportsTwoMinuteSuspension: boolean;
  supportsTeamFouls: boolean;
  supportsSubstitutions: boolean;
  supportsGoalkeeper: boolean;
  supportsPairs: boolean;
  defaultCategoryRules: Record<string, CategoryRuleConfig>;
}

export interface Category {
  id: string;
  modalityId: string;
  name: string;
}

export interface SportModality {
  id: ModalitySlug;
  name: string;
  iconKey: ModalityIconKey;
  categories: Category[];
}

export interface TeamThemePalette {
  colorLabel: string;       // Ex: 'Verde & Dourado', 'Grená & Ouro', 'Vermelho Vivo', 'Amarelo & Preto'
  primaryHex: string;       // Cor predominante principal
  secondaryHex: string;     // Cor secundária / degradê
  accentHex: string;        // Cor de destaque (sublinhados, badges, botões)
  badgeBgClass: string;     // Classes Tailwind de badge
  badgeTextClass: string;
  ringClass: string;
}

export interface Team {
  id: string;
  name: string;
  shortName?: string;
  turmaLabel?: string;      // Ex: 'MEDUEMA TXXIV', 'MEDUEMA XXV', 'TURMA XXI', 'MED UEMA XXII'
  mascotLabel?: string;     // Ex: 'Crocodilo Colossal', 'Águia Soberana', 'Dragão Sanguinário', 'Onça Predadora'
  crestUrl?: string | null;
  theme?: TeamThemePalette;
  modalityIds: ModalitySlug[];
  isTestOnly?: boolean;
}

export interface Athlete {
  id: string;
  name: string;
  avatarUrl?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
  teamId: string;
  modalityIds: ModalitySlug[];
  isTestOnly?: boolean;
}

export type MatchStatus =
  | 'scheduled'
  | 'live'
  | 'halftime'
  | 'finished'
  | 'postponed'
  | 'cancelled';

export type TournamentPhaseType =
  | 'group_stage'
  | 'quarterfinals'
  | 'semifinals'
  | 'third_place'
  | 'final';

export interface MatchTeamSlot {
  teamId: string | null;
  teamName: string | null;
  crestUrl: string | null;
  score: number | null;
  setsWon?: number;
  isWinner?: boolean;
}

// 3. CRONÔMETRO, PERÍODOS, SETS, PUNIÇÕES E SUB-PARTIDAS
export type PeriodLifecycleState =
  | 'not_started'
  | 'running'
  | 'paused'
  | 'period_ended'
  | 'interval'
  | 'overtime'
  | 'penalties'
  | 'match_ended';

export interface MatchTimerState {
  currentPeriod: number;
  totalPeriods: number;
  periodLabel: string; // Ex: '1º Período', 'Set 1', 'Prova'
  remainingSeconds: number;
  initialPeriodSeconds: number;
  elapsedSeconds: number;
  isRunning: boolean;
  lifecycle: PeriodLifecycleState;
  lastTickTimestamp?: number | null;
}

export interface PeriodScoreEntry {
  periodNumber: number;
  label: string; // 'P1', 'P2', '1º T', 'Set 1'
  homeScore: number;
  awayScore: number;
  isFinished: boolean;
}

export interface ActiveSuspensionTimer {
  id: string;
  eventId: string;
  teamSide: 'home' | 'away';
  teamName: string;
  athleteId: string;
  athleteName: string;
  athleteNumber?: number | null;
  startedAtMatchClock: string;
  durationSeconds: number;
  remainingSeconds: number;
  expectedReturnMatchClock: string;
  isReleased: boolean;
}

export interface ActiveTimeoutTimer {
  isActive: boolean;
  teamSide: 'home' | 'away';
  teamName: string;
  remainingSeconds: number;
  totalSeconds: number;
}

// Tênis de Mesa: sub-partidas dentro do confronto de equipes
export interface TableTennisSubMatch {
  id: string;
  orderNumber: number;
  label: string; // Ex: 'Partida Individual 1'
  homeAthleteId?: string | null;
  homeAthleteName: string;
  awayAthleteId?: string | null;
  awayAthleteName: string;
  homeSetsWon: number;
  awaySetsWon: number;
  currentSetHomePoints: number;
  currentSetAwayPoints: number;
  status: 'pending' | 'live' | 'finished';
  winnerSide?: 'home' | 'away' | null;
}

// Natação: provas por estilo e classificação automática por raias
export type SwimmingStrokeType = 'Crawl' | 'Borboleta' | 'Peito' | 'Costas';

export interface SwimmingLaneEntry {
  laneNumber: number;
  athleteId: string;
  athleteName: string;
  teamName: string;
  registeredTimeMs: number | null;
  formattedTime: string | null; // Ex: '00:26.45'
  status: 'ready' | 'finished' | 'dsq' | 'dns';
  placement: number | null;
}

// 4. ESCALAÇÃO
export interface MatchLineupEntry {
  athleteId: string;
  athleteName: string;
  jerseyNumber?: number | null;
  isStarter: boolean;
  isCaptain?: boolean;
  isGoalkeeper?: boolean;
  isPairMember?: boolean;
  isDisqualified?: boolean;
}

// 5. EVENTOS EM TEMPO REAL E AUDITORIA (CORREÇÃO / HISTÓRICO)
export type MatchEventType =
  | 'goal'
  | 'point_1'
  | 'point_2'
  | 'point_3'
  | 'set_point'
  | 'set_end'
  | 'foul'
  | 'team_foul'
  | 'technical_foul'
  | 'unsportsmanlike_foul'
  | 'direct_free_throw'
  | 'volleyball_ace'
  | 'volleyball_block'
  | 'volleyball_attack'
  | 'volleyball_opponent_error'
  | 'yellow_card'
  | 'red_card'
  | 'expulsion'
  | 'disqualification'
  | 'suspension_2min'
  | 'seven_meters'
  | 'penalty_goal'
  | 'penalty_miss'
  | 'substitution'
  | 'timeout'
  | 'period_start'
  | 'period_end'
  | 'swimming_time'
  | 'table_note';

export interface MatchEventAuditRecord {
  id: string;
  timestampIso: string;
  operatorRole: string;
  action: 'edited' | 'deleted';
  previousSummary: string;
  newSummary: string;
  reason?: string;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  type: MatchEventType;
  typeLabel: string;
  teamSide?: 'home' | 'away' | null;
  teamId?: string | null;
  teamName?: string | null;
  athleteId?: string | null;
  athleteName?: string | null;
  athleteNumber?: number | null;
  secondaryAthleteId?: string | null; // Ex: atleta que entrou na substituição ou autor da assistência
  secondaryAthleteName?: string | null;
  secondaryAthleteNumber?: number | null;
  periodNumber: number;
  periodLabel: string;
  matchClockDisplay: string; // Ex: '14:32'
  createdAtIso: string;
  pointsDelta?: number;
  foulReason?: string;
  notes?: string;
  isDeleted?: boolean;
  auditHistory: MatchEventAuditRecord[];
}

// 6. SÚMULA CONSOLIDADA E PARTIDA COMPLETA
export interface MatchSheet {
  id: string;
  matchId: string;
  modalityId: ModalitySlug;
  scoringModel: ScoringModelType;
  isTestMode: boolean;
  homeLineup: MatchLineupEntry[];
  awayLineup: MatchLineupEntry[];
  timer: MatchTimerState;
  periodScores: PeriodScoreEntry[];
  events: MatchEvent[];
  activeSuspensions: ActiveSuspensionTimer[];
  activeTimeout: ActiveTimeoutTimer | null;
  homeTimeoutsUsed: number;
  awayTimeoutsUsed: number;
  homeFoulsCurrentPeriod: number;
  awayFoulsCurrentPeriod: number;
  // Específicos de Tênis de Mesa
  subMatches?: TableTennisSubMatch[];
  activeSubMatchIndex?: number;
  // Específicos de Natação
  swimmingStroke?: SwimmingStrokeType;
  swimmingDistanceLabel?: string;
  swimmingLanes?: SwimmingLaneEntry[];
  // Arbitragem e Fechamento
  refereeNotes: string;
  refereeName?: string;
  assistantRefereeName?: string;
  tableOfficialName?: string;
  timekeeperName?: string;
  twentyFourSecOperatorName?: string;
  isClosed: boolean;
  closedAtIso?: string | null;
  syncStatus: 'synced' | 'pending_sync' | 'offline_ready';
  lastUpdatedIso: string;
}

export interface Match {
  id: string;
  modalityId: ModalitySlug;
  modalityName: string;
  categoryId?: string | null;
  categoryName?: string | null;
  phase: TournamentPhaseType;
  phaseLabel: string;
  status: MatchStatus;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  venue?: string | null;
  homeTeam: MatchTeamSlot;
  awayTeam: MatchTeamSlot;
  matchSheetId?: string | null;
  isTestData?: boolean;
}

export interface BracketMatchSlot {
  id: string;
  phase: 'quarterfinals' | 'semifinals' | 'final';
  orderIndex: number;
  nextSlotId?: string | null;
  match: Match | null;
}

export interface BracketStructure {
  modalityId: ModalitySlug;
  categoryId?: string | null;
  isConfigured: boolean;
  quarterfinals: BracketMatchSlot[];
  semifinals: BracketMatchSlot[];
  final: BracketMatchSlot | null;
}

export interface StandingEntry {
  teamId: string;
  teamName: string;
  crestUrl?: string | null;
  position: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  scoreFor: number;
  scoreAgainst: number;
  scoreDifference: number;
}

export interface ModalityStatisticItem {
  id: string;
  athleteId: string;
  athleteName: string;
  teamId: string;
  teamName: string;
  teamCrestUrl?: string | null;
  metricLabel: string;
  value: number;
}

// 7. ESTATÍSTICAS BÁSICAS DERIVADAS DA SÚMULA (SEM DUPLICAÇÃO)
export interface AthleteMatchLogItem {
  matchId: string;
  modalityId: ModalitySlug;
  modalityName: string;
  phaseLabel: string;
  status: MatchStatus;
  isOfficialValidated: boolean;
  scheduledDate?: string | null;
  teamSide: 'home' | 'away';
  teamName: string;
  opponentName: string;
  teamScore: number | null;
  opponentScore: number | null;
  isStarter: boolean;
  // Indicadores básicos daquela partida
  goals: number;
  pointsTotal: number;
  baskets3Pt: number;
  baskets2Pt: number;
  freeThrows1Pt: number;
  yellowCards: number;
  redCards: number;
  suspensions2Min: number;
  fouls: number;
  setsParticipated: number;
  subMatchesWon: number;
  bestSwimmingTimeFormatted?: string | null;
  swimmingPlacement?: number | null;
}

export interface DerivedAthleteModalityStats {
  athleteId: string;
  modalityId: ModalitySlug;
  matchesPlayed: number;
  officialMatchesPlayed: number;
  liveMatchesPlayed: number;
  startersCount: number;
  // Futsal & Handebol
  goals: number;
  yellowCards: number;
  redCards: number;
  suspensions2Min: number; // Handebol
  // Basquete (apenas pontos e faltas da súmula — sem tocos/rebotes)
  pointsTotal: number;
  baskets3Pt: number;
  baskets2Pt: number;
  freeThrows1Pt: number;
  fouls: number;
  // Vôlei / Vôlei de Praia (apenas participação coletiva — sem pontos individuais)
  setsParticipated: number;
  teamWinsInVolley: number;
  // Tênis de Mesa
  subMatchesPlayed: number;
  subMatchesWon: number;
  // Natação
  heatsRaced: number;
  bestTimeMs: number | null;
  bestTimeFormatted: string | null;
  podiumsCount: number;
  bestPlacement: number | null;
  // Histórico partida a partida
  matchLogs: AthleteMatchLogItem[];
}

export interface TeamRecentMatchCapsule {
  matchId: string;
  modalityId: ModalitySlug;
  modalityName: string;
  opponentName: string;
  opponentCrestUrl?: string | null;
  teamScore: number | null;
  opponentScore: number | null;
  status: MatchStatus;
  outcome: 'W' | 'D' | 'L' | 'PENDING';
}

export interface DerivedTeamStats {
  teamId: string;
  teamName: string;
  crestUrl?: string | null;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsOrPointsFor: number;
  goalsOrPointsAgainst: number;
  yellowCards: number;
  redCards: number;
  recentCapsules: TeamRecentMatchCapsule[];
}

export interface LeaderboardEntry {
  rank: number;
  athleteId: string;
  athleteName: string;
  avatarUrl?: string | null;
  jerseyNumber?: number | null;
  teamId: string;
  teamName: string;
  teamCrestUrl?: string | null;
  modalityId: ModalitySlug;
  matchesPlayed: number;
  primaryValue: number;
  primaryDisplay: string;
  secondaryDisplay?: string;
  hasLivePartial?: boolean;
}

// ==========================================
// 12. MÓDULO DE INSCRIÇÕES E PAGAMENTOS (INTRAMED IX)
// ==========================================

export type TurmaMedicina = '21' | '22' | '23' | '24' | '25';

export interface TurmaDefinition {
  turma: TurmaMedicina;
  number: number;
  roman: string;
  name: string; // 'Sanguinária', 'Predadora', etc.
  fullName: string; // 'Turma XXI • Sanguinária'
  teamId: string;
  crestUrl: string;
  primaryColor: string;
  badgeBg: string;
  textColor: string;
  description: string;
}

export type MemberStatus =
  | 'nao_solicitado'      // Não solicitou desconto de sócio (preço integral)
  | 'pendente'            // Solicitou desconto de sócio, aguardando conferência administrativa
  | 'aprovado'            // Desconto de sócio aprovado pelo administrador
  | 'rejeitado';          // Desconto de sócio rejeitado pelo administrador

export type RegistrationPaymentStatus =
  | 'aguardando_validacao' // Sócio pendente de validação (bloqueado para pagamento)
  | 'pendente'             // Liberado para pagamento (aguardando atleta pagar)
  | 'processando'          // Transação em análise no gateway
  | 'pago'                 // Confirmado confiavelmente pelo Mercado Pago
  | 'cancelado'            // Inscrição cancelada
  | 'expirado';            // Lote ou prazo expirou

export interface RegistrationLot {
  id: string;
  eventId: string;
  name: string; // Ex: '1º Lote Antecipado'
  priceMember: number; // Ex: 40.00
  priceNonMember: number; // Ex: 70.00
  startDateIso: string;
  endDateIso: string;
  isActive: boolean;
}

export interface TournamentEvent {
  id: string;
  title: string;
  edition: string; // 'IX'
  year: number; // 2026
  description: string;
  startDateIso: string;
  endDateIso: string;
  status: 'upcoming' | 'open_for_registrations' | 'in_progress' | 'finished';
  lots: RegistrationLot[];
}

export interface Registration {
  id: string;
  eventId: string;
  lotId: string;
  userId: string;
  athleteName: string;
  athleteEmail: string;
  athletePhone: string;
  athleteDocument: string; // CPF ou Matrícula
  
  // Turma de Medicina UEMA e Equipe
  turma: TurmaMedicina; // '21' | '22' | '23' | '24' | '25'
  turmaLabel: string; // Ex: 'Turma XXI • Sanguinária'
  teamId: string; // 'sanguinaria', 'predadora', 'tormenta', 'colossal', 'soberana'
  teamName: string;

  // Passaporte de Modalidades (Unificado - dá acesso a todas)
  modalityId?: ModalitySlug | 'todas';
  modalityName?: string; // 'Passaporte Geral (Todas as 10 Modalidades)'
  categoryName: string; // 'Masculino' | 'Feminino' | 'Geral'
  
  // Status e Validação de Sócio
  requestedMemberDiscount: boolean;
  memberStatus: MemberStatus;
  memberDocumentProofUrl?: string | null;
  memberNotes?: string | null;
  validatedByAdminId?: string | null;
  validatedByAdminName?: string | null;
  validatedAtIso?: string | null;

  // Preço e Status de Pagamento
  paymentStatus: RegistrationPaymentStatus;
  authorizedPrice: number; // Calculado e selado pelo backend
  
  // Vínculo com Mercado Pago
  paymentTransactionId?: string | null;
  paymentMethod?: 'pix' | 'credit_card' | 'ticket' | null;
  mpPreferenceId?: string | null;
  mpPaymentId?: string | null;
  mpInitPointUrl?: string | null;
  paidAtIso?: string | null;

  createdAtIso: string;
  updatedAtIso: string;
}

export interface PaymentTransactionRecord {
  id: string;
  registrationId: string;
  amount: number;
  paymentMethod: 'pix' | 'credit_card' | 'ticket';
  status: 'pending' | 'approved' | 'in_process' | 'rejected' | 'refunded';
  statusDetail?: string;
  mpPaymentId: string;
  mpPreferenceId?: string;
  externalReference: string;
  qrCode?: string; // Código Pix Copia e Cola
  qrCodeBase64?: string; // QR Code em base64
  ticketUrl?: string; // Comprovante externo do Mercado Pago
  payerEmail?: string;
  installments?: number;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface FinancialAuditLog {
  id: string;
  entity: 'registration' | 'payment' | 'lot' | 'event';
  entityId: string;
  action:
    | 'CRIAR_INSCRICAO'
    | 'APROVAR_SOCIO'
    | 'REJEITAR_SOCIO'
    | 'CRIAR_PREFERENCIA_PAGAMENTO'
    | 'CONFIRMAR_PAGAMENTO_WEBHOOK'
    | 'ALTERAR_PRECO'
    | 'CANCELAR_INSCRICAO'
    | 'ESTORNO_SOLICITADO';
  adminUserId?: string;
  adminUserName?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  timestampIso: string;
}

