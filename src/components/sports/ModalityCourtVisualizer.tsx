import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Athlete,
  Match,
  MatchEvent,
  MatchSheet,
  ModalitySlug,
} from '../../types/domain';
import { DerivedVolleyballRotationState } from '../../utils/volleyballRotation';

export type CourtFocusMode = 'overview' | 'home' | 'away' | 'lineup';

interface ModalityCourtVisualizerProps {
  match: Match;
  sheet?: MatchSheet;
  athletes?: Athlete[];
  scoringEvents?: MatchEvent[];
  activePageTab?: 'details' | 'lineups' | 'standings' | 'statistics';
  liveVolleyballRotation?: DerivedVolleyballRotationState | null;
  onSelectPageTab?: (tab: 'details' | 'lineups' | 'standings' | 'statistics') => void;
  compact?: boolean;
  editable?: boolean;
  onMovePlayer?: (
    side: 'home' | 'away',
    athleteId: string,
    xPct: number,
    yPct: number
  ) => void;
  onSwapPlayers?: (
    side: 'home' | 'away',
    athleteIdA: string,
    athleteIdB: string
  ) => void;
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

function resolveTurmaTheme(
  teamId?: string | null,
  teamName?: string | null,
  crestUrl?: string | null
): TurmaCourtTheme {
  const cleanName = (teamName || '').trim().toLowerCase();
  const cleanId = (teamId || '').trim().toLowerCase();

  // Se o adversário ainda não foi definido (ex: "Venc. Quartas", "A definir", sem teamId), mantém neutro!
  if (
    !cleanId ||
    cleanId === 'tbd' ||
    cleanId === 'a-definir' ||
    cleanName.startsWith('venc.') ||
    cleanName.startsWith('vencedor') ||
    cleanName.startsWith('perd.') ||
    cleanName.includes('a definir') ||
    cleanName.includes('aguardando')
  ) {
    return {
      ...TURMA_COURT_THEMES.default,
      shortName: 'A DEFINIR',
      turmaTag: 'AGUARDANDO',
      primary: '#1E293B',
      secondary: '#0F172A',
      accent: '#94A3B8',
      glow: 'rgba(148, 163, 184, 0.25)',
      crestUrl: '/assets/atletica/escudo-evento.png',
    };
  }

  const raw = `${cleanId} ${cleanName}`;
  let base = TURMA_COURT_THEMES.default;
  if (
    raw.includes('sanguinaria') ||
    raw.includes('sanguinária') ||
    raw.includes('t21') ||
    raw.includes('turma 21') ||
    raw.includes('xxi')
  ) {
    base = TURMA_COURT_THEMES.sanguinaria;
  } else if (
    raw.includes('predadora') ||
    raw.includes('t22') ||
    raw.includes('turma 22') ||
    raw.includes('xxii')
  ) {
    base = TURMA_COURT_THEMES.predadora;
  } else if (
    raw.includes('tormenta') ||
    raw.includes('t23') ||
    raw.includes('turma 23') ||
    raw.includes('xxiii')
  ) {
    base = TURMA_COURT_THEMES.tormenta;
  } else if (
    raw.includes('colossal') ||
    raw.includes('t24') ||
    raw.includes('turma 24') ||
    raw.includes('xxiv')
  ) {
    base = TURMA_COURT_THEMES.colossal;
  } else if (
    raw.includes('soberana') ||
    raw.includes('t25') ||
    raw.includes('turma 25') ||
    raw.includes('xxv')
  ) {
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
  if (clean === 'volei') return 'Quadra Oficial de Vôlei • Zona de 3m';
  if (clean === 'volei-de-praia') return 'Arena Oficial de Areia • Vôlei de Praia';
  return 'Quadra Oficial • IX IntraMed';
}

interface PositionedNode {
  id: string;
  name: string;
  shortName: string;
  jersey?: string | number | null;
  avatarUrl?: string | null;
  xPct: number;
  yPct: number;
  side: 'home' | 'away';
  isServer?: boolean;
}

const LINEUP_COORDS: Record<
  string,
  { home: Array<{ x: number; y: number }>; away: Array<{ x: number; y: number }> }
> = {
  futsal: {
    home: [
      { x: 13, y: 50 },
      { x: 24, y: 50 },
      { x: 32, y: 24 },
      { x: 32, y: 76 },
      { x: 40, y: 50 },
    ],
    away: [
      { x: 87, y: 50 },
      { x: 76, y: 50 },
      { x: 68, y: 24 },
      { x: 68, y: 76 },
      { x: 60, y: 50 },
    ],
  },
  basquete: {
    home: [
      { x: 37, y: 50 },
      { x: 30, y: 22 },
      { x: 30, y: 78 },
      { x: 19, y: 32 },
      { x: 19, y: 68 },
    ],
    away: [
      { x: 63, y: 50 },
      { x: 70, y: 22 },
      { x: 70, y: 78 },
      { x: 81, y: 32 },
      { x: 81, y: 68 },
    ],
  },
  handebol: {
    home: [
      { x: 12, y: 50 },
      { x: 21, y: 18 },
      { x: 28, y: 34 },
      { x: 33, y: 50 },
      { x: 28, y: 66 },
      { x: 21, y: 82 },
      { x: 39, y: 50 },
    ],
    away: [
      { x: 88, y: 50 },
      { x: 79, y: 18 },
      { x: 72, y: 34 },
      { x: 67, y: 50 },
      { x: 72, y: 66 },
      { x: 79, y: 82 },
      { x: 61, y: 50 },
    ],
  },
  volei: {
    home: [
      { x: 19, y: 76 },
      { x: 36, y: 76 },
      { x: 36, y: 50 },
      { x: 36, y: 24 },
      { x: 19, y: 24 },
      { x: 19, y: 50 },
    ],
    away: [
      { x: 81, y: 24 },
      { x: 64, y: 24 },
      { x: 64, y: 50 },
      { x: 64, y: 76 },
      { x: 81, y: 76 },
      { x: 81, y: 50 },
    ],
  },
  'volei-de-praia': {
    home: [
      { x: 28, y: 34 },
      { x: 24, y: 68 },
    ],
    away: [
      { x: 72, y: 34 },
      { x: 76, y: 68 },
    ],
  },
};

/**
 * QUADRA INTERATIVA 3D EM 60FPS — INSPIRADA NO SHOT "x-nfl-games-tab-switch-interaction" (60fps.design)
 * - Centro da quadra 100% limpo e desobstruído (sem caixas flutuantes sobrepondo o meio da quadra).
 * - Zero escalações prévias fictícias: jamais exibe jogadores antes de a súmula oficial ser escalada pelo mesário.
 * - Transição de câmera 3D a 60fps entre Visão Geral da Quadra, Lado Mandante e Lado Visitante.
 */
export const ModalityCourtVisualizer: React.FC<ModalityCourtVisualizerProps> = ({
  match,
  sheet,
  athletes = [],
  scoringEvents = [],
  activePageTab = 'details',
  liveVolleyballRotation,
  compact = false,
  editable = false,
  onSwapPlayers,
}) => {
  const navigate = useNavigate();
  const modalityId = String(match.modalityId || 'futsal').toLowerCase();
  const [selectedSwapNode, setSelectedSwapNode] = useState<{
    athleteId: string;
    side: 'home' | 'away';
    name: string;
  } | null>(null);

  // Verifica se o mesário realmente registrou escalação oficial na súmula desta partida
  const hasOfficialSheetLineup = Boolean(
    (editable || match.status === 'live' || match.status === 'halftime' || match.status === 'finished') &&
      sheet &&
      ((sheet.homeLineup && sheet.homeLineup.length > 0) ||
        (sheet.awayLineup && sheet.awayLineup.length > 0))
  );

  const [focusMode, setFocusMode] = useState<CourtFocusMode>(
    editable && hasOfficialSheetLineup ? 'lineup' : 'overview'
  );

  useEffect(() => {
    if ((activePageTab === 'lineups' || editable) && hasOfficialSheetLineup) {
      setFocusMode('lineup');
    } else if (focusMode === 'lineup' && !hasOfficialSheetLineup) {
      setFocusMode('overview');
    }
  }, [activePageTab, editable, hasOfficialSheetLineup, match.id, focusMode]);

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

  // Somente monta nodos de atletas se a partida tiver escalação oficial registrada na súmula pelo mesário!
  const officialLineupNodes = useMemo<PositionedNode[]>(() => {
    if (!hasOfficialSheetLineup || !sheet) return [];
    const coords = LINEUP_COORDS[modalityId] || LINEUP_COORDS.futsal;
    const nodes: PositionedNode[] = [];

    const appendSide = (side: 'home' | 'away') => {
      const sideCoords = side === 'home' ? coords.home : coords.away;
      if (modalityId === 'volei' && liveVolleyballRotation) {
        const courtArr =
          side === 'home'
            ? liveVolleyballRotation.homeCourt
            : liveVolleyballRotation.awayCourt;
        const isServingSide = liveVolleyballRotation.currentServingSide === side;
        sideCoords.forEach((pt, idx) => {
          const p = courtArr[idx];
          if (!p) return;
          const athObj = athletes.find((a) => a.id === p.athleteId);
          nodes.push({
            id: p.athleteId,
            name: p.athleteName,
            shortName: p.athleteName.split(' ')[0],
            jersey: p.jerseyNumber ?? idx + 1,
            avatarUrl: athObj?.avatarUrl || null,
            xPct: pt.x,
            yPct: pt.y,
            side,
            isServer: idx === 0 && isServingSide,
          });
        });
        return;
      }

      const rawList = (side === 'home' ? sheet.homeLineup : sheet.awayLineup) || [];
      const catLower = (match.categoryName || '').toLowerCase();
      const matchGender = catLower.includes('fem')
        ? 'feminino'
        : catLower.includes('masc')
        ? 'masculino'
        : null;
      const isLiveNow = match.status === 'live' || match.status === 'halftime';
      const list =
        matchGender && !isLiveNow && !editable
          ? rawList.filter((p) => {
              const ath = athletes.find((a) => a.id === p.athleteId);
              const g = String(ath?.gender || '').toLowerCase();
              if (!g || g === 'geral') return true;
              return matchGender === 'feminino'
                ? g === 'feminino' || g === 'f'
                : g === 'masculino' || g === 'm';
            })
          : rawList;
      list.slice(0, sideCoords.length).forEach((p, idx) => {
        const pt = sideCoords[idx];
        const athObj = athletes.find((a) => a.id === p.athleteId);
        nodes.push({
          id: p.athleteId,
          name: p.athleteName,
          shortName: p.athleteName.split(' ')[0],
          jersey: p.jerseyNumber ?? idx + 1,
          avatarUrl: athObj?.avatarUrl || null,
          xPct: typeof p.courtX === 'number' ? p.courtX : pt.x,
          yPct: typeof p.courtY === 'number' ? p.courtY : pt.y,
          side,
        });
      });
    };

    appendSide('home');
    appendSide('away');
    return nodes;
  }, [hasOfficialSheetLineup, sheet, modalityId, liveVolleyballRotation, athletes]);

  if (!isCollectiveOrBeachVolley(modalityId)) {
    return null;
  }

  const lastScoringEvent = scoringEvents[0] || null;
  const ballAsset = getSportBallAsset(modalityId);
  const isLive = match.status === 'live' || match.status === 'halftime';

  // Transformação 3D da quadra com física de mola (60fps out-expo spring: cubic-bezier(0.16, 1, 0.3, 1))
  const getCourtTransform = (): string => {
    if (focusMode === 'lineup') {
      return 'perspective(1100px) rotateX(8deg) rotateY(0deg) scale(1) translate3d(0, 0, 0)';
    }
    if (focusMode === 'home') {
      return 'perspective(1100px) rotateX(18deg) rotateY(7deg) scale(1.03) translate3d(5%, 0, 0)';
    }
    if (focusMode === 'away') {
      return 'perspective(1100px) rotateX(18deg) rotateY(-7deg) scale(1.03) translate3d(-5%, 0, 0)';
    }
    return 'perspective(1100px) rotateX(22deg) rotateY(0deg) scale(0.99) translate3d(0, 0, 0)';
  };

  const focusTabs: Array<{ id: CourtFocusMode; label: string }> = [
    { id: 'overview', label: 'Quadra 3D' },
    { id: 'home', label: homeTheme.shortName },
    { id: 'away', label: awayTheme.shortName },
    ...(hasOfficialSheetLineup
      ? [{ id: 'lineup' as CourtFocusMode, label: 'Em Quadra' }]
      : []),
  ];
  const activeFocusIdx = Math.max(
    0,
    focusTabs.findIndex((t) => t.id === focusMode)
  );

  return (
    <section
      className={`relative overflow-hidden bg-[#071126] text-white border border-white/10 select-none ${
        compact
          ? 'rounded-2xl p-3 sm:p-4 shadow-lg mt-2.5'
          : 'rounded-[28px] p-4 sm:p-6 shadow-[0_20px_50px_rgba(6,18,69,0.28)]'
      }`}
    >
      {/* Glow Ambiente Dinâmico Bilateral das 2 Turmas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 18% 45%, ${homeTheme.glow} 0%, transparent 55%), radial-gradient(circle at 82% 45%, ${awayTheme.glow} 0%, transparent 55%)`,
          opacity: focusMode === 'home' ? 0.95 : focusMode === 'away' ? 0.95 : 0.75,
        }}
      />

      {/* Barra Superior: Identificação da Quadra + Seletor Segmentado 60fps (x-nfl-games-tab-switch-interaction) */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center p-1.5 shadow-sm shrink-0">
            <img
              src={ballAsset}
              alt=""
              className="w-full h-full object-contain drop-shadow"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-display font-extrabold uppercase tracking-wider text-brand-yellow">
                Arena 3D Oficial
              </span>
              {isLive && (
                <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[9px] font-display font-extrabold text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  AO VIVO
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-display font-bold text-white/95 truncate">
              {getSportSurfaceLabel(modalityId)}
            </p>
          </div>
        </div>

        {/* Segmented Control com Pílula Deslizante em 60fps (cubic-bezier(0.16, 1, 0.3, 1)) */}
        <div
          style={{
            gridTemplateColumns: `repeat(${focusTabs.length}, minmax(0, 1fr))`,
          }}
          className="relative grid rounded-2xl bg-white/[0.08] p-1 border border-white/10 backdrop-blur-md"
        >
          <span
            aria-hidden="true"
            style={{
              width: `calc((100% - 8px) / ${focusTabs.length})`,
              transform: `translate3d(${activeFocusIdx * 100}%, 0, 0)`,
              transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="pointer-events-none absolute inset-y-1 left-1 rounded-xl bg-white text-[#0B218A] shadow-[0_4px_14px_rgba(0,0,0,0.28)]"
          />
          {focusTabs.map((tab) => {
            const isSelected = focusMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFocusMode(tab.id);
                }}
                className={`relative z-10 py-1.5 px-2.5 text-[10px] sm:text-[11px] font-display font-extrabold truncate transition-colors duration-200 ${
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

      {/* PALCO 3D DA QUADRA ESPECÍFICA DA MODALIDADE (CENTRO 100% LIMPO E LEGÍVEL) */}
      <div className="relative z-10 py-1 overflow-visible">
        <div
          style={{
            transform: getCourtTransform(),
            transformStyle: 'preserve-3d',
            transition: 'transform 340ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="relative mx-auto w-full aspect-[16/9] max-h-[320px] rounded-[20px] p-1.5 sm:p-2.5 shadow-[0_24px_48px_rgba(0,0,0,0.52),0_0_0_2px_rgba(255,255,255,0.18)] overflow-hidden will-change-transform"
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
          <div className="relative w-full h-full rounded-[14px] overflow-hidden shadow-inner border-2 border-white/90">
            {/* 1. SUPERFÍCIE ESPECÍFICA POR MODALIDADE */}
            {modalityId === 'futsal' && (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, #0D3B8C 0%, #1651B8 50%, #0D3B8C 100%)',
                }}
              />
            )}
            {modalityId === 'basquete' && (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'repeating-linear-gradient(0deg, #CC8E4F 0px, #CC8E4F 14px, #C08243 14px, #C08243 28px)',
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
                <div
                  className="absolute inset-x-[9%] inset-y-[12%] rounded-xs shadow-inner"
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
                <div
                  className="absolute inset-x-[9%] inset-y-[12%] rounded-sm shadow-inner"
                  style={{
                    background:
                      'radial-gradient(circle at 35% 45%, #F4CA7B 0%, #E6B25E 55%, #D79C44 100%)',
                  }}
                />
              </div>
            )}

            {/* 2. ENDZONES LATERAIS PERSONALIZADAS POR TURMA */}
            <div
              style={{ backgroundColor: homeTheme.primary }}
              className="absolute inset-y-0 left-0 w-[9%] border-r-2 border-white/90 flex items-center justify-center overflow-hidden"
            >
              <span
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                className="text-[9px] sm:text-xs font-display font-black tracking-[0.2em] text-white uppercase drop-shadow whitespace-nowrap"
              >
                {homeTheme.shortName}
              </span>
            </div>

            <div
              style={{ backgroundColor: awayTheme.primary }}
              className="absolute inset-y-0 right-0 w-[9%] border-l-2 border-white/90 flex items-center justify-center overflow-hidden"
            >
              <span
                style={{ writingMode: 'vertical-rl' }}
                className="text-[9px] sm:text-xs font-display font-black tracking-[0.2em] text-white uppercase drop-shadow whitespace-nowrap"
              >
                {awayTheme.shortName}
              </span>
            </div>

            {/* 3. BRASÕES NÍTIDOS DAS 2 TURMAS EM CADA METADE DA QUADRA (SEM POLUIR O MEIO) */}
            <div className="pointer-events-none absolute inset-y-0 left-[12%] w-[33%] flex items-center justify-center">
              <div
                className={`w-16 h-16 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-white/75 shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-all duration-300 ${
                  focusMode === 'home'
                    ? 'scale-110 opacity-95 ring-4 ring-brand-yellow/60'
                    : focusMode === 'away'
                    ? 'scale-90 opacity-35'
                    : 'opacity-80'
                }`}
              >
                <img
                  src={homeTheme.crestUrl}
                  alt={homeTheme.shortName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="pointer-events-none absolute inset-y-0 right-[12%] w-[33%] flex items-center justify-center">
              <div
                className={`w-16 h-16 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-white/75 shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-all duration-300 ${
                  focusMode === 'away'
                    ? 'scale-110 opacity-95 ring-4 ring-brand-yellow/60'
                    : focusMode === 'home'
                    ? 'scale-90 opacity-35'
                    : 'opacity-80'
                }`}
              >
                <img
                  src={awayTheme.crestUrl}
                  alt={awayTheme.shortName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* 4. MARCAÇÕES VETORIAIS OFICIAIS DE CADA MODALIDADE (SVG LIMPO E DE ALTO CONTRASTE) */}
            <svg
              viewBox="0 0 800 450"
              className="pointer-events-none absolute inset-0 w-full h-full"
              preserveAspectRatio="none"
            >
              {/* Limites da Quadra Útil */}
              <rect
                x="72"
                y="24"
                width="656"
                height="402"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="3.5"
              />

              {/* FUTSAL */}
              {modalityId === 'futsal' && (
                <>
                  <path
                    d="M 72 135 A 90 90 0 0 1 162 225 A 90 90 0 0 1 72 315 Z"
                    fill={homeTheme.primary}
                    fillOpacity="0.55"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  <path
                    d="M 728 135 A 90 90 0 0 0 638 225 A 90 90 0 0 0 728 315 Z"
                    fill={awayTheme.primary}
                    fillOpacity="0.55"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  <line
                    x1="400"
                    y1="24"
                    x2="400"
                    y2="426"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  <circle
                    cx="400"
                    cy="225"
                    r="54"
                    fill="rgba(11,33,138,0.35)"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  <circle cx="400" cy="225" r="5" fill="#FACC15" />
                  <circle cx="162" cy="225" r="4" fill="#FFFFFF" />
                  <circle cx="215" cy="225" r="4" fill="#FACC15" />
                  <circle cx="638" cy="225" r="4" fill="#FFFFFF" />
                  <circle cx="585" cy="225" r="4" fill="#FACC15" />
                  <rect
                    x="54"
                    y="185"
                    width="18"
                    height="80"
                    fill="rgba(255,255,255,0.28)"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  <rect
                    x="728"
                    y="185"
                    width="18"
                    height="80"
                    fill="rgba(255,255,255,0.28)"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                </>
              )}

              {/* BASQUETE */}
              {modalityId === 'basquete' && (
                <>
                  <line
                    x1="400"
                    y1="24"
                    x2="400"
                    y2="426"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  <circle
                    cx="400"
                    cy="225"
                    r="52"
                    fill="#0B218A"
                    fillOpacity="0.35"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  <rect
                    x="72"
                    y="155"
                    width="135"
                    height="140"
                    fill={homeTheme.primary}
                    fillOpacity="0.78"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  <circle
                    cx="207"
                    cy="225"
                    r="46"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  <path
                    d="M 72 62 L 145 62 A 168 168 0 0 1 145 388 L 72 388"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  <rect
                    x="593"
                    y="155"
                    width="135"
                    height="140"
                    fill={awayTheme.primary}
                    fillOpacity="0.78"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  <circle
                    cx="593"
                    cy="225"
                    r="46"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  <path
                    d="M 728 62 L 655 62 A 168 168 0 0 0 655 388 L 728 388"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  <line x1="94" y1="202" x2="94" y2="248" stroke="#FFFFFF" strokeWidth="4" />
                  <circle cx="106" cy="225" r="9" fill="none" stroke="#EA580C" strokeWidth="3.5" />
                  <line x1="706" y1="202" x2="706" y2="248" stroke="#FFFFFF" strokeWidth="4" />
                  <circle cx="694" cy="225" r="9" fill="none" stroke="#EA580C" strokeWidth="3.5" />
                </>
              )}

              {/* HANDEBOL */}
              {modalityId === 'handebol' && (
                <>
                  <path
                    d="M 72 115 A 110 110 0 0 1 182 225 A 110 110 0 0 1 72 335 Z"
                    fill={homeTheme.primary}
                    fillOpacity="0.72"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  <path
                    d="M 72 70 A 155 155 0 0 1 227 225 A 155 155 0 0 1 72 380"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                    strokeDasharray="10 8"
                  />
                  <path
                    d="M 728 115 A 110 110 0 0 0 618 225 A 110 110 0 0 0 728 335 Z"
                    fill={awayTheme.primary}
                    fillOpacity="0.72"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  <path
                    d="M 728 70 A 155 155 0 0 0 573 225 A 155 155 0 0 0 728 380"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                    strokeDasharray="10 8"
                  />
                  <line x1="400" y1="24" x2="400" y2="426" stroke="#FFFFFF" strokeWidth="3" />
                  <circle cx="400" cy="225" r="44" fill="none" stroke="#FFFFFF" strokeWidth="3" />
                  <line x1="138" y1="215" x2="138" y2="235" stroke="#FACC15" strokeWidth="3.5" />
                  <line x1="202" y1="217" x2="202" y2="233" stroke="#FFFFFF" strokeWidth="3" />
                  <line x1="662" y1="215" x2="662" y2="235" stroke="#FACC15" strokeWidth="3.5" />
                  <line x1="598" y1="217" x2="598" y2="233" stroke="#FFFFFF" strokeWidth="3" />
                  <rect x="54" y="185" width="18" height="80" fill="rgba(255,255,255,0.28)" stroke="#EF4444" strokeWidth="3" />
                  <rect x="728" y="185" width="18" height="80" fill="rgba(255,255,255,0.28)" stroke="#EF4444" strokeWidth="3" />
                </>
              )}

              {/* VÔLEI DE QUADRA & VÔLEI DE PRAIA */}
              {(modalityId === 'volei' || modalityId === 'volei-de-praia') && (
                <>
                  <rect
                    x="72"
                    y="54"
                    width="656"
                    height="342"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="3.5"
                  />
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
                  <rect
                    x="396"
                    y="38"
                    width="8"
                    height="374"
                    fill="rgba(15,23,42,0.65)"
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
                  <circle cx="400" cy="48" r="5.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx="400" cy="402" r="5.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
                </>
              )}
            </svg>

            {/* 5. ESCALAÇÃO OFICIAL DA SÚMULA (Exibida EXCLUSIVAMENTE quando o mesário escalou atletas reais e a aba "Em Quadra" está ativa) */}
            {focusMode === 'lineup' && hasOfficialSheetLineup && (
              <div className="absolute inset-0">
                {officialLineupNodes.map((node, idx) => {
                  const isHome = node.side === 'home';
                  const theme = isHome ? homeTheme : awayTheme;
                  const isSelectedForSwap =
                    selectedSwapNode?.athleteId === node.id &&
                    selectedSwapNode?.side === node.side;

                  return (
                    <button
                      key={`${node.id}_${idx}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!editable) {
                          navigate(`/atleta/${node.id}`);
                          return;
                        }
                        if (!selectedSwapNode || selectedSwapNode.side !== node.side) {
                          setSelectedSwapNode({
                            athleteId: node.id,
                            side: node.side,
                            name: node.shortName,
                          });
                          return;
                        }
                        if (selectedSwapNode.athleteId === node.id) {
                          setSelectedSwapNode(null);
                          return;
                        }
                        onSwapPlayers?.(
                          node.side,
                          selectedSwapNode.athleteId,
                          node.id
                        );
                        setSelectedSwapNode(null);
                      }}
                      style={{
                        left: `${node.xPct}%`,
                        top: `${node.yPct}%`,
                        transform: `translate3d(-50%, -50%, 0) scale(${
                          isSelectedForSwap ? 1.18 : 1
                        })`,
                        transition: 'all 280ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                        transitionDelay: `${(idx % 6) * 20}ms`,
                      }}
                      className="group absolute z-20 flex flex-col items-center focus:outline-none cursor-pointer touch-manipulation"
                    >
                      <div
                        style={{
                          backgroundColor: node.isServer ? '#FACC15' : theme.primary,
                          borderColor: isSelectedForSwap
                            ? '#FACC15'
                            : node.isServer
                            ? '#FFFFFF'
                            : theme.accent,
                          boxShadow: isSelectedForSwap
                            ? '0 0 0 4px rgba(250,204,21,0.55), 0 8px 18px rgba(0,0,0,0.5)'
                            : '0 6px 14px rgba(0,0,0,0.45), 0 0 0 2px rgba(255,255,255,0.9)',
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
                      <span className="mt-0.5 px-1.5 py-0.2 rounded bg-black/80 text-[8px] sm:text-[9px] font-display font-extrabold text-white whitespace-nowrap shadow">
                        {node.shortName}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé Limpo: Último Lance ou Dica de Arraste para o Mesário (sem botões duplicados!) */}
      {(lastScoringEvent || editable) && (
        <div className="relative z-10 mt-3 pt-2.5 border-t border-white/10 space-y-2">
          {editable && (
            <div className="px-3 py-1.5 rounded-xl bg-brand-yellow/15 border border-brand-yellow/35 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="font-display font-extrabold text-brand-yellow">
                Prévia ao vivo • Modo Mesário
              </span>
              <span className="font-semibold text-white/90">
                {selectedSwapNode
                  ? `Selecionado: ${selectedSwapNode.name} — toque em outro atleta da mesma equipe para trocar`
                  : hasOfficialSheetLineup
                  ? 'Toque em 2 atletas da mesma equipe para trocar de posição'
                  : 'Escale os atletas para posicioná-los na quadra'}
              </span>
            </div>
          )}
          {lastScoringEvent && (
            <div className="px-3 py-1.5 rounded-xl bg-white/[0.07] border border-white/10 flex items-center justify-between gap-2 text-xs">
              <span className="text-[10px] font-display font-extrabold uppercase tracking-wider text-brand-yellow shrink-0">
                Último Lance • {lastScoringEvent.matchClockDisplay || 'Ao Vivo'}
              </span>
              <span className="font-display font-bold text-white truncate">
                {lastScoringEvent.typeLabel}: {lastScoringEvent.athleteName || 'Equipe'}
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
