import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Share2,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Download,
  FileSpreadsheet,
  LayoutList,
} from 'lucide-react';
import { useCompetitionStore } from '../context/CompetitionStoreContext';
import { formatSecondsToClock } from '../data/sportRulesConfig';
import { TeamCrest } from '../components/sports/TeamCrest';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TestModeBanner } from '../components/layout/TestModeBanner';
import { MatchEvent, MatchLineupEntry } from '../types/domain';

type SheetDocumentViewMode = 'cbhb_official' | 'digital_summary';

interface PlayerDerivedRow {
  jerseyNumber: number | string;
  name: string;
  goalsCount: number;
  goalSequenceNumbers: number[]; // Quais números de 1..25 o jogador marcou
  yellowCardClock: string;
  suspensionsClocks: [string, string, string];
  disqualificationClock: string;
  reportClock: string;
}

/**
 * SÚMULA OFICIAL DA PARTIDA (/sumula/:matchId/documento)
 * - Oferece 2 modos de visualização e download:
 *   1. "Relatório de Jogo Oficial (Padrão CBHb / A.A.A. Cangaceira — 3 Folhas A4)":
 *      Réplica fiel da Súmula Oficial enviada pelo usuário, com a logo da A.A.A. Cangaceira,
 *      preenchida automaticamente com todos os dados registrados ao vivo no jogo:
 *      • Folha 1: Relatório de Jogo Oficial (Equipes A e B lado a lado, Nº, Nome, G, A, 2', D, D+R, Oficiais A–D, Observações e Assinaturas);
 *      • Folha 2: Relatório Detalhado de Gols (Grade 1 a 25 por atleta + Placar Progressivo 1 a 50 riscando cada gol na ordem + 7m/Pênaltis 1 a 20);
 *      • Folha 3: Controle de Cronometrista (Advertências com Nº e Tempo, Exclusões com Tempo de Saída e Tempo de Entrada de 2 minutos, Desqualificações e Placar 1–50).
 *   2. "Resumo Digital Moderno": Visualização web compacta.
 * - Qualquer pessoa da comunidade pode abrir, imprimir/salvar em PDF (Folha A4) ou baixar o arquivo HTML/PDF completo da súmula.
 */
