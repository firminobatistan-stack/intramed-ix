import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Bell,
  ClipboardList,
  Menu,
  Search,
} from 'lucide-react';
import { QuickSearchModal } from './QuickSearchModal';
import { useCompetitionStore } from '../../context/CompetitionStoreContext';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onOpenMobileNav?: () => void;
}

/**
 * Cabeçalho inspirado diretamente no case visual:
 * - Fundo Azul Royal com textura hexagonal sutil (.all-sports-header);
 * - Linha superior: Botão Menu/Voltar + Logo Oficial INTRAMED IX
 *   + Botões de Busca ("Search") e Sino ("Notification") à direita;
 * - Menu Bar inferior integrado no próprio cabeçalho azul ("Ao Vivo", "Partidas", "Modalidades", "Períodos", "Atletas")
 *   com barra indicadora Amarela (#FACC15) na aba ativa.
 */
export const Header: React.FC<HeaderProps> = ({
  title,
  showBack,
  onOpenMobileNav,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { notifications, currentUser, canOperateOfficialData, syncStatus } =
    useCompetitionStore();
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const isAdmin = canOperateOfficialData();

  // Atalho global Ctrl+K / Cmd+K para busca rápida
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isSubRoute =
    showBack ||
    (location.pathname.startsWith('/competicoes/') &&
      location.pathname !== '/competicoes') ||
    location.pathname === '/chaveamento' ||
    location.pathname === '/admin' ||
    location.pathname.startsWith('/equipe') ||
    location.pathname.startsWith('/atleta');

  const topMenuTabs = [
    { id: 'livetv', label: 'Ao Vivo', path: '/placar' },
    { id: 'matches', label: 'Partidas', path: '/' },
    { id: 'leagues', label: 'Modalidades', path: '/competicoes' },
    { id: 'teams', label: 'Períodos', path: '/equipe' },
    { id: 'athletes', label: 'Atletas', path: '/atleta' },
    { id: 'comunidade', label: 'Comunidade', path: '/comunidade' },
  ];

  const getActiveTopTab = () => {
    if (location.pathname.startsWith('/placar')) return 'livetv';
    if (
      location.pathname.startsWith('/competicoes') ||
      location.pathname.startsWith('/chaveamento')
    ) {
      return 'leagues';
    }
    if (location.pathname.startsWith('/equipe')) return 'teams';
    if (location.pathname.startsWith('/atleta')) return 'athletes';
    if (
      location.pathname.startsWith('/comunidade') ||
      location.pathname.startsWith('/perfil')
    ) {
      return 'comunidade';
    }
    return 'matches';
  };

  const activeTopTab = getActiveTopTab();

  return (
    <>
      <header className="sticky top-0 z-30 all-sports-header text-white shadow-lg border-b border-white/10">
        {/* Linha Superior do Cabeçalho (Menu/Back + Sports Category Pill + Calendar/Search & Notification) */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-3.5 pb-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {isSubRoute ? (
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="Voltar"
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenMobileNav?.();
                }}
                aria-label="Abrir menu de navegação"
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 text-white transition-all lg:hidden cursor-pointer touch-manipulation select-none"
              >
                <Menu className="w-5 h-5 pointer-events-none" />
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-left"
            >
              <img
                src="/assets/atletica/face.png"
                alt=""
                className="w-7 h-7 rounded-full object-contain bg-white/10 p-0.5"
              />
              <span className="text-sm sm:text-base font-display font-black tracking-tight text-white">
                INTRAMED <span className="text-brand-yellow">IX</span>
              </span>
            </button>

            {title && (
              <span className="hidden md:inline-block text-sm font-display font-bold text-white/90 pl-2 border-l border-white/15 truncate">
                {title}
              </span>
            )}
          </div>

          {/* Ícones da Direita (Search With Calendar + Notification + Súmula) */}
          <div className="flex items-center gap-2">
            {syncStatus === 'offline' && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-[10px] font-bold text-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Offline</span>
              </span>
            )}
            {syncStatus === 'syncing' && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-[10px] font-bold text-blue-200">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span>Sincronizando</span>
              </span>
            )}
            {syncStatus === 'synced' && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[10px] font-bold text-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Online</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Buscar partidas ou abrir calendário"
              title="Buscar partidas e modalidades (Ctrl+K)"
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-colors"
            >
              <Search className="w-4 h-4 text-white" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/jogos')}
              aria-label="Calendário de Jogos"
              title="Calendário de Jogos"
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-colors"
            >
              <Calendar className="w-4 h-4 text-white" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/notificacoes')}
              aria-label="Notificações"
              title="Central de Alertas"
              className="relative inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-colors"
            >
              <Bell className="w-4 h-4 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-yellow text-[#0B218A] text-[10px] font-extrabold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {isAdmin ? (
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-display font-extrabold text-[#0B218A] bg-brand-yellow hover:bg-brand-yellow-dark transition-colors shadow-sm"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Súmula &amp; Admin</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate(currentUser ? '/perfil' : '/login')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-display font-bold text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-colors"
              >
                <span>{currentUser ? currentUser.name.split(' ')[0] : 'Entrar'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Menu Bar Integrada na Base do Header Azul com Indicador Amarelo (#FACC15) */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav
            aria-label="Menu principal do topo"
            className="flex items-center justify-between sm:justify-start sm:gap-8 overflow-x-auto no-scrollbar pt-1"
          >
            {topMenuTabs.map((tab) => {
              const isActive = activeTopTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => navigate(tab.path)}
                  className={`relative pb-2.5 pt-1 text-xs sm:text-sm font-display transition-colors whitespace-nowrap ${
                    isActive
                      ? 'font-extrabold text-white'
                      : 'font-medium text-white/70 hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-1 rounded-t-full bg-brand-yellow shadow-[0_0_10px_rgba(250,204,21,0.7)]"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <QuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
};
