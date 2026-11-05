import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'mercadopago-api-dev-server',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url?.startsWith('/api/mercadopago/')) {
              return next();
            }

            const url = new URL(req.url, 'http://localhost');
            const pathname = url.pathname;
            const mpAccessToken = env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN;

            if (pathname === '/api/mercadopago/create-pix' && req.method === 'POST') {
              let bodyStr = '';
              req.on('data', (chunk) => {
                bodyStr += chunk;
              });
              req.on('end', async () => {
                try {
                  const body = JSON.parse(bodyStr || '{}');
                  const {
                    registrationId,
                    athleteName,
                    athleteEmail,
                    athleteDocument,
                    turmaLabel,
                    authorizedPrice,
                    memberStatus,
                  } = body;

                  if (!registrationId || !authorizedPrice) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ error: 'Parâmetros incompletos.' }));
                  }

                  if (memberStatus === 'pendente') {
                    res.statusCode = 403;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(
                      JSON.stringify({
                        error: 'Inscrição de sócio ainda pendente de validação pela diretoria.',
                      })
                    );
                  }

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

                  const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${mpAccessToken}`,
                      'Content-Type': 'application/json',
                      'X-Idempotency-Key': `pix_${registrationId}_${Date.now()}`,
                    },
                    body: JSON.stringify(payload),
                  });

                  const data = await mpRes.json();
                  res.statusCode = mpRes.status;
                  res.setHeader('Content-Type', 'application/json');

                  if (!mpRes.ok) {
                    return res.end(
                      JSON.stringify({
                        error: data.message || 'Erro ao gerar Pix no Mercado Pago.',
                        details: data,
                      })
                    );
                  }

                  const txData = data.point_of_interaction?.transaction_data;
                  return res.end(
                    JSON.stringify({
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
                    })
                  );
                } catch (e) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: String(e) }));
                }
              });
              return;
            }

            if (pathname === '/api/mercadopago/create-preference' && req.method === 'POST') {
              let bodyStr = '';
              req.on('data', (chunk) => {
                bodyStr += chunk;
              });
              req.on('end', async () => {
                try {
                  const body = JSON.parse(bodyStr || '{}');
                  const {
                    registrationId,
                    athleteName,
                    athleteEmail,
                    athleteDocument,
                    turmaLabel,
                    authorizedPrice,
                    memberStatus,
                    isCreditCard,
                    cardFeeAmount,
                  } = body;

                  if (!registrationId || !authorizedPrice || !athleteEmail) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ error: 'Parâmetros incompletos.' }));
                  }

                  if (memberStatus === 'pendente') {
                    res.statusCode = 403;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ error: 'Inscrição de sócio pendente de validação.' }));
                  }

                  const basePrice = Number(authorizedPrice);
                  const fee = isCreditCard
                    ? cardFeeAmount
                      ? Number(cardFeeAmount)
                      : Math.round(basePrice * 0.05 * 100) / 100
                    : 0;

                  const items = [
                    {
                      id: registrationId,
                      title: `Inscrição INTRAMED IX — ${turmaLabel ? turmaLabel + ' • ' : ''}Passaporte Geral (${athleteName})`,
                      quantity: 1,
                      unit_price: basePrice,
                      currency_id: 'BRL',
                    },
                  ];

                  if (fee > 0) {
                    items.push({
                      id: `${registrationId}-taxa-cartao`,
                      title: 'Taxa Administrativa Operadora de Cartão (Repasse Gateway)',
                      quantity: 1,
                      unit_price: fee,
                      currency_id: 'BRL',
                    });
                  }

                  const cleanDoc = athleteDocument ? String(athleteDocument).replace(/\D/g, '') : '';
                  const payerData: Record<string, unknown> = {
                    name: athleteName,
                    email: athleteEmail,
                  };

                  if (cleanDoc && cleanDoc.length === 11 && isValidCPF(cleanDoc)) {
                    payerData.identification = { type: 'CPF', number: cleanDoc };
                  }

                  const appBaseUrl = 'https://intramedix.vercel.app';

                  const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${mpAccessToken}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      items,
                      payer: payerData,
                      back_urls: {
                        success: `${appBaseUrl}/inscricao?status=sucesso&reg=${registrationId}`,
                        pending: `${appBaseUrl}/inscricao?status=pendente&reg=${registrationId}`,
                        failure: `${appBaseUrl}/inscricao?status=falha&reg=${registrationId}`,
                      },
                      auto_return: 'approved',
                      external_reference: registrationId,
                      payment_methods: { installments: 6 },
                    }),
                  });

                  const data = await mpRes.json();
                  res.statusCode = mpRes.status;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(
                    JSON.stringify({
                      preferenceId: data.id,
                      initPoint: data.init_point,
                      sandboxInitPoint: data.sandbox_init_point,
                      externalReference: registrationId,
                      baseAmount: basePrice,
                      feeAmount: fee,
                      totalAmount: basePrice + fee,
                    })
                  );
                } catch (e) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: String(e) }));
                }
              });
              return;
            }

            if (pathname === '/api/mercadopago/check-payment' && req.method === 'GET') {
              const paymentId = url.searchParams.get('paymentId');
              if (!paymentId) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'paymentId obrigatório.' }));
              }

              try {
                const mpCheck = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                  headers: { Authorization: `Bearer ${mpAccessToken}` },
                });
                const data = await mpCheck.json();
                res.statusCode = mpCheck.status;
                res.setHeader('Content-Type', 'application/json');
                return res.end(
                  JSON.stringify({
                    paymentId: data.id,
                    status: data.status,
                    statusDetail: data.status_detail,
                    isApproved: data.status === 'approved',
                    amount: data.transaction_amount,
                    externalReference: data.external_reference,
                  })
                );
              } catch (e) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: String(e) }));
              }
            }

            next();
          });
        },
      },
    ],
  };
});
