import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Shield, User } from 'lucide-react';
import { Athlete, Team } from '../../types/domain';
import { Modal } from '../ui/Modal';

interface TeamAthleteCardsSectionProps {
  team: Team;
  athletes: Athlete[];
}

function splitCollectibleName(fullName: string): { top: string; main: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { top: 'ATLETA', main: (parts[0] || 'INTRAMED').toUpperCase() };
  }
  const first = parts[0].toUpperCase();
  const last = parts[parts.length - 1].toUpperCase();
  // Se o último nome for muito curto (ex: "S.", "Jr"), pega os dois últimos
  const main =
    last.length <= 2 && parts.length >= 3
      ? `${parts[parts.length - 2]} ${last}`.toUpperCase()
      : last;
  return { top: first, main };
}

function getTurmaShortCode(teamId: string, turma?: string | null): string {
  if (turma && /^\d+$/.test(turma.trim())) return `T${turma.trim()}`;
  if (teamId === 'sanguinaria') return 'T21';
  if (teamId === 'predadora') return 'T22';
  if (teamId === 'tormenta') return 'T23';
  if (teamId === 'colossal') return 'T24';
  if (teamId === 'soberana') return 'T25';
  return 'UEMA';
}

function getCardRarityBadge(): {
  label: string;
  isSpecial: boolean;
} {
  return { label: '★ ATLETA', isSpecial: true };
}

interface CollectibleCardProps {
  athlete: Athlete;
  team: Team;
  index: number;
  enlarged?: boolean;
  onSelect?: () => void;
}

