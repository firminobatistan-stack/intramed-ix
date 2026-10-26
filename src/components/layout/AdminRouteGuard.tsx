import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Lock, ShieldAlert, ArrowLeft, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useCompetitionStore } from '../../context/CompetitionStoreContext';
import { BrandMark } from './BrandMark';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface AdminRouteGuardProps {
  children: React.ReactNode;
  title?: string;
}

/**
 * Guardião de Rotas Restritas à Comissão / Arbitragem / Administração (`/admin` e `/sumula/:matchId`).
 * Senha oficial de desbloqueio: "bicoduro".
 */
export const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({
  children,
  title = 'Área Restrita da Organização',
}) => {
  const { currentUser, setCurrentUser, canOperateOfficialData } = useCompetitionStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (canOperateOfficialData()) {
    return <>{children}</>;
  }

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.trim() !== 'bicoduro') {
      setError('Senha incorreta. Acesso não autorizado.');
      return;
    }

    setCurrentUser({
      id: 'usr-admin-intramed',
      name: 'Comissão Organizadora • A.A.A. Cangaceira',
      email: 'organizacao@intramed.uema.br',
      avatarUrl: '/assets/atletica/logo.png',
      teamId: null,
      teamName: 'Arbitragem & Organização INTRAMED IX',
      modalityIds: [],
      role: 'administrador',
      linkedAthleteId: null,
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md all-sports-card p-6 sm:p-8 text-center space-y-5 border border-slate-200/90 shadow-xl bg-white rounded-3xl">
        <div className="w-16 h-16 rounded-2xl bg-[#0B218A] text-brand-yellow mx-auto flex items-center justify-center shadow-lg">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-display font-extrabold uppercase tracking-wider text-slate-700">
            <Lock className="w-3.5 h-3.5 text-[#0B218A]" />
            <span>Acesso Restrito</span>
          </span>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 pt-1">
            {title}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Esta seção requer credencial administrativa para operação de súmula, placares ou gestão de inscrições.
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4 pt-1 text-left">
          <div className="space-y-1">
            <Input
              label="Senha de Acesso"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Digite a senha"
              leftIcon={<KeyRound className="w-4 h-4 text-slate-400" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
            >
              Desbloquear Painel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              fullWidth
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigate('/')}
            >
              Voltar ao Início
            </Button>
          </div>
        </form>

        <div className="pt-3 border-t border-slate-100">
          <BrandMark size="sm" />
        </div>
      </div>
    </div>
  );
};
