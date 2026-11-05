import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import {
  computeAuthorizedServerPrice,
  getCloudStore,
  markRegistrationPaidOnServer,
} from '../_lib/serverStore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const mpWebhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  const { type, action, data, topic } = req.body || {};
  const queryTopic = String(req.query.topic || req.query.type || '');
  const queryDataId = String(req.query['data.id'] || req.query.id || '').trim();
  const rawPaymentId = String(data?.id || queryDataId || '').trim();

  // Validação Criptográfica HMAC-SHA256 em tempo constante (Item 7 da Auditoria)
  const xSignature = String(req.headers['x-signature'] || '');
  const xRequestId = String(req.headers['x-request-id'] || '');

  if (mpWebhookSecret) {
    if (!xSignature || !rawPaymentId) {
      return res.status(401).json({ error: 'Assinatura de webhook ausente.' });
    }

    try {
      const parts = xSignature.split(',');
      let ts = '';
      let v1Hash = '';

      for (const part of parts) {
        const [k, v] = part.split('=');
        if (k && v) {
          if (k.trim() === 'ts') ts = v.trim();
          if (k.trim() === 'v1') v1Hash = v.trim();
        }
      }

      if (!ts || !v1Hash) {
        return res.status(401).json({ error: 'Cabeçalho x-signature malformado.' });
      }

      // Janela de tolerância de timestamp (15 minutos) contra replay attacks
      const tsNum = Number(ts);
      const nowSec = Math.floor(Date.now() / 1000);
      if (
        !Number.isNaN(tsNum) &&
        tsNum > 1_000_000_000 &&
        Math.abs(nowSec - tsNum) > 900
      ) {
        return res.status(401).json({ error: 'Timestamp do webhook expirado.' });
      }

      // Mercado Pago assina `data.id` da query string (em minúsculas quando alfanumérico)
      const signedId = (queryDataId || rawPaymentId).toLowerCase();
      const manifest = `id:${signedId};request-id:${xRequestId};ts:${ts};`;
      const computedHash = crypto
        .createHmac('sha256', mpWebhookSecret)
        .update(manifest)
        .digest('hex');

      const a = Buffer.from(computedHash, 'utf-8');
      const b = Buffer.from(v1Hash, 'utf-8');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ error: 'Assinatura HMAC inválida.' });
      }
    } catch {
      return res.status(401).json({ error: 'Falha ao verificar assinatura do webhook.' });
    }
  }

  const isPaymentEvent =
    type === 'payment' ||
    action === 'payment.created' ||
    action === 'payment.updated' ||
    topic === 'payment' ||
    queryTopic === 'payment';

  if (isPaymentEvent && rawPaymentId && /^\d{5,25}$/.test(rawPaymentId) && mpAccessToken) {
    try {
      const mpCheck = await fetch(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(rawPaymentId)}`,
        {
          headers: {
            Authorization: `Bearer ${mpAccessToken}`,
          },
        }
      );

      if (mpCheck.ok) {
        const paymentData = await mpCheck.json();
        const registrationId = String(paymentData.external_reference || '').trim();
        const status = String(paymentData.status || '');
        const amount = Number(paymentData.transaction_amount || 0);

        if (status === 'approved' && registrationId) {
          const store = getCloudStore();
          const storedReg = store.registrations[registrationId];
          const minPrice = storedReg
            ? computeAuthorizedServerPrice(
                String(storedReg.lotId || 'lote-1-cangaceira'),
                String(storedReg.memberStatus || 'nao_solicitado'),
                Boolean(storedReg.requestedMemberDiscount)
              )
            : 45.0;

          if (amount + 0.01 >= minPrice) {
            const method: 'pix' | 'credit_card' =
              paymentData.payment_type_id === 'credit_card' ||
              paymentData.payment_method_id !== 'pix'
                ? 'credit_card'
                : 'pix';

            await markRegistrationPaidOnServer({
              registrationId,
              mpPaymentId: String(paymentData.id),
              paymentMethod: method,
              paidAmount: amount,
            });
          }
        }

        return res.status(200).json({
          received: true,
          paymentId: rawPaymentId,
          status,
          registrationId,
        });
      }
    } catch (fetchErr) {
      console.error('[MercadoPago Webhook] Falha ao consultar pagamento:', fetchErr);
    }
  }

  return res.status(200).json({ received: true });
}
