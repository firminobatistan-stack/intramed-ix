import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let OFFICIAL_TOURNAMENT_MATCHES: Array<Record<string, unknown>> = [];
let OFFICIAL_UNIVERSAL_BRACKETS: Record<string, Record<string, unknown>> = {};

try {
  const jsonPath = path.join(__dirname, 'officialBracketsData.json');
  if (fs.existsSync(jsonPath)) {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw);
    OFFICIAL_TOURNAMENT_MATCHES = parsed.matches || [];
    OFFICIAL_UNIVERSAL_BRACKETS = parsed.brackets || {};
  }
} catch {
  // Non-blocking best-effort
}

const CLOUD_STATE_FILE = path.join(os.tmpdir(), 'intramed_ix_cloud_sync_v2.json');

export interface SyncDiagnosticLogEntry {
  id: string;
  timestampIso: string;
  category: 'webhook' | 'payment_reconcile' | 'cloud_sync' | 'firestore_mirror' | 'conflict' | 'error';
  level: 'info' | 'warning' | 'error';
  message: string;
  details?: Record<string, unknown>;
}

export type UserRole = 'usuario' | 'atleta' | 'mesario' | 'moderador' | 'moderador_master';

export const USER_ROLE_LEVELS: Record<UserRole, number> = {
  usuario: 1,
  atleta: 2,
  mesario: 3,
  moderador: 4,
  moderador_master: 5,
};

export interface AdminActionAuditLog {
  id: string;
  action: string;
  performedByEmail: string;
  performedByRole: string;
  targetEmail?: string;
  targetId?: string;
  timestampIso: string;
  details?: string;
}

export interface PublicLaunchConfig {
  publicLaunchMode: boolean;
  publicLoginEnabled: boolean;
  publicRegistrationEnabled: boolean;
  publicPaymentsEnabled: boolean;
  publicPricesVisible: boolean;
  bracketPublished: boolean;
  publicProfilesVisible: boolean;
  announcementTitle?: string;
  announcementMessage?: string;
}

export const DEFAULT_LAUNCH_CONFIG: PublicLaunchConfig = {
  publicLaunchMode: false,
  publicLoginEnabled: true,
  publicRegistrationEnabled: true,
  publicPaymentsEnabled: true,
  publicPricesVisible: true,
  bracketPublished: true,
  publicProfilesVisible: true,
  announcementTitle: 'INSCRIÇÕES E PASSAPORTE INTRAMED IX',
  announcementMessage:
    'Área de participantes do IntraMed liberada. Crie sua conta gratuita, complete seu perfil e garanta seu passaporte oficial!',
};

export const INITIAL_OFFICIAL_TEAMS: Array<{
  id: string;
  name: string;
  shortName: string;
  turmaLabel: string;
  mascotLabel: string;
  crestUrl: string;
  theme: {
    colorLabel: string;
    primaryHex: string;
    secondaryHex: string;
    accentHex: string;
    badgeBgClass: string;
    badgeTextClass: string;
    ringClass: string;
  };
}> = [
  {
    id: 'colossal',
    name: 'Colossal',
    shortName: 'T24',
    turmaLabel: 'Turma 24',
    mascotLabel: 'Crocodilo',
    crestUrl: '/assets/teams/colossal.jpg',
    theme: {
      colorLabel: 'Colossal',
      primaryHex: '#065F46',
      secondaryHex: '#022C22',
      accentHex: '#FACC15',
      badgeBgClass: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40',
      badgeTextClass: 'text-emerald-700',
      ringClass: 'ring-emerald-500',
    },
  },
  {
    id: 'soberana',
    name: 'Soberana',
    shortName: 'T25',
    turmaLabel: 'Turma 25',
    mascotLabel: 'Águia',
    crestUrl: '/assets/teams/soberana.png',
    theme: {
      colorLabel: 'Soberana',
      primaryHex: '#6B0F24',
      secondaryHex: '#3B0612',
      accentHex: '#F59E0B',
      badgeBgClass: 'bg-[#4A0817] text-amber-300 border-amber-400/40',
      badgeTextClass: 'text-[#6B0F24]',
      ringClass: 'ring-[#6B0F24]',
    },
  },
  {
    id: 'sanguinaria',
    name: 'Sanguinária',
    shortName: 'T21',
    turmaLabel: 'Turma 21',
    mascotLabel: 'Dragão',
    crestUrl: '/assets/teams/sanguinaria.jpg',
    theme: {
      colorLabel: 'Sanguinária',
      primaryHex: '#DC2626',
      secondaryHex: '#7F1D1D',
      accentHex: '#FACC15',
      badgeBgClass: 'bg-red-950/90 text-red-300 border-red-500/40',
      badgeTextClass: 'text-red-600',
      ringClass: 'ring-red-600',
    },
  },
  {
    id: 'predadora',
    name: 'Predadora',
    shortName: 'T22',
    turmaLabel: 'Turma 22',
    mascotLabel: 'Onça',
    crestUrl: '/assets/teams/predadora.jpg',
    theme: {
      colorLabel: 'Predadora',
      primaryHex: '#CA8A04',
      secondaryHex: '#18181B',
      accentHex: '#FACC15',
      badgeBgClass: 'bg-amber-400 text-zinc-950 border-amber-500',
      badgeTextClass: 'text-amber-600',
      ringClass: 'ring-amber-400',
    },
  },
  {
    id: 'tormenta',
    name: 'Tormenta',
    shortName: 'T23',
    turmaLabel: 'Turma 23',
    mascotLabel: 'Leviatã',
    crestUrl: '/assets/teams/tormenta.png',
    theme: {
      colorLabel: 'Tormenta',
      primaryHex: '#0284C7',
      secondaryHex: '#082F49',
      accentHex: '#38BDF8',
      badgeBgClass: 'bg-sky-950/90 text-sky-300 border-sky-400/40',
      badgeTextClass: 'text-sky-600',
      ringClass: 'ring-sky-400',
    },
  },
];

export interface CloudCollectionMap {
  registrations: Record<string, Record<string, unknown>>;
  athletes: Record<string, Record<string, unknown>>;
  teams: Record<string, Record<string, unknown>>;
  matches: Record<string, Record<string, unknown>>;
  match_sheets: Record<string, Record<string, unknown>>;
  match_secrets: Record<string, { pinHash: string; pinDisplay?: string; updatedAtIso: string }>;
  users?: Record<string, Record<string, unknown>>;
  profiles?: Record<string, Record<string, unknown>>;
  posts?: Record<string, Record<string, unknown>>;
  post_likes?: Record<string, Record<string, unknown>>;
  post_comments?: Record<string, Record<string, unknown>>;
  user_follows?: Record<string, Record<string, unknown>>;
  user_saves?: Record<string, Record<string, unknown>>;
  social_notifications?: Record<string, Record<string, unknown>>;
  admin_users?: Record<string, Record<string, unknown>>;
  admin_audit_logs?: AdminActionAuditLog[];
  sync_logs?: SyncDiagnosticLogEntry[];
  launch_config?: PublicLaunchConfig;
  brackets?: Record<string, Record<string, unknown>>;
  hydratedFromFirestoreAtIso?: string;
  updatedAtIso: string;
}

export const MASTER_MODERATOR_EMAIL = 'cangaceira@uema.com';

const PURGED_TEST_NAMES_LOWER = [
  'gabriel medeiros',
  'beatriz vasconcelos',
  'lucas albuquerque',
  'gvsvsadv',
  'nskaangaba',

];

export function isPurgedTestRecord(rec: Record<string, unknown> | null | undefined): boolean {
  if (!rec || typeof rec !== 'object') return false;
  const id = String(rec.id || '').trim().toLowerCase();
  const userId = String(rec.userId || '').trim().toLowerCase();
  const name = String(rec.athleteName || rec.displayName || rec.name || '').trim().toLowerCase();
  const username = String(rec.accountUsername || '').trim().toLowerCase();

  if (
    id === 'test-sync-check' ||
    id.startsWith('reg-cang-') ||
    id.startsWith('ath-reg-cang-') ||
    id.startsWith('reg-ext-t24-') ||
    id.startsWith('ath-reg-ext-t24-') ||
    id.startsWith('user-ath-') ||
    id.startsWith('ath-demo-') ||
    userId.startsWith('user-ath-')
  ) {
    return true;
  }

  for (const purged of PURGED_TEST_NAMES_LOWER) {
    if (name === purged || name.includes(purged) || username === purged) {
      return true;
    }
  }
  return false;
}

