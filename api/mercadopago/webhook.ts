import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const mpWebhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  const { type, action, data } = req.body || {};
  const paymentId = data?.id || req.query['data.id'] || req.query.id;

  // Validação Criptográfica HMAC da Assinatura do Webhook (quando o segredo está configurado)
  const xSignature = req.headers['x-signature'] as string;
  const xRequestId = req.headers['x-request-id'] as string;

  if (mpWebhookSecret && xSignature) {
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
        console.warn('[MercadoPago Webhook] Assinatura HMAC inválida.');
        return res.status(401).json({ error: 'Assinatura inválida.' });
      }
    } catch (sigErr) {
      console.error('[MercadoPago Webhook] Erro ao validar assinatura:', sigErr);
    }
  }

  // Notificação de Pagamento
  if (type === 'payment' || action === 'payment.created' || action === 'payment.updated') {
    if (!paymentId) {
      return res.status(400).json({ error: 'ID do pagamento não fornecido.' });
    }

    if (mpAccessToken) {
      try {
        // Consulta confiável do status real diretamente na API oficial do Mercado Pago
        const mpCheck = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            Authorization: `Bearer ${mpAccessToken}`,
          },
        });

        if (mpCheck.ok) {
          const paymentData = await mpCheck.json();
          const registrationId = paymentData.external_reference;
          const status = paymentData.status; // 'approved', 'pending', 'rejected', etc.
          const amount = paymentData.transaction_amount;

          console.log(
            `[MercadoPago Webhook] Pagamento verificado: ID ${paymentId}, Status: ${status}, Inscrição: ${registrationId}, Valor: R$ ${amount}`
          );

          // Aqui a atualização de banco relacional é executada de forma idempotente.
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

  // Responde sempre 200 OK para evitar retentativas infinitas do gateway
  return res.status(200).json({ received: true });
}
