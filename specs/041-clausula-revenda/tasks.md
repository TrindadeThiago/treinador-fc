---

description: "Tarefas da feature 041: cláusula de revenda"
---

# Tasks: Cláusula de revenda

**Input**: Design documents from `/specs/041-clausula-revenda/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**:
- **Motor:** os testes vêm antes do código (Princípio IX).
- **Conservação e arbitragem:** enumerações determinísticas sobre o mundo de teste (SC-002, SC-003). Sem `fast-check`.
- **Neutralidade:** as linhas de base existentes rodam **sem regravar** (SC-004).
- **Equilíbrio:** um cenário novo `resale` no `sim:economy` (SC-005).
- **Save:** v26 com a fixture `saveV25`.
- **Web:** testes de componente e o e2e.

**Organization**:
- US1 e US2 (P1);
- US3 (P2);
- US4 (P3).

A fundação leva os tipos, as regras, o mod, a categoria `resale`, as funções puras de `market/resale.ts` e o save v26.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem depender de tarefa incompleta)
- **[Story]**: história da spec (US1 a US4)

---

## Phase 1: Setup

- [X] T001 Tipos em `packages/engine/src/market/types.ts` (data-model.md):
  - `ResaleClause`, `ResaleReceipt`, `ResaleState` e `ResaleRules`;
  - `resale?: ResaleState` em `MarketState`;
  - `resalePaid?` e `resaleCreated?` em `TransferRecord`;
  - `resaleAsk?: { pct }` em `Negotiation`;
  - `resale: ResaleRules` em `MarketRules`.

  Também:
  - erros `market.resale_invalid_pct` e `market.resale_above_ceiling` em `packages/engine/src/market/errors.ts`;
  - `"resale"` no fim de `LEDGER_CATEGORIES` em `packages/engine/src/finance/types.ts`.

  Criar `packages/engine/src/market/resale.ts` com as assinaturas de `contracts/engine-resale.md` e exportar em `packages/engine/src/index.ts`.
- [X] T002 Regras:
  - `DEFAULT_RESALE` (research R4) e `resaleRules` em `packages/engine/src/market/resale.ts`;
  - `marketRules` (`packages/engine/src/market/rules.ts`) devolve `resale`.

  Em `packages/engine/src/model/schemas.ts`, `competitions[].market.resale` opcional, com as validações do data-model:
  - faixa e passo;
  - teto e pedido na faixa e no passo;
  - `0 ≤ discountPerPointPct ≤ 1`;
  - idade de 15 a 40.

  Mensagens claras por campo.

---

## Phase 2: Foundational

### Testes primeiro

- [X] T003 [P] Criar `packages/engine/test/market/resale.test.ts` (parte da fundação), testando as funções puras:
  - **`resaleSteps`:** devolve 5, 10, …, 50 no padrão;
  - **`isValidResalePct`:** recusa 0, 7 e 55;
  - **`feeWithResale(1_000_000, 30)`:** dá 700_000; `feeWithResale(3_000, 30)` dá 3_000 (2_100 arredondado para cima ao milhar), e nunca fica abaixo da conta exata;
  - **`activeClause` e `resaleShare`:** 0 sem cláusula ou com o comprador sendo o credor; nos outros casos, `min(fee, arredonda_mil_para_cima(fee × pct / 100))`. Com `fee = 1_000` e 5%, dá 1_000;
  - **`aiAsksResale`:** pede `aiAskPct` com idade ≤ 21 na data da temporada, nada com 22, e não consome PRNG;
  - **`resaleRules`:** usa o mod quando presente;
  - **schema:** um mod com `discountPerPointPct: 1.5` ou `maxPct: 95` é recusado com o campo no erro.
- [X] T004 [P] Criar `packages/save/test/migrate-v26.test.ts` e a fixture `saveV25` em `packages/save/test/fixtures.ts`. Testar:
  - um save v25 abre sem `market.resale`, com `resale: 0` nos resumos de temporada e igual no resto, e chega à virada seguinte (SC-007);
  - duas cláusulas ativas para o mesmo jogador, ou um `pct` fora da faixa, deixam o save corrupto.

### Implementação

- [X] T005 Implementar as funções puras de `packages/engine/src/market/resale.ts`:
  - `resaleSteps`, `isValidResalePct` e `feeWithResale`;
  - `activeClause`, `resaleShare` e `aiAsksResale`;
  - `clubResaleView` e `pruneResale`.

  Fazer a T003 passar.
- [X] T006 Save v26:
  - `SAVE_FORMAT_VERSION = 26` em `packages/save/src/format.ts`;
  - o schema de `market.resale` (opcional), de `resaleAsk` e dos campos novos do `TransferRecord`;
  - a migração `addResale` (v25 → v26) em `packages/save/src/migrate.ts`, que preenche `resale: 0` nos `totals` dos resumos de temporada.

  Na checagem de coerência:
  - no máximo uma cláusula ativa por jogador;
  - `pct` válido pela regra da competição;
  - ids distintos.

  Na checagem de coerência do mercado (`marketProblem` em `packages/save/src/migrate.ts`), recusar um save com mais de `RESALE_RECEIPTS_MAX` recebimentos (importado de `@brasfoot-like/engine`). *Na implementação: o `scale-limits.ts` é só das metas do mundo grande, então a checagem ficou no `marketProblem`; o percentual é conferido pelos limites absolutos (1 a 90), porque a regra de cada competição pode variar por mod.* Atualizar os `formatVersion).toBe(25)` dos testes de migração antigos. A leitura dos `totals` trata a chave ausente como 0 em `packages/engine/src/finance/summary.ts`. Fazer a T004 passar.

**Checkpoint**: tipos, regras, funções puras e save prontos.

---

## Phase 3: User Story 1 - Vender com cláusula (Priority: P1) 🎯 MVP

**Goal**: o técnico inclui a cláusula na proposta recebida, na contraproposta e na venda imediata, e recebe o valor com desconto.

**Independent Test**: vender uma cria com 30% por proposta e por venda imediata; o valor é 70% do original e a cláusula fica registrada a favor do clube do técnico.

- [X] T007 [P] [US1] Em `packages/engine/test/market/resale-sell.test.ts`, testar:
  - **`completeTransfer` com `resale: { pct: 30 }`:** cria a cláusula com o credor = vendedor, `fee`, `season` e `round`, e preenche `resaleCreated` no `TransferRecord`;
  - **`answerIncomingOffer` com `{ kind: "accept", resalePct: 30 }`:** liquida por `feeWithResale`;
  - **o mesmo com `resalePct: 35`:** falha com `market.resale_above_ceiling` (`max: 30`);
  - **o mesmo com `resalePct: 7`:** falha com `market.resale_invalid_pct`;
  - **`counter` com `resalePct`:** avalia o valor com desconto contra `maxBidFor` e o caixa;
  - **`quoteSale` com `resalePct`:** devolve o mesmo `buyerClubId` e o mesmo `fee` da cotação sem cláusula, com `discount` e `netFee` corretos;
  - **`sellNow`:** liquida o `netFee` e cria a cláusula;
  - **sem `resale`/`resalePct`:** o resultado é idêntico ao de hoje (sem `market.resale` e sem campos novos no record).
- [X] T008 [US1] Implementar a criação:
  - em `completeTransfer` (`packages/engine/src/market/effects.ts`), a entrada `resale?`, criando a cláusula depois de mover o dinheiro e incrementando `nextSeq`;
  - `resalePct` em `answerIncomingOffer` (`packages/engine/src/market/incoming.ts`), com o tipo `IncomingAnswer`;
  - `resalePct` em `quoteSale` e `sellNow` (`packages/engine/src/market/disposal.ts`), com o `SaleQuote` ganhando `discount` e `netFee`.

  Fazer a T007 passar.
- [X] T009 [US1] Save e web:
  - as ações `answerIncoming` e `sellNow`/`quoteSale` com `resalePct` em `packages/save/src/market.ts` e no `apps/web/src/game/GameProvider.tsx`;
  - o seletor "Cláusula de revenda" (`contracts/ui-resale.md`: "Sem cláusula" e os passos; os passos acima do teto desabilitados, com o texto; o valor, o desconto e o valor final em `aria-live`) em `apps/web/src/ui/market/IncomingOffers.tsx` e `apps/web/src/ui/DisposalDialog.tsx`;
  - os textos `market.resale.*` em `packages/i18n/locales/pt-BR/ui.json` e os erros em `packages/i18n/locales/pt-BR/market-errors.json`.

  Testar em `apps/web/test/ui/resale.test.tsx`.

**Checkpoint**: o técnico vende com cláusula e ela fica registrada.

---

## Phase 4: User Story 2 - Receber a revenda (Priority: P1)

**Goal**: a próxima venda definitiva paga a fatia ao credor em "Revendas", entre quaisquer clubes e países; a recompra pelo credor encerra sem pagamento.

**Independent Test**: vender com 30%, deixar a IA revendê-lo (no país e para outro país) e conferir o lançamento; emprestar, rescindir e liberar não pagam.

- [X] T010 [P] [US2] Em `packages/engine/test/market/resale-pay.test.ts`, testar com uma cláusula de 30% para o clube do técnico:
  - **venda definitiva IA × IA:** o vendedor tem `resale = −min(fee, arredonda_mil_para_cima(fee × 0,3))` e o credor `+` o mesmo valor; a cláusula vira `receipt` `paid`; o record tem `resalePaid`;
  - **venda para clube de outro país:** idem (usar o mundo de vários países de `test/market/international.test.ts`);
  - **o credor compra de volta:** sem lançamento, `receipt` `bought_back`;
  - **`completeLoan`, rescisão (`terminateContract`), fim de contrato e `completeSigning` de livre:** sem lançamento e a cláusula continua ativa;
  - **uma venda que paga a cláusula antiga e cria uma nova:** a ordem é encerrar e depois criar, e no fim há uma única ativa;
  - **venda por 0:** paga 0 e encerra;
  - **caixa do vendedor negativo antes da venda:** a fatia é paga mesmo assim.
- [X] T011 [P] [US2] Em `packages/engine/test/market/resale-property.test.ts`, as enumerações determinísticas (research R6):
  - **(a) conservação:** para cada jogador do mundo de teste com contrato, cada comprador possível de uma amostra fixa (inclusive de outro país), com e sem cláusula ativa e para cada `pct` válido, `Σ cash` antes = depois em `completeTransfer`;
  - **(b) comprar com cláusula e vender na hora:** `feeWithResale(buyAskingPrice) ≥ venda imediata × (1 − p)` para todos, e a razão máxima nunca supera a do mesmo ciclo sem cláusula (`test/market/arbitrage.test.ts`). Incluir taxas pequenas (1 a 10 mil) para cobrir o arredondamento;
  - **(c) vender com cláusula e recomprar:** o líquido do técnico nunca supera o do mesmo ciclo sem cláusula;
  - **(d) vender e revender entre clubes:** a soma dos caixas dos três clubes é constante.
- [X] T012 [US2] Em `completeTransfer` (`packages/engine/src/market/effects.ts`), antes de criar a cláusula nova, encerrar a ativa:
  - comprador = credor: `bought_back`, sem pagamento;
  - outro comprador: lançar `resale` (−vendedor, +credor) com `post`, `receipt` `paid` e `resalePaid` no record.

  Limitar `receipts` a `RESALE_RECEIPTS_MAX` (os mais recentes). Fazer a T010 e a T011 passarem.
- [X] T013 [US2] Virada: chamar `pruneResale` depois da aposentadoria em `advanceCareerSeason` (`packages/save/src/career.ts`), encerrando como `retired` as cláusulas de quem não está em `bank.players` nem em `market.freeAgents`. Testar em `packages/save/test/resale.test.ts` (novo):
  - um jogador aposentado sai das ativas e entra nos `receipts`;
  - um livre mantém a cláusula;
  - depois de o técnico trocar de clube, as cláusulas do clube antigo continuam ativas e são pagas a ele.
- [X] T014 [US2] Manchete `resaleReceived` (research R9):
  - teste em `packages/engine/test/news/resale.test.ts`: sai quando `resalePaid.clubId` é o clube do técnico e `amount ≥ headlinePayrollPct% × referenceMonthlyPayroll`; não sai abaixo do limiar nem para outro credor; `cria` é verdadeiro para uma cria do clube;
  - implementação em `packages/engine/src/news/resale.ts`, chamada em `packages/engine/src/news/round.ts` junto de `criaSaleNews`, também nas rodadas das ligas de fora;
  - texto com `select` de `cria` em `packages/i18n/locales/pt-BR/ui.json` (onde ficam as manchetes, como `academySale`) e o mapeamento em `apps/web/src/game/news-view.ts` e `apps/web/src/game/home-view.ts`.
- [X] T015 [US2] Livro-caixa na web: a categoria `resale` em `apps/web/src/ui/FinanceSummary.tsx` e `apps/web/src/game/finance-series.ts`, com `finance.category.resale` "Revendas" em `ui.json`.

**Checkpoint**: o ciclo vender com cláusula e receber funciona entre clubes e países, sem criar dinheiro.

---

## Phase 5: User Story 3 - Comprar com cláusula pedida pela IA (Priority: P2)

**Goal**: a IA pede cláusula nos jovens; o técnico vê o valor com e sem e escolhe. A cláusula ativa de outro clube é visível.

**Independent Test**: negociar um jogador de 19 anos, aceitar a cláusula numa carreira e recusar em outra; conferir o preço e a cláusula registrada.

- [X] T016 [P] [US3] Em `packages/engine/test/market/resale-buy.test.ts`, testar:
  - **`startNegotiation`** por um jogador de 19 anos, aceita ou contraproposta: grava `resaleAsk: { pct: 20 }`; com 22 anos, não grava;
  - **`answerClubCounter` aceito:** mantém `resaleAsk`;
  - **`proposeContract` com `acceptResale: true`:** paga `feeWithResale(agreedFee, 20)` e cria a cláusula a favor de `fromClubId`;
  - **com `acceptResale: false`:** paga `agreedFee` sem cláusula nova;
  - **caixa:** a checagem usa o valor final;
  - **IA × IA (`aiMarketRound`):** nunca cria cláusula, e uma rodada com `market.resale` ausente dá o mesmo resultado que com `{ clauses: [], receipts: [], nextSeq: 0 }`. A neutralidade em relação à 1.13 fica com as linhas de base da T024;
  - **carência do A2b:** um jogador comprado com cláusula entra em `signedThisSeason` e não recebe proposta da IA até a temporada seguinte, como qualquer contratação.
- [X] T017 [US3] Implementar em `packages/engine/src/market/negotiation.ts`:
  - `resaleAsk` via `aiAsksResale` em `startNegotiation` e `answerClubCounter`;
  - o parâmetro `acceptResale?` em `proposeContract`, que passa `resale: { pct }` ao `completeTransfer` com o credor `fromClubId`.

  Ajustar o `completeTransfer` para o caso em que o credor da cláusula nova é o vendedor (já é a regra). Fazer a T016 passar.
- [X] T018 [US3] Save e web:
  - `proposeContract` com `acceptResale` em `packages/save/src/market.ts` e no `GameProvider.tsx`;
  - em `apps/web/src/ui/market/NegotiationDialog.tsx`, o bloco "O clube pede X% de revenda", com o valor com e sem e a escolha na etapa do contrato, e o aviso quando o jogador tem cláusula ativa a favor de outro clube (`resaleShare` como exemplo de efeito);
  - em `apps/web/src/ui/PlayerDetails.tsx` e `apps/web/src/ui/market/MarketPlayerModal.tsx`, a linha "X% de revenda para o Y".

  Testar em `apps/web/test/ui/resale.test.tsx` (SC-006: no máximo uma ação a mais que uma compra comum).

**Checkpoint**: a IA pede cláusula nos jovens e o técnico decide com os dois valores à vista.

---

## Phase 6: User Story 4 - Cláusulas em Finanças (Priority: P3)

**Goal**: listas a receber e a pagar e o histórico do que já foi recebido.

**Independent Test**: com cláusulas ativas e pagas, abrir Finanças → Revendas e conferir as listas e o total.

- [X] T019 [P] [US4] Em `packages/engine/test/market/resale.test.ts`, testar `clubResaleView` com cláusulas a receber, a pagar e recebimentos de vários clubes: filtra pelo clube, ordena por data e soma `totalReceived` só dos `paid`.
- [X] T020 [US4] Criar `apps/web/src/ui/finance/ResaleTab.tsx`:
  - as tabelas "A receber" (jogador, clube atual, %, data da venda, valor de mercado atual; "Livre" para jogador livre), "A pagar", "Recebidas" (só as pagas: jogador, comprador, valor da venda, valor recebido, data, total) e "Encerradas sem pagamento" (recompra ou aposentadoria, com o motivo em texto);
  - os vazios;
  - a aba só aparece com o técnico empregado.

  Registrar a aba no cabeçalho de Finanças (`apps/web/src/ui/finance/FinanceHeader.tsx`) e ligar os dados em `apps/web/src/game/` (view nova `resale-view.ts`). Textos `finance.resale.*` com plural. Testar em `apps/web/test/ui/resale.test.tsx`, incluindo que "A receber" e "A pagar" têm rótulo de texto (FR-017).

**Checkpoint**: todas as histórias funcionam de forma independente.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T021 [P] Cenário `resale` em `tools/src/simulate-economy.ts` (`runResaleScenario`, research R6 e R7), com limites declarados no cenário:
  - os ciclos com cláusula têm razão máxima ≤ a dos ciclos sem;
  - uma carreira de 30 temporadas com um técnico automático (vende as crias promovidas com 30% e compra um jovem por janela aceitando a cláusula) mantém o caixa médio da IA e as faixas do mundo (força, craques, promessas) dentro dos limites da 036 e do `sim:economy` atual;
  - a soma do dinheiro só muda pelas fontes externas já conhecidas.

  Ligar no comando e documentar a saída.
- [X] T022 [P] e2e `apps/web/e2e/resale.spec.ts`: vender com 30% por uma proposta, ver a cláusula em Finanças → Revendas e no detalhe do jogador; a11y das telas novas (axe, como nos e2e existentes).
- [X] T023 [P] Documentação:
  - `market.resale` em `docs/mod-format.md` e na cópia `apps/web/public/docs/mod-format.md`, com os padrões e as validações, inclusive o porquê de `discountPerPointPct ≤ 1`;
  - a cláusula de revenda em `docs/guia-do-jogador.md`;
  - "cláusula de revenda" e "Revendas" em `docs/glossario.md`;
  - o ponto único de pagamento em `docs/arquitetura.md`.
- [X] T024 Validação final:
  - as linhas de base do `quickstart.md` passam **sem regravar**;
  - `pnpm sim:economy` e `pnpm sim:gates`;
  - `pnpm lint` e `pnpm typecheck`;
  - a suíte completa, sozinha, sem build ou e2e em paralelo.

  Registrar no PR qualquer linha de base que mude (só deve mudar onde há cláusula; o mundo sem técnico não cria nenhuma).
- [X] T025 Release no mesmo PR: `package.json` em 1.14.0 e a nota em `packages/i18n/locales/pt-BR/release-notes.json` com a data de `TZ=America/Sao_Paulo date +%F`. Rodar `pnpm check-release` depois do build.

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → **Foundational (T003–T006)** → histórias.
- **US1 (T007–T009)** depende da fundação.
- **US2 (T010–T015)** depende de T008, porque precisa criar cláusulas. A T013 também depende de T012, e a T014 também; a T015 vem depois da T014 (as duas editam `ui.json`).
- **US3 (T016–T018)** depende de T008; o pagamento na revenda (T012) não é necessário para os testes da US3.
- **US4 (T019–T020)** depende de T005; a T020 também de T012, para ter recebimentos.
- **Polish (T021–T025)** depende de todas.

### Testes antes da implementação

- T003 e T004 antes de T005 e T006;
- T007 antes de T008;
- T010 e T011 antes de T012;
- T016 antes de T017;
- T019 antes de T020.

### Parallel Opportunities

- T003 e T004.
- Depois de T008: T010, T011 e T016, todos em arquivos de teste diferentes.
- T014 e depois T015 (as duas editam `ui.json`), depois de T012.
- T019 a qualquer momento depois de T005.
- T021, T022 e T023.

## Parallel Example: depois de T008

```text
T010 resale-pay.test.ts        [US2]
T011 resale-property.test.ts   [US2]
T016 resale-buy.test.ts        [US3]
```

## Implementation Strategy

### MVP (US1 e US2)

1. Fundação: tipos, regras, mod, categoria e save v26.
2. US1: vender com cláusula por proposta e venda imediata.
3. US2: o pagamento na revenda e a recompra; conservação e arbitragem por enumeração; a manchete.
4. **Parar e validar:** o critério de aceite da cria com 30% (SC-001) e nenhum ciclo cria dinheiro (SC-002, SC-003).

### Incremental Delivery

1. MVP.
2. US3: a IA pede cláusula nos jovens.
3. US4: a aba Revendas em Finanças.
4. Acabamento, equilíbrio de 30 temporadas e release 1.14.0, num PR só.

## Notes

- Nunca regravar as linhas de base sem registrar o motivo no PR; sem cláusula, nada deve mudar.
- Todo pagamento de revenda passa por `completeTransfer`; nenhum caminho paralelo para a IA ou para as ligas de fora.
- O pedido da IA é uma comparação de idade, sem PRNG.
- Rodar a suíte completa sozinha, sem build ou e2e em paralelo.
