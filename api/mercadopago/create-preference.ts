import type { VercelRequest, VercelResponse } from '@vercel/node';

function isValidCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i), 10) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i), 10) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;
  return true;
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
    athleteDocument,
    turmaLabel,
    authorizedPrice,
    memberStatus,
    isCreditCard,
    cardFeeAmount,
  } = req.body || {};

  if (!registrationId || !authorizedPrice || !athleteEmail) {
    return res.status(400).json({
      error: 'Parâmetros incompletos para criação da ordem de pagamento.',
    });
  }

  // Regra Fundamental de Segurança: Se for sócio, não pode gerar checkout se estiver pendente
  if (memberStatus === 'pendente') {
    return res.status(403).json({
      error:
        'Inscrição com solicitação de sócio ainda pendente de validação pela diretoria da Atlética.',
    });
  }

  const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const appBaseUrl =
    process.env.APP_BASE_URL ||
    (req.headers.host ? `https://${req.headers.host}` : 'https://intramedix.vercel.app');

  if (!mpAccessToken) {
    return res.status(500).json({
      error: 'Credencial MERCADOPAGO_ACCESS_TOKEN não configurada no servidor.',
    });
  }

  try {
    const cleanDoc = athleteDocument ? String(athleteDocument).replace(/\D/g, '') : '';
    const basePrice = Number(authorizedPrice);
    const fee = isCreditCard ? (cardFeeAmount ? Number(cardFeeAmount) : Math.round(basePrice * 0.05 * 100) / 100) : 0;

    const items = [
      {
        id: registrationId,
        title: `Inscrição INTRAMED IX — ${turmaLabel ? turmaLabel + ' • ' : ''}Passaporte Geral (${athleteName})`,
        quantity: 1,
        unit_price: basePrice,
        currency_id: 'BRL',
      },
    ];

    // Se o pagamento for no cartão, discrimina o acréscimo da operadora/gateway repassado
    if (fee > 0) {
      items.push({
        id: `${registrationId}-taxa-cartao`,
        title: 'Taxa Administrativa Operadora de Cartão (Repasse Gateway)',
        quantity: 1,
        unit_price: fee,
        currency_id: 'BRL',
      });
    }

    const payerData: Record<string, unknown> = {
      name: athleteName,
      email: athleteEmail,
    };

    if (cleanDoc && cleanDoc.length === 11 && isValidCPF(cleanDoc)) {
      payerData.identification = {
        type: 'CPF',
        number: cleanDoc,
      };
    } else if (cleanDoc && cleanDoc.length === 14) {
      payerData.identification = {
        type: 'CNPJ',
        number: cleanDoc,
      };
    }

    const payload: Record<string, unknown> = {
      items,
      payer: payerData,
      back_urls: {
        success: `${appBaseUrl}/inscricao?status=sucesso&reg=${registrationId}`,
        pending: `${appBaseUrl}/inscricao?status=pendente&reg=${registrationId}`,
        failure: `${appBaseUrl}/inscricao?status=falha&reg=${registrationId}`,
      },
      auto_return: 'approved',
      external_reference: registrationId,
      payment_methods: {
        installments: 6,
      },
    };

    if (appBaseUrl && !appBaseUrl.includes('localhost') && appBaseUrl.startsWith('https://')) {
      payload.notification_url = `${appBaseUrl}/api/mercadopago/webhook`;
    }

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      return res.status(mpResponse.status).json({
        error: 'Falha ao criar preferência junto à API do Mercado Pago.',
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
