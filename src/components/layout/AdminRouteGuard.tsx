import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Lock,
  ShieldAlert,
  ArrowLeft,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
  ClipboardList,
} from 'lucide-react';
import {
  useCompetitionStore,
  setStoredOperatorToken,
} from '../../context/CompetitionStoreContext';
import { BrandMark } from './BrandMark';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface AdminRouteGuardProps {
  children: React.ReactNode;
  title?: string;
}

/**
 * Guardião de Rotas Restritas à Comissão / Arbitragem / Mesários (`/admin` e `/sumula/:matchId`).
 * - Para rotas de súmula (`/sumula/:matchId`), permite desbloqueio por:
 *   1. Senha individual do Mesário daquela partida (`match.tableOfficialPassword`); ou
 *   2. Senha geral da Comissão Organizadora (`"bicoduro"`).
 * - Para rotas administrativas gerais (`/admin`), exige a senha da Comissão Organizadora (`"bicoduro"`).
 */
export const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({
  children,
  title = 'Área Restrita da Organização',
}) => {
  const {
    setCurrentUser,
    canOperateOfficialData,
    canOperateMatch,
    unlockMatchAsTableOfficial,
    getMatchById,
  } = useCompetitionStore();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ matchId?: string }>();

  // Identifica se o acesso é para operar a súmula de uma partida específica
  const matchIdFromPath =
    params.matchId ||
    (location.pathname.startsWith('/sumula/')
      ? location.pathname.split('/')[2]
      : undefined);

  const isMatchSheetRoute = Boolean(
    matchIdFromPath && location.pathname.startsWith('/sumula/')
  );

  const targetMatch = matchIdFromPath ? getMatchById(matchIdFromPath) : undefined;

  const [officialName, setOfficialName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isMatchSheetRoute && matchIdFromPath && canOperateMatch(matchIdFromPath)) {
    return <>{children}</>;
  }

  if (!isMatchSheetRoute && canOperateOfficialData()) {
    return <>{children}</>;
  }

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isMatchSheetRoute && matchIdFromPath) {
      const result = unlockMatchAsTableOfficial(
        matchIdFromPath,
        password,
        officialName
      );
      if (!result.ok) {
        setError(result.error || 'Senha incorreta para esta partida.');
      }
      return;
    }

    const cleanPass = password.trim();
    let isAuthorized = cleanPass === 'bicoduro';

    try {
      const res = await fetch('/api/cloud-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_operator_pin',
          password: cleanPass,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data?.role === 'admin' && data?.token) {
        setStoredOperatorToken(data.token);
        isAuthorized = true;
      } else if (res.status === 401) {
        isAuthorized = false;
      }
    } catch {
      // Fallback local
    }

    if (!isAuthorized) {
      setError('Senha incorreta. Acesso não autorizado.');
      return;
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('intramed_admin_session', 'true');
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
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10 bg-[#F4F6FB]">
      <div className="w-full max-w-md all-sports-card p-6 sm:p-8 text-center space-y-5 border border-slate-200/90 shadow-xl bg-white rounded-3xl">
        <div className="w-16 h-16 rounded-2xl bg-[#0B218A] text-brand-yellow mx-auto flex items-center justify-center shadow-lg">
          {isMatchSheetRoute ? (
            <ClipboardList className="w-8 h-8" />
          ) : (
            <Lock className="w-8 h-8" />
          )}
        </div>

        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-display font-extrabold uppercase tracking-wider text-slate-700">
            <Lock className="w-3.5 h-3.5 text-[#0B218A]" />
            <span>
              {isMatchSheetRoute
                ? 'Acesso do Mesário da Partida'
                : 'Acesso Restrito da Comissão'}
            </span>
          </span>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 pt-1">
            {isMatchSheetRoute ? 'Mesa Oficial & Súmula Ao Vivo' : title}
          </h2>
          {targetMatch ? (
            <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-xs text-[#0B218A] font-display font-bold mt-2">
              <span className="block uppercase text-[10px] text-blue-600">
                {targetMatch.modalityName} • {targetMatch.phaseLabel}
              </span>
              <span className="text-sm font-extrabold text-slate-900">
                {targetMatch.homeTeam.teamName} × {targetMatch.awayTeam.teamName}
              </span>
            </div>
          ) : (
            <p className="text-xs text-slate-500 leading-relaxed">
              {isMatchSheetRoute
                ? 'Digite a senha exclusiva fornecida para o mesário desta partida para abrir o painel de marcação ao vivo (gols, cartões, faltas e cronômetro).'
                : 'Esta seção requer credencial administrativa para gestão geral do campeonato.'}
            </p>
          )}
        </div>

        <form onSubmit={handleUnlock} className="space-y-4 pt-1 text-left">
          {isMatchSheetRoute && (
            <Input
              label="Seu Nome (Mesário / Árbitro de Mesa)"
              type="text"
              value={officialName}
              onChange={(e) => setOfficialName(e.target.value)}
              placeholder="Ex: João Pedro (Mesário)"
              leftIcon={<UserCheck className="w-4 h-4 text-slate-400" />}
            />
          )}

          <div className="space-y-1">
            <Input
              label={
                isMatchSheetRoute
                  ? 'Senha da Partida (Código do Mesário) *'
                  : 'Senha de Acesso *'
              }
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder={
                isMatchSheetRoute
                  ? 'Ex: MESA-2026 ou código da partida'
                  : 'Digite a senha'
              }
              leftIcon={<KeyRound className="w-4 h-4 text-slate-400" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-slate-600"
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

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <Button type="submit" variant="primary" size="md" fullWidth>
              {isMatchSheetRoute ? 'Entrar na Súmula Ao Vivo' : 'Desbloquear Painel'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              fullWidth
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() =>
                navigate(
                  isMatchSheetRoute && matchIdFromPath
                    ? `/placar/${matchIdFromPath}`
                    : '/'
                )
              }
            >
              {isMatchSheetRoute ? 'Voltar ao Placar' : 'Voltar ao Início'}
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
