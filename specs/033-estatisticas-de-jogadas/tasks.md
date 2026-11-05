---

description: "Tarefas da feature 033: estatísticas de jogadas"
---

# Tasks: Estatísticas de jogadas (passes, passes decisivos, desarmes e interceptações)

**Input**: Design documents from `/specs/033-estatisticas-de-jogadas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: os testes de motor são obrigatórios e vêm antes da implementação (Princípio IX). As faixas de jogadas têm teste de simulação longa (Princípio V). O save v19 tem migração e teste com fixture (Princípio VI). Na interface, há testes de componente e o e2e de layout.

**Organization**: tarefas agrupadas por história da spec (US1 P1, US2 P2, US3 P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem depender de tarefa incompleta)
- **[Story]**: história da spec (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: preparar o terreno sem mudar comportamento.

- [X] T001 Mover `expNegative` e `poisson` de `packages/engine/src/match/summary.ts` para o novo `packages/engine/src/match/poisson.ts` (exportados, com o mesmo comentário do Princípio II) e importar de lá em `summary.ts`; rodar `packages/engine/test/match/summary-equivalence.test.ts` e `packages/engine/test/match/summary.test.ts` e confirmar que nada mudou (research R3)

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: tipos, geração no motor e a prova de que nenhum resultado muda.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes primeiro

- [X] T002 [P] Escrever `packages/engine/test/match/plays-isolation.test.ts` (FR-006, FR-007, research R5). Para 200 partidas (mesmo gerador de entradas de `test/match/baseline.test.ts`), o `MatchResult` com jogadas, sem o campo `plays` das linhas, é igual ao de antes. Comparar placar, eventos, `stats`, `decision` e as demais linhas contra uma simulação em que `playMinutePlays` é trocado por uma função vazia com `vi.mock`. Também conferir que `pressure` é idêntica com e sem jogadas. O teste deve falhar até T006.
- [X] T003 [P] Escrever `packages/engine/test/match/plays.test.ts` (FR-001 a FR-005, FR-008, FR-009, SC-001, contrato `engine-plays.md`). Casos:
  - todo jogador que entrou em campo numa partida completa tem `plays`;
  - `passesCompleted ≤ passes`, `tacklesWon ≤ tackles` e `keyPasses ≥ assists`;
  - Σ `keyPasses` do time ≤ finalizações do time;
  - Σ interceptações de um time ≤ passes errados do outro;
  - ao vivo (`advanceMatch` de 1 em 1 minuto) igual a direto (`simulateMatch`), e igual depois de `JSON.parse(JSON.stringify(state))` no meio da partida;
  - quem entra por substituição só acumula a partir da entrada, e quem é expulso para no minuto da expulsão (use os helpers de injeção de `test/match/realism/harness.ts`);
  - a prorrogação acumula e a disputa de pênaltis não;
  - `summarizeMatch` não produz `plays`.

### Implementação

- [X] T004 Acrescentar os tipos `PlayStats`, `PlayTuple` e `PlayTotals` em `packages/engine/src/match/plays.ts`, e `plays?: PlayStats` em `PlayerMatchState` (`packages/engine/src/match/types.ts`), conforme `data-model.md`.
- [X] T005 Acrescentar `PLAYS_TUNING` em `packages/engine/src/match/tuning.ts` (research R2), com um comentário por constante:
  - taxa de passes por minuto e de desarmes por minuto;
  - pesos por posição da vaga para passe, desarme, interceptação e passe decisivo;
  - aproveitamento base e ajuste por posição;
  - inclinação por força efetiva;
  - chance de um passe errado virar interceptação;
  - chance de passe decisivo sem assistência, por tipo de finalização.

  Valores iniciais: os do R2, calibrados depois em T019.
- [X] T006 Implementar `playMinutePlays(state, context, clock, homeShare, eventsBefore)` em `packages/engine/src/match/plays.ts` (research R1 e R2):
  - gerador `minuteRng(context.root, clock, "plays")`;
  - jogadores de `fieldPlayers(state, side, context)`, na ordem das vagas;
  - força efetiva = força já com cansaço × `adequacy`;
  - Poisson de `match/poisson.ts`;
  - passes decisivos a partir dos eventos `shot` emitidos neste minuto (`state.events.slice(eventsBefore)`);
  - cria `plays` zerado no `PlayerMatchState` quando falta.

  Chamar no fim de `playMinute` em `packages/engine/src/match/minute.ts`, guardando `state.events.length` no início do minuto. Não mexer em nenhum sorteio existente.
- [X] T007 Garantir que `cloneState` (`packages/engine/src/match/engine.ts`) e `cloneTeam` copiem `plays` de cada jogador, para que o estado antigo não seja alterado. Acrescentar o caso em `packages/engine/test/match/plays.test.ts` (o estado antes de `advanceMatch` continua com as contagens antigas).
- [X] T008 Exportar `PlayStats`, `PlayTuple`, `PlayTotals`, `playTuple`, `playStatsOf`, `playTotals`, `livePlayTotals` e `PLAY_REALISM_LIMITS` (este em T018) em `packages/engine/src/index.ts`. Implementar em `packages/engine/src/match/plays.ts` as funções `playTuple`, `playStatsOf`, `playTotals(lines, side)` e `livePlayTotals(state, side)` do contrato `contracts/engine-plays.md`. Rodar T002 e T003 até ficarem verdes, junto com `test/match/baseline.test.ts`, `test/career/composition-baseline.test.ts`, `test/career/continental-baseline.test.ts`, `test/career/locale-determinism.test.ts` e `test/match/performance.test.ts`, sem regravar nada.

**Checkpoint**: o motor gera as jogadas, prova que nada mais mudou, e o desempenho fica no orçamento.

---

## Phase 3: User Story 1 - Ver o que cada jogador fez na partida (Priority: P1) 🎯 MVP

**Goal**: as contagens por jogador no registro, no save e no resumo da partida.

**Independent Test**: jogar uma partida (ao vivo ou direto), abrir o resumo e conferir as quatro estatísticas de cada jogador que entrou em campo, nos dois times. Num save antigo, o resumo diz que não há jogadas.

### Testes primeiro

- [X] T009 [P] [US1] Em `packages/engine/test/season/record.test.ts` (criar se não existir), testar que `toMatchRecord` grava `plays` como tupla (`playTuple`) em cada linha de partida completa, que o registro resumido (`toSummaryRecord`) não tem `plays`, e que `playerLines` preserva `plays`.
- [X] T010 [P] [US1] Criar `packages/save/test/migrate-v19.test.ts` (FR-012, FR-014, SC-005), com o fixture `saveV18(step)` em `packages/save/test/fixtures.ts`, no mesmo padrão de `saveV17`. Casos:
  - v18 abre como v19 e nenhuma partida antiga tem `plays`;
  - a partida jogada depois da migração tem `plays`;
  - um save com `plays` de tamanho errado, valor negativo, não inteiro, certos > tentados ou desarmes certos > tentados é rejeitado, com o caminho do campo na mensagem;
  - exportar e importar preserva as tuplas.

  Ajustar `packages/save/test/migrate-v18.test.ts` para continuar verde com `SAVE_FORMAT_VERSION` = 19.
- [X] T011 [P] [US1] Criar `apps/web/test/ui/plays-table.test.tsx` (contrato `plays-screens.md`). Casos:
  - o resumo de uma partida completa mostra duas tabelas (mandante e visitante) com legenda, cabeçalhos e uma linha por jogador que entrou em campo, na ordem de entrada, mais a linha de total igual a `playTotals`;
  - o aproveitamento aparece em percentual;
  - quem não entrou não aparece;
  - um registro sem `plays` mostra o texto de "sem jogadas" e nenhum zero.

### Implementação

- [X] T012 [US1] Acrescentar `plays?: PlayTuple` em `PlayerLine` (`packages/engine/src/season/types.ts`) e gravar a tupla em `toMatchRecord` (`packages/engine/src/season/record.ts`) quando o `PlayerMatchState` tem `plays`. `playerLines` e `toSummaryRecord` não mudam de regra.
- [X] T013 [US1] Subir `SAVE_FORMAT_VERSION` para 19 em `packages/save/src/format.ts` e acrescentar a migração `addPlays` (v18 → v19, só a versão, com comentário no padrão das outras) em `packages/save/src/migrate.ts`. Acrescentar também a validação dos `plays` dos registros de `league`, `competitions` e do histórico guardado (`playTupleSchema`: 6 inteiros ≥ 0, `[1] ≤ [0]` e `[4] ≤ [3]`), olhando só `players[*].plays`, sem validar o registro inteiro (research R6).
- [X] T014 [US1] Criar `apps/web/src/ui/PlaysTable.tsx` e `PlaysTable.module.css`. Uma tabela por time: legenda, cabeçalhos, linhas por jogador e total. O quadro rola na horizontal dentro de si (`overflow-x: auto` num invólucro) e a página não. Só tokens de cor, espaçamento e fonte (`test/ui/style-audit.test.ts`).
- [X] T015 [US1] Usar `PlaysTable` em `apps/web/src/ui/MatchSummary.tsx`, numa seção "Jogadas", com os nomes dos jogadores do `save.bank` e a ordem de entrada a partir de `starters`/substituições do registro. Mostrar o texto de "sem jogadas" quando `playTotals` dos dois lados é `undefined`.
- [X] T016 [US1] Acrescentar em `packages/i18n/locales/pt-BR/ui.json` os textos do contrato `plays-screens.md`: título da seção, legendas das tabelas, cabeçalhos, linha de total, aproveitamento em percentual e o texto de "sem jogadas".

**Checkpoint**: US1 completa. O resumo mostra as jogadas e o save v19 abre os antigos.

---

## Phase 4: User Story 3 - Números que se parecem com futebol (Priority: P2)

**Goal**: faixas de realismo declaradas e verificadas; constantes calibradas.

**Independent Test**: `pnpm vitest run packages/engine/test/match/realism/plays.test.ts` e `pnpm sim:matches` com o bloco de jogadas em ✓.

> Vem antes da US2 porque calibra as constantes que a US2 mostra ao vivo. As duas são P2.

- [ ] T017 [P] [US3] Escrever `packages/engine/test/match/realism/plays.test.ts` (FR-019, FR-020, SC-003, SC-004):
  - amostra de liga com `runLeagueSample` (estender o acumulador ou somar a partir dos `MatchResult`): médias por time dentro de `PLAY_REALISM_LIMITS`;
  - perfis por posição da vaga, por minuto jogado: (desarmes + interceptações) de ZAG e VOL ≥ 1,5 × os de MEI e ATA; passes e decisivos de MEI ≥ 1,3 × os de ZAG;
  - nos jogos com diferença de posse ≥ 10 pontos, o time com mais posse passa mais em pelo menos 80%;
  - na mesma vaga, um elenco com força +10 (`withStrengthDelta`) tem aproveitamento de passe maior.
- [ ] T018 [US3] Declarar `PLAY_REALISM_LIMITS` em `packages/engine/src/match/limits.ts`, conforme `data-model.md`, com o comentário de que afrouxar exige justificativa.
- [ ] T019 [US3] Calibrar `PLAYS_TUNING` (`packages/engine/src/match/tuning.ts`) até T017 passar, com as médias perto do meio de cada faixa. Registrar os valores medidos num comentário curto ao lado das constantes. Se uma faixa da spec não for alcançável sem distorcer as outras, ajustar a faixa com justificativa na mesma alteração (Princípio V e Assumption 1 da spec).
- [ ] T020 [US3] Acrescentar um bloco "jogadas" a `tools/src/simulate-matches.ts`, com as médias por time e os perfis por posição contra `PLAY_REALISM_LIMITS`, no mesmo formato ✓/✗ das métricas atuais.

**Checkpoint**: números com cara de futebol e verificados.

---

## Phase 5: User Story 2 - Acompanhar o jogo do time ao vivo (Priority: P2)

**Goal**: totais dos dois times nas estatísticas ao vivo.

**Independent Test**: numa rodada ao vivo, os totais aparecem e só crescem; no fim, batem com a soma das linhas do resumo.

- [ ] T021 [P] [US2] Em `apps/web/test/ui/live-plays.test.tsx`, testar que `LiveStats` mostra passes certos/tentados, aproveitamento, desarmes certos e interceptações dos dois lados, que os números não diminuem ao avançar a partida (`advance` de `test/helpers/live-round.ts`) e que, no fim, são iguais aos totais do resumo (`playTotals` do registro).
- [ ] T022 [US2] Acrescentar as quatro linhas a `apps/web/src/ui/LiveStats.tsx`, a partir de `livePlayTotals(match.state, side)`. Estender `apps/web/src/ui/StatsTable.tsx` para aceitar linhas extras já formatadas (rótulo e valor de cada lado), sem mudar as linhas atuais.
- [ ] T023 [US2] Acrescentar os rótulos das quatro linhas em `packages/i18n/locales/pt-BR/ui.json`.

**Checkpoint**: as três histórias funcionam.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T024 Rodar os testes de escala do save (`packages/save/test/football-world-scale.test.ts`, `continental-scale.test.ts`, `regional-scale.test.ts`) e conferir os limites de `SCALE_LIMITS` (SC-006, SC-007). Se algum passar do limite, reduzir antes de pensar em mudar o limite: por exemplo, não gravar `plays` de quem jogou menos de um minuto (FR-013).
- [ ] T025 [P] Atualizar o documento de formato do save (`apps/web/public/docs` ou `docs/`, onde estiver o formato do save) com a tupla `plays` e a versão 19, se o formato estiver documentado lá.
- [ ] T026 Rodar o quickstart inteiro (`specs/033-estatisticas-de-jogadas/quickstart.md`): `pnpm lint`, `pnpm typecheck`, a suíte completa, `pnpm build:web` e `pnpm test:e2e` (inclui o layout em 768 px e a acessibilidade nos dois temas). Conferir em prints o resumo e as estatísticas ao vivo, em 1440 e 390 px.
- [ ] T027 Bump de release no mesmo PR: `package.json` em 1.6.0 e uma entrada nova em `packages/i18n/locales/pt-BR/release-notes.json`, com a data de hoje no horário de Brasília (`TZ=America/Sao_Paulo date +%F`). O PR inclui a correção das datas das notas que já está na branch de origem.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)** → **Foundational (T002–T008)** → histórias.
- **US1 (T009–T016)** depende só da Foundational.
- **US3 (T017–T020)** depende da Foundational. Pode correr em paralelo com a US1, mas vem antes da US2 porque calibra as constantes.
- **US2 (T021–T023)** depende da Foundational e, para mostrar números calibrados, da US3.
- **Polish (T024–T027)** depende de todas.

### Within Each Phase

- Testes antes da implementação: T002 e T003 antes de T004–T008; T009–T011 antes de T012–T016; T017 antes de T018–T019; T021 antes de T022.
- T006 depende de T004 e T005. T008 fecha a fase.
- T013 depende de T012 (tipo da linha). T015 depende de T014 e T016.

### Parallel Opportunities

- T002 e T003 (arquivos de teste diferentes).
- T009, T010 e T011 (motor, save e web).
- US1 e US3 em paralelo depois da Foundational.
- T025 em paralelo com T024.

## Parallel Example: User Story 1

```text
T009 packages/engine/test/season/record.test.ts
T010 packages/save/test/migrate-v19.test.ts
T011 apps/web/test/ui/plays-table.test.tsx
```

## Implementation Strategy

### MVP First (User Story 1)

1. T001 → T008: o motor gera as jogadas sem mudar nada, com as linhas de base verdes.
2. T009 → T016: registro, save v19 e resumo.
3. **Parar e validar**: jogar uma partida e abrir o resumo; abrir um save v18.

### Incremental Delivery

1. MVP (US1).
2. US3: calibragem e faixas, para os números ficarem críveis antes de ir ao ar.
3. US2: totais ao vivo.
4. Polish: escala do save, quickstart e release 1.6.0, tudo num PR só, como o fluxo do projeto pede.

## Notes

- Nenhuma linha de base é regravada. Se alguma falhar, é bug na geração (sorteio fora do fluxo `"plays"` ou mudança de ordem), não um motivo para regravar.
- Sem eventos novos de partida: as jogadas não entram em `state.events`.
- Commit por tarefa ou grupo lógico, sem push até o PR.
