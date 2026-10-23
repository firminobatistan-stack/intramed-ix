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
} from 'lucide-react';
import { useCompetitionStore } from '../context/CompetitionStoreContext';
import { matchSound } from '../utils/soundEffects';
import {
  MODALITY_RULE_ENGINE,
  SWIMMING_STROKES,
  formatSecondsToClock,
} from '../data/sportRulesConfig';
import {
  MatchEvent,
  MatchEventType,
  SwimmingStrokeType,
} from '../types/domain';
import { TeamCrest } from '../components/sports/TeamCrest';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { TestModeBanner } from '../components/layout/TestModeBanner';

interface QuickActionDef {
  type: MatchEventType;
  label: string;
  shortBadge: string;
  pointsDelta?: number;
  requiresAthlete: boolean;
  requiresSecondaryAthlete?: boolean;
  accentColor: 'blue' | 'yellow' | 'red' | 'neutral';
}

export const LiveMatchSheetOperatorPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const {
    isTestMode,
    setTestMode,
    getMatchById,
    getSheetByMatchId,
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
    finishCurrentSet,
    recordTableTennisPoint,
    finishTableTennisSet,
    selectActiveSubMatch,
    setSwimmingStrokeAndDistance,
    registerSwimmingLaneTime,
    updateRefereeMetadata,
    finalizeMatch,
    reopenMatchForCorrection,
  } = useCompetitionStore();

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
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [possessionSide, setPossessionSide] = useState<'home' | 'away'>('home');

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
  const categoryOptions = Object.keys(engine.defaultCategoryRules);
  const currentCatRule =
    engine.defaultCategoryRules[match.categoryName || ''] ||
    Object.values(engine.defaultCategoryRules)[0];

  // Define os botões de ação rápida de acordo com a modalidade (Item 7 e 15-22)
  const getQuickActionsForModality = (): QuickActionDef[] => {
    switch (match.modalityId) {
      case 'futsal':
        return [
          {
            type: 'goal',
            label: 'GOL',
            shortBadge: '⚽',
            pointsDelta: 1,
            requiresAthlete: true,
            requiresSecondaryAthlete: true, // Assistência opcional
            accentColor: 'blue',
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
            type: 'foul',
            label: 'FALTA',
            shortBadge: '⚠️',
            requiresAthlete: true,
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
            label: 'TEMPO / PAUSA',
            shortBadge: '⏱️',
            requiresAthlete: false,
            accentColor: 'neutral',
          },
          {
            type: 'penalty_goal',
            label: 'GOL DE PÊNALTI',
            shortBadge: '🥅',
            pointsDelta: 1,
            requiresAthlete: true,
            accentColor: 'blue',
          },
        ];

      case 'handebol':
        return [
          {
            type: 'goal',
            label: 'GOL',
            shortBadge: '🤾',
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
            type: 'seven_meters',
            label: 'GOL 7 METROS',
            shortBadge: '7m',
            pointsDelta: 1,
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
            label: 'TIMEOUT',
            shortBadge: '⏸️',
            requiresAthlete: false,
            accentColor: 'neutral',
          },
        ];

      case 'basquete':
        return [
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

      case 'volei':
      case 'volei-de-praia':
        return [
          {
            type: 'set_point',
            label: '+1 PONTO (CONFIRMADO)',
            shortBadge: '🏐 +1',
            pointsDelta: 1,
            requiresAthlete: false,
            accentColor: 'blue',
          },
          {
            type: 'timeout',
            label: 'TIMEOUT',
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
          ...(match.modalityId === 'volei'
            ? [
                {
                  type: 'substitution' as const,
                  label: 'SUBSTITUIÇÃO',
                  shortBadge: '🔄',
                  requiresAthlete: true,
                  requiresSecondaryAthlete: true,
                  accentColor: 'neutral' as const,
                },
              ]
            : []),
        ];

      default:
        return [
          {
            type: 'table_note',
            label: 'REGISTRAR OCORRÊNCIA',
            shortBadge: '📝',
            requiresAthlete: false,
            accentColor: 'neutral',
          },
        ];
    }
  };

  const quickActions = getQuickActionsForModality();

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

    const finalType: MatchEventType =
      wizardAction.type === 'yellow_card' ? selectedCardSubType : wizardAction.type;

    const finalLabel =
      wizardAction.type === 'yellow_card'
        ? selectedCardSubType === 'yellow_card'
          ? 'Cartão Amarelo'
          : 'Cartão Vermelho'
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

    if (soundEnabled) {
      matchSound.playConfirmBeep();
    }
    setPossessionSide(selectedSide);
    setWizardAction(null);
  };

  // Ação direta com proteção contra duplo toque para +1 Ponto em Vôlei / Vôlei de Praia
  const handleDirectSetPoint = (side: 'home' | 'away') => {
    if (sheet.isClosed || !matchId) return;
    if (!canExecuteRapidAction(600)) return; // Proteção anti-duplo-toque (Item 31)

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

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-brand-text-primary flex flex-col select-none">
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

              {/* Seletor rápido de Categoria (ex: Masculino 2x20 vs Feminino 2x15) */}
              {categoryOptions.length > 1 &&
                sheet.timer.lifecycle === 'not_started' &&
                !sheet.isClosed && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-white/60">Regra de tempo:</span>
                    {categoryOptions.map((catKey) => (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => configureMatchCategoryRule(match.id, catKey)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                          match.categoryName === catKey
                            ? 'bg-brand-yellow text-brand-blue-dark'
                            : 'bg-white/10 text-white/80 hover:bg-white/20'
                        }`}
                      >
                        {catKey}
                      </button>
                    ))}
                  </div>
                )}
            </div>
          </div>

          {/* Direita: Status + Ações de Súmula (Escalação, Placar ao Vivo, Encerrar) */}
          <div className="flex items-center gap-2 flex-wrap">
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
                matchSound.enabled = true;
                matchSound.playBuzzer();
              }}
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

            {!sheet.isClosed ? (
              <button
                type="button"
                onClick={() => setIsFinalizeModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-yellow text-brand-blue-dark hover:bg-brand-yellow-dark text-xs font-display font-extrabold transition-colors min-h-[38px]"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Encerrar Partida</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => reopenMatchForCorrection(match.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold text-white transition-colors"
              >
                <span>Reabrir Súmula</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL DO OPERADOR */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 space-y-5">
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
                        onClick={() => startOrResumeTimer(match.id)}
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
                          onClick={() => startOrResumeTimer(match.id)}
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
                </div>
              )}
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
                    return (
                      <button
                        key={ath.athleteId}
                        type="button"
                        onClick={() => setSelectedAthleteId(ath.athleteId)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-brand-blue text-white border-brand-blue font-bold'
                            : 'bg-brand-surface-muted/70 border-brand-surface-border text-brand-text-primary hover:border-brand-blue/40'
                        }`}
                      >
                        <span className="text-xs truncate">{ath.athleteName}</span>
                        {ath.isStarter && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10">
                            Titular
                          </span>
                        )}
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
          MODAL 4: ESCALAÇÃO DA PARTIDA (Item 23: Titulares, Reservas, Capitão, Goleiro, Dupla)
         ===================================================================== */}
      <Modal
        isOpen={isLineupModalOpen}
        onClose={() => setIsLineupModalOpen(false)}
        title="Escalação Oficial da Partida"
        description={
          isTestMode
            ? 'Configure titulares, reservas, capitão (C) e goleiro (GK) para as equipes de teste.'
            : 'Os atletas aparecerão aqui quando forem cadastrados.'
        }
      >
        {!isTestMode ? (
          <div className="py-6 text-center text-sm text-brand-text-secondary">
            Nenhum atleta cadastrado na base oficial.
          </div>
        ) : (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {(['home', 'away'] as const).map((side) => {
              const teamName =
                side === 'home'
                  ? match.homeTeam.teamName
                  : match.awayTeam.teamName;
              const lineup =
                side === 'home' ? sheet.homeLineup : sheet.awayLineup;

              return (
                <div
                  key={side}
                  className="rounded-2xl bg-brand-surface-muted p-3.5 border border-brand-surface-border space-y-2.5"
                >
                  <h4 className="text-xs font-display font-extrabold uppercase text-brand-blue">
                    {teamName}
                  </h4>
                  <div className="space-y-1.5">
                    {lineup.map((ath) => (
                      <div
                        key={ath.athleteId}
                        className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-brand-surface-border text-xs"
                      >
                        <span className="font-semibold text-brand-text-primary">
                          {ath.athleteName}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              toggleLineupRole(
                                match.id,
                                side,
                                ath.athleteId,
                                'isStarter'
                              )
                            }
                            className={`px-2 py-1 rounded font-bold ${
                              ath.isStarter
                                ? 'bg-brand-blue text-white'
                                : 'bg-brand-surface-muted text-brand-text-secondary'
                            }`}
                          >
                            {ath.isStarter ? 'Titular' : 'Reserva'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              toggleLineupRole(
                                match.id,
                                side,
                                ath.athleteId,
                                'isCaptain'
                              )
                            }
                            className={`px-2 py-1 rounded font-bold ${
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
                              onClick={() =>
                                toggleLineupRole(
                                  match.id,
                                  side,
                                  ath.athleteId,
                                  'isGoalkeeper'
                                )
                              }
                              className={`px-2 py-1 rounded font-bold ${
                                ath.isGoalkeeper
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-brand-surface-muted text-brand-text-muted'
                              }`}
                            >
                              GK
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

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
    </div>
  );
};
