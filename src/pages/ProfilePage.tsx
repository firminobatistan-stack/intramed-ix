import React, { useState, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Shield,
  Trophy,
  UserCheck,
  KeyRound,
  LogOut,
  LogIn,
  ChevronRight,
  User,
  ShieldAlert,
  Edit3,
  Camera,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Instagram,
  ArrowLeft,
  Users,
  Clock,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { useCompetitionStore } from '../context/CompetitionStoreContext';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { TURMAS_MEDICINA } from '../data/registrationData';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId?: string }>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    currentUser,
    setCurrentUser,
    canOperateOfficialData,
    publicProfiles,
    getPublicProfileById,
    updateUserProfile,
    changeUserPassword,
    visibleAthletes,
    getTeamById,
    launchConfig,
  } = useCompetitionStore();

  const isAdmin = canOperateOfficialData();

  // Determina se está visualizando o próprio perfil ou o perfil de outro membro
  const isViewingSelf = !userId || (currentUser && (userId === currentUser.id || userId === currentUser.email));

  // Se o lançamento público proibir perfis de outros participantes e o visitante não for admin
  if (!isViewingSelf && !launchConfig.publicProfilesVisible && !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 sm:p-12">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Clock className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 text-xs font-black tracking-wider uppercase mb-3">
            <Lock className="w-3.5 h-3.5" />
            Divulgação Inicial • INTRAMED IX
          </span>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
            ACESSO EM BREVE
          </h1>

          <p className="text-slate-600 text-sm sm:text-base max-w-lg mx-auto leading-relaxed mb-8">
            Estamos preparando a área de participantes do IntraMed. Em breve, você poderá criar sua conta e acompanhar sua participação no evento diretamente pela plataforma. Enquanto isso, continue acompanhando as informações e o chaveamento por aqui.
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

  // Se o usuário não está autenticado e tenta acessar /perfil durante o modo de divulgação pública
  if (isViewingSelf && !currentUser && !launchConfig.publicLoginEnabled && !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 sm:p-12">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Clock className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 text-xs font-black tracking-wider uppercase mb-3">
            <Lock className="w-3.5 h-3.5" />
            Área de Participantes
          </span>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
            ACESSO EM BREVE
          </h1>

          <p className="text-slate-600 text-sm sm:text-base max-w-lg mx-auto leading-relaxed mb-8">
            Estamos preparando a área de participantes do IntraMed. Em breve, você poderá criar sua conta e acompanhar sua participação no evento diretamente pela plataforma. Enquanto isso, continue acompanhando as informações e o chaveamento por aqui.
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

  const targetProfile = useMemo(() => {
    if (userId) {
      const found = getPublicProfileById(userId);
      if (found) return found;
      // Fallback para atleta
      const ath = visibleAthletes.find((a) => a.id === userId || a.registrationId === userId);
      if (ath) {
        return {
          id: ath.id,
          userId: ath.id,
          displayName: ath.name,
          avatarUrl: ath.avatarUrl || null,
          turma: ath.turma || null,
          turmaLabel: ath.turmaLabel || null,
          teamId: ath.teamId || null,
          bio: ath.bio || null,
          instagramHandle: ath.instagramHandle || null,
          isAthlete: true,
          linkedAthleteId: ath.id,
          favoriteModalityIds: ath.modalityIds || [],
          createdAtIso: new Date().toISOString(),
        };
      }
    }
    if (currentUser) {
      const myPublic = getPublicProfileById(currentUser.id);
      return (
        myPublic || {
          id: currentUser.id,
          userId: currentUser.id,
          displayName: currentUser.name,
          avatarUrl: currentUser.avatarUrl || null,
          turma: null,
          turmaLabel: null,
          teamId: currentUser.teamId || null,
          teamName: currentUser.teamName || null,
          bio: null,
          instagramHandle: null,
          isAthlete: currentUser.role === 'atleta' || Boolean(currentUser.linkedAthleteId),
          linkedAthleteId: currentUser.linkedAthleteId || null,
          favoriteModalityIds: currentUser.modalityIds || [],
          createdAtIso: new Date().toISOString(),
        }
      );
    }
    return null;
  }, [userId, currentUser, getPublicProfileById, visibleAthletes]);

  // Modais
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  // Estados do formulário de senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Estados do formulário de edição de perfil
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editTurma, setEditTurma] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  const openEditModal = () => {
    if (!targetProfile) return;
    setEditDisplayName(targetProfile.displayName || currentUser?.name || '');
    setEditBio(targetProfile.bio || '');
    setEditInstagram(targetProfile.instagramHandle || '');
    setEditTurma(targetProfile.turma || '');
    setEditAvatarUrl(targetProfile.avatarUrl || null);
    setProfileFeedback(null);
    setIsEditProfileModalOpen(true);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileFeedback({ type: 'error', msg: 'Selecione um arquivo de imagem válido (PNG ou JPG).' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setProfileFeedback({ type: 'error', msg: 'A imagem deve possuir tamanho menor que 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);

    if (!editDisplayName.trim()) {
      setProfileFeedback({ type: 'error', msg: 'O nome de exibição não pode ficar vazio.' });
      return;
    }

    setIsSubmittingProfile(true);
    const selectedTurmaObj = TURMAS_MEDICINA.find((t) => t.turma === editTurma);

    const result = await updateUserProfile({
      displayName: editDisplayName.trim(),
      bio: editBio.trim() || null,
      instagramHandle: editInstagram.trim().replace(/^@/, '') || null,
      turma: editTurma || null,
      turmaLabel: selectedTurmaObj ? selectedTurmaObj.fullName : null,
      teamId: selectedTurmaObj ? selectedTurmaObj.teamId : targetProfile?.teamId || null,
      avatarUrl: editAvatarUrl,
    });

    setIsSubmittingProfile(false);
    if (result.ok) {
      setProfileFeedback({ type: 'success', msg: 'Perfil atualizado com sucesso no servidor!' });
      setTimeout(() => {
        setIsEditProfileModalOpen(false);
      }, 1000);
    } else {
      setProfileFeedback({ type: 'error', msg: result.error || 'Erro ao salvar alterações.' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPassword.length < 6) {
      setPasswordFeedback({ type: 'error', msg: 'A nova senha deve possuir pelo menos 6 caracteres.' });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordFeedback({ type: 'error', msg: 'A confirmação não confere com a nova senha digitada.' });
      return;
    }

    setIsSubmittingPassword(true);
    const result = await changeUserPassword(currentPassword, newPassword);
    setIsSubmittingPassword(false);

    if (result.ok) {
      setPasswordFeedback({ type: 'success', msg: 'Senha alterada com sucesso! Utilize-a em seus próximos logins.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
      }, 1500);
    } else {
      setPasswordFeedback({ type: 'error', msg: result.error || 'Falha ao redefinir senha.' });
    }
  };

  const roleLabel =
    currentUser?.role === 'administrador' || currentUser?.role === 'organizacao'
      ? 'Administrador / Comissão'
      : currentUser?.role === 'atleta'
      ? 'Atleta Oficial Vinculado'
      : currentUser?.role === 'moderador_master'
      ? 'Moderador Master'
      : currentUser?.role === 'mesario'
      ? 'Mesário Autorizado'
      : 'Participante da Comunidade';

  const linkedTeam = targetProfile?.teamId ? getTeamById(targetProfile.teamId) : null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Botão de Retorno quando visualizando perfil de outro membro */}
      {!isViewingSelf && (
        <button
          type="button"
          onClick={() => navigate('/comunidade')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#0B218A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Diretório da Comunidade</span>
        </button>
      )}

      {/* Cabeçalho da página */}
      <div className="pb-2 border-b border-brand-surface-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-4 rounded-full bg-brand-yellow" aria-hidden="true" />
          <h2 className="text-lg sm:text-xl font-display font-bold text-brand-text-primary">
            {isViewingSelf ? 'Meu Perfil' : 'Perfil do Participante'}
          </h2>
        </div>

        <StatusBadge
          status={targetProfile?.isAthlete ? 'official' : 'pending'}
          label={targetProfile?.isAthlete ? 'Atleta Oficial' : 'Comunidade IntraMed'}
        />
      </div>

      {/* Card Principal: Foto, Nome e Ações */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B218A] via-[#102a9e] to-[#1E3A8A] text-white p-6 sm:p-8 shadow-elevated border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <img
          src="/assets/atletica/face-monocor.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute -right-6 -bottom-8 w-44 h-44 object-contain opacity-[0.07]"
        />

        <div className="relative z-10 flex items-center gap-4">
          <div className="relative">
            <Avatar src={targetProfile?.avatarUrl} alt={targetProfile?.displayName} size="xl" className="border-2 border-white shadow-md" />
            {isViewingSelf && (
              <button
                type="button"
                onClick={openEditModal}
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-brand-yellow text-slate-900 shadow-lg hover:scale-110 transition-transform"
                title="Alterar foto de perfil"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-display font-extrabold text-white">
              {targetProfile ? targetProfile.displayName : 'Participante Não Encontrado'}
            </h3>
            <p className="text-xs text-white/80">
              {targetProfile?.turmaLabel || (targetProfile?.turma ? `Turma ${targetProfile.turma}` : 'Medicina UEMA')}
            </p>
            {targetProfile?.instagramHandle && (
              <a
                href={`https://instagram.com/${targetProfile.instagramHandle}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-brand-yellow hover:underline"
              >
                <Instagram className="w-3 h-3" />
                <span>@{targetProfile.instagramHandle}</span>
              </a>
            )}
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2 self-start sm:self-center">
          {isViewingSelf && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
              onClick={openEditModal}
              className="border-white/30 text-white hover:bg-white/15"
            >
              Editar Perfil
            </Button>
          )}

          {targetProfile?.linkedAthleteId && (
            <Button
              variant="accent"
              size="sm"
              leftIcon={<Trophy className="w-4 h-4" />}
              onClick={() => navigate(`/atleta/${targetProfile.linkedAthleteId}`)}
            >
              Ficha Esportiva
            </Button>
          )}

          {!currentUser && (
            <Button
              variant="accent"
              size="md"
              leftIcon={<LogIn className="w-4 h-4" />}
              onClick={() => navigate('/login')}
            >
              Entrar na Conta
            </Button>
          )}
        </div>
      </div>

      {/* Biografia do Participante */}
      {targetProfile?.bio && (
        <div className="bg-white rounded-2xl border border-brand-surface-border p-5 shadow-card space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Sobre o Participante
          </span>
          <p className="text-sm text-slate-700 leading-relaxed italic bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            "{targetProfile.bio}"
          </p>
        </div>
      )}

      {/* Grid de Informações Esportivas: Equipe + Modalidades */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          onClick={() => targetProfile?.teamId && navigate(`/equipe/${targetProfile.teamId}`)}
          className={`rounded-2xl bg-white border border-brand-surface-border p-5 shadow-card space-y-3 ${
            targetProfile?.teamId ? 'cursor-pointer hover:border-brand-blue' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">
              Equipe Vinculada
            </span>
            <Shield className="w-4 h-4 text-brand-blue" />
          </div>
          <div className="p-3.5 rounded-xl bg-brand-surface-muted/70 border border-dashed border-brand-surface-border">
            <p className="text-sm font-semibold text-slate-800">
              {linkedTeam?.name || targetProfile?.teamName || 'Nenhuma equipe vinculada.'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-brand-surface-border p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">
              Condição Esportiva
            </span>
            <Trophy className="w-4 h-4 text-brand-blue" />
          </div>
          <div className="p-3.5 rounded-xl bg-brand-surface-muted/70 border border-dashed border-brand-surface-border">
            <p className="text-sm font-semibold text-slate-800">
              {targetProfile?.isAthlete
                ? 'Atleta Oficial do INTRAMED IX'
                : 'Membro da Comunidade / Torcida'}
            </p>
          </div>
        </div>
      </div>

      {/* Ações Rápidas e Segurança (Apenas para o próprio usuário) */}
      {isViewingSelf && currentUser && (
        <div className="rounded-2xl bg-white border border-brand-surface-border overflow-hidden shadow-card divide-y divide-brand-surface-border">
          <button
            type="button"
            onClick={() => {
              setPasswordFeedback(null);
              setIsPasswordModalOpen(true);
            }}
            className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-brand-surface-muted/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-blue-light/70 text-brand-blue flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-brand-text-primary">
                  Alteração de Senha
                </span>
                <span className="block text-xs text-brand-text-secondary">
                  Atualizar credencial de acesso com segurança criptográfica
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-brand-text-muted" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/comunidade')}
            className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-brand-surface-muted/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-brand-text-primary">
                  Diretório da Comunidade
                </span>
                <span className="block text-xs text-brand-text-secondary">
                  Encontrar e navegar pelos perfis dos demais participantes
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-brand-text-muted" />
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-brand-surface-muted/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0B218A] flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-sm font-semibold text-brand-text-primary">
                    Painel Administrativo da Atlética
                  </span>
                  <span className="block text-xs text-brand-text-secondary">
                    Gestão de súmulas, arbitragem e inscrições
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-brand-text-muted" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setCurrentUser(null)}
            className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-rose-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <LogOut className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-rose-700">
                  Sair da Conta
                </span>
                <span className="block text-xs text-slate-500">
                  Encerrar sessão com segurança neste dispositivo
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-brand-text-muted" />
          </button>
        </div>
      )}

      {/* Modal de Alteração Real de Senha */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Alteração de Senha"
        description="A nova senha será salva de forma criptografada no banco de dados."
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordFeedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                passwordFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {passwordFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{passwordFeedback.msg}</span>
            </div>
          )}

          <Input
            label="Senha Atual"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Digite a senha atual"
            required
          />

          <Input
            label="Nova Senha Pessoal"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
          />

          <Input
            label="Confirmar Nova Senha"
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            placeholder="Repita a nova senha"
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsPasswordModalOpen(false)}
              disabled={isSubmittingPassword}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingPassword}
            >
              {isSubmittingPassword ? 'Salvando...' : 'Salvar Nova Senha'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Edição de Perfil Social */}
      <Modal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        title="Editar Meu Perfil"
        description="Atualize suas informações visíveis para a comunidade do INTRAMED IX."
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {profileFeedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                profileFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {profileFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{profileFeedback.msg}</span>
            </div>
          )}

          <div className="flex items-center gap-4">
            <Avatar src={editAvatarUrl} alt={editDisplayName} size="lg" />
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Camera className="w-3.5 h-3.5" />}
                onClick={() => fileInputRef.current?.click()}
              >
                Trocar Foto
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
              <p className="text-[11px] text-slate-400 mt-1">PNG ou JPG até 2MB</p>
            </div>
          </div>

          <Input
            label="Nome de Exibição"
            type="text"
            value={editDisplayName}
            onChange={(e) => setEditDisplayName(e.target.value)}
            placeholder="Como deseja ser chamado"
            required
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Turma de Medicina
            </label>
            <select
              value={editTurma}
              onChange={(e) => setEditTurma(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0B218A]/20 focus:border-[#0B218A]"
            >
              <option value="">Selecione sua turma</option>
              {TURMAS_MEDICINA.map((t) => (
                <option key={t.turma} value={t.turma}>
                  {t.fullName}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Instagram (@)"
            type="text"
            value={editInstagram}
            onChange={(e) => setEditInstagram(e.target.value)}
            placeholder="seu.instagram"
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mini Biografia / Frase de Torcida
            </label>
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Conte um pouco sobre sua trajetória ou deixe seu recado para o campeonato..."
              rows={3}
              maxLength={250}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B218A]/20 focus:border-[#0B218A]"
            />
            <p className="text-[11px] text-slate-400 text-right mt-0.5">
              {editBio.length}/250 caracteres
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditProfileModalOpen(false)}
              disabled={isSubmittingProfile}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingProfile}
            >
              {isSubmittingProfile ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
