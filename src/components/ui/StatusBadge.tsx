import React from 'react';
import { MatchStatus } from '../../types/domain';

interface StatusBadgeProps {
  status?: MatchStatus | 'empty' | 'official' | 'pending';
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status = 'pending',
  label,
  className = '',
}) => {
  const config: Record<
    string,
    { text: string; bg: string; border: string; dot: string; defaultLabel: string }
  > = {
    live: {
      text: 'text-brand-blue-dark',
      bg: 'bg-brand-yellow-light',
      border: 'border-brand-yellow/50',
      dot: 'bg-brand-yellow animate-pulse',
      defaultLabel: 'Ao Vivo',
    },
    halftime: {
      text: 'text-brand-blue-dark',
      bg: 'bg-brand-yellow-light',
      border: 'border-brand-yellow/40',
      dot: 'bg-brand-yellow',
      defaultLabel: 'Intervalo',
    },
    scheduled: {
      text: 'text-brand-blue',
      bg: 'bg-brand-blue-light',
      border: 'border-brand-blue/15',
      dot: 'bg-brand-blue',
      defaultLabel: 'Agendado',
    },
    finished: {
      text: 'text-brand-text-secondary',
      bg: 'bg-brand-surface-muted',
      border: 'border-brand-surface-border',
      dot: 'bg-brand-text-muted',
      defaultLabel: 'Finalizado',
    },
    postponed: {
      text: 'text-brand-text-secondary',
      bg: 'bg-brand-surface-muted',
      border: 'border-brand-surface-border',
      dot: 'bg-brand-text-muted',
      defaultLabel: 'Adiado',
    },
    cancelled: {
      text: 'text-brand-text-secondary',
      bg: 'bg-brand-surface-muted',
      border: 'border-brand-surface-border',
      dot: 'bg-brand-text-muted',
      defaultLabel: 'Cancelado',
    },
    official: {
      text: 'text-brand-blue',
      bg: 'bg-brand-blue-light/80',
      border: 'border-brand-blue/15',
      dot: 'bg-brand-yellow',
      defaultLabel: 'Oficial',
    },
    pending: {
      text: 'text-brand-text-secondary',
      bg: 'bg-brand-surface-muted',
      border: 'border-brand-surface-border',
      dot: 'bg-brand-text-muted',
      defaultLabel: 'Aguardando definição',
    },
    empty: {
      text: 'text-brand-text-muted',
      bg: 'bg-brand-surface-muted',
      border: 'border-brand-surface-border',
      dot: 'bg-brand-surface-border',
      defaultLabel: 'Sem registro',
    },
  };

  const current = config[status] || config.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${current.bg} ${current.text} ${current.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} aria-hidden="true" />
      <span>{label || current.defaultLabel}</span>
    </span>
  );
};
