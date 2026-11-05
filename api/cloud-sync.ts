import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

const CLOUD_STATE_FILE = path.join('/tmp', 'intramed_ix_cloud_sync_v1.json');

interface CloudCollectionMap {
  registrations: Record<string, Record<string, unknown>>;
  athletes: Record<string, Record<string, unknown>>;
  teams: Record<string, Record<string, unknown>>;
  matches: Record<string, Record<string, unknown>>;
  match_sheets: Record<string, Record<string, unknown>>;
  updatedAtIso: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __INTRAMED_CLOUD_STORE__: CloudCollectionMap | undefined;
}

function getCloudStore(): CloudCollectionMap {
  if (global.__INTRAMED_CLOUD_STORE__) {
    return global.__INTRAMED_CLOUD_STORE__;
  }

  try {
    if (fs.existsSync(CLOUD_STATE_FILE)) {
      const raw = fs.readFileSync(CLOUD_STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as CloudCollectionMap;
      if (parsed && typeof parsed === 'object') {
        global.__INTRAMED_CLOUD_STORE__ = {
          registrations: parsed.registrations || {},
          athletes: parsed.athletes || {},
          teams: parsed.teams || {},
          matches: parsed.matches || {},
          match_sheets: parsed.match_sheets || {},
          updatedAtIso: parsed.updatedAtIso || new Date().toISOString(),
        };
        return global.__INTRAMED_CLOUD_STORE__;
      }
    }
  } catch {
    // Ignore file read errors
  }

  global.__INTRAMED_CLOUD_STORE__ = {
    registrations: {},
    athletes: {},
    teams: {},
    matches: {},
    match_sheets: {},
    updatedAtIso: new Date().toISOString(),
  };
  return global.__INTRAMED_CLOUD_STORE__;
}

function saveCloudStore(store: CloudCollectionMap) {
  store.updatedAtIso = new Date().toISOString();
  global.__INTRAMED_CLOUD_STORE__ = store;
  try {
    fs.writeFileSync(CLOUD_STATE_FILE, JSON.stringify(store), 'utf-8');
  } catch {
    // Ignore tmp write errors
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Intramed-Proxy');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Garante que os dois domínios (intramed-ix.vercel.app e intramedix.vercel.app)
  // compartilhem exatamente a mesma base centralizada em intramedix.vercel.app
  const host = String(req.headers.host || '');
  const isProxied = req.headers['x-intramed-proxy'] === '1';
  if (host.includes('intramed-ix.vercel.app') && !isProxied) {
    try {
      const targetUrl = 'https://intramedix.vercel.app/api/cloud-sync';
      const proxyRes = await fetch(targetUrl, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Intramed-Proxy': '1',
        },
        body: req.method === 'POST' ? JSON.stringify(req.body || {}) : undefined,
      });
      const proxyData = await proxyRes.json();
      return res.status(proxyRes.status).json(proxyData);
    } catch {
      // Continua localmente caso falhe
    }
  }

  const store = getCloudStore();

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      updatedAtIso: store.updatedAtIso,
      registrations: Object.values(store.registrations),
      athletes: Object.values(store.athletes),
      teams: Object.values(store.teams),
      matches: Object.values(store.matches),
      match_sheets: Object.values(store.match_sheets),
    });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const { collectionName, docId, data, batch } = body;

    if (Array.isArray(batch)) {
      for (const item of batch) {
        const col = item?.collectionName as keyof Omit<CloudCollectionMap, 'updatedAtIso'>;
        const id = item?.docId as string;
        const payload = item?.data as Record<string, unknown>;
        if (col && id && payload && store[col]) {
          store[col][id] = {
            ...(store[col][id] || {}),
            ...payload,
            id,
          };
        }
      }
      saveCloudStore(store);
      return res.status(200).json({
        success: true,
        updatedAtIso: store.updatedAtIso,
      });
    }

    const col = collectionName as keyof Omit<CloudCollectionMap, 'updatedAtIso'>;
    if (col && docId && data && store[col]) {
      store[col][String(docId)] = {
        ...(store[col][String(docId)] || {}),
        ...(data as Record<string, unknown>),
        id: String(docId),
      };
      saveCloudStore(store);
      return res.status(200).json({
        success: true,
        updatedAtIso: store.updatedAtIso,
      });
    }

    return res.status(400).json({ error: 'Payload inválido para sincronização.' });
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}
