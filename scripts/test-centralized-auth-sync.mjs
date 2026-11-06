import { createHmac } from 'crypto';

const API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyC0JteZ0ph3UI1kdmu7m8DqpnGRLh9oS0g';
const BASE_AUTH_URL = 'https://identitytoolkit.googleapis.com/v1';

async function runTests() {
  console.log('\n--- INICIANDO BATERIA DE TESTES DE INTEGRAÇÃO CENTRALIZADA (P0) ---\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failedCount++;
    }
  }

  // TESTE 1: Master Moderator - Rejeição de senha incorreta
  try {
    const res = await fetch(`${BASE_AUTH_URL}/accounts:signInWithPassword?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cangaceira@uema.com',
        password: 'senha_completamente_errada_123',
        returnSecureToken: true,
      }),
    });
    const data = await res.json();
    assert(
      !res.ok && data.error && (data.error.message === 'INVALID_LOGIN_CREDENTIALS' || data.error.message === 'INVALID_PASSWORD'),
      'Teste 1: Firebase Auth rejeita terminantemente senhas incorretas da conta Master'
    );
  } catch (err) {
    assert(false, 'Teste 1 falhou com erro: ' + err.message);
  }

  // TESTE 2: Master Moderator - Login com senha autorizada
  let masterIdToken = null;
  try {
    const res = await fetch(`${BASE_AUTH_URL}/accounts:signInWithPassword?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cangaceira@uema.com',
        password: 'campeao2027',
        returnSecureToken: true,
      }),
    });
    const data = await res.json();
    masterIdToken = data.idToken;
    assert(
      res.ok && Boolean(data.idToken) && data.email === 'cangaceira@uema.com',
      'Teste 2: Login da conta Master com credencial autorizada gera token oficial no Google'
    );
  } catch (err) {
    assert(false, 'Teste 2 falhou com erro: ' + err.message);
  }

  // TESTE 3: Persistência permanente de alteração de senha e metadados no Google Firebase Auth
  const testNewPass = 'NovaSenhaSegura2027!';
  let changeSucceeded = false;
  if (masterIdToken) {
    try {
      const meta = {
        role: 'moderador_master',
        name: 'Atlética Cangaceira',
        organization: 'Associação Atlética Acadêmica de Medicina UEMA – Cangaceira',
        mustChangePassword: false,
        updatedAtIso: new Date().toISOString(),
      };
      const metaB64 = 'data:application/json;base64,' + Buffer.from(JSON.stringify(meta)).toString('base64');

      const uRes = await fetch(`${BASE_AUTH_URL}/accounts:update?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: masterIdToken,
          password: testNewPass,
          displayName: 'Atlética Cangaceira',
          photoUrl: metaB64,
          returnSecureToken: true,
        }),
      });
      const uData = await uRes.json();
      changeSucceeded = uRes.ok && Boolean(uData.idToken);
      assert(
        changeSucceeded,
        'Teste 3: Alteração de senha e metadados persistida diretamente no Google Cloud Identity'
      );
    } catch (err) {
      assert(false, 'Teste 3 falhou com erro: ' + err.message);
    }
  }

  // TESTE 4: Simulação Dispositivo Mobile vs Dispositivo PC
  // Ambos os dispositivos devem logar com a nova senha e recuperar mustChangePassword: false
  if (changeSucceeded) {
    try {
      // Dispositivo A (Mobile)
      const resMobile = await fetch(`${BASE_AUTH_URL}/accounts:signInWithPassword?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'cangaceira@uema.com',
          password: testNewPass,
          returnSecureToken: true,
        }),
      });
      const dataMobile = await resMobile.json();

      // Dispositivo B (PC)
      const resPC = await fetch(`${BASE_AUTH_URL}/accounts:signInWithPassword?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'cangaceira@uema.com',
          password: testNewPass,
          returnSecureToken: true,
        }),
      });
      const dataPC = await resPC.json();

      const bothSucceeded = resMobile.ok && resPC.ok;
      const sameUid = dataMobile.localId === dataPC.localId;
      assert(
        bothSucceeded && sameUid,
        'Teste 4: Celular e Computador autenticam a mesma conta central e recebem o mesmo UID oficial'
      );

      // Restaura a senha para campeao2027 ao final do teste para conveniência
      const resetRes = await fetch(`${BASE_AUTH_URL}/accounts:update?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: dataPC.idToken,
          password: 'campeao2027',
          returnSecureToken: true,
        }),
      });
      assert(resetRes.ok, 'Teste 5: Restauração da credencial padrão executada com sucesso');
    } catch (err) {
      assert(false, 'Teste 4/5 falhou com erro: ' + err.message);
    }
  }

  // TESTE 6: Cadastro de Atleta Multi-Dispositivo
  const testAthleteEmail = `atleta.test.${Date.now()}@uema.br`;
  const testAthletePass = 'SenhaAtleta123!';
  try {
    // Cadastro no Dispositivo A
    const regRes = await fetch(`${BASE_AUTH_URL}/accounts:signUp?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testAthleteEmail,
        password: testAthletePass,
        returnSecureToken: true,
      }),
    });
    const regData = await regRes.json();
    assert(regRes.ok && Boolean(regData.localId), 'Teste 6: Cadastro de novo participante salvo centralmente');

    // Login no Dispositivo B com as mesmas credenciais
    const loginRes = await fetch(`${BASE_AUTH_URL}/accounts:signInWithPassword?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testAthleteEmail,
        password: testAthletePass,
        returnSecureToken: true,
      }),
    });
    const loginData = await loginRes.json();
    assert(
      loginRes.ok && loginData.localId === regData.localId,
      'Teste 7: Participante cadastrado em um aparelho faz login com sucesso em outro aparelho'
    );
  } catch (err) {
    assert(false, 'Teste 6/7 falhou com erro: ' + err.message);
  }

  console.log(`\n========================================`);
  console.log(`RESULTADO FINAL: ${passedCount} PASSOU | ${failedCount} FALHOU`);
  console.log(`========================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
