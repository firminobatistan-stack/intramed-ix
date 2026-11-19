/**
 * Gerenciador de Fila Offline e Sincronização Resiliente (Item 6 dos Requisitos)
 * Persiste mutações locais no localStorage para garantir que nada se perca em caso de
 * perda de conexão, instabilidade de rede ou encerramento de aba.
 */

export interface QueuedSyncItem {
  id: string;
  collectionName: 'registrations' | 'athletes' | 'teams' | 'matches' | 'match_sheets';
  docId: string;
  data: Record<string, unknown>;
  attempts: number;
  lastAttemptIso?: string;
  createdAtIso: string;
  lastError?: string;
}

const OFFLINE_QUEUE_STORAGE_KEY = 'intramed_offline_sync_queue_v2';
const QUEUE_CHANGE_EVENT = 'intramed-offline-queue-changed';

function loadQueueFromStorage(): QueuedSyncItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueueToStorage(queue: QueuedSyncItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(queue));
    window.dispatchEvent(
      new CustomEvent(QUEUE_CHANGE_EVENT, { detail: { count: queue.length } })
    );
  } catch {
    // Quota ou indisponibilidade
  }
}

export function getPendingQueueCount(): number {
  return loadQueueFromStorage().length;
}

export function getPendingQueueItems(): QueuedSyncItem[] {
  return loadQueueFromStorage();
}

export function enqueueOfflineMutation(
  collectionName: QueuedSyncItem['collectionName'],
  docId: string,
  data: unknown
): void {
  if (!collectionName || !docId || !data) return;
  const queue = loadQueueFromStorage();
  const cleanData = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;

  // Deduplicação: se já existe item para a mesma coleção e docId, substitui com a versão mais recente
  const existingIdx = queue.findIndex(
    (item) => item.collectionName === collectionName && item.docId === docId
  );

  const nowIso = new Date().toISOString();
  if (existingIdx >= 0) {
    queue[existingIdx] = {
      ...queue[existingIdx],
      data: cleanData,
      lastAttemptIso: undefined,
      lastError: undefined,
    };
  } else {
    queue.push({
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      collectionName,
      docId,
      data: cleanData,
      attempts: 0,
      createdAtIso: nowIso,
    });
  }

  saveQueueToStorage(queue);

  // Se estiver online, tenta descarregar imediatamente
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    void flushOfflineQueue();
  }
}

let isFlushing = false;
let pendingReflush = false;

function removeFlushedItemsPreservingNewer(
  flushedSnapshots: Map<string, string>,
  failedIds: Set<string>,
  updatedFailedMap: Map<string, QueuedSyncItem>
): number {
  const liveQueue = loadQueueFromStorage();
  const nextQueue: QueuedSyncItem[] = [];

  for (const liveItem of liveQueue) {
    const key = `${liveItem.collectionName}/${liveItem.docId}`;
    if (!flushedSnapshots.has(key)) {
      // Added while flush was in progress — preserve!
      nextQueue.push(liveItem);
      continue;
    }
    const serializedLive = JSON.stringify(liveItem.data);
    if (serializedLive !== flushedSnapshots.get(key)) {
      // Updated while flush was in progress — preserve latest version!
      nextQueue.push(liveItem);
      continue;
    }
    if (failedIds.has(key) && updatedFailedMap.has(key)) {
      nextQueue.push(updatedFailedMap.get(key)!);
    }
  }

  saveQueueToStorage(nextQueue);
  return nextQueue.length;
}

export async function flushOfflineQueue(operatorToken?: string | null): Promise<{
  flushedCount: number;
  remainingCount: number;
  errors: string[];
}> {
  if (typeof window === 'undefined') {
    return { flushedCount: 0, remainingCount: 0, errors: [] };
  }
  if (isFlushing) {
    pendingReflush = true;
    return { flushedCount: 0, remainingCount: getPendingQueueCount(), errors: [] };
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { flushedCount: 0, remainingCount: getPendingQueueCount(), errors: ['Dispositivo offline'] };
  }

  const queue = loadQueueFromStorage();
  if (queue.length === 0) {
    return { flushedCount: 0, remainingCount: 0, errors: [] };
  }

  isFlushing = true;
  pendingReflush = false;
  const flushedSnapshots = new Map<string, string>(
    queue.map((item) => [`${item.collectionName}/${item.docId}`, JSON.stringify(item.data)])
  );
  const failedIds = new Set<string>();
  const updatedFailedMap = new Map<string, QueuedSyncItem>();
  const errors: string[] = [];
  let flushedCount = 0;

  try {
    const token =
      operatorToken ||
      sessionStorage.getItem('intramed_operator_jwt') ||
      localStorage.getItem('intramed_operator_jwt') ||
      '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Se houver mais de 1 item, tenta sincronização em lote (Batch)
    let batchSucceeded = false;
    if (queue.length > 1) {
      const batchPayload = queue.map((item) => ({
        collectionName: item.collectionName,
        docId: item.docId,
        data: item.data,
      }));

      try {
        const res = await fetch('/api/cloud-sync', {
          method: 'POST',
          headers,
          body: JSON.stringify({ batch: batchPayload }),
        });

        if (res.ok) {
          flushedCount = queue.length;
          batchSucceeded = true;
        }
      } catch (batchErr) {
        console.warn('[Offline Queue] Batch falhou, tentando envio individual...', batchErr);
      }
    }

    if (!batchSucceeded) {
      // Envio individual item a item
      for (const item of queue) {
        const key = `${item.collectionName}/${item.docId}`;
        try {
          const res = await fetch('/api/cloud-sync', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              collectionName: item.collectionName,
              docId: item.docId,
              data: item.data,
            }),
          });

          if (res.ok) {
            flushedCount++;
          } else {
            const errData = await res.json().catch(() => ({}));
            const errMsg = typeof errData?.error === 'string' ? errData.error : `HTTP ${res.status}`;
            if (res.status === 403 || res.status === 400) {
              item.attempts++;
              item.lastError = errMsg;
              if (item.attempts < 4) {
                failedIds.add(key);
                updatedFailedMap.set(key, item);
              }
            } else {
              item.attempts++;
              item.lastAttemptIso = new Date().toISOString();
              item.lastError = errMsg;
              failedIds.add(key);
              updatedFailedMap.set(key, item);
            }
            errors.push(`${key}: ${errMsg}`);
          }
        } catch {
          item.attempts++;
          item.lastAttemptIso = new Date().toISOString();
          item.lastError = 'Falha de conexão com o servidor';
          failedIds.add(key);
          updatedFailedMap.set(key, item);
          errors.push(`${key}: Sem rede`);
          break;
        }
      }
    }

    const remaining = removeFlushedItemsPreservingNewer(
      flushedSnapshots,
      failedIds,
      updatedFailedMap
    );
    if (remaining > 0 && errors.length === 0) {
      pendingReflush = true;
    }
  } finally {
    isFlushing = false;
    if (pendingReflush || (errors.length === 0 && getPendingQueueCount() > 0)) {
      pendingReflush = false;
      setTimeout(() => {
        void flushOfflineQueue();
      }, 25);
    }
  }

  return {
    flushedCount,
    remainingCount: getPendingQueueCount(),
    errors,
  };
}

// Inicia escutas automáticas no browser
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void flushOfflineQueue();
  });
}
