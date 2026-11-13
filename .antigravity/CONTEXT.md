# INTRAMED IX — CONTEXTO GERAL E ESTADO DO PROJETO

Este arquivo serve de memória e alinhamento de contexto para o agente Antigravity em qualquer máquina ou nova sessão.

## 1. Visão Geral
- **Aplicação:** Plataforma Esportiva e Social Universitária (Medicina UEMA).
- **Repositório:** `https://github.com/firminobatistan-stack/intramed-ix.git`
- **Projeto Firebase:** `gen-lang-client-0847910166`
- **Conta Master (Diretoria):** `cangaceira@uema.com`
- **Stack:** React 18, TypeScript, Vite, Tailwind CSS, Firebase (Auth + Firestore + Storage), Mercado Pago Checkout Transparente, Vercel Serverless Functions (`/api/*`).
- **Estrutura de Equipes (5 Turmas Oficiais):**
  - Sanguinária (Turma 21)
  - Predadora (Turma 22)
  - Tormenta (Turma 23)
  - Colossal (Turma 24)
  - Soberana (Turma 25)

## 2. Inscrições e Valores Vigentes
- **Sócio:** R$ 50,00
- **Não Sócio:** R$ 60,00
- **Atleta Convidado (Turma 21 apenas):** R$ 65,00 (Vagas restritas: 1 masculino e 1 feminino).
- **Fluxo:** Qualquer usuário pode criar conta/login comum (incluindo login via Google). Somente após estar cadastrado e logado (`currentUser != null`) a aba **"Inscrição de Atleta" / "Meu Passaporte"** aparece nos menus (`Sidebar.tsx`, `BottomNav.tsx`, `MobileNavDrawer.tsx`, `HomePage.tsx`).

## 3. Sincronização Multi-Dispositivo e Persistência (Firestore + Cloud Sync)
- **Persistência Autenticada no Firestore (`api/_lib/serverStore.ts`):**
  - As chamadas REST serverless (`MirrorDocumentToFirestoreRest`, `DeleteDocumentFromFirestoreRest`, `ensureCloudStoreHydrated`) utilizam token Firebase Auth (`getServerFirebaseIdToken`) para garantir que o Cloud Firestore aceite leituras e gravações (`request.auth != null`) mesmo após *cold-starts* da Vercel.
  - `ensureCloudStoreHydrated` re-hidrata a memória das instâncias serverless a cada 15s (ou sob demanda com `?force=true`).
- **Súmula Eletrônica e Placar Ao Vivo em Tempo Real (`CompetitionStoreContext.tsx` & `PublicLiveScoreboardPage.tsx`):**
  - Todas as 64 partidas oficiais possuem `MatchSheet` hidratado automaticamente (`hydrateOfficialSheetsWithDefaults`).
  - A aba **"Ao Vivo"** (`Header.tsx`, `Sidebar.tsx`, `BottomNav.tsx`, `MobileNavDrawer.tsx`, `HomePage.tsx`) só fica visível quando `hasActiveLiveMatch` é verdadeiro — isto é, quando há uma partida real com status `live` ou `halftime` sendo operada na súmula (cronômetro iniciado/pausado ou lances registrados).
  - Operações na súmula (cronômetro a cada 2s, gols, sets, cartões, faltas, pedidos de tempo) incrementam `revision` e sincronizam instantaneamente via `/api/cloud-sync` + `onSnapshot(collection(db, 'match_sheets'))`, garantindo experiência estilo app de placar de futebol para todos os espectadores.
- **Sincronização em Tempo Real e Auto-Recuperação (`RegistrationStoreContext.tsx` & `CompetitionStoreContext.tsx`):**
  - Listeners `onSnapshot` diretos nas coleções `registrations` e `athletes` do Firestore + escrita direta `setDoc`.
  - Proteção contra limpeza indevida: respostas remotas vazias após *cold-start* não apagam inscrições válidas locais; pelo contrário, o cliente re-sincroniza (*self-healing*) registros legítimos ausentes na nuvem.
- **Expurgo Definitivo de Contas de Teste (`cacheManager.ts`, `serverStore.ts`, `cloud-sync.ts`):**
  - As contas de teste (`gvsvsadv`, `Nskaangaba`, `Firmino`) e dados fictícios (`Gabriel Medeiros`, `Beatriz Vasconcelos`, `Lucas Albuquerque`, prefixos demo) são bloqueados na API, removidos do Firestore e automaticamente limpos do `localStorage` (`CURRENT_APP_CACHE_VERSION = '2.3.0-centralized-firebase-clean'`) em qualquer dispositivo que abrir o app.

## 4. Chaveamento e 16 Modalidades
- O torneio conta com 16 modalidades oficiais (Futsal Masc/Fem, Handebol Masc/Fem, Basquete Masc/Fem, Vôlei Masc/Fem, Vôlei de Praia Masc/Fem, Tênis de Mesa Masc/Fem, Sinuca, Truco, Poker, Natação).
- Chaveamento de 5 equipes com Bye direto na semifinal e partidas baseadas na tabela oficial `TABELA_IX_INTRAMED_.xlsx`.
- **Natação:** Disputa simultânea entre as 5 turmas por tempo/raia (não aparece na grade de confrontos `Time A × Time B`, tendo visualização própria na página de Natação).

## 5. Diretrizes de UI/UX & Engajamento
- **Design Minimalista:** Sem textos prolixos, sem repetições de rótulos (evitar `Futsal • Futsal` ou `Turma 21 • Turma 21`), tabelas limpas e cards diretos.
- **Navegação Mobile Unificada (`Header.tsx` + `BottomNav.tsx`):** No celular, a barra de abas superior fica oculta (`hidden lg:block`), mantendo apenas o `BottomNav` inferior para um visual de app nativo.
- **Cards de Jogos Compactos (`MatchCard.tsx`):** Altura reduzida em ~30% para exibir 3 a 4 jogos na tela do celular simultaneamente.
- **Destaque de Byes no Chaveamento (`BracketView.tsx`):** Resumo visual no topo da chave indicando claramente as 3 turmas com *Bye* direto na Semifinal e as 2 turmas que disputam as Quartas.
- **Escudos Padronizados (`TeamCrest.tsx`):** Moldura com fundo escuro uniforme e anel colorido na cor oficial de cada turma (`Vermelho Sanguinária`, `Amarelo Predadora`, `Azul Tormenta`, `Verde Colossal`, `Vinho Soberana`).
- **Gerador de Cards 9:16 para Instagram Stories (`StoryShareModal.tsx`):** Permite compartilhar placares/partidas e o passaporte/ficha de atleta direto nos Stories ou WhatsApp via Web Share API / PNG.
- **Identidade Visual:** Azul Royal (`#0B218A`), Amarelo Dourado (`#FACC15`), com temas individuais para cada atlética.

## 6. Como Retomar o Trabalho em Novo Dispositivo
Ao iniciar uma nova sessão no Antigravity em outro PC, basta dizer:
> *"Leia o arquivo `.antigravity/CONTEXT.md` e continue o desenvolvimento do IntraMed IX."*
