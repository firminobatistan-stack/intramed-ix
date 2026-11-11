import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  attachPendingGatewayReferenceOnServer,
  computeAuthorizedServerPrice,
  computeCardTotalWithInstallments,
  ensureCloudStoreHydrated,
  parseJsonSafe,
  parseSafeBody,
  PRIMARY_GATEWAY_ORIGIN,
} from '../_lib/serverStore.js';

function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, X-Intramed-Proxy'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  const body = parseSafeBody(req.body);
  const {
    registrationId,
    athleteName,
    athleteEmail,
    turmaLabel,
    lotId,
    requestedMemberDiscount,
    isGuestAthlete,
    memberStatus: clientMemberStatus,
    installments: requestedInstallments,
  } = body;

  if (!registrationId) {
    return res.status(400).json({
      error: 'Parâmetros incompletos para criação da ordem de pagamento.',
    });
  }

  const store = await ensureCloudStoreHydrated();
  const launchConfig = store.launch_config || { publicPaymentsEnabled: false };
  if (launchConfig.publicPaymentsEnabled === false) {
    return res.status(403).json({
      ok: false,
      error: 'A área de pagamentos do IntraMed ainda está sendo preparada. Em breve, você poderá realizar sua inscrição e efetuar o pagamento diretamente pela plataforma.',
    });
  }
  const storedReg = store.registrations[String(registrationId)];

  const effectiveMemberStatus = String(
    storedReg?.memberStatus || clientMemberStatus || 'nao_solicitado'
  );
  const effectivePaymentStatus = String(storedReg?.paymentStatus || 'pendente');

  if (effectivePaymentStatus === 'pago') {
    return res.status(409).json({
      error: 'Esta inscrição já consta como paga no sistema.',
    });
  }

  if (effectiveMemberStatus === 'pendente') {
    return res.status(403).json({
      error:
        'Inscrição com solicitação de sócio ainda pendente de validação pela diretoria da Atlética.',
    });
  }

  const mpAccessToken = (process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
  const host = String(req.headers.host || '');
  const isProxied = req.headers['x-intramed-proxy'] === '1';
  const appBaseUrl =
    process.env.APP_BASE_URL ||
    (host ? `https://${host}` : PRIMARY_GATEWAY_ORIGIN);

  const serverAuthorizedPrice = computeAuthorizedServerPrice(
    String(storedReg?.lotId || lotId || 'lote-1-cangaceira'),
    effectiveMemberStatus,
    Boolean(storedReg?.requestedMemberDiscount ?? requestedMemberDiscount),
    Boolean(storedReg?.isGuestAthlete ?? isGuestAthlete)
  );

  if (!mpAccessToken) {
    if (!host.includes('intramedix.vercel.app') && !isProxied) {
      try {
        const proxyRes = await fetch(
          `${PRIMARY_GATEWAY_ORIGIN}/api/mercadopago/create-preference`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Intramed-Proxy': '1',
            },
            body: JSON.stringify({
              ...body,
              serverAuthorizedPrice,
              isGuestAthlete: Boolean(storedReg?.isGuestAthlete ?? isGuestAthlete),
              requestedMemberDiscount: Boolean(
                storedReg?.requestedMemberDiscount ?? requestedMemberDiscount
              ),
              memberStatus: effectiveMemberStatus,
            }),
          }
        );
        const { data: proxyData } = await parseJsonSafe(proxyRes);
        if (proxyData) {
          return res.status(proxyRes.status).json(proxyData);
        }
      } catch (proxyErr) {
        console.error('[MercadoPago Create Preference Proxy Error]', proxyErr);
      }
    }

    return res.status(500).json({
      error: 'Credencial MERCADOPAGO_ACCESS_TOKEN não configurada no servidor.',
    });
  }

  try {
    // Cálculo 100% no servidor com taxas embutidas no valor único da inscrição (sem item separado de taxa)
    const basePrice = computeAuthorizedServerPrice(
      String(storedReg?.lotId || lotId || 'lote-1-cangaceira'),
      effectiveMemberStatus,
      Boolean(storedReg?.requestedMemberDiscount ?? requestedMemberDiscount),
      Boolean(storedReg?.isGuestAthlete ?? isGuestAthlete)
    );
    const {
      installments: safeInstallments,
      totalAmount,
      installmentAmount,
      feeAmount,
    } = computeCardTotalWithInstallments(basePrice, Number(requestedInstallments) || 1);

    const resolvedName = String(
      storedReg?.athleteName || athleteName || 'Atleta IntraMed'
    ).trim();
    const resolvedTurma = String(storedReg?.turmaLabel || turmaLabel || '')
      .replace(/[^\w\sÀ-ÿ-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const items = [
      {
        id: String(registrationId),
        title: `Intramed Cangaceira - Inscricao ${
          resolvedTurma ? resolvedTurma + ' - ' : ''
        }Passaporte (${resolvedName})`,
        description:
          'Inscricao Oficial INTRAMED IX - Atletica Cangaceira Medicina UEMA',
        quantity: 1,
        unit_price: totalAmount,
        currency_id: 'BRL',
      },
    ];

    const cleanEmail = String(
      storedReg?.athleteEmail || athleteEmail || ''
    )
      .trim()
      .toLowerCase();
    const safeEmail = isValidEmail(cleanEmail)
      ? cleanEmail
      : `atleta.${String(registrationId).replace(/[^a-zA-Z0-9]/g, '')}@intramed.com.br`;

    const buildPreferencePayload = (payerEmail: string) => {
      const p: Record<string, unknown> = {
        items,
        statement_descriptor: 'INTRAMED CANG',
        payer: {
          name: resolvedName,
          email: payerEmail,
        },
        back_urls: {
          success: `${appBaseUrl}/inscricao?status=sucesso&reg=${encodeURIComponent(
            String(registrationId)
          )}`,
          pending: `${appBaseUrl}/inscricao?status=pendente&reg=${encodeURIComponent(
            String(registrationId)
          )}`,
          failure: `${appBaseUrl}/inscricao?status=falha&reg=${encodeURIComponent(
            String(registrationId)
          )}`,
        },
        auto_return: 'approved',
        external_reference: String(registrationId),
        payment_methods: {
          default_installments: safeInstallments,
          installments: safeInstallments,
        },
      };

      if (
        appBaseUrl &&
        !appBaseUrl.includes('localhost') &&
        appBaseUrl.startsWith('https://')
      ) {
        p.notification_url = `${appBaseUrl}/api/mercadopago/webhook`;
      }
      return p;
    };

    let mpResponse = await fetch(
      'https://api.mercadopago.com/checkout/preferences',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildPreferencePayload(safeEmail)),
      }
    );

    let { data } = await parseJsonSafe(mpResponse);

    if (!mpResponse.ok) {
      const fallbackEmail = `inscricao.${String(registrationId).replace(
        /[^a-zA-Z0-9]/g,
        ''
      )}@atleticacangaceira.com.br`;
      mpResponse = await fetch(
        'https://api.mercadopago.com/checkout/preferences',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mpAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(buildPreferencePayload(fallbackEmail)),
        }
      );
      const retryParsed = await parseJsonSafe(mpResponse);
      data = retryParsed.data;
    }

    if (!mpResponse.ok || !data) {
      return res.status(mpResponse.status >= 400 ? mpResponse.status : 502).json({
        error: 'Falha ao criar checkout de cartão junto ao Mercado Pago.',
      });
    }

    if (data.id) {
      await attachPendingGatewayReferenceOnServer({
        registrationId: String(registrationId),
        mpPreferenceId: String(data.id),
        paymentMethod: 'credit_card',
      });
    }

    return res.status(200).json({
      preferenceId: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
      externalReference: registrationId,
      baseAmount: basePrice,
      feeAmount,
      installments: safeInstallments,
      installmentAmount,
      totalAmount,
    });
  } catch (err) {
    console.error('[MercadoPago Create Preference Error]', err);
    return res.status(500).json({
      error: 'Erro interno ao processar preferência de pagamento.',
    });
  }
}
