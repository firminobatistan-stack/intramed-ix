import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
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
  const navigate = useNavigate();

  if (!match) {
    return <EmptyState variant="results" message={emptyMessage} compact />;
  }

  return (
    <div
      onClick={() => navigate(`/placar/${match.id}`)}
      className="cursor-pointer rounded-2xl bg-white border border-brand-surface-border hover:border-brand-blue/50 p-4 shadow-card hover:shadow-card-hover transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="flex items-center justify-between gap-4 flex-1">
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (match.homeTeam.teamId) navigate(`/equipe/${match.homeTeam.teamId}`);
          }}
          className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-85"
        >
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

        <div
          onClick={(e) => {
            e.stopPropagation();
            if (match.awayTeam.teamId) navigate(`/equipe/${match.awayTeam.teamId}`);
          }}
          className="flex items-center justify-end gap-3 min-w-0 flex-1 hover:opacity-85"
        >
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

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/sumula/${match.id}/documento`);
        }}
        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-surface-muted hover:bg-blue-50 text-xs font-display font-bold text-brand-blue shrink-0"
      >
        <FileText className="w-3.5 h-3.5" />
        <span>Ver Súmula</span>
      </button>
    </div>
  );
};
