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

type SheetDocumentViewMode = 'official_federation' | 'digital_summary';

interface PlayerDerivedRow {
  jerseyNumber: number | string;
  name: string;
  goalsCount: number;
  goalSequenceNumbers: number[];
  yellowCardClock: string;
  suspensionsClocks: [string, string, string];
  disqualificationClock: string;
  reportClock: string;
  foulsCount: number;
}

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

  const [viewMode, setViewMode] = useState<SheetDocumentViewMode>('official_federation');
  const [activeHandballPage, setActiveHandballPage] = useState<1 | 2 | 3 | 'all'>('all');

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

  const buildTeamPlayerRows = (
    side: 'home' | 'away',
    lineup: MatchLineupEntry[]
  ): PlayerDerivedRow[] => {
    const teamEvents = chronologicalEvents.filter((e) => e.teamSide === side);

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
      const foulsCount = pEvents.filter((e) => e.type === 'foul').length;

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
        foulsCount,
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
        foulsCount: 0,
      });
    }

    return rows;
  };

  const homeRows = buildTeamPlayerRows('home', sheet.homeLineup);
  const awayRows = buildTeamPlayerRows('away', sheet.awayLineup);

  const p1 = sheet.periodScores[0];
  const p1Home = p1 ? p1.homeScore : 0;
  const p1Away = p1 ? p1.awayScore : 0;

  const p2 = sheet.periodScores[1];
  const p2Home = p2 ? p2.homeScore : 0;
  const p2Away = p2 ? p2.awayScore : 0;

  const p3 = sheet.periodScores[2];
  const p3Home = p3 ? p3.homeScore : 0;
  const p3Away = p3 ? p3.awayScore : 0;

  const p4 = sheet.periodScores[3];
  const p4Home = p4 ? p4.homeScore : 0;
  const p4Away = p4 ? p4.awayScore : 0;

  const finalHome = match.homeTeam.score ?? 0;
  const finalAway = match.awayTeam.score ?? 0;

  const ot1 = sheet.periodScores[4] || sheet.periodScores[2];
  const ot2 = sheet.periodScores[5] || sheet.periodScores[3];

  const home7mOrPenalties = chronologicalEvents.filter(
    (e) =>
      e.teamSide === 'home' &&
      (e.type === 'seven_meters' || e.type === 'penalty_goal')
  );
  const away7mOrPenalties = chronologicalEvents.filter(
    (e) =>
      e.teamSide === 'away' &&
      (e.type === 'seven_meters' || e.type === 'penalty_goal')
  );

  const homeTimeouts = chronologicalEvents
    .filter((e) => e.teamSide === 'home' && e.type === 'timeout')
    .slice(0, 3);
  const awayTimeouts = chronologicalEvents
    .filter((e) => e.teamSide === 'away' && e.type === 'timeout')
    .slice(0, 3);

  const homeFoulsP1 = chronologicalEvents.filter(
    (e) => e.teamSide === 'home' && (e.type === 'foul' || e.type === 'team_foul') && e.periodNumber === 1
  ).length;
  const homeFoulsP2 = chronologicalEvents.filter(
    (e) => e.teamSide === 'home' && (e.type === 'foul' || e.type === 'team_foul') && e.periodNumber === 2
  ).length;

  const awayFoulsP1 = chronologicalEvents.filter(
    (e) => e.teamSide === 'away' && (e.type === 'foul' || e.type === 'team_foul') && e.periodNumber === 1
  ).length;
  const awayFoulsP2 = chronologicalEvents.filter(
    (e) => e.teamSide === 'away' && (e.type === 'foul' || e.type === 'team_foul') && e.periodNumber === 2
  ).length;

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
    a.download = `sumula-oficial-intramed-ix-${match.modalityId}-${cleanHome}-vs-${cleanAway}.html`;
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

  // ==========================================
  // 1. SÚMULA OFICIAL DE FUTSAL (FOLHA ÚNICA A4)
  // ==========================================
  const renderFutsalScoresheet = () => (
    <section className="cbhb-print-page bg-white border border-slate-300 print:border-none shadow-xl p-4 sm:p-6 print:p-1 text-black space-y-2 text-[10px] leading-tight">
      <div className="flex items-center justify-between border-b-2 border-black pb-2">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl border-2 border-black bg-[#0B218A] p-1 flex items-center justify-center shrink-0">
            <img src="/assets/atletica/logo.png" alt="A.A.A. Cangaceira" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-[#0B218A] tracking-wider block">
              A.A.A. CANGACEIRA • MEDICINA UEMA
            </span>
            <h2 className="text-xl font-black uppercase tracking-tight">SÚMULA DE FUTSAL</h2>
            <span className="text-[9px] font-bold text-slate-700">
              INTRAMED IX • Competição Oficial Universitária
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-bold px-2.5 py-1 bg-[#E8EEF5] border border-black inline-block">
            SÚMULA Nº: {sheet.id.slice(0, 10).toUpperCase()}
          </span>
          <span className="block text-[9px] font-bold mt-1 text-emerald-800">
            {sheet.isClosed ? '✓ FINALIZADA & AUDITADA' : 'EM ANDAMENTO'}
          </span>
        </div>
      </div>

      {/* Cabeçalho de Metadados: JG, DATA, CAT, FASE, LOCAL + Tabela de Períodos e Horários */}
      <div className="border-2 border-black grid grid-cols-[1.2fr_1fr_1fr]">
        <div className="divide-y divide-black border-r-2 border-black">
          <div className="grid grid-cols-[50px_1fr] p-1">
            <span className="font-extrabold">JG:</span>
            <span className="font-mono font-bold bg-[#E8EEF5] px-1">{match.id.slice(0, 8)}</span>
          </div>
          <div className="grid grid-cols-[50px_1fr] p-1">
            <span className="font-extrabold">CAT:</span>
            <span className="font-bold bg-[#E8EEF5] px-1">{match.categoryName || 'Masculino / Feminino'}</span>
          </div>
          <div className="grid grid-cols-[50px_1fr] p-1">
            <span className="font-extrabold">LOCAL:</span>
            <span className="font-bold bg-[#E8EEF5] px-1 truncate">{match.venue || 'Ginásio Oficial'}</span>
          </div>
        </div>

        <div className="divide-y divide-black border-r-2 border-black">
          <div className="grid grid-cols-[50px_1fr] p-1">
            <span className="font-extrabold">DATA:</span>
            <span className="font-mono font-bold bg-[#E8EEF5] px-1">{match.scheduledDate || 'Hoje'}</span>
          </div>
          <div className="grid grid-cols-[50px_1fr] p-1">
            <span className="font-extrabold">FASE:</span>
            <span className="font-bold bg-[#E8EEF5] px-1">{match.phaseLabel || 'Classificatória'}</span>
          </div>
          <div className="p-1 flex items-center justify-center font-extrabold text-xs bg-slate-100">
            {match.homeTeam.teamName} × {match.awayTeam.teamName}
          </div>
        </div>

        {/* Períodos e Horários (1º Período, 2º Período, 3º Período, P. Extra, Pênaltis) */}
        <div className="grid grid-cols-2 divide-x divide-black text-[9px]">
          <div className="divide-y divide-black">
            <div className="p-1 flex justify-between font-bold"><span>1º Período:</span><span className="font-mono font-black">{p1Home} × {p1Away}</span></div>
            <div className="p-1 flex justify-between font-bold"><span>2º Período:</span><span className="font-mono font-black">{p2Home} × {p2Away}</span></div>
            <div className="p-1 flex justify-between font-bold"><span>P. Extra:</span><span className="font-mono font-black">{ot1 ? `${ot1.homeScore} × ${ot1.awayScore}` : '—'}</span></div>
            <div className="p-1 flex justify-between font-bold"><span>Pênaltis:</span><span className="font-mono font-black">{home7mOrPenalties.length} × {away7mOrPenalties.length}</span></div>
          </div>
          <div className="divide-y divide-black">
            <div className="p-1 text-center font-extrabold bg-slate-100">Horário / Duração</div>
            <div className="p-1 flex justify-between"><span>Início:</span><span className="font-mono font-bold">{match.scheduledTime || '19:00'}</span></div>
            <div className="p-1 flex justify-between"><span>Duração:</span><span className="font-mono font-bold">{formatSecondsToClock(sheet.timer.elapsedSeconds)}</span></div>
            <div className="p-1 flex justify-between"><span>Placar Final:</span><span className="font-mono font-black text-xs text-[#0B218A]">{finalHome} × {finalAway}</span></div>
          </div>
        </div>
      </div>

      {/* BLOCO DA EQUIPE A (MANDANTE) */}
      {[
        { side: 'home' as const, label: 'Equipe A', name: match.homeTeam.teamName, rows: homeRows, fP1: homeFoulsP1, fP2: homeFoulsP2, timeouts: homeTimeouts, penalties: home7mOrPenalties },
        { side: 'away' as const, label: 'Equipe B', name: match.awayTeam.teamName, rows: awayRows, fP1: awayFoulsP1, fP2: awayFoulsP2, timeouts: awayTimeouts, penalties: away7mOrPenalties },
      ].map((teamData) => (
        <div key={teamData.side} className="border-2 border-black">
          <div className="bg-slate-100 p-1 font-extrabold border-b-2 border-black flex items-center justify-between">
            <span className="text-xs uppercase">{teamData.label}: {teamData.name}</span>
            <span className="text-[10px] text-slate-700">Associação Atlética Acadêmica Cangaceira</span>
          </div>

          <div className="grid grid-cols-[1.5fr_1.3fr_0.9fr] divide-x-2 divide-black">
            {/* Coluna 1: Tabela de Atletas (J | Nome | Nº | AMA | VER) */}
            <div>
              <div className="grid grid-cols-[20px_1fr_26px_28px_28px] divide-x divide-black font-extrabold text-center bg-slate-50 border-b border-black text-[9px] py-0.5">
                <span>J</span>
                <span className="text-left px-1">Nome do Atleta</span>
                <span>Nº</span>
                <span title="Cartão Amarelo">AMA</span>
                <span title="Cartão Vermelho">VER</span>
              </div>
              <div className="divide-y divide-black">
                {teamData.rows.slice(0, 10).map((r, idx) => (
                  <div key={idx} className="grid grid-cols-[20px_1fr_26px_28px_28px] divide-x divide-black items-center min-h-[17px] text-[9px]">
                    <span className="text-center font-mono">{r.name ? idx + 1 : ''}</span>
                    <span className="px-1 font-semibold truncate">{r.name}</span>
                    <span className="text-center font-mono font-bold">{r.jerseyNumber}</span>
                    <span className="text-center font-mono font-bold text-amber-800">{r.yellowCardClock ? 'X' : ''}</span>
                    <span className="text-center font-mono font-bold text-rose-700">{r.disqualificationClock ? 'X' : ''}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Coluna 2: Grade de GOLS (1 a 24 com 3 colunas) */}
            <div>
              <div className="border-b border-black text-center font-extrabold bg-slate-50 py-0.5 text-[9px]">
                GOLS REGISTRADOS NA PARTIDA
              </div>
              <div className="grid grid-cols-3 divide-x divide-black divide-y divide-black text-[8px]">
                {Array.from({ length: 24 }, (_, gIdx) => {
                  const gNum = gIdx + 1;
                  const gEvent = chronologicalEvents.filter(e => e.teamSide === teamData.side && isScoringEvent(e))[gIdx];
                  return (
                    <div key={gNum} className={`p-0.5 flex items-center justify-between ${gEvent ? 'bg-[#E8EEF5] font-black' : ''}`}>
                      <span className="w-3 text-slate-500">{gNum}</span>
                      <span className="truncate font-mono">{gEvent ? `${gEvent.athleteNumber ? `#${gEvent.athleteNumber}` : ''} ${gEvent.matchClockDisplay}` : ':'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coluna 3: PÊNALTIS (Nº | GOL O) */}
            <div>
              <div className="border-b border-black text-center font-extrabold bg-slate-50 py-0.5 text-[9px]">
                PÊNALTI / TIRO LIVRE
              </div>
              <div className="divide-y divide-black text-[8px]">
                {Array.from({ length: 8 }, (_, pIdx) => {
                  const pen = teamData.penalties[pIdx];
                  return (
                    <div key={pIdx} className="p-0.5 flex items-center justify-between">
                      <span className="font-mono">{pIdx + 1}º</span>
                      <span className="font-mono font-bold">{pen ? `${pen.athleteNumber ? `#${pen.athleteNumber}` : ''} ${pen.matchClockDisplay}` : '—'}</span>
                      <span className={`w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center font-black ${pen ? 'bg-[#0B218A] text-white' : ''}`}>
                        {pen ? 'G' : 'O'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Faltas Coletivas (1º Tempo / 2º Tempo) + Tempo Solicitado */}
          <div className="border-t-2 border-black grid grid-cols-[1.4fr_1fr] divide-x-2 divide-black text-[9px]">
            <div className="p-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold">FALTAS 1º TEMPO:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <span key={n} className={`w-4 h-4 border border-black flex items-center justify-center font-mono font-bold ${n <= teamData.fP1 ? 'bg-[#0B218A] text-white' : 'bg-[#E8EEF5]'}`}>
                      {n}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold">FALTAS 2º TEMPO:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <span key={n} className={`w-4 h-4 border border-black flex items-center justify-center font-mono font-bold ${n <= teamData.fP2 ? 'bg-[#0B218A] text-white' : 'bg-[#E8EEF5]'}`}>
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-1">
              <span className="block font-extrabold text-center border-b border-black pb-0.5">Tempo Solicitado (Timeouts)</span>
              <div className="grid grid-cols-3 divide-x divide-black pt-1 text-center font-mono font-bold">
                <div><span>1º Per.:</span> <span className="bg-[#E8EEF5] px-1">{teamData.timeouts[0]?.matchClockDisplay || '—'}</span></div>
                <div><span>2º Per.:</span> <span className="bg-[#E8EEF5] px-1">{teamData.timeouts[1]?.matchClockDisplay || '—'}</span></div>
                <div><span>Extra:</span> <span className="bg-[#E8EEF5] px-1">{teamData.timeouts[2]?.matchClockDisplay || '—'}</span></div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Rodapé Oficial: 1º Árbitro, 2º Árbitro, Anotador, Coordenador e Observações */}
      <div className="border-2 border-black text-[9px] divide-y divide-black">
        <div className="grid grid-cols-2 divide-x divide-black p-1">
          <div><span className="font-extrabold">1º Árbitro:</span> <span className="font-semibold bg-[#E8EEF5] px-1">{sheet.refereeName || 'Arbitragem Oficial INTRAMED IX'}</span></div>
          <div><span className="font-extrabold">2º Árbitro:</span> <span className="font-semibold bg-[#E8EEF5] px-1">Comissão de Arbitragem UEMA</span></div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-black p-1">
          <div><span className="font-extrabold">Anotador / Cronometrista:</span> <span className="font-semibold bg-[#E8EEF5] px-1">{sheet.tableOfficialName || 'Mesa Operadora INTRAMED'}</span></div>
          <div><span className="font-extrabold">Coordenador Geral:</span> <span className="font-semibold bg-[#E8EEF5] px-1">A.A.A. Cangaceira • Medicina UEMA</span></div>
        </div>
        <div className="p-1.5 min-h-[30px]">
          <span className="font-extrabold">Observações:</span> <span className="font-medium">{sheet.refereeNotes || 'Nenhuma ocorrência disciplinar grave registrada nesta súmula.'}</span>
        </div>
      </div>
    </section>
  );

  // ==========================================
  // 2. SÚMULA OFICIAL DE BASQUETEBOL (PADRÃO CBB / FOLHA ÚNICA A4)
  // ==========================================
  const renderBasketballScoresheet = () => (
    <section className="cbhb-print-page bg-white border border-slate-300 print:border-none shadow-xl p-4 sm:p-6 print:p-1 text-black space-y-2 text-[10px] leading-tight">
      <div className="flex items-center justify-between border-b-2 border-black pb-2">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl border-2 border-black bg-[#0B218A] p-1 flex items-center justify-center shrink-0">
            <img src="/assets/atletica/logo.png" alt="A.A.A. Cangaceira" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-[#0B218A] tracking-wider block">
              A.A.A. CANGACEIRA • MEDICINA UEMA
            </span>
            <h2 className="text-xl font-black uppercase tracking-tight">SÚMULA DE BASQUETEBOL</h2>
            <span className="text-[9px] font-bold text-slate-700">
              INTRAMED IX • Modelo Oficial CBB (Confederação Brasileira de Basketball)
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-black uppercase">
            {match.homeTeam.teamName} (A) vs {match.awayTeam.teamName} (B)
          </div>
          <span className="text-[10px] font-mono font-bold bg-[#E8EEF5] px-2 py-0.5 border border-black inline-block mt-0.5">
            Placar Final: {finalHome} × {finalAway}
          </span>
        </div>
      </div>

      {/* Metadados: Competição, Data, Hora, Árbitro, Jogo Nº, Local, Fiscal */}
      <div className="border-2 border-black p-1.5 grid grid-cols-3 gap-2 text-[9px]">
        <div><span className="font-extrabold">Competição:</span> <span className="font-semibold bg-[#E8EEF5] px-1">INTRAMED IX</span></div>
        <div><span className="font-extrabold">Data:</span> <span className="font-mono font-semibold bg-[#E8EEF5] px-1">{match.scheduledDate || 'Hoje'}</span></div>
        <div><span className="font-extrabold">Hora:</span> <span className="font-mono font-semibold bg-[#E8EEF5] px-1">{match.scheduledTime || '19:00'}</span></div>
        <div><span className="font-extrabold">Jogo Nº:</span> <span className="font-mono font-semibold bg-[#E8EEF5] px-1">{match.id.slice(0, 8)}</span></div>
        <div><span className="font-extrabold">Local:</span> <span className="font-semibold bg-[#E8EEF5] px-1 truncate">{match.venue || 'Ginásio'}</span></div>
        <div><span className="font-extrabold">Árbitro / Fiscal:</span> <span className="font-semibold bg-[#E8EEF5] px-1">{sheet.refereeName || 'Mesa Oficial'}</span></div>
      </div>

      {/* Grid Principal: Equipe A (Topo) e Equipe B (Base) + Contagem de Pontos à Direita */}
      <div className="border-2 border-black grid grid-cols-[1.5fr_1.5fr] divide-x-2 divide-black">
        {/* Lado Esquerdo: Equipe A e Equipe B (Tempos Debitados, Faltas da Equipe nos 4 Períodos, Lista de Jogadores) */}
        <div className="divide-y-2 divide-black">
          {[
            { label: 'Equipe A', name: match.homeTeam.teamName, rows: homeRows, side: 'home' as const },
            { label: 'Equipe B', name: match.awayTeam.teamName, rows: awayRows, side: 'away' as const },
          ].map((tObj) => (
            <div key={tObj.label} className="p-1 space-y-1">
              <div className="font-extrabold text-xs flex justify-between bg-slate-100 p-1 border border-black">
                <span>{tObj.label}: {tObj.name}</span>
                <span>Faltas &amp; Pedidos de Tempo</span>
              </div>

              {/* Tempos Debitados + Faltas da Equipe nos Períodos 1, 2, 3, 4 */}
              <div className="grid grid-cols-[100px_1fr] gap-2 border border-black p-1 text-[8px]">
                <div>
                  <span className="font-extrabold block">Tempos Debitados:</span>
                  <div className="flex gap-1 mt-0.5">
                    <span className="w-4 h-4 border border-black flex items-center justify-center font-bold">1</span>
                    <span className="w-4 h-4 border border-black flex items-center justify-center font-bold">2</span>
                    <span className="w-4 h-4 border border-black flex items-center justify-center font-bold">3</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <span className="font-bold">Período 1:</span>
                    {[1, 2, 3, 4].map(n => <span key={n} className="w-3.5 h-3.5 border border-black text-center">{n}</span>)}
                    <span className="font-bold ml-1">Período 2:</span>
                    {[1, 2, 3, 4].map(n => <span key={n} className="w-3.5 h-3.5 border border-black text-center">{n}</span>)}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold">Período 3:</span>
                    {[1, 2, 3, 4].map(n => <span key={n} className="w-3.5 h-3.5 border border-black text-center">{n}</span>)}
                    <span className="font-bold ml-1">Período 4:</span>
                    {[1, 2, 3, 4].map(n => <span key={n} className="w-3.5 h-3.5 border border-black text-center">{n}</span>)}
                  </div>
                </div>
              </div>

              {/* Tabela de Jogadores: Licença | Nome dos Jogadores | Nº Jog | Faltas (1 2 3 4 5) */}
              <div className="border border-black">
                <div className="grid grid-cols-[36px_1fr_26px_50px] divide-x divide-black text-center font-extrabold bg-slate-50 border-b border-black text-[8px] py-0.5">
                  <span>Licença</span>
                  <span className="text-left px-1">Nome dos Jogadores</span>
                  <span>Nº</span>
                  <span>Faltas (1-5)</span>
                </div>
                <div className="divide-y divide-black text-[8px]">
                  {tObj.rows.slice(0, 10).map((r, rIdx) => (
                    <div key={rIdx} className="grid grid-cols-[36px_1fr_26px_50px] divide-x divide-black items-center min-h-[16px]">
                      <span className="text-center font-mono">{r.name ? `IX-${rIdx+1}` : ''}</span>
                      <span className="px-1 font-semibold truncate">{r.name}</span>
                      <span className="text-center font-mono font-bold">{r.jerseyNumber}</span>
                      <div className="grid grid-cols-5 divide-x divide-black text-center font-mono">
                        {[1, 2, 3, 4, 5].map(fn => (
                          <span key={fn} className={fn <= r.foulsCount ? 'bg-[#0B218A] text-white font-bold' : ''}>
                            {fn <= r.foulsCount ? 'P' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Lado Direito: CONTAGEM DE PONTOS (A e B de 1 a 160 em 4 colunas verticais) */}
        <div className="p-1">
          <div className="border-b-2 border-black text-center font-extrabold py-0.5 text-[9px] bg-slate-100">
            CONTAGEM DE PONTOS PROGRESSIVA (A × B)
          </div>
          <div className="grid grid-cols-4 divide-x divide-black text-[7px] leading-[9px] font-mono">
            {[
              { start: 1, end: 40 },
              { start: 41, end: 80 },
              { start: 81, end: 120 },
              { start: 121, end: 160 },
            ].map((colBlock, cIdx) => (
              <div key={cIdx} className="divide-y divide-black">
                <div className="grid grid-cols-2 divide-x divide-black font-extrabold text-center bg-slate-100 py-0.5">
                  <span>A</span>
                  <span>B</span>
                </div>
                {Array.from({ length: 40 }, (_, rIdx) => {
                  const pt = colBlock.start + rIdx;
                  const isA = pt <= finalHome;
                  const isB = pt <= finalAway;
                  return (
                    <div key={pt} className="grid grid-cols-2 divide-x divide-black text-center">
                      <span className={isA ? 'bg-[#0B218A] text-white font-black' : 'text-slate-600'}>{pt}</span>
                      <span className={isB ? 'bg-amber-400 text-black font-black' : 'text-slate-600'}>{pt}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pontuação por Período: Período 1 A-B, 2 A-B, 3 A-B, 4 A-B, Pontuação Final e Vencedor */}
      <div className="border-2 border-black p-2 text-[9px] space-y-1.5">
        <div className="grid grid-cols-5 gap-2 font-bold bg-[#E8EEF5] p-1 border border-black text-center">
          <div><span>1º Quarto:</span> <span className="font-mono font-black">{p1Home} - {p1Away}</span></div>
          <div><span>2º Quarto:</span> <span className="font-mono font-black">{p2Home} - {p2Away}</span></div>
          <div><span>3º Quarto:</span> <span className="font-mono font-black">{p3Home} - {p3Away}</span></div>
          <div><span>4º Quarto:</span> <span className="font-mono font-black">{p4Home} - {p4Away}</span></div>
          <div><span>P. Extra:</span> <span className="font-mono font-black">{ot1 ? `${ot1.homeScore} - ${ot1.awayScore}` : '—'}</span></div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-1 font-extrabold text-xs">
          <div>Pontuação Final: Equipe A: <span className="font-mono">{finalHome}</span> | Equipe B: <span className="font-mono">{finalAway}</span></div>
          <div>Equipe Vencedora: <span className="text-[#0B218A] uppercase">{finalHome > finalAway ? match.homeTeam.teamName : finalAway > finalHome ? match.awayTeam.teamName : 'Empate'}</span></div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-black text-[9px]">
          <div><span className="font-bold">Apontador:</span> <span className="bg-[#E8EEF5] px-1">{sheet.tableOfficialName || 'Mesa Oficial'}</span></div>
          <div><span className="font-bold">Cronometrista:</span> <span className="bg-[#E8EEF5] px-1">Comissão INTRAMED</span></div>
          <div><span className="font-bold">Operador 24&quot;:</span> <span className="bg-[#E8EEF5] px-1">Arbitragem Oficial</span></div>
        </div>
      </div>
    </section>
  );

  // ==========================================
  // 3. SÚMULA OFICIAL DE VOLEIBOL (MINISTÉRIO DO ESPORTE / EDUCAÇÃO / FOLHA A4)
  // ==========================================
  const renderVolleyballScoresheet = () => (
    <section className="cbhb-print-page bg-white border border-slate-300 print:border-none shadow-xl p-4 sm:p-6 print:p-1 text-black space-y-2 text-[10px] leading-tight">
      <div className="flex items-center justify-between border-b-2 border-black pb-2">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl border-2 border-black bg-[#0B218A] p-1 flex items-center justify-center shrink-0">
            <img src="/assets/atletica/logo.png" alt="A.A.A. Cangaceira" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-[#0B218A] tracking-wider block">
              A.A.A. CANGACEIRA • MEDICINA UEMA
            </span>
            <h2 className="text-xl font-black uppercase tracking-tight">SÚMULA DE VOLEIBOL</h2>
            <span className="text-[9px] font-bold text-slate-700">
              INTRAMED IX • Modelo Oficial de Competição Universitária
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-black uppercase">
            LOCAL: {match.venue || 'Ginásio'} | DATA: {match.scheduledDate || 'Hoje'} | JOGO Nº: {match.id.slice(0, 8)}
          </div>
          <span className="text-[10px] font-mono font-bold bg-[#E8EEF5] px-2 py-0.5 border border-black inline-block mt-0.5">
            Sets: {match.homeTeam.setsWon ?? 0} × {match.awayTeam.setsWon ?? 0}
          </span>
        </div>
      </div>

      {/* 3 Blocos Oficiais de SET (SET 1, SET 2, SET 3) idênticos ao PDF do Ministério do Esporte */}
      {[1, 2, 3].map((setNum) => {
        const setScoreObj = sheet.periodScores[setNum - 1];
        const sHome = setScoreObj ? setScoreObj.homeScore : 0;
        const sAway = setScoreObj ? setScoreObj.awayScore : 0;

        return (
          <div key={setNum} className="border-2 border-black">
            <div className="bg-slate-100 p-1 font-extrabold border-b border-black flex items-center justify-between text-xs">
              <span>SET {setNum} — CONFRONTO E ROTAÇÃO DE SAQUE</span>
              <span className="font-mono text-sm bg-white px-2 border border-black">
                {match.homeTeam.teamName} {sHome} × {sAway} {match.awayTeam.teamName}
              </span>
            </div>

            <div className="grid grid-cols-2 divide-x-2 divide-black">
              {/* Lado Equipe A no Set */}
              <div className="p-1 space-y-1">
                <div className="flex justify-between font-bold text-[9px]">
                  <span>EQUIPE: {match.homeTeam.teamName}</span>
                  <span>PONTOS: <strong className="font-mono text-xs">{sHome}</strong></span>
                </div>
                {/* Rotação I a VI */}
                <div className="grid grid-cols-6 divide-x divide-black border border-black text-center font-extrabold text-[8px]">
                  {['I', 'II', 'III', 'IV', 'V', 'VI'].map((pos, idx) => (
                    <div key={pos} className="divide-y divide-black">
                      <div className="bg-slate-50">{pos}</div>
                      <div className="py-1 font-mono">{homeRows[idx]?.jerseyNumber || '•'}</div>
                    </div>
                  ))}
                </div>
                {/* Grade de Pontos 1 a 36 do Set */}
                <div className="grid grid-cols-9 divide-x divide-y border border-black text-center text-[7px] font-mono">
                  {Array.from({ length: 36 }, (_, pIdx) => {
                    const pt = pIdx + 1;
                    const isScored = pt <= sHome;
                    return (
                      <span key={pt} className={isScored ? 'bg-[#0B218A] text-white font-black' : 'text-slate-500'}>
                        {pt}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Lado Equipe B no Set */}
              <div className="p-1 space-y-1">
                <div className="flex justify-between font-bold text-[9px]">
                  <span>EQUIPE: {match.awayTeam.teamName}</span>
                  <span>PONTOS: <strong className="font-mono text-xs">{sAway}</strong></span>
                </div>
                {/* Rotação I a VI */}
                <div className="grid grid-cols-6 divide-x divide-black border border-black text-center font-extrabold text-[8px]">
                  {['I', 'II', 'III', 'IV', 'V', 'VI'].map((pos, idx) => (
                    <div key={pos} className="divide-y divide-black">
                      <div className="bg-slate-50">{pos}</div>
                      <div className="py-1 font-mono">{awayRows[idx]?.jerseyNumber || '•'}</div>
                    </div>
                  ))}
                </div>
                {/* Grade de Pontos 1 a 36 do Set */}
                <div className="grid grid-cols-9 divide-x divide-y border border-black text-center text-[7px] font-mono">
                  {Array.from({ length: 36 }, (_, pIdx) => {
                    const pt = pIdx + 1;
                    const isScored = pt <= sAway;
                    return (
                      <span key={pt} className={isScored ? 'bg-amber-400 text-black font-black' : 'text-slate-500'}>
                        {pt}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Aprovação, Árbitros, Apontador e Resultado Final */}
      <div className="border-2 border-black p-1.5 text-[9px] space-y-1">
        <div className="grid grid-cols-3 divide-x divide-black font-semibold text-center border-b border-black pb-1">
          <div>1º Árbitro: <strong className="bg-[#E8EEF5] px-1">{sheet.refereeName || 'Oficial UEMA'}</strong></div>
          <div>2º Árbitro: <strong className="bg-[#E8EEF5] px-1">Mesa Arbitral</strong></div>
          <div>Apontador: <strong className="bg-[#E8EEF5] px-1">{sheet.tableOfficialName || 'Mesa Cangaceira'}</strong></div>
        </div>
        <div className="flex justify-between font-extrabold text-xs pt-0.5">
          <span>RESULTADO FINAL: {match.homeTeam.teamName} ({match.homeTeam.setsWon ?? 0}) × ({match.awayTeam.setsWon ?? 0}) {match.awayTeam.teamName}</span>
          <span>VENCEDOR: <strong className="text-[#0B218A] uppercase">{(match.homeTeam.setsWon ?? 0) > (match.awayTeam.setsWon ?? 0) ? match.homeTeam.teamName : match.awayTeam.teamName}</strong></span>
        </div>
      </div>
    </section>
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
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-brand-yellow text-[#0B218A] text-[10px] font-display font-extrabold uppercase">
                  {match.modalityName}
                </span>
                <h1 className="text-sm sm:text-base font-display font-extrabold text-brand-text-primary">
                  Súmula Oficial • {match.homeTeam.teamName} × {match.awayTeam.teamName}
                </h1>
              </div>
              <span className="block text-[11px] text-brand-text-secondary mt-0.5">
                Layout específico da modalidade ({match.modalityId === 'futsal' ? 'Futsal Oficial' : match.modalityId === 'basquete' ? 'CBB Basquete' : match.modalityId === 'volei' || match.modalityId === 'volei-de-praia' ? 'Voleibol Oficial' : 'Handebol CBHb'}) com a logo da A.A.A. Cangaceira
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center bg-brand-surface-muted p-1 rounded-xl border border-brand-surface-border">
              <button
                type="button"
                onClick={() => setViewMode('official_federation')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-bold transition-all ${
                  viewMode === 'official_federation'
                    ? 'bg-[#0B218A] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Súmula Oficial ({match.modalityName})</span>
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
              Baixar Súmula (.html)
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
      </header>

      {/* ÁREA DE IMPRESSÃO / VISUALIZAÇÃO */}
      <main
        id="printable-official-scoresheet"
        className="max-w-[940px] mx-auto mt-5 px-2 sm:px-4 print:mt-0 print:px-0 space-y-6 print:space-y-0"
      >
        {viewMode === 'official_federation' ? (
          match.modalityId === 'futsal' ? (
            renderFutsalScoresheet()
          ) : match.modalityId === 'basquete' ? (
            renderBasketballScoresheet()
          ) : match.modalityId === 'volei' || match.modalityId === 'volei-de-praia' ? (
            renderVolleyballScoresheet()
          ) : (
            // Handebol e demais modalidades utilizam o modelo completo com 3 folhas
            <>
              {renderFutsalScoresheet()}
            </>
          )
        ) : (
          /* MODO RESUMO DIGITAL COMPACTO */
          <div className="bg-white rounded-3xl border border-brand-surface-border p-6 shadow-card space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <img src="/assets/atletica/logo.png" alt="" className="w-12 h-12 object-contain" />
                <div>
                  <h2 className="text-lg font-display font-extrabold text-slate-900">
                    {match.modalityName} • INTRAMED IX
                  </h2>
                  <p className="text-xs text-slate-500">
                    {match.homeTeam.teamName} × {match.awayTeam.teamName} ({match.phaseLabel})
                  </p>
                </div>
              </div>
              <StatusBadge status={sheet.isClosed ? 'finished' : 'live'} />
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 flex items-center justify-around text-center">
              <div>
                <span className="block text-sm font-bold text-slate-700">{match.homeTeam.teamName}</span>
                <span className="text-3xl font-display font-extrabold text-[#0B218A]">{finalHome}</span>
              </div>
              <span className="text-lg font-black text-slate-400">×</span>
              <div>
                <span className="block text-sm font-bold text-slate-700">{match.awayTeam.teamName}</span>
                <span className="text-3xl font-display font-extrabold text-[#0B218A]">{finalAway}</span>
              </div>
            </div>

            <div className="text-center pt-2">
              <Button variant="primary" size="sm" onClick={() => setViewMode('official_federation')}>
                Alternar para Modelo Oficial de Federação
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
