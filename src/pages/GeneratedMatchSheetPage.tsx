import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Share2,
  CheckCircle2,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { useCompetitionStore } from '../context/CompetitionStoreContext';
import { TeamCrest } from '../components/sports/TeamCrest';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TestModeBanner } from '../components/layout/TestModeBanner';

/**
 * 27. SÚMULA GERADA (SÚMULA DA PARTIDA)
 * Com Validação e Rubrica Digital da Mesa e Capitães (Padrão e-Súmula / FIBA).
 */
export const GeneratedMatchSheetPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const { getMatchById, getSheetByMatchId, canOperateOfficialData } =
    useCompetitionStore();
  const isAdmin = canOperateOfficialData();

  const [signatures, setSignatures] = useState<{
    referee: boolean;
    tableOfficial: boolean;
    homeCaptain: boolean;
    awayCaptain: boolean;
  }>({
    referee: true,
    tableOfficial: true,
    homeCaptain: false,
    awayCaptain: false,
  });

  const match = matchId ? getMatchById(matchId) : undefined;
  const sheet = matchId ? getSheetByMatchId(matchId) : undefined;

  if (!match || !sheet) {
    return (
      <div className="min-h-screen bg-brand-surface-muted p-6 flex flex-col items-center justify-center text-center space-y-4">
        <FileText className="w-10 h-10 text-brand-blue" />
        <h1 className="text-lg font-display font-bold text-brand-text-primary">
          Súmula ainda não disponível
        </h1>
        <p className="text-xs text-brand-text-secondary max-w-sm">
          Selecione uma partida no Painel de Súmulas para visualizar o documento consolidado.
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate(isAdmin ? '/admin' : '/jogos')}
        >
          {isAdmin ? 'Ir para o Painel de Súmulas' : 'Voltar para Jogos'}
        </Button>
      </div>
    );
  }

  const chronologicalEvents = [...sheet.events]
    .filter((e) => !e.isDeleted)
    .reverse();

  const auditEntries = sheet.events.flatMap((e) => e.auditHistory);

  const countEventsByType = (side: 'home' | 'away', types: string[]) =>
    chronologicalEvents.filter(
      (e) => e.teamSide === side && types.includes(e.type)
    ).length;

  const handleShare = async () => {
    const shareTitle = `Súmula INTRAMED IX — ${match.modalityName}: ${match.homeTeam.teamName} ${match.homeTeam.score ?? 0} × ${match.awayTeam.score ?? 0} ${match.awayTeam.teamName}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareTitle,
          url: window.location.href,
        });
      } catch {
        // Cancelado
      }
    } else {
      navigator.clipboard?.writeText(window.location.href);
    }
  };

  return (
    <div className="min-h-screen bg-brand-surface-muted pb-12">
      <TestModeBanner />

      <header className="bg-white border-b border-brand-surface-border px-4 sm:px-8 py-4 print:hidden sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(isAdmin ? `/sumula/${match.id}` : `/placar/${match.id}`)
              }
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-surface-muted hover:bg-brand-blue-light/50 text-xs font-semibold text-brand-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isAdmin ? 'Voltar ao Operador' : 'Voltar à Partida'}</span>
            </button>
            <h1 className="text-sm sm:text-base font-display font-bold text-brand-text-primary">
              Súmula da Partida • {match.modalityName}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Share2 className="w-3.5 h-3.5" />}
              onClick={handleShare}
            >
              Compartilhar
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              onClick={() => window.print()}
            >
              Imprimir / Salvar PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto mt-6 px-4 sm:px-6 print:mt-0 print:px-0">
        <div className="bg-white rounded-3xl print:rounded-none border border-brand-surface-border print:border-none shadow-card print:shadow-none p-6 sm:p-10 space-y-8">
          {/* 1. CABEÇALHO DA SÚMULA COM CHANCELA DA ATLÉTICA CANGACEIRA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-brand-blue">
            <div className="flex items-center gap-4">
              <img
                src="/assets/atletica/logo.png"
                alt="A.A.A. Cangaceira — Medicina UEMA"
                className="w-16 h-16 object-contain shrink-0"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-brand-blue text-white text-xs font-display font-extrabold">
                    INTRAMED IX
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">
                    Súmula Eletrônica Oficial • A.A.A. Cangaceira
                  </span>
                  {sheet.isTestMode && (
                    <span className="px-2 py-0.5 rounded bg-brand-yellow text-brand-blue-dark text-[11px] font-extrabold uppercase">
                      MODO DE TESTE — NÃO OFICIAL
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-display font-extrabold text-brand-text-primary mt-1.5">
                  {match.modalityName} — {match.categoryName} ({match.phaseLabel})
                </h2>
                <p className="text-xs text-brand-text-secondary mt-1">
                  Local: {match.venue || 'A definir'} • Data:{' '}
                  {match.scheduledDate || 'A definir'} • Horário:{' '}
                  {match.scheduledTime || '--:--'}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-1">
              <StatusBadge
                status={sheet.isClosed ? 'finished' : match.status}
                label={sheet.isClosed ? 'SÚMULA CONSOLIDADA' : 'EM ABERTO'}
              />
              {sheet.closedAtIso && (
                <span className="text-[11px] text-brand-text-muted">
                  Encerrada às{' '}
                  {new Date(sheet.closedAtIso).toLocaleTimeString('pt-BR')}
                </span>
              )}
            </div>
          </div>

          {/* 2. EQUIPES E RESULTADO CONSOLIDADO */}
          <section className="rounded-2xl bg-brand-surface-muted/70 border border-brand-surface-border p-6">
            <div className="grid grid-cols-3 items-center gap-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <TeamCrest
                  crestUrl={match.homeTeam.crestUrl}
                  teamName={match.homeTeam.teamName}
                  size="lg"
                />
                <span className="text-sm sm:text-base font-display font-extrabold text-brand-text-primary">
                  {match.homeTeam.teamName}
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-3xl sm:text-4xl font-display font-extrabold text-brand-blue">
                  {match.homeTeam.score ?? 0} × {match.awayTeam.score ?? 0}
                </div>
                <p className="text-[11px] text-brand-text-secondary">
                  {sheet.periodScores
                    .map((p) => `${p.label}: ${p.homeScore}×${p.awayScore}`)
                    .join(' | ')}
                </p>
              </div>

              <div className="flex flex-col items-center gap-2">
                <TeamCrest
                  crestUrl={match.awayTeam.crestUrl}
                  teamName={match.awayTeam.teamName}
                  size="lg"
                />
                <span className="text-sm sm:text-base font-display font-extrabold text-brand-text-primary">
                  {match.awayTeam.teamName}
                </span>
              </div>
            </div>
          </section>

          {/* 3. ATLETAS RELACIONADOS */}
          <section className="space-y-3">
            <h3 className="text-xs font-display font-extrabold uppercase tracking-wider text-brand-blue border-b border-brand-surface-border pb-2">
              Relação de Atletas (Titulares e Reservas)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(['home', 'away'] as const).map((side) => {
                const tName =
                  side === 'home'
                    ? match.homeTeam.teamName
                    : match.awayTeam.teamName;
                const lineup =
                  side === 'home' ? sheet.homeLineup : sheet.awayLineup;

                return (
                  <div
                    key={side}
                    className="rounded-xl border border-brand-surface-border p-4 space-y-2"
                  >
                    <h4 className="text-xs font-bold text-brand-text-primary uppercase">
                      {tName}
                    </h4>
                    <div className="divide-y divide-brand-surface-border text-xs">
                      {lineup.map((ath) => (
                        <div
                          key={ath.athleteId}
                          className="py-1.5 flex items-center justify-between"
                        >
                          <span className="font-medium text-brand-text-primary">
                            {ath.athleteName}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-brand-text-secondary">
                              {ath.isStarter ? 'Titular' : 'Reserva'}
                            </span>
                            {ath.isCaptain && (
                              <span className="px-1.5 py-0.5 rounded bg-brand-yellow-light text-brand-blue-dark font-bold text-[10px]">
                                C
                              </span>
                            )}
                            {ath.isGoalkeeper && (
                              <span className="px-1.5 py-0.5 rounded bg-brand-blue-light text-brand-blue font-bold text-[10px]">
                                GK
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 4. ESTATÍSTICAS CONSOLIDADAS */}
          <section className="space-y-3">
            <h3 className="text-xs font-display font-extrabold uppercase tracking-wider text-brand-blue border-b border-brand-surface-border pb-2">
              Estatísticas da Partida
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div className="p-3 rounded-xl bg-brand-surface-muted border border-brand-surface-border">
                <span className="text-brand-text-secondary block">Faltas</span>
                <span className="text-sm font-display font-bold text-brand-text-primary mt-0.5 block">
                  {countEventsByType('home', ['foul', 'team_foul'])} ×{' '}
                  {countEventsByType('away', ['foul', 'team_foul'])}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-brand-surface-muted border border-brand-surface-border">
                <span className="text-brand-text-secondary block">
                  Cartões Amarelos
                </span>
                <span className="text-sm font-display font-bold text-brand-text-primary mt-0.5 block">
                  {countEventsByType('home', ['yellow_card'])} ×{' '}
                  {countEventsByType('away', ['yellow_card'])}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-brand-surface-muted border border-brand-surface-border">
                <span className="text-brand-text-secondary block">
                  Vermelhos / Expulsões
                </span>
                <span className="text-sm font-display font-bold text-brand-text-primary mt-0.5 block">
                  {countEventsByType('home', ['red_card', 'expulsion'])} ×{' '}
                  {countEventsByType('away', ['red_card', 'expulsion'])}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-brand-surface-muted border border-brand-surface-border">
                <span className="text-brand-text-secondary block">
                  Timeouts Solicitados
                </span>
                <span className="text-sm font-display font-bold text-brand-text-primary mt-0.5 block">
                  {sheet.homeTimeoutsUsed} × {sheet.awayTimeoutsUsed}
                </span>
              </div>
            </div>
          </section>

          {/* 5. EVENTOS CRONOLÓGICOS */}
          <section className="space-y-3">
            <h3 className="text-xs font-display font-extrabold uppercase tracking-wider text-brand-blue border-b border-brand-surface-border pb-2">
              Registro Cronológico de Eventos ({chronologicalEvents.length})
            </h3>
            {chronologicalEvents.length === 0 ? (
              <p className="text-xs text-brand-text-secondary py-2">
                Nenhum evento registrado nesta súmula.
              </p>
            ) : (
              <div className="divide-y divide-brand-surface-border text-xs">
                {chronologicalEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="py-2 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-brand-blue w-14">
                        {ev.matchClockDisplay}
                      </span>
                      <span className="font-bold text-brand-text-primary">
                        {ev.typeLabel}
                      </span>
                      {ev.athleteName && (
                        <span className="text-brand-text-secondary">
                          — {ev.athleteName}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-brand-text-secondary">
                      {ev.teamName || ev.periodLabel}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 6. ARBITRAGEM, OBSERVAÇÕES E VALIDAÇÃO DIGITAL (PADRÃO E-SÚMULA) */}
          <section className="space-y-4 pt-2 border-t border-brand-surface-border">
            <h3 className="text-xs font-display font-extrabold uppercase tracking-wider text-brand-blue">
              Arbitragem, Observações e Validação Digital da Mesa
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-brand-surface-muted border border-brand-surface-border">
                <span className="text-brand-text-muted uppercase font-bold block">
                  Árbitro / Responsável:
                </span>
                <span className="text-brand-text-primary font-semibold mt-1 block">
                  {sheet.refereeName || 'Não informado'}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-brand-surface-muted border border-brand-surface-border">
                <span className="text-brand-text-muted uppercase font-bold block">
                  Observações da Partida:
                </span>
                <span className="text-brand-text-primary font-medium mt-1 block">
                  {sheet.refereeNotes || 'Sem ocorrências adicionais registradas.'}
                </span>
              </div>
            </div>

            {/* Painel de Rubrica / Aceite Eletrônico na Mesa (Árbitro, Mesário e Capitães) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {[
                { key: 'referee', role: 'Árbitro Principal', sub: sheet.refereeName || 'Mesa Oficial' },
                { key: 'tableOfficial', role: 'Mesário / Operador', sub: 'Registro Eletrônico' },
                { key: 'homeCaptain', role: `Capitão (${match.homeTeam.teamName})`, sub: 'Conferência de Placar' },
                { key: 'awayCaptain', role: `Capitão (${match.awayTeam.teamName})`, sub: 'Conferência de Placar' },
              ].map((sig) => {
                const isSigned = signatures[sig.key as keyof typeof signatures];
                return (
                  <button
                    key={sig.key}
                    type="button"
                    disabled={!isAdmin}
                    onClick={() =>
                      isAdmin &&
                      setSignatures((prev) => ({
                        ...prev,
                        [sig.key]: !prev[sig.key as keyof typeof prev],
                      }))
                    }
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSigned
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                        : 'bg-brand-surface-muted border-dashed border-brand-surface-border text-brand-text-secondary'
                    } ${!isAdmin ? 'cursor-default' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {sig.role}
                      </span>
                      <ShieldCheck
                        className={`w-4 h-4 ${
                          isSigned ? 'text-emerald-600' : 'text-brand-text-muted'
                        }`}
                      />
                    </div>
                    <span className="block text-xs font-bold truncate">
                      {sig.sub}
                    </span>
                    <span className="block text-[10px] mt-1 font-semibold">
                      {isSigned
                        ? '✓ Validado digitalmente'
                        : isAdmin
                        ? 'Toque para validar'
                        : 'Aguardando mesa'}
                    </span>
                  </button>
                );
              })}
            </div>

            {auditEntries.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <strong className="block">
                  Histórico de Correções na Mesa ({auditEntries.length}):
                </strong>
                {auditEntries.map((aud) => (
                  <p key={aud.id}>
                    • [{new Date(aud.timestampIso).toLocaleTimeString('pt-BR')}]{' '}
                    {aud.previousSummary} → {aud.newSummary} ({aud.reason})
                  </p>
                ))}
              </div>
            )}

            <div className="pt-4 flex items-center justify-between text-xs text-brand-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-blue" />
                <span>Documento gerado eletronicamente pelo sistema INTRAMED IX</span>
              </span>
              <span>ID: {sheet.id}</span>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
