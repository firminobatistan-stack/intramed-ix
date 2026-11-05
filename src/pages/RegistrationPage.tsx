import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Info,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Camera,
  User,
  Users,
  Heart,
  Search,
  Shirt,
  Instagram,
  Trophy,
  Check,
} from 'lucide-react';
import { useRegistrationStore } from '../context/RegistrationStoreContext';
import { useCompetitionStore } from '../context/CompetitionStoreContext';
import { OFFICIAL_MODALITIES } from '../data/officialData';
import { TURMAS_MEDICINA } from '../data/registrationData';
import { SportIcon } from '../components/sports/SportIcon';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ModalitySlug, Registration, TurmaMedicina } from '../types/domain';

function compressImageToDataUrl(file: File, maxSize = 260): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagem inválida.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const RegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const {
    currentUser,
    canOperateOfficialData,
    visibleAthletes,
    visibleTeams,
    favoriteAthleteIds,
    toggleFavoriteAthlete,
  } = useCompetitionStore();
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

  const [activeTab, setActiveTab] = useState<
    'nova_inscricao' | 'minhas_inscricoes' | 'comunidade'
  >(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'comunidade') return 'comunidade';
    if (searchParams.get('status') || hasCompletedRegistration) return 'minhas_inscricoes';
    return 'nova_inscricao';
  });

  // Formulário de Nova Inscrição + Perfil Social do Atleta
  const [selectedTurma, setSelectedTurma] = useState<TurmaMedicina>('21');
  const [categoryName, setCategoryName] = useState<'Masculino' | 'Feminino'>('Masculino');
  const [athleteName, setAthleteName] = useState(currentUser?.name || '');
  const [athleteEmail, setAthleteEmail] = useState(currentUser?.email || '');
  const [athletePhone, setAthletePhone] = useState('');
  const [athleteDocument, setAthleteDocument] = useState('');

  // Campos de Perfil Social / Rede Social do Torneio
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUser?.avatarUrl || null);
  const [jerseyNumber, setJerseyNumber] = useState<string>('');
  const [position, setPosition] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [instagramHandle, setInstagramHandle] = useState<string>('');
  const [selectedModalities, setSelectedModalities] = useState<ModalitySlug[]>(
    () => OFFICIAL_MODALITIES.map((m) => m.id)
  );

  const [isSocioClaim, setIsSocioClaim] = useState(true);
  const [socioDocumentProof, setSocioDocumentProof] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtros da Comunidade / Rede Social
  const [communitySearch, setCommunitySearch] = useState('');
  const [communityTeamFilter, setCommunityTeamFilter] = useState<string>('all');

  // Modal de Pagamento
  const [payingRegistration, setPayingRegistration] = useState<Registration | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [copiedPix, setCopiedPix] = useState(false);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{
    paymentId: number;
    qrCode?: string;
    qrCodeBase64?: string;
    ticketUrl?: string;
    dateOfExpiration?: string;
    amount?: number;
  } | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentApprovedSuccess, setPaymentApprovedSuccess] = useState(false);
  const [isCreatingCardPreference, setIsCreatingCardPreference] = useState(false);
  const [pixRetryCount, setPixRetryCount] = useState(0);

  const selectedTurmaObj =
    TURMAS_MEDICINA.find((t) => t.turma === selectedTurma) || TURMAS_MEDICINA[0];

  const myRegistrations: Registration[] = useMemo(() => {
    if (contextMyRegistrations && contextMyRegistrations.length > 0)
      return contextMyRegistrations;
    return registrations.filter((r) => {
      if (
        currentUser?.email &&
        r.athleteEmail.toLowerCase() === currentUser.email.toLowerCase()
      )
        return true;
      if (athleteEmail && r.athleteEmail.toLowerCase() === athleteEmail.toLowerCase())
        return true;
      return false;
    });
  }, [contextMyRegistrations, registrations, currentUser, athleteEmail]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Selecione uma imagem válida (JPG, PNG ou WEBP).');
      return;
    }
    try {
      const dataUrl = await compressImageToDataUrl(file, 260);
      setAvatarUrl(dataUrl);
    } catch {
      alert('Não foi possível carregar a foto. Tente outra imagem.');
    }
  };

  const toggleModalitySelection = (modId: ModalitySlug) => {
    setSelectedModalities((prev) => {
      if (prev.includes(modId)) {
        if (prev.length <= 1) return prev; // Mantém ao menos 1 selecionada
        return prev.filter((id) => id !== modId);
      }
      return [...prev, modId];
    });
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!athleteName.trim() || !athleteEmail.trim() || !athleteDocument.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios (Nome, E-mail e CPF/Matrícula).');
      return;
    }

    try {
      setIsSubmitting(true);
      const parsedJersey = jerseyNumber.trim()
        ? parseInt(jerseyNumber.trim(), 10)
        : null;

      await createRegistration({
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
        selectedModalities,
        categoryName,
        requestedMemberDiscount: isSocioClaim,
        memberDocumentProofUrl: isSocioClaim
          ? socioDocumentProof || 'Declaração de Sócio da Atlética Cangaceira'
          : undefined,
        avatarUrl,
        jerseyNumber: parsedJersey && !Number.isNaN(parsedJersey) ? parsedJersey : null,
        position: position.trim() || 'Atleta Oficial',
        bio: bio.trim() || null,
        instagramHandle: instagramHandle.trim() || null,
      });

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

  // Helper de requisição resiliente: tenta o domínio atual e, caso esteja em domínio secundário sem token,
  // redireciona de forma transparente para o servidor principal (intramedix.vercel.app)
  const fetchGatewayApi = async (
    path: string,
    options?: RequestInit
  ): Promise<Response> => {
    const localRes = await fetch(path, options).catch(() => null);
    if (localRes && localRes.status !== 500 && localRes.status !== 404) {
      return localRes;
    }
    return fetch(`https://intramedix.vercel.app${path}`, options);
  };

  // Efeito para gerar o Pix Oficial via API do Mercado Pago
  useEffect(() => {
    if (!payingRegistration || paymentMethod !== 'pix') {
      setPixData(null);
      setPixError(null);
      setPaymentApprovedSuccess(false);
      return;
    }

    let isMounted = true;
    setPixLoading(true);
    setPixError(null);
    setPaymentApprovedSuccess(false);

    fetchGatewayApi('/api/mercadopago/create-pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationId: payingRegistration.id,
        athleteName: payingRegistration.athleteName,
        athleteEmail: payingRegistration.athleteEmail,
        athleteDocument: payingRegistration.athleteDocument,
        turmaLabel: payingRegistration.turmaLabel,
        authorizedPrice: payingRegistration.authorizedPrice,
        memberStatus: payingRegistration.memberStatus,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Erro ao gerar Pix no Mercado Pago.');
        }
        return data;
      })
      .then((data) => {
        if (!isMounted) return;
        setPixData({
          paymentId: data.paymentId,
          qrCode: data.qrCode,
          qrCodeBase64: data.qrCodeBase64,
          ticketUrl: data.ticketUrl,
          dateOfExpiration: data.dateOfExpiration,
          amount: data.amount,
        });
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Pix generation error:', err);
        setPixError(err.message || 'Falha ao gerar QR Code Pix.');
      })
      .finally(() => {
        if (isMounted) setPixLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [payingRegistration, paymentMethod, pixRetryCount]);

  // Polling em background para verificar confirmação automática do Pix
  useEffect(() => {
    if (!pixData?.paymentId || !payingRegistration || paymentApprovedSuccess) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetchGatewayApi(
          `/api/mercadopago/check-payment?paymentId=${pixData.paymentId}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.isApproved) {
          setPaymentApprovedSuccess(true);
          await simulatePaymentConfirmation(
            payingRegistration.id,
            'pix',
            String(pixData.paymentId)
          );
        }
      } catch {
        // Silencioso em polling de background
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [
    pixData?.paymentId,
    payingRegistration,
    paymentApprovedSuccess,
    simulatePaymentConfirmation,
  ]);

  const handleCheckPaymentManual = async () => {
    if (!pixData?.paymentId || !payingRegistration) return;
    setIsCheckingPayment(true);
    try {
      const res = await fetchGatewayApi(
        `/api/mercadopago/check-payment?paymentId=${pixData.paymentId}`
      );
      const data = await res.json();
      if (data.isApproved) {
        setPaymentApprovedSuccess(true);
        await simulatePaymentConfirmation(
          payingRegistration.id,
          'pix',
          String(pixData.paymentId)
        );
      } else {
        alert(
          'Pagamento ainda em processamento pelo Mercado Pago. Se você já transferiu pelo seu banco, aguarde alguns instantes que a confirmação é automática!'
        );
      }
    } catch {
      alert(
        'Não foi possível consultar o status do pagamento no momento. Tente novamente.'
      );
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // Cálculo do acréscimo de taxa operadora para pagamento via Cartão de Crédito
  const CARD_FEE_RATE = 0.05; // 5% de taxa administrativa repassada
  const cardFeeAmount = payingRegistration
    ? Math.round(payingRegistration.authorizedPrice * CARD_FEE_RATE * 100) / 100
    : 0;
  const cardTotalPrice = payingRegistration
    ? payingRegistration.authorizedPrice + cardFeeAmount
    : 0;

  const handleCardCheckout = async () => {
    if (!payingRegistration) return;
    setIsCreatingCardPreference(true);
    try {
      const res = await fetchGatewayApi('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: payingRegistration.id,
          athleteName: payingRegistration.athleteName,
          athleteEmail: payingRegistration.athleteEmail,
          athleteDocument: payingRegistration.athleteDocument,
          turmaLabel: payingRegistration.turmaLabel,
          authorizedPrice: payingRegistration.authorizedPrice,
          memberStatus: payingRegistration.memberStatus,
          isCreditCard: true,
          cardFeeAmount: cardFeeAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.initPoint) {
        throw new Error(
          data.error || 'Erro ao gerar checkout do cartão no Mercado Pago.'
        );
      }

      window.location.href = data.initPoint;
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Falha ao iniciar pagamento com cartão.'
      );
    } finally {
      setIsCreatingCardPreference(false);
    }
  };

  // Lista filtrada para a Comunidade / Rede Social de Atletas Inscritos
  const filteredCommunityAthletes = useMemo(() => {
    const q = communitySearch.trim().toLowerCase();
    return visibleAthletes.filter((ath) => {
      if (communityTeamFilter !== 'all' && ath.teamId !== communityTeamFilter) {
        return false;
      }
      if (!q) return true;
      return (
        ath.name.toLowerCase().includes(q) ||
        (ath.position && ath.position.toLowerCase().includes(q)) ||
        (ath.instagramHandle && ath.instagramHandle.toLowerCase().includes(q)) ||
        (ath.turmaLabel && ath.turmaLabel.toLowerCase().includes(q))
      );
    });
  }, [visibleAthletes, communitySearch, communityTeamFilter]);

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
              <span>
                Inscrições &amp; Comunidade Oficial • {tournamentEvent.edition} Edição
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-display font-extrabold tracking-tight">
              {tournamentEvent.title}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
              Inscreva-se, personalize seu perfil de atleta com foto e camisa, e conecte-se com todos os colegas das 5 turmas na comunidade oficial do torneio!
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
        {/* Navegação entre Formulário, Minhas Inscrições e Comunidade Social */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-brand-surface-border pb-3">
          <div className="inline-flex flex-wrap items-center justify-center bg-white p-1 rounded-2xl border border-brand-surface-border shadow-sm gap-1">
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
              Meu Passaporte ({myRegistrations.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('comunidade')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-display font-bold transition-all ${
                activeTab === 'comunidade'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'text-brand-text-secondary hover:text-brand-text-primary'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Comunidade &amp; Inscritos ({visibleAthletes.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {currentUser?.linkedAthleteId && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<User className="w-4 h-4 text-brand-blue" />}
                onClick={() => navigate(`/atleta/${currentUser.linkedAthleteId}`)}
              >
                Meu Perfil Social
              </Button>
            )}
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
        </div>

        {/* ============================================================ */}
        {/* ABA 1: FORMULÁRIO DE NOVA INSCRIÇÃO + PERFIL SOCIAL          */}
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
                  Passaporte Esportivo Unificado + Perfil na Comunidade
                </div>
                <h2 className="text-lg font-display font-extrabold text-brand-text-primary">
                  1. Selecione a sua Turma de Medicina UEMA
                </h2>
                <p className="text-xs text-brand-text-secondary mt-1">
                  Escolha o período pelo qual você irá competir. Ao se inscrever, seu perfil oficial já fica ativo na <strong>Comunidade IntraMed</strong> junto com a sua turma!
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
                  2. Dados Pessoais &amp; Conta de Acesso
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
                    label="E-mail de Contato (Usado para Login) *"
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

              {/* Perfil Social do Atleta (Foto, Camisa, Posição, Instagram e Modalidades) */}
              <div className="border-t border-brand-surface-border pt-4 space-y-4">
                <div>
                  <h2 className="text-lg font-display font-extrabold text-brand-text-primary">
                    3. Seu Perfil na Comunidade IntraMed (Visível para Todos)
                  </h2>
                  <p className="text-xs text-brand-text-secondary mt-0.5">
                    Personalize seu card de atleta para aparecer na listagem da sua turma e nas escalações ao vivo. Você poderá editar tudo depois quando quiser!
                  </p>
                </div>

                {/* Upload de Foto + Camisa + Posição + Instagram */}
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-full bg-brand-blue/10 border-2 border-brand-blue/30 flex items-center justify-center overflow-hidden shadow-sm">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Foto de perfil"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-9 h-9 text-brand-blue" />
                      )}
                    </div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-brand-yellow text-[#0B218A] border-2 border-white shadow flex items-center justify-center hover:scale-105 transition-transform"
                      title="Escolher foto de perfil"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label="Nº da Camisa"
                      type="number"
                      placeholder="Ex: 10"
                      value={jerseyNumber}
                      onChange={(e) => setJerseyNumber(e.target.value)}
                    />
                    <Input
                      label="Posição / Função"
                      placeholder="Ex: Ala / Fixo / Goleiro"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                    />
                    <Input
                      label="@Instagram (Opcional)"
                      placeholder="@seu.insta"
                      value={instagramHandle}
                      onChange={(e) => setInstagramHandle(e.target.value)}
                    />
                  </div>
                </div>

                <Input
                  label="Frase / Bio Esportiva no Perfil (Opcional)"
                  placeholder="Ex: Rumo ao título pela Sanguinária! 🔥"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />

                {/* Modalidades em que pretende atuar (Passaporte dá direito a todas) */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 border border-blue-200/80 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-xs font-display font-extrabold text-blue-950">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>
                        Passaporte Geral: Selecione as Modalidades que você joga ({selectedModalities.length})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedModalities(OFFICIAL_MODALITIES.map((m) => m.id))
                      }
                      className="text-[10px] font-bold text-brand-blue underline"
                    >
                      Marcar todas as 10
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Sua inscrição dá direito a todas as modalidades sem custo extra. Toque abaixo para destacar no seu perfil quais esportes você vai disputar pela <strong>{selectedTurmaObj.fullName}</strong>:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {OFFICIAL_MODALITIES.map((mod) => {
                      const isModSelected = selectedModalities.includes(mod.id);
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => toggleModalitySelection(mod.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${
                            isModSelected
                              ? 'bg-brand-blue text-white border-brand-blue shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-brand-blue/40'
                          }`}
                        >
                          <SportIcon
                            iconKey={mod.iconKey}
                            className={`w-3.5 h-3.5 ${
                              isModSelected ? 'text-brand-yellow' : 'text-brand-blue'
                            }`}
                          />
                          <span>{mod.name}</span>
                          {isModSelected && <Check className="w-3 h-3 text-brand-yellow" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Seção de Sócio da Atlética */}
              <div className="border-t border-brand-surface-border pt-4 space-y-3">
                <h2 className="text-lg font-display font-extrabold text-brand-text-primary">
                  4. Condição de Sócio da Atlética Cangaceira
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
                    ? 'Criando Inscrição e Perfil Social...'
                    : `Confirmar Inscrição & Criar Perfil • R$ ${currentDisplayPrice.toFixed(2)}`}
                </Button>
              </div>
            </form>

            {/* Resumo Lateral do Pedido + Prévia do Card Social */}
            <aside className="lg:col-span-4 space-y-5">
              {/* Prévia ao vivo do Card na Comunidade */}
              <div className="bg-white rounded-3xl border border-brand-surface-border p-5 shadow-card space-y-3">
                <span className="text-[10px] font-display font-extrabold uppercase tracking-wider text-brand-blue block">
                  Prévia do seu Card na Comunidade
                </span>
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-full bg-brand-blue/10 border-2 border-brand-blue/30 flex items-center justify-center overflow-hidden shrink-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-7 h-7 text-brand-blue" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-brand-blue text-white text-[10px] font-mono font-black">
                        #{jerseyNumber || '—'}
                      </span>
                      <h4 className="text-sm font-display font-extrabold text-slate-900 truncate">
                        {athleteName.trim() || 'Seu Nome de Atleta'}
                      </h4>
                    </div>
                    <p className="text-xs font-bold text-brand-blue truncate mt-0.5">
                      {selectedTurmaObj.fullName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {position.trim() || 'Atleta Oficial'} • {selectedModalities.length} modalidades
                    </p>
                  </div>
                </div>
                {bio.trim() && (
                  <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                    &ldquo;{bio.trim()}&rdquo;
                  </p>
                )}
              </div>

              <div className="bg-white rounded-3xl border border-brand-surface-border p-6 shadow-card space-y-5">
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
                    <span className="font-bold text-brand-text-primary">
                      {selectedTurmaObj.fullName}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-brand-text-secondary">Modalidades:</span>
                    <span className="font-bold text-emerald-600">
                      {selectedModalities.length} selecionada(s)
                    </span>
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
                    <span>
                      Ao concluir, sua conta de atleta fica salva e você já pode acessar e editar seu perfil de qualquer aparelho.
                    </span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <QrCode className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                    <span>QR Code Pix dinâmico gerado instantaneamente no checkout.</span>
                  </p>
                </div>
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
                  Nenhuma inscrição localizada neste dispositivo
                </h3>
                <p className="text-xs text-brand-text-secondary max-w-md mx-auto">
                  Se você já se inscreveu em outro aparelho, faça login com seu E-mail ou CPF na tela de Login para recuperar seu passaporte e perfil social, ou crie uma nova inscrição.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveTab('nova_inscricao')}
                  >
                    Fazer Inscrição Agora
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/login')}
                  >
                    Já sou inscrito (Entrar na Conta)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myRegistrations.map((reg) => {
                  const isPendingValidation = reg.memberStatus === 'pendente';
                  const isPaid = reg.paymentStatus === 'pago';
                  const athleteProfileId = reg.linkedAthleteId || `ath-${reg.id}`;

                  return (
                    <div
                      key={reg.id}
                      className="bg-white rounded-3xl border border-brand-surface-border p-5 shadow-card space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-brand-blue/10 border border-brand-blue/25 overflow-hidden flex items-center justify-center shrink-0">
                              {reg.avatarUrl ? (
                                <img
                                  src={reg.avatarUrl}
                                  alt={reg.athleteName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-6 h-6 text-brand-blue" />
                              )}
                            </div>
                            <div>
                              <span className="text-[10px] font-mono font-bold text-brand-blue bg-brand-blue-light/50 px-2 py-0.5 rounded">
                                ID: {reg.id.toUpperCase()}
                              </span>
                              <h3 className="text-base font-display font-extrabold text-brand-text-primary mt-0.5">
                                {reg.athleteName}
                              </h3>
                              <p className="text-xs font-bold text-brand-blue">
                                {reg.turmaLabel || reg.teamName}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
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

                        <div className="text-xs space-y-1 text-brand-text-secondary bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                          <p>
                            <strong>Camisa / Posição:</strong> #{reg.jerseyNumber || '—'} •{' '}
                            {reg.position || 'Atleta Oficial'}
                          </p>
                          <p>
                            <strong>E-mail da Conta:</strong> {reg.athleteEmail}
                          </p>
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

                      {/* Bloco de Valor e Ações (Pagamento + Ver Perfil Social) */}
                      <div className="border-t border-brand-surface-border pt-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] text-brand-text-muted block">
                            Valor Autorizado:
                          </span>
                          <span className="text-xl font-display font-extrabold text-brand-blue">
                            R$ {reg.authorizedPrice.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<User className="w-3.5 h-3.5" />}
                            onClick={() => navigate(`/atleta/${athleteProfileId}`)}
                          >
                            Ver/Editar Perfil
                          </Button>

                          {isPendingValidation ? (
                            <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 inline-block text-center">
                              Aguardando aprovação
                            </span>
                          ) : isPaid ? (
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Passaporte Ativo</span>
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

        {/* ============================================================ */}
        {/* ABA 3: COMUNIDADE & REDE SOCIAL DOS INSCRITOS                */}
        {/* ============================================================ */}
        {activeTab === 'comunidade' && (
          <div className="space-y-5">
            {/* Barra de Busca e Filtro por Turma */}
            <div className="bg-white rounded-3xl border border-brand-surface-border p-4 sm:p-5 shadow-card space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-display font-extrabold text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-blue" />
                    <span>Comunidade de Atletas • INTRAMED IX ({visibleAthletes.length})</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Explore os participantes inscritos de todas as 5 turmas, veja as modalidades, siga seus colegas e acesse as fichas completas em tempo real.
                  </p>
                </div>

                <div className="w-full sm:w-72">
                  <Input
                    placeholder="Buscar por nome, posição ou @insta..."
                    value={communitySearch}
                    onChange={(e) => setCommunitySearch(e.target.value)}
                    leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                  />
                </div>
              </div>

              {/* Pílulas de Filtro pelas 5 Turmas */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <button
                  type="button"
                  onClick={() => setCommunityTeamFilter('all')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-display font-bold shrink-0 transition-all ${
                    communityTeamFilter === 'all'
                      ? 'bg-[#0B218A] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todas as Turmas ({visibleAthletes.length})
                </button>
                {TURMAS_MEDICINA.map((t) => {
                  const count = visibleAthletes.filter((a) => a.teamId === t.teamId).length;
                  const active = communityTeamFilter === t.teamId;
                  return (
                    <button
                      key={t.turma}
                      type="button"
                      onClick={() => setCommunityTeamFilter(t.teamId)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-display font-bold shrink-0 transition-all ${
                        active
                          ? 'bg-[#0B218A] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <img
                        src={t.crestUrl}
                        alt=""
                        className="w-4 h-4 rounded-full object-cover"
                      />
                      <span>
                        T{t.number} {t.name} ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid de Cards Sociais dos Atletas */}
            {filteredCommunityAthletes.length === 0 ? (
              <div className="bg-white rounded-3xl border border-brand-surface-border p-10 text-center space-y-3 shadow-card">
                <Users className="w-10 h-10 text-brand-blue mx-auto" />
                <h3 className="text-base font-display font-extrabold text-slate-900">
                  Nenhum participante encontrado neste filtro
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Seja o primeiro da sua turma a criar seu perfil ou limpe a busca para ver todos os inscritos.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveTab('nova_inscricao')}
                >
                  Fazer Minha Inscrição
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCommunityAthletes.map((ath) => {
                  const teamObj = visibleTeams.find((tm) => tm.id === ath.teamId);
                  const isFav = favoriteAthleteIds.includes(ath.id);
                  const isMe = currentUser?.linkedAthleteId === ath.id;

                  return (
                    <div
                      key={ath.id}
                      onClick={() => navigate(`/atleta/${ath.id}`)}
                      className="cursor-pointer group bg-white rounded-3xl border border-brand-surface-border hover:border-brand-blue transition-all shadow-card hover:shadow-lg overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        {/* Faixa Superior com Cores da Turma */}
                        <div
                          style={
                            teamObj?.theme
                              ? {
                                  background: `linear-gradient(135deg, ${teamObj.theme.primaryHex} 0%, ${teamObj.theme.secondaryHex} 100%)`,
                                }
                              : undefined
                          }
                          className="h-16 bg-gradient-to-r from-[#0B218A] to-[#1D63FF] px-4 pt-3 flex items-start justify-between relative"
                        >
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/25 backdrop-blur-xs text-[10px] font-display font-bold text-white border border-white/15">
                            {teamObj?.crestUrl && (
                              <img
                                src={teamObj.crestUrl}
                                alt=""
                                className="w-3.5 h-3.5 rounded-full object-cover"
                              />
                            )}
                            <span>{teamObj?.name || ath.turmaLabel || 'Medicina UEMA'}</span>
                          </span>

                          <div className="flex items-center gap-1.5">
                            {isMe && (
                              <span className="px-2 py-0.5 rounded-full bg-brand-yellow text-[#0B218A] text-[10px] font-display font-black">
                                VOCÊ
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                toggleFavoriteAthlete(ath.id);
                              }}
                              className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
                              title="Curtir / Favoritar atleta"
                            >
                              <Heart
                                className={`w-3.5 h-3.5 ${
                                  isFav ? 'fill-brand-yellow text-brand-yellow' : 'text-white'
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Corpo do Card */}
                        <div className="px-5 pb-4">
                          <div className="-mt-8 flex items-end justify-between gap-2 mb-2.5">
                            <div className="w-16 h-16 rounded-full bg-white p-1 shadow-md">
                              <div className="w-full h-full rounded-full bg-slate-100 overflow-hidden flex items-center justify-center">
                                {ath.avatarUrl ? (
                                  <img
                                    src={ath.avatarUrl}
                                    alt={ath.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="w-7 h-7 text-brand-blue" />
                                )}
                              </div>
                            </div>

                            <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-black text-[#0B218A]">
                              #{ath.jerseyNumber || 'IX'}
                            </span>
                          </div>

                          <h3 className="text-base font-display font-extrabold text-slate-900 group-hover:text-brand-blue transition-colors truncate">
                            {ath.name}
                          </h3>

                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                              <Shirt className="w-3.5 h-3.5 text-brand-blue" />
                              {ath.position || 'Atleta Oficial'}
                            </span>
                            {ath.instagramHandle && (
                              <span className="inline-flex items-center gap-0.5 text-pink-600 font-semibold truncate">
                                <Instagram className="w-3 h-3" />
                                {ath.instagramHandle.startsWith('@')
                                  ? ath.instagramHandle
                                  : `@${ath.instagramHandle}`}
                              </span>
                            )}
                          </div>

                          {ath.bio && (
                            <p className="mt-2 text-xs text-slate-600 italic line-clamp-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                              &ldquo;{ath.bio}&rdquo;
                            </p>
                          )}

                          {/* Modalidades do Atleta */}
                          <div className="mt-3 flex flex-wrap gap-1">
                            {OFFICIAL_MODALITIES.filter((m) =>
                              ath.modalityIds.includes(m.id)
                            )
                              .slice(0, 4)
                              .map((mod) => (
                                <span
                                  key={mod.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#F3F4F9] text-[10px] font-bold text-slate-700"
                                >
                                  <SportIcon
                                    iconKey={mod.iconKey}
                                    className="w-3 h-3 text-brand-blue"
                                  />
                                  <span>{mod.name}</span>
                                </span>
                              ))}
                            {ath.modalityIds.length > 4 && (
                              <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-[10px] font-bold text-brand-blue">
                                +{ath.modalityIds.length - 4} esportes
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs font-display font-bold text-brand-blue">
                        <span className="inline-flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5" />
                          <span>Ver Ficha &amp; Estatísticas</span>
                        </span>
                        <span>→</span>
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
          onClose={() => {
            setPayingRegistration(null);
            setPaymentApprovedSuccess(false);
          }}
          title="Pagamento Seguro da Inscrição"
        >
          {paymentApprovedSuccess ? (
            <div className="py-6 px-2 text-center space-y-5 animate-in fade-in duration-300">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-display font-extrabold text-brand-text-primary">
                  Pagamento Confirmado!
                </h3>
                <p className="text-xs text-brand-text-secondary max-w-sm mx-auto">
                  Sua inscrição no <strong>INTRAMED IX</strong> está quitada com sucesso. Seu ingresso e vaga nas modalidades estão garantidos!
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium">
                Atleta: <strong>{payingRegistration.athleteName}</strong> •{' '}
                {payingRegistration.turmaLabel}
              </div>
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => {
                  setPayingRegistration(null);
                  setPaymentApprovedSuccess(false);
                  setActiveTab('minhas_inscricoes');
                }}
              >
                Concluir e Ver Meu Ingresso
              </Button>
            </div>
          ) : (
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
                <div className="text-right">
                  <span className="text-xl font-display font-extrabold text-brand-blue block">
                    R${' '}
                    {paymentMethod === 'credit_card'
                      ? cardTotalPrice.toFixed(2)
                      : payingRegistration.authorizedPrice.toFixed(2)}
                  </span>
                  {paymentMethod === 'credit_card' && (
                    <span className="text-[10px] text-amber-700 font-bold block">
                      Inclui taxa repassada
                    </span>
                  )}
                </div>
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
                  <span>Pix Oficial</span>
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
                  {pixLoading ? (
                    <div className="py-10 flex flex-col items-center justify-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
                      <span className="text-xs font-bold text-slate-700">
                        Gerando cobrança Pix oficial no Mercado Pago...
                      </span>
                    </div>
                  ) : pixError ? (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2 text-left">
                      <div className="flex items-center gap-2 font-bold">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Não foi possível gerar o Pix</span>
                      </div>
                      <p>{pixError}</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setPixError(null);
                          setPixRetryCount((c) => c + 1);
                        }}
                      >
                        Tentar Novamente
                      </Button>
                    </div>
                  ) : pixData ? (
                    <>
                      {/* QR Code Oficial Retornado pela API */}
                      <div className="flex flex-col items-center justify-center space-y-2">
                        {pixData.qrCodeBase64 ? (
                          <div className="p-2 bg-white rounded-2xl shadow-card border border-slate-200">
                            <img
                              src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                              alt="QR Code Pix Mercado Pago"
                              className="w-48 h-48 object-contain rounded-xl"
                            />
                          </div>
                        ) : (
                          <div className="w-48 h-48 flex items-center justify-center bg-slate-100 rounded-2xl border border-slate-300">
                            <QrCode className="w-20 h-20 text-brand-blue" />
                          </div>
                        )}
                        <span className="text-[11px] font-bold text-slate-600">
                          Cobrança Oficial • Intramed Cangaceira
                        </span>
                      </div>

                      {/* Pix Copia e Cola */}
                      {pixData.qrCode && (
                        <div className="space-y-1.5 text-left">
                          <label className="text-[11px] font-bold text-slate-700 block">
                            Código Pix Copia e Cola:
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={pixData.qrCode}
                              className="w-full text-xs font-mono bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-2 truncate select-all"
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleCopyPix(pixData.qrCode || '')}
                              leftIcon={<Copy className="w-3.5 h-3.5" />}
                            >
                              {copiedPix ? 'Copiado!' : 'Copiar'}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Status de aguardo em tempo real */}
                      <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-center justify-between text-left">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                          </span>
                          <span className="font-medium text-[11px]">
                            Aguardando transferência bancária...
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isCheckingPayment}
                          onClick={handleCheckPaymentManual}
                          leftIcon={
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${
                                isCheckingPayment ? 'animate-spin' : ''
                              }`}
                            />
                          }
                          className="text-xs h-7 px-2"
                        >
                          Verificar
                        </Button>
                      </div>
                    </>
                  ) : null}

                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed text-left">
                    <strong>Instruções:</strong> Abra o app do seu banco, escolha{' '}
                    <strong>Pix Copia e Cola</strong> ou aponte a câmera para o QR Code acima. O valor será creditado diretamente para <strong>Intramed Cangaceira</strong> e a confirmação é automática.
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-left">
                  {/* Detalhamento do Valor com Repasse da Taxa do Cartão */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                        <CreditCard className="w-4 h-4 text-brand-blue" />
                        <span>Cartão de Crédito • Intramed Cangaceira</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Até 6x no Cartão
                      </span>
                    </div>

                    <div className="text-xs space-y-2 border-t border-slate-200 pt-2.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Valor Base da Inscrição:</span>
                        <span className="font-semibold text-slate-800">
                          R$ {payingRegistration.authorizedPrice.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-amber-900 bg-amber-50/90 p-2.5 rounded-xl border border-amber-200">
                        <div className="space-y-0.5">
                          <span className="font-bold block">
                            Acréscimo Taxa de Operação (+5%):
                          </span>
                          <span className="text-[10px] text-amber-700 block">
                            Taxa administrativa do gateway repassada ao titular
                          </span>
                        </div>
                        <span className="font-extrabold text-sm text-amber-900">
                          + R$ {cardFeeAmount.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 text-slate-900">
                        <span className="font-bold">Total no Cartão:</span>
                        <span className="text-2xl font-display font-extrabold text-brand-blue">
                          R$ {cardTotalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed">
                    <strong>Aviso:</strong> O acréscimo de R$ {cardFeeAmount.toFixed(2)} corresponde à taxa de processamento do cartão. Para pagar <strong>sem acréscimo</strong>, você pode usar a opção <strong>Pix Oficial</strong> por apenas R$ {payingRegistration.authorizedPrice.toFixed(2)}.
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full flex items-center justify-center gap-2 py-3.5 shadow-md"
                    disabled={isCreatingCardPreference}
                    onClick={handleCardCheckout}
                  >
                    {isCreatingCardPreference ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Abrindo Mercado Pago Seguro...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>
                          Pagar no Cartão de Crédito • R$ {cardTotalPrice.toFixed(2)}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                      </>
                    )}
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-brand-surface-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPayingRegistration(null)}
                >
                  Fechar
                </Button>

                {isAdmin && (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={async () => {
                      if (
                        confirm(
                          'Como administrador, deseja forçar a confirmação manual deste pagamento?'
                        )
                      ) {
                        await simulatePaymentConfirmation(
                          payingRegistration.id,
                          paymentMethod
                        );
                        setPayingRegistration(null);
                      }
                    }}
                  >
                    Confirmar como Admin
                  </Button>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
