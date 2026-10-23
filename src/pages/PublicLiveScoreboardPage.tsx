import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Calendar,
  ChevronRight,
  CircleDot,
  Clock,
  FlaskConical,
  Maximize2,
  Minimize2,
  Play,
  RefreshCw,
  ThumbsUp,
  User,
} from 'lucide-react';
import { useCompetitionStore } from '../context/CompetitionStoreContext';
import { formatSecondsToClock } from '../data/sportRulesConfig';
import { TeamCrest } from '../components/sports/TeamCrest';
import { TestModeBanner } from '../components/layout/TestModeBanner';
import { StandingsTable } from '../components/sports/StandingsTable';
import { MatchEventType } from '../types/domain';

type MatchInfoTab = 'details' | 'lineups' | 'standings' | 'statistics';

const SCORING_TYPES: MatchEventType[] = [
  'goal',
  'point_1',
  'point_2',
  'point_3',
  'set_point',
  'penalty_goal',
];

const CARD_SUB_TYPES: MatchEventType[] = [
  'yellow_card',
  'red_card',
  'expulsion',
  'disqualification',
  'suspension_2min',
  'substitution',
  'foul',
];

/**
 * TELA DE DETALHES DA PARTIDA (MATCH INFO — Modelada diretamente nas Imagens 4 e 5 do Case "All Sports"):
 * - Cabeçalho Azul Royal com textura hexagonal (.all-sports-header), seta de voltar, "Match Info"
 *   e abas com sublinhado Amarelo (#FACC15): Detalhes | Escalações | Classificação | Estatísticas;
 * - Card Superior do Confronto com pílula de status, escudos, placar central e árvore bilateral de gols/pontos;
 * - Card "Pressing Threat / Pressão e Ritmo de Jogo" (Imagem 5) com gráfico de barras espelhadas (verde/azul)
 *   e faixa "Star Performers / Destaques da Partida";
 * - Card "Who Will Win? / Quem Vai Vencer?" (Imagem 4) com gráfico de 3 bolhas sobrepostas (Azul, Verde, Amarelo)
 *   e sistema interativo de votação da torcida (👍);
 * - Card "Short Analysis / Resumo de Cartões e Substituições" (Imagem 5) e "Match Referee / Mesa Oficial" (Imagem 4).
 */
