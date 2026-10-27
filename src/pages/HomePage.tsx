import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Radio,
  Trophy,
  ClipboardList,
  Shield,
  User,
  FlaskConical,
  CircleDot,
  Sparkles,
  CreditCard,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { OFFICIAL_MODALITIES } from '../data/officialData';
import { useCompetitionStore } from '../context/CompetitionStoreContext';
import { useRegistrationStore } from '../context/RegistrationStoreContext';
import { SportIcon } from '../components/sports/SportIcon';
import { MatchCard } from '../components/sports/MatchCard';
import { StandingsTable } from '../components/sports/StandingsTable';

type HomeTimeFilter = 'all' | 'live' | 'upcoming' | 'finished';

const MATCH_DAYS = [
  { id: 'all', label: 'Hoje • Calendário Oficial', sub: 'INTRAMED IX • Medicina UEMA' },
  { id: 'dia-1', label: 'Dia 1 • Abertura & Fase de Grupos', sub: 'Ginásio Oficial' },
  { id: 'dia-2', label: 'Dia 2 • Rodada Classificatória', sub: 'Quadras & Piscina' },
  { id: 'dia-3', label: 'Dia 3 • Quartas de Final', sub: 'Mata-mata Oficial' },
  { id: 'dia-4', label: 'Dia 4 • Semifinais', sub: 'Arena Principal' },
  { id: 'dia-5', label: 'Dia 5 • Grandes Finais', sub: 'Decisão de Título' },
];

/**
 * TELA INICIAL — Modelada diretamente nas Imagens 1, 2 e 3 do Case "All Sports":
 * 1. Banner "Live TV / Watch Live" em Azul Royal com textura hexagonal, arte oficial da A.A.A. Cangaceira
 *    e botão central em Pílula Amarela ("((•)) Watch Live / Acompanhar Ao Vivo");
 * 2. Seletor "Match Day" com setas laterais (◀ Hoje • INTRAMED IX ▶) e pílulas de modalidades;
 * 3. Lista vertical de Cards Brancos no padrão "All Sports" (Ongoing Match, Upcoming Match, Finished Match);
 * 4. Seção inferior de Destaques, Classificação ("Point Table") e Perfis (Períodos e Atletas).
 */
