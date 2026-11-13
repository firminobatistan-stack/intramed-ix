import React, { useState } from 'react';
import { Share2, Download, Check, X, Sparkles } from 'lucide-react';
import { Modal } from '../ui/Modal';

export interface StoryCardPayload {
  type: 'match' | 'athlete';
  title: string;
  subtitle?: string;
  // Para Partidas
  homeTeamName?: string;
  homeTeamCrestUrl?: string | null;
  homeScore?: number | null;
  awayTeamName?: string;
  awayTeamCrestUrl?: string | null;
  awayScore?: number | null;
  statusLabel?: string;
  venueLabel?: string;
  dateTimeLabel?: string;
  // Para Atleta / Passaporte
  athleteName?: string;
  turmaName?: string;
  turmaShort?: string;
  jerseyNumber?: string | number | null;
  positionLabel?: string;
  avatarUrl?: string | null;
  badgeCode?: string;
}

const TEAM_COLORS: Record<string, { primary: string; accent: string }> = {
  sanguinaria: { primary: '#DC2626', accent: '#FCA5A5' },
  predadora: { primary: '#CA8A04', accent: '#FDE047' },
  tormenta: { primary: '#0284C7', accent: '#7DD3FC' },
  colossal: { primary: '#059669', accent: '#6EE7B7' },
  soberana: { primary: '#9F1239', accent: '#FDA4AF' },
};