export function normalizePersonNameForMatch(val: unknown): string {
  return String(val || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function namesMatchForPrepaidAthlete(nameA: unknown, nameB: unknown): boolean {
  const normA = normalizePersonNameForMatch(nameA);
  const normB = normalizePersonNameForMatch(nameB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  const stopWords = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
  const tokensA = normA.split(' ').filter((t) => t.length > 1 && !stopWords.has(t));
  const tokensB = normB.split(' ').filter((t) => t.length > 1 && !stopWords.has(t));
  if (tokensA.length < 2 || tokensB.length < 2) return false;
  if (tokensA[0] !== tokensB[0]) return false;
  const [shorter, longer] =
    tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];
  const longerSet = new Set(longer);
  return shorter.every((t) => longerSet.has(t));
}

export interface ServerPreApprovedExternalCredit {
  key: string;
  athleteName: string;
  turma: string;
  turmaLabel: string;
  teamId: string;
  teamName: string;
  categoryName: 'Masculino' | 'Feminino';
  isSocio: boolean;
  paidAmount: number;
  externalRef: string;
}

export const PREPAID_EXTERNAL_ATHLETES_SERVER_QUEUE: ServerPreApprovedExternalCredit[] = [
  {
    key: 't24-lais-ferreira-aguiar',
    athleteName: 'Laís Ferreira Aguiar',
    turma: '24',
    turmaLabel: 'Colossal • T24',
    teamId: 'colossal',
    teamName: 'Colossal',
    categoryName: 'Feminino',
    isSocio: true,
    paidAmount: 50,
    externalRef: 'EXTERNO-T24-SOCIO-02',
  },
  {
    key: 't24-emily-da-fonseca-leal',
    athleteName: 'Emily da Fonseca Leal',
    turma: '24',
    turmaLabel: 'Colossal • T24',
    teamId: 'colossal',
    teamName: 'Colossal',
    categoryName: 'Feminino',
    isSocio: false,
    paidAmount: 60,
    externalRef: 'EXTERNO-T24-NSOCIO-06',
  },
  {
    key: 't24-david-arison-castro-e-silva',
    athleteName: 'David Arison Castro e Silva',
    turma: '24',
    turmaLabel: 'Colossal • T24',
    teamId: 'colossal',
    teamName: 'Colossal',
    categoryName: 'Masculino',
    isSocio: false,
    paidAmount: 60,
    externalRef: 'EXTERNO-T24-NSOCIO-11',
  },
];

export function findUnclaimedPreApprovedCredit(
  store: CloudCollectionMap,
  candidateName: unknown,
  candidateTurma?: unknown
): ServerPreApprovedExternalCredit | undefined {
  const cleanName = String(candidateName || '').trim();
  if (!cleanName) return undefined;
  const cleanTurma = String(candidateTurma || '').trim();

  return PREPAID_EXTERNAL_ATHLETES_SERVER_QUEUE.find((credit) => {
    if (cleanTurma && cleanTurma !== credit.turma) return false;
    const alreadyClaimed = Object.values(store.registrations || {}).some(
      (r) =>
        r &&
        !isPurgedTestRecord(r) &&
        r.paymentStatus === 'pago' &&
        Boolean(String(r.athleteEmail || '').trim()) &&
        (r.mpPaymentId === credit.externalRef ||
          (String(r.turma || '').trim() === credit.turma &&
            namesMatchForPrepaidAthlete(credit.athleteName, r.athleteName)))
    );
    if (alreadyClaimed) return false;
    return namesMatchForPrepaidAthlete(credit.athleteName, cleanName);
  });
}

declare global {
  // eslint-disable-next-line no-var
  var __INTRAMED_CLOUD_STORE_V2__: CloudCollectionMap | undefined;
}

// Configura preços oficiais centralizados no servidor (Item 5 e 38 da Auditoria)
export const OFFICIAL_SERVER_LOTS: Record<
  string,
  {
    id: string;
    name: string;
    priceMember: number;
    priceNonMember: number;
    priceGuest?: number;
    isActive: boolean;
  }
> = {
  'lote-1-cangaceira': {
    id: 'lote-1-cangaceira',
    name: '1º Lote Oficial — IntraMed IX',
    priceMember: 50.0,
    priceNonMember: 60.0,
    priceGuest: 65.0,
    isActive: true,
  },
  'lote-2-cangaceira': {
    id: 'lote-2-cangaceira',
    name: '2º Lote Final — IntraMed IX',
    priceMember: 60.0,
    priceNonMember: 75.0,
    priceGuest: 80.0,
    isActive: false,
  },
};

export const CARD_FEE_RATE = 0.05; // 5% repasse base operadora de cartão

/**
 * Calcula o valor final no cartão de crédito com repasse integral das taxas de processamento e parcelamento
 * (1x a 6x) para o comprador, garantindo que a Atlética receba o valor líquido integral.
 */
export function computeCardTotalWithInstallments(
  basePrice: number,
  installments = 1
): {
  installments: number;
  totalAmount: number;
  installmentAmount: number;
  feeAmount: number;
} {
  const safeInstallments = Math.max(1, Math.min(6, Math.floor(Number(installments) || 1)));
  // Taxa base de cartão (5%) + acréscimo de parcelamento por parcela adicional (~2% a.m.)
  const extraInstallmentRate = (safeInstallments - 1) * 0.02;
  const totalRate = CARD_FEE_RATE + extraInstallmentRate;
  const totalAmount = Math.round(basePrice * (1 + totalRate) * 100) / 100;
  const installmentAmount = Math.round((totalAmount / safeInstallments) * 100) / 100;
  const feeAmount = Math.round((totalAmount - basePrice) * 100) / 100;
  return {
    installments: safeInstallments,
    totalAmount,
    installmentAmount,
    feeAmount,
  };
}

/**
 * Faz o parse seguro do body da requisição no Vercel Serverless sem risco de exceção.
 */
export function parseSafeBody(body: unknown): Record<string, unknown> {
  if (!body) return {};
  if (typeof body === 'object' && !Buffer.isBuffer(body)) {
    return body as Record<string, unknown>;
  }
  if (Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString('utf-8')) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (!trimmed) return {};
    try {
      return JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Interpreta o JSON de uma Response sem lançar SyntaxError ("The string did not match the expected pattern" no Safari/iOS).
 */
export async function parseJsonSafe(
  response: Response
): Promise<{ data: Record<string, unknown> | null; rawText: string }> {
  const rawText = await response.text().catch(() => '');
  if (!rawText || !rawText.trim()) {
    return { data: null, rawText: '' };
  }
  try {
    const parsed = JSON.parse(rawText);
    return {
      data: parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null,
      rawText,
    };
  } catch {
    return { data: null, rawText };
  }
}

export const PRIMARY_GATEWAY_ORIGIN = 'https://intramedix.vercel.app';

export function computeAuthorizedServerPrice(
  lotId?: string,
  memberStatus?: string,
  requestedMemberDiscount?: boolean,
  isGuestAthlete?: boolean
): number {
  const lot =
    (lotId && OFFICIAL_SERVER_LOTS[lotId]) ||
    OFFICIAL_SERVER_LOTS['lote-1-cangaceira'];
  if (isGuestAthlete) {
    return lot.priceGuest ?? 65.0;
  }
  if (memberStatus === 'aprovado') {
    return lot.priceMember;
  }
  if (memberStatus === 'rejeitado' || memberStatus === 'nao_solicitado') {
    return lot.priceNonMember;
  }
  // Quando ainda pendente, retorna o valor correspondente ao pedido mas bloqueia cobrança até validação
  return requestedMemberDiscount ? lot.priceMember : lot.priceNonMember;
}

export function computeCardFee(basePrice: number): number {
  return Math.round(basePrice * CARD_FEE_RATE * 100) / 100;
}

// Segredo fixo de assinatura HMAC no servidor para manter integridade determinística entre instâncias serverless
const SERVER_SIGNING_SALT = 'intramed-ix-cangaceira-auth-salt-v2-2026';
function getServerSigningSecret(): string {
  return (process.env.INTRAMED_AUTH_SECRET || SERVER_SIGNING_SALT).trim();
}

function getMasterAdminPassword(): string {
  return (process.env.INTRAMED_ADMIN_PASSWORD || 'bicoduro').trim();
}

export function hashSecretPin(pin: string): string {
  return crypto
    .createHmac('sha256', getServerSigningSecret())
    .update(pin.trim().toLowerCase())
    .digest('hex');
}

export function hashPassword(password: string): string {
  return crypto
    .createHmac('sha256', getServerSigningSecret())
    .update(password.trim())
    .digest('hex');
}

export interface SignedOperatorTokenPayload {
  role: UserRole | 'admin';
  email?: string;
  userId?: string;
  officialName?: string;
  mustChangePassword?: boolean;
  matchId?: string;
  iat: number;
  exp: number;
}

export function createSignedOperatorToken(
  payload: Omit<SignedOperatorTokenPayload, 'iat' | 'exp'>,
  ttlSeconds = 60 * 60 * 18 // 18 horas (um dia inteiro de jogos)
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: SignedOperatorTokenPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  };
  const base64Payload = Buffer.from(JSON.stringify(fullPayload), 'utf-8').toString(
    'base64url'
  );
  const sig = crypto
    .createHmac('sha256', getServerSigningSecret())
    .update(base64Payload)
    .digest('base64url');
  return `${base64Payload}.${sig}`;
}

export function verifySignedOperatorToken(
  token?: string | null
): SignedOperatorTokenPayload | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  try {
    const [base64Payload, sig] = token.split('.');
    if (!base64Payload || !sig) return null;
    const expectedSig = crypto
      .createHmac('sha256', getServerSigningSecret())
      .update(base64Payload)
      .digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }
    const decoded = JSON.parse(
      Buffer.from(base64Payload, 'base64url').toString('utf-8')
    ) as SignedOperatorTokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!decoded.exp || decoded.exp < now) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function extractBearerOrHeaderToken(headers: Record<string, unknown>): string | null {
  const authHeader = String(headers['authorization'] || headers['Authorization'] || '');
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const customToken = String(headers['x-intramed-token'] || '');
  if (customToken) return customToken.trim();
  return null;
}

export function verifyMasterAdminPassword(input: string): boolean {
  const cleanInput = input.trim().toLowerCase();
  const master = getMasterAdminPassword().toLowerCase();
  const a = Buffer.from(cleanInput);
  const b = Buffer.from(master);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export const FIREBASE_WEB_API_KEY =
  process.env.VITE_FIREBASE_API_KEY || 'AIzaSyC0JteZ0ph3UI1kdmu7m8DqpnGRLh9oS0g';
export const FIREBASE_API_KEY = FIREBASE_WEB_API_KEY;

export interface FirebaseAuthUserRecord {
  localId: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  idToken?: string;
}

export function encodeProfileMetadata(meta: Record<string, unknown>): string {
  try {
    return 'data:application/json;base64,' + Buffer.from(JSON.stringify(meta)).toString('base64');
  } catch {
    return '';
  }
}

export function decodeProfileMetadata(photoUrl?: string | null): Record<string, unknown> | null {
  if (!photoUrl || !photoUrl.startsWith('data:application/json;base64,')) {
    return null;
  }
  try {
    const rawB64 = photoUrl.replace('data:application/json;base64,', '');
    return JSON.parse(Buffer.from(rawB64, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

export async function firebaseAuthSignUp(
  email: string,
  pass: string
): Promise<{ ok: boolean; user?: FirebaseAuthUserRecord; error?: string }> {
  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_WEB_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass, returnSecureToken: true }),
    });
    const data = (await res.json()) as any;
    if (!res.ok || data.error) {
      const msg = data.error?.message || 'Erro ao registrar no Firebase Auth';
      if (msg === 'EMAIL_EXISTS') {
        return {
          ok: false,
          error:
            'Já existe uma conta cadastrada com este e-mail. Tente fazer login na aba "Entrar" ou clique em "Continuar com o Google".',
        };
      }
      return { ok: false, error: msg };
    }
    return {
      ok: true,
      user: {
        localId: data.localId,
        email: data.email,
        idToken: data.idToken,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Falha de rede ao conectar com Firebase Auth' };
  }
}

export async function firebaseAuthSignIn(
  email: string,
  pass: string
): Promise<{ ok: boolean; user?: FirebaseAuthUserRecord; error?: string }> {
  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass, returnSecureToken: true }),
    });
    const data = (await res.json()) as any;
    if (!res.ok || data.error) {
      const msg = data.error?.message || 'Falha na autenticação';
      if (
        msg === 'EMAIL_NOT_FOUND' ||
        msg === 'INVALID_PASSWORD' ||
        msg === 'INVALID_LOGIN_CREDENTIALS'
      ) {
        return { ok: false, error: 'E-mail ou senha incorreto.' };
      }
      return { ok: false, error: msg };
    }
    return {
      ok: true,
      user: {
        localId: data.localId,
        email: data.email,
        displayName: data.displayName,
        photoUrl: data.profilePicture,
        idToken: data.idToken,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Falha de rede ao conectar com Firebase Auth' };
  }
}

export async function firebaseAuthSendPasswordReset(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_WEB_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
    });
    const data = (await res.json().catch(() => ({}))) as any;
    if (!res.ok || data.error) {
      return { ok: false, error: data.error?.message || 'Falha ao enviar e-mail de redefinição.' };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Falha de rede com Firebase Auth' };
  }
}

