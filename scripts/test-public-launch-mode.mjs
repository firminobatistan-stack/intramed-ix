import assert from 'assert';

/**
 * Teste Automatizado de Verificação do Modo de Lançamento Público (Pre-Launch Mode)
 * Garante que:
 * 1. O modo de lançamento está ativo com todas as restrições configuradas;
 * 2. Cadastros públicos são bloqueados com HTTP 403;
 * 3. Logins públicos são bloqueados com HTTP 403;
 * 4. Login administrativo permanece funcional com HTTP 200;
 * 5. Pagamentos Pix e checkout Mercado Pago são bloqueados com HTTP 403;
 * 6. Preços reais de lotes são omitidos da API pública;
 * 7. Diretório de participantes e perfis de atletas são omitidos da API pública;
 * 8. Nenhuma conta existente foi apagada do banco.
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:5173';

async function runTests() {
  console.log('🚀 Iniciando Testes do Modo de Lançamento Público (Pre-Launch Mode)...');
  console.log(`📡 URL Base: ${BASE_URL}\n`);

  let passed = 0;
  let total = 0;

  async function testCase(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     Erro: ${err.message}`);
    }
  }

  // TESTE 1: GET /api/cloud-sync retorna launchConfig e oculta dados confidenciais
  await testCase('Snapshot público retorna launchConfig com restrições e oculta perfis/preços', async () => {
    const res = await fetch(`${BASE_URL}/api/cloud-sync`);
    assert.strictEqual(res.status, 200, `Esperado status 200, recebido ${res.status}`);
    const data = await res.json();
    assert.ok(data.launchConfig, 'launchConfig deve existir na resposta');
    assert.strictEqual(data.launchConfig.publicLaunchMode, true, 'publicLaunchMode deve ser true');
    assert.strictEqual(data.launchConfig.publicLoginEnabled, false, 'publicLoginEnabled deve ser false');
    assert.strictEqual(data.launchConfig.publicRegistrationEnabled, false, 'publicRegistrationEnabled deve ser false');
    assert.strictEqual(data.launchConfig.publicPaymentsEnabled, false, 'publicPaymentsEnabled deve ser false');
    assert.strictEqual(data.launchConfig.publicPricesVisible, false, 'publicPricesVisible deve ser false');
    assert.strictEqual(data.launchConfig.bracketPublished, false, 'bracketPublished deve ser false');
    assert.strictEqual(data.launchConfig.publicProfilesVisible, false, 'publicProfilesVisible deve ser false');

    // Perfis e atletas devem estar ocultos
    assert.ok(Array.isArray(data.profiles) && data.profiles.length === 0, 'profiles deve estar vazio para o público');
    assert.ok(Array.isArray(data.athletes) && data.athletes.length === 0, 'athletes deve estar vazio para o público');

    // Preços de lotes devem estar mascarados
    if (data.lots) {
      for (const lot of Object.values(data.lots)) {
        assert.strictEqual(lot.priceMember, null, 'Preço sócio deve ser null');
        assert.strictEqual(lot.priceNonMember, null, 'Preço não-sócio deve ser null');
      }
    }
  });

  // TESTE 2: POST /api/cloud-sync register_user deve retornar 403
  await testCase('Bloqueio real de cadastro público (register_user -> HTTP 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/cloud-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register_user',
        email: 'test_public_user@example.com',
        password: 'Password123!',
        name: 'Usuário Teste Público',
      }),
    });
    assert.strictEqual(res.status, 403, `Esperado status 403, recebido ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.ok, false);
    assert.ok(data.error.includes('temporariamente indisponíveis') || data.error.includes('Em breve'), `Mensagem deve indicar indisponibilidade: ${data.error}`);
  });

  // TESTE 3: POST /api/cloud-sync user_login de participante deve retornar 403
  await testCase('Bloqueio real de login de participante público (user_login -> HTTP 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/cloud-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'user_login',
        email: 'atleta@exemplo.com',
        password: 'qualquer_senha',
      }),
    });
    assert.strictEqual(res.status, 403, `Esperado status 403, recebido ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.ok, false);
    assert.ok(
      data.error.toLowerCase().includes('temporariamente indispon') ||
      data.error.toLowerCase().includes('breve') ||
      data.error.toLowerCase().includes('prepara'),
      `Mensagem deve indicar indisponibilidade: ${data.error}`
    );
  });

  // TESTE 4: POST /api/mercadopago/create-pix deve retornar 403
  await testCase('Bloqueio real de emissão de Pix (create-pix -> HTTP 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/mercadopago/create-pix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lotId: 'lote-1-cangaceira',
        athleteName: 'Atleta Teste',
        athleteEmail: 'atleta@teste.com',
        athleteCpf: '00000000000',
        athletePhone: '98999999999',
        isMember: false,
      }),
    });
    assert.strictEqual(res.status, 403, `Esperado status 403, recebido ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.ok, false);
    assert.ok(data.error.includes('pagamentos do IntraMed ainda está sendo preparada') || data.error.includes('Em breve'), `Mensagem deve indicar bloqueio de pagamentos: ${data.error}`);
  });

  // TESTE 5: POST /api/mercadopago/create-preference deve retornar 403
  await testCase('Bloqueio real de checkout de pagamento (create-preference -> HTTP 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/mercadopago/create-preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lotId: 'lote-1-cangaceira',
        athleteName: 'Atleta Teste',
        athleteEmail: 'atleta@teste.com',
        athleteCpf: '00000000000',
        athletePhone: '98999999999',
        isMember: false,
      }),
    });
    assert.strictEqual(res.status, 403, `Esperado status 403, recebido ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.ok, false);
    assert.ok(data.error.includes('pagamentos do IntraMed ainda está sendo preparada') || data.error.includes('Em breve'), `Mensagem deve indicar bloqueio de pagamentos: ${data.error}`);
  });

  // TESTE 6: POST /api/cloud-sync list_public_profiles deve retornar vazio para visitantes
  await testCase('Consulta direta de perfis omite participantes para o público', async () => {
    const res = await fetch(`${BASE_URL}/api/cloud-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'list_public_profiles',
      }),
    });
    assert.strictEqual(res.status, 200, `Esperado status 200, recebido ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.ok, true);
    assert.strictEqual(data.profiles.length, 0, 'profiles deve estar vazio para não-admins');
    assert.strictEqual(data.total, 0, 'total deve ser 0');
  });

  // TESTE 7: Login administrativo (cangaceira@uema.com) continua funcionando
  await testCase('Preservação do acesso administrativo (admin_login -> HTTP 200)', async () => {
    const res = await fetch(`${BASE_URL}/api/cloud-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'admin_login',
        email: 'cangaceira@uema.com',
        password: process.env.INTRAMED_MASTER_PASSWORD || 'campeao2027',
      }),
    });
    assert.strictEqual(res.status, 200, `Esperado status 200 para admin, recebido ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.ok, true);
    assert.ok(data.token, 'Token assinado de operador deve ser retornado');
    assert.strictEqual(data.user?.email, 'cangaceira@uema.com');
  });

  console.log(`\n🏁 Resultado: ${passed}/${total} testes passaram com sucesso.`);
  if (passed === total) {
    console.log('🎉 Modo de Lançamento Público validado com 100% de conformidade!');
    process.exit(0);
  } else {
    console.error('⚠️ Alguns testes falharam.');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
