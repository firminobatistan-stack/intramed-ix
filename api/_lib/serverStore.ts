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
  '#33 firmino',
];

export function isPurgedTestRecord(rec: Record<string, unknown> | null | undefined): boolean {
  if (!rec || typeof rec !== 'object') return false;
  const id = String(rec.id || '').trim().toLowerCase();
  const userId = String(rec.userId || '').trim().toLowerCase();
  const name = String(rec.athleteName || rec.displayName || rec.name || '').trim().toLowerCase();
  const username = String(rec.accountUsername || '').trim().toLowerCase();

  if (
    id.startsWith('reg-cang-') ||
    id.startsWith('ath-reg-cang-') ||
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
        return { ok: false, error: 'Já existe uma conta cadastrada com este e-mail.' };
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
    isAthlete: Boolean(safePublic.isAthlete || safePublic.linkedAthleteId),
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
        const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(
          colName
        )}?pageSize=300&key=${FIREBASE_API_KEY}`;
        const res = await fetch(url, { headers: authHeaders }).catch(() => null);
        if (!res || !res.ok) return;
        const { data } = await parseJsonSafe(res);
        const docs = Array.isArray(data?.documents)
          ? (data.documents as Array<{
              name?: string;
              fields?: Record<string, Record<string, unknown>>;
            }>)
          : [];
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
  const store = getCloudStore();
  const existing = store.registrations[params.registrationId] || {
    id: params.registrationId,
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
    paymentStatus: 'pago',
    paymentMethod: params.paymentMethod,
    mpPaymentId: String(params.mpPaymentId),
    paidAmount: params.paidAmount,
    qrValidationToken: qrToken,
    paidAtIso: nowIso,
    updatedAtIso: nowIso,
    revision: nextRevision,
  };

  store.registrations[params.registrationId] = updated;

  // Atualiza ou cria o atleta vinculado no store e no Firestore
  const linkedAthId =
    (existing.linkedAthleteId as string) || `ath-${params.registrationId}`;
  const athleteRecord: Record<string, unknown> = {
    ...(store.athletes[linkedAthId] || {}),
    id: linkedAthId,
    name: String(existing.athleteName || 'Atleta IntraMed'),
    email: String(existing.athleteEmail || ''),
    teamId: String(existing.teamId || ''),
    turma: String(existing.turma || ''),
    turmaLabel: String(existing.turmaLabel || ''),
    jerseyNumber: existing.jerseyNumber ?? null,
    position: (existing.position as string) || 'Atleta Confirmado',
    avatarUrl: (existing.avatarUrl as string) || null,
    bio: (existing.bio as string) || null,
    instagramHandle: (existing.instagramHandle as string) || null,
    registrationId: params.registrationId,
    paymentStatus: 'pago',
    memberStatus: (existing.memberStatus as string) || 'nao_solicitado',
    status: 'confirmado',
    updatedAtIso: nowIso,
    revision: Number(store.athletes[linkedAthId]?.revision || 0) + 1,
  };
  store.athletes[linkedAthId] = athleteRecord;
  await MirrorDocumentToFirestoreRest('athletes', linkedAthId, athleteRecord);

  // Promove o usuário e perfil vinculados para papel 'atleta'
  const athleteEmail = String(existing.athleteEmail || '').trim().toLowerCase();
  for (const [uid, user] of Object.entries(store.users || {})) {
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
