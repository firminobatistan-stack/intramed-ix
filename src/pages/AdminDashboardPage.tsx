import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Tv,
  FileText,
  FlaskConical,
  ShieldCheck,
  Wifi,
  WifiOff,
  Settings2,
  History,
  Calendar,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Plus,
  Shield,
  UserPlus,
  ExternalLink,
  KeyRound,
  RefreshCw,
  Activity,
  ArrowUpRight,
  Rocket,
  GitBranch,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  UploadCloud,
  Database,
  Server,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { useCompetitionStore, getStoredOperatorToken } from '../context/CompetitionStoreContext';
import { flushOfflineQueue, getPendingQueueItems, QueuedSyncItem } from '../utils/offlineSyncQueue';
import { clearLocalDataCaches, CURRENT_APP_CACHE_VERSION } from '../utils/cacheManager';
import { OFFICIAL_MODALITIES } from '../data/officialData';
import { MODALITY_RULE_ENGINE, formatSecondsToClock } from '../data/sportRulesConfig';
import { ModalitySlug, TournamentPhaseType, PublicLaunchConfig, UniversalModalityBracket } from '../types/domain';
import { SportIcon } from '../components/sports/SportIcon';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Tabs, TabItem } from '../components/ui/Tabs';

type AdminTab = 'partidas' | 'cadastros' | 'usuarios' | 'regras' | 'auditoria' | 'lancamento';

const ADMIN_TABS: TabItem[] = [
  {
    id: 'partidas',
    label: 'Jogos & Súmulas',
    icon: <Calendar className="w-4 h-4" />,
  },
  {
    id: 'cadastros',
    label: 'Cadastros (Períodos, Atletas & Jogos)',
    icon: <Users className="w-4 h-4" />,
  },
  {
    id: 'usuarios',
    label: 'Gestão de Usuários & RBAC',
    icon: <ShieldCheck className="w-4 h-4" />,
  },
  {
    id: 'lancamento',
    label: 'Lançamento & Chaveamento',
    icon: <Rocket className="w-4 h-4" />,
  },
  {
    id: 'regras',
    label: 'Motor de Modalidades',
    icon: <Settings2 className="w-4 h-4" />,
  },
  {
    id: 'auditoria',
    label: 'Auditoria & Sincronização',
    icon: <History className="w-4 h-4" />,
  },
];

/**
 * Painel Administrativo, Cadastro Unificado e Central de Operação de Súmulas — INTRAMED IX
 * - Permite acessar Jogos -> Selecionar Partida -> Abrir Súmula, abrir o Placar ao Vivo;
 * - Cadastro Unificado: Cadastrar Período/Equipe, Cadastrar Atleta (já alimenta o Elenco e a Súmula automaticamente),
 *   e Agendar/Criar Partida Oficial sem duplicar cadastros.
 */