function detectTeamTheme(text?: string | null): { primary: string; accent: string } {
  const clean = (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (clean.includes('sanguinaria') || clean.includes('t21')) return TEAM_COLORS.sanguinaria;
  if (clean.includes('predadora') || clean.includes('t22')) return TEAM_COLORS.predadora;
  if (clean.includes('tormenta') || clean.includes('t23')) return TEAM_COLORS.tormenta;
  if (clean.includes('colossal') || clean.includes('t24')) return TEAM_COLORS.colossal;
  if (clean.includes('soberana') || clean.includes('t25')) return TEAM_COLORS.soberana;
  return { primary: '#0B218A', accent: '#FACC15' };
}

async function loadImageSafe(src?: string | null): Promise<HTMLImageElement | null> {
  if (!src) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function generateStoryCardDataUrl(payload: StoryCardPayload): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Fundo Gradiente Oficial IntraMed IX
  const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
  bgGrad.addColorStop(0, '#061148');
  bgGrad.addColorStop(0.5, '#0B218A');
  bgGrad.addColorStop(1, '#040B2E');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1920);

  // Brilho dourado superior
  const glow = ctx.createRadialGradient(540, 260, 20, 540, 260, 520);
  glow.addColorStop(0, 'rgba(250, 204, 21, 0.22)');
  glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 900);

  // 2. Topo: Emblema A.A.A. Cangaceira & INTRAMED IX
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  drawRoundedRect(ctx, 260, 110, 560, 64, 32);
  ctx.fill();

  ctx.fillStyle = '#FACC15';
  ctx.font = '800 24px Montserrat, Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('A.A.A. CANGACEIRA • MEDICINA UEMA', 540, 150);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 76px Montserrat, Inter, sans-serif';
  ctx.fillText('INTRAMED IX', 540, 265);

  if (payload.type === 'match') {
    // CARD DE PARTIDA / PLACAR PARA STORIES
    ctx.fillStyle = '#93C5FD';
    ctx.font = '700 32px Montserrat, Inter, sans-serif';
    ctx.fillText((payload.title || 'CONFRONTO OFICIAL').toUpperCase(), 540, 330);

    // Container Branco Central
    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, 70, 420, 940, 980, 56);
    ctx.fill();

    // Pílula de Status
    const statusText = (payload.statusLabel || 'PARTIDA OFICIAL').toUpperCase();
    ctx.fillStyle = statusText.includes('VIVO') ? '#10B981' : '#0B218A';
    drawRoundedRect(ctx, 340, 475, 400, 64, 32);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 26px Montserrat, Inter, sans-serif';
    ctx.fillText(statusText, 540, 517);

    // Escudos das Equipes
    const [homeImg, awayImg] = await Promise.all([
      loadImageSafe(payload.homeTeamCrestUrl),
      loadImageSafe(payload.awayTeamCrestUrl),
    ]);

    const homeTheme = detectTeamTheme(payload.homeTeamName);
    const awayTheme = detectTeamTheme(payload.awayTeamName);

    // Escudo Mandante (Esquerda)
    ctx.save();
    drawRoundedRect(ctx, 145, 620, 240, 240, 48);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = homeTheme.primary;
    ctx.stroke();
    ctx.clip();
    if (homeImg) {
      ctx.drawImage(homeImg, 145, 620, 240, 240);
    }
    ctx.restore();

    // Escudo Visitante (Direita)
    ctx.save();
    drawRoundedRect(ctx, 695, 620, 240, 240, 48);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = awayTheme.primary;
    ctx.stroke();
    ctx.clip();
    if (awayImg) {
      ctx.drawImage(awayImg, 695, 620, 240, 240);
    }
    ctx.restore();

    // Placar ou VS no Centro
    const hasScore = payload.homeScore !== null && payload.homeScore !== undefined;
    ctx.fillStyle = '#F1F5F9';
    drawRoundedRect(ctx, 415, 680, 250, 120, 40);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.font = '900 68px Montserrat, Inter, sans-serif';
    ctx.fillText(
      hasScore ? `${payload.homeScore ?? 0} - ${payload.awayScore ?? 0}` : 'VS',
      540,
      763
    );

    // Nomes das Equipes
    ctx.fillStyle = '#0F172A';
    ctx.font = '800 38px Montserrat, Inter, sans-serif';
    ctx.fillText(payload.homeTeamName || 'Equipe A', 265, 935);
    ctx.fillText(payload.awayTeamName || 'Equipe B', 815, 935);

    // Linha divisória
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(140, 1030);
    ctx.lineTo(940, 1030);
    ctx.stroke();

    // Horário e Local
    ctx.fillStyle = '#EF4444';
    ctx.font = '800 44px Montserrat, Inter, sans-serif';
    ctx.fillText(payload.dateTimeLabel || 'INTRAMED IX', 540, 1130);

    ctx.fillStyle = '#475569';
    ctx.font = '700 32px Montserrat, Inter, sans-serif';
    ctx.fillText(payload.venueLabel || 'Quadra Oficial', 540, 1200);

    if (payload.subtitle) {
      ctx.fillStyle = '#0B218A';
      ctx.font = '800 28px Montserrat, Inter, sans-serif';
      ctx.fillText(payload.subtitle, 540, 1295);
    }
  } else {
    // CARD DE ATLETA / PASSAPORTE OFICIAL PARA STORIES
    const teamTheme = detectTeamTheme(`${payload.turmaName || ''} ${payload.turmaShort || ''}`);

    ctx.fillStyle = '#FACC15';
    ctx.font = '800 32px Montserrat, Inter, sans-serif';
    ctx.fillText('PASSAPORTE OFICIAL DE ATLETA', 540, 330);

    // Card Principal
    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, 80, 410, 920, 1040, 56);
    ctx.fill();

    // Topo colorido da turma dentro do card
    ctx.save();
    drawRoundedRect(ctx, 80, 410, 920, 320, 56);
    ctx.clip();
    ctx.fillStyle = teamTheme.primary;
    ctx.fillRect(80, 410, 920, 320);
    ctx.restore();

    // Avatar ou Escudo Central
    const avatarImg = await loadImageSafe(payload.avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(540, 710, 145, 0, Math.PI * 2);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
    ctx.clip();
    if (avatarImg) {
      ctx.drawImage(avatarImg, 395, 565, 290, 290);
    } else {
      ctx.fillStyle = '#FACC15';
      ctx.font = '900 100px Montserrat, Inter, sans-serif';
      const initials = (payload.athleteName || 'AT')
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      ctx.fillText(initials, 540, 745);
    }
    ctx.restore();

    // Nome do Atleta
    ctx.fillStyle = '#0F172A';
    ctx.font = '900 52px Montserrat, Inter, sans-serif';
    ctx.fillText((payload.athleteName || 'Atleta IntraMed').slice(0, 26), 540, 955);

    // Turma / Atlética
    ctx.fillStyle = teamTheme.primary;
    ctx.font = '800 38px Montserrat, Inter, sans-serif';
    ctx.fillText(
      `${payload.turmaName || 'Medicina UEMA'}${payload.turmaShort ? ` • ${payload.turmaShort}` : ''}`,
      540,
      1025
    );

    // Camisa / Posição
    ctx.fillStyle = '#F1F5F9';
    drawRoundedRect(ctx, 200, 1090, 680, 110, 32);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.font = '800 34px Montserrat, Inter, sans-serif';
    const numText =
      payload.jerseyNumber !== null && payload.jerseyNumber !== undefined && payload.jerseyNumber !== ''
        ? `CAMISA #${payload.jerseyNumber} • `
        : '';
    ctx.fillText(`${numText}${payload.positionLabel || 'ATLETA CONFIRMADO'}`, 540, 1158);

    // Selo Verificado
    ctx.fillStyle = '#059669';
    ctx.font = '800 28px Montserrat, Inter, sans-serif';
    ctx.fillText('✓ CREDENCIAMENTO OFICIAL HOMOLOGADO', 540, 1300);

    if (payload.badgeCode) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '600 22px monospace';
      ctx.fillText(payload.badgeCode, 540, 1365);
    }
  }

  // Rodapé do Story
  ctx.fillStyle = '#FACC15';
  ctx.font = '800 30px Montserrat, Inter, sans-serif';
  ctx.fillText('intramed-ix.vercel.app', 540, 1740);

  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '600 24px Montserrat, Inter, sans-serif';
  ctx.fillText('Compartilhe nos Stories e marque sua Atlética!', 540, 1790);

  return canvas.toDataURL('image/png');
}

