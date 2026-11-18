import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Flame, Medal, Sparkles, Trophy, User } from 'lucide-react';
import { useCompetitionStore } from '../context/CompetitionStoreContext';
import { ModalitySlug } from '../types/domain';
import { SportIcon } from '../components/sports/SportIcon';
import { StoryShareButton } from '../components/social/StoryShareModal';
import { EmptyState } from '../components/ui/EmptyState';
import { IntramedWarpShowcase } from '../components/sports/IntramedWarpShowcase';

type RankingTab =
  | 'geral'
  | 'futsal'
  | 'handebol'
  | 'basquete'
  | 'volei'
  | 'volei-de-praia';

type GenderFilter = 'Masculino' | 'Feminino';

interface RankedPlayer {
  athleteId: string;
  name: string;
  avatarUrl?: string | null;
  jerseyNumber?: number | null;
  teamId: string;
  teamName: string;
  teamCrestUrl?: string | null;
  value: number;
  secondaryLabel?: string;
  matchesPlayed: number;
  rank: number;
}

const RANKING_TABS: Array<{
  id: RankingTab;
  label: string;
  iconKey: ModalitySlug | 'geral';
  metricLabel: string;
}> = [
  { id: 'geral', label: 'Destaques Gerais', iconKey: 'geral', metricLabel: 'Vitórias' },
  { id: 'futsal', label: 'Futsal', iconKey: 'futsal', metricLabel: 'Gols' },
  { id: 'handebol', label: 'Handebol', iconKey: 'handebol', metricLabel: 'Gols' },
  { id: 'basquete', label: 'Basquete', iconKey: 'basquete', metricLabel: 'Pontos' },
  { id: 'volei', label: 'Vôlei', iconKey: 'volei', metricLabel: 'Vitórias' },
  { id: 'volei-de-praia', label: 'Vôlei de Praia', iconKey: 'volei-de-praia', metricLabel: 'Vitórias' },
];

function assignTiedRanks(items: Omit<RankedPlayer, 'rank'>[]): RankedPlayer[] {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  let currentRank = 1;
  return sorted.map((item, idx) => {
    if (idx > 0 && item.value < sorted[idx - 1].value) {
      currentRank = idx + 1;
    }
    return { ...item, rank: currentRank };
  });
}

