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
  Users,
  Flame,
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
  const {
    currentUser,
    setCurrentUser,
    canOperateOfficialData,
    notifications,
    launchConfig,
    hasActiveLiveMatch,
  } = useCompetitionStore();
  const { hasCompletedRegistration, myRegistrations } = useRegistrationStore();
  const isAdmin = canOperateOfficialData();
  const unreadNotifications = notifications.filter((n) => !n.isRead).length;
  const activeMyRegs = myRegistrations.filter((r) => r.paymentStatus !== 'cancelado');
  const isRegistrationPaid = activeMyRegs.some((r) => r.paymentStatus === 'pago');
  const isPendingMemberValidation =
    !isRegistrationPaid &&
    activeMyRegs.some(
      (r) =>
        r.memberStatus === 'pendente' ||
        r.paymentStatus === 'aguardando_validacao' ||
        (r.requestedMemberDiscount &&
          r.memberStatus !== 'aprovado' &&
          r.memberStatus !== 'rejeitado')
    );
  const isPendingPayment =
    !isRegistrationPaid && !isPendingMemberValidation && activeMyRegs.length > 0;
  const isConfirmedAthlete =
    isRegistrationPaid || (currentUser?.role === 'atleta' && activeMyRegs.length === 0);

  const [isSportsExpanded, setIsSportsExpanded] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [dataState, setDataState] = useState<'entering' | 'open' | 'closed'>(
    isOpen ? 'open' : 'closed'
  );
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const backdropRef = React.useRef<HTMLDivElement | null>(null);
  const swipeRef = React.useRef<{
    active: boolean;
    lockedAxis: 'x' | 'y' | null;
    startX: number;
    startY: number;
    lastX: number;
    startTime: number;
  }>({
    active: false,
    lockedAxis: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    startTime: 0,
  });
  const prevPathRef = React.useRef(location.pathname);

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (isOpen) {
      setShouldRender(true);
      setDataState('entering');
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          if (panelRef.current) {
            panelRef.current.style.transform = '';
            panelRef.current.style.transition = '';
          }
          if (backdropRef.current) {
            backdropRef.current.style.opacity = '';
          }
          setDataState('open');
        });
      });
    } else if (shouldRender) {
      setDataState('closed');
      timer = setTimeout(() => setShouldRender(false), 220);
    }

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, shouldRender]);

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

  if (!shouldRender) return null;

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    swipeRef.current = {
      active: true,
      lockedAxis: null,
      startX: t.clientX,
      startY: t.clientY,
      lastX: t.clientX,
      startTime: performance.now(),
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const st = swipeRef.current;
    if (!st.active || e.touches.length !== 1 || !panelRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - st.startX;
    const dy = t.clientY - st.startY;

    if (!st.lockedAxis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      st.lockedAxis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
      if (st.lockedAxis === 'x') {
        panelRef.current.style.transition = 'none';
      }
    }

    if (st.lockedAxis !== 'x') return;
    st.lastX = t.clientX;

    // 1:1 swipe left with rubber-band resistance when pulling right past 0
    const offsetX = dx <= 0 ? dx : Math.sqrt(dx) * 2.2;
    panelRef.current.style.transform = `translate3d(${offsetX}px, 0, 0)`;
    if (backdropRef.current && dx < 0) {
      const progress = Math.min(1, Math.abs(dx) / 280);
      backdropRef.current.style.opacity = String(Math.max(0.15, 1 - progress * 0.8));
    }
  };

  const handleTouchEnd = () => {
    const st = swipeRef.current;
    if (!st.active) return;
    const wasHorizontal = st.lockedAxis === 'x';
    const dx = st.lastX - st.startX;
    const elapsed = Math.max(1, performance.now() - st.startTime);
    const velocity = Math.abs(dx) / elapsed;
    st.active = false;
    st.lockedAxis = null;

    if (!wasHorizontal) return;

    if (panelRef.current) {
      panelRef.current.style.transition = '';
    }
    if (backdropRef.current) {
      backdropRef.current.style.opacity = '';
    }

    if (dx <= -76 || (dx < -18 && velocity > 0.11)) {
      if (panelRef.current) {
        panelRef.current.style.transform = 'translate3d(-100%, 0, 0)';
      }
      onClose();
    } else if (panelRef.current) {
      panelRef.current.style.transform = '';
    }
  };

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

  const stateAttr = dataState === 'open' ? 'open' : dataState === 'closed' ? 'closed' : 'entering';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu principal de navegação móvel"
      className="fixed inset-0 z-[100] lg:hidden flex"
    >
      {/* Backdrop com desfoque e escurecimento */}
      <div
        ref={backdropRef}
        data-state={stateAttr}
        className="emil-backdrop fixed inset-0 bg-black/75 backdrop-blur-sm"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-hidden="true"
      />

      {/* Painel do Drawer Lateral com curva Vaul e suporte a swipe-left 1:1 */}
      <div
        ref={panelRef}
        data-state={stateAttr}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="emil-drawer-left relative w-full max-w-[310px] sm:max-w-xs bg-[#091834] text-white h-[100dvh] flex flex-col shadow-2xl z-10 border-r border-white/10 pointer-events-auto"
      >
        {/* Cabeçalho do Drawer */}
        <div className="min-h-[64px] pt-[env(safe-area-inset-top,0px)] px-4 bg-[#0B218A] border-b border-white/10 flex items-center justify-between shrink-0">
          <BrandMark size="sm" inverted />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="w-9 h-9 rounded-xl bg-white/10 can-hover:hover:bg-white/20 active:scale-[0.95] flex items-center justify-center text-white transition-[transform,background-color] duration-[150ms] ease-emil-out"
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
                      : isPendingMemberValidation
                      ? `${currentUser.teamName || 'Participante'} • Em Análise`
                      : isPendingPayment
                      ? `${currentUser.teamName || 'Participante'} • Aguardando Pgto`
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
                <span>{launchConfig.publicLoginEnabled ? 'Entrar no IntraMed' : 'Acesso Participantes'}</span>
              </span>
              <span className="text-[10px] uppercase font-bold text-brand-blue-dark/80">
                {launchConfig.publicLoginEnabled ? 'Acessar' : 'Em Breve'}
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

            {/* Inscrições & Pagamento (exclusivo para usuários cadastrados e logados) */}
            {currentUser && (
              <button
                type="button"
                onClick={() => handleNav('/inscricao')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  location.pathname.startsWith('/inscricao')
                    ? 'bg-brand-yellow text-brand-blue-dark shadow-sm'
                    : !(hasCompletedRegistration || currentUser?.role === 'atleta')
                    ? 'text-amber-300 hover:text-white hover:bg-white/10 bg-amber-400/10 border border-amber-400/20'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 shrink-0" />
                  <span>
                    {hasCompletedRegistration || currentUser.role === 'atleta'
                      ? 'Meu Passaporte de Atleta'
                      : 'Inscrição de Atleta'}
                  </span>
                </span>
                {isConfirmedAthlete ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold uppercase border border-emerald-500/30">
                    Confirmado
                  </span>
                ) : isPendingMemberValidation ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold uppercase border border-amber-500/30">
                    Em Análise
                  </span>
                ) : isPendingPayment ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[9px] font-bold uppercase border border-sky-500/30">
                    Aguardando Pgto
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-brand-yellow text-brand-blue-dark text-[9px] font-black uppercase">
                    <Sparkles className="w-2.5 h-2.5" />
                    Lote 1
                  </span>
                )}
              </button>
            )}

            {hasActiveLiveMatch && (
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
                  <span>Placar Ao Vivo</span>
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </button>
            )}

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
              <span>Chaveamento Oficial</span>
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
              onClick={() => handleNav('/artilharia')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                location.pathname.startsWith('/artilharia')
                  ? 'bg-brand-yellow text-brand-blue-dark shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Trophy className="w-4 h-4 shrink-0 text-brand-yellow" />
              <span>Artilharia &amp; Top Players</span>
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

            {(launchConfig.publicProfilesVisible || isAdmin) && (
              <>
                <button
                  type="button"
                  onClick={() => handleNav('/feed')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    location.pathname.startsWith('/feed')
                      ? 'bg-brand-yellow text-brand-blue-dark shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Flame className="w-4 h-4 shrink-0 text-amber-300" />
                  <span>Feed Social</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNav('/comunidade')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    location.pathname.startsWith('/comunidade')
                      ? 'bg-brand-yellow text-brand-blue-dark shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0 text-cyan-300" />
                  <span>Comunidade & Perfis</span>
                </button>
              </>
            )}

            {(currentUser || launchConfig.publicLoginEnabled || isAdmin) && (
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
                <span>{currentUser ? 'Meu Perfil' : 'Perfil do Atleta'}</span>
              </button>
            )}
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