interface StoryShareButtonProps {
  payload: StoryCardPayload;
  label?: string;
  compact?: boolean;
  className?: string;
}

export const StoryShareButton: React.FC<StoryShareButtonProps> = ({
  payload,
  label = 'Compartilhar',
  compact = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [imgUrl, setImgUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleOpen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(true);
    setIsGenerating(true);
    const dataUrl = await generateStoryCardDataUrl(payload);
    setImgUrl(dataUrl);
    setIsGenerating(false);
  };

  const handleShareNative = async () => {
    if (!imgUrl) return;
    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const file = new File([blob], `intramed-ix-story.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'INTRAMED IX',
          text: payload.title,
          files: [file],
        });
        return;
      }
    } catch {
      // Fallback para download direto
    }
    handleDownload();
  };

  const handleDownload = () => {
    if (!imgUrl) return;
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = `intramed-ix-${payload.type}-story.png`;
    a.click();
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        title="Gerar Card para Instagram Stories / WhatsApp"
        className={
          compact
            ? `inline-flex items-center gap-1 text-[11px] font-display font-bold text-slate-500 hover:text-[#0B218A] transition-colors ${className}`
            : `inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-display font-bold transition-all ${className}`
        }
      >
        <Share2 className="w-3.5 h-3.5" />
        <span>{label}</span>
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Card Oficial para Stories & Grupos"
      >
        <div className="flex flex-col items-center space-y-4">
          {isGenerating ? (
            <div className="h-80 w-full flex flex-col items-center justify-center text-slate-500 gap-2">
              <Sparkles className="w-6 h-6 animate-spin text-[#0B218A]" />
              <span className="text-xs font-bold">Montando card vertical (9:16)...</span>
            </div>
          ) : (
            imgUrl && (
              <div className="w-56 sm:w-64 rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-slate-950">
                <img
                  src={imgUrl}
                  alt="Preview do Card para Stories"
                  className="w-full h-auto object-contain"
                />
              </div>
            )
          )}

          <div className="flex flex-wrap items-center justify-center gap-2.5 w-full pt-1">
            <button
              type="button"
              onClick={handleShareNative}
              disabled={isGenerating}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B218A] hover:bg-blue-900 text-white text-xs font-display font-extrabold shadow-md transition-all"
            >
              <Share2 className="w-4 h-4 text-brand-yellow" />
              <span>Compartilhar nos Stories / WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-display font-bold transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Download className="w-4 h-4" />}
              <span>{copied ? 'Baixado!' : 'Baixar PNG'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