const CollectibleAthleteCard: React.FC<CollectibleCardProps> = ({
  athlete,
  team,
  index,
  enlarged = false,
  onSelect,
}) => {
  const [tilt, setTilt] = useState<{ rx: number; ry: number }>({ rx: 0, ry: 0 });
  const primaryHex = team.theme?.primaryHex || '#0B218A';
  const secondaryHex = team.theme?.secondaryHex || '#061356';
  const accentHex = team.theme?.accentHex || '#FACC15';

  const { top, main } = splitCollectibleName(athlete.name);
  const turmaCode = getTurmaShortCode(team.id, athlete.turma);
  const genderLabel =
    String(athlete.gender || '').toLowerCase().startsWith('f')
      ? 'FEM'
      : String(athlete.gender || '').toLowerCase().startsWith('m')
      ? 'MASC'
      : 'OFICIAL';
  const rarity = getCardRarityBadge();
  const hasNumber =
    athlete.jerseyNumber != null && String(athlete.jerseyNumber).trim() !== '';

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rx: Math.round(-py * (enlarged ? 10 : 7) * 10) / 10,
      ry: Math.round(px * (enlarged ? 10 : 7) * 10) / 10,
    });
  };

  const resetTilt = () => setTilt({ rx: 0, ry: 0 });

  return (
    <div
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect();
        }
      }}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      style={{
        transform: `perspective(850px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        transition:
          tilt.rx === 0 && tilt.ry === 0
            ? 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)'
            : 'transform 80ms ease-out',
        animationDelay: enlarged ? '0ms' : `${Math.min(index, 12) * 35}ms`,
        background: `linear-gradient(155deg, ${secondaryHex} 0%, ${primaryHex} 52%, #071126 100%)`,
        boxShadow: enlarged
          ? `0 26px 56px -12px rgba(6, 18, 69, 0.55), 0 0 0 1.5px ${accentHex}66`
          : `0 12px 24px -8px rgba(6, 18, 69, 0.32), 0 0 0 1px rgba(255,255,255,0.18)`,
      }}
      className={`group relative overflow-hidden rounded-[20px] aspect-[3/4.2] select-none will-change-transform ${
        onSelect
          ? 'cursor-pointer active:scale-[0.97] can-hover:hover:-translate-y-1'
          : ''
      } ${!enlarged ? 'animate-[fadeIn_380ms_cubic-bezier(0.22,1,0.36,1)_both]' : ''}`}
    >
      {/* 1. Fundo Geométrico Facetado Angular (SVG) */}
      <svg
        viewBox="0 0 300 420"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id={`facetA-${athlete.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.24" />
          </linearGradient>
          <linearGradient id={`facetB-${athlete.id}`} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={accentHex} stopOpacity="0.22" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <polygon points="0,0 195,0 85,180 0,130" fill={`url(#facetA-${athlete.id})`} />
        <polygon points="195,0 300,0 300,210 120,145" fill={`url(#facetB-${athlete.id})`} />
        <polygon points="0,235 140,175 230,315 0,360" fill="rgba(255,255,255,0.06)" />
        <polygon points="165,165 300,195 300,420 90,340" fill="rgba(0,0,0,0.22)" />
        <line
          x1="0"
          y1="130"
          x2="300"
          y2="210"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="1"
        />
        <line
          x1="195"
          y1="0"
          x2="85"
          y2="420"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
      </svg>

      {/* Brilho sutil na borda interna */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[5px] rounded-[16px] border border-white/15"
      />

      {/* 2. Topo Esquerdo: Nome Esportivo + Número Grande Vazado */}
      <div className="relative z-20 p-3 sm:p-3.5 pr-12">
        <span className="block text-[9px] sm:text-[10px] font-display font-bold uppercase tracking-[0.18em] text-white/75 truncate leading-none">
          {top}
        </span>
        <h4
          className={`mt-0.5 font-display font-black uppercase tracking-tight text-white leading-[0.95] truncate drop-shadow-sm ${
            enlarged ? 'text-2xl sm:text-3xl' : 'text-base sm:text-lg'
          }`}
        >
          {main}
        </h4>

        {hasNumber && (
          <span
            style={{
              WebkitTextStroke: enlarged ? '1.8px rgba(255,255,255,0.9)' : '1.3px rgba(255,255,255,0.88)',
              color: 'transparent',
            }}
            className={`mt-0.5 block font-display font-black leading-none tracking-tighter select-none ${
              enlarged ? 'text-5xl sm:text-6xl' : 'text-3xl sm:text-4xl'
            }`}
          >
            {athlete.jerseyNumber}
          </span>
        )}
      </div>

      {/* 3. Topo Direito: Escudo Oficial da Equipe */}
      <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-20">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/15 backdrop-blur-md border border-white/40 p-0.5 shadow-md overflow-hidden flex items-center justify-center">
          {team.crestUrl ? (
            <img
              src={team.crestUrl}
              alt={team.name}
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <Shield className="w-4 h-4 text-white" />
          )}
        </div>
      </div>

      {/* 4. Foto Principal do Atleta Integrada ao Fundo */}
      <div className="pointer-events-none absolute inset-x-2 bottom-9 sm:bottom-10 top-[24%] z-10 flex items-end justify-center overflow-hidden">
        {athlete.avatarUrl ? (
          <img
            src={athlete.avatarUrl}
            alt={athlete.name}
            loading="lazy"
            style={{
              maskImage:
                'radial-gradient(ellipse 88% 92% at 50% 48%, #000 66%, transparent 100%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 88% 92% at 50% 48%, #000 66%, transparent 100%)',
            }}
            className="w-full h-full object-cover object-center drop-shadow-[0_12px_20px_rgba(0,0,0,0.55)] transition-transform duration-300 can-hover:group-hover:scale-[1.04]"
          />
        ) : (
          <div className="w-24 h-24 sm:w-28 sm:h-28 mb-4 rounded-full bg-white/10 border border-white/25 flex items-center justify-center backdrop-blur-xs">
            <User className="w-12 h-12 text-white/65" />
          </div>
        )}
      </div>

      {/* 5. Etiqueta Vertical Lateral de Raridade / Categoria */}
      <div
        style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          backgroundColor: rarity.isSpecial ? accentHex : 'rgba(255,255,255,0.92)',
          color: '#071126',
        }}
        className="absolute right-0 bottom-14 sm:bottom-16 z-20 px-1 py-2 rounded-r-md text-[7px] sm:text-[8px] font-display font-black uppercase tracking-[0.14em] shadow-md"
      >
        {rarity.label}
      </div>

      {/* 6. Faixa Inferior com Dados Reais do Banco */}
      <div className="absolute inset-x-2 bottom-2 z-20 rounded-xl bg-black/55 backdrop-blur-md border border-white/15 px-2.5 py-1.5 grid grid-cols-3 items-center text-center gap-1">
        <div>
          <span className="block text-[7px] font-bold uppercase tracking-wider text-white/60 leading-none">
            TURMA
          </span>
          <span className="mt-0.5 block text-[10px] sm:text-xs font-display font-extrabold text-white leading-tight">
            {turmaCode}
          </span>
        </div>
        <div className="border-x border-white/15 px-1">
          <span className="block text-[7px] font-bold uppercase tracking-wider text-white/60 leading-none">
            CAT
          </span>
          <span className="mt-0.5 block text-[10px] sm:text-xs font-display font-extrabold text-white leading-tight">
            {genderLabel}
          </span>
        </div>
        <div>
          <span className="block text-[7px] font-bold uppercase tracking-wider text-white/60 leading-none">
            {hasNumber ? 'CAMISA' : 'STATUS'}
          </span>
          <span
            style={{ color: accentHex }}
            className="mt-0.5 block text-[10px] sm:text-xs font-display font-extrabold leading-tight"
          >
            {hasNumber ? `#${athlete.jerseyNumber}` : 'ATIVO'}
          </span>
        </div>
      </div>
    </div>
  );
};

