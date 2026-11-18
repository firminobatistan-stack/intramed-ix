import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface TabStickerSpec {
  id: string;
  src: string;
  /** Posição no pico do spring burst (vw / vh relativos ao centro superior) */
  peakX: number;
  peakY: number;
  /** Posição final na dispersão radial (Whatnot morph-out) */
  exitX: number;
  exitY: number;
  size: number;
  rotate: number;
  delayMs: number;
}

interface TabMotionTheme {
  badgeLabel: string;
  heroIcon: string;
  stickers: TabStickerSpec[];
}

function getTabMotionTheme(pathname: string): TabMotionTheme {
  const clean = pathname.toLowerCase();

  if (clean.startsWith('/chaveamento') || clean.startsWith('/artilharia')) {
    return {
      badgeLabel: clean.startsWith('/chaveamento') ? 'Chaveamento Oficial' : 'Artilharia & Rankings',
      heroIcon: '/assets/sports/trophy.png',
      stickers: [
        { id: 's1', src: '/assets/sports/trophy.png', peakX: -120, peakY: -36, exitX: -200, exitY: -95, size: 46, rotate: -15, delayMs: 0 },
        { id: 's2', src: '/assets/sports/medal.png', peakX: 124, peakY: -32, exitX: 205, exitY: -90, size: 44, rotate: 16, delayMs: 25 },
        { id: 's3', src: '/assets/sports/soccer.png', peakX: -150, peakY: 34, exitX: -235, exitY: 68, size: 40, rotate: -22, delayMs: 45 },
        { id: 's4', src: '/assets/sports/basketball.png', peakX: 148, peakY: 38, exitX: 230, exitY: 72, size: 40, rotate: 20, delayMs: 65 },
        { id: 's5', src: '/assets/sports/chess.png', peakX: 0, peakY: -78, exitX: 0, exitY: -145, size: 36, rotate: 8, delayMs: 35 },
      ],
    };
  }

  if (clean.startsWith('/jogos') || clean.startsWith('/placar')) {
    return {
      badgeLabel: 'Partidas & Confrontos',
      heroIcon: '/assets/sports/soccer.png',
      stickers: [
        { id: 's1', src: '/assets/sports/soccer.png', peakX: -126, peakY: -34, exitX: -210, exitY: -88, size: 46, rotate: -18, delayMs: 0 },
        { id: 's2', src: '/assets/sports/basketball.png', peakX: 126, peakY: -30, exitX: 210, exitY: -85, size: 44, rotate: 18, delayMs: 25 },
        { id: 's3', src: '/assets/sports/volleyball.png', peakX: -146, peakY: 36, exitX: -230, exitY: 74, size: 42, rotate: 15, delayMs: 45 },
        { id: 's4', src: '/assets/sports/goal.png', peakX: 146, peakY: 36, exitX: 230, exitY: 74, size: 42, rotate: -14, delayMs: 60 },
        { id: 's5', src: '/assets/sports/pingpong.png', peakX: 0, peakY: -76, exitX: 0, exitY: -140, size: 38, rotate: -12, delayMs: 30 },
      ],
    };
  }

  if (clean.startsWith('/competicoes')) {
    return {
      badgeLabel: '16 Modalidades',
      heroIcon: '/assets/sports/volleyball.png',
      stickers: [
        { id: 's1', src: '/assets/sports/volleyball.png', peakX: -122, peakY: -38, exitX: -205, exitY: -92, size: 45, rotate: -16, delayMs: 0 },
        { id: 's2', src: '/assets/sports/pingpong.png', peakX: 124, peakY: -34, exitX: 205, exitY: -88, size: 44, rotate: 18, delayMs: 20 },
        { id: 's3', src: '/assets/sports/billiards.png', peakX: -148, peakY: 34, exitX: -225, exitY: 70, size: 40, rotate: -20, delayMs: 40 },
        { id: 's4', src: '/assets/sports/chess.png', peakX: 148, peakY: 36, exitX: 225, exitY: 72, size: 40, rotate: 16, delayMs: 60 },
        { id: 's5', src: '/assets/sports/sneaker.png', peakX: 0, peakY: -76, exitX: 0, exitY: -140, size: 38, rotate: -10, delayMs: 30 },
      ],
    };
  }

  if (clean.startsWith('/inscricao') || clean.startsWith('/perfil') || clean.startsWith('/atleta')) {
    return {
      badgeLabel: clean.startsWith('/inscricao') ? 'Passaporte Atleta' : 'Perfil Oficial',
      heroIcon: '/assets/sports/medal.png',
      stickers: [
        { id: 's1', src: '/assets/sports/medal.png', peakX: -122, peakY: -34, exitX: -200, exitY: -90, size: 46, rotate: -14, delayMs: 0 },
        { id: 's2', src: '/assets/sports/sneaker.png', peakX: 124, peakY: -34, exitX: 205, exitY: -90, size: 44, rotate: 16, delayMs: 25 },
        { id: 's3', src: '/assets/sports/trophy.png', peakX: -144, peakY: 36, exitX: -225, exitY: 72, size: 42, rotate: -18, delayMs: 45 },
        { id: 's4', src: '/assets/sports/soccer.png', peakX: 144, peakY: 36, exitX: 225, exitY: 72, size: 42, rotate: 20, delayMs: 65 },
        { id: 's5', src: '/assets/atletica/escudo-evento.png', peakX: 0, peakY: -76, exitX: 0, exitY: -142, size: 40, rotate: 0, delayMs: 30 },
      ],
    };
  }

  return {
    badgeLabel: clean.startsWith('/feed') || clean.startsWith('/comunidade') ? 'Comunidade IntraMed' : 'IX IntraMed',
    heroIcon: '/assets/atletica/escudo-evento.png',
    stickers: [
      { id: 's1', src: '/assets/sports/trophy.png', peakX: -124, peakY: -36, exitX: -205, exitY: -92, size: 46, rotate: -15, delayMs: 0 },
      { id: 's2', src: '/assets/sports/soccer.png', peakX: 124, peakY: -34, exitX: 205, exitY: -90, size: 44, rotate: 17, delayMs: 20 },
      { id: 's3', src: '/assets/sports/basketball.png', peakX: -146, peakY: 34, exitX: -228, exitY: 70, size: 42, rotate: 20, delayMs: 40 },
      { id: 's4', src: '/assets/sports/volleyball.png', peakX: 146, peakY: 36, exitX: 228, exitY: 72, size: 42, rotate: -18, delayMs: 60 },
      { id: 's5', src: '/assets/sports/medal.png', peakX: 0, peakY: -76, exitX: 0, exitY: -142, size: 38, rotate: 10, delayMs: 30 },
    ],
  };
}

