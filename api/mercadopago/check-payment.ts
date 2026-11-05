import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  computeAuthorizedServerPrice,
  getCloudStore,
  markRegistrationPaidOnServer,
} from '../_lib/serverStore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const rawPaymentId = String(
    req.query.paymentId || req.query.payment_id || req.query.collection_id || ''
  ).trim();
  const registrationId = String(req.query.registrationId || req.query.reg || '').trim();

  // Validação estrita do paymentId antes de interpolar na URL (Item 18 e 26 da Auditoria)
  if (!rawPaymentId || !/^\d{5,25}$/.test(rawPaymentId)) {
    return res.status(400).json({ error: 'Identificador de pagamento inválido.' });
  }

  const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!mpAccessToken) {
    return res.status(500).json({
      error: 'Configuração de pagamento indisponível no servidor.',
    });
  }

  try {
    const mpCheck = await fetch(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(rawPaymentId)}`,
      {
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
        },
      }
    );

    if (!mpCheck.ok) {
      return res.status(mpCheck.status).json({
        error: 'Não foi possível consultar o pagamento no Mercado Pago.',
      });
    }

    const paymentData = await mpCheck.json();
    const extRef = String(paymentData.external_reference || '').trim();
    const txAmount = Number(paymentData.transaction_amount || 0);
    const status = String(paymentData.status || '');

    // Se o cliente informou registrationId, confere obrigatoriamente se pertence àquela inscrição (Item 6 da Auditoria)
    if (registrationId && extRef && extRef !== registrationId) {
      return res.status(403).json({
        error: 'Este pagamento não pertence à inscrição informada.',
        isApproved: false,
      });
    }

    const targetRegId = registrationId || extRef;
    const store = getCloudStore();
    const storedReg = targetRegId ? store.registrations[targetRegId] : undefined;

    const expectedMinimumAmount = storedReg
      ? computeAuthorizedServerPrice(
          String(storedReg.lotId || 'lote-1-cangaceira'),
          String(storedReg.memberStatus || 'nao_solicitado'),
          Boolean(storedReg.requestedMemberDiscount)
        )
      : 45.0;

    const isAmountValid = txAmount + 0.01 >= expectedMinimumAmount;
    const isApproved = status === 'approved' && isAmountValid && Boolean(targetRegId);

    // Se foi aprovado e validado no servidor, já grava `pago` de forma idempotente no banco do servidor
    if (isApproved && targetRegId) {
      const method: 'pix' | 'credit_card' =
        paymentData.payment_type_id === 'credit_card' ||
        paymentData.payment_method_id !== 'pix'
          ? 'credit_card'
          : 'pix';

      await markRegistrationPaidOnServer({
        registrationId: targetRegId,
        mpPaymentId: String(paymentData.id),
        paymentMethod: method,
        paidAmount: txAmount,
      });
    }

    return res.status(200).json({
      paymentId: paymentData.id,
      status,
      isApproved,
      registrationId: targetRegId,
      dateApproved: paymentData.date_approved || null,
    });
  } catch (error) {
    console.error('[Check Payment Error]', error);
    return res.status(500).json({
      error: 'Erro interno ao consultar status do pagamento.',
    });
  }
}
