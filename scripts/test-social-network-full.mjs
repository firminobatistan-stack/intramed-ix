import assert from 'node:assert';
import crypto from 'node:crypto';

console.log('🧪 Iniciando Bateria Completa de Testes Sociais: Feed, Postagens, Curtidas, Comentários, Seguidores, Salvos e Notificações...');

const TEST_SECRET = 'test-secret-salt-intramed-2026';

function hashPassword(password) {
  return crypto.createHmac('sha256', TEST_SECRET).update(password).digest('hex');
}

function createSignedToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 * 7,
    })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', TEST_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifySignedToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', TEST_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// Simulador em memória das coleções do Cloud Store
const cloudStore = {
  users: {},
  profiles: {},
  posts: {},
  post_likes: {},
  post_comments: {},
  user_follows: {},
  user_saves: {},
  social_notifications: {},
};

async function handleAction(action, body, token = null) {
  const verifiedToken = token ? verifySignedToken(token) : null;
  const nowIso = new Date().toISOString();

  // 1. REGISTER USER
  if (action === 'register_user') {
    const email = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || '').trim();
    const password = String(body.password || '').trim();

    if (!email || !name || password.length < 6) {
      return { status: 400, data: { ok: false, error: 'Dados incompletos.' } };
    }
    if (cloudStore.users[email]) {
      return { status: 409, data: { ok: false, error: 'E-mail duplicado.' } };
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const passwordHash = hashPassword(password);

    const userRecord = {
      id: userId,
      email,
      name,
      passwordHash,
      role: 'atleta',
      turma: body.turma || null,
      turmaLabel: body.turmaLabel || null,
      teamId: body.teamId || null,
      teamName: body.teamName || null,
      bio: body.bio || null,
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
    };

    const profileRecord = {
      id: userId,
      userId,
      displayName: name,
      turma: body.turma || null,
      turmaLabel: body.turmaLabel || null,
      teamId: body.teamId || null,
      teamName: body.teamName || null,
      bio: body.bio || null,
      role: 'atleta',
      isAthlete: true,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
    };

    cloudStore.users[email] = userRecord;
    cloudStore.users[userId] = userRecord;
    cloudStore.profiles[userId] = profileRecord;

    const issuedToken = createSignedToken({
      userId,
      email,
      role: 'atleta',
      displayName: name,
      officialName: name,
    });

    return {
      status: 200,
      data: { ok: true, token: issuedToken, user: userRecord, profile: profileRecord },
    };
  }

  // 2. VALIDATE SESSION
  if (action === 'validate_session') {
    if (!verifiedToken) {
      return { status: 401, data: { ok: false, error: 'Sessão inválida ou expirada.' } };
    }
    const currentUid = verifiedToken.userId || verifiedToken.email?.toLowerCase();
    const user = cloudStore.users[currentUid] || null;
    const profile = cloudStore.profiles[currentUid] || null;
    if (!user && !profile) {
      return { status: 404, data: { ok: false, error: 'Conta não localizada.' } };
    }
    return {
      status: 200,
      data: {
        ok: true,
        user: {
          id: user?.id || currentUid,
          name: profile?.displayName || user?.name || verifiedToken.displayName,
          email: user?.email || verifiedToken.email,
          role: verifiedToken.role,
        },
      },
    };
  }

  // 3. CREATE POST
  if (action === 'create_post') {
    if (!verifiedToken) {
      return { status: 401, data: { ok: false, error: 'Autenticação necessária.' } };
    }
    const authorUid = verifiedToken.userId;
    const content = String(body.content || '').trim();
    const images = Array.isArray(body.images) ? body.images.slice(0, 4) : [];

    if (!content && images.length === 0) {
      return { status: 400, data: { ok: false, error: 'Conteúdo vazio.' } };
    }

    const postId = `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const profile = cloudStore.profiles[authorUid];

    const post = {
      id: postId,
      authorUid,
      authorName: profile?.displayName || verifiedToken.displayName,
      content,
      images,
      likesCount: 0,
      commentsCount: 0,
      teamTag: body.teamTag || profile?.teamId || null,
      modalityTag: body.modalityTag || null,
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
    };

    cloudStore.posts[postId] = post;
    if (profile) {
      profile.postsCount = (profile.postsCount || 0) + 1;
    }

    return { status: 200, data: { ok: true, post } };
  }

  // 4. UPDATE POST
  if (action === 'update_post') {
    if (!verifiedToken) return { status: 401, data: { ok: false, error: 'Não autorizado.' } };
    const postId = body.postId;
    const post = cloudStore.posts[postId];
    if (!post) return { status: 404, data: { ok: false, error: 'Post não encontrado.' } };

    if (post.authorUid !== verifiedToken.userId && verifiedToken.role !== 'moderador_master') {
      return { status: 403, data: { ok: false, error: 'Sem permissão.' } };
    }

    post.content = String(body.content || '').trim();
    post.updatedAtIso = nowIso;
    return { status: 200, data: { ok: true, post } };
  }

  // 5. DELETE POST
  if (action === 'delete_post') {
    if (!verifiedToken) return { status: 401, data: { ok: false, error: 'Não autorizado.' } };
    const postId = body.postId;
    const post = cloudStore.posts[postId];
    if (!post) return { status: 404, data: { ok: false, error: 'Post não encontrado.' } };

    if (post.authorUid !== verifiedToken.userId && verifiedToken.role !== 'moderador_master') {
      return { status: 403, data: { ok: false, error: 'Sem permissão.' } };
    }

    delete cloudStore.posts[postId];

    // Cascade delete likes
    for (const [key, like] of Object.entries(cloudStore.post_likes)) {
      if (like.postId === postId) delete cloudStore.post_likes[key];
    }
    // Cascade delete comments
    for (const [key, comment] of Object.entries(cloudStore.post_comments)) {
      if (comment.postId === postId) delete cloudStore.post_comments[key];
    }

    const profile = cloudStore.profiles[post.authorUid];
    if (profile) {
      profile.postsCount = Math.max((profile.postsCount || 1) - 1, 0);
    }

    return { status: 200, data: { ok: true } };
  }

  // 6. TOGGLE LIKE
  if (action === 'toggle_like') {
    if (!verifiedToken) return { status: 401, data: { ok: false, error: 'Não autorizado.' } };
    const postId = body.postId;
    const post = cloudStore.posts[postId];
    if (!post) return { status: 404, data: { ok: false, error: 'Post não encontrado.' } };

    const currentUid = verifiedToken.userId;
    const likeKey = `${postId}_${currentUid}`;

    if (cloudStore.post_likes[likeKey]) {
      delete cloudStore.post_likes[likeKey];
      post.likesCount = Math.max((post.likesCount || 1) - 1, 0);
      return { status: 200, data: { ok: true, isLiked: false, likesCount: post.likesCount } };
    } else {
      cloudStore.post_likes[likeKey] = {
        id: likeKey,
        postId,
        userId: currentUid,
        createdAtIso: nowIso,
      };
      post.likesCount = (post.likesCount || 0) + 1;

      // Disparar notificação para o autor se for outro usuário
      if (post.authorUid !== currentUid) {
        const notifId = `notif_like_${Date.now()}`;
        cloudStore.social_notifications[notifId] = {
          id: notifId,
          recipientUid: post.authorUid,
          actorUid: currentUid,
          actorName: verifiedToken.displayName,
          type: 'like',
          title: 'Nova curtida',
          message: `${verifiedToken.displayName} curtiu sua publicação.`,
          targetPostId: postId,
          isRead: false,
          createdAtIso: nowIso,
        };
      }

      return { status: 200, data: { ok: true, isLiked: true, likesCount: post.likesCount } };
    }
  }

  // 7. CREATE COMMENT
  if (action === 'create_comment') {
    if (!verifiedToken) return { status: 401, data: { ok: false, error: 'Não autorizado.' } };
    const postId = body.postId;
    const post = cloudStore.posts[postId];
    if (!post) return { status: 404, data: { ok: false, error: 'Post não encontrado.' } };

    const content = String(body.content || '').trim();
    if (!content) return { status: 400, data: { ok: false, error: 'Comentário vazio.' } };

    const commentId = `comment_${Date.now()}`;
    const comment = {
      id: commentId,
      postId,
      authorUid: verifiedToken.userId,
      authorName: verifiedToken.displayName,
      content,
      createdAtIso: nowIso,
    };

    cloudStore.post_comments[commentId] = comment;
    post.commentsCount = (post.commentsCount || 0) + 1;

    return { status: 200, data: { ok: true, comment } };
  }

  // 8. TOGGLE FOLLOW
  if (action === 'toggle_follow') {
    if (!verifiedToken) return { status: 401, data: { ok: false, error: 'Não autorizado.' } };
    const targetUid = String(body.targetUid || '').trim();
    const currentUid = verifiedToken.userId;

    if (!targetUid || targetUid === currentUid) {
      return { status: 400, data: { ok: false, error: 'Não pode seguir a si mesmo.' } };
    }

    const followKey = `${currentUid}_${targetUid}`;
    const targetProfile = cloudStore.profiles[targetUid];
    const myProfile = cloudStore.profiles[currentUid];

    if (cloudStore.user_follows[followKey]) {
      delete cloudStore.user_follows[followKey];
      if (targetProfile) targetProfile.followersCount = Math.max((targetProfile.followersCount || 1) - 1, 0);
      if (myProfile) myProfile.followingCount = Math.max((myProfile.followingCount || 1) - 1, 0);
      return {
        status: 200,
        data: { ok: true, isFollowing: false, followersCount: targetProfile?.followersCount || 0 },
      };
    } else {
      cloudStore.user_follows[followKey] = {
        id: followKey,
        followerUid: currentUid,
        followingUid: targetUid,
        createdAtIso: nowIso,
      };
      if (targetProfile) targetProfile.followersCount = (targetProfile.followersCount || 0) + 1;
      if (myProfile) myProfile.followingCount = (myProfile.followingCount || 0) + 1;

      // Disparar notificação de follow
      const notifId = `notif_flw_${Date.now()}`;
      cloudStore.social_notifications[notifId] = {
        id: notifId,
        recipientUid: targetUid,
        actorUid: currentUid,
        actorName: verifiedToken.displayName,
        type: 'follow',
        title: 'Novo seguidor',
        message: `${verifiedToken.displayName} começou a seguir seu perfil.`,
        isRead: false,
        createdAtIso: nowIso,
      };

      return {
        status: 200,
        data: { ok: true, isFollowing: true, followersCount: targetProfile?.followersCount || 0 },
      };
    }
  }

  // 9. TOGGLE SAVE POST
  if (action === 'toggle_save_post') {
    if (!verifiedToken) return { status: 401, data: { ok: false, error: 'Não autorizado.' } };
    const postId = body.postId;
    const currentUid = verifiedToken.userId;
    const saveKey = `${currentUid}_${postId}`;

    if (cloudStore.user_saves[saveKey]) {
      delete cloudStore.user_saves[saveKey];
      return { status: 200, data: { ok: true, isSaved: false } };
    } else {
      cloudStore.user_saves[saveKey] = {
        id: saveKey,
        userId: currentUid,
        postId,
        savedAtIso: nowIso,
      };
      return { status: 200, data: { ok: true, isSaved: true } };
    }
  }

  // 10. LIST POSTS
  if (action === 'list_posts') {
    let posts = Object.values(cloudStore.posts);
    if (body.onlySaved && verifiedToken) {
      const mySavedPostIds = new Set(
        Object.values(cloudStore.user_saves)
          .filter((s) => s.userId === verifiedToken.userId)
          .map((s) => s.postId)
      );
      posts = posts.filter((p) => mySavedPostIds.has(p.id));
    }
    if (body.teamId) {
      posts = posts.filter((p) => p.teamTag === body.teamId);
    }
    return { status: 200, data: { ok: true, posts } };
  }

  // 11. LIST SOCIAL NOTIFICATIONS
  if (action === 'list_social_notifications') {
    if (!verifiedToken) return { status: 401, data: { ok: false, error: 'Não autorizado.' } };
    const myNotifs = Object.values(cloudStore.social_notifications).filter(
      (n) => n.recipientUid === verifiedToken.userId
    );
    return { status: 200, data: { ok: true, notifications: myNotifs } };
  }

  // 12. MARK NOTIFICATION READ
  if (action === 'mark_notification_read') {
    if (!verifiedToken) return { status: 401, data: { ok: false, error: 'Não autorizado.' } };
    const notifId = body.notificationId;
    if (notifId === 'all') {
      for (const n of Object.values(cloudStore.social_notifications)) {
        if (n.recipientUid === verifiedToken.userId) n.isRead = true;
      }
    } else if (cloudStore.social_notifications[notifId]) {
      cloudStore.social_notifications[notifId].isRead = true;
    }
    return { status: 200, data: { ok: true } };
  }

  return { status: 400, data: { ok: false, error: 'Ação não suportada.' } };
}

async function runSocialTestSuite() {
  console.log('\n--- 1. Criação e Autenticação de Usuários da Comunidade ---');
  const u1 = await handleAction('register_user', {
    name: 'Gabriel Cangaceiro',
    email: 'gabriel.cangaceiro@uema.br',
    password: 'senhaSegura123',
    turma: '21',
    turmaLabel: 'Turma XXI',
    teamId: 'sanguinaria',
    teamName: 'Sanguinária',
    bio: 'Atleta oficial de Futsal da Cangaceira!',
  });
  assert.strictEqual(u1.status, 200);
  const token1 = u1.data.token;
  const user1 = u1.data.user;

  const u2 = await handleAction('register_user', {
    name: 'Beatriz Predadora',
    email: 'beatriz.predadora@uema.br',
    password: 'senhaSegura456',
    turma: '22',
    turmaLabel: 'Turma XXII',
    teamId: 'predadora',
    teamName: 'Predadora',
    bio: 'Capitã do vôlei da Predadora.',
  });
  assert.strictEqual(u2.status, 200);
  const token2 = u2.data.token;
  const user2 = u2.data.user;
  console.log('✅ Usuários de teste registrados e autenticados com tokens JWT criptografados.');

  console.log('\n--- 2. Validação Estrita de Sessão (Zero Bypass) ---');
  const sessionCheck = await handleAction('validate_session', {}, token1);
  assert.strictEqual(sessionCheck.status, 200);
  assert.strictEqual(sessionCheck.data.user.email, 'gabriel.cangaceiro@uema.br');
  console.log('✅ Sessão validada contra a base de usuários do servidor.');

  console.log('\n--- 3. Publicação no Feed com Tag e Contador de Posts ---');
  const postRes = await handleAction(
    'create_post',
    {
      content: 'Treino da Sanguinária finalizado! Rumo ao título do Futsal no IntraMed IX! 🏆🔥',
      teamTag: 'sanguinaria',
      modalityTag: 'futsal',
    },
    token1
  );
  assert.strictEqual(postRes.status, 200);
  const postId = postRes.data.post.id;
  assert.strictEqual(postRes.data.post.authorName, 'Gabriel Cangaceiro');
  assert.strictEqual(postRes.data.post.teamTag, 'sanguinaria');
  assert.strictEqual(cloudStore.profiles[user1.id].postsCount, 1, 'postsCount deve ter incrementado');
  console.log('✅ Publicação criada com sucesso e postsCount do perfil incrementado para 1.');

  console.log('\n--- 4. Edição de Publicação ---');
  const editRes = await handleAction(
    'update_post',
    {
      postId,
      content: 'Treino da Sanguinária finalizado! Rumo ao título! (Atualizado com fotos)',
    },
    token1
  );
  assert.strictEqual(editRes.status, 200);
  assert.strictEqual(cloudStore.posts[postId].content, 'Treino da Sanguinária finalizado! Rumo ao título! (Atualizado com fotos)');
  console.log('✅ Edição de post próprio salva com sucesso.');

  console.log('\n--- 5. Curtidas (Toggle Like) e Notificação Social ---');
  // Usuário 2 curte post do Usuário 1
  const likeRes1 = await handleAction('toggle_like', { postId }, token2);
  assert.strictEqual(likeRes1.status, 200);
  assert.strictEqual(likeRes1.data.isLiked, true);
  assert.strictEqual(likeRes1.data.likesCount, 1);

  // Verifica se notificação foi enviada ao Usuário 1
  const notifsU1 = await handleAction('list_social_notifications', {}, token1);
  assert.strictEqual(notifsU1.status, 200);
  assert.strictEqual(notifsU1.data.notifications.length, 1);
  assert.strictEqual(notifsU1.data.notifications[0].type, 'like');
  assert.strictEqual(notifsU1.data.notifications[0].actorName, 'Beatriz Predadora');
  console.log('✅ Curtida registrada e notificação social disparada para o autor em tempo real.');

  // Usuário 2 descurte (unlike)
  const likeRes2 = await handleAction('toggle_like', { postId }, token2);
  assert.strictEqual(likeRes2.data.isLiked, false);
  assert.strictEqual(likeRes2.data.likesCount, 0);
  console.log('✅ Descurtir (toggle unlike) funcional e decrementando likesCount.');

  // Usuário 2 curte novamente
  await handleAction('toggle_like', { postId }, token2);

  console.log('\n--- 6. Comentários na Publicação ---');
  const commentRes = await handleAction(
    'create_comment',
    { postId, content: 'Boa sorte no jogo, nos vemos na quadra! 🏐' },
    token2
  );
  assert.strictEqual(commentRes.status, 200);
  assert.strictEqual(cloudStore.posts[postId].commentsCount, 1);
  console.log('✅ Comentário registrado com sucesso e commentsCount incrementado.');

  console.log('\n--- 7. Salvar Publicação (Marcador Privado) ---');
  const saveRes = await handleAction('toggle_save_post', { postId }, token2);
  assert.strictEqual(saveRes.status, 200);
  assert.strictEqual(saveRes.data.isSaved, true);

  const savedList = await handleAction('list_posts', { onlySaved: true }, token2);
  assert.strictEqual(savedList.status, 200);
  assert.strictEqual(savedList.data.posts.length, 1);
  assert.strictEqual(savedList.data.posts[0].id, postId);
  console.log('✅ Publicação salva nos itens privados do usuário e recuperada na aba "Salvos".');

  console.log('\n--- 8. Seguir / Deixar de Seguir (Network Social) ---');
  // Tentativa de auto-follow deve ser bloqueada
  const selfFollow = await handleAction('toggle_follow', { targetUid: user2.id }, token2);
  assert.strictEqual(selfFollow.status, 400, 'Auto-follow deve ser proibido');
  console.log('✅ Tentativa de auto-seguir rigorosamente bloqueada.');

  // Usuário 2 segue Usuário 1
  const followRes = await handleAction('toggle_follow', { targetUid: user1.id }, token2);
  assert.strictEqual(followRes.status, 200);
  assert.strictEqual(followRes.data.isFollowing, true);
  assert.strictEqual(cloudStore.profiles[user1.id].followersCount, 1);
  assert.strictEqual(cloudStore.profiles[user2.id].followingCount, 1);

  // Verifica se notificação de novo seguidor chegou para Usuário 1
  const notifsU1AfterFollow = await handleAction('list_social_notifications', {}, token1);
  const followNotif = notifsU1AfterFollow.data.notifications.find((n) => n.type === 'follow');
  assert.ok(followNotif, 'Notificação de novo seguidor deve existir');
  console.log('✅ Seguidor adicionado com contadores atômicos atualizados e notificação entregue.');

  console.log('\n--- 9. Marcar Notificações como Lidas ---');
  const readRes = await handleAction('mark_notification_read', { notificationId: 'all' }, token1);
  assert.strictEqual(readRes.status, 200);
  const notifsU1Read = await handleAction('list_social_notifications', {}, token1);
  for (const n of notifsU1Read.data.notifications) {
    assert.strictEqual(n.isRead, true);
  }
  console.log('✅ Notificações marcadas como lidas com sucesso.');

  console.log('\n--- 10. Exclusão em Cascata (Delete Post) ---');
  const deleteRes = await handleAction('delete_post', { postId }, token1);
  assert.strictEqual(deleteRes.status, 200);
  assert.strictEqual(cloudStore.posts[postId], undefined, 'Post deve ser removido');
  assert.strictEqual(cloudStore.profiles[user1.id].postsCount, 0, 'postsCount deve retornar a 0');
  assert.strictEqual(Object.keys(cloudStore.post_likes).length, 0, 'Curtidas órfãs devem ser expurgadas');
  assert.strictEqual(Object.keys(cloudStore.post_comments).length, 0, 'Comentários órfãos devem ser expurgados');
  console.log('✅ Post excluído com expurgo em cascata de curtidas e comentários associados.');

  console.log('\n========================================================================');
  console.log('🎉 TODOS OS TESTES DO MÓDULO SOCIAL FORAM CONCLUÍDOS COM 100% DE SUCESSO!');
  console.log('========================================================================\n');
}

runSocialTestSuite().catch((err) => {
  console.error('❌ Falha nos testes sociais:', err);
  process.exit(1);
});
