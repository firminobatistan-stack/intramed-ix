import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Trophy,
  Shield,
  User,
  Compass,
  Sparkles,
  Check,
} from 'lucide-react';
import { OFFICIAL_MODALITIES } from '../data/officialData';
import { useCompetitionStore } from '../context/CompetitionStoreContext';
import { SportIcon } from '../components/sports/SportIcon';
import { MatchCard } from '../components/sports/MatchCard';
import { Tabs, TabItem } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';

type FavTabId = 'modalidades' | 'equipes' | 'atletas';

const FAV_TABS: TabItem[] = [
  { id: 'modalidades', label: 'Modalidades', icon: <Trophy className="w-4 h-4" /> },
  { id: 'equipes', label: 'Equipes / Períodos', icon: <Shield className="w-4 h-4" /> },
  { id: 'atletas', label: 'Atletas', icon: <User className="w-4 h-4" /> },
];

/**
 * 13. FAVORITOS E PERSONALIZAÇÃO (Master Prompt)
 * Permite acompanhar modalidades, equipes (períodos) e atletas favoritos,
 * filtrando automaticamente partidas de interesse.
 */
export const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    favoriteModalityIds,
    toggleFavoriteModality,
    visibleMatches,
  } = useCompetitionStore();

  const [activeTab, setActiveTab] = useState<FavTabId>('modalidades');

  const relatedMatches = visibleMatches.filter((m) =>
    favoriteModalityIds.includes(m.modalityId)
  );

  return (
    <div className="space-y-6">
      {/* Banner de Cabeçalho */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-blue-dark via-brand-blue to-brand-blue-medium text-white p-6 sm:p-7 shadow-elevated border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <img
          src="/assets/atletica/face-monocor.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute -right-4 -bottom-6 w-40 h-40 object-contain opacity-[0.07]"
        />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-display font-bold uppercase tracking-wider text-brand-yellow mb-2">
            <Heart className="w-3.5 h-3.5 fill-brand-yellow text-brand-yellow" />
            <span>Personalização • INTRAMED IX</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white">
            Meus Favoritos
          </h2>
          <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-xl">
            Selecione as modalidades, períodos e atletas de seu interesse para destacar seus jogos e alertas.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <span className="px-3.5 py-2 rounded-2xl bg-white/10 border border-white/15 text-xs font-display font-extrabold text-brand-yellow">
            {favoriteModalityIds.length} modalidade(s) seguida(s)
          </span>
        </div>
      </div>

      {/* Abas de Categorias de Favoritos */}
      <div className="bg-white rounded-3xl border border-brand-surface-border p-2 shadow-card">
        <Tabs
          tabs={FAV_TABS}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as FavTabId)}
          variant="pill"
        />
      </div>

      {activeTab === 'modalidades' && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-white border border-brand-surface-border p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-display font-extrabold text-brand-text-primary">
                  Escolha suas Modalidades Favoritas
                </h3>
                <p className="text-xs text-brand-text-secondary">
                  Toque no coração para fixar ou remover uma modalidade do seu feed personalizado.
                </p>
              </div>
              <Sparkles className="w-5 h-5 text-brand-yellow-dark shrink-0" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {OFFICIAL_MODALITIES.map((mod) => {
                const isFav = favoriteModalityIds.includes(mod.id);
                return (
                  <div
                    key={mod.id}
                    className={`rounded-2xl p-4 border transition-all flex items-center justify-between gap-3 ${
                      isFav
                        ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
                        : 'bg-brand-surface-muted/70 text-brand-text-primary border-brand-surface-border hover:border-brand-blue/30'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/competicoes/${mod.id}`)}
                      className="flex items-center gap-3 text-left min-w-0 flex-1"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isFav
                            ? 'bg-white/15 text-brand-yellow'
                            : 'bg-white text-brand-blue border border-brand-surface-border'
                        }`}
                      >
                        <SportIcon iconKey={mod.iconKey} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-sm font-display font-bold truncate">
                          {mod.name}
                        </span>
                        <span
                          className={`block text-[11px] ${
                            isFav ? 'text-brand-yellow' : 'text-brand-text-muted'
                          }`}
                        >
                          {isFav ? 'Seguindo' : 'Toque para seguir'}
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleFavoriteModality(mod.id)}
                      aria-label={
                        isFav
                          ? `Remover ${mod.name} dos favoritos`
                          : `Adicionar ${mod.name} aos favoritos`
                      }
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                        isFav
                          ? 'bg-brand-yellow text-brand-blue-dark'
                          : 'bg-white border border-brand-surface-border text-brand-text-muted hover:text-brand-blue'
                      }`}
                    >
                      {isFav ? (
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      ) : (
                        <Heart className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Partidas Relacionadas às Modalidades Favoritas */}
          <div className="space-y-3">
            <h3 className="text-base font-display font-extrabold text-brand-text-primary px-1">
              Partidas das suas Modalidades Favoritas
            </h3>
            {favoriteModalityIds.length === 0 ? (
              <EmptyState
                variant="matches"
                title="Nenhuma modalidade favoritada ainda"
                message="Selecione uma ou mais modalidades acima para acompanhar seus jogos aqui."
              />
            ) : relatedMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relatedMatches.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            ) : (
              <EmptyState
                variant="matches"
                title="Sem partidas cadastradas para seus favoritos"
                message="Os jogos das modalidades selecionadas aparecerão automaticamente aqui quando forem agendados."
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'equipes' && (
        <EmptyState
          variant="teams"
          title="Nenhuma equipe / período cadastrado"
          message="Assim que as turmas e períodos de Medicina forem cadastrados oficialmente pela A.A.A. Cangaceira, você poderá favoritá-los aqui."
          action={
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Compass className="w-4 h-4" />}
              onClick={() => navigate('/equipe')}
            >
              Visualizar Estrutura da Página de Equipe
            </Button>
          }
        />
      )}

      {activeTab === 'atletas' && (
        <EmptyState
          variant="teams"
          title="Nenhum atleta cadastrado"
          message="Quando a relação oficial de atletas de cada período estiver disponível, você poderá seguir atletas específicos."
          action={
            <Button
              variant="primary"
              size="sm"
              leftIcon={<User className="w-4 h-4" />}
              onClick={() => navigate('/atleta')}
            >
              Visualizar Estrutura do Perfil de Atleta
            </Button>
          }
        />
      )}
    </div>
  );
};
