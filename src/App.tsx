import React, { Suspense, lazy, useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { CompetitionStoreProvider } from './context/CompetitionStoreContext';
import { SplashScreen } from './components/layout/SplashScreen';
import { AppShell } from './components/layout/AppShell';
import { AdminRouteGuard } from './components/layout/AdminRouteGuard';
import { HomePage } from './pages/HomePage';
import { RegistrationProvider } from './context/RegistrationStoreContext';
import { OFFICIAL_MODALITIES } from './data/officialData';

// Lazy-loaded pages (Code Splitting por rota para reduzir o bundle inicial em 3-4x)
const CompetitionsPage = lazy(() =>
  import('./pages/CompetitionsPage').then((m) => ({ default: m.CompetitionsPage }))
);
const ModalityDetailPage = lazy(() =>
  import('./pages/ModalityDetailPage').then((m) => ({ default: m.ModalityDetailPage }))
);
const BracketPage = lazy(() =>
  import('./pages/BracketPage').then((m) => ({ default: m.BracketPage }))
);
const MatchesPage = lazy(() =>
  import('./pages/MatchesPage').then((m) => ({ default: m.MatchesPage }))
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const FirstAccessPage = lazy(() =>
  import('./pages/FirstAccessPage').then((m) => ({ default: m.FirstAccessPage }))
);
const AdminDashboardPage = lazy(() =>
  import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const LiveMatchSheetOperatorPage = lazy(() =>
  import('./pages/LiveMatchSheetOperatorPage').then((m) => ({
    default: m.LiveMatchSheetOperatorPage,
  }))
);
const PublicLiveScoreboardPage = lazy(() =>
  import('./pages/PublicLiveScoreboardPage').then((m) => ({
    default: m.PublicLiveScoreboardPage,
  }))
);
const GeneratedMatchSheetPage = lazy(() =>
  import('./pages/GeneratedMatchSheetPage').then((m) => ({
    default: m.GeneratedMatchSheetPage,
  }))
);
const FavoritesPage = lazy(() =>
  import('./pages/FavoritesPage').then((m) => ({ default: m.FavoritesPage }))
);
const NotificationsPage = lazy(() =>
  import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage }))
);
const TeamDetailPage = lazy(() =>
  import('./pages/TeamDetailPage').then((m) => ({ default: m.TeamDetailPage }))
);
const AthleteDetailPage = lazy(() =>
  import('./pages/AthleteDetailPage').then((m) => ({ default: m.AthleteDetailPage }))
);
const RegistrationPage = lazy(() =>
  import('./pages/RegistrationPage').then((m) => ({ default: m.RegistrationPage }))
);
const AdminRegistrationsPage = lazy(() =>
  import('./pages/AdminRegistrationsPage').then((m) => ({
    default: m.AdminRegistrationsPage,
  }))
);
const CommunityDirectoryPage = lazy(() =>
  import('./pages/CommunityDirectoryPage').then((m) => ({
    default: m.CommunityDirectoryPage,
  }))
);

const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-[60vh] flex items-center justify-center p-6">
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-sm text-xs font-display font-bold text-[#0B218A]">
      <span className="w-2.5 h-2.5 rounded-full bg-brand-yellow animate-ping" />
      <span>Carregando módulo INTRAMED IX...</span>
    </div>
  </div>
);

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const RoutedApp: React.FC = () => {
  const location = useLocation();

  // Telas em modo Full-Screen dedicado (Login, Primeiro Acesso, Operador de Súmula, Placar ao Vivo, Documento de Súmula)
  const isFullScreenRoute =
    location.pathname === '/login' ||
    location.pathname === '/primeiro-acesso' ||
    location.pathname.startsWith('/sumula/') ||
    location.pathname.startsWith('/placar');

  const getHeaderTitle = (): string | undefined => {
    if (location.pathname === '/') return undefined;
    if (location.pathname === '/admin') return 'Súmulas & Administração';
    if (location.pathname === '/competicoes') return 'Competições';
    if (location.pathname.startsWith('/competicoes/')) {
      const slug = location.pathname.replace('/competicoes/', '');
      const mod = OFFICIAL_MODALITIES.find((m) => m.id === slug);
      return mod ? mod.name : 'Modalidade';
    }
    if (location.pathname === '/chaveamento') return 'Chaveamento';
    if (location.pathname === '/jogos') return 'Jogos';
    if (location.pathname === '/favoritos') return 'Meus Favoritos';
    if (location.pathname === '/notificacoes') return 'Central de Alertas';
    if (location.pathname.startsWith('/equipe')) return 'Página da Equipe';
    if (location.pathname === '/atleta') return 'Ficha do Atleta';
    if (location.pathname.startsWith('/atleta')) return 'Ficha do Atleta';
    if (location.pathname === '/comunidade') return 'Comunidade & Perfis';
    if (location.pathname.startsWith('/perfil/')) return 'Perfil do Participante';
    if (location.pathname === '/perfil') return 'Meu Perfil';
    if (location.pathname === '/inscricao') return 'Inscrições • INTRAMED IX';
    if (location.pathname === '/admin/inscricoes') return 'Gestão de Inscrições';
    return 'INTRAMED IX';
  };

  if (isFullScreenRoute) {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/primeiro-acesso" element={<FirstAccessPage />} />
          <Route
            path="/sumula/:matchId/documento"
            element={<GeneratedMatchSheetPage />}
          />
          <Route
            path="/sumula/:matchId"
            element={
              <AdminRouteGuard title="Operação de Súmula Eletrônica Ao Vivo">
                <LiveMatchSheetOperatorPage />
              </AdminRouteGuard>
            }
          />
          <Route path="/placar" element={<PublicLiveScoreboardPage />} />
          <Route path="/placar/:matchId" element={<PublicLiveScoreboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <AppShell title={getHeaderTitle()}>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/admin"
            element={
              <AdminRouteGuard title="Central de Arbitragem, Súmulas & Administração">
                <AdminDashboardPage />
              </AdminRouteGuard>
            }
          />
          <Route
            path="/admin/inscricoes"
            element={
              <AdminRouteGuard title="Gestão de Inscrições & Validação de Sócios">
                <AdminRegistrationsPage />
              </AdminRouteGuard>
            }
          />
          <Route path="/inscricao" element={<RegistrationPage />} />
          <Route path="/competicoes" element={<CompetitionsPage />} />
          <Route
            path="/competicoes/:modalityId"
            element={<ModalityDetailPage />}
          />
          <Route path="/chaveamento" element={<BracketPage />} />
          <Route path="/jogos" element={<MatchesPage />} />
          <Route path="/favoritos" element={<FavoritesPage />} />
          <Route path="/notificacoes" element={<NotificationsPage />} />
          <Route path="/equipe" element={<TeamDetailPage />} />
          <Route path="/equipe/:teamId" element={<TeamDetailPage />} />
          <Route path="/atleta" element={<AthleteDetailPage />} />
          <Route path="/atleta/:athleteId" element={<AthleteDetailPage />} />
          <Route path="/comunidade" element={<CommunityDirectoryPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/perfil/:userId" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
};

export const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 750);
    return () => clearTimeout(timer);
  }, []);

  return (
    <CompetitionStoreProvider>
      <RegistrationProvider>
        <BrowserRouter>
          <ScrollToTop />
          <SplashScreen isVisible={showSplash} />
          <RoutedApp />
        </BrowserRouter>
      </RegistrationProvider>
    </CompetitionStoreProvider>
  );
};

export default App;
