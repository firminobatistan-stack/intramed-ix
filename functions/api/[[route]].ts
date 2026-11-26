import cloudSyncHandler from '../../api/cloud-sync';
import eventsHandler from '../../api/events';
import mpCheckPaymentHandler from '../../api/mercadopago/check-payment';
import mpCreatePixHandler from '../../api/mercadopago/create-pix';
import mpCreatePreferenceHandler from '../../api/mercadopago/create-preference';
import mpWebhookHandler from '../../api/mercadopago/webhook';

type ApiHandler = (req: any, res: any) => Promise<any> | any;

const API_ROUTES: Record<string, ApiHandler> = {
  '/api/cloud-sync': cloudSyncHandler,
  '/api/events': eventsHandler,
  '/api/mercadopago/check-payment': mpCheckPaymentHandler,
  '/api/mercadopago/create-pix': mpCreatePixHandler,
  '/api/mercadopago/create-preference': mpCreatePreferenceHandler,
  '/api/mercadopago/webhook': mpWebhookHandler,
};

export const onRequest = async (context: {
  request: Request;
  env: Record<string, unknown>;
}): Promise<Response> => {
  const { request, env } = context;

  // Propaga variáveis de ambiente do Cloudflare Pages para process.env
  if (env && typeof env === 'object' && typeof process !== 'undefined' && process.env) {
    for (const [k, v] of Object.entries(env)) {
      if (typeof v === 'string' && !process.env[k]) {
        process.env[k] = v;
      }
    }
  }

  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const handler = API_ROUTES[pathname];

  if (!handler) {
    return new Response(JSON.stringify({ error: 'Rota de API não encontrada.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const headersObj: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headersObj[key.toLowerCase()] = value;
  });
  if (!headersObj.host) {
    headersObj.host = url.host;
  }

  const query: Record<string, string | string[]> = {};
  for (const [k, v] of url.searchParams.entries()) {
    if (k in query) {
      const prev = query[k];
      query[k] = Array.isArray(prev) ? [...prev, v] : [prev, v];
    } else {
      query[k] = v;
    }
  }

  let body: unknown = undefined;
  const method = request.method.toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const rawText = await request.text();
    if (rawText.length > 0) {
      const ct = (headersObj['content-type'] || '').toLowerCase();
      if (
        ct.includes('application/json') ||
        rawText.trim().startsWith('{') ||
        rawText.trim().startsWith('[')
      ) {
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

  const compatReq: any = {
    method,
    url: url.pathname + url.search,
    headers: headersObj,
    query,
    body,
    cookies: {},
  };

  let statusCode = 200;
  const respHeaders = new Headers();
  let responseBody: BodyInit | null = null;
  let finalized = false;

  const compatRes: any = {
    setHeader(name: string, value: string | string[]) {
      if (Array.isArray(value)) {
        respHeaders.delete(name);
        for (const v of value) respHeaders.append(name, v);
      } else {
        respHeaders.set(name, String(value));
      }
      return compatRes;
    },
    getHeader(name: string) {
      return respHeaders.get(name) ?? undefined;
    },
    status(code: number) {
      statusCode = code;
      return compatRes;
    },
    json(payload: unknown) {
      if (!finalized) {
        finalized = true;
        if (!respHeaders.has('Content-Type')) {
          respHeaders.set('Content-Type', 'application/json; charset=utf-8');
        }
        responseBody = JSON.stringify(payload);
      }
      return compatRes;
    },
    send(payload: unknown) {
      if (!finalized) {
        finalized = true;
        if (payload === undefined || payload === null) {
          responseBody = null;
        } else if (typeof payload === 'object' && !(payload instanceof Uint8Array)) {
          if (!respHeaders.has('Content-Type')) {
            respHeaders.set('Content-Type', 'application/json; charset=utf-8');
          }
          responseBody = JSON.stringify(payload);
        } else {
          if (!respHeaders.has('Content-Type')) {
            respHeaders.set('Content-Type', 'text/plain; charset=utf-8');
          }
          responseBody = payload as BodyInit;
        }
      }
      return compatRes;
    },
    end(payload?: unknown) {
      if (!finalized) {
        finalized = true;
        if (payload !== undefined && payload !== null) {
          responseBody = payload as BodyInit;
        }
      }
      return compatRes;
    },
  };

  try {
    await handler(compatReq, compatRes);
    return new Response(responseBody, {
      status: statusCode,
      headers: respHeaders,
    });
  } catch (err: any) {
    console.error('[Cloudflare Pages Function Error]', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Erro interno no servidor.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
};
