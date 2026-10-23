import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  PlayCircle,
  Trophy,
  Shield,
  User,
  ClipboardList,
} from 'lucide-react';
import { useCompetitionStore } from '../../context/CompetitionStoreContext';

interface NavItemConfig {
  to: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  matchPrefix?: string;
}

/**
 * Navegação Inferior Flutuante Arredondada (Floating Pill Dock)
 * - Para o público/torcida e atletas: Início | Equipes | Ao Vivo | Esportes | Perfil
 * - Para administradores/mesários autenticados: exibe o atalho direto de Súmula.
 */
export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { canOperateOfficialData } = useCompetitionStore();
  const isAdmin = canOperateOfficialData();

  const navItems: NavItemConfig[] = [
    {
      to: '/',
      label: 'Início',
      icon: Home,
    },
    {
      to: '/equipe',
      label: 'Equipes',
      icon: Shield,
      matchPrefix: '/equipe',
    },
    {
      to: '/placar',
      label: 'Ao Vivo',
      icon: PlayCircle,
      matchPrefix: '/placar',
    },
    {
      to: '/competicoes',
      label: 'Esportes',
      icon: Trophy,
      matchPrefix: '/competicoes',
    },
    isAdmin
      ? {
          to: '/admin',
          label: 'Súmula',
          icon: ClipboardList,
          matchPrefix: '/admin',
        }
      : {
          to: '/perfil',
          label: 'Perfil',
          icon: User,
          matchPrefix: '/perfil',
        },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-4 pb-3 pt-1 pointer-events-none pb-safe"
    >
      <div className="pointer-events-auto flex items-center justify-between max-w-sm mx-auto px-2.5 py-2 rounded-full bg-[#0B218A]/95 backdrop-blur-xl border border-white/15 shadow-[0_12px_32px_rgba(11,33,138,0.38)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.matchPrefix || item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className="group relative flex flex-col items-center justify-center select-none focus:outline-none"
            >
              <div
                className={`relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-yellow text-[#0B218A] shadow-[0_0_16px_rgba(250,204,21,0.55)] scale-105'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
