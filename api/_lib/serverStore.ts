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
  publicLaunchMode: true,
  publicLoginEnabled: false,
  publicRegistrationEnabled: false,
  publicPaymentsEnabled: false,
  publicPricesVisible: false,
  bracketPublished: true,
  publicProfilesVisible: true,
  announcementTitle: 'ACESSO EM BREVE',
  announcementMessage:
    'Estamos preparando a área de participantes do IntraMed. Em breve, você poderá criar sua conta e acompanhar sua participação no evento diretamente pela plataforma. Enquanto isso, continue acompanhando as informações e o chaveamento por aqui.',
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
  admin_users?: Record<string, Record<string, unknown>>;
  admin_audit_logs?: AdminActionAuditLog[];
  sync_logs?: SyncDiagnosticLogEntry[];
  launch_config?: PublicLaunchConfig;
  brackets?: Record<string, Record<string, unknown>>;
  hydratedFromFirestoreAtIso?: string;
  updatedAtIso: string;
}

export const MASTER_MODERATOR_EMAIL = 'cangaceira@uema.com';

declare global {
  // eslint-disable-next-line no-var
  var __INTRAMED_CLOUD_STORE_V2__: CloudCollectionMap | undefined;
}

// Configura preços oficiais centralizados no servidor (Item 5 e 38 da Auditoria)
export const OFFICIAL_SERVER_LOTS: Record<
  string,
  { id: string; name: string; priceMember: number; priceNonMember: number; isActive: boolean }
> = {
  'lote-1-cangaceira': {
    id: 'lote-1-cangaceira',
    name: '1º Lote Oficial — IntraMed IX',
    priceMember: 55.0,
    priceNonMember: 65.0,
    isActive: true,
  },
  'lote-2-cangaceira': {
    id: 'lote-2-cangaceira',
    name: '2º Lote Final — IntraMed IX',
    priceMember: 65.0,
    priceNonMember: 80.0,
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
  requestedMemberDiscount?: boolean
): number {
  const lot =
    (lotId && OFFICIAL_SERVER_LOTS[lotId]) ||
    OFFICIAL_SERVER_LOTS['lote-1-cangaceira'];
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
    if (!store.matches[m.id]) {
      store.matches[m.id] = m as unknown as Record<string, unknown>;
    }
  }

  if (!store.brackets) store.brackets = {};
  for (const [k, v] of Object.entries(OFFICIAL_UNIVERSAL_BRACKETS)) {
    if (!store.brackets[k]) {
      store.brackets[k] = v as unknown as Record<string, unknown>;
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
export async function ensureCloudStoreHydrated(): Promise<CloudCollectionMap> {
  const store = getCloudStore();
  const hasData =
    Object.keys(store.registrations).length > 0 ||
    Object.keys(store.matches).length > 0 ||
    Object.keys(store.match_sheets).length > 0;

  if (hasData || store.hydratedFromFirestoreAtIso) {
    return store;
  }

  store.hydratedFromFirestoreAtIso = new Date().toISOString();
  const collectionsToHydrate: Array<
    'registrations' | 'athletes' | 'teams' | 'matches' | 'match_sheets' | 'admin_users' | 'users' | 'profiles'
  > = ['registrations', 'athletes', 'teams', 'matches', 'match_sheets', 'admin_users', 'users', 'profiles'];

  try {
    await Promise.all(
      collectionsToHydrate.map(async (colName) => {
        const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(
          colName
        )}?pageSize=300&key=${FIREBASE_API_KEY}`;
        const res = await fetch(url).catch(() => null);
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
            } else if (!store[colName][docId]) {
              store[colName][docId] = { ...parsedDoc, id: docId };
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
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/system_config?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, { method: 'GET' });
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
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(
      collectionName
    )}/${encodeURIComponent(docId)}?key=${FIREBASE_API_KEY}`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    }).catch(() => null);

    if (res && res.status >= 400) {
      appendServerSyncLog({
        category: 'firestore_mirror',
        message: `Mirror ${collectionName}/${docId} Firestore: HTTP ${res.status} (banco pendente de ativação no console)`,
      });
    } else if (res && res.ok) {
      appendServerSyncLog({
        category: 'firestore_mirror',
        message: `Mirror ${collectionName}/${docId} gravado com sucesso no Cloud Firestore.`,
      });
    }
  } catch {
    // Non-blocking best effort mirror
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

  // Atualiza também o atleta vinculado, se já existir no store
  const linkedAthId =
    (existing.linkedAthleteId as string) || `ath-${params.registrationId}`;
  if (store.athletes[linkedAthId]) {
    store.athletes[linkedAthId] = {
      ...store.athletes[linkedAthId],
      paymentStatus: 'pago',
      status: 'confirmado',
      updatedAtIso: nowIso,
      revision: Number(store.athletes[linkedAthId].revision || 0) + 1,
    };
    void MirrorDocumentToFirestoreRest('athletes', linkedAthId, store.athletes[linkedAthId]);
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
      void MirrorDocumentToFirestoreRest('athletes', linkedAthId, store.athletes[linkedAthId]);
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
