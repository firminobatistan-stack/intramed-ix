import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar,
  GitBranch,
  Home,
  Menu,
  Trophy,
  Tv,
} from 'lucide-react';
import { LiquidNavbar, LiquidNavItem } from '@/components/ui/liquid-glass-navbar';
import { useCompetitionStore } from '../../context/CompetitionStoreContext';

interface BottomNavProps {
  onOpenMenu?: () => void;
}

/**
 * Dock Móvel Liquid Glass ("Waterline" WebGL Metaball) nas cores oficiais do IntraMed IX:
 * - Pílula translúcida Azul Royal (#0B218A) + gota líquida Dourada (#FACC15) que estica,
 *   se divide em gotículas nos saltos longos e se funde com ondulações ao tocar.
 */
export const BottomNav: React.FC<BottomNavProps> = ({ onOpenMenu }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasActiveLiveMatch } = useCompetitionStore();

  const triggerHaptic = () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {
      // Silencioso
    }
  };

  const routes = useMemo(
    () => [
      { to: '/', exact: true },
      hasActiveLiveMatch ? { to: '/placar', exact: false } : { to: '/jogos', exact: false },
      { to: '/artilharia', exact: false },
      { to: '/chaveamento', exact: false },
    ],
    [hasActiveLiveMatch]
  );

  const activeIndex = useMemo(() => {
    for (let i = 0; i < routes.length; i++) {
      const r = routes[i];
      if (r.exact ? location.pathname === r.to : location.pathname.startsWith(r.to)) {
        return i;
      }
    }
    // Rotas secundárias abertas pelo Drawer ("Mais": equipes, comunidade, perfil, admin, inscrição)
    return 4;
  }, [location.pathname, routes]);

  const liquidItems = useMemo<LiquidNavItem[]>(
    () => [
      {
        label: 'Início',
        icon: <Home className="w-[18px] h-[18px]" />,
        fx: 'glow',
      },
      hasActiveLiveMatch
        ? {
            label: 'Ao Vivo',
            icon: <Tv className="w-[18px] h-[18px]" />,
            badge: (
              <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0B218A] animate-pulse" />
            ),
            fx: 'pop',
          }
        : {
            label: 'Jogos',
            icon: <Calendar className="w-[18px] h-[18px]" />,
            fx: 'pop',
          },
      {
        label: 'Artilharia',
        icon: <Trophy className="w-[18px] h-[18px]" />,
        fx: 'drop',
      },
      {
        label: 'Chaves',
        icon: <GitBranch className="w-[18px] h-[18px]" />,
        fx: 'spin',
      },
      {
        label: 'Mais',
        icon: <Menu className="w-[18px] h-[18px]" />,
        fx: 'wave',
      },
    ],
    [hasActiveLiveMatch]
  );

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-3 pb-3 pt-1 pointer-events-none pb-safe">
      <div className="pointer-events-auto max-w-md mx-auto">
        <LiquidNavbar
          tone="brand"
          dock
          sound={false}
          active={activeIndex}
          items={liquidItems}
          ariaLabel="Navegação móvel inferior"
          onChange={(idx) => {
            triggerHaptic();
            if (idx === 4) {
              onOpenMenu?.();
              return;
            }
            const target = routes[idx];
            if (target && location.pathname !== target.to) {
              navigate(target.to);
            }
          }}
        />
      </div>
    </div>
  );
};
