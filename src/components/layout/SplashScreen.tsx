import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Shield, Sparkles, Trophy } from 'lucide-react';
import { LiquidNavbar, LiquidNavItem } from '@/components/ui/liquid-glass-navbar';

interface SplashScreenProps {
  isVisible: boolean;
}

interface FloatingSportSticker {
  id: string;
  src: string;
  alt: string;
  /** Posição em órbita ao redor da logo central (em % ou px relativos ao centro) */
  x: number;
  y: number;
  /** Vetor de expansão radial na saída estilo Whatnot 60fps */
  exitX: number;
  exitY: number;
  size: number;
  rotate: number;
  delayMs: number;
  floatDurationSec: number;
}

const WHATNOT_SPORTS_STICKERS: FloatingSportSticker[] = [
  {
    id: 'soccer',
    src: '/assets/sports/soccer.png',
    alt: 'Bola de Futebol 3D',
    x: -145,
    y: -125,
    exitX: -240,
    exitY: -210,
    size: 58,
    rotate: -16,
    delayMs: 40,
    floatDurationSec: 3.1,
  },
  {
    id: 'trophy',
    src: '/assets/sports/trophy.png',
    alt: 'Troféu Oficial 3D',
    x: 148,
    y: -120,
    exitX: 245,
    exitY: -205,
    size: 62,
    rotate: 14,
    delayMs: 90,
    floatDurationSec: 3.4,
  },
  {
    id: 'basketball',
    src: '/assets/sports/basketball.png',
    alt: 'Bola de Basquete 3D',
    x: -168,
    y: 10,
    exitX: -270,
    exitY: 18,
    size: 54,
    rotate: 22,
    delayMs: 140,
    floatDurationSec: 2.9,
  },
  {
    id: 'volleyball',
    src: '/assets/sports/volleyball.png',
    alt: 'Bola de Vôlei 3D',
    x: 166,
    y: 14,
    exitX: 268,
    exitY: 24,
    size: 54,
    rotate: -18,
    delayMs: 180,
    floatDurationSec: 3.2,
  },
  {
    id: 'pingpong',
    src: '/assets/sports/pingpong.png',
    alt: 'Raquete de Tênis de Mesa 3D',
    x: -128,
    y: 132,
    exitX: -215,
    exitY: 220,
    size: 50,
    rotate: -24,
    delayMs: 220,
    floatDurationSec: 3.5,
  },
  {
    id: 'medal',
    src: '/assets/sports/medal.png',
    alt: 'Medalha de Ouro 3D',
    x: 132,
    y: 130,
    exitX: 220,
    exitY: 215,
    size: 52,
    rotate: 15,
    delayMs: 260,
    floatDurationSec: 3.0,
  },
  {
    id: 'billiards',
    src: '/assets/sports/billiards.png',
    alt: 'Bola 8 de Sinuca 3D',
    x: -58,
    y: -168,
    exitX: -95,
    exitY: -265,
    size: 44,
    rotate: -12,
    delayMs: 120,
    floatDurationSec: 3.6,
  },
  {
    id: 'sneaker',
    src: '/assets/sports/sneaker.png',
    alt: 'Tênis Esportivo 3D',
    x: 64,
    y: -166,
    exitX: 105,
    exitY: -260,
    size: 46,
    rotate: 18,
    delayMs: 160,
    floatDurationSec: 3.3,
  },
];

