import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  computeAuthorizedServerPrice,
  ensureCloudStoreHydrated,
  handleNonApprovedPaymentStatusOnServer,
  markRegistrationPaidOnServer,
  parseJsonSafe,
  PRIMARY_GATEWAY_ORIGIN,
} from '../_lib/serverStore.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Intramed-Proxy'
  );

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

  // Precisa de pelo menos paymentId ou registrationId para conciliar
  if (!rawPaymentId && !registrationId) {
    return res.status(400).json({ error: 'Identificador de pagamento ou inscrição é obrigatório.' });
  }

  if (rawPaymentId && !/^\d{5,25}$/.test(rawPaymentId)) {
    return res.status(400).json({ error: 'Identificador de pagamento inválido.' });
  }

  const mpAccessToken = (process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
  const host = String(req.headers.host || '');
  const isProxied = req.headers['x-intramed-proxy'] === '1';

  if (!mpAccessToken) {
    if (!host.includes('intramedix.vercel.app') && !isProxied) {
      try {
        const queryParams = new URLSearchParams();
        if (rawPaymentId) queryParams.set('paymentId', rawPaymentId);
        if (registrationId) queryParams.set('registrationId', registrationId);
        const proxyUrl = `${PRIMARY_GATEWAY_ORIGIN}/api/mercadopago/check-payment?${queryParams.toString()}`;
        const proxyRes = await fetch(proxyUrl, {
          headers: { 'X-Intramed-Proxy': '1' },
        });
        const { data: proxyData } = await parseJsonSafe(proxyRes);
        if (proxyData) {
          return res.status(proxyRes.status).json(proxyData);
        }
      } catch (proxyErr) {
        console.error('[Check Payment Proxy Error]', proxyErr);
      }
    }

    return res.status(500).json({
      error: 'Configuração de pagamento indisponível no servidor.',
    });
  }

  try {
    let paymentData: Record<string, unknown> | null = null;

    if (rawPaymentId) {
      const mpCheck = await fetch(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(rawPaymentId)}`,
        {
          headers: {
            Authorization: `Bearer ${mpAccessToken}`,
          },
        }
      );
      const parsed = await parseJsonSafe(mpCheck);
      paymentData = parsed.data;
    } else if (registrationId) {
      // Reconciliação automática por external_reference se o modal fechou ou o webhook falhou
      const searchRes = await fetch(
        `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(
          registrationId
        )}&sort=date_created&criteria=desc&limit=1`,
        {
          headers: {
            Authorization: `Bearer ${mpAccessToken}`,
          },
        }
      );
      const searchParsed = await parseJsonSafe(searchRes);
      const results = searchParsed.data?.results as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(results) && results.length > 0) {
        paymentData = results[0];
      }
    }

    if (!paymentData) {
      return res.status(404).json({
        found: false,
        isApproved: false,
        message: 'Nenhum registro de pagamento encontrado no gateway para esta consulta.',
      });
    }

    const extRef = String(paymentData.external_reference || '').trim();
    const txAmount = Number(paymentData.transaction_amount || 0);
    const status = String(paymentData.status || '');
    const currentPaymentId = String(paymentData.id || rawPaymentId);

    // Se o cliente informou registrationId, confere se pertence àquela inscrição
    if (registrationId && extRef && extRef !== registrationId) {
      return res.status(403).json({
        error: 'Este pagamento não pertence à inscrição informada.',
        isApproved: false,
      });
    }

    const targetRegId = registrationId || extRef;
    const store = await ensureCloudStoreHydrated();
    const storedReg = targetRegId ? store.registrations[targetRegId] : undefined;

    const expectedMinimumAmount = storedReg
      ? computeAuthorizedServerPrice(
          String(storedReg.lotId || 'lote-1-cangaceira'),
          String(storedReg.memberStatus || 'nao_solicitado'),
          Boolean(storedReg.requestedMemberDiscount),
          Boolean(storedReg.isGuestAthlete)
        )
      : 50.0;

    const isAmountValid = txAmount + 0.01 >= expectedMinimumAmount;
    const isApproved = status === 'approved' && isAmountValid && Boolean(targetRegId);

    if (isApproved && targetRegId) {
      const method: 'pix' | 'credit_card' =
        paymentData.payment_type_id === 'credit_card' ||
        paymentData.payment_method_id !== 'pix'
          ? 'credit_card'
          : 'pix';

      await markRegistrationPaidOnServer({
        registrationId: targetRegId,
        mpPaymentId: currentPaymentId,
        paymentMethod: method,
        paidAmount: txAmount,
      });
    } else if (
      targetRegId &&
      (status === 'refunded' ||
        status === 'charged_back' ||
        status === 'cancelled' ||
        status === 'rejected')
    ) {
      await handleNonApprovedPaymentStatusOnServer({
        registrationId: targetRegId,
        mpPaymentId: currentPaymentId,
        mpStatus: status,
        statusDetail: String(paymentData.status_detail || ''),
      });
    }

    return res.status(200).json({
      paymentId: currentPaymentId,
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
