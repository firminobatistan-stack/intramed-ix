import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { WarpCard, WarpCarousel } from '@/components/ui/warp-carousel';
import { useCompetitionStore } from '../../context/CompetitionStoreContext';
import { Athlete, Match, MatchEventType } from '../../types/domain';

export type ShowcaseMode = 'upcoming' | 'scorers' | 'stats';

interface ShowcaseCardEntry {
  card: WarpCard;
  ctaPath: string;
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
    numeral: ['#FFFFFF', '#FACC15'],
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
    numeral: ['#FFFFFF', '#FDE047'],
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
    numeral: ['#FFFFFF', '#FDE047'],
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
    numeral: ['#FFFFFF', '#FDE047'],
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
    numeral: ['#FFFFFF', '#FACC15'],
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
    numeral: ['#FFFFFF', '#7DD3FC'],
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

function getTurmaShortLabel(teamId?: string | null, turma?: string | null): string {
  const clean = (teamId || turma || '').toLowerCase();
  if (clean.includes('sanguinaria') || clean.includes('21')) return 'Turma 21';
  if (clean.includes('predadora') || clean.includes('22')) return 'Turma 22';
  if (clean.includes('tormenta') || clean.includes('23')) return 'Turma 23';
  if (clean.includes('colossal') || clean.includes('24')) return 'Turma 24';
  if (clean.includes('soberana') || clean.includes('25')) return 'Turma 25';
  return 'Medicina UEMA';
}

function shortDateBadge(dateStr?: string | null): string {
  if (!dateStr) return 'IX EDIÇÃO';
  const m = /(\d{2}\/\d{2})/.exec(dateStr);
  return m ? `DIA ${m[1]}` : dateStr.slice(0, 8);
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

/**
 * Seleciona atletas confirmados com foto real (`avatarUrl`), intercalando as 5 Turmas
 * para que todas as atléticas apareçam representadas nos cards 3D.
 */
function pickDiversifiedAthletesWithPhoto(athletes: Athlete[], limit = 6): Athlete[] {
  const withPhoto = athletes.filter(
    (a) => typeof a.avatarUrl === 'string' && a.avatarUrl.trim().length > 10
  );
  if (withPhoto.length === 0) return [];

  const buckets = new Map<string, Athlete[]>();
  for (const ath of withPhoto) {
    const key = (ath.teamId || ath.turma || 'other').toLowerCase();
    const list = buckets.get(key) || [];
    list.push(ath);
    buckets.set(key, list);
  }

  const picked: Athlete[] = [];
  const keys = Array.from(buckets.keys());
  let round = 0;
  while (picked.length < limit) {
    let addedInRound = false;
    for (const k of keys) {
      const arr = buckets.get(k)!;
      if (round < arr.length) {
        picked.push(arr[round]);
        addedInRound = true;
        if (picked.length >= limit) break;
      }
    }
    if (!addedInRound) break;
    round++;
  }
  return picked;
}

export const IntramedWarpShowcase: React.FC<IntramedWarpShowcaseProps> = ({
  initialMode = 'upcoming',
  compact = false,
}) => {
  const navigate = useNavigate();
  const { visibleMatches, visibleAthletes, getSheetByMatchId, getTeamById } =
    useCompetitionStore();

  const entries = useMemo<ShowcaseCardEntry[]>(() => {
    const list: ShowcaseCardEntry[] = [];

    // 1. Gols / Cestas / Pontos Marcados ao Vivo ou nas Partidas Recentes (com foto do atleta!)
    const recentPlayItems: ShowcaseCardEntry[] = [];
    const scoreMap = new Map<
      string,
      {
        athleteId: string;
        name: string;
        avatarUrl?: string | null;
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
        const ath = visibleAthletes.find((a) => a.id === ev.athleteId);
        const resolvedTeamId =
          ath?.teamId ||
          (ev.teamSide === 'home' ? m.homeTeam.teamId : m.awayTeam.teamId) ||
          undefined;
        const team = resolvedTeamId ? getTeamById(resolvedTeamId) : undefined;
        const pal = getPaletteForTeam(resolvedTeamId);
        const photoUrl = ath?.avatarUrl || team?.crestUrl || null;
        const shortName = (ev.athleteName || ath?.name || 'Atleta')
          .split(' ')
          .slice(0, 2)
          .join(' ');

        if (recentPlayItems.length < 3 && photoUrl) {
          const eventBadge =
            m.modalityId === 'basquete'
              ? ev.type === 'point_3'
                ? 'CESTA DE 3 PTS'
                : 'CESTA MARCADA'
              : m.modalityId === 'volei' || m.modalityId === 'volei-de-praia'
              ? ev.type === 'volleyball_ace'
                ? 'PONTO DE ACE'
                : ev.type === 'volleyball_block'
                ? 'BLOQUEIO'
                : 'PONTO MARCADO'
              : 'GOL MARCADO';

          recentPlayItems.push({
            card: {
              title: `${eventBadge} • ${m.modalityName}\n${shortName}`,
              value: `${m.homeTeam.score ?? 0}×${m.awayTeam.score ?? 0}`,
              unit: ev.matchClockDisplay || 'AO VIVO',
              footer: `${team?.name || 'Medicina UEMA'} • ${m.homeTeam.teamName} × ${m.awayTeam.teamName}`,
              imageUrl: photoUrl,
              ...pal,
            },
            ctaPath: `/placar/${m.id}`,
          });
        }

        const delta = ev.type === 'point_3' ? 3 : ev.type === 'point_2' ? 2 : 1;
        const unitLabel =
          m.modalityId === 'basquete' || m.modalityId === 'volei' || m.modalityId === 'volei-de-praia'
            ? 'PTS'
            : 'GOLS';
        const key = `${ev.athleteId}_${m.modalityId}`;
        const prev = scoreMap.get(key);
        if (prev) {
          prev.points += delta;
        } else {
          scoreMap.set(key, {
            athleteId: ev.athleteId,
            name: ev.athleteName || ath?.name || 'Atleta',
            avatarUrl: photoUrl,
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
      .slice(0, 3);

    const scorerItems: ShowcaseCardEntry[] = realLeaders.map((leader, idx) => {
      const team = leader.teamId ? getTeamById(leader.teamId) : undefined;
      const pal = getPaletteForTeam(leader.teamId);
      const shortName = leader.name.split(' ').slice(0, 2).join(' ');
      return {
        card: {
          title: `${idx + 1}º Artilheiro • ${leader.modalityName}\n${shortName}`,
          value: String(leader.points),
          unit: leader.unitLabel,
          footer: `${team?.name || 'Medicina UEMA'} • Ranking Oficial`,
          imageUrl: leader.avatarUrl || team?.crestUrl || null,
          ...pal,
        },
        ctaPath: `/atleta/${leader.athleteId}`,
      };
    });

    // 2. Atletas com Presença Confirmada (Fotos Reais das 5 Turmas!)
    const featuredAthletes = pickDiversifiedAthletesWithPhoto(visibleAthletes, 6);
    const confirmedAthleteItems: ShowcaseCardEntry[] = featuredAthletes.map((ath) => {
      const team = ath.teamId ? getTeamById(ath.teamId) : undefined;
      const pal = getPaletteForTeam(ath.teamId);
      const turmaLabel = getTurmaShortLabel(ath.teamId, ath.turma);
      const shortName = ath.name.split(' ').slice(0, 2).join(' ');
      const badgeVal =
        ath.jerseyNumber != null && String(ath.jerseyNumber).trim() !== ''
          ? `CAMISA #${ath.jerseyNumber}`
          : 'CONFIRMADO';

      return {
        card: {
          title: `Presença Confirmada\n${shortName}`,
          value: badgeVal,
          unit: '',
          footer: `${team?.name || 'Atleta Oficial'} • ${turmaLabel}`,
          imageUrl: ath.avatarUrl,
          ...pal,
        },
        ctaPath: `/atleta/${ath.id}`,
      };
    });

    // 3. Próximos Jogos / Partidas Ao Vivo (com os 2 Escudos das Equipes!)
    const upcoming = sortUpcomingMatches(
      visibleMatches.filter(
        (m) =>
          m.modalityId !== 'natacao' &&
          m.id !== 'match_natacao_geral_final' &&
          (m.status === 'live' || m.status === 'halftime' || m.status === 'scheduled')
      )
    ).slice(0, 4);

    const matchItems: ShowcaseCardEntry[] = upcoming.map((m) => {
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
          unit: isLive ? 'AO VIVO' : shortDateBadge(m.scheduledDate),
          footer: `${m.phaseLabel || 'Confronto'} • ${m.venue || 'Quadra Oficial'}`,
          imageUrl: m.homeTeam.crestUrl || null,
          secondaryImageUrl: m.awayTeam.crestUrl || null,
          ...pal,
        },
        ctaPath: `/placar/${m.id}`,
      };
    });

    // 4. Estatísticas Oficiais do Torneio
    const nonSwimming = visibleMatches.filter(
      (m) => m.modalityId !== 'natacao' && m.id !== 'match_natacao_geral_final'
    );
    const statItems: ShowcaseCardEntry[] = [
      {
        card: {
          title: 'Estatísticas Oficiais\nAtletas Confirmados',
          value: String(visibleAthletes.length),
          unit: 'ATLETAS',
          footer: '5 Turmas • Medicina UEMA',
          ...BRAND_MESHES.intramed,
        },
        ctaPath: '/equipe',
      },
      {
        card: {
          title: 'Calendário Oficial\nConfrontos na Tabela',
          value: String(nonSwimming.length),
          unit: 'JOGOS',
          footer: 'De 20/11 a 29/11 • Quadra Oficial',
          ...BRAND_MESHES.colossal,
        },
        ctaPath: '/jogos',
      },
    ];

    if (initialMode === 'scorers') {
      list.push(
        ...scorerItems,
        ...recentPlayItems,
        ...confirmedAthleteItems.slice(0, 4),
        ...statItems.slice(0, 1)
      );
    } else {
      // Intercala: Atletas Confirmados (com foto), Gols/Artilheiros (quando houver), Próximos Jogos (com escudos) e Estatísticas!
      if (recentPlayItems.length > 0 || scorerItems.length > 0) {
        list.push(...recentPlayItems.slice(0, 2), ...scorerItems.slice(0, 2));
      }
      if (confirmedAthleteItems[0]) list.push(confirmedAthleteItems[0]);
      if (matchItems[0]) list.push(matchItems[0]);
      if (confirmedAthleteItems[1]) list.push(confirmedAthleteItems[1]);
      if (statItems[0]) list.push(statItems[0]);
      if (confirmedAthleteItems[2]) list.push(confirmedAthleteItems[2]);
      if (matchItems[1]) list.push(matchItems[1]);
      if (confirmedAthleteItems[3]) list.push(confirmedAthleteItems[3]);
      if (matchItems[2]) list.push(matchItems[2]);
      if (confirmedAthleteItems[4]) list.push(confirmedAthleteItems[4]);
      if (statItems[1]) list.push(statItems[1]);
      if (confirmedAthleteItems[5]) list.push(confirmedAthleteItems[5]);
    }

    return list.length >= 4 ? list : [...list, ...matchItems, ...statItems];
  }, [
    visibleMatches,
    visibleAthletes,
    getSheetByMatchId,
    getTeamById,
    initialMode,
  ]);

  const cards = useMemo(() => entries.map((e) => e.card), [entries]);

  return (
    <section className="relative -mx-4 sm:mx-0 overflow-hidden select-none">
      <WarpCarousel
        cards={cards}
        autoplay
        step={1}
        interval={4.2}
        warp={0.92}
        background="#F4F6FB"
        ariaLabel="Destaques em 3D do IX IntraMed"
        onFrontCardClick={(idx) => {
          const target = entries[idx];
          if (target?.ctaPath) {
            navigate(target.ctaPath);
          }
        }}
        style={{
          minHeight: compact ? 300 : 340,
          maxHeight: compact ? 350 : 400,
          aspectRatio: '16 / 9',
        }}
      />
    </section>
  );
};
