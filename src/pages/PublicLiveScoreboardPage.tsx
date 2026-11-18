import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Calendar,
  ChevronRight,
  CircleDot,
  Clock,
  FileText,
  FlaskConical,
  Maximize2,
  Minimize2,
  Play,
  RefreshCw,
  ThumbsUp,
  User,
} from 'lucide-react';
import { useCompetitionStore } from '../context/CompetitionStoreContext';
import { formatSecondsToClock, MODALITY_RULE_ENGINE } from '../data/sportRulesConfig';
import { TeamCrest } from '../components/sports/TeamCrest';
import { TestModeBanner } from '../components/layout/TestModeBanner';
import { StandingsTable } from '../components/sports/StandingsTable';
import { StoryShareButton } from '../components/social/StoryShareModal';
import { MatchEventType } from '../types/domain';
import { computeLiveVolleyballRotation } from '../utils/volleyballRotation';

type MatchInfoTab = 'details' | 'lineups' | 'standings' | 'statistics';

const SCORING_TYPES: MatchEventType[] = [
  'goal',
  'own_goal',
  'point_1',
  'point_2',
  'point_3',
  'set_point',
  'penalty_goal',
  'seven_meters',
  'direct_free_throw',
  'volleyball_ace',
  'volleyball_block',
  'volleyball_attack',
  'volleyball_opponent_error',
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
    activeLiveMatches,
    getMatchById,
    getSheetByMatchId,
    getModalityStandings,
    canOperateOfficialData,
    canOperateMatch,
    currentUser,
    castMatchFanVote,
  } = useCompetitionStore();
  const isAdmin = canOperateOfficialData();

  const [activeTab, setActiveTab] = useState<MatchInfoTab>('details');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const nonSwimmingMatches = visibleMatches.filter(
    (m) => m.modalityId !== 'natacao' && m.id !== 'match_natacao_geral_final'
  );

  const resolvedMatch =
    (matchId ? getMatchById(matchId) : undefined) ||
    activeLiveMatches[0] ||
    nonSwimmingMatches.find((m) => m.status === 'live' || m.status === 'halftime') ||
    nonSwimmingMatches[0] ||
    visibleMatches[0];

  const sheet = resolvedMatch ? getSheetByMatchId(resolvedMatch.id) : undefined;
  const isSetsMatch = sheet?.scoringModel === 'sets_points';
  const currentSetObj =
    isSetsMatch && sheet
      ? sheet.periodScores.find(
          (p) => p.periodNumber === (sheet.timer.currentPeriod || 1)
        ) || sheet.periodScores[0]
      : undefined;

  const liveVolleyballRotation =
    resolvedMatch?.modalityId === 'volei' && sheet
      ? computeLiveVolleyballRotation(sheet, sheet.timer.currentPeriod || 1)
      : null;

  // Enquete 100% Real da Torcida (zero votos fictícios — computa diretamente de sheet.fanVotes)
  const localVoterId =
    currentUser?.id ||
    currentUser?.email?.trim().toLowerCase() ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('intramed_fan_voter_id') || ''
      : '');
  const fanVotesMap = sheet?.fanVotes || {};
  const userVote = localVoterId ? fanVotesMap[localVoterId] || null : null;
  const votes = Object.values(fanVotesMap).reduce(
    (acc, v) => {
      if (v === 'home') acc.home += 1;
      else if (v === 'away') acc.away += 1;
      else if (v === 'draw') acc.draw += 1;
      return acc;
    },
    { home: 0, away: 0, draw: 0 }
  );
  const totalVotes = votes.home + votes.away + votes.draw;
  const homePct = totalVotes > 0 ? Math.round((votes.home / totalVotes) * 100) : 0;
  const awayPct = totalVotes > 0 ? Math.round((votes.away / totalVotes) * 100) : 0;
  const drawPct =
    totalVotes > 0 ? Math.max(0, 100 - homePct - awayPct) : 0;

  const handleVote = (choice: 'home' | 'away' | 'draw') => {
    if (!resolvedMatch || userVote === choice) return;
    void castMatchFanVote(resolvedMatch.id, choice);
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
  const getEffectiveScoringSide = (ev: {
    type: MatchEventType;
    teamSide?: 'home' | 'away' | null;
  }) =>
    ev.type === 'own_goal'
      ? ev.teamSide === 'home'
        ? 'away'
        : 'home'
      : ev.teamSide;
  const homeScorers = scoringEvents.filter(
    (e) => getEffectiveScoringSide(e) === 'home'
  );
  const awayScorers = scoringEvents.filter(
    (e) => getEffectiveScoringSide(e) === 'away'
  );
  const modalityEngine = resolvedMatch
    ? MODALITY_RULE_ENGINE[resolvedMatch.modalityId]
    : undefined;

  const cardAndSubEvents = events.filter((e) => CARD_SUB_TYPES.includes(e.type));
  const yellowCardsCount = events.filter((e) => e.type === 'yellow_card').length;
  const redCardsCount = events.filter(
    (e) => e.type === 'red_card' || e.type === 'expulsion'
  ).length;

  const homeName = resolvedMatch?.homeTeam.teamName || 'Equipe Mandante';
  const awayName = resolvedMatch?.awayTeam.teamName || 'Equipe Visitante';
  const homeScore = resolvedMatch?.homeTeam.score ?? 0;
  const awayScore = resolvedMatch?.awayTeam.score ?? 0;
  const homeCurrentSetPoints = currentSetObj?.homeScore ?? 0;
  const awayCurrentSetPoints = currentSetObj?.awayScore ?? 0;

  // Barras reais de ritmo de jogo: baseadas exclusivamente nos lances reais registrados (sem ondas fictícias)
  const chronologicalScoringAndPlays = [...events].reverse();
  const threatBars = Array.from({ length: 24 }, (_, idx) => {
    const ev = chronologicalScoringAndPlays[idx];
    if (!ev || !ev.teamSide) {
      return { side: 'none' as const, value: 0 };
    }
    return {
      side: ev.teamSide,
      value: SCORING_TYPES.includes(ev.type) ? 88 : 48,
    };
  });

  // Destaques reais da partida: quem marcou mais pontos/gols nesta partida (sem notas 7.8 / 7.5 inventadas)
  const getTopPerformerForSide = (side: 'home' | 'away') => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const ev of scoringEvents) {
      if (ev.teamSide === side && ev.athleteName) {
        const key = ev.athleteId || ev.athleteName;
        const prev = counts.get(key) || { name: ev.athleteName, count: 0 };
        prev.count += 1;
        counts.set(key, prev);
      }
    }
    let best: { name: string; count: number } | null = null;
    for (const item of counts.values()) {
      if (!best || item.count > best.count) best = item;
    }
    return best;
  };
  const homeTopPerformer = getTopPerformerForSide('home');
  const awayTopPerformer = getTopPerformerForSide('away');

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
                {resolvedMatch?.modalityName || 'Partida'}
              </h1>
              <span className="block text-[11px] text-white/75">
                {resolvedMatch
                  ? `${resolvedMatch.phaseLabel}${resolvedMatch.scheduledDate ? ` • ${resolvedMatch.scheduledDate}` : ''}`
                  : 'INTRAMED IX'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {resolvedMatch && (isAdmin || canOperateMatch(resolvedMatch.id)) && (
              <button
                type="button"
                onClick={() => navigate(`/sumula/${resolvedMatch.id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-yellow text-[#0B218A] text-xs font-display font-extrabold shadow-sm hover:bg-brand-yellow-dark transition-colors"
                title="Acesso para o Mesário desta partida (solicita senha da partida)"
              >
                <Play className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {canOperateMatch(resolvedMatch.id)
                    ? 'Operar Súmula Ao Vivo'
                    : 'Operar Súmula'}
                </span>
              </button>
            )}

            {resolvedMatch && (
              <>
                <StoryShareButton
                  label="Stories"
                  payload={{
                    type: 'match',
                    title: `${resolvedMatch.modalityName}${
                      resolvedMatch.phaseLabel ? ` • ${resolvedMatch.phaseLabel}` : ''
                    }`,
                    homeTeamName: resolvedMatch.homeTeam.teamName || 'A definir',
                    homeTeamCrestUrl: resolvedMatch.homeTeam.crestUrl,
                    homeScore:
                      resolvedMatch.status === 'live' ||
                      resolvedMatch.status === 'halftime' ||
                      resolvedMatch.status === 'finished'
                        ? (resolvedMatch.homeTeam.score ?? 0)
                        : null,
                    awayTeamName: resolvedMatch.awayTeam.teamName || 'A definir',
                    awayTeamCrestUrl: resolvedMatch.awayTeam.crestUrl,
                    awayScore:
                      resolvedMatch.status === 'live' ||
                      resolvedMatch.status === 'halftime' ||
                      resolvedMatch.status === 'finished'
                        ? (resolvedMatch.awayTeam.score ?? 0)
                        : null,
                    statusLabel:
                      resolvedMatch.status === 'live' || resolvedMatch.status === 'halftime'
                        ? 'AO VIVO'
                        : resolvedMatch.status === 'finished'
                        ? 'FIM DE JOGO'
                        : 'CONFRONTO OFICIAL',
                    dateTimeLabel: `${resolvedMatch.scheduledDate || ''} ${
                      resolvedMatch.scheduledTime ? `• ${resolvedMatch.scheduledTime}` : ''
                    }`.trim(),
                    venueLabel: resolvedMatch.venue || 'Quadra Oficial',
                  }}
                />
                <button
                  type="button"
                  onClick={() => navigate(`/sumula/${resolvedMatch.id}/documento`)}
                  title="Visualizar Documento da Súmula"
                  className={
                    canOperateOfficialData() ||
                    (resolvedMatch.status === 'finished' &&
                      Boolean(sheet?.isOfficialReleased))
                      ? 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-display font-bold transition-colors'
                      : 'hidden'
                  }
                >
                  <FileText className="w-3.5 h-3.5 text-brand-yellow" />
                  <span className="hidden sm:inline">Súmula Oficial</span>
                </button>
              </>
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

      {!resolvedMatch && !isTestMode && isAdmin && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setTestMode(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-950 text-xs font-display font-extrabold transition-colors"
          >
            <FlaskConical className="w-4 h-4 text-amber-700" />
            <span>Simular Partida</span>
          </button>
        </div>
      )}

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
                  {resolvedMatch.status === 'halftime'
                    ? 'INTERVALO'
                    : isSetsMatch
                    ? `AO VIVO • ${sheet?.timer?.periodLabel || 'Set 1'}`
                    : modalityEngine?.timerDirection === 'countdown' && sheet?.timer
                    ? formatSecondsToClock(sheet.timer.remainingSeconds)
                    : 'AO VIVO'}
                </span>
              </span>
            ) : resolvedMatch?.status === 'finished' ? (
              <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-[#9CA3AF] text-white text-xs font-display font-extrabold">
                <Clock className="w-3.5 h-3.5" />
                <span>FIM DE JOGO</span>
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
                teamId={resolvedMatch?.homeTeam.teamId}
                size="md"
              />
            </div>

            <div className="text-center px-2">
              {isSetsMatch && resolvedMatch?.status !== 'finished' ? (
                <>
                  <span className="block text-[10px] font-display font-extrabold uppercase tracking-wider text-[#0B218A] mb-1">
                    SETS: {homeScore} — {awayScore}
                  </span>
                  <div className="px-4 py-1.5 rounded-full bg-[#F3F4F9] border border-slate-200/80 text-slate-900 font-display font-extrabold text-xl sm:text-2xl tabular-nums">
                    {homeCurrentSetPoints} × {awayCurrentSetPoints}
                  </div>
                  <span className="block text-[10px] font-semibold text-slate-500 mt-1">
                    Pontos no {sheet?.timer?.periodLabel || 'Set Atual'}
                  </span>
                </>
              ) : (
                <>
                  <div className="px-4 py-1.5 rounded-full bg-[#F3F4F9] border border-slate-200/80 text-slate-900 font-display font-extrabold text-base sm:text-lg tabular-nums">
                    {resolvedMatch ? `${homeScore} - ${awayScore}` : '— : —'}
                  </div>
                  {sheet?.timer?.periodLabel && (
                    <span className="block text-[11px] font-semibold text-slate-400 mt-1">
                      ({sheet.timer.periodLabel})
                    </span>
                  )}
                </>
              )}
              {sheet?.periodScores &&
                sheet.periodScores.some((p) => p.homeScore > 0 || p.awayScore > 0 || p.isFinished) && (
                  <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1">
                    {sheet.periodScores
                      .filter((p) => p.homeScore > 0 || p.awayScore > 0 || p.isFinished)
                      .map((p) => (
                        <span
                          key={p.periodNumber}
                          className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-mono font-bold text-slate-600"
                        >
                          {p.label}: {p.homeScore}-{p.awayScore}
                        </span>
                      ))}
                  </div>
                )}
              {liveVolleyballRotation &&
                (resolvedMatch?.status === 'live' ||
                  resolvedMatch?.status === 'halftime') && (
                  <div className="mt-2 flex justify-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-display font-extrabold text-emerald-800">
                      <span>🏐 Sacando:</span>
                      <span>
                        {liveVolleyballRotation.currentServer
                          ? `${
                              liveVolleyballRotation.currentServer.jerseyNumber !=
                              null
                                ? `#${liveVolleyballRotation.currentServer.jerseyNumber} `
                                : ''
                            }${liveVolleyballRotation.currentServer.athleteName.split(' ')[0]} (${
                              liveVolleyballRotation.currentServingSide === 'home'
                                ? homeName
                                : awayName
                            })`
                          : liveVolleyballRotation.currentServingSide === 'home'
                          ? homeName
                          : awayName}
                      </span>
                    </span>
                  </div>
                )}
            </div>

            <div className="flex items-center justify-start gap-2.5 text-left min-w-0">
              <TeamCrest
                crestUrl={resolvedMatch?.awayTeam.crestUrl}
                teamName={resolvedMatch?.awayTeam.teamName}
                teamId={resolvedMatch?.awayTeam.teamId}
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
                      {ev.athleteName
                        ? `${ev.athleteName}${ev.type === 'own_goal' ? ' (GC)' : ''}`
                        : ev.typeLabel}{' '}
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
                      {ev.athleteName
                        ? `${ev.athleteName}${ev.type === 'own_goal' ? ' (GC)' : ''}`
                        : ev.typeLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tênis de Mesa: Placar ao vivo das 3 Partidas Individuais do Confronto */}
          {sheet?.scoringModel === 'team_submatches' &&
            Array.isArray(sheet.subMatches) &&
            sheet.subMatches.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <span className="block text-[10px] font-display font-extrabold uppercase tracking-wider text-center text-[#0B218A]">
                  Jogos Individuais do Confronto (Melhor de 3)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {sheet.subMatches.map((sm) => (
                    <div
                      key={sm.id}
                      className={`rounded-xl border p-2.5 text-xs ${
                        sm.status === 'live'
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : sm.status === 'finished'
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-white border-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                        <span className="text-[#0B218A]">{sm.label}</span>
                        <span
                          className={
                            sm.status === 'live'
                              ? 'text-emerald-700'
                              : 'text-slate-400'
                          }
                        >
                          {sm.status === 'finished'
                            ? 'Fim'
                            : sm.status === 'live'
                            ? 'Ao Vivo'
                            : 'A seguir'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="truncate font-semibold text-slate-700">
                          {sm.homeAthleteName}
                        </span>
                        <span className="font-mono font-extrabold text-[#0B218A]">
                          {sm.homeSetsWon} ({sm.currentSetHomePoints})
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="truncate font-semibold text-slate-700">
                          {sm.awayAthleteName}
                        </span>
                        <span className="font-mono font-extrabold text-[#10B981]">
                          {sm.awaySetsWon} ({sm.currentSetAwayPoints})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          <div className="mt-4 pt-3 border-t border-slate-100 text-center space-y-0.5">
            <p className="text-xs font-bold text-slate-600">
              {resolvedMatch?.venue || 'Local a definir'}
              {resolvedMatch?.scheduledTime ? ` • ${resolvedMatch.scheduledTime}` : ''}
            </p>
            {sheet?.tableOfficialName && (
              <p className="text-[11px] font-bold text-emerald-700 pt-0.5">
                Mesário: {sheet.tableOfficialName}
              </p>
            )}
          </div>
        </section>

        {/* LINHA DO TEMPO COMPLETA LANCE A LANCE (Estilo Sofascore / Flashscore) */}
        <section className="all-sports-card p-5 sm:p-6 space-y-4">
          <div className="all-sports-section-pill flex items-center justify-between gap-2 px-4">
            <span>Lances</span>
            <span className="text-[10px] font-mono font-bold text-[#0B218A]">
              {events.length}
            </span>
          </div>

          {events.length > 0 ? (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {events.map((ev) => {
                const isHome = ev.teamSide === 'home';
                const isAway = ev.teamSide === 'away';
                const isScore = SCORING_TYPES.includes(ev.type);
                const isYellow = ev.type === 'yellow_card';
                const isRed = ev.type === 'red_card' || ev.type === 'expulsion';

                return (
                  <div
                    key={ev.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                      isScore
                        ? 'bg-emerald-50/70 border-emerald-200'
                        : isRed
                        ? 'bg-rose-50/70 border-rose-200'
                        : isYellow
                        ? 'bg-amber-50/70 border-amber-200'
                        : 'bg-[#F8FAFC] border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-mono font-extrabold text-[#0B218A] shrink-0">
                        {ev.matchClockDisplay || '--:--'}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-xs font-display font-extrabold ${
                              isScore
                                ? 'text-emerald-800'
                                : isRed
                                ? 'text-rose-700'
                                : isYellow
                                ? 'text-amber-800'
                                : 'text-slate-900'
                            }`}
                          >
                            {ev.typeLabel}
                          </span>
                          {ev.periodLabel && (
                            <span className="text-[10px] font-bold text-slate-400">
                              • {ev.periodLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-700 truncate">
                          {ev.athleteName
                            ? `${ev.athleteNumber ? `#${ev.athleteNumber} ` : ''}${ev.athleteName}`
                            : ev.teamName || 'Arbitragem / Mesa Oficial'}
                          {ev.secondaryAthleteName
                            ? ` (Assist./Troca: ${ev.secondaryAthleteName})`
                            : ''}
                        </p>
                      </div>
                    </div>

                    {(isHome || isAway) && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-display font-extrabold shrink-0 ${
                          isHome
                            ? 'bg-[#0B218A] text-white'
                            : 'bg-[#10B981] text-white'
                        }`}
                      >
                        {isHome ? homeName : awayName}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-5 text-center">
              <p className="text-xs font-display font-bold text-slate-400">
                Sem lances registrados
              </p>
            </div>
          )}
        </section>

        {/* ABA 1: DETALHES */}
        {activeTab === 'details' && (
          <>
            {/* 3. CARD "RITMO DE JOGO & ARTILHEIROS/DESTAQUES REAIS" */}
            <section className="all-sports-card p-5 sm:p-6 space-y-4">
              <div className="all-sports-section-pill">
                Ritmo de Jogo
              </div>

              {events.some((e) => e.teamSide === 'home' || e.teamSide === 'away') ? (
                <>
                  <div className="rounded-2xl overflow-hidden border border-slate-200/70">
                    {/* Metade Superior Verde (Mandante) */}
                    <div className="h-16 bg-gradient-to-b from-emerald-100/80 to-emerald-50/40 px-3 flex items-end justify-between gap-1 border-b border-slate-200/80">
                      {threatBars.map((bar, idx) => (
                        <div
                          key={`top-${idx}`}
                          className="flex-1 rounded-t-sm bg-[#10B981] transition-all duration-300"
                          style={{
                            height:
                              bar.side === 'home' ? `${Math.min(95, bar.value)}%` : '6%',
                            opacity: bar.side === 'home' ? 0.95 : 0.15,
                          }}
                        />
                      ))}
                    </div>

                    {/* Metade Inferior Azul (Visitante) */}
                    <div className="h-16 bg-gradient-to-t from-blue-100/70 to-blue-50/40 px-3 flex items-start justify-between gap-1">
                      {threatBars.map((bar, idx) => (
                        <div
                          key={`bot-${idx}`}
                          className="flex-1 rounded-b-sm bg-[#2563EB] transition-all duration-300"
                          style={{
                            height:
                              bar.side === 'away' ? `${Math.min(95, bar.value)}%` : '6%',
                            opacity: bar.side === 'away' ? 0.9 : 0.15,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-1">
                    <span>Início da Partida</span>
                    <span>Lances Reais Registrados</span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-center text-slate-400 py-3">
                  O gráfico de ritmo de jogo será preenchido conforme os lances reais forem marcados na súmula.
                </p>
              )}

              {/* Destaques reais (somente se houver atletas pontuadores registrados na súmula) */}
              {(homeTopPerformer || awayTopPerformer) && (
                <div className="rounded-2xl bg-[#F3F4F9] p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#0B218A] text-white flex items-center justify-center shrink-0 font-display font-bold text-xs">
                      {homeName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="inline-block px-2 py-0.5 rounded bg-[#0B218A] text-white text-[10px] font-extrabold">
                        {homeTopPerformer ? `${homeTopPerformer.count} pts/gols` : '—'}
                      </span>
                      <span className="block text-xs font-bold text-slate-700 truncate mt-0.5">
                        {homeTopPerformer ? homeTopPerformer.name : homeName}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] font-display font-bold text-slate-500 shrink-0">
                    Pontuadores
                  </span>

                  <div className="flex items-center gap-2.5 min-w-0 text-right">
                    <div className="min-w-0">
                      <span className="inline-block px-2 py-0.5 rounded bg-[#10B981] text-white text-[10px] font-extrabold">
                        {awayTopPerformer ? `${awayTopPerformer.count} pts/gols` : '—'}
                      </span>
                      <span className="block text-xs font-bold text-slate-700 truncate mt-0.5">
                        {awayTopPerformer ? awayTopPerformer.name : awayName}
                      </span>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 font-display font-bold text-xs">
                      {awayName.slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('statistics')}
                  className="inline-flex items-center gap-1 text-xs font-display font-extrabold text-[#10B981] hover:underline"
                >
                  <CircleDot className="w-3.5 h-3.5" />
                  <span>Estatísticas</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </section>

            {/* 4. CARD "PALPITE DA TORCIDA" (100% VOTOS REAIS, INICIA EM 0 VOTOS) */}
            <section className="all-sports-card p-5 sm:p-6 space-y-4">
              <div className="all-sports-section-pill flex items-center justify-between gap-2 px-4">
                <span>Torcida • Quem Vence?</span>
                <span className="text-[10px] font-mono font-bold text-[#0B218A]">
                  {totalVotes} {totalVotes === 1 ? 'voto real' : 'votos reais'}
                </span>
              </div>

              {totalVotes > 0 ? (
                <div className="space-y-2">
                  <div className="h-3 rounded-full bg-slate-100 overflow-hidden flex">
                    {homePct > 0 && (
                      <div
                        className="h-full bg-[#1D63FF] transition-all duration-300"
                        style={{ width: `${homePct}%` }}
                      />
                    )}
                    {!isSetsMatch && drawPct > 0 && (
                      <div
                        className="h-full bg-[#FACC15] transition-all duration-300"
                        style={{ width: `${drawPct}%` }}
                      />
                    )}
                    {awayPct > 0 && (
                      <div
                        className="h-full bg-[#10B981] transition-all duration-300"
                        style={{ width: `${awayPct}%` }}
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-display font-bold text-slate-600">
                    <span className="text-[#1D63FF]">
                      {homeName}: {homePct}% ({votes.home})
                    </span>
                    {!isSetsMatch && (
                      <span className="text-amber-600">
                        Empate: {drawPct}% ({votes.draw})
                      </span>
                    )}
                    <span className="text-[#10B981]">
                      {awayName}: {awayPct}% ({votes.away})
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-center text-slate-400 py-1">
                  Nenhum voto registrado ainda nesta partida. Deixe sua torcida abaixo!
                </p>
              )}

              <div
                className={`grid ${
                  isSetsMatch ? 'grid-cols-2' : 'grid-cols-3'
                } gap-2.5 pt-2 border-t border-slate-100`}
              >
                <button
                  type="button"
                  onClick={() => handleVote('home')}
                  className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all touch-manipulation ${
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
                      {votes.home} {votes.home === 1 ? 'voto' : 'votos'}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleVote('away')}
                  className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all touch-manipulation ${
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
                      {votes.away} {votes.away === 1 ? 'voto' : 'votos'}
                    </span>
                  </div>
                </button>

                {!isSetsMatch && (
                  <button
                    type="button"
                    onClick={() => handleVote('draw')}
                    className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all touch-manipulation ${
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
                        {votes.draw} {votes.draw === 1 ? 'voto' : 'votos'}
                      </span>
                    </div>
                  </button>
                )}
              </div>
            </section>

            {/* 5. CARD "CARTÕES & SUBSTITUIÇÕES" */}
            <section className="all-sports-card p-5 sm:p-6 space-y-4">
              <div className="all-sports-section-pill flex items-center justify-center gap-2">
                <span>Cartões &amp; Alterações</span>
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
                <p className="text-xs text-center text-slate-400 py-3">
                  Sem cartões ou substituições.
                </p>
              )}
            </section>

            {/* 6. CARD "MESA OFICIAL" */}
            <section className="all-sports-card p-5 sm:p-6 space-y-4">
              <div className="all-sports-section-pill">
                Arbitragem &amp; Mesa
              </div>

              <div className="space-y-2.5 text-xs max-w-sm mx-auto">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-500">Árbitro / Mesa:</span>
                  <span className="font-display font-extrabold text-slate-800">
                    {sheet?.refereeName || 'Comissão Oficial'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="font-semibold text-slate-500">
                    Cartões:
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

              {resolvedMatch &&
                (canOperateOfficialData() ||
                  (resolvedMatch.status === 'finished' &&
                    Boolean(sheet?.isOfficialReleased))) && (
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => navigate(`/sumula/${resolvedMatch.id}/documento`)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F3F4F9] hover:bg-blue-50 border border-slate-200 text-xs font-display font-bold text-[#0B218A] transition-colors"
                  >
                    <FileText className="w-4 h-4 text-[#1D63FF]" />
                    <span>Ver Súmula (PDF)</span>
                  </button>
                </div>
              )}
            </section>
          </>
        )}

        {/* ABA 2: ESCALAÇÕES & VISUALIZAÇÃO TÁTICA EM CAMPO/QUADRA */}
        {activeTab === 'lineups' && (
          <section className="all-sports-card p-5 sm:p-6 space-y-5">
            <div className="all-sports-section-pill">
              Posicionamento Tático &amp; Escalações
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
                liveVolleyballRotation ? (
                  <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
                    {(['home', 'away'] as const).map((side) => {
                      const court =
                        side === 'home'
                          ? liveVolleyballRotation.homeCourt
                          : liveVolleyballRotation.awayCourt;
                      const isServing =
                        liveVolleyballRotation.currentServingSide === side;
                      const tName = side === 'home' ? homeName : awayName;
                      const frontRow = [
                        { idx: 3, label: 'P4' },
                        { idx: 2, label: 'P3' },
                        { idx: 1, label: 'P2' },
                      ];
                      const backRow = [
                        { idx: 4, label: 'P5' },
                        { idx: 5, label: 'P6' },
                        { idx: 0, label: 'P1 🏐' },
                      ];
                      return (
                        <div
                          key={side}
                          className="rounded-2xl bg-black/25 border border-white/25 p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between text-[11px] font-display font-extrabold">
                            <span className="truncate">{tName}</span>
                            {isServing && (
                              <span className="px-2 py-0.5 rounded-full bg-brand-yellow text-[#0B218A] text-[10px]">
                                🏐 No Saque
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] font-mono text-center text-white/75 uppercase tracking-wider bg-black/30 rounded py-0.5">
                            Rede (Zona de Ataque)
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {frontRow.map((slot) => {
                              const p = court[slot.idx];
                              return (
                                <div
                                  key={slot.label}
                                  onClick={() => p && navigate(`/atleta/${p.athleteId}`)}
                                  className="cursor-pointer rounded-xl bg-white/15 hover:bg-white/25 p-1.5 text-center border border-white/20"
                                >
                                  <span className="block text-[9px] font-mono text-brand-yellow font-bold">
                                    {slot.label}
                                  </span>
                                  <span className="block text-xs font-mono font-extrabold text-white">
                                    {p?.jerseyNumber != null ? `#${p.jerseyNumber}` : '•'}
                                  </span>
                                  <span className="block text-[10px] font-semibold truncate">
                                    {p ? p.athleteName.split(' ')[0] : '—'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-dashed border-white/25">
                            {backRow.map((slot) => {
                              const p = court[slot.idx];
                              const activeServer = slot.idx === 0 && isServing;
                              return (
                                <div
                                  key={slot.label}
                                  onClick={() => p && navigate(`/atleta/${p.athleteId}`)}
                                  className={`cursor-pointer rounded-xl p-1.5 text-center border ${
                                    activeServer
                                      ? 'bg-brand-yellow text-[#0B218A] border-white shadow-md'
                                      : 'bg-white/15 hover:bg-white/25 border-white/20'
                                  }`}
                                >
                                  <span
                                    className={`block text-[9px] font-mono font-bold ${
                                      activeServer ? 'text-[#0B218A]' : 'text-brand-yellow'
                                    }`}
                                  >
                                    {slot.label}
                                  </span>
                                  <span className="block text-xs font-mono font-extrabold">
                                    {p?.jerseyNumber != null ? `#${p.jerseyNumber}` : '•'}
                                  </span>
                                  <span className="block text-[10px] font-semibold truncate">
                                    {p ? p.athleteName.split(' ')[0] : '—'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
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
                )
              ) : (
                <div className="relative z-10 py-12 text-center space-y-2">
                  <p className="text-sm font-display font-extrabold text-white">
                    Escalações da Partida
                  </p>
                  <p className="text-xs text-white/80 max-w-md mx-auto">
                    As escalações das equipes aparecerão posicionadas aqui assim que a partida iniciar.
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
              Comparativo Estatístico da Partida
            </div>

            {[
              ...(isSetsMatch
                ? [
                    {
                      label: 'Sets Vencidos',
                      home: homeScore,
                      away: awayScore,
                    },
                    {
                      label: `Pontos no ${sheet?.timer?.periodLabel || 'Set Atual'}`,
                      home: homeCurrentSetPoints,
                      away: awayCurrentSetPoints,
                    },
                    {
                      label: 'Total de Pontos na Partida',
                      home: (sheet?.periodScores || []).reduce(
                        (s, p) => s + (p.homeScore ?? 0),
                        0
                      ),
                      away: (sheet?.periodScores || []).reduce(
                        (s, p) => s + (p.awayScore ?? 0),
                        0
                      ),
                    },
                  ]
                : [
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
                  ]),
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