export const TopPlayersPage: React.FC = () => {
  const navigate = useNavigate();
  const { visibleMatches, visibleAthletes, getTeamById, getSheetByMatchId } =
    useCompetitionStore();

  const [activeTab, setActiveTab] = useState<RankingTab>('futsal');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('Masculino');

  const activeTabMeta =
    RANKING_TABS.find((t) => t.id === activeTab) || RANKING_TABS[0];

  const rankedPlayers = useMemo<RankedPlayer[]>(() => {
    const acc = new Map<
      string,
      {
        athleteId: string;
        value: number;
        threePointers: number;
        matches: Set<string>;
        modalities: Set<string>;
      }
    >();

    const ensureEntry = (athleteId: string) => {
      let cur = acc.get(athleteId);
      if (!cur) {
        cur = {
          athleteId,
          value: 0,
          threePointers: 0,
          matches: new Set<string>(),
          modalities: new Set<string>(),
        };
        acc.set(athleteId, cur);
      }
      return cur;
    };

    const relevantMatches = visibleMatches.filter((m) => {
      if (m.status !== 'live' && m.status !== 'halftime' && m.status !== 'finished') {
        return false;
      }
      const cat = (m.categoryName || '').toLowerCase();
      if (genderFilter === 'Masculino' && cat.includes('fem')) return false;
      if (genderFilter === 'Feminino' && !cat.includes('fem')) return false;

      if (activeTab === 'geral') {
        return (
          m.modalityId === 'futsal' ||
          m.modalityId === 'handebol' ||
          m.modalityId === 'basquete' ||
          m.modalityId === 'volei' ||
          m.modalityId === 'volei-de-praia'
        );
      }
      return m.modalityId === activeTab;
    });

    for (const match of relevantMatches) {
      const sheet = getSheetByMatchId(match.id);
      if (!sheet) continue;

      const homeScore = match.homeTeam.score ?? 0;
      const awayScore = match.awayTeam.score ?? 0;
      const homeWon = match.status === 'finished' && homeScore > awayScore;
      const awayWon = match.status === 'finished' && awayScore > homeScore;

      const homeIds = new Set((sheet.homeLineup || []).map((l: { athleteId: string }) => l.athleteId));
      const awayIds = new Set((sheet.awayLineup || []).map((l: { athleteId: string }) => l.athleteId));

      for (const athId of [...homeIds, ...awayIds]) {
        const entry = ensureEntry(athId);
        entry.matches.add(match.id);
        entry.modalities.add(match.modalityId);

        if (activeTab === 'geral' || activeTab === 'volei' || activeTab === 'volei-de-praia') {
          if ((homeIds.has(athId) && homeWon) || (awayIds.has(athId) && awayWon)) {
            entry.value += 1;
          }
        }
      }

      if (activeTab === 'futsal' || activeTab === 'handebol') {
        for (const ev of sheet.events || []) {
          if (ev.isDeleted || !ev.athleteId) continue;
          if (
            ev.type === 'goal' ||
            ev.type === 'penalty_goal' ||
            ev.type === 'seven_meters' ||
            ev.type === 'direct_free_throw'
          ) {
            const entry = ensureEntry(ev.athleteId);
            entry.value += 1;
          }
        }
      } else if (activeTab === 'basquete') {
        for (const ev of sheet.events || []) {
          if (ev.isDeleted || !ev.athleteId) continue;
          const entry = ensureEntry(ev.athleteId);
          if (ev.type === 'point_1') entry.value += 1;
          else if (ev.type === 'point_2') entry.value += 2;
          else if (ev.type === 'point_3') {
            entry.value += 3;
            entry.threePointers += 1;
          }
        }
      }
    }

    const list: Omit<RankedPlayer, 'rank'>[] = [];
    for (const entry of acc.values()) {
      if (entry.value <= 0) continue;
      const ath = visibleAthletes.find((a) => a.id === entry.athleteId);
      if (!ath) continue;
      const team = getTeamById(ath.teamId);

      let secondaryLabel = `${entry.matches.size} ${entry.matches.size === 1 ? 'jogo' : 'jogos'}`;
      if (activeTab === 'basquete' && entry.threePointers > 0) {
        secondaryLabel = `${entry.threePointers}x de 3 pts • ${entry.matches.size}j`;
      } else if (activeTab === 'geral') {
        secondaryLabel = `${entry.modalities.size} ${entry.modalities.size === 1 ? 'esporte' : 'esportes'} • ${entry.matches.size}j`;
      }

      list.push({
        athleteId: ath.id,
        name: ath.name,
        avatarUrl: ath.avatarUrl,
        jerseyNumber: ath.jerseyNumber,
        teamId: ath.teamId,
        teamName: team?.name || ath.turmaLabel || 'Medicina UEMA',
        teamCrestUrl: team?.crestUrl,
        value: entry.value,
        secondaryLabel,
        matchesPlayed: entry.matches.size,
      });
    }

    return assignTiedRanks(list);
  }, [visibleMatches, visibleAthletes, activeTab, genderFilter, getSheetByMatchId, getTeamById]);

  const podiumPlayers = rankedPlayers.slice(0, 3);
  const restPlayers = rankedPlayers.slice(3);

  // Ordem visual do pódio: 2º (esquerda), 1º (centro), 3º (direita)
  const podiumVisualOrder = [
    podiumPlayers[1] || null,
    podiumPlayers[0] || null,
    podiumPlayers[2] || null,
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B218A] via-[#102a9e] to-[#1E3A8A] text-white p-6 shadow-elevated">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-yellow text-[#0B218A] text-[10px] font-display font-black uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              <span>Atualização ao Vivo • Súmula Oficial</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight">
              Artilharia &amp; Top Players
            </h1>
            <p className="text-xs sm:text-sm text-white/80">
              Os maiores goleadores, cestinhas e destaques positivos do INTRAMED IX.
            </p>
          </div>

          {/* Seletor Masculino / Feminino */}
          <div className="inline-flex p-1 rounded-2xl bg-black/25 border border-white/15 self-start sm:self-center">
            {(['Masculino', 'Feminino'] as GenderFilter[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGenderFilter(g)}
                className={`px-4 py-2 rounded-xl text-xs font-display font-extrabold transition-all ${
                  genderFilter === g
                    ? 'bg-brand-yellow text-[#0B218A] shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Vitrine 3D de Artilheiros, Elencos & Estatísticas */}
      <IntramedWarpShowcase initialMode="scorers" compact />

      {/* Abas de Modalidade */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {RANKING_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-display font-bold whitespace-nowrap transition-all shrink-0 ${
                active
                  ? 'bg-[#0B218A] text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:border-[#0B218A]/40'
              }`}
            >
              {tab.iconKey === 'geral' ? (
                <Trophy className={`w-3.5 h-3.5 ${active ? 'text-brand-yellow' : 'text-[#0B218A]'}`} />
              ) : (
                <SportIcon
                  iconKey={tab.iconKey}
                  className={`w-3.5 h-3.5 ${active ? 'text-brand-yellow' : 'text-[#0B218A]'}`}
                />
              )}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conteúdo */}
      {rankedPlayers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-card">
          <EmptyState
            variant="stats"
            title={`Ranking ${activeTabMeta.label} (${genderFilter})`}
            message="Assim que as partidas iniciarem e os mesários registrarem os gols, pontos ou vitórias na súmula oficial, o pódio aparecerá aqui automaticamente."
          />
        </div>
      ) : (
        <>
          {/* Pódio Visual Top 3 */}
          <section className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-4">
            {podiumVisualOrder.map((player, visualIdx) => {
              if (!player) {
                return <div key={`empty-${visualIdx}`} className="hidden sm:block" />;
              }

              const isFirst = visualIdx === 1;
              const isSecond = visualIdx === 0;
              const medalColor = isFirst
                ? 'from-amber-300 via-yellow-400 to-amber-500 text-[#0B218A] ring-amber-300'
                : isSecond
                ? 'from-slate-200 via-slate-300 to-slate-400 text-slate-900 ring-slate-300'
                : 'from-amber-600 via-orange-500 to-amber-700 text-white ring-orange-400';

              return (
                <div
                  key={player.athleteId}
                  onClick={() => navigate(`/atleta/${player.athleteId}`)}
                  className={`cursor-pointer group relative bg-white rounded-3xl border border-slate-200/90 shadow-card hover:shadow-lg transition-all p-3 sm:p-5 text-center flex flex-col items-center ${
                    isFirst ? 'sm:-mt-4 ring-2 ring-brand-yellow py-5 sm:py-6' : ''
                  }`}
                >
                  {/* Medalha / Posição */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r ${medalColor} text-[10px] sm:text-xs font-display font-black shadow-sm mb-2`}
                  >
                    <Medal className="w-3 h-3" />
                    <span>{player.rank}º</span>
                  </span>

                  {/* Foto do Atleta */}
                  <div className="relative mb-2">
                    <div
                      className={`${
                        isFirst ? 'w-16 h-16 sm:w-24 sm:h-24' : 'w-14 h-14 sm:w-20 sm:h-20'
                      } rounded-full bg-slate-100 border-2 border-white shadow-md overflow-hidden flex items-center justify-center`}
                    >
                      {player.avatarUrl ? (
                        <img
                          src={player.avatarUrl}
                          alt={player.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-7 h-7 text-brand-blue" />
                      )}
                    </div>
                    {player.teamCrestUrl && (
                      <img
                        src={player.teamCrestUrl}
                        alt={player.teamName}
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover bg-white border-2 border-white shadow absolute -bottom-1 -right-1"
                      />
                    )}
                  </div>

                  {/* Nome e Turma */}
                  <h3 className="text-xs sm:text-sm font-display font-extrabold text-slate-900 group-hover:text-brand-blue transition-colors line-clamp-1">
                    {player.name}
                  </h3>
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-500 truncate max-w-full">
                    {player.teamName} {player.jerseyNumber ? `• #${player.jerseyNumber}` : ''}
                  </p>

                  {/* Número em Destaque */}
                  <div className="mt-2.5 px-3 py-1 rounded-2xl bg-[#0B218A]/5 border border-[#0B218A]/10">
                    <span className="text-lg sm:text-2xl font-display font-black text-[#0B218A] block leading-none">
                      {player.value}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-500">
                      {activeTabMeta.metricLabel}
                    </span>
                  </div>

                  {isFirst && (
                    <div
                      className="mt-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <StoryShareButton
                        label="Stories"
                        className="!bg-slate-100 !text-slate-800 !border-slate-200 hover:!bg-slate-200 !text-[10px] !py-1 !px-2.5"
                        payload={{
                          type: 'athlete',
                          title: `${activeTabMeta.label} • ${genderFilter}`,
                          athleteName: player.name,
                          turmaName: player.teamName,
                          turmaShort: '',
                          jerseyNumber: player.jerseyNumber,
                          positionLabel: `${player.rank}º LUGAR • ${player.value} ${activeTabMeta.metricLabel.toUpperCase()}`,
                          avatarUrl: player.avatarUrl || player.teamCrestUrl,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          {/* Tabela Completa (4º em diante) */}
          {restPlayers.length > 0 && (
            <section className="bg-white rounded-3xl border border-slate-200/80 shadow-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-display font-extrabold text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-brand-blue" />
                  <span>Classificação Completa</span>
                </h3>
                <span className="text-xs font-semibold text-slate-400">
                  {rankedPlayers.length} atletas
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {restPlayers.map((player) => (
                  <div
                    key={player.athleteId}
                    onClick={() => navigate(`/atleta/${player.athleteId}`)}
                    className="cursor-pointer px-5 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 text-center font-display font-black text-sm text-slate-400">
                        {player.rank}º
                      </span>
                      <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                        {player.avatarUrl ? (
                          <img
                            src={player.avatarUrl}
                            alt={player.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-brand-blue" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-display font-bold text-slate-900 truncate">
                          {player.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">
                          {player.teamName} • {player.secondaryLabel}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-display font-black text-[#0B218A] block leading-none">
                        {player.value}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        {activeTabMeta.metricLabel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
export default TopPlayersPage;
