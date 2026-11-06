import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  Trophy,
  Shield,
  Medal,
  ChevronRight,
  UserCheck,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useCompetitionStore } from '../context/CompetitionStoreContext';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TURMAS_MEDICINA } from '../data/registrationData';

export const CommunityDirectoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { publicProfiles, visibleAthletes, visibleTeams, currentUser } =
    useCompetitionStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTurma, setSelectedTurma] = useState<string>('todas');
  const [selectedTeam, setSelectedTeam] = useState<string>('todas');
  const [onlyAthletes, setOnlyAthletes] = useState(false);

  // Combina perfis públicos com a lista de atletas oficiais para máxima cobertura
  const combinedMembers = useMemo(() => {
    const list: Array<{
      id: string;
      userId: string;
      name: string;
      avatarUrl?: string | null;
      turma?: string | null;
      turmaLabel?: string | null;
      teamId?: string | null;
      teamName?: string | null;
      bio?: string | null;
      instagramHandle?: string | null;
      isAthlete: boolean;
      linkedAthleteId?: string | null;
      modalityCount?: number;
    }> = [];

    const seenIds = new Set<string>();

    // 1. Adiciona perfis salvos no servidor
    (publicProfiles || []).forEach((p) => {
      if (!p || seenIds.has(p.id) || seenIds.has(p.userId)) return;
      seenIds.add(p.id);
      seenIds.add(p.userId);

      const linkedAth = p.linkedAthleteId
        ? visibleAthletes.find((a) => a.id === p.linkedAthleteId)
        : null;

      list.push({
        id: p.id,
        userId: p.userId,
        name: p.displayName || 'Participante IntraMed',
        avatarUrl: p.avatarUrl || linkedAth?.avatarUrl || null,
        turma: p.turma || linkedAth?.turma || null,
        turmaLabel: p.turmaLabel || linkedAth?.turmaLabel || null,
        teamId: p.teamId || linkedAth?.teamId || null,
        teamName: p.teamName || null,
        bio: p.bio || linkedAth?.bio || null,
        instagramHandle: p.instagramHandle || linkedAth?.instagramHandle || null,
        isAthlete: Boolean(p.isAthlete || linkedAth),
        linkedAthleteId: p.linkedAthleteId || linkedAth?.id || null,
        modalityCount: linkedAth?.modalityIds?.length || p.favoriteModalityIds?.length || 0,
      });
    });

    // 2. Adiciona atletas da competição que ainda não possuem perfil separado
    visibleAthletes.forEach((a) => {
      if (a.id && !seenIds.has(a.id) && (!a.registrationId || !seenIds.has(a.registrationId))) {
        seenIds.add(a.id);
        const team = visibleTeams.find((t) => t.id === a.teamId);
        list.push({
          id: a.id,
          userId: a.id,
          name: a.name,
          avatarUrl: a.avatarUrl || null,
          turma: a.turma || null,
          turmaLabel: a.turmaLabel || null,
          teamId: a.teamId || null,
          teamName: team?.name || null,
          bio: a.bio || null,
          instagramHandle: a.instagramHandle || null,
          isAthlete: true,
          linkedAthleteId: a.id,
          modalityCount: a.modalityIds?.length || 0,
        });
      }
    });

    return list;
  }, [publicProfiles, visibleAthletes, visibleTeams]);

  // Filtragem
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return combinedMembers.filter((m) => {
      if (onlyAthletes && !m.isAthlete) return false;
      if (selectedTurma !== 'todas' && m.turma !== selectedTurma) return false;
      if (selectedTeam !== 'todas' && m.teamId !== selectedTeam) return false;

      if (q) {
        const matchName = m.name.toLowerCase().includes(q);
        const matchTurma = (m.turmaLabel || '').toLowerCase().includes(q);
        const matchTeam = (m.teamName || '').toLowerCase().includes(q);
        const matchBio = (m.bio || '').toLowerCase().includes(q);
        return matchName || matchTurma || matchTeam || matchBio;
      }
      return true;
    });
  }, [combinedMembers, searchQuery, selectedTurma, selectedTeam, onlyAthletes]);

  const athleteCount = combinedMembers.filter((m) => m.isAthlete).length;
  const communityCount = combinedMembers.length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Banner Principal da Comunidade */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B218A] via-[#102a9e] to-[#1E3A8A] text-white p-6 sm:p-8 shadow-xl border border-white/10">
        <img
          src="/assets/atletica/face-monocor.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute -right-6 -bottom-10 w-48 h-48 object-contain opacity-[0.08]"
        />

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-brand-yellow">
            <Users className="w-4 h-4" />
            <span>Rede Social &amp; Comunidade Esportiva • INTRAMED IX</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight">
            Galera do IntraMed Medicina UEMA
          </h1>

          <p className="text-sm text-white/80 leading-relaxed">
            Conecte-se com colegas de turma, torcedores e atletas habilitados. Descubra quem está competindo em cada modalidade e acesse os perfis individuais.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl text-xs font-bold text-white border border-white/10">
              <UserCheck className="w-4 h-4 text-brand-yellow" />
              <span>{communityCount} Integrantes Cadastrados</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl text-xs font-bold text-white border border-white/10">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span>{athleteCount} Atletas Oficiais</span>
            </div>
            {!currentUser && (
              <Button
                variant="accent"
                size="sm"
                onClick={() => navigate('/login')}
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Criar Meu Perfil
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Barra de Busca e Filtros Rápidos */}
      <div className="bg-white rounded-2xl border border-brand-surface-border p-4 sm:p-5 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, turma (ex: Turma XXI), equipe ou biografia..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B218A]/20 focus:border-[#0B218A] transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedTurma}
              onChange={(e) => setSelectedTurma(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0B218A]/20"
            >
              <option value="todas">Todas as Turmas</option>
              {TURMAS_MEDICINA.map((t) => (
                <option key={t.turma} value={t.turma}>
                  {t.fullName}
                </option>
              ))}
            </select>

            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0B218A]/20"
            >
              <option value="todas">Todas as Equipes</option>
              {visibleTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setOnlyAthletes(!onlyAthletes)}
              className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1.5 ${
                onlyAthletes
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Apenas Atletas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Membros e Perfis */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-brand-surface-border p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Nenhum integrante encontrado
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Não encontramos nenhum participante com os filtros aplicados. Tente alterar o termo de busca ou selecionar outra turma.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="group bg-white rounded-3xl border border-brand-surface-border p-5 shadow-card hover:shadow-xl hover:border-[#0B218A]/40 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={member.avatarUrl}
                      alt={member.name}
                      size="lg"
                      className="border-2 border-white shadow-sm"
                    />
                    <div className="min-w-0">
                      <h3 className="text-sm font-display font-extrabold text-slate-900 group-hover:text-[#0B218A] transition-colors truncate">
                        {member.name}
                      </h3>
                      <p className="text-xs text-slate-500 truncate">
                        {member.turmaLabel || (member.turma ? `Turma ${member.turma}` : 'Medicina UEMA')}
                      </p>
                    </div>
                  </div>

                  {member.isAthlete ? (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase">
                      <Trophy className="w-3 h-3 text-emerald-600" />
                      <span>Atleta</span>
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-semibold">
                      <span>Comunidade</span>
                    </span>
                  )}
                </div>

                {member.bio ? (
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    "{member.bio}"
                  </p>
                ) : (
                  <div className="h-6 text-[11px] text-slate-400 italic">
                    Participante do INTRAMED IX
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  {member.teamName && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Shield className="w-3 h-3 text-[#0B218A]" />
                      <span>{member.teamName}</span>
                    </span>
                  )}
                  {member.modalityCount && member.modalityCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                      <Medal className="w-3 h-3 text-amber-600" />
                      <span>{member.modalityCount} modalidades</span>
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {member.isAthlete && member.linkedAthleteId ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/atleta/${member.linkedAthleteId}`)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors"
                  >
                    <span>Ficha de Atleta</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400">Torcida &amp; Comunidade</span>
                )}

                <button
                  type="button"
                  onClick={() => navigate(`/perfil/${member.userId || member.id}`)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0B218A] hover:text-blue-900 group-hover:translate-x-0.5 transition-all"
                >
                  <span>Ver Perfil</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
