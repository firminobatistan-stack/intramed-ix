import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, RotateCcw, XCircle } from 'lucide-react';
import { useCompetitionStore } from '../../context/CompetitionStoreContext';

/**
 * 33. Indicador global de MODO DE TESTE — DADOS NÃO OFICIAIS.
 * Exibido no topo de todas as páginas quando o ambiente de simulação/teste da súmula está ativo.
 */
export const TestModeBanner: React.FC = () => {
  const { isTestMode, setTestMode, resetTestEnvironment } = useCompetitionStore();
  const navigate = useNavigate();

  if (!isTestMode) return null;

  return (
    <div
      role="region"
      aria-label="Aviso de Modo de Teste"
      className="bg-brand-yellow text-brand-blue-dark border-b border-brand-yellow-dark/30 px-4 py-2 text-xs font-semibold z-50 print:hidden"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-brand-blue-dark text-brand-yellow shrink-0">
            <FlaskConical className="w-3.5 h-3.5" />
          </span>
          <span className="font-display font-extrabold tracking-wide uppercase">
            MODO DE TESTE — DADOS NÃO OFICIAIS
          </span>
          <span className="hidden md:inline text-brand-blue-dark/80 font-medium">
            • Simulação isolada para operação de súmula e placar ao vivo
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="px-2.5 py-1 rounded-lg bg-brand-blue-dark/10 hover:bg-brand-blue-dark/20 text-brand-blue-dark font-bold transition-colors"
          >
            Painel de Súmulas
          </button>
          <button
            type="button"
            onClick={resetTestEnvironment}
            title="Zerar todas as partidas de teste"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/70 hover:bg-white text-brand-blue-dark font-semibold transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Zerar Testes</span>
          </button>
          <button
            type="button"
            onClick={() => setTestMode(false)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-blue-dark text-white hover:bg-brand-blue font-bold transition-colors"
          >
            <XCircle className="w-3.5 h-3.5 text-brand-yellow" />
            <span>Sair do Modo de Teste</span>
          </button>
        </div>
      </div>
    </div>
  );
};
