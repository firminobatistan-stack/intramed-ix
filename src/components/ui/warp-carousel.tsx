"use client";

// Warp Carousel by Louis Studios.
// 140+ more hand-made React components at https://studios.lou15.com/?ref=21st-code

import * as React from "react";

/** The small graphic under each numeral. */
export type WarpCardDetail = "slider" | "ring" | "wave" | "cross" | "none";

/** One stat card on the ring. */
export interface WarpCard {
  /** Two-line title, top left. Use "\n" for the line break. */
  title: string;
  /** The big thin numeral, for example "25". */
  value: string;
  /** Small superscript unit after the numeral, for example "%". */
  unit?: string;
  /** Small label at the bottom left. */
  footer?: string;
  /** Mesh gradient: 42 colours, a 6 by 7 grid read row by row from the top left, smoothed with a B-spline. Fewer colours are spread evenly over the grid. */
  mesh?: string[];
  /** Numeral fill, left to right. */
  numeral?: [string, string];
  /** Colour of the glow this card casts onto the top and bottom edges while it faces the viewer. */
  glow?: string;
  /** The small graphic under the numeral. */
  detail?: WarpCardDetail;
  /** Detail accent colour: slider knob glow, waveform marker, ring ticks. */
  accent?: string;
  /** Labels for the detail: slider ends, or the crosshair pill and its two badges. */
  labels?: string[];
  /** Primary portrait or team crest URL rendered inside the 3D card texture. */
  imageUrl?: string | null;
  /** Optional second team crest URL for matchup cards (Home vs Away). */
  secondaryImageUrl?: string | null;
}

export interface WarpCarouselProps {
  /** The cards on the ring, in order. The next card always enters from the right. Four is the designed count; fewer are repeated to fill the ring. */
  cards?: WarpCard[];
  /** Controlled front card index. Pair it with onIndexChange. */
  index?: number;
  /** Front card when uncontrolled. */
  defaultIndex?: number;
  /** Called when the front card should change: autoplay, drag, click, or arrow keys. */
  onIndexChange?: (index: number) => void;
  /** Called when the user clicks/taps the center front card. */
  onFrontCardClick?: (index: number, card: WarpCard) => void;
  /** Spin to the next card on a timer. */
  autoplay?: boolean;
  /** Seconds between autoplay spins. Longer intervals only stretch the slow tail of the spin; shorter ones compress the whole curve. */
  interval?: number;
  /** Cards advanced per autoplay spin. The reference turns two at a time, so the card in between whips past. */
  step?: number;
  /** Stage colour behind the ring. */
  background?: string;
  /** Overrides every card's own glow colour for the top and bottom glows. */
  glow?: string;
  /** Strength of the wide-lens flare at the left and right edges, 0 to 1. */
  warp?: number;
  /** Font stack for all card copy. */
  font?: string;
  /** Freeze the animation at this many seconds of autoplay time. For stills and tests. */
  seconds?: number;
  /** Accessible name for the carousel region. */
  ariaLabel?: string;
  /** Extra class on the outer element. */
  className?: string;
  /** Extra style on the outer element. The root fills its container (width and height 100%), falls back to a 5 / 4 aspect ratio when the container has no height, and is never shorter than 420 px. */
  style?: React.CSSProperties;
}

const DEFAULT_FONT =
  '"Montserrat", "Inter", "SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, system-ui, "Helvetica Neue", Arial, sans-serif';

export const WARP_CAROUSEL_CARDS: WarpCard[] = [
  {
    title: "Motion budget\nper page",
    value: "25",
    unit: "%",
    footer: "Tuned per screen",
    detail: "slider",
    labels: ["Calm", "Lively"],
    numeral: ["#3ad2ff", "#8cf6ff"],
    accent: "#7fe8ff",
    glow: "#12b0e8",
    mesh: ["#022852", "#031e3f", "#031934", "#021831", "#021b36", "#022246", "#022345", "#020e1e", "#01040f", "#000416", "#020b31", "#021c57", "#01172f", "#01010c", "#03001d", "#0a0f4c", "#112383", "#0b36af", "#021142", "#050b47", "#0c2e8f", "#165bd4", "#1675fd", "#167bff", "#03288e", "#0438af", "#0d66e7", "#107eec", "#30afff", "#71dcff", "#0356e8", "#0259ec", "#0945b0", "#001a49", "#3f7c9d", "#d4ffff", "#0365ff", "#0256ea", "#052a87", "#00001f", "#1f4c7b", "#9ee7ff"],
  },
  {
    title: "Loop length\nseconds",
    value: "20",
    unit: "s",
    footer: "Seamless on every loop",
    detail: "cross",
    labels: ["Preview", "in", "out"],
    numeral: ["#e2a6ff", "#fff6ff"],
    accent: "#d9a8ff",
    glow: "#62bce8",
    mesh: ["#4c2d5f", "#3b2245", "#3e285b", "#33204f", "#381844", "#572571", "#644096", "#4f3688", "#8358f6", "#8d54f3", "#5e20ac", "#6e24b7", "#482e6d", "#261b48", "#825bf6", "#d48cff", "#d07bff", "#b359ff", "#2d1837", "#140a1b", "#2c1d66", "#3a2383", "#693bca", "#8b42ef", "#411c5b", "#300753", "#3b006e", "#500f79", "#7e31c1", "#9541f3", "#44245a", "#3f0c69", "#6f15b9", "#d17cff", "#e2a3ff", "#a668ff", "#4b2f60", "#4d2172", "#6819aa", "#9b48dc", "#965dc9", "#7745c4"],
  },
  {
    title: "Frame rate\nsteady",
    value: "95",
    unit: "fps",
    footer: "Smooth on every screen",
    detail: "ring",
    numeral: ["#f4eeb6", "#c4c688"],
    accent: "#f6efc0",
    glow: "#dacbe9",
    mesh: ["#ff623e", "#f57337", "#e49435", "#fba03f", "#ef6b36", "#f14c36", "#f29a3e", "#a0a92e", "#a2ba36", "#fffe65", "#ffd852", "#f2863b", "#a5b12e", "#46821d", "#6a6127", "#b88b44", "#b6bd41", "#c4b838", "#7e9f27", "#3b5a19", "#412c10", "#0d1700", "#255b0c", "#98ad28", "#a5b232", "#3e7c1e", "#002800", "#00300f", "#5b9745", "#c1b833", "#f3983b", "#b3b431", "#6fa31f", "#9bc976", "#edd896", "#fd8c3d", "#ff5f3b", "#ff7d47", "#ffa880", "#ffc1d8", "#ff8d99", "#ff5438"],
  },
  {
    title: "Components\nin the kit",
    value: "72",
    footer: "Made by hand",
    detail: "wave",
    numeral: ["#fffdf8", "#e8603f"],
    accent: "#ff6a3d",
    glow: "#6cc0ea",
    mesh: ["#48001c", "#400119", "#41011d", "#4b021e", "#47021a", "#480019", "#7e0036", "#8c0033", "#4b0120", "#10000c", "#1f010b", "#390116", "#e84396", "#ff568c", "#dc433c", "#0e0705", "#090004", "#2f0213", "#ff9fd9", "#ff6f90", "#a53625", "#190d05", "#050002", "#2f0110", "#ff67b5", "#b11348", "#000000", "#11000c", "#3e021b", "#8a0c31", "#e31771", "#5d0027", "#3a0021", "#620030", "#640627", "#dc184a", "#c10b5f", "#920245", "#ab054f", "#910041", "#650226", "#c01240"],
  },
];

/* ------------------------------------------------------------------ */
/* Geometry: measured from the reference and fitted frame by frame.    */
/* Stage units: the stage is 720 units wide; a card is 256 by 320.     */
/* ------------------------------------------------------------------ */

