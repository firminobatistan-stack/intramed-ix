import React, { useState } from 'react';
import {
  OFFICIAL_MODALITIES,
  INITIAL_BRACKETS,
  TOURNAMENT_16_MODALITIES,
  OfficialTournamentModality,
} from '../data/officialData';
import { BracketView } from '../components/sports/BracketView';
import { SportIcon } from '../components/sports/SportIcon';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
  BookOpen,
  Info,
  Trophy,
  Shield,
  Sparkles,
  CheckCircle2,
  Users,
  User,
} from 'lucide-react';

export const BracketPage: React.FC = () => {
  const [filterType, setFilterType] = useState<'todas' | 'coletiva' | 'individual'>('todas');
  const [selectedModId, setSelectedModId] = useState<string>(TOURNAMENT_16_MODALITIES[0].id);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  const filteredModalities = TOURNAMENT_16_MODALITIES.filter((m) => {
    if (filterType === 'coletiva') return m.type === 'coletiva';
    if (filterType === 'individual') return m.type === 'individual';
    return true;
  });

  const currentMod =
    TOURNAMENT_16_MODALITIES.find((m) => m.id === selectedModId) ||
    TOURNAMENT_16_MODALITIES[0];

  const currentBracket = INITIAL_BRACKETS[currentMod.sportSlug] || null;

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página com Botão do Regulamento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-brand-surface-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-brand-yellow" aria-hidden="true" />
            <h2 className="text-lg sm:text-xl font-display font-extrabold text-brand-text-primary">
              Chaveamento Oficial • INTRAMED IX
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-brand-text-secondary mt-1">
            Mata-mata para 5 Atléticas: 1 jogo de Quartas de Final, 2 Semifinais e Grande Final.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<BookOpen className="w-4 h-4 text-brand-blue" />}
          onClick={() => setIsRulesModalOpen(true)}
          className="shrink-0"
        >
          Regulamento de Sorteio &amp; Pontuações
        </Button>
      </div>

      {/* Filtro por Categoria: Coletivas (Peso 2) vs Individuais (Peso 1) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setFilterType('todas')}
          className={`px-3.5 py-2 rounded-xl text-xs font-display font-bold transition-all shrink-0 ${
            filterType === 'todas'
              ? 'bg-[#0B218A] text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Todas as 16 Modalidades
        </button>

        <button
          type="button"
          onClick={() => setFilterType('coletiva')}
          className={`px-3.5 py-2 rounded-xl text-xs font-display font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            filterType === 'coletiva'
              ? 'bg-[#0B218A] text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>8 Coletivas (Peso 2)</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('individual')}
          className={`px-3.5 py-2 rounded-xl text-xs font-display font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            filterType === 'individual'
              ? 'bg-[#0B218A] text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>8 Individuais (Peso 1)</span>
        </button>
      </div>

      {/* Grid de Pílulas das Modalidades Filtradas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {filteredModalities.map((mod) => {
          const isSelected = selectedModId === mod.id;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => setSelectedModId(mod.id)}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-blue-50/80 border-[#0B218A] ring-2 ring-[#0B218A]/20 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-[#0B218A] text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <SportIcon iconKey={mod.sportSlug} className="w-3.5 h-3.5" />
                </div>
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    mod.weight === 2
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  P{mod.weight}
                </span>
              </div>
              <span className="text-[11px] font-display font-extrabold text-slate-900 truncate block">
                {mod.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Banner Informativo da Modalidade Ativa */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-display font-extrabold text-brand-yellow">
              {currentMod.name}
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 border border-white/15">
              {currentMod.type === 'coletiva' ? 'Coletiva • Peso 2' : 'Individual • Peso 1'}
            </span>
          </div>
          <p className="text-xs text-white/80">
            Pontuação: <strong>1º Lugar ({currentMod.points1st} pts)</strong> • 2º ({currentMod.points2nd} pts) • 3º ({currentMod.points3rd} pts) • 4º ({currentMod.points4th} pts).
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-brand-yellow bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Formato: 5 Equipes (1 Quartas + 2 Semis)</span>
        </div>
      </div>

      {/* Componente de Chaveamento Visual */}
      <BracketView
        bracket={currentBracket}
        modalityId={currentMod.sportSlug}
        modalityName={currentMod.name}
      />

      {/* MODAL DO REGULAMENTO: SORTEIO E PONTUAÇÃO DAS 16 MODALIDADES */}
      <Modal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        title="Regulamento Oficial: Sorteio e Pontuações do Chaveamento"
      >
        <div className="space-y-5 text-xs text-slate-700 max-h-[75vh] overflow-y-auto pr-1">
          {/* Seção 1: Formato de 5 Equipes */}
          <section className="space-y-2 p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200">
            <h4 className="font-display font-black text-blue-950 uppercase text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>1. Formato do Mata-Mata para 5 Atléticas</span>
            </h4>
            <p className="leading-relaxed">
              Com 5 equipes (Sanguinária, Predadora, Tormenta, Colossal e Calouros), o mata-mata conta com:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-slate-800">
              <li><strong>Quartas de Final:</strong> 1 única partida (Atlética A × Atlética B). A perdedora fica em 5º lugar.</li>
              <li><strong>Semifinal 1:</strong> Atlética C × Atlética D (ambas entraram diretamente via bye do sorteio).</li>
              <li><strong>Semifinal 2:</strong> Vencedora das Quartas × Atlética E (que entrou diretamente via bye).</li>
              <li><strong>Grande Final:</strong> Vencedora da Semifinal 1 × Vencedora da Semifinal 2.</li>
            </ul>
          </section>

          {/* Seção 2: Equilíbrio das Quartas (32 Vagas) */}
          <section className="space-y-2.5">
            <h4 className="font-display font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-brand-yellow-dark" />
              <span>2. Matriz Matemática de Equilíbrio das Quartas de Final</span>
            </h4>
            <p className="leading-relaxed">
              Em 16 modalidades, teremos 32 participações nas quartas (\(16 \times 2 = 32\)). A distribuição é matematicamente equilibrada para que nenhuma equipe seja prejudicada:
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Atlética</th>
                    <th className="py-2 px-3 text-center">8 Coletivas</th>
                    <th className="py-2 px-3 text-center">8 Individuais</th>
                    <th className="py-2 px-3 text-center">Total Quartas</th>
                    <th className="py-2 px-3 text-center">Byes Diretos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-2 px-3 font-bold">Atlética 1</td>
                    <td className="py-2 px-3 text-center font-bold text-amber-800">4</td>
                    <td className="py-2 px-3 text-center">3</td>
                    <td className="py-2 px-3 text-center font-black">7</td>
                    <td className="py-2 px-3 text-center">9</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold">Atlética 2</td>
                    <td className="py-2 px-3 text-center">3</td>
                    <td className="py-2 px-3 text-center font-bold text-amber-800">4</td>
                    <td className="py-2 px-3 text-center font-black">7</td>
                    <td className="py-2 px-3 text-center">9</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold">Atlética 3</td>
                    <td className="py-2 px-3 text-center">3</td>
                    <td className="py-2 px-3 text-center">3</td>
                    <td className="py-2 px-3 text-center font-black">6</td>
                    <td className="py-2 px-3 text-center">10</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold">Atlética 4</td>
                    <td className="py-2 px-3 text-center">3</td>
                    <td className="py-2 px-3 text-center">3</td>
                    <td className="py-2 px-3 text-center font-black">6</td>
                    <td className="py-2 px-3 text-center">10</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold">Atlética 5</td>
                    <td className="py-2 px-3 text-center">3</td>
                    <td className="py-2 px-3 text-center">3</td>
                    <td className="py-2 px-3 text-center font-black">6</td>
                    <td className="py-2 px-3 text-center">10</td>
                  </tr>
                  <tr className="bg-slate-50 font-black">
                    <td className="py-2 px-3">Total de Vagas</td>
                    <td className="py-2 px-3 text-center">16</td>
                    <td className="py-2 px-3 text-center">16</td>
                    <td className="py-2 px-3 text-center">32</td>
                    <td className="py-2 px-3 text-center">48</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Seção 3: Pontuação e Critério de 3º e 4º Lugar */}
          <section className="space-y-2 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
            <h4 className="font-display font-black text-amber-950 uppercase text-xs">
              3. Critério Oficial de 3º e 4º Colocado (Item 04 do Regulamento)
            </h4>
            <ul className="list-disc pl-4 space-y-1.5 text-slate-800 leading-relaxed">
              <li><strong>Campeão e Vice:</strong> Definidos na partida da Grande Final.</li>
              <li><strong>3º Colocado:</strong> Equipe derrotada na semifinal pela equipe que for a campeã da modalidade.</li>
              <li><strong>4º Colocado:</strong> Equipe derrotada na semifinal pela equipe que for a vice-campeã.</li>
              <li><strong>5º Colocado:</strong> Equipe derrotada na partida das Quartas de Final.</li>
            </ul>
          </section>

          {/* Seção 4: Critérios de Desempate Geral */}
          <section className="space-y-2">
            <h4 className="font-display font-black text-slate-900 uppercase text-xs">
              4. Critérios de Desempate na Pontuação Geral do INTRAMED
            </h4>
            <ol className="list-decimal pl-4 space-y-1 text-slate-800 leading-relaxed">
              <li>Maior número de 1ºs lugares (Medalhas de Ouro);</li>
              <li>Maior número de 1ºs lugares em esportes coletivos (Peso 2);</li>
              <li>Maior número de 2ºs lugares (Medalhas de Prata);</li>
              <li>Maior número de 3ºs lugares (Medalhas de Bronze).</li>
            </ol>
          </section>

          <div className="pt-2 text-right">
            <Button variant="primary" size="sm" onClick={() => setIsRulesModalOpen(false)}>
              Entendido
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
