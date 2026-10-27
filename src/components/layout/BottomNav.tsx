import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Tv,
  GitBranch,
  CreditCard,
  Menu,
} from 'lucide-react';

interface BottomNavProps {
  onOpenMenu?: () => void;
}

/**
 * Dock de Navegação Móvel Otimizado para Ergonomia (Floating Dock com Thumb-Zone)
 * - 5 Ações estratégicas com rótulos nítidos em Montserrat:
 *   1. Início (Home)
 *   2. Inscrição (Portal de Inscrições & Pagamento)
 *   3. Ao Vivo (Match Center & Placar)
 *   4. Chaves (Chaveamento 5 Equipes)
 *   5. Menu (Abre o Drawer completo com esportes, equipes, perfil, favoritos e admin)
 */
export const BottomNav: React.FC<BottomNavProps> = ({ onOpenMenu }) => {
  const location = useLocation();

  const triggerHaptic = () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {
      // Silencioso
    }
  };

  const navItems = [
    {
      to: '/',
      label: 'Início',
      icon: Home,
      exact: true,
    },
    {
      to: '/inscricao',
      label: 'Inscrição',
      icon: CreditCard,
      highlight: true,
    },
    {
      to: '/placar',
      label: 'Ao Vivo',
      icon: Tv,
      isLive: true,
    },
    {
      to: '/chaveamento',
      label: 'Chaves',
      icon: GitBranch,
    },
  ];

  return (
    <nav
      aria-label="Navegação móvel inferior"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-3 pb-3 pt-1 pointer-events-none pb-safe"
    >
      <div className="pointer-events-auto flex items-center justify-around max-w-md mx-auto px-2 py-1.5 rounded-full bg-[#0B218A]/95 backdrop-blur-xl border border-white/15 shadow-[0_12px_32px_rgba(11,33,138,0.45)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={triggerHaptic}
              title={item.label}
              className="group relative flex flex-col items-center justify-center py-1 px-2 select-none focus:outline-none transition-transform active:scale-95"
            >
              <div
                className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-yellow text-[#0B218A] shadow-[0_0_16px_rgba(250,204,21,0.55)] scale-105'
                    : item.highlight
                    ? 'bg-amber-400/20 text-brand-yellow'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.isLive && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0B218A] animate-pulse" />
                )}
                {item.highlight && !isActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand-yellow ring-2 ring-[#0B218A]" />
                )}
              </div>
              <span
                className={`text-[9px] font-black tracking-tight mt-0.5 block transition-colors leading-none ${
                  isActive ? 'text-brand-yellow' : 'text-white/70'
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}

        {/* Botão de Menu Completo (Abre Drawer Lateral com todas as 16 modalidades, favoritos e admin) */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            onOpenMenu?.();
          }}
          title="Mais opções e modalidades"
          aria-label="Abrir menu completo"
          className="group relative flex flex-col items-center justify-center py-1 px-2 select-none focus:outline-none transition-transform active:scale-95"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all">
            <Menu className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-black tracking-tight mt-0.5 block text-white/70 leading-none">
            Mais
          </span>
        </button>
      </div>
    </nav>
  );
};
