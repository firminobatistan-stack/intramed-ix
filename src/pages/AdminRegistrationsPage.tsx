import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Download,
  DollarSign,
  Users,
  AlertCircle,
  FileText,
  UserCheck,
  History,
  QrCode,
  CreditCard,
} from 'lucide-react';
import { useRegistrationStore } from '../context/RegistrationStoreContext';
import { useCompetitionStore } from '../context/CompetitionStoreContext';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Registration, TurmaMedicina } from '../types/domain';
import { TURMAS_MEDICINA } from '../data/registrationData';

export const AdminRegistrationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, canOperateOfficialData } = useCompetitionStore();
  const isAdmin = canOperateOfficialData();

  const {
    tournamentEvent,
    registrations,
    auditLogs,
    validateMemberDiscount,
    cancelRegistration,
  } = useRegistrationStore();

  const [filterStatus, setFilterStatus] = useState<
    'todos' | 'aguardando_validacao' | 'pendente' | 'pago' | 'cancelado'
  >('todos');
  const [filterTurma, setFilterTurma] = useState<'todas' | TurmaMedicina>('todas');
  const [searchTerm, setSearchTerm] = useState('');

  // Modais de Ação
  const [validatingReg, setValidatingReg] = useState<Registration | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedAuditReg, setSelectedAuditReg] = useState<Registration | null>(null);
  const [selectedReceiptReg, setSelectedReceiptReg] = useState<Registration | null>(null);

  // Métricas
  const totalRegistrations = registrations.length;
  const pendingMemberCount = registrations.filter(
    (r) => r.memberStatus === 'pendente'
  ).length;
  const pendingPaymentCount = registrations.filter(
    (r) => r.paymentStatus === 'pendente'
  ).length;
  const paidCount = registrations.filter((r) => r.paymentStatus === 'pago').length;
  const totalRevenue = registrations
    .filter((r) => r.paymentStatus === 'pago')
    .reduce((acc, r) => acc + r.authorizedPrice, 0);

  // Filtragem
  const filteredRegistrations = registrations.filter((reg) => {
    if (filterStatus === 'aguardando_validacao' && reg.memberStatus !== 'pendente')
      return false;
    if (filterStatus === 'pendente' && reg.paymentStatus !== 'pendente')
      return false;
    if (filterStatus === 'pago' && reg.paymentStatus !== 'pago') return false;
    if (filterStatus === 'cancelado' && reg.paymentStatus !== 'cancelado')
      return false;

    if (filterTurma !== 'todas' && reg.turma !== filterTurma) {
      return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = reg.athleteName.toLowerCase().includes(q);
      const matchEmail = reg.athleteEmail.toLowerCase().includes(q);
      const matchDoc = reg.athleteDocument.includes(q);
      const matchTurma = (reg.turmaLabel || reg.teamName || '').toLowerCase().includes(q);
      const matchMod = (reg.modalityName || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchDoc || matchTurma || matchMod;
    }
    return true;
  });

  const handleExportCsv = () => {
    const headers = [
      'ID Inscrição',
      'Atleta',
      'E-mail',
      'Telefone',
      'Documento',
      'Turma / Equipe',
      'Modalidades',
      'Categoria',
      'Solicitou Sócio',
      'Status Sócio',
      'Preço Autorizado (R$)',
      'Status Pagamento',
      'Método',
      'ID Mercado Pago',
      'Data Inscrição',
    ];

    const rows = registrations.map((r) => [
      r.id,
      `"${r.athleteName}"`,
      r.athleteEmail,
      r.athletePhone,
      r.athleteDocument,
      `"${r.turmaLabel || r.teamName || ('Turma ' + r.turma)}"`,
      '"Passaporte Geral (Todas as 10 Modalidades)"',
      r.categoryName,
      r.requestedMemberDiscount ? 'SIM' : 'NÃO',
      r.memberStatus.toUpperCase(),
      r.authorizedPrice.toFixed(2),
      r.paymentStatus.toUpperCase(),
      r.paymentMethod || '—',
      r.mpPaymentId || '—',
      r.createdAtIso,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `intramed-ix-relatorio-inscricoes-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApprove = async () => {
    if (!validatingReg) return;
    await validateMemberDiscount(
      validatingReg.id,
      true,
      adminNotes || 'Elegibilidade de sócio conferida na lista oficial da Atlética Cangaceira.'
    );
    setValidatingReg(null);
    setAdminNotes('');
  };

  const handleReject = async () => {
    if (!validatingReg) return;
    await validateMemberDiscount(
      validatingReg.id,
      false,
      adminNotes || 'Não localizado na listagem oficial de associados quites da Atlética.'
    );
    setValidatingReg(null);
    setAdminNotes('');
  };

  return (
    <div className="min-h-screen bg-brand-surface-muted pb-16 space-y-6">
      {/* Cabeçalho */}
      <header className="bg-brand-blue-dark text-white px-4 sm:px-8 py-4 border-b border-white/10 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-brand-yellow text-brand-blue-dark">
                  Painel de Controle Financeiro
                </span>
                <span className="text-xs text-white/70">INTRAMED IX</span>
              </div>
              <h1 className="text-base sm:text-xl font-display font-extrabold">
                Gestão de Inscrições &amp; Validação de Sócios
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExportCsv}
            >
              Exportar Planilha (CSV)
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/inscricao')}
            >
              Portal do Participante
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 space-y-6">
        {/* Métricas Financeiras e de Inscrições */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-brand-surface-border shadow-card space-y-1">
            <div className="flex items-center justify-between text-brand-text-muted">
              <span className="text-xs font-bold uppercase tracking-wider">Inscritos</span>
              <Users className="w-4 h-4 text-brand-blue" />
            </div>
            <span className="text-2xl font-display font-extrabold text-brand-text-primary block">
              {totalRegistrations}
            </span>
            <span className="text-[10px] text-brand-text-secondary">Total recebido</span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-amber-300 shadow-card space-y-1 bg-amber-50/40">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-xs font-bold uppercase tracking-wider">Sócios Pendentes</span>
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-2xl font-display font-extrabold text-amber-900 block">
              {pendingMemberCount}
            </span>
            <span className="text-[10px] text-amber-700 font-semibold">
              Exigem conferência manual
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-brand-surface-border shadow-card space-y-1">
            <div className="flex items-center justify-between text-brand-text-muted">
              <span className="text-xs font-bold uppercase tracking-wider">Aguardando Pgto</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-2xl font-display font-extrabold text-brand-text-primary block">
              {pendingPaymentCount}
            </span>
            <span className="text-[10px] text-brand-text-secondary">Valores liberados</span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-emerald-300 shadow-card space-y-1 bg-emerald-50/40">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-xs font-bold uppercase tracking-wider">Confirmados</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-2xl font-display font-extrabold text-emerald-950 block">
              {paidCount}
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold">Pagos via Mercado Pago</span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-brand-surface-border shadow-card space-y-1 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-brand-text-muted">
              <span className="text-xs font-bold uppercase tracking-wider">Arrecadação</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-2xl font-display font-extrabold text-emerald-700 block">
              R$ {totalRevenue.toFixed(2)}
            </span>
            <span className="text-[10px] text-brand-text-secondary">Líquido na conta da Atlética</span>
          </div>
        </section>

        {/* Barra de Filtros e Busca */}
        <section className="bg-white p-4 rounded-3xl border border-brand-surface-border shadow-card space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'todos', label: `Todos (${totalRegistrations})` },
                { id: 'aguardando_validacao', label: `Sócios Pendentes (${pendingMemberCount})` },
                { id: 'pendente', label: `Aguardando Pgto (${pendingPaymentCount})` },
                { id: 'pago', label: `Pagos (${paidCount})` },
                { id: 'cancelado', label: 'Cancelados' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterStatus(f.id as typeof filterStatus)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    filterStatus === f.id
                      ? 'bg-brand-blue text-white shadow-sm'
                      : 'bg-brand-surface-muted text-brand-text-secondary hover:text-brand-text-primary'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por atleta, CPF, turma..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-brand-surface-muted border border-brand-surface-border focus:outline-none focus:border-brand-blue"
              />
            </div>
          </div>

          {/* Filtro Rápido por Turma */}
          <div className="pt-2 border-t border-brand-surface-border/60 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Turma:
            </span>
            <button
              type="button"
              onClick={() => setFilterTurma('todas')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filterTurma === 'todas'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas as Turmas
            </button>
            {TURMAS_MEDICINA.map((t) => (
              <button
                key={t.turma}
                type="button"
                onClick={() => setFilterTurma(t.turma)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filterTurma === t.turma
                    ? 'bg-brand-blue text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>T{t.number} {t.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Tabela de Inscrições */}
        <section className="bg-white rounded-3xl border border-brand-surface-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-brand-surface-muted/80 border-b border-brand-surface-border text-brand-text-muted font-display font-extrabold uppercase text-[10px]">
                  <th className="py-3 px-4">Atleta / Contato</th>
                  <th className="py-3 px-3">Turma & Acesso Esportivo</th>
                  <th className="py-3 px-3">Condição de Sócio</th>
                  <th className="py-3 px-3">Valor</th>
                  <th className="py-3 px-3">Status de Pagamento</th>
                  <th className="py-3 px-4 text-right">Ações da Diretoria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-surface-border">
                {filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-brand-text-muted">
                      Nenhuma inscrição localizada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((reg) => {
                    const isPendingMember = reg.memberStatus === 'pendente';
                    const isPaid = reg.paymentStatus === 'pago';

                    return (
                      <tr key={reg.id} className="hover:bg-brand-surface-muted/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-brand-text-primary">{reg.athleteName}</div>
                          <div className="text-[11px] text-brand-text-secondary">{reg.athleteEmail}</div>
                          <div className="text-[10px] font-mono text-brand-text-muted">{reg.athleteDocument}</div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-display font-black text-slate-900 block">
                            {reg.turmaLabel || reg.teamName || ('Turma ' + reg.turma)}
                          </span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold inline-block mt-0.5">
                            Passaporte Geral (Todas as 10 Modalidades) • {reg.categoryName}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          {reg.requestedMemberDiscount ? (
                            <div className="space-y-0.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                                  reg.memberStatus === 'aprovado'
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                    : reg.memberStatus === 'rejeitado'
                                    ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                    : 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                                }`}
                              >
                                {reg.memberStatus === 'aprovado'
                                  ? '✓ SÓCIO APROVADO'
                                  : reg.memberStatus === 'rejeitado'
                                  ? '✕ DESCONTO REJEITADO'
                                  : '⏳ AGUARDANDO DIRETORIA'}
                              </span>
                              {reg.validatedByAdminName && (
                                <span className="block text-[9px] text-slate-500 truncate max-w-[150px]">
                                  Por: {reg.validatedByAdminName}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-semibold">
                              Não sócio (Integral)
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-display font-extrabold text-brand-blue text-sm">
                            R$ {reg.authorizedPrice.toFixed(2)}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : reg.paymentStatus === 'pendente'
                                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                : reg.paymentStatus === 'cancelado'
                                ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isPaid && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            {reg.paymentStatus === 'pago'
                              ? 'CONFIRMADO'
                              : reg.paymentStatus === 'pendente'
                              ? 'AGUARDANDO PGTO'
                              : reg.paymentStatus === 'cancelado'
                              ? 'CANCELADO'
                              : 'BLOQUEADO'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {/* Botão de Validar Sócio */}
                          {isPendingMember && (
                            <Button
                              variant="primary"
                              size="sm"
                              leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                              onClick={() => {
                                setValidatingReg(reg);
                                setAdminNotes('');
                              }}
                            >
                              Conferir Sócio
                            </Button>
                          )}

                          {/* Se já aprovado ou rejeitado, permite revisar */}
                          {!isPendingMember && reg.requestedMemberDiscount && !isPaid && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setValidatingReg(reg);
                                setAdminNotes(reg.memberNotes || '');
                              }}
                            >
                              Revisar Sócio
                            </Button>
                          )}

                          {/* Comprovante / Detalhes de Pagamento */}
                          {isPaid && (
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<FileText className="w-3.5 h-3.5 text-emerald-600" />}
                              onClick={() => setSelectedReceiptReg(reg)}
                            >
                              Comprovante
                            </Button>
                          )}

                          {/* Auditoria */}
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Ver histórico de auditoria"
                            onClick={() => setSelectedAuditReg(reg)}
                          >
                            <History className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* MODAL DE VALIDAÇÃO DE SÓCIO */}
      {validatingReg && (
        <Modal
          isOpen={Boolean(validatingReg)}
          onClose={() => setValidatingReg(null)}
          title="Conferência de Elegibilidade de Sócio"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-brand-surface-muted border border-brand-surface-border text-xs space-y-1.5">
              <p><strong>Atleta:</strong> {validatingReg.athleteName}</p>
              <p><strong>E-mail:</strong> {validatingReg.athleteEmail} • <strong>Tel:</strong> {validatingReg.athletePhone}</p>
              <p><strong>Documento / Matrícula:</strong> {validatingReg.athleteDocument}</p>
              <p><strong>Turma / Equipe:</strong> {validatingReg.turmaLabel || validatingReg.teamName || ('Turma ' + validatingReg.turma)}</p>
              <p><strong>Acesso Esportivo:</strong> Passaporte Geral (Todas as 10 Modalidades) • {validatingReg.categoryName}</p>
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 mt-2">
                <strong>Comprovante / Declaração anexada:</strong>{' '}
                {validatingReg.memberDocumentProofUrl || 'Declaração padrão de filiação à Atlética Cangaceira'}
              </div>
            </div>

            <Input
              label="Justificativa da Decisão (Auditoria)"
              placeholder="Ex: Conforme planilha de associados 2026 / Matrícula UEMA conferida"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-brand-surface-border">
              <Button
                variant="outline"
                size="md"
                className="border-rose-300 text-rose-600 hover:bg-rose-50 hover:border-rose-400"
                onClick={handleReject}
              >
                Rejeitar Desconto (Preço Integral R$ 80,00)
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={handleApprove}
              >
                Aprovar Sócio (Preço R$ 45,00)
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL DE COMPROVANTE MERCADO PAGO */}
      {selectedReceiptReg && (
        <Modal
          isOpen={Boolean(selectedReceiptReg)}
          onClose={() => setSelectedReceiptReg(null)}
          title="Comprovante de Pagamento — Mercado Pago"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-center space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h3 className="text-base font-display font-extrabold">Transação Confirmada</h3>
              <p className="text-xs text-emerald-800">
                O pagamento foi autenticado e auditado com sucesso via Mercado Pago Developers.
              </p>
            </div>

            <div className="text-xs space-y-2 border border-slate-200 p-4 rounded-2xl bg-slate-50 divide-y divide-slate-200">
              <div className="flex justify-between pb-1">
                <span className="text-slate-500">ID da Inscrição:</span>
                <span className="font-mono font-bold">{selectedReceiptReg.id}</span>
              </div>
              <div className="flex justify-between pt-1 pb-1">
                <span className="text-slate-500">Identificador Mercado Pago:</span>
                <span className="font-mono font-bold text-brand-blue">{selectedReceiptReg.mpPaymentId || 'MP-PIX-8930219482'}</span>
              </div>
              <div className="flex justify-between pt-1 pb-1">
                <span className="text-slate-500">Atleta:</span>
                <span className="font-bold">{selectedReceiptReg.athleteName}</span>
              </div>
              <div className="flex justify-between pt-1 pb-1">
                <span className="text-slate-500">Modalidade:</span>
                <span className="font-bold">{selectedReceiptReg.modalityName} ({selectedReceiptReg.categoryName})</span>
              </div>
              <div className="flex justify-between pt-1 pb-1">
                <span className="text-slate-500">Valor Pago:</span>
                <span className="font-display font-extrabold text-emerald-700 text-sm">
                  R$ {selectedReceiptReg.authorizedPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">Método de Pagamento:</span>
                <span className="font-bold uppercase">{selectedReceiptReg.paymentMethod || 'PIX'}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedReceiptReg(null)}>
                Fechar Comprovante
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL DE TRILHA DE AUDITORIA */}
      {selectedAuditReg && (
        <Modal
          isOpen={Boolean(selectedAuditReg)}
          onClose={() => setSelectedAuditReg(null)}
          title={`Trilha de Auditoria • ${selectedAuditReg.athleteName}`}
        >
          <div className="space-y-3">
            <p className="text-xs text-brand-text-secondary">
              Histórico imutável de eventos administrativos e transações financeiras desta inscrição:
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {auditLogs
                .filter((l) => l.entityId === selectedAuditReg.id)
                .map((log) => (
                  <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-brand-blue font-mono">{log.action}</span>
                      <span className="text-slate-500 font-mono text-[10px]">
                        {new Date(log.timestampIso).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-slate-700">
                      <strong>Responsável:</strong> {log.adminUserName || 'Sistema'}
                    </p>
                    {log.metadata && (
                      <pre className="text-[10px] bg-slate-100 p-2 rounded text-slate-800 font-mono overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedAuditReg(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
