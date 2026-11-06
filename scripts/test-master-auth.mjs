import assert from 'assert';
import http from 'http';
import cloudSyncHandler from '../api/cloud-sync.js';
import {
  getCloudStore,
  ensureMasterAccountProvisioned,
  MASTER_MODERATOR_EMAIL,
  createSignedOperatorToken,
} from '../api/_lib/serverStore.js';

process.env.INTRAMED_AUTH_SECRET = 'test-secret-salt-cangaceira-2026';
process.env.INTRAMED_MASTER_INITIAL_PASSWORD = 'campeao2027';

// Mock minimal Vercel request / response
function runHandler(method, body = {}, headers = {}) {
  return new Promise((resolve) => {
    let statusCode = 200;
    let responseData = null;

    const req = {
      method,
      body,
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
      query: {},
    };

    const res = {
      setHeader(name, value) {
        return this;
      },
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        resolve({ status: statusCode, data });
        return this;
      },
      end() {
        resolve({ status: statusCode, data: responseData });
        return this;
      },
    };

    cloudSyncHandler(req, res).catch((err) => {
      console.error('cloudSyncHandler error:', err);
      resolve({ status: 500, error: err.message });
    });
  });
}

async function runMasterAuthTestSuite() {
  console.log('🚀 Iniciando bateria de testes do Moderador Master & RBAC (5 Níveis)...');

  // Teste 1: Provisionamento Automático
  console.log('\n--- Teste 1: Provisionamento Automático do Moderador Master ---');
  const store = getCloudStore();
  ensureMasterAccountProvisioned(store);
  const masterKey = MASTER_MODERATOR_EMAIL.toLowerCase();
  const masterUser = store.admin_users?.[masterKey];
  assert(masterUser, 'Conta Master deve existir no admin_users');
  assert.strictEqual(masterUser.role, 'moderador_master');
  assert.strictEqual(masterUser.mustChangePassword, true);
  assert.strictEqual(masterUser.isActive, true);
  console.log('✅ Teste 1 passou: Conta Master provisionada com role=moderador_master e mustChangePassword=true');

  // Teste 2: Login com senha incorreta
  console.log('\n--- Teste 2: Tentativa de login com senha incorreta ---');
  const wrongLogin = await runHandler('POST', {
    action: 'admin_login',
    email: 'cangaceira@uema.com',
    password: 'senha_errada_123',
  });
  assert.strictEqual(wrongLogin.status, 401);
  assert.strictEqual(wrongLogin.data.ok, false);
  console.log('✅ Teste 2 passou: Senha incorreta rejeitada com HTTP 401');

  // Teste 3: Primeiro Login com a Senha Inicial
  console.log('\n--- Teste 3: Primeiro Login com a Senha Inicial Autorizada ---');
  const firstLogin = await runHandler('POST', {
    action: 'admin_login',
    email: 'cangaceira@uema.com',
    password: 'campeao2027',
  });
  assert.strictEqual(firstLogin.status, 200);
  assert.strictEqual(firstLogin.data.ok, true);
  assert.strictEqual(firstLogin.data.mustChangePassword, true);
  assert(firstLogin.data.token, 'Token restrito deve ser emitido');
  const initialToken = firstLogin.data.token;
  console.log('✅ Teste 3 passou: Login autorizado com sinalização obrigatória mustChangePassword=true');

  // Teste 4: Troca de Senha Obrigatória no Primeiro Acesso
  console.log('\n--- Teste 4: Troca de Senha Obrigatória ---');
  const pwdChangeFail = await runHandler(
    'POST',
    {
      action: 'change_admin_password',
      newPassword: '123', // Muito curta
      confirmPassword: '123',
    },
    { Authorization: `Bearer ${initialToken}` }
  );
  assert.strictEqual(pwdChangeFail.status, 400);

  const pwdChangeMismatch = await runHandler(
    'POST',
    {
      action: 'change_admin_password',
      newPassword: 'novaSenhaSegura2026',
      confirmPassword: 'outraSenhaDiferente',
    },
    { Authorization: `Bearer ${initialToken}` }
  );
  assert.strictEqual(pwdChangeMismatch.status, 400);

  const pwdChangeOk = await runHandler(
    'POST',
    {
      action: 'change_admin_password',
      newPassword: 'novaSenhaSegura2026',
      confirmPassword: 'novaSenhaSegura2026',
    },
    { Authorization: `Bearer ${initialToken}` }
  );
  assert.strictEqual(pwdChangeOk.status, 200);
  assert.strictEqual(pwdChangeOk.data.ok, true);
  assert.strictEqual(pwdChangeOk.data.mustChangePassword, false);
  assert(pwdChangeOk.data.token, 'Novo token desbloqueado deve ser emitido');
  const masterUnlockedToken = pwdChangeOk.data.token;
  console.log('✅ Teste 4 passou: Senha alterada, pendência de primeiro acesso removida e novo token emitido');

  // Teste 5: Senha antiga deixa de funcionar
  console.log('\n--- Teste 5: Antiga senha temporária deixa de funcionar ---');
  const oldLogin = await runHandler('POST', {
    action: 'admin_login',
    email: 'cangaceira@uema.com',
    password: 'campeao2027',
  });
  assert.strictEqual(oldLogin.status, 401);
  console.log('✅ Teste 5 passou: Senha inicial descartada após a definição da nova senha');

  // Teste 6: Login com nova senha funciona normalmente
  console.log('\n--- Teste 6: Login normal com a nova senha ---');
  const newLogin = await runHandler('POST', {
    action: 'admin_login',
    email: 'cangaceira@uema.com',
    password: 'novaSenhaSegura2026',
  });
  assert.strictEqual(newLogin.status, 200);
  assert.strictEqual(newLogin.data.mustChangePassword, false);
  console.log('✅ Teste 6 passou: Login subsequente desbloqueado');

  // Teste 7: Blindagem da Conta Master contra rebaixamento e desativação
  console.log('\n--- Teste 7: Blindagem da Conta Master ---');
  const demoteAttempt = await runHandler(
    'POST',
    {
      action: 'update_user_role',
      targetEmail: 'cangaceira@uema.com',
      targetRole: 'usuario',
    },
    { Authorization: `Bearer ${masterUnlockedToken}` }
  );
  assert.strictEqual(demoteAttempt.status, 403);

  const deactivateAttempt = await runHandler(
    'POST',
    {
      action: 'toggle_user_active',
      targetEmail: 'cangaceira@uema.com',
      isActive: false,
    },
    { Authorization: `Bearer ${masterUnlockedToken}` }
  );
  assert.strictEqual(deactivateAttempt.status, 403);
  console.log('✅ Teste 7 passou: Tentativas de rebaixamento e desativação do Master bloqueadas com HTTP 403');

  // Teste 8: Gestão de papéis pelo Master (Nível 5)
  console.log('\n--- Teste 8: Gestão de Papéis RBAC pelo Master ---');
  const promoteUser = await runHandler(
    'POST',
    {
      action: 'update_user_role',
      targetEmail: 'mesario.futsal@uema.br',
      targetRole: 'mesario',
    },
    { Authorization: `Bearer ${masterUnlockedToken}` }
  );
  assert.strictEqual(promoteUser.status, 200);
  assert.strictEqual(promoteUser.data.ok, true);

  // Tentativa de criar outro moderador_master deve ser recusada
  const invalidRoleAttempt = await runHandler(
    'POST',
    {
      action: 'update_user_role',
      targetEmail: 'outro@uema.br',
      targetRole: 'moderador_master',
    },
    { Authorization: `Bearer ${masterUnlockedToken}` }
  );
  assert.strictEqual(invalidRoleAttempt.status, 400);

  // Usuário de nível inferior tentando alterar cargos deve ser barrado
  const mesarioToken = createSignedOperatorToken({
    role: 'mesario',
    email: 'mesario.futsal@uema.br',
    officialName: 'Mesário Futsal',
  });
  const unprivAttempt = await runHandler(
    'POST',
    {
      action: 'update_user_role',
      targetEmail: 'alvo@uema.br',
      targetRole: 'moderador',
    },
    { Authorization: `Bearer ${mesarioToken}` }
  );
  assert.strictEqual(unprivAttempt.status, 403);
  console.log('✅ Teste 8 passou: Apenas Moderador Master pode alterar cargos e Moderador Master é único');

  // Teste 9: Trilha de Auditoria RBAC
  console.log('\n--- Teste 9: Registro em Trilha de Auditoria ---');
  const listUsers = await runHandler(
    'POST',
    { action: 'list_admin_users' },
    { Authorization: `Bearer ${masterUnlockedToken}` }
  );
  assert.strictEqual(listUsers.status, 200);
  assert(Array.isArray(listUsers.data.auditLogs), 'Trilha de auditoria retornada');
  assert(listUsers.data.auditLogs.length > 0, 'Eventos registrados no log');
  console.log(`✅ Teste 9 passou: Trilha de auditoria registrou ${listUsers.data.auditLogs.length} operações administrativas`);

  // Teste 10: Preservação de Estado entre Cold Starts (Não reverte para primeiro acesso)
  console.log('\n--- Teste 10: Preservação de Estado entre Cold Starts ---');
  ensureMasterAccountProvisioned(store);
  const masterAfterColdStart = store.admin_users[masterKey];
  assert.strictEqual(masterAfterColdStart.mustChangePassword, false, 'mustChangePassword deve continuar false');
  console.log('✅ Teste 10 passou: Cold starts mantêm a nova senha definida e não revertem para primeiro acesso');

  // Teste 11: Segurança de Usuários Normais (Atletas) - Nenhuma senha inválida é aceita
  console.log('\n--- Teste 11: Segurança de Usuários Normais (Atletas) ---');
  store.registrations['reg_test_athlete_1'] = {
    id: 'reg_test_athlete_1',
    athleteEmail: 'atleta.teste@uema.br',
    athleteName: 'Atleta Teste',
    accountUsername: 'atletateste',
    accountPasswordHash: 'hash_invalido_de_teste',
    paymentStatus: 'pago',
    memberStatus: 'aprovado',
  };
  const wrongAthleteLogin = await runHandler('POST', {
    action: 'athlete_login',
    identifier: 'atleta.teste@uema.br',
    password: 'senha_completamente_errada',
  });
  assert.strictEqual(wrongAthleteLogin.status, 401);
  assert.strictEqual(wrongAthleteLogin.data.ok, false);
  console.log('✅ Teste 11 passou: Usuários normais com senha incorreta são estritamente bloqueados com HTTP 401');

  // Teste 12: Redefinição Direta no PC sem Token Prévio usando Senha Atual
  console.log('\n--- Teste 12: Redefinição no PC sem Token Prévio ---');
  const directChangeFail = await runHandler('POST', {
    action: 'change_admin_password',
    email: 'cangaceira@uema.com',
    currentPassword: 'senha_atual_errada',
    newPassword: 'outraSenhaNova2027',
    confirmPassword: 'outraSenhaNova2027',
  });
  assert.strictEqual(directChangeFail.status, 401);

  const directChangeOk = await runHandler('POST', {
    action: 'change_admin_password',
    email: 'cangaceira@uema.com',
    currentPassword: 'novaSenhaSegura2026',
    newPassword: 'outraSenhaNova2027',
    confirmPassword: 'outraSenhaNova2027',
  });
  assert.strictEqual(directChangeOk.status, 200);
  assert.strictEqual(directChangeOk.data.ok, true);
  console.log('✅ Teste 12 passou: Redefinição no PC com validação de senha atual concluída com sucesso');

  console.log('\n🎉 TODOS OS 12 CENÁRIOS DE SEGURANÇA E RBAC PASSARAM COM SUCESSO!\n');
}

runMasterAuthTestSuite().catch((err) => {
  console.error('❌ Falha nos testes de autenticação:', err);
  process.exit(1);
});
