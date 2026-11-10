import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  Plus,
  RefreshCw,
  Clock,
  Lock,
  ArrowRight,
  Filter,
  Shield,
  Sparkles,
  Bookmark,
  Users,
} from 'lucide-react';
import { useCompetitionStore } from '../context/CompetitionStoreContext';
import { SocialPost } from '../types/domain';
import { PostCard } from '../components/social/PostCard';
import { CreatePostModal } from '../components/social/CreatePostModal';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';

type FeedTab = 'all' | 'my-team' | 'saved';

export const FeedPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentUser,
    canOperateOfficialData,
    launchConfig,
    fetchFeedPosts,
  } = useCompetitionStore();

  const isAdmin = canOperateOfficialData();

  // Estados locais
  const [activeTab, setActiveTab] = useState<FeedTab>('all');
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Verificação do modo de lançamento público
  const isLockedForVisitor = !launchConfig.publicProfilesVisible && !isAdmin;

  const loadPosts = useCallback(
    async (showLoadingSpinner = true) => {
      if (showLoadingSpinner) setIsLoading(true);
      else setIsRefreshing(true);

      const params: { teamId?: string; onlySaved?: boolean } = {};
      if (activeTab === 'my-team' && currentUser?.teamId) {
        params.teamId = currentUser.teamId;
      } else if (activeTab === 'saved') {
        params.onlySaved = true;
      }

      const fetched = await fetchFeedPosts(params);
      setPosts(fetched);
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [activeTab, currentUser?.teamId, fetchFeedPosts]
  );

  useEffect(() => {
    if (!isLockedForVisitor) {
      loadPosts(true);
    }
  }, [loadPosts, isLockedForVisitor]);

  // Se o modo de lançamento público bloquear perfis e posts para visitantes
  if (isLockedForVisitor) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 sm:p-12">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Clock className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 text-xs font-black tracking-wider uppercase mb-3">
            <Lock className="w-3.5 h-3.5" />
            Feed da Comunidade • INTRAMED IX
          </span>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
            ACESSO EM BREVE
          </h1>

          <p className="text-slate-600 text-sm sm:text-base max-w-lg mx-auto leading-relaxed mb-8">
            Estamos preparando o Feed Social dos jogos. Em breve, você poderá compartilhar suas fotos, torcer pelas atléticas e acompanhar as publicações do campeonato. Enquanto isso, consulte as informações esportivas e o chaveamento oficial!
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="primary"
              onClick={() => navigate('/chaveamento')}
              className="w-full sm:w-auto font-bold px-6 py-3"
            >
              <span>Ver Chaveamento Oficial</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/')}
              className="w-full sm:w-auto font-semibold px-6 py-3"
            >
              <span>Voltar ao Início</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handlePostCreated = (newPost: SocialPost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostUpdated = (updated: SocialPost) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12">
      {/* 1. Header do Feed */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B218A] via-[#102a9e] to-[#1E3A8A] text-white p-6 sm:p-7 shadow-elevated border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-display font-bold uppercase tracking-wider text-brand-yellow">
            <Flame className="w-3.5 h-3.5" />
            <span>Comunidade Esportiva • INTRAMED IX</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-tight">
            Feed Social
          </h1>
          <p className="text-xs sm:text-sm text-white/80 max-w-md">
            Acompanhe fotos, torcidas, lances e bastidores das atléticas da Medicina UEMA.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => loadPosts(false)}
            disabled={isRefreshing}
            className="p-2.5 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-50"
            title="Atualizar feed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <Button
            variant="accent"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              if (!currentUser) navigate('/login');
              else setIsCreateModalOpen(true);
            }}
          >
            Publicar
          </Button>
        </div>
      </div>

      {/* 2. Barra de Abas / Filtros */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-2xl transition-all whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-[#0B218A] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          Feed Geral
        </button>

        {currentUser?.teamId && (
          <button
            type="button"
            onClick={() => setActiveTab('my-team')}
            className={`px-4 py-2 rounded-2xl transition-all whitespace-nowrap ${
              activeTab === 'my-team'
                ? 'bg-[#0B218A] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            Minha Equipe
          </button>
        )}

        {currentUser && (
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`px-4 py-2 rounded-2xl transition-all whitespace-nowrap inline-flex items-center gap-1.5 ${
              activeTab === 'saved'
                ? 'bg-[#0B218A] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Salvos</span>
          </button>
        )}
      </div>

      {/* 3. Card de Criação Rápida */}
      {currentUser && (
        <div
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center gap-3.5 group"
        >
          <Avatar
            src={currentUser.avatarUrl}
            alt={currentUser.name}
            size="md"
            className="border border-slate-200"
          />
          <div className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 text-xs sm:text-sm group-hover:bg-slate-100 transition-colors">
            No que você está pensando, {currentUser.name.split(' ')[0]}? Compartilhe com o IntraMed...
          </div>
          <div className="p-2 rounded-2xl bg-[#0B218A]/10 text-[#0B218A] group-hover:bg-[#0B218A] group-hover:text-white transition-colors">
            <Plus className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* 4. Lista de Publicações */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="space-y-1.5 flex-1">
                  <div className="w-28 h-3.5 rounded-md bg-slate-200" />
                  <div className="w-20 h-2.5 rounded-md bg-slate-100" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="w-full h-3 rounded-md bg-slate-100" />
                <div className="w-4/5 h-3 rounded-md bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-[#0B218A] flex items-center justify-center mx-auto mb-4">
            <Flame className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-display font-bold text-slate-900 mb-1">
            {activeTab === 'saved'
              ? 'Nenhuma publicação salva ainda'
              : 'O Feed está pronto para começar!'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">
            {activeTab === 'saved'
              ? 'Toque no ícone de marcador em qualquer publicação para consultá-la aqui a qualquer momento.'
              : 'Seja o primeiro participante a postar uma foto de treino, mensagem para sua atlética ou expectativa dos jogos.'}
          </p>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              if (!currentUser) navigate('/login');
              else setIsCreateModalOpen(true);
            }}
          >
            Criar Primeira Publicação
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPostUpdated={handlePostUpdated}
              onPostDeleted={handlePostDeleted}
            />
          ))}
        </div>
      )}

      {/* Modal de Criação de Post */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
};
export default FeedPage;