export async function firebaseAuthUpdateProfile(params: {
  idToken: string;
  displayName?: string;
  photoUrl?: string;
  password?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_WEB_API_KEY}`;
    const body: Record<string, unknown> = {
      idToken: params.idToken,
      returnSecureToken: true,
    };
    if (params.displayName) body.displayName = params.displayName;
    if (params.photoUrl) body.photoUrl = params.photoUrl;
    if (params.password) body.password = params.password;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as any;
    if (!res.ok || data.error) {
      return {
        ok: false,
        error: data.error?.message || 'Erro ao atualizar perfil no Firebase Auth',
      };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Falha de rede com Firebase Auth' };
  }
}

export async function firebaseAuthVerifyIdToken(
  idToken: string
): Promise<{ ok: boolean; user?: FirebaseAuthUserRecord; error?: string }> {
  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data = (await res.json()) as any;
    if (!res.ok || data.error || !Array.isArray(data.users) || data.users.length === 0) {
      return {
        ok: false,
        error: data.error?.message || 'Token Google inválido ou expirado.',
      };
    }
    const u = data.users[0];
    return {
      ok: true,
      user: {
        localId: u.localId,
        email: u.email,
        displayName: u.displayName,
        photoUrl: u.photoUrl,
        idToken,
      },
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Falha de rede ao verificar token Google no Firebase Auth',
    };
  }
}

export function isMasterAccount(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === MASTER_MODERATOR_EMAIL.toLowerCase();
}

export function protectMasterAccount(targetEmail: string, actionDesc: string): void {
  if (isMasterAccount(targetEmail)) {
    throw new Error(
      `Operação negada (${actionDesc}): A conta Moderador Master (${MASTER_MODERATOR_EMAIL}) é protegida e não pode ser rebaixada, desativada ou excluída.`
    );
  }
}

export async function deduplicateAndLinkCloudEntities(store: CloudCollectionMap): Promise<void> {
  const nowIso = new Date().toISOString();
  if (!store.registrations) store.registrations = {};
  if (!store.athletes) store.athletes = {};
  if (!store.users) store.users = {};
  if (!store.profiles) store.profiles = {};

  const mutationPromises: Array<Promise<unknown>> = [];

  // 0. Reconstrói campos ausentes de registrations (ex: quando o webhook do Mercado Pago confirmou pagamento antes do doc completo da inscrição chegar) a partir do athlete/profile vinculado
  for (const [regId, reg] of Object.entries(store.registrations)) {
    if (!reg || isPurgedTestRecord(reg)) continue;
    const linkedAthId = String(reg.linkedAthleteId || `ath-${regId}`);
    const linkedAth =
      store.athletes[linkedAthId] ||
      Object.values(store.athletes).find(
        (a) => a && (a.id === linkedAthId || a.registrationId === regId)
      );

    let regRepaired = false;
    if (linkedAth) {
      if (!reg.athleteName && linkedAth.name) {
        reg.athleteName = linkedAth.name;
        regRepaired = true;
      }
      if (!reg.athleteEmail && linkedAth.email) {
        reg.athleteEmail = linkedAth.email;
        regRepaired = true;
      }
      if (!reg.teamId && linkedAth.teamId) {
        reg.teamId = linkedAth.teamId;
        regRepaired = true;
      }
      if (!reg.turma && linkedAth.turma) {
        reg.turma = linkedAth.turma;
        regRepaired = true;
      }
      if (!reg.turmaLabel && linkedAth.turmaLabel) {
        reg.turmaLabel = linkedAth.turmaLabel;
        regRepaired = true;
      }
      if (!reg.teamName && linkedAth.turmaLabel) {
        reg.teamName = String(linkedAth.turmaLabel).split('•')[0].trim();
        regRepaired = true;
      }
      if (!reg.linkedAthleteId && linkedAth.id) {
        reg.linkedAthleteId = linkedAth.id;
        regRepaired = true;
      }
      if (
        (reg.jerseyNumber === undefined || reg.jerseyNumber === null) &&
        linkedAth.jerseyNumber !== undefined &&
        linkedAth.jerseyNumber !== null
      ) {
        reg.jerseyNumber = linkedAth.jerseyNumber;
        regRepaired = true;
      }
      if (!reg.position && linkedAth.position) {
        reg.position = linkedAth.position;
        regRepaired = true;
      }
      if (!reg.instagramHandle && linkedAth.instagramHandle) {
        reg.instagramHandle = linkedAth.instagramHandle;
        regRepaired = true;
      }
      if (!reg.avatarUrl && linkedAth.avatarUrl) {
        reg.avatarUrl = linkedAth.avatarUrl;
        regRepaired = true;
      }
      if (!reg.bio && linkedAth.bio) {
        reg.bio = linkedAth.bio;
        regRepaired = true;
      }
      if (
        (!Array.isArray(reg.selectedModalities) || reg.selectedModalities.length === 0) &&
        Array.isArray(linkedAth.modalityIds) &&
        linkedAth.modalityIds.length > 0
      ) {
        reg.selectedModalities = linkedAth.modalityIds;
        regRepaired = true;
      }
      if (!reg.memberStatus && linkedAth.memberStatus) {
        reg.memberStatus = linkedAth.memberStatus;
        regRepaired = true;
      }
    }

    if (!reg.eventId) {
      reg.eventId = 'intramed-ix-2026';
      regRepaired = true;
    }
    if (!reg.lotId) {
      reg.lotId = 'lote-1-cangaceira';
      regRepaired = true;
    }
    if (!reg.modalityId) {
      reg.modalityId = 'todas';
      regRepaired = true;
    }
    if (!reg.modalityName) {
      reg.modalityName = 'Passaporte Geral (Todas as 16 Modalidades)';
      regRepaired = true;
    }
    if (!reg.categoryName) {
      reg.categoryName = 'Geral';
      regRepaired = true;
    }
    if (!reg.memberStatus) {
      reg.memberStatus = 'nao_solicitado';
      regRepaired = true;
    }
    if (!reg.paymentStatus) {
      reg.paymentStatus = 'pendente';
      regRepaired = true;
    }
    if (typeof reg.athleteName !== 'string' || !reg.athleteName.trim()) {
      reg.athleteName = String(linkedAth?.name || 'Atleta IntraMed');
      regRepaired = true;
    }
    if (typeof reg.athleteEmail !== 'string') {
      reg.athleteEmail = String(linkedAth?.email || '');
      regRepaired = true;
    }
    if (typeof reg.athletePhone !== 'string') {
      reg.athletePhone = '';
      regRepaired = true;
    }
    if (typeof reg.athleteDocument !== 'string') {
      reg.athleteDocument = '';
      regRepaired = true;
    }
    if (typeof reg.authorizedPrice !== 'number' || Number.isNaN(reg.authorizedPrice)) {
      const paidNum = Number(reg.paidAmount);
      reg.authorizedPrice =
        !Number.isNaN(paidNum) && paidNum > 0
          ? paidNum === 64.2
            ? 60
            : paidNum
          : 60;
      regRepaired = true;
    }
    if (!reg.createdAtIso) {
      reg.createdAtIso = reg.paidAtIso || reg.updatedAtIso || nowIso;
      regRepaired = true;
    }

    if (regRepaired) {
      reg.revision = Number(reg.revision || 1) + 1;
      reg.updatedAtIso = nowIso;
      store.registrations[regId] = reg;
      mutationPromises.push(MirrorDocumentToFirestoreRest('registrations', regId, reg));
    }
  }

  // 0.85. Remove registros pré-criados obsoletos ou de teste e ativa automaticamente créditos pré-aprovados para quem já criou conta
  for (const [rId, rObj] of Object.entries(store.registrations)) {
    if (isPurgedTestRecord(rObj)) {
      delete store.registrations[rId];
      mutationPromises.push(DeleteDocumentFromFirestoreRest('registrations', rId));
    }
  }
  for (const [aId, aObj] of Object.entries(store.athletes)) {
    if (isPurgedTestRecord(aObj)) {
      delete store.athletes[aId];
      mutationPromises.push(DeleteDocumentFromFirestoreRest('athletes', aId));
    }
  }

  for (const [regId, reg] of Object.entries(store.registrations)) {
    if (!reg || isPurgedTestRecord(reg) || reg.paymentStatus === 'pago') continue;
    const email = String(reg.athleteEmail || '').trim().toLowerCase();
    if (!email) continue;
    const matchedCredit = findUnclaimedPreApprovedCredit(store, reg.athleteName, reg.turma);
    if (matchedCredit) {
      const linkedAthId = String(reg.linkedAthleteId || `ath-${regId}`);
      reg.turma = matchedCredit.turma;
      reg.turmaLabel = matchedCredit.turmaLabel;
      reg.teamId = matchedCredit.teamId;
      reg.teamName = matchedCredit.teamName;
      reg.categoryName = String(reg.categoryName && reg.categoryName !== 'Geral' ? reg.categoryName : matchedCredit.categoryName);
      reg.requestedMemberDiscount = matchedCredit.isSocio;
      reg.memberStatus = matchedCredit.isSocio ? 'aprovado' : 'nao_solicitado';
      reg.authorizedPrice = matchedCredit.paidAmount;
      reg.paidAmount = matchedCredit.paidAmount;
      reg.paymentStatus = 'pago';
      reg.paymentMethod = 'pix';
      reg.mpPaymentId = matchedCredit.externalRef;
      reg.paidAtIso = nowIso;
      reg.qrValidationToken = `INTRAMED-IX-${regId.toUpperCase()}-VERIFIED`;
      reg.revision = Number(reg.revision || 1) + 1;
      reg.updatedAtIso = nowIso;
      store.registrations[regId] = reg;
      mutationPromises.push(MirrorDocumentToFirestoreRest('registrations', regId, reg));

      const athObj: Record<string, unknown> = {
        ...(store.athletes[linkedAthId] || {}),
        id: linkedAthId,
        name: String(reg.athleteName || matchedCredit.athleteName),
        email,
        teamId: matchedCredit.teamId,
        turma: matchedCredit.turma,
        turmaLabel: matchedCredit.turmaLabel,
        categoryName: reg.categoryName,
        gender: reg.categoryName,
        registrationId: regId,
        paymentStatus: 'pago',
        memberStatus: reg.memberStatus,
        status: 'confirmado',
        isTestOnly: false,
        revision: Number(store.athletes[linkedAthId]?.revision || 0) + 1,
        updatedAtIso: nowIso,
      };
      store.athletes[linkedAthId] = athObj;
      mutationPromises.push(MirrorDocumentToFirestoreRest('athletes', linkedAthId, athObj));
    }
  }

  // 1. Deduplica registrations por athleteEmail (mantém a inscrição PAGA ou mais recente e mescla foto/camisa/insta da anterior)
  const regsByEmail = new Map<string, Array<Record<string, unknown>>>();
  for (const reg of Object.values(store.registrations)) {
    if (!reg || !reg.id || isPurgedTestRecord(reg)) continue;
    const email = String(reg.athleteEmail || '').trim().toLowerCase();
    if (!email) continue;
    const list = regsByEmail.get(email) || [];
    list.push(reg);
    regsByEmail.set(email, list);
  }

  for (const [, group] of regsByEmail.entries()) {
    if (group.length <= 1) continue;
    group.sort((a, b) => {
      const aPaid = a.paymentStatus === 'pago' ? 1 : 0;
      const bPaid = b.paymentStatus === 'pago' ? 1 : 0;
      if (aPaid !== bPaid) return bPaid - aPaid;
      const aTime = new Date(String(a.updatedAtIso || a.createdAtIso || 0)).getTime();
      const bTime = new Date(String(b.updatedAtIso || b.createdAtIso || 0)).getTime();
      return bTime - aTime;
    });

    const primaryReg = group[0];
    const primaryRegId = String(primaryReg.id);
    let primaryChanged = false;

    for (let i = 1; i < group.length; i++) {
      const dup = group[i];
      const dupId = String(dup.id || '');
      if (dup.paymentStatus === 'pago') continue; // Nunca apaga uma segunda inscrição paga distinta

      if (!primaryReg.avatarUrl && dup.avatarUrl) {
        primaryReg.avatarUrl = dup.avatarUrl;
        primaryChanged = true;
      }
      if ((primaryReg.jerseyNumber === null || primaryReg.jerseyNumber === undefined) && dup.jerseyNumber !== null && dup.jerseyNumber !== undefined) {
        primaryReg.jerseyNumber = dup.jerseyNumber;
        primaryChanged = true;
      }
      if (!primaryReg.instagramHandle && dup.instagramHandle) {
        primaryReg.instagramHandle = dup.instagramHandle;
        primaryChanged = true;
      }
      if (!primaryReg.bio && dup.bio) {
        primaryReg.bio = dup.bio;
        primaryChanged = true;
      }
      if (dupId && dupId !== primaryRegId) {
        delete store.registrations[dupId];
        mutationPromises.push(DeleteDocumentFromFirestoreRest('registrations', dupId));
      }
    }

    if (primaryChanged) {
      primaryReg.revision = Number(primaryReg.revision || 1) + 1;
      primaryReg.updatedAtIso = nowIso;
      store.registrations[primaryRegId] = primaryReg;
      mutationPromises.push(MirrorDocumentToFirestoreRest('registrations', primaryRegId, primaryReg));
    }
  }

  // 2. Deduplica athletes por email (e vincula com a inscrição ativa do mesmo email)
  if (store.athletes['test-sync-check']) {
    delete store.athletes['test-sync-check'];
    mutationPromises.push(DeleteDocumentFromFirestoreRest('athletes', 'test-sync-check'));
  }

  const athsByEmail = new Map<string, Array<Record<string, unknown>>>();
  for (const ath of Object.values(store.athletes)) {
    if (!ath || !ath.id || isPurgedTestRecord(ath)) continue;
    const regId = String(ath.registrationId || '');
    const linkedReg = regId ? store.registrations[regId] : undefined;
    if (linkedReg) {
      if (ath.paymentStatus !== linkedReg.paymentStatus) {
        ath.paymentStatus = linkedReg.paymentStatus;
      }
      if (!ath.email && linkedReg.athleteEmail) {
        ath.email = linkedReg.athleteEmail;
      }
    }
    const email = String(ath.email || '').trim().toLowerCase();
    if (!email) continue;
    const list = athsByEmail.get(email) || [];
    list.push(ath);
    athsByEmail.set(email, list);
  }

  for (const [email, group] of athsByEmail.entries()) {
    const matchingReg = Object.values(store.registrations).find(
      (r) => String(r?.athleteEmail || '').trim().toLowerCase() === email
    );

    group.sort((a, b) => {
      const aMatchesReg = matchingReg && (a.id === matchingReg.linkedAthleteId || a.registrationId === matchingReg.id) ? 1 : 0;
      const bMatchesReg = matchingReg && (b.id === matchingReg.linkedAthleteId || b.registrationId === matchingReg.id) ? 1 : 0;
      if (aMatchesReg !== bMatchesReg) return bMatchesReg - aMatchesReg;
      const aPaid = a.paymentStatus === 'pago' ? 1 : 0;
      const bPaid = b.paymentStatus === 'pago' ? 1 : 0;
      if (aPaid !== bPaid) return bPaid - aPaid;
      const aTime = new Date(String(a.updatedAtIso || 0)).getTime();
      const bTime = new Date(String(b.updatedAtIso || 0)).getTime();
      return bTime - aTime;
    });

    const primaryAth = group[0];
    const primaryAthId = String(primaryAth.id);
    let athChanged = false;

    if (matchingReg) {
      if (primaryAth.registrationId !== matchingReg.id) {
        primaryAth.registrationId = matchingReg.id;
        athChanged = true;
      }
      if (primaryAth.paymentStatus !== matchingReg.paymentStatus) {
        primaryAth.paymentStatus = matchingReg.paymentStatus;
        athChanged = true;
      }
      const expectedStatus = matchingReg.paymentStatus === 'pago' ? 'confirmado' : 'pendente';
      if (primaryAth.status !== expectedStatus) {
        primaryAth.status = expectedStatus;
        athChanged = true;
      }
      if (matchingReg.athleteName && String(matchingReg.athleteName).length > String(primaryAth.name || '').length) {
        primaryAth.name = matchingReg.athleteName;
        athChanged = true;
      }
      if (!primaryAth.avatarUrl && matchingReg.avatarUrl) {
        primaryAth.avatarUrl = matchingReg.avatarUrl;
        athChanged = true;
      }
      if ((primaryAth.jerseyNumber === null || primaryAth.jerseyNumber === undefined) && matchingReg.jerseyNumber !== null && matchingReg.jerseyNumber !== undefined) {
        primaryAth.jerseyNumber = matchingReg.jerseyNumber;
        athChanged = true;
      }
      if (!primaryAth.instagramHandle && matchingReg.instagramHandle) {
        primaryAth.instagramHandle = matchingReg.instagramHandle;
        athChanged = true;
      }
      if (matchingReg.categoryName && primaryAth.categoryName !== matchingReg.categoryName) {
        primaryAth.categoryName = matchingReg.categoryName;
        athChanged = true;
      }
      if (matchingReg.categoryName && primaryAth.gender !== matchingReg.categoryName) {
        primaryAth.gender = matchingReg.categoryName;
        athChanged = true;
      }
    }

    for (let i = 1; i < group.length; i++) {
      const dup = group[i];
      const dupId = String(dup.id || '');
      if (!primaryAth.avatarUrl && dup.avatarUrl) {
        primaryAth.avatarUrl = dup.avatarUrl;
        athChanged = true;
      }
      if ((primaryAth.jerseyNumber === null || primaryAth.jerseyNumber === undefined) && dup.jerseyNumber !== null && dup.jerseyNumber !== undefined) {
        primaryAth.jerseyNumber = dup.jerseyNumber;
        athChanged = true;
      }
      if (!primaryAth.instagramHandle && dup.instagramHandle) {
        primaryAth.instagramHandle = dup.instagramHandle;
        athChanged = true;
      }
      if (!primaryAth.bio && dup.bio) {
        primaryAth.bio = dup.bio;
        athChanged = true;
      }
      if (dupId && dupId !== primaryAthId) {
        delete store.athletes[dupId];
        mutationPromises.push(DeleteDocumentFromFirestoreRest('athletes', dupId));
      }
    }

    if (athChanged) {
      primaryAth.revision = Number(primaryAth.revision || 1) + 1;
      primaryAth.updatedAtIso = nowIso;
      store.athletes[primaryAthId] = primaryAth;
      mutationPromises.push(MirrorDocumentToFirestoreRest('athletes', primaryAthId, primaryAth));
    }
  }

  // 3. Sincroniza profiles com users, registrations e athletes (e remove perfil duplicado usr_master_cangaceira se já houver UID real para a conta Master)
  const masterRealProfileId = Object.keys(store.profiles).find(
    (pid) =>
      pid !== 'usr_master_cangaceira' &&
      String(store.profiles[pid]?.displayName || '').trim().toLowerCase() === 'atlética cangaceira'
  );
  if (masterRealProfileId && store.profiles['usr_master_cangaceira']) {
    const realProf = store.profiles[masterRealProfileId];
    const legacyProf = store.profiles['usr_master_cangaceira'];
    if (!realProf.instagramHandle && legacyProf.instagramHandle) {
      realProf.instagramHandle = legacyProf.instagramHandle;
      mutationPromises.push(MirrorDocumentToFirestoreRest('profiles', masterRealProfileId, realProf));
    }
    delete store.profiles['usr_master_cangaceira'];
    mutationPromises.push(DeleteDocumentFromFirestoreRest('profiles', 'usr_master_cangaceira'));
  }

  for (const [profId, prof] of Object.entries(store.profiles)) {
    if (!prof || isPurgedTestRecord(prof)) continue;
    const userObj = store.users[profId] || Object.values(store.users).find((u) => String(u?.id || '') === profId);
    const userEmail = String(userObj?.email || prof.email || '').trim().toLowerCase();
    let matchingReg = userEmail
      ? Object.values(store.registrations).find(
          (r) => String(r?.athleteEmail || '').trim().toLowerCase() === userEmail
        )
      : prof.linkedAthleteId
      ? Object.values(store.registrations).find(
          (r) => r?.linkedAthleteId === prof.linkedAthleteId || `ath-${r?.id}` === prof.linkedAthleteId
        )
      : undefined;

    // Se o usuário criou conta e consta na fila de pré-aprovados pagos por fora, converte automaticamente em atleta confirmado!
    if (!matchingReg && userEmail) {
      const candidateName = String(prof.displayName || userObj?.name || '').trim();
      const matchedCredit = findUnclaimedPreApprovedCredit(store, candidateName, prof.turma);
      if (matchedCredit) {
        const autoRegId = `reg-paid-${matchedCredit.key}`;
        const autoAthId = `ath-${autoRegId}`;
        const allMods = [
          'futsal',
          'basquete',
          'handebol',
          'volei',
          'volei-de-praia',
          'truco',
          'sinuca',
          'natacao',
          'poker',
          'tenis-de-mesa',
        ];
        const newAutoReg: Record<string, unknown> = {
          id: autoRegId,
          eventId: 'intramed-ix-2026',
          lotId: 'lote-1-cangaceira',
          userId: profId,
          linkedAthleteId: autoAthId,
          athleteName: matchedCredit.athleteName,
          athleteEmail: userEmail,
          athletePhone: '',
          athleteDocument: '',
          turma: matchedCredit.turma,
          turmaLabel: matchedCredit.turmaLabel,
          teamId: matchedCredit.teamId,
          teamName: matchedCredit.teamName,
          modalityId: 'todas',
          modalityName: 'Passaporte Geral (Todas as 16 Modalidades)',
          selectedModalities: allMods,
          categoryName: matchedCredit.categoryName,
          requestedMemberDiscount: matchedCredit.isSocio,
          isGuestAthlete: false,
          memberStatus: matchedCredit.isSocio ? 'aprovado' : 'nao_solicitado',
          memberNotes: matchedCredit.isSocio
            ? 'Sócio validado e pagamento confirmado diretamente com a Atlética Cangaceira.'
            : 'Pagamento confirmado diretamente com a Atlética Cangaceira.',
          validatedByAdminId: 'usr_master_cangaceira',
          validatedByAdminName: 'Atlética Cangaceira',
          validatedAtIso: nowIso,
          paymentStatus: 'pago',
          paymentMethod: 'pix',
          mpPaymentId: matchedCredit.externalRef,
          authorizedPrice: matchedCredit.paidAmount,
          paidAmount: matchedCredit.paidAmount,
          qrValidationToken: `INTRAMED-IX-${autoRegId.toUpperCase()}-VERIFIED`,
          avatarUrl: (prof.avatarUrl as string) || null,
          jerseyNumber: null,
          position: 'Atleta Confirmado',
          bio: (prof.bio as string) || null,
          instagramHandle: (prof.instagramHandle as string) || null,
          createdAtIso: nowIso,
          paidAtIso: nowIso,
          updatedAtIso: nowIso,
          revision: 1,
        };
        const newAutoAth: Record<string, unknown> = {
          id: autoAthId,
          name: matchedCredit.athleteName,
          email: userEmail,
          teamId: matchedCredit.teamId,
          turma: matchedCredit.turma,
          turmaLabel: matchedCredit.turmaLabel,
          categoryName: matchedCredit.categoryName,
          gender: matchedCredit.categoryName,
          jerseyNumber: null,
          position: 'Atleta Confirmado',
          bio: (prof.bio as string) || null,
          instagramHandle: (prof.instagramHandle as string) || null,
          avatarUrl: (prof.avatarUrl as string) || null,
          modalityIds: allMods,
          registrationId: autoRegId,
          paymentStatus: 'pago',
          memberStatus: newAutoReg.memberStatus,
          status: 'confirmado',
          isTestOnly: false,
          revision: 1,
          updatedAtIso: nowIso,
        };
        store.registrations[autoRegId] = newAutoReg;
        store.athletes[autoAthId] = newAutoAth;
        mutationPromises.push(MirrorDocumentToFirestoreRest('registrations', autoRegId, newAutoReg));
        mutationPromises.push(MirrorDocumentToFirestoreRest('athletes', autoAthId, newAutoAth));

        if (userObj) {
          userObj.role = 'atleta';
          userObj.linkedAthleteId = autoAthId;
          userObj.registrationId = autoRegId;
          userObj.updatedAtIso = nowIso;
          mutationPromises.push(MirrorDocumentToFirestoreRest('users', String(userObj.id || profId), userObj));
        }
        matchingReg = newAutoReg;
      }
    }

    if (matchingReg) {
      const expectedAthId = String(matchingReg.linkedAthleteId || `ath-${matchingReg.id}`);
      const isPaid = matchingReg.paymentStatus === 'pago';
      let profChanged = false;
      if (prof.linkedAthleteId !== expectedAthId) {
        prof.linkedAthleteId = expectedAthId;
        profChanged = true;
      }
      if (Boolean(prof.isAthlete) !== isPaid) {
        prof.isAthlete = isPaid;
        profChanged = true;
      }
      if (!prof.turma && matchingReg.turma) {
        prof.turma = matchingReg.turma;
        profChanged = true;
      }
      if (!prof.turmaLabel && matchingReg.turmaLabel) {
        prof.turmaLabel = matchingReg.turmaLabel;
        profChanged = true;
      }
      if (!prof.teamId && matchingReg.teamId) {
        prof.teamId = matchingReg.teamId;
        profChanged = true;
      }
      if (!prof.teamName && matchingReg.teamName) {
        prof.teamName = matchingReg.teamName;
        profChanged = true;
      }
      const linkedAth = store.athletes[expectedAthId];
      const avatarCandidates = [
        { url: prof.avatarUrl, ts: new Date(String(prof.updatedAtIso || prof.createdAtIso || 0)).getTime() },
        { url: linkedAth?.avatarUrl, ts: new Date(String(linkedAth?.updatedAtIso || 0)).getTime() },
        { url: matchingReg.avatarUrl, ts: new Date(String(matchingReg.updatedAtIso || matchingReg.createdAtIso || 0)).getTime() },
      ].filter((c) => typeof c.url === 'string' && c.url.trim().length > 0);

      if (avatarCandidates.length > 0) {
        avatarCandidates.sort((a, b) => b.ts - a.ts);
        const canonicalAvatar = String(avatarCandidates[0].url);
        if (prof.avatarUrl !== canonicalAvatar) {
          prof.avatarUrl = canonicalAvatar;
          profChanged = true;
        }
        if (linkedAth && linkedAth.avatarUrl !== canonicalAvatar) {
          linkedAth.avatarUrl = canonicalAvatar;
          linkedAth.updatedAtIso = nowIso;
          store.athletes[expectedAthId] = linkedAth;
          mutationPromises.push(MirrorDocumentToFirestoreRest('athletes', expectedAthId, linkedAth));
        }
        if (matchingReg.avatarUrl !== canonicalAvatar) {
          matchingReg.avatarUrl = canonicalAvatar;
          matchingReg.updatedAtIso = nowIso;
          store.registrations[String(matchingReg.id)] = matchingReg;
          mutationPromises.push(MirrorDocumentToFirestoreRest('registrations', String(matchingReg.id), matchingReg));
        }
      }
      if (profChanged) {
        prof.updatedAtIso = nowIso;
        store.profiles[profId] = prof;
        mutationPromises.push(MirrorDocumentToFirestoreRest('profiles', profId, prof));
      }
    }
  }

  if (mutationPromises.length > 0) {
    await Promise.allSettled(mutationPromises);
  }
}

export function ensureMasterAccountProvisioned(store: CloudCollectionMap): void {
  if (!store.admin_users) {
    store.admin_users = {};
  }
  if (!store.admin_audit_logs) {
    store.admin_audit_logs = [];
  }
  const emailKey = MASTER_MODERATOR_EMAIL.toLowerCase();
  const existingMaster = store.admin_users[emailKey] || store.admin_users['usr_master_cangaceira'];

  if (!existingMaster) {
    const initialPass = process.env.INTRAMED_MASTER_INITIAL_PASSWORD || 'campeao2027';
    const nowIso = new Date().toISOString();
    store.admin_users[emailKey] = {
      id: 'usr_master_cangaceira',
      email: emailKey,
      name: 'Atlética Cangaceira',
      role: 'moderador_master',
      organization: 'Associação Atlética Acadêmica de Medicina UEMA – Cangaceira',
      passwordHash: hashPassword(initialPass),
      mustChangePassword: true,
      isActive: true,
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
    };
    store.admin_audit_logs.push({
      id: `audit_${Date.now()}_prov`,
      action: 'provision_master',
      performedByEmail: 'system',
      performedByRole: 'system',
      targetEmail: emailKey,
      timestampIso: nowIso,
      details: 'Conta Moderador Master provisionada com primeiro acesso obrigatório',
    });
    void MirrorDocumentToFirestoreRest('admin_users', emailKey, store.admin_users[emailKey]);
    void MirrorDocumentToFirestoreRest('admin_users', 'usr_master_cangaceira', store.admin_users[emailKey]);
  } else {
    // Blindagem de cargo permanente sem sobrescrever a nova senha ou status de troca
    existingMaster.role = 'moderador_master';
    existingMaster.isActive = true;
    existingMaster.organization = 'Associação Atlética Acadêmica de Medicina UEMA – Cangaceira';
    store.admin_users[emailKey] = existingMaster;
  }
}

function seedOfficialMatchesAndBrackets(store: CloudCollectionMap) {
  if (!store.matches) store.matches = {};
  for (const m of OFFICIAL_TOURNAMENT_MATCHES) {
    const mId = String(m.id || '');
    if (!store.matches[mId]) {
      store.matches[mId] = m as unknown as Record<string, unknown>;
    } else {
      // Atualiza horários e locais oficiais caso estivessem vazios ou do lote antigo
      const ex = store.matches[mId];
      if (m.scheduledDate && !ex.scheduledDate) ex.scheduledDate = m.scheduledDate;
      if (m.scheduledTime && !ex.scheduledTime) ex.scheduledTime = m.scheduledTime;
      if (m.venue && !ex.venue) ex.venue = m.venue;
    }
  }

  if (!store.brackets) store.brackets = {};
  for (const [k, v] of Object.entries(OFFICIAL_UNIVERSAL_BRACKETS)) {
    if (!store.brackets[k]) {
      store.brackets[k] = v as unknown as Record<string, unknown>;
    } else {
      // Propaga horários para as etapas do chaveamento universal
      store.brackets[k] = {
        ...v,
        ...store.brackets[k],
        stages: (v as any).stages,
      };
    }
  }

  if (!store.teams) store.teams = {};
  for (const t of INITIAL_OFFICIAL_TEAMS) {
    if (!store.teams[t.id]) {
      store.teams[t.id] = t as unknown as Record<string, unknown>;
    }
  }

  if (store.launch_config) {
    store.launch_config.bracketPublished = true;
  }
}

export function getCloudStore(): CloudCollectionMap {
  if (global.__INTRAMED_CLOUD_STORE_V2__) {
    seedOfficialMatchesAndBrackets(global.__INTRAMED_CLOUD_STORE_V2__);
    ensureMasterAccountProvisioned(global.__INTRAMED_CLOUD_STORE_V2__);
    return global.__INTRAMED_CLOUD_STORE_V2__;
  }

  try {
    if (fs.existsSync(CLOUD_STATE_FILE)) {
      const raw = fs.readFileSync(CLOUD_STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as CloudCollectionMap;
      if (parsed && typeof parsed === 'object') {
        global.__INTRAMED_CLOUD_STORE_V2__ = {
          registrations: parsed.registrations || {},
          athletes: parsed.athletes || {},
          teams: parsed.teams || {},
          matches: parsed.matches || {},
          match_sheets: parsed.match_sheets || {},
          match_secrets: parsed.match_secrets || {},
          users: parsed.users || {},
          profiles: parsed.profiles || {},
          posts: parsed.posts || {},
          post_likes: parsed.post_likes || {},
          post_comments: parsed.post_comments || {},
          user_follows: parsed.user_follows || {},
          user_saves: parsed.user_saves || {},
          social_notifications: parsed.social_notifications || {},
          admin_users: parsed.admin_users || {},
          admin_audit_logs: parsed.admin_audit_logs || [],
          launch_config: parsed.launch_config || { ...DEFAULT_LAUNCH_CONFIG },
          brackets: parsed.brackets || {},
          updatedAtIso: parsed.updatedAtIso || new Date().toISOString(),
        };
        seedOfficialMatchesAndBrackets(global.__INTRAMED_CLOUD_STORE_V2__);
        ensureMasterAccountProvisioned(global.__INTRAMED_CLOUD_STORE_V2__);
        return global.__INTRAMED_CLOUD_STORE_V2__;
      }
    }
  } catch {
    // Ignore file read errors
  }

  global.__INTRAMED_CLOUD_STORE_V2__ = {
    registrations: {},
    athletes: {},
    teams: {},
    matches: {},
    match_sheets: {},
    match_secrets: {},
    users: {},
    profiles: {},
    posts: {},
    post_likes: {},
    post_comments: {},
    user_follows: {},
    user_saves: {},
    social_notifications: {},
    admin_users: {},
    admin_audit_logs: [],
    launch_config: { ...DEFAULT_LAUNCH_CONFIG },
    brackets: {},
    updatedAtIso: new Date().toISOString(),
  };
  seedOfficialMatchesAndBrackets(global.__INTRAMED_CLOUD_STORE_V2__);
  ensureMasterAccountProvisioned(global.__INTRAMED_CLOUD_STORE_V2__);
  return global.__INTRAMED_CLOUD_STORE_V2__;
}

export function saveCloudStore(store: CloudCollectionMap) {
  ensureMasterAccountProvisioned(store);
  store.updatedAtIso = new Date().toISOString();
  global.__INTRAMED_CLOUD_STORE_V2__ = store;
  try {
    fs.writeFileSync(CLOUD_STATE_FILE, JSON.stringify(store), 'utf-8');
  } catch {
    // Ignore tmp write errors
  }
}

/**
 * Sanitiza uma inscrição para leitura pública (LGPD):
 * Remove CPF/matrícula completo, telefone completo e notas administrativas privadas.
 */
export function sanitizeRegistrationForPublic(
  reg: Record<string, unknown>
): Record<string, unknown> {
  const docStr = String(reg.athleteDocument || '').replace(/\D/g, '');
  const maskedDoc =
    docStr.length >= 4 ? `***.***.*${docStr.slice(-4)}` : '***';
  const {
    athletePhone: _phone,
    memberDocumentProofUrl: _proof,
    accountPassword: _rawPassword,
    accountPasswordHash: _passwordHash,
    ...rest
  } = reg;
  return {
    ...rest,
    athleteDocument: maskedDoc,
    athletePhone: '',
    hasAccountPassword: Boolean(_rawPassword || _passwordHash),
  };
}

/**
 * Sanitiza um perfil para consumo público no feed social / diretório de participantes:
 * NUNCA expõe senhas, hashes, emails privados, documentos, telefones ou dados financeiros.
 */
export function sanitizeUserProfileForPublic(
  profile: Record<string, unknown>
): Record<string, unknown> {
  const {
    password: _pwd,
    passwordHash: _hash,
    accountPassword: _accPass,
    accountPasswordHash: _accHash,
    email: _em,
    phone: _ph,
    document: _doc,
    mpPaymentId: _mp,
    ...safePublic
  } = profile;

  return {
    id: safePublic.id,
    userId: safePublic.userId || safePublic.id,
    displayName: safePublic.displayName || safePublic.name || 'Participante IntraMed',
    avatarUrl: safePublic.avatarUrl || null,
    coverUrl: safePublic.coverUrl || null,
    turma: safePublic.turma || null,
    turmaLabel: safePublic.turmaLabel || null,
    teamId: safePublic.teamId || null,
    teamName: safePublic.teamName || null,
    bio: safePublic.bio || null,
    instagramHandle: safePublic.instagramHandle || null,
    isAthlete: Boolean(safePublic.isAthlete),
    linkedAthleteId: safePublic.linkedAthleteId || null,
    favoriteModalityIds: Array.isArray(safePublic.favoriteModalityIds)
      ? safePublic.favoriteModalityIds
      : [],
    followersCount: Number(safePublic.followersCount || 0),
    followingCount: Number(safePublic.followingCount || 0),
    postsCount: Number(safePublic.postsCount || 0),
    createdAtIso: safePublic.createdAtIso || new Date().toISOString(),
    updatedAtIso: safePublic.updatedAtIso || new Date().toISOString(),
  };
}

/**
 * Sanitiza uma partida para leitura pública:
 * Remove a senha em texto puro do mesário (`tableOfficialPassword`) para usuários não-admin.
 */
export function sanitizeMatchForPublic(
  match: Record<string, unknown>,
  isAdminRequest: boolean
): Record<string, unknown> {
  if (isAdminRequest) return match;
  const { tableOfficialPassword: _pin, ...rest } = match;
  return {
    ...rest,
    hasTableOfficialPassword: Boolean(_pin),
  };
}

// Persistência complementar no Cloud Firestore REST API (durável entre cold starts do Vercel)
const FIREBASE_PROJECT_ID =
  process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0847910166';

const SERVER_SYNC_ACCOUNT_EMAIL = 'sync-engine@intramed.uema.br';
const SERVER_SYNC_ACCOUNT_PASS = 'IntramedSyncEngine#2026!';

let cachedServerFirebaseIdToken: string | null = null;
let cachedServerFirebaseTokenExpMs = 0;

/**
 * Obtém um Firebase Auth ID Token válido de serviço para autenticar chamadas REST ao Cloud Firestore,
 * garantindo que as Security Rules (`request.auth != null`) permitam leitura/escrita durável entre instâncias Vercel.
 */
export async function getServerFirebaseIdToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedServerFirebaseIdToken && now < cachedServerFirebaseTokenExpMs - 60000) {
    return cachedServerFirebaseIdToken;
  }

  try {
    let authRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: SERVER_SYNC_ACCOUNT_EMAIL,
          password: SERVER_SYNC_ACCOUNT_PASS,
          returnSecureToken: true,
        }),
      }
    );
    let authData = (await authRes.json().catch(() => ({}))) as any;

    if (!authRes.ok || !authData?.idToken) {
      authRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_WEB_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: SERVER_SYNC_ACCOUNT_EMAIL,
            password: SERVER_SYNC_ACCOUNT_PASS,
            returnSecureToken: true,
          }),
        }
      );
      authData = (await authRes.json().catch(() => ({}))) as any;
    }

    if (authData?.idToken) {
      cachedServerFirebaseIdToken = String(authData.idToken);
      const expiresInSec = Number(authData.expiresIn || 3600);
      cachedServerFirebaseTokenExpMs = now + expiresInSec * 1000;
      return cachedServerFirebaseIdToken;
    }
  } catch {
    // Non-blocking fallback
  }

  return null;
}

function toFirestoreValue(val: unknown): Record<string, unknown> {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map((v) => toFirestoreValue(v)) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(val: Record<string, unknown> | undefined): unknown {
  if (!val || typeof val !== 'object') return null;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('stringValue' in val) return String(val.stringValue);
  if ('timestampValue' in val) return String(val.timestampValue);
  if ('arrayValue' in val) {
    const arrObj = val.arrayValue as { values?: Array<Record<string, unknown>> } | undefined;
    return Array.isArray(arrObj?.values)
      ? arrObj.values.map((item) => fromFirestoreValue(item))
      : [];
  }
  if ('mapValue' in val) {
    const mapObj = val.mapValue as { fields?: Record<string, Record<string, unknown>> } | undefined;
    const out: Record<string, unknown> = {};
    if (mapObj?.fields && typeof mapObj.fields === 'object') {
      for (const [k, v] of Object.entries(mapObj.fields)) {
        out[k] = fromFirestoreValue(v);
      }
    }
    return out;
  }
  return null;
}

export function appendServerSyncLog(
  entry: Omit<SyncDiagnosticLogEntry, 'id' | 'timestampIso'>
): void {
  const store = getCloudStore();
  const list = Array.isArray(store.sync_logs) ? store.sync_logs : [];
  const fullEntry: SyncDiagnosticLogEntry = {
    id: `slog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestampIso: new Date().toISOString(),
    ...entry,
  };
  store.sync_logs = [fullEntry, ...list].slice(0, 120);
}

