import React, { useState } from 'react';
import { OFFICIAL_MODALITIES, INITIAL_BRACKETS } from '../data/officialData';
import { BracketView } from '../components/sports/BracketView';
import { Tabs, TabItem } from '../components/ui/Tabs';
import { SportIcon } from '../components/sports/SportIcon';

/**
 * 10. CHAVEAMENTO (Página dedicada)
 * Permite visualizar a estrutura de chaveamento (Quartas de final → Semifinais → Final)
 * por modalidade oficial, mantendo o estado vazio até o cadastro oficial das equipes.
 */
export const BracketPage: React.FC = () => {
  const [selectedModalityId, setSelectedModalityId] = useState<string>(
    OFFICIAL_MODALITIES[0].id
  );

  const modalityTabs: TabItem[] = OFFICIAL_MODALITIES.map((mod) => ({
    id: mod.id,
    label: mod.name,
    icon: <SportIcon iconKey={mod.iconKey} className="w-3.5 h-3.5" />,
  }));

  const currentModality =
    OFFICIAL_MODALITIES.find((m) => m.id === selectedModalityId) ||
    OFFICIAL_MODALITIES[0];

  const currentBracket = INITIAL_BRACKETS[currentModality.id] || null;

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-brand-surface-border">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-4 rounded-full bg-brand-yellow" aria-hidden="true" />
          <h2 className="text-lg sm:text-xl font-display font-bold text-brand-text-primary">
            Chaveamento Oficial
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-brand-text-secondary mt-1">
          Estrutura de fases eliminatórias (Quartas de final → Semifinais → Final).
        </p>
      </div>

      {/* Seletor de Modalidade */}
      <Tabs
        tabs={modalityTabs}
        activeTab={selectedModalityId}
        onChange={setSelectedModalityId}
        variant="pill"
      />

      {/* Componente de Chaveamento */}
      <BracketView
        bracket={currentBracket}
        modalityName={currentModality.name}
      />
    </div>
  );
};
