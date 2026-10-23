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
 * MatchCard modelado diretamente nas Imagens 1, 2, 3, 4 e 5 do case "All Sports":
 * - Topo com pílula cinza-lavanda larga (.all-sports-section-pill) identificando a Competição/Modalidade;
 * - Badge central:
 *   • Ongoing Match (Ao Vivo): Pílula verde vibrante (#10B981) com ícone de relógio;
 *   • Finished Match (Encerrado): Pílula cinza (#9CA3AF) com ícone de relógio "FIM";
 *   • Upcoming Match (Agendado): Ícone circular de sino (🔔) + horário em vermelho (#EF4444) e data abaixo;
 * - Linha horizontal do confronto: [Nome Mandante] [Escudo]  [ Pílula Placar: 2 - 1 ]  [Escudo] [Nome Visitante];
 * - Árvore bilateral de eventos/gols conectada por linha vertical com marcadores;
 * - Rodapé centralizado: Ginásio/Local + subtítulo azul suave + link verde "Ver detalhes ›" (See all >).
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

  // Estado vazio elegante no estilo All Sports (sem dados fictícios)
  if (!match) {
    return (
      <div className={`all-sports-card p-5 sm:p-6 ${className}`}>
        <div className="all-sports-section-pill mb-4">
          INTRAMED IX • Confronto Oficial
        </div>

        <div className="flex flex-col items-center justify-center mb-3">
          <span className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
            <Bell className="w-4 h-4" />
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 max-w-md mx-auto">
          <div className="flex items-center justify-end gap-2.5 text-right min-w-0">
            <span className="text-xs sm:text-sm font-display font-bold text-slate-400 truncate">
              Aguardando equipe
            </span>
            <TeamCrest size="md" />
          </div>

          <div className="px-4 py-1.5 rounded-full bg-[#F3F4F9] text-slate-400 text-xs sm:text-sm font-display font-extrabold">
            — : —
          </div>

          <div className="flex items-center justify-start gap-2.5 text-left min-w-0">
            <TeamCrest size="md" />
            <span className="text-xs sm:text-sm font-display font-bold text-slate-400 truncate">
              Aguardando equipe
            </span>
          </div>
        </div>

        <div className="mt-5 text-center space-y-1">
          <p className="text-xs font-semibold text-slate-600">{emptyMessage}</p>
          <p className="text-[11px] font-medium text-[#4F6BED]">
            Local e horário serão exibidos após o sorteio oficial
          </p>
        </div>
      </div>
    );
  }

  const isLive = match.status === 'live' || match.status === 'halftime';
  const isFinished = match.status === 'finished';

  return (
    <div
      className={`all-sports-card p-5 sm:p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${className}`}
    >
      {/* 1. Pílula Cinza-Lavanda no Topo (Ex: UEFA Champions League -> Modalidade • Categoria) */}
      <div className="all-sports-section-pill mb-4 flex items-center justify-center gap-2">
        <span className="truncate">
          {match.modalityName}
          {match.categoryName ? ` • ${match.categoryName}` : ''}
          {match.phaseLabel ? ` — ${match.phaseLabel}` : ''}
        </span>
      </div>

      {/* 2. Badge Central de Status (Verde = Ongoing Match | Cinza = Finished Match | Sino = Upcoming Match) */}
      <div className="flex justify-center mb-3.5">
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#10B981] text-white text-xs font-display font-extrabold shadow-sm">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span>
              {sheet?.timer?.periodLabel
                ? `${sheet.timer.periodLabel} • AO VIVO`
                : 'AO VIVO'}
            </span>
          </span>
        ) : isFinished ? (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#9CA3AF] text-white text-xs font-display font-extrabold">
            <Clock className="w-3.5 h-3.5" />
            <span>FIM</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => navigate(`/notificacoes`)}
            title="Ativar lembrete da partida"
            className="w-8 h-8 rounded-full bg-[#F3F4F9] hover:bg-blue-50 border border-slate-200/80 flex items-center justify-center text-[#4F6BED] transition-colors"
          >
            <Bell className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 3. Linha Principal do Confronto (Equipes + Escudos + Placar ou Horário Central) */}
      <div
        onClick={() => navigate(`/placar/${match.id}`)}
        className="cursor-pointer grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 sm:gap-4 max-w-lg mx-auto"
      >
        {/* Mandante (Nome à esquerda + Escudo à direita, igual às Imagens 2 e 3) */}
        <div className="flex items-center justify-end gap-2.5 text-right min-w-0">
          <span className="text-xs sm:text-base font-display font-bold text-slate-800 truncate">
            {match.homeTeam.teamName || 'Aguardando equipe'}
          </span>
          <TeamCrest
            crestUrl={match.homeTeam.crestUrl}
            teamName={match.homeTeam.teamName}
            size="md"
            highlighted={Boolean(match.homeTeam.isWinner)}
          />
        </div>

        {/* Placar Central em Pílula (Ongoing/Finished) ou Horário Coral (Upcoming) */}
        <div className="flex flex-col items-center justify-center px-1">
          {isLive || isFinished ? (
            <div className="px-4 py-1.5 rounded-full bg-[#F3F4F9] border border-slate-200/70 text-slate-900 font-display font-extrabold text-sm sm:text-base tracking-tight tabular-nums shadow-inner">
              {match.homeTeam.score ?? 0} - {match.awayTeam.score ?? 0}
            </div>
          ) : (
            <div className="text-center">
              <span className="block text-sm sm:text-base font-display font-extrabold text-[#EF4444] leading-none">
                {match.scheduledTime || 'A definir'}
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                {match.scheduledDate || 'INTRAMED'}
              </span>
            </div>
          )}
        </div>

        {/* Visitante (Escudo à esquerda + Nome à direita, igual às Imagens 2 e 3) */}
        <div className="flex items-center justify-start gap-2.5 text-left min-w-0">
          <TeamCrest
            crestUrl={match.awayTeam.crestUrl}
            teamName={match.awayTeam.teamName}
            size="md"
            highlighted={Boolean(match.awayTeam.isWinner)}
          />
          <span className="text-xs sm:text-base font-display font-bold text-slate-800 truncate">
            {match.awayTeam.teamName || 'Aguardando equipe'}
          </span>
        </div>
      </div>

      {/* 4. Árvore Bilateral de Gols / Pontos (Scorers Tree idêntica às Imagens 2, 3 e 5) */}
      {(homeScorers.length > 0 || awayScorers.length > 0) && (
        <div className="mt-4 grid grid-cols-2 gap-4 max-w-md mx-auto text-[11px] text-[#5B6B98]">
          {/* Coluna Mandante */}
          <div className="flex flex-col items-end pr-2 border-r border-dashed border-slate-200 space-y-1.5">
            {homeScorers.map((ev) => (
              <div key={ev.id} className="inline-flex items-center gap-1.5">
                <span className="font-medium truncate max-w-[120px]">
                  {ev.athleteName || ev.typeLabel}{' '}
                  <span className="text-slate-400">{ev.matchClockDisplay}</span>
                </span>
                <CircleDot className="w-3 h-3 text-[#0B218A] shrink-0" />
              </div>
            ))}
          </div>

          {/* Coluna Visitante */}
          <div className="flex flex-col items-start pl-2 space-y-1.5">
            {awayScorers.map((ev) => (
              <div key={ev.id} className="inline-flex items-center gap-1.5">
                <CircleDot className="w-3 h-3 text-[#0B218A] shrink-0" />
                <span className="font-medium truncate max-w-[120px]">
                  <span className="text-slate-400">{ev.matchClockDisplay}</span>{' '}
                  {ev.athleteName || ev.typeLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Rodapé Centralizado: Local + Subtítulo Azul + Botão Verde "See all >" */}
      <div className="mt-4 pt-3 border-t border-slate-100 text-center space-y-1">
        <p className="text-xs font-bold text-slate-600">
          {match.venue || 'Ginásio Oficial • Medicina UEMA'}
        </p>
        <p className="text-[11px] font-semibold text-[#64748B]">
          {match.modalityName} •{' '}
          {match.scheduledDate
            ? `${match.scheduledDate}${match.scheduledTime ? ` às ${match.scheduledTime}` : ''}`
            : 'Calendário Oficial INTRAMED IX'}
        </p>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/placar/${match.id}`)}
            className="inline-flex items-center gap-1 text-xs font-display font-extrabold text-[#10B981] hover:text-[#059669] transition-colors"
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>Ver detalhes</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {showOperatorActions && isAdmin && (
            <>
              <span className="text-slate-200">|</span>
              <button
                type="button"
                onClick={() => navigate(`/sumula/${match.id}`)}
                className="inline-flex items-center gap-1 text-xs font-display font-bold text-[#0B218A] hover:underline"
              >
                <Play className="w-3 h-3" />
                <span>Abrir Súmula (Mesa)</span>
              </button>
            </>
          )}
          {(isLive || isFinished) && (
            <>
              <span className="text-slate-200">|</span>
              <button
                type="button"
                onClick={() => navigate(`/sumula/${match.id}/documento`)}
                className="inline-flex items-center gap-1 text-xs font-display font-bold text-amber-600 hover:underline"
              >
                <FileText className="w-3 h-3" />
                <span>Baixar Súmula Oficial</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
