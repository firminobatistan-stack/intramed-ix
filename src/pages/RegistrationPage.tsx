import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  Info,
  Copy,
  ExternalLink,
  ChevronRight,
  Filter,
  UserCheck,
} from 'lucide-react';
import { useRegistrationStore } from '../context/RegistrationStoreContext';
import { useCompetitionStore } from '../context/CompetitionStoreContext';
import { OFFICIAL_MODALITIES } from '../data/officialData';
import { TURMAS_MEDICINA } from '../data/registrationData';
import { SportIcon } from '../components/sports/SportIcon';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ModalitySlug, Registration, TurmaMedicina } from '../types/domain';

export const RegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, canOperateOfficialData } = useCompetitionStore();
  const isAdmin = canOperateOfficialData();

  const {
    tournamentEvent,
    activeLot,
    registrations,
    myRegistrations: contextMyRegistrations,
    hasCompletedRegistration,
    createRegistration,
    simulatePaymentConfirmation,
  } = useRegistrationStore();

  const [activeTab, setActiveTab] = useState<'nova_inscricao' | 'minhas_inscricoes'>(
    hasCompletedRegistration ? 'minhas_inscricoes' : 'nova_inscricao'
  );

  // Formulário de Nova Inscrição (Passaporte Geral por Turma)
  const [selectedTurma, setSelectedTurma] = useState<TurmaMedicina>('21');
  const [categoryName, setCategoryName] = useState<'Masculino' | 'Feminino'>('Masculino');
  const [athleteName, setAthleteName] = useState(currentUser?.name || '');
  const [athleteEmail, setAthleteEmail] = useState(currentUser?.email || '');
  const [athletePhone, setAthletePhone] = useState('');
  const [athleteDocument, setAthleteDocument] = useState('');
  const [isSocioClaim, setIsSocioClaim] = useState(true);
  const [socioDocumentProof, setSocioDocumentProof] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdRegistrationSuccess, setCreatedRegistrationSuccess] = useState<Registration | null>(null);

  // Modal de Pagamento
  const [payingRegistration, setPayingRegistration] = useState<Registration | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [copiedPix, setCopiedPix] = useState(false);

  const selectedTurmaObj = TURMAS_MEDICINA.find((t) => t.turma === selectedTurma) || TURMAS_MEDICINA[0];

  const myRegistrations: Registration[] = useMemo(() => {
    if (contextMyRegistrations && contextMyRegistrations.length > 0) return contextMyRegistrations;
    return registrations.filter((r) => {
      if (currentUser?.email && r.athleteEmail.toLowerCase() === currentUser.email.toLowerCase()) return true;
      if (athleteEmail && r.athleteEmail.toLowerCase() === athleteEmail.toLowerCase()) return true;
      return false;
    });
  }, [contextMyRegistrations, registrations, currentUser, athleteEmail]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!athleteName.trim() || !athleteEmail.trim() || !athleteDocument.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setIsSubmitting(true);
      const reg = await createRegistration({
        eventId: tournamentEvent.id,
        lotId: activeLot?.id || 'lote-1-cangaceira',
        athleteName,
        athleteEmail,
        athletePhone,
        athleteDocument,
        turma: selectedTurma,
        turmaLabel: selectedTurmaObj.fullName,
        teamId: selectedTurmaObj.teamId,
        teamName: selectedTurmaObj.name,
        categoryName,
        requestedMemberDiscount: isSocioClaim,
        memberDocumentProofUrl: isSocioClaim ? (socioDocumentProof || 'Declaração de Sócio da Atlética Cangaceira') : undefined,
      });

      setCreatedRegistrationSuccess(reg);
      setActiveTab('minhas_inscricoes');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao processar inscrição.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPix = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const currentDisplayPrice = isSocioClaim
    ? activeLot?.priceMember ?? 45.0
    : activeLot?.priceNonMember ?? 80.0;

  return (
    <div className="min-h-screen bg-brand-surface-muted pb-16 space-y-6">
      {/* Banner Superior Institucional */}
      <section className="bg-gradient-to-r from-[#0B218A] via-[#1030B5] to-[#0B218A] text-white p-6 sm:p-10 rounded-b-3xl sm:rounded-3xl shadow-card">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-brand-yellow">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Inscrições Oficiais Abertas • {tournamentEvent.edition} Edição</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-display font-extrabold tracking-tight">
              {tournamentEvent.title}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
              Garanta sua vaga nas modalidades esportivas do maior torneio universitário de Medicina.
              Sócios ativos da <strong>A.A.A. Cangaceira</strong> têm direito a valor reduzido mediante conferência administrativa.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 sm:p-5 rounded-2xl shrink-0 text-center space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/70 block">
              {activeLot?.name || '1º Lote'}
            </span>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-xs font-bold">R$</span>
              <span className="text-3xl font-display font-extrabold text-brand-yellow">
                {activeLot?.priceMember.toFixed(2)}
              </span>
              <span className="text-xs text-white/80">(Sócio)</span>
            </div>
            <span className="text-[11px] text-white/70 block">
              Não sócio: R$ {activeLot?.priceNonMember.toFixed(2)}
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Navegação entre Formulário e Minhas Inscrições */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-brand-surface-border pb-3">
          <div className="inline-flex items-center justify-center bg-white p-1 rounded-2xl border border-brand-surface-border shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab('nova_inscricao')}
              className={`px-4 py-2 rounded-xl text-xs font-display font-bold transition-all ${
                activeTab === 'nova_inscricao'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'text-brand-text-secondary hover:text-brand-text-primary'
              }`}
            >
              Nova Inscrição
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('minhas_inscricoes')}
              className={`px-4 py-2 rounded-xl text-xs font-display font-bold transition-all ${
                activeTab === 'minhas_inscricoes'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'text-brand-text-secondary hover:text-brand-text-primary'
              }`}
            >
              Minhas Inscrições ({myRegistrations.length})
            </button>
          </div>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ShieldCheck className="w-4 h-4 text-brand-blue" />}
              onClick={() => navigate('/admin/inscricoes')}
            >
              Painel Admin de Inscrições
            </Button>
          )}
        </div>

        {/* ============================================================ */}
        {/* ABA 1: FORMULÁRIO DE NOVA INSCRIÇÃO                          */}
        {/* ============================================================ */}
        {activeTab === 'nova_inscricao' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <form
              onSubmit={handleRegisterSubmit}
              className="lg:col-span-8 bg-white rounded-3xl border border-brand-surface-border p-6 shadow-card space-y-6"
            >
              <div className="border-b border-brand-surface-border pb-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-[11px] font-display font-extrabold uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Passaporte Esportivo Unificado INTRAMED IX
                </div>
                <h2 className="text-lg font-display font-extrabold text-brand-text-primary">
                  1. Selecione a sua Turma de Medicina UEMA
                </h2>
                <p className="text-xs text-brand-text-secondary mt-1">
                  Escolha o período pelo qual você irá competir. Ao se inscrever, você adquire o <strong>Passaporte Geral</strong> e tem direito a disputar <strong>todas as modalidades esportivas</strong>!
                </p>
              </div>

              {/* Seletor das 5 Turmas Oficiais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {TURMAS_MEDICINA.map((t) => {
                  const isSelected = selectedTurma === t.turma;
                  return (
                    <button
                      key={t.turma}
                      type="button"
                      onClick={() => setSelectedTurma(t.turma)}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'border-brand-blue bg-blue-50/70 shadow-md ring-2 ring-brand-blue/30'
                          : 'border-brand-surface-border bg-white hover:border-slate-300 hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-sm flex items-center justify-center">
                            <img
                              src={t.crestUrl}
                              alt={t.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                              Turma {t.number}
                            </span>
                            <span className="text-sm font-display font-black text-slate-900 leading-tight block">
                              {t.name}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black ${
                            isSelected
                              ? 'bg-brand-blue text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          T{t.number}
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-500 leading-tight">
                        {t.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Card Destaque: Acesso Liberado a Todas as Modalidades */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 border border-blue-200/80 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs font-display font-extrabold text-blue-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Inscrição Única: Acesso Liberado a Todas as 10 Modalidades</span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
                    Sem taxa adicional por esporte
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Você não precisa escolher uma única modalidade. Represente a <strong>{selectedTurmaObj.fullName}</strong> no futsal, basquete, vôlei ou em quantas modalidades for escalado(a)!
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {OFFICIAL_MODALITIES.map((mod) => (
                    <span
                      key={mod.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-blue-200/60 text-[10px] font-bold text-slate-700 shadow-2xs"
                    >
                      <SportIcon iconKey={mod.iconKey} className="w-3 h-3 text-brand-blue" />
                      <span>{mod.name}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Categoria: Masculino vs Feminino */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-brand-text-primary block">
                  Categoria Principal do(a) Atleta
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  {(['Masculino', 'Feminino'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryName(cat)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                        categoryName === cat
                          ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
                          : 'border-brand-surface-border text-brand-text-secondary hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dados do Atleta */}
              <div className="border-t border-brand-surface-border pt-4 space-y-4">
                <h2 className="text-lg font-display font-extrabold text-brand-text-primary">
                  2. Dados do Participante
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Nome Completo *"
                    placeholder="Ex: Lucas Ferreira Silva"
                    value={athleteName}
                    onChange={(e) => setAthleteName(e.target.value)}
                    required
                  />
                  <Input
                    label="E-mail de Contato *"
                    type="email"
                    placeholder="lucas@aluno.uema.br"
                    value={athleteEmail}
                    onChange={(e) => setAthleteEmail(e.target.value)}
                    required
                  />
                  <Input
                    label="Telefone / WhatsApp *"
                    placeholder="(98) 98888-7777"
                    value={athletePhone}
                    onChange={(e) => setAthletePhone(e.target.value)}
                    required
                  />
                  <Input
                    label="CPF ou Matrícula Universitária *"
                    placeholder="000.000.000-00"
                    value={athleteDocument}
                    onChange={(e) => setAthleteDocument(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Seção de Sócio da Atlética */}
              <div className="border-t border-brand-surface-border pt-4 space-y-3">
                <h2 className="text-lg font-display font-extrabold text-brand-text-primary">
                  3. Condição de Sócio da Atlética Cangaceira
                </h2>

                <div
                  onClick={() => setIsSocioClaim(!isSocioClaim)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    isSocioClaim
                      ? 'bg-emerald-50/70 border-emerald-400 text-emerald-950'
                      : 'bg-brand-surface-muted border-brand-surface-border text-brand-text-secondary'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSocioClaim}
                    onChange={(e) => setIsSocioClaim(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="space-y-1">
                    <span className="text-sm font-display font-extrabold block">
                      Solicitar Preço Promocional de Sócio da Atlética Cangaceira
                    </span>
                    <p className="text-xs text-brand-text-secondary leading-relaxed">
                      Marque esta opção se você é associado quite da A.A.A. Cangaceira.
                      Sua solicitação será analisada manualmente pela diretoria antes de liberar o valor com desconto.
                    </p>
                  </div>
                </div>

                {isSocioClaim && (
                  <div className="space-y-3 p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                    <div className="flex items-center gap-2 font-bold">
                      <Info className="w-4 h-4 text-amber-700" />
                      <span>Regra Fundamental de Elegibilidade</span>
                    </div>
                    <p>
                      A escolha desta opção <strong>não aplica o desconto imediatamente</strong>.
                      A diretoria da Atlética irá conferir a lista de associados. Assim que aprovada, você receberá a confirmação para efetuar o pagamento de <strong>R$ {activeLot?.priceMember.toFixed(2)}</strong>.
                    </p>
                    <Input
                      label="Nº da Carteirinha ou Comprovante de Matrícula (opcional)"
                      placeholder="Ex: Matrícula UEMA 2023.2 ou nº de associado"
                      value={socioDocumentProof}
                      onChange={(e) => setSocioDocumentProof(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Botão de Envio */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? 'Processando Inscrição...'
                    : `Confirmar Inscrição • R$ ${currentDisplayPrice.toFixed(2)}`}
                </Button>
              </div>
            </form>

            {/* Resumo Lateral do Pedido */}
            <aside className="lg:col-span-4 bg-white rounded-3xl border border-brand-surface-border p-6 shadow-card space-y-5">
              <h3 className="text-base font-display font-extrabold text-brand-text-primary uppercase tracking-tight">
                Resumo da Inscrição
              </h3>

              <div className="space-y-3 text-xs divide-y divide-brand-surface-border">
                <div className="flex justify-between pt-2">
                  <span className="text-brand-text-secondary">Competição:</span>
                  <span className="font-bold text-brand-text-primary">INTRAMED IX (2026)</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-brand-text-secondary">Lote Vigente:</span>
                  <span className="font-bold text-brand-text-primary">{activeLot?.name}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-brand-text-secondary">Turma Escolhida:</span>
                  <span className="font-bold text-brand-text-primary">{selectedTurmaObj.fullName}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-brand-text-secondary">Modalidades:</span>
                  <span className="font-bold text-emerald-600">Acesso a Todas (10)</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-brand-text-secondary">Categoria Principal:</span>
                  <span className="font-bold text-brand-text-primary">{categoryName}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-brand-text-secondary">Condição do Atleta:</span>
                  <span className="font-bold text-brand-text-primary">
                    {isSocioClaim ? 'Sócio da Atlética (Em análise)' : 'Não Sócio (Integral)'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-brand-surface-muted border border-brand-surface-border text-center space-y-1">
                <span className="text-xs font-semibold text-brand-text-secondary block">
                  Valor Estimado da Inscrição:
                </span>
                <span className="text-3xl font-display font-extrabold text-brand-blue">
                  R$ {currentDisplayPrice.toFixed(2)}
                </span>
                <span className="text-[11px] text-brand-text-muted block">
                  Pagamento seguro via Mercado Pago (Pix ou Cartão)
                </span>
              </div>

              <div className="text-[11px] text-brand-text-secondary space-y-2 leading-relaxed">
                <p className="flex items-start gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Seus dados são protegidos e auditados pelo comitê organizador da Atlética Cangaceira.</span>
                </p>
                <p className="flex items-start gap-1.5">
                  <QrCode className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                  <span>QR Code Pix dinâmico gerado instantaneamente no checkout.</span>
                </p>
              </div>
            </aside>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 2: MINHAS INSCRIÇÕES E STATUS                            */}
        {/* ============================================================ */}
        {activeTab === 'minhas_inscricoes' && (
          <div className="space-y-4">
            {myRegistrations.length === 0 ? (
              <div className="bg-white rounded-3xl border border-brand-surface-border p-10 text-center space-y-3 shadow-card">
                <Info className="w-10 h-10 text-brand-blue mx-auto" />
                <h3 className="text-base font-display font-extrabold text-brand-text-primary">
                  Nenhuma inscrição localizada
                </h3>
                <p className="text-xs text-brand-text-secondary max-w-sm mx-auto">
                  Você ainda não possui inscrições registradas com seu e-mail. Utilize a aba &quot;Nova Inscrição&quot; para registrar-se.
                </p>
                <Button variant="primary" size="sm" onClick={() => setActiveTab('nova_inscricao')}>
                  Fazer Inscrição Agora
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myRegistrations.map((reg) => {
                  const isPendingValidation = reg.memberStatus === 'pendente';
                  const isApprovedWaitPay = reg.paymentStatus === 'pendente';
                  const isPaid = reg.paymentStatus === 'pago';

                  return (
                    <div
                      key={reg.id}
                      className="bg-white rounded-3xl border border-brand-surface-border p-5 shadow-card space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-brand-blue bg-brand-blue-light/50 px-2 py-0.5 rounded">
                              ID: {reg.id.toUpperCase()}
                            </span>
                            <h3 className="text-base font-display font-extrabold text-brand-text-primary mt-1">
                              {reg.turmaLabel || reg.teamName}
                            </h3>
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block mt-1">
                              Passaporte Geral • Todas as Modalidades ({reg.categoryName})
                            </span>
                          </div>

                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : isPendingValidation
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-blue-100 text-blue-900 border border-blue-300'
                            }`}
                          >
                            {isPaid
                              ? '✓ PAGO & CONFIRMADO'
                              : isPendingValidation
                              ? 'EM ANÁLISE DE SÓCIO'
                              : 'LIBERADO PARA PAGAR'}
                          </span>
                        </div>

                        <div className="text-xs space-y-1 text-brand-text-secondary">
                          <p><strong>Atleta:</strong> {reg.athleteName}</p>
                          <p><strong>E-mail:</strong> {reg.athleteEmail}</p>
                          <p>
                            <strong>Condição:</strong>{' '}
                            {reg.requestedMemberDiscount
                              ? `Sócio da Atlética (${reg.memberStatus.toUpperCase()})`
                              : 'Não Sócio'}
                          </p>
                          {reg.memberNotes && (
                            <p className="text-[11px] text-slate-500 italic">
                              Nota da Diretoria: {reg.memberNotes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Bloco de Valor e Ação */}
                      <div className="border-t border-brand-surface-border pt-3 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] text-brand-text-muted block">Valor Autorizado:</span>
                          <span className="text-xl font-display font-extrabold text-brand-blue">
                            R$ {reg.authorizedPrice.toFixed(2)}
                          </span>
                        </div>

                        <div>
                          {isPendingValidation ? (
                            <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 inline-block text-center">
                              Aguardando aprovação
                            </span>
                          ) : isPaid ? (
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Inscrição Confirmada</span>
                            </span>
                          ) : (
                            <Button
                              variant="accent"
                              size="sm"
                              leftIcon={<CreditCard className="w-4 h-4" />}
                              onClick={() => setPayingRegistration(reg)}
                            >
                              Pagar Inscrição
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL DE CHECKOUT / PAGAMENTO PIX & MERCADO PAGO */}
      {payingRegistration && (
        <Modal
          isOpen={Boolean(payingRegistration)}
          onClose={() => setPayingRegistration(null)}
          title="Pagamento Seguro da Inscrição"
        >
          <div className="space-y-5">
            <div className="p-3.5 rounded-2xl bg-brand-surface-muted border border-brand-surface-border flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-brand-text-primary block">
                  {payingRegistration.modalityName} ({payingRegistration.categoryName})
                </span>
                <span className="text-[11px] text-brand-text-secondary">
                  Atleta: {payingRegistration.athleteName}
                </span>
              </div>
              <span className="text-xl font-display font-extrabold text-brand-blue">
                R$ {payingRegistration.authorizedPrice.toFixed(2)}
              </span>
            </div>

            {/* Alternador Pix vs Cartão */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`p-3 rounded-xl border-2 font-display font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === 'pix'
                    ? 'border-brand-blue bg-brand-blue-light/50 text-brand-blue shadow-sm'
                    : 'border-brand-surface-border text-brand-text-secondary'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Pix Instantâneo</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('credit_card')}
                className={`p-3 rounded-xl border-2 font-display font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === 'credit_card'
                    ? 'border-brand-blue bg-brand-blue-light/50 text-brand-blue shadow-sm'
                    : 'border-brand-surface-border text-brand-text-secondary'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Cartão de Crédito</span>
              </button>
            </div>

            {paymentMethod === 'pix' ? (
              <div className="space-y-4 text-center">
                {/* QR Code Simulado Dinâmico */}
                <div className="w-44 h-44 mx-auto bg-white border-2 border-slate-300 rounded-2xl p-2 flex flex-col items-center justify-center shadow-sm">
                  <div className="w-full h-full border border-dashed border-slate-400 rounded-xl flex flex-col items-center justify-center bg-slate-50">
                    <QrCode className="w-20 h-20 text-brand-blue" />
                    <span className="text-[10px] font-bold text-slate-600 mt-1">QR Code Pix Oficial</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Pix Copia e Cola:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`00020126580014br.gov.bcb.pix0136intramed-cangaceira-ix520400005303986540${payingRegistration.authorizedPrice.toFixed(2)}5802BR5925AAA CANGACEIRA MEDICINA6009SAO LUIS62070503***6304E8A2`}
                      className="w-full text-xs font-mono bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-2 truncate select-all"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        handleCopyPix(
                          `00020126580014br.gov.bcb.pix0136intramed-cangaceira-ix520400005303986540${payingRegistration.authorizedPrice.toFixed(2)}5802BR5925AAA CANGACEIRA MEDICINA6009SAO LUIS62070503***6304E8A2`
                        )
                      }
                      leftIcon={<Copy className="w-3.5 h-3.5" />}
                    >
                      {copiedPix ? 'Copiado!' : 'Copiar'}
                    </Button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed text-left">
                  <strong>Instruções:</strong> Abra o aplicativo do seu banco, escolha <strong>Pix Copia e Cola</strong> ou aponte a câmera para o QR Code. A confirmação é processada automaticamente via Mercado Pago Developers.
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <CreditCard className="w-4 h-4 text-brand-blue" />
                  <span>Mercado Pago Checkout Pro</span>
                </div>
                <p>
                  Você será redirecionado para o ambiente seguro e criptografado do Mercado Pago para efetuar o pagamento com cartão de crédito (com opção de parcelamento). O IntraMed não armazena dados confidenciais do seu cartão.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-brand-surface-border">
              <Button variant="ghost" size="sm" onClick={() => setPayingRegistration(null)}>
                Voltar
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={async () => {
                  await simulatePaymentConfirmation(payingRegistration.id, paymentMethod);
                  setPayingRegistration(null);
                  alert('Pagamento confirmado com sucesso! Sua inscrição no INTRAMED IX está garantida.');
                }}
              >
                Confirmar Pagamento Realizado
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
