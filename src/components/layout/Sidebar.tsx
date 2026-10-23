import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Trophy,
  Calendar,
  User,
  GitBranch,
  LogIn,
  ClipboardList,
  Tv,
  Heart,
  Bell,
  Layers,
  Shield,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { BrandMark } from './BrandMark';
import { useCompetitionStore } from '../../context/CompetitionStoreContext';

interface SidebarItem {
  to: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  matchPrefix?: string;
}

const PRIMARY_ITEMS: SidebarItem[] = [
  {
    to: '/',
    label: 'Início',
    icon: Home,
  },
  {
    to: '/inscricao',
    label: 'Inscrições & Pagamento',
    icon: CreditCard,
    matchPrefix: '/inscricao',
  },
  {
    to: '/competicoes',
    label: 'Competições & Esportes',
    icon: Trophy,
    matchPrefix: '/competicoes',
  },
  {
    to: '/jogos',
    label: 'Calendário de Jogos',
    icon: Calendar,
    matchPrefix: '/jogos',
  },
  {
    to: '/favoritos',
    label: 'Favoritos',
    icon: Heart,
    matchPrefix: '/favoritos',
  },
  {
    to: '/notificacoes',
    label: 'Central de Alertas',
    icon: Bell,
    matchPrefix: '/notificacoes',
  },
  {
    to: '/perfil',
    label: 'Perfil',
    icon: User,
    matchPrefix: '/perfil',
  },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, canOperateOfficialData } = useCompetitionStore();
  const isAdmin = canOperateOfficialData();

  return (
    <aside
      aria-label="Menu lateral"
      className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 bg-brand-blue-dark text-white border-r border-white/10 z-40 select-none shadow-2xl"
    >
      <div className="h-16 px-6 flex items-center border-b border-white/10 bg-brand-blue">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="focus:outline-none text-left"
        >
          <BrandMark size="md" inverted />
        </button>
      </div>

      <div className="flex-1 px-3.5 py-6 space-y-6 overflow-y-auto">
        <div>
          <p className="px-3 mb-2.5 text-[11px] font-bold uppercase tracking-wider text-white/45">
            Navegação Oficial
          </p>
          <nav className="space-y-1">
            {PRIMARY_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.matchPrefix || item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`group relative flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-yellow text-brand-blue-dark font-display font-extrabold shadow-sm'
                      : 'text-white/75 hover:text-white hover:bg-white/10 font-medium'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive
                        ? 'text-brand-blue-dark'
                        : 'text-white/60 group-hover:text-brand-yellow'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block leading-tight">{item.label}</span>
                  </div>
                  {isActive && (
                    <span
                      className="w-2 h-2 rounded-full bg-brand-blue-dark"
                      aria-hidden="true"
                    />
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Estrutura Esportiva & Transmissão */}
        <div>
          <p className="px-3 mb-2.5 text-[11px] font-bold uppercase tracking-wider text-white/45">
            Competição &amp; Ao Vivo
          </p>
          <div className="space-y-1">
            {isAdmin && (
              <>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `group flex items-center justify-between gap-3 px-3.5 py-3 rounded-2xl text-sm transition-all duration-150 ${
                      isActive && location.pathname === '/admin'
                        ? 'bg-brand-yellow text-brand-blue-dark font-display font-extrabold shadow-sm'
                        : 'text-white/75 hover:text-white hover:bg-white/10 font-medium'
                    }`
                  }
                >
                  <span className="flex items-center gap-3">
                    <ClipboardList className="w-5 h-5 shrink-0 text-brand-yellow group-hover:text-brand-yellow" />
                    <span>Súmula ao Vivo / Admin</span>
                  </span>
                  <span className="w-2 h-2 rounded-full bg-brand-yellow" />
                </NavLink>

                <NavLink
                  to="/admin/inscricoes"
                  className={({ isActive }) =>
                    `group flex items-center justify-between gap-3 px-3.5 py-3 rounded-2xl text-sm transition-all duration-150 ${
                      isActive
                        ? 'bg-brand-yellow text-brand-blue-dark font-display font-extrabold shadow-sm'
                        : 'text-white/75 hover:text-white hover:bg-white/10 font-medium'
                    }`
                  }
                >
                  <span className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 shrink-0 text-brand-yellow group-hover:text-brand-yellow" />
                    <span>Gestão de Inscrições</span>
                  </span>
                  <span className="w-2 h-2 rounded-full bg-brand-yellow" />
                </NavLink>
              </>
            )}

            <NavLink
              to="/placar"
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-yellow text-brand-blue-dark font-display font-extrabold shadow-sm'
                    : 'text-white/75 hover:text-white hover:bg-white/10 font-medium'
                }`
              }
            >
              <Tv className="w-5 h-5 shrink-0 text-brand-yellow" />
              <span>Match Center Ao Vivo</span>
            </NavLink>

            <NavLink
              to="/chaveamento"
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-yellow text-brand-blue-dark font-display font-extrabold shadow-sm'
                    : 'text-white/75 hover:text-white hover:bg-white/10 font-medium'
                }`
              }
            >
              <GitBranch className="w-5 h-5 shrink-0 text-brand-yellow" />
              <span>Chaveamento</span>
            </NavLink>

            <NavLink
              to="/equipe"
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-yellow text-brand-blue-dark font-display font-extrabold shadow-sm'
                    : 'text-white/75 hover:text-white hover:bg-white/10 font-medium'
                }`
              }
            >
              <Shield className="w-5 h-5 shrink-0 text-brand-yellow" />
              <span>Página de Equipe</span>
            </NavLink>

            <NavLink
              to="/design-system"
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-yellow text-brand-blue-dark font-display font-extrabold shadow-sm'
                    : 'text-white/75 hover:text-white hover:bg-white/10 font-medium'
                }`
              }
            >
              <Layers className="w-5 h-5 shrink-0 text-brand-yellow" />
              <span>Design System & Case</span>
            </NavLink>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-white/10 bg-brand-blue/60 space-y-3">
        {/* Card Institucional da Atlética Organizadora */}
        <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-white flex items-center gap-3">
          <img
            src="/assets/atletica/logo-alternativa.png"
            alt="A.A.A. Cangaceira"
            className="w-10 h-10 object-contain shrink-0"
          />
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-yellow block">
              Realização Oficial
            </span>
            <span className="text-xs font-display font-bold text-white block truncate">
              A.A.A. Cangaceira
            </span>
            <span className="text-[10px] text-white/75 block truncate">
              Medicina · UEMA
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(currentUser ? '/perfil' : '/login')}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-brand-yellow hover:bg-brand-yellow-dark text-xs font-display font-extrabold text-brand-blue-dark shadow-sm transition-all"
        >
          <span className="flex items-center gap-2 truncate">
            <LogIn className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {currentUser ? currentUser.name : 'Entrar (Atleta / Admin)'}
            </span>
          </span>
          <span className="w-2 h-2 rounded-full bg-brand-blue-dark shrink-0" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
};
