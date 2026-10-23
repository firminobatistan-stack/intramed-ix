import React from 'react';
import { ChevronRight } from 'lucide-react';
import { SportModality } from '../../types/domain';
import { SportIcon } from './SportIcon';

interface ModalityCardProps {
  modality: SportModality;
  onClick: (modality: SportModality) => void;
}

/**
 * Card oficial de Modalidade Esportiva.
 * Exibe exclusivamente o nome oficial da modalidade e seu ícone esportivo.
 */
export const ModalityCard: React.FC<ModalityCardProps> = ({ modality, onClick }) => {
  return (
    <button
      type="button"
      onClick={() => onClick(modality)}
      className="group relative w-full text-left bg-white rounded-3xl border border-brand-surface-border p-5 shadow-card hover:shadow-card-hover hover:border-brand-blue/30 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue active:scale-[0.99] flex items-center justify-between gap-4 overflow-hidden"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="relative w-14 h-14 rounded-2xl bg-brand-blue text-white group-hover:bg-brand-blue-medium transition-colors duration-200 flex items-center justify-center shrink-0 shadow-sm">
          <SportIcon iconKey={modality.iconKey} className="w-7 h-7 text-brand-yellow" />
          <span
            className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-brand-yellow ring-2 ring-white"
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-text-muted block">
            INTRAMED IX
          </span>
          <h3 className="text-base sm:text-lg font-display font-extrabold text-brand-text-primary group-hover:text-brand-blue transition-colors truncate">
            {modality.name}
          </h3>
          <p className="text-xs text-brand-text-secondary mt-0.5">
            Jogos • Chaveamento • Súmula
          </p>
        </div>
      </div>

      <div className="w-9 h-9 rounded-2xl bg-brand-surface-muted group-hover:bg-brand-yellow flex items-center justify-center text-brand-blue group-hover:text-brand-blue-dark transition-colors shrink-0">
        <ChevronRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
      </div>
    </button>
  );
};
