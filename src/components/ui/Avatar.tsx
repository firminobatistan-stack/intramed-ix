import React from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Componente Avatar reutilizável.
 * Preparado para exibir foto real do usuário autenticado ou atleta cadastrado.
 * Sem dados reais, exibe um marcador abstrato discreto e elegante.
 */
export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Foto de perfil',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-9 h-9',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
    xl: 'w-8 h-8',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full bg-brand-surface-muted border border-brand-surface-border text-brand-text-muted overflow-hidden shrink-0 ${sizeClasses[size]} ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <User className={iconSizes[size]} strokeWidth={1.75} aria-hidden="true" />
      )}
    </div>
  );
};
