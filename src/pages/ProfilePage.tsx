import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useCompetitionStore } from '../context/CompetitionStoreContext';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';

/**
 * 12. PERFIL E PERMISSÕES DE ACESSO (/perfil)
 * - Exibe os dados reais do usuário autenticado (`currentUser`);
 * - Permite alternar facilmente entre:
 *   • Visitante / Público (consulta pública de atletas, equipes e placar);
 *   • Atleta Vinculado (permite editar a própria foto e abrir diretamente seu perfil `/atleta/:id`);
 *   • Comissão / Administrador (acesso total a cadastros, súmulas e perfis).
 */
export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentUser,
    setCurrentUser,
    canOperateOfficialData,
  } = useCompetitionStore();
  const isAdmin = canOperateOfficialData();

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const roleLabel =
    currentUser?.role === 'administrador' || currentUser?.role === 'organizacao'
      ? 'Administrador / Comissão'
      : currentUser?.role === 'atleta'
      ? 'Atleta Oficial Vinculado'
      : currentUser?.role === 'moderador'
      ? 'Representante de Período'
      : 'Visitante / Torcida';

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Cabeçalho da página */}
      <div className="pb-2 border-b border-brand-surface-border flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-brand-yellow" aria-hidden="true" />
            <h2 className="text-lg sm:text-xl font-display font-bold text-brand-text-primary">
              Perfil &amp; Permissões de Acesso
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-brand-text-secondary mt-1">
            Identificação, vínculo com perfil de atleta e controle de sessão.
          </p>
        </div>

        <StatusBadge
          status={currentUser ? 'official' : 'pending'}
          label={currentUser ? roleLabel : 'Visitante Público'}
        />
      </div>

      {/* Card Principal: Foto e Nome no estilo All Sports */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-blue-dark via-brand-blue to-brand-blue-medium text-white p-6 sm:p-8 shadow-elevated border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <img
          src="/assets/atletica/mascote-monocor.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute -right-6 -bottom-8 w-44 h-44 object-contain opacity-[0.07]"
        />
        <div className="relative z-10 flex items-center gap-4">
          <Avatar src={currentUser?.avatarUrl} size="xl" />
          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-display font-bold uppercase tracking-wider text-brand-yellow">
              Identificação Oficial • INTRAMED IX
            </span>
            <h3 className="text-lg sm:text-xl font-display font-extrabold text-white">
              {currentUser ? currentUser.name : 'Visitante (Acesso Público)'}
            </h3>
            <p className="text-xs text-white/80">
              {currentUser
                ? currentUser.email
                : 'Você pode consultar todos os atletas, equipes, placares e rankings publicamente.'}
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2 self-start sm:self-center">
          {currentUser?.linkedAthleteId && (
            <Button
              variant="accent"
              size="sm"
              leftIcon={<User className="w-4 h-4" />}
              onClick={() => navigate(`/atleta/${currentUser.linkedAthleteId}`)}
            >
              Ver Meu Perfil de Atleta
            </Button>
          )}
          {!currentUser && (
            <Button
              variant="accent"
              size="md"
              leftIcon={<LogIn className="w-4 h-4" />}
              onClick={() => navigate('/login')}
            >
              Tela de Login
            </Button>
          )}
        </div>
      </div>

      {/* Permissões de Acesso por Papel */}
      <div className="all-sports-card p-5 sm:p-6 space-y-4">
        <div className="all-sports-section-pill">
          Nível de Permissão &amp; Segurança da Sessão
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          No INTRAMED IX, o <strong>público e os atletas</strong> têm acesso de consulta a todas as partidas, chaves, equipes e estatísticas. Apenas <strong>Administradores / Mesários autenticados</strong> podem operar o cronômetro, lançar gols/pontos ao vivo ou alterar cadastros oficiais.
        </p>

        <div className="flex flex-wrap items-center gap-2.5">
          {!currentUser ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<LogIn className="w-4 h-4" />}
              onClick={() => navigate('/login')}
            >
              Entrar como Atleta ou Mesário / Admin
            </Button>
          ) : (
            <>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B218A] text-white text-xs font-display font-bold shadow-sm hover:bg-blue-900 transition-colors"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-brand-yellow" />
                  <span>Abrir Central de Súmulas &amp; Cadastros</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setCurrentUser(null)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-display font-bold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Encerrar Sessão Atual</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Grid de Informações Esportivas: Equipe + Modalidades */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          onClick={() =>
            currentUser?.teamId && navigate(`/equipe/${currentUser.teamId}`)
          }
          className={`rounded-2xl bg-white border border-brand-surface-border p-5 shadow-card space-y-3 ${
            currentUser?.teamId ? 'cursor-pointer hover:border-brand-blue' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">
              Equipe Vinculada
            </span>
            <Shield className="w-4 h-4 text-brand-blue" />
          </div>
          <div className="p-3.5 rounded-xl bg-brand-surface-muted/70 border border-dashed border-brand-surface-border">
            <p className="text-sm font-medium text-brand-text-secondary">
              {currentUser?.teamName || 'Nenhuma equipe vinculada.'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-brand-surface-border p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">
              Modalidades Inscritas
            </span>
            <Trophy className="w-4 h-4 text-brand-blue" />
          </div>
          <div className="p-3.5 rounded-xl bg-brand-surface-muted/70 border border-dashed border-brand-surface-border">
            <p className="text-sm font-medium text-brand-text-secondary">
              {currentUser && currentUser.modalityIds.length > 0
                ? `${currentUser.modalityIds.length} modalidade(s) ativa(s)`
                : 'Nenhuma modalidade vinculada.'}
            </p>
          </div>
        </div>
      </div>

      {/* Dados Pessoais Permitidos */}
      <div className="rounded-2xl bg-white border border-brand-surface-border p-5 sm:p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-brand-surface-border">
          <UserCheck className="w-4 h-4 text-brand-blue" />
          <h4 className="text-sm font-display font-bold text-brand-text-primary">
            Dados Pessoais Permitidos
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-brand-surface-muted/60 border border-brand-surface-border">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted">
              Nome Completo
            </span>
            <span className="mt-1 block text-sm font-medium text-brand-text-secondary">
              {currentUser?.name || 'Não informado'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-brand-surface-muted/60 border border-brand-surface-border">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted">
              E-mail Institucional
            </span>
            <span className="mt-1 block text-sm font-medium text-brand-text-secondary truncate">
              {currentUser?.email || 'Não informado'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-brand-surface-muted/60 border border-brand-surface-border">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted">
              Perfil de Acesso
            </span>
            <span className="mt-1 block text-sm font-medium text-brand-text-secondary">
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Configurações de Segurança e Sessão */}
      <div className="rounded-2xl bg-white border border-brand-surface-border overflow-hidden shadow-card divide-y divide-brand-surface-border">
        <button
          type="button"
          onClick={() => setIsPasswordModalOpen(true)}
          className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-brand-surface-muted/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-blue-light/70 text-brand-blue flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-sm font-semibold text-brand-text-primary">
                Alteração de senha
              </span>
              <span className="block text-xs text-brand-text-secondary">
                Atualizar credencial de acesso à conta
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-brand-text-muted" />
        </button>

        <button
          type="button"
          disabled={!currentUser}
          onClick={() => setCurrentUser(null)}
          className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-brand-surface-muted/60 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-surface-muted text-brand-text-secondary flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-sm font-semibold text-brand-text-primary">
                Sair da conta
              </span>
              <span className="block text-xs text-brand-text-secondary">
                Encerrar sessão atual no dispositivo
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-brand-text-muted" />
        </button>
      </div>

      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Alteração de Senha"
        description="Disponível para usuários autenticados na plataforma."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setIsPasswordModalOpen(false);
          }}
          className="space-y-4"
        >
          <Input
            label="Senha atual"
            type="password"
            placeholder="Digite sua senha atual"
            disabled={!currentUser}
          />
          <Input
            label="Nova senha"
            type="password"
            placeholder="Digite a nova senha"
            disabled={!currentUser}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsPasswordModalOpen(false)}
            >
              Fechar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!currentUser}
            >
              Salvar nova senha
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
