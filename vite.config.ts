import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'mercadopago-api-dev-server',
        configureServer(server) {
          const devCloudStore: Record<string, Record<string, Record<string, unknown>>> = {
            registrations: {},
            athletes: {},
            teams: {},
            matches: {},
            match_sheets: {},
          };

          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/cloud-sync')) {
              res.setHeader('Content-Type', 'application/json');
              if (req.method === 'GET') {
                return res.end(
                  JSON.stringify({
                    success: true,
                    updatedAtIso: new Date().toISOString(),
                    registrations: Object.values(devCloudStore.registrations),
                    athletes: Object.values(devCloudStore.athletes),
                    teams: Object.values(devCloudStore.teams),
                    matches: Object.values(devCloudStore.matches),
                    match_sheets: Object.values(devCloudStore.match_sheets),
                  })
                );
              }
              if (req.method === 'POST') {
                let bodyStr = '';
                req.on('data', (chunk) => {
                  bodyStr += chunk;
                });
                req.on('end', () => {
                  try {
                    const body = JSON.parse(bodyStr || '{}');
                    if (body.action === 'verify_operator_pin') {
                      const cleanPass = String(body.password || '').trim();
                      const matchId = body.matchId ? String(body.matchId).trim() : '';
                      if (cleanPass === 'bicoduro') {
                        return res.end(
                          JSON.stringify({
                            success: true,
                            role: 'admin',
                            matchId: matchId || null,
                            token: 'dev_admin_token_bicoduro',
                          })
                        );
                      }
                      if (matchId) {
                        const matchDoc = devCloudStore.matches[matchId];
                        const storedPin = matchDoc?.tableOfficialPassword
                          ? String(matchDoc.tableOfficialPassword).trim().toLowerCase()
                          : '';
                        if (storedPin && storedPin === cleanPass.toLowerCase()) {
                          return res.end(
                            JSON.stringify({
                              success: true,
                              role: 'mesario',
                              matchId,
                              token: `dev_mesario_token_${matchId}`,
                            })
                          );
                        }
                      }
                      res.statusCode = 401;
                      return res.end(JSON.stringify({ error: 'Senha incorreta.' }));
                    }
                    if (body.action === 'set_match_pin') {
                      const mId = String(body.matchId || '').trim();
                      const pin = String(body.pin || '').trim();
                      if (mId && devCloudStore.matches[mId]) {
                        devCloudStore.matches[mId].tableOfficialPassword = pin;
                        devCloudStore.matches[mId].hasTableOfficialPassword = Boolean(pin);
                      }
                      return res.end(
                        JSON.stringify({
                          success: true,
                          matchId: mId,
                          hasPassword: Boolean(pin),
                        })
                      );
                    }
                    if (body.action === 'athlete_login') {
                      const idIn = String(body.identifier || '').trim().toLowerCase();
                      const passIn = String(body.password || '').trim();
                      const cleanDoc = idIn.replace(/\D/g, '');
                      const allRegs = Object.values(devCloudStore.registrations);
                      const found = allRegs.find((r) => {
                        const em = String(r.athleteEmail || '').trim().toLowerCase();
                        const usr = String(r.accountUsername || '').trim().toLowerCase();
                        const doc = String(r.athleteDocument || '').replace(/\D/g, '');
                        return em === idIn || (usr && usr === idIn) || (cleanDoc.length >= 6 && doc === cleanDoc);
                      });
                      if (!found) {
                        res.statusCode = 404;
                        return res.end(JSON.stringify({ ok: false, error: 'Conta não encontrada.' }));
                      }
                      if (found.accountPassword && String(found.accountPassword) !== passIn) {
                        res.statusCode = 401;
                        return res.end(JSON.stringify({ ok: false, error: 'Senha incorreta.' }));
                      }
                      return res.end(JSON.stringify({ ok: true, registration: found }));
                    }
                    const { collectionName, docId, data, batch } = body;
                    if (Array.isArray(batch)) {
                      for (const item of batch) {
                        if (item?.collectionName && item?.docId && item?.data && devCloudStore[item.collectionName]) {
                          devCloudStore[item.collectionName][item.docId] = {
                            ...(devCloudStore[item.collectionName][item.docId] || {}),
                            ...item.data,
                            id: item.docId,
                          };
                        }
                      }
                    } else if (collectionName && docId && data && devCloudStore[collectionName]) {
                      devCloudStore[collectionName][String(docId)] = {
                        ...(devCloudStore[collectionName][String(docId)] || {}),
                        ...data,
                        id: String(docId),
                      };
                    }
                    return res.end(JSON.stringify({ success: true, updatedAtIso: new Date().toISOString() }));
                  } catch (e) {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ error: String(e) }));
                  }
                });
                return;
              }
            }

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

                  const rawName = (athleteName || 'Atleta IntraMed').trim();
                  const nameParts = rawName.split(/\s+/);
                  const firstName = (nameParts[0] || 'Atleta').replace(/[^a-zA-ZÀ-ÿ\s]/g, '') || 'Atleta';
                  const lastName = (nameParts.slice(1).join(' ') || 'IntraMed').replace(/[^a-zA-ZÀ-ÿ\s]/g, '') || 'IntraMed';

                  const cleanEmail = (athleteEmail || '').trim().toLowerCase();
                  const safeEmail = isValidEmail(cleanEmail)
                    ? cleanEmail
                    : `atleta.${Date.now()}@intramed.com.br`;

                  const amount = Math.round(Number(authorizedPrice) * 100) / 100;

                  const buildPayload = (payerEmail: string) => ({
                    transaction_amount: amount,
                    description: `Inscricao INTRAMED IX - ${turmaLabel ? turmaLabel + ' - ' : ''}${firstName} ${lastName}`.slice(0, 200),
                    payment_method_id: 'pix',
                    external_reference: String(registrationId),
                    payer: {
                      email: payerEmail,
                      first_name: firstName,
                      last_name: lastName,
                    },
                  });

                  let mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${mpAccessToken}`,
                      'Content-Type': 'application/json',
                      'X-Idempotency-Key': `pix_${registrationId}_${Date.now()}_1`,
                    },
                    body: JSON.stringify(buildPayload(safeEmail)),
                  });

                  let data = await mpRes.json();

                  if (!mpRes.ok) {
                    const fallbackEmail = `inscricao.${Date.now()}@atleticacangaceira.com.br`;
                    mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${mpAccessToken}`,
                        'Content-Type': 'application/json',
                        'X-Idempotency-Key': `pix_${registrationId}_${Date.now()}_2`,
                      },
                      body: JSON.stringify(buildPayload(fallbackEmail)),
                    });
                    data = await mpRes.json();
                  }

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
                    turmaLabel,
                    authorizedPrice,
                    memberStatus,
                    isCreditCard,
                    cardFeeAmount,
                  } = body;

                  if (!registrationId || !authorizedPrice) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ error: 'Parâmetros incompletos.' }));
                  }

                  if (memberStatus === 'pendente') {
                    res.statusCode = 403;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ error: 'Inscrição de sócio pendente de validação.' }));
                  }

                  const basePrice = Math.round(Number(authorizedPrice) * 100) / 100;
                  const fee = isCreditCard
                    ? cardFeeAmount
                      ? Math.round(Number(cardFeeAmount) * 100) / 100
                      : Math.round(basePrice * 0.05 * 100) / 100
                    : 0;

                  const items = [
                    {
                      id: String(registrationId),
                      title: `Inscricao INTRAMED IX - ${turmaLabel ? turmaLabel + ' - ' : ''}Passaporte Geral (${athleteName || 'Atleta'})`,
                      quantity: 1,
                      unit_price: basePrice,
                      currency_id: 'BRL',
                    },
                  ];

                  if (fee > 0) {
                    items.push({
                      id: `${registrationId}-taxa-cartao`,
                      title: 'Taxa Administrativa Operadora de Cartao (Repasse Gateway)',
                      quantity: 1,
                      unit_price: fee,
                      currency_id: 'BRL',
                    });
                  }

                  const cleanEmail = (athleteEmail || '').trim().toLowerCase();
                  const safeEmail = isValidEmail(cleanEmail)
                    ? cleanEmail
                    : `atleta.${Date.now()}@intramed.com.br`;

                  const appBaseUrl = 'https://intramedix.vercel.app';

                  const buildPrefPayload = (payerEmail: string) => ({
                    items,
                    payer: {
                      name: (athleteName || 'Atleta IntraMed').trim(),
                      email: payerEmail,
                    },
                    back_urls: {
                      success: `${appBaseUrl}/inscricao?status=sucesso&reg=${registrationId}`,
                      pending: `${appBaseUrl}/inscricao?status=pendente&reg=${registrationId}`,
                      failure: `${appBaseUrl}/inscricao?status=falha&reg=${registrationId}`,
                    },
                    auto_return: 'approved',
                    external_reference: String(registrationId),
                    payment_methods: { installments: 6 },
                  });

                  let mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${mpAccessToken}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(buildPrefPayload(safeEmail)),
                  });

                  let data = await mpRes.json();

                  if (!mpRes.ok) {
                    const fallbackEmail = `inscricao.${Date.now()}@atleticacangaceira.com.br`;
                    mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${mpAccessToken}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(buildPrefPayload(fallbackEmail)),
                    });
                    data = await mpRes.json();
                  }

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
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-firebase': ['firebase/app', 'firebase/firestore'],
            'vendor-icons': ['lucide-react'],
          },
        },
      },
    },
  };
});
