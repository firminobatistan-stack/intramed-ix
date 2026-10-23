import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Palette,
  Type,
  Layers,
  Smartphone,
  GitMerge,
  Sparkles,
  CheckCircle2,
  Radio,
  Trophy,
  BarChart3,
  Shield,
  User,
  ExternalLink,
} from 'lucide-react';
import { OFFICIAL_MODALITIES } from '../data/officialData';
import { SportIcon } from '../components/sports/SportIcon';
import { TeamCrest } from '../components/sports/TeamCrest';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatCard } from '../components/sports/StatCard';
import { StandingsTable } from '../components/sports/StandingsTable';
import { MatchCard } from '../components/sports/MatchCard';

/**
 * 17 & 26 & 27. DESIGN SYSTEM COMPLETO + APRESENTAÇÃO DE CASE UI/UX (ESTILO BEHANCE "ALL SPORTS")
 * Apresenta:
 * - Abertura de impacto com Mockups Realistas de Smartphones lado a lado;
 * - Fundamentos visuais, Escala Tipográfica, Grid & Espaçamento e Identidade Cromática Oficial;
 * - Biblioteca interativa de componentes e seus estados (Padrão, Selecionado, Ativo, Desabilitado, Skeleton, Erro, Vazio);
 * - Fluxo de Arquitetura e Navegação;
 * - Galeria das 30 Telas / Estados Obrigatórios do Ecossistema INTRAMED IX.
 */
