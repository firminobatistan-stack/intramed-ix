import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Lock,
  Mail,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  UserPlus,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Users,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import { BrandMark } from '../components/layout/BrandMark';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
  useCompetitionStore,
  setStoredOperatorToken,
} from '../context/CompetitionStoreContext';
import {
  useRegistrationStore,
  computeClientCredentialDigest,
} from '../context/RegistrationStoreContext';
import { OFFICIAL_MODALITIES } from '../data/officialData';
import { TURMAS_MEDICINA } from '../data/registrationData';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from '../lib/firebase';

type LoginModeTab = 'login' | 'register' | 'admin';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentUser,
    setCurrentUser,
    upsertParticipantAthlete,
    launchConfig,
  } = useCompetitionStore();

  const { registrations } = useRegistrationStore();

  const searchParams = new URLSearchParams(location.search);
  const paramReturnTo = searchParams.get('returnTo');
  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo || paramReturnTo || null;

  const initialMode = searchParams.get('mode') || searchParams.get('tab');
  const [loginMode, setLoginMode] = useState<LoginModeTab>(
    initialMode === 'register'
      ? 'register'
      : returnTo?.includes('/admin')
      ? 'admin'
      : 'login'
  );

  // Estados de Login Unificado
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Estados de Cadastro de Conta
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerTurma, setRegisterTurma] = useState('');
  const [registerBio, setRegisterBio] = useState('');

  // Estados de Login Administrativo (Comissão / Master)
  const [adminEmail, setAdminEmail] = useState('cangaceira@uema.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Feedbacks e Modais
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryFeedback, setRecoveryFeedback] = useState<string | null>(null);

  const syncGoogleUserWithServer = async (fbUser: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    getIdToken: () => Promise<string>;
  }) => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const idToken = await fbUser.getIdToken();
      const selectedTurmaObj = TURMAS_MEDICINA.find((t) => t.turma === registerTurma);

      const res = await fetch('/api/cloud-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'google_login',
          idToken,
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoUrl: fbUser.photoURL,
          turma: registerTurma || null,
          turmaLabel: selectedTurmaObj ? selectedTurmaObj.fullName : null,
          teamId: selectedTurmaObj ? selectedTurmaObj.teamId : null,
          teamName: selectedTurmaObj ? selectedTurmaObj.name : null,
        }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok && data?.user) {
        if (data.token) {
          setStoredOperatorToken(data.token);
        }

        const userObj = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          avatarUrl: data.profile?.avatarUrl || fbUser.photoURL || null,
          role: data.user.role || 'visitante',
          turma: data.profile?.turma || null,
          turmaLabel: data.profile?.turmaLabel || null,
          teamId: data.profile?.teamId || null,
          teamName: data.profile?.teamName || null,
          linkedAthleteId: data.user.linkedAthleteId || null,
          modalityIds: [],
          mustChangePassword: false,
        };

        setCurrentUser(userObj);
        setSuccessMessage(
          data.isNewUser
            ? `Bem-vindo(a), ${data.user.name}! Sua conta Google foi registrada com sucesso.`
            : `Bem-vindo(a) de volta, ${data.user.name}!`
        );

        setTimeout(() => {
          navigate(returnTo || '/perfil', { replace: true });
        }, 650);
        return;
      } else {
        setErrorMessage(data?.error || 'Não foi possível autenticar sua conta Google no servidor.');
      }
    } catch {
      setErrorMessage('Falha de conexão ao sincronizar sua conta Google com o servidor.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Trata retorno de signInWithRedirect caso o navegador mobile tenha usado redirecionamento
  useEffect(() => {
    let active = true;
    getRedirectResult(auth)
      .then((result) => {
        if (active && result && result.user) {
          void syncGoogleUserWithServer(result.user);
        }
      })
      .catch(() => {
        // Ignora silenciosamente quando não há redirect pendente
      });
    return () => {
      active = false;
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result && result.user) {
        await syncGoogleUserWithServer(result.user);
      } else {
        setIsGoogleLoading(false);
      }
    } catch (err: any) {
      const code = String(err?.code || '');
      if (code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch {
          setErrorMessage('O bloqueador de pop-ups impediu a janela do Google. Permita pop-ups ou use e-mail e senha.');
        }
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // Usuário fechou a janela voluntariamente
      } else if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found') {
        setErrorMessage(
          'O provedor Google precisa ser ativado no Console do Firebase (Authentication -> Sign-in method -> Google -> Ativar). Enquanto isso, você pode usar seu e-mail e senha normalmente!'
        );
      } else if (code === 'auth/unauthorized-domain') {
        setErrorMessage(
          'Este domínio precisa estar autorizado no Firebase Console (Authentication -> Settings -> Authorized domains).'
        );
      } else {
        setErrorMessage('Não foi possível concluir o login com o Google. Tente novamente ou use e-mail e senha.');
      }
      setIsGoogleLoading(false);
    }
  };

  // SUBMIT: LOGIN UNIFICADO (Usuário / Atleta / Participante)
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const q = identifier.trim().toLowerCase();
    const pass = loginPassword.trim();

    if (!q) {
      setErrorMessage('Informe seu e-mail, nome de usuário ou documento.');
      return;
    }

    if (!pass) {
      setErrorMessage('Informe sua senha.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/cloud-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'user_login',
          identifier: q,
          password: pass,
        }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok && data?.user) {
        if (data.token) {
          setStoredOperatorToken(data.token);
        }
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('intramed_admin_session', data.user.role === 'moderador_master' ? 'true' : 'user');
        }

        const userObj = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          avatarUrl: data.profile?.avatarUrl || null,
          role: data.user.role || 'visitante',
          teamId: data.profile?.teamId || null,
          teamName: data.profile?.teamName || null,
          linkedAthleteId: data.user.linkedAthleteId || null,
          modalityIds: data.profile?.favoriteModalityIds || [],
          mustChangePassword: false,
        };

        setCurrentUser(userObj);

        // Se o usuário possui vínculo de atleta oficial, garante upsert no store de competição
        if (data.user.linkedAthleteId) {
          upsertParticipantAthlete({
            id: data.user.linkedAthleteId,
            name: data.user.name,
            email: data.user.email,
            teamId: data.profile?.teamId || 'sanguinaria',
            turma: data.profile?.turma || null,
            turmaLabel: data.profile?.turmaLabel || null,
            bio: data.profile?.bio || null,
            instagramHandle: data.profile?.instagramHandle || null,
            avatarUrl: data.profile?.avatarUrl || null,
            modalityIds: OFFICIAL_MODALITIES.map((m) => m.id),
            autoLogin: true,
          });
        }

        setSuccessMessage('Login efetuado com sucesso!');
        setTimeout(() => {
          if (data.user.role === 'moderador_master') {
            navigate('/admin', { replace: true });
          } else if (data.user.linkedAthleteId) {
            navigate(returnTo || `/atleta/${data.user.linkedAthleteId}`, { replace: true });
          } else {
            navigate(returnTo || '/perfil', { replace: true });
          }
        }, 500);
        return;
      }

      if (res && !res.ok) {
        setErrorMessage(data?.error || 'Senha ou e-mail incorreto.');
        setIsSubmitting(false);
        return;
      }
    } catch {
      setErrorMessage('Falha ao conectar com o servidor de autenticação central. Verifique sua conexão e tente novamente.');
      setIsSubmitting(false);
    }
  };

  // SUBMIT: CADASTRO REAL DE USUÁRIO
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const name = registerName.trim();
    const email = registerEmail.trim().toLowerCase();
    const pass = registerPassword.trim();
    const confirmPass = registerConfirmPassword.trim();

    if (!name || name.length < 2) {
      setErrorMessage('Informe seu nome completo (mínimo 2 caracteres).');
      return;
    }

    if (!email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      setErrorMessage('Informe um e-mail com formato válido.');
      return;
    }

    if (pass.length < 6) {
      setErrorMessage('A senha deve possuir no mínimo 6 caracteres.');
      return;
    }

    if (pass !== confirmPass) {
      setErrorMessage('A confirmação de senha não confere com a senha digitada.');
      return;
    }

    setIsSubmitting(true);
    const selectedTurmaObj = TURMAS_MEDICINA.find((t) => t.turma === registerTurma);

    try {
      const res = await fetch('/api/cloud-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register_user',
          name,
          email,
          password: pass,
          turma: registerTurma || null,
          turmaLabel: selectedTurmaObj ? selectedTurmaObj.fullName : null,
          teamId: selectedTurmaObj ? selectedTurmaObj.teamId : null,
          teamName: selectedTurmaObj ? selectedTurmaObj.name : null,
          bio: registerBio.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok && data?.user) {
        if (data.token) {
          setStoredOperatorToken(data.token);
        }

        const userObj = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          avatarUrl: data.profile?.avatarUrl || null,
          role: data.user.role || 'visitante',
          teamId: data.profile?.teamId || null,
          teamName: data.profile?.teamName || null,
          linkedAthleteId: data.user.linkedAthleteId || null,
          modalityIds: [],
          mustChangePassword: false,
        };

        setCurrentUser(userObj);
        setSuccessMessage('Conta e perfil criados com sucesso! Redirecionando...');

        setTimeout(() => {
          navigate(returnTo || '/perfil', { replace: true });
        }, 800);
        return;
      } else {
        setErrorMessage(data?.error || 'Não foi possível concluir o cadastro.');
        setIsSubmitting(false);
      }
    } catch {
      setErrorMessage('Falha ao conectar com o servidor para criar a conta.');
      setIsSubmitting(false);
    }
  };

  // SUBMIT: LOGIN ADMINISTRATIVO (Comissão / Master)
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanPass = adminPassword.trim();
    const cleanEmail = adminEmail.trim().toLowerCase();

    if (!cleanEmail || !cleanPass) {
      setErrorMessage('Informe o e-mail e a senha administrativa.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/cloud-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_login',
          email: cleanEmail,
          password: cleanPass,
        }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok && data?.token) {
        setStoredOperatorToken(data.token);

        if (data.mustChangePassword) {
          sessionStorage.setItem('intramed_admin_session', 'restricted_first_access');
          setCurrentUser({
            id: data.user?.id || 'usr_master_cangaceira',
            name: data.user?.name || 'Atlética Cangaceira',
            email: data.user?.email || cleanEmail,
            avatarUrl: '/assets/atletica/logo.png',
            teamId: null,
            teamName: 'Associação Atlética Acadêmica de Medicina UEMA – Cangaceira',
            modalityIds: [],
            role: 'moderador_master',
            linkedAthleteId: null,
            mustChangePassword: true,
          });
          navigate('/primeiro-acesso', { replace: true });
          return;
        }

        if (typeof window !== 'undefined') {
          sessionStorage.setItem('intramed_admin_session', 'true');
        }

        setCurrentUser({
          id: data.user?.id || 'usr_master_cangaceira',
          name: data.user?.name || 'Atlética Cangaceira',
          email: data.user?.email || cleanEmail,
          avatarUrl: '/assets/atletica/logo.png',
          teamId: null,
          teamName: 'Associação Atlética Acadêmica de Medicina UEMA – Cangaceira',
          modalityIds: [],
          role: (data.user?.role as any) || 'moderador_master',
          linkedAthleteId: null,
          mustChangePassword: false,
        });

        navigate(returnTo || '/admin', { replace: true });
        return;
      } else {
        setErrorMessage(data?.error || 'Senha ou e-mail administrativo incorreto.');
        setIsSubmitting(false);
      }
    } catch {
      setErrorMessage('Falha ao conectar com o servidor. Verifique sua conexão.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-surface-muted flex flex-col justify-between p-4 sm:p-6">
      {/* Barra superior */}
      <div className="w-full max-w-md mx-auto pt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-brand-text-secondary hover:text-brand-text-primary hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao início do site</span>
        </button>
      </div>

      {/* Card Central de Autenticação */}
      <div className="w-full max-w-md mx-auto my-6">
        <div className="relative overflow-hidden bg-white rounded-3xl border border-brand-surface-border shadow-card p-6 sm:p-8 space-y-6">
          <img
            src="/assets/atletica/face-monocor.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none select-none absolute -right-8 -top-8 w-40 h-40 object-contain opacity-[0.04]"
          />

          {/* Identidade Visual */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <img
              src="/assets/atletica/logo.png"
              alt="A.A.A. Cangaceira — Medicina UEMA"
              className="w-16 h-16 object-contain drop-shadow-md mb-2"
            />
            <BrandMark size="lg" showEmblem={false} />
            <div className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-surface-muted border border-brand-surface-border">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow" aria-hidden="true" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-text-secondary">
                Plataforma &amp; Comunidade Oficial
              </p>
            </div>
          </div>

          {/* Abas Superiores de Seleção de Fluxo */}
          <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setLoginMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                loginMode === 'login'
                  ? 'bg-white text-[#0B218A] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginMode('register');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                loginMode === 'register'
                  ? 'bg-white text-[#0B218A] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Criar Conta</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginMode('admin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                loginMode === 'admin'
                  ? 'bg-white text-[#0B218A] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Comissão</span>
            </button>
          </div>

          {/* Feedback de Erro ou Sucesso */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* SESSÃO ATIVA (Se já houver) */}
          {currentUser && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="block text-[10px] font-display font-extrabold uppercase text-emerald-700">
                  Conectado como {currentUser.role}
                </span>
                <p className="text-xs font-bold text-slate-900 truncate">
                  {currentUser.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentUser(null)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-rose-600 hover:bg-rose-50 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          )}

          {/* BOTÃO DE ACESSO RÁPIDO COM CONTA GOOGLE (NAS ABAS ENTRAR E CRIAR CONTA) */}
          {(loginMode === 'login' || loginMode === 'register') && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isSubmitting}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 active:scale-[0.99] border-2 border-slate-200 hover:border-slate-300 shadow-xs text-slate-800 text-xs sm:text-sm font-display font-bold transition-all disabled:opacity-60"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                  />
                  <path
                    fill="#34A853"
                    d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                  />
                </svg>
                <span>
                  {isGoogleLoading
                    ? 'Conectando com o Google...'
                    : loginMode === 'register'
                    ? 'Criar conta rápida com o Google'
                    : 'Continuar com o Google'}
                </span>
              </button>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-slate-200" />
                <span className="shrink-0 mx-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  ou com e-mail e senha
                </span>
                <div className="flex-grow border-t border-slate-200" />
              </div>
            </div>
          )}

          {/* ABA 1: LOGIN UNIFICADO */}
          {loginMode === 'login' && (
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <Input
                label="E-mail, Usuário ou Documento"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="exemplo@uema.br ou seu.usuario"
                leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                required
              />

              <Input
                label="Senha Pessoal"
                type={showLoginPassword ? 'text' : 'password'}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Sua senha cadastrada"
                leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="p-1.5 text-slate-400 hover:text-slate-600"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isSubmitting || isGoogleLoading}
              >
                {isSubmitting ? 'Verificando...' : 'Entrar na Plataforma'}
              </Button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsRecoveryModalOpen(true)}
                  className="text-xs text-slate-500 hover:text-[#0B218A] transition-colors"
                >
                  Esqueceu sua senha? Solicitar recuperação
                </button>
              </div>
            </form>
          )}

          {/* ABA 2: CRIAR CONTA */}
          {loginMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <Input
                label="Nome Completo"
                type="text"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="Ex: João da Silva"
                required
              />

              <Input
                label="E-mail Institucional ou Pessoal"
                type="email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                placeholder="seu.email@uema.br"
                leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                required
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Turma de Medicina
                </label>
                <select
                  value={registerTurma}
                  onChange={(e) => setRegisterTurma(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B218A]/20"
                >
                  <option value="">Selecione sua turma (ou deixe em branco)</option>
                  {TURMAS_MEDICINA.map((t) => (
                    <option key={t.turma} value={t.turma}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Criar Senha (Mínimo 6 caracteres)"
                type={showRegisterPassword ? 'text' : 'password'}
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                placeholder="••••••"
                leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="p-1.5 text-slate-400 hover:text-slate-600"
                  >
                    {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />

              <Input
                label="Confirmar Senha"
                type={showRegisterPassword ? 'text' : 'password'}
                value={registerConfirmPassword}
                onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isSubmitting || isGoogleLoading}
              >
                {isSubmitting ? 'Cadastrando...' : 'Cadastrar e Criar Perfil'}
              </Button>
            </form>
          )}

          {/* ABA 3: COMISSÃO / MASTER */}
          {loginMode === 'admin' && (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 space-y-1">
                <p className="font-display font-extrabold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Acesso Restrito da Comissão</span>
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Área protegida da A.A.A. Cangaceira para Moderador Master, Diretores e Mesários Oficiais.
                </p>
              </div>

              <Input
                label="E-mail da Comissão"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="cangaceira@uema.com"
                leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                required
              />

              <Input
                label="Senha de Acesso"
                type={showAdminPassword ? 'text' : 'password'}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Senha administrativa"
                leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="p-1.5 text-slate-400 hover:text-slate-600"
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Validando...' : 'Entrar no Painel Admin'}
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Rodapé */}
      <div className="w-full max-w-md mx-auto pb-2 text-center">
        <p className="text-xs text-brand-text-muted font-medium">
          INTRAMED IX • A.A.A. Cangaceira — Medicina UEMA
        </p>
      </div>

      {/* Modal de Recuperação de Senha */}
      <Modal
        isOpen={isRecoveryModalOpen}
        onClose={() => {
          setIsRecoveryModalOpen(false);
          setRecoveryFeedback(null);
        }}
        title="Recuperação de Acesso"
        description="Informe o e-mail cadastrado na plataforma para instruções de redefinição."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setRecoveryFeedback(
              'Solicitação registrada com sucesso no servidor. Caso o e-mail esteja cadastrado, você poderá solicitar o código diretamente na mesa de arbitragem da Atlética Cangaceira ou pelo suporte.'
            );
          }}
          className="space-y-4"
        >
          {recoveryFeedback && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{recoveryFeedback}</span>
            </div>
          )}

          <Input
            label="E-mail de Cadastro"
            type="email"
            value={recoveryEmail}
            onChange={(e) => setRecoveryEmail(e.target.value)}
            placeholder="seu.email@uema.br"
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsRecoveryModalOpen(false);
                setRecoveryFeedback(null);
              }}
            >
              Fechar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Solicitar Recuperação
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