export const GeneratedMatchSheetPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const {
    getMatchById,
    getSheetByMatchId,
    getTeamById,
    canOperateOfficialData,
  } = useCompetitionStore();
  const isAdmin = canOperateOfficialData();

  const [viewMode, setViewMode] = useState<SheetDocumentViewMode>('cbhb_official');
  const [activeSheetPage, setActiveSheetPage] = useState<1 | 2 | 3 | 'all'>('all');

  const [signatures, setSignatures] = useState<{
    referee: boolean;
    tableOfficial: boolean;
    homeCaptain: boolean;
    awayCaptain: boolean;
  }>({
    referee: true,
    tableOfficial: true,
    homeCaptain: true,
    awayCaptain: true,
  });

  const match = matchId ? getMatchById(matchId) : undefined;
  const sheet = matchId ? getSheetByMatchId(matchId) : undefined;

  if (!match || !sheet) {
    return (
      <div className="min-h-screen bg-brand-surface-muted p-6 flex flex-col items-center justify-center text-center space-y-4">
        <FileText className="w-10 h-10 text-brand-blue" />
        <h1 className="text-lg font-display font-bold text-brand-text-primary">
          Súmula ainda não disponível
        </h1>
        <p className="text-xs text-brand-text-secondary max-w-sm">
          Selecione uma partida para visualizar ou baixar a súmula oficial consolidada.
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate(isAdmin ? '/admin' : '/jogos')}
        >
          {isAdmin ? 'Ir para o Painel de Súmulas' : 'Voltar para Jogos'}
        </Button>
      </div>
    );
  }

  const homeTeamObj = match.homeTeam.teamId
    ? getTeamById(match.homeTeam.teamId)
    : undefined;
  const awayTeamObj = match.awayTeam.teamId
    ? getTeamById(match.awayTeam.teamId)
    : undefined;

  const chronologicalEvents = [...sheet.events]
    .filter((e) => !e.isDeleted)
    .reverse();

  const auditEntries = sheet.events.flatMap((e) => e.auditHistory);

  // Eventos de Gol / Pontuação por lado
  const isScoringEvent = (ev: MatchEvent) =>
    [
      'goal',
      'point_1',
      'point_2',
      'point_3',
      'set_point',
      'seven_meters',
      'penalty_goal',
    ].includes(ev.type);

  const getEventDelta = (ev: MatchEvent): number => {
    if (typeof ev.pointsDelta === 'number' && ev.pointsDelta > 0) {
      return ev.pointsDelta;
    }
    if (ev.type === 'point_3') return 3;
    if (ev.type === 'point_2') return 2;
    if (
      ev.type === 'goal' ||
      ev.type === 'point_1' ||
      ev.type === 'set_point' ||
      ev.type === 'seven_meters' ||
      ev.type === 'penalty_goal'
    ) {
      return 1;
    }
    return 0;
  };

  // Monta as 16 linhas oficiais de jogadores para a Equipe A (Mandante) e Equipe B (Visitante)
  const buildTeamPlayerRows = (
    side: 'home' | 'away',
    lineup: MatchLineupEntry[]
  ): PlayerDerivedRow[] => {
    const teamEvents = chronologicalEvents.filter((e) => e.teamSide === side);

    // Garante que qualquer atleta que tenha evento mas não estava na escalação inicial também apareça
    const combinedPlayers: MatchLineupEntry[] = [...lineup];
    for (const ev of teamEvents) {
      const evAthName = ev.athleteName;
      if (evAthName) {
        const exists = combinedPlayers.some(
          (p) =>
            (ev.athleteId && p.athleteId === ev.athleteId) ||
            p.athleteName.toLowerCase() === evAthName.toLowerCase()
        );
        if (!exists) {
          combinedPlayers.push({
            athleteId: ev.athleteId || `ev-ath-${ev.id}`,
            athleteName: evAthName,
            jerseyNumber: ev.athleteNumber ?? null,
            isStarter: false,
          });
        }
      }
    }

    const rows: PlayerDerivedRow[] = combinedPlayers.slice(0, 16).map((p) => {
      const pEvents = teamEvents.filter(
        (e) =>
          (e.athleteId && e.athleteId === p.athleteId) ||
          (e.athleteName &&
            e.athleteName.toLowerCase() === p.athleteName.toLowerCase())
      );

      let goalsCount = 0;
      const goalSeq: number[] = [];
      for (const ev of pEvents) {
        if (isScoringEvent(ev)) {
          const d = getEventDelta(ev);
          for (let i = 0; i < d; i += 1) {
            goalsCount += 1;
            goalSeq.push(goalsCount);
          }
        }
      }

      const yellowEv = pEvents.find((e) => e.type === 'yellow_card');
      const suspEvs = pEvents.filter((e) => e.type === 'suspension_2min');
      const disqEv = pEvents.find(
        (e) => e.type === 'red_card' || e.type === 'disqualification'
      );
      const expEv = pEvents.find((e) => e.type === 'expulsion');

      return {
        jerseyNumber: p.jerseyNumber ?? '',
        name: `${p.athleteName}${p.isCaptain ? ' (C)' : ''}${
          p.isGoalkeeper ? ' (GK)' : ''
        }`,
        goalsCount,
        goalSequenceNumbers: goalSeq,
        yellowCardClock: yellowEv ? yellowEv.matchClockDisplay || 'X' : '',
        suspensionsClocks: [
          suspEvs[0]?.matchClockDisplay || '',
          suspEvs[1]?.matchClockDisplay || '',
          suspEvs[2]?.matchClockDisplay || '',
        ],
        disqualificationClock: disqEv ? disqEv.matchClockDisplay || 'X' : '',
        reportClock: expEv ? expEv.matchClockDisplay || 'X' : '',
      };
    });

    while (rows.length < 16) {
      rows.push({
        jerseyNumber: '',
        name: '',
        goalsCount: 0,
        goalSequenceNumbers: [],
        yellowCardClock: '',
        suspensionsClocks: ['', '', ''],
        disqualificationClock: '',
        reportClock: '',
      });
    }

    return rows;
  };

  const homeRows = buildTeamPlayerRows('home', sheet.homeLineup);
  const awayRows = buildTeamPlayerRows('away', sheet.awayLineup);

  // Parciais de 1º Tempo, Fim de Jogo, Extras e 7 Metros/Pênaltis
  const p1 = sheet.periodScores[0];
  const p1Home = p1 ? p1.homeScore : 0;
  const p1Away = p1 ? p1.awayScore : 0;

  const finalHome = match.homeTeam.score ?? 0;
  const finalAway = match.awayTeam.score ?? 0;

  const ot1 = sheet.periodScores[2];
  const ot2 = sheet.periodScores[3];

  const home7mScored = chronologicalEvents.filter(
    (e) =>
      e.teamSide === 'home' &&
      (e.type === 'seven_meters' || e.type === 'penalty_goal')
  ).length;
  const away7mScored = chronologicalEvents.filter(
    (e) =>
      e.teamSide === 'away' &&
      (e.type === 'seven_meters' || e.type === 'penalty_goal')
  ).length;

  const homeTimeouts = chronologicalEvents
    .filter((e) => e.teamSide === 'home' && e.type === 'timeout')
    .slice(0, 3);
  const awayTimeouts = chronologicalEvents
    .filter((e) => e.teamSide === 'away' && e.type === 'timeout')
    .slice(0, 3);

  // Lista de Advertências e Exclusões (T. Saída / T. Entrada) para a Folha 3 (Controle de Cronometrista)
  const buildChronometerControlData = (side: 'home' | 'away') => {
    const teamEvents = chronologicalEvents.filter((e) => e.teamSide === side);

    const warnings = teamEvents
      .filter((e) => e.type === 'yellow_card')
      .slice(0, 3)
      .map((e) => ({
        number: e.athleteNumber ?? '—',
        time: e.matchClockDisplay,
      }));
    while (warnings.length < 3) {
      warnings.push({ number: '', time: '' });
    }

    const exclusions = teamEvents
      .filter(
        (e) =>
          e.type === 'suspension_2min' ||
          e.type === 'red_card' ||
          e.type === 'disqualification' ||
          e.type === 'expulsion'
      )
      .slice(0, 14)
      .map((e) => {
        // Calcula tempo de retorno (+2 minutos ou -2 minutos conforme o relógio)
        let returnClock = '';
        if (e.type === 'suspension_2min' && e.matchClockDisplay.includes(':')) {
          const [mm, ss] = e.matchClockDisplay.split(':').map(Number);
          if (!Number.isNaN(mm) && !Number.isNaN(ss)) {
            const totalSecs = mm * 60 + ss;
            const retSecs = Math.max(0, totalSecs - 120);
            returnClock = formatSecondsToClock(retSecs);
          }
        }
        return {
          number: e.athleteNumber ?? (e.athleteName ? e.athleteName.slice(0, 8) : '—'),
          exitTime: e.type === 'suspension_2min' ? e.matchClockDisplay : '',
          entryTime: returnClock,
          disqTime:
            e.type === 'red_card' || e.type === 'disqualification'
              ? e.matchClockDisplay
              : '',
          reportTime: e.type === 'expulsion' ? e.matchClockDisplay : '',
        };
      });

    while (exclusions.length < 14) {
      exclusions.push({
        number: '',
        exitTime: '',
        entryTime: '',
        disqTime: '',
        reportTime: '',
      });
    }

    return { warnings, exclusions };
  };

  const homeChrono = buildChronometerControlData('home');
  const awayChrono = buildChronometerControlData('away');

  const countEventsByType = (side: 'home' | 'away', types: string[]) =>
    chronologicalEvents.filter(
      (e) => e.teamSide === side && types.includes(e.type)
    ).length;

  const isMasc = !match.categoryName?.toLowerCase().includes('fem');
  const isFem = match.categoryName?.toLowerCase().includes('fem');

  const handlePrintPdf = () => {
    window.print();
  };

  const handleDownloadStandaloneFile = () => {
    const sheetElement = document.getElementById('printable-official-scoresheet');
    if (!sheetElement) {
      window.print();
      return;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Súmula Oficial INTRAMED IX — ${match.modalityName} (${match.homeTeam.teamName} x ${match.awayTeam.teamName})</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .cbhb-print-page { page-break-after: always; break-after: page; margin-bottom: 24px; }
    .cbhb-print-page:last-child { page-break-after: auto; break-after: auto; }
  </style>
</head>
<body class="p-4">
  ${sheetElement.innerHTML}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const cleanHome = (match.homeTeam.teamName || 'equipeA')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
    const cleanAway = (match.awayTeam.teamName || 'equipeB')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
    a.href = url;
    a.download = `sumula-intramed-ix-${match.modalityId}-${cleanHome}-vs-${cleanAway}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const shareTitle = `Súmula Oficial INTRAMED IX — ${match.modalityName}: ${match.homeTeam.teamName} ${finalHome} × ${finalAway} ${match.awayTeam.teamName}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareTitle,
          url: window.location.href,
        });
      } catch {
        // Cancelado
      }
    } else {
      navigator.clipboard?.writeText(window.location.href);
    }
  };

  // Componente reutilizável do Bloco Superior de Placar/Tempos Técnicos (presente nas 3 páginas do PDF CBHb)
  const renderTopMatchScoreHeaderBlock = () => (
    <div className="border-2 border-black text-[10px] leading-tight">
      {/* Linha 1: 1º Tempo | Fim de Jogo | 1º Tempo Extra | 2º Tempo Extra | Tiros de 7 Metros / Pênaltis */}
      <div className="grid grid-cols-5 divide-x-2 divide-black border-b-2 border-black">
        {[
          {
            label:
              match.modalityId === 'volei' || match.modalityId === 'volei-de-praia'
                ? '1º Set'
                : '1º Tempo (Período)',
            a: p1Home,
            b: p1Away,
          },
          {
            label: 'Fim de Jogo (Final)',
            a: finalHome,
            b: finalAway,
          },
          {
            label: '1º Tempo Extra',
            a: ot1 ? ot1.homeScore : '',
            b: ot1 ? ot1.awayScore : '',
          },
          {
            label: '2º Tempo Extra',
            a: ot2 ? ot2.homeScore : '',
            b: ot2 ? ot2.awayScore : '',
          },
          {
            label:
              match.modalityId === 'futsal'
                ? 'Tiros de Pênalti'
                : 'Tiros de 7 Metros',
            a: home7mScored || '',
            b: away7mScored || '',
          },
        ].map((box, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_26px_26px]">
            <div className="p-1.5 flex items-center justify-center text-center font-bold">
              {box.label}
            </div>
            <div className="border-l border-black flex flex-col">
              <span className="border-b border-black text-center font-extrabold bg-slate-100 py-0.5">
                A
              </span>
              <span className="flex-1 flex items-center justify-center font-mono font-extrabold text-xs py-1 bg-[#E8EEF5]">
                {box.a}
              </span>
            </div>
            <div className="border-l border-black flex flex-col">
              <span className="border-b border-black text-center font-extrabold bg-slate-100 py-0.5">
                B
              </span>
              <span className="flex-1 flex items-center justify-center font-mono font-extrabold text-xs py-1 bg-[#E8EEF5]">
                {box.b}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Linha 2: Nº de 7 Metros A | Tempo Técnico Equipe A (I, II, III) | Tempo Técnico Equipe B (I, II, III) | Nº de 7 Metros B */}
      <div className="grid grid-cols-[110px_1fr_1fr_110px] divide-x-2 divide-black">
        <div className="grid grid-cols-[1fr_42px]">
          <div className="p-1 flex items-center justify-center text-center font-bold">
            Nº de 7 Metros
          </div>
          <div className="border-l border-black flex flex-col">
            <span className="border-b border-black text-center font-extrabold bg-slate-100">
              A
            </span>
            <span className="flex-1 flex items-center justify-center font-mono font-bold bg-[#E8EEF5]">
              {home7mScored} / {home7mScored}
            </span>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="border-b border-black text-center font-extrabold py-0.5 bg-slate-100">
            Tempo Técnico - Equipe A ({match.homeTeam.teamName})
          </div>
          <div className="grid grid-cols-3 divide-x border-black flex-1">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="p-1 flex items-center gap-1">
                <span className="font-extrabold">
                  {idx === 0 ? 'I' : idx === 1 ? 'II' : 'III'}
                </span>
                <span className="flex-1 text-center font-mono font-bold bg-[#E8EEF5] px-1 py-0.5 rounded-sm">
                  {homeTimeouts[idx]?.matchClockDisplay || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          <div className="border-b border-black text-center font-extrabold py-0.5 bg-slate-100">
            Tempo Técnico - Equipe B ({match.awayTeam.teamName})
          </div>
          <div className="grid grid-cols-3 divide-x border-black flex-1">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="p-1 flex items-center gap-1">
                <span className="font-extrabold">
                  {idx === 0 ? 'I' : idx === 1 ? 'II' : 'III'}
                </span>
                <span className="flex-1 text-center font-mono font-bold bg-[#E8EEF5] px-1 py-0.5 rounded-sm">
                  {awayTimeouts[idx]?.matchClockDisplay || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_42px]">
          <div className="p-1 flex items-center justify-center text-center font-bold">
            Nº de 7 Metros
          </div>
          <div className="border-l border-black flex flex-col">
            <span className="border-b border-black text-center font-extrabold bg-slate-100">
              B
            </span>
            <span className="flex-1 flex items-center justify-center font-mono font-bold bg-[#E8EEF5]">
              {away7mScored} / {away7mScored}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Componente reutilizável do Placar Progressivo 1 a 50 + Nº de 7 Metros 1 a 20 (Base das Folhas 2 e 3)
  const renderBottomRunningScore50Grid = () => (
    <div className="space-y-2 pt-1 text-[9px] leading-none">
      {/* Placar Progressivo 1 a 50 */}
      <div className="border-2 border-black grid grid-cols-2 divide-x-2 divide-black">
        {[
          { label: `Equipe A (${match.homeTeam.teamName})`, score: finalHome },
          { label: `Equipe B (${match.awayTeam.teamName})`, score: finalAway },
        ].map((sideObj, sIdx) => (
          <div
            key={sIdx}
            className="grid grid-cols-[88px_1fr] divide-x-2 divide-black"
          >
            <div className="flex flex-col">
              <div className="border-b border-black py-1 px-1 text-center font-extrabold bg-slate-100 truncate">
                {sideObj.label}
              </div>
              <div className="flex-1 flex items-center justify-center font-black text-xs tracking-wider py-2">
                PLACAR
              </div>
            </div>
            <div className="grid grid-rows-5 divide-y divide-black">
              {[0, 1, 2, 3, 4].map((rowIdx) => (
                <div
                  key={rowIdx}
                  className="grid grid-cols-10 divide-x divide-black"
                >
                  {Array.from({ length: 10 }, (_, colIdx) => {
                    const num = rowIdx * 10 + colIdx + 1;
                    const isMarked = num <= sideObj.score;
                    return (
                      <div
                        key={num}
                        className={`relative py-1 text-center font-mono ${
                          isMarked
                            ? 'bg-[#0B218A] text-white font-black'
                            : 'text-slate-700'
                        }`}
                      >
                        <span>{num}</span>
                        {isMarked && (
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-brand-yellow font-black text-[11px]">
                            /
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Nº de 7 Metros / Pênaltis 1 a 20 */}
      <div className="border-2 border-black grid grid-cols-2 divide-x-2 divide-black">
        {[
          { count: home7mScored },
          { count: away7mScored },
        ].map((side7m, sIdx) => (
          <div
            key={sIdx}
            className="grid grid-cols-[88px_1fr] divide-x-2 divide-black"
          >
            <div className="flex items-center justify-center text-center font-extrabold p-1 bg-slate-100">
              Nº de 7 Metros
            </div>
            <div className="grid grid-rows-2 divide-y divide-black">
              {[0, 1].map((rIdx) => (
                <div
                  key={rIdx}
                  className="grid grid-cols-10 divide-x divide-black"
                >
                  {Array.from({ length: 10 }, (_, cIdx) => {
                    const num = rIdx * 10 + cIdx + 1;
                    const marked = num <= side7m.count;
                    return (
                      <div
                        key={num}
                        className={`py-1 text-center font-mono ${
                          marked
                            ? 'bg-[#0B218A] text-brand-yellow font-black'
                            : 'text-slate-700'
                        }`}
                      >
                        {num}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-surface-muted pb-12 print:bg-white print:pb-0">
      <div className="print:hidden">
        <TestModeBanner />
      </div>

      {/* BARRA DE FERRAMENTAS SUPERIOR (OCULTA NA IMPRESSÃO / PDF) */}
      <header className="bg-white border-b border-brand-surface-border px-4 sm:px-8 py-3.5 print:hidden sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(isAdmin ? `/sumula/${match.id}` : `/placar/${match.id}`)
              }
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-surface-muted hover:bg-brand-blue-light/50 text-xs font-semibold text-brand-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isAdmin ? 'Voltar ao Operador' : 'Voltar à Partida'}</span>
            </button>
            <div>
              <h1 className="text-sm sm:text-base font-display font-extrabold text-brand-text-primary">
                Súmula Oficial • {match.modalityName} ({match.homeTeam.teamName} ×{' '}
                {match.awayTeam.teamName})
              </h1>
              <span className="block text-[11px] text-brand-text-secondary">
                Preenchida automaticamente pela operação ao vivo • Pronta para baixar ou imprimir em PDF (A4)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Alternador de Modelo: Súmula Oficial CBHb/Cangaceira vs Resumo Digital */}
            <div className="inline-flex items-center bg-brand-surface-muted p-1 rounded-xl border border-brand-surface-border">
              <button
                type="button"
                onClick={() => setViewMode('cbhb_official')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-bold transition-all ${
                  viewMode === 'cbhb_official'
                    ? 'bg-[#0B218A] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Súmula Oficial (Modelo CBHb / Cangaceira)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('digital_summary')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-bold transition-all ${
                  viewMode === 'digital_summary'
                    ? 'bg-[#0B218A] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Resumo Digital</span>
              </button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={handleDownloadStandaloneFile}
            >
              Baixar Arquivo
            </Button>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Share2 className="w-3.5 h-3.5" />}
              onClick={handleShare}
            >
              Compartilhar
            </Button>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              onClick={handlePrintPdf}
            >
              Salvar PDF / Imprimir (A4)
            </Button>
          </div>
        </div>

        {/* Sub-barra de seleção de folha do Relatório Oficial (Folha 1, Folha 2, Folha 3 ou Todas) */}
        {viewMode === 'cbhb_official' && (
          <div className="max-w-5xl mx-auto mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500">
              Folhas do Relatório Oficial de Jogo (A.A.A. Cangaceira):
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'Todas as 3 Folhas (Completo para PDF)' },
                { id: 1, label: 'Folha 1 • Relatório de Jogo (Geral & Assinaturas)' },
                { id: 2, label: 'Folha 2 • Gols 1–25 & Placar Progressivo 1–50' },
                { id: 3, label: 'Folha 3 • Controle de Cronometrista (Exclusões 2\')' },
              ].map((p) => (
                <button
                  key={String(p.id)}
                  type="button"
                  onClick={() => setActiveSheetPage(p.id as 1 | 2 | 3 | 'all')}
                  className={`px-3 py-1 rounded-full text-xs font-display font-bold transition-colors ${
                    activeSheetPage === p.id
                      ? 'bg-brand-yellow text-[#0B218A] shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* =====================================================================================
          MODO 1: SÚMULA OFICIAL PADRÃO CBHb / A.A.A. CANGACEIRA (3 FOLHAS A4 IDÊNTICAS AO PDF)
         ===================================================================================== */}
      {viewMode === 'cbhb_official' && (
        <main
          id="printable-official-scoresheet"
          className="max-w-[940px] mx-auto mt-5 px-2 sm:px-4 print:mt-0 print:px-0 space-y-8 print:space-y-0 text-black"
        >
          {/* ---------------------------------------------------------------------------
              FOLHA 1: RELATÓRIO DE JOGO OFICIAL (PÁGINA 1 DO PDF ENVIADO)
             --------------------------------------------------------------------------- */}
          {(activeSheetPage === 'all' || activeSheetPage === 1) && (
            <section className="cbhb-print-page bg-white border border-slate-300 print:border-none shadow-xl p-5 sm:p-7 print:p-2 space-y-2.5 overflow-x-auto">
              <div className="min-w-[760px] space-y-2">
                {/* Topo com Logo da A.A.A. Cangaceira + Checkboxes de Competição e Categoria */}
                <div className="grid grid-cols-[115px_105px_1.3fr_1.1fr] gap-3 items-center pb-2 border-b-2 border-black">
                  <div className="border-r-2 border-black pr-2 text-center space-y-0.5">
                    <p className="text-xs font-black uppercase tracking-tight">
                      INTRAMED IX
                    </p>
                    <p className="text-[10px] font-bold leading-tight">
                      A.A.A. Cangaceira
                    </p>
                    <p className="text-[9px] font-semibold text-slate-700 leading-tight">
                      Medicina UEMA
                    </p>
                    <p className="text-[9px] font-extrabold uppercase text-[#0B218A] mt-0.5">
                      {match.modalityName}
                    </p>
                  </div>

                  {/* Brasão Oficial da Cangaceira no lugar do escudo da CBHb */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-20 h-20 rounded-xl border-2 border-black bg-[#0B218A] p-1.5 flex items-center justify-center shadow-sm">
                      <img
                        src="/assets/atletica/logo.png"
                        alt="Logo A.A.A. Cangaceira"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  {/* Coluna de Fases do Campeonato (Estilo Checkboxes do PDF) */}
                  <div className="space-y-1 text-[10px]">
                    {[
                      {
                        checked: match.phase === 'group_stage',
                        label: 'Fase de Grupos / Classificatória',
                      },
                      {
                        checked: match.phase === 'quarterfinals',
                        label: 'Quartas de Final • Eliminatórias',
                      },
                      {
                        checked: match.phase === 'semifinals',
                        label: 'Semifinais Oficiais • INTRAMED IX',
                      },
                      {
                        checked: match.phase === 'final',
                        label: 'Grande Final • Disputa de Título',
                      },
                      {
                        checked: Boolean(sheet.isTestMode),
                        label: 'Partida Amistosa / Simulação',
                      },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span
                          className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[9px] font-black ${
                            item.checked
                              ? 'bg-[#0B218A] text-white'
                              : 'bg-[#E8EEF5]'
                          }`}
                        >
                          {item.checked ? 'X' : ''}
                        </span>
                        <span className="font-semibold">{item.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Coluna de Categorias (Adulto / Universitário + Masc / Fem) */}
                  <div className="space-y-1 text-[10px]">
                    {[
                      { cat: 'Universitário', activeCat: true },
                      { cat: '1ª Fase', activeCat: match.phase === 'group_stage' },
                      { cat: 'Mata-Mata', activeCat: match.phase !== 'group_stage' },
                      { cat: 'Série Ouro', activeCat: true },
                      { cat: 'Oficial UEMA', activeCat: !sheet.isTestMode },
                    ].map((row, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-[1fr_auto_auto] items-center gap-2"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[9px] font-black ${
                              row.activeCat
                                ? 'bg-[#0B218A] text-white'
                                : 'bg-[#E8EEF5]'
                            }`}
                          >
                            {row.activeCat ? 'X' : ''}
                          </span>
                          <span className="font-semibold">{row.cat}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span
                            className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[9px] font-black ${
                              idx === 0 && isMasc
                                ? 'bg-[#0B218A] text-white'
                                : 'bg-[#E8EEF5]'
                            }`}
                          >
                            {idx === 0 && isMasc ? 'X' : ''}
                          </span>
                          <span>Masc</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span
                            className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[9px] font-black ${
                              idx === 0 && isFem
                                ? 'bg-[#0B218A] text-white'
                                : 'bg-[#E8EEF5]'
                            }`}
                          >
                            {idx === 0 && isFem ? 'X' : ''}
                          </span>
                          <span>Fem</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Título Central: RELATÓRIO DE JOGO No.: */}
                <div className="flex items-center justify-center gap-3 py-1">
                  <h2 className="text-base font-black uppercase tracking-wide">
                    RELATÓRIO DE JOGO No.:
                  </h2>
                  <span className="px-4 py-0.5 bg-[#E8EEF5] border border-black font-mono font-extrabold text-xs">
                    {sheet.id.toUpperCase()}
                  </span>
                </div>

                {/* Bloco de Identificação da Partida (Equipe Local A vs Equipe Visitante B + Cidade/Local/Data/Hora/Duração) */}
                <div className="border-2 border-black text-[10px]">
                  <div className="grid grid-cols-[1fr_auto_1fr_130px] items-end gap-2 p-2 border-b-2 border-black">
                    <div>
                      <span className="block text-[9px] font-bold uppercase text-slate-600">
                        Equipe Local (Mandante)
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-black">A</span>
                        <div className="flex-1 px-2.5 py-1 bg-[#E8EEF5] border border-slate-400 font-extrabold text-xs flex items-center justify-between">
                          <span>{match.homeTeam.teamName}</span>
                          <span className="text-[10px] font-semibold text-slate-600">
                            {homeTeamObj?.turmaLabel || ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="font-bold text-xs pb-1.5 px-1">versus</span>

                    <div>
                      <span className="block text-[9px] font-bold uppercase text-slate-600">
                        Equipe Visitante
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-black">B</span>
                        <div className="flex-1 px-2.5 py-1 bg-[#E8EEF5] border border-slate-400 font-extrabold text-xs flex items-center justify-between">
                          <span>{match.awayTeam.teamName}</span>
                          <span className="text-[10px] font-semibold text-slate-600">
                            {awayTeamObj?.turmaLabel || ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[9px] font-bold uppercase text-slate-600">
                        Modalidade
                      </span>
                      <div className="mt-0.5 px-2 py-1 bg-[#E8EEF5] border border-slate-400 font-extrabold text-xs text-center truncate">
                        {match.modalityName}
                      </div>
                    </div>
                  </div>

                  {/* Cidade | Local | Data | Hora | Duração */}
                  <div className="grid grid-cols-[1.1fr_1.4fr_0.9fr_0.6fr_0.6fr] gap-2 p-2">
                    <div>
                      <span className="block text-[9px] font-bold">Cidade</span>
                      <div className="mt-0.5 px-2 py-1 bg-[#E8EEF5] border border-slate-400 font-semibold">
                        Caxias - MA (UEMA)
                      </div>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold">Local</span>
                      <div className="mt-0.5 px-2 py-1 bg-[#E8EEF5] border border-slate-400 font-semibold truncate">
                        {match.venue || 'Ginásio Oficial • INTRAMED IX'}
                      </div>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold">Data</span>
                      <div className="mt-0.5 px-2 py-1 bg-[#E8EEF5] border border-slate-400 font-semibold">
                        {match.scheduledDate ||
                          new Date(sheet.lastUpdatedIso).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold">Hora</span>
                      <div className="mt-0.5 px-2 py-1 bg-[#E8EEF5] border border-slate-400 font-mono font-bold text-center">
                        {match.scheduledTime || '19:00'}
                      </div>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold">Duração</span>
                      <div className="mt-0.5 px-2 py-1 bg-[#E8EEF5] border border-slate-400 font-mono font-bold text-center">
                        {formatSecondsToClock(sheet.timer.elapsedSeconds)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bloco de Placar por Tempo e Tempos Técnicos */}
                {renderTopMatchScoreHeaderBlock()}

                {/* TABELA DUPLA DE ATLETAS (EQUIPE A À ESQUERDA | EQUIPE B À DIREITA) */}
                <div className="border-2 border-black text-[10px]">
                  {/* Cabeçalho da Tabela Dupla */}
                  <div className="grid grid-cols-2 divide-x-2 divide-black border-b-2 border-black font-extrabold bg-slate-100">
                    <div className="grid grid-cols-[34px_1fr_28px_28px_36px_28px_34px] divide-x divide-black text-center items-center">
                      <span className="py-1">Nº</span>
                      <div className="px-2 py-1 flex items-center justify-between">
                        <span>Equipe {match.homeTeam.teamName}</span>
                        <span className="font-black text-xs">A</span>
                      </div>
                      <span className="py-1" title="Gols / Pontos">
                        G
                      </span>
                      <span className="py-1" title="Advertências (Amarelo)">
                        A
                      </span>
                      <span className="py-1" title="Exclusões 2 Minutos">
                        2&apos;
                      </span>
                      <span className="py-1" title="Desqualificações (Vermelho)">
                        D
                      </span>
                      <span className="py-1" title="Desqualificação + Relatório">
                        D+R
                      </span>
                    </div>

                    <div className="grid grid-cols-[34px_1fr_28px_28px_36px_28px_34px] divide-x divide-black text-center items-center">
                      <span className="py-1">Nº</span>
                      <div className="px-2 py-1 flex items-center justify-between">
                        <span>Equipe {match.awayTeam.teamName}</span>
                        <span className="font-black text-xs">B</span>
                      </div>
                      <span className="py-1" title="Gols / Pontos">
                        G
                      </span>
                      <span className="py-1" title="Advertências (Amarelo)">
                        A
                      </span>
                      <span className="py-1" title="Exclusões 2 Minutos">
                        2&apos;
                      </span>
                      <span className="py-1" title="Desqualificações (Vermelho)">
                        D
                      </span>
                      <span className="py-1" title="Desqualificação + Relatório">
                        D+R
                      </span>
                    </div>
                  </div>

                  {/* 16 Linhas de Atletas Lado a Lado */}
                  <div className="divide-y divide-black">
                    {Array.from({ length: 16 }, (_, idx) => {
                      const hRow = homeRows[idx];
                      const aRow = awayRows[idx];
                      const stripe = idx % 2 === 1 ? 'bg-[#E8EEF5]/65' : 'bg-white';
                      const hSuspCount = hRow.suspensionsClocks.filter(Boolean).length;
                      const aSuspCount = aRow.suspensionsClocks.filter(Boolean).length;

                      return (
                        <div
                          key={idx}
                          className={`grid grid-cols-2 divide-x-2 divide-black ${stripe}`}
                        >
                          {/* Lado A */}
                          <div className="grid grid-cols-[34px_1fr_28px_28px_36px_28px_34px] divide-x divide-black items-center min-h-[21px]">
                            <span className="text-center font-mono font-bold">
                              {hRow.jerseyNumber}
                            </span>
                            <span className="px-2 font-semibold truncate">
                              {hRow.name}
                            </span>
                            <span className="text-center font-mono font-extrabold">
                              {hRow.goalsCount > 0 ? hRow.goalsCount : ''}
                            </span>
                            <span className="text-center font-mono font-bold text-amber-700">
                              {hRow.yellowCardClock ? 'X' : ''}
                            </span>
                            <span className="text-center font-mono font-bold">
                              {hSuspCount > 0 ? `${hSuspCount}x` : ''}
                            </span>
                            <span className="text-center font-mono font-bold text-rose-700">
                              {hRow.disqualificationClock ? 'X' : ''}
                            </span>
                            <span className="text-center font-mono font-bold text-rose-900">
                              {hRow.reportClock ? 'X' : ''}
                            </span>
                          </div>

                          {/* Lado B */}
                          <div className="grid grid-cols-[34px_1fr_28px_28px_36px_28px_34px] divide-x divide-black items-center min-h-[21px]">
                            <span className="text-center font-mono font-bold">
                              {aRow.jerseyNumber}
                            </span>
                            <span className="px-2 font-semibold truncate">
                              {aRow.name}
                            </span>
                            <span className="text-center font-mono font-extrabold">
                              {aRow.goalsCount > 0 ? aRow.goalsCount : ''}
                            </span>
                            <span className="text-center font-mono font-bold text-amber-700">
                              {aRow.yellowCardClock ? 'X' : ''}
                            </span>
                            <span className="text-center font-mono font-bold">
                              {aSuspCount > 0 ? `${aSuspCount}x` : ''}
                            </span>
                            <span className="text-center font-mono font-bold text-rose-700">
                              {aRow.disqualificationClock ? 'X' : ''}
                            </span>
                            <span className="text-center font-mono font-bold text-rose-900">
                              {aRow.reportClock ? 'X' : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Linhas de Oficiais (Of. A, Of. B, Of. C, Of. D) */}
                  <div className="border-t-2 border-black divide-y divide-black">
                    {['Of. A', 'Of. B', 'Of. C', 'Of. D'].map((ofLabel, oIdx) => (
                      <div
                        key={ofLabel}
                        className={`grid grid-cols-2 divide-x-2 divide-black ${
                          oIdx % 2 === 1 ? 'bg-[#E8EEF5]/65' : 'bg-white'
                        }`}
                      >
                        <div className="grid grid-cols-[34px_1fr_28px_28px_36px_28px_34px] divide-x divide-black items-center min-h-[19px]">
                          <span className="text-center font-bold text-[9px]">
                            {ofLabel}
                          </span>
                          <span className="px-2 text-[9px] font-semibold text-slate-700">
                            {oIdx === 0
                              ? `Responsável Técnico — ${match.homeTeam.teamName}`
                              : ''}
                          </span>
                          <span />
                          <span />
                          <span />
                          <span />
                          <span />
                        </div>
                        <div className="grid grid-cols-[34px_1fr_28px_28px_36px_28px_34px] divide-x divide-black items-center min-h-[19px]">
                          <span className="text-center font-bold text-[9px]">
                            {ofLabel}
                          </span>
                          <span className="px-2 text-[9px] font-semibold text-slate-700">
                            {oIdx === 0
                              ? `Responsável Técnico — ${match.awayTeam.teamName}`
                              : ''}
                          </span>
                          <span />
                          <span />
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Faixa de Assinatura dos Responsáveis pelas Equipes (Of. A) */}
                  <div className="border-t-2 border-black grid grid-cols-[28px_1fr_180px_1fr_28px] items-center p-1.5 bg-slate-50">
                    <span className="text-sm font-black text-center">A</span>
                    <div className="px-2 py-1 bg-[#E8EEF5] border border-slate-400 text-center font-semibold text-[9px]">
                      {signatures.homeCaptain
                        ? `✓ Assinado digitalmente (${match.homeTeam.teamName})`
                        : '________________________________________'}
                    </div>
                    <span className="text-[9px] font-bold text-center px-2">
                      Assinatura dos responsáveis pelas equipes (Of. A)
                    </span>
                    <div className="px-2 py-1 bg-[#E8EEF5] border border-slate-400 text-center font-semibold text-[9px]">
                      {signatures.awayCaptain
                        ? `✓ Assinado digitalmente (${match.awayTeam.teamName})`
                        : '________________________________________'}
                    </div>
                    <span className="text-sm font-black text-center">B</span>
                  </div>
                </div>

                {/* Observação dos Árbitros */}
                <div className="space-y-1 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Observação dos Árbitros:</span>
                    <div className="flex-1 px-2.5 py-1 bg-[#E8EEF5] border border-slate-400 font-semibold min-h-[22px]">
                      {sheet.refereeNotes ||
                        'Partida realizada dentro da normalidade regulamentar do INTRAMED IX.'}
                    </div>
                  </div>
                  {auditEntries.length > 0 && (
                    <div className="px-2.5 py-1 bg-[#E8EEF5] border border-slate-400 text-[9px]">
                      <strong>Correções auditadas na mesa ({auditEntries.length}):</strong>{' '}
                      {auditEntries
                        .map((a) => `${a.previousSummary} → ${a.newSummary}`)
                        .join(' | ')}
                    </div>
                  )}
                </div>

                {/* Bloco de Assinaturas Finais (Representante da Atlética, Árbitros, Secretário/Cronometrista, Delegado) */}
                <div className="border-t-2 border-black pt-2 space-y-1.5 text-[10px]">
                  <div className="grid grid-cols-[210px_1fr_1fr] gap-2 items-center">
                    <span />
                    <span className="text-[9px] font-bold text-slate-600">
                      Nome / Identificação Oficial
                    </span>
                    <span className="text-[9px] font-bold text-slate-600">
                      Assinaturas / Chancela Eletrônica
                    </span>
                  </div>

                  {[
                    {
                      role: 'Representante da Organização (A.A.A. Cangaceira)',
                      name: 'Comissão Organizadora • INTRAMED IX',
                      sig: '✓ Validado • A.A.A. Cangaceira Medicina UEMA',
                    },
                    {
                      role: 'Árbitros da Partida',
                      name: sheet.refereeName || 'Arbitragem Oficial INTRAMED IX',
                      sig: signatures.referee
                        ? '✓ Assinado digitalmente pela Arbitragem'
                        : '____________________________________',
                    },
                    {
                      role: 'Secretário / Cronometrista (Mesário)',
                      name:
                        sheet.tableOfficialName || 'Mesa Operadora Oficial INTRAMED IX',
                      sig: signatures.tableOfficial
                        ? '✓ Registrado e conferido eletronicamente'
                        : '____________________________________',
                    },
                    {
                      role: 'Delegado Técnico • INTRAMED IX',
                      name: 'Diretoria de Esportes • Medicina UEMA',
                      sig: sheet.isClosed
                        ? `✓ Súmula Consolidada (${new Date(
                            sheet.closedAtIso || sheet.lastUpdatedIso
                          ).toLocaleTimeString('pt-BR')})`
                        : 'Em aberto / Operação em tempo real',
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-[210px_1fr_1fr] gap-2 items-center"
                    >
                      <span className="font-bold">{item.role}</span>
                      <div className="px-2.5 py-1 bg-[#E8EEF5] border border-slate-300 font-semibold">
                        {item.name}
                      </div>
                      <div className="px-2.5 py-1 bg-[#E8EEF5] border border-slate-300 font-semibold text-emerald-950">
                        {item.sig}
                      </div>
                    </div>
                  ))}

                  <div className="pt-1.5 border-t border-black text-[9px] leading-snug text-slate-700">
                    <p>
                      Anotar o número total de 7m/pênaltis das equipes A e B, Gols/Pontos (G), Advertências (A), Exclusões 2&apos; (E), Desqualificações (D) e Expulsões (D+R).
                    </p>
                    <p className="font-bold text-black mt-0.5">
                      Documento Oficial gerado pelo Sistema Eletrônico INTRAMED IX — Associação Atlética Acadêmica Cangaceira (Medicina UEMA).
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ---------------------------------------------------------------------------
              FOLHA 2: RELATÓRIO DETALHADO DE GOLS 1–25 & PLACAR PROGRESSIVO 1–50 (PÁGINA 2 DO PDF)
             --------------------------------------------------------------------------- */}
          {(activeSheetPage === 'all' || activeSheetPage === 2) && (
            <section className="cbhb-print-page bg-white border border-slate-300 print:border-none shadow-xl p-5 sm:p-7 print:p-2 space-y-2.5 overflow-x-auto">
              <div className="min-w-[760px] space-y-2">
                {/* Cabeçalho da Folha 2 com Brasão da Cangaceira */}
                <div className="flex items-center justify-between border-b-2 border-black pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg border-2 border-black bg-[#0B218A] p-1 flex items-center justify-center">
                      <img
                        src="/assets/atletica/logo.png"
                        alt="Logo A.A.A. Cangaceira"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-wide">
                        A.A.A. CANGACEIRA • MEDICINA UEMA — INTRAMED IX
                      </h2>
                      <p className="text-[10px] font-bold text-slate-700">
                        {match.modalityName} ({match.categoryName} • {match.phaseLabel}) —{' '}
                        {match.homeTeam.teamName} × {match.awayTeam.teamName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black uppercase block">
                      RELATÓRIO DE JOGO
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-600">
                      Folha 2 • Controle Individual de Gols/Pontos e Placar Progressivo
                    </span>
                  </div>
                </div>

                {/* Bloco de Placar por Tempo e Tempos Técnicos */}
                {renderTopMatchScoreHeaderBlock()}

                {/* TABELA COM GRADE DE GOLS 1..25 POR ATLETA (IDÊNTICA À PÁGINA 2 DO PDF) */}
                <div className="border-2 border-black text-[9px]">
                  <div className="grid grid-cols-2 divide-x-2 divide-black border-b-2 border-black font-extrabold bg-slate-100">
                    <div className="px-2 py-1 flex items-center justify-between">
                      <span>Equipe A: {match.homeTeam.teamName}</span>
                      <span>{homeTeamObj?.turmaLabel || ''}</span>
                    </div>
                    <div className="px-2 py-1 flex items-center justify-between">
                      <span>Equipe B: {match.awayTeam.teamName}</span>
                      <span>{awayTeamObj?.turmaLabel || ''}</span>
                    </div>
                  </div>

                  {/* Cabeçalho das Colunas: Nº | A | 2' | D | D+R | GOLS (1 a 25) */}
                  <div className="grid grid-cols-2 divide-x-2 divide-black border-b-2 border-black font-extrabold text-center bg-slate-50">
                    {[0, 1].map((col) => (
                      <div
                        key={col}
                        className="grid grid-cols-[32px_32px_58px_32px_32px_1fr] divide-x divide-black items-center py-1"
                      >
                        <span>Nº</span>
                        <span>A</span>
                        <span>2&apos;</span>
                        <span>D</span>
                        <span>D+R</span>
                        <span>GOLS / PONTOS INDIVIDUALIZADOS (1 A 25)</span>
                      </div>
                    ))}
                  </div>

                  {/* 16 Linhas com a Grade 1..25 em cada atleta */}
                  <div className="divide-y divide-black">
                    {Array.from({ length: 16 }, (_, idx) => {
                      const hRow = homeRows[idx];
                      const aRow = awayRows[idx];

                      const renderAthlete25Block = (row: PlayerDerivedRow) => (
                        <div className="grid grid-cols-[32px_32px_58px_32px_32px_1fr] divide-x divide-black items-stretch">
                          <div className="flex flex-col items-center justify-center p-0.5 font-mono font-extrabold text-[10px]">
                            <span>{row.jerseyNumber}</span>
                            {row.name && (
                              <span className="text-[7px] font-sans font-semibold text-slate-600 truncate max-w-[30px]">
                                {row.name.split(' ')[0]}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-center font-mono font-bold text-amber-800">
                            {row.yellowCardClock}
                          </div>
                          <div className="grid grid-rows-3 divide-y divide-black text-center font-mono text-[8px]">
                            <span className="flex items-center justify-center">
                              {row.suspensionsClocks[0]}
                            </span>
                            <span className="flex items-center justify-center">
                              {row.suspensionsClocks[1]}
                            </span>
                            <span className="flex items-center justify-center">
                              {row.suspensionsClocks[2]}
                            </span>
                          </div>
                          <div className="flex items-center justify-center font-mono font-bold text-rose-700">
                            {row.disqualificationClock}
                          </div>
                          <div className="flex items-center justify-center font-mono font-bold text-rose-900">
                            {row.reportClock}
                          </div>
                          <div className="p-0.5 font-mono text-[8px] leading-[10px] tracking-tight flex flex-col justify-center">
                            {[
                              [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
                              [12, 13, 14, 15, 16, 17, 18],
                              [19, 20, 21, 22, 23, 24, 25],
                            ].map((lineNums, lIdx) => (
                              <div key={lIdx} className="flex items-center gap-1">
                                {lineNums.map((n) => {
                                  const scored = n <= row.goalsCount;
                                  return (
                                    <span
                                      key={n}
                                      className={`px-0.5 rounded-sm ${
                                        scored
                                          ? 'bg-[#0B218A] text-brand-yellow font-black underline'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      {n}
                                    </span>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      );

                      return (
                        <div
                          key={idx}
                          className="grid grid-cols-2 divide-x-2 divide-black"
                        >
                          {renderAthlete25Block(hRow)}
                          {renderAthlete25Block(aRow)}
                        </div>
                      );
                    })}
                  </div>

                  {/* Rodapé de Oficiais A, B, C, D na Folha 2 */}
                  <div className="border-t-2 border-black divide-y divide-black">
                    <div className="grid grid-cols-2 divide-x-2 divide-black font-extrabold bg-slate-100 text-center">
                      <div className="grid grid-cols-[1fr_40px_40px_40px] divide-x divide-black py-0.5">
                        <span>OFICIAIS (Equipe A)</span>
                        <span>A</span>
                        <span>2&apos;</span>
                        <span>D</span>
                      </div>
                      <div className="grid grid-cols-[1fr_40px_40px_40px] divide-x divide-black py-0.5">
                        <span>OFICIAIS (Equipe B)</span>
                        <span>A</span>
                        <span>2&apos;</span>
                        <span>D</span>
                      </div>
                    </div>
                    {['Oficial A', 'Oficial B', 'Oficial C', 'Oficial D'].map(
                      (ofLbl) => (
                        <div
                          key={ofLbl}
                          className="grid grid-cols-2 divide-x-2 divide-black"
                        >
                          <div className="grid grid-cols-[64px_1fr_40px_40px_40px] divide-x divide-black min-h-[16px] items-center">
                            <span className="px-1 font-bold">{ofLbl}</span>
                            <span className="px-1 text-slate-600 truncate">
                              {ofLbl === 'Oficial A' ? match.homeTeam.teamName : ''}
                            </span>
                            <span />
                            <span />
                            <span />
                          </div>
                          <div className="grid grid-cols-[64px_1fr_40px_40px_40px] divide-x divide-black min-h-[16px] items-center">
                            <span className="px-1 font-bold">{ofLbl}</span>
                            <span className="px-1 text-slate-600 truncate">
                              {ofLbl === 'Oficial A' ? match.awayTeam.teamName : ''}
                            </span>
                            <span />
                            <span />
                            <span />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Grade de Placar Progressivo 1 a 50 + 7 Metros 1 a 20 */}
                {renderBottomRunningScore50Grid()}
              </div>
            </section>
          )}

          {/* ---------------------------------------------------------------------------
              FOLHA 3: CONTROLE DE CRONOMETRISTA (PÁGINA 3 DO PDF ENVIADO)
             --------------------------------------------------------------------------- */}
          {(activeSheetPage === 'all' || activeSheetPage === 3) && (
            <section className="cbhb-print-page bg-white border border-slate-300 print:border-none shadow-xl p-5 sm:p-7 print:p-2 space-y-2.5 overflow-x-auto">
              <div className="min-w-[760px] space-y-2">
                {/* Cabeçalho da Folha 3 com Brasão da Cangaceira */}
                <div className="flex items-center justify-between border-b-2 border-black pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg border-2 border-black bg-[#0B218A] p-1 flex items-center justify-center">
                      <img
                        src="/assets/atletica/logo.png"
                        alt="Logo A.A.A. Cangaceira"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-wide">
                        A.A.A. CANGACEIRA • MEDICINA UEMA — CONTROLE DE CRONOMETRISTA
                      </h2>
                      <p className="text-[10px] font-bold text-slate-700">
                        {match.modalityName} ({match.categoryName} • {match.phaseLabel}) —{' '}
                        {match.homeTeam.teamName} × {match.awayTeam.teamName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black uppercase block">
                      CONTROLE DE MESA
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-600">
                      Folha 3 • Advertências, Exclusões (T. Saída / T. Entrada) e Placar
                    </span>
                  </div>
                </div>

                {/* Bloco de Placar por Tempo e Tempos Técnicos */}
                {renderTopMatchScoreHeaderBlock()}

                {/* TABELA DE ADVERTÊNCIAS E EXCLUSÕES (T. SAÍDA / T. ENTRADA) */}
                <div className="border-2 border-black text-[10px]">
                  {/* Equipe A / Equipe B + Cor do Uniforme */}
                  <div className="grid grid-cols-2 divide-x-2 divide-black border-b border-black font-extrabold">
                    <div className="px-2 py-1 bg-slate-100">
                      Equipe A: {match.homeTeam.teamName}
                    </div>
                    <div className="px-2 py-1 bg-slate-100">
                      Equipe B: {match.awayTeam.teamName}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x-2 divide-black border-b-2 border-black font-bold text-[9px]">
                    <div className="px-2 py-1">
                      Cor Predominante:{' '}
                      <span className="font-extrabold">
                        {homeTeamObj?.theme?.colorLabel || 'Oficial Mandante'}
                      </span>
                    </div>
                    <div className="px-2 py-1">
                      Cor Predominante:{' '}
                      <span className="font-extrabold">
                        {awayTeamObj?.theme?.colorLabel || 'Oficial Visitante'}
                      </span>
                    </div>
                  </div>

                  {/* Bloco de Advertências (Número | Tempo) */}
                  <div className="grid grid-cols-2 divide-x-2 divide-black border-b-2 border-black">
                    {[homeChrono.warnings, awayChrono.warnings].map(
                      (warnList, wIdx) => (
                        <div
                          key={wIdx}
                          className="grid grid-cols-[1fr_80px_80px] divide-x divide-black"
                        >
                          <div className="flex items-center justify-center font-extrabold text-xs p-2">
                            Advertências
                          </div>
                          <div className="divide-y divide-black text-center">
                            <div className="font-extrabold bg-slate-100 py-0.5 text-[9px]">
                              Número
                            </div>
                            {warnList.map((w, i) => (
                              <div
                                key={i}
                                className="py-1 font-mono font-bold min-h-[20px]"
                              >
                                {w.number}
                              </div>
                            ))}
                          </div>
                          <div className="divide-y divide-black text-center">
                            <div className="font-extrabold bg-slate-100 py-0.5 text-[9px]">
                              Tempo
                            </div>
                            {warnList.map((w, i) => (
                              <div
                                key={i}
                                className="py-1 font-mono font-bold min-h-[20px]"
                              >
                                {w.time}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  {/* Cabeçalho das Exclusões: Nº | Exclusões (T. Saída | T. Entrada) | Desqualif. | D+R */}
                  <div className="grid grid-cols-2 divide-x-2 divide-black border-b-2 border-black font-extrabold text-center bg-slate-100 text-[9px]">
                    {[0, 1].map((sideIdx) => (
                      <div
                        key={sideIdx}
                        className="grid grid-cols-[44px_1fr_70px_60px] divide-x divide-black"
                      >
                        <div className="flex items-center justify-center">Nº</div>
                        <div className="divide-y divide-black">
                          <div className="py-0.5">Exclusões (2 Minutos)</div>
                          <div className="grid grid-cols-2 divide-x divide-black py-0.5 bg-white">
                            <span>T. Saída</span>
                            <span>T. Entrada</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-center">
                          Desqualif.
                        </div>
                        <div className="flex items-center justify-center">D+R</div>
                      </div>
                    ))}
                  </div>

                  {/* 14 Linhas de Exclusões (T. Saída / T. Entrada) */}
                  <div className="divide-y divide-black">
                    {Array.from({ length: 14 }, (_, idx) => {
                      const hEx = homeChrono.exclusions[idx];
                      const aEx = awayChrono.exclusions[idx];
                      return (
                        <div
                          key={idx}
                          className="grid grid-cols-2 divide-x-2 divide-black min-h-[20px] text-center font-mono text-[9px]"
                        >
                          <div className="grid grid-cols-[44px_1fr_1fr_70px_60px] divide-x divide-black items-center">
                            <span className="font-bold">{hEx.number}</span>
                            <span>{hEx.exitTime}</span>
                            <span className="text-emerald-800 font-bold">
                              {hEx.entryTime}
                            </span>
                            <span className="text-rose-700 font-bold">
                              {hEx.disqTime}
                            </span>
                            <span className="text-rose-900 font-bold">
                              {hEx.reportTime}
                            </span>
                          </div>
                          <div className="grid grid-cols-[44px_1fr_1fr_70px_60px] divide-x divide-black items-center">
                            <span className="font-bold">{aEx.number}</span>
                            <span>{aEx.exitTime}</span>
                            <span className="text-emerald-800 font-bold">
                              {aEx.entryTime}
                            </span>
                            <span className="text-rose-700 font-bold">
                              {aEx.disqTime}
                            </span>
                            <span className="text-rose-900 font-bold">
                              {aEx.reportTime}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Oficiais A, B, C, D na base da Folha 3 */}
                  <div className="border-t-2 border-black divide-y divide-black text-[9px]">
                    <div className="grid grid-cols-2 divide-x-2 divide-black font-extrabold bg-slate-100 text-center">
                      <div className="grid grid-cols-[1fr_44px_44px_44px] divide-x divide-black py-0.5">
                        <span>OFICIAIS (Equipe A)</span>
                        <span>A</span>
                        <span>2&apos;</span>
                        <span>D</span>
                      </div>
                      <div className="grid grid-cols-[1fr_44px_44px_44px] divide-x divide-black py-0.5">
                        <span>OFICIAIS (Equipe B)</span>
                        <span>A</span>
                        <span>2&apos;</span>
                        <span>D</span>
                      </div>
                    </div>
                    {['Oficial A', 'Oficial B', 'Oficial C', 'Oficial D'].map(
                      (ofLbl) => (
                        <div
                          key={ofLbl}
                          className="grid grid-cols-2 divide-x-2 divide-black"
                        >
                          <div className="grid grid-cols-[64px_1fr_44px_44px_44px] divide-x divide-black min-h-[16px] items-center">
                            <span className="px-1 font-bold">{ofLbl}</span>
                            <span className="px-1 text-slate-600 truncate">
                              {ofLbl === 'Oficial A' ? match.homeTeam.teamName : ''}
                            </span>
                            <span />
                            <span />
                            <span />
                          </div>
                          <div className="grid grid-cols-[64px_1fr_44px_44px_44px] divide-x divide-black min-h-[16px] items-center">
                            <span className="px-1 font-bold">{ofLbl}</span>
                            <span className="px-1 text-slate-600 truncate">
                              {ofLbl === 'Oficial A' ? match.awayTeam.teamName : ''}
                            </span>
                            <span />
                            <span />
                            <span />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Grade de Placar Progressivo 1 a 50 + 7 Metros 1 a 20 */}
                {renderBottomRunningScore50Grid()}
              </div>
            </section>
          )}
        </main>
      )}

      {/* =====================================================================================
          MODO 2: RESUMO DIGITAL MODERNO (LAYOUT COMPACTO WEB)
         ===================================================================================== */}
      {viewMode === 'digital_summary' && (
        <main className="max-w-4xl mx-auto mt-6 px-4 sm:px-6 print:mt-0 print:px-0">
          <div className="bg-white rounded-3xl print:rounded-none border border-brand-surface-border print:border-none shadow-card print:shadow-none p-6 sm:p-10 space-y-8">
            {/* 1. CABEÇALHO DA SÚMULA COM CHANCELA DA ATLÉTICA CANGACEIRA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-brand-blue">
              <div className="flex items-center gap-4">
                <img
                  src="/assets/atletica/logo.png"
                  alt="A.A.A. Cangaceira — Medicina UEMA"
                  className="w-16 h-16 object-contain shrink-0"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-brand-blue text-white text-xs font-display font-extrabold">
                      INTRAMED IX
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">
                      Súmula Eletrônica Oficial • A.A.A. Cangaceira
                    </span>
                    {sheet.isTestMode && (
                      <span className="px-2 py-0.5 rounded bg-brand-yellow text-brand-blue-dark text-[11px] font-extrabold uppercase">
                        MODO DE TESTE — NÃO OFICIAL
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-display font-extrabold text-brand-text-primary mt-1.5">
                    {match.modalityName} — {match.categoryName} ({match.phaseLabel})
                  </h2>
                  <p className="text-xs text-brand-text-secondary mt-1">
                    Local: {match.venue || 'A definir'} • Data:{' '}
                    {match.scheduledDate || 'A definir'} • Horário:{' '}
                    {match.scheduledTime || '--:--'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-1">
                <StatusBadge
                  status={sheet.isClosed ? 'finished' : match.status}
                  label={sheet.isClosed ? 'SÚMULA CONSOLIDADA' : 'EM ABERTO'}
                />
                {sheet.closedAtIso && (
                  <span className="text-[11px] text-brand-text-muted">
                    Encerrada às{' '}
                    {new Date(sheet.closedAtIso).toLocaleTimeString('pt-BR')}
                  </span>
                )}
              </div>
            </div>

            {/* 2. EQUIPES E RESULTADO CONSOLIDADO */}
            <section className="rounded-2xl bg-brand-surface-muted/70 border border-brand-surface-border p-6">
              <div className="grid grid-cols-3 items-center gap-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <TeamCrest
                    crestUrl={match.homeTeam.crestUrl}
                    teamName={match.homeTeam.teamName}
                    size="lg"
                  />
                  <span className="text-sm sm:text-base font-display font-extrabold text-brand-text-primary">
                    {match.homeTeam.teamName}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-3xl sm:text-4xl font-display font-extrabold text-brand-blue">
                    {finalHome} × {finalAway}
                  </div>
                  <p className="text-[11px] text-brand-text-secondary">
                    {sheet.periodScores
                      .map((p) => `${p.label}: ${p.homeScore}×${p.awayScore}`)
                      .join(' | ')}
                  </p>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <TeamCrest
                    crestUrl={match.awayTeam.crestUrl}
                    teamName={match.awayTeam.teamName}
                    size="lg"
                  />
                  <span className="text-sm sm:text-base font-display font-extrabold text-brand-text-primary">
                    {match.awayTeam.teamName}
                  </span>
                </div>
              </div>
            </section>

            {/* 3. ATLETAS RELACIONADOS */}
            <section className="space-y-3">
              <h3 className="text-xs font-display font-extrabold uppercase tracking-wider text-brand-blue border-b border-brand-surface-border pb-2">
                Relação de Atletas (Titulares e Reservas)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['home', 'away'] as const).map((side) => {
                  const tName =
                    side === 'home'
                      ? match.homeTeam.teamName
                      : match.awayTeam.teamName;
                  const lineup =
                    side === 'home' ? sheet.homeLineup : sheet.awayLineup;

                  return (
                    <div
                      key={side}
                      className="rounded-xl border border-brand-surface-border p-4 space-y-2"
                    >
                      <h4 className="text-xs font-bold text-brand-text-primary uppercase">
                        {tName}
                      </h4>
                      <div className="divide-y divide-brand-surface-border text-xs">
                        {lineup.map((ath) => (
                          <div
                            key={ath.athleteId}
                            className="py-1.5 flex items-center justify-between"
                          >
                            <span className="font-medium text-brand-text-primary">
                              #{ath.jerseyNumber ?? '—'} {ath.athleteName}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-brand-text-secondary">
                                {ath.isStarter ? 'Titular' : 'Reserva'}
                              </span>
                              {ath.isCaptain && (
                                <span className="px-1.5 py-0.5 rounded bg-brand-yellow-light text-brand-blue-dark font-bold text-[10px]">
                                  C
                                </span>
                              )}
                              {ath.isGoalkeeper && (
                                <span className="px-1.5 py-0.5 rounded bg-brand-blue-light text-brand-blue font-bold text-[10px]">
                                  GK
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 4. ESTATÍSTICAS CONSOLIDADAS */}
            <section className="space-y-3">
              <h3 className="text-xs font-display font-extrabold uppercase tracking-wider text-brand-blue border-b border-brand-surface-border pb-2">
                Estatísticas da Partida
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                <div className="p-3 rounded-xl bg-brand-surface-muted border border-brand-surface-border">
                  <span className="text-brand-text-secondary block">Faltas</span>
                  <span className="text-sm font-display font-bold text-brand-text-primary mt-0.5 block">
                    {countEventsByType('home', ['foul', 'team_foul'])} ×{' '}
                    {countEventsByType('away', ['foul', 'team_foul'])}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-brand-surface-muted border border-brand-surface-border">
                  <span className="text-brand-text-secondary block">
                    Cartões Amarelos
                  </span>
                  <span className="text-sm font-display font-bold text-brand-text-primary mt-0.5 block">
                    {countEventsByType('home', ['yellow_card'])} ×{' '}
                    {countEventsByType('away', ['yellow_card'])}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-brand-surface-muted border border-brand-surface-border">
                  <span className="text-brand-text-secondary block">
                    Vermelhos / Expulsões
                  </span>
                  <span className="text-sm font-display font-bold text-brand-text-primary mt-0.5 block">
                    {countEventsByType('home', ['red_card', 'expulsion'])} ×{' '}
                    {countEventsByType('away', ['red_card', 'expulsion'])}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-brand-surface-muted border border-brand-surface-border">
                  <span className="text-brand-text-secondary block">
                    Timeouts Solicitados
                  </span>
                  <span className="text-sm font-display font-bold text-brand-text-primary mt-0.5 block">
                    {sheet.homeTimeoutsUsed} × {sheet.awayTimeoutsUsed}
                  </span>
                </div>
              </div>
            </section>

            {/* 5. EVENTOS CRONOLÓGICOS */}
            <section className="space-y-3">
              <h3 className="text-xs font-display font-extrabold uppercase tracking-wider text-brand-blue border-b border-brand-surface-border pb-2">
                Registro Cronológico de Eventos ({chronologicalEvents.length})
              </h3>
              {chronologicalEvents.length === 0 ? (
                <p className="text-xs text-brand-text-secondary py-2">
                  Nenhum evento registrado nesta súmula.
                </p>
              ) : (
                <div className="divide-y divide-brand-surface-border text-xs">
                  {chronologicalEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="py-2 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-brand-blue w-14">
                          {ev.matchClockDisplay}
                        </span>
                        <span className="font-bold text-brand-text-primary">
                          {ev.typeLabel}
                        </span>
                        {ev.athleteName && (
                          <span className="text-brand-text-secondary">
                            — {ev.athleteName}
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-brand-text-secondary">
                        {ev.teamName || ev.periodLabel}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 6. ARBITRAGEM E RUBRICAS DIGITAIS */}
            <section className="space-y-4 pt-2 border-t border-brand-surface-border">
              <h3 className="text-xs font-display font-extrabold uppercase tracking-wider text-brand-blue">
                Arbitragem, Observações e Validação Digital da Mesa
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {[
                  {
                    key: 'referee',
                    role: 'Árbitro Principal',
                    sub: sheet.refereeName || 'Mesa Oficial',
                  },
                  {
                    key: 'tableOfficial',
                    role: 'Mesário / Operador',
                    sub: 'Registro Eletrônico',
                  },
                  {
                    key: 'homeCaptain',
                    role: `Capitão (${match.homeTeam.teamName})`,
                    sub: 'Conferência de Placar',
                  },
                  {
                    key: 'awayCaptain',
                    role: `Capitão (${match.awayTeam.teamName})`,
                    sub: 'Conferência de Placar',
                  },
                ].map((sig) => {
                  const isSigned = signatures[sig.key as keyof typeof signatures];
                  return (
                    <button
                      key={sig.key}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() =>
                        isAdmin &&
                        setSignatures((prev) => ({
                          ...prev,
                          [sig.key]: !prev[sig.key as keyof typeof prev],
                        }))
                      }
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSigned
                          ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                          : 'bg-brand-surface-muted border-dashed border-brand-surface-border text-brand-text-secondary'
                      } ${!isAdmin ? 'cursor-default' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {sig.role}
                        </span>
                        <ShieldCheck
                          className={`w-4 h-4 ${
                            isSigned ? 'text-emerald-600' : 'text-brand-text-muted'
                          }`}
                        />
                      </div>
                      <span className="block text-xs font-bold truncate">
                        {sig.sub}
                      </span>
                      <span className="block text-[10px] mt-1 font-semibold">
                        {isSigned
                          ? '✓ Validado digitalmente'
                          : isAdmin
                          ? 'Toque para validar'
                          : 'Aguardando mesa'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 flex items-center justify-between text-xs text-brand-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-blue" />
                  <span>
                    Documento gerado eletronicamente pelo sistema INTRAMED IX
                  </span>
                </span>
                <span>ID: {sheet.id}</span>
              </div>
            </section>
          </div>
        </main>
      )}
    </div>
  );
};
