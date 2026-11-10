/**
 * Arquitetura de Domínio Oficial — INTRAMED IX
 * Inclui Motor de Súmula ao Vivo, Marcador de Placar, Auditoria e Sincronização.
 * Nenhum dado fictício oficial é instanciado.
 */

// 1. USUÁRIOS E PERMISSÕES HIERÁRQUICAS (RBAC — 5 NÍVEIS)
export type UserRole =
  | 'usuario'          // Nível 1: Usuário comum
  | 'atleta'           // Nível 2: Atleta com inscrição confirmada
  | 'mesario'          // Nível 3: Mesário de partida
  | 'moderador'        // Nível 4: Moderador da atlética
  | 'moderador_master' // Nível 5: Moderador Master (Cangaceira@uema.com)
  // Legados mantidos para compatibilidade
  | 'organizacao'
  | 'administrador';

export const USER_ROLE_LEVELS: Record<UserRole, number> = {
  usuario: 1,
  atleta: 2,
  mesario: 3,
  moderador: 4,
  organizacao: 4,
  administrador: 4,
  moderador_master: 5,
};

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: UserRole;
  teamId?: string | null;
  teamName?: string | null;
  turma?: TurmaMedicina | string | null;
  turmaLabel?: string | null;
  bio?: string | null;
  instagramHandle?: string | null;
  linkedAthleteId?: string | null;
  modalityIds: string[];
  registrationCode?: string | null;
  mustChangePassword?: boolean;
  isActive?: boolean;
  coverUrl?: string | null;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  createdAtIso?: string;
  lastLoginAtIso?: string;
}

export interface PublicUserProfile {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  turma?: string | null;
  turmaLabel?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  bio?: string | null;
  instagramHandle?: string | null;
  isAthlete: boolean;
  linkedAthleteId?: string | null;
  favoriteModalityIds?: string[];
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isFollowing?: boolean;
  isFollower?: boolean;
  createdAtIso?: string;
  updatedAtIso?: string;
}

export interface AdminActionAuditLog {
  id: string;
  timestampIso: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action:
    | 'MASTER_PROVISION'
    | 'PASSWORD_CHANGED'
    | 'USER_PROMOTED'
    | 'USER_DEMOTED'
    | 'USER_SUSPENDED'
    | 'USER_ACTIVATED'
    | 'MEMBER_APPROVED'
    | 'MEMBER_REJECTED'
    | 'PAYMENT_CONFIRMED'
    | 'MATCH_RESCHEDULED'
    | 'MATCH_CANCELLED'
    | 'SHEET_CORRECTED';
  targetEntity: 'user' | 'registration' | 'athlete' | 'match' | 'sheet';
  targetId: string;
  details: string;
  previousValue?: unknown;
  newValue?: unknown;
  justification?: string;
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
  bio?: string | null;
  instagramHandle?: string | null;
  email?: string | null;
  accountUsername?: string | null;
  turma?: TurmaMedicina | null;
  turmaLabel?: string | null;
  teamId: string;
  modalityIds: ModalitySlug[];
  registrationId?: string | null;
  paymentStatus?: RegistrationPaymentStatus;
  memberStatus?: MemberStatus;
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
  | 'own_goal'
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
  revision?: number;
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
  tableOfficialPassword?: string | null; // Senha exclusiva do mesário daquela partida
  hasTableOfficialPassword?: boolean;
  isTestData?: boolean;
  revision?: number;
}

export interface BracketMatchSlot {
  id: string;
  phase: 'quarterfinals' | 'semifinals' | 'final';
  orderIndex: number;
  nextSlotId?: string | null;
  match: Match | null;
}

export interface PublicLaunchConfig {
  publicLaunchMode: boolean;
  publicLoginEnabled: boolean;
  publicRegistrationEnabled: boolean;
  publicPaymentsEnabled: boolean;
  publicPricesVisible: boolean;
  bracketPublished: boolean;
  publicProfilesVisible: boolean;
  announcementTitle?: string;
  announcementMessage?: string;
}

export type CompetitionPhaseType =
  | 'group_stage'
  | 'round_of_16'
  | 'quarterfinals'
  | 'semifinals'
  | 'third_place'
  | 'final';

