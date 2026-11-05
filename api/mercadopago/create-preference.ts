import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  computeAuthorizedServerPrice,
  computeCardFee,
  getCloudStore,
} from '../_lib/serverStore';

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
    lotId,
    requestedMemberDiscount,
    memberStatus: clientMemberStatus,
  } = req.body || {};

  if (!registrationId) {
    return res.status(400).json({
      error: 'Parâmetros incompletos para criação da ordem de pagamento.',
    });
  }

  const store = getCloudStore();
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

  const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const host = req.headers.host || '';
  const appBaseUrl =
    process.env.APP_BASE_URL ||
    (host ? `https://${host}` : 'https://intramedix.vercel.app');

  if (!mpAccessToken) {
    return res.status(500).json({
      error: 'Credencial MERCADOPAGO_ACCESS_TOKEN não configurada no servidor.',
    });
  }

  try {
    // Cálculo 100% no servidor: base do lote + acréscimo obrigatório de 5% da operadora de cartão (Item 5 da Auditoria)
    const basePrice = computeAuthorizedServerPrice(
      String(storedReg?.lotId || lotId || 'lote-1-cangaceira'),
      effectiveMemberStatus,
      Boolean(storedReg?.requestedMemberDiscount ?? requestedMemberDiscount)
    );
    const fee = computeCardFee(basePrice);

    const resolvedName = String(
      storedReg?.athleteName || athleteName || 'Atleta IntraMed'
    ).trim();
    const resolvedTurma = String(storedReg?.turmaLabel || turmaLabel || '');

    const items = [
      {
        id: String(registrationId),
        title: `Intramed Cangaceira — Inscrição ${
          resolvedTurma ? resolvedTurma + ' • ' : ''
        }Passaporte (${resolvedName})`,
        description:
          'Inscrição Oficial INTRAMED IX — Atlética Cangaceira Medicina UEMA',
        quantity: 1,
        unit_price: basePrice,
        currency_id: 'BRL',
      },
      {
        id: `${registrationId}-taxa-cartao`,
        title: 'Intramed Cangaceira — Acréscimo Operadora de Cartão (5%)',
        description: 'Repasse de taxa administrativa do gateway de cartão',
        quantity: 1,
        unit_price: fee,
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
          installments: 6,
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

    let data = await mpResponse.json();

    if (!mpResponse.ok && mpResponse.status >= 400 && mpResponse.status < 500) {
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
      data = await mpResponse.json();
    }

    if (!mpResponse.ok) {
      return res.status(mpResponse.status).json({
        error: 'Falha ao criar checkout de cartão junto ao Mercado Pago.',
      });
    }

    return res.status(200).json({
      preferenceId: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
      externalReference: registrationId,
      baseAmount: basePrice,
      feeAmount: fee,
      totalAmount: Math.round((basePrice + fee) * 100) / 100,
    });
  } catch (err) {
    console.error('[MercadoPago Create Preference Error]', err);
    return res.status(500).json({
      error: 'Erro interno ao processar preferência de pagamento.',
    });
  }
}
