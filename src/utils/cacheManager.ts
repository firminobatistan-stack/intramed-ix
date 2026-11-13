/**
 * Gerenciador de Cache Centralizado & Invalidação de Versão do IntraMed IX
 * Garante que dados locais obsoletos não mascarem a base central (Firebase e Vercel Hub).
 */

export const CURRENT_APP_CACHE_VERSION = '2.3.0-centralized-firebase-clean';
const CACHE_VERSION_KEY = 'intramed_cache_version';
const OFFLINE_QUEUE_KEY = 'intramed_offline_sync_queue_v2';

const PURGED_TEST_NAMES_LOWER = [
  'gabriel medeiros',
  'beatriz vasconcelos',
  'lucas albuquerque',
  'gvsvsadv',
  'nskaangaba',
  '#33 firmino',
];

export function isPurgedTestEntity(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false;
  const rec = item as Record<string, unknown>;
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

export interface CacheIntegrityReport {
  version: string;
  isVersionCurrent: boolean;
  hasPendingQueue: boolean;
  pendingQueueCount: number;
  localStorageKeysCount: number;
  cachesCleaned: boolean;
  lastValidatedIso: string;
}

/**
 * Inicializa a verificação de versão do cache local na inicialização da aplicação.
 * Se a versão for incompatível ou antiga, purga caches obsoletos sem perder
 * dados da fila offline nem credenciais de sessão.
 */
export async function initializeCacheManager(): Promise<CacheIntegrityReport> {
  if (typeof window === 'undefined') {
    return {
      version: CURRENT_APP_CACHE_VERSION,
      isVersionCurrent: true,
      hasPendingQueue: false,
      pendingQueueCount: 0,
      localStorageKeysCount: 0,
      cachesCleaned: false,
      lastValidatedIso: new Date().toISOString(),
    };
  }

  let cachesCleaned = false;
  const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);

  if (storedVersion !== CURRENT_APP_CACHE_VERSION) {
    // Preserva dados críticos que nunca devem ser perdidos
    const offlineQueue = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const adminSession = localStorage.getItem('intramed_admin_session');
    const operatorToken = localStorage.getItem('intramed_operator_token');
    const operatorJwt = localStorage.getItem('intramed_operator_jwt');
    const unlockedMatches = sessionStorage.getItem('intramed_unlocked_match_ids');
    const myRegistrations = localStorage.getItem('intramed_my_registered_ids_v1');

    // Chaves antigas ou obsoletas de versões anteriores a serem limpas
    const obsoleteKeys = [
      'intramed_state_v1',
      'intramed_registrations_v1',
      'intramed_test_state',
      'intramed_matches_cache',
      'intramed_brackets_cache',
      'intramed_dev_workbench',
    ];

    for (const key of obsoleteKeys) {
      localStorage.removeItem(key);
    }

    // Expurga registros de teste (gvsvsadv, nskaangaba, firmino) do localStorage e da fila offline em todos os aparelhos
    try {
      const savedStateRaw = localStorage.getItem('intramed_ix_live_engine_v3');
      if (savedStateRaw) {
        const parsedState = JSON.parse(savedStateRaw);
        if (parsedState && typeof parsedState === 'object') {
          if (Array.isArray(parsedState.officialAthletes)) {
            parsedState.officialAthletes = parsedState.officialAthletes.filter(
              (a: unknown) => !isPurgedTestEntity(a)
            );
          }
          if (Array.isArray(parsedState.publicProfiles)) {
            parsedState.publicProfiles = parsedState.publicProfiles.filter(
              (p: unknown) => !isPurgedTestEntity(p)
            );
          }
          if (parsedState.currentUser && isPurgedTestEntity(parsedState.currentUser)) {
            parsedState.currentUser = null;
          }
          localStorage.setItem('intramed_ix_live_engine_v3', JSON.stringify(parsedState));
        }
      }
    } catch {}

    try {
      const savedRegsRaw = localStorage.getItem('intramed_registrations_store_v1');
      if (savedRegsRaw) {
        const parsedRegs = JSON.parse(savedRegsRaw);
        if (parsedRegs && Array.isArray(parsedRegs.registrations)) {
          parsedRegs.registrations = parsedRegs.registrations.filter(
            (r: unknown) => !isPurgedTestEntity(r)
          );
          localStorage.setItem('intramed_registrations_store_v1', JSON.stringify(parsedRegs));
        }
      }
    } catch {}

    // Invalida e limpa Cache Storage do navegador se existir
    if ('caches' in window) {
      try {
        const cacheNames = await window.caches.keys();
        await Promise.all(cacheNames.map((name) => window.caches.delete(name)));
        cachesCleaned = true;
      } catch {
        // Silencioso em caso de restrição de sandbox
      }
    }

    // Desregistra Service Workers legados ou conflitantes se houver
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          // Desregistra para evitar que assets em cache mascarem o backend atualizado
          await registration.unregister();
          cachesCleaned = true;
        }
      } catch {
        // Silencioso
      }
    }

    // Restaura chaves preservadas (filtrando a fila offline para remover qualquer item de teste)
    if (offlineQueue) {
      try {
        const parsedQueue = JSON.parse(offlineQueue);
        if (Array.isArray(parsedQueue)) {
          const cleanQueue = parsedQueue.filter(
            (q: any) => !isPurgedTestEntity(q?.data)
          );
          localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(cleanQueue));
        } else {
          localStorage.setItem(OFFLINE_QUEUE_KEY, offlineQueue);
        }
      } catch {
        localStorage.setItem(OFFLINE_QUEUE_KEY, offlineQueue);
      }
    }
    if (adminSession) localStorage.setItem('intramed_admin_session', adminSession);
    if (operatorToken) localStorage.setItem('intramed_operator_token', operatorToken);
    if (operatorJwt) localStorage.setItem('intramed_operator_jwt', operatorJwt);
    if (unlockedMatches) sessionStorage.setItem('intramed_unlocked_match_ids', unlockedMatches);
    if (myRegistrations) localStorage.setItem('intramed_my_registered_ids_v1', myRegistrations);

    localStorage.setItem(CACHE_VERSION_KEY, CURRENT_APP_CACHE_VERSION);
  }

  const queueRaw = localStorage.getItem(OFFLINE_QUEUE_KEY);
  let pendingCount = 0;
  try {
    const parsed = JSON.parse(queueRaw || '[]');
    pendingCount = Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    pendingCount = 0;
  }

  return {
    version: CURRENT_APP_CACHE_VERSION,
    isVersionCurrent: true,
    hasPendingQueue: pendingCount > 0,
    pendingQueueCount: pendingCount,
    localStorageKeysCount: Object.keys(localStorage).length,
    cachesCleaned,
    lastValidatedIso: new Date().toISOString(),
  };
}

/**
 * Limpa caches de dados do navegador (preservando autenticação e fila pendente)
 * e força recarregamento transparente da base central.
 */
export async function clearLocalDataCaches(preserveAuth = true): Promise<void> {
  if (typeof window === 'undefined') return;

  const authKeys = [
    'intramed_admin_session',
    'intramed_operator_token',
    'intramed_operator_jwt',
    'intramed_my_registered_ids_v1',
    OFFLINE_QUEUE_KEY,
  ];

  const savedAuth: Record<string, string> = {};
  if (preserveAuth) {
    for (const k of authKeys) {
      const v = localStorage.getItem(k);
      if (v) savedAuth[k] = v;
    }
  }

  // Remove estado local de competição e inscrições
  localStorage.removeItem('intramed_ix_live_engine_v3');
  localStorage.removeItem('intramed_registrations_store_v1');

  if ('caches' in window) {
    try {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k)));
    } catch {}
  }

  if (preserveAuth) {
    for (const [k, v] of Object.entries(savedAuth)) {
      localStorage.setItem(k, v);
    }
  }
}