const CW = 256;
const CH = 320;
const CR = 10;
const FOCAL = 734.103;
const G = {
  qA: 0.46401,
  XLA: 165.774,
  zA: 35.354,
  psiA: 1.44638,
  a1: 1.31454,
  a2: 1.10948,
  qB: 0.74999,
  XB: 204.525,
  ZB: 355.405,
  bB: 0.69311,
  bE: 0.04614,
  vC: 203.134,
  aC: 229.26,
  kB: 0.01087,
  bP: 0.99129,
  qPR: 1.01828,
  bPL: 1.0092,
  qPL: 1.07139,
};

type Pose = [number, number, number];

/** Pose of a card at ring offset q (0 front, +1 right, -1 left): centre x, depth behind the front plane, yaw. */
function poseAt(q0: number): Pose {
  let q = q0;
  if (Math.abs(q) < 1) q -= G.kB * Math.sin(Math.PI * q) ** 2;
  const s = q < 0 ? -1 : 1;
  const a = Math.abs(q);
  const half = CW / 2;
  if (a <= G.qA) {
    const t = a / G.qA;
    const xl = -half + (G.XLA + half) * Math.pow(t, G.a1);
    const zl = G.zA * t ** 4;
    const psi = G.psiA * Math.pow(t, G.a2);
    return [s * (xl + half * Math.cos(psi)), zl + half * Math.sin(psi), s * psi];
  }
  const dXL = ((G.XLA + half) * G.a1) / G.qA;
  const dZL = (G.zA * 4) / G.qA;
  const dps = (G.psiA * G.a2) / G.qA;
  let Hx: number;
  let Hz: number;
  if (a <= G.qB) {
    const L = G.qB - G.qA;
    const t = (a - G.qA) / L;
    const hx = G.XLA + CW * Math.cos(G.psiA);
    const hz = G.zA + CW * Math.sin(G.psiA);
    const dhx = dXL - CW * Math.sin(G.psiA) * dps;
    const dhz = dZL + CW * Math.cos(G.psiA) * dps;
    const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
    const h10 = t ** 3 - 2 * t ** 2 + t;
    const h01 = -2 * t ** 3 + 3 * t ** 2;
    const h11 = t ** 3 - t ** 2;
    Hx = h00 * hx + h10 * L * dhx * G.bB + h01 * G.XB + h11 * L * G.vC * G.bE;
    Hz = h00 * hz + h10 * L * dhz * G.bB + h01 * G.ZB;
  } else {
    const d = a - G.qB;
    Hx = G.XB + G.vC * d + G.aC * d * d;
    Hz = G.ZB;
  }
  const qP = s < 0 ? G.qPL : G.qPR;
  const bP = s < 0 ? G.bPL : G.bP;
  const LP = qP - G.qA;
  const tp = Math.min(1, (a - G.qA) / LP);
  const psi =
    (2 * tp ** 3 - 3 * tp ** 2 + 1) * G.psiA +
    (tp ** 3 - 2 * tp ** 2 + tp) * LP * dps * bP +
    (-2 * tp ** 3 + 3 * tp ** 2) * Math.PI;
  return [s * (Hx - half * Math.cos(psi)), Hz - half * Math.sin(psi), s * psi];
}

/* Spin curve: ring progress over one autoplay step, in reference frames (30 fps). */
const TK = [0, 3, 6, 8, 10, 11, 12, 13, 14, 16, 18, 21, 25, 30, 36, 45, 55, 70, 88, 110];
const TB = [0, 0.02175, 0.12069, 0.22549, 0.35493, 0.43254, 0.51436, 0.5952, 0.6751, 0.83199, 0.9709, 1.12669, 1.27958, 1.40975, 1.53561, 1.68385, 1.79183, 1.89191, 1.95233, 2];
const DRIFT = 0.06511;
const REST_PHASE = 81.828;
const STEP_FRAMES = 110;

const SLOPES = (() => {
  const n = TK.length;
  const h = TK.slice(1).map((x, i) => x - TK[i]);
  const dl = h.map((hi, i) => (TB[i + 1] - TB[i]) / hi);
  const d = new Array(n).fill(0);
  for (let k = 1; k < n - 1; k++) {
    if (dl[k - 1] * dl[k] <= 0) d[k] = 0;
    else {
      const w1 = 2 * h[k] + h[k - 1];
      const w2 = h[k] + 2 * h[k - 1];
      d[k] = (w1 + w2) / (w1 / dl[k - 1] + w2 / dl[k]);
    }
  }
  const v = (dl[0] + dl[n - 2]) / 2;
  d[0] = v;
  d[n - 1] = v;
  return d;
})();

function spin(frames: number): number {
  if (frames <= 0) return 0;
  if (frames >= STEP_FRAMES) return 1;
  let i = 0;
  while (i < TK.length - 2 && frames > TK[i + 1]) i++;
  const h = TK[i + 1] - TK[i];
  const t = (frames - TK[i]) / h;
  const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
  const h10 = t ** 3 - 2 * t ** 2 + t;
  const h01 = -2 * t ** 3 + 3 * t ** 2;
  const h11 = t ** 3 - t ** 2;
  return (h00 * TB[i] + h10 * h * SLOPES[i] + h01 * TB[i + 1] + h11 * h * SLOPES[i + 1]) / 2;
}

function spinN(frames: number, n: number): number {
  if (n <= STEP_FRAMES + 0.5) return spin((frames * STEP_FRAMES) / Math.max(1, n));
  const knee = 80;
  if (frames <= knee) return spin(frames);
  return spin(knee + ((frames - knee) * (STEP_FRAMES - knee)) / (n - knee));
}

const LEAD = (STEP_FRAMES - REST_PHASE) / 30;

function autoplayProgress(t: number, start: number, step: number, interval: number): number {
  if (t < LEAD) return start - step + DRIFT + step * spin(REST_PHASE + t * 30);
  const k = Math.floor((t - LEAD) / interval);
  const tau = (t - LEAD - k * interval) * 30;
  return start + k * step + DRIFT + step * spinN(tau, interval * 30);
}

/* ------------------------------------------------------------------ */
/* Colour helpers                                                      */
/* ------------------------------------------------------------------ */

function parseColor(c: string, fallback: [number, number, number] = [0, 0, 0]): [number, number, number] {
  const s = (c || "").trim();
  let m = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = h.split("").map((x) => x + x).join("");
    const n = parseInt(h.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  m = /^rgba?\(([^)]+)\)$/i.exec(s);
  if (m) {
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map((x) => parseFloat(x));
    return [p[0] || 0, p[1] || 0, p[2] || 0];
  }
  if (typeof document !== "undefined" && s) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 1;
    const cx = cv.getContext("2d");
    if (cx) {
      cx.fillStyle = s;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2]];
    }
  }
  return fallback;
}

function rgba(c: [number, number, number], a: number) {
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
}

/* ------------------------------------------------------------------ */
/* Card painter                                                        */
/* ------------------------------------------------------------------ */

function bspline(t: number, out: number[]) {
  const it = 1 - t;
  out[0] = (it * it * it) / 6;
  out[1] = (3 * t * t * t - 6 * t * t + 4) / 6;
  out[2] = (-3 * t * t * t + 3 * t * t + 3 * t + 1) / 6;
  out[3] = (t * t * t) / 6;
}

