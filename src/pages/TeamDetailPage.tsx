import React, { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Bell,
  Camera,
  ChevronRight,
  CloudLightning,
  Heart,
  Palette,
  Shield,
  Shirt,
  Sparkles,
  User,
  UserPlus,
} from 'lucide-react';
import { OFFICIAL_MODALITIES } from '../data/officialData';
import { ModalitySlug } from '../types/domain';
import { TeamCrest } from '../components/sports/TeamCrest';
import { StandingsTable } from '../components/sports/StandingsTable';
import { EmptyState } from '../components/ui/EmptyState';
import { useCompetitionStore } from '../context/CompetitionStoreContext';
import { MatchCard } from '../components/sports/MatchCard';
import { SportIcon } from '../components/sports/SportIcon';

type TeamTabId = 'overview' | 'table' | 'squad' | 'matches';

/**
 * PÁGINA INDIVIDUAL DAS 5 EQUIPES OFICIAIS (/equipe/:teamId):
 * - Colossal (/equipe/colossal) -> Verde Esmeralda & Dourado (#065F46 / #022C22 + #FACC15) + Escudo Crocodilo
 * - Soberana (/equipe/soberana) -> Grená Imperial & Ouro (#6B0F24 / #3B0612 + #F59E0B) + Escudo Águia
 * - Sanguinária (/equipe/sanguinaria) -> Vermelho Vivo & Chamas (#DC2626 / #7F1D1D + #FACC15) + Escudo Dragão
 * - Predadora (/equipe/predadora) -> Amarelo Ouro & Preto (#CA8A04 / #18181B + #FACC15) + Escudo Onça
 * - Tormenta (/equipe/tormenta) -> Página pré-pronta com botão para anexar o escudo oficial assim que disponível
 */
