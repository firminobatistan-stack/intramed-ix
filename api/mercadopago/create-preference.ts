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
    isCreditCard,
    cardFeeAmount,
  } = req.body || {};

  if (!registrationId || !authorizedPrice) {
    return res.status(400).json({
      error: 'Parâmetros incompletos para criação da ordem de pagamento.',
    });
  }

  if (memberStatus === 'pendente') {
    return res.status(403).json({
      error:
        'Inscrição com solicitação de sócio ainda pendente de validação pela diretoria da Atlética.',
    });
  }

  const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const host = req.headers.host || '';
  const appBaseUrl =
    process.env.APP_BASE_URL ||
    (host ? `https://${host}` : 'https://intramedix.vercel.app');

  if (!mpAccessToken) {
    if (!host.includes('intramedix.vercel.app')) {
      try {
        const proxyRes = await fetch('https://intramedix.vercel.app/api/mercadopago/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body || {}),
        });
        const proxyData = await proxyRes.json();
        return res.status(proxyRes.status).json(proxyData);
      } catch (proxyErr) {
        console.error('[MercadoPago Preference Proxy Fallback Error]', proxyErr);
      }
    }

    return res.status(500).json({
      error: 'Credencial MERCADOPAGO_ACCESS_TOKEN não configurada no servidor.',
    });
  }

  try {
    const basePrice = Math.round(Number(authorizedPrice) * 100) / 100;
    const fee = isCreditCard
      ? cardFeeAmount
        ? Math.round(Number(cardFeeAmount) * 100) / 100
        : Math.round(basePrice * 0.05 * 100) / 100
      : 0;

    const items = [
      {
        id: String(registrationId),
        title: `Inscricao INTRAMED IX - ${turmaLabel ? turmaLabel + ' - ' : ''}Passaporte Geral (${athleteName || 'Atleta'})`,
        quantity: 1,
        unit_price: basePrice,
        currency_id: 'BRL',
      },
    ];

    if (fee > 0) {
      items.push({
        id: `${registrationId}-taxa-cartao`,
        title: 'Taxa Administrativa Operadora de Cartao (Repasse Gateway)',
        quantity: 1,
        unit_price: fee,
        currency_id: 'BRL',
      });
    }

    const cleanEmail = (athleteEmail || '').trim().toLowerCase();
    const safeEmail = isValidEmail(cleanEmail)
      ? cleanEmail
      : `atleta.${Date.now()}@intramed.com.br`;

    const buildPreferencePayload = (payerEmail: string) => {
      const p: Record<string, unknown> = {
        items,
        payer: {
          name: (athleteName || 'Atleta IntraMed').trim(),
          email: payerEmail,
        },
        back_urls: {
          success: `${appBaseUrl}/inscricao?status=sucesso&reg=${registrationId}`,
          pending: `${appBaseUrl}/inscricao?status=pendente&reg=${registrationId}`,
          failure: `${appBaseUrl}/inscricao?status=falha&reg=${registrationId}`,
        },
        auto_return: 'approved',
        external_reference: String(registrationId),
        payment_methods: {
          installments: 6,
        },
      };

      if (appBaseUrl && !appBaseUrl.includes('localhost') && appBaseUrl.startsWith('https://')) {
        p.notification_url = `${appBaseUrl}/api/mercadopago/webhook`;
      }
      return p;
    };

    let mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildPreferencePayload(safeEmail)),
    });

    let data = await mpResponse.json();

    if (!mpResponse.ok) {
      const fallbackEmail = `inscricao.${Date.now()}@atleticacangaceira.com.br`;
      mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildPreferencePayload(fallbackEmail)),
      });
      data = await mpResponse.json();
    }

    if (!mpResponse.ok) {
      return res.status(mpResponse.status).json({
        error: data.message || 'Falha ao criar preferência junto à API do Mercado Pago.',
        details: data,
      });
    }

    return res.status(200).json({
      preferenceId: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
      externalReference: registrationId,
      baseAmount: basePrice,
      feeAmount: fee,
      totalAmount: basePrice + fee,
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Erro interno ao processar preferência de pagamento.',
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
