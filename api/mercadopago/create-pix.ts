import type { VercelRequest, VercelResponse } from '@vercel/node';

function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  const {
    registrationId,
    athleteName,
    athleteEmail,
    turmaLabel,
    authorizedPrice,
    memberStatus,
  } = req.body || {};

  if (!registrationId || !authorizedPrice) {
    return res.status(400).json({
      error: 'Parâmetros incompletos. ID da inscrição e valor autorizado são obrigatórios.',
    });
  }

  // Regra Inviolável de Negócio: Se a solicitação de sócio estiver pendente, não pode cobrar ainda
  if (memberStatus === 'pendente') {
    return res.status(403).json({
      error: 'Inscrição com solicitação de sócio ainda pendente de validação pela diretoria da Atlética Cangaceira.',
    });
  }

  const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const host = req.headers.host || '';
  const appBaseUrl =
    process.env.APP_BASE_URL ||
    (host ? `https://${host}` : 'https://intramedix.vercel.app');

  if (!mpAccessToken) {
    // Se a requisição vier do domínio com hífen (intramed-ix.vercel.app),
    // encaminha com segurança para a instância principal (intramedix.vercel.app) onde o token está configurado
    if (!host.includes('intramedix.vercel.app')) {
      try {
        const proxyRes = await fetch('https://intramedix.vercel.app/api/mercadopago/create-pix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body || {}),
        });
        const proxyData = await proxyRes.json();
        return res.status(proxyRes.status).json(proxyData);
      } catch (proxyErr) {
        console.error('[MercadoPago Proxy Fallback Error]', proxyErr);
      }
    }

    return res.status(500).json({
      error: 'Credencial MERCADOPAGO_ACCESS_TOKEN não configurada no servidor.',
    });
  }

  try {
    const rawName = (athleteName || 'Atleta IntraMed').trim();
    const nameParts = rawName.split(/\s+/);
    const firstName = (nameParts[0] || 'Atleta').replace(/[^a-zA-ZÀ-ÿ\s]/g, '') || 'Atleta';
    const lastName = (nameParts.slice(1).join(' ') || 'IntraMed').replace(/[^a-zA-ZÀ-ÿ\s]/g, '') || 'IntraMed';

    const cleanEmail = (athleteEmail || '').trim().toLowerCase();
    const safeEmail = isValidEmail(cleanEmail)
      ? cleanEmail
      : `atleta.${Date.now()}@intramed.com.br`;

    const amount = Math.round(Number(authorizedPrice) * 100) / 100;

    const buildPayload = (payerEmail: string) => {
      const p: Record<string, unknown> = {
        transaction_amount: amount,
        description: `Intramed Cangaceira - Inscricao ${turmaLabel ? turmaLabel + ' - ' : ''}${firstName} ${lastName}`.slice(0, 200),
        statement_descriptor: 'INTRAMED CANG',
        payment_method_id: 'pix',
        external_reference: String(registrationId),
        payer: {
          email: payerEmail,
          first_name: firstName,
          last_name: lastName,
        },
      };

      if (appBaseUrl && !appBaseUrl.includes('localhost') && appBaseUrl.startsWith('https://')) {
        p.notification_url = `${appBaseUrl}/api/mercadopago/webhook`;
      }
      return p;
    };

    // Tentativa 1 com o e-mail informado pelo atleta
    let mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `pix_${registrationId}_${Date.now()}_1`,
      },
      body: JSON.stringify(buildPayload(safeEmail)),
    });

    let data = await mpResponse.json();

    // Se o Mercado Pago recusar por conflito de e-mail ou restrição do pagador, executa fallback imediato
    if (!mpResponse.ok) {
      console.warn('[MercadoPago Pix Retry] Aplicando fallback seguro:', data);
      const fallbackEmail = `inscricao.${Date.now()}@atleticacangaceira.com.br`;
      mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `pix_${registrationId}_${Date.now()}_2`,
        },
        body: JSON.stringify(buildPayload(fallbackEmail)),
      });
      data = await mpResponse.json();
    }

    if (!mpResponse.ok) {
      console.error('[MercadoPago Pix Error]', data);
      return res.status(mpResponse.status).json({
        error: data.message || 'Erro retornado pela API do Mercado Pago ao gerar Pix.',
        details: data,
      });
    }

    const txData = data.point_of_interaction?.transaction_data;

    return res.status(200).json({
      success: true,
      paymentId: data.id,
      status: data.status,
      statusDetail: data.status_detail,
      amount: data.transaction_amount,
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
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
