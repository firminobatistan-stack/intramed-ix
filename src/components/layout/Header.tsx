import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Bell,
  ChevronDown,
  ClipboardList,
  Menu,
  Search,
} from 'lucide-react';
import { QuickSearchModal } from './QuickSearchModal';
import { useCompetitionStore } from '../../context/CompetitionStoreContext';
import { OFFICIAL_MODALITIES } from '../../data/officialData';
import { SportIcon } from '../sports/SportIcon';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

/**
 * Cabeçalho inspirado diretamente nas 5 imagens do case "All Sports":
 * - Fundo Azul Royal com textura hexagonal sutil (.all-sports-header);
 * - Linha superior: Botão Menu/Voltar + Pílula Branca Seletora de Esporte ("Sports Category": [⚽ Futsal ▾])
 *   + Botões de Calendário/Busca ("Search With Calendar") e Sino ("Notification") à direita;
 * - Menu Bar inferior integrado no próprio cabeçalho azul ("LiveTV", "Matches", "Leagues")
 *   com barra indicadora Amarela (#FACC15) na aba ativa.
 */
export const Header: React.FC<HeaderProps> = ({ title, showBack }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSportDropdownOpen, setIsSportDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const { notifications } = useCompetitionStore();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Identifica se estamos dentro de uma modalidade específica
  const currentModalitySlug = location.pathname.startsWith('/competicoes/')
    ? location.pathname.replace('/competicoes/', '')
    : 'futsal';

  const activeModality =
    OFFICIAL_MODALITIES.find((m) => m.id === currentModalitySlug) ||
    OFFICIAL_MODALITIES[0];

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

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsSportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
                onClick={() => navigate('/')}
                aria-label="Início INTRAMED IX"
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-colors lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Sports Category Pill Branca (Idêntica às Imagens 1, 2 e 3: [ ⚽ Football ▾ ]) */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsSportDropdownOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white text-[#0B218A] font-display font-extrabold text-xs sm:text-sm shadow-md hover:bg-slate-50 transition-all"
              >
                <span className="w-5 h-5 rounded-full bg-[#0B218A]/10 flex items-center justify-center text-[#0B218A]">
                  <SportIcon iconKey={activeModality.iconKey} className="w-3.5 h-3.5" />
                </span>
                <span className="truncate max-w-[130px] sm:max-w-[180px]">
                  {activeModality.name}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#0B218A] transition-transform ${
                    isSportDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isSportDropdownOpen && (
                <div className="absolute left-0 mt-2 w-60 rounded-2xl bg-white text-slate-900 shadow-2xl border border-slate-100 py-2 z-50">
                  <div className="px-3.5 py-1.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-display font-extrabold uppercase tracking-wider text-slate-400">
                      10 Modalidades • INTRAMED IX
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                    {OFFICIAL_MODALITIES.map((mod) => {
                      const isCurrent = mod.id === activeModality.id;
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => {
                            setIsSportDropdownOpen(false);
                            navigate(`/competicoes/${mod.id}`);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold transition-colors ${
                            isCurrent
                              ? 'bg-[#0B218A]/5 text-[#0B218A] font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                isCurrent
                                  ? 'bg-[#0B218A] text-white'
                                  : 'bg-slate-100 text-[#0B218A]'
                              }`}
                            >
                              <SportIcon iconKey={mod.iconKey} className="w-3.5 h-3.5" />
                            </span>
                            <span>{mod.name}</span>
                          </span>
                          {isCurrent && (
                            <span className="w-2 h-2 rounded-full bg-brand-yellow" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {title && (
              <span className="hidden md:inline-block text-sm font-display font-bold text-white/90 pl-2 border-l border-white/15 truncate">
                {title}
              </span>
            )}
          </div>

          {/* Ícones da Direita (Search With Calendar + Notification + Súmula) */}
          <div className="flex items-center gap-2">
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

            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-display font-extrabold text-[#0B218A] bg-brand-yellow hover:bg-brand-yellow-dark transition-colors shadow-sm"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Súmula</span>
            </button>
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
