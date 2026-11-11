---

description: "Tarefas da feature 042: empresários"
---

# Tasks: Empresários

**Input**: Design documents from `/specs/042-empresarios/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**:
- **Motor:** os testes vêm antes do código (Princípio IX).
- **Dinheiro:** propriedades por enumeração (SC-003), sem `fast-check`.
- **Equilíbrio:** `sim:economy`, as 30 temporadas, o `sim:gates` e a continental em 3 seeds (SC-004, SC-005).
- **Linhas de base:** regravadas de propósito no mesmo PR, com o motivo registrado.
- **Save:** v27 com a fixture `saveV26`.
- **Web:** testes de componente e o e2e.

**Organization**:
- US1 e US2 (P1);
- US3 e US4 (P2);
- US5 (P3).

A fundação leva o módulo `agents/` (regras, derivação, relações e comissão), a categoria `commission`, os tipos e o save v27.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem depender de tarefa incompleta)
- **[Story]**: história da spec (US1 a US5)

---

## Phase 1: Setup

- [X] T001 Tipos e esqueleto:
  - criar `packages/engine/src/agents/{rules,roster,relations,commission,index}.ts` com as assinaturas de `contracts/engine-agents.md`, exportadas em `packages/engine/src/index.ts`;
  - em `packages/engine/src/market/types.ts`:
    - `AgentRelation`, `AgentDeal` e `AgentsState` (data-model);
    - `agents?: AgentsState` em `MarketState`;
    - `commission?` em `Negotiation`;
    - `commission?` e `agentId?` em `TransferRecord`;
    - `minCommission?` na recusa `no_interest` de `PlayerResponse`;
  - `"commission"` no fim de `LEDGER_CATEGORIES` (`packages/engine/src/finance/types.ts`).
- [X] T002 Regras: `DEFAULT_AGENTS` e `agentRules(world, countryId)` em `packages/engine/src/agents/rules.ts`:
  - lê `market.agents` da competição principal do país;
  - mescla campo a campo, inclusive o objeto `relation`.

  Em `packages/engine/src/model/schemas.ts`, `market.agents` opcional com as faixas de research R5, `capMonths ≥ refMonths` e `tradePct ≤ 100`, com mensagens por campo.

---

## Phase 2: Foundational

### Testes primeiro

- [X] T003 [P] Criar `packages/engine/test/agents/roster.test.ts`:
  - **`agentsOf`:** dá `perCountry` empresários por país, com ids `agent-<país>-<n>`, nomes do banco de nomes do país e ganância e influência de 1 a 5; o mesmo mundo e a mesma seed dão a mesma lista, e uma seed diferente dá outra;
  - **`agentOf`:** é estável para o mesmo jogador, usa o país de nacionalidade (mesmo jogando em outro país) e devolve `undefined` com `perCountry = 0`;
  - **cobertura:** todos os jogadores do mundo de teste têm empresário, e cada empresário tem ao menos um jogador;
  - **sem sorte do jogo:** derivar não consome o PRNG (o estado do mundo e da carreira fica igual).
- [X] T004 [P] Criar `packages/engine/test/agents/commission.test.ts` (research R2):
  - **`Cref`:** cresce com a ganância e com relação ruim (`relationFactor`) e vai ao teto com relação 0;
  - **falta de interesse:** dentro de `gapPerInfluence × influência`, dá `min = Cref + W × 0,5 × gap`; fora desse limite, `unreachable`;
  - **`wageWithCommission`:** baixa o salário pelo excedente até `wageCapPct` e nunca economiza mais que 80% do excedente no contrato;
  - **`aiCommission`:** usa a relação neutra;
  - **schema:** recusa `tradePct: 120` e `capMonths < refMonths`, com o campo no erro.
- [X] T005 [P] Criar `packages/engine/test/agents/relations.test.ts`:
  - **`relationOf`:** devolve 50 sem registro;
  - **`bumpRelation`:** aplica cada motivo e limita a 0–100; `broke` só quando chega a 0 vindo de cima;
  - **`decayRelations`:** aproxima de 50 por `decay`, sem passar;
  - **`relationBand`:** nas fronteiras da tabela do contrato de UI.
- [X] T006 [P] Criar `packages/save/test/migrate-v27.test.ts` e a fixture `saveV26` em `packages/save/test/fixtures.ts`:
  - um save v26 abre sem `market.agents`, igual no resto;
  - todo jogador tem empresário derivável;
  - chega à virada (SC-006).

### Implementação

- [X] T007 Implementar `agents/roster.ts`:
  - `agentsOf`, com memo por `world` e seed (`WeakMap`) e `createRng(\`${seed}:agent:${countryId}:${n}\`)`;
  - `agentOf`, com o hash `cyrb128` de `${seed}:agent-of:${playerId}` mod n;
  - `portfolioOf`, com os jogadores do mundo e os livres.

  Fazer a T003 passar.
- [X] T008 Implementar `agents/commission.ts` (`commissionQuote`, `wageWithCommission`, `aiCommission` e `relationFactor`), usando `wageDemand`, `exigency`, `attraction` e `interestMargin` de `market/player-response.ts`. Fazer a T004 passar.
- [X] T009 Implementar `agents/relations.ts` (`relationOf`, `bumpRelation`, `decayRelations` e `relationBand`), com `deals` limitado a 100. Fazer a T005 passar.
- [X] T010 Save v27:
  - `SAVE_FORMAT_VERSION = 27` (`packages/save/src/format.ts`);
  - o schema de `market.agents` (opcional) e a migração v26 → v27 (só a versão) em `packages/save/src/migrate.ts`;
  - na coerência: relações entre 0 e 100 e só de clubes que existem;
  - atualizar os `formatVersion).toBe(26)` dos testes antigos.

  Fazer a T006 passar.

**Checkpoint**: empresários derivados, comissão, relações e save prontos.

---

## Phase 3: User Story 1 - Comissão para convencer um jogador (Priority: P1) 🎯 MVP

**Goal**: a comissão na proposta de contrato, paga em "Comissões", cobrindo a falta de interesse e baixando o salário pedido.

**Independent Test**: um jogador sem interesse aceita com a comissão mínima; o caixa paga em "Comissões".

- [X] T011 [P] [US1] Criar `packages/engine/test/market/commission.test.ts`:
  - **efeitos:** `completeTransfer`, `completeSigning` e `completeRenewal` com `commission` lançam `-commission` em `commission` no clube que contrata e nada em outro clube, e preenchem `commission` e `agentId` no record; com caixa < taxa + comissão, falham com `market.insufficient_cash` (`needed` = soma);
  - **`respondToContract`:**
    - sem interesse e com `commission ≥ min`: responde pela regra de salário;
    - abaixo do mínimo: `no_interest`, com `minCommission`;
    - `unreachable`: `no_interest` sem mínimo;
    - comissão acima da pedida: baixa o salário pedido;
  - **`proposeContract`:** com `commission`, conclui e paga `max(commission, Cref)`; a comissão sobrevive ao pedido de salário do atleta (`answerPlayerDemand(true)` paga a mesma);
  - **sem comissão:** a resposta é a de hoje, e a comissão paga é `Cref` (FR-011).
- [X] T012 [US1] Implementar:
  - `commission` nos efeitos (`packages/engine/src/market/effects.ts`);
  - a comissão em `respondToContract` (`packages/engine/src/market/player-response.ts`);
  - `proposeContract`, `answerPlayerDemand` e `conclude` em `packages/engine/src/market/negotiation.ts`.

  Fazer a T011 passar.
- [X] T013 [US1] Save e web:
  - `proposeManagerContract` com `commission` (`packages/save/src/market.ts`) e no `apps/web/src/game/GameProvider.tsx`;
  - em `apps/web/src/ui/market/NegotiationDialog.tsx`, na etapa do contrato: o empresário, o campo "Comissão" preenchido com a referência, e em `aria-live` o salário pedido com a comissão, o mínimo sem interesse, o "sem interesse, mesmo com comissão" ou o aviso do teto;
  - o aviso de caixa insuficiente (taxa + comissão) antes de propor, com o valor que falta;
  - a categoria `commission` em `apps/web/src/ui/FinanceSummary.tsx` e `apps/web/src/game/finance-series.ts` (despesa);
  - os textos `market.commission.*` e `finance.category.commission` em `packages/i18n/locales/pt-BR/ui.json`.

  Testar em `apps/web/test/ui/agents.test.tsx` (SC-001).

**Checkpoint**: a comissão funciona na negociação do técnico.

---

## Phase 4: User Story 2 - Ver o empresário e a relação (Priority: P1)

**Goal**: o empresário e a relação no detalhe e na negociação; a aba Empresários no Mercado.

**Independent Test**: o detalhe de jogadores de vários empresários e a lista na aba.

- [X] T014 [P] [US2] Em `packages/engine/test/agents/view.test.ts`, testar `agentsViewOf(market, world, careerSeed, clubId)` em `packages/engine/src/agents/index.ts`: lista só os empresários com relação registrada ou negócio com o clube do técnico, com a carteira, a relação e o último negócio, ordenados pela relação.
- [X] T015 [US2] Implementar `agentsViewOf` em `packages/engine/src/agents/index.ts` e exportar em `packages/engine/src/index.ts`; a web chama com `save.market`, `save.bank`, `save.seed` e `save.clubId`. Na web:
  - a linha "Empresário: Nome · Relação: faixa (valor)" em `apps/web/src/ui/PlayerDetails.tsx`, `PlayerModal.tsx`, `market/MarketPlayerModal.tsx` e no detalhe dos jovens da base (`AcademyTab.tsx` / `AcademyPanel.tsx`);
  - a aba nova `apps/web/src/ui/market/AgentsTab.tsx` (tabela, carteira com links para o detalhe, só com o técnico empregado), registrada em `apps/web/src/app/jogo/mercado/page.tsx`;
  - os textos `agents.*` (faixas, ganância e influência em texto, plural).

  Testar em `apps/web/test/ui/agents.test.tsx`.

---

## Phase 5: User Story 3 - A relação pesa nas próximas negociações (Priority: P2)

**Goal**: os eventos mudam a relação, a relação muda a comissão, e o rompimento leva a comissão ao teto.

**Independent Test**: rescindir e, depois, negociar outro jogador do mesmo empresário; a relação cai e a comissão sobe (SC-002).

- [X] T016 [P] [US3] Em `packages/engine/test/market/agent-relations.test.ts`, testar:
  - a compra ou o livre concluídos dão `signed` (+5), e a renovação dá `renewed` (+3);
  - `terminateContract` dá `terminated` (−15);
  - `answerPlayerDemand(false)` dá `demand_refused` (−8);
  - `cancelNegotiation` pedido pelo técnico (sem `reason`) nas etapas `contract` e `player_demanded` dá `abandoned` (−4). Um cancelamento automático (com `reason`), ou um cancelamento na etapa do clube, não mexe na relação;
  - depois da rescisão, o `Cref` de outro jogador do mesmo empresário é maior (SC-002);
  - **rompimento:** chegar a 0 dá `Cref = cap`;
  - nenhum clube da IA entra em `relations`.
- [X] T017 [US3] Implementar os eventos:
  - em `packages/engine/src/market/negotiation.ts` (`conclude`, `answerPlayerDemand` e `cancelNegotiation` só sem `reason`) e `packages/engine/src/market/disposal.ts` (`terminateContract`);
  - o retorno ao neutro na etapa `reset-market` (`packages/engine/src/market/turnover.ts`).

  Fazer a T016 passar. Testar o retorno na virada em `packages/save/test/agents.test.ts` (novo). No mesmo arquivo, testar a troca de clube do técnico: as relações do clube antigo ficam em `relations[clubeAntigo]`, as do clube novo começam neutras (50, sem registro), e uma negociação no clube novo não mexe nas do antigo.

---

## Phase 6: User Story 4 - A IA também paga comissões (Priority: P2)

**Goal**: a comissão de referência nas compras, nos livres e nas renovações da IA, com a economia nos limites.

**Independent Test**: uma temporada simulada com lançamentos em "Comissões" nos clubes da IA, sem relações; as 30 temporadas nos limites.

- [X] T018 [P] [US4] Em `packages/engine/test/market/ai-commission.test.ts`, testar:
  - `aiMarketRound`: as compras e os livres da IA lançam `aiCommission` no clube que contrata;
  - `expire-contracts`: as renovações da IA lançam `aiCommission` na temporada nova, e o livro-caixa continua batendo com o caixa (`cash = seasonStartCash + Σ ledger`);
  - nenhuma relação é registrada.
- [X] T019 [US4] Implementar em `packages/engine/src/market/ai/round.ts` e `packages/engine/src/market/turnover.ts`. Fazer a T018 passar.
- [X] T020 [US4] Calibração:
  - rodar `pnpm sim:economy` e os testes de 30 temporadas (`packages/engine/test/finance/long-run.test.ts`, `renewal/long-run-1.test.ts`, `renewal/long-run-2.test.ts`, `market/long-run.test.ts`, `board/long-run.test.ts` e `career/continental-long-run.test.ts`);
  - se o caixa da IA ou as faixas saírem dos limites, ajustar `refMonths` (ou a reserva da IA) e registrar em `specs/042-empresarios/research.md` (seção "Calibração");
  - regravar as linhas de base (`UPDATE_BASELINE=1`: `packages/save/test/equivalence.test.ts`, `packages/engine/test/match/baseline.test.ts` e `packages/engine/test/season/stages-freeze.test.ts`) e os snapshots de composição e continental que mudarem;
  - registrar a partir de quando as partidas e as finanças diferem;
  - rodar a equivalência de novo, sem regravar (determinismo).

---

## Phase 7: User Story 5 - Empresários no noticiário (Priority: P3)

**Goal**: as manchetes de rompimento e de negócio grande.

**Independent Test**: provocar um rompimento e um negócio com comissão alta.

- [X] T021 [P] [US5] Em `packages/engine/test/news/agents.test.ts`, testar:
  - `agentBroke` sai quando o record ou o evento da rodada marca o rompimento com o clube do técnico;
  - `agentBigDeal` sai com comissão ≥ `headlineMonths × referenceMonthlyPayroll` e não abaixo;
  - nenhuma das duas sai para clubes da IA.
- [X] T022 [US5] Implementar `packages/engine/src/news/agents.ts`:
  - os tipos novos em `news/types.ts`, `news/rules.ts` (relevância) e `model/schemas.ts` (`headlineMap`);
  - a chamada em `news/round.ts`;
  - os textos `news.agentBroke.N` e `news.agentBigDeal.N` em `ui.json`;
  - `GENERAL_TYPES` e a categoria em `apps/web/src/game/news-view.ts` e `home-view.ts`;
  - `commissionText` e o nome do empresário em `apps/web/src/ui/news/headline-vars.ts`.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T023 [P] Criar `packages/engine/test/properties/commission.test.ts` (research R8):
  - **sem volta:** transferências, livres e renovações aleatórios com comissão: `Σ cash` cai exatamente pela soma das comissões, e venda, rescisão e fim de contrato posteriores não devolvem nada;
  - **troca:** para todo W, Y de 1 a 5, ganância, influência, relação e C da grade, `ΔW × 12 × Y ≤ excedente`;
  - **ciclo:** comprar com comissão e vender nunca rende mais que sem comissão.
- [X] T024 [P] Cenário de comissões em `tools/src/simulate-economy.ts` (`runAgentsScenario`), com limites declarados:
  - o peso das comissões da IA na folha anual (≤ 6%);
  - o caixa mediano da IA comparado à 1.14.0;
  - a parcela fora de crise.

  Ligar no comando.
- [X] T025 [P] e2e `apps/web/e2e/agents.spec.ts`: abrir a negociação de um jogador forte, ver a comissão mínima, propor com ela, ver "Comissões" em Finanças e a aba Empresários; axe na negociação e na aba.
- [X] T026 [P] Documentação:
  - `market.agents` em `docs/mod-format.md` e `apps/web/public/docs/mod-format.md`;
  - os empresários e a comissão em `docs/guia-do-jogador.md`;
  - "empresário", "relação" e "Comissões" em `docs/glossario.md`;
  - o módulo `agents/` em `docs/arquitetura.md`.
- [X] T027 Validação final:
  - `pnpm lint` e `pnpm typecheck`;
  - a suíte completa, sozinha;
  - `pnpm sim:economy` e `pnpm sim:gates` (metas da 020, SC-005);
  - o volume de transferências pela coluna de compras do `sim:world`/`sim:gates`, comparado à 1.14.0;
  - a continental completa em 3 seeds (`pnpm sim:world --continental --seed padrão`, `var-a` e `var-b`), comparada à 1.14.0 (SC-004);
  - o e2e completo sobre um build novo.

  Registrar no PR as medidas e as linhas de base regravadas.
- [X] T028 Release no mesmo PR: `package.json` em 1.15.0 e a nota em `packages/i18n/locales/pt-BR/release-notes.json` com a data de `TZ=America/Sao_Paulo date +%F`. Rodar `pnpm check-release` depois do build.

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → **Foundational (T003–T010)** → histórias.
- **US1 (T011–T013)** depende da fundação.
- **US2 (T014–T015)** depende da fundação.
- **US3 (T016–T017)** depende de T012, porque os eventos ficam na negociação.
- **US4 (T018–T020)** depende de T012, porque usa a comissão nos efeitos; a T020 vem depois de T019 e de T017.
- **US5 (T021–T022)** depende de T012 e de T017.
- **Polish (T023–T028)** depende de todas; as linhas de base (T020) são regravadas antes da validação final.

### Testes antes da implementação

- T003, T004, T005 e T006 antes de T007 a T010;
- T011 antes de T012;
- T014 antes de T015;
- T016 antes de T017;
- T018 antes de T019;
- T021 antes de T022.

### Parallel Opportunities

- T003, T004, T005 e T006.
- Depois de T012: T014, T016 e T018, todos em arquivos de teste diferentes.
- T021 depois de T017.
- T023, T024, T025 e T026.

## Parallel Example: depois de T012

```text
T014 agents/view.test.ts            [US2]
T016 market/agent-relations.test.ts [US3]
T018 market/ai-commission.test.ts   [US4]
```

## Implementation Strategy

### MVP (US1 e US2)

1. Fundação: derivação, comissão, relações, save v27.
2. US1: a comissão na negociação do técnico.
3. US2: o empresário visível e a aba.
4. **Parar e validar:** SC-001.

### Incremental Delivery

1. MVP.
2. US3: a relação e o rompimento.
3. US4: a IA pagando, a calibração e as linhas de base.
4. US5: as manchetes.
5. Acabamento e release 1.15.0, num PR só.

## Notes

- As linhas de base mudam de propósito (US4). Regravar uma vez, depois de calibrar, e registrar no PR.
- Os empresários nunca entram no save; só as relações e os negócios.
- Rodar a suíte completa sozinha, sem build ou e2e em paralelo.
