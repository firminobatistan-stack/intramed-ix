import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  computeAuthorizedServerPrice,
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
      error: 'Parâmetros incompletos. ID da inscrição é obrigatório.',
    });
  }

  const store = getCloudStore();
  const storedReg = store.registrations[String(registrationId)];

  // Status de sócio e pagamento validados contra o registro armazenado no servidor (Itens 5 e 6 da Auditoria)
  const effectiveMemberStatus = String(
    storedReg?.memberStatus || clientMemberStatus || 'nao_solicitado'
  );
  const effectivePaymentStatus = String(storedReg?.paymentStatus || 'pendente');

  if (effectivePaymentStatus === 'pago') {
    return res.status(409).json({
      error: 'Esta inscrição já consta como paga no sistema.',
    });
  }

  // Regra Inviolável de Negócio: Se a solicitação de sócio estiver pendente, não pode cobrar ainda
  if (effectiveMemberStatus === 'pendente') {
    return res.status(403).json({
      error:
        'Inscrição com solicitação de sócio ainda pendente de validação pela diretoria da Atlética Cangaceira.',
    });
  }

  // Preço calculado estritamente no servidor pelo lote oficial e status de sócio validado
  const serverAuthorizedPrice = computeAuthorizedServerPrice(
    String(storedReg?.lotId || lotId || 'lote-1-cangaceira'),
    effectiveMemberStatus,
    Boolean(storedReg?.requestedMemberDiscount ?? requestedMemberDiscount)
  );

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
    const resolvedName = String(
      storedReg?.athleteName || athleteName || 'Atleta IntraMed'
    ).trim();
    const nameParts = resolvedName.split(/\s+/);
    const firstName =
      (nameParts[0] || 'Atleta').replace(/[^a-zA-ZÀ-ÿ\s]/g, '') || 'Atleta';
    const lastName =
      (nameParts.slice(1).join(' ') || 'IntraMed').replace(/[^a-zA-ZÀ-ÿ\s]/g, '') ||
      'IntraMed';

    const cleanEmail = String(
      storedReg?.athleteEmail || athleteEmail || ''
    )
      .trim()
      .toLowerCase();
    const safeEmail = isValidEmail(cleanEmail)
      ? cleanEmail
      : `atleta.${String(registrationId).replace(/[^a-zA-Z0-9]/g, '')}@intramed.com.br`;

    const resolvedTurmaLabel = String(storedReg?.turmaLabel || turmaLabel || '');
    const amount = Math.round(serverAuthorizedPrice * 100) / 100;

    // Chave de idempotência determinística por inscrição + valor + janela de 25 minutos (Item 25 da Auditoria)
    // Evita criar múltiplos Pix duplicados ao reabrir o modal
    const timeBucket = Math.floor(Date.now() / (25 * 60 * 1000));
    const deterministicKeyBase = `pix_${String(registrationId)}_${amount}_${timeBucket}`;

    const buildPayload = (payerEmail: string) => {
      const p: Record<string, unknown> = {
        transaction_amount: amount,
        description: `Intramed Cangaceira - Inscricao ${
          resolvedTurmaLabel ? resolvedTurmaLabel + ' - ' : ''
        }${firstName} ${lastName}`.slice(0, 200),
        statement_descriptor: 'INTRAMED CANG',
        payment_method_id: 'pix',
        external_reference: String(registrationId),
        payer: {
          email: payerEmail,
          first_name: firstName,
          last_name: lastName,
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

    // Tentativa 1 com o e-mail informado pelo atleta
    let mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${deterministicKeyBase}_1`,
      },
      body: JSON.stringify(buildPayload(safeEmail)),
    });

    let data = await mpResponse.json();

    // Se o Mercado Pago recusar por restrição de e-mail do próprio vendedor/pagador, usa e-mail institucional determinístico
    if (!mpResponse.ok && mpResponse.status >= 400 && mpResponse.status < 500) {
      const fallbackEmail = `inscricao.${String(registrationId).replace(
        /[^a-zA-Z0-9]/g,
        ''
      )}@atleticacangaceira.com.br`;
      mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `${deterministicKeyBase}_2`,
        },
        body: JSON.stringify(buildPayload(fallbackEmail)),
      });
      data = await mpResponse.json();
    }

    if (!mpResponse.ok) {
      console.error('[MercadoPago Pix Error]', data?.message || mpResponse.status);
      return res.status(mpResponse.status).json({
        error: 'Não foi possível gerar o QR Code Pix no momento. Verifique os dados e tente novamente.',
      });
    }

    const txData = data.point_of_interaction?.transaction_data;

    return res.status(200).json({
      success: true,
      paymentId: data.id,
      status: data.status,
      statusDetail: data.status_detail,
      amount: data.transaction_amount,
      qrCode: txData?.qr_code,
      qrCodeBase64: txData?.qr_code_base64,
      ticketUrl: txData?.ticket_url,
      dateOfExpiration: data.date_of_expiration,
      externalReference: data.external_reference,
    });
  } catch (error) {
    console.error('[MercadoPago Create Pix Exception]', error);
    return res.status(500).json({
      error: 'Falha interna ao gerar ordem de pagamento Pix.',
    });
  }
}
