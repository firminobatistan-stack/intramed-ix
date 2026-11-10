import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Users, UserPlus, UserCheck, Search } from 'lucide-react';
import { PublicUserProfile } from '../../types/domain';
import { useCompetitionStore } from '../../context/CompetitionStoreContext';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUid: string;
  targetName: string;
  initialMode?: 'followers' | 'following';
}

export const FollowersModal: React.FC<FollowersModalProps> = ({
  isOpen,
  onClose,
  targetUid,
  targetName,
  initialMode = 'followers',
}) => {
  const navigate = useNavigate();
  const { currentUser, fetchNetworkList, toggleFollowUser } = useCompetitionStore();

  const [mode, setMode] = useState<'followers' | 'following'>(initialMode);
  const [profiles, setProfiles] = useState<PublicUserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [followActionLoadingId, setFollowActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (!isOpen || !targetUid) return;

    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      const list = await fetchNetworkList(targetUid, mode);
      if (isMounted) {
        setProfiles(list);
        setIsLoading(false);
      }
    };
    load();

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetUid, mode, fetchNetworkList]);

  if (!isOpen) return null;

  const handleToggleFollow = async (profile: PublicUserProfile) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setFollowActionLoadingId(profile.id);
    const res = await toggleFollowUser(profile.userId || profile.id);
    setFollowActionLoadingId(null);

    if (res.ok) {
      setProfiles((prev) =>
        prev.map((p) =>
          (p.userId || p.id) === (profile.userId || profile.id)
            ? { ...p, isFollowing: res.isFollowing }
            : p
        )
      );
    }
  };

  const filtered = profiles.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.displayName || '').toLowerCase().includes(q) ||
      (p.turmaLabel || '').toLowerCase().includes(q) ||
      (p.teamName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-base font-display font-bold text-slate-900">
              Rede de {targetName}
            </h2>
            <p className="text-xs text-slate-500">Conexões no IntraMed IX</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas: Seguidores / Seguindo */}
        <div className="grid grid-cols-2 border-b border-slate-100 text-xs font-bold text-center">
          <button
            type="button"
            onClick={() => setMode('followers')}
            className={`py-3 transition-colors border-b-2 ${
              mode === 'followers'
                ? 'border-[#0B218A] text-[#0B218A] bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Seguidores
          </button>
          <button
            type="button"
            onClick={() => setMode('following')}
            className={`py-3 transition-colors border-b-2 ${
              mode === 'following'
                ? 'border-[#0B218A] text-[#0B218A] bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Seguindo
          </button>
        </div>

        {/* Campo de Busca Rápida */}
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar participante por nome ou turma..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B218A]"
            />
          </div>
        </div>

        {/* Lista de Membros */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Carregando conexões...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              {searchQuery ? 'Nenhum membro encontrado com este termo.' : 'Nenhum participante nesta lista ainda.'}
            </div>
          ) : (
            filtered.map((prof) => {
              const profId = prof.userId || prof.id;
              const isSelf = currentUser && (currentUser.id === profId || currentUser.email === profId);

              return (
                <div
                  key={profId}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-100 transition-colors"
                >
                  <div
                    onClick={() => {
                      onClose();
                      navigate(`/perfil/${profId}`);
                    }}
                    className="flex items-center gap-3 cursor-pointer min-w-0"
                  >
                    <Avatar
                      src={prof.avatarUrl}
                      alt={prof.displayName}
                      size="sm"
                    />
                    <div className="min-w-0 text-xs">
                      <p className="font-bold text-slate-900 truncate hover:text-[#0B218A]">
                        {prof.displayName}
                      </p>
                      <p className="text-slate-500 text-[11px] truncate">
                        {prof.turmaLabel || (prof.turma ? `Turma ${prof.turma}` : 'Medicina UEMA')}
                      </p>
                    </div>
                  </div>

                  {!isSelf && currentUser && (
                    <Button
                      variant={prof.isFollowing ? 'secondary' : 'primary'}
                      size="sm"
                      isLoading={followActionLoadingId === profId}
                      onClick={() => handleToggleFollow(prof)}
                      className="shrink-0 text-xs py-1 px-2.5 h-auto"
                    >
                      {prof.isFollowing ? 'Seguindo' : 'Seguir'}
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
