import React, { useState, useRef } from 'react';
import {
  X,
  Image as ImageIcon,
  Sparkles,
  Trophy,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { useCompetitionStore } from '../../context/CompetitionStoreContext';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { SocialPost, ModalitySlug } from '../../types/domain';
import { OFFICIAL_MODALITIES } from '../../data/officialData';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: (newPost: SocialPost) => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
}) => {
  const { currentUser, createPost, visibleTeams } = useCompetitionStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [selectedTeamTag, setSelectedTeamTag] = useState<string>('');
  const [selectedModalityTag, setSelectedModalityTag] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 4) {
      setErrorMsg('Você pode anexar no máximo 4 fotos por publicação.');
      return;
    }

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Selecione arquivos de imagem válidos (JPG, PNG ou WebP).');
        return;
      }
      if (file.size > 3.5 * 1024 * 1024) {
        setErrorMsg('Cada imagem deve possuir tamanho inferior a 3.5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImages((prev) => (prev.length < 4 ? [...prev, reader.result as string] : prev));
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanContent = content.trim();
    if (!cleanContent && images.length === 0) {
      setErrorMsg('Escreva um texto ou anexe pelo menos uma imagem para publicar.');
      return;
    }

    setIsSubmitting(true);
    const res = await createPost(cleanContent, images, {
      teamTag: selectedTeamTag || undefined,
      modalityTag: (selectedModalityTag as ModalitySlug) || undefined,
    });
    setIsSubmitting(false);

    if (res.ok && res.post) {
      setContent('');
      setImages([]);
      setSelectedTeamTag('');
      setSelectedModalityTag('');
      if (onPostCreated) onPostCreated(res.post);
      onClose();
    } else {
      setErrorMsg(res.error || 'Erro ao publicar. Tente novamente.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Cabeçalho do Modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-yellow" />
            <h2 className="text-base font-display font-bold text-slate-900">
              Criar Publicação • Feed IntraMed
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Identificação do Autor */}
          <div className="flex items-center gap-3">
            <Avatar
              src={currentUser?.avatarUrl}
              alt={currentUser?.name}
              size="md"
              className="border border-slate-200"
            />
            <div>
              <p className="text-sm font-display font-bold text-slate-900">
                {currentUser?.name || 'Participante'}
              </p>
              <p className="text-xs text-slate-500">
                Publicando para toda a comunidade do IntraMed IX
              </p>
            </div>
          </div>

          {/* Mensagem de Erro */}
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Campo de Texto */}
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="O que está acontecendo no campeonato? Compartilhe momentos, treinos, torcida e expectativas..."
              rows={4}
              maxLength={2000}
              className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B218A] focus:bg-white transition-all resize-none"
            />
            <span className="absolute bottom-2.5 right-3 text-[10px] font-semibold text-slate-400">
              {content.length}/2000
            </span>
          </div>

          {/* Grade de Imagens Anexadas */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {images.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="relative aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 group"
                >
                  <img
                    src={imgUrl}
                    alt={`Preview ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
                    title="Remover foto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tags Opcionais (Equipe ou Modalidade) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Vincular Atlética:
              </label>
              <select
                value={selectedTeamTag}
                onChange={(e) => setSelectedTeamTag(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#0B218A]"
              >
                <option value="">Nenhuma / Geral</option>
                {visibleTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Vincular Modalidade:
              </label>
              <select
                value={selectedModalityTag}
                onChange={(e) => setSelectedModalityTag(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#0B218A]"
              >
                <option value="">Nenhuma / Geral</option>
                {OFFICIAL_MODALITIES.map((mod) => (
                  <option key={mod.id} value={mod.id}>
                    {mod.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
          />

          {/* Barra de Ferramentas Inferior */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= 4}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-emerald-600" />
              <span>Fotos ({images.length}/4)</span>
            </button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                disabled={!content.trim() && images.length === 0}
              >
                Publicar
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
