# INTRAMED IX — CONTEXTO GERAL E ESTADO DO PROJETO

Este arquivo serve de memória e alinhamento de contexto para o agente Antigravity em qualquer máquina ou nova sessão.

## 1. Visão Geral
- **Aplicação:** Plataforma Esportiva e Social Universitária (Medicina UEMA).
- **Repositório:** `https://github.com/firminobatistan-stack/intramed-ix.git` (Espelho/Deploy Vercel ativo: `https://cngintramed.vercel.app`)
- **Projeto Firebase:** `gen-lang-client-0847910166`
- **Conta Master (Diretoria):** `cangaceira@uema.com` (possui ações exclusivas para ocultar/exibir usuários para outros participantes via `toggle_user_visibility` e apagar usuários por completo via `delete_user_completely`, tanto em `/admin/inscricoes` na aba **Todos os Usuários** quanto em `/admin` na aba **Usuários**).
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
- **Fluxo:** Qualquer usuário pode criar conta/login comum (incluindo login via Google). Somente após estar cadastrado e logado (`currentUser != null`) a aba **"Inscrição de Atleta" / "Meu Passaporte"** aparece nos menus (`Sidebar.tsx`, `BottomNav.tsx`, `MobileNavDrawer.tsx`, `HomePage.tsx`). Quando o usuário seleciona a opção **Sócio**, o botão exibe `"Solicitar Verificação de Sócio • R$ 50.00"` e bloqueia o pagamento até que a Diretoria (`cangaceira@uema.com` / Admin) aprove a associação; nos menus laterais (`MobileNavDrawer.tsx` e `Sidebar.tsx`), a inscrição exibe o selo `"Em Análise"` (ou `"Aguardando Pgto"`) e somente mostra `"Confirmado"` quando `paymentStatus === 'pago'`.
- **Elegibilidade de Atletas nas Equipes e Súmulas (`isEligiblePaidAthlete` em `CompetitionStoreContext.tsx` e `LiveMatchSheetOperatorPage.tsx`):** Usuários que apenas solicitaram inscrição (`paymentStatus !== 'pago'`) não aparecem na aba de atletas da equipe (`Elenco` / `visibleAthletes`), não recebem o selo de `"Atleta Oficial"` na comunidade/perfil e não aparecem nem podem ser escalados nos inscritos da partida na súmula eletrônica (`LiveMatchSheetOperatorPage.tsx`). Somente atletas com pagamento confirmado (`paymentStatus === 'pago'`) são listados e podem ser selecionados/escalados nas partidas.
- **Prevenção e Consolidação de Duplicatas (`deduplicateAndLinkCloudEntities` em `api/_lib/serverStore.ts`, `RegistrationStoreContext.tsx`, `CompetitionStoreContext.tsx` e `CommunityDirectoryPage.tsx`):**
  - Se um usuário tiver sua solicitação de Sócio rejeitada e preencher novamente o formulário de inscrição (`createRegistration`), o sistema reutiliza/atualiza a inscrição pendente existente para o mesmo e-mail em vez de criar uma 2ª inscrição e 2º atleta.
  - No servidor (`deduplicateAndLinkCloudEntities`), inscrições e atletas com o mesmo e-mail são consolidados automaticamente no registro pago (preservando `avatarUrl`, `jerseyNumber`, `instagramHandle` e `bio` de tentativas anteriores) e as duplicatas obsoletas são removidas da memória e do Firestore.
  - Na aba **Comunidade & Perfis** (`CommunityDirectoryPage.tsx`), a união entre `publicProfiles` e `visibleAthletes` registra `p.linkedAthleteId` e `linkedAth.id` em `seenIds` e deduplica por nome normalizado + turma/equipe, garantindo que nenhum atleta pago com conta de usuário nem o perfil da Atlética Cangaceira apareçam duplicados.
  - **Autorreparo de Inscrições Pagas em Cold-Start (`markRegistrationPaidOnServer` + `deduplicateAndLinkCloudEntities`):** Quando um webhook ou confirmação do Mercado Pago chega em uma instância recém-iniciada antes do documento completo da inscrição, o servidor reconstrói os campos de perfil (`athleteName`, `athleteEmail`, `teamId`, `turma`, `jerseyNumber`, etc.) a partir do registro em `athletes` correspondente, e o cliente trata campos opcionais com segurança (`(payload.name || '').trim()`) para evitar exceções de runtime (`TypeError`) ao abrir o site.

  - **Pagamentos Confirmados por Fora (`PREPAID_EXTERNAL_ATHLETES_QUEUE` em `registrationData.ts` & `PREPAID_EXTERNAL_ATHLETES_SERVER_QUEUE` em `serverStore.ts` / `cloud-sync.ts`):** Dos 15 pagamentos externos da **Turma 24 (Colossal)** (**Total T24 = R$ 880,00**: 2 Sócios = R$ 100 + 13 Não Sócios = R$ 780), os 12 usuários que já tinham conta criada já constam como atletas confirmados (`paymentStatus === 'pago'`), enquanto os 3 participantes que ainda não criaram conta (`Laís Ferreira Aguiar` Sócio R$ 50, `Emily da Fonseca Leal` R$ 60, `David Arison Castro e Silva` R$ 60) não aparecem como atletas/inscritos públicos antes do cadastro e ficam na fila pré-aprovada para virarem atletas confirmados automaticamente assim que criarem conta (`register_user`, `google_login`, `update_user_profile` ou `/inscricao`), já contabilizando seus valores na calculadora financeira sem duplicidade.
  - **Calculadora Financeira por Turma (`AdminRegistrationsPage.tsx` & `excelRegistrationsExporter.ts`):** Exibe cards de arrecadação geral e calculadora detalhada por turma (Sócios vs Não Sócios) em `/admin/inscricoes`, além de agrupar canonicamente as 5 turmas na exportação Excel oficial.

