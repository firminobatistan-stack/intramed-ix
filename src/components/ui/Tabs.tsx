import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badgeCount?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pill';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className = '',
}) => {
  if (variant === 'pill') {
    return (
      <div
        role="tablist"
        aria-label="Opções de filtro"
        className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 ${className}`}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 min-h-[38px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${
                isActive
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'bg-brand-surface-muted text-brand-text-secondary border border-brand-surface-border hover:text-brand-text-primary hover:bg-brand-blue-light/50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {isActive && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-brand-yellow"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      aria-label="Seções"
      className={`flex items-center border-b border-brand-surface-border overflow-x-auto no-scrollbar ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative inline-flex items-center gap-2 px-4 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors duration-150 min-h-[46px] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue ${
              isActive
                ? 'text-brand-blue'
                : 'text-brand-text-secondary hover:text-brand-text-primary'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {isActive && (
              <span
                className="absolute bottom-0 left-3 right-3 h-0.5 bg-brand-blue rounded-t-full flex items-center justify-center"
                aria-hidden="true"
              >
                <span className="w-3 h-0.5 bg-brand-yellow rounded-full" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
