import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, Trophy, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { BracketStructure, BracketMatchSlot } from '../../types/domain';
import { TeamCrest } from './TeamCrest';
import { StatusBadge } from '../ui/StatusBadge';
import { useCompetitionStore } from '../../context/CompetitionStoreContext';

interface BracketViewProps {
  bracket?: BracketStructure | null;
  modalityId?: string;
  modalityName?: string;
}

/**
 * Componente de Chaveamento Oficial (Quartas de final → Semifinais → Final).
 * Com controles de Zoom interativo e sincronização em tempo real com partidas criadas no Painel Admin.
 */
export const BracketView: React.FC<BracketViewProps> = ({
  bracket,
  modalityId,
  modalityName,
}) => {
  const navigate = useNavigate();
  const { visibleMatches } = useCompetitionStore();
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [mobileStageFilter, setMobileStageFilter] = useState<
    'all' | 'quarterfinals' | 'semifinals' | 'final'
  >('all');

  const targetModalityId = modalityId || bracket?.modalityId;
  const modalityKnockoutMatches = targetModalityId
    ? visibleMatches.filter((m) => m.modalityId === targetModalityId)
    : [];

  const qfMatches = modalityKnockoutMatches.filter(
    (m) => m.phase === 'quarterfinals'
  );
  const sfMatches = modalityKnockoutMatches.filter(
    (m) => m.phase === 'semifinals'
  );
  const finalMatches = modalityKnockoutMatches.filter(
    (m) => m.phase === 'final'
  );

  // Formato oficial de 5 atléticas do INTRAMED IX:
  // - 1 confronto de Quartas de Final (A x B)
  // - Semifinal 1 (C x D) e Semifinal 2 (Vencedor QF x E)
  // - Final (Vencedor SF1 x Vencedor SF2)
  const dynamicQuarterfinals: BracketMatchSlot[] = [
    {
      id: 'dyn-qf-0',
      orderIndex: 0,
      phase: 'quarterfinals',
      match: qfMatches[0] || bracket?.quarterfinals?.[0]?.match || null,
    },
  ];

  const dynamicSemifinals: BracketMatchSlot[] = [0, 1].map((idx) => ({
    id: `dyn-sf-${idx}`,
    orderIndex: idx,
    phase: 'semifinals',
    match: sfMatches[idx] || bracket?.semifinals?.[idx]?.match || null,
  }));

  const dynamicFinal: BracketMatchSlot = {
    id: 'dyn-final-0',
    orderIndex: 0,
    phase: 'final',
    match: finalMatches[0] || bracket?.final?.match || null,
  };

  const hasAnyKnockoutMatch =
    qfMatches.length > 0 ||
    sfMatches.length > 0 ||
    finalMatches.length > 0 ||
    Boolean(bracket && bracket.isConfigured);

  const renderEmptySlotCard = (phaseLabel: string, index: number, isFinal = false) => (
    <div
      key={`${phaseLabel}-${index}`}
      className={`rounded-2xl bg-white border transition-colors ${
        isFinal
          ? 'border-brand-yellow/60 ring-1 ring-brand-yellow/20 shadow-card'
          : 'border-brand-surface-border shadow-card'
      } p-3.5 w-full`}
    >
      <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-brand-surface-border/80">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted">
          {phaseLabel}
        </span>
        {isFinal ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-blue bg-brand-yellow-light px-2 py-0.5 rounded-full border border-brand-yellow/40">
            <Trophy className="w-3 h-3 text-brand-yellow-dark" />
            <span>Decisão</span>
          </span>
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-brand-surface-border" aria-hidden="true" />
        )}
      </div>

      <div className="space-y-2">
        {[0, 1].map((slotIdx) => (
          <div
            key={slotIdx}
            className="flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl bg-brand-surface-muted/60 border border-dashed border-brand-surface-border"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <TeamCrest size="sm" />
              <span className="text-xs font-medium text-brand-text-muted truncate">
                Aguardando definição
              </span>
            </div>
            <span className="text-xs font-display font-bold text-brand-text-muted px-1.5">
              —
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPopulatedSlotCard = (slot: BracketMatchSlot, phaseLabel: string, isFinal = false) => {
    const match = slot.match;
    if (!match) {
      return renderEmptySlotCard(phaseLabel, slot.orderIndex, isFinal);
    }

    const teams = [match.homeTeam, match.awayTeam];

    return (
      <div
        key={slot.id}
        onClick={() => navigate(`/placar/${match.id}`)}
        className={`cursor-pointer rounded-2xl bg-white border transition-all hover:-translate-y-0.5 ${
          isFinal
            ? 'border-brand-yellow ring-2 ring-brand-yellow/20 shadow-card-hover'
            : 'border-brand-surface-border hover:border-brand-blue/50 shadow-card'
        } p-3.5 w-full`}
      >
        <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-brand-surface-border">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-blue">
            {match.phaseLabel || phaseLabel}
          </span>
          <StatusBadge status={match.status} />
        </div>

        <div className="space-y-2">
          {teams.map((teamSlot, idx) => {
            const isWinner = Boolean(teamSlot.isWinner);
            return (
              <div
                key={idx}
                className={`flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl border transition-colors ${
                  isWinner
                    ? 'bg-brand-blue-light/50 border-brand-blue/30'
                    : 'bg-brand-surface-muted/40 border-brand-surface-border'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <TeamCrest
                    crestUrl={teamSlot.crestUrl}
                    teamName={teamSlot.teamName}
                    size="md"
                    highlighted={isWinner}
                  />
                  <div className="min-w-0">
                    <span
                      className={`block text-xs sm:text-sm truncate ${
                        isWinner
                          ? 'font-display font-bold text-brand-blue'
                          : 'font-medium text-brand-text-primary'
                      }`}
                    >
                      {teamSlot.teamName || 'Aguardando definição'}
                    </span>
                    {isWinner && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-blue">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow" />
                        Classificado
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`text-sm font-display font-extrabold px-2 py-0.5 rounded-lg ${
                    isWinner
                      ? 'bg-brand-blue text-white'
                      : 'text-brand-text-secondary'
                  }`}
                >
                  {teamSlot.score ?? '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const isConfigured = hasAnyKnockoutMatch;

  return (
    <div className="space-y-5">
      {/* Banner informativo de estado vazio + Controles de Zoom e Fase */}
      {!isConfigured && (
        <div className="rounded-2xl bg-white border border-brand-surface-border p-5 sm:p-6 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="relative w-11 h-11 rounded-2xl bg-brand-blue-light/80 border border-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
              <GitBranch className="w-5 h-5" />
              <span
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-brand-yellow ring-2 ring-white"
                aria-hidden="true"
              />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-display font-bold text-brand-text-primary">
                Chaveamento ainda não disponível
              </h3>
              <p className="text-xs sm:text-sm text-brand-text-secondary mt-0.5">
                Chaveamento será exibido após o cadastro das equipes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge
              status="pending"
              label={
                modalityName
                  ? `${modalityName} • Aguardando equipes`
                  : 'Aguardando equipes'
              }
            />
          </div>
        </div>
      )}

      {/* Barra de Ferramentas Interativa do Chaveamento (Filtro de Fase + Zoom) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-brand-surface-border px-4 py-2.5 shadow-card">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'Árvore Completa' },
            { id: 'quarterfinals', label: 'Quartas' },
            { id: 'semifinals', label: 'Semifinais' },
            { id: 'final', label: 'Final' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() =>
                setMobileStageFilter(
                  st.id as 'all' | 'quarterfinals' | 'semifinals' | 'final'
                )
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                mobileStageFilter === st.id
                  ? 'bg-brand-blue text-white'
                  : 'bg-brand-surface-muted text-brand-text-secondary hover:text-brand-text-primary'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Controles de Zoom */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoomPercent((z) => Math.max(80, z - 10))}
            className="p-1.5 rounded-lg bg-brand-surface-muted hover:bg-brand-blue-light text-brand-text-secondary hover:text-brand-blue"
            title="Diminuir zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold text-brand-text-secondary w-12 text-center">
            {zoomPercent}%
          </span>
          <button
            type="button"
            onClick={() => setZoomPercent((z) => Math.min(115, z + 10))}
            className="p-1.5 rounded-lg bg-brand-surface-muted hover:bg-brand-blue-light text-brand-text-secondary hover:text-brand-blue"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          {zoomPercent !== 100 && (
            <button
              type="button"
              onClick={() => setZoomPercent(100)}
              className="p-1.5 rounded-lg bg-brand-surface-muted hover:bg-brand-blue-light text-brand-text-secondary"
              title="Restaurar zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Diagrama Estrutural: Quartas de final → Semifinais → Final */}
      <div className="rounded-2xl bg-brand-surface-muted/60 border border-brand-surface-border p-4 sm:p-6 overflow-x-auto">
        <div
          style={{
            transform: `scale(${zoomPercent / 100})`,
            transformOrigin: 'top left',
          }}
          className={`transition-transform duration-150 ${
            mobileStageFilter === 'all' ? 'min-w-[760px] lg:min-w-0' : 'w-full'
          }`}
        >
          {/* Cabeçalho das Fases */}
          <div
            className={`grid gap-6 mb-5 ${
              mobileStageFilter === 'all' ? 'grid-cols-3' : 'grid-cols-1 max-w-md mx-auto'
            }`}
          >
            {(mobileStageFilter === 'all' ||
              mobileStageFilter === 'quarterfinals') && (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white border border-brand-surface-border">
                <span className="text-xs font-display font-bold text-brand-blue uppercase tracking-wider">
                  Quartas de Final
                </span>
                <span className="text-[11px] font-medium text-brand-text-muted">
                  Fase eliminatória
                </span>
              </div>
            )}

            {(mobileStageFilter === 'all' ||
              mobileStageFilter === 'semifinals') && (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white border border-brand-surface-border">
                <span className="text-xs font-display font-bold text-brand-blue uppercase tracking-wider">
                  Semifinais
                </span>
                <span className="text-[11px] font-medium text-brand-text-muted">
                  Avanço automático
                </span>
              </div>
            )}

            {(mobileStageFilter === 'all' || mobileStageFilter === 'final') && (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-brand-blue text-white shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-yellow" aria-hidden="true" />
                  <span className="text-xs font-display font-bold uppercase tracking-wider">
                    Final
                  </span>
                </div>
                <Trophy className="w-3.5 h-3.5 text-brand-yellow" />
              </div>
            )}
          </div>

          {/* Árvore de Conexões Visuais */}
          <div
            className={`grid gap-6 items-stretch ${
              mobileStageFilter === 'all' ? 'grid-cols-3' : 'grid-cols-1 max-w-md mx-auto'
            }`}
          >
            {(mobileStageFilter === 'all' ||
              mobileStageFilter === 'quarterfinals') && (
              <div className="flex flex-col justify-around gap-4">
                {renderPopulatedSlotCard(dynamicQuarterfinals[0], 'Quartas de Final (Jogo Único)')}

                {/* Card de Byes das Semifinais */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-xs text-slate-600 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px] uppercase tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>3 Entradas Diretas na Semifinal</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Três atléticas entram diretamente nas semifinais através do sorteio equilibrado: duas duelam na <strong>Semifinal 1</strong> e a terceira enfrenta a vencedora das Quartas na <strong>Semifinal 2</strong>.
                  </p>
                </div>
              </div>
            )}

            {(mobileStageFilter === 'all' ||
              mobileStageFilter === 'semifinals') && (
              <div className="flex flex-col justify-around gap-8 relative">
                {dynamicSemifinals.map((slot, semiIdx) => (
                  <div key={semiIdx} className="relative flex items-center">
                    {mobileStageFilter === 'all' && (
                      <>
                        <div
                          className="hidden sm:block absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-28 border-t border-b border-r border-brand-blue/25 rounded-r-lg pointer-events-none"
                          aria-hidden="true"
                        />
                        <div
                          className="hidden sm:block absolute -left-3 top-1/2 -translate-y-1/2 w-3 border-t border-brand-blue/25 pointer-events-none"
                          aria-hidden="true"
                        />
                      </>
                    )}

                    {renderPopulatedSlotCard(slot, 'Semifinal')}

                    {mobileStageFilter === 'all' && (
                      <div
                        className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 w-3 border-t border-brand-blue/25 pointer-events-none"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {(mobileStageFilter === 'all' || mobileStageFilter === 'final') && (
              <div className="flex flex-col justify-center relative">
                <div className="relative flex items-center">
                  {mobileStageFilter === 'all' && (
                    <>
                      <div
                        className="hidden sm:block absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-48 border-t border-b border-r border-brand-blue/30 rounded-r-lg pointer-events-none"
                        aria-hidden="true"
                      />
                      <div
                        className="hidden sm:block absolute -left-3 top-1/2 -translate-y-1/2 w-3 border-t border-brand-yellow pointer-events-none"
                        aria-hidden="true"
                      />
                    </>
                  )}

                  {renderPopulatedSlotCard(dynamicFinal, 'Final', true)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Critério Oficial de Classificação & Pontuação (Regulamento INTRAMED IX) */}
      <div className="bg-white rounded-2xl border border-brand-surface-border p-4 sm:p-5 shadow-card space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-brand-surface-border/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-brand-yellow-dark" />
            <h4 className="text-xs sm:text-sm font-display font-black text-brand-text-primary uppercase tracking-tight">
              Classificação Final & Pontuação Oficial (Regulamento • Item 04)
            </h4>
          </div>
          <span className="text-[11px] font-bold text-brand-blue bg-brand-blue/10 px-2.5 py-0.5 rounded-full">
            5 Equipes Participantes
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 space-y-1">
            <span className="font-display font-black text-amber-900 block flex items-center gap-1.5">
              <span>🥇 1º Lugar (Campeão)</span>
            </span>
            <p className="text-[11px] text-amber-800 leading-tight">
              Vencedora da Grande Final.
            </p>
            <span className="text-xs font-mono font-black text-amber-950 block pt-1">
              Coletivas: 20 pts • Individuais: 10 pts
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-display font-black text-slate-800 block flex items-center gap-1.5">
              <span>🥈 2º Lugar (Vice-campeão)</span>
            </span>
            <p className="text-[11px] text-slate-600 leading-tight">
              Derrotada na Grande Final.
            </p>
            <span className="text-xs font-mono font-black text-slate-900 block pt-1">
              Coletivas: 14 pts • Individuais: 7 pts
            </span>
          </div>

          <div className="p-3 rounded-xl bg-orange-50/80 border border-orange-200/80 space-y-1">
            <span className="font-display font-black text-orange-950 block flex items-center gap-1.5">
              <span>🥉 3º Lugar (Bronze)</span>
            </span>
            <p className="text-[11px] text-orange-900 leading-tight">
              Derrotada na semifinal pela equipe campeã.
            </p>
            <span className="text-xs font-mono font-black text-orange-950 block pt-1">
              Coletivas: 8 pts • Individuais: 4 pts
            </span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/60 space-y-1">
            <span className="font-display font-black text-blue-950 block flex items-center gap-1.5">
              <span>4º Lugar (Semifinalista)</span>
            </span>
            <p className="text-[11px] text-blue-900 leading-tight">
              Derrotada na semifinal pela equipe vice-campeã.
            </p>
            <span className="text-xs font-mono font-black text-blue-950 block pt-1">
              Coletivas: 6 pts • Individuais: 3 pts
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
