import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Shield, Sparkles, Trophy } from 'lucide-react';
import { LiquidNavbar, LiquidNavItem } from '@/components/ui/liquid-glass-navbar';

interface SplashScreenProps {
  isVisible: boolean;
}

/**
 * SPLASH SCREEN OFICIAL — IX INTRAMED (A.A.A.M.U. CANGACEIRA)
 * Abre sempre na inicialização do app exibindo a Logo Oficial do IX INTRAMED
 * acompanhada da cápsula WebGL Liquid Glass ("Waterline" Metaball) em Azul Royal & Ouro,
 * na qual a gota dourada estica, solta gotículas e ondula pelos 4 estágios de abertura.
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ isVisible }) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [entered, setEntered] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setStepIndex(0);
      const raf = requestAnimationFrame(() => setEntered(true));
      const t1 = setTimeout(() => setStepIndex(1), 460);
      const t2 = setTimeout(() => setStepIndex(2), 980);
      const t3 = setTimeout(() => setStepIndex(3), 1500);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else if (shouldRender) {
      const exitTimer = setTimeout(() => {
        setShouldRender(false);
        setEntered(false);
      }, 340);
      return () => clearTimeout(exitTimer);
    }
  }, [isVisible, shouldRender]);

  const loadingStages = useMemo<LiquidNavItem[]>(
    () => [
      {
        label: 'IX Edição',
        icon: <Sparkles className="w-4 h-4" />,
        fx: 'glow',
      },
      {
        label: '5 Turmas',
        icon: <Shield className="w-4 h-4" />,
        fx: 'spin',
      },
      {
        label: '16 Esportes',
        icon: <Calendar className="w-4 h-4" />,
        fx: 'pop',
      },
      {
        label: 'Pronto',
        icon: <Trophy className="w-4 h-4" />,
        fx: 'drop',
      },
    ],
    []
  );

  if (!shouldRender) return null;

  const isClosing = !isVisible;

  return (
    <div
      role="status"
      aria-label="Abrindo IX INTRAMED"
      className={`fixed inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden select-none bg-[#F4F6FB] transition-[opacity,transform,filter] duration-[320ms] ease-emil-out ${
        isClosing
          ? 'opacity-0 scale-[1.02] blur-[3px] pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
    >
      {/* Aura luminosa suave Azul Royal & Dourado sobre o fundo claro oficial */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(255, 255, 255, 0.96) 0%, rgba(244, 246, 251, 0.92) 48%, rgba(11, 33, 138, 0.06) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute w-[360px] h-[360px] sm:w-[460px] sm:h-[460px] rounded-full blur-3xl opacity-45"
        style={{
          background:
            'radial-gradient(circle, rgba(250, 204, 21, 0.28) 0%, rgba(11, 33, 138, 0.14) 55%, transparent 75%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center px-6 w-full max-w-md">
        {/* Emblema Oficial do Evento: IX INTRAMED • DESDE 2017 • A.A.A.M.U. CANGACEIRA */}
        <div
          className={`w-56 h-56 sm:w-64 sm:h-64 mb-6 flex items-center justify-center transition-[transform,opacity] duration-[520ms] ease-emil-out ${
            entered ? 'scale-100 opacity-100 translate-y-0' : 'scale-[0.93] opacity-0 translate-y-2'
          }`}
        >
          <img
            src="/assets/atletica/logo-evento.png"
            alt="IX INTRAMED — Desde 2017 — A.A.A.M.U. Cangaceira"
            loading="eager"
            decoding="sync"
            className="w-full h-full object-contain drop-shadow-[0_14px_28px_rgba(11,33,138,0.14)]"
          />
        </div>

        {/* Cápsula Liquid Glass ("Waterline" WebGL Metaball) animando os estágios de entrada */}
        <div
          aria-hidden="true"
          className={`w-full max-w-[330px] pointer-events-none transition-[transform,opacity] duration-[460ms] delay-[80ms] ease-emil-out ${
            entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <LiquidNavbar
            tone="brand"
            dock
            sound={false}
            active={stepIndex}
            items={loadingStages}
            ariaLabel="Progresso de inicialização"
          />
        </div>
      </div>
    </div>
  );
};