export type TournamentFormat =
  | 'single_elimination' // Eliminatória simples / mata-mata
  | 'group_stage' // Fase de grupos
  | 'groups_to_knockout' // Grupos com classificação para mata-mata
  | 'round_robin'; // Pontos corridos

export interface BracketParticipantSource {
  type: 'team' | 'winner_of' | 'loser_of' | 'group_rank' | 'bye';
  sourceMatchId?: string | null;
  groupName?: string | null;
  rankPosition?: number | null;
  label?: string | null;
}

export interface UniversalBracketMatch {
  id: string;
  modalityId: string;
  category?: string | null;
  phase: CompetitionPhaseType;
  phaseLabel: string;
  group?: string | null;
  orderIndex: number;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  venue?: string | null;
  status: MatchStatus;
  homeTeam: MatchTeamSlot;
  awayTeam: MatchTeamSlot;
  homeSource?: BracketParticipantSource | null;
  awaySource?: BracketParticipantSource | null;
  winnerTeamId?: string | null;
  nextMatchId?: string | null;
  nextMatchTarget?: 'home' | 'away' | null;
  loserNextMatchId?: string | null;
}

export interface UniversalBracketStage {
  id: string;
  phase: CompetitionPhaseType;
  label: string;
  group?: string | null;
  matches: UniversalBracketMatch[];
}

export interface UniversalModalityBracket {
  modalityId: string;
  modalityName: string;
  format: TournamentFormat;
  formatLabel: string;
  category?: string | null;
  isPublished: boolean;
  publishedAtIso?: string | null;
  stages: UniversalBracketStage[];
  notes?: string | null;
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
  officialGoals?: number;
  provisionalGoals?: number;
  yellowCards: number;
  redCards: number;
  suspensions2Min: number; // Handebol
  // Basquete (apenas pontos e faltas da súmula — sem tocos/rebotes)
  pointsTotal: number;
  officialPointsTotal?: number;
  provisionalPointsTotal?: number;
  hasProvisionalLiveStats?: boolean;
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
  selectedModalities?: ModalitySlug[];

  // Perfil Social e Credencial da Conta do Atleta Vinculado
  linkedAthleteId?: string | null;
  accountUsername?: string | null;
  hasAccountPassword?: boolean;
  avatarUrl?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
  bio?: string | null;
  instagramHandle?: string | null;
  
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
  revision?: number;
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
  revision?: number;
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

// ==========================================
// 13. REDE SOCIAL UNIVERSITÁRIA & ESPORTIVA (INTRAMED IX)
// ==========================================

export interface SocialPost {
  id: string;
  authorUid: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  authorTurma?: string | null;
  authorTurmaLabel?: string | null;
  authorTeamId?: string | null;
  authorTeamName?: string | null;
  isAuthorAthlete: boolean;
  authorRole?: UserRole;
  content: string;
  images: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLikedByMe?: boolean;
  isSavedByMe?: boolean;
  teamTag?: string | null;
  modalityTag?: ModalitySlug | null;
  pinned?: boolean;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface PostLike {
  id: string; // `${postId}_${userId}`
  postId: string;
  userId: string;
  createdAtIso: string;
}

export interface PostComment {
  id: string;
  postId: string;
  authorUid: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  authorTurma?: string | null;
  authorTeamId?: string | null;
  isAuthorAthlete?: boolean;
  content: string;
  createdAtIso: string;
  updatedAtIso?: string;
}

export interface UserFollow {
  id: string; // `${followerUid}_${followingUid}`
  followerUid: string;
  followingUid: string;
  createdAtIso: string;
}

export interface UserFollowRelationship {
  isFollowing: boolean;
  isFollower: boolean;
  mutualFollow: boolean;
}

export interface SavedPost {
  id: string; // `${userId}_${postId}`
  userId: string;
  postId: string;
  savedAtIso: string;
}

export type SocialNotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'mention'
  | 'athlete_achievement';

export interface SocialNotification {
  id: string;
  recipientUid: string;
  actorUid: string;
  actorName: string;
  actorAvatarUrl?: string | null;
  type: SocialNotificationType;
  title: string;
  message: string;
  targetPostId?: string | null;
  targetCommentId?: string | null;
  isRead: boolean;
  createdAtIso: string;
}


