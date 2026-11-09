---

description: "Tarefas da feature 036: elenco de base"
---

# Tasks: Elenco de base

**Input**: Design documents from `/specs/036-elenco-de-base/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**:
- Os testes de motor são obrigatórios e vêm antes da implementação (Princípio IX).
- O equilíbrio sem criação direta de jogadores tem teste de simulação longa com limites numéricos (Princípio V, research R10).
- O save v21 tem migração e teste com fixture (Princípio VI).
- Na interface: testes de componente e um e2e novo (`academy.spec.ts`).

**Organization**: tarefas agrupadas pelas histórias da spec:
- US1 e US2 (P1);
- US3, US4 e US5 (P2);
- US6 (P3).

A Foundational leva a estrutura da base e a virada da IA (age-out, promoções, `complete-squads` e emergência). Assim, desde a primeira tarefa de história, a safra vai para a base sem deixar os elencos da IA inválidos.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem depender de tarefa incompleta)
- **[Story]**: história da spec (US1 a US6)

---

## Phase 1: Setup

- [X] T001 Criar `packages/engine/src/renewal/academy.ts` com os tipos `AcademyPlayer`, `AcademyState` e `RosterIssue` e as assinaturas do contrato `contracts/engine-academy.md` (`academyOf`, `academyStatus`, `promotionContract`, `promoteFromAcademy`, `releaseFromAcademy`, `rosterIssues`, `academyWarning`, `graduateOf`, `evolveAcademy`, `emptyAcademy`), com corpos que lançam "não implementado". Exportar em `packages/engine/src/index.ts`.
- [X] T002 Em `packages/engine/src/renewal/rules.ts`, acrescentar `ACADEMY_RULES` (`maxPlayers: 15`, `ageLimit: 20`, `aiTargetSize: 25`, `emergencyLimitPerClubSeason: 0.05`) com comentário apontando para research R2, R5 e R6. Em `packages/engine/src/renewal/types.ts`, acrescentar `academy?: AcademyState` a `RenewalState` e os campos `academyArrived`, `academyAgedOut` e `academyReleased` (`PlayerRef[]`) a `SquadChangeNotice` (data-model.md).

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: base no estado, safra na base, evolução e medidas com a base, virada da IA sem criação direta, e save v21.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes primeiro

- [X] T003 [P] Criar `packages/engine/test/renewal/academy.test.ts` com os casos da estrutura:
  - `emptyAcademy()` vazio;
  - `academyOf` em ordem de id;
  - `academyStatus`: idade na data da temporada, `leavesSeason` (primeira temporada com 20 anos ou mais na data de início) e `lastYear` (para nascidos perto do corte da data de referência);
  - invariante: um id nunca está ao mesmo tempo em `world.players`, `market.freeAgents` e `academy.players`;
  - isolamento (FR-014a): busca do mercado (`packages/engine/src/market/search.ts`), necessidades da IA e elencos de outros clubes não leem `renewal.academy` (a base fica fora de `world.players`, R1).
- [X] T004 [P] Em `packages/engine/test/renewal/youth.test.ts`, trocar as expectativas da safra:
  - `generateYouth` grava em `renewal.academy.players` com `clubId` e `joinedSeason`, e `world.players` não muda;
  - a posição carente conta elenco mais base (um clube com 3 goleiros no elenco e 2 na base não recebe goleiro);
  - na IA, a base acima de 15 manda os de menor utilidade (`SQUAD_RULES.utility`) para os livres, em ordem determinística;
  - no clube do técnico (`managerClubId`), a base fica acima do limite sem perder ninguém;
  - a mesma seed dá a mesma safra.
- [X] T005 [P] Em `packages/engine/test/renewal/evolution.test.ts`, acrescentar:
  - `evolveAcademy` aplica `evolutionDelta` com participação 0 e a seed `${careerSeed}:evolve:${number}:${moment}:${playerId}`;
  - um jovem igual na base e no elenco, sem minutos, evolui igual;
  - na rodada do meio de uma liga estrangeira (`finance/round.ts` com `foreign: true`), a base daquele país evolui e o resultado volta ao estado (research R4).
- [X] T006 [P] Em `packages/engine/test/renewal/measure.test.ts`, acrescentar: `measureWorld` com `academy` conta os jovens da base dos clubes da liga uma vez (média, percentis, craques, promessas e idade média), e sem `academy` dá o resultado de hoje (FR-019).
- [X] T007 [P] Em `packages/engine/test/renewal/squads.test.ts`, reescrever as expectativas do reequilíbrio (research R5):
  - `balanceSquads` não chama `createYouth` e `nextPlayerSeq` não muda;
  - a IA promove o melhor da base (por utilidade, desempate por id) em cada posição abaixo do mínimo, depois até o mínimo total e depois até `aiTargetSize`, respeitando `positionMax`;
  - cada promovido ganha contrato (`ensureContracts`) e entra em `graduates`;
  - no clube do técnico, ninguém é promovido nem criado, e só sai quem passa de 40.
- [X] T008 [P] Criar `packages/engine/test/renewal/academy-turnover.test.ts`:
  - `academy-age-out`: jovem com 20 anos na data da nova temporada sai. Na IA, vai para o elenco com contrato e `graduates`; no técnico e no clube que ficou sem técnico, a regra muda conforme o caso (técnico: vira livre, `lastClubId` = clube; sem técnico: IA).
  - `complete-squads`: clube da IA abaixo de um mínimo sem a posição na base contrata o livre da posição (o orçamento não barra cobertura de mínimo). Sem livre, recebe a safra de emergência: jovem novo na base, promovido na hora, com `emergencies` somado.
  - Vale para clubes só regionais (`withRegionalClubs`).
  - Ordem das etapas em `DEFAULT_TURNOVER_STEPS`: `academy-age-out` antes de `generate-youth`, e `complete-squads` depois de `balance-squads` e antes de `age-out-free-agents`.
  - Depois de cada virada de teste, nenhum jogador novo em `world.players` sem passar pela base.
- [X] T009 [P] Criar `packages/save/test/migrate-v21.test.ts` e a fixture `saveV20` em `packages/save/test/fixtures.ts` (no padrão de `saveV19`):
  - v20 abre e vira v21 com `renewal.academy` vazio (`players: []`, `graduates: {}`, `promotedThisSeason: []`, `releasedThisSeason: []`, `emergencies: 0`);
  - os jogadores ficam onde estavam;
  - a carreira migrada avança até a virada, e a safra chega à base;
  - a validação recusa save com id repetido entre base, mundo e livres, ou com `clubId` da base inexistente (`corrupt` com motivo).

### Implementação

- [X] T010 Implementar em `packages/engine/src/renewal/academy.ts`:
  - `emptyAcademy`, `academyOf`, `academyStatus` (com `ageOn` e `seasonDate`) e `graduateOf`;
  - `evolveAcademy`, reaproveitando `evolutionDelta` exportado de `packages/engine/src/renewal/evolution.ts`;
  - as funções internas `toAcademyPlayer`, `promoteInternal` (contrato por `ensureContracts`, `graduates`) e `toFreeAgentFromAcademy` (`toFreeAgent` de `market/free-agents.ts`).

  Faz passar T003 e T005 (parte do motor).
- [X] T011 Em `packages/engine/src/renewal/youth.ts`:
  - `generateYouth` recebe a renovação com `academy` e grava a safra na base;
  - `neediestPosition` recebe também a base do clube;
  - excesso da IA vira livre;
  - o técnico fica acima do limite;
  - devolve `arrived` (base) e `released` (livres).

  Em `packages/engine/src/renewal/turnover.ts`, `generateYouthStep` grava `academyArrived` e `academyReleased` no aviso (`withNotice` aceita os campos novos) e acrescenta os livres ao mercado. Faz passar T004.
- [X] T012 Em `packages/engine/src/renewal/measure.ts`, `measureWorld(world, league, date, academy?)` soma os jovens da base dos clubes da liga. Em `regulateWorldStep` (`packages/engine/src/renewal/turnover.ts`), passar `context.renewal.academy`. Faz passar T006.
- [X] T013 Evolução da base:
  - no fim da temporada: `evolvePlayersStep` (`packages/engine/src/renewal/turnover.ts`) chama `evolveAcademy` para os clubes da liga mais os regionais;
  - no meio da temporada: em `packages/engine/src/finance/round.ts`, na rodada do meio, evoluir a base dos clubes da liga (mais regionais) também quando `foreign` é verdadeiro, e devolver a `academy` atualizada mesmo nesse caso (só `lastEvolution` continua preservado).

  Faz passar T005.
- [X] T014 Em `packages/engine/src/renewal/squads.ts`:
  - remover a criação de jovens;
  - promoções da IA da base (mínimos, mínimo total, `aiTargetSize`, `positionMax`) com contrato e `graduates`;
  - liberações por teto e máximo como hoje.

  Ajustar `balanceSquadsStep` em `packages/engine/src/renewal/turnover.ts`: `promoted` deixa de receber promoções automáticas do técnico, e o `ensureContracts` continua para os promovidos. Faz passar T007.
- [X] T015 Implementar as etapas novas em `packages/engine/src/renewal/turnover.ts`:
  - `academyAgeOutStep` (`academy-age-out`): IA promove e técnico vira livre, com `academyAgedOut` no aviso;
  - `completeSquadsStep` (`complete-squads`): livres por posição para a IA abaixo do mínimo, com a mesma regra de `freeAgentFor` (`market/ai/free-agents.ts`) e cobertura sem barrar o orçamento; depois a emergência (R6) e a soma de `emergencies`.

  Registrar as duas, com `perCountry`, em `DEFAULT_TURNOVER_STEPS` de `packages/engine/src/career/turnover.ts`. Ao fim da virada, podar `graduates` e zerar `promotedThisSeason` e `releasedThisSeason` depois de copiá-los para `squadNotice.promoted` e `squadNotice.academyReleased`. Faz passar T008.
- [X] T016 Em `packages/engine/src/market/ai/round.ts`, antes dos livres por carência, um clube da IA abaixo de um mínimo promove o melhor da base na posição (FR-013, research R5). Teste primeiro, no arquivo de testes de `aiMarketRound` em `packages/engine/test/market/` (localizar com `grep -l aiMarketRound packages/engine/test/market`): um clube forçado abaixo do mínimo no meio da temporada promove da base.
- [X] T017 Criar a renovação inicial com `academy: emptyAcademy()` em `initialRenewal` (`packages/engine/src/renewal/measure.ts`) e em `packages/save/src/create.ts`.
- [X] T018 Save v21:
  - `packages/save/src/format.ts`: `SAVE_FORMAT_VERSION = 21`, e `renewal.academy` obrigatório no comentário do tipo;
  - `packages/save/src/migrate.ts`: migração `addAcademy` (`from: 20`) e validação de ids disjuntos e clubes existentes.

  Faz passar T009.

**Checkpoint**: a virada põe a safra na base, a IA completa elencos sem criar jogadores, e saves v20 abrem.

---

## Phase 3: User Story 1 - Ver os jovens da base (Priority: P1) 🎯 MVP

**Goal**: o técnico vê a base do seu clube numa aba própria do Elenco.

**Independent Test**: carreira nova, avançar até a primeira virada, abrir Elenco → Base e ver os jovens da safra (e nenhum deles no Profissional).

- [X] T019 [P] [US1] Criar `apps/web/src/game/academy-view.ts`, com teste em `apps/web/src/game/academy-view.test.ts`. Seletores:
  - `academyRows(save)`: nome, idade, posição, força, características, `leavesSeason` e `lastYear`, ordenáveis;
  - `academyCapacity(save)`: ocupadas, limite e excesso.

  Lê do motor (`academyOf`, `academyStatus`), sem regra própria.
- [X] T020 [P] [US1] Acrescentar em `packages/i18n/locales/pt-BR/ui.json` as chaves de `contracts/academy-screens.md`: `academy.tab`, `academy.title`, `academy.capacity`, `academy.excess`, `academy.empty`, colunas, `academy.lastYear`, `academy.leavesIn`, `squad.tabProfessional` e `squad.tabAcademy`, com plural ICU.
- [X] T021 [US1] Criar `apps/web/src/ui/AcademyTab.tsx` e `AcademyTab.module.css`: cabeçalho com `SquadCounter` ("{n} de {limite} vagas" e excesso em texto), `DataTable` ordenável por idade, posição e força, `Badge` "Último ano" em texto e estado vazio. Teste de componente em `apps/web/src/ui/AcademyTab.test.tsx`.
- [X] T022 [US1] Em `apps/web/src/app/jogo/elenco/page.tsx`, acrescentar `Tabs` Profissional e Base, com a aba em `?aba=base`, os atalhos de teclado das outras abas e, sem emprego, a base do clube em foco só para leitura.

**Checkpoint**: US1 funciona sozinha (ver a base).

---

## Phase 4: User Story 2 - Promover um jovem (Priority: P1)

**Goal**: promover a qualquer momento, com o contrato visível, e escalar na partida seguinte.

**Independent Test**: no meio da temporada, promover um jovem, confirmar e escalá-lo no próximo jogo; o detalhe mostra "cria da base".

- [X] T023 [P] [US2] Em `packages/engine/test/renewal/academy.test.ts`, acrescentar:
  - `promotionContract` igual ao contrato que `ensureContracts` daria;
  - `promoteFromAcademy` move o jovem para `world.players` com `clubId` e contrato, registra `graduates` e `promotedThisSeason`, e recusa `academy.squad_full` com o elenco no máximo do técnico (`squadLimit`) e `academy.not_found` para id fora da base do clube;
  - o promovido entra na folha (`annualWageBill`) e pode ser escalado (`validateLineup` aceita).
- [X] T024 [P] [US2] Criar `packages/save/test/academy.test.ts` com `promoteYouth(save, playerId)`:
  - usa `save.clubId`;
  - recusa com o técnico desempregado e durante uma partida ao vivo em andamento (`academy.match_in_progress`);
  - a escalação automática (`withAdjustedLineup`) continua válida.
- [X] T025 [US2] Implementar `promotionContract` e `promoteFromAcademy` em `packages/engine/src/renewal/academy.ts`, e `promoteYouth` em `packages/save/src/academy.ts` (exportado por `packages/save/src/index.ts`). Faz passar T023 e T024.
- [X] T026 [US2] Na web:
  - comando `promoteYouth` em `apps/web/src/game/GameProvider.tsx` (salva e atualiza);
  - em `AcademyTab.tsx`, o botão Promover com `Dialog` de confirmação ("Promover {nome}?", salário por mês e ano final por `formatMoney`);
  - desabilitado com `aria-describedby` quando o elenco está no máximo ou há partida ao vivo;
  - chaves `academy.promote*` em `ui.json`.
- [X] T027 [US2] Em `apps/web/src/ui/PlayerDetails.tsx`, a linha "Cria da base do {clube} (temporada {n})" via `graduateOf`, com a chave `player.academyGraduate` em `ui.json` e um teste de componente.

**Checkpoint**: US1 e US2 entregam o MVP (ver e promover).

---

## Phase 5: User Story 3 - Saída por idade com aviso (Priority: P2)

**Goal**: o técnico é avisado duas vezes e perde o jovem só se não promover.

**Independent Test**: com jovem no último ano, ver o aviso na abertura da última janela e antes do último jogo; na virada, ele sai como livre e aparece em "Saíram da base por idade".

- [X] T028 [P] [US3] Em `packages/engine/test/renewal/academy.test.ts`, acrescentar:
  - `academyWarning` devolve `{ kind: "last_window", count }` só com a última janela da temporada aberta (`isWindowOpen` e a última de `transferWindows`) e jovens no último ano; sem nenhuma janela, nunca devolve aviso;
  - `rosterIssues` devolve `academy_last_year` (gravidade `warning`, `count`) só quando o próximo jogo do clube é o último dele na temporada (`nextClubFixture` e calendário).
- [X] T029 [US3] Implementar `academyWarning` e o caso `academy_last_year` de `rosterIssues` em `packages/engine/src/renewal/academy.ts`. Faz passar T028.
- [X] T030 [US3] Na web:
  - `apps/web/src/ui/home/NoticeStrip.tsx` mostra o aviso da última janela com link para `/jogo/elenco?aba=base`, e `AcademyTab.tsx` mostra o mesmo `Notice`;
  - `apps/web/src/ui/SimulateDialogs.tsx` e `GameProvider.tsx` tratam `academy_last_year` como `confirm` ("Jogar" e "Ir para a base");
  - chaves `academy.warning*` e `simulate.academyLastYear*` em `ui.json`.
- [X] T031 [US3] Em `apps/web/src/ui/SquadChangeNotice.tsx` (e na tela de fim de temporada que o usa), seções "Chegaram à base", "Saíram da base por idade (agora livres)", "Promovidos da base" e "Dispensados da base" (FR-016), sem "promovidos automáticos" no clube do técnico. Chaves `squadNotice.academy*` em `ui.json` e teste de componente.

---

## Phase 6: User Story 4 - Dispensar um jovem (e bloqueios) (Priority: P2)

**Goal**: dispensar (o jovem vira livre). A base acima do limite e o elenco abaixo do mínimo bloqueiam a próxima partida.

**Independent Test**: dispensar e achar o jovem entre os livres. Com a base acima do limite, ou o elenco abaixo do mínimo, tentar jogar e ser impedido até resolver.

- [X] T032 [P] [US4] Em `packages/engine/test/renewal/academy.test.ts`, acrescentar:
  - `releaseFromAcademy` tira da base, põe em `market.freeAgents` (`lastClubId`, `sinceYear`) e registra em `releasedThisSeason`, e um clube da IA pode contratá-lo depois (`freeAgentFor`);
  - `rosterIssues`: `academy_over_limit` (erro, `excess`, `limit`) com a base do técnico acima de 15;
  - `rosterIssues`: `squad_below_minimum` (erro, `missing` e `positions`) com o elenco abaixo do mínimo total ou de posição;
  - nada disso para o técnico desempregado.
- [X] T033 [P] [US4] Em `packages/save/test/academy.test.ts`, acrescentar:
  - `releaseYouth`;
  - `advanceCareerSeason` (e o início da rodada ao vivo) recusa avançar com `roster.blocked` e os problemas quando há erro, e volta a avançar depois de promover ou dispensar;
  - um técnico com caixa negativo consegue sair do `squad_below_minimum` promovendo da base ou contratando livre.
- [X] T034 [US4] Implementar `releaseFromAcademy` e os casos de erro de `rosterIssues` em `packages/engine/src/renewal/academy.ts`; `releaseYouth` em `packages/save/src/academy.ts`; e a recusa em `advanceCareerSeason` (`packages/save/src/career.ts`) e no caminho ao vivo. Faz passar T032 e T033.
- [X] T035 [US4] Na web:
  - comando `releaseYouth` no `GameProvider.tsx` e o botão Dispensar com `Dialog` ("Ele deixa o clube e vira jogador livre. Não dá para desfazer");
  - em `SimulateDialogs.tsx`, os bloqueios `academy_over_limit` ("Ir para a base") e `squad_below_minimum` ("Ir para a base" e "Ir para o mercado"), lidos de `rosterIssues` no fluxo `blocked` que já existe em `GameProvider.tsx`;
  - chaves `academy.release*`, `simulate.academyOverLimit*` e `simulate.squadBelowMinimum*` em `ui.json`.

---

## Phase 7: User Story 5 - Um mundo que continua saudável (Priority: P2)

**Goal**: 30 temporadas sem interação com as faixas atuais, elencos válidos e nenhuma criação direta.

**Independent Test**: `pnpm sim:world --seasons 30` e o teste de longo prazo verdes com os critérios novos.

- [X] T036 [US5] Em `packages/engine/test/renewal/long-run.ts`, acrescentar os critérios do research R10 com limites declarados:
  - base de cada clube ≤ 15 em toda temporada;
  - zero jogadores criados direto (delta de `nextPlayerSeq` = safra + emergências);
  - média de emergências ≤ `ACADEMY_RULES.emergencyLimitPerClubSeason`, e 0 no mundo padrão;
  - população do mundo (elenco + base) dentro de ±3% do início;
  - tamanho médio dos elencos da IA entre 23 e 28.

  Manter `RANGES` e, se a idade média sair da faixa por causa da base, revisar a faixa no mesmo commit com a justificativa.
- [X] T037 [US5] Calibrar `YOUTH_RULES.perClub` e, se preciso, `ACADEMY_RULES.aiTargetSize` em `packages/engine/src/renewal/rules.ts` até `long-run-1` e `long-run-2` passarem. Registrar os valores e as medições (antes e depois) em `specs/036-elenco-de-base/research.md`, numa seção "Calibragem".
- [X] T038 [US5] Em `tools/src/simulate-world.ts`, acrescentar ao relatório e aos `WORLD_LIMITS`: jogadores na base, emergências por temporada, população e tamanho médio dos elencos da IA. Rodar `pnpm sim:gates` (mundo completo por 10 temporadas e escala com 3 países por 30 temporadas) e ajustar a calibragem até passar.
- [X] T039 [US5] Regravar as linhas de base que mudam por causa da safra na base e do reequilíbrio sem criação: `packages/engine/test/career/__snapshots__/*.snap`, `packages/save/test/equivalence.test.ts` e os demais que falharem só por resultado. Antes, conferir que cada diferença vem da base (e não de um erro), e explicar no commit (FR-018).
- [X] T040 [US5] Desempenho: rodar `packages/engine/test/renewal/performance.test.ts` e `packages/engine/test/career/performance.test.ts`; a virada do mundo padrão e da escala continua dentro das metas da 020. Se não, otimizar (índices por clube na base) sem mudar resultados.

---

## Phase 8: User Story 6 - Continuar uma carreira antiga (Priority: P3)

**Goal**: saves da versão anterior abrem e ganham base na virada seguinte.

**Independent Test**: abrir a fixture v20 no jogo e avançar até a virada.

- [X] T041 [US6] Em `packages/save/test/migrate-v21.test.ts`, acrescentar uma carreira longa v20 (fixture gerada em `packages/save/test/fixtures.ts` por `saveV20({ seasons: 2 })`, que joga duas temporadas na v20 antes de gravar) que migra e passa por duas viradas com elencos válidos (inclusive o do técnico, que pode ficar bloqueado e ser resolvido promovendo). Em `apps/web/e2e/save-file.spec.ts`, importar um arquivo v20 e conferir que abre.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T042 [P] Criar `apps/web/e2e/academy.spec.ts`, seguindo o quickstart, passos 1 a 6:
  - estado vazio;
  - safra na Base;
  - promover pelo teclado e escalar;
  - dispensar e ver entre os livres;
  - aviso de último ano;
  - bloqueio com a base acima do limite (save de teste preparado);
  - SC-008: promover e dispensar com no máximo três ações (foco no jovem, ação e confirmação), contadas no teste pelo teclado.

  Incluir a aba Base em `apps/web/e2e/a11y.spec.ts` (dois temas) e em `apps/web/e2e/screens-list.ts`.
- [X] T043 [P] Medir o tamanho do save com a base em `packages/save/test/long-career.test.ts` (teto de 5,5 MB) e `packages/save/test/football-world-scale.test.ts` (`SCALE_LIMITS`, 42 MB). Registrar no PR os valores antes e depois.
- [X] T044 [P] Documentação:
  - `docs/guia-do-jogador.md`: base, promoção, dispensa, idade-limite, bloqueios e o fim da reposição automática do elenco;
  - `docs/glossario.md`: base, safra, cria da base, safra de emergência;
  - `docs/arquitetura.md`: `renewal/academy.ts`, as etapas novas da virada e `RenewalState.academy`;
  - `docs/design.md` §5: o reequilíbrio não cria mais jogadores;
  - `docs/mod-format.md`: confirmar que nada muda.
- [ ] T045 Rodar o quickstart inteiro (`specs/036-elenco-de-base/quickstart.md`): `pnpm lint`, `pnpm typecheck`, a suíte completa, `pnpm build:web` e `pnpm test:e2e`. Conferir em prints a aba Base, os diálogos e os bloqueios, em 1440 e 768 px, nos dois temas.
- [ ] T046 Release no mesmo PR: `package.json` em 1.9.0 e uma entrada nova em `packages/i18n/locales/pt-BR/release-notes.json`, com a data de `TZ=America/Sao_Paulo date +%F`, explicando a base, a promoção e dispensa, os bloqueios e o fim da criação automática de jogadores no elenco. Depois do build, rodar `pnpm check-release`.

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → **Foundational (T003–T018)** → histórias.
- **US1 (T019–T022)** depende da Foundational.
- **US2 (T023–T027)** depende da US1 (a aba onde fica o botão).
- **US3 (T028–T031)** e **US4 (T032–T035)** dependem da US1. Podem correr em paralelo entre si, mas as duas mexem em `academy.ts`, `SimulateDialogs.tsx` e `ui.json`; se correrem juntas, juntar as edições com cuidado.
- **US5 (T036–T040)** depende da Foundational. Pode correr junto das histórias de interface e precisa terminar antes do Polish (as linhas de base regravadas mudam os resultados que o e2e vê).
- **US6 (T041)** depende da T018.
- **Polish (T042–T046)** depende de todas.

### Within Each Phase

Testes antes da implementação:
- T003–T009 antes de T010–T018;
- T019 antes de T021;
- T023 e T024 antes de T025;
- T028 antes de T029;
- T032 e T033 antes de T034;
- T036 antes de T037.

### Parallel Opportunities

- T003 a T009: testes em arquivos diferentes.
- T019 e T020; T023 e T024; T032 e T033.
- US5 (motor e simulação) em paralelo às histórias de interface US1 a US4.
- T042, T043 e T044.

## Parallel Example: Foundational

```text
T003 packages/engine/test/renewal/academy.test.ts
T004 packages/engine/test/renewal/youth.test.ts
T005 packages/engine/test/renewal/evolution.test.ts
T006 packages/engine/test/renewal/measure.test.ts
T007 packages/engine/test/renewal/squads.test.ts
T008 packages/engine/test/renewal/academy-turnover.test.ts
T009 packages/save/test/migrate-v21.test.ts
```

## Parallel Example: US2

```text
T023 packages/engine/test/renewal/academy.test.ts
T024 packages/save/test/academy.test.ts
```

## Implementation Strategy

### MVP First (US1 e US2)

1. T001–T018: base no estado, safra na base, IA sem criação direta e save v21.
2. T019–T022: aba Base.
3. T023–T027: promover e "cria da base".
4. **Parar e validar**: carreira nova até a virada, ver a safra na Base e promover um jovem. Abrir um save v20.

### Incremental Delivery

1. MVP (US1 e US2).
2. US5 em paralelo, porque é a calibragem que garante o mundo antes de publicar.
3. US3 e US4: avisos, dispensa e bloqueios.
4. US6: migração de carreira longa.
5. Polish e release 1.9.0, tudo num PR só.

## Notes

- As linhas de base mudam de propósito (FR-018). Regravar só depois de conferir que cada diferença vem da base.
- A safra de emergência foi confirmada pelo usuário (2026-11-09). Ela precisa ficar em 0 no mundo padrão depois da calibragem.
- Commit por tarefa ou grupo lógico.