/**
 * Hidrata o store em memória a partir do Cloud Firestore REST API caso a instância serverless tenha sofrido cold-start.
 */
export async function ensureCloudStoreHydrated(force = false): Promise<CloudCollectionMap> {
  const store = getCloudStore();
  // Remove qualquer registro de teste expurgado que possa estar em memória
  for (const colKey of ['registrations', 'athletes', 'users', 'profiles'] as const) {
    const mapObj = store[colKey];
    if (mapObj && typeof mapObj === 'object') {
      for (const [k, v] of Object.entries(mapObj)) {
        if (isPurgedTestRecord(v)) {
          delete mapObj[k];
        }
      }
    }
  }

  const lastHydratedMs = store.hydratedFromFirestoreAtIso
    ? new Date(store.hydratedFromFirestoreAtIso).getTime()
    : 0;
  // Re-hidrata se forçado, se nunca hidratou ou se passou mais de 15s (sincroniza entre instâncias serverless)
  if (!force && lastHydratedMs > 0 && Date.now() - lastHydratedMs < 15000) {
    return store;
  }

  store.hydratedFromFirestoreAtIso = new Date().toISOString();
  const collectionsToHydrate = [
    'registrations',
    'athletes',
    'teams',
    'matches',
    'match_sheets',
    'admin_users',
    'users',
    'profiles',
    'posts',
    'post_likes',
    'post_comments',
    'user_follows',
    'user_saves',
    'social_notifications',
  ];

  try {
    const idToken = await getServerFirebaseIdToken();
    const authHeaders: Record<string, string> = idToken
      ? { Authorization: `Bearer ${idToken}` }
      : {};

    await Promise.all(
      collectionsToHydrate.map(async (colName) => {
        // Paginação completa (antes limitava a 300 documentos e perdia usuários/perfis excedentes)
        const docs: Array<{
          name?: string;
          fields?: Record<string, Record<string, unknown>>;
        }> = [];
        let pageToken = '';
        for (let page = 0; page < 50; page++) {
          const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(
            colName
          )}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}&key=${FIREBASE_API_KEY}`;
          const res = await fetch(url, { headers: authHeaders }).catch(() => null);
          if (!res || !res.ok) break;
          const { data } = await parseJsonSafe(res);
          if (Array.isArray(data?.documents)) {
            docs.push(...(data.documents as typeof docs));
          }
          pageToken = typeof data?.nextPageToken === 'string' ? data.nextPageToken : '';
          if (!pageToken) break;
        }
        for (const doc of docs) {
          if (!doc?.fields) continue;
          const parsedDoc: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(doc.fields)) {
            parsedDoc[k] = fromFirestoreValue(v);
          }
          const docId =
            String(parsedDoc.id || '') ||
            String(doc.name || '')
              .split('/')
              .pop() ||
            '';
          if (docId) {
            if (
              (colName === 'registrations' ||
                colName === 'athletes' ||
                colName === 'users' ||
                colName === 'profiles') &&
              isPurgedTestRecord(parsedDoc)
            ) {
              void DeleteDocumentFromFirestoreRest(colName, docId);
              continue;
            }
            if (colName === 'admin_users') {
              if (!store.admin_users) store.admin_users = {};
              const normalizedEmail = String(parsedDoc.email || docId).trim().toLowerCase();
              const adminUserObj = { ...parsedDoc, id: docId, email: normalizedEmail };
              store.admin_users[normalizedEmail] = adminUserObj;
              if (docId && docId !== normalizedEmail) {
                store.admin_users[docId] = adminUserObj;
              }
            } else if (colName === 'users') {
              if (!store.users) store.users = {};
              const normalizedEmail = String(parsedDoc.email || '').trim().toLowerCase();
              const userObj = { ...parsedDoc, id: docId, email: normalizedEmail };
              store.users[docId] = userObj;
              if (normalizedEmail) {
                store.users[normalizedEmail] = userObj;
              }
            } else if (colName === 'profiles') {
              if (!store.profiles) store.profiles = {};
              store.profiles[docId] = { ...parsedDoc, id: docId };
            } else if (colName === 'matches') {
              if (!store.matches) store.matches = {};
              const exM = store.matches[docId] || {};
              store.matches[docId] = {
                ...exM,
                ...parsedDoc,
                id: docId,
                scheduledDate: parsedDoc.scheduledDate || exM.scheduledDate || null,
                scheduledTime: parsedDoc.scheduledTime || exM.scheduledTime || null,
                venue: parsedDoc.venue || exM.venue || null,
              };
            } else {
              const targetCol = (store as Record<string, any>)[colName] || {};
              const exDoc = targetCol[docId];
              const exRev = Number(exDoc?.revision || 0);
              const inRev = Number(parsedDoc.revision || 0);
              if (!exDoc || inRev >= exRev) {
                targetCol[docId] = { ...(exDoc || {}), ...parsedDoc, id: docId };
                (store as Record<string, any>)[colName] = targetCol;
              }
            }
          }
        }
      })
    );
    await deduplicateAndLinkCloudEntities(store);
    ensureMasterAccountProvisioned(store);
    saveCloudStore(store);
  } catch {
    // Non-blocking best-effort hydration
  }

  return store;
}

export interface FirestoreHealthReport {
  projectId: string;
  database: string;
  status: 'connected' | 'not_provisioned' | 'error';
  statusCode: number;
  message: string;
  lastCheckedIso: string;
}

let lastFirestoreHealthCache: FirestoreHealthReport | null = null;
let lastFirestoreHealthTimestamp = 0;

export async function checkFirestoreHealth(force = false): Promise<FirestoreHealthReport> {
  const now = Date.now();
  if (!force && lastFirestoreHealthCache && now - lastFirestoreHealthTimestamp < 20000) {
    return lastFirestoreHealthCache;
  }

  try {
    const idToken = await getServerFirebaseIdToken();
    const authHeaders: Record<string, string> = idToken
      ? { Authorization: `Bearer ${idToken}` }
      : {};
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/registrations?pageSize=1&key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, { method: 'GET', headers: authHeaders });
    const data = await res.json().catch(() => ({}));

    if (res.status === 200) {
      lastFirestoreHealthCache = {
        projectId: FIREBASE_PROJECT_ID,
        database: '(default)',
        status: 'connected',
        statusCode: 200,
        message: 'Conectado ao Cloud Firestore em modo nativo com sucesso.',
        lastCheckedIso: new Date().toISOString(),
      };
    } else if (res.status === 404 && data?.error?.message?.includes('does not exist')) {
      lastFirestoreHealthCache = {
        projectId: FIREBASE_PROJECT_ID,
        database: '(default)',
        status: 'not_provisioned',
        statusCode: 404,
        message: `Base de dados (default) não criada no console Google Cloud. Ative em: https://console.cloud.google.com/datastore/setup?project=${FIREBASE_PROJECT_ID}`,
        lastCheckedIso: new Date().toISOString(),
      };
    } else {
      lastFirestoreHealthCache = {
        projectId: FIREBASE_PROJECT_ID,
        database: '(default)',
        status: 'error',
        statusCode: res.status,
        message: data?.error?.message || `HTTP ${res.status}`,
        lastCheckedIso: new Date().toISOString(),
      };
    }
  } catch (err: any) {
    lastFirestoreHealthCache = {
      projectId: FIREBASE_PROJECT_ID,
      database: '(default)',
      status: 'error',
      statusCode: 0,
      message: err?.message || 'Falha de rede ao consultar o Firestore API.',
      lastCheckedIso: new Date().toISOString(),
    };
  }

  lastFirestoreHealthTimestamp = now;
  return lastFirestoreHealthCache;
}

