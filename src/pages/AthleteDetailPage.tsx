import React, { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Award,
  Camera,
  ChevronRight,
  Clock,
  FlaskConical,
  Heart,
  Info,
  Ruler,
  Shield,
  Shirt,
  Trophy,
  User,
  UserCheck,
} from 'lucide-react';
import { OFFICIAL_MODALITIES } from '../data/officialData';
import { ModalitySlug } from '../types/domain';
import { SportIcon } from '../components/sports/SportIcon';
import { EmptyState } from '../components/ui/EmptyState';
import { useCompetitionStore } from '../context/CompetitionStoreContext';

type AthleteTab = 'profile' | 'matches' | 'stats' | 'career';

/**
 * PÁGINA DO ATLETA (/atleta e /atleta/:athleteId) — Estilo All Sports / Sofascore:
 * - Header imersivo Azul Royal com avatar/foto centralizado, upload de foto pelo próprio atleta ou admin,
 *   dupla insígnia (Escudo Período + Edição IX), Nome em destaque, Número e Posição;
 * - Abas com sublinhado Amarelo (#FACC15): Perfil | Partidas | Estatísticas | Histórico;
 * - Estatísticas básicas reais alimentadas automaticamente pela Súmula Eletrônica (sem estatísticas complexas
 *   como tocos, rebotes ou pontos individuais de vôlei);
 * - Histórico partida a partida com navegação direta para a partida (/placar/:matchId) e para a equipe (/equipe/:teamId).
 */
