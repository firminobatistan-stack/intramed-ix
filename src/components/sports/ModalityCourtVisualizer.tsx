import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Athlete,
  Match,
  MatchEvent,
  MatchSheet,
  ModalitySlug,
} from '../../types/domain';
import { DerivedVolleyballRotationState } from '../../utils/volleyballRotation';

export type CourtFocusMode = 'overview' | 'tactical' | 'home' | 'away';

interface ModalityCourtVisualizerProps {
  match: Match;
  sheet?: MatchSheet;
  athletes?: Athlete[];
  scoringEvents?: MatchEvent[];
  activePageTab?: 'details' | 'lineups' | 'standings' | 'statistics';
  liveVolleyballRotation?: DerivedVolleyballRotationState | null;
  onSelectPageTab?: (tab: 'details' | 'lineups' | 'standings' | 'statistics') => void;
  compact?: boolean;
}

interface TurmaCourtTheme {
  id: string;
  shortName: string;
  turmaTag: string;
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  crestUrl: string;
}

const TURMA_COURT_THEMES: Record<string, TurmaCourtTheme> = {
  sanguinaria: {
    id: 'sanguinaria',
    shortName: 'SANGUINÁRIA',
    turmaTag: 'TURMA XXI',
    primary: '#B91C1C',
    secondary: '#7F1D1D',
    accent: '#FB923C',
    glow: 'rgba(239, 68, 68, 0.45)',
    crestUrl: '/assets/teams/sanguinaria.jpg',
  },
  predadora: {
    id: 'predadora',
    shortName: 'PREDADORA',
    turmaTag: 'TURMA XXII',
    primary: '#18181B',
    secondary: '#713F12',
    accent: '#FACC15',
    glow: 'rgba(250, 204, 21, 0.45)',
    crestUrl: '/assets/teams/predadora.jpg',
  },
  tormenta: {
    id: 'tormenta',
    shortName: 'TORMENTA',
    turmaTag: 'TURMA XXIII',
    primary: '#0369A1',
    secondary: '#0C4A6E',
    accent: '#38BDF8',
    glow: 'rgba(56, 189, 248, 0.45)',
    crestUrl: '/assets/teams/tormenta.png',
  },
  colossal: {
    id: 'colossal',
    shortName: 'COLOSSAL',
    turmaTag: 'TURMA XXIV',
    primary: '#047857',
    secondary: '#064E3B',
    accent: '#FACC15',
    glow: 'rgba(16, 185, 129, 0.45)',
    crestUrl: '/assets/teams/colossal.jpg',
  },
  soberana: {
    id: 'soberana',
    shortName: 'SOBERANA',
    turmaTag: 'TURMA XXV',
    primary: '#9F1239',
    secondary: '#4C0519',
    accent: '#FDE047',
    glow: 'rgba(225, 29, 72, 0.45)',
    crestUrl: '/assets/teams/soberana.png',
  },
  default: {
    id: 'default',
    shortName: 'MEDICINA UEMA',
    turmaTag: 'INTRAMED IX',
    primary: '#0B218A',
    secondary: '#091834',
    accent: '#FACC15',
    glow: 'rgba(29, 78, 216, 0.45)',
    crestUrl: '/assets/atletica/escudo-evento.png',
  },
};

export function isCollectiveOrBeachVolley(modalityId?: ModalitySlug | string | null): boolean {
  if (!modalityId) return false;
  const clean = modalityId.toLowerCase();
  return (
    clean === 'futsal' ||
    clean === 'basquete' ||
    clean === 'handebol' ||
    clean === 'volei' ||
    clean === 'volei-de-praia'
  );
}

function resolveTurmaTheme(teamId?: string | null, teamName?: string | null, crestUrl?: string | null): TurmaCourtTheme {
  const raw = `${teamId || ''} ${teamName || ''}`.toLowerCase();
  let base = TURMA_COURT_THEMES.default;
  if (raw.includes('sanguinaria') || raw.includes('sanguinária') || raw.includes('21') || raw.includes('xxi')) {
    base = TURMA_COURT_THEMES.sanguinaria;
  } else if (raw.includes('predadora') || raw.includes('22') || raw.includes('xxii')) {
    base = TURMA_COURT_THEMES.predadora;
  } else if (raw.includes('tormenta') || raw.includes('23') || raw.includes('xxiii')) {
    base = TURMA_COURT_THEMES.tormenta;
  } else if (raw.includes('colossal') || raw.includes('24') || raw.includes('xxiv')) {
    base = TURMA_COURT_THEMES.colossal;
  } else if (raw.includes('soberana') || raw.includes('25') || raw.includes('xxv')) {
    base = TURMA_COURT_THEMES.soberana;
  }
  return {
    ...base,
    crestUrl: crestUrl || base.crestUrl,
  };
}

function getSportBallAsset(modalityId: string): string {
  const clean = modalityId.toLowerCase();
  if (clean === 'basquete') return '/assets/sports/basketball.png';
  if (clean === 'volei' || clean === 'volei-de-praia') return '/assets/sports/volleyball.png';
  return '/assets/sports/soccer.png';
}

