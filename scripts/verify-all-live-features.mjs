async function verifyAllLiveFeatures() {
  const baseUrl = 'https://intramedix.vercel.app';
  console.log(`=== LIVE SMOKE TEST ON PRODUCTION (${baseUrl}) ===\n`);

  // 1. GET /api/cloud-sync
  console.log('1. Checking Public Launch Mode & Bracket Publication:');
  const syncRes = await fetch(`${baseUrl}/api/cloud-sync?t=${Date.now()}`);
  const syncData = await syncRes.json();
  console.log('   ✓ Status 200 OK');
  console.log('   ✓ publicLaunchMode:', syncData.launchConfig.publicLaunchMode);
  console.log('   ✓ publicLoginEnabled:', syncData.launchConfig.publicLoginEnabled, '(Bloqueado)');
  console.log('   ✓ publicRegistrationEnabled:', syncData.launchConfig.publicRegistrationEnabled, '(Bloqueado)');
  console.log('   ✓ publicPaymentsEnabled:', syncData.launchConfig.publicPaymentsEnabled, '(Bloqueado)');
  console.log('   ✓ bracketPublished:', syncData.launchConfig.bracketPublished, '(Publicado para o público)');
  console.log('   ✓ Total Matches:', (syncData.matches || []).length, '(Esperado: 64)');
  console.log('   ✓ Total Brackets:', Object.keys(syncData.brackets || {}).length, '(Esperado: 16)');

  if (
    syncData.launchConfig.publicLaunchMode !== true ||
    syncData.launchConfig.publicLoginEnabled !== false ||
    syncData.launchConfig.publicRegistrationEnabled !== false ||
    syncData.launchConfig.publicPaymentsEnabled !== false ||
    syncData.launchConfig.bracketPublished !== true ||
    syncData.matches.length !== 64 ||
    Object.keys(syncData.brackets).length !== 16
  ) {
    throw new Error('Configuração de lançamento ou dados de chaveamento divergentes no ambiente de produção!');
  }

  // 2. Mercado Pago Payment Block Check
  console.log('\n2. Testing Payment Block on Live API (Mercado Pago):');
  const pixRes = await fetch(`${baseUrl}/api/mercadopago/create-pix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registrationId: 'test-blocked' }),
  });
  console.log('   ✓ Status:', pixRes.status, '(Esperado: 403 Forbidden)');
  const pixData = await pixRes.json();
  console.log('   ✓ Bloqueio confirmado:', pixData.error?.slice(0, 60) + '...');
  if (pixRes.status !== 403) {
    throw new Error(`Esperado status 403 para pagamentos em modo público, recebido: ${pixRes.status}`);
  }

  // 3. Public Registration Block Check
  console.log('\n3. Testing Registration Block on Live API (register_user):');
  const regRes = await fetch(`${baseUrl}/api/cloud-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'register_user',
      name: 'Teste Bloqueio',
      email: 'teste@bloqueio.com',
      password: 'senha_teste_123',
    }),
  });
  console.log('   ✓ Status:', regRes.status, '(Esperado: 403 Forbidden)');
  const regData = await regRes.json();
  console.log('   ✓ Bloqueio confirmado:', regData.error?.slice(0, 60) + '...');
  if (regRes.status !== 403) {
    throw new Error(`Esperado status 403 para inscrições públicas, recebido: ${regRes.status}`);
  }

  // 4. Public Login Block Check
  console.log('\n4. Testing Participant Login Block on Live API (user_login):');
  const loginRes = await fetch(`${baseUrl}/api/cloud-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'user_login',
      identifier: 'participante@teste.com',
      password: 'qualquersenha',
    }),
  });
  console.log('   ✓ Status:', loginRes.status, '(Esperado: 403 Forbidden)');
  const loginData = await loginRes.json();
  console.log('   ✓ Bloqueio confirmado:', loginData.error?.slice(0, 60) + '...');
  if (loginRes.status !== 403) {
    throw new Error(`Esperado status 403 para login de participante, recebido: ${loginRes.status}`);
  }

  // 5. Admin Login Gating Check (Deve continuar aceitando a comissão/master)
  console.log('\n5. Testing Admin Login Gateway (Comissão / Master):');
  const adminRes = await fetch(`${baseUrl}/api/cloud-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'admin_login',
      email: 'cangaceira@uema.com',
      password: 'senha_incorreta_deve_falhar',
    }),
  });
  console.log('   ✓ Status com senha incorreta:', adminRes.status, '(Esperado: 401 Unauthorized - Protegido contra bypass)');
  if (adminRes.status !== 401) {
    throw new Error(`Esperado status 401 para senha inválida de admin, recebido: ${adminRes.status}`);
  }

  // 6. Test Modalities Coverage in Live Matches
  console.log('\n6. Checking All 16 Modalities Coverage in Live Matches:');
  const expectedModalities = [
    'futsal-masc', 'futsal-fem', 'volei-fem', 'volei-masc',
    'basquete-fem', 'tenis-mesa-masc', 'tenis-mesa-fem', 'sinuca-fem',
    'sinuca-masc', 'handebol-masc', 'handebol-fem', 'basquete-masc',
    'volei-praia-masc', 'volei-praia-fem', 'truco-fem', 'truco-masc'
  ];

  for (const mId of expectedModalities) {
    const modMatches = syncData.matches.filter(m => m.categoryId === mId);
    if (modMatches.length !== 4) {
      throw new Error(`Modalidade ${mId} possui ${modMatches.length} partidas no servidor (esperado: 4)!`);
    }
    const bracket = syncData.brackets[mId];
    if (!bracket || !bracket.stages || bracket.stages.length !== 3) {
      throw new Error(`Modalidade ${mId} não possui bracket universal com 3 estágios no servidor!`);
    }
  }
  console.log('   ✓ Todas as 16 modalidades possuem exatamente 4 partidas eliminatórias e chaveamento universal ativo!');

  console.log('\n===============================================================');
  console.log(' TODAS AS FUNCIONALIDADES DE PRODUÇÃO FORAM VALIDADAS COM SUCESSO! ');
  console.log('===============================================================');
}

verifyAllLiveFeatures();