export const TeamAthleteCardsSection: React.FC<TeamAthleteCardsSectionProps> = ({
  team,
  athletes,
}) => {
  const navigate = useNavigate();
  const [selectedCardAthlete, setSelectedCardAthlete] = useState<Athlete | null>(null);

  const primaryHex = team.theme?.primaryHex || '#0B218A';

  const displayedAthletes = useMemo(() => {
    // Prioriza atletas com foto primeiro para deixar a grade visualmente rica
    return [...athletes].sort((a, b) => {
      const aPhoto = a.avatarUrl ? 0 : 1;
      const bPhoto = b.avatarUrl ? 0 : 1;
      if (aPhoto !== bPhoto) return aPhoto - bPhoto;
      return a.name.localeCompare(b.name);
    });
  }, [athletes]);

  return (
    <div className="space-y-4">
      {/* Grade de Cards Colecionáveis em 2 Colunas */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
        {displayedAthletes.map((ath, idx) => (
          <CollectibleAthleteCard
            key={ath.id}
            athlete={ath}
            team={team}
            index={idx}
            onSelect={() => setSelectedCardAthlete(ath)}
          />
        ))}
      </div>

      {/* Modal de Visualização Ampliada do Card Selecionado */}
      <Modal
        isOpen={Boolean(selectedCardAthlete)}
        onClose={() => setSelectedCardAthlete(null)}
        title={selectedCardAthlete ? `Card Oficial • ${selectedCardAthlete.name}` : ''}
      >
        {selectedCardAthlete && (
          <div className="space-y-4">
            <div className="max-w-[280px] mx-auto">
              <CollectibleAthleteCard
                athlete={selectedCardAthlete}
                team={team}
                index={0}
                enlarged
              />
            </div>

            <div className="rounded-2xl bg-[#F8FAFC] border border-slate-200/80 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Nome Completo</span>
                <span className="font-display font-extrabold text-slate-900">
                  {selectedCardAthlete.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Equipe / Turma</span>
                <span className="font-display font-bold text-slate-800">
                  {team.name} • {getTurmaShortCode(team.id, selectedCardAthlete.turma)}
                </span>
              </div>
              {selectedCardAthlete.jerseyNumber != null && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Número da Camisa</span>
                  <span className="font-mono font-extrabold text-[#0B218A]">
                    #{selectedCardAthlete.jerseyNumber}
                  </span>
                </div>
              )}
              {selectedCardAthlete.instagramHandle && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Instagram</span>
                  <span className="font-semibold text-slate-700">
                    {selectedCardAthlete.instagramHandle.startsWith('@')
                      ? selectedCardAthlete.instagramHandle
                      : `@${selectedCardAthlete.instagramHandle}`}
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                const targetId = selectedCardAthlete.id;
                setSelectedCardAthlete(null);
                navigate(`/atleta/${targetId}`);
              }}
              style={{ backgroundColor: primaryHex }}
              className="w-full py-3 rounded-2xl text-white text-xs font-display font-extrabold flex items-center justify-center gap-2 shadow-md hover:opacity-95 transition-opacity"
            >
              <span>Abrir Ficha Completa do Atleta</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};
