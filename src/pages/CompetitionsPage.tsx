import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch } from 'lucide-react';
import { OFFICIAL_MODALITIES } from '../data/officialData';
import { ModalityCard } from '../components/sports/ModalityCard';
import { SportModality } from '../types/domain';

/**
 * 8. COMPETIÇÕES
 * Tela oficial de modalidades do INTRAMED IX.
 * Exibe exclusivamente as 10 modalidades oficiais previstas com seus ícones esportivos:
 * Futsal, Basquete, Handebol, Vôlei, Vôlei de Praia, Truco, Sinuca, Natação, Poker, Tênis de Mesa.
 */
export const CompetitionsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSelectModality = (modality: SportModality) => {
    navigate(`/competicoes/${modality.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Cabeçalho no estilo All Sports */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-blue-dark via-brand-blue to-brand-blue-medium text-white p-6 sm:p-7 shadow-elevated border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <img
          src="/assets/atletica/face-monocor.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute -right-4 -bottom-6 w-40 h-40 object-contain opacity-[0.07]"
        />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-display font-bold uppercase tracking-wider text-brand-yellow mb-2">
            <span>10 Modalidades Oficiais • INTRAMED IX</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white">
            Modalidades Esportivas
          </h2>
          <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-xl">
            Selecione uma modalidade para acessar jogos, resultados, chaveamento, classificação e estatísticas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/chaveamento')}
          className="relative z-10 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-yellow text-brand-blue-dark hover:bg-brand-yellow-dark text-xs font-display font-extrabold transition-colors self-start sm:self-center shrink-0 shadow-sm"
        >
          <GitBranch className="w-4 h-4" />
          <span>Visualizar Chaveamento</span>
        </button>
      </div>

      {/* Grid das 10 Modalidades Oficiais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {OFFICIAL_MODALITIES.map((modality) => (
          <ModalityCard
            key={modality.id}
            modality={modality}
            onClick={handleSelectModality}
          />
        ))}
      </div>
    </div>
  );
};