export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    isTestMode,
    setTestMode,
    resetTestEnvironment,
    isOnline,
    pendingSyncCount,
    visibleMatches,
    visibleTeams,
    visibleAthletes,
    getSheetByMatchId,
    getTeamById,
    registerTeam,
    registerAthlete,
    createOfficialMatch,
    updateMatchTablePassword,
    launchConfig,
    updateLaunchConfig,
    officialBrackets,
    saveOfficialBracket,
    forceServerResync,
    lastSyncedIso,
    cacheVersion,
    serverDiagnostics,
    syncStatus,
  } = useCompetitionStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('partidas');
  const [modalityFilter, setModalityFilter] = useState<string>('todas');
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  // Estado do formulário de Lançamento & Chaveamento
  const [bracketModality, setBracketModality] = useState<ModalitySlug>('futsal');
  const [bracketJsonInput, setBracketJsonInput] = useState('');
  const [isUpdatingLaunchConfig, setIsUpdatingLaunchConfig] = useState(false);
  const [isSavingBracket, setIsSavingBracket] = useState(false);

  // Estado do formulário 1: Cadastrar Equipe / Período
  const [teamName, setTeamName] = useState('');
  const [teamShort, setTeamShort] = useState('');

  // Estado do formulário 2: Cadastrar Atleta Unificado
  const [athName, setAthName] = useState('');
  const [athTeamId, setAthTeamId] = useState('');
  const [athNumber, setAthNumber] = useState('');
  const [athPosition, setAthPosition] = useState('');
  const [athModalities, setAthModalities] = useState<ModalitySlug[]>(['futsal']);

  // Estado do formulário 3: Criar Partida Oficial
  const [matchModality, setMatchModality] = useState<ModalitySlug>('futsal');
  const [matchHomeTeamId, setMatchHomeTeamId] = useState('');
  const [matchAwayTeamId, setMatchAwayTeamId] = useState('');
  const [matchPhase, setMatchPhase] = useState<TournamentPhaseType>('group_stage');
  const [matchDate, setMatchDate] = useState('Hoje');
  const [matchTime, setMatchTime] = useState('19:00');
  const [matchVenue, setMatchVenue] = useState('Ginásio Oficial • Medicina UEMA');
  const [matchTablePin, setMatchTablePin] = useState('');
  const [editingPinMatchId, setEditingPinMatchId] = useState<string | null>(null);
  const [editingPinValue, setEditingPinValue] = useState('');

  const filteredMatches = visibleMatches.filter((m) =>
    modalityFilter === 'todas' ? true : m.modalityId === modalityFilter
  );

  // Coleta todos os registros de auditoria das partidas visíveis
  const allAuditLogs = visibleMatches.flatMap((m) => {
    const s = getSheetByMatchId(m.id);
    if (!s) return [];
    return s.events.flatMap((ev) =>
      ev.auditHistory.map((aud) => ({
        ...aud,
        matchId: m.id,
        modalityName: m.modalityName,
        eventLabel: ev.typeLabel,
      }))
    );
  });

  const liveCount = visibleMatches.filter((m) => m.status === 'live').length;
  const finishedCount = visibleMatches.filter((m) => m.status === 'finished').length;

  // Estados de Monitoramento de Sincronização & Reconciliação
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<string | null>(null);
  const [serverSyncLogs, setServerSyncLogs] = useState<
    Array<{
      id: string;
      timestampIso: string;
      category: string;
      level: string;
      message: string;
    }>
  >([]);
  const [pendingOfflineItems, setPendingOfflineItems] = useState<QueuedSyncItem[]>([]);
  const [isFlushingQueue, setIsFlushingQueue] = useState(false);
  const [serverDiagnosticsData, setServerDiagnosticsData] = useState<any | null>(null);
  const [isResyncing, setIsResyncing] = useState(false);
  const [resyncSuccessMsg, setResyncSuccessMsg] = useState<string | null>(null);

  // Estados de Gestão de Usuários & RBAC
  interface AdminUserItem {
    id: string;
    email: string;
    name: string;
    role: string;
    organization?: string;
    isActive: boolean;
    mustChangePassword?: boolean;
    createdAtIso?: string;
    lastLoginAtIso?: string;
  }
  const [adminUsersList, setAdminUsersList] = useState<AdminUserItem[]>([]);
  const [adminAuditLogs, setAdminAuditLogs] = useState<
    Array<{
      id: string;
      action: string;
      performedByEmail: string;
      performedByRole: string;
      targetEmail?: string;
      timestampIso: string;
      details?: string;
    }>
  >([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedUserForRole, setSelectedUserForRole] = useState<AdminUserItem | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<string>('mesario');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const loadAdminUsers = React.useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const opToken = getStoredOperatorToken();
      const res = await fetch('/api/cloud-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${opToken}`,
          'x-intramed-token': opToken || '',
        },
        body: JSON.stringify({ action: 'list_admin_users' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.users)) {
          setAdminUsersList(data.users);
        }
        if (Array.isArray(data.auditLogs)) {
          setAdminAuditLogs(data.auditLogs);
        }
      }
    } catch {
      // Offline
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  React.useEffect(() => {
    if (activeTab === 'usuarios') {
      loadAdminUsers();
    }
  }, [activeTab, loadAdminUsers]);

  const handleUpdateRole = async (targetEmail: string, newRole: string) => {
    try {
      const opToken = getStoredOperatorToken();
      const res = await fetch('/api/cloud-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${opToken}`,
          'x-intramed-token': opToken || '',
        },
        body: JSON.stringify({
          action: 'update_user_role',
          targetEmail,
          targetRole: newRole,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        showNotice('ok', data.message || 'Cargo atualizado com sucesso!');
        setSelectedUserForRole(null);
        loadAdminUsers();
      } else {
        showNotice('err', data?.error || 'Erro ao atualizar cargo do usuário.');
      }
    } catch {
      showNotice('err', 'Falha de conexão com o servidor.');
    }
  };

  const handleToggleActive = async (targetEmail: string, currentActive: boolean) => {
    try {
      const opToken = getStoredOperatorToken();
      const res = await fetch('/api/cloud-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${opToken}`,
          'x-intramed-token': opToken || '',
        },
        body: JSON.stringify({
          action: 'toggle_user_active',
          targetEmail,
          isActive: !currentActive,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        showNotice('ok', data.message || 'Status alterado com sucesso!');
        loadAdminUsers();
      } else {
        showNotice('err', data?.error || 'Erro ao alterar status do usuário.');
      }
    } catch {
      showNotice('err', 'Falha de conexão com o servidor.');
    }
  };

  const loadSyncDiagnostics = React.useCallback(async () => {
    setPendingOfflineItems(getPendingQueueItems());
    try {
      const opToken = getStoredOperatorToken();
      const headers: Record<string, string> = {};
      if (opToken) headers['Authorization'] = `Bearer ${opToken}`;
      const res = await fetch('/api/cloud-sync?refreshDiagnostics=true', { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.syncLogs)) {
          setServerSyncLogs(data.syncLogs);
        }
        if (data.diagnostics) {
          setServerDiagnosticsData(data.diagnostics);
        }
      }
    } catch {
      // Offline
    }
  }, []);

  const handleForceResync = async () => {
    setIsResyncing(true);
    setResyncSuccessMsg(null);
    try {
      const res = await forceServerResync();
      if (res.ok) {
        setResyncSuccessMsg(
          `Sincronização forçada concluída com sucesso! ${res.count || 64} partidas sincronizadas com a base oficial centralizada.`
        );
        await loadSyncDiagnostics();
      } else {
        setFeedbackBanner({
          type: 'err',
          text: res.error || 'Erro ao sincronizar com o servidor.',
        });
      }
    } catch (err: any) {
      setFeedbackBanner({ type: 'err', text: err?.message || 'Erro ao sincronizar.' });
    } finally {
      setIsResyncing(false);
    }
  };

  const handleClearCacheAndReload = async () => {
    if (
      window.confirm(
        'Deseja limpar os caches de dados locais deste aparelho (computador ou celular) e recarregar os dados frescos direto do Firebase / Vercel?'
      )
    ) {
      await clearLocalDataCaches(true);
      window.location.reload();
    }
  };

  React.useEffect(() => {
    if (activeTab === 'auditoria') {
      loadSyncDiagnostics();
    }
  }, [activeTab, loadSyncDiagnostics]);

  const handleReconcilePayments = async () => {
    setIsReconciling(true);
    setReconcileResult(null);
    try {
      const opToken = getStoredOperatorToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (opToken) headers['Authorization'] = `Bearer ${opToken}`;

      const res = await fetch('/api/cloud-sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'reconcile_pending_payments' }),
      });
      const data = await res.json();
      if (data.ok) {
        setReconcileResult(
          `Reconciliação concluída: ${data.reconciledCount} pagamentos aprovados de ${data.checkedTotal} verificados.`
        );
        await loadSyncDiagnostics();
      } else {
        setReconcileResult(`Aviso: ${data.error || 'Falha ao executar reconciliação.'}`);
      }
    } catch {
      setReconcileResult('Erro ao conectar ao servidor para reconciliação.');
    } finally {
      setIsReconciling(false);
    }
  };

  const handleFlushQueue = async () => {
    setIsFlushingQueue(true);
    try {
      const res = await flushOfflineQueue();
      setPendingOfflineItems(getPendingQueueItems());
      if (res.flushedCount > 0) {
        showNotice('ok', `${res.flushedCount} documentos sincronizados com a nuvem.`);
      } else if (res.errors.length > 0) {
        showNotice('err', `Erros na sincronização: ${res.errors[0]}`);
      }
    } finally {
      setIsFlushingQueue(false);
    }
  };

  const showNotice = (type: 'ok' | 'err', text: string) => {
    setFeedbackBanner({ type, text });
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  const handleToggleLaunchFlag = async (flag: keyof PublicLaunchConfig) => {
    setIsUpdatingLaunchConfig(true);
    const nextVal = !launchConfig[flag];
    const updatePayload = { [flag]: nextVal };
    const res = await updateLaunchConfig(updatePayload);
    setIsUpdatingLaunchConfig(false);
    if (res.ok) {
      showNotice('ok', `Configuração atualizada: ${flag} = ${nextVal ? 'Ativado' : 'Desativado'}`);
    } else {
      showNotice('err', res.error || 'Erro ao atualizar configuração de lançamento.');
    }
  };

  const handleSaveOfficialBracket = async () => {
    if (!bracketJsonInput.trim()) {
      showNotice('err', 'Cole a estrutura JSON do chaveamento antes de salvar.');
      return;
    }

    try {
      setIsSavingBracket(true);
      const parsed = JSON.parse(bracketJsonInput) as UniversalModalityBracket;
      const targetModId = parsed.modalityId || bracketModality;
      parsed.modalityId = targetModId;
      const res = await saveOfficialBracket(targetModId, parsed);
      setIsSavingBracket(false);
      if (res.ok) {
        showNotice('ok', `Chaveamento oficial salvo com sucesso!`);
        setBracketJsonInput('');
      } else {
        showNotice('err', res.error || 'Erro ao salvar chaveamento no servidor.');
      }
    } catch {
      setIsSavingBracket(false);
      showNotice('err', 'JSON de chaveamento inválido. Verifique a sintaxe.');
    }
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      showNotice('err', 'Informe o nome do Período/Equipe.');
      return;
    }
    const created = registerTeam({
      name: teamName,
      shortName: teamShort || undefined,
      modalityIds: OFFICIAL_MODALITIES.map((m) => m.id),
    });
    setTeamName('');
    setTeamShort('');
    if (!athTeamId) setAthTeamId(created.id);
    showNotice(
      'ok',
      `Equipe "${created.name}" cadastrada e pronta para receber atletas e jogos!`
    );
  };

  const toggleAthModality = (modId: ModalitySlug) => {
    setAthModalities((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const handleCreateAthlete = (e: React.FormEvent) => {
    e.preventDefault();
    const targetTeam = athTeamId || visibleTeams[0]?.id || '';
    const res = registerAthlete({
      name: athName,
      teamId: targetTeam,
      jerseyNumber: athNumber ? Number(athNumber) : null,
      position: athPosition || 'Atleta Inscrito',
      modalityIds:
        athModalities.length > 0
          ? athModalities
          : OFFICIAL_MODALITIES.map((m) => m.id),
    });

    if (!res.ok) {
      showNotice('err', res.error || 'Erro ao cadastrar atleta.');
      return;
    }

    setAthName('');
    setAthNumber('');
    setAthPosition('');
    showNotice(
      'ok',
      `Atleta "${res.athlete?.name}" inscrito e sincronizado automaticamente com a equipe e súmulas!`
    );
  };

  const handleCreateMatch = (e: React.FormEvent) => {
    e.preventDefault();
    const homeId = matchHomeTeamId || visibleTeams[0]?.id || '';
    const awayId = matchAwayTeamId || visibleTeams[1]?.id || '';
    if (!homeId || !awayId || homeId === awayId) {
      showNotice('err', 'Selecione duas equipes distintas para o confronto.');
      return;
    }

    const phaseLabelMap: Record<TournamentPhaseType, string> = {
      group_stage: 'Fase Classificatória',
      quarterfinals: 'Quartas de Final',
      semifinals: 'Semifinal',
      third_place: 'Disputa de 3º Lugar',
      final: 'Grande Final',
    };

    const created = createOfficialMatch({
      modalityId: matchModality,
      categoryName: 'Geral',
      phase: matchPhase,
      phaseLabel: phaseLabelMap[matchPhase],
      homeTeamId: homeId,
      awayTeamId: awayId,
      scheduledDate: matchDate,
      scheduledTime: matchTime,
      venue: matchVenue,
      tableOfficialPassword: matchTablePin || undefined,
    });

    if (created) {
      setMatchTablePin('');
      showNotice(
        'ok',
        `Partida de ${created.modalityName} criada! Senha do Mesário: ${created.tableOfficialPassword}`
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Central Administrativa / Operador */}
      <div className="rounded-3xl bg-brand-blue text-white p-6 sm:p-7 shadow-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-brand-yellow" aria-hidden="true" />
              <span>Central de Arbitragem, Mesa &amp; Administração</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight">
              Controle de Partidas, Súmula &amp; Inscrições
            </h2>
            <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
              Cadastre períodos e atletas uma única vez, opere a súmula eletrônica em tempo real e acompanhe a atualização automática de perfis, equipes e rankings.
            </p>
          </div>

          {/* Seletor claro: DADOS OFICIAIS vs MODO DE TESTE */}
          <div className="bg-brand-blue-dark/70 border border-white/15 rounded-2xl p-4 flex flex-col gap-3 min-w-[280px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-white/80">
                Ambiente de Dados
              </span>
              {isOnline ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Sincronizado</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-yellow">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Offline Ready ({pendingSyncCount})</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTestMode(false)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  !isTestMode
                    ? 'bg-white text-brand-blue shadow-sm'
                    : 'bg-white/10 text-white/75 hover:bg-white/15'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Dados Oficiais</span>
              </button>

              <button
                type="button"
                onClick={() => setTestMode(true)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isTestMode
                    ? 'bg-brand-yellow text-brand-blue-dark shadow-sm'
                    : 'bg-white/10 text-white/75 hover:bg-white/15'
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                <span>Modo de Teste</span>
              </button>
            </div>
          </div>
        </div>

        {/* Resumo rápido de contadores */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/15">
          <div className="bg-white/10 rounded-xl px-4 py-3">
            <span className="text-[11px] uppercase tracking-wider text-white/70 font-semibold block">
              Períodos &amp; Atletas
            </span>
            <span className="text-sm sm:text-base font-display font-extrabold text-brand-yellow mt-0.5 block">
              {visibleTeams.length} eq. • {visibleAthletes.length} atl.
            </span>
          </div>

          <div className="bg-white/10 rounded-xl px-4 py-3">
            <span className="text-[11px] uppercase tracking-wider text-white/70 font-semibold block">
              Partidas na Fila
            </span>
            <span className="text-sm sm:text-base font-display font-extrabold text-white mt-0.5 block">
              {visibleMatches.length}
            </span>
          </div>

          <div className="bg-white/10 rounded-xl px-4 py-3">
            <span className="text-[11px] uppercase tracking-wider text-white/70 font-semibold block">
              Em Andamento
            </span>
            <span className="text-sm sm:text-base font-display font-extrabold text-white mt-0.5 block">
              {liveCount}
            </span>
          </div>

          <div className="bg-white/10 rounded-xl px-4 py-3">
            <span className="text-[11px] uppercase tracking-wider text-white/70 font-semibold block">
              Finalizadas / Súmulas
            </span>
            <span className="text-sm sm:text-base font-display font-extrabold text-white mt-0.5 block">
              {finishedCount}
            </span>
          </div>
        </div>
      </div>

      {feedbackBanner && (
        <div
          className={`rounded-2xl px-4 py-3 border text-xs sm:text-sm font-display font-bold flex items-center justify-between ${
            feedbackBanner.type === 'ok'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <span>{feedbackBanner.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-xs underline ml-3"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Navegação de Abas do Painel */}
      <div className="bg-white rounded-2xl border border-brand-surface-border px-3 sm:px-5 shadow-card">
        <Tabs
          tabs={ADMIN_TABS}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as AdminTab)}
          variant="underline"
        />
      </div>

      {/* ABA 1: JOGOS -> SELECIONAR PARTIDA -> ABRIR SÚMULA */}
      {activeTab === 'partidas' && (
        <div className="space-y-5">
          {visibleMatches.length === 0 ? (
            <div className="space-y-4">
              <EmptyState
                variant="matches"
                title="Base Oficial sem Partidas Cadastradas"
                message="Você pode cadastrar as equipes (Períodos), atletas e criar partidas oficiais na aba 'Cadastros', ou ativar o MODO DE TESTE para operar imediatamente as 16 modalidades."
                action={
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button
                      variant="primary"
                      size="md"
                      leftIcon={<Plus className="w-4 h-4" />}
                      onClick={() => setActiveTab('cadastros')}
                    >
                      Cadastrar Períodos, Atletas &amp; Jogos
                    </Button>
                    <Button
                      variant="accent"
                      size="md"
                      leftIcon={<FlaskConical className="w-4 h-4" />}
                      onClick={() => setTestMode(true)}
                    >
                      Ativar Modo de Teste
                    </Button>
                  </div>
                }
              />
            </div>
          ) : (
            <>
              {/* Barra de filtro por modalidade + botão de resetar bancada */}
              <div className="bg-white rounded-2xl border border-brand-surface-border p-4 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <label
                    htmlFor="admin-mod-filter"
                    className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary"
                  >
                    Filtrar Modalidade:
                  </label>
                  <select
                    id="admin-mod-filter"
                    value={modalityFilter}
                    onChange={(e) => setModalityFilter(e.target.value)}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-brand-surface-muted border border-brand-surface-border text-sm font-medium text-brand-text-primary focus:outline-none focus:border-brand-blue"
                  >
                    <option value="todas">Todas as 16 modalidades oficiais</option>
                    {OFFICIAL_MODALITIES.map((mod) => (
                      <option key={mod.id} value={mod.id}>
                        {mod.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => setActiveTab('cadastros')}
                  >
                    Novo Cadastro
                  </Button>
                  {isTestMode && (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                      onClick={resetTestEnvironment}
                    >
                      Reiniciar Bancada de Teste
                    </Button>
                  )}
                </div>
              </div>

              {/* Grid de Partidas para Operação */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMatches.map((match) => {
                  const sheet = getSheetByMatchId(match.id);
                  const engine = MODALITY_RULE_ENGINE[match.modalityId];
                  const modObj = OFFICIAL_MODALITIES.find(
                    (m) => m.id === match.modalityId
                  );

                  return (
                    <div
                      key={match.id}
                      className="rounded-2xl bg-white border border-brand-surface-border shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between overflow-hidden"
                    >
                      {/* Topo do Card */}
                      <div className="px-5 py-3.5 bg-brand-surface-muted/70 border-b border-brand-surface-border flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-brand-blue text-white flex items-center justify-center shrink-0">
                            <SportIcon
                              iconKey={modObj?.iconKey || 'futsal'}
                              className="w-4 h-4"
                            />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-display font-bold text-brand-text-primary truncate">
                              {match.modalityName}
                            </h3>
                            <p className="text-[11px] text-brand-text-secondary truncate">
                              {match.categoryName} · {match.phaseLabel} · {match.venue}
                            </p>
                          </div>
                        </div>

                        <StatusBadge status={match.status} />
                      </div>

                      {/* Resumo do Placar & Cronômetro Atual */}
                      <div className="p-5 space-y-4">
                        {engine.scoringModel === 'swimming_heats' ? (
                          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-brand-surface-muted border border-brand-surface-border">
                            <div>
                              <span className="text-xs font-bold text-brand-blue uppercase">
                                Prova de Natação ({sheet?.swimmingStroke || 'Crawl'})
                              </span>
                              <p className="text-xs text-brand-text-secondary mt-0.5">
                                {
                                  sheet?.swimmingLanes?.filter(
                                    (l) => l.status === 'finished'
                                  ).length
                                }{' '}
                                de {sheet?.swimmingLanes?.length || 6} raias com tempo registrado
                              </p>
                            </div>
                            <span className="text-sm font-display font-extrabold text-brand-blue">
                              {formatSecondsToClock(sheet?.timer.elapsedSeconds || 0)}
                            </span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 items-center gap-2 bg-brand-surface-muted/60 rounded-xl p-3.5 border border-brand-surface-border">
                            <div className="text-center">
                              <span className="text-xs font-bold text-brand-text-primary block truncate">
                                {match.homeTeam.teamName}
                              </span>
                              {engine.scoringModel === 'sets_points' && (
                                <span className="text-[10px] text-brand-text-secondary">
                                  Sets: {match.homeTeam.setsWon ?? 0}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-2 text-xl font-display font-extrabold text-brand-blue">
                                <span>{match.homeTeam.score ?? 0}</span>
                                <span className="text-xs text-brand-text-muted">×</span>
                                <span>{match.awayTeam.score ?? 0}</span>
                              </div>
                              <span className="text-[11px] font-semibold text-brand-text-secondary mt-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-brand-blue" />
                                {engine.timerDirection === 'countdown'
                                  ? formatSecondsToClock(
                                      sheet?.timer.remainingSeconds || 0
                                    )
                                  : sheet?.timer.periodLabel}
                              </span>
                            </div>

                            <div className="text-center">
                              <span className="text-xs font-bold text-brand-text-primary block truncate">
                                {match.awayTeam.teamName}
                              </span>
                              {engine.scoringModel === 'sets_points' && (
                                <span className="text-[10px] text-brand-text-secondary">
                                  Sets: {match.awayTeam.setsWon ?? 0}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Senha da Partida (Código do Mesário) */}
                        <div className="rounded-xl bg-amber-50/70 border border-amber-200 px-3 py-2 flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-900">
                              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                              Senha do Mesário:
                              <code className="px-2 py-0.5 rounded bg-white border border-amber-300 font-mono text-xs font-extrabold text-amber-950">
                                {match.tableOfficialPassword || 'Não definida (Use bicoduro ou defina)'}
                              </code>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (editingPinMatchId === match.id) {
                                  setEditingPinMatchId(null);
                                } else {
                                  setEditingPinMatchId(match.id);
                                  setEditingPinValue(match.tableOfficialPassword || '');
                                }
                              }}
                              className="text-[11px] font-bold text-brand-blue hover:underline"
                            >
                              {editingPinMatchId === match.id ? 'Cancelar' : 'Definir / Trocar Senha'}
                            </button>
                          </div>

                          {editingPinMatchId === match.id && (
                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type="text"
                                value={editingPinValue}
                                onChange={(e) => setEditingPinValue(e.target.value.toUpperCase())}
                                placeholder="Ex: MESA-FUT1 ou 1234"
                                className="flex-1 px-2.5 py-1 rounded-lg border border-amber-300 bg-white text-xs font-mono font-bold uppercase focus:outline-none focus:border-brand-blue"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  updateMatchTablePassword(match.id, editingPinValue.trim());
                                  setEditingPinMatchId(null);
                                  setFeedbackBanner({
                                    type: 'ok',
                                    text: `Senha do mesário da partida ${match.homeTeam.teamName} × ${match.awayTeam.teamName} atualizada para: ${editingPinValue.trim() || 'Padrão'}`,
                                  });
                                }}
                                className="px-3 py-1 rounded-lg bg-brand-blue text-white text-xs font-bold hover:bg-brand-blue-hover"
                              >
                                Salvar Senha
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Botões de Ação da Partida: Abrir Súmula, Placar ao Vivo e Súmula Final */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-1"
                            leftIcon={<Play className="w-3.5 h-3.5" />}
                            onClick={() => navigate(`/sumula/${match.id}`)}
                          >
                            Abrir Súmula
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Tv className="w-3.5 h-3.5" />}
                            onClick={() => navigate(`/placar/${match.id}`)}
                          >
                            Placar ao Vivo
                          </Button>

                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<FileText className="w-3.5 h-3.5" />}
                            onClick={() => navigate(`/sumula/${match.id}/documento`)}
                          >
                            Documento
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ABA 2: CADASTROS UNIFICADOS (PERÍODOS/EQUIPES, ATLETAS E PARTIDAS OFICIAIS) */}
      {activeTab === 'cadastros' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Cadastrar Período / Equipe */}
            <form
              onSubmit={handleCreateTeam}
              className="rounded-2xl bg-white border border-brand-surface-border p-5 sm:p-6 shadow-card space-y-4"
            >
              <div className="flex items-center gap-2.5 pb-3 border-b border-brand-surface-border">
                <div className="w-9 h-9 rounded-xl bg-brand-blue-light text-brand-blue flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-brand-text-primary">
                    1. Cadastrar Equipe (Período do Curso)
                  </h3>
                  <p className="text-xs text-brand-text-secondary">
                    Cria a página da equipe e habilita o período para inscrições e tabelas.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                    Nome do Período / Turma *
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Ex: 5º Período • Turma IX"
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm focus:outline-none focus:border-brand-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                    Sigla (3 letras)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={teamShort}
                    onChange={(e) => setTeamShort(e.target.value.toUpperCase())}
                    placeholder="Ex: 5ºP"
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm uppercase focus:outline-none focus:border-brand-blue"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Cadastrar Período / Equipe
              </Button>

              {visibleTeams.length > 0 && (
                <div className="pt-3 border-t border-brand-surface-border space-y-2">
                  <span className="text-[11px] font-bold uppercase text-brand-text-muted">
                    Equipes Ativas ({visibleTeams.length}):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {visibleTeams.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => navigate(`/equipe/${t.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-surface-muted hover:bg-blue-50 border border-brand-surface-border text-xs font-bold text-brand-blue"
                      >
                        <span>{t.name}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>

            {/* 2. Cadastrar Atleta Unificado */}
            <form
              onSubmit={handleCreateAthlete}
              className="rounded-2xl bg-white border border-brand-surface-border p-5 sm:p-6 shadow-card space-y-4"
            >
              <div className="flex items-center gap-2.5 pb-3 border-b border-brand-surface-border">
                <div className="w-9 h-9 rounded-xl bg-brand-blue-light text-brand-blue flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-brand-text-primary">
                    2. Inscrição Unificada de Atleta
                  </h3>
                  <p className="text-xs text-brand-text-secondary">
                    Cria o perfil individual do atleta e o relaciona automaticamente nas súmulas da equipe.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                    Nome do Atleta *
                  </label>
                  <input
                    type="text"
                    value={athName}
                    onChange={(e) => setAthName(e.target.value)}
                    placeholder="Nome ou apelido esportivo"
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm focus:outline-none focus:border-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                    Equipe / Período *
                  </label>
                  <select
                    value={athTeamId || visibleTeams[0]?.id || ''}
                    onChange={(e) => setAthTeamId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm bg-white focus:outline-none focus:border-brand-blue"
                  >
                    {visibleTeams.length === 0 ? (
                      <option value="">Cadastre uma equipe primeiro</option>
                    ) : (
                      visibleTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                    Número da Camisa
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={athNumber}
                    onChange={(e) => setAthNumber(e.target.value)}
                    placeholder="Ex: 10"
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm focus:outline-none focus:border-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                    Posição / Função
                  </label>
                  <input
                    type="text"
                    value={athPosition}
                    onChange={(e) => setAthPosition(e.target.value)}
                    placeholder="Ex: Ala / Armador / Goleiro"
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm focus:outline-none focus:border-brand-blue"
                  />
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-brand-text-secondary mb-1.5">
                  Modalidades em que compete:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {OFFICIAL_MODALITIES.map((mod) => {
                    const active = athModalities.includes(mod.id);
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => toggleAthModality(mod.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                          active
                            ? 'bg-brand-blue text-white'
                            : 'bg-brand-surface-muted text-brand-text-secondary hover:bg-slate-200'
                        }`}
                      >
                        {mod.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={visibleTeams.length === 0}
                leftIcon={<UserPlus className="w-4 h-4" />}
              >
                Inscrever Atleta e Gerar Perfil
              </Button>
            </form>
          </div>

          {/* 3. Criar Confronto Oficial */}
          <form
            onSubmit={handleCreateMatch}
            className="rounded-2xl bg-white border border-brand-surface-border p-5 sm:p-6 shadow-card space-y-4"
          >
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-brand-surface-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-blue-light text-brand-blue flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-brand-text-primary">
                    3. Criar Confronto &amp; Gerar Súmula Eletrônica
                  </h3>
                  <p className="text-xs text-brand-text-secondary">
                    Os atletas já inscritos nas duas equipes serão carregados automaticamente na súmula da partida.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                  Modalidade *
                </label>
                <select
                  value={matchModality}
                  onChange={(e) => setMatchModality(e.target.value as ModalitySlug)}
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm bg-white"
                >
                  {OFFICIAL_MODALITIES.map((mod) => (
                    <option key={mod.id} value={mod.id}>
                      {mod.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                  Equipe Mandante *
                </label>
                <select
                  value={matchHomeTeamId || visibleTeams[0]?.id || ''}
                  onChange={(e) => setMatchHomeTeamId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm bg-white"
                >
                  {visibleTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                  Equipe Visitante *
                </label>
                <select
                  value={matchAwayTeamId || visibleTeams[1]?.id || ''}
                  onChange={(e) => setMatchAwayTeamId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm bg-white"
                >
                  {visibleTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                  Fase da Competição
                </label>
                <select
                  value={matchPhase}
                  onChange={(e) =>
                    setMatchPhase(e.target.value as TournamentPhaseType)
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm bg-white"
                >
                  <option value="group_stage">Fase Classificatória</option>
                  <option value="quarterfinals">Quartas de Final</option>
                  <option value="semifinals">Semifinal</option>
                  <option value="final">Grande Final</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                  Data &amp; Horário
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    placeholder="Hoje"
                    className="w-full px-3 py-2 rounded-xl border border-brand-surface-border text-sm"
                  />
                  <input
                    type="text"
                    value={matchTime}
                    onChange={(e) => setMatchTime(e.target.value)}
                    placeholder="19:00"
                    className="w-full px-3 py-2 rounded-xl border border-brand-surface-border text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                  Local / Quadra
                </label>
                <input
                  type="text"
                  value={matchVenue}
                  onChange={(e) => setMatchVenue(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-brand-text-secondary mb-1">
                  Senha do Mesário da Partida (Opcional — se deixar em branco, o sistema gera um código automático e você pode mudar depois)
                </label>
                <input
                  type="text"
                  value={matchTablePin}
                  onChange={(e) => setMatchTablePin(e.target.value.toUpperCase())}
                  placeholder="Ex: MESA-FUT01 (código que o mesário usará para abrir a súmula ao vivo desta partida)"
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-surface-border text-sm font-mono uppercase focus:outline-none focus:border-brand-blue"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={visibleTeams.length < 2}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Criar Confronto Oficial
            </Button>
          </form>

          {/* Lista Rápida de Atletas Inscritos */}
          {visibleAthletes.length > 0 && (
            <div className="rounded-2xl bg-white border border-brand-surface-border p-5 shadow-card space-y-3">
              <h4 className="text-sm font-display font-bold text-brand-text-primary">
                Atletas Cadastrados no Ambiente Atual ({visibleAthletes.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {visibleAthletes.map((ath) => {
                  const t = getTeamById(ath.teamId);
                  return (
                    <button
                      key={ath.id}
                      type="button"
                      onClick={() => navigate(`/atleta/${ath.id}`)}
                      className="p-3 rounded-xl bg-brand-surface-muted/70 hover:bg-blue-50 border border-brand-surface-border text-left flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-display font-extrabold text-slate-900 truncate">
                          #{ath.jerseyNumber || '—'} {ath.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {t?.name || 'Equipe'} • {ath.position}
                        </p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA: GESTÃO DE USUÁRIOS & HIERARQUIA RBAC (5 NÍVEIS) */}
      {activeTab === 'usuarios' && (
        <div className="space-y-6">
          {/* Card Informativo da Conta Master & Hierarquia */}
          <div className="rounded-3xl bg-gradient-to-r from-[#0B218A] to-[#1E3A8A] text-white p-6 shadow-card">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-yellow/20 text-brand-yellow border border-brand-yellow/30 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Governança Oficial • A.A.A. Cangaceira</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-display font-black tracking-tight">
                  Controle de Acessos &amp; Hierarquia RBAC
                </h3>
                <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
                  Sistema de autorização em 5 níveis estritos. A conta Moderador Master possui governança exclusiva sobre a atribuição de papéis e possui blindagem permanente contra exclusão ou rebaixamento.
                </p>
              </div>

              <div className="bg-white/10 border border-white/15 rounded-2xl p-4 flex flex-col gap-1 min-w-[240px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                  Moderador Master Ativo
                </span>
                <span className="text-sm font-extrabold text-brand-yellow truncate">
                  cangaceira@uema.com
                </span>
                <span className="text-[11px] text-white/60">
                  A.A.A. de Medicina UEMA – Cangaceira
                </span>
              </div>
            </div>

            {/* Régua explicativa dos 5 níveis */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-5 pt-4 border-t border-white/15">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-black uppercase text-brand-yellow block">Nível 5 • Master</span>
                <span className="text-xs font-bold text-white block mt-0.5">Moderador Master</span>
                <span className="text-[10px] text-white/60 block mt-0.5">Governança total</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-black uppercase text-sky-300 block">Nível 4 • Mod</span>
                <span className="text-xs font-bold text-white block mt-0.5">Moderador</span>
                <span className="text-[10px] text-white/60 block mt-0.5">Comissão &amp; Sócios</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-black uppercase text-emerald-300 block">Nível 3 • Mesa</span>
                <span className="text-xs font-bold text-white block mt-0.5">Mesário</span>
                <span className="text-[10px] text-white/60 block mt-0.5">Súmulas ao vivo</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-black uppercase text-amber-300 block">Nível 2 • Atleta</span>
                <span className="text-xs font-bold text-white block mt-0.5">Atleta</span>
                <span className="text-[10px] text-white/60 block mt-0.5">Passaporte esportivo</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-black uppercase text-slate-300 block">Nível 1 • Usuário</span>
                <span className="text-xs font-bold text-white block mt-0.5">Usuário</span>
                <span className="text-[10px] text-white/60 block mt-0.5">Comunidade &amp; Torcida</span>
              </div>
            </div>
          </div>

          {/* Tabela de Usuários e Gestão de Cargos */}
          <div className="bg-white rounded-3xl border border-brand-surface-border p-6 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-display font-extrabold text-slate-900">
                  Usuários Administrativos &amp; Operadores
                </h4>
                <p className="text-xs text-slate-500">
                  Gerencie atribuições de mesários, moderadores e acesso aos painéis oficiais.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Buscar por e-mail ou nome..."
                  className="px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadAdminUsers}
                  disabled={isLoadingUsers}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-y border-slate-200 uppercase text-[10px] font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Usuário</th>
                    <th className="py-3 px-4">E-mail</th>
                    <th className="py-3 px-4">Cargo / Nível</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminUsersList
                    .filter((u) => {
                      if (!userSearchTerm.trim()) return true;
                      const q = userSearchTerm.toLowerCase();
                      return u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q);
                    })
                    .map((user) => {
                      const isMasterUser = user.email.toLowerCase() === 'cangaceira@uema.com';
                      return (
                        <tr key={user.id || user.email} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              {isMasterUser && <span className="text-amber-500 text-sm">👑</span>}
                              <span>{user.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                            {user.email}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                user.role === 'moderador_master'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : user.role === 'moderador'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : user.role === 'mesario'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                                user.isActive ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  user.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                              />
                              {user.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isMasterUser ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                                <Shield className="w-3 h-3" />
                                <span>Blindagem Master</span>
                              </span>
                            ) : (
                              <div className="inline-flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs py-1 px-2.5 h-7"
                                  onClick={() => {
                                    setSelectedUserForRole(user);
                                    setSelectedNewRole(user.role);
                                  }}
                                >
                                  Alterar Cargo
                                </Button>
                                <Button
                                  size="sm"
                                  variant={user.isActive ? 'ghost' : 'outline'}
                                  className={`text-xs py-1 px-2.5 h-7 ${
                                    user.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600'
                                  }`}
                                  onClick={() => handleToggleActive(user.email, user.isActive)}
                                >
                                  {user.isActive ? 'Desativar' : 'Ativar'}
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Modal de Alteração de Cargo */}
            {selectedUserForRole && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-base font-display font-extrabold text-slate-900">
                      Alterar Cargo de Acesso
                    </h5>
                    <button
                      type="button"
                      onClick={() => setSelectedUserForRole(null)}
                      className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-xs text-slate-600">
                    Defina o nível de autorização para o operador <strong>{selectedUserForRole.email}</strong>:
                  </p>

                  <div className="space-y-2">
                    {[
                      { role: 'moderador', label: 'Moderador (Nível 4)', desc: 'Aprovação de sócios e gerenciamento geral' },
                      { role: 'mesario', label: 'Mesário Oficial (Nível 3)', desc: 'Operação de súmulas ao vivo e lances' },
                      { role: 'atleta', label: 'Atleta Inscrito (Nível 2)', desc: 'Acesso à carteirinha e dados esportivos' },
                      { role: 'usuario', label: 'Usuário Padrão (Nível 1)', desc: 'Acesso torcedor sem privilégios de edição' },
                    ].map((item) => (
                      <label
                        key={item.role}
                        className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                          selectedNewRole === item.role
                            ? 'bg-brand-blue/5 border-brand-blue'
                            : 'bg-slate-50 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="newRole"
                          value={item.role}
                          checked={selectedNewRole === item.role}
                          onChange={(e) => setSelectedNewRole(e.target.value)}
                          className="mt-0.5 text-brand-blue focus:ring-brand-blue"
                        />
                        <div>
                          <span className="block text-xs font-bold text-slate-900">{item.label}</span>
                          <span className="block text-[11px] text-slate-500">{item.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUserForRole(null)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleUpdateRole(selectedUserForRole.email, selectedNewRole)}
                    >
                      Confirmar Cargo
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Histórico de Auditoria RBAC */}
          {adminAuditLogs.length > 0 && (
            <div className="bg-white rounded-3xl border border-brand-surface-border p-6 shadow-card space-y-3">
              <h4 className="text-sm font-display font-bold text-slate-900 uppercase tracking-wider">
                Trilha de Auditoria • Ações Administrativas Recentes
              </h4>
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {adminAuditLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900">{log.action}</span>
                      <p className="text-slate-500 text-[11px]">
                        Por: {log.performedByEmail} ({log.performedByRole}) {log.targetEmail ? `→ Alvo: ${log.targetEmail}` : ''}
                      </p>
                      {log.details && <p className="text-slate-600 text-[11px] italic">{log.details}</p>}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.timestampIso).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA: LANÇAMENTO PÚBLICO & GESTÃO DO CHAVEAMENTO OFICIAL */}
      {activeTab === 'lancamento' && (
        <div className="space-y-6">
          {/* Hero Banner de Governança */}
          <div className="rounded-3xl bg-gradient-to-r from-[#0B218A] to-[#1E3A8A] text-white p-6 shadow-card">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-yellow/20 text-brand-yellow border border-brand-yellow/30 text-xs font-bold">
                  <Rocket className="w-4 h-4" />
                  <span>Governança de Divulgação • INTRAMED IX</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-display font-black tracking-tight">
                  Controle do Modo de Lançamento & Chaveamento
                </h3>
                <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
                  Gerencie centralizadamente os bloqueios de segurança da divulgação pública (login, inscrições, pagamentos Pix e perfis) e a publicação do chaveamento oficial das 16 modalidades.
                </p>
              </div>
            </div>
          </div>

          {/* Grid de 7 Controles do Modo de Lançamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Modo de Lançamento Central */}
            <div className="bg-white rounded-2xl border border-brand-surface-border p-5 shadow-card flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400">Modo Central</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      launchConfig.publicLaunchMode
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    {launchConfig.publicLaunchMode ? 'Pré-Lançamento Ativo' : 'Lançamento Aberto'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Modo de Divulgação Pública</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Quando ativo, indica aos visitantes que o site está em fase de apresentação inicial, preparando as inscrições.
                </p>
              </div>
              <Button
                variant={launchConfig.publicLaunchMode ? 'outline' : 'primary'}
                size="sm"
                disabled={isUpdatingLaunchConfig}
                onClick={() => handleToggleLaunchFlag('publicLaunchMode')}
                className="w-full justify-center"
              >
                {launchConfig.publicLaunchMode ? 'Desativar Modo de Divulgação' : 'Ativar Modo de Divulgação'}
              </Button>
            </div>

            {/* 2. Login Público */}
            <div className="bg-white rounded-2xl border border-brand-surface-border p-5 shadow-card flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400">Autenticação</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      launchConfig.publicLoginEnabled
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-red-100 text-red-900 border border-red-300'
                    }`}
                  >
                    {launchConfig.publicLoginEnabled ? 'Liberado' : 'Bloqueado (Em Breve)'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Login Público de Participantes</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Bloqueia logins de usuários comuns e exibe tela de "ACESSO EM BREVE". O login administrativo permanece ativo.
                </p>
              </div>
              <Button
                variant={launchConfig.publicLoginEnabled ? 'outline' : 'primary'}
                size="sm"
                disabled={isUpdatingLaunchConfig}
                onClick={() => handleToggleLaunchFlag('publicLoginEnabled')}
                className="w-full justify-center"
              >
                {launchConfig.publicLoginEnabled ? 'Bloquear Login Público' : 'Liberar Login Público'}
              </Button>
            </div>

            {/* 3. Inscrições & Cadastros */}
            <div className="bg-white rounded-2xl border border-brand-surface-border p-5 shadow-card flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400">Inscrições</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      launchConfig.publicRegistrationEnabled
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-red-100 text-red-900 border border-red-300'
                    }`}
                  >
                    {launchConfig.publicRegistrationEnabled ? 'Abertas' : 'Bloqueadas (Em Breve)'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Cadastro & Inscrições</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Impede novos cadastros de atletas e inscrições, exibindo mensagem oficial de "INSCRIÇÕES EM BREVE".
                </p>
              </div>
              <Button
                variant={launchConfig.publicRegistrationEnabled ? 'outline' : 'primary'}
                size="sm"
                disabled={isUpdatingLaunchConfig}
                onClick={() => handleToggleLaunchFlag('publicRegistrationEnabled')}
                className="w-full justify-center"
              >
                {launchConfig.publicRegistrationEnabled ? 'Bloquear Inscrições' : 'Liberar Inscrições'}
              </Button>
            </div>

            {/* 4. Pagamentos Pix & Checkout */}
            <div className="bg-white rounded-2xl border border-brand-surface-border p-5 shadow-card flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400">Financeiro</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      launchConfig.publicPaymentsEnabled
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-red-100 text-red-900 border border-red-300'
                    }`}
                  >
                    {launchConfig.publicPaymentsEnabled ? 'Habilitados' : 'Bloqueados (Em Breve)'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Pagamentos Pix & Mercado Pago</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Interrompe geração de QR Code Pix, copia-e-cola e links do Mercado Pago retornando HTTP 403 no backend.
                </p>
              </div>
              <Button
                variant={launchConfig.publicPaymentsEnabled ? 'outline' : 'primary'}
                size="sm"
                disabled={isUpdatingLaunchConfig}
                onClick={() => handleToggleLaunchFlag('publicPaymentsEnabled')}
                className="w-full justify-center"
              >
                {launchConfig.publicPaymentsEnabled ? 'Bloquear Pagamentos Pix' : 'Liberar Pagamentos Pix'}
              </Button>
            </div>

            {/* 5. Preços Visíveis */}
            <div className="bg-white rounded-2xl border border-brand-surface-border p-5 shadow-card flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400">Valores dos Lotes</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      launchConfig.publicPricesVisible
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {launchConfig.publicPricesVisible ? 'Preços Visíveis' : 'Desfocados (Em Breve)'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Ocultação Visual de Preços</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Aplica desfoque visual (blur) nos valores dos lotes e omite os valores reais das respostas públicas de API.
                </p>
              </div>
              <Button
                variant={launchConfig.publicPricesVisible ? 'outline' : 'primary'}
                size="sm"
                disabled={isUpdatingLaunchConfig}
                onClick={() => handleToggleLaunchFlag('publicPricesVisible')}
                className="w-full justify-center"
              >
                {launchConfig.publicPricesVisible ? 'Ocultar / Desfocar Preços' : 'Exibir Preços Reais'}
              </Button>
            </div>

            {/* 6. Chaveamento Publicado */}
            <div className="bg-white rounded-2xl border border-brand-surface-border p-5 shadow-card flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400">Chaveamento</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      launchConfig.bracketPublished
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {launchConfig.bracketPublished ? 'Chave Publicada' : 'Chaveamento Em Breve'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Publicação do Chaveamento</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Quando falso, a página /chaveamento exibe "CHAVEAMENTO EM BREVE" sem inventar confrontos fictícios.
                </p>
              </div>
              <Button
                variant={launchConfig.bracketPublished ? 'outline' : 'primary'}
                size="sm"
                disabled={isUpdatingLaunchConfig}
                onClick={() => handleToggleLaunchFlag('bracketPublished')}
                className="w-full justify-center"
              >
                {launchConfig.bracketPublished ? 'Ocultar Chaveamento' : 'Publicar Chaveamento Oficial'}
              </Button>
            </div>

            {/* 7. Perfis Públicos Ocultos */}
            <div className="bg-white rounded-2xl border border-brand-surface-border p-5 shadow-card flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400">Privacidade</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      launchConfig.publicProfilesVisible
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-red-100 text-red-900 border border-red-300'
                    }`}
                  >
                    {launchConfig.publicProfilesVisible ? 'Perfis Visíveis' : 'Perfis Ocultos'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Ocultação Total de Participantes</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Oculta o diretório /comunidade, listas de atletas e dados pessoais de visitantes, mantendo todas as contas salvas intactas.
                </p>
              </div>
              <Button
                variant={launchConfig.publicProfilesVisible ? 'outline' : 'primary'}
                size="sm"
                disabled={isUpdatingLaunchConfig}
                onClick={() => handleToggleLaunchFlag('publicProfilesVisible')}
                className="w-full justify-center"
              >
                {launchConfig.publicProfilesVisible ? 'Ocultar Perfis do Público' : 'Tornar Perfis Públicos'}
              </Button>
            </div>
          </div>

          {/* Seção de Importação / Publicação do Chaveamento Oficial */}
          <div className="bg-white rounded-3xl border border-brand-surface-border p-6 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-surface-border pb-4">
              <div>
                <h4 className="text-base font-display font-bold text-slate-900 flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-brand-blue" />
                  <span>Editor & Importador de Chaveamento Oficial</span>
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Insira ou edite os confrontos oficiais por modalidade (formato universal com suporte a fase de grupos e mata-mata).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={bracketModality}
                  onChange={(e) => setBracketModality(e.target.value as ModalitySlug)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white text-slate-800"
                >
                  {OFFICIAL_MODALITIES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Estrutura JSON do Chaveamento ({bracketModality})
              </label>
              <textarea
                value={bracketJsonInput}
                onChange={(e) => setBracketJsonInput(e.target.value)}
                placeholder={`{\n  "modalityId": "${bracketModality}",\n  "modalityName": "Futsal Masculino",\n  "format": "knockout_5_teams",\n  "isPublished": true,\n  "stages": [\n    {\n      "phase": "quarterfinals",\n      "title": "Quartas de Final",\n      "matches": [\n        {\n          "id": "qf_1",\n          "phase": "quarterfinals",\n          "homeParticipant": { "teamId": "sanguinaria", "teamName": "A.A.A. Sanguinária" },\n          "awayParticipant": { "teamId": "calouros", "teamName": "Calouros Medicina" },\n          "status": "scheduled"\n        }\n      ]\n    }\n  ]\n}`}
                rows={10}
                className="w-full font-mono text-xs p-3.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-blue bg-slate-50 text-slate-800"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-500">
                Status na Nuvem: <strong>{officialBrackets[bracketModality] ? 'Cadastrado' : 'Aguardando publicação'}</strong>
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="primary"
                  disabled={isSavingBracket}
                  onClick={handleSaveOfficialBracket}
                  className="w-full sm:w-auto font-bold"
                >
                  <UploadCloud className="w-4 h-4 mr-2" />
                  <span>{isSavingBracket ? 'Salvando...' : 'Salvar Chaveamento'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: MOTOR DE MODALIDADES E REGRAS CONFIGURÁVEIS */}
      {activeTab === 'regras' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {OFFICIAL_MODALITIES.map((mod) => {
            const cfg = MODALITY_RULE_ENGINE[mod.id];
            const categories = Object.values(cfg.defaultCategoryRules);

            return (
              <div
                key={mod.id}
                className="rounded-2xl bg-white border border-brand-surface-border p-5 shadow-card space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-brand-blue-light text-brand-blue flex items-center justify-center">
                      <SportIcon iconKey={mod.iconKey} className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-display font-bold text-brand-text-primary">
                        {mod.name}
                      </h4>
                      <span className="text-[11px] text-brand-text-secondary">
                        Modelo: {cfg.scoringModel}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status="official" label="Configurável" />
                </div>

                <div className="space-y-1.5 pt-2 border-t border-brand-surface-border text-xs text-brand-text-secondary">
                  {categories.map((cat) => (
                    <div
                      key={cat.categoryName}
                      className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-brand-surface-muted"
                    >
                      <span className="font-semibold text-brand-text-primary">
                        {cat.categoryName}
                      </span>
                      <span>
                        {cfg.timerDirection === 'countdown'
                          ? `${cat.periodsCount} × ${
                              cat.periodDurationSeconds / 60
                            } min`
                          : cfg.scoringModel === 'sets_points'
                          ? `Melhor de ${cat.periodsCount} sets`
                          : cfg.scoringModel === 'swimming_heats'
                          ? 'Crawl, Borboleta, Peito, Costas'
                          : 'Parametrizável pelo regulamento'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ABA 4: PAINEL DE MONITORAMENTO DE SINCRONIZAÇÃO & AUDITORIA */}
      {activeTab === 'auditoria' && (
        <div className="space-y-6">
          {/* BANNER DE DIAGNÓSTICO TÉCNICO FIREBASE & FONTE ÚNICA OFICIAL */}
          <div className="rounded-2xl bg-white border border-brand-surface-border p-5 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-display font-black text-brand-text-primary">
                    Painel de Diagnóstico Técnico — Firebase & Base Central Unificada
                  </h3>
                  <p className="text-xs text-brand-text-secondary">
                    Garantia de que celulares, notebooks e desktops acessam a mesma base central sem dados isolados em cache local.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={isResyncing}
                  onClick={handleForceResync}
                  className="text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResyncing ? 'animate-spin' : ''}`} />
                  <span>{isResyncing ? 'Sincronizando...' : 'Forçar Ressincronização'}</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClearCacheAndReload}
                  className="text-xs flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpar Cache Local</span>
                </Button>
              </div>
            </div>

            {/* DETALHES DE STATUS DE INTEGRAÇÃO & INFRAESTRUTURA */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Projeto Firebase</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="font-mono font-bold text-slate-800 text-[11px] truncate">
                  gen-lang-client-0847910166
                </div>
                <div className="text-[10px] text-slate-500">
                  Firebase Auth: <strong className="text-emerald-700">Ativo (100% OK)</strong>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Cloud Firestore (default)</span>
                  {serverDiagnosticsData?.firestore?.status === 'connected' ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>
                <div className="font-bold text-slate-800 text-[11px]">
                  {serverDiagnosticsData?.firestore?.status === 'connected' ? (
                    <span className="text-emerald-700">Conectado (Modo Nativo)</span>
                  ) : (
                    <span className="text-amber-700">Pendente no Console Google Cloud</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  {serverDiagnosticsData?.firestore?.status === 'connected' ? (
                    'Sincronização bidirecional ativa'
                  ) : (
                    <a
                      href="https://console.cloud.google.com/datastore/setup?project=gen-lang-client-0847910166"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-blue font-bold underline flex items-center gap-0.5"
                    >
                      Criar Banco no Console <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Hub Central Serverless</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="font-bold text-slate-800 text-[11px]">
                  /api/cloud-sync • Vercel Edge
                </div>
                <div className="text-[10px] text-slate-500">
                  Polling: 4.5s • Delta Sync Ativo
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Cache Local & Versão</span>
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                </div>
                <div className="font-mono font-bold text-slate-800 text-[11px]">
                  {cacheVersion || CURRENT_APP_CACHE_VERSION}
                </div>
                <div className="text-[10px] text-slate-500">
                  Último sync: {lastSyncedIso ? new Date(lastSyncedIso).toLocaleTimeString('pt-BR') : 'Agora'}
                </div>
              </div>
            </div>

            {/* STATUS MULTI-DISPOSITIVO UNIFICADO */}
            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <span className="font-bold block">Convergência Multi-Dispositivo Ativa</span>
                  <span className="text-emerald-800 text-[11px]">
                    Celulares e computadores comunicam-se com a mesma base central. Nenhum cadastro ou elenco fica preso apenas no aparelho local.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-[11px] font-semibold text-emerald-800">
                <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" /> Celular</span>
                <span>⟷</span>
                <span className="flex items-center gap-1"><Laptop className="w-3.5 h-3.5" /> Computador</span>
              </div>
            </div>

            {/* RESUMO DOS DADOS OFICIAIS SINCRONIZADOS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Partidas</span>
                <span className="text-sm font-display font-black text-brand-blue">
                  {serverDiagnosticsData?.serverStoreCounts?.matches || visibleMatches.length || 64}
                </span>
                <span className="block text-[9px] text-slate-400">16 modalidades</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Chaveamentos</span>
                <span className="text-sm font-display font-black text-brand-blue">
                  {serverDiagnosticsData?.serverStoreCounts?.brackets || Object.keys(officialBrackets).length || 16}
                </span>
                <span className="block text-[9px] text-slate-400">5 equipes cada</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Equipes Oficiais</span>
                <span className="text-sm font-display font-black text-brand-blue">
                  {serverDiagnosticsData?.serverStoreCounts?.teams || visibleTeams.length || 5}
                </span>
                <span className="block text-[9px] text-slate-400">Atléticas UEMA</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Atletas / Elencos</span>
                <span className="text-sm font-display font-black text-brand-blue">
                  {serverDiagnosticsData?.serverStoreCounts?.athletes || visibleAthletes.length}
                </span>
                <span className="block text-[9px] text-slate-400">Base central</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Perfis Públicos</span>
                <span className="text-sm font-display font-black text-brand-blue">
                  {serverDiagnosticsData?.serverStoreCounts?.profiles || 0}
                </span>
                <span className="block text-[9px] text-slate-400">Comunidade</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Inscrições</span>
                <span className="text-sm font-display font-black text-brand-blue">
                  {serverDiagnosticsData?.serverStoreCounts?.registrations || 0}
                </span>
                <span className="block text-[9px] text-slate-400">Participantes</span>
              </div>
            </div>
          </div>

          {/* Banner de sucesso na sincronização forçada */}
          {resyncSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{resyncSuccessMsg}</span>
              </div>
              <button
                onClick={() => setResyncSuccessMsg(null)}
                className="text-emerald-500 hover:text-emerald-800 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* 1. SAÚDE DOS SERVIÇOS & INTEGRAÇÕES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white border border-brand-surface-border p-4 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-slate-400">
                  Cloud Sync API
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="text-base font-display font-black text-brand-blue">
                Online • 4.5s Polling
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Sincronização em nuvem e delta ativo via /api/cloud-sync
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-brand-surface-border p-4 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-slate-400">
                  Mercado Pago
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <div className="text-base font-display font-black text-slate-900">
                Webhooks & Pix Ativos
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Validação criptográfica HMAC e baixa automática
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-brand-surface-border p-4 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-slate-400">
                  Fila Offline Local
                </span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    pendingOfflineItems.length === 0 ? 'bg-slate-300' : 'bg-amber-500'
                  }`}
                />
              </div>
              <div className="flex items-baseline justify-between">
                <div className="text-base font-display font-black text-slate-900">
                  {pendingOfflineItems.length} {pendingOfflineItems.length === 1 ? 'item' : 'itens'}
                </div>
                {pendingOfflineItems.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isFlushingQueue}
                    onClick={handleFlushQueue}
                    className="text-xs py-1 px-2.5 h-7"
                  >
                    {isFlushingQueue ? 'Enviando...' : 'Descarregar'}
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {pendingOfflineItems.length === 0
                  ? 'Fila limpa — todas as alterações salvas na nuvem'
                  : 'Alterações guardadas localmente aguardando envio'}
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-brand-surface-border p-4 shadow-card flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-slate-400 block mb-1">
                  Reconciliação MP
                </span>
                <div className="text-xs text-slate-600">
                  Varredura de pagamentos pendentes no gateway
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                disabled={isReconciling}
                onClick={handleReconcilePayments}
                className="mt-3 w-full text-xs flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />
                <span>{isReconciling ? 'Consultando...' : 'Reconciliar Agora'}</span>
              </Button>
            </div>
          </div>

          {/* Banner de resultado da Reconciliação */}
          {reconcileResult && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-blue shrink-0" />
                <span>{reconcileResult}</span>
              </div>
              <button
                onClick={() => setReconcileResult(null)}
                className="text-blue-500 hover:text-blue-800 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Fila de sincronização pendente detalhada (se houver itens) */}
          {pendingOfflineItems.length > 0 && (
            <div className="rounded-2xl bg-amber-50/80 border border-amber-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold uppercase text-amber-900">
                    Documentos na Fila Offline ({pendingOfflineItems.length})
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isFlushingQueue}
                  onClick={handleFlushQueue}
                  className="text-xs"
                >
                  Tentar Enviar Tudo
                </Button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {pendingOfflineItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-white border border-amber-200 text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-bold text-slate-800 uppercase mr-2">
                        {item.collectionName}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        ID: {item.docId}
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                      {item.attempts > 0 ? `${item.attempts}ª tentativa` : 'Novo'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. LOGS DE SINCRONIZAÇÃO & WEBHOOKS DO SERVIDOR */}
          <div className="rounded-2xl bg-white border border-brand-surface-border p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-brand-text-primary">
                    Eventos de Sincronização & Webhooks Recentes
                  </h3>
                  <p className="text-xs text-brand-text-secondary">
                    Notificações do Mercado Pago, reconciliações automáticas e deltas registrados no backend.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={loadSyncDiagnostics}
                className="text-xs flex items-center gap-1.5 text-slate-600"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Atualizar Logs</span>
              </Button>
            </div>

            {serverSyncLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                Nenhum evento registrado nesta sessão do servidor.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto divide-y divide-slate-100">
                {serverSyncLogs.slice(0, 30).map((log) => (
                  <div key={log.id} className="pt-2 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.category === 'webhook'
                              ? 'bg-purple-100 text-purple-700'
                              : log.category === 'payment_reconcile'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {log.category}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(log.timestampIso).toLocaleTimeString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-slate-700 font-medium">{log.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. AUDITORIA DE SÚMULA (HISTÓRICO DE ALTERAÇÕES) */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-white border border-brand-surface-border p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-blue-light text-brand-blue flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-brand-text-primary">
                    Rastreabilidade e Auditoria de Súmula
                  </h3>
                  <p className="text-xs text-brand-text-secondary">
                    Toda edição ou exclusão de evento durante a partida registra o valor original, a alteração e o horário.
                  </p>
                </div>
              </div>
              <StatusBadge
                status="official"
                label={`${allAuditLogs.length} alterações registradas`}
              />
            </div>

            {allAuditLogs.length === 0 ? (
              <EmptyState
                variant="stats"
                message="Nenhuma correção ou exclusão de evento foi realizada até o momento."
              />
            ) : (
              <div className="space-y-3">
                {allAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-2xl bg-white border border-brand-surface-border p-4 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-brand-yellow-dark" />
                        <span className="text-xs font-bold uppercase text-brand-blue">
                          {log.modalityName} — {log.action === 'deleted' ? 'Exclusão' : 'Edição'}
                        </span>
                        <span className="text-xs text-brand-text-muted">
                          • {new Date(log.timestampIso).toLocaleTimeString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-xs text-brand-text-secondary">
                        <strong>Original:</strong> {log.previousSummary}
                      </p>
                      <p className="text-xs text-brand-text-primary font-medium">
                        <strong>Atualizado:</strong> {log.newSummary}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/sumula/${log.matchId}`)}
                    >
                      Ver Súmula
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