function meshGrid(mesh: string[] | undefined): [number, number, number][] {
  const fallback = ["#0B218A", "#0F2A56", "#1B4284", "#091834"];
  const src = mesh && mesh.length ? mesh : fallback;
  const cols = src.map((c) => parseColor(c));
  const out: [number, number, number][] = [];
  for (let j = 0; j < 7; j++)
    for (let i = 0; i < 6; i++) {
      if (cols.length === 42) out.push(cols[j * 6 + i]);
      else {
        const k = Math.min(cols.length - 1, Math.round(((j * 6 + i) / 41) * (cols.length - 1)));
        out.push(cols[k]);
      }
    }
  return out;
}

function paintMesh(ctx: CanvasRenderingContext2D, w: number, h: number, mesh: string[] | undefined) {
  const grid = meshGrid(mesh);
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const wx = new Float32Array(w * 4);
  const ix = new Int32Array(w * 4);
  const tmp = [0, 0, 0, 0];
  for (let x = 0; x < w; x++) {
    const u = ((x + 0.5) / w) * 5;
    const i = Math.floor(u);
    bspline(u - i, tmp);
    for (let k = 0; k < 4; k++) {
      wx[x * 4 + k] = tmp[k];
      ix[x * 4 + k] = Math.min(5, Math.max(0, i - 1 + k));
    }
  }
  const row = new Float32Array(6 * 3);
  let seed = 1234567;
  for (let y = 0; y < h; y++) {
    const v = ((y + 0.5) / h) * 6;
    const j = Math.floor(v);
    bspline(v - j, tmp);
    row.fill(0);
    for (let k = 0; k < 4; k++) {
      const jj = Math.min(6, Math.max(0, j - 1 + k));
      const wy = tmp[k];
      for (let i = 0; i < 6; i++) {
        const c = grid[jj * 6 + i];
        row[i * 3] += c[0] * wy;
        row[i * 3 + 1] += c[1] * wy;
        row[i * 3 + 2] += c[2] * wy;
      }
    }
    for (let x = 0; x < w; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let k = 0; k < 4; k++) {
        const wgt = wx[x * 4 + k];
        const i3 = ix[x * 4 + k] * 3;
        r += row[i3] * wgt;
        g += row[i3 + 1] * wgt;
        b += row[i3 + 2] * wgt;
      }
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const n = (seed / 0x7fffffff - 0.5) * 1.6;
      const o = (y * w + x) * 4;
      d[o] = r + n;
      d[o + 1] = g + n;
      d[o + 2] = b + n;
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function fontStr(weight: number, px: number, family: string) {
  return `${weight} ${px}px ${family}`;
}

/** Font size whose digit cap height equals `cap` pixels. */
function sizeForCap(ctx: CanvasRenderingContext2D, weight: number, family: string, cap: number, sample = "0") {
  ctx.font = fontStr(weight, 100, family);
  const m = ctx.measureText(sample);
  const asc = m.actualBoundingBoxAscent || 71;
  return (cap / asc) * 100;
}

function wrapCanvasLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];
  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length === maxLines - 1) {
        for (let j = i + 1; j < words.length; j++) {
          current += ` ${words[j]}`;
        }
        break;
      }
    }
  }
  lines.push(current);
  return lines.slice(0, maxLines);
}

function drawCircularImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  radius: number,
  ringColor: string,
  bgColor = "rgba(9, 24, 52, 0.85)"
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.clip();

  const iw = img.naturalWidth || img.width || 1;
  const ih = img.naturalHeight || img.height || 1;
  const scale = Math.max((radius * 2) / iw, (radius * 2) / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();

  // Anel externo colorido + anel interno branco de definição óptica
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 1.5, 0, Math.PI * 2);
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