export async function MirrorDocumentToFirestoreRest(
  collectionName: string,
  docId: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    if (
      (collectionName === 'registrations' ||
        collectionName === 'athletes' ||
        collectionName === 'users' ||
        collectionName === 'profiles') &&
      isPurgedTestRecord(data)
    ) {
      return;
    }

    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    const idToken = await getServerFirebaseIdToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    };
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(
      collectionName
    )}/${encodeURIComponent(docId)}?key=${FIREBASE_API_KEY}`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields }),
    }).catch(() => null);

    if (res && res.status >= 400) {
      appendServerSyncLog({
        category: 'firestore_mirror',
        level: 'warning',
        message: `Mirror ${collectionName}/${docId} Firestore: HTTP ${res.status}`,
      });
    } else if (res && res.ok) {
      appendServerSyncLog({
        category: 'firestore_mirror',
        level: 'info',
        message: `Mirror ${collectionName}/${docId} gravado com sucesso no Cloud Firestore.`,
      });
    }
  } catch {
    // Non-blocking best effort mirror
  }
}

export async function DeleteDocumentFromFirestoreRest(
  collectionName: string,
  docId: string
): Promise<void> {
  try {
    const idToken = await getServerFirebaseIdToken();
    const headers: Record<string, string> = idToken
      ? { Authorization: `Bearer ${idToken}` }
      : {};
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(
      collectionName
    )}/${encodeURIComponent(docId)}?key=${FIREBASE_API_KEY}`;

    const res = await fetch(url, {
      method: 'DELETE',
      headers,
    }).catch(() => null);

    if (res && res.ok) {
      appendServerSyncLog({
        category: 'firestore_mirror',
        level: 'info',
        message: `Delete ${collectionName}/${docId} no Cloud Firestore concluído.`,
      });
    }
  } catch {
    // Non-blocking best effort delete
  }
}