type BurstPhase = 'idle' | 'burst' | 'morphOut';

/**
 * TRANSIÇÃO FLUIDA 60FPS ENTRE ABAS — INSPIRADA NO SHOT "whatnot-splash-animation" (60fps.design)
 * - Quando o usuário troca de aba, dispara uma constelação contextual de stickers 3D esportivos
 *   que eclodem com física de mola (cubic-bezier(0.34, 1.56, 0.64, 1)) e depois fazem morph/dispersão
 *   radial para o topo do Header enquanto o conteúdo da nova aba entra com spring suave.
 * - 100% `pointer-events-none` e acelerado por GPU (`translate3d`) para zero bloqueio de clique.
 */
export const SportsTabTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const prevPathRef = useRef<string>(location.pathname);
  const [phase, setPhase] = useState<BurstPhase>('idle');
  const [contentEntered, setContentEntered] = useState(true);
  const [transitionKey, setTransitionKey] = useState(0);

  const theme = useMemo(() => getTabMotionTheme(location.pathname), [location.pathname]);

  useEffect(() => {
    if (prevPathRef.current === location.pathname) return;
    prevPathRef.current = location.pathname;

    setTransitionKey((k) => k + 1);
    setContentEntered(false);
    setPhase('burst');

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setContentEntered(true);
      });
    });

    const morphTimer = setTimeout(() => {
      setPhase('morphOut');
    }, 230);

    const idleTimer = setTimeout(() => {
      setPhase('idle');
    }, 580);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(morphTimer);
      clearTimeout(idleTimer);
    };
  }, [location.pathname]);

  return (
    <div className="relative">
      {/* Camada de Stickers Esportivos 3D estilo Whatnot 60fps durante a troca de aba */}
      {phase !== 'idle' && (
        <div
          key={transitionKey}
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-24 sm:top-28 z-[75] flex items-center justify-center overflow-visible"
        >
          <div className="relative w-10 h-10 flex items-center justify-center">
            {theme.stickers.map((s) => {
              const isBurst = phase === 'burst';
              const tx = isBurst ? s.peakX : s.exitX;
              const ty = isBurst ? s.peakY : s.exitY;
              const sc = isBurst ? 1 : 0.42;
              const rot = isBurst ? s.rotate : s.rotate * 1.75;
              const op = isBurst ? 0.96 : 0;

              return (
                <div
                  key={s.id}
                  style={{
                    width: s.size,
                    height: s.size,
                    marginLeft: -s.size / 2,
                    marginTop: -s.size / 2,
                    transform: `translate3d(${tx}px, ${ty}px, 0) scale(${sc}) rotate(${rot}deg)`,
                    opacity: op,
                    transitionProperty: 'transform, opacity',
                    transitionDuration: isBurst ? '230ms' : '320ms',
                    transitionTimingFunction: isBurst
                      ? 'cubic-bezier(0.34, 1.56, 0.64, 1)'
                      : 'cubic-bezier(0.22, 1, 0.36, 1)',
                    transitionDelay: isBurst ? `${s.delayMs}ms` : '0ms',
                  }}
                  className="absolute left-1/2 top-1/2 will-change-transform"
                >
                  <img
                    src={s.src}
                    alt=""
                    className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(11,33,138,0.22)]"
                  />
                </div>
              );
            })}

            {/* Pílula Central Shared-Element que sobe e ancora no Header (Whatnot Logo Morph) */}
            <div
              style={{
                transform:
                  phase === 'burst'
                    ? 'translate3d(0, 0, 0) scale(1)'
                    : 'translate3d(0, -56px, 0) scale(0.55)',
                opacity: phase === 'burst' ? 1 : 0,
                transitionProperty: 'transform, opacity',
                transitionDuration: phase === 'burst' ? '210ms' : '310ms',
                transitionTimingFunction:
                  phase === 'burst'
                    ? 'cubic-bezier(0.34, 1.56, 0.64, 1)'
                    : 'cubic-bezier(0.22, 1, 0.36, 1)',
              }}
              className="relative z-10 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-[0_10px_28px_rgba(11,33,138,0.18),0_0_0_1px_rgba(11,33,138,0.10)] whitespace-nowrap will-change-transform"
            >
              <img
                src={theme.heroIcon}
                alt=""
                className="w-5 h-5 object-contain shrink-0"
              />
              <span className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#0B218A]">
                {theme.badgeLabel}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba com Spring Morph de 60fps (remove transform ao concluir para não prender modais fixed) */}
      <div
        style={
          phase === 'idle' && contentEntered
            ? undefined
            : {
                transform: contentEntered
                  ? 'translate3d(0, 0, 0) scale(1)'
                  : 'translate3d(0, 12px, 0) scale(0.986)',
                opacity: contentEntered ? 1 : 0.35,
                transitionProperty: 'transform, opacity',
                transitionDuration: contentEntered ? '360ms' : '0ms',
                transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
              }
        }
      >
        {children}
      </div>
    </div>
  );
};