export const AthleteDetailPage: React.FC = () => {
  const { athleteId } = useParams<{ athleteId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    isTestMode,
    setTestMode,
    visibleAthletes,
    getAthleteById,
    getTeamById,
    getAthleteStats,
    favoriteAthleteIds,
    toggleFavoriteAthlete,
    canEditAthleteProfile,
    canOperateOfficialData,
    updateAthleteAvatar,
    currentUser,
  } = useCompetitionStore();
  const isAdmin = canOperateOfficialData();

  const [activeTab, setActiveTab] = useState<AthleteTab>('profile');
  const [selectedModality, setSelectedModality] = useState<ModalitySlug>('futsal');
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  const resolvedAthlete =
    (athleteId ? getAthleteById(athleteId) : undefined) ||
    visibleAthletes[0] ||
    null;

  const team = resolvedAthlete ? getTeamById(resolvedAthlete.teamId) : undefined;
  const teamPrimaryHex = team?.theme?.primaryHex || '#0B218A';
  const teamSecondaryHex = team?.theme?.secondaryHex || '#061356';
  const teamAccentHex = team?.theme?.accentHex || '#FACC15';
  const stats = resolvedAthlete
    ? getAthleteStats(resolvedAthlete.id, selectedModality)
    : null;

  const isFavorited = resolvedAthlete
    ? favoriteAthleteIds.includes(resolvedAthlete.id)
    : false;

  const hasEditPermission = resolvedAthlete
    ? canEditAthleteProfile(resolvedAthlete.id)
    : false;

  const activeModObj =
    OFFICIAL_MODALITIES.find((m) => m.id === selectedModality) ||
    OFFICIAL_MODALITIES[0];

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !resolvedAthlete) return;
    if (!file.type.startsWith('image/')) {
      setUploadFeedback('Selecione um arquivo de imagem válido (JPG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const ok = updateAthleteAvatar(resolvedAthlete.id, reader.result);
        if (ok) {
          setUploadFeedback('Foto oficial atualizada com sucesso!');
          setTimeout(() => setUploadFeedback(null), 3500);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGoToAthleteLogin = () => {
    navigate('/login');
  };

  const getPositionDiagram = (mod: ModalitySlug, athletePos?: string | null) => {
    switch (mod) {
      case 'basquete':
        return {
          primary: athletePos || 'Armador / Ala-Armador',
          others: 'Ala, Ala-Pivô, Pivô',
          slots: [
            { code: 'C', top: '20%', left: '50%', active: false },
            { code: 'PF', top: '42%', left: '30%', active: false },
            { code: 'SF', top: '42%', left: '72%', active: true },
            { code: 'PG', top: '70%', left: '50%', active: false },
          ],
        };
      case 'volei':
      case 'volei-de-praia':
        return {
          primary: athletePos || 'Rotação Coletiva em Quadra',
          others: 'Saques, Recepção e Defesa Coletiva',
          slots: [
            { code: 'P4', top: '28%', left: '28%', active: false },
            { code: 'P3', top: '28%', left: '50%', active: true },
            { code: 'P2', top: '28%', left: '72%', active: false },
            { code: 'P6', top: '72%', left: '50%', active: false },
          ],
        };
      case 'handebol':
        return {
          primary: athletePos || 'Armador Central / Ponta',
          others: 'Meia, Pivô, Goleiro',
          slots: [
            { code: 'PIV', top: '22%', left: '50%', active: false },
            { code: 'PON', top: '34%', left: '78%', active: false },
            { code: 'ARM', top: '52%', left: '50%', active: true },
            { code: 'GOL', top: '82%', left: '50%', active: false },
          ],
        };
      default:
        return {
          primary: athletePos || 'Ala / Pivô',
          others: 'Fixo, Ala Esquerda, Goleiro',
          slots: [
            { code: 'PIV', top: '18%', left: '50%', active: false },
            { code: 'ALA', top: '38%', left: '76%', active: true },
            { code: 'FIX', top: '56%', left: '48%', active: false },
            { code: 'GOL', top: '80%', left: '50%', active: false },
          ],
        };
    }
  };

  const posInfo = getPositionDiagram(selectedModality, resolvedAthlete?.position);

  const tabs: Array<{ id: AthleteTab; label: string }> = [
    { id: 'profile', label: 'Perfil' },
    { id: 'matches', label: 'Partidas' },
    { id: 'stats', label: 'Estatísticas' },
    { id: 'career', label: 'Histórico' },
  ];

  // Seletor de cartões de estatísticas básicas por modalidade (Sem stats complexas!)
  const renderBasicStatsGrid = () => {
    if (!stats) return null;

    if (selectedModality === 'futsal') {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="all-sports-card p-4 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Partidas (J)
            </span>
            <p className="text-2xl font-display font-extrabold text-[#0B218A] mt-1">
              {stats.matchesPlayed}
            </p>
          </div>
          <div className="all-sports-card p-4 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Gols Marcados
            </span>
            <p className="text-2xl font-display font-extrabold text-emerald-600 mt-1">
              {stats.goals}
            </p>
          </div>
          <div className="all-sports-card p-4 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Cartões Amarelos
            </span>
            <p className="text-2xl font-display font-extrabold text-amber-500 mt-1">
              {stats.yellowCards}
            </p>
          </div>
          <div className="all-sports-card p-4 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Cartões Vermelhos
            </span>
            <p className="text-2xl font-display font-extrabold text-rose-600 mt-1">
              {stats.redCards}
            </p>
          </div>
        </div>
      );
    }

    if (selectedModality === 'handebol') {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="all-sports-card p-4 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Partidas (J)
            </span>
            <p className="text-2xl font-display font-extrabold text-[#0B218A] mt-1">
              {stats.matchesPlayed}
            </p>
          </div>
          <div className="all-sports-card p-4 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Gols Marcados
            </span>
            <p className="text-2xl font-display font-extrabold text-emerald-600 mt-1">
              {stats.goals}
            </p>
          </div>
          <div className="all-sports-card p-4 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Exclusões 2 Min
            </span>
            <p className="text-2xl font-display font-extrabold text-amber-600 mt-1">
              {stats.suspensions2Min}
            </p>
          </div>
          <div className="all-sports-card p-4 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Cartões (CA / CV)
            </span>
            <p className="text-2xl font-display font-extrabold text-rose-600 mt-1">
              {stats.yellowCards} / {stats.redCards}
            </p>
          </div>
        </div>
      );
    }

    if (selectedModality === 'basquete') {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="all-sports-card p-4 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Partidas (J)
            </span>
            <p className="text-2xl font-display font-extrabold text-[#0B218A] mt-1">
              {stats.matchesPlayed}
            </p>
          </div>
          <div className="all-sports-card p-4 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Pontos Totais
            </span>
            <p className="text-2xl font-display font-extrabold text-emerald-600 mt-1">
              {stats.pointsTotal}
            </p>
          </div>
          <div className="all-sports-card p-4 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Cestas de 3 Pts
            </span>
            <p className="text-2xl font-display font-extrabold text-[#1D63FF] mt-1">
              {stats.baskets3Pt}
            </p>
          </div>
          <div className="all-sports-card p-4 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Cestas de 2 Pts
            </span>
            <p className="text-2xl font-display font-extrabold text-[#0B218A] mt-1">
              {stats.baskets2Pt}
            </p>
          </div>
          <div className="all-sports-card p-4 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Lances Livres (1 Pt)
            </span>
            <p className="text-2xl font-display font-extrabold text-slate-700 mt-1">
              {stats.freeThrows1Pt}
            </p>
          </div>
          <div className="all-sports-card p-4 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Faltas Pessoais
            </span>
            <p className="text-2xl font-display font-extrabold text-rose-600 mt-1">
              {stats.fouls}
            </p>
          </div>
        </div>
      );
    }

    if (selectedModality === 'volei' || selectedModality === 'volei-de-praia') {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="all-sports-card p-4 text-center">
              <span className="text-[11px] font-bold uppercase text-slate-400">
                Jogos Relacionados
              </span>
              <p className="text-2xl font-display font-extrabold text-[#0B218A] mt-1">
                {stats.matchesPlayed}
              </p>
            </div>
            <div className="all-sports-card p-4 text-center">
              <span className="text-[11px] font-bold uppercase text-slate-400">
                Sets Participados
              </span>
              <p className="text-2xl font-display font-extrabold text-[#1D63FF] mt-1">
                {stats.setsParticipated}
              </p>
            </div>
            <div className="all-sports-card p-4 text-center">
              <span className="text-[11px] font-bold uppercase text-slate-400">
                Vitórias da Equipe
              </span>
              <p className="text-2xl font-display font-extrabold text-emerald-600 mt-1">
                {stats.teamWinsInVolley}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-blue-50/80 border border-blue-200 px-4 py-3 flex items-center gap-2.5 text-xs text-[#0B218A]">
            <Info className="w-4 h-4 shrink-0 text-[#1D63FF]" />
            <span>
              No <strong>{activeModObj.name}</strong> do INTRAMED IX, a pontuação é contabilizada de forma <strong>coletiva por sets e parciais da equipe</strong> (sem contagem individual de ataques ou bloqueios).
            </span>
          </div>
        </div>
      );
    }

    if (selectedModality === 'natacao') {
      return (
        <div className="grid grid-cols-3 gap-3">
          <div className="all-sports-card p-4 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Baterias / Provas
            </span>
            <p className="text-2xl font-display font-extrabold text-[#0B218A] mt-1">
              {stats.heatsRaced}
            </p>
          </div>
          <div className="all-sports-card p-4 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Melhor Tempo Oficial
            </span>
            <p className="text-xl sm:text-2xl font-display font-extrabold text-emerald-600 mt-1 tabular-nums">
              {stats.bestTimeFormatted || '—'}
            </p>
          </div>
          <div className="all-sports-card p-4 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Pódios (1º / 2º / 3º)
            </span>
            <p className="text-2xl font-display font-extrabold text-amber-500 mt-1">
              {stats.podiumsCount}
            </p>
          </div>
        </div>
      );
    }

    if (selectedModality === 'tenis-de-mesa') {
      return (
        <div className="grid grid-cols-3 gap-3">
          <div className="all-sports-card p-4 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Confrontos da Equipe
            </span>
            <p className="text-2xl font-display font-extrabold text-[#0B218A] mt-1">
              {stats.matchesPlayed}
            </p>
          </div>
          <div className="all-sports-card p-4 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Jogos Individuais
            </span>
            <p className="text-2xl font-display font-extrabold text-[#1D63FF] mt-1">
              {stats.subMatchesPlayed}
            </p>
          </div>
          <div className="all-sports-card p-4 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Vitórias Individuais
            </span>
            <p className="text-2xl font-display font-extrabold text-emerald-600 mt-1">
              {stats.subMatchesWon}
            </p>
          </div>
        </div>
      );
    }

    // Demais modalidades (Mesa / Geral)
    return (
      <div className="grid grid-cols-3 gap-3">
        <div className="all-sports-card p-4 text-center">
          <span className="text-[11px] font-bold uppercase text-slate-400">
            Partidas (J)
          </span>
          <p className="text-2xl font-display font-extrabold text-[#0B218A] mt-1">
            {stats.matchesPlayed}
          </p>
        </div>
        <div className="all-sports-card p-4 text-center">
          <span className="text-[11px] font-bold uppercase text-slate-400">
            Jogos como Titular
          </span>
          <p className="text-2xl font-display font-extrabold text-emerald-600 mt-1">
            {stats.startersCount}
          </p>
        </div>
        <div className="all-sports-card p-4 text-center">
          <span className="text-[11px] font-bold uppercase text-slate-400">
            Pontos / Placar
          </span>
          <p className="text-2xl font-display font-extrabold text-[#1D63FF] mt-1">
            {stats.pointsTotal + stats.goals}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Barra Superior de Seleção de Atleta (Permite navegar entre todos os atletas inscritos ou de teste) */}
      {visibleAthletes.length > 0 ? (
        <div className="all-sports-card p-3.5 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-display font-extrabold uppercase tracking-wider text-slate-400 px-2">
              Atletas ({visibleAthletes.length}):
            </span>
            {visibleAthletes.map((ath) => {
              const isSelected = resolvedAthlete?.id === ath.id;
              const athTeam = getTeamById(ath.teamId);
              return (
                <button
                  key={ath.id}
                  type="button"
                  onClick={() => navigate(`/atleta/${ath.id}`)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-bold transition-all shrink-0 ${
                    isSelected
                      ? 'bg-[#0B218A] text-white shadow-sm'
                      : 'bg-[#F3F4F9] text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <span>#{ath.jerseyNumber || '•'}</span>
                  <span>{ath.name}</span>
                  {athTeam && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-brand-yellow'
                          : 'bg-white text-slate-500'
                      }`}
                    >
                      {athTeam.shortName}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        !isTestMode && (
          <div className="all-sports-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 border-slate-200">
            <div className="text-xs text-slate-600 font-medium">
              Os atletas inscritos pelas 5 equipes oficiais aparecerão listados aqui assim que o cadastro for concluído pela Comissão Organizadora.
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="px-3.5 py-1.5 rounded-full bg-[#0B218A] text-white text-xs font-display font-bold"
                >
                  Cadastrar no Admin
                </button>
                <button
                  type="button"
                  onClick={() => setTestMode(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-brand-yellow text-[#0B218A] text-xs font-display font-extrabold"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>Modo de Teste</span>
                </button>
              </div>
            )}
          </div>
        )
      )}

      {/* 1. HEADER IMERSIVO DO ATLETA + ABAS COM SUBLINHADO AMARELO (Imagem 1 Esquerda) */}
      <section className="overflow-hidden rounded-[28px] bg-white shadow-lg border border-slate-200/80">
        <div
          style={
            team
              ? {
                  background: `radial-gradient(circle at 85% 15%, ${teamAccentHex}25 0%, transparent 45%), linear-gradient(135deg, ${teamPrimaryHex} 0%, ${teamSecondaryHex} 100%)`,
                }
              : undefined
          }
          className={`relative ${
            team ? '' : 'all-sports-header'
          } text-white px-6 pt-8 pb-7 text-center overflow-hidden`}
        >
          <img
            src={team?.crestUrl || '/assets/atletica/face-monocor.png'}
            alt=""
            aria-hidden="true"
            className="pointer-events-none select-none absolute inset-0 w-full h-full object-contain opacity-[0.09]"
          />

          {resolvedAthlete && (
            <button
              type="button"
              onClick={() => toggleFavoriteAthlete(resolvedAthlete.id)}
              aria-label="Favoritar atleta"
              className="absolute right-4 top-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition-colors"
            >
              <Heart
                className={`w-4 h-4 ${
                  isFavorited ? 'fill-brand-yellow text-brand-yellow' : 'text-white'
                }`}
              />
            </button>
          )}

          <div className="relative z-10 flex flex-col items-center">
            {/* Avatar Centralizado + Botão de Upload de Foto (Atleta Dono do Perfil ou Admin) */}
            <div className="relative group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/15 border-4 border-white/90 shadow-xl flex items-center justify-center text-white overflow-hidden">
                {resolvedAthlete?.avatarUrl ? (
                  <img
                    src={resolvedAthlete.avatarUrl}
                    alt={resolvedAthlete.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-11 h-11 text-white/90" />
                )}
              </div>

              {resolvedAthlete && hasEditPermission && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Atualizar foto oficial do perfil"
                    className="absolute -right-1 bottom-3 w-8 h-8 rounded-full bg-brand-yellow text-[#0B218A] border-2 border-white shadow-md flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Dupla Insígnia Abaixo do Avatar (Escudo Período + IX) */}
              <div className="-mt-3 inline-flex items-center justify-center gap-1 bg-[#0B218A] px-2.5 py-0.5 rounded-full border border-white/25 shadow">
                <img
                  src={team?.crestUrl || '/assets/atletica/logo.png'}
                  alt=""
                  className="w-5 h-5 rounded-full object-contain bg-white p-0.5"
                />
                <span className="w-5 h-5 rounded-full bg-brand-yellow text-[#0B218A] text-[9px] font-display font-black flex items-center justify-center">
                  {resolvedAthlete?.jerseyNumber || 'IX'}
                </span>
              </div>
            </div>

            <h2 className="mt-2.5 text-xl sm:text-3xl font-display font-extrabold text-white">
              {resolvedAthlete?.name || 'Ficha Oficial de Atleta'}
            </h2>

            <div className="mt-1 inline-flex flex-wrap items-center justify-center gap-1.5 text-xs font-semibold text-white/85">
              <Shirt className="w-3.5 h-3.5 text-brand-yellow" />
              <span>{posInfo.primary}</span>
              <span>•</span>
              {team ? (
                <button
                  type="button"
                  onClick={() => navigate(`/equipe/${team.id}`)}
                  className="underline decoration-brand-yellow/70 hover:text-brand-yellow transition-colors font-bold"
                >
                  {team.name}
                </button>
              ) : (
                <span>Período • Medicina UEMA</span>
              )}
            </div>

            {/* Ações rápidas de foto / vínculo do atleta */}
            {resolvedAthlete && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {hasEditPermission ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-[11px] font-display font-bold text-brand-yellow transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>
                      {resolvedAthlete.avatarUrl
                        ? 'Trocar Foto de Perfil'
                        : 'Enviar Foto de Perfil'}
                    </span>
                  </button>
                ) : (
                  !currentUser && (
                    <button
                      type="button"
                      onClick={handleGoToAthleteLogin}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] font-semibold text-white/85 transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-brand-yellow" />
                      <span>Sou este atleta (Fazer Login)</span>
                    </button>
                  )
                )}

                {currentUser?.linkedAthleteId === resolvedAthlete.id && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-300/30 text-[10px] font-bold text-emerald-200">
                    Meu Perfil Vinculado
                  </span>
                )}
              </div>
            )}

            {uploadFeedback && (
              <p className="mt-2 text-xs font-bold text-brand-yellow bg-black/25 px-3 py-1 rounded-full">
                {uploadFeedback}
              </p>
            )}
          </div>
        </div>

        {/* Barra de Abas Branca com Sublinhado Amarelo (#FACC15) */}
        <div className="grid grid-cols-4 border-b border-slate-100 px-2 bg-white">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative py-3.5 text-xs sm:text-sm font-display transition-colors ${
                  active
                    ? 'font-extrabold text-slate-900'
                    : 'font-semibold text-slate-400 hover:text-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                {active && (
                  <span className="absolute bottom-0 left-4 right-4 h-1 rounded-t-full bg-[#FACC15]" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Seletor Rápido de Modalidade do Atleta */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {OFFICIAL_MODALITIES.map((mod) => {
          const active = selectedModality === mod.id;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => setSelectedModality(mod.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-display font-bold whitespace-nowrap transition-all shrink-0 ${
                active
                  ? 'bg-[#0B218A] text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:border-[#0B218A]/40'
              }`}
            >
              <SportIcon
                iconKey={mod.iconKey}
                className={`w-3.5 h-3.5 ${
                  active ? 'text-brand-yellow' : 'text-[#0B218A]'
                }`}
              />
              <span>{mod.name}</span>
            </button>
          );
        })}
      </div>

      {/* ABA 1: PERFIL GERAL + ESTATÍSTICAS BÁSICAS RESUMIDAS + POSIÇÃO EM QUADRA */}
      {activeTab === 'profile' && (
        <>
          {/* 3 Mini-Cards Brancos Lado a Lado (Equipe/Período | Modalidades | Camisa) */}
          <section className="grid grid-cols-3 gap-3 sm:gap-4">
            <div
              onClick={() => team && navigate(`/equipe/${team.id}`)}
              className={`all-sports-card p-4 text-left space-y-2 ${
                team ? 'cursor-pointer hover:border-[#1D63FF]' : ''
              }`}
            >
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F3F4F9] text-[11px] font-bold text-slate-600">
                <Award className="w-3.5 h-3.5 text-[#1D63FF]" />
                <span>Equipe</span>
              </div>
              <div>
                <p className="text-sm sm:text-base font-display font-extrabold text-slate-900 truncate">
                  {team?.name || 'A definir'}
                </p>
                <p className="text-[11px] text-[#1D63FF] font-semibold">
                  {team ? 'Ver página da equipe ›' : 'Medicina UEMA'}
                </p>
              </div>
            </div>

            <div className="all-sports-card p-4 text-left space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F3F4F9] text-[11px] font-bold text-slate-600">
                <Trophy className="w-3.5 h-3.5 text-[#1D63FF]" />
                <span>Modalidades</span>
              </div>
              <div>
                <p className="text-sm sm:text-base font-display font-extrabold text-slate-900">
                  {resolvedAthlete?.modalityIds.length || 0} inscritas
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {activeModObj.name}
                </p>
              </div>
            </div>

            <div className="all-sports-card p-4 text-left space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F3F4F9] text-[11px] font-bold text-slate-600">
                <Ruler className="w-3.5 h-3.5 text-[#1D63FF]" />
                <span>Camisa</span>
              </div>
              <div>
                <p className="text-sm sm:text-base font-display font-extrabold text-slate-900">
                  #{resolvedAthlete?.jerseyNumber || '—'}
                </p>
                <p className="text-[11px] text-slate-400">{activeModObj.name}</p>
              </div>
            </div>
          </section>

          {/* Resumo Rápido de Estatísticas Básicas da Modalidade Selecionada */}
          {resolvedAthlete && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-display font-extrabold uppercase tracking-wider text-slate-500">
                  Desempenho Básico em {activeModObj.name}
                </h3>
                {stats && stats.liveMatchesPlayed > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                    <Clock className="w-3 h-3 animate-pulse" />
                    <span>Inclui partida em andamento</span>
                  </span>
                )}
              </div>
              {renderBasicStatsGrid()}
            </section>
          )}

          {/* Card "Position / Posição em Quadra" com Mini-Campo Verde à Direita (Imagem 1 Esquerda) */}
          <section className="all-sports-card p-5 sm:p-6 space-y-4">
            <div className="all-sports-section-pill">
              Posição &amp; Função em Quadra ({activeModObj.name})
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1.15fr_0.85fr] items-center gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-display font-extrabold text-slate-800">
                    Função Principal
                  </h4>
                  <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
                    {posInfo.primary}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-display font-extrabold text-slate-800">
                    Outras Funções na Equipe
                  </h4>
                  <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5 leading-relaxed">
                    {posInfo.others}
                  </p>
                </div>
              </div>

              {/* Mini-Campo / Quadra Verde Estilizada com Siglas das Posições */}
              <div className="relative h-44 w-40 mx-auto rounded-2xl bg-gradient-to-b from-[#bbf7d0] via-[#86efac] to-[#bbf7d0] border-2 border-emerald-300 overflow-hidden shadow-inner">
                <div className="pointer-events-none absolute inset-2 border border-white/80 rounded-lg" />
                <div className="pointer-events-none absolute inset-x-2 top-1/2 h-[1px] bg-white/80" />
                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-white/80" />
                <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 w-16 h-6 border-b border-x border-white/80" />
                <div className="pointer-events-none absolute left-1/2 bottom-2 -translate-x-1/2 w-16 h-6 border-t border-x border-white/80" />

                {posInfo.slots.map((slot) => (
                  <span
                    key={slot.code}
                    style={{ top: slot.top, left: slot.left }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full text-[10px] font-display font-extrabold shadow-sm ${
                      slot.active
                        ? 'bg-[#1D63FF] text-white ring-2 ring-white'
                        : 'bg-white/85 text-slate-600'
                    }`}
                  >
                    {slot.code}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ABA 2: PARTIDAS DO ATLETA (Histórico de Jogos Relacionados) */}
      {activeTab === 'matches' && (
        <section className="all-sports-card p-5 sm:p-6 space-y-4">
          <div className="all-sports-section-pill">
            Partidas do Atleta • {activeModObj.name}
          </div>

          {stats && stats.matchLogs.length > 0 ? (
            <div className="space-y-3">
              {stats.matchLogs.map((log) => (
                <div
                  key={log.matchId}
                  onClick={() => navigate(`/placar/${log.matchId}`)}
                  className="cursor-pointer p-4 rounded-2xl bg-[#F8FAFC] hover:bg-blue-50/50 border border-slate-200/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-display font-extrabold uppercase ${
                          log.status === 'live' || log.status === 'halftime'
                            ? 'bg-emerald-500 text-white'
                            : log.status === 'finished'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-blue-100 text-[#0B218A]'
                        }`}
                      >
                        {log.status === 'live' || log.status === 'halftime'
                          ? 'AO VIVO'
                          : log.status === 'finished'
                          ? 'FINALIZADO'
                          : 'AGENDADO'}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {log.phaseLabel} • {log.scheduledDate}
                      </span>
                    </div>

                    <p className="text-sm font-display font-extrabold text-slate-900">
                      {log.teamName}{' '}
                      <span className="text-[#1D63FF] px-1">
                        {log.teamScore ?? 0} - {log.opponentScore ?? 0}
                      </span>{' '}
                      {log.opponentName}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-display font-bold text-[#0B218A]">
                      {selectedModality === 'basquete'
                        ? `${log.pointsTotal} pts`
                        : selectedModality === 'natacao'
                        ? log.bestSwimmingTimeFormatted || 'Raia oficial'
                        : selectedModality === 'volei' ||
                          selectedModality === 'volei-de-praia'
                        ? `${log.setsParticipated} sets (coletivo)`
                        : `${log.goals} gol(s)`}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              variant="matches"
              title={`Sem partidas registradas em ${activeModObj.name}`}
              message="Assim que o atleta for relacionado em uma partida na Súmula Eletrônica, o confronto aparecerá listado aqui."
            />
          )}
        </section>
      )}

      {/* ABA 3: ESTATÍSTICAS DETALHADAS POR MODALIDADE (BÁSICAS, DIRETO DA SÚMULA) */}
      {activeTab === 'stats' && (
        <section className="space-y-4">
          <div className="all-sports-card p-5 sm:p-6 space-y-4">
            <div className="all-sports-section-pill">
              Estatísticas Oficiais na Súmula • {activeModObj.name}
            </div>

            {resolvedAthlete ? (
              <>
                {renderBasicStatsGrid()}

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    Jogos Oficializados (Súmula Fechada):{' '}
                    <strong className="text-slate-800">
                      {stats?.officialMatchesPlayed || 0}
                    </strong>
                  </span>
                  <span>
                    Jogos Ao Vivo (Parcial em Tempo Real):{' '}
                    <strong className="text-emerald-600">
                      {stats?.liveMatchesPlayed || 0}
                    </strong>
                  </span>
                </div>
              </>
            ) : (
              <EmptyState
                variant="stats"
                title="Registros Individuais na Súmula"
                message="Selecione ou cadastre um atleta para visualizar seus números."
              />
            )}
          </div>
        </section>
      )}

      {/* ABA 4: HISTÓRICO / FICHA DE INSCRIÇÃO NAS MODALIDADES */}
      {activeTab === 'career' && (
        <section className="all-sports-card p-5 sm:p-6 space-y-4">
          <div className="all-sports-section-pill">
            Vínculo Esportivo &amp; Modalidades Inscritas
          </div>

          {resolvedAthlete ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0B218A] text-brand-yellow flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-display font-extrabold text-slate-900">
                      {team?.name || 'Período Medicina UEMA'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Camisa #{resolvedAthlete.jerseyNumber || '—'} •{' '}
                      {resolvedAthlete.position || 'Atleta Inscrito'}
                    </p>
                  </div>
                </div>
                {team && (
                  <button
                    type="button"
                    onClick={() => navigate(`/equipe/${team.id}`)}
                    className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-display font-bold text-[#0B218A] hover:bg-slate-100"
                  >
                    Ver Equipe
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {OFFICIAL_MODALITIES.filter((m) =>
                  resolvedAthlete.modalityIds.includes(m.id)
                ).map((mod) => {
                  const modStats = getAthleteStats(resolvedAthlete.id, mod.id);
                  return (
                    <div
                      key={mod.id}
                      onClick={() => {
                        setSelectedModality(mod.id);
                        setActiveTab('stats');
                      }}
                      className="cursor-pointer p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-[#0B218A] transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#F3F4F9] text-[#0B218A] flex items-center justify-center">
                          <SportIcon iconKey={mod.iconKey} className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-display font-extrabold text-slate-900">
                            {mod.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {modStats?.matchesPlayed || 0} jogos registrados
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <EmptyState
              variant="stats"
              title="Histórico no Campeonato"
              message="Nenhum atleta selecionado."
            />
          )}
        </section>
      )}
    </div>
  );
};