export const DesignSystemCasePage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedStateDemo, setSelectedStateDemo] = useState<
    'default' | 'loading' | 'error' | 'empty'
  >('default');

  const SCREEN_DIRECTORY = [
    { num: '01', name: 'Início — Destaques & Próximo Jogo', route: '/', category: 'Core' },
    { num: '02', name: 'Início — Filtro por Modalidade', route: '/', category: 'Core' },
    { num: '03', name: 'Jogos ao Vivo (Tempo Real)', route: '/jogos', category: 'Partidas' },
    { num: '04', name: 'Calendário Esportivo por Período', route: '/jogos', category: 'Partidas' },
    { num: '05', name: 'Busca Global Rápida (Ctrl+K)', route: '/', category: 'Descoberta' },
    { num: '06', name: 'Resultados Categorizados da Busca', route: '/', category: 'Descoberta' },
    { num: '07', name: 'Match Center — Partida em Andamento', route: '/placar', category: 'Match Center' },
    { num: '08', name: 'Match Center — Partida Encerrada', route: '/placar', category: 'Match Center' },
    { num: '09', name: 'Match Center — Estatísticas & Donut Ring', route: '/placar', category: 'Match Center' },
    { num: '10', name: 'Match Center — Quadra Tática & Escalação', route: '/placar', category: 'Match Center' },
    { num: '11', name: 'Hub de Modalidade (Futsal)', route: '/competicoes/futsal', category: 'Competições' },
    { num: '12', name: 'Tabela de Classificação Adaptável', route: '/competicoes/futsal', category: 'Competições' },
    { num: '13', name: 'Chaveamento Eliminatório com Zoom', route: '/chaveamento', category: 'Competições' },
    { num: '14', name: 'Página da Equipe / Período (Visão Geral)', route: '/equipe', category: 'Equipes & Atletas' },
    { num: '15', name: 'Página da Equipe — Elenco & Forma Recente', route: '/equipe', category: 'Equipes & Atletas' },
    { num: '16', name: 'Ficha Individual do Atleta', route: '/atleta', category: 'Equipes & Atletas' },
    { num: '17', name: 'Meus Favoritos & Personalização', route: '/favoritos', category: 'Personalização' },
    { num: '18', name: 'Central de Alertas & Notificações', route: '/notificacoes', category: 'Personalização' },
    { num: '19', name: 'Perfil do Participante', route: '/perfil', category: 'Conta' },
    { num: '20', name: 'Preferências de Alertas e Segurança', route: '/notificacoes', category: 'Conta' },
    { num: '21', name: 'Estado Vazio Oficial (Sem Dados Fictícios)', route: '/jogos', category: 'Estados' },
    { num: '22', name: 'Estado Offline / Sincronização Pendente', route: '/admin', category: 'Estados' },
    { num: '23', name: 'Estado de Carregamento (Skeletons)', route: '/design-system', category: 'Estados' },
    { num: '24', name: 'Catálogo das 10 Modalidades Oficiais', route: '/competicoes', category: 'Descoberta' },
    { num: '25', name: 'Filtros Combinados (Data + Esporte + Fase)', route: '/jogos', category: 'Partidas' },
    { num: '26', name: 'Busca Sem Correspondência', route: '/', category: 'Estados' },
    { num: '27', name: 'Calendário Sem Eventos no Dia', route: '/jogos', category: 'Estados' },
    { num: '28', name: 'Comparação Estatística Head-to-Head', route: '/placar', category: 'Match Center' },
    { num: '29', name: 'Operador de Súmula Eletrônica Ao Vivo', route: '/admin', category: 'Operação' },
    { num: '30', name: 'Modalidades Multi-Regra (Basquete/Vôlei/Natação)', route: '/competicoes/natacao', category: 'Multi-Esporte' },
  ];

  return (
    <div className="space-y-10 pb-8">
      {/* 27.1. ABERTURA DE IMPACTO COM MOCKUPS DE SMARTPHONES (ESTILO BEHANCE ALL SPORTS) */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-blue-dark via-brand-blue to-brand-blue-medium text-white p-6 sm:p-10 shadow-elevated border border-white/10">
        <img
          src="/assets/atletica/mascote-monocor.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute -right-10 -bottom-10 w-80 h-80 object-contain opacity-[0.06]"
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-display font-bold uppercase tracking-wider text-brand-yellow">
              <Sparkles className="w-3.5 h-3.5" />
              <span>UI/UX Case Study & Design System Oficial</span>
            </div>

            <div className="flex items-center gap-4">
              <img
                src="/assets/atletica/logo.png"
                alt="A.A.A. Cangaceira"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-xl"
              />
              <div>
                <h1 className="text-3xl sm:text-5xl font-display font-extrabold tracking-tight leading-none">
                  INTRAMED <span className="text-brand-yellow">IX</span>
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-brand-yellow mt-1 uppercase tracking-widest">
                  All-Sports Platform • A.A.A. Cangaceira (Medicina UEMA)
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-white/85 leading-relaxed max-w-xl">
              Plataforma esportiva multi-modalidades Mobile-First com placar ao vivo, súmula eletrônica auditável, estatísticas comparativas, chaveamento interativo e identidade visual institucional completa.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-4 py-2.5 rounded-2xl bg-brand-yellow text-brand-blue-dark text-xs font-display font-extrabold hover:bg-brand-yellow-dark transition-colors shadow-sm"
              >
                Explorar Aplicativo Ao Vivo
              </button>
              <button
                type="button"
                onClick={() => navigate('/placar')}
                className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold transition-colors"
              >
                Abrir Match Center
              </button>
            </div>
          </div>

          {/* Trio de Mockups Realistas de Smartphones (Inspirado na capa do Case All Sports) */}
          <div className="lg:col-span-6 flex items-center justify-center gap-3 sm:gap-4 py-2">
            {/* Smartphone Esquerdo: Quadra Tática */}
            <div className="hidden sm:flex flex-col w-40 h-72 rounded-[28px] bg-brand-blue-dark border-4 border-white/20 shadow-2xl p-2.5 -rotate-6 scale-95">
              <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-2" />
              <div className="text-[9px] font-display font-bold text-brand-yellow uppercase text-center mb-1.5">
                Quadra Tática
              </div>
              <div className="flex-1 rounded-2xl bg-brand-blue border border-white/20 p-2 flex flex-col justify-between relative overflow-hidden">
                <div className="grid grid-cols-2 gap-1">
                  <span className="h-4 rounded bg-brand-yellow/90 text-brand-blue-dark text-[8px] font-extrabold flex items-center justify-center">
                    #10
                  </span>
                  <span className="h-4 rounded bg-brand-yellow/90 text-brand-blue-dark text-[8px] font-extrabold flex items-center justify-center">
                    #7
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full border border-white/25 mx-auto flex items-center justify-center">
                  <img
                    src="/assets/atletica/face.png"
                    alt=""
                    className="w-7 h-7 object-contain opacity-60"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <span className="h-4 rounded bg-white text-brand-blue-dark text-[8px] font-extrabold flex items-center justify-center">
                    #9
                  </span>
                  <span className="h-4 rounded bg-white text-brand-blue-dark text-[8px] font-extrabold flex items-center justify-center">
                    #11
                  </span>
                </div>
              </div>
            </div>

            {/* Smartphone Central Principal: Match Center & Donut Ring */}
            <div className="flex flex-col w-48 sm:w-52 h-80 rounded-[32px] bg-white text-brand-text-primary border-4 border-brand-yellow shadow-2xl overflow-hidden z-10">
              <div className="bg-brand-blue text-white p-3 text-center space-y-1.5">
                <div className="w-12 h-1 rounded-full bg-white/30 mx-auto mb-1" />
                <span className="text-[9px] font-display font-extrabold uppercase tracking-wider text-brand-yellow block">
                  INTRAMED IX • AO VIVO
                </span>
                <div className="flex items-center justify-around py-1">
                  <div className="w-7 h-7 rounded-full bg-white/10 border border-white/25 flex items-center justify-center text-[8px] font-bold">
                    EQ1
                  </div>
                  <span className="text-lg font-display font-extrabold text-white">
                    — <span className="text-brand-yellow text-xs">VS</span> —
                  </span>
                  <div className="w-7 h-7 rounded-full bg-white/10 border border-white/25 flex items-center justify-center text-[8px] font-bold">
                    EQ2
                  </div>
                </div>
              </div>
              <div className="p-3 flex-1 flex flex-col justify-between bg-brand-surface-muted">
                <div className="bg-white rounded-2xl p-2.5 border border-brand-surface-border flex items-center justify-between">
                  <div className="w-10 h-10 rounded-full border-4 border-brand-blue border-t-brand-yellow flex items-center justify-center text-[8px] font-extrabold text-brand-blue">
                    H2H
                  </div>
                  <div className="flex-1 pl-2.5 space-y-1">
                    <div className="h-1.5 rounded-full bg-brand-blue w-full" />
                    <div className="h-1.5 rounded-full bg-brand-yellow w-3/4" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="h-5 rounded-xl bg-white border border-brand-surface-border px-2 flex items-center justify-between text-[8px] font-bold">
                    <span>Cronômetro Oficial</span>
                    <span className="text-brand-blue font-mono">20:00</span>
                  </div>
                  <div className="h-5 rounded-xl bg-brand-blue text-white px-2 flex items-center justify-between text-[8px] font-bold">
                    <span>Súmula Eletrônica</span>
                    <span className="text-brand-yellow">10 Esportes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Smartphone Direito: Súmula & Modalidades */}
            <div className="hidden sm:flex flex-col w-40 h-72 rounded-[28px] bg-brand-blue-dark border-4 border-white/20 shadow-2xl p-2.5 rotate-6 scale-95">
              <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-2" />
              <div className="text-[9px] font-display font-bold text-brand-yellow uppercase text-center mb-1.5">
                10 Modalidades
              </div>
              <div className="flex-1 rounded-2xl bg-white p-2 space-y-1.5 overflow-hidden">
                {OFFICIAL_MODALITIES.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className="p-1.5 rounded-xl bg-brand-surface-muted border border-brand-surface-border flex items-center gap-1.5"
                  >
                    <div className="w-5 h-5 rounded-lg bg-brand-blue text-brand-yellow flex items-center justify-center shrink-0">
                      <SportIcon iconKey={m.iconKey} className="w-3 h-3" />
                    </div>
                    <span className="text-[9px] font-display font-bold text-brand-text-primary truncate">
                      {m.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 17.1 & 17.3. STYLE GUIDE: PALETA OFICIAL, TIPOGRAFIA E ESCALA GEOMÉTRICA */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sistema Cromático Oficial */}
        <div className="rounded-3xl bg-white border border-brand-surface-border p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-brand-surface-border">
            <Palette className="w-5 h-5 text-brand-blue" />
            <div>
              <h2 className="text-base font-display font-extrabold text-brand-text-primary">
                01. Sistema Cromático Oficial (A.A.A. Cangaceira)
              </h2>
              <p className="text-xs text-brand-text-secondary">
                Branco predominante, Azul profundo institucional e Amarelo esportivo de acento.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { name: 'Brand Blue', hex: '#0F2A56', bg: 'bg-brand-blue', text: 'text-white', role: 'Primária / Topo' },
              { name: 'Blue Dark', hex: '#091834', bg: 'bg-brand-blue-dark', text: 'text-white', role: 'Contraste / Placar' },
              { name: 'Accent Yellow', hex: '#F5B700', bg: 'bg-brand-yellow', text: 'text-brand-blue-dark', role: 'Destaques / Ações' },
              { name: 'Pure Surface', hex: '#FFFFFF', bg: 'bg-white border border-brand-surface-border', text: 'text-brand-text-primary', role: 'Cards Principais' },
              { name: 'Muted Surface', hex: '#F7F9FC', bg: 'bg-brand-surface-muted border border-brand-surface-border', text: 'text-brand-text-primary', role: 'Fundo Secundário' },
              { name: 'Secondary Text', hex: '#5A6A85', bg: 'bg-[#5A6A85]', text: 'text-white', role: 'Metadados' },
            ].map((color) => (
              <div
                key={color.hex}
                className="rounded-2xl border border-brand-surface-border p-3 space-y-2"
              >
                <div
                  className={`h-12 rounded-xl flex items-end p-2 font-mono text-[10px] font-bold ${color.bg} ${color.text}`}
                >
                  {color.hex}
                </div>
                <div>
                  <span className="block text-xs font-display font-bold text-brand-text-primary">
                    {color.name}
                  </span>
                  <span className="block text-[10px] text-brand-text-secondary">
                    {color.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hierarquia Tipográfica e Números Tabulares */}
        <div className="rounded-3xl bg-white border border-brand-surface-border p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-brand-surface-border">
            <Type className="w-5 h-5 text-brand-blue" />
            <div>
              <h2 className="text-base font-display font-extrabold text-brand-text-primary">
                02. Tipografia & Alinhamento Numérico
              </h2>
              <p className="text-xs text-brand-text-secondary">
                Plus Jakarta Sans (Display/Placar) + Inter (Interface/Dados) + JetBrains Mono (Cronômetro).
              </p>
            </div>
          </div>

          <div className="space-y-3 divide-y divide-brand-surface-border">
            <div className="pt-2 flex items-baseline justify-between gap-4">
              <span className="text-xs font-bold text-brand-text-muted uppercase w-28 shrink-0">
                Placar / Display
              </span>
              <span className="text-3xl font-display font-extrabold text-brand-blue tabular-nums">
                02 × 01 • 19:42
              </span>
            </div>
            <div className="pt-3 flex items-baseline justify-between gap-4">
              <span className="text-xs font-bold text-brand-text-muted uppercase w-28 shrink-0">
                Título H1 / H2
              </span>
              <span className="text-lg font-display font-extrabold text-brand-text-primary">
                Semifinal • Futsal Masculino
              </span>
            </div>
            <div className="pt-3 flex items-baseline justify-between gap-4">
              <span className="text-xs font-bold text-brand-text-muted uppercase w-28 shrink-0">
                Corpo & Rótulos
              </span>
              <span className="text-xs font-medium text-brand-text-secondary">
                Leitura rápida em telas mobile com contraste AAA.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 17.4 & 17.5. BIBLIOTECA DE COMPONENTES & ESTADOS INTERATIVOS (SEÇÃO 20 — SKELETONS, ERRO, VAZIO) */}
      <section className="rounded-3xl bg-white border border-brand-surface-border p-6 sm:p-8 shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-surface-border">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-brand-blue" />
            <div>
              <h2 className="text-base sm:text-lg font-display font-extrabold text-brand-text-primary">
                03. Biblioteca de Componentes & Estados de Interface
              </h2>
              <p className="text-xs text-brand-text-secondary">
                Alterne entre os estados Padrão, Carregamento (Skeletons), Falha de Conexão e Vazio.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-brand-surface-muted p-1.5 rounded-2xl border border-brand-surface-border">
            {[
              { id: 'default', label: 'Padrão' },
              { id: 'loading', label: 'Skeleton (Loading)' },
              { id: 'error', label: 'Erro / Offline' },
              { id: 'empty', label: 'Estado Vazio' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() =>
                  setSelectedStateDemo(
                    st.id as 'default' | 'loading' | 'error' | 'empty'
                  )
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-display font-bold transition-all ${
                  selectedStateDemo === st.id
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'text-brand-text-secondary hover:text-brand-text-primary'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {selectedStateDemo === 'default' && (
          <div className="space-y-6">
            {/* Botões, Badges e Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-brand-surface-muted border border-brand-surface-border space-y-3">
                <span className="text-xs font-display font-bold uppercase tracking-wider text-brand-text-secondary block">
                  Botões e Estados
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" size="sm">
                    Primário
                  </Button>
                  <Button variant="accent" size="sm">
                    Acento (Súmula)
                  </Button>
                  <Button variant="secondary" size="sm">
                    Secundário
                  </Button>
                  <Button variant="primary" size="sm" disabled>
                    Desabilitado
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-brand-surface-muted border border-brand-surface-border space-y-3">
                <span className="text-xs font-display font-bold uppercase tracking-wider text-brand-text-secondary block">
                  Etiquetas de Estado (Partidas)
                </span>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status="live" />
                  <StatusBadge status="halftime" />
                  <StatusBadge status="scheduled" />
                  <StatusBadge status="finished" />
                  <StatusBadge status="postponed" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-brand-surface-muted border border-brand-surface-border space-y-3">
                <span className="text-xs font-display font-bold uppercase tracking-wider text-brand-text-secondary block">
                  Escudos e Contenção
                </span>
                <div className="flex items-center gap-3">
                  <TeamCrest size="sm" />
                  <TeamCrest size="md" highlighted />
                  <img
                    src="/assets/atletica/logo-alternativa.png"
                    alt="A.A.A. Cangaceira"
                    className="w-11 h-11 object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Exemplo de Card Expandido vs Card Estatístico */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <div className="lg:col-span-2">
                <MatchCard match={null} featured />
              </div>
              <div className="space-y-3">
                <StatCard
                  label="Modalidades Oficiais"
                  value="10"
                  sublabel="Futsal, Basquete, Handebol, Vôlei, Praia, Truco, Sinuca, Natação, Poker, Tênis de Mesa"
                  highlight
                  icon="award"
                />
                <StatCard
                  label="Integridade de Dados"
                  value="100%"
                  sublabel="Zero dados fictícios no estado oficial"
                  icon="trend"
                />
              </div>
            </div>
          </div>
        )}

        {selectedStateDemo === 'loading' && (
          <div className="space-y-4" aria-label="Demonstração de Skeletons de carregamento">
            <p className="text-xs font-semibold text-brand-blue">
              20.1. Skeletons Estruturais — Antecipam a geometria exata dos cards de partida e estatísticas:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((sk) => (
                <div
                  key={sk}
                  className="rounded-3xl bg-white border border-brand-surface-border p-5 space-y-4 animate-pulse"
                >
                  <div className="flex justify-between">
                    <div className="h-4 w-32 rounded-full bg-brand-surface-border" />
                    <div className="h-4 w-16 rounded-full bg-brand-surface-border" />
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4 py-2">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-brand-surface-border" />
                      <div className="h-3 w-20 rounded bg-brand-surface-border" />
                    </div>
                    <div className="h-10 w-24 mx-auto rounded-2xl bg-brand-surface-border" />
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-brand-surface-border" />
                      <div className="h-3 w-20 rounded bg-brand-surface-border" />
                    </div>
                  </div>
                  <div className="h-3 w-full rounded bg-brand-surface-border" />
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedStateDemo === 'error' && (
          <div className="rounded-3xl bg-rose-50/70 border border-rose-200 p-6 text-center space-y-3 max-w-lg mx-auto">
            <span className="inline-flex px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-display font-bold">
              Modo Offline / Falha Temporária de Rede
            </span>
            <h3 className="text-base font-display font-extrabold text-brand-text-primary">
              Conexão instável no ginásio
            </h3>
            <p className="text-xs text-brand-text-secondary">
              A súmula eletrônica continua operando localmente sem perda de cronômetro ou eventos e sincroniza automaticamente assim que a conexão retornar.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setSelectedStateDemo('default')}
            >
              Tentar sincronizar novamente
            </Button>
          </div>
        )}

        {selectedStateDemo === 'empty' && (
          <StandingsTable standings={[]} modalityName="Demonstração de Estado Vazio" />
        )}
      </section>

      {/* 26. DIRETÓRIO INTERATIVO DAS 30 TELAS E ESTADOS OBRIGATÓRIOS DO ECOSSISTEMA */}
      <section className="rounded-3xl bg-white border border-brand-surface-border p-6 sm:p-8 shadow-card space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-brand-surface-border">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-brand-blue" />
            <div>
              <h2 className="text-base sm:text-lg font-display font-extrabold text-brand-text-primary">
                04. Mapa Interativo das 30 Telas & Estados Obrigatórios
              </h2>
              <p className="text-xs text-brand-text-secondary">
                Clique em qualquer item para navegar diretamente até a tela ou estado correspondente no aplicativo.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-brand-blue text-brand-yellow text-xs font-display font-extrabold self-start sm:self-center">
            30 / 30 Implementadas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SCREEN_DIRECTORY.map((scr) => (
            <button
              key={scr.num}
              type="button"
              onClick={() => navigate(scr.route)}
              className="group p-3.5 rounded-2xl bg-brand-surface-muted/70 hover:bg-brand-blue hover:text-white border border-brand-surface-border transition-all text-left flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-brand-blue group-hover:bg-brand-yellow text-brand-yellow group-hover:text-brand-blue-dark font-mono text-xs font-extrabold flex items-center justify-center shrink-0">
                  {scr.num}
                </span>
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-text-muted group-hover:text-brand-yellow">
                    {scr.category}
                  </span>
                  <span className="block text-xs font-display font-bold text-brand-text-primary group-hover:text-white truncate">
                    {scr.name}
                  </span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-brand-text-muted group-hover:text-brand-yellow shrink-0" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
