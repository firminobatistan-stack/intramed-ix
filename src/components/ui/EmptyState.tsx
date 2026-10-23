import React from 'react';
import {
  Calendar,
  Trophy,
  GitBranch,
  Shield,
  BarChart3,
  Radio,
  CheckCircle2,
  Layers,
} from 'lucide-react';

export type EmptyStateVariant =
  | 'matches'
  | 'live'
  | 'results'
  | 'bracket'
  | 'teams'
  | 'standings'
  | 'stats'
  | 'categories';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  message: string;
  compact?: boolean;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Componente de Estado Vazio oficial do INTRAMED IX.
 * Apresenta ausência intencional de dados de forma elegante, limpa e esportiva,
 * com marca d'água institucional extremamente discreta da Atlética organizadora.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'matches',
  title,
  message,
  compact = false,
  action,
  className = '',
}) => {
  const renderIcon = () => {
    const iconProps = {
      className: compact ? 'w-5 h-5 text-brand-blue' : 'w-6 h-6 text-brand-blue',
      strokeWidth: 1.75,
    };

    switch (variant) {
      case 'live':
        return <Radio {...iconProps} />;
      case 'results':
        return <CheckCircle2 {...iconProps} />;
      case 'bracket':
        return <GitBranch {...iconProps} />;
      case 'teams':
        return <Shield {...iconProps} />;
      case 'standings':
        return <Trophy {...iconProps} />;
      case 'stats':
        return <BarChart3 {...iconProps} />;
      case 'categories':
        return <Layers {...iconProps} />;
      case 'matches':
      default:
        return <Calendar {...iconProps} />;
    }
  };

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3.5 px-4 py-4 rounded-2xl bg-brand-surface-muted/80 border border-brand-surface-border ${className}`}
      >
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-brand-surface-border shrink-0 shadow-card">
          {renderIcon()}
          <span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand-yellow"
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0 flex-1">
          {title && (
            <p className="text-xs font-semibold text-brand-text-primary mb-0.5">
              {title}
            </p>
          )}
          <p className="text-sm text-brand-text-secondary leading-snug">{message}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden flex flex-col items-center justify-center text-center px-6 py-10 rounded-2xl bg-white border border-brand-surface-border shadow-card ${className}`}
    >
      {/* Marca d'água institucional ultra discreta no canto */}
      <img
        src="/assets/atletica/face-monocor.png"
        alt=""
        aria-hidden="true"
        className="absolute -right-6 -bottom-6 w-36 h-36 object-contain opacity-[0.035] pointer-events-none select-none"
      />

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-blue-light/70 border border-brand-blue/10 mb-3.5">
          {renderIcon()}
          <span
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-brand-yellow ring-2 ring-white"
            aria-hidden="true"
          />
        </div>
        {title && (
          <h3 className="text-sm font-display font-bold text-brand-text-primary mb-1">
            {title}
          </h3>
        )}
        <p className="text-sm text-brand-text-secondary max-w-sm leading-relaxed">
          {message}
        </p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
};