/**
 * Registra o ID de pagamento ou preferência do Mercado Pago na inscrição assim que gerado,
 * permitindo reconciliação automática mesmo se o usuário fechar o modal ou o webhook atrasar.
 */
export async function attachPendingGatewayReferenceOnServer(params: {
  registrationId: string;
  mpPaymentId?: string;
  mpPreferenceId?: string;
  paymentMethod?: 'pix' | 'credit_card';
}): Promise<void> {
  const store = getCloudStore();
  const existing = store.registrations[params.registrationId];
  if (!existing || existing.paymentStatus === 'pago') return;

  const nowIso = new Date().toISOString();
  const updated: Record<string, unknown> = {
    ...existing,
    ...(params.mpPaymentId ? { mpPaymentId: String(params.mpPaymentId) } : {}),
    ...(params.mpPreferenceId ? { mpPreferenceId: String(params.mpPreferenceId) } : {}),
    ...(params.paymentMethod ? { paymentMethod: params.paymentMethod } : {}),
    updatedAtIso: nowIso,
  };
  store.registrations[params.registrationId] = updated;
  saveCloudStore(store);
  await MirrorDocumentToFirestoreRest('registrations', params.registrationId, updated);
}

/**
 * Confirma o pagamento de uma inscrição no servidor de maneira idempotente e auditável.
 */
