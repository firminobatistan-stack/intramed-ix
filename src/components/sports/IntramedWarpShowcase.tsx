import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Flame,
  Trophy,
} from 'lucide-react';
import { WarpCard, WarpCardDetail, WarpCarousel } from '@/components/ui/warp-carousel';
import { useCompetitionStore } from '../../context/CompetitionStoreContext';
import { Match, MatchEventType } from '../../types/domain';

export type ShowcaseMode = 'upcoming' | 'scorers' | 'stats';

interface ShowcaseCardEntry {
  card: WarpCard;
  ctaLabel: string;
  ctaPath: string;
  subtitle: string;
}

interface IntramedWarpShowcaseProps {
  initialMode?: ShowcaseMode;
  compact?: boolean;
}

/**
 * Malhas B-spline 100% alinhadas à paleta oficial do IntraMed IX (Azul Royal #0B218A & Amarelo #FACC15)
 * e às 5 Atléticas/Turmas oficiais (Colossal, Soberana, Sanguinária, Predadora e Tormenta).
 */
const BRAND_MESHES: Record<
  string,
  { mesh: string[]; numeral: [string, string]; accent: string; glow: string }
> = {
  intramed: {
    numeral: ['#FEF08A', '#FACC15'],
    accent: '#FACC15',
    glow: '#1D4ED8',
    mesh: [
      '#061245', '#091834', '#0B218A', '#0F2A56', '#14337A', '#091834',
      '#091834', '#0B218A', '#1538A8', '#1D4ED8', '#0F2A56', '#061245',
      '#0B218A', '#1E40AF', '#2563EB', '#1D4ED8', '#0B218A', '#091834',
      '#071448', '#102C9E', '#1D4ED8', '#3B82F6', '#1E3A8A', '#091834',
      '#091834', '#0F2A56', '#1E40AF', '#2563EB', '#172554', '#061038',
      '#061038', '#0B218A', '#1D4ED8', '#F59E0B', '#B45309', '#091834',
      '#040B29', '#091834', '#0F2A56', '#1E3A8A', '#0B218A', '#061245',
    ],
  },
  colossal: {
    // Turma 24 — Verde Esmeralda & Dourado
    numeral: ['#FEF08A', '#6EE7B7'],
    accent: '#FACC15',
    glow: '#10B981',
    mesh: [
      '#022C22', '#064E3B', '#065F46', '#047857', '#064E3B', '#022C22',
      '#022C22', '#065F46', '#059669', '#10B981', '#047857', '#022C22',
      '#064E3B', '#047857', '#10B981', '#059669', '#065F46', '#022C22',
      '#022C22', '#064E3B', '#047857', '#0D9488', '#065F46', '#022C22',
      '#022C22', '#065F46', '#059669', '#10B981', '#047857', '#011F18',
      '#011F18', '#064E3B', '#047857', '#D97706', '#92400E', '#022C22',
      '#011A14', '#022C22', '#064E3B', '#065F46', '#047857', '#022C22',
    ],
  },
  soberana: {
    // Turma 25 — Vinho Grená & Ouro
    numeral: ['#FEF3C7', '#FDE047'],
    accent: '#FACC15',
    glow: '#BE123C',
    mesh: [
      '#2A0612', '#4C0519', '#6B1229', '#881337', '#4C0519', '#2A0612',
      '#3B0714', '#6B1229', '#9F1239', '#BE123C', '#6B1229', '#2A0612',
      '#4C0519', '#881337', '#BE123C', '#9F1239', '#6B1229', '#3B0714',
      '#2A0612', '#4C0519', '#881337', '#E11D48', '#881337', '#2A0612',
      '#2A0612', '#6B1229', '#9F1239', '#BE123C', '#6B1229', '#1F040D',
      '#1F040D', '#4C0519', '#881337', '#D97706', '#92400E', '#2A0612',
      '#1A030B', '#2A0612', '#4C0519', '#6B1229', '#4C0519', '#1F040D',
    ],
  },
  sanguinaria: {
    // Turma 21 — Vermelho Vivo & Fogo
    numeral: ['#FFF7ED', '#FDBA74'],
    accent: '#FB923C',
    glow: '#EF4444',
    mesh: [
      '#350707', '#450A0A', '#7F1D1D', '#991B1B', '#450A0A', '#290505',
      '#450A0A', '#7F1D1D', '#B91C1C', '#DC2626', '#7F1D1D', '#350707',
      '#450A0A', '#991B1B', '#DC2626', '#EF4444', '#991B1B', '#450A0A',
      '#350707', '#7F1D1D', '#B91C1C', '#EA580C', '#991B1B', '#350707',
      '#290505', '#7F1D1D', '#B91C1C', '#DC2626', '#7F1D1D', '#290505',
      '#290505', '#450A0A', '#991B1B', '#F97316', '#B45309', '#350707',
      '#1F0303', '#350707', '#450A0A', '#7F1D1D', '#450A0A', '#290505',
    ],
  },
  predadora: {
    // Turma 22 — Preto Obsidiana & Amarelo Ouro
    numeral: ['#FEF9C3', '#FACC15'],
    accent: '#FACC15',
    glow: '#F59E0B',
    mesh: [
      '#0C0A09', '#1C1917', '#292524', '#422006', '#1C1917', '#0C0A09',
      '#1C1917', '#292524', '#713F12', '#A16207', '#422006', '#1C1917',
      '#1C1917', '#422006', '#A16207', '#CA8A04', '#713F12', '#1C1917',
      '#0C0A09', '#292524', '#854D0E', '#EAB308', '#713F12', '#1C1917',
      '#0C0A09', '#292524', '#713F12', '#CA8A04', '#422006', '#0C0A09',
      '#0C0A09', '#1C1917', '#713F12', '#F59E0B', '#854D0E', '#1C1917',
      '#09090B', '#18181B', '#292524', '#422006', '#1C1917', '#0C0A09',
    ],
  },
  tormenta: {
    // Turma 23 — Azul Tempestade & Celeste
    numeral: ['#E0F2FE', '#7DD3FC'],
    accent: '#38BDF8',
    glow: '#0284C7',
    mesh: [
      '#082F49', '#0C4A6E', '#075985', '#0369A1', '#0C4A6E', '#082F49',
      '#082F49', '#075985', '#0284C7', '#0EA5E9', '#0369A1', '#082F49',
      '#0C4A6E', '#0369A1', '#0284C7', '#38BDF8', '#075985', '#082F49',
      '#082F49', '#0C4A6E', '#0284C7', '#0EA5E9', '#0369A1', '#082F49',
      '#062033', '#075985', '#0369A1', '#0284C7', '#0C4A6E', '#062033',
      '#062033', '#0C4A6E', '#0369A1', '#38BDF8', '#0284C7', '#082F49',
      '#041624', '#082F49', '#0C4A6E', '#075985', '#0C4A6E', '#062033',
    ],
  },
};

