import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  X,
  Home,
  CreditCard,
  Tv,
  GitBranch,
  Calendar,
  Trophy,
  Shield,
  Heart,
  Bell,
  User,
  ClipboardList,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Sparkles,
  LogOut,
  LogIn,
} from 'lucide-react';
import { BrandMark } from './BrandMark';
import { useCompetitionStore } from '../../context/CompetitionStoreContext';
import { useRegistrationStore } from '../../context/RegistrationStoreContext';
import { OFFICIAL_MODALITIES } from '../../data/officialData';
import { SportIcon } from '../sports/SportIcon';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, setCurrentUser, canOperateOfficialData, notifications } =
    useCompetitionStore();
  const { hasCompletedRegistration } = useRegistrationStore();
  const isAdmin = canOperateOfficialData();
  const unreadNotifications = notifications.filter((n) => !n.isRead).length;

  const [isSportsExpanded, setIsSportsExpanded] = useState(false);
  const prevPathRef = React.useRef(location.pathname);

  // Fecha o drawer EXCLUSIVAMENTE quando o pathname da URL mudar
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      onClose();
    }
  }, [location.pathname, onClose]);

  // Trava o scroll do body quando o drawer estiver aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Tecla Escape para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const triggerHaptic = () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {
      // Silencioso
    }
  };

  const handleNav = (to: string) => {
    triggerHaptic();
    navigate(to);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu principal de navegação móvel"
      className="fixed inset-0 z-[100] lg:hidden flex"
    >
      {/* Backdrop com desfoque e escurecimento */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-hidden="true"
      />

      {/* Painel do Drawer Lateral */}
      <div
        style={{ WebkitTransform: 'translate3d(0,0,0)' }}
        className="relative w-full max-w-[310px] sm:max-w-xs bg-[#091834] text-white h-full flex flex-col shadow-2xl z-10 border-r border-white/10 animate-in slide-in-from-left duration-200 pointer-events-auto"
      >
        {/* Cabeçalho do Drawer */}
        <div className="h-16 px-4 bg-[#0B218A] border-b border-white/10 flex items-center justify-between shrink-0">
          <BrandMark size="sm" inverted />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card do Usuário / Atleta / Admin */}
        <div className="p-3.5 border-b border-white/10 bg-white/5 shrink-0">
          {currentUser ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-full bg-brand-yellow text-brand-blue-dark flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    currentUser.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block truncate">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] font-semibold text-brand-yellow block truncate">
                    {currentUser.role === 'administrador'
                      ? 'Comissão Organizadora'
                      : currentUser.teamName || 'Atleta Medicina'}
                  </span>
                </div>
              </div>

              {currentUser.role === 'administrador' ? (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentUser(null);
                    onClose();
                  }}
                  title="Sair do modo administrador"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/20 text-rose-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleNav('/login')}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-brand-yellow text-brand-blue-dark font-display font-extrabold text-xs shadow-sm"
            >
              <span className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                <span>Entrar no IntraMed</span>
              </span>
              <span className="text-[10px] uppercase font-bold text-brand-blue-dark/80">
                Acessar
              </span>
            </button>
          )}
        </div>

        {/* Lista de Navegação com Rolagem Suave */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 no-scrollbar">
          {/* 1. SELEÇÃO PRINCIPAL */}
          <div className="space-y-1">
            <p className="px-2.5 text-[10px] font-black uppercase tracking-wider text-white/40">
              Navegação Oficial
            </p>

            <button
              type="button"
              onClick={() => handleNav('/')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                location.pathname === '/'
                  ? 'bg-brand-yellow text-brand-blue-dark shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>Início</span>
            </button>

            {/* Inscrições & Pagamento (destaque chamativo antes de se inscrever, discreto depois) */}
            <button
              type="button"
              onClick={() => handleNav('/inscricao')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                location.pathname.startsWith('/inscricao')
                  ? 'bg-brand-yellow text-brand-blue-dark shadow-sm'
                  : !hasCompletedRegistration
                  ? 'text-amber-300 hover:text-white hover:bg-white/10 bg-amber-400/10 border border-amber-400/20'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 shrink-0" />
                <span>{hasCompletedRegistration ? 'Minha Inscrição & Ingresso' : 'Inscrições & Pagamento'}</span>
              </span>
              {!hasCompletedRegistration ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-brand-yellow text-brand-blue-dark text-[9px] font-black uppercase">
                  <Sparkles className="w-2.5 h-2.5" />
                  Lote 1
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold uppercase border border-emerald-500/30">
                  Inscrito
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleNav('/placar')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                location.pathname.startsWith('/placar')
                  ? 'bg-brand-yellow text-brand-blue-dark shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="flex items-center gap-3">
                <Tv className="w-4 h-4 shrink-0 text-brand-yellow" />
                <span>Match Center Ao Vivo</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            <button
              type="button"
              onClick={() => handleNav('/chaveamento')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                location.pathname.startsWith('/chaveamento')
                  ? 'bg-brand-yellow text-brand-blue-dark shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <GitBranch className="w-4 h-4 shrink-0 text-brand-yellow" />
              <span>Chaveamento 5 Equipes</span>
            </button>

            <button
              type="button"
              onClick={() => handleNav('/jogos')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                location.pathname.startsWith('/jogos')
                  ? 'bg-brand-yellow text-brand-blue-dark shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Calendário de Jogos</span>
            </button>

            <button
              type="button"
              onClick={() => handleNav('/equipe')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                location.pathname.startsWith('/equipe')
                  ? 'bg-brand-yellow text-brand-blue-dark shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span>Páginas das 5 Equipes</span>
            </button>
          </div>

          {/* 2. MENU EXPANSÍVEL DE ESPORTES (16 MODALIDADES) */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setIsSportsExpanded(!isSportsExpanded)}
              className="w-full flex items-center justify-between px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-white/50 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-brand-yellow" />
                <span>16 Modalidades Esportivas</span>
              </span>
              {isSportsExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>

            {isSportsExpanded && (
              <div className="grid grid-cols-2 gap-1.5 pt-1 pl-1">
                {OFFICIAL_MODALITIES.map((mod) => (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => handleNav(`/competicoes/${mod.id}`)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-[11px] font-semibold text-left transition-colors ${
                      location.pathname === `/competicoes/${mod.id}`
                        ? 'bg-brand-yellow text-brand-blue-dark font-bold'
                        : 'bg-white/5 hover:bg-white/10 text-white/80'
                    }`}
                  >
                    <SportIcon iconKey={mod.iconKey} className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{mod.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. PESSOAL & NOTIFICAÇÕES */}
          <div className="space-y-1">
            <p className="px-2.5 text-[10px] font-black uppercase tracking-wider text-white/40">
              Pessoal &amp; Interação
            </p>

            <button
              type="button"
              onClick={() => handleNav('/favoritos')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                location.pathname === '/favoritos'
                  ? 'bg-brand-yellow text-brand-blue-dark shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Heart className="w-4 h-4 shrink-0 text-rose-400" />
              <span>Meus Favoritos</span>
            </button>

            <button
              type="button"
              onClick={() => handleNav('/notificacoes')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                location.pathname === '/notificacoes'
                  ? 'bg-brand-yellow text-brand-blue-dark shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="flex items-center gap-3">
                <Bell className="w-4 h-4 shrink-0 text-amber-300" />
                <span>Central de Alertas</span>
              </span>
              {unreadNotifications > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-brand-yellow text-brand-blue-dark text-[10px] font-black">
                  {unreadNotifications}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleNav('/perfil')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                location.pathname === '/perfil'
                  ? 'bg-brand-yellow text-brand-blue-dark shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              <span>Perfil do Atleta</span>
            </button>
          </div>

          {/* 4. ADMINISTRAÇÃO & COMISSÃO (Somente se autenticado com bicoduro) */}
          {isAdmin && (
            <div className="space-y-1 pt-2 border-t border-white/10">
              <p className="px-2.5 text-[10px] font-black uppercase tracking-wider text-brand-yellow">
                Comissão &amp; Arbitragem
              </p>

              <button
                type="button"
                onClick={() => handleNav('/admin')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  location.pathname === '/admin'
                    ? 'bg-brand-yellow text-brand-blue-dark shadow-sm'
                    : 'text-white/90 hover:text-white hover:bg-white/10 bg-white/5'
                }`}
              >
                <span className="flex items-center gap-3">
                  <ClipboardList className="w-4 h-4 shrink-0 text-brand-yellow" />
                  <span>Súmula ao Vivo / Mesa</span>
                </span>
                <span className="w-2 h-2 rounded-full bg-brand-yellow" />
              </button>

              <button
                type="button"
                onClick={() => handleNav('/admin/inscricoes')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  location.pathname === '/admin/inscricoes'
                    ? 'bg-brand-yellow text-brand-blue-dark shadow-sm'
                    : 'text-white/90 hover:text-white hover:bg-white/10 bg-white/5'
                }`}
              >
                <span className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-brand-yellow" />
                  <span>Gestão de Inscrições</span>
                </span>
                <span className="w-2 h-2 rounded-full bg-brand-yellow" />
              </button>
            </div>
          )}
        </div>

        {/* Rodapé Institucional com Emblema da A.A.A. Cangaceira */}
        <div className="p-3.5 bg-black/30 border-t border-white/10 shrink-0 flex items-center gap-3">
          <img
            src="/assets/atletica/logo-alternativa.png"
            alt="A.A.A. Cangaceira"
            className="w-9 h-9 object-contain shrink-0"
          />
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-wider text-brand-yellow block leading-none">
              Realização Oficial
            </span>
            <span className="text-xs font-black text-white block truncate leading-tight mt-0.5">
              A.A.A. Cangaceira
            </span>
            <span className="text-[10px] text-white/60 block truncate leading-none">
              Medicina · UEMA
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
