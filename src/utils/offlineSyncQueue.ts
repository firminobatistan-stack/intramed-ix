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

export async function flushOfflineQueue(operatorToken?: string | null): Promise<{
  flushedCount: number;
  remainingCount: number;
  errors: string[];
}> {
  if (typeof window === 'undefined' || isFlushing) {
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
  const errors: string[] = [];
  const remainingQueue: QueuedSyncItem[] = [];
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
          saveQueueToStorage([]);
          isFlushing = false;
          return { flushedCount: queue.length, remainingCount: 0, errors: [] };
        }
      } catch (batchErr) {
        // Fallback para envio individual se batch falhar
        console.warn('[Offline Queue] Batch falhou, tentando envio individual...', batchErr);
      }
    }

    // Envio individual item a item
    for (const item of queue) {
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
          // Se for erro definitivo de autorização ou documento inválido após 5 tentativas, descarta
          if (res.status === 403 || res.status === 400) {
            item.attempts++;
            item.lastError = errMsg;
            if (item.attempts < 4) {
              remainingQueue.push(item);
            }
          } else {
            item.attempts++;
            item.lastAttemptIso = new Date().toISOString();
            item.lastError = errMsg;
            remainingQueue.push(item);
          }
          errors.push(`${item.collectionName}/${item.docId}: ${errMsg}`);
        }
      } catch (networkErr) {
        item.attempts++;
        item.lastAttemptIso = new Date().toISOString();
        item.lastError = 'Falha de conexão com o servidor';
        remainingQueue.push(item);
        errors.push(`${item.collectionName}/${item.docId}: Sem rede`);
        break; // Interrompe para não spammar se estiver sem rede
      }
    }

    saveQueueToStorage(remainingQueue);
  } finally {
    isFlushing = false;
  }

  return {
    flushedCount,
    remainingCount: remainingQueue.length,
    errors,
  };
}

// Inicia escutas automáticas no browser
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void flushOfflineQueue();
  });
}