const SCORING_EVENT_TYPES: MatchEventType[] = [
  'goal',
  'penalty_goal',
  'seven_meters',
  'direct_free_throw',
  'point_1',
  'point_2',
  'point_3',
  'volleyball_ace',
  'volleyball_block',
  'volleyball_attack',
];

function getPaletteForTeam(teamId?: string | null) {
  if (!teamId) return BRAND_MESHES.intramed;
  const clean = teamId.toLowerCase();
  if (clean.includes('colossal') || clean === '24') return BRAND_MESHES.colossal;
  if (clean.includes('soberana') || clean === '25') return BRAND_MESHES.soberana;
  if (clean.includes('sanguinaria') || clean === '21') return BRAND_MESHES.sanguinaria;
  if (clean.includes('predadora') || clean === '22') return BRAND_MESHES.predadora;
  if (clean.includes('tormenta') || clean === '23') return BRAND_MESHES.tormenta;
  return BRAND_MESHES.intramed;
}

function shortDateBadge(dateStr?: string | null): string {
  if (!dateStr) return 'IX';
  const m = /(\d{2}\/\d{2})/.exec(dateStr);
  return m ? m[1] : dateStr.slice(0, 5);
}

function sortUpcomingMatches(matches: Match[]): Match[] {
  const dayWeight = (d?: string | null) => {
    if (!d) return 99;
    if (d.includes('20/11')) return 1;
    if (d.includes('21/11')) return 2;
    if (d.includes('22/11')) return 3;
    if (d.includes('28/11')) return 4;
    if (d.includes('29/11')) return 5;
    return 50;
  };
  return [...matches].sort((a, b) => {
    const aLive = a.status === 'live' || a.status === 'halftime' ? 0 : 1;
    const bLive = b.status === 'live' || b.status === 'halftime' ? 0 : 1;
    if (aLive !== bLive) return aLive - bLive;
    const da = dayWeight(a.scheduledDate);
    const db = dayWeight(b.scheduledDate);
    if (da !== db) return da - db;
    return (a.scheduledTime || '99:99').localeCompare(b.scheduledTime || '99:99');
  });
}