function paintCard(
  cv: HTMLCanvasElement,
  card: WarpCard,
  family: string,
  imgMap?: Map<string, HTMLImageElement>
) {
  const w = cv.width;
  const h = cv.height;
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  const k = w / CW;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  paintMesh(ctx, w, h, card.mesh);
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.textBaseline = "alphabetic";

  const white: [number, number, number] = [255, 255, 255];
  const accent = parseColor(card.accent || "#FACC15");
  const n0 = parseColor((card.numeral && card.numeral[0]) || "#FFFFFF");
  const n1 = parseColor((card.numeral && card.numeral[1]) || "#FACC15");

  // 1. Vinheta escura suave no topo e na base para garantir leitura perfeita em qualquer cor de card
  const topVig = ctx.createLinearGradient(0, 0, 0, 115);
  topVig.addColorStop(0, "rgba(4, 9, 26, 0.56)");
  topVig.addColorStop(1, "rgba(4, 9, 26, 0)");
  ctx.fillStyle = topVig;
  ctx.fillRect(0, 0, CW, 115);

  const botVig = ctx.createLinearGradient(0, 200, 0, CH);
  botVig.addColorStop(0, "rgba(4, 9, 26, 0)");
  botVig.addColorStop(1, "rgba(4, 9, 26, 0.78)");
  ctx.fillStyle = botVig;
  ctx.fillRect(0, 200, CW, CH - 200);

  // Moldura interna sutil para acabamento óptico
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(1, 1, CW - 2, CH - 2, CR);
  ctx.stroke();

  const rawLines = (card.title || "").split("\n").map((s) => s.trim()).filter(Boolean);
  const categoryTag = (rawLines[0] || "INTRAMED IX").toUpperCase();
  const mainHeadline = rawLines.slice(1).join(" ") || categoryTag;

  const primaryImg = card.imageUrl && imgMap ? imgMap.get(card.imageUrl) : undefined;
  const secondaryImg =
    card.secondaryImageUrl && imgMap ? imgMap.get(card.secondaryImageUrl) : undefined;

  // Pílula Superior de Categoria
  ctx.font = fontStr(800, 9.5, family);
  const tagTextW = Math.min(196, ctx.measureText(categoryTag).width);
  const pillW = tagTextW + 18;
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  ctx.beginPath();
  ctx.roundRect(18, 18, pillW, 20, 10);
  ctx.fill();
  ctx.strokeStyle = rgba(accent, 0.6);
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = rgba(accent, 1);
  ctx.beginPath();
  ctx.arc(27, 28, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(categoryTag, 34, 31.5, 184);

  // =========================================================================
  // MODO A: Card de Retrato de Atleta (Presença Confirmada / Autor de Gol / Artilheiro)
  // =========================================================================
  if (primaryImg && !secondaryImg) {
    const cx = CW / 2;
    const cy = 114;
    const radius = 48;

    // Halo luminoso atrás da foto do atleta
    const halo = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius * 1.55);
    halo.addColorStop(0, rgba(accent, 0.42));
    halo.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.55, 0, Math.PI * 2);
    ctx.fill();

    drawCircularImage(ctx, primaryImg, cx, cy, radius, rgba(accent, 0.95));

    // Pílula de destaque sobreposta na base da foto (ex: "2 GOLS", "CAMISA #11", "CONFIRMADO")
    const badgeText = [card.value, card.unit].filter(Boolean).join(" ").trim().toUpperCase();
    if (badgeText) {
      ctx.font = fontStr(800, 10, family);
      const bw = Math.min(180, ctx.measureText(badgeText).width);
      const bPillW = bw + 20;
      const bPillX = (CW - bPillW) / 2;
      const bPillY = cy + radius - 10;

      ctx.fillStyle = rgba(accent, 1);
      ctx.beginPath();
      ctx.roundRect(bPillX, bPillY, bPillW, 21, 10.5);
      ctx.fill();
      ctx.strokeStyle = "#091834";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#091834";
      ctx.textAlign = "center";
      ctx.fillText(badgeText, CW / 2, bPillY + 14, 176);
      ctx.textAlign = "left";
    }

    // Nome do Atleta grande e centralizado abaixo da foto
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.shadowBlur = 6 * k;
    ctx.font = fontStr(800, 16.5, family);
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    const nameLines = wrapCanvasLines(ctx, mainHeadline, CW - 28, 2);
    nameLines.forEach((ln, idx) => {
      ctx.fillText(ln, CW / 2, 204 + idx * 19, CW - 28);
    });
    ctx.restore();
    ctx.textAlign = "left";
  } else if (primaryImg && secondaryImg) {
    // =========================================================================
    // MODO B: Confronto com os 2 Escudos das Equipes + Horário / Placar no Centro
    // =========================================================================
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 6 * k;
    ctx.font = fontStr(800, 15.5, family);
    ctx.fillStyle = "#FFFFFF";
    const wrappedTitle = wrapCanvasLines(ctx, mainHeadline, CW - 36, 2);
    wrappedTitle.forEach((ln, idx) => {
      ctx.fillText(ln, 18, 58 + idx * 19, CW - 36);
    });
    ctx.restore();

    // Escudo Mandante (Esquerda) e Visitante (Direita)
    const crestY = 142;
    const crestR = 26;
    drawCircularImage(ctx, primaryImg, 48, crestY, crestR, rgba(accent, 0.9));
    drawCircularImage(ctx, secondaryImg, CW - 48, crestY, crestR, rgba(accent, 0.9));

    // Horário ou Placar no Centro entre os escudos
    const value = card.value || "";
    let big = sizeForCap(ctx, 800, family, value.length >= 5 ? 24 : 32);
    ctx.font = fontStr(800, big, family);
    let vw = ctx.measureText(value).width;
    if (vw > 96) {
      big *= 96 / vw;
      ctx.font = fontStr(800, big, family);
      vw = ctx.measureText(value).width;
    }

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.shadowBlur = 8 * k;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.fillText(value, CW / 2, crestY + big * 0.34);
    ctx.restore();
    ctx.textAlign = "left";

    if (card.unit) {
      const unitText = card.unit.toUpperCase();
      ctx.font = fontStr(800, 10.5, family);
      const uw = ctx.measureText(unitText).width;
      const uPillW = uw + 22;
      const uPillX = (CW - uPillW) / 2;
      const uPillY = 196;

      ctx.fillStyle = "rgba(9, 24, 52, 0.62)";
      ctx.beginPath();
      ctx.roundRect(uPillX, uPillY, uPillW, 22, 11);
      ctx.fill();
      ctx.strokeStyle = rgba(accent, 0.7);
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = rgba(n1, 1);
      ctx.textAlign = "center";
      ctx.fillText(unitText, CW / 2, uPillY + 15);
      ctx.textAlign = "left";
    }
  } else {
    // =========================================================================
    // MODO C: Card Estatístico ou Confronto Padrão de Alto Contraste
    // =========================================================================
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 6 * k;
    ctx.font = fontStr(800, 16.5, family);
    ctx.fillStyle = "#FFFFFF";
    const wrappedTitle = wrapCanvasLines(ctx, mainHeadline, CW - 36, 2);
    wrappedTitle.forEach((ln, idx) => {
      ctx.fillText(ln, 18, 60 + idx * 20, CW - 36);
    });
    ctx.restore();

    const value = card.value || "";
    let big = sizeForCap(ctx, 800, family, value.length >= 5 ? 42 : 52);
    ctx.font = fontStr(800, big, family);
    let vw = ctx.measureText(value).width;
    if (vw > CW - 40) {
      big *= (CW - 40) / vw;
      ctx.font = fontStr(800, big, family);
      vw = ctx.measureText(value).width;
    }

    const xVal = (CW - vw) / 2;
    const yVal = card.unit ? 178 : 188;
    const grad = ctx.createLinearGradient(xVal, yVal - 50, xVal + Math.max(1, vw), yVal);
    grad.addColorStop(0, rgba(n0, 1));
    grad.addColorStop(1, rgba(n1, 1));

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 12 * k;
    ctx.shadowOffsetY = 2 * k;
    ctx.font = fontStr(800, big, family);
    ctx.fillStyle = grad;
    ctx.fillText(value, xVal, yVal);
    ctx.restore();

    if (card.unit) {
      const unitText = card.unit.toUpperCase();
      ctx.font = fontStr(800, 11, family);
      const uw = ctx.measureText(unitText).width;
      const uPillW = uw + 22;
      const uPillX = (CW - uPillW) / 2;
      const uPillY = 194;

      ctx.fillStyle = "rgba(9, 24, 52, 0.58)";
      ctx.beginPath();
      ctx.roundRect(uPillX, uPillY, uPillW, 22, 11);
      ctx.fill();
      ctx.strokeStyle = rgba(accent, 0.65);
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = rgba(n0, 1);
      ctx.textAlign = "center";
      ctx.fillText(unitText, CW / 2, uPillY + 15);
      ctx.textAlign = "left";
    }
  }

  // Linha luminosa separadora acima do rodapé
  const lineGrad = ctx.createLinearGradient(18, 0, CW - 18, 0);
  lineGrad.addColorStop(0, rgba(accent, 0.85));
  lineGrad.addColorStop(0.6, rgba(white, 0.35));
  lineGrad.addColorStop(1, "rgba(255, 255, 255, 0.05)");
  ctx.fillStyle = lineGrad;
  ctx.fillRect(18, 256, CW - 36, 2);

  // Rodapé claro e legível na base do card
  if (card.footer) {
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.shadowBlur = 4 * k;
    ctx.font = fontStr(700, 11.5, family);
    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    const footerLines = wrapCanvasLines(ctx, card.footer, CW - 36, 2);
    if (footerLines.length === 1) {
      ctx.fillText(footerLines[0], 18, 284, CW - 36);
    } else {
      footerLines.forEach((fl, idx) => {
        ctx.fillText(fl, 18, 276 + idx * 15, CW - 36);
      });
    }
    ctx.restore();
  }
}

function glowShape(pose: Pose): [number, number, number] {
  const [px, pz, ps] = pose;
  const c = Math.cos(ps);
  const sn = Math.sin(ps);
  if (c <= 0.02) return [0, 1, 0];
  const A = px;
  const B = FOCAL + pz;
  const tNear = B - 0.5 * CW * Math.abs(sn);
  let m = 0;
  let mx = 0;
  let mxx = 0;
  for (let u = -360; u <= 360; u += 3) {
    const h = Math.exp(-((Math.abs(u - 9) / 138) ** 4));
    if (h < 0.003) continue;
    const k = u / 1.8 / FOCAL;
    const den = sn * k - c;
    if (Math.abs(den) < 1e-4) continue;
    const s = (A - B * k) / den;
    const t = B + s * sn;
    if (t < 4) continue;
    if ((u / 1.8 / FOCAL) * t * sn - t * c >= 0) continue;
    const dsdk = (B * c - A * sn) / (den * den);
    const soft = Math.min(Math.abs(dsdk / FOCAL) * 2.2, 40) + 0.5;
    const cov = Math.max(0, Math.min(1, (CW * 0.5 - Math.abs(s)) / soft + 0.5));
    if (cov <= 0) continue;
    const near = Math.min(1, FOCAL / t);
    const rel = Math.exp(-((Math.max(t - tNear, 0) / 36) ** 1.5));
    const w = cov * near * near * rel * c * h;
    m += w;
    mx += w * u;
    mxx += w * u * u;
  }
  if (m < 0.5) return [0, 1, 0];
  const mu = mx / m;
  const sd = Math.sqrt(Math.max(1, mxx / m - mu * mu));
  const r = Math.max(6, sd / 0.581);
  return [mu, r, (m * 3) / (1.813 * r)];
}

/* ------------------------------------------------------------------ */
/* WebGL renderer                                                      */
/* ------------------------------------------------------------------ */

