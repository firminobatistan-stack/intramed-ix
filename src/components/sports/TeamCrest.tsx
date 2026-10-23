import React from 'react';

interface TeamCrestProps {
  crestUrl?: string | null;
  teamName?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  highlighted?: boolean;
  className?: string;
}

/**
 * Componente Escudo de Equipe.
 * Aceita futuramente a imagem oficial cadastrada no banco de dados (`crestUrl`).
 * Enquanto não há equipe cadastrada, exibe exclusivamente um espaço técnico reservado
 * (slot tracejado discreto), sem criar escudos genéricos ou fictícios.
 */
export const TeamCrest: React.FC<TeamCrestProps> = ({
  crestUrl,
  teamName,
  size = 'md',
  highlighted = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-11 h-11 rounded-xl',
    lg: 'w-14 h-14 rounded-2xl',
    xl: 'w-16 h-16 rounded-2xl',
  };

  if (crestUrl) {
    return (
      <div
        className={`relative inline-flex items-center justify-center bg-slate-950 border overflow-hidden shrink-0 ${
          highlighted
            ? 'border-brand-yellow ring-2 ring-brand-yellow/25 shadow-sm'
            : 'border-brand-surface-border shadow-card'
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
      title="Espaço reservado para escudo oficial"
      aria-label="Espaço reservado para escudo oficial"
      className={`inline-flex items-center justify-center bg-brand-surface-muted/70 border border-dashed border-brand-surface-border text-brand-text-muted/50 shrink-0 ${sizeClasses[size]} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-brand-surface-border" aria-hidden="true" />
    </div>
  );
};
