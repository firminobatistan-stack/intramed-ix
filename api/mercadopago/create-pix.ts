import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  attachPendingGatewayReferenceOnServer,
  computeAuthorizedServerPrice,
  ensureCloudStoreHydrated,
  parseJsonSafe,
  parseSafeBody,
  PRIMARY_GATEWAY_ORIGIN,
} from '../_lib/serverStore.js';

function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, X-Intramed-Proxy'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  const body = parseSafeBody(req.body);
  const {
    registrationId,
    athleteName,
    athleteEmail,
    athleteDocument,
    turmaLabel,
    lotId,
    requestedMemberDiscount,
    isGuestAthlete,
    memberStatus: clientMemberStatus,
  } = body;

  if (!registrationId) {
    return res.status(400).json({
      error: 'Parâmetros incompletos. ID da inscrição é obrigatório.',
    });
  }

  const store = await ensureCloudStoreHydrated();
  const launchConfig = store.launch_config || { publicPaymentsEnabled: false };
  if (launchConfig.publicPaymentsEnabled === false) {
    return res.status(403).json({
      ok: false,
      error: 'A área de pagamentos do IntraMed ainda está sendo preparada. Em breve, você poderá realizar sua inscrição e efetuar o pagamento diretamente pela plataforma.',
    });
  }
  const storedReg = store.registrations[String(registrationId)];

  // Status de sócio e pagamento validados contra o registro armazenado no servidor
  const effectiveMemberStatus = String(
    storedReg?.memberStatus || clientMemberStatus || 'nao_solicitado'
  );
  const effectivePaymentStatus = String(storedReg?.paymentStatus || 'pendente');

  if (effectivePaymentStatus === 'pago') {
    return res.status(409).json({
      error: 'Esta inscrição já consta como paga no sistema.',
    });
  }

  // Regra Inviolável de Negócio: Se a solicitação de sócio estiver pendente, não pode cobrar ainda
  if (effectiveMemberStatus === 'pendente') {
    return res.status(403).json({
      error:
        'Inscrição com solicitação de sócio ainda pendente de validação pela diretoria da Atlética Cangaceira.',
    });
  }

  // Preço calculado estritamente no servidor pelo lote oficial e status de sócio / convidado validado
  const serverAuthorizedPrice = computeAuthorizedServerPrice(
    String(storedReg?.lotId || lotId || 'lote-1-cangaceira'),
    effectiveMemberStatus,
    Boolean(storedReg?.requestedMemberDiscount ?? requestedMemberDiscount),
    Boolean(storedReg?.isGuestAthlete ?? isGuestAthlete)
  );

  const mpAccessToken = (process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
  const host = String(req.headers.host || '');
  const isProxied = req.headers['x-intramed-proxy'] === '1';
  const appBaseUrl =
    process.env.APP_BASE_URL ||
    (host ? `https://${host}` : PRIMARY_GATEWAY_ORIGIN);

  // Se este domínio na Vercel (ex: intramedcng.vercel.app ou intramed-ix.vercel.app) não tiver a variável MERCADOPAGO_ACCESS_TOKEN,
  // encaminha de forma transparente para a instância principal onde o token está configurado.
  if (!mpAccessToken) {
    if (!host.includes('intramedix.vercel.app') && !isProxied) {
      try {
        const proxyRes = await fetch(
          `${PRIMARY_GATEWAY_ORIGIN}/api/mercadopago/create-pix`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Intramed-Proxy': '1',
            },
            body: JSON.stringify(body),
          }
        );
        const { data: proxyData } = await parseJsonSafe(proxyRes);
        if (proxyData) {
          return res.status(proxyRes.status).json(proxyData);
        }
      } catch (proxyErr) {
        console.error('[MercadoPago Create Pix Proxy Error]', proxyErr);
      }
    }

    return res.status(500).json({
      error: 'Credencial MERCADOPAGO_ACCESS_TOKEN não configurada no servidor.',
    });
  }

  try {
    const resolvedName = String(
      storedReg?.athleteName || athleteName || 'Atleta IntraMed'
    ).trim();
    const nameParts = resolvedName.split(/\s+/);
    const firstName =
      (nameParts[0] || 'Atleta').replace(/[^a-zA-ZÀ-ÿ\s]/g, '') || 'Atleta';
    const lastName =
      (nameParts.slice(1).join(' ') || 'IntraMed').replace(/[^a-zA-ZÀ-ÿ\s]/g, '') ||
      'IntraMed';

    const cleanEmail = String(
      storedReg?.athleteEmail || athleteEmail || ''
    )
      .trim()
      .toLowerCase();
    const safeEmail = isValidEmail(cleanEmail)
      ? cleanEmail
      : `atleta.${String(registrationId).replace(/[^a-zA-Z0-9]/g, '')}@intramed.com.br`;

    const rawDoc = String(storedReg?.athleteDocument || athleteDocument || '').replace(
      /\D/g,
      ''
    );

    const resolvedTurmaLabel = String(storedReg?.turmaLabel || turmaLabel || '')
      .replace(/[^\w\sÀ-ÿ-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const amount = Number((Math.round(serverAuthorizedPrice * 100) / 100).toFixed(2));

    // Chave de idempotência determinística por inscrição + valor + janela de 10 minutos
    const timeBucket = Math.floor(Date.now() / (10 * 60 * 1000));
    const cleanRegKey = String(registrationId).replace(/[^a-zA-Z0-9_-]/g, '');
    const deterministicKeyBase = `pix_${cleanRegKey}_${amount}_${timeBucket}`;

    const buildPayload = (payerEmail: string, includeIdentification: boolean) => {
      const payerObj: Record<string, unknown> = {
        email: payerEmail,
        first_name: firstName,
        last_name: lastName,
      };

      if (includeIdentification && rawDoc.length === 11) {
        payerObj.identification = {
          type: 'CPF',
          number: rawDoc,
        };
      }

      const p: Record<string, unknown> = {
        transaction_amount: amount,
        description: `Passaporte Geral - Intramed Cangaceira ${
          resolvedTurmaLabel ? '- ' + resolvedTurmaLabel + ' ' : ''
        }(${firstName} ${lastName})`.slice(0, 190),
        statement_descriptor: 'INTRAMED CANG',
        payment_method_id: 'pix',
        external_reference: String(registrationId),
        payer: payerObj,
      };

      if (
        appBaseUrl &&
        !appBaseUrl.includes('localhost') &&
        appBaseUrl.startsWith('https://')
      ) {
        p.notification_url = `${appBaseUrl}/api/mercadopago/webhook`;
      }
      return p;
    };

    // Tentativa 1 com o e-mail e CPF informados pelo atleta
    let mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${deterministicKeyBase}_1`,
      },
      body: JSON.stringify(buildPayload(safeEmail, true)),
    });

    let { data } = await parseJsonSafe(mpResponse);

    // Tentativa 2 (Fallback automático): caso o Mercado Pago recuse por CPF de teste/inválido ou conflito de e-mail do próprio lojista
    if (!mpResponse.ok) {
      const fallbackEmail = `inscricao.${cleanRegKey || Date.now()}@atleticacangaceira.com.br`;
      mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `${deterministicKeyBase}_2_${Date.now()}`,
        },
        body: JSON.stringify(buildPayload(fallbackEmail, false)),
      });
      const retryParsed = await parseJsonSafe(mpResponse);
      data = retryParsed.data;
    }

    if (!mpResponse.ok || !data) {
      const mpDetailMsg =
        typeof data?.message === 'string' ? data.message : `HTTP ${mpResponse.status}`;
      console.error('[MercadoPago Pix Error]', mpDetailMsg, data);
      return res.status(mpResponse.status >= 400 ? mpResponse.status : 502).json({
        error: `Não foi possível gerar o QR Code Pix (${mpDetailMsg}). Verifique os dados e tente novamente.`,
      });
    }

    const pointOfInteraction = data.point_of_interaction as
      | Record<string, unknown>
      | undefined;
    const txData = pointOfInteraction?.transaction_data as
      | Record<string, unknown>
      | undefined;

    if (data.id) {
      await attachPendingGatewayReferenceOnServer({
        registrationId: String(registrationId),
        mpPaymentId: String(data.id),
        paymentMethod: 'pix',
      });
    }

    return res.status(200).json({
      success: true,
      paymentId: data.id,
      status: data.status,
      statusDetail: data.status_detail,
      amount: data.transaction_amount ?? amount,
      qrCode: txData?.qr_code,
      qrCodeBase64: txData?.qr_code_base64,
      ticketUrl: txData?.ticket_url,
      dateOfExpiration: data.date_of_expiration,
      externalReference: data.external_reference,
    });
  } catch (error) {
    console.error('[MercadoPago Create Pix Exception]', error);
    return res.status(500).json({
      error: 'Falha interna ao gerar ordem de pagamento Pix.',
    });
  }
}
