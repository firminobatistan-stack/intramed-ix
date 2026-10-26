import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  User,
  KeyRound,
  LogOut,
} from 'lucide-react';
import { BrandMark } from '../components/layout/BrandMark';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useCompetitionStore } from '../context/CompetitionStoreContext';

type LoginModeTab = 'admin' | 'athlete';

/**
 * TELA DE AUTENTICAÇÃO OFICIAL (/login) — INTRAMED IX
 * - Separa claramente o acesso em 2 perfis:
 *   1. Comissão Organizadora / Mesário / Admin (Acesso restrito com senha para operar Súmula ao Vivo,
 *      controlar cronômetro, lançar gols/pontos, cadastrar atletas/jogos e usar o Modo de Teste);
 *   2. Atleta Inscrito (Acesso vinculado à ficha oficial do atleta para atualizar sua própria foto de perfil).
 * - Visitantes sem login continuam podendo acompanhar o aplicativo inteiro (placares ao vivo, tabelas,
 *   equipes e estatísticas) em modo somente leitura, sem risco de alterar placares ou cronômetros.
 */
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentUser,
    setCurrentUser,
    visibleAthletes,
    visibleTeams,
    getTeamById,
  } = useCompetitionStore();

  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo || null;

  const [loginMode, setLoginMode] = useState<LoginModeTab>(
    returnTo?.includes('/admin') ? 'admin' : 'athlete'
  );
  const [identifier, setIdentifier] = useState('admin@intramed.uema.br');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(
    visibleAthletes[0]?.id || ''
  );
  const [athletePin, setAthletePin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryFeedback, setRecoveryFeedback] = useState<string | null>(null);

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPass = password.trim();

    if (cleanPass !== 'bicoduro') {
      setErrorMessage('Senha incorreta. Acesso não autorizado.');
      return;
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('intramed_admin_session', 'true');
    }

    setCurrentUser({
      id: 'usr-admin-intramed',
      name:
        identifier.trim() && identifier.includes('@')
          ? `Comissão (${identifier.split('@')[0]})`
          : 'Comissão Organizadora • A.A.A. Cangaceira',
      email: identifier.trim() || 'organizacao@intramed.uema.br',
      avatarUrl: '/assets/atletica/logo.png',
      teamId: null,
      teamName: 'Arbitragem & Organização INTRAMED IX',
      modalityIds: [],
      role: 'administrador',
      linkedAthleteId: null,
    });

    navigate(returnTo || '/admin', { replace: true });
  };

  const handleAthleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const targetId = selectedAthleteId || visibleAthletes[0]?.id;
    const ath = visibleAthletes.find((a) => a.id === targetId);
    if (!ath) {
      setErrorMessage(
        'Nenhum atleta selecionado ou cadastrado ainda. A organização deve inscrever os atletas no painel administrativo.'
      );
      return;
    }

    const team = getTeamById(ath.teamId);
    setCurrentUser({
      id: `usr-${ath.id}`,
      name: ath.name,
      email: `${ath.id}@medicina.uema.br`,
      avatarUrl: ath.avatarUrl,
      teamId: ath.teamId,
      teamName: team?.name || 'Equipe Medicina UEMA',
      modalityIds: ath.modalityIds,
      role: 'atleta',
      linkedAthleteId: ath.id,
    });

    navigate(`/atleta/${ath.id}`, { replace: true });
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryFeedback(
      'Solicitação registrada. Procure a mesa da A.A.A. Cangaceira para redefinir sua credencial.'
    );
  };

  return (
    <div className="min-h-screen bg-brand-surface-muted flex flex-col justify-between p-4 sm:p-6">
      {/* Barra superior com retorno à navegação */}
      <div className="w-full max-w-md mx-auto pt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-brand-text-secondary hover:text-brand-text-primary hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao início (Modo Torcida / Público)</span>
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

          {/* Identidade Visual INTRAMED IX + Atlética Cangaceira */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <img
              src="/assets/atletica/logo.png"
              alt="A.A.A. Cangaceira — Medicina UEMA"
              className="w-20 h-20 object-contain drop-shadow-md mb-2.5"
            />
            <BrandMark size="lg" showEmblem={false} />
            <div className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-surface-muted border border-brand-surface-border">
              <span
                className="w-1.5 h-1.5 rounded-full bg-brand-yellow"
                aria-hidden="true"
              />
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-text-secondary">
                Controle de Acesso Oficial • A.A.A. Cangaceira
              </p>
            </div>
          </div>

          {/* Caso já exista sessão ativa, mostra resumo e opção de sair */}
          {currentUser && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="block text-[10px] font-display font-extrabold uppercase text-emerald-700">
                  Sessão Ativa ({currentUser.role.toUpperCase()})
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

          {loginMode === 'admin' ? (
            <form onSubmit={handleAdminSubmit} className="space-y-4" noValidate>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-1">
                <p className="font-display font-extrabold flex items-center gap-1.5 text-slate-900">
                  <KeyRound className="w-3.5 h-3.5 text-[#0B218A]" />
                  <span>Acesso Restrito</span>
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Área restrita aos organizadores e mesários autorizados da A.A.A. Cangaceira.
                </p>
              </div>

              <div className="space-y-1.5">
                <Input
                  label="Senha de Acesso"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Digite a senha"
                  leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword ? 'Ocultar senha' : 'Mostrar senha'
                      }
                      className="p-1.5 rounded-lg hover:bg-brand-surface-muted text-brand-text-muted hover:text-brand-text-primary transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  }
                  required
                />
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 leading-relaxed"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="pt-1 space-y-2">
                <Button type="submit" variant="primary" size="lg" fullWidth>
                  Desbloquear Acesso
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('athlete');
                    setErrorMessage(null);
                  }}
                  className="w-full text-center text-xs text-slate-500 hover:text-slate-800 py-1 transition-colors"
                >
                  ← Voltar ao Acesso do Atleta
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <form onSubmit={handleAthleteSubmit} className="space-y-4" noValidate>
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 space-y-1">
                  <p className="font-display font-extrabold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Perfil Individual do Atleta</span>
                  </p>
                  <p className="text-[11px] text-amber-900/80 leading-relaxed">
                    Permite atualizar a <strong>sua própria foto de perfil</strong>. Atletas não têm acesso para alterar súmulas, cronômetros ou estatísticas oficiais.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-secondary mb-1.5">
                    Selecione seu Nome / Inscrição ({visibleAthletes.length})
                  </label>
                  <select
                    value={selectedAthleteId || visibleAthletes[0]?.id || ''}
                    onChange={(e) => setSelectedAthleteId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-surface-border text-sm bg-white focus:outline-none focus:border-brand-blue"
                  >
                    {visibleAthletes.length === 0 ? (
                      <option value="">
                        Nenhum atleta inscrito ainda pela comissão
                      </option>
                    ) : (
                      visibleAthletes.map((ath) => {
                        const t = visibleTeams.find((tm) => tm.id === ath.teamId);
                        return (
                          <option key={ath.id} value={ath.id}>
                            #{ath.jerseyNumber || '—'} {ath.name} ({t?.name || 'Equipe'})
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                <Input
                  label="Código / Matrícula do Atleta (Opcional)"
                  type="text"
                  value={athletePin}
                  onChange={(e) => setAthletePin(e.target.value)}
                  placeholder="Ex: UEMA-2026"
                  leftIcon={<KeyRound className="w-4 h-4" />}
                />

                {errorMessage && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 leading-relaxed"
                  >
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={visibleAthletes.length === 0}
                  >
                    Acessar Meu Perfil de Atleta
                  </Button>
                </div>
              </form>

              {/* Acesso Restrito Discreto para a Organização */}
              <div className="pt-3 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('admin');
                    setErrorMessage(null);
                  }}
                  className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-50"
                >
                  <Lock className="w-3 h-3" />
                  <span>Acesso Restrito</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rodapé minimalista */}
      <div className="w-full max-w-md mx-auto pb-2 text-center">
        <p className="text-xs text-brand-text-muted font-medium">
          INTRAMED IX • A.A.A. Cangaceira
        </p>
      </div>

      {/* Modal de Recuperação de Senha */}
      <Modal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        title="Recuperação de Credencial"
        description="Informe seu e-mail institucional para solicitar suporte à comissão organizadora."
      >
        <form onSubmit={handleRecoverySubmit} className="space-y-4">
          <Input
            label="E-mail cadastrado"
            type="email"
            value={recoveryEmail}
            onChange={(e) => setRecoveryEmail(e.target.value)}
            placeholder="Digite seu e-mail"
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />

          {recoveryFeedback && (
            <div className="p-3 rounded-xl bg-brand-surface-muted border border-brand-surface-border text-xs text-brand-text-secondary">
              {recoveryFeedback}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsRecoveryModalOpen(false)}
            >
              Fechar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Solicitar suporte
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
