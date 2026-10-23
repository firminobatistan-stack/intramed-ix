import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  GitBranch,
  Trophy,
  BarChart3,
  Play,
  User,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  OFFICIAL_MODALITIES,
  INITIAL_BRACKETS,
} from '../data/officialData';
import { useCompetitionStore } from '../context/CompetitionStoreContext';
import { SportIcon } from '../components/sports/SportIcon';
import { Tabs, TabItem } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/EmptyState';
import { BracketView } from '../components/sports/BracketView';
import { StandingsTable } from '../components/sports/StandingsTable';
import { MatchCard } from '../components/sports/MatchCard';
import { ResultCard } from '../components/sports/ResultCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';

type ModalityTabId =
  | 'jogos'
  | 'resultados'
  | 'chaveamento'
  | 'classificacao'
  | 'estatisticas';

const MODALITY_TABS: TabItem[] = [
  { id: 'jogos', label: 'Jogos', icon: <Calendar className="w-4 h-4" /> },
  {
    id: 'resultados',
    label: 'Resultados',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  {
    id: 'chaveamento',
    label: 'Chaveamento',
    icon: <GitBranch className="w-4 h-4" />,
  },
  {
    id: 'classificacao',
    label: 'Classificação',
    icon: <Trophy className="w-4 h-4" />,
  },
  {
    id: 'estatisticas',
    label: 'Rankings & Destaques',
    icon: <BarChart3 className="w-4 h-4" />,
  },
];

export const ModalityDetailPage: React.FC = () => {
  const { modalityId } = useParams<{ modalityId: string }>();
  const navigate = useNavigate();
  const {
    visibleMatches,
    getSheetByMatchId,
    getModalityStandings,
    getModalityLeaderboard,
    isTestMode,
    canOperateOfficialData,
  } = useCompetitionStore();
  const isAdmin = canOperateOfficialData();
  const [activeTab, setActiveTab] = useState<ModalityTabId>('jogos');

  const modality = OFFICIAL_MODALITIES.find((m) => m.id === modalityId);

  if (!modality) {
    return (
      <div className="py-12">
        <EmptyState
          variant="matches"
          title="Modalidade não encontrada"
          message="Selecione uma modalidade oficial na tela de Competições."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/competicoes')}
            >
              Voltar para Competições
            </Button>
          }
        />
      </div>
    );
  }

  const modalityMatches = visibleMatches.filter(
    (m) => m.modalityId === modality.id && m.status !== 'finished'
  );
  const modalityResults = visibleMatches.filter(
    (m) => m.modalityId === modality.id && m.status === 'finished'
  );
  const modalityBracket = INITIAL_BRACKETS[modality.id] || null;
  const modalityStandings = getModalityStandings(modality.id);
  const leaderboard = getModalityLeaderboard(modality.id);

  // Eventos registrados na súmula da modalidade
  const allModalityEvents = visibleMatches
    .filter((m) => m.modalityId === modality.id)
    .flatMap((m) => getSheetByMatchId(m.id)?.events || [])
    .filter((ev) => !ev.isDeleted && ev.athleteName);

  const isVolley =
    modality.id === 'volei' || modality.id === 'volei-de-praia';

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Modalidade no estilo All Sports */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-blue-dark via-brand-blue to-brand-blue-medium text-white p-6 sm:p-7 shadow-elevated border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <img
          src="/assets/atletica/face-monocor.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute -right-4 -bottom-6 w-40 h-40 object-contain opacity-[0.07]"
        />
        <div className="relative z-10 flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-2xl bg-white/10 border border-white/20 text-brand-yellow flex items-center justify-center shrink-0 shadow-md">
            <SportIcon iconKey={modality.iconKey} className="w-8 h-8" />
            <span
              className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-brand-yellow ring-2 ring-brand-blue-dark"
              aria-hidden="true"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-display font-bold uppercase tracking-wider text-brand-yellow">
                INTRAMED IX
              </span>
              <span className="text-white/40">•</span>
              <span className="text-xs font-medium text-white/80">
                Modalidade Oficial
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white mt-0.5">
              {modality.name}
            </h2>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 self-start sm:self-center">
          {isTestMode && isAdmin && (
            <Button
              variant="accent"
              size="sm"
              leftIcon={<Play className="w-3.5 h-3.5" />}
              onClick={() => navigate(`/sumula/test-match-${modality.id}`)}
            >
              Abrir Súmula ({modality.name})
            </Button>
          )}
          <StatusBadge
            status={modalityMatches.length > 0 ? 'live' : 'pending'}
            label={
              modalityMatches.length > 0
                ? `${modalityMatches.length} jogo(s) ativo(s)`
                : 'Categorias Oficiais'
            }
          />
        </div>
      </div>

      {/* Navegação por Abas em Pílulas Arredondadas (Estilo All Sports) */}
      <div className="bg-white rounded-3xl border border-brand-surface-border p-2 shadow-card">
        <Tabs
          tabs={MODALITY_TABS}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as ModalityTabId)}
          variant="pill"
        />
      </div>

      {/* Conteúdo de cada Aba */}
      <div className="pt-1">
        {activeTab === 'jogos' && (
          <div className="space-y-4">
            {modalityMatches.length > 0 ? (
              modalityMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))
            ) : (
              <EmptyState
                variant="matches"
                title={`Jogos • ${modality.name}`}
                message="Os jogos desta modalidade aparecerão aqui."
              />
            )}
          </div>
        )}

        {activeTab === 'resultados' && (
          <div className="space-y-4">
            {modalityResults.length > 0 ? (
              modalityResults.map((match) => (
                <ResultCard key={match.id} match={match} />
              ))
            ) : (
              <EmptyState
                variant="results"
                title={`Resultados • ${modality.name}`}
                message="Os resultados aparecerão aqui após o encerramento das partidas."
              />
            )}
          </div>
        )}

        {activeTab === 'chaveamento' && (
          <BracketView
            bracket={modalityBracket}
            modalityId={modality.id}
            modalityName={modality.name}
          />
        )}

        {activeTab === 'classificacao' && (
          <StandingsTable
            standings={modalityStandings}
            modalityId={modality.id}
            modalityName={modality.name}
          />
        )}

        {activeTab === 'estatisticas' && (
          <div className="space-y-5">
            {isVolley && (
              <div className="all-sports-card p-5 flex items-center gap-3 bg-blue-50/70 border-blue-200 text-xs text-[#0B218A]">
                <Info className="w-5 h-5 text-[#1D63FF] shrink-0" />
                <div>
                  <strong>Pontuação Coletiva ({modality.name}):</strong> No INTRAMED IX, os sets e pontos de vôlei são computados diretamente para o período/equipe na aba <strong>Classificação</strong> (sem contagem individual de ataques ou bloqueios).
                </div>
              </div>
            )}

            {/* Ranking Individual da Modalidade (Artilharia, Cestinhas, Melhores Tempos, etc.) */}
            {!isVolley && (
              <section className="all-sports-card p-5 sm:p-6 space-y-4">
                <div className="all-sports-section-pill">
                  {leaderboard.title} • {modality.name}
                </div>

                {leaderboard.entries.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {leaderboard.entries.map((entry, idx) => (
                      <div
                        key={entry.athleteId}
                        onClick={() => navigate(`/atleta/${entry.athleteId}`)}
                        className="cursor-pointer py-3.5 px-2 hover:bg-slate-50 rounded-2xl transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-xl font-display font-extrabold text-xs flex items-center justify-center shrink-0 ${
                              idx === 0
                                ? 'bg-brand-yellow text-[#0B218A]'
                                : idx < 3
                                ? 'bg-[#0B218A] text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {idx + 1}º
                          </span>

                          <div className="w-10 h-10 rounded-full bg-[#0B218A] text-white flex items-center justify-center overflow-hidden shrink-0">
                            {entry.avatarUrl ? (
                              <img
                                src={entry.avatarUrl}
                                alt={entry.athleteName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-white/90" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-display font-extrabold text-slate-900 truncate">
                              {entry.athleteName}{' '}
                              {entry.jerseyNumber ? (
                                <span className="text-xs font-bold text-slate-400">
                                  #{entry.jerseyNumber}
                                </span>
                              ) : null}
                            </p>
                            <p
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/equipe/${entry.teamId}`);
                              }}
                              className="text-xs font-semibold text-[#1D63FF] hover:underline truncate"
                            >
                              {entry.teamName}
                              {entry.secondaryDisplay
                                ? ` • ${entry.secondaryDisplay}`
                                : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="block text-base font-display font-extrabold text-[#0B218A] tabular-nums">
                              {entry.primaryDisplay}
                            </span>
                            <span className="block text-[10px] font-bold uppercase text-slate-400">
                              {leaderboard.metricUnit}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    variant="stats"
                    title={leaderboard.title}
                    message="Assim que gols, cestas ou tempos forem lançados na Súmula Eletrônica desta modalidade, o ranking aparecerá automaticamente aqui."
                  />
                )}
              </section>
            )}

            {/* Linha do Tempo de Eventos Registrados na Súmula */}
            {allModalityEvents.length > 0 && (
              <div className="all-sports-card p-5 sm:p-6 space-y-3">
                <div className="all-sports-section-pill">
                  Eventos Registrados na Súmula ({modality.name})
                </div>
                <div className="divide-y divide-brand-surface-border text-xs">
                  {allModalityEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() =>
                        ev.athleteId && navigate(`/atleta/${ev.athleteId}`)
                      }
                      className={`py-2.5 flex items-center justify-between ${
                        ev.athleteId ? 'cursor-pointer hover:bg-slate-50 px-2 rounded-lg' : ''
                      }`}
                    >
                      <span className="font-semibold text-brand-text-primary">
                        {ev.athleteName} ({ev.teamName})
                      </span>
                      <span className="font-bold text-brand-blue">
                        {ev.typeLabel} • {ev.matchClockDisplay}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
