import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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

                  if (cleanDoc && (cleanDoc.length === 11 || cleanDoc.length === 14)) {
                    (payload.payer as Record<string, unknown>).identification = {
                      type: cleanDoc.length === 14 ? 'CNPJ' : 'CPF',
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