export const TeamDetailPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const crestInputRef = useRef<HTMLInputElement | null>(null);

  const {
    visibleTeams,
    visibleMatches,
    getTeamById,
    getAthletesByTeam,
    getTeamStats,
    getModalityStandings,
    favoriteTeamIds,
    toggleFavoriteTeam,
    updateTeamCrest,
    canOperateOfficialData,
  } = useCompetitionStore();
  const isAdmin = canOperateOfficialData();

  const [activeTab, setActiveTab] = useState<TeamTabId>('overview');
  const [selectedModality, setSelectedModality] = useState<ModalitySlug | 'all'>(
    'all'
  );
  const [crestFeedback, setCrestFeedback] = useState<string | null>(null);

  const resolvedTeam =
    (teamId ? getTeamById(teamId) : undefined) || visibleTeams[0] || null;

  const primaryHex = resolvedTeam?.theme?.primaryHex || '#0B218A';
  const secondaryHex = resolvedTeam?.theme?.secondaryHex || '#061356';
  const accentHex = resolvedTeam?.theme?.accentHex || '#FACC15';
  const colorLabel = resolvedTeam?.theme?.colorLabel || 'Azul Royal & Amarelo';

  const teamStats = resolvedTeam
    ? getTeamStats(
        resolvedTeam.id,
        selectedModality === 'all' ? undefined : selectedModality
      )
    : null;

  const teamSquad = resolvedTeam
    ? getAthletesByTeam(
        resolvedTeam.id,
        selectedModality === 'all' ? undefined : selectedModality
      )
    : [];

  const teamMatches = resolvedTeam
    ? visibleMatches.filter(
        (m) =>
          (m.homeTeam.teamId === resolvedTeam.id ||
            m.awayTeam.teamId === resolvedTeam.id) &&
          (selectedModality === 'all' ? true : m.modalityId === selectedModality)
      )
    : [];

  const nextMatch =
    teamMatches.find((m) => m.status === 'live' || m.status === 'halftime') ||
    teamMatches.find((m) => m.status === 'scheduled') ||
    teamMatches[0] ||
    null;

  const standings = getModalityStandings(selectedModality);

  const isFavorited = resolvedTeam
    ? favoriteTeamIds.includes(resolvedTeam.id)
    : false;

  const handleCrestUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !resolvedTeam) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateTeamCrest(resolvedTeam.id, reader.result);
        setCrestFeedback(`Escudo oficial da ${resolvedTeam.name} atualizado!`);
        setTimeout(() => setCrestFeedback(null), 3500);
      }
    };
    reader.readAsDataURL(file);
  };

  // Monta as 5 cápsulas verticais de "Previous Games"
  const capsules = Array.from({ length: 5 }, (_, idx) => {
    const real = teamStats?.recentCapsules[idx];
    if (real) {
      return {
        id: real.matchId,
        matchId: real.matchId,
        score: `${real.teamScore ?? 0}:${real.opponentScore ?? 0}`,
        opponent: real.opponentName,
        opponentCrest: real.opponentCrestUrl,
        dot:
          real.outcome === 'W'
            ? 'bg-emerald-500'
            : real.outcome === 'L'
            ? 'bg-rose-500'
            : 'bg-amber-400',
      };
    }
    return {
      id: `empty-${idx}`,
      matchId: null,
      score: '—:—',
      opponent: 'Aguardando',
      opponentCrest: null,
      dot: 'bg-slate-300',
    };
  });

  const tabs: Array<{ id: TeamTabId; label: string }> = [
    { id: 'overview', label: 'Visão Geral' },
    { id: 'table', label: 'Tabela' },
    { id: 'squad', label: `Elenco (${teamSquad.length})` },
    { id: 'matches', label: 'Partidas' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* 0. BARRA DE NAVEGAÇÃO RÁPIDA ENTRE AS 5 EQUIPES OFICIAIS (COM ESCUDOS E CORES DE CADA UMA) */}
      <div className="all-sports-card p-3.5">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-display font-extrabold uppercase tracking-wider text-slate-400">
            5 Atléticas / Períodos Oficiais • INTRAMED IX
          </span>
          <span className="text-[11px] font-semibold text-slate-400">
            Toque para trocar de página
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {visibleTeams.map((t) => {
            const isSelected = resolvedTeam?.id === t.id;
            const tPrimary = t.theme?.primaryHex || '#0B218A';
            const tSecondary = t.theme?.secondaryHex || '#061356';
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => navigate(`/equipe/${t.id}`)}
                style={
                  isSelected
                    ? {
                        background: `linear-gradient(135deg, ${tPrimary} 0%, ${tSecondary} 100%)`,
                      }
                    : undefined
                }
                className={`flex items-center gap-2.5 p-2 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'text-white border-transparent shadow-md scale-[1.02]'
                    : 'bg-[#F8FAFC] hover:bg-slate-100 text-slate-800 border-slate-200/80'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-black/20 border border-white/25 overflow-hidden flex items-center justify-center shrink-0">
                  {t.crestUrl ? (
                    <img
                      src={t.crestUrl}
                      alt={t.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <CloudLightning
                      className={`w-4 h-4 ${
                        isSelected ? 'text-sky-300' : 'text-slate-500'
                      }`}
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-display font-extrabold truncate">
                    {t.name}
                  </span>
                  <span
                    className={`block text-[10px] font-bold truncate ${
                      isSelected ? 'text-white/80' : 'text-slate-400'
                    }`}
                  >
                    {t.shortName}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. HEADER IMERSIVO PERSONALIZADO COM A COR PREDOMINANTE E O ESCUDO DA EQUIPE */}
      <section className="overflow-hidden rounded-[28px] bg-white shadow-xl border border-slate-200/80">
        <div
          style={{
            background: `radial-gradient(circle at 85% 15%, ${accentHex}28 0%, transparent 42%), linear-gradient(135deg, ${primaryHex} 0%, ${secondaryHex} 100%)`,
          }}
          className="relative text-white px-6 pt-8 pb-7 text-center overflow-hidden"
        >
          {/* Marca d'água grande do próprio escudo da equipe ao fundo */}
          {resolvedTeam?.crestUrl && (
            <img
              src={resolvedTeam.crestUrl}
              alt=""
              aria-hidden="true"
              className="pointer-events-none select-none absolute -right-10 -bottom-10 w-64 h-64 object-contain opacity-[0.12] blur-[1px]"
            />
          )}

          {resolvedTeam && (
            <button
              type="button"
              onClick={() => toggleFavoriteTeam(resolvedTeam.id)}
              aria-label="Favoritar equipe"
              className="absolute right-4 top-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors"
            >
              <Heart
                className={`w-4 h-4 ${
                  isFavorited
                    ? 'fill-brand-yellow text-brand-yellow'
                    : 'text-white'
                }`}
              />
            </button>
          )}

          <div className="relative z-10 flex flex-col items-center">
            {/* Badge de Identidade Cromática da Equipe */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 border border-white/20 text-[10px] font-display font-extrabold uppercase tracking-wider text-white/95 mb-3">
              <Palette className="w-3.5 h-3.5" style={{ color: accentHex }} />
              <span>{colorLabel}</span>
              {resolvedTeam?.turmaLabel && (
                <>
                  <span>•</span>
                  <span style={{ color: accentHex }}>
                    {resolvedTeam.turmaLabel}
                  </span>
                </>
              )}
            </div>

            {/* Escudo Oficial Grande em Destaque */}
            <div className="relative group">
              <div
                style={{ borderColor: accentHex }}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-black/40 border-4 shadow-2xl flex items-center justify-center overflow-hidden"
              >
                {resolvedTeam?.crestUrl ? (
                  <img
                    src={resolvedTeam.crestUrl}
                    alt={`Escudo ${resolvedTeam.name}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-3 text-center">
                    <CloudLightning
                      className="w-10 h-10 mb-1"
                      style={{ color: accentHex }}
                    />
                    <span className="text-[10px] font-display font-extrabold uppercase tracking-wider text-white/90">
                      Escudo Tormenta
                    </span>
                  </div>
                )}
              </div>

              {isAdmin && (
                <>
                  <input
                    ref={crestInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCrestUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => crestInputRef.current?.click()}
                    title="Enviar ou atualizar escudo oficial desta equipe (Apenas Admin)"
                    style={{ backgroundColor: accentHex }}
                    className="absolute -right-2 -bottom-2 w-9 h-9 rounded-full text-slate-950 border-2 border-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            <h2 className="mt-4 text-2xl sm:text-4xl font-display font-black uppercase tracking-tight text-white drop-shadow">
              {resolvedTeam?.name || 'Equipe Oficial'}
            </h2>

            <p className="text-xs sm:text-sm font-semibold text-white/85 mt-1 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" style={{ color: accentHex }} />
              <span>
                {resolvedTeam?.mascotLabel || 'Representação Oficial'} •{' '}
                {resolvedTeam?.turmaLabel || 'Medicina UEMA'}
              </span>
            </p>

            {crestFeedback && (
              <p className="mt-3 px-3.5 py-1 rounded-full bg-black/40 text-xs font-bold text-white">
                {crestFeedback}
              </p>
            )}
          </div>
        </div>

        {/* Barra de Abas Branca com Sublinhado na Cor da Equipe */}
        <div className="grid grid-cols-4 border-b border-slate-100 px-2 bg-white">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative py-3.5 text-xs sm:text-sm font-display transition-colors ${
                  active
                    ? 'font-extrabold text-slate-900'
                    : 'font-semibold text-slate-400 hover:text-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                {active && (
                  <span
                    style={{ backgroundColor: primaryHex }}
                    className="absolute bottom-0 left-4 right-4 h-1 rounded-t-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Filtro Rápido por Modalidade da Equipe */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setSelectedModality('all')}
          style={
            selectedModality === 'all'
              ? { backgroundColor: primaryHex, color: '#FFFFFF' }
              : undefined
          }
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-display font-bold whitespace-nowrap transition-all shrink-0 ${
            selectedModality === 'all'
              ? 'shadow-md'
              : 'bg-white text-slate-600 border border-slate-200/80 hover:border-slate-400'
          }`}
        >
          <span>Todas as Modalidades</span>
        </button>
        {OFFICIAL_MODALITIES.map((mod) => {
          const active = selectedModality === mod.id;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => setSelectedModality(mod.id)}
              style={
                active
                  ? { backgroundColor: primaryHex, color: '#FFFFFF' }
                  : undefined
              }
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-display font-bold whitespace-nowrap transition-all shrink-0 ${
                active
                  ? 'shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:border-slate-400'
              }`}
            >
              <SportIcon
                iconKey={mod.iconKey}
                className={`w-3.5 h-3.5 ${
                  active ? 'text-white' : 'text-slate-700'
                }`}
              />
              <span>{mod.name}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Resumo Coletivo Básico da Equipe (Com a cor temática da equipe) */}
          {teamStats && (
            <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div
                style={{ borderTop: `3px solid ${primaryHex}` }}
                className="all-sports-card p-3.5 text-center"
              >
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  Jogos (J)
                </span>
                <p
                  style={{ color: primaryHex }}
                  className="text-xl font-display font-extrabold mt-0.5"
                >
                  {teamStats.matchesPlayed}
                </p>
              </div>
              <div
                style={{ borderTop: `3px solid ${primaryHex}` }}
                className="all-sports-card p-3.5 text-center"
              >
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  Vitórias (V)
                </span>
                <p className="text-xl font-display font-extrabold text-emerald-600 mt-0.5">
                  {teamStats.wins}
                </p>
              </div>
              <div
                style={{ borderTop: `3px solid ${primaryHex}` }}
                className="all-sports-card p-3.5 text-center"
              >
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  Empates (E)
                </span>
                <p className="text-xl font-display font-extrabold text-amber-500 mt-0.5">
                  {teamStats.draws}
                </p>
              </div>
              <div
                style={{ borderTop: `3px solid ${primaryHex}` }}
                className="all-sports-card p-3.5 text-center"
              >
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  Derrotas (D)
                </span>
                <p className="text-xl font-display font-extrabold text-rose-600 mt-0.5">
                  {teamStats.losses}
                </p>
              </div>
              <div
                style={{ borderTop: `3px solid ${primaryHex}` }}
                className="all-sports-card p-3.5 text-center col-span-2 sm:col-span-1"
              >
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  Pró / Contra
                </span>
                <p
                  style={{ color: primaryHex }}
                  className="text-xl font-display font-extrabold mt-0.5"
                >
                  {teamStats.goalsOrPointsFor}:{teamStats.goalsOrPointsAgainst}
                </p>
              </div>
            </section>
          )}

          {/* 2. CARD "NEXT MATCH / PRÓXIMO CONFRONTO DA EQUIPE" */}
          <section
            onClick={() => nextMatch && navigate(`/placar/${nextMatch.id}`)}
            className={`all-sports-card p-5 sm:p-6 ${
              nextMatch ? 'cursor-pointer hover:shadow-lg transition-all' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-display font-extrabold text-slate-900">
                  Próximo confronto • {resolvedTeam?.name}
                </h3>
                <span className="text-[11px] font-semibold text-slate-400">
                  {nextMatch?.scheduledDate || 'Calendário Oficial INTRAMED IX'}
                </span>
              </div>
              <span
                style={{ backgroundColor: `${primaryHex}15`, color: primaryHex }}
                className="px-3 py-1 rounded-full text-[10px] font-display font-extrabold uppercase tracking-wider"
              >
                {nextMatch?.modalityName || 'INTRAMED IX'}
              </span>
            </div>

            <div className="flex justify-center mb-2">
              <span
                style={{ color: primaryHex }}
                className="w-8 h-8 rounded-full bg-[#F3F4F9] border border-slate-200/80 flex items-center justify-center"
              >
                <Bell className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 max-w-md mx-auto">
              <div className="flex items-center justify-end gap-2.5 text-right min-w-0">
                <span className="text-xs sm:text-sm font-display font-bold text-slate-800 truncate">
                  {nextMatch?.homeTeam.teamName || resolvedTeam?.name}
                </span>
                <TeamCrest
                  crestUrl={
                    nextMatch?.homeTeam.crestUrl || resolvedTeam?.crestUrl
                  }
                  teamName={nextMatch?.homeTeam.teamName || resolvedTeam?.name}
                  size="md"
                />
              </div>

              <div className="text-center px-2">
                {nextMatch &&
                (nextMatch.status === 'live' ||
                  nextMatch.status === 'finished') ? (
                  <span
                    style={{ color: primaryHex }}
                    className="block text-sm font-display font-extrabold leading-none"
                  >
                    {nextMatch.homeTeam.score ?? 0} -{' '}
                    {nextMatch.awayTeam.score ?? 0}
                  </span>
                ) : (
                  <span className="block text-sm font-display font-extrabold text-[#EF4444] leading-none">
                    {nextMatch?.scheduledTime || 'A definir'}
                  </span>
                )}
                <span className="block text-[10px] font-bold uppercase text-slate-400 mt-1">
                  {nextMatch?.phaseLabel || 'AGUARDANDO TABELA'}
                </span>
              </div>

              <div className="flex items-center justify-start gap-2.5 text-left min-w-0">
                <TeamCrest
                  crestUrl={nextMatch?.awayTeam.crestUrl}
                  teamName={nextMatch?.awayTeam.teamName}
                  size="md"
                />
                <span className="text-xs sm:text-sm font-display font-bold text-slate-800 truncate">
                  {nextMatch?.awayTeam.teamName || 'Adversário a definir'}
                </span>
              </div>
            </div>

            <p className="mt-3 text-center text-[11px] font-semibold text-slate-400">
              {nextMatch?.venue || 'Ginásio Oficial • Medicina UEMA'}
            </p>
          </section>

          {/* 3. CARD "PREVIOUS GAMES / ÚLTIMOS JOGOS" COM 5 CÁPSULAS VERTICAIS */}
          <section className="all-sports-card p-5 sm:p-6 space-y-4">
            <div
              style={{ backgroundColor: `${primaryHex}14`, color: primaryHex }}
              className="all-sports-section-pill"
            >
              Últimos Jogos • {resolvedTeam?.name}
            </div>

            <div className="grid grid-cols-5 gap-2.5 sm:gap-4 max-w-md mx-auto">
              {capsules.map((item) => (
                <div
                  key={item.id}
                  onClick={() =>
                    item.matchId && navigate(`/placar/${item.matchId}`)
                  }
                  title={item.opponent}
                  className={`flex flex-col items-center justify-between py-3 px-2 rounded-full bg-[#F8FAFC] border border-slate-200/70 shadow-sm ${
                    item.matchId ? 'cursor-pointer hover:border-slate-400' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                    {item.opponentCrest ? (
                      <img
                        src={item.opponentCrest}
                        alt={item.opponent}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Shield
                        className="w-4 h-4"
                        style={{ color: primaryHex }}
                      />
                    )}
                  </div>
                  <span className="my-2.5 text-[11px] font-display font-extrabold text-slate-600 tabular-nums">
                    {item.score}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                </div>
              ))}
            </div>
          </section>

          {/* 4. CARD "POINT TABLE / QUADRO DE PONTOS ENTRE AS 5 EQUIPES" */}
          <section className="all-sports-card p-5 sm:p-6 space-y-4">
            <div
              style={{ backgroundColor: `${primaryHex}14`, color: primaryHex }}
              className="all-sports-section-pill"
            >
              Classificação Geral das 5 Equipes
            </div>
            <StandingsTable
              standings={standings}
              modalityId={
                selectedModality === 'all' ? 'futsal' : selectedModality
              }
            />
          </section>
        </>
      )}

      {activeTab === 'table' && (
        <section className="all-sports-card p-5 sm:p-6 space-y-4">
          <div
            style={{ backgroundColor: `${primaryHex}14`, color: primaryHex }}
            className="all-sports-section-pill"
          >
            Tabela de Classificação Geral
          </div>
          <StandingsTable
            standings={standings}
            modalityId={selectedModality === 'all' ? 'futsal' : selectedModality}
          />
        </section>
      )}

      {/* ABA 3: ELENCO DA EQUIPE */}
      {activeTab === 'squad' && (
        <section className="all-sports-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              style={{ backgroundColor: `${primaryHex}14`, color: primaryHex }}
              className="all-sports-section-pill flex-1"
            >
              Elenco Oficial • {resolvedTeam?.name}
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/admin')}
                style={{ backgroundColor: primaryHex }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-white text-xs font-display font-bold shadow-sm hover:opacity-95"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Inscrever Atleta na {resolvedTeam?.name}</span>
              </button>
            )}
          </div>

          {teamSquad.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {teamSquad.map((ath) => (
                <div
                  key={ath.id}
                  onClick={() => navigate(`/atleta/${ath.id}`)}
                  className="cursor-pointer p-3.5 rounded-2xl bg-[#F8FAFC] hover:bg-slate-100/80 border border-slate-200/80 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      style={{ backgroundColor: primaryHex }}
                      className="relative w-12 h-12 rounded-full text-white flex items-center justify-center overflow-hidden shrink-0 border-2 border-white shadow"
                    >
                      {ath.avatarUrl ? (
                        <img
                          src={ath.avatarUrl}
                          alt={ath.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-white/90" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          style={{
                            backgroundColor: primaryHex,
                            color: '#FFFFFF',
                          }}
                          className="px-2 py-0.5 rounded-md text-[10px] font-display font-black"
                        >
                          #{ath.jerseyNumber || '—'}
                        </span>
                        <h4 className="text-sm font-display font-extrabold text-slate-900 truncate">
                          {ath.name}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                        <Shirt
                          className="w-3 h-3 shrink-0"
                          style={{ color: primaryHex }}
                        />
                        <span>{ath.position || 'Atleta Inscrito'}</span>
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              variant="teams"
              title={`Elenco Oficial • ${resolvedTeam?.name}`}
              message={`Os atletas inscritos pela ${resolvedTeam?.name} aparecerão listados aqui. Você pode inscrevê-los na aba Cadastros do Painel Admin.`}
            />
          )}
        </section>
      )}

      {activeTab === 'matches' && (
        <div className="space-y-4">
          {teamMatches.length > 0 ? (
            teamMatches.map((m) => <MatchCard key={m.id} match={m} />)
          ) : (
            <MatchCard
              match={null}
              emptyMessage={`Os confrontos da ${resolvedTeam?.name} aparecerão aqui assim que forem agendados.`}
            />
          )}
        </div>
      )}
    </div>
  );
};
