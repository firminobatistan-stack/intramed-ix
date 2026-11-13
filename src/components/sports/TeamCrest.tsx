import React from 'react';

interface TeamCrestProps {
  crestUrl?: string | null;
  teamName?: string | null;
  teamId?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  highlighted?: boolean;
  className?: string;
}

/**
 * Resolve o anel e fundo oficial padronizado de acordo com a turma/atlética:
 * - Sanguinária (T21): Vermelho Rubi (#DC2626)
 * - Predadora (T22): Amarelo Ouro (#EAB308)
 * - Tormenta (T23): Azul Celeste (#0284C7)
 * - Colossal (T24): Verde Esmeralda (#10B981)
 * - Soberana (T25): Vinho Imperial (#9F1239)
 */
function resolveTeamRingStyle(teamName?: string | null, teamId?: string | null, crestUrl?: string | null): {
  borderClass: string;
  bgClass: string;
} {
  const key = `${teamId || ''} ${teamName || ''} ${crestUrl || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (key.includes('sanguinaria') || key.includes('t21')) {
    return {
      borderClass: 'border-red-500/80 ring-2 ring-red-500/25',
      bgClass: 'bg-[#1A0505]',
    };
  }
  if (key.includes('predadora') || key.includes('t22')) {
    return {
      borderClass: 'border-amber-400/90 ring-2 ring-amber-400/30',
      bgClass: 'bg-[#181204]',
    };
  }
  if (key.includes('tormenta') || key.includes('t23')) {
    return {
      borderClass: 'border-sky-400/85 ring-2 ring-sky-400/25',
      bgClass: 'bg-[#041524]',
    };
  }
  if (key.includes('colossal') || key.includes('t24')) {
    return {
      borderClass: 'border-emerald-500/85 ring-2 ring-emerald-500/25',
      bgClass: 'bg-[#031C14]',
    };
  }
  if (key.includes('soberana') || key.includes('t25')) {
    return {
      borderClass: 'border-rose-500/80 ring-2 ring-rose-500/25',
      bgClass: 'bg-[#20050C]',
    };
  }

  return {
    borderClass: 'border-slate-300 ring-1 ring-slate-200',
    bgClass: 'bg-slate-950',
  };
}

export const TeamCrest: React.FC<TeamCrestProps> = ({
  crestUrl,
  teamName,
  teamId,
  size = 'md',
  highlighted = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-14 h-14 rounded-2xl',
    xl: 'w-16 h-16 rounded-2xl',
  };

  if (crestUrl) {
    const teamStyle = resolveTeamRingStyle(teamName, teamId, crestUrl);
    return (
      <div
        className={`relative inline-flex items-center justify-center border overflow-hidden shrink-0 shadow-sm ${
          teamStyle.bgClass
        } ${
          highlighted
            ? 'border-brand-yellow ring-2 ring-brand-yellow/50 shadow-md'
            : teamStyle.borderClass
        } ${sizeClasses[size]} ${className}`}
      >
        <img
          src={crestUrl}
          alt={teamName ? `Escudo ${teamName}` : 'Escudo oficial'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      title="Aguardando definição"
      aria-label="Aguardando definição"
      className={`inline-flex items-center justify-center bg-brand-surface-muted/70 border border-dashed border-brand-surface-border text-brand-text-muted/50 shrink-0 ${sizeClasses[size]} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-brand-surface-border" aria-hidden="true" />
    </div>
  );
};