/**
 * SPLASH SCREEN OFICIAL — IX INTRAMED (A.A.A.M.U. CANGACEIRA)
 * Inspirado no motion breakdown 60fps "whatnot-splash-animation":
 * 1. Entrada com spring physics: Emblema central IX INTRAMED rodeado por stickers 3D esportivos
 *    que eclodem radialmente a partir do centro com stagger (40ms–260ms) e flutuação contínua.
 * 2. Saída em Shared-Element Morph: Os elementos esportivos 3D expandem radialmente liberando o palco,
 *    enquanto a logo central faz morph suave para o topo (posição do Header da aplicação).
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
      }, 520);
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
      className={`fixed inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden select-none bg-[#F4F6FB] transition-opacity duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Aura luminosa suave Azul Royal & Dourado sobre o fundo claro oficial */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(255, 255, 255, 0.97) 0%, rgba(244, 246, 251, 0.94) 50%, rgba(11, 33, 138, 0.07) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute w-[360px] h-[360px] sm:w-[460px] sm:h-[460px] rounded-full blur-3xl opacity-50"
        style={{
          background:
            'radial-gradient(circle, rgba(250, 204, 21, 0.30) 0%, rgba(11, 33, 138, 0.15) 55%, transparent 75%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center px-6 w-full max-w-md">
        {/* Palco Central: Stickers 3D Esportivos em Órbita (Whatnot Style) + Emblema Oficial IX INTRAMED */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 mb-5 flex items-center justify-center">
          {/* Halo de Stickers Esportivos 3D com Spring Burst & Dispersão Radial na Saída */}
          {WHATNOT_SPORTS_STICKERS.map((sticker) => {
            const tx = isClosing ? sticker.exitX : entered ? sticker.x : 0;
            const ty = isClosing ? sticker.exitY : entered ? sticker.y : 0;
            const sc = isClosing ? 0.45 : entered ? 1 : 0.15;
            const rot = isClosing
              ? sticker.rotate * 1.8
              : entered
              ? sticker.rotate
              : 0;
            const op = isClosing ? 0 : entered ? 1 : 0;

            return (
              <div
                key={sticker.id}
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2"
                style={{
                  width: sticker.size,
                  height: sticker.size,
                  marginLeft: -sticker.size / 2,
                  marginTop: -sticker.size / 2,
                  transform: `translate3d(${tx}px, ${ty}px, 0) scale(${sc}) rotate(${rot}deg)`,
                  opacity: op,
                  transitionProperty: 'transform, opacity',
                  transitionDuration: isClosing ? '440ms' : '640ms',
                  transitionTimingFunction: isClosing
                    ? 'cubic-bezier(0.32, 0, 0.67, 0)'
                    : 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transitionDelay: isClosing ? '0ms' : `${sticker.delayMs}ms`,
                }}
              >
                <img
                  src={sticker.src}
                  alt={sticker.alt}
                  className="w-full h-full object-contain drop-shadow-[0_10px_18px_rgba(11,33,138,0.18)]"
                />
              </div>
            );
          })}

          {/* Emblema Oficial do Evento: Shared-Element Morph para o Header no fechamento */}
          <div
            style={{
              transform: isClosing
                ? 'translate3d(0, -34vh, 0) scale(0.38)'
                : entered
                ? 'translate3d(0, 0, 0) scale(1)'
                : 'translate3d(0, 12px, 0) scale(0.84)',
              opacity: isClosing ? 0 : entered ? 1 : 0,
              transitionProperty: 'transform, opacity',
              transitionDuration: isClosing ? '480ms' : '580ms',
              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            className="relative z-10 w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center"
          >
            <img
              src="/assets/atletica/logo-evento.png"
              alt="IX INTRAMED — Desde 2017 — A.A.A.M.U. Cangaceira"
              loading="eager"
              decoding="sync"
              className="w-full h-full object-contain drop-shadow-[0_16px_30px_rgba(11,33,138,0.16)]"
            />
          </div>
        </div>

        {/* Cápsula Liquid Glass ("Waterline" WebGL Metaball) animando os estágios de entrada */}
        <div
          aria-hidden="true"
          style={{
            transform: isClosing
              ? 'translate3d(0, 28px, 0) scale(0.92)'
              : entered
              ? 'translate3d(0, 0, 0) scale(1)'
              : 'translate3d(0, 14px, 0) scale(0.95)',
            opacity: isClosing ? 0 : entered ? 1 : 0,
            transitionProperty: 'transform, opacity',
            transitionDuration: isClosing ? '340ms' : '480ms',
            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }}
          className="w-full max-w-[330px] pointer-events-none"
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