export const PublicLiveScoreboardPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const {
    isTestMode,
    setTestMode,
    visibleMatches,
    getMatchById,
    getSheetByMatchId,
    getModalityStandings,
  } = useCompetitionStore();

  const [activeTab, setActiveTab] = useState<MatchInfoTab>('details');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Estado interativo do Sistema de Votação da Torcida ("Who Will Win?" - Imagem 4)
  const [votes, setVotes] = useState<{ home: number; away: number; draw: number }>({
    home: 45,
    away: 35,
    draw: 20,
  });
  const [userVote, setUserVote] = useState<'home' | 'away' | 'draw' | null>(null);

  const resolvedMatch =
    (matchId ? getMatchById(matchId) : undefined) ||
    visibleMatches.find((m) => m.status === 'live') ||
    visibleMatches[0];

  const sheet = resolvedMatch ? getSheetByMatchId(resolvedMatch.id) : undefined;

  const totalVotes = votes.home + votes.away + votes.draw;
  const homePct = totalVotes > 0 ? Math.round((votes.home / totalVotes) * 100) : 45;
  const awayPct = totalVotes > 0 ? Math.round((votes.away / totalVotes) * 100) : 35;
  const drawPct = Math.max(0, 100 - homePct - awayPct);

  const handleVote = (choice: 'home' | 'away' | 'draw') => {
    if (userVote === choice) return;
    setVotes((prev) => ({
      ...prev,
      [choice]: prev[choice] + 8,
    }));
    setUserVote(choice);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const events = (sheet?.events || []).filter((e) => !e.isDeleted);
  const scoringEvents = events.filter(
    (e) => SCORING_TYPES.includes(e.type) && e.teamSide
  );
  const homeScorers = scoringEvents.filter((e) => e.teamSide === 'home');
  const awayScorers = scoringEvents.filter((e) => e.teamSide === 'away');

  const cardAndSubEvents = events.filter((e) => CARD_SUB_TYPES.includes(e.type));
  const yellowCardsCount = events.filter((e) => e.type === 'yellow_card').length;
  const redCardsCount = events.filter(
    (e) => e.type === 'red_card' || e.type === 'expulsion'
  ).length;

  const homeName = resolvedMatch?.homeTeam.teamName || 'Equipe Mandante';
  const awayName = resolvedMatch?.awayTeam.teamName || 'Equipe Visitante';
  const homeScore = resolvedMatch?.homeTeam.score ?? 0;
  const awayScore = resolvedMatch?.awayTeam.score ?? 0;

  // Gera 28 barras para o gráfico "Pressing Threat" (Imagem 5)
  const threatBars = Array.from({ length: 28 }, (_, idx) => {
    const matchingEvent = events[idx % Math.max(1, events.length)];
    if (!resolvedMatch) {
      return { side: idx % 2 === 0 ? 'home' : 'away', value: 18 };
    }
    if (matchingEvent && matchingEvent.teamSide) {
      return {
        side: matchingEvent.teamSide,
        value: SCORING_TYPES.includes(matchingEvent.type) ? 85 : 48,
      };
    }
    const wave = ((idx * 17 + 11) % 65) + 20;
    return {
      side: idx % 3 === 0 ? 'away' : 'home',
      value: wave,
    };
  });

  const tabs: Array<{ id: MatchInfoTab; label: string }> = [
    { id: 'details', label: 'Detalhes' },
    { id: 'lineups', label: 'Escalações' },
    { id: 'standings', label: 'Classificação' },
    { id: 'statistics', label: 'Estatísticas' },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-900 pb-16">
      <TestModeBanner />

      {/* 1. CABEÇALHO AZUL ROYAL "MATCH INFO" + MENU BAR COM SUBLINHADO AMARELO (Imagens 4 e 5) */}
      <header className="sticky top-0 z-30 all-sports-header text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 pb-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Voltar"
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-display font-extrabold text-white leading-tight">
                Match Info
              </h1>
              <span className="block text-[11px] text-white/75">
                {resolvedMatch
                  ? `${resolvedMatch.modalityName} • ${resolvedMatch.phaseLabel}`
                  : 'Central da Partida • INTRAMED IX'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {resolvedMatch && (
              <button
                type="button"
                onClick={() => navigate(`/sumula/${resolvedMatch.id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-yellow text-[#0B218A] text-xs font-display font-extrabold shadow-sm hover:bg-brand-yellow-dark transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Operar Súmula</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/jogos')}
              aria-label="Calendário"
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition-colors"
            >
              <Calendar className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label="Tela cheia"
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition-colors"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Menu Bar de 4 Abas na Base do Header Azul (Details | Lineups | Standings | Statistics) */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <nav className="grid grid-cols-4 text-center pt-1">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative pb-3 pt-1.5 text-xs sm:text-sm font-display transition-colors ${
                    active
                      ? 'font-extrabold text-white'
                      : 'font-medium text-white/70 hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-1 rounded-t-full bg-brand-yellow shadow-[0_0_10px_rgba(250,204,21,0.75)]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Subtítulo da Competição no Topo do Conteúdo (Ex: Champions League ⚽ Group H, Round 1) */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4">
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#4F6BED]">
          <span>{resolvedMatch?.modalityName || 'Competição Oficial'}</span>
          <CircleDot className="w-3.5 h-3.5 text-slate-300" />
          <span>
            {resolvedMatch?.categoryName
              ? `${resolvedMatch.categoryName}, ${resolvedMatch.phaseLabel}`
              : 'INTRAMED IX • Medicina UEMA'}
          </span>
        </div>

        {!resolvedMatch && !isTestMode && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={() => setTestMode(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-950 text-xs font-display font-extrabold transition-colors"
            >
              <FlaskConical className="w-4 h-4 text-amber-700" />
              <span>Ativar Modo de Teste para Simular Partida Ao Vivo</span>
            </button>
          </div>
        )}
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 space-y-5">
        {/* 2. CARD PRINCIPAL DO CONFRONTO (Idêntico ao topo das Imagens 4 e 5) */}
        <section className="all-sports-card p-5 sm:p-6">
          <div className="flex justify-center mb-4">
            {resolvedMatch?.status === 'live' ||
            resolvedMatch?.status === 'halftime' ? (
              <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-[#10B981] text-white text-xs font-display font-extrabold shadow-sm">
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                <span>
                  {sheet?.timer
                    ? formatSecondsToClock(sheet.timer.remainingSeconds)
                    : 'AO VIVO'}
                </span>
              </span>
            ) : resolvedMatch?.status === 'finished' ? (
              <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-[#9CA3AF] text-white text-xs font-display font-extrabold">
                <Clock className="w-3.5 h-3.5" />
                <span>FT</span>
              </span>
            ) : (
              <span className="w-9 h-9 rounded-full bg-[#F3F4F9] border border-slate-200 flex items-center justify-center text-[#4F6BED]">
                <Bell className="w-4 h-4" />
              </span>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 max-w-lg mx-auto">
            <div className="flex items-center justify-end gap-2.5 text-right min-w-0">
              <span className="text-sm sm:text-base font-display font-bold text-slate-800 truncate">
                {homeName}
              </span>
              <TeamCrest
                crestUrl={resolvedMatch?.homeTeam.crestUrl}
                teamName={resolvedMatch?.homeTeam.teamName}
                size="md"
              />
            </div>

            <div className="text-center px-2">
              <div className="px-4 py-1.5 rounded-full bg-[#F3F4F9] border border-slate-200/80 text-slate-900 font-display font-extrabold text-base sm:text-lg tabular-nums">
                {resolvedMatch ? `${homeScore} - ${awayScore}` : '— : —'}
              </div>
              {sheet?.timer?.periodLabel && (
                <span className="block text-[11px] font-semibold text-slate-400 mt-1">
                  ({sheet.timer.periodLabel})
                </span>
              )}
            </div>

            <div className="flex items-center justify-start gap-2.5 text-left min-w-0">
              <TeamCrest
                crestUrl={resolvedMatch?.awayTeam.crestUrl}
                teamName={resolvedMatch?.awayTeam.teamName}
                size="md"
              />
              <span className="text-sm sm:text-base font-display font-bold text-slate-800 truncate">
                {awayName}
              </span>
            </div>
          </div>

          {/* Árvore de Gols / Pontos Bilateral (Imagem 5) */}
          {(homeScorers.length > 0 || awayScorers.length > 0) && (
            <div className="mt-4 grid grid-cols-2 gap-4 max-w-md mx-auto text-xs text-[#5B6B98]">
              <div className="flex flex-col items-end pr-3 border-r border-dashed border-slate-200 space-y-1.5">
                {homeScorers.map((ev) => (
                  <div key={ev.id} className="inline-flex items-center gap-1.5">
                    <span>
                      {ev.athleteName || ev.typeLabel}{' '}
                      <span className="text-slate-400">{ev.matchClockDisplay}</span>
                    </span>
                    <CircleDot className="w-3.5 h-3.5 text-[#0B218A]" />
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-start pl-3 space-y-1.5">
                {awayScorers.map((ev) => (
                  <div key={ev.id} className="inline-flex items-center gap-1.5">
                    <CircleDot className="w-3.5 h-3.5 text-[#0B218A]" />
                    <span>
                      <span className="text-slate-400">{ev.matchClockDisplay}</span>{' '}
                      {ev.athleteName || ev.typeLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-slate-100 text-center space-y-0.5">
            <p className="text-xs font-bold text-slate-600">
              {resolvedMatch?.venue || 'Ginásio Oficial • Medicina UEMA'}
            </p>
            <p className="text-[11px] font-medium text-[#64748B]">
              {resolvedMatch
                ? `${resolvedMatch.modalityName} • ${
                    resolvedMatch.scheduledTime || 'Horário Oficial'
                  }`
                : 'Aguardando início da partida'}
            </p>
          </div>
        </section>

        {/* ABA 1: DETALHES (Inclui Pressing Threat, Who Will Win?, Short Analysis e Referee) */}
        {activeTab === 'details' && (
          <>
            {/* 3. CARD "PRESSING THREAT & STAR PERFORMERS" (Idêntico à Imagem 5) */}
            <section className="all-sports-card p-5 sm:p-6 space-y-4">
              <div className="all-sports-section-pill">
                Pressão e Ritmo de Jogo (Pressing Threat)
              </div>

              {/* Gráfico de Barras Verticais Espelhadas (Verde em cima / Azul embaixo) */}
              <div className="rounded-2xl overflow-hidden border border-slate-200/70">
                {/* Metade Superior Verde (Mandante) */}
                <div className="h-20 bg-gradient-to-b from-emerald-100/80 to-emerald-50/40 px-3 flex items-end justify-between gap-1 border-b border-slate-200/80">
                  {threatBars.map((bar, idx) => (
                    <div
                      key={`top-${idx}`}
                      className="flex-1 rounded-t-sm bg-[#10B981] transition-all duration-300"
                      style={{
                        height:
                          bar.side === 'home' ? `${Math.min(95, bar.value)}%` : '10%',
                        opacity: bar.side === 'home' ? 0.95 : 0.2,
                      }}
                    />
                  ))}
                </div>

                {/* Metade Inferior Azul (Visitante) */}
                <div className="h-20 bg-gradient-to-t from-blue-100/70 to-blue-50/40 px-3 flex items-start justify-between gap-1">
                  {threatBars.map((bar, idx) => (
                    <div
                      key={`bot-${idx}`}
                      className="flex-1 rounded-b-sm bg-[#2563EB] transition-all duration-300"
                      style={{
                        height:
                          bar.side === 'away' ? `${Math.min(95, bar.value)}%` : '10%',
                        opacity: bar.side === 'away' ? 0.9 : 0.2,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-1">
                <span>Início • 1º Período</span>
                <span>Tempo Real / FT</span>
              </div>

              {/* Faixa "Star Performers" (Idêntica à Imagem 5) */}
              <div className="rounded-2xl bg-[#F3F4F9] p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#0B218A] text-white flex items-center justify-center shrink-0 font-display font-bold text-xs">
                    {homeName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="inline-block px-2 py-0.5 rounded bg-[#10B981] text-white text-[10px] font-extrabold">
                      {resolvedMatch ? '7.8' : '—'}
                    </span>
                    <span className="block text-xs font-bold text-slate-700 truncate mt-0.5">
                      {sheet?.homeLineup[0]?.athleteName || homeName}
                    </span>
                  </div>
                </div>

                <span className="text-[11px] font-display font-bold text-slate-500 shrink-0">
                  Destaques
                </span>

                <div className="flex items-center gap-2.5 min-w-0 text-right">
                  <div className="min-w-0">
                    <span className="inline-block px-2 py-0.5 rounded bg-[#10B981] text-white text-[10px] font-extrabold">
                      {resolvedMatch ? '7.5' : '—'}
                    </span>
                    <span className="block text-xs font-bold text-slate-700 truncate mt-0.5">
                      {sheet?.awayLineup[0]?.athleteName || awayName}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 font-display font-bold text-xs">
                    {awayName.slice(0, 2).toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('statistics')}
                  className="inline-flex items-center gap-1 text-xs font-display font-extrabold text-[#10B981] hover:underline"
                >
                  <CircleDot className="w-3.5 h-3.5" />
                  <span>INTRAMED Ratings &amp; Estatísticas</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </section>

            {/* 4. CARD "WHO WILL WIN? / QUEM VAI VENCER?" COM BOLHAS SOBREPOSTAS (Idêntico à Imagem 4) */}
            <section className="all-sports-card p-5 sm:p-6 space-y-5">
              <div className="all-sports-section-pill">
                Quem Vai Vencer? • Palpite da Torcida
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.3fr] items-center gap-6">
                {/* Legenda à Esquerda */}
                <div className="space-y-3 text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-[#1D63FF] shrink-0" />
                    <span className="truncate">{homeName}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-[#10B981] shrink-0" />
                    <span className="truncate">{awayName}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-[#FACC15] shrink-0" />
                    <span>Empate / Prorrogação</span>
                  </div>
                </div>

                {/* Gráfico de 3 Bolhas Circulares Sobrepostas (Azul, Verde e Amarelo - Imagem 4) */}
                <div className="relative h-44 w-full max-w-[270px] mx-auto select-none">
                  {/* Bolha Azul (Mandante) */}
                  <div className="absolute left-2 top-5 w-32 h-32 rounded-full bg-[#1D63FF] text-white flex flex-col items-center justify-center text-center p-2 shadow-lg ring-4 ring-white">
                    <span className="text-2xl font-display font-extrabold leading-none">
                      {homePct}%
                    </span>
                    <span className="text-[10px] font-medium text-white/90 mt-1 line-clamp-2 px-1">
                      {homeName}
                    </span>
                  </div>

                  {/* Bolha Verde (Visitante) */}
                  <div className="absolute right-2 top-1 w-28 h-28 rounded-full bg-[#10B981] text-white flex flex-col items-center justify-center text-center p-2 shadow-lg ring-4 ring-white">
                    <span className="text-xl font-display font-extrabold leading-none">
                      {awayPct}%
                    </span>
                    <span className="text-[10px] font-medium text-white/90 mt-1 line-clamp-1 px-1">
                      {awayName}
                    </span>
                  </div>

                  {/* Bolha Amarela (Empate) */}
                  <div className="absolute right-10 bottom-1 w-20 h-20 rounded-full bg-[#FACC15] text-slate-900 flex flex-col items-center justify-center text-center p-1.5 shadow-md ring-4 ring-white">
                    <span className="text-sm font-display font-extrabold leading-none">
                      {drawPct}%
                    </span>
                    <span className="text-[9px] font-bold text-slate-800 mt-0.5">
                      Empate
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 Botões Interativos de Votação na Base (👍 com Anel Colorido - Imagem 4) */}
              <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleVote('home')}
                  className={`flex items-center gap-2.5 p-2 rounded-2xl border transition-all ${
                    userVote === 'home'
                      ? 'bg-blue-50/80 border-[#1D63FF]'
                      : 'bg-white border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-9 h-9 rounded-full bg-blue-50 border-2 border-[#1D63FF] flex items-center justify-center text-[#1D63FF] shrink-0">
                    <ThumbsUp className="w-4 h-4" />
                  </span>
                  <div className="text-left min-w-0">
                    <span className="block text-[10px] font-bold uppercase text-slate-400 truncate">
                      {homeName}
                    </span>
                    <span className="block text-xs font-display font-extrabold text-slate-800">
                      {votes.home} votos
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleVote('away')}
                  className={`flex items-center gap-2.5 p-2 rounded-2xl border transition-all ${
                    userVote === 'away'
                      ? 'bg-emerald-50/80 border-[#10B981]'
                      : 'bg-white border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-9 h-9 rounded-full bg-emerald-50 border-2 border-[#10B981] flex items-center justify-center text-[#10B981] shrink-0">
                    <ThumbsUp className="w-4 h-4" />
                  </span>
                  <div className="text-left min-w-0">
                    <span className="block text-[10px] font-bold uppercase text-slate-400 truncate">
                      {awayName}
                    </span>
                    <span className="block text-xs font-display font-extrabold text-slate-800">
                      {votes.away} votos
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleVote('draw')}
                  className={`flex items-center gap-2.5 p-2 rounded-2xl border transition-all ${
                    userVote === 'draw'
                      ? 'bg-amber-50/80 border-[#FACC15]'
                      : 'bg-white border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-9 h-9 rounded-full bg-amber-50 border-2 border-[#FACC15] flex items-center justify-center text-amber-600 shrink-0">
                    <ThumbsUp className="w-4 h-4" />
                  </span>
                  <div className="text-left min-w-0">
                    <span className="block text-[10px] font-bold uppercase text-slate-400">
                      Empate
                    </span>
                    <span className="block text-xs font-display font-extrabold text-slate-800">
                      {votes.draw} votos
                    </span>
                  </div>
                </button>
              </div>
            </section>

            {/* 5. CARD "SHORT ANALYSIS / CARTÕES & SUBSTITUIÇÕES" (Idêntico à base da Imagem 5) */}
            <section className="all-sports-card p-5 sm:p-6 space-y-4">
              <div className="all-sports-section-pill flex items-center justify-center gap-2">
                <span>
                  ({homeScore} - {awayScore}) • Resumo Disciplinar &amp; Alterações
                </span>
              </div>

              {cardAndSubEvents.length > 0 ? (
                <div className="space-y-3 divide-y divide-slate-100">
                  {cardAndSubEvents.map((ev) => {
                    const isHome = ev.teamSide === 'home';
                    const isRed =
                      ev.type === 'red_card' || ev.type === 'expulsion';
                    const isYellow = ev.type === 'yellow_card';
                    return (
                      <div
                        key={ev.id}
                        className={`pt-3 first:pt-0 flex items-center ${
                          isHome ? 'justify-start' : 'justify-end text-right'
                        }`}
                      >
                        <div
                          className={`flex items-center gap-3 ${
                            isHome ? '' : 'flex-row-reverse'
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            {isRed ? (
                              <span className="w-3.5 h-5 rounded-sm bg-rose-600 inline-block" />
                            ) : isYellow ? (
                              <span className="w-3.5 h-5 rounded-sm bg-amber-400 inline-block" />
                            ) : (
                              <RefreshCw className="w-4 h-4 text-[#1D63FF]" />
                            )}
                            <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                              {ev.matchClockDisplay}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-display font-bold text-slate-800">
                              {ev.athleteName || ev.teamName || ev.typeLabel}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {ev.typeLabel}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-center text-slate-400 py-4">
                  Nenhum cartão ou substituição registrado na súmula até o momento.
                </p>
              )}
            </section>

            {/* 6. CARD "MATCH REFEREE / MESA OFICIAL" (Idêntico à base da Imagem 4) */}
            <section className="all-sports-card p-5 sm:p-6 space-y-4">
              <div className="all-sports-section-pill">
                Arbitragem &amp; Mesa Oficial da Partida
              </div>

              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-white shadow-md flex items-center justify-center text-[#0B218A]">
                  <User className="w-6 h-6" />
                </div>
              </div>

              <div className="space-y-2.5 text-xs max-w-sm mx-auto">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-500">Comissão:</span>
                  <span className="font-display font-extrabold text-slate-800">
                    {sheet?.refereeName || 'Arbitragem Oficial INTRAMED IX'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-500">Organização:</span>
                  <span className="font-semibold text-slate-600">
                    A.A.A. Cangaceira • Medicina UEMA
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="font-semibold text-slate-500">
                    Cartões na Partida:
                  </span>
                  <div className="flex items-center gap-3 font-display font-bold text-slate-700">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-3.5 rounded-[2px] bg-rose-600 inline-block" />
                      <span>{redCardsCount}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-3.5 rounded-[2px] bg-amber-400 inline-block" />
                      <span>{yellowCardsCount}</span>
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ABA 2: ESCALAÇÕES & VISUALIZAÇÃO TÁTICA EM CAMPO/QUADRA */}
        {activeTab === 'lineups' && (
          <section className="all-sports-card p-5 sm:p-6 space-y-5">
            <div className="all-sports-section-pill">
              Posicionamento Tático &amp; Relacionados na Súmula
            </div>

            {/* Quadra / Campo Estilizado com Posicionamento Visual */}
            <div className="relative rounded-3xl bg-gradient-to-b from-[#166534] via-[#15803D] to-[#166534] text-white p-5 sm:p-6 overflow-hidden shadow-inner border-4 border-white">
              {/* Marcações da quadra/campo */}
              <div className="pointer-events-none absolute inset-4 border-2 border-white/30 rounded-xl" />
              <div className="pointer-events-none absolute inset-x-4 top-1/2 h-0.5 bg-white/30" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-white/30" />

              <div className="relative z-10 flex items-center justify-between text-xs font-display font-bold text-white/90 mb-6">
                <span>{homeName}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-black/25 text-brand-yellow">
                  Quadra Oficial
                </span>
                <span>{awayName}</span>
              </div>

              {sheet &&
              (sheet.homeLineup.length > 0 || sheet.awayLineup.length > 0) ? (
                <div className="relative z-10 grid grid-cols-2 gap-6 py-4">
                  <div className="flex flex-wrap items-center justify-center gap-4">
                    {sheet.homeLineup.map((p) => (
                      <div
                        key={p.athleteId}
                        onClick={() => navigate(`/atleta/${p.athleteId}`)}
                        className="cursor-pointer hover:scale-105 transition-transform flex flex-col items-center text-center"
                      >
                        <div className="w-11 h-11 rounded-full bg-[#0B218A] border-2 border-white shadow-md flex items-center justify-center font-display font-extrabold text-xs text-brand-yellow">
                          {p.jerseyNumber || '•'}
                        </div>
                        <span className="mt-1 px-2 py-0.5 rounded bg-black/40 text-[10px] font-semibold">
                          {p.athleteName}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-4">
                    {sheet.awayLineup.map((p) => (
                      <div
                        key={p.athleteId}
                        onClick={() => navigate(`/atleta/${p.athleteId}`)}
                        className="cursor-pointer hover:scale-105 transition-transform flex flex-col items-center text-center"
                      >
                        <div className="w-11 h-11 rounded-full bg-white text-[#0B218A] border-2 border-brand-yellow shadow-md flex items-center justify-center font-display font-extrabold text-xs">
                          {p.jerseyNumber || '•'}
                        </div>
                        <span className="mt-1 px-2 py-0.5 rounded bg-black/40 text-[10px] font-semibold">
                          {p.athleteName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="relative z-10 py-12 text-center space-y-2">
                  <p className="text-sm font-display font-extrabold text-white">
                    Escalações aguardando registro na Súmula
                  </p>
                  <p className="text-xs text-white/80 max-w-md mx-auto">
                    Assim que os atletas dos períodos forem adicionados na Súmula Eletrônica, seus avatares e números aparecerão posicionados aqui.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ABA 3: CLASSIFICAÇÃO */}
        {activeTab === 'standings' && (
          <section className="all-sports-card p-5 sm:p-6 space-y-4">
            <div className="all-sports-section-pill">
              Tabela de Classificação da Modalidade
            </div>
            <StandingsTable
              standings={getModalityStandings(
                resolvedMatch?.modalityId || 'all'
              )}
              modalityId={resolvedMatch?.modalityId || 'futsal'}
            />
          </section>
        )}

        {/* ABA 4: ESTATÍSTICAS COMPARATIVAS */}
        {activeTab === 'statistics' && (
          <section className="all-sports-card p-5 sm:p-6 space-y-5">
            <div className="all-sports-section-pill">
              Comparativo Estatístico da Súmula
            </div>

            {[
              {
                label: 'Gols / Pontos Convertidos',
                home: homeScore,
                away: awayScore,
              },
              {
                label: 'Faltas de Equipe no Período',
                home: sheet?.homeFoulsCurrentPeriod ?? 0,
                away: sheet?.awayFoulsCurrentPeriod ?? 0,
              },
              {
                label: 'Pedidos de Tempo Utilizados',
                home: sheet?.homeTimeoutsUsed ?? 0,
                away: sheet?.awayTimeoutsUsed ?? 0,
              },
              {
                label: 'Eventos Registrados',
                home: events.filter((e) => e.teamSide === 'home').length,
                away: events.filter((e) => e.teamSide === 'away').length,
              },
            ].map((stat) => {
              const total = stat.home + stat.away;
              const homePercent =
                total > 0 ? Math.round((stat.home / total) * 100) : 50;
              return (
                <div key={stat.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-display font-bold">
                    <span className="text-[#0B218A]">{stat.home}</span>
                    <span className="text-slate-600">{stat.label}</span>
                    <span className="text-[#10B981]">{stat.away}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden flex">
                    <div
                      className="h-full bg-[#0B218A] transition-all"
                      style={{ width: `${homePercent}%` }}
                    />
                    <div
                      className="h-full bg-[#10B981] transition-all"
                      style={{ width: `${100 - homePercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
};