export async function markRegistrationPaidOnServer(params: {
  registrationId: string;
  mpPaymentId: string;
  paymentMethod: 'pix' | 'credit_card' | 'ticket';
  paidAmount: number;
}): Promise<Record<string, unknown> | null> {
  const store = await ensureCloudStoreHydrated();
  const linkedAthIdInitial = `ath-${params.registrationId}`;
  const fallbackAth = store.athletes[linkedAthIdInitial];
  const existing = store.registrations[params.registrationId] || {
    id: params.registrationId,
    ...(fallbackAth
      ? {
          athleteName: fallbackAth.name,
          athleteEmail: fallbackAth.email,
          teamId: fallbackAth.teamId,
          turma: fallbackAth.turma,
          turmaLabel: fallbackAth.turmaLabel,
          jerseyNumber: fallbackAth.jerseyNumber,
          position: fallbackAth.position,
          instagramHandle: fallbackAth.instagramHandle,
          avatarUrl: fallbackAth.avatarUrl,
          bio: fallbackAth.bio,
          selectedModalities: fallbackAth.modalityIds,
          linkedAthleteId: fallbackAth.id,
        }
      : {}),
  };

  if (
    existing.paymentStatus === 'pago' &&
    existing.mpPaymentId === String(params.mpPaymentId)
  ) {
    appendServerSyncLog({
      category: 'webhook',
      level: 'info',
      message: `Notificação duplicada ignorada (idempotente) para inscrição ${params.registrationId}`,
      details: { registrationId: params.registrationId, mpPaymentId: params.mpPaymentId },
    });
    return existing;
  }

  const nowIso = new Date().toISOString();
  const nextRevision = Number(existing.revision || 0) + 1;
  const qrToken =
    typeof existing.qrValidationToken === 'string' && existing.qrValidationToken
      ? existing.qrValidationToken
      : `INTRAMED-IX-${params.registrationId.toUpperCase()}-VERIFIED`;

  const updated: Record<string, unknown> = {
    ...existing,
    id: params.registrationId,
    eventId: existing.eventId || 'intramed-ix-2026',
    lotId: existing.lotId || 'lote-1-cangaceira',
    modalityId: existing.modalityId || 'todas',
    modalityName: existing.modalityName || 'Passaporte Geral (Todas as 16 Modalidades)',
    categoryName: existing.categoryName || 'Geral',
    athleteName: existing.athleteName || fallbackAth?.name || 'Atleta IntraMed',
    athleteEmail: existing.athleteEmail || fallbackAth?.email || '',
    athletePhone: existing.athletePhone || '',
    athleteDocument: existing.athleteDocument || '',
    memberStatus: existing.memberStatus || 'nao_solicitado',
    authorizedPrice:
      typeof existing.authorizedPrice === 'number' && !Number.isNaN(existing.authorizedPrice)
        ? existing.authorizedPrice
        : params.paidAmount === 64.2
        ? 60
        : params.paidAmount || 60,
    paymentStatus: 'pago',
    paymentMethod: params.paymentMethod,
    mpPaymentId: String(params.mpPaymentId),
    paidAmount: params.paidAmount,
    qrValidationToken: qrToken,
    createdAtIso: existing.createdAtIso || nowIso,
    paidAtIso: nowIso,
    updatedAtIso: nowIso,
    revision: nextRevision,
  };

  store.registrations[params.registrationId] = updated;

  // Atualiza ou cria o atleta vinculado no store e no Firestore
  const linkedAthId =
    (existing.linkedAthleteId as string) || `ath-${params.registrationId}`;
  const defaultAllModalities = [
    'futsal',
    'basquete',
    'handebol',
    'volei',
    'volei-de-praia',
    'truco',
    'sinuca',
    'natacao',
    'poker',
    'tenis-de-mesa',
  ];
  const athleteRecord: Record<string, unknown> = {
    ...(store.athletes[linkedAthId] || {}),
    id: linkedAthId,
    name: String(existing.athleteName || 'Atleta IntraMed'),
    email: String(existing.athleteEmail || ''),
    teamId: String(existing.teamId || ''),
    turma: String(existing.turma || ''),
    turmaLabel: String(existing.turmaLabel || ''),
    categoryName: String(existing.categoryName || 'Geral'),
    gender: String(existing.categoryName || 'Geral'),
    modalityIds:
      Array.isArray(existing.selectedModalities) && existing.selectedModalities.length > 0
        ? existing.selectedModalities
        : Array.isArray(store.athletes[linkedAthId]?.modalityIds) &&
          (store.athletes[linkedAthId]?.modalityIds as unknown[]).length > 0
        ? store.athletes[linkedAthId]?.modalityIds
        : defaultAllModalities,
    jerseyNumber: existing.jerseyNumber ?? null,
    position: (existing.position as string) || 'Atleta Confirmado',
    avatarUrl: (existing.avatarUrl as string) || null,
    bio: (existing.bio as string) || null,
    instagramHandle: (existing.instagramHandle as string) || null,
    registrationId: params.registrationId,
    paymentStatus: 'pago',
    memberStatus: (existing.memberStatus as string) || 'nao_solicitado',
    status: 'confirmado',
    isTestOnly: false,
    updatedAtIso: nowIso,
    revision: Number(store.athletes[linkedAthId]?.revision || 0) + 1,
  };
  store.athletes[linkedAthId] = athleteRecord;
  await MirrorDocumentToFirestoreRest('athletes', linkedAthId, athleteRecord);

  // Remove eventuais inscrições/atletas duplicados pendentes do mesmo e-mail
  const athleteEmail = String(existing.athleteEmail || '').trim().toLowerCase();
  if (athleteEmail) {
    for (const [otherAthId, otherAth] of Object.entries(store.athletes || {})) {
      if (
        otherAthId !== linkedAthId &&
        otherAth &&
        String(otherAth.email || '').trim().toLowerCase() === athleteEmail
      ) {
        if (!athleteRecord.avatarUrl && otherAth.avatarUrl) athleteRecord.avatarUrl = otherAth.avatarUrl;
        if ((athleteRecord.jerseyNumber === null || athleteRecord.jerseyNumber === undefined) && otherAth.jerseyNumber !== null && otherAth.jerseyNumber !== undefined) {
          athleteRecord.jerseyNumber = otherAth.jerseyNumber;
        }
        if (!athleteRecord.instagramHandle && otherAth.instagramHandle) {
          athleteRecord.instagramHandle = otherAth.instagramHandle;
        }
        delete store.athletes[otherAthId];
        void DeleteDocumentFromFirestoreRest('athletes', otherAthId);
      }
    }
    for (const [otherRegId, otherReg] of Object.entries(store.registrations || {})) {
      if (
        otherRegId !== params.registrationId &&
        otherReg &&
        otherReg.paymentStatus !== 'pago' &&
        String(otherReg.athleteEmail || '').trim().toLowerCase() === athleteEmail
      ) {
        delete store.registrations[otherRegId];
        void DeleteDocumentFromFirestoreRest('registrations', otherRegId);
      }
    }
  }

  // Promove o usuário e perfil vinculados para papel 'atleta'
  for (const [, user] of Object.entries(store.users || {})) {
    if (user && (String(user.email || '').trim().toLowerCase() === athleteEmail || user.id === existing.userId)) {
      user.role = 'atleta';
      user.linkedAthleteId = linkedAthId;
      user.registrationId = params.registrationId;
      user.updatedAtIso = nowIso;
      await MirrorDocumentToFirestoreRest('users', String(user.id), user);
      if (store.profiles?.[user.id as string]) {
        const prof = store.profiles[user.id as string];
        prof.role = 'atleta';
        prof.isAthlete = true;
        prof.linkedAthleteId = linkedAthId;
        prof.updatedAtIso = nowIso;
        await MirrorDocumentToFirestoreRest('profiles', String(user.id), prof);
      }
    }
  }

  appendServerSyncLog({
    category: 'payment_reconcile',
    level: 'info',
    message: `Pagamento confirmado automaticamente (${params.paymentMethod.toUpperCase()} - R$ ${params.paidAmount.toFixed(2)}) para ${String(existing.athleteName || params.registrationId)}`,
    details: {
      registrationId: params.registrationId,
      mpPaymentId: params.mpPaymentId,
      paidAmount: params.paidAmount,
    },
  });

  saveCloudStore(store);
  await MirrorDocumentToFirestoreRest(
    'registrations',
    params.registrationId,
    updated
  );
  return updated;
}