const VERT = `#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
precision highp sampler2DArray;
uniform sampler2DArray uTex;
uniform vec2 uRes;
uniform float uUnit;
uniform vec4 uPose[8];
uniform vec3 uGlowCol[8];
uniform vec3 uGlowShape[8];
uniform vec3 uBg;
uniform float uWarp;
uniform float uMix;
out vec4 outColor;

const float F = ${FOCAL.toFixed(2)};
const float CW = ${CW.toFixed(1)};
const float CH = ${CH.toFixed(1)};
const float CR = ${CR.toFixed(1)};

float lensH(float a){
  if (a <= 232.0) return a;
  float k[9] = float[9](232.0, 238.0, 245.0, 253.0, 262.0, 275.0, 295.0, 325.0, 360.0);
  float d[9] = float[9](1.1759, 1.0671, 1.0156, 1.0965, 0.6487, 0.2700, -0.1991, -0.4782, -0.0318);
  float s = 232.0;
  for (int i = 0; i < 8; i++){
    if (a <= k[i]) break;
    float x = min(a, k[i+1]);
    float t = (x - k[i]) / (k[i+1] - k[i]);
    s += (x - k[i]) * mix(1.0, mix(d[i], d[i+1], t * 0.5), uWarp);
  }
  if (a > 360.0) s += (a - 360.0) * mix(1.0, d[8], uWarp);
  return s;
}
float lensS(float a){
  float t = clamp((a - 262.0) / 93.0, 0.0, 2.0);
  return 1.0 + uWarp * (0.42 * pow(t, 1.5) + 0.045 * smoothstep(320.0, 360.0, a));
}

float sdRound(vec2 p, vec2 b, float r){
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

vec4 shadeCard(vec4 pose, vec2 ps, float fx, float fy, out float depth){
  depth = 1e9;
  if (pose.w < 0.0) return vec4(0.0);
  float k = ps.x / F;
  float c = cos(pose.z), sn = sin(pose.z);
  float den = sn * k - c;
  if (abs(den) < 1e-5) return vec4(0.0);
  float A = pose.x, B = F + pose.y;
  float s = (A - B * k) / den;
  float t = B + s * sn;
  if (t < 4.0) return vec4(0.0);
  float y = t * ps.y / F;
  float dsdk = (B * c - A * sn) / (den * den);
  float fs = min(abs(dsdk / F) * fx, 48.0);
  float fyc = min(t / F * fy, 48.0);
  vec2 p = vec2(s, y);
  float d = sdRound(p, vec2(CW, CH) * 0.5, CR);
  vec2 q = abs(p) - vec2(CW, CH) * 0.5 + CR;
  vec2 n = q.x > q.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  if (q.x > 0.0 && q.y > 0.0) n = normalize(q);
  float fp = length(vec2(fs * n.x, fyc * n.y)) + 1e-4;
  if (d > fp) return vec4(0.0);
  float cov = clamp(0.5 - d / fp, 0.0, 1.0);
  if (cov <= 0.0) return vec4(0.0);
  vec2 uv = vec2(s / CW + 0.5, 0.5 - y / CH);
  vec4 tex = textureGrad(uTex, vec3(uv, pose.w), vec2(fs / CW, 0.0), vec2(0.0, fyc / CH));
  depth = t;
  return vec4(tex.rgb, 1.0) * cov;
}

vec4 scene(vec2 ps, float fx, float fy, int base){
  vec4 col[4];
  float dep[4];
  for (int i = 0; i < 4; i++) col[i] = shadeCard(uPose[base + i], ps, fx, fy, dep[i]);
  for (int i = 0; i < 3; i++)
    for (int j = 0; j < 3; j++)
      if (j < 3 - i && dep[j] > dep[j+1]) {
        float td = dep[j]; dep[j] = dep[j+1]; dep[j+1] = td;
        vec4 tc = col[j]; col[j] = col[j+1]; col[j+1] = tc;
      }
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 4; i++) acc += (1.0 - acc.a) * col[i];
  return acc;
}

vec4 glowAt(vec2 pu, float halfH, int base){
  vec4 sum = vec4(0.0);
  float gH = min(halfH, 288.0);
  float dy = min(abs((gH - 11.0) - pu.y), abs(pu.y + (gH - 12.0)));
  if (dy > 40.0) return sum;
  for (int i = 0; i < 4; i++){
    vec3 sh = uGlowShape[base + i];
    if (sh.z <= 0.0) continue;
    float E = exp(-pow(abs(pu.x - sh.x) / sh.y, 4.0));
    if (E < 0.002) continue;
    float v = exp(-pow(dy / (18.5 * (0.45 + 0.55 * sqrt(E))), 3.0));
    float w = sh.z * E * v;
    sum += vec4(uGlowCol[base + i] * w, w);
  }
  return sum;
}

vec3 stage(vec2 pu, float halfH, int base){
  return uBg;
}

vec3 render(vec2 pu, float halfH, int base){
  float au = min(abs(pu.x), 360.0);
  float px = 1.0 / uUnit;
  vec3 bg = stage(pu, halfH, base);
  if (au < 236.0 || uWarp <= 0.0) {
    vec4 c = scene(pu, px, px, base);
    return c.rgb + (1.0 - c.a) * bg;
  }
  float e = 0.064 * uWarp * smoothstep(275.0, 360.0, au);
  float S0 = lensS(au);
  float sg = pu.x < 0.0 ? -1.0 : 1.0;
  float blur = 1.0 + 30.0 * pow(smoothstep(240.0, 340.0, au), 1.5) * uWarp;
  float fyb = 1.0 + 15.0 * smoothstep(280.0, 352.0, au) * uWarp;
  float gain = 1.0 + 0.17 * smoothstep(285.0, 350.0, au) * uWarp;
  vec3 acc;
  for (int ch = 0; ch < 3; ch++){
    float off = uWarp * (ch == 0 ? -20.92 : (ch == 1 ? 0.0 : 11.91));
    float h = lensH(au) + off * smoothstep(289.8, 344.9, au);
    float h0 = lensH(au - 0.5) + off * smoothstep(289.8, 344.9, au - 0.5);
    float h1 = lensH(au + 0.5) + off * smoothstep(289.8, 344.9, au + 0.5);
    float fx = px * max(abs(h1 - h0), 0.02) * blur;
    float S = S0 * (ch == 0 ? 1.0 + e : (ch == 1 ? 1.0 : 1.0 - e));
    vec4 c = scene(vec2(sg * h, pu.y / S), fx, px / S * fyb, base);
    c.rgb = min(c.rgb * gain, vec3(c.a));
    acc[ch] = (c.rgb + (1.0 - c.a) * bg)[ch];
  }
  return acc;
}

void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 pu = (fc - 0.5 * uRes) / uUnit;
  float halfH = 0.5 * uRes.y / uUnit;
  vec3 col = render(pu, halfH, 0);
  if (uMix > 0.0) col = mix(col, render(pu, halfH, 4), uMix);
  outColor = vec4(col, 1.0);
}`;

interface GLState {
  gl: WebGL2RenderingContext;
  prog: WebGLProgram;
  tex: WebGLTexture;
  loc: Record<string, WebGLUniformLocation | null>;
  layers: number;
  texW: number;
}

function createGL(canvas: HTMLCanvasElement): GLState | null {
  const gl = canvas.getContext("webgl2", {
    antialias: false,
    alpha: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const vs = sh(gl.VERTEX_SHADER, VERT);
  const fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, "aPos");
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn(gl.getProgramInfoLog(prog));
    return null;
  }
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture()!;
  const loc: Record<string, WebGLUniformLocation | null> = {};
  for (const n of ["uTex", "uRes", "uUnit", "uPose", "uGlowCol", "uGlowShape", "uBg", "uWarp", "uMix"])
    loc[n] = gl.getUniformLocation(prog, n);
  const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
  (tex as unknown as { aniso: unknown }).aniso = aniso;
  return { gl, prog, tex, loc, layers: 0, texW: 0 };
}

