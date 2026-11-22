import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

import cloudSyncHandler from './api/cloud-sync.js';
import eventsHandler from './api/events.js';
import mpCheckPaymentHandler from './api/mercadopago/check-payment.js';
import mpCreatePixHandler from './api/mercadopago/create-pix.js';
import mpCreatePreferenceHandler from './api/mercadopago/create-preference.js';
import mpWebhookHandler from './api/mercadopago/webhook.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const PORT = Number(process.env.PORT || 10000);

type ApiHandler = (req: any, res: any) => Promise<any> | any;

const API_ROUTES: Record<string, ApiHandler> = {
  '/api/cloud-sync': cloudSyncHandler,
  '/api/events': eventsHandler,
  '/api/mercadopago/check-payment': mpCheckPaymentHandler,
  '/api/mercadopago/create-pix': mpCreatePixHandler,
  '/api/mercadopago/create-preference': mpCreatePreferenceHandler,
  '/api/mercadopago/webhook': mpWebhookHandler,
};

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

const COMPRESSIBLE_EXTS = new Set([
  '.html',
  '.js',
  '.mjs',
  '.css',
  '.json',
  '.svg',
  '.txt',
  '.webmanifest',
]);

function readRawBody(req: http.IncomingMessage, maxBytes = 20 * 1024 * 1024): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sendWithOptionalGzip(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  statusCode: number,
  body: Buffer | string,
  contentType?: string
) {
  const buf = typeof body === 'string' ? Buffer.from(body, 'utf-8') : body;
  if (contentType && !res.getHeader('Content-Type')) {
    res.setHeader('Content-Type', contentType);
  }
  const acceptEncoding = String(req.headers['accept-encoding'] || '');
  const canGzip =
    buf.length >= 1024 &&
    acceptEncoding.includes('gzip') &&
    (!contentType ||
      contentType.startsWith('text/') ||
      contentType.includes('json') ||
      contentType.includes('javascript') ||
      contentType.includes('svg'));

  if (canGzip) {
    const gz = zlib.gzipSync(buf, { level: zlib.constants.Z_BEST_SPEED });
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Vary', 'Accept-Encoding');
    res.setHeader('Content-Length', String(gz.length));
    res.writeHead(statusCode);
    res.end(gz);
    return;
  }

  res.setHeader('Content-Length', String(buf.length));
  res.writeHead(statusCode);
  res.end(buf);
}

function createVercelCompatibleResponse(
  req: http.IncomingMessage,
  res: http.ServerResponse
) {
  let statusCode = 200;
  let ended = false;

  const compat: any = {
    setHeader(name: string, value: string | string[]) {
      if (!ended) res.setHeader(name, value);
      return compat;
    },
    getHeader(name: string) {
      return res.getHeader(name);
    },
    status(code: number) {
      statusCode = code;
      return compat;
    },
    json(payload: unknown) {
      if (ended) return compat;
      ended = true;
      const body = JSON.stringify(payload);
      sendWithOptionalGzip(req, res, statusCode, body, 'application/json; charset=utf-8');
      return compat;
    },
    send(payload: unknown) {
      if (ended) return compat;
      ended = true;
      if (payload === undefined || payload === null) {
        res.writeHead(statusCode);
        res.end();
        return compat;
      }
      if (Buffer.isBuffer(payload)) {
        sendWithOptionalGzip(req, res, statusCode, payload);
        return compat;
      }
      if (typeof payload === 'object') {
        const body = JSON.stringify(payload);
        sendWithOptionalGzip(req, res, statusCode, body, 'application/json; charset=utf-8');
        return compat;
      }
      const str = String(payload);
      sendWithOptionalGzip(
        req,
        res,
        statusCode,
        str,
        String(res.getHeader('Content-Type') || 'text/plain; charset=utf-8')
      );
      return compat;
    },
    end(payload?: unknown) {
      if (ended) return compat;
      ended = true;
      if (payload !== undefined && payload !== null) {
        const buf = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload));
        res.writeHead(statusCode);
        res.end(buf);
      } else {
        res.writeHead(statusCode);
        res.end();
      }
      return compat;
    },
  };

  return compat;
}

async function handleApiRequest(
  handler: ApiHandler,
  req: http.IncomingMessage,
  res: http.ServerResponse,
  parsedUrl: URL
) {
  const query: Record<string, string | string[]> = {};
  for (const [k, v] of parsedUrl.searchParams.entries()) {
    if (k in query) {
      const prev = query[k];
      query[k] = Array.isArray(prev) ? [...prev, v] : [prev, v];
    } else {
      query[k] = v;
    }
  }

  let body: unknown = undefined;
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const rawBuf = await readRawBody(req);
    if (rawBuf.length > 0) {
      const rawText = rawBuf.toString('utf-8');
      const contentType = String(req.headers['content-type'] || '').toLowerCase();
      if (contentType.includes('application/json') || rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
        try {
          body = JSON.parse(rawText);
        } catch {
          body = rawText;
        }
      } else {
        body = rawText;
      }
    }
  }

  const compatReq: any = Object.assign(req, {
    query,
    body,
    cookies: {},
  });
  const compatRes = createVercelCompatibleResponse(req, res);

  await handler(compatReq, compatRes);
}

function serveStaticFile(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  filePath: string
) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';

  if (filePath.endsWith(`${path.sep}index.html`)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }

  const data = fs.readFileSync(filePath);
  if (COMPRESSIBLE_EXTS.has(ext)) {
    sendWithOptionalGzip(req, res, 200, data, mime);
  } else {
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', String(data.length));
    res.writeHead(200);
    res.end(data);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || 'localhost';
    const parsedUrl = new URL(req.url || '/', `http://${host}`);
    const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';

    const apiHandler = API_ROUTES[pathname];
    if (apiHandler) {
      await handleApiRequest(apiHandler, req, res, parsedUrl);
      return;
    }

    if (pathname.startsWith('/api/')) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Rota de API não encontrada.' }));
      return;
    }

    const safeRel = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '');
    const candidate = path.join(DIST_DIR, safeRel === '/' ? 'index.html' : safeRel);

    if (
      candidate.startsWith(DIST_DIR) &&
      fs.existsSync(candidate) &&
      fs.statSync(candidate).isFile()
    ) {
      serveStaticFile(req, res, candidate);
      return;
    }

    const indexPath = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      serveStaticFile(req, res, indexPath);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Build não encontrado. Execute npm run build.');
  } catch (err: any) {
    console.error('[Render Server Error]', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err?.message || 'Erro interno no servidor.' }));
    }
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`IntraMed IX server listening on http://0.0.0.0:${PORT}`);
});