function getSportSurfaceLabel(modalityId: string): string {
  const clean = modalityId.toLowerCase();
  if (clean === 'futsal') return 'Quadra Oficial de Futsal • 40×20m';
  if (clean === 'basquete') return 'Quadra Oficial de Basquete • Parquet FIBA';
  if (clean === 'handebol') return 'Quadra Oficial de Handebol • Área de 6m & 9m';
  if (clean === 'volei') return 'Quadra Oficial de Vôlei • Zona de 3m & Rotação';
  if (clean === 'volei-de-praia') return 'Arena Oficial de Areia • Vôlei de Praia 2×2';
  return 'Quadra Oficial • IX IntraMed';
}

interface PositionedNode {
  id: string;
  name: string;
  shortName: string;
  jersey?: string | number | null;
  avatarUrl?: string | null;
  roleLabel?: string;
  xPct: number;
  yPct: number;
  side: 'home' | 'away';
  isServer?: boolean;
}

const DEFAULT_FORMATIONS: Record<
  string,
  { home: Array<{ x: number; y: number; pos: string }>; away: Array<{ x: number; y: number; pos: string }> }
> = {
  futsal: {
    home: [
      { x: 10, y: 50, pos: 'GOL' },
      { x: 23, y: 50, pos: 'FIX' },
      { x: 34, y: 24, pos: 'ALA E' },
      { x: 34, y: 76, pos: 'ALA D' },
      { x: 44, y: 50, pos: 'PIVÔ' },
    ],
    away: [
      { x: 90, y: 50, pos: 'GOL' },
      { x: 77, y: 50, pos: 'FIX' },
      { x: 66, y: 24, pos: 'ALA D' },
      { x: 66, y: 76, pos: 'ALA E' },
      { x: 56, y: 50, pos: 'PIVÔ' },
    ],
  },
  basquete: {
    home: [
      { x: 38, y: 50, pos: 'ARM' },
      { x: 31, y: 22, pos: 'ALA-ARM' },
      { x: 31, y: 78, pos: 'ALA' },
      { x: 18, y: 32, pos: 'ALA-PIV' },
      { x: 16, y: 68, pos: 'PIVÔ' },
    ],
    away: [
      { x: 62, y: 50, pos: 'ARM' },
      { x: 69, y: 22, pos: 'ALA-ARM' },
      { x: 69, y: 78, pos: 'ALA' },
      { x: 82, y: 32, pos: 'ALA-PIV' },
      { x: 84, y: 68, pos: 'PIVÔ' },
    ],
  },
  handebol: {
    home: [
      { x: 9, y: 50, pos: 'GOL' },
      { x: 20, y: 18, pos: 'PONTA E' },
      { x: 28, y: 33, pos: 'ARM E' },
      { x: 33, y: 50, pos: 'CENTRAL' },
      { x: 28, y: 67, pos: 'ARM D' },
      { x: 20, y: 82, pos: 'PONTA D' },
      { x: 41, y: 50, pos: 'PIVÔ' },
    ],
    away: [
      { x: 91, y: 50, pos: 'GOL' },
      { x: 80, y: 18, pos: 'PONTA D' },
      { x: 72, y: 33, pos: 'ARM D' },
      { x: 67, y: 50, pos: 'CENTRAL' },
      { x: 72, y: 67, pos: 'ARM E' },
      { x: 80, y: 82, pos: 'PONTA E' },
      { x: 59, y: 50, pos: 'PIVÔ' },
    ],
  },
  volei: {
    home: [
      { x: 17, y: 76, pos: 'P1 🏐' },
      { x: 38, y: 76, pos: 'P2' },
      { x: 38, y: 50, pos: 'P3' },
      { x: 38, y: 24, pos: 'P4' },
      { x: 17, y: 24, pos: 'P5' },
      { x: 17, y: 50, pos: 'P6' },
    ],
    away: [
      { x: 83, y: 24, pos: 'P1 🏐' },
      { x: 62, y: 24, pos: 'P2' },
      { x: 62, y: 50, pos: 'P3' },
      { x: 62, y: 76, pos: 'P4' },
      { x: 83, y: 76, pos: 'P5' },
      { x: 83, y: 50, pos: 'P6' },
    ],
  },
  'volei-de-praia': {
    home: [
      { x: 32, y: 34, pos: 'DUPLA 1' },
      { x: 22, y: 68, pos: 'DUPLA 2' },
    ],
    away: [
      { x: 68, y: 34, pos: 'DUPLA 1' },
      { x: 78, y: 68, pos: 'DUPLA 2' },
    ],
  },
};

/**
 * QUADRA INTERATIVA 3D EM 60FPS — INSPIRADA NO SHOT "x-nfl-games-tab-switch-interaction" (60fps.design)
 * Renderiza a quadra oficial específica de cada modalidade coletiva (+ Vôlei de Praia) com a identidade
 * visual das 2 Turmas do confronto (endzones, garrafões, áreas de gol, escudos e jogadores) e aplica
 * física de mola (cubic-bezier(0.16, 1, 0.3, 1)) na transição de câmera 3D entre abas.
 */
