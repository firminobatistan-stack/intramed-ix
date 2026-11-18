import React, { useLayoutEffect, useRef, useState } from 'react';

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });
  const hasMeasuredOnceRef = useRef(false);
  const [enableMotion, setEnableMotion] = useState(false);

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const el = tabRefs.current[activeTab];
      if (!el) return;
      setIndicator({
        left: el.offsetLeft,
        width: el.offsetWidth,
        ready: true,
      });
      if (!hasMeasuredOnceRef.current) {
        hasMeasuredOnceRef.current = true;
        requestAnimationFrame(() => setEnableMotion(true));
      }
    };

    updateIndicator();

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => updateIndicator())
        : null;
    if (ro && containerRef.current) {
      ro.observe(containerRef.current);
    }
    window.addEventListener('resize', updateIndicator);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeTab, tabs.length, variant]);

  if (variant === 'pill') {
    return (
      <div
        ref={containerRef}
        role="tablist"
        aria-label="Opções de filtro"
        className={`relative flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 ${className}`}
      >
        {indicator.ready && indicator.width > 0 && (
          <span
            aria-hidden="true"
            style={{
              transform: `translate3d(${indicator.left}px, 0, 0)`,
              width: `${indicator.width}px`,
            }}
            className={`pointer-events-none absolute top-1 bottom-1 left-0 rounded-xl bg-brand-blue shadow-[0_2px_8px_rgba(15,42,86,0.22)] ${
              enableMotion
                ? 'transition-[transform,width] duration-[220ms] ease-emil-out'
                : ''
            }`}
          />
        )}
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[tab.id] = node;
              }}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={`relative z-10 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap min-h-[38px] touch-manipulation select-none transition-[transform,color,background-color] duration-[150ms] ease-emil-out active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${
                isActive
                  ? indicator.ready
                    ? 'text-white'
                    : 'bg-brand-blue text-white shadow-sm'
                  : 'bg-brand-surface-muted/90 text-brand-text-secondary shadow-[inset_0_0_0_1px_rgba(15,42,86,0.07)] can-hover:hover:text-brand-text-primary can-hover:hover:bg-brand-blue-light/50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {typeof tab.badgeCount === 'number' && tab.badgeCount > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold tabular-nums ${
                    isActive
                      ? 'bg-brand-yellow text-brand-blue-dark'
                      : 'bg-brand-blue/10 text-brand-blue'
                  }`}
                >
                  {tab.badgeCount}
                </span>
              )}
              {isActive && typeof tab.badgeCount !== 'number' && (
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
      ref={containerRef}
      role="tablist"
      aria-label="Seções"
      className={`relative flex items-center border-b border-brand-surface-border/80 overflow-x-auto no-scrollbar ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              tabRefs.current[tab.id] = node;
            }}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative inline-flex items-center gap-2 px-4 py-3.5 text-sm font-semibold whitespace-nowrap min-h-[46px] touch-manipulation select-none transition-[transform,color] duration-[150ms] ease-emil-out active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue ${
              isActive
                ? 'text-brand-blue'
                : 'text-brand-text-secondary can-hover:hover:text-brand-text-primary'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {isActive && !indicator.ready && (
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
      {indicator.ready && indicator.width > 0 && (
        <span
          aria-hidden="true"
          style={{
            transform: `translate3d(${indicator.left + 12}px, 0, 0)`,
            width: `${Math.max(16, indicator.width - 24)}px`,
          }}
          className={`pointer-events-none absolute bottom-0 left-0 h-0.5 bg-brand-blue rounded-t-full flex items-center justify-center ${
            enableMotion
              ? 'transition-[transform,width] duration-[220ms] ease-emil-in-out'
              : ''
          }`}
        >
          <span className="w-3 h-0.5 bg-brand-yellow rounded-full" />
        </span>
      )}
    </div>
  );
};
