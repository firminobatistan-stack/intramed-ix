import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Eye, EyeOff, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BrandMark } from '../components/layout/BrandMark';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import {
  useCompetitionStore,
  getStoredOperatorToken,
  setStoredOperatorToken,
} from '../context/CompetitionStoreContext';

export const FirstAccessPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useCompetitionStore();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = getStoredOperatorToken();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanNew = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanNew || cleanNew.length < 6) {
      setErrorMessage('A nova senha deve possuir no mínimo 6 caracteres.');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setErrorMessage('A confirmação de senha não confere com a nova senha digitada.');
      return;
    }

    if (!token) {
      setErrorMessage('Sessão expirada. Faça login novamente para prosseguir.');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/cloud-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-intramed-token': token,
        },
        body: JSON.stringify({
          action: 'change_admin_password',
          newPassword: cleanNew,
          confirmPassword: cleanConfirm,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setErrorMessage(data?.error || 'Erro ao redefinir senha no servidor.');
        setIsSubmitting(false);
        return;
      }

      if (data.token) {
        setStoredOperatorToken(data.token);
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('intramed_admin_session', 'true');
      }

      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          mustChangePassword: false,
        });
      }

      setSuccessMessage('Senha atualizada com sucesso! Redirecionando para o painel administrativo...');
      setTimeout(() => {
        navigate('/admin', { replace: true });
      }, 1500);
    } catch {
      setErrorMessage('Falha na comunicação com o servidor. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="flex justify-center mb-6">
          <BrandMark size="lg" />
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4" />
            <span>Segurança Obrigatória • Nível Master</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Primeiro Acesso — Atlética Cangaceira
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Por política de proteção do INTRAMED IX, você deve cadastrar uma nova senha antes de acessar as ferramentas administrativas.
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200/80 sm:px-10">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nova Senha Pessoal
              </label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  required
                  leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-700">Requisitos de Senha:</p>
              <p>• Pelo menos 6 caracteres;</p>
              <p>• A nova senha substituirá a credencial inicial temporária;</p>
              <p>• A conta Master não poderá ser excluída ou rebaixada por outros membros.</p>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center py-3 font-bold"
              disabled={isSubmitting || Boolean(successMessage)}
            >
              {isSubmitting ? 'Salvando Senha...' : 'Definir Senha e Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
