---

description: "Tarefas da feature 034: nota do jogador por partida"
---

# Tasks: Nota do jogador por partida

**Input**: Design documents from `/specs/034-nota-do-jogador/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: os testes de motor são obrigatórios e vêm antes da implementação (Princípio IX). As faixas das notas têm teste de simulação longa (Princípio V). O save v20 tem migração e teste com fixture (Princípio VI). Na interface, há testes de componente e o e2e de layout.

**Organization**: tarefas agrupadas pelas histórias da spec: US1 (P1), US2, US3 e US4 (P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem depender de tarefa incompleta)
- **[Story]**: história da spec (US1 a US4)

---

## Phase 1: Setup

- [X] T001 Criar o esqueleto do módulo `packages/engine/src/rating/`: `index.ts`, `input.ts`, `rate.ts`, `tuning.ts` e `limits.ts`, com tipos e funções vazias que lançam "não implementado" (contrato `contracts/engine-rating.md`). No teste de fronteira (`packages/engine/test/architecture.test.ts`), acrescentar um caso: nenhum arquivo de `packages/engine/src` fora de `rating/` importa `rating/`, exceto `src/index.ts` (contrato `engine-rating.md`, garantia 4).

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: os três dados novos das jogadas (finalizações, defesas e vaga), o save v20 e o cálculo das entradas da nota.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes primeiro

- [X] T002 [P] Em `packages/engine/test/match/plays.test.ts`, acrescentar (research R1):
  - `shots` de cada jogador = número de eventos `shot` dele;
  - `saves` do goleiro = eventos `shot` do adversário com `outcome: "saved"` e `goalkeeperId` dele;
  - `playTuple` tem 9 inteiros e o 9º é o índice em `POSITIONS` da vaga com mais minutos (testar com uma troca de posição no meio da partida pelo `applyChange` de formação);
  - `playStatsOf` aceita tuplas de 6 e de 9.

  `test/match/plays-isolation.test.ts` deve continuar verde.
- [X] T003 [P] Criar `packages/save/test/migrate-v20.test.ts`, com a fixture `saveV19(step)` em `packages/save/test/fixtures.ts`: a carreira atual com as tuplas de `plays` cortadas para os 6 primeiros. Casos:
  - v19 abre como v20, igual ao original;
  - tuplas de 6 continuam válidas, e partidas novas gravam tuplas de 9;
  - tupla de 9 com `position` fora de 0–5 é rejeitada, assim como tuplas de 7 ou 8 inteiros.

  Ajustar os testes de migração antigos (`formatVersion).toBe(19)` → 20) e a expectativa de tamanho 6 em `migrate-v19.test.ts`.
- [X] T004 [P] Criar `packages/engine/test/rating/input.test.ts` (research R5):
  - gols sofridos com o jogador em campo, a partir dos eventos em ordem de `seq` (titular que sai antes de um gol não responde por ele; reserva que entra responde só pelos seguintes; expulso deixa de responder);
  - minutos;
  - resultado do ponto de vista de cada lado;
  - pênaltis cometidos (`penalty_awarded.foulerId`);
  - as entradas montadas do registro (`toMatchRecord`) e do estado final da mesma partida são iguais.

### Implementação

- [X] T005 Em `packages/engine/src/match/plays.ts`, acrescentar a `PlayStats` os campos `shots`, `saves` e `slotMinutes` (data-model):
  - `shots` e `saves` saem dos eventos `shot` do minuto, no mesmo laço dos passes decisivos;
  - `slotMinutes` soma 1 na posição da vaga de cada jogador em campo, a cada minuto, sem sorteio;
  - `playTuple` devolve 9 inteiros (`position` = índice da posição com mais minutos; em empate, a primeira registrada);
  - `playStatsOf` aceita 6 ou 9 inteiros (sem os três, `shots` = 0, `saves` = 0 e posição ausente);
  - `emptyPlays` e `cloneTeam` (`packages/engine/src/match/engine.ts`) copiam `slotMinutes`.

  Atualizar `PlayTuple` para `readonly number[]` com comprimento documentado, e `playTotals` para somar também `shots` e `saves`.
- [X] T006 Subir `SAVE_FORMAT_VERSION` para 20 (`packages/save/src/format.ts`). Acrescentar a migração `addPlayExtras` (v19 → v20, só a versão) e estender `validPlays` (`packages/save/src/migrate.ts`) para 6 ou 9 inteiros, com `[8]` entre 0 e 5.
- [X] T007 Implementar `ratingInputs(record, bank)` e `liveRatingInputs(state, players)` em `packages/engine/src/rating/input.ts` (data-model `RatingInput`, research R5 e R6). Para tuplas de 6, a posição vem da natural do jogador, e as defesas do goleiro de `stats` do adversário (finalizações no alvo − gols), atribuídas ao goleiro com mais minutos. Rodar T002–T004 até ficarem verdes, junto com as linhas de base e `test/match/performance.test.ts`, sem regravar nada.

**Checkpoint**: os dados existem, o save v20 abre os antigos e as entradas da nota batem entre ao vivo e registro.

---

## Phase 3: User Story 1 - Saber quem jogou bem na partida (Priority: P1) 🎯 MVP

**Goal**: nota de cada jogador e melhor em campo no resumo da partida, completa ou simplificada.

**Independent Test**: jogar uma partida, abrir o resumo e conferir notas de 0 a 10 com uma casa e o melhor em campo; numa partida sem jogadas, as notas simplificadas, com o aviso.

### Testes primeiro

- [X] T008 [P] [US1] Criar `packages/engine/test/rating/rate.test.ts` (FR-001 a FR-006, SC-001):
  - nota sempre entre 0 e 10 com uma casa;
  - sem nota abaixo de `minMinutes`;
  - com os mesmos números, mais minutos afasta a nota de 6,0 (encolhimento);
  - um gol a mais sobe a nota, e um vermelho a mais desce;
  - mais gols sofridos descem a nota do goleiro mais que a do atacante;
  - o pênalti cometido desce a nota;
  - a lesão não muda a nota;
  - o melhor em campo é o de maior nota, com o desempate fixo (gols, assistências, vencedor e id), independente da ordem das linhas;
  - a linha sem `plays` dá nota `"simplified"`, e as tuplas de 6 e de 9 dão `"full"`.
- [X] T009 [P] [US1] Criar `apps/web/test/ui/match-ratings.test.tsx` (contrato `rating-screens.md`):
  - o resumo de uma partida completa mostra a coluna Nota com o valor de `matchRatings` para cada jogador, "sem nota" para quem ficou abaixo do mínimo e o destaque do melhor em campo com nome, time e nota;
  - num registro sem `plays`, mostra a tabela simplificada (Jogador · Minutos · Nota) e o aviso de notas simplificadas.

### Implementação

- [X] T010 [US1] Implementar em `packages/engine/src/rating/rate.ts` (research R3 e R4):
  - a fórmula completa e a simplificada;
  - o arredondamento determinístico para uma casa (em inteiros);
  - `matchRatings(record, bank)`, com o melhor em campo.

  Acrescentar `RATING_TUNING` em `packages/engine/src/rating/tuning.ts`, com valores iniciais e um comentário por constante. Exportar em `packages/engine/src/index.ts` `matchRatings`, `liveRatings`, `seasonRatings`, os tipos e `RATING_TUNING`.
- [X] T011 [US1] Criar `apps/web/src/ui/RatingValue.tsx` e `RatingValue.module.css`: a nota formatada com `formatNumber` e uma casa, com o tom (bom ≥ 7,0, médio, ruim < 5,5), ou "sem nota". Só tokens de cor (`test/ui/style-audit.test.ts`).
- [X] T012 [US1] Em `apps/web/src/ui/PlaysTable.tsx`, acrescentar a coluna Nota (`RatingValue`); a linha de total fica sem nota. Em `apps/web/src/ui/MatchSummary.tsx`, mostrar o destaque "Melhor em campo" acima das tabelas e, em partida sem jogadas, uma tabela simplificada por time (Jogador · Minutos · Nota) com o aviso de notas simplificadas, no lugar do texto de "sem jogadas".
- [X] T013 [US1] Acrescentar os textos em `packages/i18n/locales/pt-BR/ui.json`: título e frase do melhor em campo, coluna Nota, "sem nota", minutos e aviso de notas simplificadas.

**Checkpoint**: US1 completa. O resumo mostra as notas e o melhor em campo.

---

## Phase 4: User Story 4 - Notas que fazem sentido (Priority: P2)

**Goal**: faixas declaradas e constantes calibradas.

**Independent Test**: `pnpm vitest run packages/engine/test/rating/realism.test.ts` e `pnpm sim:matches` com o bloco de notas em ✓.

> Vem antes da US2 e da US3 porque calibra as constantes que as duas mostram.

- [X] T014 [P] [US4] Criar `packages/engine/test/rating/realism.test.ts` (FR-016, SC-003 a SC-005), com uma amostra de liga de 3.000 partidas completas (mesmo gerador de `test/match/realism/plays.test.ts`), passando cada resultado por `toMatchRecord` e `matchRatings`. Conferir:
  - média geral, parte abaixo de 4,0 e acima de 9,0;
  - desvio de cada posição da vaga em relação à média geral;
  - quem marcou contra quem não marcou;
  - vencedor contra perdedor;
  - parte das partidas com vencedor em que o melhor em campo é do time vencedor;
  - nas mesmas partidas, sem `plays` (simplificada), média a no máximo 0,3 da completa.
- [X] T015 [US4] Declarar `RATING_REALISM_LIMITS` em `packages/engine/src/rating/limits.ts`, conforme research R8, com o comentário de que afrouxar exige justificativa, e exportar em `packages/engine/src/index.ts`.
- [X] T016 [US4] Calibrar `RATING_TUNING`, incluindo os `offset` e `simplifiedOffset` por posição, até T014 passar com as médias perto do meio das faixas. Registrar os valores medidos num comentário junto das constantes. Uma faixa inalcançável sem distorcer as outras se ajusta com justificativa (Princípio V).
- [X] T017 [US4] Acrescentar o bloco "notas" em `tools/src/simulate-matches.ts`, com as médias e as faixas de `RATING_REALISM_LIMITS` no formato ✓/✗.

**Checkpoint**: notas com cara de jornal, verificadas.

---

## Phase 5: User Story 2 - Acompanhar as notas durante o jogo (Priority: P2)

**Goal**: nota parcial no painel Meu time.

**Independent Test**: pausar no meio do jogo e ver as notas parciais; no fim, elas são iguais às do resumo.

- [ ] T018 [P] [US2] Em `packages/engine/test/rating/live.test.ts`, testar (SC-006):
  - `liveRatings(estadoFinal)` igual a `matchRatings(toMatchRecord(resultado))` em 50 partidas;
  - a nota parcial sobe depois de um gol do jogador e desce depois de um vermelho, numa partida avançada minuto a minuto.
- [ ] T019 [P] [US2] Em `apps/web/test/ui/live-ratings.test.tsx`, testar que o painel Meu time (`SubstitutionPanel`) mostra a nota parcial de `liveRatings` (ou "sem nota") nas listas "Em campo" e "Já saíram".
- [ ] T020 [US2] Implementar `liveRatings(state, players)` em `packages/engine/src/rating/rate.ts`, a partir de `liveRatingInputs`, e mostrar a nota (`RatingValue`) em cada linha de "Em campo" e "Já saíram" de `apps/web/src/ui/SubstitutionPanel.tsx`.
- [ ] T021 [US2] Acrescentar o rótulo da coluna de nota parcial em `packages/i18n/locales/pt-BR/ui.json`.

---

## Phase 6: User Story 3 - Ver a média da temporada (Priority: P2)

**Goal**: média, partidas com nota e simplificadas no elenco e no detalhe do jogador.

**Independent Test**: depois de algumas rodadas, ver a média no elenco, ordenar por ela e ver a mesma média no detalhe.

- [ ] T022 [P] [US3] Em `packages/engine/test/rating/season.test.ts`, testar `seasonRatings(seasons, clubId, bank)`:
  - média de uma casa, partidas com nota e simplificadas, de todas as competições da temporada atual;
  - só os registros do clube;
  - quem não tem nota fica de fora;
  - igual à média calculada à mão com `matchRatings` das mesmas partidas.
- [ ] T023 [P] [US3] Em `apps/web/test/ui/squad-ratings.test.tsx`, testar:
  - a coluna Nota do elenco mostra "média (partidas)" ou "sem nota";
  - ordenar pela coluna põe "sem nota" por último nos dois sentidos;
  - o detalhe do jogador (`PlayerStats`) mostra a mesma média, as partidas e, quando houver, as simplificadas.
- [ ] T024 [US3] Implementar `seasonRatings` em `packages/engine/src/rating/index.ts` (research R7). Criar o seletor `clubSeasonRatings(save, clubId)` em `apps/web/src/game/selectors.ts`, usando todas as temporadas de `seasonStateOf(save)` (liga e competições).
- [ ] T025 [US3] Acrescentar a coluna Nota em `apps/web/src/app/jogo/elenco/page.tsx` (`DataTable`). Se o `DataTable` (`apps/web/src/ui/DataTable.tsx`) não puder pôr os valores ausentes por último nos dois sentidos, estendê-lo com uma opção `missingLast`. Em `apps/web/src/ui/PlayerDetails.tsx` (`PlayerStats`), acrescentar as linhas de nota média, partidas com nota e simplificadas.
- [ ] T026 [US3] Acrescentar os textos do elenco e do detalhe em `packages/i18n/locales/pt-BR/ui.json`.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T027 Medir o tamanho do save com a tupla de 9: `packages/save/test/long-career.test.ts` (teto de 5,5 MB) e `football-world-scale.test.ts` (`SCALE_LIMITS`). Registrar no PR os valores antes e depois.
- [ ] T028 Rodar o quickstart inteiro (`specs/034-nota-do-jogador/quickstart.md`): `pnpm lint`, `pnpm typecheck`, suíte completa, `pnpm build:web` e `pnpm test:e2e` (layout em 768 px e acessibilidade nos dois temas). Conferir em prints o resumo, o painel ao vivo, o elenco e o detalhe, em 1440 e 768 px.
- [ ] T029 Bump de release no mesmo PR: `package.json` em 1.7.0 e uma entrada nova em `packages/i18n/locales/pt-BR/release-notes.json`, com a data de `TZ=America/Sao_Paulo date +%F`.

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T007)** → histórias.
- **US1 (T008–T013)** depende da Foundational.
- **US4 (T014–T017)** depende da US1, porque precisa de `matchRatings`.
- **US2 (T018–T021)** e **US3 (T022–T026)** dependem da US1, e para mostrar números calibrados também da US4. As duas podem correr em paralelo entre si.
- **Polish (T027–T029)** depende de todas.

### Within Each Phase

Testes antes da implementação:
- T002–T004 antes de T005–T007;
- T008 e T009 antes de T010–T013;
- T014 antes de T015 e T016;
- T018 e T019 antes de T020;
- T022 e T023 antes de T024 e T025.

### Parallel Opportunities

- T002, T003 e T004 (motor, save e motor/rating, em arquivos diferentes).
- T008 e T009; T018 e T019; T022 e T023.
- As fases US2 e US3 entre si.

## Parallel Example: Foundational

```text
T002 packages/engine/test/match/plays.test.ts
T003 packages/save/test/migrate-v20.test.ts
T004 packages/engine/test/rating/input.test.ts
```

## Implementation Strategy

### MVP First (User Story 1)

1. T001–T007: os dados, o save v20 e as entradas da nota.
2. T008–T013: notas e melhor em campo no resumo.
3. **Parar e validar**: jogar uma partida e abrir o resumo; abrir um save v19.

### Incremental Delivery

1. MVP (US1).
2. US4: calibragem, antes de mostrar as notas em mais lugares.
3. US2 e US3, em paralelo: ao vivo e médias.
4. Polish e release 1.7.0, tudo num PR só.

## Notes

- Nenhuma linha de base é regravada. As contagens novas (finalizações, defesas e vaga) não sorteiam nada.
- A nota não é guardada no save; só os três inteiros da tupla.
- Commit por tarefa ou grupo lógico.
