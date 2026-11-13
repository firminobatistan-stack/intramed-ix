import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronRight,
  Clock,
  Play,
  CircleDot,
  FileText,
} from 'lucide-react';
import { Match, MatchEventType } from '../../types/domain';
import { TeamCrest } from './TeamCrest';
import { useCompetitionStore } from '../../context/CompetitionStoreContext';
import { StoryShareButton } from '../social/StoryShareModal';

interface MatchCardProps {
  match?: Match | null;
  featured?: boolean;
  showOperatorActions?: boolean;
  emptyMessage?: string;
  className?: string;
}

const SCORING_EVENT_TYPES: MatchEventType[] = [
  'goal',
  'point_1',
  'point_2',
  'point_3',
  'set_point',
  'penalty_goal',
];

/**
 * MatchCard Compacto & Minimalista:
 * - Altura vertical reduzida em ~30% para permitir visualizar 3 a 4 jogos simultaneamente no celular;
 * - Escudos com anel colorido oficial da turma;
 * - Botão integrado "Compartilhar" que gera Card 9:16 para Instagram Stories / WhatsApp.
 */
export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  showOperatorActions = true,
  emptyMessage = 'Os jogos aparecerão aqui quando forem cadastrados.',
  className = '',
}) => {
  const navigate = useNavigate();
  const { getSheetByMatchId, canOperateOfficialData } = useCompetitionStore();
  const isAdmin = canOperateOfficialData();

  const sheet = match ? getSheetByMatchId(match.id) : undefined;
  const scoringEvents = (sheet?.events || []).filter(
    (e) => !e.isDeleted && SCORING_EVENT_TYPES.includes(e.type) && e.teamSide
  );
  const homeScorers = scoringEvents
    .filter((e) => e.teamSide === 'home')
    .slice(0, 3);
  const awayScorers = scoringEvents
    .filter((e) => e.teamSide === 'away')
    .slice(0, 3);

  if (!match) {
    return (
      <div className={`all-sports-card p-4 ${className}`}>
        <div className="all-sports-section-pill mb-3">
          INTRAMED IX • Confronto Oficial
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 max-w-md mx-auto">
          <div className="flex items-center justify-end gap-2 text-right min-w-0">
            <span className="text-xs sm:text-sm font-display font-bold text-slate-400 truncate">
              Aguardando
            </span>
            <TeamCrest size="sm" />
          </div>

          <div className="px-3 py-1 rounded-full bg-[#F3F4F9] text-slate-400 text-xs font-display font-extrabold">
            — : —
          </div>

          <div className="flex items-center justify-start gap-2 text-left min-w-0">
            <TeamCrest size="sm" />
            <span className="text-xs sm:text-sm font-display font-bold text-slate-400 truncate">
              Aguardando
            </span>
          </div>
        </div>

        <div className="mt-2.5 text-center">
          <p className="text-[11px] font-semibold text-slate-400">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const isLive = match.status === 'live' || match.status === 'halftime';
  const isFinished = match.status === 'finished';

  const headerTitle = `${match.modalityName}${
    match.categoryName &&
    match.categoryName.trim().toLowerCase() !==
      match.modalityName.trim().toLowerCase()
      ? ` • ${match.categoryName}`
      : ''
  }${match.phaseLabel ? ` • ${match.phaseLabel}` : ''}`;

  return (
    <div
      className={`all-sports-card px-4 py-3.5 sm:px-5 sm:py-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${className}`}
    >
      {/* 1. Topo Compacto: Pílula da Modalidade/Fase + Status ou Lembrete na mesma linha */}
      <div className="flex items-center justify-between gap-2 mb-2.5 px-3 py-1.5 rounded-xl bg-[#F3F4F9]">
        <span className="text-[11px] sm:text-xs font-display font-extrabold text-[#1E293B] truncate">
          {headerTitle}
        </span>

        {isLive ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#10B981] text-white text-[10px] font-display font-extrabold shrink-0">
            <Clock className="w-3 h-3 animate-pulse" />
            <span>
              {sheet?.timer?.periodLabel
                ? `${sheet.timer.periodLabel}`
                : 'AO VIVO'}
            </span>
          </span>
        ) : isFinished ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#9CA3AF] text-white text-[10px] font-display font-extrabold shrink-0">
            <span>FIM</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => navigate(`/notificacoes`)}
            title="Ativar lembrete da partida"
            className="w-6 h-6 rounded-full bg-white hover:bg-blue-50 border border-slate-200/80 flex items-center justify-center text-[#4F6BED] transition-colors shrink-0"
          >
            <Bell className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* 2. Linha Principal do Confronto (Equipes + Escudos + Placar ou Horário Central) */}
      <div
        onClick={() => navigate(`/placar/${match.id}`)}
        className="cursor-pointer grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3.5 max-w-lg mx-auto py-0.5"
      >
        {/* Mandante */}
        <div className="flex items-center justify-end gap-2 text-right min-w-0">
          <span className="text-xs sm:text-sm font-display font-extrabold text-slate-800 truncate">
            {match.homeTeam.teamName || 'A definir'}
          </span>
          <TeamCrest
            crestUrl={match.homeTeam.crestUrl}
            teamName={match.homeTeam.teamName}
            teamId={match.homeTeam.teamId}
            size="md"
            highlighted={Boolean(match.homeTeam.isWinner)}
          />
        </div>

        {/* Placar Central ou Horário */}
        <div className="flex flex-col items-center justify-center px-1.5 min-w-[68px]">
          {isLive || isFinished ? (
            <div className="px-3.5 py-1 rounded-full bg-[#F3F4F9] border border-slate-200/70 text-slate-900 font-display font-extrabold text-sm sm:text-base tracking-tight tabular-nums shadow-inner">
              {match.homeTeam.score ?? 0} - {match.awayTeam.score ?? 0}
            </div>
          ) : (
            <div className="text-center">
              <span className="block text-sm sm:text-base font-display font-extrabold text-[#EF4444] leading-none">
                {match.scheduledTime || 'A definir'}
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                {match.scheduledDate || 'INTRAMED'}
              </span>
            </div>
          )}
        </div>

        {/* Visitante */}
        <div className="flex items-center justify-start gap-2 text-left min-w-0">
          <TeamCrest
            crestUrl={match.awayTeam.crestUrl}
            teamName={match.awayTeam.teamName}
            teamId={match.awayTeam.teamId}
            size="md"
            highlighted={Boolean(match.awayTeam.isWinner)}
          />
          <span className="text-xs sm:text-sm font-display font-extrabold text-slate-800 truncate">
            {match.awayTeam.teamName || 'A definir'}
          </span>
        </div>
      </div>

      {/* 3. Árvore Bilateral de Gols / Pontos (quando houver eventos) */}
      {(homeScorers.length > 0 || awayScorers.length > 0) && (
        <div className="mt-2.5 grid grid-cols-2 gap-3 max-w-md mx-auto text-[10px] text-[#5B6B98]">
          <div className="flex flex-col items-end pr-2 border-r border-dashed border-slate-200 space-y-1">
            {homeScorers.map((ev) => (
              <div key={ev.id} className="inline-flex items-center gap-1">
                <span className="font-medium truncate max-w-[110px]">
                  {ev.athleteName || ev.typeLabel}{' '}
                  <span className="text-slate-400">{ev.matchClockDisplay}</span>
                </span>
                <CircleDot className="w-2.5 h-2.5 text-[#0B218A] shrink-0" />
              </div>
            ))}
          </div>

          <div className="flex flex-col items-start pl-2 space-y-1">
            {awayScorers.map((ev) => (
              <div key={ev.id} className="inline-flex items-center gap-1">
                <CircleDot className="w-2.5 h-2.5 text-[#0B218A] shrink-0" />
                <span className="font-medium truncate max-w-[110px]">
                  <span className="text-slate-400">{ev.matchClockDisplay}</span>{' '}
                  {ev.athleteName || ev.typeLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Rodapé Compacto em Linha Única: Local à esquerda + Ações à direita */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className="font-semibold text-slate-500 truncate">
          {match.venue || 'Quadra Oficial'}
          {(isLive || isFinished) && match.scheduledDate
            ? ` • ${match.scheduledDate}`
            : ''}
        </span>

        <div className="flex items-center gap-2.5 ml-auto">
          <StoryShareButton
            compact
            label="Stories"
            payload={{
              type: 'match',
              title: headerTitle,
              homeTeamName: match.homeTeam.teamName || 'A definir',
              homeTeamCrestUrl: match.homeTeam.crestUrl,
              homeScore: isLive || isFinished ? (match.homeTeam.score ?? 0) : null,
              awayTeamName: match.awayTeam.teamName || 'A definir',
              awayTeamCrestUrl: match.awayTeam.crestUrl,
              awayScore: isLive || isFinished ? (match.awayTeam.score ?? 0) : null,
              statusLabel: isLive
                ? 'AO VIVO'
                : isFinished
                ? 'FIM DE JOGO'
                : 'CONFRONTO AGENDADO',
              dateTimeLabel: `${match.scheduledDate || ''} ${
                match.scheduledTime ? `• ${match.scheduledTime}` : ''
              }`.trim(),
              venueLabel: match.venue || 'Quadra Oficial',
            }}
          />

          <span className="text-slate-200">|</span>

          <button
            type="button"
            onClick={() => navigate(`/placar/${match.id}`)}
            className="inline-flex items-center gap-0.5 font-display font-extrabold text-[#10B981] hover:text-[#059669] transition-colors"
          >
            <span>Detalhes</span>
            <ChevronRight className="w-3 h-3" />
          </button>

          {showOperatorActions && (
            <>
              <span className="text-slate-200">|</span>
              <button
                type="button"
                onClick={() => navigate(`/sumula/${match.id}`)}
                className="inline-flex items-center gap-1 font-display font-bold text-[#0B218A] hover:underline"
              >
                <Play className="w-2.5 h-2.5" />
                <span>{isAdmin ? 'Súmula' : 'Mesário'}</span>
              </button>
            </>
          )}

          {(isLive || isFinished) && (
            <>
              <span className="text-slate-200">|</span>
              <button
                type="button"
                onClick={() => navigate(`/sumula/${match.id}/documento`)}
                className="inline-flex items-center gap-1 font-display font-bold text-amber-600 hover:underline"
              >
                <FileText className="w-2.5 h-2.5" />
                <span>PDF</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
