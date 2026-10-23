import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ClipboardList,
  FlaskConical,
  X,
} from 'lucide-react';
import { OFFICIAL_MODALITIES } from '../data/officialData';
import { useCompetitionStore } from '../context/CompetitionStoreContext';
import { MatchCard } from '../components/sports/MatchCard';
import { SportIcon } from '../components/sports/SportIcon';

type PeriodFilter = 'todos' | 'hoje' | 'proximos' | 'finalizados';

const TOURNAMENT_DAYS = [
  { id: 'todos', dayLabel: 'Todos os Dias', sub: 'Calendário Oficial INTRAMED IX' },
  { id: 'dia-1', dayLabel: 'Dia 1 • Abertura', sub: 'Fase de Grupos' },
  { id: 'dia-2', dayLabel: 'Dia 2 • Classificatórias', sub: 'Rodada Geral' },
  { id: 'dia-3', dayLabel: 'Dia 3 • Quartas de Final', sub: 'Eliminatórias' },
  { id: 'dia-4', dayLabel: 'Dia 4 • Semifinais', sub: 'Finais de Chave' },
  { id: 'dia-5', dayLabel: 'Dia 5 • Grandes Finais', sub: 'Disputa de Título' },
];

/**
 * TELA DE PARTIDAS (MATCH DAY — Modelada na Imagem 3 do Case "All Sports")
 * - Seletor "Match Day" no topo com setas laterais (◀ Today, 07 ⚽ Sep ▶) e subtítulo da competição;
 * - Abas de status (Todos, Ao Vivo, Próximos, Finalizados);
 * - Lista vertical de cards brancos arredondados (Ongoing Match, Finished Match, Upcoming Match).
 */
export const MatchesPage: React.FC = () => {
  const navigate = useNavigate();
  const { visibleMatches, isTestMode, setTestMode } = useCompetitionStore();

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('todos');
  const [dayIdx, setDayIdx] = useState<number>(0);
  const [selectedModality, setSelectedModality] = useState<string>('todas');

  const currentDay = TOURNAMENT_DAYS[dayIdx];

  const filteredMatches = visibleMatches.filter((match) => {
    if (selectedModality !== 'todas' && match.modalityId !== selectedModality) {
      return false;
    }
    if (periodFilter === 'proximos' && match.status !== 'scheduled') {
      return false;
    }
    if (periodFilter === 'finalizados' && match.status !== 'finished') {
      return false;
    }
    if (
      periodFilter === 'hoje' &&
      match.status !== 'live' &&
      match.status !== 'halftime'
    ) {
      return false;
    }
    return true;
  });

  const getEmptyMessageByFilter = (): string => {
    switch (periodFilter) {
      case 'hoje':
        return 'Não há jogos em andamento neste momento.';
      case 'finalizados':
        return 'Ainda não existem resultados finalizados.';
      case 'proximos':
      case 'todos':
      default:
        return 'Os jogos aparecerão aqui quando forem cadastrados.';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* 1. Cabeçalho "Match Day" com Setas Laterais (Idêntico ao topo da Imagem 3) */}
      <div className="flex flex-col items-center justify-center text-center pt-1">
        <div className="inline-flex items-center gap-4">
          <button
            type="button"
            onClick={() =>
              setDayIdx((prev) =>
                prev === 0 ? TOURNAMENT_DAYS.length - 1 : prev - 1
              )
            }
            aria-label="Dia anterior"
            className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#0B218A] hover:bg-blue-50 transition-colors shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 text-sm sm:text-base font-display font-extrabold text-[#0B218A]">
            <span>{currentDay.dayLabel}</span>
            <CircleDot className="w-4 h-4 text-[#0B218A]" />
          </div>

          <button
            type="button"
            onClick={() =>
              setDayIdx((prev) => (prev + 1) % TOURNAMENT_DAYS.length)
            }
            aria-label="Próximo dia"
            className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#0B218A] hover:bg-blue-50 transition-colors shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <span className="text-xs font-semibold text-slate-400 mt-1">
          {selectedModality === 'todas'
            ? currentDay.sub
            : OFFICIAL_MODALITIES.find((m) => m.id === selectedModality)?.name}
        </span>
      </div>

      {/* 2. Pílulas Horizontais de Modalidade */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setSelectedModality('todas')}
          className={`px-4 py-2 rounded-full text-xs font-display font-bold whitespace-nowrap transition-all shrink-0 ${
            selectedModality === 'todas'
              ? 'bg-[#0B218A] text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200/80 hover:border-[#0B218A]/40'
          }`}
        >
          Todas
        </button>
        {OFFICIAL_MODALITIES.map((mod) => {
          const active = selectedModality === mod.id;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => setSelectedModality(mod.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-display font-bold whitespace-nowrap transition-all shrink-0 ${
                active
                  ? 'bg-[#0B218A] text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:border-[#0B218A]/40'
              }`}
            >
              <SportIcon
                iconKey={mod.iconKey}
                className={`w-3.5 h-3.5 ${
                  active ? 'text-brand-yellow' : 'text-[#0B218A]'
                }`}
              />
              <span>{mod.name}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Barra de Status (Ongoing / Finished / Upcoming) + Atalhos */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1 bg-white p-1 rounded-full border border-slate-200/80 shadow-sm">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'hoje', label: 'Ao Vivo' },
            { id: 'proximos', label: 'Agendados' },
            { id: 'finalizados', label: 'Finalizados' },
          ].map((t) => {
            const active = periodFilter === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setPeriodFilter(t.id as PeriodFilter)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-display font-bold transition-all ${
                  active
                    ? 'bg-[#0B218A] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {selectedModality !== 'todas' && (
            <button
              type="button"
              onClick={() => setSelectedModality('todas')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-200/70 text-slate-700 text-xs font-semibold hover:bg-slate-200"
            >
              <span>Limpar filtro</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {!isTestMode && (
            <button
              type="button"
              onClick={() => setTestMode(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-display font-bold transition-colors"
            >
              <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
              <span>Testar Partida</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0B218A] text-white text-xs font-display font-bold hover:bg-blue-900 transition-colors"
          >
            <ClipboardList className="w-3.5 h-3.5 text-brand-yellow" />
            <span>Central de Súmulas</span>
          </button>
        </div>
      </div>

      {/* 4. Lista de Cards no Estilo All Sports */}
      {filteredMatches.length > 0 ? (
        <div className="space-y-4">
          {filteredMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      ) : (
        <MatchCard match={null} emptyMessage={getEmptyMessageByFilter()} />
      )}
    </div>
  );
};