## 3. Sincronização Multi-Dispositivo e Persistência (Firestore + Cloud Sync)
- **Persistência Autenticada no Firestore (`api/_lib/serverStore.ts`):**
  - As chamadas REST serverless (`MirrorDocumentToFirestoreRest`, `DeleteDocumentFromFirestoreRest`, `ensureCloudStoreHydrated`) utilizam token Firebase Auth (`getServerFirebaseIdToken`) para garantir que o Cloud Firestore aceite leituras e gravações (`request.auth != null`) mesmo após *cold-starts* da Vercel.
  - `ensureCloudStoreHydrated` re-hidrata a memória das instâncias serverless a cada 2s (ou sob demanda com `?force=true`) e atualiza `updatedAtIso` sempre que `matches` ou `match_sheets` mudam no Firestore, evitando qualquer cache `notModified` obsoleto entre containers da Vercel.
- **Súmula Eletrônica e Placar Ao Vivo em Tempo Real (`CompetitionStoreContext.tsx`, `PublicLiveScoreboardPage.tsx`, `MatchCard.tsx`, `BracketView.tsx`):**
  - Todas as 64 partidas oficiais possuem `MatchSheet` hidratado automaticamente (`hydrateOfficialSheetsWithDefaults`).
  - A aba **"Ao Vivo"** (`Header.tsx`, `Sidebar.tsx`, `BottomNav.tsx`, `MobileNavDrawer.tsx`, `HomePage.tsx`) só fica visível quando `hasActiveLiveMatch` é verdadeiro — isto é, quando há uma partida real com status `live` ou `halftime` sendo operada na súmula (cronômetro iniciado/pausado ou lances registrados).
  - Operações na súmula (cronômetro a cada 2s, gols, sets, cartões, faltas, pedidos de tempo) incrementam `revision`, renovam automaticamente tokens JWT expirados de admin (`refresh_user_token`), não são bloqueadas caso a revisão local do operador estivesse menor que a do servidor, e sincronizam instantaneamente via `/api/cloud-sync` (`cache: 'no-store'`) + `onSnapshot(collection(db, 'match_sheets'))`.
  - Em modalidades de Sets (`volei` / `volei-de-praia`), o número grande do placar ao vivo, dos `MatchCard`s e dos cards de `BracketView` mostra em destaque os **pontos do Set Atual** (`14 × 12`) junto com a contagem de **SETS** (`1 — 0`), evitando que o placar aparente estar travado em `0 - 0` durante todo o 1º set.
  - **Cobertura Completa de Todas as 16 Modalidades em Súmula Oficial (`ensureModalitySpecificSheetFields` & `quickActionsConfig.ts`):**
    - **Tênis de Mesa (`tenis-de-mesa`):** Hidrata automaticamente as 3 sub-partidas individuais (`subMatches`) nas súmulas oficiais vinculando os atletas escalados, e exibe o placar individual em tempo real no `PublicLiveScoreboardPage.tsx`.
    - **Natação (`natacao`):** Hidrata automaticamente as 5 raias oficiais (1 por Atlética/Turma) em `match_natacao_geral_final`.
    - **Truco, Sinuca e Poker (`modular_table`):** Contam com botões dedicados de pontuação rápida (`+1 Tento`, `+3 Truco`, `+6`, `+9`, `+12`, `+1 Partida/Mesa`, `+1 Mão`) e botão `"Iniciar Partida Ao Vivo"`.
    - **Avanço de Chaveamento Seguro por Categoria (`updateMatchAndSheet`):** Filtra estritamente por `modalityId` + `categoryId`/`categoryName` (impedindo cruzamento entre Masculino e Feminino) e posiciona o vencedor da `Semifinal 1` no `homeTeam` e da `Semifinal 2` no `awayTeam` da Final.
  - **Zero Dados Fictícios no Placar Ao Vivo (`PublicLiveScoreboardPage.tsx`):** Removidos votos falsos (`45 / 35 / 20`), notas inventadas (`7.8` / `7.5`) e barras aleatórias de ritmo de jogo. O **Palpite da Torcida** agora usa `sheet.fanVotes` (`cast_match_vote` no servidor + Firestore), iniciando em `0 votos reais` (1 voto real por usuário/dispositivo, ocultando "Empate" em esportes de sets), e os gráficos/destaques refletem exclusivamente os lances reais marcados na súmula.
  - **Escalação Pré-Partida Mobile-First (`Modal.tsx`, `CompetitionStoreContext.tsx`, `LiveMatchSheetOperatorPage.tsx`):**
    - `Modal.tsx` usa `max-h-[92dvh] flex flex-col` com rolagem nativa fluida no iOS/Android, sem cortar botões abaixo da dobra no celular.
    - No modal de escalação da súmula, há abas dedicadas por equipe (`Mandante` | `Visitante`), bloco **"Toque para escalar"** no topo com botão **"+ Escalar Todos"**, vínculo automático de gênero via `registrations` (`categoryName`/`gender` também sincronizados em `athletes`), atualização imediata da ref `unlockedMatchIdsRef` ao desbloquear a partida pelo PIN de mesário e busca unificada no estado mais recente (`prevState.officialAthletes` + `prevState.testAthletes`).
  - **Sistema Oficial de Rotação Automática de Voleibol FIVB / CBV (`volleyballRotation.ts`, `LiveMatchSheetOperatorPage.tsx`, `PublicLiveScoreboardPage.tsx`, `GeneratedMatchSheetPage.tsx`):**
    - Permite configurar no início de cada set quem tem o **1º Saque** (`initialServingSide`) e a formação inicial de quadra nas 6 zonas (`P1/I` a `P6/VI` — Frente/Rede: `P4 - P3 - P2`; Defesa/Saque: `P5 - P6 - P1`).
    - No `0 × 0`, o atleta em `P1` da equipe com o 1º saque inicia sacando sem girar. A cada ponto registrado, se a equipe sacadora pontua (*break point*), ninguém gira; se a equipe recebedora conquista o ponto (*side-out* — Regra FIVB 12.2.2.2), o direito ao saque passa para ela e **somente ela gira 1 posição no sentido horário** (`P2 → P1`, `P3 → P2`, `P4 → P3`, `P5 → P4`, `P6 → P5`, `P1 → P6`).
    - Substituições trocam o atleta exatamente na mesma zona da rotação; desfazer/excluir lances recalcula instantaneamente a rotação por replay determinístico; e ao encerrar o Set 1, o Set 2 já pré-alterna o 1º saque conforme Regra FIVB 7.1.2.
    - Refletido ao vivo no console do mesário, no placar público (`/placar/:matchId` e aba Escalações) e na Súmula Oficial A4/PDF (`/sumula/:matchId/documento`).
  - **Visibilidade da Súmula Oficial (`isOfficialReleased`):** A súmula oficial (`/sumula/:matchId/documento`) fica oculta para o público geral até que a partida esteja finalizada (`status === 'finished'`) e o operador da mesa clique em **"Liberar Súmula"** no painel ao vivo (`LiveMatchSheetOperatorPage.tsx`). Administradores/mesários continuam com acesso prévio.
  - **Desativação de Modo Ao Vivo / Reversão para Agendado (`resetMatchToScheduled` em `CompetitionStoreContext.tsx`, `LiveMatchSheetOperatorPage.tsx` e `AdminDashboardPage.tsx`):** Caso uma partida oficial seja iniciada por engano fora do Modo de Teste, o botão **"Desativar Ao Vivo"** (disponível tanto no cabeçalho da súmula com opção de manter ou limpar a escalação quanto em 1 clique no painel `/admin`) retorna imediatamente a partida para `status: 'scheduled'`, zera cronômetro/eventos/sets e oculta a aba **"Ao Vivo"** para todos os usuários.
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
- **Design Minimalista e Público Limpo:** Sem textos prolixos, sem repetições de rótulos (evitar `Futsal • Futsal` ou `Turma 21 • Turma 21`), tabelas limpas e cards diretos. Nenhuma instrução, botão ou jargão administrativo (`Painel Admin`, `aba Cadastros`, `Mesário`, `Súmula Eletrônica`, `Modo de Teste`) deve aparecer para o usuário comum (`!isAdmin`).
- **Navegação Mobile Unificada (`Header.tsx` + `BottomNav.tsx`):** No celular, a barra de abas superior fica oculta (`hidden lg:block`), mantendo apenas o `BottomNav` inferior para um visual de app nativo.
- **Cards de Jogos Compactos (`MatchCard.tsx`):** Altura reduzida em ~30% para exibir 3 a 4 jogos na tela do celular simultaneamente.
- **Destaque de Byes no Chaveamento (`BracketView.tsx`):** Resumo visual no topo da chave indicando claramente as 3 turmas com *Bye* direto na Semifinal e as 2 turmas que disputam as Quartas.
- **Escudos Padronizados (`TeamCrest.tsx`):** Moldura com fundo escuro uniforme e anel colorido na cor oficial de cada turma (`Vermelho Sanguinária`, `Amarelo Predadora`, `Azul Tormenta`, `Verde Colossal`, `Vinho Soberana`).
- **Gerador de Cards 9:16 para Instagram Stories (`StoryShareModal.tsx`):** Permite compartilhar placares/partidas e o passaporte/ficha de atleta direto nos Stories ou WhatsApp via Web Share API / PNG.
- **Identidade Visual:** Azul Royal (`#0B218A`, `#0F2A56`, `#091834`), Amarelo Dourado (`#FACC15`, `#F5B700`), Superfície Clara (`#F4F6FB`, `#FFFFFF`), com temas individuais preservados para cada atlética.
- **Design Engineering Craft — Emil Kowalski (`emilkowalski/skills` em `src/index.css`, `tailwind.config.js`, `Button.tsx`, `Modal.tsx`, `Tabs.tsx`, `MobileNavDrawer.tsx`, `QuickSearchModal.tsx`, `Header.tsx`, `BottomNav.tsx`, `MatchCard.tsx`):**
  - **Curvas Customizadas:** `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)` (curva Vaul/iOS); nunca usar `ease-in` em entradas nem `transition-all`.
  - **Shadow-as-Border & Raios Concêntricos:** Bordas ópticas semitransparentes com tom da marca (`0 0 0 1px rgba(15, 42, 86, 0.065)`) em cards e pílulas (`rounded-[24px]` externo / `rounded-[12px]` interno).
  - **Feedback Tátil & Mobile-Native:** `active:scale-[0.97]` em `150ms var(--ease-out)` nos botões, `touch-action: manipulation` + `user-select: none` apenas em controles, variante `can-hover:` (`@media (hover: hover) and (pointer: fine)`) para eliminar *sticky hover* após toque no celular, `interactive-widget=resizes-content` + `16px` em `@media (pointer: coarse)`, e `tabular-nums` em todos os placares/cronômetros/contadores.
  - **Gestos 1:1 Estilo Vaul & Transições Assimétricas:** `Modal.tsx` (Bottom Sheet no celular com pílula de arraste 1:1, amortecimento *rubber-band* acima do topo e fechamento por flick `velocity > 0.11` px/ms; `scale(0.96)` no desktop com saída mais rápida que a entrada), `MobileNavDrawer.tsx` (swipe-left 1:1 com momentum), `QuickSearchModal.tsx` (`<130ms` estilo Raycast + `Escape`) e indicadores deslizantes GPU (`translate3d`) em `Tabs.tsx`, `Header.tsx` e `PublicLiveScoreboardPage.tsx`, respeitando `@media (prefers-reduced-motion: reduce)`.

## 6. Como Retomar o Trabalho em Novo Dispositivo
Ao iniciar uma nova sessão no Antigravity em outro PC, basta dizer:
> *"Leia o arquivo `.antigravity/CONTEXT.md` e continue o desenvolvimento do IntraMed IX."*
