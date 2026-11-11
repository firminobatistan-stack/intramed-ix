import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StandingEntry, ModalitySlug } from '../../types/domain';
import { TeamCrest } from './TeamCrest';

interface StandingsTableProps {
  standings: StandingEntry[];
  modalityId?: ModalitySlug;
  modalityName?: string;
}

/**
 * 9. CLASSIFICAÇÃO ADAPTÁVEL POR MODALIDADE (Master Prompt Seções 9 e 16)
 * - Para modalidades de gols (Futsal, Handebol): J, V, E, D, GP, GC, SG, PTS
 * - Para Basquete: J, V, D, PF, PS, Saldo, PTS
 * - Para Vôlei / Vôlei de Praia / Tênis de Mesa: J, V, D, Sets Pró, Sets Contra, PTS
 * - Para Natação / Mesa: Posição, Equipe/Período, Provas, Ouro/Vitórias, PTS
 * Clicar na linha da equipe abre diretamente `/equipe/:teamId`.
 */
export const StandingsTable: React.FC<StandingsTableProps> = ({
  standings,
  modalityId = 'futsal',
  modalityName,
}) => {
  const navigate = useNavigate();
  const isBasketball = modalityId === 'basquete';
  const isVolleyOrSets =
    modalityId === 'volei' ||
    modalityId === 'volei-de-praia' ||
    modalityId === 'tenis-de-mesa';
  const isSwimming = modalityId === 'natacao';

  const getColumnHeaders = () => {
    if (isBasketball) {
      return {
        played: 'J',
        won: 'V',
        drawn: null,
        lost: 'D',
        forLabel: 'PF',
        againstLabel: 'PS',
        diffLabel: 'SP',
        pts: 'PTS',
      };
    }
    if (isVolleyOrSets) {
      return {
        played: 'J',
        won: 'V',
        drawn: null,
        lost: 'D',
        forLabel: 'SP',
        againstLabel: 'SC',
        diffLabel: 'SS',
        pts: 'PTS',
      };
    }
    if (isSwimming) {
      return {
        played: 'PRV',
        won: '1º',
        drawn: '2º',
        lost: '3º',
        forLabel: 'FIN',
        againstLabel: ' REC',
        diffLabel: 'BÔN',
        pts: 'PTS',
      };
    }
    return {
      played: 'J',
      won: 'V',
      drawn: 'E',
      lost: 'D',
      forLabel: 'GP',
      againstLabel: 'GC',
      diffLabel: 'SG',
      pts: 'PTS',
    };
  };

  const cols = getColumnHeaders();

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white border border-brand-surface-border shadow-card overflow-hidden">
        {modalityName && (
          <div className="px-5 py-3 bg-gradient-to-r from-brand-blue-dark via-brand-blue to-brand-blue-medium text-white flex items-center justify-between gap-3">
            <h3 className="text-sm font-display font-extrabold text-white">
              {modalityName}
            </h3>
          </div>
        )}

        {/* Grade Responsiva da Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[540px]">
            <thead>
              <tr className="border-b border-brand-surface-border bg-brand-surface-muted/80 text-[11px] font-display font-extrabold uppercase tracking-wider text-brand-text-secondary">
                <th className="py-3 pl-5 pr-2 w-12">#</th>
                <th className="py-3 px-3">Equipe</th>
                <th className="py-3 px-2.5 text-center w-12 font-extrabold text-brand-blue">
                  {cols.pts}
                </th>
                <th className="py-3 px-2 text-center w-10">{cols.played}</th>
                <th className="py-3 px-2 text-center w-10">{cols.won}</th>
                {cols.drawn && (
                  <th className="py-3 px-2 text-center w-10">{cols.drawn}</th>
                )}
                <th className="py-3 px-2 text-center w-10">{cols.lost}</th>
                <th className="py-3 px-2 text-center w-12 hidden sm:table-cell">
                  {cols.forLabel}
                </th>
                <th className="py-3 px-2 text-center w-12 hidden sm:table-cell">
                  {cols.againstLabel}
                </th>
                <th className="py-3 pl-2 pr-5 text-center w-12">{cols.diffLabel}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-surface-border text-xs tabular-nums">
              {standings.length > 0 ? (
                standings.map((row, idx) => {
                  const isTopZone = idx < 4;
                  return (
                    <tr
                      key={row.teamId}
                      onClick={() => navigate(`/equipe/${row.teamId}`)}
                      className="cursor-pointer hover:bg-brand-surface-muted/60 transition-colors"
                    >
                      <td className="py-3.5 pl-5 pr-2">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-lg font-display font-extrabold text-xs ${
                            idx === 0
                              ? 'bg-brand-yellow text-brand-blue-dark'
                              : isTopZone
                              ? 'bg-brand-blue text-white'
                              : 'bg-brand-surface-muted text-brand-text-secondary'
                          }`}
                        >
                          {row.position}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <TeamCrest
                            crestUrl={row.crestUrl}
                            teamName={row.teamName}
                            size="sm"
                          />
                          <span className="font-display font-bold text-brand-text-primary truncate max-w-[180px]">
                            {row.teamName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-2.5 text-center font-display font-extrabold text-sm text-brand-blue bg-brand-blue-light/30">
                        {row.points}
                      </td>
                      <td className="py-3.5 px-2 text-center text-brand-text-primary font-semibold">
                        {row.played}
                      </td>
                      <td className="py-3.5 px-2 text-center text-emerald-700 font-semibold">
                        {row.won}
                      </td>
                      {cols.drawn && (
                        <td className="py-3.5 px-2 text-center text-brand-text-secondary">
                          {row.drawn}
                        </td>
                      )}
                      <td className="py-3.5 px-2 text-center text-brand-text-secondary">
                        {row.lost}
                      </td>
                      <td className="py-3.5 px-2 text-center text-brand-text-secondary hidden sm:table-cell">
                        {row.scoreFor}
                      </td>
                      <td className="py-3.5 px-2 text-center text-brand-text-secondary hidden sm:table-cell">
                        {row.scoreAgainst}
                      </td>
                      <td className="py-3.5 pl-2 pr-5 text-center font-bold text-brand-text-primary">
                        {row.scoreDifference > 0
                          ? `+${row.scoreDifference}`
                          : row.scoreDifference}
                      </td>
                    </tr>
                  );
                })
              ) : (
                // Slots estruturais vazios sem nomes fictícios
                [1, 2, 3, 4].map((pos) => (
                  <tr key={pos} className="text-brand-text-muted">
                    <td className="py-3 pl-5 pr-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-brand-surface-muted border border-dashed border-brand-surface-border font-display font-bold text-[11px]">
                        {pos}º
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <TeamCrest size="sm" />
                        <span className="text-xs italic text-brand-text-muted">
                          A definir
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2.5 text-center font-bold bg-brand-surface-muted/40">
                      —
                    </td>
                    <td className="py-3 px-2 text-center">—</td>
                    <td className="py-3 px-2 text-center">—</td>
                    {cols.drawn && <td className="py-3 px-2 text-center">—</td>}
                    <td className="py-3 px-2 text-center">—</td>
                    <td className="py-3 px-2 text-center hidden sm:table-cell">—</td>
                    <td className="py-3 px-2 text-center hidden sm:table-cell">—</td>
                    <td className="py-3 pl-2 pr-5 text-center">—</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
