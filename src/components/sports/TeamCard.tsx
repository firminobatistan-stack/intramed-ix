import React from 'react';
import { Team } from '../../types/domain';
import { TeamCrest } from './TeamCrest';
import { EmptyState } from '../ui/EmptyState';

interface TeamCardProps {
  team?: Team | null;
  onClick?: (team: Team) => void;
}

/**
 * Componente Card de Equipe reutilizável.
 * Preparado para receber equipes reais quando cadastradas pela organização.
 */
export const TeamCard: React.FC<TeamCardProps> = ({ team, onClick }) => {
  if (!team) {
    return (
      <EmptyState
        variant="teams"
        message="Nenhuma equipe cadastrada."
        compact
      />
    );
  }

  return (
    <div
      onClick={() => onClick?.(team)}
      className="rounded-2xl bg-white border border-brand-surface-border p-4 shadow-card hover:shadow-card-hover transition-all duration-150 flex items-center gap-3.5 cursor-pointer"
    >
      <TeamCrest crestUrl={team.crestUrl} teamName={team.name} size="md" />
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-display font-bold text-brand-text-primary truncate">
          {team.name}
        </h4>
        {team.shortName && (
          <p className="text-xs text-brand-text-secondary mt-0.5">
            {team.shortName}
          </p>
        )}
      </div>
    </div>
  );
};
