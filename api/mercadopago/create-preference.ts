import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
    modalityName,
    authorizedPrice,
    memberStatus,
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
    (req.headers.host ? `https://${req.headers.host}` : 'http://localhost:5173');

  // Se o token de produção/teste do Mercado Pago não estiver configurado nas variáveis de ambiente da Vercel,
  // retorna payload simulado com QR Code Pix dinâmico para homologação segura
  if (!mpAccessToken) {
    const simulatedPreferenceId = `pref_mock_${Date.now()}`;
    const simulatedInitPoint = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${simulatedPreferenceId}`;
    const simulatedPixCopyPaste = `00020126580014br.gov.bcb.pix0136intramed-cangaceira-ix520400005303986540${authorizedPrice.toFixed(
      2
    )}5802BR5925AAA CANGACEIRA MEDICINA6009SAO LUIS62070503***6304E8A2`;

    return res.status(200).json({
      isSandbox: true,
      preferenceId: simulatedPreferenceId,
      initPoint: simulatedInitPoint,
      externalReference: registrationId,
      amount: authorizedPrice,
      pix: {
        copyAndPaste: simulatedPixCopyPaste,
        expirationMinutes: 60,
      },
      message:
        'Checkout gerado em ambiente de simulação/homologação. Configure MERCADOPAGO_ACCESS_TOKEN na Vercel para transações reais.',
    });
  }

  try {
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            id: registrationId,
            title: `Inscrição INTRAMED IX — ${modalityName} (${athleteName})`,
            quantity: 1,
            unit_price: Number(authorizedPrice),
            currency_id: 'BRL',
          },
        ],
        payer: {
          name: athleteName,
          email: athleteEmail,
          identification: {
            type: 'CPF',
            number: athleteDocument ? String(athleteDocument).replace(/\D/g, '') : '',
          },
        },
        back_urls: {
          success: `${appBaseUrl}/inscricao?status=sucesso&reg=${registrationId}`,
          pending: `${appBaseUrl}/inscricao?status=pendente&reg=${registrationId}`,
          failure: `${appBaseUrl}/inscricao?status=falha&reg=${registrationId}`,
        },
        auto_return: 'approved',
        external_reference: registrationId,
        notification_url: `${appBaseUrl}/api/mercadopago/webhook`,
        payment_methods: {
          installments: 6,
        },
      }),
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
      amount: authorizedPrice,
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Erro interno ao processar preferência de pagamento.',
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
