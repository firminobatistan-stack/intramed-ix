import React from 'react';
import { Athlete } from '../../types/domain';
import { Avatar } from '../ui/Avatar';

interface AthleteCardProps {
  athlete?: Athlete | null;
}

/**
 * Componente Card de Atleta reutilizável.
 * Preparado para listagens de elenco, súmulas e estatísticas oficiais.
 */
export const AthleteCard: React.FC<AthleteCardProps> = ({ athlete }) => {
  if (!athlete) {
    return (
      <div className="rounded-2xl bg-brand-surface-muted/70 border border-brand-surface-border p-4 text-center text-xs text-brand-text-secondary">
        Nenhum atleta cadastrado.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-brand-surface-border p-3.5 shadow-card flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar src={athlete.avatarUrl} alt={athlete.name} size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-text-primary truncate">
            {athlete.name}
          </p>
          {athlete.position && (
            <p className="text-xs text-brand-text-secondary truncate">
              {athlete.position}
            </p>
          )}
        </div>
      </div>

      {athlete.jerseyNumber !== undefined && athlete.jerseyNumber !== null && (
        <span className="px-2.5 py-1 rounded-lg bg-brand-blue-light text-brand-blue text-xs font-display font-bold">
          #{athlete.jerseyNumber}
        </span>
      )}
    </div>
  );
};
