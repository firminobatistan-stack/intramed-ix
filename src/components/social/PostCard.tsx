import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  MoreVertical,
  Trash2,
  Edit3,
  Check,
  Send,
  Sparkles,
  Trophy,
  X,
  ExternalLink,
} from 'lucide-react';
import { SocialPost, PostComment } from '../../types/domain';
import { useCompetitionStore } from '../../context/CompetitionStoreContext';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

interface PostCardProps {
  post: SocialPost;
  onPostUpdated?: (updated: SocialPost) => void;
  onPostDeleted?: (postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onPostUpdated,
  onPostDeleted,
}) => {
  const navigate = useNavigate();
  const {
    currentUser,
    canOperateOfficialData,
    toggleLikePost,
    toggleSavePost,
    fetchComments,
    addComment,
    deleteComment,
    updatePost,
    deletePost,
  } = useCompetitionStore();

  const isAdmin = canOperateOfficialData();
  const isAuthor = currentUser && (currentUser.id === post.authorUid || currentUser.email === post.authorUid);
  const canManage = Boolean(isAuthor || isAdmin);

  // Estados locais
  const [isLiked, setIsLiked] = useState(Boolean(post.isLikedByMe));
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [isSaved, setIsSaved] = useState(Boolean(post.isSavedByMe));
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);

  // Comentários
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Menu de opções & edição
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Lightbox de imagem
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

  // Compartilhamento
  const [copiedLink, setCopiedLink] = useState(false);

  // Formata tempo relativo
  const formatTimeAgo = (isoString?: string): string => {
    if (!isoString) return 'recentemente';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'agora';
    if (diffMin < 60) return `há ${diffMin} min`;
    if (diffHours < 24) return `há ${diffHours} h`;
    if (diffDays === 1) return 'ontem';
    if (diffDays < 7) return `há ${diffDays} dias`;
    return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const handleLike = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (isLikeLoading) return;
    setIsLikeLoading(true);

    // Otimista
    const prevLiked = isLiked;
    const prevCount = likesCount;
    setIsLiked(!prevLiked);
    setLikesCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    const res = await toggleLikePost(post.id);
    setIsLikeLoading(false);

    if (res.ok) {
      setIsLiked(res.isLiked);
      setLikesCount(res.likesCount);
      if (onPostUpdated) {
        onPostUpdated({ ...post, isLikedByMe: res.isLiked, likesCount: res.likesCount });
      }
    } else {
      // Reverte em caso de falha
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
    }
  };

  const handleSave = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (isSaveLoading) return;
    setIsSaveLoading(true);

    const prevSaved = isSaved;
    setIsSaved(!prevSaved);

    const res = await toggleSavePost(post.id);
    setIsSaveLoading(false);

    if (res.ok) {
      setIsSaved(res.isSaved);
      if (onPostUpdated) {
        onPostUpdated({ ...post, isSavedByMe: res.isSaved });
      }
    } else {
      setIsSaved(prevSaved);
    }
  };

  const handleToggleComments = async () => {
    if (!showComments) {
      setShowComments(true);
      setIsLoadingComments(true);
      const list = await fetchComments(post.id);
      setComments(list);
      setIsLoadingComments(false);
    } else {
      setShowComments(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    const cleanText = newCommentText.trim();
    if (!cleanText || isSubmittingComment) return;

    setIsSubmittingComment(true);
    const res = await addComment(post.id, cleanText);
    setIsSubmittingComment(false);

    if (res.ok && res.comment) {
      setComments((prev) => [...prev, res.comment!]);
      setCommentsCount((prev) => prev + 1);
      setNewCommentText('');
      if (onPostUpdated) {
        onPostUpdated({ ...post, commentsCount: commentsCount + 1 });
      }
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const res = await deleteComment(commentId);
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCommentsCount((prev) => Math.max(0, prev - 1));
      if (onPostUpdated) {
        onPostUpdated({ ...post, commentsCount: Math.max(0, commentsCount - 1) });
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() && (!post.images || post.images.length === 0)) return;
    setIsSavingEdit(true);
    const res = await updatePost(post.id, editContent.trim(), post.images);
    setIsSavingEdit(false);
    if (res.ok) {
      setIsEditing(false);
      const updated = { ...post, content: editContent.trim(), updatedAtIso: new Date().toISOString() };
      if (onPostUpdated) onPostUpdated(updated);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Tem certeza de que deseja excluir esta publicação? Esta ação é definitiva.')) return;
    const res = await deletePost(post.id);
    if (res.ok && onPostDeleted) {
      onPostDeleted(post.id);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/perfil/${post.authorUid}`;
    const shareData = {
      title: `Publicação de ${post.authorName} no IntraMed IX`,
      text: post.content ? `${post.content.slice(0, 100)}...` : 'Confira esta publicação no IntraMed IX!',
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Usuário cancelou ou navegador não completou o share nativo
      }
    }

    // Fallback: cópia para o clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Falha silenciosa
    }
  };

  return (
    <article className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* 1. Cabeçalho do Card */}
      <div className="p-4 sm:p-5 flex items-start justify-between gap-3">
        <div
          onClick={() => navigate(`/perfil/${post.authorUid}`)}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="relative">
            <Avatar
              src={post.authorAvatarUrl}
              alt={post.authorName}
              size="lg"
              className="border border-slate-200 group-hover:ring-2 group-hover:ring-[#0B218A]/40 transition-all"
            />
            {post.isAuthorAthlete && (
              <span
                title="Atleta Oficial Vinculado"
                className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-brand-yellow text-slate-900 border border-white shadow-xs"
              >
                <Trophy className="w-3 h-3" />
              </span>
            )}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-display font-bold text-slate-900 group-hover:text-[#0B218A] transition-colors">
                {post.authorName}
              </h3>
              {post.authorRole === 'moderador_master' || post.authorRole === 'organizacao' ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                  <Sparkles className="w-2.5 h-2.5" />
                  Comissão
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              {post.authorTurmaLabel && (
                <span className="font-medium text-slate-600">{post.authorTurmaLabel}</span>
              )}
              {post.authorTurmaLabel && <span>•</span>}
              <time dateTime={post.createdAtIso}>{formatTimeAgo(post.createdAtIso)}</time>
            </div>
          </div>
        </div>

        {/* Menu de Ações (Editar/Excluir) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Mais opções"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-8 z-20 w-44 rounded-2xl bg-white border border-slate-200 shadow-xl py-1.5 text-xs font-semibold text-slate-700 animate-in fade-in zoom-in-95">
              {canManage && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsEditing(true);
                      setEditContent(post.content);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 text-slate-700"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar Publicação</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleDeletePost();
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-rose-50 text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Publicação</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  handleShare();
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 text-slate-700"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Conteúdo do Post */}
      <div className="px-4 sm:px-5 pb-3 space-y-3">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              className="w-full p-3 rounded-2xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B218A] resize-none"
              placeholder="Edite sua publicação..."
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditing(false)}
                disabled={isSavingEdit}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveEdit}
                isLoading={isSavingEdit}
              >
                Salvar Alterações
              </Button>
            </div>
          </div>
        ) : (
          post.content && (
            <p className="text-sm sm:text-base text-slate-800 leading-relaxed whitespace-pre-wrap">
              {post.content}
            </p>
          )
        )}

        {/* Tags de Equipe / Modalidade */}
        {(post.teamTag || post.modalityTag) && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {post.teamTag && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                #{post.teamTag}
              </span>
            )}
            {post.modalityTag && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#0B218A]/10 text-[#0B218A] text-xs font-bold uppercase tracking-wider">
                #{post.modalityTag}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3. Galeria de Imagens (1 a 4 imagens) */}
      {post.images && post.images.length > 0 && (
        <div
          className={`grid gap-1 px-4 sm:px-5 pb-3 ${
            post.images.length === 1
              ? 'grid-cols-1'
              : post.images.length === 2
              ? 'grid-cols-2'
              : post.images.length === 3
              ? 'grid-cols-2'
              : 'grid-cols-2'
          }`}
        >
          {post.images.map((imgUrl, idx) => (
            <div
              key={idx}
              onClick={() => setActiveImageIndex(idx)}
              className={`relative overflow-hidden rounded-2xl bg-slate-100 cursor-pointer group ${
                post.images.length === 3 && idx === 0 ? 'col-span-2 aspect-video' : 'aspect-square'
              }`}
            >
              <img
                src={imgUrl}
                alt={`Imagem ${idx + 1} da publicação`}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}

      {/* 4. Barra de Interações (Curtir, Comentar, Compartilhar, Salvar) */}
      <div className="px-4 sm:px-5 py-3 border-t border-slate-100 flex items-center justify-between text-slate-600 text-xs font-semibold select-none">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Botão Curtir */}
          <button
            type="button"
            onClick={handleLike}
            className={`flex items-center gap-1.5 py-1 px-2 rounded-xl transition-all active:scale-95 ${
              isLiked
                ? 'text-rose-600 bg-rose-50 font-bold'
                : 'hover:text-rose-600 hover:bg-slate-50'
            }`}
          >
            <Heart
              className={`w-4 h-4 transition-transform ${
                isLiked ? 'fill-current scale-110' : ''
              }`}
            />
            <span>{likesCount}</span>
          </button>

          {/* Botão Comentar */}
          <button
            type="button"
            onClick={handleToggleComments}
            className={`flex items-center gap-1.5 py-1 px-2 rounded-xl transition-all hover:bg-slate-50 ${
              showComments ? 'text-[#0B218A] bg-blue-50 font-bold' : 'hover:text-[#0B218A]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{commentsCount}</span>
          </button>

          {/* Botão Compartilhar */}
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 py-1 px-2 rounded-xl hover:text-emerald-600 hover:bg-slate-50 transition-all"
            title="Compartilhar publicação"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-600 font-bold">Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Compartilhar</span>
              </>
            )}
          </button>
        </div>

        {/* Botão Salvar */}
        <button
          type="button"
          onClick={handleSave}
          className={`p-1.5 rounded-xl transition-all active:scale-90 ${
            isSaved
              ? 'text-amber-500 bg-amber-50'
              : 'hover:text-amber-500 hover:bg-slate-50'
          }`}
          title={isSaved ? 'Remover dos salvos' : 'Salvar publicação'}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* 5. Seção Expansível de Comentários */}
      {showComments && (
        <div className="bg-slate-50/80 border-t border-slate-100 p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
          {/* Formulário de Novo Comentário */}
          {currentUser ? (
            <form onSubmit={handleAddComment} className="flex items-center gap-2">
              <Avatar
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                size="sm"
                className="shrink-0"
              />
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Escreva um comentário..."
                maxLength={500}
                className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B218A]"
              />
              <button
                type="submit"
                disabled={!newCommentText.trim() || isSubmittingComment}
                className="p-2 rounded-2xl bg-[#0B218A] text-white disabled:opacity-40 hover:bg-blue-900 transition-colors shrink-0 shadow-xs"
                title="Publicar comentário"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="text-center py-2 bg-white rounded-2xl border border-slate-200 p-3">
              <p className="text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="font-bold text-[#0B218A] hover:underline"
                >
                  Entre na sua conta
                </button>{' '}
                para comentar nesta publicação.
              </p>
            </div>
          )}

          {/* Lista de Comentários */}
          {isLoadingComments ? (
            <div className="text-center py-4 text-xs text-slate-400">
              Carregando comentários...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-3 text-xs text-slate-400">
              Nenhum comentário ainda. Seja o primeiro a participar!
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {comments.map((comm) => {
                const isCommAuthor = currentUser && (currentUser.id === comm.authorUid || currentUser.email === comm.authorUid);
                const canDeleteComm = isCommAuthor || isAuthor || isAdmin;

                return (
                  <div
                    key={comm.id}
                    className="flex items-start justify-between gap-2.5 bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs group"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        onClick={() => navigate(`/perfil/${comm.authorUid}`)}
                        className="cursor-pointer shrink-0 mt-0.5"
                      >
                        <Avatar
                          src={comm.authorAvatarUrl}
                          alt={comm.authorName}
                          size="sm"
                        />
                      </div>
                      <div className="min-w-0 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            onClick={() => navigate(`/perfil/${comm.authorUid}`)}
                            className="font-bold text-slate-900 hover:text-[#0B218A] cursor-pointer"
                          >
                            {comm.authorName}
                          </span>
                          {comm.authorTurma && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              T{comm.authorTurma}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">•</span>
                          <span className="text-[10px] text-slate-400">
                            {formatTimeAgo(comm.createdAtIso)}
                          </span>
                        </div>
                        <p className="text-slate-700 mt-1 break-words">{comm.content}</p>
                      </div>
                    </div>

                    {canDeleteComm && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comm.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 p-1 transition-opacity shrink-0"
                        title="Excluir comentário"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. Lightbox Modal de Imagem Expandida */}
      {activeImageIndex !== null && post.images && post.images[activeImageIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveImageIndex(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <button
            type="button"
            onClick={() => setActiveImageIndex(null)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <img
            src={post.images[activeImageIndex]}
            alt="Imagem expandida"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </article>
  );
};
