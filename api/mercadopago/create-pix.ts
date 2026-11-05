import type { VercelRequest, VercelResponse } from '@vercel/node';

function isValidCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i), 10) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i), 10) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;
  return true;
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
    athleteDocument,
    turmaLabel,
    authorizedPrice,
    memberStatus,
  } = req.body || {};

  if (!registrationId || !authorizedPrice) {
    return res.status(400).json({
      error: 'Parâmetros incompletos. ID da inscrição e valor autorizado são obrigatórios.',
    });
  }

  // Regra Inviolável de Negócio: Se a solicitação de sócio estiver pendente, não pode cobrar ainda
  if (memberStatus === 'pendente') {
    return res.status(403).json({
      error: 'Inscrição com solicitação de sócio ainda pendente de validação pela diretoria da Atlética Cangaceira.',
    });
  }

  const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const appBaseUrl =
    process.env.APP_BASE_URL ||
    (req.headers.host ? `https://${req.headers.host}` : 'https://intramedix.vercel.app');

  if (!mpAccessToken) {
    return res.status(500).json({
      error: 'Credencial MERCADOPAGO_ACCESS_TOKEN não configurada no servidor.',
    });
  }

  try {
    const cleanDoc = athleteDocument ? String(athleteDocument).replace(/\D/g, '') : '';
    const nameParts = (athleteName || 'Atleta IntraMed').trim().split(/\s+/);
    const firstName = nameParts[0] || 'Atleta';
    const lastName = nameParts.slice(1).join(' ') || 'IntraMed';

    const payload: Record<string, unknown> = {
      transaction_amount: Number(authorizedPrice),
      description: `Inscrição INTRAMED IX - ${turmaLabel ? turmaLabel + ' • ' : ''}${athleteName}`,
      payment_method_id: 'pix',
      external_reference: registrationId,
      payer: {
        email:
          athleteEmail && athleteEmail.includes('@')
            ? athleteEmail
            : 'contato@atleticacangaceira.com',
        first_name: firstName,
        last_name: lastName,
      },
    };

    // Validação estrita do CPF: só anexa se os dígitos forem matematicamente válidos.
    // Evita erro 400 "Invalid user identification number" caso o participante digite matrícula universitária.
    if (cleanDoc && cleanDoc.length === 11 && isValidCPF(cleanDoc)) {
      (payload.payer as Record<string, unknown>).identification = {
        type: 'CPF',
        number: cleanDoc,
      };
    } else if (cleanDoc && cleanDoc.length === 14) {
      (payload.payer as Record<string, unknown>).identification = {
        type: 'CNPJ',
        number: cleanDoc,
      };
    }

    if (appBaseUrl && !appBaseUrl.includes('localhost') && appBaseUrl.startsWith('https://')) {
      payload.notification_url = `${appBaseUrl}/api/mercadopago/webhook`;
    }

    const idempotencyKey = `pix_${registrationId}_${Date.now()}`;

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('[MercadoPago Pix Error]', data);
      return res.status(mpResponse.status).json({
        error: 'Erro retornado pela API do Mercado Pago ao gerar Pix.',
        details: data.message || data,
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
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
