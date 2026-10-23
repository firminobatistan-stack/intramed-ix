import React from 'react';
import { TrendingUp, Award, Activity } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  highlight?: boolean;
  icon?: 'trend' | 'award' | 'activity';
  className?: string;
}

/**
 * 6.6. CARD ESTATÍSTICO (Master Prompt)
 * O número principal é o primeiro elemento percebido (tabular-nums),
 * acompanhado de rótulo claro e contexto complementar opcional.
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  sublabel,
  highlight = false,
  icon = 'activity',
  className = '',
}) => {
  const IconComp =
    icon === 'award' ? Award : icon === 'trend' ? TrendingUp : Activity;

  return (
    <div
      className={`rounded-3xl p-4 sm:p-5 border transition-all duration-150 ${
        highlight
          ? 'bg-gradient-to-br from-brand-blue-dark via-brand-blue to-brand-blue-medium text-white border-white/15 shadow-elevated'
          : 'bg-white text-brand-text-primary border-brand-surface-border shadow-card hover:shadow-card-hover'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={`text-[11px] font-display font-bold uppercase tracking-wider ${
            highlight ? 'text-brand-yellow' : 'text-brand-text-secondary'
          }`}
        >
          {label}
        </span>
        <div
          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
            highlight
              ? 'bg-white/10 text-brand-yellow'
              : 'bg-brand-blue-light/80 text-brand-blue'
          }`}
        >
          <IconComp className="w-3.5 h-3.5" />
        </div>
      </div>

      <div
        className={`text-2xl sm:text-3xl font-display font-extrabold tabular-nums tracking-tight ${
          highlight ? 'text-white' : 'text-brand-blue'
        }`}
      >
        {value}
      </div>

      {sublabel && (
        <p
          className={`text-xs mt-1 font-medium truncate ${
            highlight ? 'text-white/75' : 'text-brand-text-muted'
          }`}
        >
          {sublabel}
        </p>
      )}
    </div>
  );
};
