import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Medal, Timer, Trophy, Waves } from 'lucide-react';
import {
  computeSwimmingIndividualRankings,
  SWIMMING_EVENTS,
  SWIMMING_TEAM_META,
  SWIMMING_TEAM_TOTALS,
} from '../../data/swimmingResultsData';
import { TeamCrest } from './TeamCrest';

interface SwimmingResultsPanelProps {
  view: 'standings' | 'rankings';
}

export const SwimmingResultsPanel: React.FC<SwimmingResultsPanelProps> = ({
  view,
}) => {
  const navigate = useNavigate();
  const [rankingGenderFilter, setRankingGenderFilter] = useState<
    'all' | 'feminino' | 'masculino'
  >('all');
  const [eventFilter, setEventFilter] = useState<
    'all' | 'individual' | 'revezamento' | 'feminino' | 'masculino'
  >('all');

  const individualRankings = useMemo(
    () => computeSwimmingIndividualRankings(rankingGenderFilter),
    [rankingGenderFilter]
  );

  const filteredEvents = useMemo(() => {
    return SWIMMING_EVENTS.filter((ev) => {
      if (eventFilter === 'individual') return ev.kind === 'individual';
      if (eventFilter === 'revezamento') return ev.kind === 'revezamento';
      if (eventFilter === 'feminino') return ev.gender === 'feminino';
      if (eventFilter === 'masculino') return ev.gender === 'masculino';
      return true;
    });
  }, [eventFilter]);

  if (view === 'standings') {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl bg-white border border-brand-surface-border shadow-card overflow-hidden">
          <div className="px-5 py-3.5 bg-gradient-to-r from-brand-blue-dark via-brand-blue to-brand-blue-medium text-white flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-brand-yellow" />
              <h3 className="text-sm font-display font-extrabold text-white">
                Classificação Oficial das Equipes • Natação
              </h3>
            </div>
            <span className="text-[11px] font-bold text-brand-yellow bg-white/10 px-2.5 py-0.5 rounded-full">
              Geral: [10, 7, 4, 3, 0] × 1,5
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-brand-surface-border bg-brand-surface-muted/80 text-[11px] font-display font-extrabold uppercase tracking-wider text-brand-text-secondary">
                  <th className="py-3 pl-5 pr-2 w-12">#</th>
                  <th className="py-3 px-3">Equipe</th>
                  <th className="py-3 px-2.5 text-center">Fem (Ind + Rev)</th>
                  <th className="py-3 px-2.5 text-center">Masc (Ind + Rev)</th>
                  <th className="py-3 px-2.5 text-center text-brand-blue font-black">
                    Total Natação
                  </th>
                  <th className="py-3 pl-2.5 pr-5 text-center text-emerald-700 font-black">
                    Pts Geral (×1,5)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-surface-border text-xs tabular-nums">
                {SWIMMING_TEAM_TOTALS.map((row) => {
                  const meta = SWIMMING_TEAM_META[row.teamId];
                  return (
                    <tr
                      key={row.teamId}
                      onClick={() => navigate(`/equipe/${row.teamId}`)}
                      className="cursor-pointer hover:bg-slate-50/90 transition-colors"
                    >
                      <td className="py-3.5 pl-5 pr-2">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-display font-extrabold text-xs ${
                            row.position === 1
                              ? 'bg-brand-yellow text-[#0B218A]'
                              : row.position === 2
                              ? 'bg-slate-200 text-slate-800'
                              : row.position === 3
                              ? 'bg-amber-700/15 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {row.position}º
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <TeamCrest
                            crestUrl={meta.crestUrl}
                            teamName={row.teamName}
                            teamId={row.teamId}
                            size="sm"
                          />
                          <div>
                            <span className="font-display font-extrabold text-slate-900 block">
                              {row.teamName}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400">
                              {meta.tag} • {row.goldMedals}🥇 {row.silverMedals}🥈{' '}
                              {row.bronzeMedals}🥉
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-2.5 text-center text-slate-700 font-semibold">
                        <span className="font-bold text-slate-900">
                          {row.femTotalPts}
                        </span>{' '}
                        <span className="text-[10px] text-slate-400">
                          ({row.femIndividualPts} + {row.femRelayPts})
                        </span>
                      </td>
                      <td className="py-3.5 px-2.5 text-center text-slate-700 font-semibold">
                        <span className="font-bold text-slate-900">
                          {row.mascTotalPts}
                        </span>{' '}
                        <span className="text-[10px] text-slate-400">
                          ({row.mascIndividualPts} + {row.mascRelayPts})
                        </span>
                      </td>
                      <td className="py-3.5 px-2.5 text-center">
                        <span className="inline-block px-3 py-1 rounded-full bg-[#F3F4F9] font-display font-black text-sm text-[#0B218A]">
                          {row.totalSwimmingPts} pts
                        </span>
                      </td>
                      <td className="py-3.5 pl-2.5 pr-5 text-center">
                        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 font-display font-extrabold text-xs text-emerald-700">
                          +{String(row.generalChampionshipPts).replace('.', ',')} pts
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 bg-slate-50 border-t border-brand-surface-border text-[11px] text-slate-500 space-y-1">
            <p>
              <strong>Regra de Pontuação:</strong> Apenas os 6 primeiros colocados de cada categoria recebem pontuação. Em caso de desclassificação, o atleta ou a equipe não pontua. Em caso de W.O., a equipe perde 10 pontos e não pontua na categoria.
            </p>
            <p>
              A soma das 12 provas define a colocação final do <strong>1º ao 5º lugar</strong> na Natação, convertida para a Classificação Geral com o peso oficial (<strong>10, 7, 4, 3, 0 × 1,5</strong> → <strong>15 / 10,5 / 6 / 4,5 / 0</strong>).
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. RANKING PESSOAL DE NADADORES (SOMA DE PONTOS INDIVIDUAIS E TEMPOS) */}
      <section className="all-sports-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="all-sports-section-pill flex items-center gap-2">
            <Medal className="w-3.5 h-3.5 text-[#0B218A]" />
            <span>Ranking Pessoal de Atletas • Natação</span>
          </div>

          <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-full">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'feminino', label: 'Feminino' },
              { id: 'masculino', label: 'Masculino' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  setRankingGenderFilter(
                    opt.id as 'all' | 'feminino' | 'masculino'
                  )
                }
                className={`px-3 py-1 rounded-full text-xs font-display font-bold transition-all ${
                  rankingGenderFilter === opt.id
                    ? 'bg-[#0B218A] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {individualRankings.map((ath) => {
            const meta = SWIMMING_TEAM_META[ath.teamId];
            return (
              <div
                key={`${ath.name}_${ath.teamId}_${ath.gender}`}
                className="py-3 px-2 hover:bg-slate-50 rounded-2xl transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-xl font-display font-extrabold text-xs flex items-center justify-center shrink-0 ${
                      ath.rank === 1
                        ? 'bg-brand-yellow text-[#0B218A]'
                        : ath.rank <= 3
                        ? 'bg-[#0B218A] text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {ath.rank}º
                  </span>

                  <TeamCrest
                    crestUrl={meta.crestUrl}
                    teamName={meta.name}
                    teamId={ath.teamId}
                    size="sm"
                  />

                  <div className="min-w-0">
                    <p className="text-sm font-display font-extrabold text-slate-900 truncate">
                      {ath.name}{' '}
                      <span className="text-[11px] font-semibold text-slate-400">
                        ({meta.name})
                      </span>
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      {ath.eventsSummary.map((ev, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            ev.disqualified
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span>
                            {ev.eventTitle.replace(/ Feminino| Masculino/, '')}:
                          </span>
                          <strong className="font-mono">
                            {ev.disqualified
                              ? 'DSQ'
                              : `${ev.timeDisplay}s (${ev.placement}º)`}
                          </strong>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {(ath.gold > 0 || ath.silver > 0 || ath.bronze > 0) && (
                    <span className="text-xs font-bold text-slate-600">
                      {ath.gold > 0 ? `${ath.gold}🥇 ` : ''}
                      {ath.silver > 0 ? `${ath.silver}🥈 ` : ''}
                      {ath.bronze > 0 ? `${ath.bronze}🥉` : ''}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full bg-[#F3F4F9] text-xs font-display font-black text-[#0B218A] tabular-nums">
                    {ath.totalPoints} pts
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. TEMPOS OFICIAIS POR PROVA (12 PROVAS DO PDF) */}
      <section className="space-y-4">
        <div className="all-sports-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-[#0B218A]" />
            <h3 className="text-sm font-display font-extrabold text-slate-900">
              Tempos Oficiais por Prova (12 Provas)
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-full">
            {[
              { id: 'all', label: 'Todas (12)' },
              { id: 'individual', label: 'Individuais (8)' },
              { id: 'revezamento', label: 'Revezamentos (4)' },
              { id: 'feminino', label: 'Feminino' },
              { id: 'masculino', label: 'Masculino' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  setEventFilter(
                    opt.id as
                      | 'all'
                      | 'individual'
                      | 'revezamento'
                      | 'feminino'
                      | 'masculino'
                  )
                }
                className={`px-3 py-1 rounded-full text-xs font-display font-bold transition-all ${
                  eventFilter === opt.id
                    ? 'bg-[#0B218A] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredEvents.map((ev) => (
            <div
              key={ev.id}
              className="rounded-3xl bg-white border border-brand-surface-border shadow-card overflow-hidden"
            >
              <div className="px-4 py-3 bg-gradient-to-r from-[#0B218A] to-[#1D4ED8] text-white flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-brand-yellow shrink-0" />
                  <h4 className="text-xs sm:text-sm font-display font-extrabold text-white">
                    {ev.number}. {ev.title}
                  </h4>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15 text-brand-yellow">
                  {ev.kind === 'revezamento' ? 'Revezamento' : 'Individual'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-display font-extrabold uppercase tracking-wider text-slate-500">
                      <th className="py-2 pl-4 pr-2 w-12">Col.</th>
                      <th className="py-2 px-2">
                        {ev.kind === 'revezamento' ? 'Equipe' : 'Atleta'}
                      </th>
                      <th className="py-2 px-2 text-right">Tempo</th>
                      <th className="py-2 pl-2 pr-4 text-right w-16">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ev.results.map((r, idx) => {
                      const meta = SWIMMING_TEAM_META[r.teamId];
                      return (
                        <tr
                          key={`${ev.id}_${idx}`}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-2.5 pl-4 pr-2">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-lg font-display font-extrabold text-[11px] ${
                                r.disqualified
                                  ? 'bg-rose-50 text-rose-600'
                                  : r.placement === 1
                                  ? 'bg-brand-yellow text-[#0B218A]'
                                  : r.placement === 2
                                  ? 'bg-slate-200 text-slate-800'
                                  : r.placement === 3
                                  ? 'bg-amber-700/15 text-amber-800'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {r.placement}º
                            </span>
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <TeamCrest
                                crestUrl={meta.crestUrl}
                                teamName={meta.name}
                                teamId={r.teamId}
                                size="sm"
                              />
                              <span className="font-bold text-slate-800 truncate">
                                {r.name}
                              </span>
                              {ev.kind === 'individual' && (
                                <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                                  ({meta.name})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold">
                            {r.disqualified ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-display font-extrabold">
                                {r.timeDisplay}
                              </span>
                            ) : (
                              <span className="text-slate-800">
                                {r.timeDisplay}
                                {ev.kind === 'individual' ? 's' : ''}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pl-2 pr-4 text-right font-display font-extrabold text-[#0B218A]">
                            {r.disqualified ? '—' : r.points}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
