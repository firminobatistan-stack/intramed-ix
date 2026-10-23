import React from 'react';

interface SplashScreenProps {
  isVisible: boolean;
}

/**
 * 5. SPLASH SCREEN
 * Composição oficial INTRAMED IX com o brasão da Atlética Cangaceira (Medicina · UEMA).
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-brand-blue-dark text-white transition-opacity duration-300 select-none overflow-hidden"
      role="status"
      aria-label="INTRAMED IX"
    >
      {/* Marca d'água sutil do mascote monocromático ao fundo */}
      <img
        src="/assets/atletica/mascote-monocor.png"
        alt=""
        aria-hidden="true"
        className="absolute w-[420px] sm:w-[540px] opacity-[0.04] pointer-events-none select-none invert"
      />

      <div className="relative z-10 flex flex-col items-center px-6">
        {/* Brasão Oficial da Atlética Cangaceira */}
        <div className="w-28 h-28 sm:w-32 sm:h-32 mb-5 drop-shadow-2xl">
          <img
            src="/assets/atletica/logo.png"
            alt="Atlética Cangaceira — Medicina UEMA"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Composição tipográfica principal INTRAMED IX */}
        <div className="flex items-center gap-2.5">
          <span className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-white">
            INTRAMED
          </span>
          <span className="px-3 py-1 rounded-xl bg-brand-yellow text-brand-blue-dark text-2xl sm:text-3xl font-display font-extrabold tracking-wider shadow-md">
            IX
          </span>
        </div>

        {/* Barra de progresso minimalista */}
        <div className="mt-7 w-28 h-1 rounded-full bg-white/15 overflow-hidden" aria-hidden="true">
          <div className="w-1/2 h-full bg-brand-yellow rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
};
