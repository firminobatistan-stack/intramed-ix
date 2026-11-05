import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const paymentId = req.query.paymentId as string;

  if (!paymentId) {
    return res.status(400).json({ error: 'Parâmetro paymentId é obrigatório.' });
  }

  const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const host = req.headers.host || '';

  if (!mpAccessToken) {
    if (!host.includes('intramedix.vercel.app')) {
      try {
        const proxyRes = await fetch(
          `https://intramedix.vercel.app/api/mercadopago/check-payment?paymentId=${encodeURIComponent(paymentId)}`
        );
        const proxyData = await proxyRes.json();
        return res.status(proxyRes.status).json(proxyData);
      } catch (proxyErr) {
        console.error('[Check Payment Proxy Error]', proxyErr);
      }
    }

    return res.status(500).json({
      error: 'MERCADOPAGO_ACCESS_TOKEN não configurado.',
    });
  }

  try {
    const mpCheck = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
      },
    });

    if (!mpCheck.ok) {
      const errData = await mpCheck.json().catch(() => ({}));
      return res.status(mpCheck.status).json({
        error: 'Falha ao consultar pagamento no Mercado Pago.',
        details: errData,
      });
    }

    const paymentData = await mpCheck.json();

    return res.status(200).json({
      paymentId: paymentData.id,
      status: paymentData.status,
      statusDetail: paymentData.status_detail,
      isApproved: paymentData.status === 'approved',
      amount: paymentData.transaction_amount,
      externalReference: paymentData.external_reference,
      dateApproved: paymentData.date_approved,
    });
  } catch (error) {
    console.error('[Check Payment Error]', error);
    return res.status(500).json({
      error: 'Erro interno ao consultar status do pagamento.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
