import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const mpWebhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  const { type, action, data, topic } = req.body || {};
  const queryTopic = (req.query.topic || req.query.type) as string;
  const paymentId =
    data?.id ||
    req.query['data.id'] ||
    req.query.id ||
    (topic === 'payment' || queryTopic === 'payment' ? req.query.id : undefined);

  // Validação Criptográfica HMAC da Assinatura do Webhook (quando o segredo está configurado)
  const xSignature = req.headers['x-signature'] as string;
  const xRequestId = req.headers['x-request-id'] as string;

  if (mpWebhookSecret && xSignature && paymentId) {
    try {
      const parts = xSignature.split(',');
      let ts = '';
      let hash = '';

      for (const part of parts) {
        const [k, v] = part.split('=');
        if (k.trim() === 'ts') ts = v.trim();
        if (k.trim() === 'v1') hash = v.trim();
      }

      const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`;
      const computedHash = crypto
        .createHmac('sha256', mpWebhookSecret)
        .update(manifest)
        .digest('hex');

      if (computedHash !== hash) {
        console.warn('[MercadoPago Webhook] Assinatura HMAC divergente.');
      }
    } catch (sigErr) {
      console.error('[MercadoPago Webhook] Erro ao validar assinatura:', sigErr);
    }
  }

  // Notificação de Pagamento
  const isPaymentEvent =
    type === 'payment' ||
    action === 'payment.created' ||
    action === 'payment.updated' ||
    topic === 'payment' ||
    queryTopic === 'payment';

  if (isPaymentEvent && paymentId) {
    if (mpAccessToken) {
      try {
        const mpCheck = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            Authorization: `Bearer ${mpAccessToken}`,
          },
        });

        if (mpCheck.ok) {
          const paymentData = await mpCheck.json();
          const registrationId = paymentData.external_reference;
          const status = paymentData.status; // 'approved', 'pending', etc.
          const amount = paymentData.transaction_amount;

          console.log(
            `[MercadoPago Webhook] Sucesso: ID ${paymentId}, Status: ${status}, Inscrição: ${registrationId}, Valor: R$ ${amount}`
          );

          return res.status(200).json({
            received: true,
            paymentId,
            status,
            registrationId,
          });
        }
      } catch (fetchErr) {
        console.error('[MercadoPago Webhook] Falha ao consultar API do Mercado Pago:', fetchErr);
      }
    }
  }

  return res.status(200).json({ received: true });
}