/**
 * Trata pagamentos estornados, cancelados ou recusados pelo Mercado Pago.
 * Se uma inscrição estava paga e sofreu estorno/chargeback, reverte a habilitação do atleta.
 */
export async function handleNonApprovedPaymentStatusOnServer(params: {
  registrationId: string;
  mpPaymentId: string;
  mpStatus: string;
  statusDetail?: string;
}): Promise<Record<string, unknown> | null> {
  const store = getCloudStore();
  const existing = store.registrations[params.registrationId];
  if (!existing) return null;

  const nowIso = new Date().toISOString();
  const isRefundOrChargeback =
    params.mpStatus === 'refunded' || params.mpStatus === 'charged_back';
  const isRejectedOrCancelled =
    params.mpStatus === 'rejected' || params.mpStatus === 'cancelled';

  // Se já está pago por OUTRO pagamento legítimo e este que cancelou é apenas um QR code antigo expirado, não desativa!
  if (
    existing.paymentStatus === 'pago' &&
    isRejectedOrCancelled &&
    existing.mpPaymentId &&
    String(existing.mpPaymentId) !== String(params.mpPaymentId)
  ) {
    return existing;
  }

  let nextPaymentStatus = String(existing.paymentStatus || 'pendente');
  if (isRefundOrChargeback) {
    nextPaymentStatus = 'cancelado';
  } else if (isRejectedOrCancelled && existing.paymentStatus !== 'pago') {
    nextPaymentStatus = 'pendente';
  }

  const nextRevision = Number(existing.revision || 0) + 1;
  const updated: Record<string, unknown> = {
    ...existing,
    mpPaymentId: String(params.mpPaymentId),
    mpLastGatewayStatus: params.mpStatus,
    mpLastStatusDetail: params.statusDetail || '',
    paymentStatus: nextPaymentStatus,
    ...(isRefundOrChargeback ? { qrValidationToken: undefined } : {}),
    updatedAtIso: nowIso,
    revision: nextRevision,
  };

  store.registrations[params.registrationId] = updated;

  if (isRefundOrChargeback) {
    const linkedAthId =
      (existing.linkedAthleteId as string) || `ath-${params.registrationId}`;
    if (store.athletes[linkedAthId]) {
      store.athletes[linkedAthId] = {
        ...store.athletes[linkedAthId],
        paymentStatus: 'cancelado',
        status: 'pendente',
        updatedAtIso: nowIso,
        revision: Number(store.athletes[linkedAthId].revision || 0) + 1,
      };
      await MirrorDocumentToFirestoreRest('athletes', linkedAthId, store.athletes[linkedAthId]);
    }
  }

  appendServerSyncLog({
    category: 'payment_reconcile',
    level: isRefundOrChargeback ? 'warning' : 'info',
    message: `Status Mercado Pago [${params.mpStatus}] registrado para inscrição ${params.registrationId}`,
    details: {
      registrationId: params.registrationId,
      mpPaymentId: params.mpPaymentId,
      mpStatus: params.mpStatus,
      nextPaymentStatus,
    },
  });

  saveCloudStore(store);
  await MirrorDocumentToFirestoreRest('registrations', params.registrationId, updated);
  return updated;
}
