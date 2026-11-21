import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  CheckCircle2,
  Edit3,
  Trash2,
  Users,
  Tv,
  FileText,
  ArrowLeft,
  Clock,
  ShieldAlert,
  Timer,
  Plus,
  Flag,
  History,
  FlaskConical,
  Volume2,
  VolumeX,
  RefreshCw,
} from 'lucide-react';
import { useCompetitionStore } from '../context/CompetitionStoreContext';
import { useRegistrationStore } from '../context/RegistrationStoreContext';
import { matchSound } from '../utils/soundEffects';
import {
  computeLiveVolleyballRotation,
  resolveSixStartingIds,
  rotateVolleyballPositionsClockwise,
} from '../utils/volleyballRotation';
import {
  MODALITY_RULE_ENGINE,
  OFFICIAL_MODALITY_ROSTER_LIMITS,
  SWIMMING_STROKES,
  formatSecondsToClock,
} from '../data/sportRulesConfig';
import {
  MatchEvent,
  MatchEventType,
  SwimmingStrokeType,
} from '../types/domain';
import { TeamCrest } from '../components/sports/TeamCrest';
import {
  isCollectiveOrBeachVolley,
  ModalityCourtVisualizer,
} from '../components/sports/ModalityCourtVisualizer';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { TestModeBanner } from '../components/layout/TestModeBanner';
import {
  QuickActionDef,
  getQuickActionsForModality,
} from '../data/quickActionsConfig';

export const LiveMatchSheetOperatorPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const { registrations } = useRegistrationStore();
  const [allowOtherGenderBySide, setAllowOtherGenderBySide] = useState<{
    home: boolean;
    away: boolean;
  }>({ home: false, away: false });

  const {
    isTestMode,
    setTestMode,
    getMatchById,
    getSheetByMatchId,
    getAthletesByTeam,
    visibleAthletes,
    startOrResumeTimer,
    pauseTimer,
    resetPeriodTimer,
    endCurrentPeriod,
    startNextPeriod,
    startOvertimePeriod,
    configureMatchCategoryRule,
    recordMatchEvent,
    editMatchEvent,
    deleteMatchEvent,
    dismissReleasedSuspension,
    cancelActiveTimeout,
    toggleLineupRole,
    swapLineupPlayers,
    addAthleteToMatchLineup,
    addMultipleAthletesToMatchLineup,
    removeAthleteFromMatchLineup,
    configureVolleyballSetRotation,
    adjustVolleyballManualRotation,
    finishCurrentSet,
    recordTableTennisPoint,
    finishTableTennisSet,
    selectActiveSubMatch,
    setSwimmingStrokeAndDistance,
    registerSwimmingLaneTime,
    updateRefereeMetadata,
    finalizeMatch,
    reopenMatchForCorrection,
    resetMatchToScheduled,
    setMatchSheetOfficialReleased,
    isOnline,
    pendingSyncCount,
    currentUser,
  } = useCompetitionStore();
  const isMasterAccount = (currentUser?.role as string) === 'moderador_master';

  // Proteção contra duplo clique / toque acidental (Item 31)
  const lastActionTimestampRef = useRef<number>(0);
  const canExecuteRapidAction = (cooldownMs = 550): boolean => {
    const now = Date.now();
    if (now - lastActionTimestampRef.current < cooldownMs) {
      return false;
    }
    lastActionTimestampRef.current = now;
    return true;
  };

  // Estados do Fluxo Rápido de Registro de Evento (Equipe -> Atleta -> Confirmar)
  const [wizardAction, setWizardAction] = useState<QuickActionDef | null>(null);
  const [wizardStep, setWizardStep] = useState<'team' | 'athlete' | 'confirm'>('team');
  const [selectedSide, setSelectedSide] = useState<'home' | 'away'>('home');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [selectedSecondaryAthleteId, setSelectedSecondaryAthleteId] = useState<
    string | null
  >(null);
  const [selectedCardSubType, setSelectedCardSubType] = useState<
    'yellow_card' | 'red_card'
  >('yellow_card');
  const [foulReasonInput, setFoulReasonInput] = useState('');

  // Modais de Operação
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isLineupModalOpen, setIsLineupModalOpen] = useState(false);
  const [lineupActiveTab, setLineupActiveTab] = useState<'home' | 'away'>('home');
  const [isVolleyballRotationModalOpen, setIsVolleyballRotationModalOpen] =
    useState(false);
  const [vbSelectedSlot, setVbSelectedSlot] = useState<{
    side: 'home' | 'away';
    slotIdx: number;
  } | null>(null);
  const [vbDraftFirstServer, setVbDraftFirstServer] = useState<'home' | 'away'>('home');
  const [vbDraftHomeOrder, setVbDraftHomeOrder] = useState<Array<string | null>>([
    null,
    null,
    null,
    null,
    null,
    null,
  ]);
  const [vbDraftAwayOrder, setVbDraftAwayOrder] = useState<Array<string | null>>([
    null,
    null,
    null,
    null,
    null,
    null,
  ]);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isCancelLiveModalOpen, setIsCancelLiveModalOpen] = useState(false);
  const [isOfficialsModalOpen, setIsOfficialsModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [possessionSide, setPossessionSide] = useState<'home' | 'away'>('home');

  // Metadados Oficiais de Mesa e Arbitragem
  const [officialReferee1, setOfficialReferee1] = useState('');
  const [officialReferee2, setOfficialReferee2] = useState('');
  const [officialTableOfficial, setOfficialTableOfficial] = useState('');
  const [officialTimekeeper, setOfficialTimekeeper] = useState('');
  const [official24sOperator, setOfficial24sOperator] = useState('');
  const [officialNotes, setOfficialNotes] = useState('');

  // Modal de Edição / Correção e Exclusão de Evento (Item 25)
  const [editingEvent, setEditingEvent] = useState<MatchEvent | null>(null);
  const [editTeamSide, setEditTeamSide] = useState<'home' | 'away'>('home');
  const [editAthleteId, setEditAthleteId] = useState<string>('');
  const [editClock, setEditClock] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  const [deletingEvent, setDeletingEvent] = useState<MatchEvent | null>(null);

  // Natação: input manual opcional por raia
  const [manualSwimSeconds, setManualSwimSeconds] = useState<Record<number, string>>(
    {}
  );

  const match = matchId ? getMatchById(matchId) : undefined;
  const sheet = matchId ? getSheetByMatchId(matchId) : undefined;

  // Estado Oficial Vazio ("Aguardando equipes") quando não há partida oficial cadastrada
  if (!match || !sheet || matchId === 'oficial-vazia') {
    return (
      <div className="min-h-screen bg-brand-surface-muted flex flex-col">
        <TestModeBanner />
        <header className="bg-brand-blue-dark text-white px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-yellow block">
                Console de Súmula Eletrônica
              </span>
              <h1 className="text-base sm:text-lg font-display font-extrabold">
                INTRAMED IX — Operador de Partida
              </h1>
            </div>
          </div>
          <StatusBadge status="pending" label="Aguardando equipes" />
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
          {/* Placar Estrutural Oficial sem Dados Fictícios */}
          <div className="rounded-3xl bg-white border border-brand-surface-border p-6 sm:p-8 shadow-card text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-surface-muted border border-brand-surface-border text-xs font-semibold text-brand-text-secondary">
              <span>Modo Oficial • Sem Partida Selecionada</span>
            </div>

            <div className="grid grid-cols-3 items-center gap-4 max-w-xl mx-auto">
              <div className="flex flex-col items-center gap-2.5">
                <TeamCrest size="lg" />
                <span className="text-sm font-display font-bold text-brand-text-muted">
                  Aguardando equipes
                </span>
              </div>

              <div className="flex flex-col items-center">
                <div className="text-3xl sm:text-4xl font-display font-extrabold text-brand-text-muted">
                  — <span className="text-lg">×</span> —
                </div>
                <span className="mt-2 px-3 py-1 rounded-lg bg-brand-surface-muted text-xs font-mono font-bold text-brand-text-muted">
                  --:--
                </span>
              </div>

              <div className="flex flex-col items-center gap-2.5">
                <TeamCrest size="lg" />
                <span className="text-sm font-display font-bold text-brand-text-muted">
                  Aguardando equipes
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-brand-surface-border max-w-lg mx-auto space-y-4">
              <p className="text-xs sm:text-sm text-brand-text-secondary leading-relaxed">
                No ambiente oficial, nenhuma equipe ou partida fictícia é exibida. Para testar o motor completo da súmula ao vivo (cronômetro, gols, sets, punições de 2 min, natação e placar ao vivo), abra uma partida no <strong>Modo de Teste</strong>.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="accent"
                  size="md"
                  leftIcon={<FlaskConical className="w-4 h-4" />}
                  onClick={() => {
                    setTestMode(true);
                    navigate('/sumula/test-match-futsal');
                  }}
                >
                  Testar Súmula ao Vivo (Modo de Teste)
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => navigate('/admin')}
                >
                  Voltar ao Painel Administrativo
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const engine = MODALITY_RULE_ENGINE[match.modalityId];

  const rosterLimits = OFFICIAL_MODALITY_ROSTER_LIMITS[match.modalityId] || { min: 1, max: 20 };
  const isLineupIncomplete =
    !sheet.isClosed &&
    engine.scoringModel !== 'swimming_heats' &&
    (sheet.homeLineup.length < rosterLimits.min || sheet.awayLineup.length < rosterLimits.min);

  const autoOpenedLineupRef = React.useRef(false);
  useEffect(() => {
    if (
      !autoOpenedLineupRef.current &&
      !sheet.isClosed &&
      engine.scoringModel !== 'swimming_heats' &&
      (sheet.homeLineup.length === 0 || sheet.awayLineup.length === 0)
    ) {
      autoOpenedLineupRef.current = true;
      setIsLineupModalOpen(true);
    }
  }, [sheet.homeLineup.length, sheet.awayLineup.length, sheet.isClosed, engine.scoringModel]);

  const handleStartOrResumeTimer = () => {
    if (engine.scoringModel !== 'swimming_heats') {
      const limits = OFFICIAL_MODALITY_ROSTER_LIMITS[match.modalityId] || { min: 1, max: 20 };
      if (sheet.homeLineup.length < limits.min || sheet.awayLineup.length < limits.min) {
        try { matchSound.playBuzzer(); } catch {}
        setIsLineupModalOpen(true);
        alert(
          `Escalação Incompleta!\n\nPelo Regulamento IX INTRAMED, cada equipe deve ter no mínimo ${limits.min} atletas escalados para iniciar a partida de ${match.modalityName}.\n\nAtualmente:\n• ${match.homeTeam.teamName}: ${sheet.homeLineup.length}/${limits.min}\n• ${match.awayTeam.teamName}: ${sheet.awayLineup.length}/${limits.min}\n\nPor favor, complete a escalação dos atletas antes de iniciar o cronômetro.`
        );
        return;
      }
    }
    startOrResumeTimer(match.id);
  };

  const categoryOptions = Object.keys(engine.defaultCategoryRules);
  const currentCatRule =
    engine.defaultCategoryRules[match.categoryName || ''] ||
    Object.values(engine.defaultCategoryRules)[0];

  // Define os botões de ação rápida de acordo com a modalidade (Item 7 e 15-22)
  const quickActions = getQuickActionsForModality(match.modalityId);

  // Abre o fluxo rápido (Passo 1: Equipe -> Passo 2: Atleta -> Passo 3: Confirmar)
  const openActionWizard = (action: QuickActionDef) => {
    if (sheet.isClosed) return;
    if (!canExecuteRapidAction(300)) return;
    setWizardAction(action);
    setSelectedSide('home');
    setSelectedAthleteId(null);
    setSelectedSecondaryAthleteId(null);
    setSelectedCardSubType('yellow_card');
    setFoulReasonInput('');
    setWizardStep('team');
  };

  const handleSelectTeamInWizard = (side: 'home' | 'away') => {
    setSelectedSide(side);
    if (wizardAction?.requiresAthlete) {
      setWizardStep('athlete');
    } else {
      setWizardStep('confirm');
    }
  };

  const handleConfirmWizardEvent = () => {
    if (!wizardAction || !matchId) return;
    if (!canExecuteRapidAction(550)) return;

    const lineup =
      selectedSide === 'home' ? sheet.homeLineup : sheet.awayLineup;
    const primaryAth = lineup.find((a) => a.athleteId === selectedAthleteId);
    const secondaryAth = lineup.find(
      (a) => a.athleteId === selectedSecondaryAthleteId
    );

    const alreadyHasYellow =
      primaryAth &&
      activeEvents.some(
        (e) =>
          (e.athleteId === primaryAth.athleteId ||
            (e.athleteName &&
              primaryAth.athleteName &&
              e.athleteName.trim().toLowerCase() === primaryAth.athleteName.trim().toLowerCase())) &&
          e.type === 'yellow_card'
      );

    const isSecondYellow =
      wizardAction.type === 'yellow_card' &&
      selectedCardSubType === 'yellow_card' &&
      alreadyHasYellow;

    if (isSecondYellow) {
      // 1. Registra o 2º cartão amarelo
      recordMatchEvent(matchId, {
        type: 'yellow_card',
        typeLabel: '2º Cartão Amarelo',
        teamSide: selectedSide,
        athleteId: primaryAth?.athleteId || null,
        athleteName: primaryAth?.athleteName || null,
        athleteNumber: primaryAth?.jerseyNumber ?? null,
        pointsDelta: 0,
        foulReason: foulReasonInput || '2º Cartão Amarelo na Partida',
      });

      // 2. Registra a expulsão automática decorrente do acúmulo dos 2 cartões amarelos
      recordMatchEvent(matchId, {
        type: 'red_card',
        typeLabel: 'Cartão Vermelho (Expulsão por 2º Amarelo)',
        teamSide: selectedSide,
        athleteId: primaryAth?.athleteId || null,
        athleteName: primaryAth?.athleteName || null,
        athleteNumber: primaryAth?.jerseyNumber ?? null,
        pointsDelta: 0,
        foulReason: 'Expulsão compulsória após acúmulo de dois cartões amarelos na partida',
      });
    } else {
      const finalType: MatchEventType =
        wizardAction.type === 'yellow_card'
          ? selectedCardSubType
          : wizardAction.type === 'expulsion'
          ? 'red_card'
          : wizardAction.type;

      const finalLabel =
        wizardAction.type === 'yellow_card'
          ? selectedCardSubType === 'yellow_card'
            ? 'Cartão Amarelo'
            : 'Cartão Vermelho Direto'
          : wizardAction.type === 'expulsion'
          ? 'Cartão Vermelho (Expulsão Direta)'
          : wizardAction.type === 'own_goal'
          ? 'Gol Contra (GC)'
          : wizardAction.label;

      recordMatchEvent(matchId, {
        type: finalType,
        typeLabel: finalLabel,
        teamSide: selectedSide,
        athleteId: primaryAth?.athleteId || null,
        athleteName: primaryAth?.athleteName || null,
        athleteNumber: primaryAth?.jerseyNumber ?? null,
        secondaryAthleteId: secondaryAth?.athleteId || null,
        secondaryAthleteName: secondaryAth?.athleteName || null,
        secondaryAthleteNumber: secondaryAth?.jerseyNumber ?? null,
        pointsDelta: wizardAction.pointsDelta,
        foulReason: foulReasonInput || undefined,
      });
    }

    if (soundEnabled) {
      matchSound.playConfirmBeep();
    }
    setPossessionSide(selectedSide);
    setWizardAction(null);
  };

  // Ação direta com proteção contra duplo toque para +1 Ponto em Vôlei / Vôlei de Praia
  const handleDirectSetPoint = (side: 'home' | 'away') => {
    if (sheet.isClosed || !matchId) return;
    if (!canExecuteRapidAction(250)) return; // Proteção leve anti-duplo-toque sem travar cliques seguidos

    recordMatchEvent(matchId, {
      type: 'set_point',
      typeLabel: `Ponto (${
        side === 'home' ? match.homeTeam.teamName : match.awayTeam.teamName
      })`,
      teamSide: side,
      pointsDelta: 1,
    });
    if (soundEnabled) {
      matchSound.playConfirmBeep();
    }
    setPossessionSide(side);
  };

  const currentSetScoreObj =
    sheet.periodScores.find((p) => p.periodNumber === sheet.timer.currentPeriod) ||
    sheet.periodScores[0];

  const activeEvents = sheet.events.filter((ev) => !ev.isDeleted);

  const liveVolleyballRotation =
    match.modalityId === 'volei'
      ? computeLiveVolleyballRotation(sheet, sheet.timer.currentPeriod || 1)
      : null;

  const openVolleyballRotationModal = () => {
    if (!sheet || match.modalityId !== 'volei') return;
    const setNum = sheet.timer.currentPeriod || 1;
    const liveRot = computeLiveVolleyballRotation(sheet, setNum);
    setVbDraftFirstServer(liveRot.initialServingSide);
    setVbDraftHomeOrder(
      resolveSixStartingIds(
        sheet.volleyballSetConfigs?.[setNum]?.homeInitialOrder,
        sheet.homeLineup
      )
    );
    setVbDraftAwayOrder(
      resolveSixStartingIds(
        sheet.volleyballSetConfigs?.[setNum]?.awayInitialOrder,
        sheet.awayLineup
      )
    );
    setVbSelectedSlot(null);
    setIsVolleyballRotationModalOpen(true);
  };

  const handleSaveVolleyballRotationModal = () => {
    if (!matchId || !sheet) return;
    const setNum = sheet.timer.currentPeriod || 1;
    configureVolleyballSetRotation(matchId, setNum, {
      initialServingSide: vbDraftFirstServer,
      homeInitialOrder: vbDraftHomeOrder,
      awayInitialOrder: vbDraftAwayOrder,
      resetManualOffsets: true,
    });
    setVbSelectedSlot(null);
    setIsVolleyballRotationModalOpen(false);
  };

  const handleTapDraftCourtSlot = (side: 'home' | 'away', slotIdx: number) => {
    if (!vbSelectedSlot) {
      setVbSelectedSlot({ side, slotIdx });
      return;
    }
    if (vbSelectedSlot.side !== side) {
      setVbSelectedSlot({ side, slotIdx });
      return;
    }
    if (vbSelectedSlot.slotIdx === slotIdx) {
      setVbSelectedSlot(null);
      return;
    }
    if (side === 'home') {
      const next = [...vbDraftHomeOrder];
      const tmp = next[vbSelectedSlot.slotIdx];
      next[vbSelectedSlot.slotIdx] = next[slotIdx];
      next[slotIdx] = tmp;
      setVbDraftHomeOrder(next);
    } else {
      const next = [...vbDraftAwayOrder];
      const tmp = next[vbSelectedSlot.slotIdx];
      next[vbSelectedSlot.slotIdx] = next[slotIdx];
      next[slotIdx] = tmp;
      setVbDraftAwayOrder(next);
    }
    setVbSelectedSlot(null);
  };

  const handleAssignPlayerToDraftSlot = (
    side: 'home' | 'away',
    athleteId: string
  ) => {
    if (side === 'home') {
      const next = [...vbDraftHomeOrder];
      const existingIdx = next.indexOf(athleteId);
      const targetIdx =
        vbSelectedSlot?.side === 'home'
          ? vbSelectedSlot.slotIdx
          : next.findIndex((id) => !id);
      const resolvedTarget = targetIdx >= 0 ? targetIdx : 0;
      if (existingIdx >= 0) {
        const tmp = next[resolvedTarget];
        next[resolvedTarget] = athleteId;
        next[existingIdx] = tmp;
      } else {
        next[resolvedTarget] = athleteId;
      }
      setVbDraftHomeOrder(next);
    } else {
      const next = [...vbDraftAwayOrder];
      const existingIdx = next.indexOf(athleteId);
      const targetIdx =
        vbSelectedSlot?.side === 'away'
          ? vbSelectedSlot.slotIdx
          : next.findIndex((id) => !id);
      const resolvedTarget = targetIdx >= 0 ? targetIdx : 0;
      if (existingIdx >= 0) {
        const tmp = next[resolvedTarget];
        next[resolvedTarget] = athleteId;
        next[existingIdx] = tmp;
      } else {
        next[resolvedTarget] = athleteId;
      }
      setVbDraftAwayOrder(next);
    }
    setVbSelectedSlot(null);
  };

  const openOfficialsModal = () => {
    if (!sheet) return;
    setOfficialReferee1(sheet.refereeName || '');
    setOfficialReferee2(sheet.assistantRefereeName || '');
    setOfficialTableOfficial(sheet.tableOfficialName || '');
    setOfficialTimekeeper(sheet.timekeeperName || '');
    setOfficial24sOperator(sheet.twentyFourSecOperatorName || '');
    setOfficialNotes(sheet.refereeNotes || '');
    setIsOfficialsModalOpen(true);
  };

  const handleSaveOfficials = () => {
    if (!matchId) return;
    updateRefereeMetadata(matchId, {
      refereeName: officialReferee1,
      assistantRefereeName: officialReferee2,
      tableOfficialName: officialTableOfficial,
      timekeeperName: officialTimekeeper,
      twentyFourSecOperatorName: official24sOperator,
      refereeNotes: officialNotes,
    });
    setIsOfficialsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-brand-text-primary flex flex-col">
      {/* Banner de Modo de Teste se aplicável */}
      <TestModeBanner />

      {/* 3. CABEÇALHO FUNCIONAL DO OPERADOR DA PARTIDA */}
      <header className="bg-brand-blue-dark text-white px-4 sm:px-6 py-3.5 border-b border-white/10 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Esquerda: Voltar + Modalidade + Categoria · Fase + Local */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              aria-label="Voltar ao Painel"
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-display font-extrabold tracking-wide uppercase text-brand-yellow">
                  {match.modalityName}
                </span>
                <span className="text-xs text-white/75 font-medium">
                  {match.categoryName} · {match.phaseLabel}
                </span>
                <span className="hidden sm:inline text-xs text-white/50">•</span>
                <span className="hidden sm:inline text-xs text-white/75">
                  {match.venue}
                </span>
              </div>

              
            </div>
          </div>

          {/* Direita: Status + Sincronização Nuvem + Ações de Súmula */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-display font-extrabold border ${
                !isOnline
                  ? 'bg-rose-500/20 border-rose-400/50 text-rose-200'
                  : pendingSyncCount > 0
                  ? 'bg-amber-400/20 border-amber-300/50 text-amber-200'
                  : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
              }`}
              title="Status da transmissão em tempo real para o placar público"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  !isOnline
                    ? 'bg-rose-400'
                    : pendingSyncCount > 0
                    ? 'bg-amber-300 animate-ping'
                    : 'bg-emerald-400'
                }`}
              />
              <span>
                {!isOnline
                  ? 'Offline'
                  : pendingSyncCount > 0
                  ? 'Sincronizando...'
                  : 'Tempo Real Ativo'}
              </span>
            </span>

            <StatusBadge
              status={match.status}
              label={
                match.status === 'live'
                  ? 'EM ANDAMENTO'
                  : match.status === 'halftime'
                  ? 'INTERVALO'
                  : match.status === 'finished'
                  ? 'FINALIZADO'
                  : 'AGUARDANDO INÍCIO'
              }
            />

            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                matchSound.enabled = next;
                if (next) matchSound.playConfirmBeep();
              }}
              aria-label={
                soundEnabled
                  ? 'Silenciar efeitos sonoros da mesa'
                  : 'Ativar efeitos sonoros da mesa'
              }
              title={soundEnabled ? 'Som de mesa ativado (clique para silenciar)' : 'Som de mesa silenciado'}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors min-h-[38px]"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-brand-yellow" />
              ) : (
                <VolumeX className="w-4 h-4 text-white/60" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                matchSound.playBuzzer(true);
              }}
              aria-label="Acionar Buzina de Mesa"
              title="Acionar Buzina / Sirene de Mesa"
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-brand-yellow transition-colors min-h-[38px]"
            >
              <span>🔊 Buzina</span>
            </button>

            {engine.scoringModel !== 'swimming_heats' && (
              <button
                type="button"
                onClick={() => setIsLineupModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors min-h-[38px]"
              >
                <Users className="w-4 h-4 text-brand-yellow" />
                <span>Escalação</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate(`/placar/${match.id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors min-h-[38px]"
            >
              <Tv className="w-4 h-4 text-brand-yellow" />
              <span className="hidden sm:inline">Placar ao Vivo</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/sumula/${match.id}/documento`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors min-h-[38px]"
            >
              <FileText className="w-4 h-4 text-brand-yellow" />
              <span className="hidden sm:inline">Súmula</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setMatchSheetOfficialReleased(match.id, !sheet.isOfficialReleased)
              }
              title={
                sheet.isOfficialReleased
                  ? 'Clique para ocultar a súmula oficial do público'
                  : 'Clique para liberar a súmula oficial para todos os usuários'
              }
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors min-h-[38px] ${
                sheet.isOfficialReleased
                  ? 'bg-emerald-500/25 border border-emerald-400/50 text-emerald-100 hover:bg-emerald-500/35'
                  : 'bg-white/10 hover:bg-white/20 text-white/80'
              }`}
            >
              <CheckCircle2
                className={`w-4 h-4 ${
                  sheet.isOfficialReleased ? 'text-emerald-300' : 'text-white/60'
                }`}
              />
              <span className="hidden sm:inline">
                {sheet.isOfficialReleased ? 'Súmula Liberada' : 'Liberar Súmula'}
              </span>
            </button>

            <button
              type="button"
              onClick={openOfficialsModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors min-h-[38px]"
            >
              <ShieldAlert className="w-4 h-4 text-brand-yellow" />
              <span className="hidden sm:inline">Mesa / Árbitros</span>
            </button>

            {(match.status !== 'scheduled' ||
              sheet.timer.isRunning ||
              sheet.timer.lifecycle !== 'not_started' ||
              activeEvents.length > 0) && (
              <button
                type="button"
                onClick={() => setIsCancelLiveModalOpen(true)}
                title="Desativar Modo Ao Vivo e voltar a partida para Agendado"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/25 hover:bg-rose-500/40 border border-rose-400/50 text-xs font-display font-extrabold text-rose-100 transition-colors min-h-[38px]"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-200" />
                <span>Desativar Ao Vivo</span>
              </button>
            )}

            {!sheet.isClosed ? (
              <button
                type="button"
                onClick={() => setIsFinalizeModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-yellow text-brand-blue-dark hover:bg-brand-yellow-dark text-xs font-display font-extrabold transition-colors min-h-[38px]"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Encerrar Partida</span>
              </button>
            ) : isMasterAccount || match.id.startsWith('test-') ? (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      'Deseja reabrir esta súmula finalizada para correção de eventos ou placar?'
                    )
                  ) {
                    reopenMatchForCorrection(match.id);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold text-white transition-colors min-h-[38px]"
              >
                <span>Reabrir Súmula</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 text-xs font-bold text-white/80 min-h-[38px]">
                <span>Súmula Encerrada (Somente Master)</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL DO OPERADOR */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 space-y-5">
        {/* AVISO DE ESCALAÇÃO OBRIGATÓRIA ANTES DE INICIAR */}
        {isLineupIncomplete && (
          <div className="rounded-2xl border-2 border-amber-400 p-4 text-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md bg-gradient-to-r from-amber-50 to-amber-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-brand-blue-dark flex items-center justify-center shrink-0 shadow-sm">
                <Users className="w-5 h-5 text-brand-blue-dark" />
              </div>
              <div>
                <h4 className="text-sm font-display font-black text-amber-950 uppercase tracking-tight">
                  Escalação Obrigatória Antes de Iniciar a Partida
                </h4>
                <p className="text-xs text-amber-900 font-medium">
                  Regulamento ({match.modalityName}): Mínimo de <strong>{rosterLimits.min} atletas por equipe</strong>.
                  Escalação atual: {match.homeTeam.teamName} ({sheet.homeLineup.length}/{rosterLimits.min}) • {match.awayTeam.teamName} ({sheet.awayLineup.length}/{rosterLimits.min}).
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Users className="w-4 h-4" />}
              onClick={() => setIsLineupModalOpen(true)}
            >
              Escalar Atletas Agora
            </Button>
          </div>
        )}
        {/* PRÉVIA AO VIVO DA QUADRA 3D (COLETIVOS & VÔLEI DE PRAIA) COM ARRASTE DE ATLETAS PELO MESÁRIO */}
        {isCollectiveOrBeachVolley(match.modalityId) && (
          <ModalityCourtVisualizer
            match={match}
            sheet={sheet}
            athletes={visibleAthletes}
            scoringEvents={sheet.events.filter((e) => !e.isDeleted)}
            liveVolleyballRotation={liveVolleyballRotation}
            editable={!sheet.isClosed}
            onSwapPlayers={(side, athleteIdA, athleteIdB) =>
              swapLineupPlayers(match.id, side, athleteIdA, athleteIdB)
            }
          />
        )}

        {/* 4 & 5. PLACAR PRINCIPAL GIGANTE + CRONÔMETRO DA PARTIDA */}
        <section
          aria-label="Placar Principal e Cronômetro"
          className="rounded-3xl bg-white border-2 border-brand-surface-border shadow-card overflow-hidden"
        >
          {/* Barra de Período / Set Atual */}
          <div className="px-4 sm:px-6 py-2.5 bg-brand-blue text-white flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-yellow" />
              <span className="text-xs sm:text-sm font-display font-extrabold uppercase tracking-wider">
                {sheet.timer.periodLabel}
              </span>
              {sheet.timer.lifecycle === 'paused' && (
                <span className="px-2 py-0.5 rounded bg-brand-yellow text-brand-blue-dark text-[11px] font-extrabold uppercase">
                  PAUSADO
                </span>
              )}
              {sheet.timer.lifecycle === 'interval' && (
                <span className="px-2 py-0.5 rounded bg-brand-yellow text-brand-blue-dark text-[11px] font-extrabold uppercase">
                  INTERVALO
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-white/80 font-medium">
              {engine.scoringModel !== 'swimming_heats' && (
                <button
                  type="button"
                  onClick={() =>
                    setPossessionSide((p) => (p === 'home' ? 'away' : 'home'))
                  }
                  className="px-2.5 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold transition-colors"
                  title="Alternar posse de bola / serviço"
                >
                  {engine.scoringModel === 'sets_points' ? '🏐 Saque: ' : 'Posse: '}
                  <span className="text-brand-yellow">
                    {possessionSide === 'home'
                      ? match.homeTeam.teamName
                      : match.awayTeam.teamName}
                  </span>
                </button>
              )}
              <span>
                {isTestMode
                  ? 'Ambiente de Operação (Modo de Teste)'
                  : 'Ambiente Oficial'}
              </span>
            </div>
          </div>

          {/* MÓDULO ESPECÍFICO 21: NATAÇÃO (PROVAS E RAIAS) */}
          {engine.scoringModel === 'swimming_heats' ? (
            <div className="p-5 sm:p-6 space-y-6">
              {/* Seletor de Estilo de Nado + Cronômetro Progressivo da Prova */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-brand-surface-border">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary block">
                    Modalidade de Nado Oficial
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {SWIMMING_STROKES.map((stroke) => (
                      <button
                        key={stroke}
                        type="button"
                        onClick={() =>
                          setSwimmingStrokeAndDistance(
                            match.id,
                            stroke,
                            sheet.swimmingDistanceLabel || 'Série Oficial'
                          )
                        }
                        className={`px-3.5 py-2 rounded-xl text-xs font-display font-bold transition-all ${
                          sheet.swimmingStroke === stroke
                            ? 'bg-brand-blue text-white shadow-sm'
                            : 'bg-brand-surface-muted text-brand-text-secondary hover:text-brand-text-primary'
                        }`}
                      >
                        {stroke}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cronômetro da Prova */}
                <div className="flex items-center gap-4 bg-brand-surface-muted px-5 py-3.5 rounded-2xl border border-brand-surface-border">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-brand-text-muted block">
                      Cronômetro da Prova
                    </span>
                    <span className="text-3xl font-mono font-extrabold text-brand-blue">
                      {formatSecondsToClock(sheet.timer.elapsedSeconds)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!sheet.timer.isRunning ? (
                      <Button
                        variant="primary"
                        size="md"
                        leftIcon={<Play className="w-4 h-4" />}
                        onClick={() => handleStartOrResumeTimer()}
                      >
                        {sheet.timer.elapsedSeconds > 0 ? 'Retomar' : 'Largada'}
                      </Button>
                    ) : (
                      <Button
                        variant="accent"
                        size="md"
                        leftIcon={<Pause className="w-4 h-4" />}
                        onClick={() => pauseTimer(match.id)}
                      >
                        Pausar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsResetConfirmOpen(true)}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tabela de Raias e Classificação Automática */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-brand-surface-border text-[11px] font-bold uppercase tracking-wider text-brand-text-secondary">
                      <th className="py-3 px-3">Raia</th>
                      <th className="py-3 px-3">Atleta</th>
                      <th className="py-3 px-3">Equipe</th>
                      <th className="py-3 px-3">Tempo Oficial</th>
                      <th className="py-3 px-3">Colocação</th>
                      <th className="py-3 px-3 text-right">Registrar Tempo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-surface-border text-sm">
                    {sheet.swimmingLanes?.map((lane) => (
                      <tr key={lane.laneNumber} className="hover:bg-brand-surface-muted/50">
                        <td className="py-3 px-3 font-display font-extrabold text-brand-blue">
                          Raia {lane.laneNumber}
                        </td>
                        <td className="py-3 px-3 font-semibold text-brand-text-primary">
                          {lane.athleteName}
                        </td>
                        <td className="py-3 px-3 text-brand-text-secondary">
                          {lane.teamName}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-brand-blue">
                          {lane.formattedTime || '--:--.--'}
                        </td>
                        <td className="py-3 px-3">
                          {lane.placement ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-display font-extrabold ${
                                lane.placement === 1
                                  ? 'bg-brand-yellow text-brand-blue-dark'
                                  : 'bg-brand-blue-light text-brand-blue'
                              }`}
                            >
                              {lane.placement}º Lugar
                            </span>
                          ) : (
                            <span className="text-xs text-brand-text-muted">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Seg (ex: 27.45)"
                              value={manualSwimSeconds[lane.laneNumber] || ''}
                              onChange={(e) =>
                                setManualSwimSeconds((prev) => ({
                                  ...prev,
                                  [lane.laneNumber]: e.target.value,
                                }))
                              }
                              className="w-32 px-2.5 py-1.5 rounded-lg border border-brand-surface-border text-xs font-mono"
                            />
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                const typed = parseFloat(
                                  manualSwimSeconds[lane.laneNumber] || ''
                                );
                                const ms = !isNaN(typed) && typed > 0
                                  ? Math.round(typed * 1000)
                                  : sheet.timer.elapsedSeconds * 1000 +
                                    lane.laneNumber * 120;
                                registerSwimmingLaneTime(
                                  match.id,
                                  lane.laneNumber,
                                  ms,
                                  'finished'
                                );
                              }}
                            >
                              Cravar Tempo
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* PLACAR PARA MODALIDADES DE CONFRONTO (FUTSAL, HANDEBOL, BASQUETE, VÔLEI, VÔLEI DE PRAIA, TÊNIS DE MESA, ETC.) */
            <div className="p-5 sm:p-7 space-y-6">
              <div className="grid grid-cols-3 items-center gap-3 sm:gap-6 max-w-4xl mx-auto">
                {/* LADO 1: EQUIPE / DUPLA 1 */}
                <div className="flex flex-col items-center text-center gap-2.5">
                  <TeamCrest
                    crestUrl={match.homeTeam.crestUrl}
                    teamName={match.homeTeam.teamName}
                    size="xl"
                    highlighted={Boolean(match.homeTeam.isWinner)}
                  />
                  <div>
                    <h2 className="text-base sm:text-xl font-display font-extrabold text-brand-text-primary">
                      {match.homeTeam.teamName || 'Aguardando equipes'}
                    </h2>
                    {/* Vôlei de Praia: mostra os 2 atletas da dupla */}
                    {engine.supportsPairs && (
                      <p className="text-xs text-brand-text-secondary mt-0.5">
                        {sheet.homeLineup
                          .filter((a) => a.isPairMember)
                          .map((a) => a.athleteName)
                          .join(' / ')}
                      </p>
                    )}
                  </div>

                  {/* Indicador de Faltas Coletivas no Período (Futsal / Basquete) */}
                  {engine.supportsTeamFouls && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-surface-muted border border-brand-surface-border text-xs font-bold">
                      <span className="text-brand-text-secondary">Faltas:</span>
                      <span
                        className={
                          sheet.homeFoulsCurrentPeriod >=
                          (currentCatRule.teamFoulLimitPerPeriod || 5)
                            ? 'text-red-600 font-extrabold'
                            : 'text-brand-blue'
                        }
                      >
                        {sheet.homeFoulsCurrentPeriod}
                      </span>
                    </div>
                  )}
                </div>

                {/* CENTRO: PLACAR GIGANTE + CRONÔMETRO / SETS */}
                <div className="flex flex-col items-center justify-center text-center">
                  {engine.scoringModel === 'sets_points' ? (
                    /* VÔLEI & VÔLEI DE PRAIA: Mostra SETS e SET ATUAL */
                    <div className="space-y-2.5 w-full">
                      <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-xl bg-brand-blue-light/80 border border-brand-blue/15">
                        <span className="text-xs font-bold uppercase text-brand-blue">
                          SETS:
                        </span>
                        <span className="text-lg font-display font-extrabold text-brand-blue">
                          {match.homeTeam.setsWon ?? 0} — {match.awayTeam.setsWon ?? 0}
                        </span>
                      </div>

                      <div className="bg-brand-surface-muted rounded-2xl border-2 border-brand-blue/15 px-4 py-3 sm:px-6 sm:py-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary block mb-1">
                          {sheet.timer.periodLabel} (Set Atual)
                        </span>
                        <div className="flex items-center justify-center gap-3 sm:gap-5 text-4xl sm:text-6xl font-display font-extrabold text-brand-blue">
                          <span>{currentSetScoreObj?.homeScore ?? 0}</span>
                          <span className="text-xl sm:text-2xl text-brand-text-muted">
                            ×
                          </span>
                          <span>{currentSetScoreObj?.awayScore ?? 0}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* FUTSAL, HANDEBOL, BASQUETE, TÊNIS DE MESA, ETC. */
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-4 sm:gap-7 px-5 py-3 sm:px-8 sm:py-4 rounded-3xl bg-brand-surface-muted border-2 border-brand-surface-border">
                        <span className="text-4xl sm:text-6xl font-display font-extrabold text-brand-blue tabular-nums">
                          {match.homeTeam.score ?? 0}
                        </span>
                        <span className="text-xl sm:text-2xl font-bold text-brand-text-muted">
                          ×
                        </span>
                        <span className="text-4xl sm:text-6xl font-display font-extrabold text-brand-blue tabular-nums">
                          {match.awayTeam.score ?? 0}
                        </span>
                      </div>

                      {/* Cronômetro Principal */}
                      {engine.timerDirection === 'countdown' && (
                        <div className="flex flex-col items-center">
                          <div
                            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl font-mono text-2xl sm:text-3xl font-extrabold tracking-tight border ${
                              sheet.timer.isRunning
                                ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
                                : 'bg-brand-yellow-light text-brand-blue-dark border-brand-yellow/60'
                            }`}
                          >
                            <Clock className="w-5 h-5 text-brand-yellow" />
                            <span>
                              {formatSecondsToClock(sheet.timer.remainingSeconds)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* LADO 2: EQUIPE / DUPLA 2 */}
                <div className="flex flex-col items-center text-center gap-2.5">
                  <TeamCrest
                    crestUrl={match.awayTeam.crestUrl}
                    teamName={match.awayTeam.teamName}
                    size="xl"
                    highlighted={Boolean(match.awayTeam.isWinner)}
                  />
                  <div>
                    <h2 className="text-base sm:text-xl font-display font-extrabold text-brand-text-primary">
                      {match.awayTeam.teamName || 'Aguardando equipes'}
                    </h2>
                    {engine.supportsPairs && (
                      <p className="text-xs text-brand-text-secondary mt-0.5">
                        {sheet.awayLineup
                          .filter((a) => a.isPairMember)
                          .map((a) => a.athleteName)
                          .join(' / ')}
                      </p>
                    )}
                  </div>

                  {engine.supportsTeamFouls && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-surface-muted border border-brand-surface-border text-xs font-bold">
                      <span className="text-brand-text-secondary">Faltas:</span>
                      <span
                        className={
                          sheet.awayFoulsCurrentPeriod >=
                          (currentCatRule.teamFoulLimitPerPeriod || 5)
                            ? 'text-red-600 font-extrabold'
                            : 'text-brand-blue'
                        }
                      >
                        {sheet.awayFoulsCurrentPeriod}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 17. BASQUETE / SETS: Tabela de Parciais por Período (P1 P2 P3 P4 TOTAL / SETS) */}
              {(engine.scoringModel === 'points_quarters' ||
                engine.scoringModel === 'sets_points') && (
                <div className="max-w-xl mx-auto overflow-x-auto pt-2">
                  <table className="w-full text-xs text-center border-collapse bg-brand-surface-muted/70 rounded-xl overflow-hidden border border-brand-surface-border">
                    <thead>
                      <tr className="bg-brand-blue-light/70 text-brand-blue font-display font-bold">
                        <th className="py-2 px-3 text-left">Equipe</th>
                        {sheet.periodScores.map((ps) => (
                          <th key={ps.periodNumber} className="py-2 px-2.5">
                            {ps.label}
                          </th>
                        ))}
                        <th className="py-2 px-3 bg-brand-blue text-white">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-surface-border font-semibold">
                      <tr>
                        <td className="py-2 px-3 text-left font-bold text-brand-text-primary">
                          {match.homeTeam.teamName}
                        </td>
                        {sheet.periodScores.map((ps) => (
                          <td key={ps.periodNumber} className="py-2 px-2.5">
                            {ps.homeScore}
                          </td>
                        ))}
                        <td className="py-2 px-3 font-display font-extrabold text-brand-blue bg-brand-blue-light/40">
                          {match.homeTeam.score ?? 0}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-left font-bold text-brand-text-primary">
                          {match.awayTeam.teamName}
                        </td>
                        {sheet.periodScores.map((ps) => (
                          <td key={ps.periodNumber} className="py-2 px-2.5">
                            {ps.awayScore}
                          </td>
                        ))}
                        <td className="py-2 px-3 font-display font-extrabold text-brand-blue bg-brand-blue-light/40">
                          {match.awayTeam.score ?? 0}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* 5 & 14. CONTROLES DO CRONÔMETRO E PERÍODOS / SETS */}
              {!sheet.isClosed && (
                <div className="pt-4 border-t border-brand-surface-border flex flex-wrap items-center justify-center gap-2.5">
                  {engine.timerDirection === 'countdown' && (
                    <>
                      {!sheet.timer.isRunning ? (
                        <Button
                          variant="primary"
                          size="lg"
                          leftIcon={<Play className="w-5 h-5" />}
                          onClick={() => handleStartOrResumeTimer()}
                        >
                          {sheet.timer.lifecycle === 'paused'
                            ? 'RETOMAR CRONÔMETRO'
                            : 'INICIAR PERÍODO'}
                        </Button>
                      ) : (
                        <Button
                          variant="accent"
                          size="lg"
                          leftIcon={<Pause className="w-5 h-5" />}
                          onClick={() => pauseTimer(match.id)}
                        >
                          PAUSAR ({formatSecondsToClock(sheet.timer.remainingSeconds)})
                        </Button>
                      )}

                      <Button
                        variant="secondary"
                        size="md"
                        leftIcon={<SkipForward className="w-4 h-4" />}
                        onClick={() => endCurrentPeriod(match.id)}
                      >
                        Encerrar Período
                      </Button>

                      {(sheet.timer.lifecycle === 'interval' ||
                        sheet.timer.lifecycle === 'period_ended') &&
                        sheet.timer.currentPeriod < sheet.timer.totalPeriods && (
                          <Button
                            variant="primary"
                            size="md"
                            onClick={() => startNextPeriod(match.id)}
                          >
                            Iniciar {sheet.timer.currentPeriod + 1}º Período
                          </Button>
                        )}

                      {currentCatRule.hasOvertime &&
                        sheet.timer.currentPeriod >= sheet.timer.totalPeriods && (
                          <Button
                            variant="outline"
                            size="md"
                            onClick={() => startOvertimePeriod(match.id)}
                          >
                            Iniciar Prorrogação
                          </Button>
                        )}

                      <Button
                        variant="ghost"
                        size="md"
                        leftIcon={<RotateCcw className="w-4 h-4" />}
                        onClick={() => setIsResetConfirmOpen(true)}
                      >
                        Reiniciar Tempo
                      </Button>
                    </>
                  )}

                  {engine.timerDirection === 'none' && match.status === 'scheduled' && (
                    <Button
                      variant="accent"
                      size="lg"
                      leftIcon={<Play className="w-5 h-5" />}
                      onClick={() => handleStartOrResumeTimer()}
                    >
                      INICIAR PARTIDA AO VIVO
                    </Button>
                  )}

                  {engine.scoringModel === 'sets_points' && (
                    <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                      <Button
                        variant="primary"
                        size="lg"
                        leftIcon={<Plus className="w-5 h-5" />}
                        onClick={() => handleDirectSetPoint('home')}
                      >
                        +1 Ponto {match.homeTeam.teamName}
                      </Button>

                      <Button
                        variant="primary"
                        size="lg"
                        leftIcon={<Plus className="w-5 h-5" />}
                        onClick={() => handleDirectSetPoint('away')}
                      >
                        +1 Ponto {match.awayTeam.teamName}
                      </Button>

                      <Button
                        variant="accent"
                        size="md"
                        leftIcon={<CheckCircle2 className="w-4 h-4" />}
                        onClick={() => finishCurrentSet(match.id)}
                      >
                        Encerrar {sheet.timer.periodLabel}
                      </Button>
                    </div>
                  )}

                  {engine.scoringModel === 'modular_table' && (
                    <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                      <Button
                        variant="primary"
                        size="lg"
                        leftIcon={<Plus className="w-5 h-5" />}
                        onClick={() => {
                          if (!canExecuteRapidAction(250)) return;
                          recordMatchEvent(match.id, {
                            type: 'point_1',
                            typeLabel: `Ponto (${match.homeTeam.teamName})`,
                            teamSide: 'home',
                            pointsDelta: 1,
                          });
                          if (soundEnabled) matchSound.playConfirmBeep();
                        }}
                      >
                        +1 Ponto {match.homeTeam.teamName}
                      </Button>

                      <Button
                        variant="primary"
                        size="lg"
                        leftIcon={<Plus className="w-5 h-5" />}
                        onClick={() => {
                          if (!canExecuteRapidAction(250)) return;
                          recordMatchEvent(match.id, {
                            type: 'point_1',
                            typeLabel: `Ponto (${match.awayTeam.teamName})`,
                            teamSide: 'away',
                            pointsDelta: 1,
                          });
                          if (soundEnabled) matchSound.playConfirmBeep();
                        }}
                      >
                        +1 Ponto {match.awayTeam.teamName}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* TELEMETRIA E REGRAS AO VIVO CONFORME A MODALIDADE */}
        <section className="rounded-2xl bg-white border border-brand-surface-border p-3.5 sm:p-4 shadow-sm">
          {match.modalityId === 'basquete' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className="font-display font-extrabold uppercase text-brand-blue tracking-wider">
                  Faltas Coletivas ({sheet.timer.periodLabel || 'Quarto Atual'}):
                </span>
                <span
                  className={`px-2.5 py-1 rounded-lg font-mono font-bold ${
                    sheet.homeFoulsCurrentPeriod >= 4
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {match.homeTeam.teamName}: {sheet.homeFoulsCurrentPeriod}/4{' '}
                  {sheet.homeFoulsCurrentPeriod >= 4 && '⚠️ BÔNUS'}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-lg font-mono font-bold ${
                    sheet.awayFoulsCurrentPeriod >= 4
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {match.awayTeam.teamName}: {sheet.awayFoulsCurrentPeriod}/4{' '}
                  {sheet.awayFoulsCurrentPeriod >= 4 && '⚠️ BÔNUS'}
                </span>
              </div>
              <span className="text-[11px] text-brand-text-secondary">
                Na 5ª falta coletiva do quarto = 2 lances livres para o adversário. Máx. 5 faltas pessoais por jogador (P1–P5).
              </span>
            </div>
          )}

          {match.modalityId === 'futsal' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className="font-display font-extrabold uppercase text-brand-blue tracking-wider">
                  Faltas Acumuladas ({sheet.timer.periodLabel || 'Período Atual'}):
                </span>
                <span
                  className={`px-2.5 py-1 rounded-lg font-mono font-bold ${
                    sheet.homeFoulsCurrentPeriod >= 5
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {match.homeTeam.teamName}: {sheet.homeFoulsCurrentPeriod}/5{' '}
                  {sheet.homeFoulsCurrentPeriod >= 5 && '🎯 TIRO LIVRE 10M'}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-lg font-mono font-bold ${
                    sheet.awayFoulsCurrentPeriod >= 5
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {match.awayTeam.teamName}: {sheet.awayFoulsCurrentPeriod}/5{' '}
                  {sheet.awayFoulsCurrentPeriod >= 5 && '🎯 TIRO LIVRE 10M'}
                </span>
              </div>
              <span className="text-[11px] text-brand-text-secondary">
                A partir da 6ª falta acumulada = tiro livre direto sem barreira (10m). Máx. 1 pedido de tempo por tempo.
              </span>
            </div>
          )}

          {(match.modalityId === 'volei' || match.modalityId === 'volei-de-praia') && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="font-display font-extrabold uppercase text-brand-blue tracking-wider">
                    Controle de Set ({sheet.timer.periodLabel || 'Set Atual'}):
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-mono font-bold text-slate-800">
                    Tempos de Descanso: {match.homeTeam.teamName} ({sheet.homeTimeoutsUsed}/2) • {match.awayTeam.teamName} ({sheet.awayTimeoutsUsed}/2)
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-mono font-bold text-slate-800">
                    Substituições no Set: {match.homeTeam.teamName} (
                    {
                      activeEvents.filter(
                        (e) =>
                          e.type === 'substitution' &&
                          e.teamSide === 'home' &&
                          e.periodNumber === sheet.timer.currentPeriod
                      ).length
                    }
                    /6) • {match.awayTeam.teamName} (
                    {
                      activeEvents.filter(
                        (e) =>
                          e.type === 'substitution' &&
                          e.teamSide === 'away' &&
                          e.periodNumber === sheet.timer.currentPeriod
                      ).length
                    }
                    /6)
                  </span>
                </div>
                <span className="text-[11px] text-brand-text-secondary">
                  Sets normais até 25 pontos (diferença mínima de 2). Set decisivo (Tie-break) até 15 pontos.
                </span>
              </div>

              {/* QUADRA OFICIAL DE VÔLEI 6×6 & ROTAÇÃO AUTOMÁTICA FIVB / CBV */}
              {match.modalityId === 'volei' && liveVolleyballRotation && (
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B218A] text-white text-xs font-display font-extrabold">
                          <span>🏐 SAQUE ATUAL:</span>
                          <span className="text-brand-yellow uppercase">
                            {liveVolleyballRotation.currentServingSide === 'home'
                              ? match.homeTeam.teamName
                              : match.awayTeam.teamName}
                          </span>
                        </span>
                        {liveVolleyballRotation.currentServer ? (
                          <span className="text-xs font-display font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg">
                            Posição I (P1):{' '}
                            {liveVolleyballRotation.currentServer.jerseyNumber != null
                              ? `#${liveVolleyballRotation.currentServer.jerseyNumber} `
                              : ''}
                            {liveVolleyballRotation.currentServer.athleteName}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                            Configure a escalação/rotação (P1–P6) para exibir o sacador
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Regra Oficial FIVB: só roda 1 posição no sentido horário (P2 → P1) a equipe que <strong>recupera o saque</strong> (side-out). Quem mantém o saque permanece na mesma rotação.
                      </p>
                    </div>

                    {!sheet.isClosed && (
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {liveVolleyballRotation.pointsPlayedInSet === 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              configureVolleyballSetRotation(
                                match.id,
                                liveVolleyballRotation.setNumber,
                                {
                                  initialServingSide:
                                    liveVolleyballRotation.initialServingSide === 'home'
                                      ? 'away'
                                      : 'home',
                                }
                              )
                            }
                            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-display font-bold text-slate-800 transition-colors touch-manipulation"
                          >
                            Alternar 1º Saque
                          </button>
                        )}
                        <Button
                          variant="accent"
                          size="sm"
                          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                          onClick={openVolleyballRotationModal}
                        >
                          Rotação {sheet.timer.periodLabel || `Set ${liveVolleyballRotation.setNumber}`} (P1–P6)
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Duas meias-quadras visuais (Rede no topo de cada card: P4 - P3 - P2 | Fundo: P5 - P6 - P1) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(['home', 'away'] as const).map((side) => {
                      const isServingTeam =
                        liveVolleyballRotation.currentServingSide === side;
                      const teamName =
                        side === 'home'
                          ? match.homeTeam.teamName
                          : match.awayTeam.teamName;
                      const court =
                        side === 'home'
                          ? liveVolleyballRotation.homeCourt
                          : liveVolleyballRotation.awayCourt;
                      const rotationsCount =
                        side === 'home'
                          ? liveVolleyballRotation.homeRotationsCount
                          : liveVolleyballRotation.awayRotationsCount;

                      // Layout oficial olhando para a rede:
                      // Linha de Ataque (Rede): P4 (idx 3), P3 (idx 2), P2 (idx 1)
                      // Linha de Defesa / Saque: P5 (idx 4), P6 (idx 5), P1 (idx 0 - Sacador)
                      const frontRowIndices = [
                        { idx: 3, zone: 'IV (P4)', role: 'Entrada / Rede Esq.' },
                        { idx: 2, zone: 'III (P3)', role: 'Meio de Rede' },
                        { idx: 1, zone: 'II (P2)', role: 'Saída / Rede Dir.' },
                      ];
                      const backRowIndices = [
                        { idx: 4, zone: 'V (P5)', role: 'Defesa Esq.' },
                        { idx: 5, zone: 'VI (P6)', role: 'Defesa Centro' },
                        { idx: 0, zone: 'I (P1)', role: 'Zona de Saque' },
                      ];

                      return (
                        <div
                          key={side}
                          className={`rounded-2xl border-2 p-3 space-y-2 transition-all ${
                            isServingTeam
                              ? 'border-emerald-500 bg-emerald-50/40'
                              : 'border-slate-200 bg-slate-50/70'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-display font-extrabold uppercase text-brand-blue truncate">
                                {teamName}
                              </span>
                              {isServingTeam && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold uppercase shrink-0">
                                  🏐 Sacando
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] font-mono font-bold text-slate-500 mr-1">
                                Giros: {rotationsCount}
                              </span>
                              {!sheet.isClosed && (
                                <>
                                  <button
                                    type="button"
                                    title="Voltar 1 rotação (ajuste de arbitragem)"
                                    onClick={() =>
                                      adjustVolleyballManualRotation(match.id, side, -1)
                                    }
                                    className="px-2 py-1 rounded-lg bg-white border border-slate-300 hover:border-brand-blue text-[11px] font-bold text-slate-700 touch-manipulation"
                                  >
                                    ↺ -1
                                  </button>
                                  <button
                                    type="button"
                                    title="Avançar 1 rotação horária (ajuste de arbitragem)"
                                    onClick={() =>
                                      adjustVolleyballManualRotation(match.id, side, 1)
                                    }
                                    className="px-2 py-1 rounded-lg bg-white border border-slate-300 hover:border-brand-blue text-[11px] font-bold text-slate-700 touch-manipulation"
                                  >
                                    ↻ +1
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Faixa da Rede */}
                          <div className="rounded-lg bg-slate-800 text-white text-[9px] font-mono font-bold uppercase tracking-widest text-center py-0.5">
                            ═══ REDE • ZONA DE ATAQUE (FRENTE) ═══
                          </div>

                          {/* Linha de Frente: P4 - P3 - P2 */}
                          <div className="grid grid-cols-3 gap-1.5">
                            {frontRowIndices.map((slot) => {
                              const player = court[slot.idx];
                              return (
                                <div
                                  key={slot.zone}
                                  className="rounded-xl bg-white border border-slate-200 p-2 text-center shadow-sm"
                                >
                                  <span className="block text-[9px] font-mono font-extrabold text-slate-400">
                                    {slot.zone}
                                  </span>
                                  {player ? (
                                    <>
                                      <span className="block text-xs font-mono font-black text-[#0B218A] mt-0.5">
                                        {player.jerseyNumber != null
                                          ? `#${player.jerseyNumber}`
                                          : '•'}
                                      </span>
                                      <span className="block text-[11px] font-bold text-slate-800 truncate">
                                        {player.athleteName.split(' ')[0]}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="block text-[10px] text-slate-400 py-1.5">
                                      Vazio
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Linha dos 3 metros */}
                          <div className="border-t border-dashed border-slate-300 text-center">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                              Linha de 3m • Zona de Defesa &amp; Saque
                            </span>
                          </div>

                          {/* Linha de Fundo: P5 - P6 - P1 */}
                          <div className="grid grid-cols-3 gap-1.5">
                            {backRowIndices.map((slot) => {
                              const player = court[slot.idx];
                              const isActiveServerSlot =
                                slot.idx === 0 && isServingTeam;
                              return (
                                <div
                                  key={slot.zone}
                                  className={`rounded-xl border p-2 text-center shadow-sm ${
                                    isActiveServerSlot
                                      ? 'bg-emerald-600 border-emerald-700 text-white ring-2 ring-brand-yellow'
                                      : slot.idx === 0
                                      ? 'bg-amber-50/70 border-amber-200'
                                      : 'bg-white border-slate-200'
                                  }`}
                                >
                                  <span
                                    className={`block text-[9px] font-mono font-extrabold ${
                                      isActiveServerSlot
                                        ? 'text-brand-yellow'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    {slot.zone} {isActiveServerSlot ? '🏐' : ''}
                                  </span>
                                  {player ? (
                                    <>
                                      <span
                                        className={`block text-xs font-mono font-black mt-0.5 ${
                                          isActiveServerSlot
                                            ? 'text-white'
                                            : 'text-[#0B218A]'
                                        }`}
                                      >
                                        {player.jerseyNumber != null
                                          ? `#${player.jerseyNumber}`
                                          : '•'}
                                      </span>
                                      <span
                                        className={`block text-[11px] font-bold truncate ${
                                          isActiveServerSlot
                                            ? 'text-white'
                                            : 'text-slate-800'
                                        }`}
                                      >
                                        {player.athleteName.split(' ')[0]}
                                      </span>
                                    </>
                                  ) : (
                                    <span
                                      className={`block text-[10px] py-1.5 ${
                                        isActiveServerSlot
                                          ? 'text-white/80'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      Vazio
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {match.modalityId === 'handebol' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className="font-display font-extrabold uppercase text-brand-blue tracking-wider">
                  Controle da Mesa (CBHb):
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-mono font-bold text-slate-800">
                  TTOs Utilizados: {match.homeTeam.teamName} ({sheet.homeTimeoutsUsed}/3) • {match.awayTeam.teamName} ({sheet.awayTimeoutsUsed}/3)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-mono font-bold text-slate-800">
                  Exclusões Ativas: {sheet.activeSuspensions.length}
                </span>
              </div>
              <span className="text-[11px] text-brand-text-secondary">
                Máximo de 3 exclusões de 2 minutos por atleta antes da desqualificação (Cartão Vermelho direto).
              </span>
            </div>
          )}
        </section>

        {/* 13. ALERTA DE TIMEOUT EM ANDAMENTO */}
        {sheet.activeTimeout && sheet.activeTimeout.isActive && (
          <div className="rounded-2xl bg-brand-yellow-light border-2 border-brand-yellow p-4 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Timer className="w-6 h-6 text-brand-blue-dark animate-spin" />
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-brand-blue-dark block">
                  TIMEOUT / TEMPO TÉCNICO — {sheet.activeTimeout.teamName}
                </span>
                <span className="text-lg font-mono font-extrabold text-brand-blue">
                  {formatSecondsToClock(sheet.activeTimeout.remainingSeconds)} restantes
                </span>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => cancelActiveTimeout(match.id)}
            >
              Encerrar Timeout
            </Button>
          </div>
        )}

        {/* 11. PAINEL DE PUNIÇÕES TEMPORÁRIAS ATIVAS (EXCLUSÃO DE 2 MINUTOS — HANDEBOL) */}
        {sheet.activeSuspensions.length > 0 && (
          <section
            aria-label="Contadores Individuais de Punição Temporária"
            className="rounded-2xl bg-white border-2 border-brand-yellow/60 p-4 shadow-card space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-brand-yellow-dark" />
                <h3 className="text-sm font-display font-extrabold text-brand-text-primary uppercase">
                  Punições Temporárias (2 Minutos)
                </h3>
              </div>
              <span className="text-xs text-brand-text-secondary">
                Contadores individuais sincronizados com o cronômetro
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sheet.activeSuspensions.map((susp) => (
                <div
                  key={susp.id}
                  className={`rounded-xl p-3.5 border flex items-center justify-between gap-3 ${
                    susp.isReleased
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-brand-yellow-light/70 border-brand-yellow text-brand-blue-dark'
                  }`}
                >
                  <div>
                    <span className="text-xs font-extrabold uppercase block">
                      {susp.teamName} • {susp.athleteName}
                    </span>
                    <span className="text-[11px] opacity-80 block mt-0.5">
                      Início: {susp.startedAtMatchClock} • Retorno previsto:{' '}
                      {susp.expectedReturnMatchClock}
                    </span>
                    {susp.isReleased ? (
                      <span className="mt-1 inline-block px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-extrabold uppercase">
                        LIBERADO PARA RETORNAR
                      </span>
                    ) : (
                      <span className="mt-1 inline-block text-base font-mono font-extrabold text-brand-blue">
                        {formatSecondsToClock(susp.remainingSeconds)} restantes
                      </span>
                    )}
                  </div>

                  {susp.isReleased && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissReleasedSuspension(match.id, susp.id)}
                    >
                      OK
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 20. MÓDULO ESPECÍFICO: TÊNIS DE MESA (PARTIDAS INDIVIDUAIS DENTRO DO CONFRONTO DE EQUIPES) */}
        {engine.scoringModel === 'team_submatches' && sheet.subMatches && (
          <section className="rounded-3xl bg-white border border-brand-surface-border p-5 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-brand-surface-border">
              <div>
                <h3 className="text-base font-display font-extrabold text-brand-text-primary">
                  Sequência de Partidas Individuais (Confronto por Equipes)
                </h3>
                <p className="text-xs text-brand-text-secondary">
                  Controle pontos, sets e resultado de cada jogo individual para compor o placar geral das equipes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sheet.subMatches.map((sub, idx) => {
                const isSelected = (sheet.activeSubMatchIndex ?? 0) === idx;
                return (
                  <div
                    key={sub.id}
                    onClick={() => selectActiveSubMatch(match.id, idx)}
                    className={`rounded-2xl p-4 border transition-all cursor-pointer space-y-3 ${
                      isSelected
                        ? 'border-brand-blue ring-2 ring-brand-blue/15 bg-brand-blue-light/20'
                        : 'border-brand-surface-border bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-display font-bold text-brand-blue uppercase">
                        {sub.label}
                      </span>
                      <StatusBadge
                        status={sub.status === 'finished' ? 'finished' : 'live'}
                        label={
                          sub.status === 'finished'
                            ? 'Concluído'
                            : 'Em disputa'
                        }
                      />
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-semibold">
                        <span>{sub.homeAthleteName}</span>
                        <span className="font-mono font-bold text-brand-blue">
                          {sub.homeSetsWon} sets ({sub.currentSetHomePoints} pts)
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-semibold">
                        <span>{sub.awayAthleteName}</span>
                        <span className="font-mono font-bold text-brand-blue">
                          {sub.awaySetsWon} sets ({sub.currentSetAwayPoints} pts)
                        </span>
                      </div>
                    </div>

                    {sub.status !== 'finished' && !sheet.isClosed && (
                      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-brand-surface-border">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!canExecuteRapidAction(400)) return;
                            recordTableTennisPoint(match.id, sub.id, 'home');
                          }}
                        >
                          +1 Eq. 1
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!canExecuteRapidAction(400)) return;
                            recordTableTennisPoint(match.id, sub.id, 'away');
                          }}
                        >
                          +1 Eq. 2
                        </Button>
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            finishTableTennisSet(match.id, sub.id);
                          }}
                        >
                          Fim Set
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 28. LAYOUT DIVIDIDO (TABLET / DESKTOP) E VERTICAL (MOBILE): AÇÕES RÁPIDAS + TIMELINE DE EVENTOS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* COLUNA ESQUERDA (7 cols): BOTÕES DE AÇÃO RÁPIDA GRANDES */}
          <section
            aria-label="Botões de Ação Rápida"
            className="lg:col-span-7 rounded-3xl bg-white border border-brand-surface-border p-5 shadow-card space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-brand-surface-border">
              <div>
                <h3 className="text-base font-display font-extrabold text-brand-text-primary uppercase tracking-tight">
                  Ações Rápidas — {match.modalityName}
                </h3>
                <p className="text-xs text-brand-text-secondary">
                  Toque na ação → escolha equipe e atleta → confirme para atualizar placar e súmula.
                </p>
              </div>
            </div>

            {engine.scoringModel === 'modular_table' && (
              <div className="p-4 rounded-2xl bg-brand-surface-muted border border-brand-surface-border text-xs text-brand-text-secondary leading-relaxed">
                <strong>Estrutura Modular ({match.modalityName}):</strong> As regras específicas desta modalidade serão parametrizadas após publicação do regulamento oficial. Utilize os controles abaixo para registrar ocorrências de mesa ou consolidar o resultado.
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {quickActions.map((act) => {
                const colorStyles = {
                  blue: 'bg-brand-blue text-white hover:bg-brand-blue-medium border-brand-blue',
                  yellow:
                    'bg-brand-yellow-light text-brand-blue-dark hover:bg-brand-yellow/40 border-brand-yellow',
                  red: 'bg-red-50 text-red-900 hover:bg-red-100 border-red-200',
                  neutral:
                    'bg-brand-surface-muted text-brand-text-primary hover:bg-brand-blue-light/60 border-brand-surface-border',
                };

                return (
                  <button
                    key={act.label}
                    type="button"
                    disabled={sheet.isClosed}
                    onClick={() => openActionWizard(act)}
                    className={`min-h-[88px] p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 text-center font-display font-extrabold transition-all active:scale-[0.98] disabled:opacity-45 ${
                      colorStyles[act.accentColor]
                    }`}
                  >
                    <span className="text-2xl leading-none">{act.shortBadge}</span>
                    <span className="text-xs sm:text-sm tracking-wide uppercase">
                      {act.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* COLUNA DIREITA (5 cols): TIMELINE DE EVENTOS EM TEMPO REAL (DO MAIS RECENTE AO MAIS ANTIGO) */}
          <section
            aria-label="Timeline de Eventos da Partida"
            className="lg:col-span-5 rounded-3xl bg-white border border-brand-surface-border p-5 shadow-card space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-brand-surface-border">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-brand-blue" />
                <h3 className="text-base font-display font-extrabold text-brand-text-primary uppercase tracking-tight">
                  Eventos em Tempo Real
                </h3>
              </div>
              <span className="text-xs font-bold text-brand-blue bg-brand-blue-light px-2.5 py-1 rounded-full">
                {activeEvents.length} registros
              </span>
            </div>

            {activeEvents.length === 0 ? (
              <div className="py-10 text-center space-y-1">
                <p className="text-sm font-semibold text-brand-text-secondary">
                  Nenhum evento registrado na partida.
                </p>
                <p className="text-xs text-brand-text-muted">
                  Os eventos aparecerão aqui em ordem cronológica inversa (mais recente no topo).
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {activeEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-2xl bg-brand-surface-muted/70 border border-brand-surface-border p-3.5 flex items-start justify-between gap-3 hover:border-brand-blue/30 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-brand-blue text-white font-mono text-xs font-bold">
                          {ev.matchClockDisplay}
                        </span>
                        <span className="text-xs font-display font-extrabold text-brand-text-primary">
                          {ev.typeLabel}
                        </span>
                        {ev.teamName && (
                          <span className="text-xs font-semibold text-brand-blue">
                            • {ev.teamName}
                          </span>
                        )}
                      </div>

                      {ev.athleteName && (
                        <p className="text-xs font-medium text-brand-text-primary">
                          {ev.type === 'substitution' ? (
                            <>
                              Sai: <strong>{ev.athleteName}</strong> → Entra:{' '}
                              <strong>{ev.secondaryAthleteName || 'Reserva'}</strong>
                            </>
                          ) : (
                            <>
                              {ev.athleteName}
                              {ev.secondaryAthleteName && (
                                <span className="text-brand-text-secondary">
                                  {' '}
                                  (Assistência: {ev.secondaryAthleteName})
                                </span>
                              )}
                            </>
                          )}
                        </p>
                      )}

                      {ev.foulReason && (
                        <p className="text-[11px] text-brand-text-secondary">
                          Motivo/Detalhe: {ev.foulReason}
                        </p>
                      )}

                      {/* Indicador de Auditoria se o evento foi corrigido */}
                      {ev.auditHistory.length > 0 && (
                        <p className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-block">
                          Corrigido pela mesa ({ev.auditHistory.length}x)
                        </p>
                      )}
                    </div>

                    {/* Botões de Correção / Exclusão (Item 25) */}
                    {!sheet.isClosed && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          title="Editar / Corrigir Evento"
                          onClick={() => {
                            setEditingEvent(ev);
                            setEditTeamSide(ev.teamSide || 'home');
                            setEditAthleteId(ev.athleteId || '');
                            setEditClock(ev.matchClockDisplay);
                            setEditReason('');
                          }}
                          className="p-1.5 rounded-lg text-brand-text-secondary hover:text-brand-blue hover:bg-white transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Excluir Evento"
                          onClick={() => setDeletingEvent(ev)}
                          className="p-1.5 rounded-lg text-brand-text-secondary hover:text-red-600 hover:bg-white transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* =====================================================================
          MODAL 1: FLUXO RÁPIDO DE REGISTRO + CONFIRMAÇÃO DE EVENTO (Itens 8 a 13 e 24)
         ===================================================================== */}
      <Modal
        isOpen={Boolean(wizardAction)}
        onClose={() => setWizardAction(null)}
        title={wizardAction ? `${wizardAction.shortBadge} ${wizardAction.label}` : 'Registrar Evento'}
        description={`Tempo da partida: ${
          engine.timerDirection === 'countdown'
            ? formatSecondsToClock(sheet.timer.remainingSeconds)
            : sheet.timer.periodLabel
        }`}
      >
        {wizardAction && (
          <div className="space-y-5">
            {/* PASSO 1: SELECIONE A EQUIPE */}
            {wizardStep === 'team' && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">
                  1. Selecione a equipe
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectTeamInWizard('home')}
                    className="p-5 rounded-2xl border-2 border-brand-surface-border hover:border-brand-blue bg-brand-surface-muted/60 hover:bg-brand-blue-light/40 flex flex-col items-center gap-2 text-center transition-all"
                  >
                    <TeamCrest size="md" />
                    <span className="text-sm font-display font-extrabold text-brand-text-primary">
                      {match.homeTeam.teamName}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectTeamInWizard('away')}
                    className="p-5 rounded-2xl border-2 border-brand-surface-border hover:border-brand-blue bg-brand-surface-muted/60 hover:bg-brand-blue-light/40 flex flex-col items-center gap-2 text-center transition-all"
                  >
                    <TeamCrest size="md" />
                    <span className="text-sm font-display font-extrabold text-brand-text-primary">
                      {match.awayTeam.teamName}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* PASSO 2: SELECIONE O ATLETA (E DETALHE SE APLICÁVEL) */}
            {wizardStep === 'athlete' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">
                    2.{' '}
                    {wizardAction.type === 'substitution'
                      ? 'Selecione quem SAI e quem ENTRA'
                      : 'Selecione o atleta'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setWizardStep('team')}
                    className="text-xs font-semibold text-brand-blue hover:underline"
                  >
                    Trocar equipe
                  </button>
                </div>

                {/* Se for Cartão, permite escolher Amarelo ou Vermelho */}
                {wizardAction.type === 'yellow_card' && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCardSubType('yellow_card')}
                      className={`py-2.5 px-3 rounded-xl font-display font-bold text-xs border-2 ${
                        selectedCardSubType === 'yellow_card'
                          ? 'bg-brand-yellow-light border-brand-yellow text-brand-blue-dark'
                          : 'border-brand-surface-border text-brand-text-secondary'
                      }`}
                    >
                      🟨 Cartão Amarelo
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCardSubType('red_card')}
                      className={`py-2.5 px-3 rounded-xl font-display font-bold text-xs border-2 ${
                        selectedCardSubType === 'red_card'
                          ? 'bg-red-100 border-red-500 text-red-900'
                          : 'border-brand-surface-border text-brand-text-secondary'
                      }`}
                    >
                      🟥 Cartão Vermelho
                    </button>
                  </div>
                )}

                {/* Lista de Atletas da Equipe Selecionada */}
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {(selectedSide === 'home'
                    ? sheet.homeLineup
                    : sheet.awayLineup
                  ).map((ath) => {
                    const isSelected = selectedAthleteId === ath.athleteId;

                    const athFouls = activeEvents.filter(
                      (e) =>
                        (e.athleteId === ath.athleteId ||
                          (e.athleteName &&
                            e.athleteName.toLowerCase() ===
                              ath.athleteName.toLowerCase())) &&
                        (e.type === 'foul' ||
                          e.type === 'technical_foul' ||
                          e.type === 'unsportsmanlike_foul')
                    ).length;

                    const athYellow = activeEvents.some(
                      (e) =>
                        (e.athleteId === ath.athleteId ||
                          (e.athleteName &&
                            e.athleteName.toLowerCase() ===
                              ath.athleteName.toLowerCase())) &&
                        e.type === 'yellow_card'
                    );

                    const athRed = activeEvents.some(
                      (e) =>
                        (e.athleteId === ath.athleteId ||
                          (e.athleteName &&
                            e.athleteName.toLowerCase() ===
                              ath.athleteName.toLowerCase())) &&
                        (e.type === 'red_card' ||
                          e.type === 'expulsion' ||
                          e.type === 'disqualification')
                    );

                    const athSuspensions = activeEvents.filter(
                      (e) =>
                        (e.athleteId === ath.athleteId ||
                          (e.athleteName &&
                            e.athleteName.toLowerCase() ===
                              ath.athleteName.toLowerCase())) &&
                        e.type === 'suspension_2min'
                    ).length;

                    return (
                      <button
                        key={ath.athleteId}
                        type="button"
                        onClick={() => setSelectedAthleteId(ath.athleteId)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-1.5 ${
                          isSelected
                            ? 'bg-brand-blue text-white border-brand-blue font-bold shadow-sm'
                            : athRed
                            ? 'bg-rose-50 border-rose-200 text-rose-900 opacity-60'
                            : 'bg-brand-surface-muted/70 border-brand-surface-border text-brand-text-primary hover:border-brand-blue/40'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {ath.jerseyNumber && (
                            <span className={`font-mono text-xs font-bold px-1 rounded shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-brand-blue-light/60 text-brand-blue'}`}>
                              #{ath.jerseyNumber}
                            </span>
                          )}
                          <span className="text-xs truncate">{ath.athleteName}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 text-[10px]">
                          {match.modalityId === 'basquete' && athFouls > 0 && (
                            <span
                              className={`px-1.5 py-0.5 rounded font-mono font-black ${
                                athFouls >= 5
                                  ? 'bg-red-600 text-white animate-pulse'
                                  : isSelected
                                  ? 'bg-white/25 text-white'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {athFouls >= 5 ? '5F OUT' : `P${athFouls}`}
                            </span>
                          )}

                          {athYellow && !athRed && (
                            <span className="px-1 rounded bg-yellow-100 text-yellow-900 font-bold">
                              🟨
                            </span>
                          )}

                          {athSuspensions > 0 && (
                            <span className="px-1 rounded bg-amber-100 text-amber-900 font-bold">
                              2m ({athSuspensions})
                            </span>
                          )}

                          {athRed && (
                            <span className="px-1 rounded bg-red-600 text-white font-bold">
                              EXPULSO
                            </span>
                          )}

                          {ath.isStarter && !athRed && athFouls < 5 && (
                            <span className={`px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/20' : 'bg-black/10'}`}>
                              Titular
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Segundo Atleta (Substituição: quem entra / Gol: assistência opcional) */}
                {wizardAction.requiresSecondaryAthlete && (
                  <div className="space-y-2 pt-2 border-t border-brand-surface-border">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary block">
                      {wizardAction.type === 'substitution'
                        ? 'Atleta que ENTRA:'
                        : 'Assistência (opcional):'}
                    </span>
                    <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                      {(selectedSide === 'home'
                        ? sheet.homeLineup
                        : sheet.awayLineup
                      )
                        .filter((a) => a.athleteId !== selectedAthleteId)
                        .map((ath) => {
                          const isSec =
                            selectedSecondaryAthleteId === ath.athleteId;
                          return (
                            <button
                              key={ath.athleteId}
                              type="button"
                              onClick={() =>
                                setSelectedSecondaryAthleteId(
                                  isSec ? null : ath.athleteId
                                )
                              }
                              className={`p-2.5 rounded-xl border text-left text-xs ${
                                isSec
                                  ? 'bg-brand-blue text-white border-brand-blue font-bold'
                                  : 'bg-white border-brand-surface-border'
                              }`}
                            >
                              {ath.athleteName}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {wizardAction.type === 'foul' && (
                  <Input
                    label="Motivo / Tipo da falta (opcional)"
                    placeholder="Ex: Falta tática, segurar, etc."
                    value={foulReasonInput}
                    onChange={(e) => setFoulReasonInput(e.target.value)}
                  />
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setWizardAction(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!selectedAthleteId}
                    onClick={() => setWizardStep('confirm')}
                  >
                    Avançar para Confirmação
                  </Button>
                </div>
              </div>
            )}

            {/* PASSO 3: CONFIRMAÇÃO RÁPIDA DE SEGURANÇA (Item 24) */}
            {wizardStep === 'confirm' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-brand-surface-muted border border-brand-surface-border space-y-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-brand-blue block">
                    CONFIRMAR {wizardAction.label}?
                  </span>
                  <div className="text-sm space-y-1 text-brand-text-primary">
                    {wizardAction.type === 'yellow_card' &&
                      selectedCardSubType === 'yellow_card' &&
                      selectedAthleteId &&
                      activeEvents.some(
                        (e) =>
                          (e.athleteId === selectedAthleteId ||
                            (e.athleteName &&
                              (selectedSide === 'home'
                                ? sheet.homeLineup
                                : sheet.awayLineup
                              )
                                .find((a) => a.athleteId === selectedAthleteId)
                                ?.athleteName.toLowerCase() ===
                                e.athleteName.toLowerCase())) &&
                          e.type === 'yellow_card'
                      ) && (
                        <div className="p-2.5 rounded-xl bg-red-50 border border-red-300 text-red-900 font-bold text-xs flex items-center gap-2 mb-2">
                          <span className="text-base">⚠️</span>
                          <span>
                            ATENÇÃO: Este atleta já possui 1 cartão amarelo! A confirmação aplicará o 2º Cartão Amarelo e a EXPULSÃO AUTOMÁTICA (Cartão Vermelho).
                          </span>
                        </div>
                      )}
                    <p>
                      <strong>Equipe:</strong>{' '}
                      {selectedSide === 'home'
                        ? match.homeTeam.teamName
                        : match.awayTeam.teamName}
                    </p>
                    {selectedAthleteId && (
                      <p>
                        <strong>Atleta:</strong>{' '}
                        {
                          (selectedSide === 'home'
                            ? sheet.homeLineup
                            : sheet.awayLineup
                          ).find((a) => a.athleteId === selectedAthleteId)
                            ?.athleteName
                        }
                      </p>
                    )}
                    <p>
                      <strong>Tempo:</strong>{' '}
                      {engine.timerDirection === 'countdown'
                        ? formatSecondsToClock(sheet.timer.remainingSeconds)
                        : sheet.timer.periodLabel}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => setWizardAction(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleConfirmWizardEvent}
                  >
                    Confirmar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* =====================================================================
          MODAL 2: CORREÇÃO / EDIÇÃO DE EVENTO COM AUDITORIA (Item 25)
         ===================================================================== */}
      <Modal
        isOpen={Boolean(editingEvent)}
        onClose={() => setEditingEvent(null)}
        title="Corrigir Evento na Súmula"
        description="A alteração recalcula o placar quando aplicável e fica registrada no histórico de auditoria."
      >
        {editingEvent && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditTeamSide('home')}
                className={`p-3 rounded-xl border text-xs font-bold ${
                  editTeamSide === 'home'
                    ? 'bg-brand-blue text-white border-brand-blue'
                    : 'bg-brand-surface-muted border-brand-surface-border'
                }`}
              >
                {match.homeTeam.teamName}
              </button>
              <button
                type="button"
                onClick={() => setEditTeamSide('away')}
                className={`p-3 rounded-xl border text-xs font-bold ${
                  editTeamSide === 'away'
                    ? 'bg-brand-blue text-white border-brand-blue'
                    : 'bg-brand-surface-muted border-brand-surface-border'
                }`}
              >
                {match.awayTeam.teamName}
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-brand-text-secondary mb-1">
                Atleta Responsável
              </label>
              <select
                value={editAthleteId}
                onChange={(e) => setEditAthleteId(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-brand-surface-border text-sm"
              >
                <option value="">Sem atleta específico</option>
                {(editTeamSide === 'home'
                  ? sheet.homeLineup
                  : sheet.awayLineup
                ).map((a) => (
                  <option key={a.athleteId} value={a.athleteId}>
                    {a.athleteName}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Horário na Partida"
              value={editClock}
              onChange={(e) => setEditClock(e.target.value)}
            />

            <Input
              label="Motivo da correção (Auditoria)"
              placeholder="Ex: Lançado para o número errado"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingEvent(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const lineup =
                    editTeamSide === 'home'
                      ? sheet.homeLineup
                      : sheet.awayLineup;
                  const ath = lineup.find((a) => a.athleteId === editAthleteId);
                  editMatchEvent(match.id, {
                    eventId: editingEvent.id,
                    teamSide: editTeamSide,
                    athleteId: ath?.athleteId || null,
                    athleteName: ath?.athleteName || null,
                    athleteNumber: ath?.jerseyNumber ?? null,
                    matchClockDisplay: editClock,
                    reason: editReason || 'Correção realizada pelo operador',
                  });
                  setEditingEvent(null);
                }}
              >
                Salvar Correção
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* =====================================================================
          MODAL 3: CONFIRMAÇÃO DE EXCLUSÃO DE EVENTO (Item 25)
         ===================================================================== */}
      <Modal
        isOpen={Boolean(deletingEvent)}
        onClose={() => setDeletingEvent(null)}
        title="Excluir Evento da Súmula?"
        description="O placar e as estatísticas serão reajustados automaticamente e a exclusão ficará registrada na auditoria."
      >
        {deletingEvent && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900">
              <strong>Evento selecionado:</strong> {deletingEvent.typeLabel} •{' '}
              {deletingEvent.teamName} • {deletingEvent.athleteName || ''} (
              {deletingEvent.matchClockDisplay})
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeletingEvent(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  deleteMatchEvent(
                    match.id,
                    deletingEvent.id,
                    'Excluído mediante confirmação do operador'
                  );
                  setDeletingEvent(null);
                }}
              >
                Confirmar Exclusão
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* =====================================================================
          MODAL 4: ESCALAÇÃO DA PARTIDA (Mobile-First, Toque Rápido e Escalar Todos)
         ===================================================================== */}
      <Modal
        isOpen={isLineupModalOpen}
        onClose={() => setIsLineupModalOpen(false)}
        size="lg"
        title="Escalação Oficial da Partida"
        description={
          isTestMode
            ? 'Configure titulares, reservas, capitão (C) e goleiro (GK) para as equipes de teste.'
            : 'Toque nos atletas aptos abaixo para adicioná-los imediatamente à partida.'
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <span className="text-[11px] font-bold text-slate-600">
              {match.homeTeam.teamName}: {sheet.homeLineup.length}/{rosterLimits.min} mín •{' '}
              {match.awayTeam.teamName}: {sheet.awayLineup.length}/{rosterLimits.min} mín
            </span>
            <div className="flex items-center gap-2 ml-auto">
              {match.modalityId === 'volei' && !sheet.isClosed && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setIsLineupModalOpen(false);
                    openVolleyballRotationModal();
                  }}
                >
                  Rotação P1–P6
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsLineupModalOpen(false)}
              >
                Concluir Escalação
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3.5">
          {/* Seletor de Equipe em Abas Grandes (Facilita 100% no Celular sem rolar 2 listas longas) */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200">
            {(['home', 'away'] as const).map((tabSide) => {
              const tObj = tabSide === 'home' ? match.homeTeam : match.awayTeam;
              const rawLList =
                tabSide === 'home' ? sheet.homeLineup : sheet.awayLineup;
              const catLowerTab = (match.categoryName || '').toLowerCase();
              const tabMatchGender = catLowerTab.includes('fem')
                ? 'feminino'
                : catLowerTab.includes('masc')
                ? 'masculino'
                : null;
              const isLiveMatchTab =
                match.status === 'live' || match.status === 'halftime';
              const lList =
                tabMatchGender &&
                !isLiveMatchTab &&
                !allowOtherGenderBySide[tabSide]
                  ? rawLList.filter((entry) => {
                      const ath = visibleAthletes.find(
                        (a) => a.id === entry.athleteId
                      );
                      const g = String(ath?.gender || '').toLowerCase();
                      if (!g || g === 'geral') return true;
                      return tabMatchGender === 'feminino'
                        ? g === 'feminino' || g === 'f'
                        : g === 'masculino' || g === 'm';
                    })
                  : rawLList;
              const isTabActive = lineupActiveTab === tabSide;
              const isReady = lList.length >= rosterLimits.min;
              return (
                <button
                  key={tabSide}
                  type="button"
                  onClick={() => setLineupActiveTab(tabSide)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-display font-extrabold transition-all touch-manipulation flex flex-col items-center justify-center gap-0.5 ${
                    isTabActive
                      ? 'bg-[#0B218A] text-white shadow-sm'
                      : 'text-slate-700 hover:bg-white/70'
                  }`}
                >
                  <span className="truncate max-w-full">
                    {tObj.teamName || (tabSide === 'home' ? 'Mandante' : 'Visitante')}
                  </span>
                  <span
                    className={`text-[10px] font-mono ${
                      isTabActive
                        ? isReady
                          ? 'text-emerald-300'
                          : 'text-brand-yellow'
                        : isReady
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {lList.length}/{rosterLimits.max} (mín {rosterLimits.min}) {isReady ? '✓' : ''}
                  </span>
                </button>
              );
            })}
          </div>

          {(['home', 'away'] as const)
            .filter((side) => side === lineupActiveTab)
            .map((side) => {
              const teamObj = side === 'home' ? match.homeTeam : match.awayTeam;
              const teamName = teamObj.teamName;
              const rawLineup =
                side === 'home' ? sheet.homeLineup : sheet.awayLineup;
              const matchIsFem = (match.categoryName || '')
                .toLowerCase()
                .includes('fem');
              const matchIsMasc = (match.categoryName || '')
                .toLowerCase()
                .includes('masc');
              const isLiveMatch =
                match.status === 'live' || match.status === 'halftime';
              const lineup =
                (matchIsFem || matchIsMasc) &&
                !isLiveMatch &&
                !allowOtherGenderBySide[side]
                  ? rawLineup.filter((entry) => {
                      const ath = visibleAthletes.find(
                        (a) => a.id === entry.athleteId
                      );
                      const g = String(ath?.gender || '').toLowerCase();
                      if (!g || g === 'geral') return true;
                      return matchIsFem
                        ? g === 'feminino' || g === 'f'
                        : g === 'masculino' || g === 'm';
                    })
                  : rawLineup;
              const canAddOtherGender = lineup.length < rosterLimits.min;
              const allowOtherGender =
                Boolean(allowOtherGenderBySide[side]) && canAddOtherGender;
              const eligibleTeamAthletes = teamObj.teamId
                ? getAthletesByTeam(teamObj.teamId)
                : [];

              const getAthleteGender = (
                ath: any
              ): 'Masculino' | 'Feminino' | 'Desconhecido' => {
                const athEmail = String(ath.email || '')
                  .trim()
                  .toLowerCase();
                const reg = registrations.find(
                  (r) =>
                    r.linkedAthleteId === ath.id ||
                    r.id === ath.registrationId ||
                    (athEmail &&
                      String(r.athleteEmail || '')
                        .trim()
                        .toLowerCase() === athEmail)
                );
                const explicitGender = String(ath.gender || '').trim();
                const cat = (
                  explicitGender && explicitGender.toLowerCase() !== 'geral'
                    ? explicitGender
                    : String(reg?.categoryName || ath.categoryName || '')
                )
                  .trim()
                  .toLowerCase();
                if (cat === 'f' || cat.includes('fem')) return 'Feminino';
                if (cat === 'm' || cat.includes('masc')) return 'Masculino';
                const text = `${ath.id} ${ath.name}`.toLowerCase();
                if (text.includes('fem')) return 'Feminino';
                if (text.includes('masc')) return 'Masculino';
                return 'Desconhecido';
              };

              const availableToAdd = eligibleTeamAthletes.filter((a) => {
                if (lineup.some((l) => l.athleteId === a.id)) return false;
                const athGender = getAthleteGender(a);
                if (athGender === 'Desconhecido') return true;
                const sameGender = matchIsFem
                  ? athGender === 'Feminino'
                  : athGender === 'Masculino';
                if (!sameGender && !allowOtherGender) return false;
                return true;
              });

              const remainingCapacity = Math.max(
                0,
                rosterLimits.max - lineup.length
              );

              return (
                <div
                  key={side}
                  className="rounded-2xl bg-brand-surface-muted p-3.5 border border-brand-surface-border space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-display font-extrabold uppercase text-brand-blue">
                      {teamName}
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={!canAddOtherGender}
                        onClick={() =>
                          setAllowOtherGenderBySide((prev) => ({
                            ...prev,
                            [side]: !prev[side],
                          }))
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors touch-manipulation ${
                          !canAddOtherGender
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : allowOtherGender
                            ? 'bg-amber-500 text-white border-amber-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {allowOtherGender
                          ? 'Outro gênero liberado'
                          : '+ Liberar outro gênero'}
                      </button>
                    </div>
                  </div>

                  {/* BLOCO 1 (NO TOPO PARA ACESSO IMEDIATO NO CELULAR): ADICIONAR ATLETAS DISPONÍVEIS */}
                  {!sheet.isClosed && (
                    <div className="rounded-xl bg-white p-3 border border-brand-blue/20 space-y-2 shadow-sm">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] font-display font-extrabold uppercase tracking-wider text-brand-blue">
                          Toque para escalar ({availableToAdd.length} disponíveis):
                        </span>
                        {availableToAdd.length > 0 && remainingCapacity > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              addMultipleAthletesToMatchLineup(
                                match.id,
                                side,
                                availableToAdd
                                  .slice(0, remainingCapacity)
                                  .map((a) => a.id)
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-display font-extrabold transition-all touch-manipulation"
                          >
                            + Escalar Todos ({Math.min(availableToAdd.length, remainingCapacity)})
                          </button>
                        )}
                      </div>

                      {availableToAdd.length === 0 ? (
                        <p className="text-xs text-brand-text-muted py-1">
                          {eligibleTeamAthletes.length === 0
                            ? 'Nenhum atleta com inscrição e pagamento confirmados nesta equipe.'
                            : 'Todos os atletas aptos desta categoria já estão escalados (ou ative "+ Liberar outro gênero" se a equipe tiver menos do mínimo).'}
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {availableToAdd.map((ath) => (
                            <button
                              key={ath.id}
                              type="button"
                              disabled={remainingCapacity <= 0}
                              onClick={() =>
                                addAthleteToMatchLineup(match.id, side, ath.id)
                              }
                              className="w-full min-h-[42px] flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-brand-blue-light/50 active:scale-[0.99] border border-slate-200 hover:border-brand-blue text-left text-xs font-bold text-brand-text-primary transition-all touch-manipulation"
                            >
                              <span className="flex items-center gap-1.5 min-w-0">
                                {ath.jerseyNumber != null && (
                                  <span className="font-mono text-[11px] font-extrabold px-1.5 py-0.5 rounded bg-brand-blue/10 text-brand-blue shrink-0">
                                    #{ath.jerseyNumber}
                                  </span>
                                )}
                                <span className="truncate">{ath.name}</span>
                              </span>
                              <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-brand-blue text-white text-[10px] font-extrabold shrink-0">
                                <Plus className="w-3 h-3" />
                                Escalar
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* BLOCO 2: ATLETAS JÁ ESCALADOS NA PARTIDA */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-brand-text-secondary block">
                      Escalados nesta partida ({lineup.length}):
                    </span>

                    {lineup.length === 0 ? (
                      <div className="py-3 px-3 rounded-xl bg-white border border-brand-surface-border text-xs text-brand-text-secondary text-center">
                        Nenhum atleta escalado ainda. Toque nos nomes acima para escalar.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {lineup.map((ath) => (
                          <div
                            key={ath.athleteId}
                            className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-brand-surface-border text-xs"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              {ath.jerseyNumber != null && (
                                <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-brand-blue-light/60 text-brand-blue shrink-0">
                                  #{ath.jerseyNumber}
                                </span>
                              )}
                              <span className="font-semibold text-brand-text-primary truncate">
                                {ath.athleteName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                              <button
                                type="button"
                                disabled={sheet.isClosed}
                                onClick={() =>
                                  toggleLineupRole(
                                    match.id,
                                    side,
                                    ath.athleteId,
                                    'isStarter'
                                  )
                                }
                                className={`px-2.5 py-1.5 rounded-lg font-bold touch-manipulation ${
                                  ath.isStarter
                                    ? 'bg-brand-blue text-white'
                                    : 'bg-brand-surface-muted text-brand-text-secondary'
                                }`}
                              >
                                {ath.isStarter ? 'Titular' : 'Reserva'}
                              </button>
                              <button
                                type="button"
                                disabled={sheet.isClosed}
                                onClick={() =>
                                  toggleLineupRole(
                                    match.id,
                                    side,
                                    ath.athleteId,
                                    'isCaptain'
                                  )
                                }
                                className={`px-2.5 py-1.5 rounded-lg font-bold touch-manipulation ${
                                  ath.isCaptain
                                    ? 'bg-brand-yellow text-brand-blue-dark'
                                    : 'bg-brand-surface-muted text-brand-text-muted'
                                }`}
                              >
                                C
                              </button>
                              {engine.supportsGoalkeeper && (
                                <button
                                  type="button"
                                  disabled={sheet.isClosed}
                                  onClick={() =>
                                    toggleLineupRole(
                                      match.id,
                                      side,
                                      ath.athleteId,
                                      'isGoalkeeper'
                                    )
                                  }
                                  className={`px-2.5 py-1.5 rounded-lg font-bold touch-manipulation ${
                                    ath.isGoalkeeper
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-brand-surface-muted text-brand-text-muted'
                                  }`}
                                >
                                  GK
                                </button>
                              )}
                              {engine.supportsPairs && (
                                <button
                                  type="button"
                                  disabled={sheet.isClosed}
                                  onClick={() =>
                                    toggleLineupRole(
                                      match.id,
                                      side,
                                      ath.athleteId,
                                      'isPairMember'
                                    )
                                  }
                                  className={`px-2.5 py-1.5 rounded-lg font-bold touch-manipulation ${
                                    ath.isPairMember
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-brand-surface-muted text-brand-text-muted'
                                  }`}
                                >
                                  Dupla
                                </button>
                              )}
                              {!sheet.isClosed && (
                                <button
                                  type="button"
                                  title="Remover atleta dos inscritos desta partida"
                                  onClick={() =>
                                    removeAthleteFromMatchLineup(
                                      match.id,
                                      side,
                                      ath.athleteId
                                    )
                                  }
                                  className="p-1.5 rounded-lg text-brand-text-muted hover:text-red-600 hover:bg-red-50 transition-colors touch-manipulation"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </Modal>

      {/* =====================================================================
          MODAL 4B: CONFIGURAR ROTAÇÃO INICIAL DE VÔLEI (POSIÇÕES I A VI / P1–P6 & 1º SAQUE)
         ===================================================================== */}
      {match.modalityId === 'volei' && (
        <Modal
          isOpen={isVolleyballRotationModalOpen}
          onClose={() => {
            setVbSelectedSlot(null);
            setIsVolleyballRotationModalOpen(false);
          }}
          size="xl"
          title={`Rotação Inicial — ${sheet.timer.periodLabel || `Set ${sheet.timer.currentPeriod || 1}`}`}
          description="Defina quem tem o 1º saque do set e a posição inicial (P1 a P6) de cada equipe. Toque em duas posições na quadra para trocá-las, ou selecione uma posição e toque em um atleta abaixo."
          footer={
            <div className="flex items-center justify-between gap-2 w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setVbSelectedSlot(null);
                  setIsVolleyballRotationModalOpen(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                onClick={handleSaveVolleyballRotationModal}
              >
                Salvar Rotação Inicial do Set
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Escolha da Equipe com o 1º Saque do Set */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 space-y-2">
              <span className="text-xs font-display font-extrabold uppercase text-brand-blue block">
                1. Qual equipe inicia sacando neste Set (0 × 0)?
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(['home', 'away'] as const).map((side) => {
                  const tName =
                    side === 'home'
                      ? match.homeTeam.teamName
                      : match.awayTeam.teamName;
                  const active = vbDraftFirstServer === side;
                  return (
                    <button
                      key={side}
                      type="button"
                      onClick={() => setVbDraftFirstServer(side)}
                      className={`px-3 py-2.5 rounded-xl border-2 text-xs font-display font-extrabold transition-all touch-manipulation ${
                        active
                          ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-brand-blue'
                      }`}
                    >
                      {active ? '🏐 1º Saque: ' : ''}
                      {tName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formação P1 a P6 das duas equipes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['home', 'away'] as const).map((side) => {
                const tName =
                  side === 'home'
                    ? match.homeTeam.teamName
                    : match.awayTeam.teamName;
                const lineup =
                  side === 'home' ? sheet.homeLineup : sheet.awayLineup;
                const draftOrder =
                  side === 'home' ? vbDraftHomeOrder : vbDraftAwayOrder;
                const setDraftOrder =
                  side === 'home' ? setVbDraftHomeOrder : setVbDraftAwayOrder;

                const frontSlots = [
                  { idx: 3, label: 'IV (P4)', sub: 'Rede Esq.' },
                  { idx: 2, label: 'III (P3)', sub: 'Rede Meio' },
                  { idx: 1, label: 'II (P2)', sub: 'Rede Dir.' },
                ];
                const backSlots = [
                  { idx: 4, label: 'V (P5)', sub: 'Defesa Esq.' },
                  { idx: 5, label: 'VI (P6)', sub: 'Defesa Centro' },
                  { idx: 0, label: 'I (P1) 🏐', sub: '1º Sacador' },
                ];

                return (
                  <div
                    key={side}
                    className="rounded-2xl bg-slate-50 border border-slate-200 p-3 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-display font-extrabold uppercase text-brand-blue truncate">
                        {tName}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDraftOrder((prev) =>
                            rotateVolleyballPositionsClockwise(prev)
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-brand-blue text-[11px] font-bold text-slate-700 touch-manipulation"
                      >
                        ↻ Girar Quadra
                      </button>
                    </div>

                    <div className="rounded-lg bg-slate-800 text-white text-[9px] font-mono font-bold uppercase tracking-widest text-center py-0.5">
                      ═══ REDE (ATAQUE: P4 - P3 - P2) ═══
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {frontSlots.map((slot) => {
                        const athId = draftOrder[slot.idx];
                        const player = lineup.find((a) => a.athleteId === athId);
                        const isSelected =
                          vbSelectedSlot?.side === side &&
                          vbSelectedSlot?.slotIdx === slot.idx;
                        return (
                          <button
                            key={slot.idx}
                            type="button"
                            onClick={() => handleTapDraftCourtSlot(side, slot.idx)}
                            className={`rounded-xl border-2 p-2 text-center transition-all touch-manipulation ${
                              isSelected
                                ? 'bg-brand-yellow-light border-brand-blue ring-2 ring-brand-blue'
                                : 'bg-white border-slate-200 hover:border-brand-blue/50'
                            }`}
                          >
                            <span className="block text-[9px] font-mono font-extrabold text-slate-500">
                              {slot.label}
                            </span>
                            {player ? (
                              <>
                                <span className="block text-xs font-mono font-black text-[#0B218A] mt-0.5">
                                  {player.jerseyNumber != null
                                    ? `#${player.jerseyNumber}`
                                    : '•'}
                                </span>
                                <span className="block text-[11px] font-bold text-slate-800 truncate">
                                  {player.athleteName.split(' ')[0]}
                                </span>
                              </>
                            ) : (
                              <span className="block text-[10px] text-slate-400 py-1">
                                Selecionar
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-dashed border-slate-300">
                      {backSlots.map((slot) => {
                        const athId = draftOrder[slot.idx];
                        const player = lineup.find((a) => a.athleteId === athId);
                        const isSelected =
                          vbSelectedSlot?.side === side &&
                          vbSelectedSlot?.slotIdx === slot.idx;
                        return (
                          <button
                            key={slot.idx}
                            type="button"
                            onClick={() => handleTapDraftCourtSlot(side, slot.idx)}
                            className={`rounded-xl border-2 p-2 text-center transition-all touch-manipulation ${
                              isSelected
                                ? 'bg-brand-yellow-light border-brand-blue ring-2 ring-brand-blue'
                                : slot.idx === 0
                                ? 'bg-emerald-50 border-emerald-300'
                                : 'bg-white border-slate-200 hover:border-brand-blue/50'
                            }`}
                          >
                            <span className="block text-[9px] font-mono font-extrabold text-slate-600">
                              {slot.label}
                            </span>
                            {player ? (
                              <>
                                <span className="block text-xs font-mono font-black text-[#0B218A] mt-0.5">
                                  {player.jerseyNumber != null
                                    ? `#${player.jerseyNumber}`
                                    : '•'}
                                </span>
                                <span className="block text-[11px] font-bold text-slate-800 truncate">
                                  {player.athleteName.split(' ')[0]}
                                </span>
                              </>
                            ) : (
                              <span className="block text-[10px] text-slate-400 py-1">
                                Selecionar
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Lista rápida de atletas escalados da equipe para alocar na posição selecionada */}
                    <div className="pt-1.5 border-t border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        {vbSelectedSlot?.side === side
                          ? `Escolha quem entra na Posição P${vbSelectedSlot.slotIdx + 1}:`
                          : 'Atletas escalados (toque numa posição acima para trocar):'}
                      </span>
                      {lineup.length === 0 ? (
                        <p className="text-[11px] text-amber-700">
                          Nenhum atleta escalado nesta equipe. Abra "Escalação" primeiro.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {lineup.map((ath) => {
                            const inCourtIdx = draftOrder.indexOf(ath.athleteId);
                            return (
                              <button
                                key={ath.athleteId}
                                type="button"
                                onClick={() =>
                                  handleAssignPlayerToDraftSlot(side, ath.athleteId)
                                }
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors touch-manipulation ${
                                  inCourtIdx >= 0
                                    ? 'bg-[#0B218A] text-white border-[#0B218A]'
                                    : 'bg-white text-slate-700 border-slate-300 hover:border-brand-blue'
                                }`}
                              >
                                {inCourtIdx >= 0 ? `P${inCourtIdx + 1}: ` : ''}
                                {ath.jerseyNumber != null
                                  ? `#${ath.jerseyNumber} `
                                  : ''}
                                {ath.athleteName.split(' ')[0]}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}

      {/* =====================================================================
          MODAL 5: CONFIRMAR REINÍCIO DO CRONÔMETRO (Item 5)
         ===================================================================== */}
      <Modal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        title="Reiniciar Cronômetro do Período?"
        description="Esta ação restaura o tempo do período atual para o valor inicial configurado."
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsResetConfirmOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              resetPeriodTimer(match.id);
              setIsResetConfirmOpen(false);
            }}
          >
            Confirmar Reinício
          </Button>
        </div>
      </Modal>

      {/* =====================================================================
          MODAL 5B: DESATIVAR MODO AO VIVO / VOLTAR PARA AGENDADO
         ===================================================================== */}
      <Modal
        isOpen={isCancelLiveModalOpen}
        onClose={() => setIsCancelLiveModalOpen(false)}
        title="Desativar Ao Vivo / Voltar p/ Agendado?"
        description="Use esta opção se a partida oficial foi iniciada por engano. A aba 'Ao Vivo' será desativada imediatamente para o público e o placar/eventos serão zerados."
      >
        <div className="space-y-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 leading-relaxed">
            <strong>{match.homeTeam.teamName} × {match.awayTeam.teamName}</strong> voltará ao status{' '}
            <strong>Agendado</strong>, zerando cronômetro, sets e lances registrados.
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <Button
              variant="primary"
              size="md"
              fullWidth
              leftIcon={<RotateCcw className="w-4 h-4" />}
              onClick={() => {
                resetMatchToScheduled(match.id, { keepLineups: true });
                setIsCancelLiveModalOpen(false);
              }}
            >
              Desativar Ao Vivo (Manter Escalação)
            </Button>

            <Button
              variant="danger"
              size="md"
              fullWidth
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={() => {
                resetMatchToScheduled(match.id, { keepLineups: false });
                setIsCancelLiveModalOpen(false);
              }}
            >
              Zerar Tudo (Limpar Escalação Também)
            </Button>

            <Button
              variant="ghost"
              size="sm"
              fullWidth
              onClick={() => setIsCancelLiveModalOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      {/* =====================================================================
          MODAL 6: CONFIRMAR ENCERRAMENTO DA PARTIDA (Item 26)
         ===================================================================== */}
      <Modal
        isOpen={isFinalizeModalOpen}
        onClose={() => setIsFinalizeModalOpen(false)}
        title="CONFIRMAR ENCERRAMENTO"
        description="Confira o resumo antes de consolidar a partida como FINALIZADA e gerar a Súmula Oficial."
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-brand-surface-muted border border-brand-surface-border space-y-2 text-xs">
            <div className="flex items-center justify-between font-display font-extrabold text-sm text-brand-blue">
              <span>{match.homeTeam.teamName}</span>
              <span>
                {match.homeTeam.score ?? 0} × {match.awayTeam.score ?? 0}
              </span>
              <span>{match.awayTeam.teamName}</span>
            </div>
            <div className="pt-2 border-t border-brand-surface-border space-y-1 text-brand-text-secondary">
              <p>
                <strong>Períodos/Sets registrados:</strong>{' '}
                {sheet.periodScores
                  .map((p) => `${p.label}: ${p.homeScore}×${p.awayScore}`)
                  .join(' | ')}
              </p>
              <p>
                <strong>Total de Eventos na Súmula:</strong> {activeEvents.length}
              </p>
              <p>
                <strong>Cartões registrados:</strong>{' '}
                {
                  activeEvents.filter(
                    (e) =>
                      e.type === 'yellow_card' ||
                      e.type === 'red_card' ||
                      e.type === 'expulsion'
                  ).length
                }
              </p>
            </div>
          </div>

          <Input
            label="Árbitro Principal (opcional)"
            placeholder="Identificação da arbitragem"
            value={sheet.refereeName || ''}
            onChange={(e) =>
              updateRefereeMetadata(match.id, { refereeName: e.target.value })
            }
          />

          <Input
            label="Observações da Súmula (opcional)"
            placeholder="Relato disciplinar ou observações de mesa"
            value={sheet.refereeNotes || ''}
            onChange={(e) =>
              updateRefereeMetadata(match.id, { refereeNotes: e.target.value })
            }
          />

          {match.phase !== 'group_stage' &&
            engine.scoringModel !== 'swimming_heats' &&
            (match.homeTeam.score ?? 0) === (match.awayTeam.score ?? 0) && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium leading-relaxed">
                <strong>Atenção (Fase Eliminatória / Mata-Mata):</strong> O placar está empatado ({match.homeTeam.score ?? 0}×{match.awayTeam.score ?? 0}). Em jogos eliminatórios, registre a Prorrogação ou Disputa de Pênaltis/Tie-break antes de encerrar para definir o classificado no chaveamento.
              </div>
            )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsFinalizeModalOpen(false)}
            >
              Voltar
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                const isTiedKnockout =
                  match.phase !== 'group_stage' &&
                  engine.scoringModel !== 'swimming_heats' &&
                  (match.homeTeam.score ?? 0) === (match.awayTeam.score ?? 0);

                if (
                  isTiedKnockout &&
                  !window.confirm(
                    'A partida é de mata-mata e está empatada. Deseja realmente encerrar sem vencedor definido?'
                  )
                ) {
                  return;
                }
                finalizeMatch(match.id);
                setIsFinalizeModalOpen(false);
                navigate(`/sumula/${match.id}/documento`);
              }}
            >
              Encerrar Partida
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL DE CONTROLE DE MESA E ARBITRAGEM OFICIAL */}
      <Modal
        isOpen={isOfficialsModalOpen}
        onClose={() => setIsOfficialsModalOpen(false)}
        title="Mesa de Controle & Arbitragem Oficial"
      >
        <div className="space-y-4">
          <p className="text-xs text-brand-text-secondary leading-relaxed">
            Identifique os árbitros e mesários oficiais da partida. Esses dados serão consolidados e impressos automaticamente na súmula oficial da modalidade.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Árbitro Principal / 1º Árbitro"
              placeholder="Ex: Carlos Roberto (Federação)"
              value={officialReferee1}
              onChange={(e) => setOfficialReferee1(e.target.value)}
            />
            <Input
              label="Árbitro Auxiliar / 2º Árbitro / Fiscal"
              placeholder="Ex: Marcos Vinicius (Federação)"
              value={officialReferee2}
              onChange={(e) => setOfficialReferee2(e.target.value)}
            />
            <Input
              label="Anotador / Apontador / Secretário"
              placeholder="Ex: Ana Clara Lima"
              value={officialTableOfficial}
              onChange={(e) => setOfficialTableOfficial(e.target.value)}
            />
            <Input
              label={match.modalityId === 'basquete' ? 'Cronometrista' : 'Cronometrista / Mesa'}
              placeholder="Ex: Leonardo Ramos"
              value={officialTimekeeper}
              onChange={(e) => setOfficialTimekeeper(e.target.value)}
            />
          </div>

          {match.modalityId === 'basquete' && (
            <Input
              label="Operador de 24 Segundos"
              placeholder="Ex: Thiago Pires"
              value={official24sOperator}
              onChange={(e) => setOfficial24sOperator(e.target.value)}
            />
          )}

          <Input
            label="Relatório Disciplinar e Observações da Súmula"
            placeholder="Relato de ocorrências, exclusões disciplinares ou observações técnicas"
            value={officialNotes}
            onChange={(e) => setOfficialNotes(e.target.value)}
          />

          <div className="flex items-center justify-between pt-3 border-t border-brand-surface-border">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                handleSaveOfficials();
                navigate(`/sumula/${match.id}/documento`);
              }}
            >
              Ver Súmula em PDF
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOfficialsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveOfficials}
              >
                Salvar Mesa &amp; Árbitros
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
