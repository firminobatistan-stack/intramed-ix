import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Trophy,
  Calendar,
  GitBranch,
  ClipboardList,
  Tv,
  X,
  ArrowRight,
  Clock,
  Shield,
  User,
  Layers,
} from 'lucide-react';
import { OFFICIAL_MODALITIES } from '../../data/officialData';
import { useCompetitionStore } from '../../context/CompetitionStoreContext';
import { SportIcon } from '../sports/SportIcon';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const { visibleMatches } = useCompetitionStore();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Futsal',
    'Basquete',
    'Natação',
    'Chaveamento',
  ]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const matchingModalities = OFFICIAL_MODALITIES.filter((m) =>
    m.name.toLowerCase().includes(q)
  );

  const matchingMatches = visibleMatches.filter(
    (m) =>
      m.modalityName.toLowerCase().includes(q) ||
      (m.homeTeam.teamName || '').toLowerCase().includes(q) ||
      (m.awayTeam.teamName || '').toLowerCase().includes(q)
  );

  const handleGo = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-4 bg-brand-blue-dark/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Busca rápida INTRAMED IX"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-lg bg-white rounded-3xl border border-brand-surface-border shadow-2xl overflow-hidden">
        {/* Barra de Pesquisa */}
        <div className="px-4 py-3.5 border-b border-brand-surface-border flex items-center gap-3">
          <Search className="w-5 h-5 text-brand-blue shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar modalidade, chaveamento, súmula ou placar..."
            className="w-full text-sm text-brand-text-primary placeholder:text-brand-text-muted focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-brand-text-muted hover:text-brand-text-primary hover:bg-brand-surface-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resultados Rápidos e Estados de Busca (Seção 12 do Master Prompt) */}
        <div className="max-h-[70vh] overflow-y-auto p-4 space-y-5">
          {/* Sugestões e Histórico Recente quando o campo está vazio */}
          {!q && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-text-muted flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-blue" />
                  <span>Buscas Sugeridas & Recentes</span>
                </span>
                {recentSearches.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRecentSearches([])}
                    className="text-[11px] font-semibold text-brand-text-muted hover:text-brand-blue"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 px-1">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQuery(term)}
                    className="px-3 py-1.5 rounded-xl bg-brand-surface-muted hover:bg-brand-blue hover:text-white border border-brand-surface-border text-xs font-semibold text-brand-text-primary transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Atalhos Categorizados do Sistema */}
          <div>
            <span className="px-2 text-[11px] font-bold uppercase tracking-wider text-brand-text-muted block mb-2">
              Páginas e Ferramentas do Ecossistema
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleGo('/admin')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-brand-surface-muted hover:bg-brand-blue-light/60 text-left text-xs font-semibold text-brand-text-primary transition-colors"
              >
                <ClipboardList className="w-4 h-4 text-brand-blue shrink-0" />
                <span>Súmulas</span>
              </button>
              <button
                type="button"
                onClick={() => handleGo('/placar')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-brand-surface-muted hover:bg-brand-blue-light/60 text-left text-xs font-semibold text-brand-text-primary transition-colors"
              >
                <Tv className="w-4 h-4 text-brand-blue shrink-0" />
                <span>Match Center</span>
              </button>
              <button
                type="button"
                onClick={() => handleGo('/chaveamento')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-brand-surface-muted hover:bg-brand-blue-light/60 text-left text-xs font-semibold text-brand-text-primary transition-colors"
              >
                <GitBranch className="w-4 h-4 text-brand-blue shrink-0" />
                <span>Chaveamento</span>
              </button>
              <button
                type="button"
                onClick={() => handleGo('/equipe')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-brand-surface-muted hover:bg-brand-blue-light/60 text-left text-xs font-semibold text-brand-text-primary transition-colors"
              >
                <Shield className="w-4 h-4 text-brand-blue shrink-0" />
                <span>Equipes</span>
              </button>
              <button
                type="button"
                onClick={() => handleGo('/atleta')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-brand-surface-muted hover:bg-brand-blue-light/60 text-left text-xs font-semibold text-brand-text-primary transition-colors"
              >
                <User className="w-4 h-4 text-brand-blue shrink-0" />
                <span>Ficha de Atleta</span>
              </button>
              <button
                type="button"
                onClick={() => handleGo('/design-system')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-brand-surface-muted hover:bg-brand-blue-light/60 text-left text-xs font-semibold text-brand-text-primary transition-colors"
              >
                <Layers className="w-4 h-4 text-brand-blue shrink-0" />
                <span>UI Case & 30 Telas</span>
              </button>
            </div>
          </div>

          {/* Modalidades Oficiais */}
          <div>
            <span className="px-2 text-[11px] font-bold uppercase tracking-wider text-brand-text-muted block mb-2">
              Modalidades Oficiais ({matchingModalities.length})
            </span>
            {matchingModalities.length === 0 ? (
              <p className="px-2 text-xs text-brand-text-secondary">
                Nenhuma modalidade encontrada para "{query}".
              </p>
            ) : (
              <div className="space-y-1">
                {matchingModalities.map((mod) => (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => handleGo(`/competicoes/${mod.id}`)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-brand-surface-muted text-left transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-blue-light/80 text-brand-blue group-hover:bg-brand-blue group-hover:text-white flex items-center justify-center transition-colors">
                        <SportIcon iconKey={mod.iconKey} className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold text-brand-text-primary">
                        {mod.name}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-brand-text-muted group-hover:text-brand-blue" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Partidas Visíveis (quando houver) */}
          {matchingMatches.length > 0 && (
            <div>
              <span className="px-2 text-[11px] font-bold uppercase tracking-wider text-brand-text-muted block mb-2">
                Partidas ({matchingMatches.length})
              </span>
              <div className="space-y-1.5">
                {matchingMatches.slice(0, 5).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleGo(`/placar/${m.id}`)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-brand-surface-muted/60 hover:bg-brand-blue-light/50 text-xs transition-colors"
                  >
                    <span className="font-bold text-brand-blue">
                      {m.modalityName}: {m.homeTeam.teamName} {m.homeTeam.score ?? 0} ×{' '}
                      {m.awayTeam.score ?? 0} {m.awayTeam.teamName}
                    </span>
                    <Trophy className="w-3.5 h-3.5 text-brand-yellow-dark" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