export const ModalityCourtVisualizer: React.FC<ModalityCourtVisualizerProps> = ({
  match,
  sheet,
  athletes = [],
  scoringEvents = [],
  activePageTab = 'details',
  liveVolleyballRotation,
  onSelectPageTab,
  compact = false,
}) => {
  const navigate = useNavigate();
  const modalityId = String(match.modalityId || 'futsal').toLowerCase();

  const [focusMode, setFocusMode] = useState<CourtFocusMode>(
    activePageTab === 'lineups' ? 'tactical' : 'overview'
  );
  const [animPulseKey, setAnimPulseKey] = useState(0);

  // Sincroniza a câmera 3D da quadra quando o usuário alterna as abas principais da página (Detalhes <-> Escalações)
  useEffect(() => {
    if (activePageTab === 'lineups') {
      setFocusMode('tactical');
    } else if (activePageTab === 'details') {
      setFocusMode('overview');
    }
    setAnimPulseKey((k) => k + 1);
  }, [activePageTab, match.id]);

  const homeTheme = useMemo(
    () =>
      resolveTurmaTheme(
        match.homeTeam.teamId,
        match.homeTeam.teamName,
        match.homeTeam.crestUrl
      ),
    [match.homeTeam.teamId, match.homeTeam.teamName, match.homeTeam.crestUrl]
  );

  const awayTheme = useMemo(
    () =>
      resolveTurmaTheme(
        match.awayTeam.teamId,
        match.awayTeam.teamName,
        match.awayTeam.crestUrl
      ),
    [match.awayTeam.teamId, match.awayTeam.teamName, match.awayTeam.crestUrl]
  );

  // Monta os nodos táticos posicionados na quadra (usando a súmula ao vivo ou os atletas confirmados da Turma na modalidade)
  const positionedNodes = useMemo<PositionedNode[]>(() => {
    const formation = DEFAULT_FORMATIONS[modalityId] || DEFAULT_FORMATIONS.futsal;
    const nodes: PositionedNode[] = [];

    const buildSideNodes = (side: 'home' | 'away') => {
      const slots = side === 'home' ? formation.home : formation.away;
      const teamId = side === 'home' ? match.homeTeam.teamId : match.awayTeam.teamId;
      const lineup =
        side === 'home' ? sheet?.homeLineup || [] : sheet?.awayLineup || [];

      // Se for vôlei de quadra com rotação ativa na súmula, respeita P1..P6 reais
      if (modalityId === 'volei' && liveVolleyballRotation) {
        const courtArr =
          side === 'home'
            ? liveVolleyballRotation.homeCourt
            : liveVolleyballRotation.awayCourt;
        const isServingSide = liveVolleyballRotation.currentServingSide === side;
        slots.forEach((slot, idx) => {
          const p = courtArr[idx];
          const athObj = p
            ? athletes.find((a) => a.id === p.athleteId)
            : undefined;
          nodes.push({
            id: p?.athleteId || `${side}_slot_${idx}`,
            name: p?.athleteName || `${side === 'home' ? homeTheme.shortName : awayTheme.shortName}`,
            shortName: p
              ? p.athleteName.split(' ')[0]
              : slot.pos.replace(' 🏐', ''),
            jersey: p?.jerseyNumber ?? idx + 1,
            avatarUrl: athObj?.avatarUrl || null,
            roleLabel: slot.pos,
            xPct: slot.x,
            yPct: slot.y,
            side,
            isServer: idx === 0 && isServingSide,
          });
        });
        return;
      }

      // Busca atletas da súmula ou atletas confirmados daquela Turma
      const teamAthletes = athletes.filter(
        (a) =>
          teamId &&
          a.teamId === teamId &&
          (Array.isArray(a.modalityIds)
            ? a.modalityIds.includes(match.modalityId) || a.modalityIds.length > 0
            : true)
      );

      // Ordena priorizando quem tem foto ou quem marcou gol/ponto na partida
      const sortedTeamAthletes = [...teamAthletes].sort((a, b) => {
        const aHasPhoto = a.avatarUrl ? 0 : 1;
        const bHasPhoto = b.avatarUrl ? 0 : 1;
        return aHasPhoto - bHasPhoto;
      });

      slots.forEach((slot, idx) => {
        const fromLineup = lineup[idx];
        const fallbackAth = sortedTeamAthletes[idx];
        const linkedAth = fromLineup
          ? athletes.find((a) => a.id === fromLineup.athleteId) || fallbackAth
          : fallbackAth;

        const fullName =
          fromLineup?.athleteName ||
          linkedAth?.name ||
          (side === 'home' ? homeTheme.shortName : awayTheme.shortName);
        const firstWord = fullName.split(' ')[0];

        nodes.push({
          id: fromLineup?.athleteId || linkedAth?.id || `${side}_slot_${idx}`,
          name: fullName,
          shortName:
            fromLineup || linkedAth ? firstWord : slot.pos,
          jersey:
            fromLineup?.jerseyNumber ??
            linkedAth?.jerseyNumber ??
            idx + 1,
          avatarUrl: linkedAth?.avatarUrl || null,
          roleLabel: slot.pos,
          xPct: slot.x,
          yPct: slot.y,
          side,
        });
      });
    };

    buildSideNodes('home');
    buildSideNodes('away');
    return nodes;
  }, [
    modalityId,
    match.homeTeam.teamId,
    match.awayTeam.teamId,
    match.modalityId,
    sheet?.homeLineup,
    sheet?.awayLineup,
    liveVolleyballRotation,
    athletes,
    homeTheme.shortName,
    awayTheme.shortName,
  ]);

  if (!isCollectiveOrBeachVolley(modalityId)) {
    return null;
  }

  const lastScoringEvent = scoringEvents[0] || null;
  const ballAsset = getSportBallAsset(modalityId);
  const isLive = match.status === 'live' || match.status === 'halftime';

  // Transformação 3D da quadra com física de mola (60fps out-expo spring: cubic-bezier(0.16, 1, 0.3, 1))
  const getCourtTransform = (): string => {
    if (activePageTab === 'standings' || activePageTab === 'statistics') {
      return 'perspective(1100px) rotateX(34deg) scale(0.95) translate3d(0, -4px, 0)';
    }
    if (focusMode === 'tactical') {
      return 'perspective(1100px) rotateX(6deg) rotateY(0deg) scale(1) translate3d(0, 0, 0)';
    }
    if (focusMode === 'home') {
      return 'perspective(1100px) rotateX(18deg) rotateY(8deg) scale(1.04) translate3d(6%, 0, 0)';
    }
    if (focusMode === 'away') {
      return 'perspective(1100px) rotateX(18deg) rotateY(-8deg) scale(1.04) translate3d(-6%, 0, 0)';
    }
    // overview (Visão 3D Broadcast estilo X NFL Game Tracker)
    return 'perspective(1100px) rotateX(25deg) rotateY(0deg) scale(0.985) translate3d(0, 0, 0)';
  };

  const focusTabs: Array<{ id: CourtFocusMode; label: string }> = [
    { id: 'overview', label: 'Visão 3D' },
    { id: 'tactical', label: 'Quadra & Tático' },
    { id: 'home', label: homeTheme.shortName },
    { id: 'away', label: awayTheme.shortName },
  ];
  const activeFocusIdx = Math.max(
    0,
    focusTabs.findIndex((t) => t.id === focusMode)
  );

  const homeEventsCount = scoringEvents.filter((e) => e.teamSide === 'home').length;
  const awayEventsCount = scoringEvents.filter((e) => e.teamSide === 'away').length;

  return (
    <section
      className={`relative overflow-hidden bg-[#071126] text-white border border-white/10 select-none ${
        compact
          ? 'rounded-2xl p-3 sm:p-4 shadow-lg mt-2.5'
          : 'rounded-[28px] p-4 sm:p-6 shadow-[0_20px_50px_rgba(6,18,69,0.28)]'
      }`}
    >
      {/* Glow Ambiente Dinâmico Bilateral das 2 Turmas (Estilo X NFL Game Tracker) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 18% 45%, ${homeTheme.glow} 0%, transparent 55%), radial-gradient(circle at 82% 45%, ${awayTheme.glow} 0%, transparent 55%)`,
          opacity: focusMode === 'home' ? 0.95 : focusMode === 'away' ? 0.95 : 0.75,
        }}
      />

      {/* Barra Superior: Identificação da Quadra + Seletor Segmentado 60fps (x-nfl-games-tab-switch-interaction) */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center p-1.5 shadow-sm">
            <img
              src={ballAsset}
              alt=""
              className="w-full h-full object-contain drop-shadow"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-display font-extrabold uppercase tracking-wider text-brand-yellow">
                Arena Interativa 3D
              </span>
              {isLive && (
                <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[9px] font-display font-extrabold text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  AO VIVO
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-display font-bold text-white/95">
              {getSportSurfaceLabel(modalityId)}
            </p>
          </div>
        </div>

        {/* Segmented Control com Pílula Deslizante em 60fps (cubic-bezier(0.16, 1, 0.3, 1)) */}
        <div className="relative grid grid-cols-4 rounded-2xl bg-white/[0.08] p-1 border border-white/10 backdrop-blur-md">
          <span
            aria-hidden="true"
            style={{
              transform: `translate3d(${activeFocusIdx * 100}%, 0, 0)`,
              transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="pointer-events-none absolute inset-y-1 left-1 w-[calc((100%-8px)/4)] rounded-xl bg-white text-[#0B218A] shadow-[0_4px_14px_rgba(0,0,0,0.28)]"
          />
          {focusTabs.map((tab) => {
            const isSelected = focusMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFocusMode(tab.id);
                  setAnimPulseKey((k) => k + 1);
                  if (tab.id === 'tactical' && onSelectPageTab && activePageTab !== 'lineups') {
                    onSelectPageTab('lineups');
                  }
                }}
                className={`relative z-10 py-1.5 px-2 text-[10px] sm:text-[11px] font-display font-extrabold truncate transition-colors duration-200 ${
                  isSelected
                    ? 'text-[#0B218A]'
                    : 'text-white/75 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* PALCO 3D DA QUADRA ESPECÍFICA DA MODALIDADE */}
      <div className="relative z-10 py-1 sm:py-2 overflow-visible">
        <div
          style={{
            transform: getCourtTransform(),
            transformStyle: 'preserve-3d',
            transition: 'transform 340ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="relative mx-auto w-full aspect-[16/9] max-h-[340px] rounded-[22px] p-2 sm:p-3 shadow-[0_26px_50px_rgba(0,0,0,0.55),0_0_0_2px_rgba(255,255,255,0.16)] overflow-hidden will-change-transform"
        >
          {/* Moldura Externa Bicolor com as Cores Oficiais das 2 Turmas */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(90deg, ${homeTheme.primary} 0%, ${homeTheme.secondary} 48%, ${awayTheme.secondary} 52%, ${awayTheme.primary} 100%)`,
            }}
          />

          {/* SVG + Camada de Superfície Oficial da Modalidade */}
          <div className="relative w-full h-full rounded-[16px] overflow-hidden shadow-inner border-2 border-white/85">
            {/* 1. SUPERFÍCIE ESPECÍFICA POR MODALIDADE */}
            {modalityId === 'futsal' && (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, #0D3B8C 0%, #1449A6 50%, #0D3B8C 100%)',
                }}
              />
            )}
            {modalityId === 'basquete' && (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'repeating-linear-gradient(0deg, #C98A4B 0px, #C98A4B 14px, #BE7E3E 14px, #BE7E3E 28px)',
                }}
              />
            )}
            {modalityId === 'handebol' && (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, #0B5E7A 0%, #0E7490 50%, #0B5E7A 100%)',
                }}
              />
            )}
            {modalityId === 'volei' && (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, #1E3A8A 0%, #1D4ED8 100%)',
                }}
              >
                {/* Área Interna Laranja Teraflex Oficial do Vôlei */}
                <div
                  className="absolute inset-x-[9%] inset-y-[12%] rounded-sm shadow-inner"
                  style={{
                    background:
                      'linear-gradient(90deg, #D97724 0%, #EA580C 50%, #D97724 100%)',
                  }}
                />
              </div>
            )}
            {modalityId === 'volei-de-praia' && (
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(90deg, ${homeTheme.primary} 0%, ${homeTheme.secondary} 50%, ${awayTheme.secondary} 50%, ${awayTheme.primary} 100%)`,
                }}
              >
                {/* Quadra de Areia Dourada Central */}
                <div
                  className="absolute inset-x-[9%] inset-y-[12%] rounded-md shadow-inner"
                  style={{
                    background:
                      'radial-gradient(circle at 30% 40%, #F3C878 0%, #E5B05C 55%, #D69B43 100%)',
                  }}
                />
              </div>
            )}

            {/* 2. ENDZONES LATERAIS PERSONALIZADAS POR TURMA (Estilo NFL Endzones) */}
            <div
              style={{ backgroundColor: homeTheme.primary }}
              className="absolute inset-y-0 left-0 w-[9%] border-r-2 border-white/85 flex items-center justify-center overflow-hidden"
            >
              <span
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                className="text-[10px] sm:text-xs font-display font-black tracking-[0.22em] text-white/95 uppercase drop-shadow whitespace-nowrap"
              >
                {homeTheme.shortName}
              </span>
            </div>

            <div
              style={{ backgroundColor: awayTheme.primary }}
              className="absolute inset-y-0 right-0 w-[9%] border-l-2 border-white/85 flex items-center justify-center overflow-hidden"
            >
              <span
                style={{ writingMode: 'vertical-rl' }}
                className="text-[10px] sm:text-xs font-display font-black tracking-[0.22em] text-white/95 uppercase drop-shadow whitespace-nowrap"
              >
                {awayTheme.shortName}
              </span>
            </div>

            {/* 3. BRASÕES DAS TURMAS EM MARCA D'ÁGUA NAS DUAS METADES DA QUADRA */}
            <div className="pointer-events-none absolute inset-y-0 left-[9%] w-[41%] flex items-center justify-center">
              <div
                className={`w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-white/30 shadow-lg transition-transform duration-300 ${
                  focusMode === 'home' ? 'scale-110 opacity-45' : 'opacity-25'
                }`}
              >
                <img
                  src={homeTheme.crestUrl}
                  alt={homeTheme.shortName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="pointer-events-none absolute inset-y-0 right-[9%] w-[41%] flex items-center justify-center">
              <div
                className={`w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-white/30 shadow-lg transition-transform duration-300 ${
                  focusMode === 'away' ? 'scale-110 opacity-45' : 'opacity-25'
                }`}
              >
                <img
                  src={awayTheme.crestUrl}
                  alt={awayTheme.shortName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* 4. MARCAÇÕES VETORIAIS OFICIAIS DE CADA MODALIDADE (SVG) */}
            <svg
              viewBox="0 0 800 450"
              className="pointer-events-none absolute inset-0 w-full h-full"
              preserveAspectRatio="none"
            >
              {/* Limites da Quadra Útil (x: 72 a 728, y: 24 a 426) */}
              <rect
                x="72"
                y="24"
                width="656"
                height="402"
                fill="none"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="3"
              />

              {/* FUTSAL: Linha central, círculo central, áreas de 6m pintadas com a cor da Turma, marcas de 10m e traves */}
              {modalityId === 'futsal' && (
                <>
                  {/* Área de Gol Esquerda (Turma Mandante) */}
                  <path
                    d="M 72 135 A 90 90 0 0 1 162 225 A 90 90 0 0 1 72 315 Z"
                    fill={homeTheme.primary}
                    fillOpacity="0.45"
                    stroke="rgba(255,255,255,0.92)"
                    strokeWidth="3"
                  />
                  {/* Área de Gol Direita (Turma Visitante) */}
                  <path
                    d="M 728 135 A 90 90 0 0 0 638 225 A 90 90 0 0 0 728 315 Z"
                    fill={awayTheme.primary}
                    fillOpacity="0.45"
                    stroke="rgba(255,255,255,0.92)"
                    strokeWidth="3"
                  />
                  {/* Linha de Meio de Quadra e Círculo Central */}
                  <line
                    x1="400"
                    y1="24"
                    x2="400"
                    y2="426"
                    stroke="rgba(255,255,255,0.9)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="400"
                    cy="225"
                    r="58"
                    fill="none"
                    stroke="rgba(255,255,255,0.9)"
                    strokeWidth="3"
                  />
                  <circle cx="400" cy="225" r="5" fill="#FACC15" />
                  {/* Marcas de Pênalti (6m) e Tiro Livre Direto (10m) */}
                  <circle cx="162" cy="225" r="4" fill="#FFFFFF" />
                  <circle cx="215" cy="225" r="4" fill="#FACC15" />
                  <circle cx="638" cy="225" r="4" fill="#FFFFFF" />
                  <circle cx="585" cy="225" r="4" fill="#FACC15" />
                  {/* Traves Esquerda e Direita */}
                  <rect
                    x="54"
                    y="185"
                    width="18"
                    height="80"
                    fill="rgba(255,255,255,0.22)"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  <rect
                    x="728"
                    y="185"
                    width="18"
                    height="80"
                    fill="rgba(255,255,255,0.22)"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                </>
              )}

              {/* BASQUETE: Garrafões pintados nas cores das Turmas, arcos de 3 pontos, círculos de lance livre e tabelas/aros */}
              {modalityId === 'basquete' && (
                <>
                  {/* Linha Central e Círculo Central */}
                  <line
                    x1="400"
                    y1="24"
                    x2="400"
                    y2="426"
                    stroke="rgba(255,255,255,0.92)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="400"
                    cy="225"
                    r="54"
                    fill={homeTheme.primary}
                    fillOpacity="0.25"
                    stroke="rgba(255,255,255,0.92)"
                    strokeWidth="3"
                  />
                  {/* Garrafão Esquerdo (Mandante) */}
                  <rect
                    x="72"
                    y="155"
                    width="135"
                    height="140"
                    fill={homeTheme.primary}
                    fillOpacity="0.72"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  <circle
                    cx="207"
                    cy="225"
                    r="48"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  {/* Arco de 3 Pontos Esquerdo */}
                  <path
                    d="M 72 62 L 145 62 A 168 168 0 0 1 145 388 L 72 388"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  {/* Garrafão Direito (Visitante) */}
                  <rect
                    x="593"
                    y="155"
                    width="135"
                    height="140"
                    fill={awayTheme.primary}
                    fillOpacity="0.72"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  <circle
                    cx="593"
                    cy="225"
                    r="48"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  {/* Arco de 3 Pontos Direito */}
                  <path
                    d="M 728 62 L 655 62 A 168 168 0 0 0 655 388 L 728 388"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  {/* Tabelas e Aros Laranja */}
                  <line x1="94" y1="202" x2="94" y2="248" stroke="#FFFFFF" strokeWidth="4" />
                  <circle cx="106" cy="225" r="9" fill="none" stroke="#EA580C" strokeWidth="3.5" />
                  <line x1="706" y1="202" x2="706" y2="248" stroke="#FFFFFF" strokeWidth="4" />
                  <circle cx="694" cy="225" r="9" fill="none" stroke="#EA580C" strokeWidth="3.5" />
                </>
              )}

              {/* HANDEBOL: Área de 6m sólida na cor de cada Turma, linha tracejada de 9m, marca de 7m e linha de 4m do goleiro */}
              {modalityId === 'handebol' && (
                <>
                  {/* Área de 6m Esquerda (Mandante) */}
                  <path
                    d="M 72 115 A 110 110 0 0 1 182 225 A 110 110 0 0 1 72 335 Z"
                    fill={homeTheme.primary}
                    fillOpacity="0.65"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  {/* Linha Tracejada de 9m Esquerda */}
                  <path
                    d="M 72 70 A 155 155 0 0 1 227 225 A 155 155 0 0 1 72 380"
                    fill="none"
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth="2.5"
                    strokeDasharray="10 8"
                  />
                  {/* Área de 6m Direita (Visitante) */}
                  <path
                    d="M 728 115 A 110 110 0 0 0 618 225 A 110 110 0 0 0 728 335 Z"
                    fill={awayTheme.primary}
                    fillOpacity="0.65"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  {/* Linha Tracejada de 9m Direita */}
                  <path
                    d="M 728 70 A 155 155 0 0 0 573 225 A 155 155 0 0 0 728 380"
                    fill="none"
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth="2.5"
                    strokeDasharray="10 8"
                  />
                  {/* Linha Central */}
                  <line x1="400" y1="24" x2="400" y2="426" stroke="#FFFFFF" strokeWidth="3" />
                  <circle cx="400" cy="225" r="42" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" />
                  {/* Marcas de 7 Metros e 4 Metros */}
                  <line x1="138" y1="215" x2="138" y2="235" stroke="#FACC15" strokeWidth="3" />
                  <line x1="202" y1="217" x2="202" y2="233" stroke="#FFFFFF" strokeWidth="3" />
                  <line x1="662" y1="215" x2="662" y2="235" stroke="#FACC15" strokeWidth="3" />
                  <line x1="598" y1="217" x2="598" y2="233" stroke="#FFFFFF" strokeWidth="3" />
                  {/* Balizas de Handebol */}
                  <rect x="54" y="185" width="18" height="80" fill="rgba(255,255,255,0.25)" stroke="#EF4444" strokeWidth="3" />
                  <rect x="728" y1="185" y="185" width="18" height="80" fill="rgba(255,255,255,0.25)" stroke="#EF4444" strokeWidth="3" />
                </>
              )}

              {/* VÔLEI DE QUADRA & VÔLEI DE PRAIA: Rede Central com Antenas, Linhas de Ataque (3m no Vôlei de Quadra) */}
              {(modalityId === 'volei' || modalityId === 'volei-de-praia') && (
                <>
                  {/* Quadra Interna Demarcada */}
                  <rect
                    x="72"
                    y="54"
                    width="656"
                    height="342"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="3.5"
                  />
                  {/* Linhas de Ataque de 3m (Vôlei de Quadra) */}
                  {modalityId === 'volei' && (
                    <>
                      <line
                        x1="290"
                        y1="54"
                        x2="290"
                        y2="396"
                        stroke="#FFFFFF"
                        strokeWidth="3"
                      />
                      <line
                        x1="510"
                        y1="54"
                        x2="510"
                        y2="396"
                        stroke="#FFFFFF"
                        strokeWidth="3"
                      />
                    </>
                  )}
                  {/* Rede Central Estilizada com Malha e Antenas Vermelhas/Brancas */}
                  <rect
                    x="395"
                    y="38"
                    width="10"
                    height="374"
                    fill="rgba(15,23,42,0.55)"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <line
                    x1="400"
                    y1="34"
                    x2="400"
                    y2="416"
                    stroke="#FACC15"
                    strokeWidth="3"
                    strokeDasharray="6 6"
                  />
                  <circle cx="400" cy="48" r="6" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx="400" cy="402" r="6" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
                </>
              )}
            </svg>

            {/* 5. MODO VISÃO 3D (OVERVIEW): INSÍGNIA CENTRAL DE CONFRONTO / ÚLTIMO LANCE NA QUADRA */}
            {focusMode !== 'tactical' && (
              <div
                key={`overview-badge-${animPulseKey}`}
                style={{
                  animation: 'fadeIn 280ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center p-3"
              >
                <div className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#071126]/85 backdrop-blur-md border border-white/20 shadow-[0_14px_32px_rgba(0,0,0,0.45)] text-center max-w-[260px]">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={homeTheme.crestUrl}
                      alt={homeTheme.shortName}
                      className="w-7 h-7 rounded-full object-cover border border-white/40"
                    />
                    <img
                      src={ballAsset}
                      alt=""
                      className="w-8 h-8 object-contain drop-shadow-[0_4px_10px_rgba(250,204,21,0.5)]"
                    />
                    <img
                      src={awayTheme.crestUrl}
                      alt={awayTheme.shortName}
                      className="w-7 h-7 rounded-full object-cover border border-white/40"
                    />
                  </div>
                  {lastScoringEvent ? (
                    <div>
                      <span className="block text-[9px] font-display font-extrabold uppercase tracking-wider text-brand-yellow">
                        Último Lance • {lastScoringEvent.matchClockDisplay || 'Ao Vivo'}
                      </span>
                      <span className="block text-xs font-display font-bold text-white truncate max-w-[220px]">
                        {lastScoringEvent.typeLabel}: {lastScoringEvent.athleteName || 'Equipe'}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="block text-[9px] font-display font-extrabold uppercase tracking-wider text-brand-yellow">
                        {focusMode === 'home'
                          ? `${homeTheme.shortName} • ${homeTheme.turmaTag}`
                          : focusMode === 'away'
                          ? `${awayTheme.shortName} • ${awayTheme.turmaTag}`
                          : 'Toque em "Quadra & Tático"'}
                      </span>
                      <span className="block text-[11px] font-display font-bold text-white/90">
                        {focusMode === 'home'
                          ? `${homeEventsCount} lances de pontuação`
                          : focusMode === 'away'
                          ? `${awayEventsCount} lances de pontuação`
                          : 'Veja a formação das 2 Turmas em quadra'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. NODOS DOS JOGADORES / POSIÇÕES EM QUADRA (Com Entrada Staggered 60fps) */}
            <div className="absolute inset-0">
              {positionedNodes.map((node, idx) => {
                const isHome = node.side === 'home';
                const theme = isHome ? homeTheme : awayTheme;
                const dimmed =
                  (focusMode === 'home' && !isHome) ||
                  (focusMode === 'away' && isHome);
                const scaleVal =
                  focusMode === 'tactical'
                    ? 1
                    : (focusMode === 'home' && isHome) || (focusMode === 'away' && !isHome)
                    ? 1.08
                    : 0.86;

                return (
                  <button
                    key={`${node.id}_${idx}`}
                    type="button"
                    onClick={() => {
                      if (!node.id.includes('_slot_')) {
                        navigate(`/atleta/${node.id}`);
                      } else {
                        setFocusMode(isHome ? 'home' : 'away');
                      }
                    }}
                    style={{
                      left: `${node.xPct}%`,
                      top: `${node.yPct}%`,
                      transform: `translate3d(-50%, -50%, 0) scale(${scaleVal})`,
                      opacity: dimmed ? 0.25 : 1,
                      transitionProperty: 'transform, opacity, left, top',
                      transitionDuration: '320ms',
                      transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                      transitionDelay: `${(idx % 6) * 22}ms`,
                    }}
                    className="group absolute z-20 flex flex-col items-center focus:outline-none"
                  >
                    <div
                      style={{
                        backgroundColor: node.isServer ? '#FACC15' : theme.primary,
                        borderColor: node.isServer ? '#FFFFFF' : theme.accent,
                        boxShadow: `0 6px 14px rgba(0,0,0,0.45), 0 0 0 2px rgba(255,255,255,0.85)`,
                      }}
                      className="relative w-7 h-7 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-110"
                    >
                      {node.avatarUrl ? (
                        <img
                          src={node.avatarUrl}
                          alt={node.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span
                          className={`text-[10px] sm:text-xs font-mono font-black ${
                            node.isServer ? 'text-[#0B218A]' : 'text-white'
                          }`}
                        >
                          {node.jersey ?? '•'}
                        </span>
                      )}
                    </div>
                    <span className="mt-0.5 px-1.5 py-0.2 rounded bg-black/75 backdrop-blur-xs text-[8px] sm:text-[9px] font-display font-extrabold text-white whitespace-nowrap shadow">
                      {node.shortName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé Comparativo das 2 Turmas em Quadra */}
      <div className="relative z-10 mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setFocusMode(focusMode === 'home' ? 'overview' : 'home')}
          className={`flex items-center gap-2.5 p-2 rounded-2xl border text-left transition-all ${
            focusMode === 'home'
              ? 'bg-white/15 border-white/35 shadow-sm'
              : 'bg-white/[0.04] border-white/10 hover:bg-white/10'
          }`}
        >
          <img
            src={homeTheme.crestUrl}
            alt={homeTheme.shortName}
            className="w-8 h-8 rounded-full object-cover border border-white/30 shrink-0"
          />
          <div className="min-w-0">
            <span className="block text-[9px] font-display font-extrabold uppercase tracking-wider text-brand-yellow truncate">
              {homeTheme.turmaTag} • Lado Esquerdo
            </span>
            <span className="block text-xs font-display font-bold text-white truncate">
              {match.homeTeam.teamName || homeTheme.shortName}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFocusMode(focusMode === 'away' ? 'overview' : 'away')}
          className={`flex items-center justify-end gap-2.5 p-2 rounded-2xl border text-right transition-all ${
            focusMode === 'away'
              ? 'bg-white/15 border-white/35 shadow-sm'
              : 'bg-white/[0.04] border-white/10 hover:bg-white/10'
          }`}
        >
          <div className="min-w-0">
            <span className="block text-[9px] font-display font-extrabold uppercase tracking-wider text-brand-yellow truncate">
              Lado Direito • {awayTheme.turmaTag}
            </span>
            <span className="block text-xs font-display font-bold text-white truncate">
              {match.awayTeam.teamName || awayTheme.shortName}
            </span>
          </div>
          <img
            src={awayTheme.crestUrl}
            alt={awayTheme.shortName}
            className="w-8 h-8 rounded-full object-cover border border-white/30 shrink-0"
          />
        </button>
      </div>
    </section>
  );
};
