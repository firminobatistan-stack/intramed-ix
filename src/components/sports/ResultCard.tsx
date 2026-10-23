import React from 'react';
import { Match } from '../../types/domain';
import { TeamCrest } from './TeamCrest';
import { StatusBadge } from '../ui/StatusBadge';
import { EmptyState } from '../ui/EmptyState';

interface ResultCardProps {
  match?: Match | null;
  emptyMessage?: string;
}

/**
 * Componente Card de Resultado reutilizável.
 * Exibe o placar consolidado de uma partida finalizada ou estado vazio oficial.
 */
export const ResultCard: React.FC<ResultCardProps> = ({
  match,
  emptyMessage = 'Nenhum resultado disponível.',
}) => {
  if (!match) {
    return <EmptyState variant="results" message={emptyMessage} compact />;
  }

  return (
    <div className="rounded-2xl bg-white border border-brand-surface-border p-4 shadow-card flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <TeamCrest
          crestUrl={match.homeTeam.crestUrl}
          teamName={match.homeTeam.teamName}
          size="sm"
          highlighted={Boolean(match.homeTeam.isWinner)}
        />
        <span className="text-sm font-semibold text-brand-text-primary truncate">
          {match.homeTeam.teamName || 'A definir'}
        </span>
      </div>

      <div className="flex flex-col items-center shrink-0 px-3">
        <div className="flex items-center gap-2 text-base font-display font-bold text-brand-blue">
          <span>{match.homeTeam.score ?? '—'}</span>
          <span className="text-xs text-brand-text-muted">×</span>
          <span>{match.awayTeam.score ?? '—'}</span>
        </div>
        <StatusBadge status="finished" className="mt-1 scale-90" />
      </div>

      <div className="flex items-center justify-end gap-3 min-w-0 flex-1">
        <span className="text-sm font-semibold text-brand-text-primary truncate text-right">
          {match.awayTeam.teamName || 'A definir'}
        </span>
        <TeamCrest
          crestUrl={match.awayTeam.crestUrl}
          teamName={match.awayTeam.teamName}
          size="sm"
          highlighted={Boolean(match.awayTeam.isWinner)}
        />
      </div>
    </div>
  );
};
