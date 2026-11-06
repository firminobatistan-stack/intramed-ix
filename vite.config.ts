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
          const devCloudStore: Record<string, any> = {
            registrations: {},
            athletes: {},
            teams: {},
            matches: {},
            match_sheets: {},
            users: {},
            profiles: {},
            brackets: {},
            masterPassword: 'campeao2027',
            masterMustChange: true,
            launch_config: {
              publicLaunchMode: true,
              publicLoginEnabled: false,
              publicRegistrationEnabled: false,
              publicPaymentsEnabled: false,
              publicPricesVisible: false,
              bracketPublished: false,
              publicProfilesVisible: false,
              announcementTitle: 'ACESSO EM BREVE',
              announcementMessage:
                'Estamos preparando a área de participantes do IntraMed. Em breve, você poderá criar sua conta e acompanhar sua participação no evento diretamente pela plataforma. Enquanto isso, continue acompanhando as informações e o chaveamento por aqui.',
            },
          };

          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/mercadopago/')) {
              if (
                devCloudStore.launch_config.publicPaymentsEnabled === false &&
                (req.url.includes('create-pix') || req.url.includes('create-preference'))
              ) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 403;
                return res.end(
                  JSON.stringify({
                    ok: false,
                    error:
                      'A área de pagamentos do IntraMed ainda está sendo preparada. Em breve, você poderá realizar sua inscrição e efetuar o pagamento diretamente pela plataforma.',
                  })
                );
              }
            }

            if (req.url?.startsWith('/api/cloud-sync')) {
              res.setHeader('Content-Type', 'application/json');
              if (req.method === 'GET') {
                const isProfilesVisible = Boolean(devCloudStore.launch_config.publicProfilesVisible);
                return res.end(
                  JSON.stringify({
                    success: true,
                    updatedAtIso: new Date().toISOString(),
                    launchConfig: devCloudStore.launch_config,
                    registrations: isProfilesVisible ? Object.values(devCloudStore.registrations) : [],
                    athletes: isProfilesVisible ? Object.values(devCloudStore.athletes) : [],
                    teams: Object.values(devCloudStore.teams),
                    matches: Object.values(devCloudStore.matches),
                    match_sheets: Object.values(devCloudStore.match_sheets),
                    profiles: isProfilesVisible ? Object.values(devCloudStore.profiles) : [],
                    brackets: devCloudStore.brackets || {},
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
                    if (body.action === 'admin_login') {
                      const emailIn = String(body.email || '').trim().toLowerCase();
                      const passIn = String(body.password || '').trim();
                      const masterEmail = 'cangaceira@uema.com';
                      if (emailIn === masterEmail) {
                        const currentMasterPass = devCloudStore.masterPassword || 'campeao2027';
                        const mustChange = devCloudStore.masterMustChange !== false && currentMasterPass === 'campeao2027';
                        if (passIn === currentMasterPass) {
                          return res.end(
                            JSON.stringify({
                              ok: true,
                              token: 'dev_signed_master_token_' + Date.now(),
                              role: 'moderador_master',
                              mustChangePassword: mustChange,
                              user: {
                                id: 'usr_master_cangaceira',
                                email: masterEmail,
                                name: 'Atlética Cangaceira',
                                role: 'moderador_master',
                                organization: 'Associação Atlética Acadêmica de Medicina UEMA – Cangaceira',
                                mustChangePassword: mustChange,
                              },
                            })
                          );
                        } else {
                          res.statusCode = 401;
                          return res.end(JSON.stringify({ ok: false, error: 'Senha administrativa incorreta.' }));
                        }
                      }
                    }
                    if (body.action === 'change_admin_password') {
                      const newPass = String(body.newPassword || '').trim();
                      if (newPass.length < 6) {
                        res.statusCode = 400;
                        return res.end(
                          JSON.stringify({
                            ok: false,
                            error: 'A nova senha deve possuir no mínimo 6 caracteres.',
                          })
                        );
                      }
                      devCloudStore.masterPassword = newPass;
                      devCloudStore.masterMustChange = false;
                      return res.end(
                        JSON.stringify({
                          ok: true,
                          token: 'dev_unlocked_master_token_' + Date.now(),
                          message: 'Senha atualizada com sucesso!',
                          mustChangePassword: false,
                          user: {
                            id: 'usr_master_cangaceira',
                            email: 'cangaceira@uema.com',
                            name: 'Atlética Cangaceira',
                            role: 'moderador_master',
                            organization: 'Associação Atlética Acadêmica de Medicina UEMA – Cangaceira',
                            mustChangePassword: false,
                          },
                        })
                      );
                    }
                    if (body.action === 'register_user') {
                      if (devCloudStore.launch_config.publicRegistrationEnabled === false) {
                        res.statusCode = 403;
                        return res.end(
                          JSON.stringify({
                            ok: false,
                            error:
                              'As inscrições e o cadastro de participantes estão temporariamente indisponíveis. Em breve o IntraMed será aberto oficialmente!',
                          })
                        );
                      }
                      const emailIn = String(body.email || '').trim().toLowerCase();
                      const nameIn = String(body.name || '').trim();
                      const passIn = String(body.password || '').trim();
                      if (!emailIn || !nameIn || passIn.length < 6) {
                        res.statusCode = 400;
                        return res.end(JSON.stringify({ ok: false, error: 'Dados incompletos ou senha com menos de 6 caracteres.' }));
                      }
                      if (devCloudStore.users[emailIn]) {
                        res.statusCode = 409;
                        return res.end(JSON.stringify({ ok: false, error: 'E-mail já cadastrado.' }));
                      }
                      const uId = `usr_${Date.now()}`;
                      const uObj = {
                        id: uId,
                        email: emailIn,
                        name: nameIn,
                        password: passIn,
                        role: 'visitante',
                        createdAtIso: new Date().toISOString(),
                      };
                      const pObj = {
                        id: uId,
                        userId: uId,
                        displayName: nameIn,
                        turma: body.turma || null,
                        turmaLabel: body.turmaLabel || null,
                        teamId: body.teamId || null,
                        teamName: body.teamName || null,
                        bio: body.bio || null,
                        instagramHandle: body.instagramHandle || null,
                        avatarUrl: body.avatarUrl || null,
                        isAthlete: false,
                        favoriteModalityIds: [],
                        createdAtIso: new Date().toISOString(),
                      };
                      devCloudStore.users[emailIn] = uObj;
                      devCloudStore.users[uId] = uObj;
                      devCloudStore.profiles[uId] = pObj;
                      return res.end(
                        JSON.stringify({
                          ok: true,
                          token: `dev_token_${uId}`,
                          user: { id: uId, email: emailIn, name: nameIn, role: 'visitante' },
                          profile: pObj,
                        })
                      );
                    }
                    if (body.action === 'user_login') {
                      const idIn = String(body.email || body.identifier || '').trim().toLowerCase();
                      const passIn = String(body.password || '').trim();
                      if (devCloudStore.launch_config.publicLoginEnabled === false && idIn !== 'cangaceira@uema.com') {
                        res.statusCode = 403;
                        return res.end(
                          JSON.stringify({
                            ok: false,
                            error:
                              'O login público de participantes está em preparação e será liberado em breve. Acompanhe as informações do evento por aqui!',
                          })
                        );
                      }
                      if (idIn === 'cangaceira@uema.com') {
                        const curPass = devCloudStore.masterPassword || 'campeao2027';
                        if (passIn === curPass) {
                          return res.end(
                            JSON.stringify({
                              ok: true,
                              token: 'dev_master_token_' + Date.now(),
                              user: { id: 'usr_master_cangaceira', email: 'cangaceira@uema.com', name: 'Atlética Cangaceira', role: 'moderador_master' },
                              profile: { id: 'usr_master_cangaceira', displayName: 'Atlética Cangaceira', role: 'moderador_master' },
                            })
                          );
                        } else {
                          res.statusCode = 401;
                          return res.end(JSON.stringify({ ok: false, error: 'Senha incorreta.' }));
                        }
                      }
                      const u = devCloudStore.users[idIn];
                      if (u) {
                        if (u.password !== passIn) {
                          res.statusCode = 401;
                          return res.end(JSON.stringify({ ok: false, error: 'Senha incorreta.' }));
                        }
                        const p = devCloudStore.profiles[u.id] || { id: u.id, displayName: u.name };
                        return res.end(
                          JSON.stringify({
                            ok: true,
                            token: `dev_token_${u.id}`,
                            user: { id: u.id, email: u.email, name: u.name, role: u.role },
                            profile: p,
                          })
                        );
                      }
                      // Checa registros
                      const allRegs = Object.values(devCloudStore.registrations);
                      const foundReg = allRegs.find((r) => {
                        const em = String(r.athleteEmail || '').trim().toLowerCase();
                        const usr = String(r.accountUsername || '').trim().toLowerCase();
                        return em === idIn || (usr && usr === idIn);
                      });
                      if (foundReg) {
                        if (foundReg.accountPassword && String(foundReg.accountPassword) !== passIn) {
                          res.statusCode = 401;
                          return res.end(JSON.stringify({ ok: false, error: 'Senha incorreta.' }));
                        }
                        const uId = `usr-${foundReg.id}`;
                        const p = {
                          id: uId,
                          userId: uId,
                          displayName: foundReg.athleteName,
                          turma: foundReg.turma,
                          turmaLabel: foundReg.turmaLabel,
                          teamId: foundReg.teamId,
                          teamName: foundReg.teamName,
                          avatarUrl: foundReg.avatarUrl,
                          isAthlete: true,
                          linkedAthleteId: foundReg.linkedAthleteId || `ath-${foundReg.id}`,
                        };
                        return res.end(
                          JSON.stringify({
                            ok: true,
                            token: `dev_token_${uId}`,
                            user: { id: uId, email: foundReg.athleteEmail, name: foundReg.athleteName, role: 'atleta', linkedAthleteId: p.linkedAthleteId },
                            profile: p,
                          })
                        );
                      }
                      res.statusCode = 404;
                      return res.end(JSON.stringify({ ok: false, error: 'Conta não encontrada.' }));
                    }
                    if (body.action === 'change_user_password') {
                      const emailIn = String(body.email || '').trim().toLowerCase();
                      const newP = String(body.newPassword || '').trim();
                      if (devCloudStore.users[emailIn]) {
                        devCloudStore.users[emailIn].password = newP;
                        return res.end(JSON.stringify({ ok: true, message: 'Senha alterada com sucesso.' }));
                      }
                      return res.end(JSON.stringify({ ok: true, message: 'Senha atualizada.' }));
                    }
                    if (body.action === 'update_user_profile') {
                      const targetId = String(body.userId || body.id || '').trim();
                      if (targetId && devCloudStore.profiles[targetId]) {
                        devCloudStore.profiles[targetId] = {
                          ...devCloudStore.profiles[targetId],
                          ...body,
                          id: targetId,
                        };
                        return res.end(JSON.stringify({ ok: true, profile: devCloudStore.profiles[targetId] }));
                      }
                      if (targetId) {
                        devCloudStore.profiles[targetId] = { ...body, id: targetId };
                        return res.end(JSON.stringify({ ok: true, profile: devCloudStore.profiles[targetId] }));
                      }
                      res.statusCode = 400;
                      return res.end(JSON.stringify({ ok: false, error: 'ID inválido.' }));
                    }
                    if (body.action === 'list_public_profiles') {
                      if (devCloudStore.launch_config.publicProfilesVisible === false) {
                        return res.end(
                          JSON.stringify({
                            ok: true,
                            profiles: [],
                            total: 0,
                            message: 'A lista de participantes e perfis está temporariamente oculta durante a fase de divulgação.',
                          })
                        );
                      }
                      const allP = Object.values(devCloudStore.profiles);
                      return res.end(JSON.stringify({ ok: true, profiles: allP, total: allP.length }));
                    }
                    if (body.action === 'update_launch_config') {
                      devCloudStore.launch_config = {
                        ...devCloudStore.launch_config,
                        ...(body.launchConfig || {}),
                      };
                      return res.end(
                        JSON.stringify({
                          ok: true,
                          launchConfig: devCloudStore.launch_config,
                        })
                      );
                    }
                    if (body.action === 'save_bracket') {
                      const mId = String(body.modalityId || body.bracket?.modalityId || '');
                      if (mId && body.bracket) {
                        devCloudStore.brackets[mId] = body.bracket;
                      }
                      return res.end(
                        JSON.stringify({
                          ok: true,
                          bracket: body.bracket,
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
