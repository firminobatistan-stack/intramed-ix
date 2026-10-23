import React, { useEffect, useState } from 'react';
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
import { CompetitionsPage } from './pages/CompetitionsPage';
import { ModalityDetailPage } from './pages/ModalityDetailPage';
import { BracketPage } from './pages/BracketPage';
import { MatchesPage } from './pages/MatchesPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { LiveMatchSheetOperatorPage } from './pages/LiveMatchSheetOperatorPage';
import { PublicLiveScoreboardPage } from './pages/PublicLiveScoreboardPage';
import { GeneratedMatchSheetPage } from './pages/GeneratedMatchSheetPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { TeamDetailPage } from './pages/TeamDetailPage';
import { AthleteDetailPage } from './pages/AthleteDetailPage';
import { DesignSystemCasePage } from './pages/DesignSystemCasePage';
import { RegistrationPage } from './pages/RegistrationPage';
import { AdminRegistrationsPage } from './pages/AdminRegistrationsPage';
import { RegistrationProvider } from './context/RegistrationStoreContext';
import { OFFICIAL_MODALITIES } from './data/officialData';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const RoutedApp: React.FC = () => {
  const location = useLocation();

  // Telas em modo Full-Screen dedicado (Login, Operador de Súmula, Placar ao Vivo, Documento de Súmula)
  if (location.pathname === '/login') {
    return <LoginPage />;
  }
  if (location.pathname.endsWith('/documento') && location.pathname.startsWith('/sumula/')) {
    return (
      <Routes>
        <Route
          path="/sumula/:matchId/documento"
          element={<GeneratedMatchSheetPage />}
        />
      </Routes>
    );
  }
  if (location.pathname.startsWith('/sumula/')) {
    return (
      <Routes>
        <Route
          path="/sumula/:matchId"
          element={
            <AdminRouteGuard title="Operação de Súmula Eletrônica Ao Vivo">
              <LiveMatchSheetOperatorPage />
            </AdminRouteGuard>
          }
        />
      </Routes>
    );
  }
  if (location.pathname.startsWith('/placar')) {
    return (
      <Routes>
        <Route path="/placar" element={<PublicLiveScoreboardPage />} />
        <Route path="/placar/:matchId" element={<PublicLiveScoreboardPage />} />
      </Routes>
    );
  }

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
    if (location.pathname.startsWith('/atleta')) return 'Ficha do Atleta';
    if (location.pathname === '/design-system') return 'UI/UX Design System & Case';
    if (location.pathname === '/perfil') return 'Perfil';
    if (location.pathname === '/inscricao') return 'Inscrições • INTRAMED IX';
    if (location.pathname === '/admin/inscricoes') return 'Gestão de Inscrições';
    return 'INTRAMED IX';
  };

  return (
    <AppShell title={getHeaderTitle()}>
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
        <Route path="/design-system" element={<DesignSystemCasePage />} />
        <Route path="/perfil" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
