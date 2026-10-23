import React, { useState } from 'react';
import { GitBranch, Trophy, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { BracketStructure, BracketMatchSlot } from '../../types/domain';
import { TeamCrest } from './TeamCrest';
import { StatusBadge } from '../ui/StatusBadge';

interface BracketViewProps {
  bracket?: BracketStructure | null;
  modalityName?: string;
}

/**
 * Componente de Chaveamento Oficial (Quartas de final → Semifinais → Final).
 * Com controles de Zoom interativo e filtro de fase (estilo Copa Fácil / Challonge).
 */
export const BracketView: React.FC<BracketViewProps> = ({ bracket, modalityName }) => {
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [mobileStageFilter, setMobileStageFilter] = useState<
    'all' | 'quarterfinals' | 'semifinals' | 'final'
  >('all');

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
        className={`rounded-2xl bg-white border ${
          isFinal
            ? 'border-brand-yellow ring-2 ring-brand-yellow/20 shadow-card-hover'
            : 'border-brand-surface-border shadow-card'
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

  const isConfigured = Boolean(bracket && bracket.isConfigured);

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
              <div className="flex flex-col justify-between gap-4">
                {isConfigured && bracket?.quarterfinals.length
                  ? bracket.quarterfinals.map((slot) =>
                      renderPopulatedSlotCard(slot, 'Quartas de Final')
                    )
                  : [0, 1, 2, 3].map((idx) =>
                      renderEmptySlotCard('Quartas de Final', idx)
                    )}
              </div>
            )}

            {(mobileStageFilter === 'all' ||
              mobileStageFilter === 'semifinals') && (
              <div className="flex flex-col justify-around gap-8 relative">
                {[0, 1].map((semiIdx) => (
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

                    {isConfigured && bracket?.semifinals[semiIdx]
                      ? renderPopulatedSlotCard(
                          bracket.semifinals[semiIdx],
                          'Semifinal'
                        )
                      : renderEmptySlotCard('Semifinal', semiIdx)}

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

                  {isConfigured && bracket?.final
                    ? renderPopulatedSlotCard(bracket.final, 'Final', true)
                    : renderEmptySlotCard('Final', 0, true)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