export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    visibleMatches,
    visibleTeams,
    getModalityStandings,
    isTestMode,
    setTestMode,
    canOperateOfficialData,
  } = useCompetitionStore();
  const { hasCompletedRegistration, myRegistrations } = useRegistrationStore();
  const isAdmin = canOperateOfficialData();
  const [selectedSportFilter, setSelectedSportFilter] = useState<string>('todas');
  const [timeFilter, setTimeFilter] = useState<HomeTimeFilter>('all');
  const [dayIndex, setDayIndex] = useState<number>(0);

  const currentDay = MATCH_DAYS[dayIndex];
  const standings = getModalityStandings(
    selectedSportFilter === 'todas' ? 'all' : (selectedSportFilter as any)
  );

  const sportFiltered =
    selectedSportFilter === 'todas'
      ? visibleMatches
      : visibleMatches.filter((m) => m.modalityId === selectedSportFilter);

  const filteredMatches = sportFiltered.filter((m) => {
    if (timeFilter === 'live') return m.status === 'live' || m.status === 'halftime';
    if (timeFilter === 'upcoming') return m.status === 'scheduled';
    if (timeFilter === 'finished') return m.status === 'finished';
    return true;
  });

  const liveMatches = filteredMatches.filter(
    (m) => m.status === 'live' || m.status === 'halftime'
  );
  const upcomingMatches = filteredMatches.filter((m) => m.status === 'scheduled');
  const finishedMatches = filteredMatches.filter((m) => m.status === 'finished');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. HERO BANNER "LIVE TV / WATCH LIVE" (Idêntico ao topo das Imagens 1 e 2) */}
      <section className="relative overflow-hidden rounded-[28px] all-sports-header text-white p-6 sm:p-8 shadow-xl border border-white/15">
        {/* Marca d'água grande no fundo estilo "ARGENTINA vs GERMANY" da Imagem 2 */}
        <div
          aria-hidden="true"
          className="pointer-events-none select-none absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-between px-4 text-3xl sm:text-5xl font-display font-black uppercase tracking-widest text-white/[0.07]"
        >
          <span>INTRAMED</span>
          <span>CANGACEIRA</span>
        </div>

        {/* Composição Visual Central: Mascote / Troféu / Brasão + Botão Amarelo "Watch Live" */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-display font-bold uppercase tracking-wider text-brand-yellow mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>A.A.A. Cangaceira • Medicina UEMA</span>
          </div>

          <div className="grid grid-cols-3 items-center gap-4 sm:gap-8 w-full max-w-lg my-1">
            {/* Lado Esquerdo: Brasão Oficial */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 border border-white/20 p-2 flex items-center justify-center shadow-lg">
                <img
                  src="/assets/atletica/logo.png"
                  alt="Brasão A.A.A. Cangaceira"
                  className="w-full h-full object-contain drop-shadow"
                />
              </div>
              <span className="mt-2 text-xs font-display font-bold text-white/90">
                Medicina UEMA
              </span>
            </div>

            {/* Centro: Emblema / Troféu INTRAMED IX */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-b from-white/25 to-white/5 border border-white/25 flex items-center justify-center shadow-inner">
                <Trophy className="w-8 h-8 text-brand-yellow drop-shadow" />
              </div>
              <span className="mt-1.5 text-sm sm:text-base font-display font-black tracking-tight text-white">
                INTRAMED <span className="text-brand-yellow">IX</span>
              </span>
            </div>

            {/* Lado Direito: Mascote Oficial */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 border border-white/20 p-2 flex items-center justify-center shadow-lg">
                <img
                  src="/assets/atletica/mascote-cor.png"
                  alt="Mascote Cangaceira"
                  className="w-full h-full object-contain drop-shadow"
                />
              </div>
              <span className="mt-2 text-xs font-display font-bold text-white/90">
                16 Modalidades
              </span>
            </div>
          </div>

          {/* Botão Pílula Amarela Central "((•)) Watch Live" (Idêntico às Imagens 1 e 2) */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/placar')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#FACC15] hover:bg-[#EAB308] text-[#0F172A] font-display font-extrabold text-xs sm:text-sm shadow-[0_8px_20px_rgba(250,204,21,0.35)] transition-all hover:scale-105"
            >
              <Radio className="w-4 h-4 text-[#0F172A] animate-pulse" />
              <span>Acompanhar Ao Vivo</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-display font-bold text-xs transition-colors"
              >
                <ClipboardList className="w-3.5 h-3.5 text-brand-yellow" />
                <span>Operar Súmula</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* BANNER OFICIAL: INSCRIÇÕES E PAGAMENTOS (FASE 1) */}
      {!hasCompletedRegistration ? (
        <section className="bg-gradient-to-r from-amber-500 via-brand-yellow to-yellow-400 rounded-3xl p-5 sm:p-6 shadow-lg border border-amber-300 text-slate-900 flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden">
          <div className="space-y-1.5 z-10 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-brand-yellow text-[11px] font-display font-extrabold uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              1º Lote Oficial Disponível
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-black tracking-tight text-slate-950">
              Inscrições Abertas para o INTRAMED IX!
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-800 max-w-xl">
              Garanta seu <strong>Passaporte Geral</strong> pela sua turma (T21 Sanguinária, T22 Predadora, T23 Tormenta, T24 Colossal ou T25 Soberana) com acesso livre a todas as modalidades esportivas. Sócios Cangaceira com valor promocional de{' '}
              <strong className="font-extrabold text-slate-950 underline decoration-slate-900">R$ 45,00</strong>{' '}
              após validação cadastral da Atlética. Pagamentos 100% seguros com Pix e Cartão via Mercado Pago.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 z-10 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigate('/inscricao')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-display font-extrabold text-sm shadow-xl hover:scale-105 transition-all"
            >
              <CreditCard className="w-4 h-4 text-brand-yellow" />
              <span>Fazer Inscrição</span>
              <ArrowRight className="w-4 h-4 text-brand-yellow" />
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/admin/inscricoes')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/80 hover:bg-white text-slate-900 font-display font-bold text-xs shadow transition-all border border-amber-200"
              >
                <span>Gestão de Sócios</span>
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-50/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                Inscrição Registrada • INTRAMED IX
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {myRegistrations[0]?.athleteName} • {myRegistrations[0]?.turmaLabel || myRegistrations[0]?.teamName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => navigate('/inscricao')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition-all"
            >
              <span>Ver Minha Inscrição</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/admin/inscricoes')}
                className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all"
              >
                <span>Gestão</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* 2. SELETOR "MATCH DAY" COM SETAS LATERAIS (Idêntico ao topo da Imagem 3) */}
      <section className="flex flex-col items-center justify-center text-center pt-1">
        <div className="inline-flex items-center gap-4">
          <button
            type="button"
            onClick={() =>
              setDayIndex((prev) => (prev === 0 ? MATCH_DAYS.length - 1 : prev - 1))
            }
            aria-label="Dia anterior"
            className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#0B218A] hover:bg-blue-50 transition-colors shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 text-xs sm:text-sm font-display font-extrabold text-[#0B218A]">
            <span>{currentDay.label}</span>
            <CircleDot className="w-4 h-4 text-[#0B218A]" />
          </div>

          <button
            type="button"
            onClick={() => setDayIndex((prev) => (prev + 1) % MATCH_DAYS.length)}
            aria-label="Próximo dia"
            className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#0B218A] hover:bg-blue-50 transition-colors shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <span className="text-xs font-medium text-slate-400 mt-0.5">
          {currentDay.sub}
        </span>
      </section>

      {/* 3. FAIXA HORIZONTAL DE PÍLULAS DE MODALIDADES + FILTRO DE STATUS */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setSelectedSportFilter('todas')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-display font-bold whitespace-nowrap transition-all shrink-0 ${
              selectedSportFilter === 'todas'
                ? 'bg-[#0B218A] text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:border-[#0B218A]/40'
            }`}
          >
            <span>Todas as Modalidades</span>
          </button>

          {OFFICIAL_MODALITIES.map((modality) => {
            const active = selectedSportFilter === modality.id;
            return (
              <button
                key={modality.id}
                type="button"
                onClick={() => setSelectedSportFilter(modality.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-display font-bold whitespace-nowrap transition-all shrink-0 ${
                  active
                    ? 'bg-[#0B218A] text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:border-[#0B218A]/40'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    active ? 'bg-white/20 text-brand-yellow' : 'bg-slate-100 text-[#0B218A]'
                  }`}
                >
                  <SportIcon iconKey={modality.iconKey} className="w-3.5 h-3.5" />
                </span>
                <span>{modality.name}</span>
              </button>
            );
          })}
        </div>

        {/* Sub-filtro Rápido (Todos / Em Andamento / Próximos / Encerrados) */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 bg-white p-1 rounded-full border border-slate-200/80 shadow-sm">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'live', label: 'Ao Vivo' },
              { id: 'upcoming', label: 'Agendados' },
              { id: 'finished', label: 'Finalizados' },
            ].map((tab) => {
              const active = timeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTimeFilter(tab.id as HomeTimeFilter)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-display font-bold transition-all ${
                    active
                      ? 'bg-[#0B218A] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {!isTestMode && isAdmin && (
            <button
              type="button"
              onClick={() => setTestMode(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-display font-bold transition-colors"
            >
              <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
              <span>Simular Partida (Modo de Teste)</span>
            </button>
          )}
        </div>
      </section>

      {/* 4. LISTA DE PARTIDAS NO ESTILO "ALL SPORTS" (Imagens 2 e 3: Ongoing, Finished, Upcoming) */}
      <section className="space-y-4">
        {filteredMatches.length > 0 ? (
          <>
            {liveMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
            {upcomingMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
            {finishedMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </>
        ) : (
          <div className="space-y-4">
            <MatchCard
              match={null}
              emptyMessage="Os jogos aparecerão aqui quando forem cadastrados oficialmente."
            />
          </div>
        )}
      </section>

      {/* 5. PÁGINAS INDIVIDUAIS DAS 5 EQUIPES OFICIAIS (COLOSSAL, SOBERANA, SANGUINÁRIA, PREDADORA, TORMENTA) */}
      <section className="all-sports-card p-5 sm:p-6 space-y-4">
        <div className="all-sports-section-pill">
          As 5 Equipes Oficiais • Medicina UEMA
        </div>

        <div className="flex sm:grid sm:grid-cols-5 gap-3 overflow-x-auto no-scrollbar pb-2 sm:pb-0 snap-x">
          {visibleTeams.map((team) => {
            const pHex = team.theme?.primaryHex || '#0B218A';
            const sHex = team.theme?.secondaryHex || '#061356';
            const aHex = team.theme?.accentHex || '#FACC15';
            return (
              <button
                key={team.id}
                type="button"
                onClick={() => navigate(`/equipe/${team.id}`)}
                style={{
                  background: `linear-gradient(155deg, ${pHex} 0%, ${sHex} 100%)`,
                }}
                className="shrink-0 w-36 sm:w-auto snap-start group relative overflow-hidden rounded-2xl p-3.5 sm:p-4 text-white text-center shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col items-center justify-between border border-white/15"
              >
                <div
                  style={{ borderColor: aHex }}
                  className="w-16 h-16 rounded-2xl bg-black/35 border-2 overflow-hidden flex items-center justify-center shadow-lg mb-2.5 group-hover:scale-105 transition-transform"
                >
                  {team.crestUrl ? (
                    <img
                      src={team.crestUrl}
                      alt={team.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Shield className="w-7 h-7" style={{ color: aHex }} />
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-display font-black uppercase tracking-tight text-white">
                    {team.name}
                  </h4>
                  <p className="text-[10px] font-semibold text-white/80 mt-0.5 truncate max-w-[130px]">
                    {team.turmaLabel || 'Medicina UEMA'}
                  </p>
                </div>

                <span
                  style={{ backgroundColor: aHex }}
                  className="mt-3 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-display font-extrabold text-slate-950"
                >
                  <span>Abrir Página</span>
                  <ChevronRight className="w-3 h-3" />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 6. TABELA DE CLASSIFICAÇÃO COMPACTA ("Point Table" da Imagem 1 Direita) */}
      <section className="all-sports-card p-5 sm:p-6 space-y-4">
        <div className="all-sports-section-pill">
          Quadro de Pontuação Geral • Períodos
        </div>
        <StandingsTable
          standings={standings}
          modalityId={
            selectedSportFilter === 'todas'
              ? 'futsal'
              : (selectedSportFilter as any)
          }
        />
      </section>

      {/* 6. SEÇÃO "LATEST NEWS / ACESSO RÁPIDO AOS HUBS" (Rodapé da Imagem 2) */}
      <section className="all-sports-card p-5 sm:p-6 space-y-4">
        <div className="all-sports-section-pill">
          Central da Competição &amp; Perfis Oficiais
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <button
            type="button"
            onClick={() => navigate('/equipe')}
            className="group p-4 rounded-2xl bg-[#F8FAFC] hover:bg-[#0B218A] border border-slate-200/80 text-left transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 group-hover:bg-white/15 flex items-center justify-center text-[#0B218A] group-hover:text-brand-yellow mb-3">
              <Shield className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-display font-extrabold text-slate-900 group-hover:text-white">
              Hub da Equipe (Período)
            </h4>
            <p className="text-xs text-slate-500 group-hover:text-white/75 mt-1">
              Elenco, últimos confrontos e pontuação da turma.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/atleta')}
            className="group p-4 rounded-2xl bg-[#F8FAFC] hover:bg-[#0B218A] border border-slate-200/80 text-left transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 group-hover:bg-white/15 flex items-center justify-center text-[#0B218A] group-hover:text-brand-yellow mb-3">
              <User className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-display font-extrabold text-slate-900 group-hover:text-white">
              Perfil de Atleta
            </h4>
            <p className="text-xs text-slate-500 group-hover:text-white/75 mt-1">
              Posição em quadra, estatísticas e histórico na súmula.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/chaveamento')}
            className="group p-4 rounded-2xl bg-[#F8FAFC] hover:bg-[#0B218A] border border-slate-200/80 text-left transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 group-hover:bg-white/15 flex items-center justify-center text-[#0B218A] group-hover:text-brand-yellow mb-3">
              <Trophy className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-display font-extrabold text-slate-900 group-hover:text-white">
              Chaveamento &amp; Mata-Mata
            </h4>
            <p className="text-xs text-slate-500 group-hover:text-white/75 mt-1">
              Quartas, semifinais e grande final por modalidade.
            </p>
          </button>
        </div>
      </section>
    </div>
  );
};
