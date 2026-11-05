import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const CLOUD_STATE_FILE = path.join('/tmp', 'intramed_ix_cloud_sync_v2.json');

export interface CloudCollectionMap {
  registrations: Record<string, Record<string, unknown>>;
  athletes: Record<string, Record<string, unknown>>;
  teams: Record<string, Record<string, unknown>>;
  matches: Record<string, Record<string, unknown>>;
  match_sheets: Record<string, Record<string, unknown>>;
  match_secrets: Record<string, { pinHash: string; pinDisplay?: string; updatedAtIso: string }>;
  updatedAtIso: string;
}

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
    priceMember: 45.0,
    priceNonMember: 80.0,
    isActive: true,
  },
  'lote-2-cangaceira': {
    id: 'lote-2-cangaceira',
    name: '2º Lote Final — IntraMed IX',
    priceMember: 55.0,
    priceNonMember: 95.0,
    isActive: false,
  },
};

export const CARD_FEE_RATE = 0.05; // 5% repasse operadora de cartão

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

// Segredo de assinatura HMAC no servidor (usa variável de ambiente ou deriva do token do MP)
function getServerSigningSecret(): string {
  return (
    process.env.INTRAMED_AUTH_SECRET ||
    process.env.MERCADOPAGO_WEBHOOK_SECRET ||
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
    'intramed-ix-cangaceira-server-secret-2026'
  );
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

export interface SignedOperatorTokenPayload {
  role: 'admin' | 'mesario';
  matchId?: string;
  officialName?: string;
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

export function getCloudStore(): CloudCollectionMap {
  if (global.__INTRAMED_CLOUD_STORE_V2__) {
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
          updatedAtIso: parsed.updatedAtIso || new Date().toISOString(),
        };
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
    updatedAtIso: new Date().toISOString(),
  };
  return global.__INTRAMED_CLOUD_STORE_V2__;
}

export function saveCloudStore(store: CloudCollectionMap) {
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
    )}/${encodeURIComponent(docId)}`;

    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    }).catch(() => {});
  } catch {
    // Non-blocking best effort mirror
  }
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
    return existing;
  }

  const nowIso = new Date().toISOString();
  const nextRevision = Number(existing.revision || 0) + 1;

  const updated: Record<string, unknown> = {
    ...existing,
    id: params.registrationId,
    paymentStatus: 'pago',
    paymentMethod: params.paymentMethod,
    mpPaymentId: String(params.mpPaymentId),
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
      updatedAtIso: nowIso,
    };
  }

  saveCloudStore(store);
  await MirrorDocumentToFirestoreRest(
    'registrations',
    params.registrationId,
    updated
  );
  return updated;
}