function uploadCards(st: GLState, canvases: HTMLCanvasElement[]) {
  const { gl, tex } = st;
  const w = canvases[0].width;
  const h = canvases[0].height;
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
  gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, w, h, canvases.length, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  canvases.forEach((cv, i) => {
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, w, h, 1, gl.RGBA, gl.UNSIGNED_BYTE, cv);
  });
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const an = (tex as unknown as { aniso: { TEXTURE_MAX_ANISOTROPY_EXT: number } | null }).aniso;
  if (an) gl.texParameterf(gl.TEXTURE_2D_ARRAY, an.TEXTURE_MAX_ANISOTROPY_EXT, 8);
  st.layers = canvases.length;
  st.texW = w;
}

/* ------------------------------------------------------------------ */
/* Canvas 2D fallback: per-strip affine approximation, no lens blur.   */
/* ------------------------------------------------------------------ */

function drawFallback(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  unit: number,
  poses: { pose: Pose; layer: number }[],
  canvases: HTMLCanvasElement[],
  bg: string,
  glows: [number, number, number][],
) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const proj = (X: number, Zb: number, Y: number) => {
    const D = FOCAL + Zb;
    return [w / 2 + ((X * FOCAL) / D) * unit, h / 2 - ((Y * FOCAL) / D) * unit];
  };
  const items = poses
    .filter((p) => p.layer >= 0)
    .map((p) => ({ ...p, depth: p.pose[1] }))
    .sort((a, b) => b.depth - a.depth);
  const strips = 32;
  const eps = 1.5 / Math.max(unit, 0.25);
  const half = CW / 2;
  const edgeY = (sv: number) => {
    const dx = Math.abs(sv) - (half - CR);
    if (dx <= 0) return CH / 2;
    return CH / 2 - CR + Math.sqrt(Math.max(0, CR * CR - Math.min(dx, CR) ** 2));
  };
  for (const it of items) {
    const [cx, zb, psi] = it.pose;
    const cv = canvases[it.layer];
    if (!cv) continue;
    const tpu = cv.width / CW;
    const cs = Math.cos(psi);
    const sn = Math.sin(psi);
    const at = (sv: number, y: number) => proj(cx + sv * cs, zb + sv * sn, y);
    for (let i = 0; i < strips; i++) {
      const s0 = -half + (CW * i) / strips - (i > 0 ? eps : 0);
      const s1 = -half + (CW * (i + 1)) / strips + (i < strips - 1 ? eps : 0);
      if (FOCAL + zb + s0 * sn < 10 || FOCAL + zb + s1 * sn < 10) continue;
      const n = Math.abs(s0) > half - CR - 1 || Math.abs(s1) > half - CR - 1 ? 6 : 1;
      ctx.save();
      ctx.beginPath();
      for (let k = 0; k <= n; k++) {
        const sv = Math.max(-half, Math.min(half, s0 + ((s1 - s0) * k) / n));
        const pt = at(sv, edgeY(sv));
        if (k === 0) ctx.moveTo(pt[0], pt[1]);
        else ctx.lineTo(pt[0], pt[1]);
      }
      for (let k = n; k >= 0; k--) {
        const sv = Math.max(-half, Math.min(half, s0 + ((s1 - s0) * k) / n));
        const pt = at(sv, -edgeY(sv));
        ctx.lineTo(pt[0], pt[1]);
      }
      ctx.closePath();
      ctx.clip();
      const sm = (s0 + s1) / 2;
      const tl = at(s0, CH / 2);
      const tr = at(s1, CH / 2);
      const mt = at(sm, CH / 2);
      const mb = at(sm, -CH / 2);
      const sx0 = (s0 + half) * tpu;
      const sw = (s1 - s0) * tpu;
      const ov = 1.025;
      const a = (tr[0] - tl[0]) / sw;
      const b = (tr[1] - tl[1]) / sw;
      const c = ((mb[0] - mt[0]) / cv.height) * ov;
      const d = ((mb[1] - mt[1]) / cv.height) * ov;
      const smx = (sm + half) * tpu;
      const ox = (mt[0] + mb[0]) / 2 - a * smx - c * (cv.height / 2);
      const oy = (mt[1] + mb[1]) / 2 - b * smx - d * (cv.height / 2);
      ctx.setTransform(a, b, c, d, ox, oy);
      const x0 = Math.max(0, sx0 - 1);
      const x1 = Math.min(cv.width, sx0 + sw + 1);
      ctx.drawImage(cv, x0, 0, x1 - x0, cv.height, x0, 0, x1 - x0, cv.height);
      ctx.restore();
    }
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

interface Live {
  P: number;
  from: number;
  to: number;
  t0: number;
  n: number;
  v: number;
  mode: "rest" | "spin" | "drag" | "spring" | "fade";
  nextAuto: number;
  autoPending: boolean;
  fadeFrom: number;
  fadeT0: number;
  dragX: number;
  dragP: number;
  downX: number;
  moved: boolean;
  lastT: number;
  visible: boolean;
  hiddenAt: number;
}

export function WarpCarousel({
  cards = WARP_CAROUSEL_CARDS,
  index,
  defaultIndex = 0,
  onIndexChange,
  onFrontCardClick,
  autoplay = true,
  interval = 3.6667,
  step = 2,
  background = "#f0f0f0",
  glow,
  warp = 1,
  font = DEFAULT_FONT,
  seconds,
  ariaLabel = "Stat cards",
  className,
  style,
}: WarpCarouselProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();
  const list = React.useMemo(() => {
    const src = cards && cards.length ? cards : WARP_CAROUSEL_CARDS;
    const out: WarpCard[] = [];
    while (out.length < 4) out.push(...src);
    return out;
  }, [cards]);
  const realCount = cards && cards.length ? cards.length : WARP_CAROUSEL_CARDS.length;
  const N = list.length;
  const stepN = Math.max(1, Math.round(step));
  const gap = Math.max(0.5, interval);

  const controlled = index !== undefined;
  const [inner, setInner] = React.useState(defaultIndex);
  const current = controlled ? (index as number) : inner;
  const startIdx = React.useRef(current).current;

  const live = React.useRef<Live>({
    P: current,
    from: current,
    to: current,
    t0: 0,
    n: STEP_FRAMES,
    v: 0,
    mode: "rest",
    nextAuto: Infinity,
    autoPending: false,
    fadeFrom: current,
    fadeT0: 0,
    dragX: 0,
    dragP: 0,
    downX: 0,
    moved: false,
    lastT: 0,
    visible: true,
    hiddenAt: 0,
  });
  const props = React.useRef({ onIndexChange, controlled, autoplay, gap, stepN, seconds, reduced, realCount });
  props.current = { onIndexChange, controlled, autoplay, gap, stepN, seconds, reduced, realCount };
  const listRef = React.useRef<WarpCard[]>(list);
  listRef.current = list;
  const handles = React.useRef<{
    kick: () => void;
    draw: () => void;
    syncCards: (nextList: WarpCard[]) => void;
  }>({ kick: () => {}, draw: () => {}, syncCards: () => {} });

  const lastIndex = React.useRef(current);
  const request = React.useCallback((next: number) => {
    const p = props.current;
    if (p.onIndexChange) p.onIndexChange(mod(next, p.realCount));
    if (!p.controlled) setInner(next);
  }, []);

  React.useEffect(() => {
    const L = live.current;
    const prev = lastIndex.current;
    lastIndex.current = current;
    if (prev === current) return;
    let delta = current - prev;
    if (props.current.controlled && Math.abs(delta) > realCount / 2) delta -= Math.sign(delta) * realCount;
    const now = performance.now() / 1000;
    const fromAuto = L.autoPending;
    L.autoPending = false;
    if (props.current.reduced) {
      L.fadeFrom = L.P;
      L.P = Math.round(L.P) + delta;
      L.mode = "fade";
      L.fadeT0 = now;
    } else if (L.mode !== "spring") {
      const base = Math.round(L.P - DRIFT) + delta;
      L.from = L.P;
      L.to = base + DRIFT;
      L.t0 = now;
      L.n = fromAuto ? props.current.gap * 30 : STEP_FRAMES;
      L.mode = "spin";
    }
    if (!fromAuto) L.nextAuto = now + props.current.gap;
    handles.current.kick();
  }, [current, realCount]);

  React.useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    let gls: GLState | null = createGL(canvas);
    let ctx2d: CanvasRenderingContext2D | null = null;
    if (!gls) ctx2d = canvas.getContext("2d");
    let cardCanvases: HTMLCanvasElement[] = [];
    let texW = 0;
    let raf = 0;
    let disposed = false;
    const bg = parseColor(background, [240, 240, 240]);
    const glowOverride = glow ? parseColor(glow) : null;
    let glowCols = listRef.current.map((c) => (glowOverride ? glowOverride : parseColor(c.glow || "#7fd0f0")));

    const imgMap = new Map<string, HTMLImageElement>();
    const loadingUrls = new Set<string>();
    let cardKeys: string[] = [];

    const cardSignature = (c: WarpCard) => {
      const imgLoaded = c.imageUrl ? (imgMap.has(c.imageUrl) ? "1" : "0") : "";
      const secLoaded = c.secondaryImageUrl ? (imgMap.has(c.secondaryImageUrl) ? "1" : "0") : "";
      return `${c.title}|${c.value}|${c.unit || ""}|${c.footer || ""}|${c.imageUrl || ""}:${imgLoaded}|${c.secondaryImageUrl || ""}:${secLoaded}|${c.glow || ""}|${c.accent || ""}`;
    };

    const paintAll = (w: number, forceAll = false) => {
      const curList = listRef.current;
      const h = Math.round((w * CH) / CW);
      let anyChanged = forceAll || w !== texW || cardCanvases.length !== curList.length;

      const nextCanvases: HTMLCanvasElement[] = [];
      const nextKeys: string[] = [];

      for (let idx = 0; idx < curList.length; idx++) {
        const card = curList[idx];
        const sig = cardSignature(card);
        nextKeys.push(sig);
        const existingCv = cardCanvases[idx];
        if (!forceAll && w === texW && existingCv && cardKeys[idx] === sig) {
          nextCanvases.push(existingCv);
        } else {
          const cv = existingCv && existingCv.width === w && existingCv.height === h
            ? existingCv
            : document.createElement("canvas");
          cv.width = w;
          cv.height = h;
          paintCard(cv, card, font, imgMap);
          nextCanvases.push(cv);
          anyChanged = true;
        }
      }

      cardCanvases = nextCanvases;
      cardKeys = nextKeys;
      texW = w;
      if (gls && anyChanged) uploadCards(gls, cardCanvases);
    };

    const ensureImagesLoaded = (cardsToScan: WarpCard[]) => {
      const urlsToLoad = new Set<string>();
      cardsToScan.forEach((c) => {
        if (c.imageUrl && !imgMap.has(c.imageUrl) && !loadingUrls.has(c.imageUrl)) {
          urlsToLoad.add(c.imageUrl);
        }
        if (
          c.secondaryImageUrl &&
          !imgMap.has(c.secondaryImageUrl) &&
          !loadingUrls.has(c.secondaryImageUrl)
        ) {
          urlsToLoad.add(c.secondaryImageUrl);
        }
      });
      urlsToLoad.forEach((url) => {
        loadingUrls.add(url);
        const img = new Image();
        if (!url.startsWith("data:")) {
          img.crossOrigin = "anonymous";
        }
        img.onload = () => {
          loadingUrls.delete(url);
          if (disposed) return;
          imgMap.set(url, img);
          if (texW > 0) {
            paintAll(texW);
            draw(performance.now() / 1000);
          }
        };
        img.onerror = () => {
          loadingUrls.delete(url);
        };
        img.src = url;
      });
    };

    ensureImagesLoaded(listRef.current);

    let W = 0;
    let H = 0;
    let unit = 1;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(2, Math.round(r.width * dpr));
      H = Math.max(2, Math.round(r.height * dpr));
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;
      unit = Math.min(W / 720, H / 440);
      const want = Math.min(1024, Math.max(256, Math.round(CW * unit * 1.25)));
      if (want !== texW) paintAll(want);
    };

    const poseSet = (P: number) => {
      const ids = Array.from({ length: N }, (_, c) => ({ c, q: mod(c - P + N / 2, N) - N / 2 }))
        .sort((a, b) => Math.abs(a.q) - Math.abs(b.q))
        .slice(0, 4);
      return ids.map(({ c, q }) =>
        Math.abs(q) > 2.05 ? { pose: [0, 0, 0] as Pose, layer: -1 } : { pose: poseAt(q), layer: c },
      );
    };

    const L = live.current;
    const progressAt = (now: number) => {
      const p = props.current;
      if (p.seconds !== undefined) {
        if (p.reduced) {
          const k = p.seconds < LEAD ? 0 : Math.floor((p.seconds - LEAD) / p.gap) + 1;
          return { P: startIdx + k * p.stepN, Pb: 0, mix: 0 };
        }
        return { P: autoplayProgress(p.seconds, startIdx, p.stepN, p.gap), Pb: 0, mix: 0 };
      }
      if (L.mode === "spin") {
        const f = (now - L.t0) * 30;
        L.P = L.from + (L.to - L.from) * spinN(f, L.n);
        if (f >= L.n) L.mode = "rest";
      } else if (L.mode === "spring") {
        const dt = Math.min(0.034, Math.max(0, now - L.lastT));
        L.lastT = now;
        const sub = 4;
        for (let i = 0; i < sub; i++) {
          const acc = -60 * (L.P - L.to) - 13 * L.v;
          L.v += (acc * dt) / sub;
          L.P += (L.v * dt) / sub;
        }
        if (Math.abs(L.P - L.to) < 4e-4 && Math.abs(L.v) < 3e-3) {
          L.P = L.to;
          L.v = 0;
          L.mode = "rest";
        }
      } else if (L.mode === "fade") {
        const m = Math.min(1, (now - L.fadeT0) / 0.45);
        if (m >= 1) L.mode = "rest";
        return { P: L.P, Pb: L.fadeFrom, mix: 1 - m * m * (3 - 2 * m) };
      }
      return { P: L.P, Pb: 0, mix: 0 };
    };

    const poseArr = new Float32Array(32);
    const glowArr = new Float32Array(24);
    const shapeArr = new Float32Array(24);
    const fill = (set: { pose: Pose; layer: number }[], off: number) => {
      set.forEach((s, i) => {
        const j = off + i;
        poseArr[j * 4] = s.pose[0];
        poseArr[j * 4 + 1] = s.pose[1];
        poseArr[j * 4 + 2] = s.pose[2];
        poseArr[j * 4 + 3] = s.layer;
        const gc = s.layer >= 0 ? glowCols[s.layer] : [255, 255, 255];
        glowArr[j * 3] = gc[0] / 255;
        glowArr[j * 3 + 1] = gc[1] / 255;
        glowArr[j * 3 + 2] = gc[2] / 255;
        const gs = s.layer >= 0 ? glowShape(s.pose) : [0, 1, 0];
        shapeArr[j * 3] = gs[0];
        shapeArr[j * 3 + 1] = gs[1];
        shapeArr[j * 3 + 2] = gs[2];
      });
    };

    const draw = (now: number) => {
      if (disposed) return;
      const { P, Pb, mix } = progressAt(now);
      const setA = poseSet(P);
      if (gls) {
        const { gl, prog, loc } = gls;
        gl.viewport(0, 0, W, H);
        gl.useProgram(prog);
        fill(setA, 0);
        if (mix > 0) fill(poseSet(Pb), 4);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, gls.tex);
        gl.uniform1i(loc.uTex, 0);
        gl.uniform2f(loc.uRes, W, H);
        gl.uniform1f(loc.uUnit, unit);
        gl.uniform4fv(loc.uPose, poseArr);
        gl.uniform3fv(loc.uGlowCol, glowArr);
        gl.uniform3fv(loc.uGlowShape, shapeArr);
        gl.uniform3f(loc.uBg, bg[0] / 255, bg[1] / 255, bg[2] / 255);
        gl.uniform1f(loc.uWarp, Math.max(0, Math.min(1, warp)));
        gl.uniform1f(loc.uMix, mix);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      } else if (ctx2d) {
        const css = `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`;
        drawFallback(ctx2d, W, H, unit, setA, cardCanvases, css, glowCols);
        if (mix > 0) {
          ctx2d.globalAlpha = mix;
          drawFallback(ctx2d, W, H, unit, poseSet(Pb), cardCanvases, css, glowCols);
          ctx2d.globalAlpha = 1;
        }
      }
    };

    const loop = () => {
      raf = 0;
      if (disposed || !L.visible) return;
      const now = performance.now() / 1000;
      const p = props.current;
      if (p.seconds === undefined && p.autoplay && L.mode !== "drag" && L.mode !== "spring" && now >= L.nextAuto) {
        L.nextAuto = Math.max(L.nextAuto + p.gap, now + p.gap * 0.5);
        L.autoPending = true;
        request(lastIndex.current + p.stepN);
      }
      draw(now);
      const busy = p.seconds === undefined && (L.mode !== "rest" || p.autoplay);
      if (busy) raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (!raf && !disposed && L.visible) raf = requestAnimationFrame(loop);
    };
    const syncCards = (nextList: WarpCard[]) => {
      if (disposed) return;
      listRef.current = nextList;
      glowCols = nextList.map((c) => (glowOverride ? glowOverride : parseColor(c.glow || "#7fd0f0")));
      ensureImagesLoaded(nextList);
      if (texW > 0) {
        paintAll(texW);
        draw(performance.now() / 1000);
      }
    };
    handles.current = { kick, draw: () => draw(performance.now() / 1000), syncCards };

    const t0 = performance.now() / 1000;
    if (props.current.autoplay && !props.current.reduced && props.current.seconds === undefined) {
      L.from = current - props.current.stepN + DRIFT;
      L.to = current + DRIFT;
      L.t0 = t0 - REST_PHASE / 30;
      L.n = STEP_FRAMES;
      L.mode = "spin";
      L.P = L.from + (L.to - L.from) * spin(REST_PHASE);
      L.nextAuto = t0 + LEAD;
    } else {
      L.nextAuto = t0 + props.current.gap;
    }

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      draw(performance.now() / 1000);
    });
    ro.observe(wrap);

    const setVisible = (vis: boolean) => {
      const now = performance.now() / 1000;
      if (vis === L.visible) return;
      if (!vis) L.hiddenAt = now;
      else {
        const dt = now - L.hiddenAt;
        L.t0 += dt;
        L.fadeT0 += dt;
        L.nextAuto += dt;
        L.lastT = now;
      }
      L.visible = vis;
      if (vis) kick();
    };
    let inView = true;
    const io = new IntersectionObserver((ents) => {
      inView = ents.some((e) => e.isIntersecting);
      setVisible(inView && document.visibilityState === "visible");
    });
    io.observe(wrap);
    const onVis = () => setVisible(inView && document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);

    let lost = false;
    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
    };
    const onRestored = () => {
      if (!lost) return;
      lost = false;
      gls = createGL(canvas);
      texW = 0;
      resize();
      kick();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    const fonts = (document as unknown as { fonts?: FontFaceSet }).fonts;
    const repaint = () => {
      if (disposed) return;
      texW = 0;
      resize();
      draw(performance.now() / 1000);
    };
    fonts?.addEventListener?.("loadingdone", repaint);

    draw(t0);
    kick();
    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      fonts?.removeEventListener?.("loadingdone", repaint);
      if (gls) {
        gls.gl.deleteTexture(gls.tex);
        gls.gl.deleteProgram(gls.prog);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [background, glow, warp, font, N]);

  React.useEffect(() => {
    handles.current.syncCards(list);
  }, [list]);

  React.useEffect(() => {
    if (seconds !== undefined) handles.current.draw();
    else handles.current.kick();
  }, [seconds, autoplay, reduced]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (seconds !== undefined || e.button > 0) return;
    const L = live.current;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    L.mode = "drag";
    L.dragX = e.clientX;
    L.downX = e.clientX;
    L.dragP = L.P;
    L.v = 0;
    L.moved = false;
    L.lastT = performance.now() / 1000;
    handles.current.kick();
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const L = live.current;
    if (L.mode !== "drag") return;
    const r = wrapRef.current!.getBoundingClientRect();
    const unitCss = Math.min(r.width / 720, r.height / 440);
    const now = performance.now() / 1000;
    const P = L.dragP - (e.clientX - L.dragX) / (unitCss * 300);
    const dt = Math.max(1 / 240, now - L.lastT);
    L.v = 0.6 * L.v + 0.4 * ((P - L.P) / dt);
    L.P = P;
    L.lastT = now;
    if (Math.abs(e.clientX - L.downX) > 5) L.moved = true;
    handles.current.draw();
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const L = live.current;
    if (L.mode !== "drag") return;
    const now = performance.now() / 1000;
    L.nextAuto = now + gap;
    if (!L.moved) {
      L.mode = "rest";
      const r = wrapRef.current!.getBoundingClientRect();
      const u = (e.clientX - r.left - r.width / 2) / Math.min(r.width / 720, r.height / 440);
      if (u > 168) request(lastIndex.current + 1);
      else if (u < -168) request(lastIndex.current - 1);
      else if (onFrontCardClick) {
        const realIdx = mod(lastIndex.current, realCount);
        onFrontCardClick(realIdx, list[mod(lastIndex.current, N)]);
      }
      return;
    }
    if (now - L.lastT > 0.08) L.v = 0;
    const target = Math.round(L.P + L.v * 0.16);
    const from = Math.round(L.dragP - DRIFT);
    L.to = target;
    L.mode = "spring";
    L.lastT = now;
    const next = lastIndex.current + (target - from);
    if (next !== lastIndex.current) {
      lastIndex.current = next;
      const p = props.current;
      if (p.onIndexChange) p.onIndexChange(mod(next, p.realCount));
      if (!p.controlled) setInner(next);
    }
    handles.current.kick();
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    request(lastIndex.current + (e.key === "ArrowRight" ? 1 : -1));
  };

  const front = list[mod(current, N)];
  return (
    <div
      ref={wrapRef}
      className={className}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 420,
        aspectRatio: "5 / 4",
        overflow: "hidden",
        background,
        touchAction: "pan-y",
        userSelect: "none",
        cursor: "grab",
        outline: "none",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      />
      <div
        aria-live="polite"
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}
      >
        {front ? `${front.title.replace("\n", " ")}: ${front.value}${front.unit || ""}. ${front.footer || ""}` : ""}
      </div>
    </div>
  );
}

export default WarpCarousel;
