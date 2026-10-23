import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Tv,
  FileText,
  FlaskConical,
  ShieldCheck,
  Wifi,
  WifiOff,
  Settings2,
  History,
  Calendar,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Plus,
  Shield,
  UserPlus,
  ExternalLink,
} from 'lucide-react';
import { useCompetitionStore } from '../context/CompetitionStoreContext';
import { OFFICIAL_MODALITIES } from '../data/officialData';
import { MODALITY_RULE_ENGINE, formatSecondsToClock } from '../data/sportRulesConfig';
import { ModalitySlug, TournamentPhaseType } from '../types/domain';
import { SportIcon } from '../components/sports/SportIcon';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Tabs, TabItem } from '../components/ui/Tabs';

type AdminTab = 'partidas' | 'cadastros' | 'regras' | 'auditoria';

const ADMIN_TABS: TabItem[] = [
  {
    id: 'partidas',
    label: 'Jogos & Súmulas',
    icon: <Calendar className="w-4 h-4" />,
  },
  {
    id: 'cadastros',
    label: 'Cadastros (Períodos, Atletas & Jogos)',
    icon: <Users className="w-4 h-4" />,
  },
  {
    id: 'regras',
    label: 'Motor de Modalidades',
    icon: <Settings2 className="w-4 h-4" />,
  },
  {
    id: 'auditoria',
    label: 'Auditoria & Sincronização',
    icon: <History className="w-4 h-4" />,
  },
];

/**
 * Painel Administrativo, Cadastro Unificado e Central de Operação de Súmulas — INTRAMED IX
 * - Permite acessar Jogos -> Selecionar Partida -> Abrir Súmula, abrir o Placar ao Vivo;
 * - Cadastro Unificado: Cadastrar Período/Equipe, Cadastrar Atleta (já alimenta o Elenco e a Súmula automaticamente),
 *   e Agendar/Criar Partida Oficial sem duplicar cadastros.
 */
