# INTRAMED IX — Plataforma Esportiva Oficial (Medicina UEMA)

Aplicativo web e mobile-first da **IX Edição do Campeonato Interno de Medicina da UEMA (A.A.A. Cangaceira)** para acompanhamento em tempo real de partidas, súmula eletrônica multi-modalidades, placar ao vivo, páginas das 5 equipes oficiais, perfis individuais de atletas e rankings automáticos.

---

## As 5 Equipes Oficiais

| Equipe | Sigla | Turma / Identificação | Cores Predominantes | Rota Direta |
| :--- | :---: | :--- | :--- | :--- |
| **Colossal** | `COL` | MEDUEMA TXXIV | Verde Esmeralda & Dourado | `/equipe/colossal` |
| **Soberana** | `SOB` | MEDUEMA XXV | Grená Imperial & Ouro | `/equipe/soberana` |
| **Sanguinária** | `SAN` | TURMA XXI | Vermelho Vivo & Chamas | `/equipe/sanguinaria` |
| **Predadora** | `PRE` | MED UEMA XXII | Amarelo Ouro & Preto | `/equipe/predadora` |
| **Tormenta** | `TOR` | MED UEMA XXIII | Azul Ciano, Marinho & Laranja | `/equipe/tormenta` |

---

## Tecnologias Utilizadas

- **React 18** + **TypeScript**
- **Vite 5** (empacotamento rápido e HMR)
- **Tailwind CSS 3** (Design System esportivo customizado)
- **React Router DOM 6** (`BrowserRouter` com suporte a SPA rewrites na Vercel)
- **Lucide React** (iconografia esportiva)

---

## Como Executar Localmente

1. Instalar as dependências:
   ```bash
   npm install
   ```

2. Iniciar o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

3. Validar o build de produção:
   ```bash
   npm run build
   ```

---

## Fluxo de Desenvolvimento Contínuo (GitHub + Vercel)

- **Branch `main` (Produção):** Qualquer `push` ou `merge` na branch `main` dispara automaticamente a atualização do link oficial de produção na Vercel.
- **Branches de Preview (`feat/...`, `fix/...`):** Ao criar uma nova branch e enviá-la ao GitHub, a Vercel gera um link exclusivo de **Preview** para testar as alterações antes de mesclar na `main`.
