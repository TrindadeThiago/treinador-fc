---

description: "Tarefas da feature 038: potencial estimado e revelações da base"
---

# Tasks: Potencial estimado e revelações da base

**Input**: Design documents from `/specs/038-potencial-estimado-revelacoes/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**:
- **Motor:** os testes vêm antes do código (Princípio IX). A faixa tem testes de propriedade (contém, aninha, largura, espalhamento) e a grade nível × tempo (FR-021, SC-001 a SC-004).
- **Neutralidade (SC-005):** um teste roda a mesma seed com e sem a feature. As linhas de base existentes rodam **sem regravar**.
- **Save:** o save v23 tem migração e fixture (Princípio VI).
- **Web:** testes de componente, a varredura do potencial-sentinela (SC-007) e o e2e da base.

**Organization**:
- US1, US2 e US6 (P1);
- US3 e US4 (P2);
- US5 (P3).

A fundação leva os tipos, as regras de largura, o módulo `estimate.ts`, a faixa em todos os pontos de criação, a etapa `academy-estimates` e o save v23. Todas as histórias dependem de a faixa existir.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem depender de tarefa incompleta)
- **[Story]**: história da spec (US1 a US6)

---

## Phase 1: Setup

- [X] T001 Em `packages/engine/src/renewal/types.ts`, acrescentar os tipos do data-model:
  - `PotentialEstimate { low; high }`;
  - `AcademyPlayer.estimate: PotentialEstimate`;
  - `AcademyGraduate.joinedSeason?`, `estimate?` e `peak?`;
  - `AcademyLegend { playerId; name; position; peak; season }`;
  - `AcademyHall { promoted; best }`;
  - `AcademyState.hall?: Record<string, AcademyHall>`.
  Criar `packages/engine/src/renewal/estimate.ts` com as assinaturas de `contracts/engine-potential-estimate.md` (`ESTIMATE_MIN_WIDTH`, `estimateWidth`, `initialEstimate`, `narrowEstimate`, `withEstimate` e `academyEstimatesStep`), com corpos que lançam "não implementado". Exportar em `packages/engine/src/index.ts`.
- [X] T002 Em `packages/engine/src/renewal/academy-levels.ts`, acrescentar a `AcademyLevelRule` os campos opcionais `estimateWidth?` e `estimateShrink?`, e preencher `DEFAULT_ACADEMY_LEVELS` com a tabela do research R3 (20/2, 18/2, 16/2, 14/3, 12/3). Em `packages/engine/src/model/schemas.ts` (`economy.academy.levels[]`), aceitar os dois campos opcionais: `estimateWidth` de 4 a 60 e `estimateShrink` de 0 a 20. Na validação semântica do mod (`packages/engine/src/validation/`), emitir um aviso quando `estimateWidth` crescer do nível 1 ao 5.

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: faixa sorteada e estreitada (R2), presente em todo `AcademyPlayer` (R4) e guardada no save v23 (R10).

### Testes primeiro

- [X] T003 [P] Criar `packages/engine/test/renewal/estimate.test.ts` com testes de propriedade em milhares de jovens sintéticos (potencial e força variados, incluindo perto de 1 e de 99):
  - `initialEstimate` contém o potencial, tem largura ≤ `W`, `low` ≥ força e fica entre 1 e 99;
  - `narrowEstimate(prev, …)` fica dentro de `prev`, contém o potencial, tem largura ≤ `min(prev, W)` e `low` ≥ força atual, mesmo quando a força passa do `low` anterior;
  - quando a força se aproxima do potencial (por exemplo, `p − força` < 4), a faixa pode ficar mais estreita que `ESTIMATE_MIN_WIDTH`, mas continua com `low = força` ≤ `p` ≤ `high` e dentro da anterior (data-model, invariantes);
  - a mesma chave dá a mesma faixa;
  - a posição relativa `(p − low) / (high − low)` é espalhada: o histograma em 5 baldes fica perto do uniforme (cada balde entre 12% e 28%), sem estar sempre no meio;
  - `estimateWidth` segue a tabela R3, com mínimo 4 e regras do mod quando presentes.
- [X] T004 [P] Criar `packages/save/test/migrate-v23.test.ts` e a fixture `saveV22` em `packages/save/test/fixtures.ts` (e `__fixtures__`, como nas migrações anteriores). Um save v22 abre e:
  - todo jovem da base ganha `estimate` que contém o potencial, com largura pelo nível atual e pelo tempo `season − joinedSeason`;
  - os graduates ganham `peak` = força atual;
  - `academy.hall[clubId].promoted` = os graduates vivos do clube, com `best` ordenado;
  - `news.crias[id] = 7` para cada graduate;
  - a carreira chega à virada seguinte sem erro (SC-008).

### Implementação

- [X] T005 Implementar `packages/engine/src/renewal/estimate.ts` conforme o research R2:
  - `estimateWidth(rule, tenure)` = `max(ESTIMATE_MIN_WIDTH, estimateWidth − estimateShrink × tenure)`, com o padrão quando o campo do mod falta;
  - `initialEstimate`: `low` uniforme entre `[max(1, p − w), min(p, 99 − w)]` (99 = `EVOLUTION_RULES.maxStrength`); depois `low = max(low, força)`;
  - `narrowEstimate`: `w = min(high − low, alvo)`; `low` uniforme entre `[max(prevLow, p − w), min(p, prevHigh − w)]`; depois `low = max(low, força)`;
  - `withEstimate`;
  - a sorte vem só de `createRng(rngKey)`, com a chave `${careerSeed}:estimate:${season}:${playerId}`.
  Fazer a T003 passar.
- [X] T006 Dar faixa em todos os pontos que criam `AcademyPlayer`, usando `withEstimate` com o nível da academia do clube e tempo 0 (e sem tocar no rng já usado por cada ponto):
  - a safra em `packages/engine/src/renewal/youth.ts` (≈ linha 164);
  - a safra de emergência da IA em `packages/engine/src/renewal/turnover.ts` (≈ linha 386);
  - a emergência do técnico em `packages/engine/src/renewal/academy.ts` (≈ linha 531);
  - a base inicial em `seedAcademies` (`packages/engine/src/renewal/academy-levels.ts`, ≈ linha 399).
  Acrescentar casos em `packages/engine/test/renewal/youth.test.ts` e `academy-levels.test.ts`: todo jovem criado tem `estimate` que contém o potencial.
- [X] T007 Implementar `academyEstimatesStep` (`id: "academy-estimates"`) em `packages/engine/src/renewal/estimate.ts`:
  - para cada jovem da base de todos os clubes com `joinedSeason` < a temporada nova, aplicar `narrowEstimate` com o nível atual da academia e o tempo `(finished.number + 1) − joinedSeason`;
  - os recém-chegados ficam como estão.
  Registrar a etapa em `DEFAULT_TURNOVER_STEPS` (`packages/engine/src/career/turnover.ts`), logo depois de `perCountry(completeSquadsStep)` e antes de `ageOutFreeAgentsStep`. Testar em `packages/engine/test/renewal/academy-turnover.test.ts`:
  - depois da virada, a faixa de cada jovem que ficou está dentro da anterior;
  - com a academia rebaixada na virada, a faixa não se alarga;
  - a etapa estreita as faixas de todos os clubes, não só a do técnico: num clube da IA, a faixa de cada jovem tem largura ≤ `W(nível do clube, tempo)` (base para a troca de clube, edge case da spec).
- [X] T008 Save v23 em `packages/save/src/format.ts` (`SAVE_FORMAT_VERSION = 23`, schemas Zod dos campos novos) e `packages/save/src/migrate.ts` (`migrate-v23` conforme data-model "Migração v22 → v23", com a semente `${seed}:estimate-migrate:${playerId}`). Ajustar o schema de `news` para aceitar `crias`. Fazer a T004 passar.

**Checkpoint**: toda base tem faixa, a virada estreita as faixas e os saves antigos migram.

---

## Phase 3: User Story 1 - Ver a faixa de potencial dos jovens (Priority: P1) 🎯 MVP

**Goal**: coluna da faixa na aba Base, com ordenação e filtro por posição.

**Independent Test**: carreira nova → Elenco → Base: cada jovem mostra "low–high", a ordenação e o filtro funcionam e o leitor de tela lê a faixa por extenso.

- [X] T009 [P] [US1] Criar `apps/web/test/ui/academy-tab.test.tsx` (ou ampliar `academy.test.tsx`):
  - a coluna "Potencial" mostra `low–high` com o `aria-label` por extenso;
  - a ordenação pelo valor central, com desempate pelo `high` e pelo nome, funciona nos dois sentidos (`aria-sort`);
  - o filtro de posição mantém a ordenação;
  - a faixa é a mesma depois de recarregar o save;
  - depois de o técnico trocar de clube, a aba mostra a base do clube novo com as faixas dela (largura pelo nível e pelo tempo daquela base), e nenhum jovem da base antiga aparece.
- [X] T010 [US1] Em `apps/web/src/game/academy-view.ts`, expor `estimate` nas linhas da base, sem expor `hidden`. Em `apps/web/src/ui/AcademyTab.tsx`, acrescentar:
  - a coluna "Potencial", ordenável;
  - o `select` de posição ("Todas" e as posições), com o estado na aba;
  - o texto de ajuda `academy.estimate.help`.
  Textos em `packages/i18n/locales/pt-BR/ui.json` (`academy.estimate.*`, `academy.filter.position*`). Fazer a T009 passar.
- [X] T011 [US1] Em `apps/web/src/ui/PlayerDetails.tsx`, mostrar a linha `player.estimate` ("Potencial estimado: low–high") para jovens da base do clube do técnico. Testar em `apps/web/test/ui/academy-tab.test.tsx`.

**Checkpoint**: o técnico vê, ordena e filtra as faixas.

---

## Phase 4: User Story 2 - A estimativa melhora com o tempo e com a academia (Priority: P1)

**Goal**: largura menor com nível maior e com mais tempo, medida (FR-021, SC-001 a SC-004).

**Independent Test**: a grade sintética nível × tempo e a contenção em 30 temporadas.

- [X] T012 [P] [US2] Em `packages/engine/test/renewal/estimate.test.ts`, acrescentar a grade nível (1 a 5) × tempo (0 a 2), com pelo menos 2 000 jovens por célula, simulando chegada e viradas com `narrowEstimate`:
  - a largura média cai a cada nível e a cada virada (SC-003);
  - o nível 5 com tempo 2 fica em ≤ 60% do nível 1 com tempo 0 (SC-002);
  - 100% de contenção e de aninhamento (SC-001, SC-004).
- [X] T013 [P] [US2] Em `packages/engine/test/renewal/long-run.ts` (usado por `long-run-1.test.ts` e `long-run-2.test.ts`), conferir em toda virada que 100% das faixas guardadas contêm o potencial e que cada jovem que ficou tem a faixa dentro da da virada anterior.
- [X] T014 [US2] Em `tools/src/simulate-world.ts`, imprimir por virada a taxa de contenção e a largura média por nível e por tempo na base. Rodar `pnpm sim:world --seasons 30` e registrar o resultado em `specs/038-potencial-estimado-revelacoes/research.md` (seção "Medidas").

**Checkpoint**: a faixa estreita com o nível e o tempo, sempre contendo o valor real.

---

## Phase 5: User Story 6 - A faixa não muda o jogo nem entrega o segredo (Priority: P1)

**Goal**: neutralidade (FR-007, SC-005) e sigilo (FR-009, FR-010, SC-007).

**Independent Test**: a mesma seed com e sem a feature dá a mesma carreira; o potencial-sentinela não aparece em nenhuma tela.

- [X] T015 [P] [US6] Criar `packages/engine/test/career/estimate-neutral.test.ts`. Rodar 3 temporadas da mesma seed com `DEFAULT_TURNOVER_STEPS` e com a lista sem `academy-estimates` e `news-academy`, e com as funções de notícia sem `graduates`. Comparar:
  - mundo (força, clube e contrato de cada jogador);
  - classificações;
  - log do mercado;
  - livro-caixa;
  - base (ids e força), sem `estimate`;
  - regulador.
  Tudo deve ser idêntico.
- [X] T016 [P] [US6] Rodar as linhas de base existentes sem `-u`: `packages/engine/test/match/baseline.test.ts`, `packages/engine/test/career/composition-baseline.test.ts`, `packages/engine/test/career/continental-baseline.test.ts` e `packages/save/test/equivalence.test.ts`. Se alguma mudar, a causa é um ponto de criação que mexeu no rng: corrigir em vez de regravar.
- [X] T017 [P] [US6] Criar `apps/web/test/ui/potential-secrecy.test.tsx`:
  - montar um save com um jovem da base, um promovido e um jogador do elenco com potenciais-sentinela improváveis (por exemplo, 97, 93 e 91) e força bem menor;
  - renderizar a aba Base, o detalhe do jogador, o bloco Base do fim de temporada e o histórico do clube;
  - conferir que os valores-sentinela não aparecem como texto, a não ser dentro de uma faixa `low–high` que os contenha sem ser igual a nenhum dos limites.

**Checkpoint**: a feature é só informação e o potencial real continua oculto.

---

## Phase 6: User Story 3 - A revelação da safra nas manchetes (Priority: P2)

**Goal**: a manchete da revelação da safra do clube e da divisão na rodada 0 (R6).

**Independent Test**: jogar até a virada e ver a manchete da revelação, nos casos clube, divisão e ambos.

- [X] T018 [P] [US3] Criar `packages/engine/test/news/academy-news.test.ts` (parte da revelação):
  - `academyRevelation` escolhe, entre os jovens com `joinedSeason === season` na base ou promovidos que continuam no formador, o de maior força, com desempate pela menor idade e pelo id;
  - um dispensado ou vendido não conta;
  - a primeira virada usa a base inicial (`joinedSeason = 1`);
  - `newsAcademyStep` gera `scope: "club"` e `"division"` quando são jogadores diferentes, uma só manchete `"both"` quando a da divisão é do clube do técnico, só a da divisão quando o clube não tem elegíveis e nada quando o técnico está desempregado;
  - as variáveis não têm potencial nem faixa.
- [X] T019 [US3] Implementar `academyRevelation` e `newsAcademyStep` (`id: "news-academy"`) em `packages/engine/src/news/academy.ts`, seguindo o padrão de `newsRegionalStep` (ids `${next}-0-a${index}`). Acrescentar `academyRevelation` a `HEADLINE_TYPES` em `packages/engine/src/news/types.ts` e a relevância em `packages/engine/src/news/rules.ts`. Registrar a etapa em `DEFAULT_TURNOVER_STEPS` depois de `newsRegionalStep`. Fazer a T018 passar.
- [X] T020 [US3] Em `packages/engine/src/renewal/academy.ts` (`withGraduates`), gravar `joinedSeason` no graduate, para os promovidos contarem na safra. Atualizar todas as chamadas de `withGraduates`.
- [X] T021 [US3] Templates `news.academyRevelation.*`: 3 ou mais variações por `scope` (`club`, `division`, `both`), com gênero e plural, em `packages/i18n/locales/pt-BR/ui.json`. Mostrar no feed via `apps/web/src/game/news-view.ts`. Cobrir no teste de variações (`packages/engine/test/news/variants.test.ts` ou o equivalente da web, que confere que todo tipo tem template).

**Checkpoint**: a virada conta quem foi a revelação.

---

## Phase 7: User Story 4 - Bloco Base no fim de temporada (Priority: P2)

**Goal**: o resumo do fim de temporada com quem chegou, quem subiu e quem saiu (R8).

**Independent Test**: chegar ao fim da temporada e conferir as três listas e o texto "Nenhum".

- [X] T022 [P] [US4] Testar `academySeasonReport` em `packages/engine/test/renewal/academy.test.ts`:
  - "chegaram" vem do aviso da virada (mesmo clube e temporada), e os que ficaram trazem a faixa atual;
  - "subiram" = `promotedThisSeason`;
  - "saíram" = `releasedThisSeason` (motivo `released`) mais os jovens em último ano (motivo `ageOut`);
  - com o aviso de outro clube, "chegaram" vem vazio.
- [X] T023 [US4] Implementar `academySeasonReport` em `packages/engine/src/renewal/academy.ts` e exportar em `packages/engine/src/index.ts`. Fazer a T022 passar.
- [X] T024 [US4] Criar `apps/web/src/ui/season/AcademySeason.tsx`:
  - três listas com títulos e totais no plural;
  - o motivo em texto;
  - a faixa dos que chegaram;
  - "Nenhum" nas listas vazias.
  Incluir o componente em `apps/web/src/app/jogo/fim-de-temporada/page.tsx`, depois de `Moves`. Textos `seasonEnd.academy.*` em `ui.json`. Testar em `apps/web/test/ui/academy-season.test.tsx`.

**Checkpoint**: o fim de temporada tem o bloco Base.

---

## Phase 8: User Story 5 - Crias da base lembradas nas notícias e no histórico (Priority: P3)

**Goal**: estreia, primeiro gol e venda nas manchetes, faixa da promoção e crias no histórico (R5, R7, R9).

**Independent Test**: promover, escalar, marcar e vender uma cria e conferir as manchetes, o detalhe e o histórico do clube.

- [X] T025 [P] [US5] Em `packages/engine/test/renewal/academy.test.ts`, testar `withGraduates` com o clube do técnico:
  - copia `estimate` só quando o formador é o clube do técnico;
  - grava `peak` = força;
  - soma `hall[clubId].promoted`.
  Testar também o `academyCloseStep`:
  - `peak` = máximo e `best` refeito (até 5, ordem por `peak`, temporada e id);
  - um aposentado continua no `best`;
  - `news.crias` é podado com os graduates vivos.
- [X] T026 [P] [US5] Em `packages/engine/test/news/academy-news.test.ts` (parte das crias):
  - estreia e primeiro gol saem uma vez por jogador, só para as crias do clube do técnico jogando pelo formador, em liga, copa, continental e jogos extras;
  - estreia com gol na mesma partida vira uma manchete com `extras`;
  - as crias de outros clubes são marcadas em `crias` sem manchete;
  - a venda de uma cria pelo clube do técnico gera `academySale` (com o valor) e não `bigTransfer`;
  - sem `graduates` no contexto, a saída é idêntica à de hoje.
- [X] T027 [US5] Implementar em `packages/engine/src/renewal/academy.ts`:
  - `withGraduates(academy, entries, season, managerClubId, world)` com `estimate`, `peak` e `hall`;
  - `academyHallOf`.
  Passar o `managerClubId` em todas as chamadas, na promoção do técnico, na emergência e no reequilíbrio da IA (`packages/engine/src/renewal/turnover.ts` e `squads.ts`). Em `packages/engine/src/renewal/turnover.ts` (`academyCloseStep`), atualizar `peak` e `hall.best` antes da poda e podar `news.crias`. Fazer a T025 passar.
- [X] T028 [US5] Implementar as crias nas notícias:
  - `NewsState.crias` e `NewsContext.graduates` em `packages/engine/src/news/types.ts`;
  - os tipos `academyDebut`, `academyFirstGoal` e `academySale` em `HEADLINE_TYPES` e `news/rules.ts`;
  - a detecção pelas `playerLines` em `newsAfterRound`, `newsAfterExtraMatches`, `newsAfterCup` e `newsAfterContinental` (`packages/engine/src/news/round.ts`, com um helper em `news/academy.ts`);
  - a troca de `bigTransfer` por `academySale` em `transferFacts`.
  Passar `graduates` de `renewal.academy` nas chamadas de `packages/engine/src/career/day.ts` e `packages/engine/src/finance/round.ts`. Fazer a T026 passar.
- [X] T029 [US5] Templates `news.academyDebut.*`, `news.academyFirstGoal.*` (com o texto de `extras`) e `news.academySale.*` (3 ou mais variações; `fee` na moeda do clube) em `ui.json`, e a renderização em `apps/web/src/game/news-view.ts`.
- [X] T030 [US5] Em `apps/web/src/ui/PlayerDetails.tsx`, mostrar a linha `player.estimate.promotion` ("Potencial estimado na promoção: low–high") quando `graduateOf(...).estimate` existe, inclusive depois de uma venda. Em `apps/web/src/ui/history/WorldHistory.tsx` (`ClubHistory`), criar o card "Crias da base":
  - o total no plural;
  - as maiores revelações, com nome, posição, força máxima, ano da promoção e clube atual ou "aposentado";
  - "nenhuma cria" quando vazio.
  Textos `player.estimate.promotion` e `history.clubs.academy.*`. Testar em `apps/web/test/ui/history.test.tsx` e `academy-tab.test.tsx`.

**Checkpoint**: as crias viram notícia e memória do clube.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T031 [P] Ampliar `apps/web/e2e/academy.spec.ts`:
  - a coluna da faixa, a ordenação e o filtro pelo teclado (SC-009: filtrar e ordenar em duas ações);
  - promover e ver a faixa da promoção;
  - chegar ao fim de temporada e ver o bloco Base.
  Incluir a aba Base com a coluna nova e o fim de temporada em `apps/web/e2e/a11y.spec.ts` e no layout de 768 px (via `screens-list.ts`).
- [X] T032 [P] Rodar `pnpm sim:size` e os testes de tamanho (`packages/save/test/long-career.test.ts`, `football-world-scale.test.ts`) e medir o tempo da virada no mundo padrão com a etapa nova, contra as metas da 020. Registrar no PR.
- [X] T033 [P] Documentação:
  - `docs/guia-do-jogador.md`: a faixa de potencial, como ela estreita, a revelação da safra, o bloco Base e as crias no histórico;
  - `docs/mod-format.md`: `estimateWidth` e `estimateShrink` em `economy.academy.levels`, com a tabela padrão;
  - `docs/glossario.md`: potencial estimado, revelação da safra, cria da base;
  - `docs/arquitetura.md`: `estimate.ts` e as etapas `academy-estimates` e `news-academy`.
- [X] T034 Rodar o quickstart inteiro: `pnpm lint`, `pnpm typecheck`, a suíte completa (sem regravar snapshots), `pnpm build:web` e o e2e completo. Conferir em prints a aba Base, o bloco Base e o card de crias em 1440 e 768 px, nos dois temas.
- [X] T035 Release no mesmo PR: `package.json` em 1.11.0 e uma nota em `packages/i18n/locales/pt-BR/release-notes.json` com a data de `TZ=America/Sao_Paulo date +%F` (faixa de potencial, revelação da safra, bloco Base, crias nas notícias e no histórico). Rodar `pnpm check-release` depois do build.

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → **Foundational (T003–T008)** → histórias.
- **US1 (T009–T011)** depende da fundação.
- **US2 (T012–T014)** depende da fundação e pode correr junto da US1.
- **US6:** T015 depende de T007 e, para a parte das notícias, de T019 e T028 (pode começar com a etapa `academy-estimates` e ser estendida depois). T016 roda a cada fase. T017 depende de T010, T024 e T030.
- **US3 (T018–T021)** depende da fundação. A T020 também serve à US5.
- **US4 (T022–T024)** depende da fundação.
- **US5 (T025–T030)** depende da T020.
- **Polish (T031–T035)** depende de todas.

### Testes antes da implementação

- T003 e T004 antes de T005–T008;
- T009 antes de T010;
- T018 antes de T019;
- T022 antes de T023;
- T025 e T026 antes de T027 e T028.

### Parallel Opportunities

- T003 e T004 (arquivos diferentes).
- US1 (web) em paralelo com US2 (medidas no motor).
- US3 e US4 em paralelo, depois da fundação.
- T025 e T026; T031, T032 e T033.

## Parallel Example: Foundational

```text
T003 packages/engine/test/renewal/estimate.test.ts
T004 packages/save/test/migrate-v23.test.ts
```

## Parallel Example: depois da fundação

```text
T009 apps/web/test/ui/academy-tab.test.tsx          [US1]
T012 packages/engine/test/renewal/estimate.test.ts  [US2]
T018 packages/engine/test/news/academy-news.test.ts [US3]
T022 packages/engine/test/renewal/academy.test.ts   [US4]
```

## Implementation Strategy

### MVP (US1, US2 e US6)

1. Fundação: tipos, `estimate.ts`, a faixa na criação, a etapa da virada e o save v23.
2. US1: a coluna, a ordenação e o filtro.
3. US2: a grade e a contenção medidas.
4. US6: a neutralidade e as linhas de base intactas.
5. **Parar e validar**: carreira nova, ver as faixas, passar a virada e conferir que estreitaram e que as linhas de base não mudaram.

### Incremental Delivery

1. MVP.
2. US3 e US4: a revelação e o bloco Base.
3. US5: as crias nas notícias e no histórico.
4. T017 (sigilo em todas as telas novas).
5. Polish e release 1.11.0, num PR só.

## Notes

- Nunca regravar as linhas de base nesta feature. Se uma mudar, há um vazamento de rng (R10).
- O potencial real só é lido no motor (sorteio da faixa e IA). A web não lê `hidden`.
- Commit por tarefa ou grupo lógico.
