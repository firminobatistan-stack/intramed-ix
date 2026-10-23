import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Lock, ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';
import { useCompetitionStore } from '../../context/CompetitionStoreContext';
import { BrandMark } from './BrandMark';
import { Button } from '../ui/Button';

interface AdminRouteGuardProps {
  children: React.ReactNode;
  title?: string;
}

/**
 * Guardião de Rotas Restritas à Comissão / Arbitragem / Administração (`/admin` e `/sumula/:matchId`).
 * Impede que visitantes sem login ou atletas comuns acessem ou operem o cronômetro,
 * lancem gols/eventos, ativem o Modo de Teste ou alterem cadastros oficiais.
 */
export const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({
  children,
  title = 'Área Restrita • Comissão & Arbitragem',
}) => {
  const { currentUser, canOperateOfficialData } = useCompetitionStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (canOperateOfficialData()) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md all-sports-card p-6 sm:p-8 text-center space-y-5 border border-slate-200/90 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-[#0B218A] text-brand-yellow mx-auto flex items-center justify-center shadow-lg">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-[11px] font-display font-extrabold uppercase tracking-wider text-rose-700">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Acesso Exclusivo de Administrador / Mesário</span>
          </span>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 pt-1">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            {currentUser ? (
              <>
                Você está conectado como <strong>{currentUser.name}</strong> (perfil de{' '}
                <strong>Atleta</strong>). A operação de súmulas ao vivo, controle de cronômetro, lançamento de gols e cadastros oficiais são exclusivos da <strong>Comissão Organizadora / Mesa</strong>.
              </>
            ) : (
              <>
                A operação da Súmula Eletrônica ao Vivo, o controle de cronômetro e o gerenciamento do campeonato são restritos à <strong>Comissão Organizadora e Arbitragem (A.A.A. Cangaceira)</strong>.
              </>
            )}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Button
            variant="primary"
            size="md"
            fullWidth
            leftIcon={<LogIn className="w-4 h-4" />}
            onClick={() =>
              navigate('/login', {
                state: { returnTo: location.pathname },
              })
            }
          >
            Entrar como Admin / Mesário
          </Button>
          <Button
            variant="outline"
            size="md"
            fullWidth
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/')}
          >
            Voltar ao Início
          </Button>
        </div>

        <div className="pt-3 border-t border-slate-100">
          <BrandMark size="sm" />
        </div>
      </div>
    </div>
  );
};