export const IntramedWarpShowcase: React.FC<IntramedWarpShowcaseProps> = ({
  initialMode = 'upcoming',
  compact = false,
}) => {
  const navigate = useNavigate();
  const { visibleMatches, visibleAthletes, visibleTeams, getSheetByMatchId, getTeamById } =
    useCompetitionStore();

  const [mode, setMode] = useState<ShowcaseMode>(initialMode);
  const [activeIndex, setActiveIndex] = useState(0);

  const detailsCycle: WarpCardDetail[] = ['ring', 'wave', 'cross', 'slider'];

  // 1. MODO PRÓXIMOS JOGOS / AO VIVO
  const upcomingEntries = useMemo<ShowcaseCardEntry[]>(() => {
    const candidates = sortUpcomingMatches(
      visibleMatches.filter(
        (m) =>
          m.modalityId !== 'natacao' &&
          m.id !== 'match_natacao_geral_final' &&
          (m.status === 'live' || m.status === 'halftime' || m.status === 'scheduled')
      )
    ).slice(0, 6);

    if (candidates.length === 0) {
      const finishedSample = visibleMatches
        .filter((m) => m.modalityId !== 'natacao' && m.status === 'finished')
        .slice(0, 4);
      if (finishedSample.length > 0) {
        return finishedSample.map((m, idx) => {
          const pal = getPaletteForTeam(m.homeTeam.teamId || m.awayTeam.teamId);
          return {
            card: {
              title: `${m.modalityName}\n${m.homeTeam.teamName || 'TBD'} × ${m.awayTeam.teamName || 'TBD'}`,
              value: `${m.homeTeam.score ?? 0}-${m.awayTeam.score ?? 0}`,
              unit: 'FIM',
              footer: `${m.phaseLabel || 'Oficial'} • ${shortDateBadge(m.scheduledDate)}`,
              detail: detailsCycle[idx % detailsCycle.length],
              ...pal,
            },
            ctaLabel: 'Ver Placar',
            ctaPath: `/placar/${m.id}`,
            subtitle: `${m.modalityName} • ${m.homeTeam.teamName} × ${m.awayTeam.teamName}`,
          };
        });
      }
    }

    return candidates.map((m, idx) => {
      const isLive = m.status === 'live' || m.status === 'halftime';
      const sheet = getSheetByMatchId(m.id);
      const isSets = sheet?.scoringModel === 'sets_points';
      const curSet =
        isSets && sheet
          ? sheet.periodScores.find((p) => p.periodNumber === (sheet.timer.currentPeriod || 1)) ||
            sheet.periodScores[0]
          : undefined;

      const pal = getPaletteForTeam(m.homeTeam.teamId || m.awayTeam.teamId);
      const catSuffix =
        m.categoryName &&
        !m.modalityName.toLowerCase().includes(m.categoryName.toLowerCase().slice(0, 4))
          ? ` ${m.categoryName.startsWith('Fem') ? 'Fem' : m.categoryName.startsWith('Masc') ? 'Masc' : ''}`
          : '';

      const homeLabel = m.homeTeam.teamName || 'A definir';
      const awayLabel = m.awayTeam.teamName || 'A definir';
      const valStr = isLive
        ? isSets
          ? `${curSet?.homeScore ?? 0}×${curSet?.awayScore ?? 0}`
          : `${m.homeTeam.score ?? 0}-${m.awayTeam.score ?? 0}`
        : m.scheduledTime || 'Breve';

      return {
        card: {
          title: `${m.modalityName}${catSuffix}\n${homeLabel} × ${awayLabel}`,
          value: valStr,
          unit: isLive ? 'LIVE' : shortDateBadge(m.scheduledDate),
          footer: `${m.phaseLabel || 'Confronto'} • ${m.venue || 'Quadra Oficial'}`,
          detail: detailsCycle[idx % detailsCycle.length],
          labels:
            detailsCycle[idx % detailsCycle.length] === 'cross'
              ? [shortDateBadge(m.scheduledDate), 'M', 'V']
              : detailsCycle[idx % detailsCycle.length] === 'slider'
              ? [homeLabel.slice(0, 10), awayLabel.slice(0, 10)]
              : undefined,
          ...pal,
        },
        ctaLabel: isLive ? 'Acompanhar Ao Vivo' : 'Detalhes do Jogo',
        ctaPath: `/placar/${m.id}`,
        subtitle: `${m.modalityName}${catSuffix} • ${homeLabel} × ${awayLabel}`,
      };
    });
  }, [visibleMatches, getSheetByMatchId]);

  // 2. MODO ARTILHEIROS & ELENCOS REAIS (Zero números fictícios)
  const scorerEntries = useMemo<ShowcaseCardEntry[]>(() => {
    const scoreMap = new Map<
      string,
      {
        athleteId: string;
        name: string;
        teamId?: string;
        modalityName: string;
        unitLabel: string;
        points: number;
      }
    >();

    for (const m of visibleMatches) {
      if (m.status !== 'live' && m.status !== 'halftime' && m.status !== 'finished') continue;
      const sheet = getSheetByMatchId(m.id);
      if (!sheet) continue;

      for (const ev of sheet.events || []) {
        if (ev.isDeleted || !ev.athleteId || !SCORING_EVENT_TYPES.includes(ev.type)) continue;
        const delta =
          ev.type === 'point_3' ? 3 : ev.type === 'point_2' ? 2 : 1;
        const unitLabel =
          m.modalityId === 'basquete' || m.modalityId === 'volei' || m.modalityId === 'volei-de-praia'
            ? 'pts'
            : 'gols';
        const key = `${ev.athleteId}_${m.modalityId}`;
        const prev = scoreMap.get(key);
        const ath = visibleAthletes.find((a) => a.id === ev.athleteId);
        const resolvedTeamId =
          ath?.teamId ||
          (ev.teamSide === 'home' ? m.homeTeam.teamId : m.awayTeam.teamId) ||
          undefined;

        if (prev) {
          prev.points += delta;
        } else {
          scoreMap.set(key, {
            athleteId: ev.athleteId,
            name: ev.athleteName || ath?.name || 'Atleta',
            teamId: resolvedTeamId,
            modalityName: m.modalityName,
            unitLabel,
            points: delta,
          });
        }
      }
    }

    const realLeaders = Array.from(scoreMap.values())
      .filter((x) => x.points > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, 6);

    if (realLeaders.length > 0) {
      return realLeaders.map((leader, idx) => {
        const team = leader.teamId ? getTeamById(leader.teamId) : undefined;
        const pal = getPaletteForTeam(leader.teamId);
        const shortName = leader.name.split(' ').slice(0, 2).join(' ');
        return {
          card: {
            title: `${idx + 1}º Artilheiro • ${leader.modalityName}\n${shortName}`,
            value: String(leader.points),
            unit: leader.unitLabel,
            footer: `${team?.name || 'Medicina UEMA'} • Ranking Oficial`,
            detail: detailsCycle[idx % detailsCycle.length],
            labels:
              detailsCycle[idx % detailsCycle.length] === 'cross'
                ? [`#${idx + 1}`, 'PRO', 'IX']
                : undefined,
            ...pal,
          },
          ctaLabel: 'Ficha do Atleta',
          ctaPath: `/atleta/${leader.athleteId}`,
          subtitle: `${shortName} (${team?.name || 'IntraMed'}) • ${leader.points} ${leader.unitLabel}`,
        };
      });
    }

    // Antes do 1º gol do torneio: mostra os elencos reais confirmados por Turma!
    return visibleTeams.map((team, idx) => {
      const count = visibleAthletes.filter((a) => a.teamId === team.id).length;
      const pal = getPaletteForTeam(team.id);
      const cleanTurma =
        team.id === 'sanguinaria'
          ? 'Turma 21'
          : team.id === 'predadora'
          ? 'Turma 22'
          : team.id === 'tormenta'
          ? 'Turma 23'
          : team.id === 'colossal'
          ? 'Turma 24'
          : 'Turma 25';
      return {
        card: {
          title: `Elenco Oficial • ${cleanTurma}\n${team.name}`,
          value: String(count),
          unit: count === 1 ? 'atleta' : 'atletas',
          footer: 'Artilharia abre no 1º jogo (20/11)',
          detail: detailsCycle[idx % detailsCycle.length],
          labels:
            detailsCycle[idx % detailsCycle.length] === 'slider'
              ? ['Inscritos', 'Prontos']
              : detailsCycle[idx % detailsCycle.length] === 'cross'
              ? [cleanTurma, 'IX', '26']
              : undefined,
          ...pal,
        },
        ctaLabel: `Ver ${team.name}`,
        ctaPath: `/equipe/${team.id}`,
        subtitle: `${team.name} (${cleanTurma}) • ${count} atletas confirmados`,
      };
    });
  }, [visibleMatches, visibleAthletes, visibleTeams, getSheetByMatchId, getTeamById]);

  // 3. MODO ESTATÍSTICAS GERAIS DO TORNEIO
  const statsEntries = useMemo<ShowcaseCardEntry[]>(() => {
    const nonSwimming = visibleMatches.filter(
      (m) => m.modalityId !== 'natacao' && m.id !== 'match_natacao_geral_final'
    );
    const finishedCount = nonSwimming.filter((m) => m.status === 'finished').length;
    const liveCount = nonSwimming.filter(
      (m) => m.status === 'live' || m.status === 'halftime'
    ).length;

    let totalGoalsAndPoints = 0;
    for (const m of nonSwimming) {
      if (m.status === 'live' || m.status === 'halftime' || m.status === 'finished') {
        totalGoalsAndPoints += (m.homeTeam.score ?? 0) + (m.awayTeam.score ?? 0);
      }
    }

    return [
      {
        card: {
          title: 'Atletas Oficiais\nConfirmados',
          value: String(visibleAthletes.length),
          unit: 'atletas',
          footer: '5 Turmas • Medicina UEMA',
          detail: 'ring',
          ...BRAND_MESHES.intramed,
        },
        ctaLabel: 'Ver Equipes',
        ctaPath: '/equipe',
        subtitle: `${visibleAthletes.length} atletas confirmados nas 5 atléticas`,
      },
      {
        card: {
          title: 'Grade Oficial\nde Confrontos',
          value: String(nonSwimming.length),
          unit: 'jogos',
          footer:
            liveCount > 0
              ? `${liveCount} ao vivo agora • ${finishedCount} encerrados`
              : finishedCount > 0
              ? `${finishedCount} de ${nonSwimming.length} jogos concluídos`
              : 'De 20/11 a 29/11 • Tabela Oficial',
          detail: 'wave',
          ...BRAND_MESHES.colossal,
        },
        ctaLabel: 'Calendário Completo',
        ctaPath: '/jogos',
        subtitle: `${nonSwimming.length} confrontos oficiais programados`,
      },
      {
        card: {
          title: 'Modalidades\nem Disputa',
          value: '16',
          unit: 'mod',
          footer: '8 Coletivas (20 pts) • 8 Individuais',
          detail: 'cross',
          labels: ['IX Edição', '8C', '8I'],
          ...BRAND_MESHES.soberana,
        },
        ctaLabel: 'Ver Chaveamento',
        ctaPath: '/chaveamento',
        subtitle: '16 modalidades oficiais valendo pontos para o troféu geral',
      },
      {
        card:
          totalGoalsAndPoints > 0
            ? {
                title: 'Placar Acumulado\nGols & Sets',
                value: String(totalGoalsAndPoints),
                unit: 'pts',
                footer: 'Registrados na Súmula Eletrônica',
                detail: 'slider',
                labels: ['Abertura', 'Finais'],
                ...BRAND_MESHES.predadora,
              }
            : {
                title: 'Disputa Pelo\nTítulo Geral',
                value: '5',
                unit: 'turmas',
                footer: 'T21 • T22 • T23 • T24 • T25',
                detail: 'slider',
                labels: ['20/11', '29/11'],
                ...BRAND_MESHES.tormenta,
              },
        ctaLabel: 'Ver Artilharia',
        ctaPath: '/artilharia',
        subtitle:
          totalGoalsAndPoints > 0
            ? `${totalGoalsAndPoints} gols/sets computados oficialmente`
            : 'Sanguinária, Predadora, Tormenta, Colossal e Soberana',
      },
    ];
  }, [visibleMatches, visibleAthletes.length]);

  const activeEntries =
    mode === 'upcoming'
      ? upcomingEntries
      : mode === 'scorers'
      ? scorerEntries
      : statsEntries;

  const safeEntries = activeEntries.length > 0 ? activeEntries : statsEntries;
  const safeIndex = ((activeIndex % safeEntries.length) + safeEntries.length) % safeEntries.length;
  const currentEntry = safeEntries[safeIndex];
  const cards = useMemo(() => safeEntries.map((e) => e.card), [safeEntries]);

  const handleModeChange = (nextMode: ShowcaseMode) => {
    setMode(nextMode);
    setActiveIndex(0);
  };

  return (
    <section className="all-sports-card overflow-hidden p-4 sm:p-5 space-y-3">
      {/* Barra Superior: Seletor de Modo (Próximos Jogos | Artilheiros | Estatísticas) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-yellow shrink-0" aria-hidden="true" />
          <span className="text-xs sm:text-sm font-display font-extrabold text-brand-text-primary tracking-tight">
            Radar 3D • IntraMed IX
          </span>
        </div>

        <div
          role="tablist"
          aria-label="Modo de visualização do carrossel 3D"
          className="inline-flex items-center gap-1 p-1 rounded-full bg-[#F3F4F9] shadow-[inset_0_0_0_1px_rgba(15,42,86,0.06)] self-start sm:self-auto"
        >
          {[
            { id: 'upcoming' as const, label: 'Em Breve', icon: CalendarClock },
            { id: 'scorers' as const, label: 'Artilheiros', icon: Flame },
            { id: 'stats' as const, label: 'Estatísticas', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleModeChange(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-display font-bold transition-[transform,background-color,color,box-shadow] duration-[160ms] ease-emil-out active:scale-[0.96] ${
                  isActive
                    ? 'bg-[#0B218A] text-white shadow-sm'
                    : 'text-slate-600 can-hover:hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive ? 'text-brand-yellow' : 'text-[#0B218A]'
                  }`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Palco 3D WebGL WarpCarousel integrado à superfície clara oficial */}
      <div className="relative rounded-[18px] overflow-hidden shadow-[inset_0_0_0_1px_rgba(15,42,86,0.06)] bg-[#F4F6FB]">
        <WarpCarousel
          cards={cards}
          index={safeIndex}
          onIndexChange={setActiveIndex}
          autoplay
          step={1}
          interval={4.2}
          warp={0.92}
          background="#F4F6FB"
          ariaLabel="Destaques em 3D do IntraMed IX"
          style={{
            minHeight: compact ? 300 : 340,
            maxHeight: compact ? 360 : 420,
            aspectRatio: '16 / 10',
          }}
        />
      </div>

      {/* Rodapé Interativo: Resumo do Card em Foco + Controles & Ação Direta */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() =>
              setActiveIndex((prev) => (prev - 1 + safeEntries.length) % safeEntries.length)
            }
            aria-label="Card anterior"
            className="w-8 h-8 rounded-full bg-[#F3F4F9] can-hover:hover:bg-brand-blue-light text-[#0B218A] flex items-center justify-center transition-[transform,background-color] duration-[150ms] ease-emil-out active:scale-[0.92] shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setActiveIndex((prev) => (prev + 1) % safeEntries.length)}
            aria-label="Próximo card"
            className="w-8 h-8 rounded-full bg-[#F3F4F9] can-hover:hover:bg-brand-blue-light text-[#0B218A] flex items-center justify-center transition-[transform,background-color] duration-[150ms] ease-emil-out active:scale-[0.92] shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-xs font-semibold text-slate-600 truncate">
            {currentEntry?.subtitle}
          </span>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <div className="hidden sm:flex items-center gap-1" aria-hidden="true">
            {safeEntries.map((_, idx) => (
              <button
                key={idx}
                type="button"
                tabIndex={-1}
                onClick={() => setActiveIndex(idx)}
                className={`h-1.5 rounded-full transition-[width,background-color] duration-[200ms] ease-emil-out ${
                  idx === safeIndex ? 'w-5 bg-[#0B218A]' : 'w-1.5 bg-slate-300'
                }`}
              />
            ))}
          </div>

          {currentEntry && (
            <button
              type="button"
              onClick={() => navigate(currentEntry.ctaPath)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B218A] can-hover:hover:bg-[#1532B5] text-white text-xs font-display font-bold shadow-sm transition-[transform,background-color] duration-[150ms] ease-emil-out active:scale-[0.97]"
            >
              <Trophy className="w-3.5 h-3.5 text-brand-yellow" />
              <span>{currentEntry.ctaLabel}</span>
              <ArrowRight className="w-3.5 h-3.5 text-brand-yellow" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