export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    isTestMode,
    setTestMode,
    resetTestEnvironment,
    isOnline,
    pendingSyncCount,
    visibleMatches,
    visibleTeams,
    visibleAthletes,
    getSheetByMatchId,
    getTeamById,
    registerTeam,
    registerAthlete,
    createOfficialMatch,
  } = useCompetitionStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('partidas');
  const [modalityFilter, setModalityFilter] = useState<string>('todas');
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  // Estado do formulário 1: Cadastrar Equipe / Período
  const [teamName, setTeamName] = useState('');
  const [teamShort, setTeamShort] = useState('');

  // Estado do formulário 2: Cadastrar Atleta Unificado
  const [athName, setAthName] = useState('');
  const [athTeamId, setAthTeamId] = useState('');
  const [athNumber, setAthNumber] = useState('');
  const [athPosition, setAthPosition] = useState('');
  const [athModalities, setAthModalities] = useState<ModalitySlug[]>(['futsal']);

  // Estado do formulário 3: Criar Partida Oficial
  const [matchModality, setMatchModality] = useState<ModalitySlug>('futsal');
  const [matchHomeTeamId, setMatchHomeTeamId] = useState('');
  const [matchAwayTeamId, setMatchAwayTeamId] = useState('');
  const [matchPhase, setMatchPhase] = useState<TournamentPhaseType>('group_stage');
  const [matchDate, setMatchDate] = useState('Hoje');
  const [matchTime, setMatchTime] = useState('19:00');
  const [matchVenue, setMatchVenue] = useState('Ginásio Oficial • Medicina UEMA');

  const filteredMatches = visibleMatches.filter((m) =>
    modalityFilter === 'todas' ? true : m.modalityId === modalityFilter
  );

  // Coleta todos os registros de auditoria das partidas visíveis
  const allAuditLogs = visibleMatches.flatMap((m) => {
    const s = getSheetByMatchId(m.id);
    if (!s) return [];
    return s.events.flatMap((ev) =>
      ev.auditHistory.map((aud) => ({
        ...aud,
        matchId: m.id,
        modalityName: m.modalityName,
        eventLabel: ev.typeLabel,
      }))
    );
  });

  const liveCount = visibleMatches.filter((m) => m.status === 'live').length;
  const finishedCount = visibleMatches.filter((m) => m.status === 'finished').length;

  const showNotice = (type: 'ok' | 'err', text: string) => {
    setFeedbackBanner({ type, text });
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      showNotice('err', 'Informe o nome do Período/Equipe.');
      return;
    }
    const created = registerTeam({
      name: teamName,
      shortName: teamShort || undefined,
      modalityIds: OFFICIAL_MODALITIES.map((m) => m.id),
    });
    setTeamName('');
    setTeamShort('');
    if (!athTeamId) setAthTeamId(created.id);
    showNotice(
      'ok',
      `Equipe "${created.name}" cadastrada e pronta para receber atletas e jogos!`
    );
  };

  const toggleAthModality = (modId: ModalitySlug) => {
    setAthModalities((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const handleCreateAthlete = (e: React.FormEvent) => {
    e.preventDefault();
    const targetTeam = athTeamId || visibleTeams[0]?.id || '';
    const res = registerAthlete({
      name: athName,
      teamId: targetTeam,
      jerseyNumber: athNumber ? Number(athNumber) : null,
      position: athPosition || 'Atleta Inscrito',
      modalityIds:
        athModalities.length > 0
          ? athModalities
          : OFFICIAL_MODALITIES.map((m) => m.id),
    });

    if (!res.ok) {
      showNotice('err', res.error || 'Erro ao cadastrar atleta.');
      return;
    }

    setAthName('');
    setAthNumber('');
    setAthPosition('');
    showNotice(
      'ok',
      `Atleta "${res.athlete?.name}" inscrito e sincronizado automaticamente com a equipe e súmulas!`
    );
  };

  const handleCreateMatch = (e: React.FormEvent) => {
    e.preventDefault();
    const homeId = matchHomeTeamId || visibleTeams[0]?.id || '';
    const awayId = matchAwayTeamId || visibleTeams[1]?.id || '';
    if (!homeId || !awayId || homeId === awayId) {
      showNotice('err', 'Selecione duas equipes distintas para o confronto.');
      return;
    }

    const phaseLabelMap: Record<TournamentPhaseType, string> = {
      group_stage: 'Fase Classificatória',
      quarterfinals: 'Quartas de Final',
      semifinals: 'Semifinal',
      third_place: 'Disputa de 3º Lugar',
      final: 'Grande Final',
    };

    const created = createOfficialMatch({
      modalityId: matchModality,
      categoryName: 'Geral',
      phase: matchPhase,
      phaseLabel: phaseLabelMap[matchPhase],
      homeTeamId: homeId,
      awayTeamId: awayId,
      scheduledDate: matchDate,
      scheduledTime: matchTime,
      venue: matchVenue,
    });

    if (created) {
      showNotice(
        'ok',
        `Partida de ${created.modalityName} criada com súmula e elencos prontos!`
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Central Administrativa / Operador */}
      <div className="rounded-3xl bg-brand-blue text-white p-6 sm:p-7 shadow-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-brand-yellow" aria-hidden="true" />
              <span>Central de Arbitragem, Mesa &amp; Administração</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight">
              Controle de Partidas, Súmula &amp; Inscrições
            </h2>
            <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
              Cadastre períodos e atletas uma única vez, opere a súmula eletrônica em tempo real e acompanhe a atualização automática de perfis, equipes e rankings.
            </p>
          </div>

          {/* Seletor claro: DADOS OFICIAIS vs MODO DE TESTE */}
          <div className="bg-brand-blue-dark/70 border border-white/15 rounded-2xl p-4 flex flex-col gap-3 min-w-[280px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-white/80">
                Ambiente de Dados
              </span>
              {isOnline ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Sincronizado</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-yellow">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Offline Ready ({pendingSyncCount})</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTestMode(false)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  !isTestMode
                    ? 'bg-white text-brand-blue shadow-sm'
                    : 'bg-white/10 text-white/75 hover:bg-white/15'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Dados Oficiais</span>
              </button>

              <button
                type="button"
                onClick={() => setTestMode(true)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isTestMode
                    ? 'bg-brand-yellow text-brand-blue-dark shadow-sm'
                    : 'bg-white/10 text-white/75 hover:bg-white/15'
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                <span>Modo de Teste</span>
              </button>
            </div>
          </div>
        </div>

        {/* Resumo rápido de contadores */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/15">
          <div className="bg-white/10 rounded-xl px-4 py-3">
            <span className="text-[11px] uppercase tracking-wider text-white/70 font-semibold block">
              Períodos &amp; Atletas
            </span>
            <span className="text-sm sm:text-base font-display font-extrabold text-brand-yellow mt-0.5 block">
              {visibleTeams.length} eq. • {visibleAthletes.length} atl.
            </span>
          </div>

          <div className="bg-white/10 rounded-xl px-4 py-3">
            <span className="text-[11px] uppercase tracking-wider text-white/70 font-semibold block">
              Partidas na Fila
            </span>
            <span className="text-sm sm:text-base font-display font-extrabold text-white mt-0.5 block">
              {visibleMatches.length}
            </span>
          </div>

          <div className="bg-white/10 rounded-xl px-4 py-3">
            <span className="text-[11px] uppercase tracking-wider text-white/70 font-semibold block">
              Em Andamento
            </span>
            <span className="text-sm sm:text-base font-display font-extrabold text-white mt-0.5 block">
              {liveCount}
            </span>
          </div>

          <div className="bg-white/10 rounded-xl px-4 py-3">
            <span className="text-[11px] uppercase tracking-wider text-white/70 font-semibold block">
              Finalizadas / Súmulas
            </span>
            <span className="text-sm sm:text-base font-display font-extrabold text-white mt-0.5 block">
              {finishedCount}
            </span>
          </div>
        </div>
      </div>

      {feedbackBanner && (
        <div
          className={`rounded-2xl px-4 py-3 border text-xs sm:text-sm font-display font-bold flex items-center justify-between ${
            feedbackBanner.type === 'ok'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <span>{feedbackBanner.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-xs underline ml-3"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Navegação de Abas do Painel */}
      <div className="bg-white rounded-2xl border border-brand-surface-border px-3 sm:px-5 shadow-card">
        <Tabs
          tabs={ADMIN_TABS}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as AdminTab)}
          variant="underline"
        />
      </div>

      {/* ABA 1: JOGOS -> SELECIONAR PARTIDA -> ABRIR SÚMULA */}
      {activeTab === 'partidas' && (
        <div className="space-y-5">
          {visibleMatches.length === 0 ? (
            <div className="space-y-4">
              <EmptyState
                variant="matches"
                title="Base Oficial sem Partidas Cadastradas"
                message="Você pode cadastrar as equipes (Períodos), atletas e criar partidas oficiais na aba 'Cadastros', ou ativar o MODO DE TESTE para operar imediatamente as 10 modalidades."
                action={
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button
                      variant="primary"
                      size="md"
                      leftIcon={<Plus className="w-4 h-4" />}
                      onClick={() => setActiveTab('cadastros')}
                    >
                      Cadastrar Períodos, Atletas &amp; Jogos
                    </Button>
                    <Button
                      variant="accent"
                      size="md"
                      leftIcon={<FlaskConical className="w-4 h-4" />}
                      onClick={() => setTestMode(true)}
                    >
                      Ativar Modo de Teste
                    </Button>
                  </div>
                }
              />
            </div>
          ) : (
            <>
              {/* Barra de filtro por modalidade + botão de resetar bancada */}
              <div className="bg-white rounded-2xl border border-brand-surface-border p-4 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <label
                    htmlFor="admin-mod-filter"
                    className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary"
                  >
                    Filtrar Modalidade:
                  </label>
                  <select
                    id="admin-mod-filter"
                    value={modalityFilter}
                    onChange={(e) => setModalityFilter(e.target.value)}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-brand-surface-muted border border-brand-surface-border text-sm font-medium text-brand-text-primary focus:outline-none focus:border-brand-blue"
                  >
                    <option value="todas">Todas as 10 modalidades oficiais</option>
                    {OFFICIAL_MODALITIES.map((mod) => (
                      <option key={mod.id} value={mod.id}>
                        {mod.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => setActiveTab('cadastros')}
                  >
                    Novo Cadastro
                  </Button>
                  {isTestMode && (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                      onClick={resetTestEnvironment}
                    >
                      Reiniciar Bancada de Teste
                    </Button>
                  )}
                </div>
              </div>

              {/* Grid de Partidas para Operação */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMatches.map((match) => {
                  const sheet = getSheetByMatchId(match.id);
                  const engine = MODALITY_RULE_ENGINE[match.modalityId];
                  const modObj = OFFICIAL_MODALITIES.find(
                    (m) => m.id === match.modalityId
                  );

                  return (
                    <div
                      key={match.id}
                      className="rounded-2xl bg-white border border-brand-surface-border shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between overflow-hidden"
                    >
                      {/* Topo do Card */}
                      <div className="px-5 py-3.5 bg-brand-surface-muted/70 border-b border-brand-surface-border flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-brand-blue text-white flex items-center justify-center shrink-0">
                            <SportIcon
                              iconKey={modObj?.iconKey || 'futsal'}
                              className="w-4 h-4"
                            />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-display font-bold text-brand-text-primary truncate">
                              {match.modalityName}
                            </h3>
                            <p className="text-[11px] text-brand-text-secondary truncate">
                              {match.categoryName} · {match.phaseLabel} · {match.venue}
                            </p>
                          </div>
                        </div>

                        <StatusBadge status={match.status} />
                      </div>

                      {/* Resumo do Placar & Cronômetro Atual */}
                      <div className="p-5 space-y-4">
                        {engine.scoringModel === 'swimming_heats' ? (
                          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-brand-surface-muted border border-brand-surface-border">
                            <div>
                              <span className="text-xs font-bold text-brand-blue uppercase">
                                Prova de Natação ({sheet?.swimmingStroke || 'Crawl'})
                              </span>
                              <p className="text-xs text-brand-text-secondary mt-0.5">
                                {
                                  sheet?.swimmingLanes?.filter(
                                    (l) => l.status === 'finished'
                                  ).length
                                }{' '}
                                de {sheet?.swimmingLanes?.length || 6} raias com tempo registrado
                              </p>
                            </div>
                            <span className="text-sm font-display font-extrabold text-brand-blue">
                              {formatSecondsToClock(sheet?.timer.elapsedSeconds || 0)}
                            </span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 items-center gap-2 bg-brand-surface-muted/60 rounded-xl p-3.5 border border-brand-surface-border">
                            <div className="text-center">
                              <span className="text-xs font-bold text-brand-text-primary block truncate">
                                {match.homeTeam.teamName}
                              </span>
                              {engine.scoringModel === 'sets_points' && (
                                <span className="text-[10px] text-brand-text-secondary">
                                  Sets: {match.homeTeam.setsWon ?? 0}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-2 text-xl font-display font-extrabold text-brand-blue">
                                <span>{match.homeTeam.score ?? 0}</span>
                                <span className="text-xs text-brand-text-muted">×</span>
                                <span>{match.awayTeam.score ?? 0}</span>
                              </div>
                              <span className="text-[11px] font-semibold text-brand-text-secondary mt-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-brand-blue" />
                                {engine.timerDirection === 'countdown'
                                  ? formatSecondsToClock(
                                      sheet?.timer.remainingSeconds || 0
                                    )
                                  : sheet?.timer.periodLabel}
                              </span>
                            </div>

                            <div className="text-center">
                              <span className="text-xs font-bold text-brand-text-primary block truncate">
                                {match.awayTeam.teamName}
                              </span>
                              {engine.scoringModel === 'sets_points' && (
                                <span className="text-[10px] text-brand-text-secondary">
                                  Sets: {match.awayTeam.setsWon ?? 0}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Botões de Ação da Partida: Abrir Súmula, Placar ao Vivo e Súmula Final */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-1"
                            leftIcon={<Play className="w-3.5 h-3.5" />}
                            onClick={() => navigate(`/sumula/${match.id}`)}
                          >
                            Abrir Súmula
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Tv className="w-3.5 h-3.5" />}
                            onClick={() => navigate(`/placar/${match.id}`)}
                          >
                            Placar ao Vivo
                          </Button>

                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<FileText className="w-3.5 h-3.5" />}
                            onClick={() => navigate(`/sumula/${match.id}/documento`)}
                          >
                            Documento
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ABA 2: CADASTROS UNIFICADOS (PERÍODOS/EQUIPES, ATLETAS E PARTIDAS OFICIAIS) */}
      {activeTab === 'cadastros' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Cadastrar Período / Equipe */}
            <form
              onSubmit={handleCreateTeam}
              className="rounded-2xl bg-white border border-brand-surface-border p-5 sm:p-6 shadow-card space-y-4"
            >
              <div className="flex items-center gap-2.5 pb-3 border-b border-brand-surface-border">
                <div className="w-9 h-9 rounded-xl bg-brand-blue-light text-brand-blue flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-brand-text-primary">
                    1. Cadastrar Equipe (Período do Curso)
                  </h3>
                  <p className="text-xs text-brand-text-secondary">
                    Cria a página da equipe e habilita o período para inscrições e tabelas.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                    Nome do Período / Turma *
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Ex: 5º Período • Turma IX"
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm focus:outline-none focus:border-brand-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                    Sigla (3 letras)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={teamShort}
                    onChange={(e) => setTeamShort(e.target.value.toUpperCase())}
                    placeholder="Ex: 5ºP"
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm uppercase focus:outline-none focus:border-brand-blue"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Cadastrar Período / Equipe
              </Button>

              {visibleTeams.length > 0 && (
                <div className="pt-3 border-t border-brand-surface-border space-y-2">
                  <span className="text-[11px] font-bold uppercase text-brand-text-muted">
                    Equipes Ativas ({visibleTeams.length}):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {visibleTeams.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => navigate(`/equipe/${t.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-surface-muted hover:bg-blue-50 border border-brand-surface-border text-xs font-bold text-brand-blue"
                      >
                        <span>{t.name}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>

            {/* 2. Cadastrar Atleta Unificado */}
            <form
              onSubmit={handleCreateAthlete}
              className="rounded-2xl bg-white border border-brand-surface-border p-5 sm:p-6 shadow-card space-y-4"
            >
              <div className="flex items-center gap-2.5 pb-3 border-b border-brand-surface-border">
                <div className="w-9 h-9 rounded-xl bg-brand-blue-light text-brand-blue flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-brand-text-primary">
                    2. Inscrição Unificada de Atleta
                  </h3>
                  <p className="text-xs text-brand-text-secondary">
                    Cria o perfil individual do atleta e o relaciona automaticamente nas súmulas da equipe.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                    Nome do Atleta *
                  </label>
                  <input
                    type="text"
                    value={athName}
                    onChange={(e) => setAthName(e.target.value)}
                    placeholder="Nome ou apelido esportivo"
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm focus:outline-none focus:border-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                    Equipe / Período *
                  </label>
                  <select
                    value={athTeamId || visibleTeams[0]?.id || ''}
                    onChange={(e) => setAthTeamId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm bg-white focus:outline-none focus:border-brand-blue"
                  >
                    {visibleTeams.length === 0 ? (
                      <option value="">Cadastre uma equipe primeiro</option>
                    ) : (
                      visibleTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                    Número da Camisa
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={athNumber}
                    onChange={(e) => setAthNumber(e.target.value)}
                    placeholder="Ex: 10"
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm focus:outline-none focus:border-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                    Posição / Função
                  </label>
                  <input
                    type="text"
                    value={athPosition}
                    onChange={(e) => setAthPosition(e.target.value)}
                    placeholder="Ex: Ala / Armador / Goleiro"
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm focus:outline-none focus:border-brand-blue"
                  />
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-brand-text-secondary mb-1.5">
                  Modalidades em que compete:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {OFFICIAL_MODALITIES.map((mod) => {
                    const active = athModalities.includes(mod.id);
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => toggleAthModality(mod.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                          active
                            ? 'bg-brand-blue text-white'
                            : 'bg-brand-surface-muted text-brand-text-secondary hover:bg-slate-200'
                        }`}
                      >
                        {mod.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={visibleTeams.length === 0}
                leftIcon={<UserPlus className="w-4 h-4" />}
              >
                Inscrever Atleta e Gerar Perfil
              </Button>
            </form>
          </div>

          {/* 3. Criar Confronto Oficial */}
          <form
            onSubmit={handleCreateMatch}
            className="rounded-2xl bg-white border border-brand-surface-border p-5 sm:p-6 shadow-card space-y-4"
          >
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-brand-surface-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-blue-light text-brand-blue flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-brand-text-primary">
                    3. Criar Confronto &amp; Gerar Súmula Eletrônica
                  </h3>
                  <p className="text-xs text-brand-text-secondary">
                    Os atletas já inscritos nas duas equipes serão carregados automaticamente na súmula da partida.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                  Modalidade *
                </label>
                <select
                  value={matchModality}
                  onChange={(e) => setMatchModality(e.target.value as ModalitySlug)}
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm bg-white"
                >
                  {OFFICIAL_MODALITIES.map((mod) => (
                    <option key={mod.id} value={mod.id}>
                      {mod.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                  Equipe Mandante *
                </label>
                <select
                  value={matchHomeTeamId || visibleTeams[0]?.id || ''}
                  onChange={(e) => setMatchHomeTeamId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm bg-white"
                >
                  {visibleTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                  Equipe Visitante *
                </label>
                <select
                  value={matchAwayTeamId || visibleTeams[1]?.id || ''}
                  onChange={(e) => setMatchAwayTeamId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm bg-white"
                >
                  {visibleTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                  Fase da Competição
                </label>
                <select
                  value={matchPhase}
                  onChange={(e) =>
                    setMatchPhase(e.target.value as TournamentPhaseType)
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm bg-white"
                >
                  <option value="group_stage">Fase Classificatória</option>
                  <option value="quarterfinals">Quartas de Final</option>
                  <option value="semifinals">Semifinal</option>
                  <option value="final">Grande Final</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                  Data &amp; Horário
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    placeholder="Hoje"
                    className="w-full px-3 py-2 rounded-xl border border-brand-surface-border text-sm"
                  />
                  <input
                    type="text"
                    value={matchTime}
                    onChange={(e) => setMatchTime(e.target.value)}
                    placeholder="19:00"
                    className="w-full px-3 py-2 rounded-xl border border-brand-surface-border text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                  Local / Quadra
                </label>
                <input
                  type="text"
                  value={matchVenue}
                  onChange={(e) => setMatchVenue(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={visibleTeams.length < 2}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Criar Confronto Oficial
            </Button>
          </form>

          {/* Lista Rápida de Atletas Inscritos */}
          {visibleAthletes.length > 0 && (
            <div className="rounded-2xl bg-white border border-brand-surface-border p-5 shadow-card space-y-3">
              <h4 className="text-sm font-display font-bold text-brand-text-primary">
                Atletas Cadastrados no Ambiente Atual ({visibleAthletes.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {visibleAthletes.map((ath) => {
                  const t = getTeamById(ath.teamId);
                  return (
                    <button
                      key={ath.id}
                      type="button"
                      onClick={() => navigate(`/atleta/${ath.id}`)}
                      className="p-3 rounded-xl bg-brand-surface-muted/70 hover:bg-blue-50 border border-brand-surface-border text-left flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-display font-extrabold text-slate-900 truncate">
                          #{ath.jerseyNumber || '—'} {ath.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {t?.name || 'Equipe'} • {ath.position}
                        </p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 3: MOTOR DE MODALIDADES E REGRAS CONFIGURÁVEIS */}
      {activeTab === 'regras' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {OFFICIAL_MODALITIES.map((mod) => {
            const cfg = MODALITY_RULE_ENGINE[mod.id];
            const categories = Object.values(cfg.defaultCategoryRules);

            return (
              <div
                key={mod.id}
                className="rounded-2xl bg-white border border-brand-surface-border p-5 shadow-card space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-brand-blue-light text-brand-blue flex items-center justify-center">
                      <SportIcon iconKey={mod.iconKey} className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-display font-bold text-brand-text-primary">
                        {mod.name}
                      </h4>
                      <span className="text-[11px] text-brand-text-secondary">
                        Modelo: {cfg.scoringModel}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status="official" label="Configurável" />
                </div>

                <div className="space-y-1.5 pt-2 border-t border-brand-surface-border text-xs text-brand-text-secondary">
                  {categories.map((cat) => (
                    <div
                      key={cat.categoryName}
                      className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-brand-surface-muted"
                    >
                      <span className="font-semibold text-brand-text-primary">
                        {cat.categoryName}
                      </span>
                      <span>
                        {cfg.timerDirection === 'countdown'
                          ? `${cat.periodsCount} × ${
                              cat.periodDurationSeconds / 60
                            } min`
                          : cfg.scoringModel === 'sets_points'
                          ? `Melhor de ${cat.periodsCount} sets`
                          : cfg.scoringModel === 'swimming_heats'
                          ? 'Crawl, Borboleta, Peito, Costas'
                          : 'Parametrizável pelo regulamento'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ABA 4: AUDITORIA DE CORREÇÕES E FILA DE SINCRONIZAÇÃO */}
      {activeTab === 'auditoria' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white border border-brand-surface-border p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-blue-light text-brand-blue flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-brand-text-primary">
                  Rastreabilidade e Auditoria de Súmula
                </h3>
                <p className="text-xs text-brand-text-secondary">
                  Toda edição ou exclusão de evento durante a partida registra o valor original, a alteração e o horário.
                </p>
              </div>
            </div>
            <StatusBadge
              status="official"
              label={`${allAuditLogs.length} alterações registradas`}
            />
          </div>

          {allAuditLogs.length === 0 ? (
            <EmptyState
              variant="stats"
              message="Nenhuma correção ou exclusão de evento foi realizada até o momento."
            />
          ) : (
            <div className="space-y-3">
              {allAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl bg-white border border-brand-surface-border p-4 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-brand-yellow-dark" />
                      <span className="text-xs font-bold uppercase text-brand-blue">
                        {log.modalityName} — {log.action === 'deleted' ? 'Exclusão' : 'Edição'}
                      </span>
                      <span className="text-xs text-brand-text-muted">
                        • {new Date(log.timestampIso).toLocaleTimeString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-xs text-brand-text-secondary">
                      <strong>Original:</strong> {log.previousSummary}
                    </p>
                    <p className="text-xs text-brand-text-primary font-medium">
                      <strong>Atualizado:</strong> {log.newSummary}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/sumula/${log.matchId}`)}
                  >
                    Ver Súmula
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
