import React from 'react';

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  inverted?: boolean;
  showSubtitle?: boolean;
  showEmblem?: boolean;
  className?: string;
}

/**
 * Identidade Oficial INTRAMED IX integrada com o emblema oficial da
 * A.A.A. Cangaceira (Medicina · UEMA).
 */
export const BrandMark: React.FC<BrandMarkProps> = ({
  size = 'md',
  inverted = false,
  showSubtitle = false,
  showEmblem = true,
  className = '',
}) => {
  const sizeConfig = {
    sm: {
      emblem: 'w-9 h-9',
      title: 'text-base',
      ix: 'text-xs px-1.5 py-0.5 rounded-md',
      sub: 'text-[9px]',
    },
    md: {
      emblem: 'w-10 h-10',
      title: 'text-lg',
      ix: 'text-xs px-2 py-0.5 rounded-md',
      sub: 'text-[10px]',
    },
    lg: {
      emblem: 'w-14 h-14',
      title: 'text-2xl',
      ix: 'text-sm px-2.5 py-0.5 rounded-lg',
      sub: 'text-[11px]',
    },
    xl: {
      emblem: 'w-20 h-20',
      title: 'text-3xl sm:text-4xl',
      ix: 'text-base sm:text-lg px-3 py-1 rounded-xl',
      sub: 'text-xs',
    },
  };

  const s = sizeConfig[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {showEmblem && (
        <div
          className={`relative flex items-center justify-center rounded-full overflow-hidden shrink-0 ring-2 ${
            inverted
              ? 'ring-brand-yellow/80 bg-brand-blue-dark shadow-md'
              : 'ring-brand-blue/15 bg-brand-blue shadow-sm'
          } ${s.emblem}`}
        >
          <img
            src="/assets/atletica/logo-alternativa.png"
            alt="A.A.A. Cangaceira Medicina UEMA"
            className="w-full h-full object-contain scale-105"
          />
        </div>
      )}

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className={`font-display font-extrabold tracking-tight ${
              inverted ? 'text-white' : 'text-brand-blue'
            } ${s.title}`}
          >
            INTRAMED
          </span>
          <span
            className={`font-display font-extrabold tracking-wider ${
              inverted
                ? 'bg-brand-yellow text-brand-blue-dark'
                : 'bg-brand-blue text-brand-yellow border border-brand-blue/15'
            } ${s.ix}`}
          >
            IX
          </span>
        </div>
        {showSubtitle && (
          <span
            className={`font-bold uppercase tracking-widest mt-1 ${
              inverted ? 'text-brand-yellow/90' : 'text-brand-text-secondary'
            } ${s.sub}`}
          >
            A.A.A. Cangaceira • UEMA
          </span>
        )}
      </div>
    </div>
  );
};
