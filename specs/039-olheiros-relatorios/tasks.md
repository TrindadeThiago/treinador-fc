---

description: "Tarefas da feature 039: olheiros e relatórios de jogadores"
---

# Tasks: Olheiros e relatórios de jogadores

**Input**: Design documents from `/specs/039-olheiros-relatorios/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**:
- **Motor:** os testes vêm antes do código (Princípio IX). A faixa tem testes de propriedade e a grade nível × etapa (SC-001 a SC-003).
- **Neutralidade (SC-004):** um teste troca o módulo `scouting/` por uma versão que não faz nada, e as linhas de base existentes rodam **sem regravar**.
- **Save:** o save v24 tem migração e fixture (Princípio VI).
- **Web:** testes de componente, o teste de sigilo (SC-005) e o e2e.

**Organization**:
- US1, US2 e US7 (P1);
- US3, US4 e US5 (P2);
- US6 (P3).

A fundação leva os tipos, as regras, o estado com os comandos, a categoria do livro-caixa e o save v24, porque todas as histórias dependem do departamento existir.

**Decisão de implementação** (complementa o research R6): o `ScoutingState` guarda o `clubId` do departamento. Se o clube do técnico deixar de ser esse (proposta aceita ou demissão, que acontece dentro da rodada), o departamento conta como fechado e é zerado na próxima operação, sem precisar de gancho na diretoria.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem depender de tarefa incompleta)
- **[Story]**: história da spec (US1 a US7)

---

## Phase 1: Setup

- [X] T001 Criar `packages/engine/src/scouting/types.ts` com os tipos do data-model:
  - `ScoutingState { clubId?: string; level: number; watch: Observation[]; reports: Record<string, ScoutReport> }`;
  - `Observation { playerId; since: { season; round } }`;
  - `ScoutReport { estimate: PotentialEstimate; steps; temperament?: 1|2|3; injury?: 1|2|3; updated: { season; round } }`.
  Acrescentar `scouting?: ScoutingState` a `CareerSeasonState` (`packages/engine/src/career/season-state.ts`). Criar `packages/engine/src/scouting/{rules,state,round,view}.ts` com as assinaturas de `contracts/engine-scouting.md` e corpos que lançam "não implementado". Exportar tudo em `packages/engine/src/index.ts`.
- [X] T002 Em `packages/engine/src/scouting/rules.ts`, declarar `DEFAULT_SCOUTING` com a tabela do research R3 (vagas 3/5/8/12/16, custo 1 a 5%, redução 1 a 5, mínima 14/12/10/8/6, inicial 24, teto 300).
  - Em `packages/engine/src/model/schemas.ts`, acrescentar `economy.scouting` opcional com os limites do contrato.
  - Em `packages/engine/src/validation/issues.ts` e `validation/semantic/competitions.ts`, criar o aviso `economy.scouting_width_order` (quando `minWidth` cresce com o nível), com o caso em `packages/engine/test/validation/cases.ts`, o texto em `packages/i18n/locales/pt-BR/errors.json` e a linha em `docs/mod-format.md` e `apps/web/public/docs/mod-format.md`.

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: regras, estado e comandos; custo no livro-caixa só com o nível ≥ 1; save v24.

### Testes primeiro

- [X] T003 [P] Criar `packages/engine/test/scouting/rules.test.ts`:
  - `stepsToComplete` dá 10/6/5/4/4 e `attributeSteps` dá 5/3/3/2/2;
  - `scoutingCost` é 0 no nível 0 e `referenceMonthlyPayroll × costPct / 100` nos demais;
  - `scoutingRules` devolve as regras do mod quando presentes.
- [X] T004 [P] Criar `packages/engine/test/scouting/state.test.ts`:
  - `setScoutingLevel` abre (0 → n), muda e fecha, cancela as observações mais recentes acima das vagas e devolve `cancelled`, e recusa um nível fora de 0 a 5;
  - `watchPlayer` recusa com o departamento fechado, sem vaga, com o jogador já em observação, do elenco ou da base do técnico, ou inexistente; ao aceitar, cria o relatório com a largura inicial (≤ 24) que contém o potencial;
  - observar de novo um jogador cancelado mantém o relatório;
  - `unwatchPlayer` libera a vaga e mantém o relatório;
  - com o `clubId` do departamento diferente do clube do técnico, o estado é tratado como fechado (`closeScouting`).
- [X] T005 [P] Criar `packages/save/test/migrate-v24.test.ts` e a fixture `saveV23` em `packages/save/test/fixtures.ts` (o save atual sem `scouting`). Conferir:
  - um save v23 abre com `scouting = { level: 0, watch: [], reports: {} }` e chega à virada seguinte (SC-008);
  - um nível fora de 0 a 5, uma observação repetida ou um relatório com faixa invertida tornam o save corrupto.

### Implementação

- [X] T006 Implementar `packages/engine/src/scouting/rules.ts` (regras, `stepsToComplete`, `attributeSteps` e `scoutingCost`, usando `referenceMonthlyPayroll` de `renewal/academy-levels.ts`) e `packages/engine/src/scouting/state.ts` (`emptyScouting`, `setScoutingLevel`, `watchPlayer`, `unwatchPlayer` e `closeScouting`). A faixa inicial usa `initialEstimate` de `renewal/estimate.ts` com a chave `${seed}:scout:${season}:${round}:${playerId}`. Fazer T003 e T004 passarem.
- [X] T007 Categoria `scouting` no livro-caixa:
  - em `packages/engine/src/finance/types.ts`;
  - a cobrança em `applyRoundFinances` (`packages/engine/src/finance/round.ts`), junto com a academia: `-wageInstalment(12 × scoutingCost(...))` só para o clube do técnico e só com o nível ≥ 1. O `applyRoundSystems` recebe o `scouting` como opção;
  - a soma na previsão (`finance/forecast.ts`) e no resumo (`finance/summary.ts`).
  Testar em `packages/engine/test/finance/scouting-cost.test.ts`:
  - no nível 0, nenhum lançamento `scouting`;
  - no nível 3, as parcelas de uma temporada somam 12 mensalidades;
  - nenhum clube da IA recebe lançamento `scouting` em momento nenhum (FR-021).
- [X] T008 Passar o `scouting` pelo caminho da carreira, sempre como opção (sem ele, nada muda):
  - `packages/engine/src/career/day.ts`: o estado do dia, as chamadas de `applyRoundSystems` (inclusive as rodadas de outros países) e `advanceCareer`, `advanceCareerDays` e `advanceCareerToNextMatch`;
  - `packages/engine/src/finance/round.ts`: o `applyRoundSystems` recebe e devolve o `scouting`;
  - `packages/engine/src/career/turnover.ts`: a opção e o resultado da virada;
  - as ferramentas que chamam `advanceCareer` (`tools/src/simulate-economy.ts`, `tools/src/simulate-world.ts`) continuam funcionando sem passar o `scouting`.

  No save:
  - `seasonStateOf` e `withDayResult` (`packages/save/src/career.ts`);
  - a virada (`advanceCareerSeason`);
  - `SaveFile.scouting` em `packages/save/src/format.ts` (`SAVE_FORMAT_VERSION = 24`);
  - a migração `addScouting` (v23 → v24) e o schema em `packages/save/src/migrate.ts`;
  - `createSave` com `emptyScouting()`.
  Atualizar os `toBe(23)` dos testes de migração antigos. Fazer T005 passar.

**Checkpoint**: o departamento existe, custa só aberto e o save v24 migra.

---

## Phase 3: User Story 1 - Abrir o departamento e observar (Priority: P1) 🎯 MVP

**Goal**: abrir, observar e ver o relatório avançar por rodada e por país.

**Independent Test**: abrir no nível 3, observar jogadores de dois países e um livre, jogar rodadas e ver as faixas avançarem.

- [X] T009 [P] [US1] Criar `packages/engine/test/scouting/round.test.ts`:
  - `scoutingAfterRound` avança uma etapa só para os observados do país da liga que fechou a rodada;
  - os livres avançam pela liga do país do técnico;
  - um jogador que mudou de país passa a avançar pela liga nova;
  - a faixa nova fica dentro da anterior e contém o potencial;
  - `updated` registra a temporada e a rodada.
  Usar dois países do banco de teste multi-país (`test/career/world-helpers.ts`).
- [X] T010 [US1] Implementar `scoutingAfterRound` em `packages/engine/src/scouting/round.ts` (R2): largura alvo `max(mínima, inicial − redução × etapas)` e `narrowEstimate(anterior, jogador, min(atual, alvo), chave)`. Chamar no fim de `applyRoundSystems` (`packages/engine/src/finance/round.ts`), com a liga, a rodada, a seed, o clube do técnico, a renovação e os livres. Fazer T009 passar.
- [X] T011 [US1] Ações no save em `packages/save/src/scouting.ts` (`setScoutingLevel`, `watchPlayer` e `unwatchPlayer`, recusando durante a partida ao vivo) e na web em `apps/web/src/game/GameProvider.tsx`. Criar `apps/web/src/game/scouting-view.ts`, que lê só views do motor.
- [X] T012 [US1] Criar `apps/web/src/ui/market/ScoutingTab.tsx` (`contracts/ui-scouting.md`):
  - o painel do departamento, com o diálogo de abrir, mudar e fechar;
  - a tabela dos observados, com a faixa (`EstimateRange` da 038), a confiança, o andamento e Cancelar;
  - o estado vazio.
  Incluir a aba "Observação" em `apps/web/src/app/jogo/mercado/page.tsx`. Textos `market.tab.scouting` e `scouting.*` em `ui.json`. Testar em `apps/web/test/ui/scouting-tab.test.tsx`: fechado com explicação; abrir mostra o custo e as vagas; cancelar libera a vaga.

**Checkpoint**: o técnico observa e acompanha os relatórios.

---

## Phase 4: User Story 2 - Precisão pelo tempo e pelo nível (Priority: P1)

**Goal**: a largura cai com as etapas e com o nível, sem nunca alargar (SC-001 a SC-003).

**Independent Test**: a grade sintética e a carreira longa.

- [X] T013 [P] [US2] Criar `packages/engine/test/scouting/report.test.ts`, com a grade nível 1 a 5 × etapa 0 a 10 e 2 000 jogadores por célula:
  - 100% de contenção e de aninhamento;
  - a largura média cai a cada nível e a cada etapa até a completa;
  - o nível 5 completo fica em ≤ 40% do nível 1 na etapa 1;
  - baixar o nível no meio não alarga;
  - o espalhamento da posição do valor real, como na 038.
- [X] T014 [P] [US2] Em `packages/engine/test/renewal/long-run.ts`, num cenário com o técnico, abrir o departamento no nível 5 e observar 16 jogadores. Conferir em toda rodada e virada que 100% dos relatórios contêm o valor real e ficam dentro do anterior.
- [X] T015 [US2] `scoutReportOf` e `scoutingPanel` em `packages/engine/src/scouting/view.ts`, com a confiança derivada (R4) e `watching`. Mostrar a confiança e "Atualizado na rodada R de AAAA" na aba (T012).

---

## Phase 5: User Story 7 - Nada muda sem olheiros, e nada vaza (Priority: P1)

**Goal**: neutralidade (FR-020, SC-004) e sigilo (FR-019, SC-005).

**Independent Test**: a mesma seed com e sem a feature; as telas desenhadas com valores reais diferentes.

- [X] T016 [P] [US7] Criar `packages/engine/test/career/scouting-neutral.test.ts`, no padrão do `estimate-neutral.test.ts` da 038:
  - 2 temporadas com o departamento fechado, com a feature e com `../../src/scouting/round` e `state` trocados por versões que não fazem nada;
  - comparar mundo, tabelas, mercado, livro-caixa, base, regulador, diretoria e torcida;
  - conferir que a troca valeu (com a feature há relatórios automáticos; sem ela, nenhum).
- [X] T017 [P] [US7] Rodar sem `-u`: `packages/engine/test/match/baseline.test.ts`, `packages/engine/test/career/composition-baseline.test.ts`, `packages/engine/test/career/continental-baseline.test.ts` e `packages/save/test/equivalence.test.ts`. Se algum mudar, corrigir a causa (lançamento com o nível 0 ou sorte compartilhada) em vez de regravar.
- [X] T018 [US7] (fazer por último na fase, depois das telas das US3, US4 e US6) Criar `apps/web/test/ui/scouting-secrecy.test.tsx`: desenhar a aba Observação, a busca com as colunas novas, o `MarketPlayerModal` e o `PlayerDetails` com potencial, temperamento e propensão reais diferentes e os mesmos relatórios. O texto tem de ser idêntico. Depende de T012, T021, T024 e T026.

---

## Phase 6: User Story 3 - Atributos em texto (Priority: P2)

**Goal**: o temperamento e a propensão em três graus depois do tempo mínimo (R4).

**Independent Test**: observar até metade das etapas e ver os graus no relatório.

- [X] T019 [P] [US3] Em `packages/engine/test/scouting/round.test.ts`:
  - antes de `attributeSteps`, sem graus;
  - depois, graus pelos cortes ≤ 33 / 34–66 / ≥ 67, gravados uma vez e coerentes com os valores reais em extremos opostos;
  - o grau nunca é um número de 1 a 100 no relatório.
- [X] T020 [US3] Gravar os graus em `scoutingAfterRound` (`packages/engine/src/scouting/round.ts`) e expô-los em `scoutReportOf`. Textos `scouting.temperament.{1,2,3}`, `scouting.injury.{1,2,3}`, `scouting.notYet` e `scouting.confidence.*` em `ui.json`.
- [X] T021 [US3] Criar `apps/web/src/ui/ScoutReport.tsx` (o bloco "Relatório do olheiro": faixa, graus, confiança e data) e incluí-lo em `apps/web/src/ui/PlayerDetails.tsx`, `apps/web/src/ui/PlayerModal.tsx` e `apps/web/src/ui/market/MarketPlayerModal.tsx`. Testar em `apps/web/test/ui/scouting-tab.test.tsx`.

---

## Phase 7: User Story 5 - Gastar com olheiros (Priority: P2)

**Goal**: mudar o nível com previsão e ver o custo nas finanças.

**Independent Test**: mudar o nível e conferir o livro-caixa, a previsão e o resumo; fechar e ver o custo parar.

- [X] T022 [P] [US5] Em `apps/web/test/ui/scouting-tab.test.tsx`:
  - o diálogo de mudar o nível mostra o custo novo, as vagas novas e quantas observações serão canceladas;
  - fechar cancela todas e mantém os relatórios.
  Em `apps/web/test/ui/finance-tabs.test.tsx`, a categoria "Olheiros" aparece com o departamento aberto.
- [X] T023 [US5] A categoria `finance.category.scouting` nas tabelas e gráficos (`apps/web/src/ui/FinanceTables.tsx`, `apps/web/src/game/finance-series.ts`), e o campo `scouting` na previsão (`packages/engine/src/finance/forecast.ts`, como o campo `academy`). As metas financeiras da diretoria medem o caixa (`financeGoalFor` em `packages/engine/src/board/goals.ts`), então a cobrança já entra nelas sem mudança; um teste em `packages/engine/test/finance/scouting-cost.test.ts` confirma que o caixa usado pela meta inclui o custo. O diálogo de nível (T012) mostra que o custo vale a partir da próxima cobrança.

---

## Phase 8: User Story 4 - Observados no mercado (Priority: P2)

**Goal**: colunas, filtro e ação Observar na busca e no detalhe.

**Independent Test**: filtrar os observados, ordenar pela faixa e observar a partir da busca.

- [X] T024 [US4] Em `apps/web/src/ui/market/MarketTable.tsx`:
  - coluna "Observado" (texto);
  - coluna "Potencial" com `EstimateRange`, ordenável pelo centro e, no empate, pelo limite superior, com quem não tem relatório no fim;
  - ação "Observar" (desabilitada com o motivo; ausente para o próprio elenco).
  Em `apps/web/src/ui/market/MarketFilters.tsx`, o checkbox "Só observados". Também a ação "Observar" no `MarketPlayerModal`.
- [X] T025 [P] [US4] Testar em `apps/web/test/ui/scouting-tab.test.tsx` (ou num `market-scouting.test.tsx` novo):
  - filtrar só os observados e ordenar pela faixa nos dois sentidos;
  - observar pela busca em até duas ações (SC-007);
  - achar os observados com a melhor faixa de uma posição em até três ações: filtrar os observados, escolher a posição e ordenar pela faixa (SC-007);
  - "Observar" desabilitado sem vaga.

---

## Phase 9: User Story 6 - Relatório automático do elenco (Priority: P3)

**Goal**: o elenco do técnico ganha relatório sem vaga, mesmo com o departamento fechado (R5).

**Independent Test**: jogar rodadas e ver o relatório de um jogador do elenco avançar; a cria promovida parte da faixa da promoção.

- [X] T026 [US6] Em `scoutingAfterRound` (`packages/engine/src/scouting/round.ts`), avançar o elenco do técnico nas rodadas da liga dele, com o nível do departamento ou o nível 1 quando fechado.
  - Ponto de partida: o relatório existente; `graduates[id].estimate` (038); ou a faixa inicial.
  - O `PlayerDetails` mostra só o relatório quando ele existe (no lugar da linha "na promoção" da 038).
  Testar em `packages/engine/test/scouting/round.test.ts`: o elenco avança sem vaga com o departamento fechado; a cria parte da faixa da promoção sem alargar; um jogador observado e depois contratado continua o relatório.
- [X] T027 [US6] Virada: `scoutingTurnoverStep` (`id: "scouting-close"`) em `packages/engine/src/scouting/round.ts`, registrado em `DEFAULT_TURNOVER_STEPS` e `TURNOVER_STEP_IDS` (`packages/engine/src/career/turnover.ts`) depois de `academy-close`. Ele:
  - poda os relatórios e as observações de aposentados;
  - aplica o teto de 300 (os mais antigos pela última atualização, fora da observação e do elenco).
  Atualizar as listas de etapas em `test/career/turnover-steps.test.ts`, `test/career/turnover.test.ts`, `test/finance/turnover.test.ts` e `test/career/qualification-step.test.ts`. Testar a poda e o teto em `packages/engine/test/scouting/round.test.ts`.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [X] T028 [P] Troca de clube: em `packages/engine/test/scouting/state.test.ts` e num teste de save (`packages/save/test/board.test.ts`), aceitar uma proposta ou ser demitido fecha o departamento (`clubId` diferente), cancela as observações e mantém os relatórios. O relatório automático passa ao elenco novo. Desempregado: nenhum relatório automático avança, as observações ficam canceladas e os relatórios guardados continuam visíveis no mercado e no detalhe.
- [X] T029 [P] Criar `apps/web/e2e/scouting.spec.ts`:
  - abrir o departamento pelo teclado;
  - observar a partir da busca;
  - jogar rodadas e ver a faixa e "Olheiros" em Finanças;
  - filtrar os observados.
  Incluir a aba Observação em `apps/web/e2e/a11y.spec.ts` e no layout de 768 px (`apps/web/e2e/screens-list.ts`).
- [X] T030 [P] Escala e custo:
  - acrescentar ao `sim:gates` (ou ao `packages/save/test/football-world-scale.test.ts`) um cenário com o nível 5 e 16 observações no mundo padrão;
  - acrescentar a `tools/src/simulate-economy.ts` um cenário com o departamento no nível 5 por 10 temporadas no clube do técnico de menor reputação, com o limite declarado: o custo anual dos olheiros fica em no máximo 6% da receita anual do clube, e o clube não entra em crise só por causa dele (comparado ao mesmo clube com o departamento fechado; Princípio V);
  - rodar `pnpm sim:size` antes e depois e registrar tudo em `research.md` (seção "Medidas").
- [X] T031 [P] Documentação:
  - `docs/guia-do-jogador.md`: olheiros, relatórios, custo, mercado e o elenco próprio;
  - `docs/mod-format.md` e a cópia em `apps/web/public/docs/`: `economy.scouting`;
  - `docs/glossario.md`: olheiro, relatório, confiança;
  - `docs/arquitetura.md`: o módulo `scouting/` e a etapa `scouting-close`.
- [X] T032 Rodar o quickstart inteiro: `pnpm lint`, `pnpm typecheck`, a suíte completa (sem regravar snapshots; com o build e o e2e **fora** de paralelo, para não ter estouros de tempo por carga), `pnpm build:web`, o e2e completo e `pnpm sim:gates`.
- [X] T033 Release no mesmo PR: `package.json` em 1.12.0 e uma nota em `packages/i18n/locales/pt-BR/release-notes.json` com a data de `TZ=America/Sao_Paulo date +%F`. Rodar `pnpm check-release` depois do build.

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → **Foundational (T003–T008)** → histórias.
- **US1 (T009–T012)** depende da fundação.
- **US2 (T013–T015)** depende de T010.
- **US7:** T016 e T017 dependem de T010 e são estendidas depois de T026; T018 depende de T012, T021, T024 e T026.
- **US3 (T019–T021)** depende de T010.
- **US5 (T022–T023)** depende de T007 e T012.
- **US4 (T024–T025)** depende de T011 e T015.
- **US6 (T026–T027)** depende de T010.
- **Polish (T028–T033)** depende de todas.

### Testes antes da implementação

- T003, T004 e T005 antes de T006–T008;
- T009 antes de T010;
- T013 antes de T015;
- T019 antes de T020;
- os testes de T026 antes do código.

### Parallel Opportunities

- T003, T004 e T005.
- T013 e T014.
- US3, US6 e US2 (motor) em paralelo com US1 e US4 (web), depois de T010.
- T028 a T031.

## Parallel Example: Foundational

```text
T003 packages/engine/test/scouting/rules.test.ts
T004 packages/engine/test/scouting/state.test.ts
T005 packages/save/test/migrate-v24.test.ts
```

## Parallel Example: depois de T010

```text
T013 packages/engine/test/scouting/report.test.ts     [US2]
T016 packages/engine/test/career/scouting-neutral.test.ts [US7]
T019 packages/engine/test/scouting/round.test.ts (graus) [US3]
T012 apps/web/src/ui/market/ScoutingTab.tsx           [US1]
```

## Implementation Strategy

### MVP (US1, US2 e US7)

1. Fundação: departamento, custo e save v24.
2. US1: observar e a aba.
3. US2: a grade e a carreira longa.
4. US7: neutralidade e linhas de base intactas.
5. **Parar e validar**: abrir, observar, jogar rodadas, ver o custo e confirmar que, fechado, nada muda.

### Incremental Delivery

1. MVP.
2. US3 e US5: atributos e custo na interface.
3. US4: o mercado.
4. US6: o elenco próprio e a virada.
5. T018 (sigilo em todas as telas) e o acabamento.
6. Release 1.12.0, num PR só.

## Notes

- Nunca regravar as linhas de base nesta feature (decisão do departamento fechado).
- A web nunca lê `hidden`: só `scoutReportOf`.
- Commit por tarefa ou grupo lógico.
