---

description: "Tarefas da feature 035: reformulação da página Início"
---

# Tasks: Reformulação da página Início

**Input**: Design documents from `/specs/035-reformulacao-inicio/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/home-screen.md, quickstart.md

**Tests**: os seletores derivados (`home-view.ts`) têm testes antes do código (Princípio IX). Cada história tem testes de componente na Início. O layout tem e2e (altura em 1440×900 e telas estreitas), e os testes que dependiam da lista de resultados da rodada na Início são ajustados.

**Organization**: tarefas agrupadas pelas histórias da spec. US1 e US2 são P1; US3 e US4, P2; US5 e US6, P3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem depender de tarefa incompleta)
- **[Story]**: história da spec (US1 a US6)

---

## Phase 1: Setup

- [X] T001 Criar o esqueleto, com exportações vazias e tipos do `data-model.md`:
  - `apps/web/src/game/home-view.ts`, com `matchPreview`, `goalSummary` e `headlineCategory`;
  - a pasta `apps/web/src/ui/home/`, com `HomeHeader`, `MatchPreview`, `NoticeStrip`, `TablePositionCard` e `ClubMoodCard`, cada um com o seu `.module.css`.
- [X] T002 [P] Acrescentar a `packages/i18n/locales/pt-BR/ui.json` as chaves novas do contrato `contracts/home-screen.md`:
  - `home.header.*` (linha "divisão · Nº lugar · Temporada AAAA");
  - `home.preview.title`, `.strength` ("Força"), `.fitness` ("Condição"), `.absences` ("Desfalques") e `.toLineup`;
  - `home.noGames` ("sem jogos");
  - `home.seeTable` ("Ver tabela");
  - `home.mood.title` ("Torcida e diretoria"), `.fans`, `.board` e `.goals` ("{onTrack} de {total} metas no caminho");
  - `home.newsCategory.{result,derby,coaches,market,table,cup,continental,regional}`;
  - `home.result.{win,draw,loss}` ("V", "E", "D").
  - O teste de cobertura de chaves da i18n tem de continuar passando.

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: a grade nova da página e o ajuste dos testes que hoje esperam a lista de resultados da rodada na Início.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

- [X] T003 Criar em `apps/web/test/helpers/round.ts` o ajudante `roundPlayed(round)`, que espera a rodada `round` aparecer como jogada sem depender da lista de resultados da Início. Ele espera, na região `home.position`, o resultado com o rótulo `home.roundLabel` daquela rodada. Para o desempregado, que não tem esse cartão, espera o título das manchetes `news.round` da rodada.
- [X] T004 Trocar `findByRole("region", { name: t("home.lastRound", …) })` e `queryByRole(…)` pelo ajudante de T003 nos testes que leem a Início:
  - `test/flows/autosave.test.tsx`, `live-round.test.tsx`, `performance.test.tsx` e `lineup-simulate.test.tsx`;
  - `test/ui/live-controls.test.tsx`, `live-perf.test.tsx`, `live-keyboard.test.tsx` e `home.test.tsx`.

  Os testes que leem a lista **na tela da rodada** ao vivo (`/jogo/rodada`, por exemplo `test/ui/live-round-end.test.tsx`) continuam como estão, porque o `RoundResults` segue lá. Antes de trocar, conferir em cada arquivo qual tela está aberta.
- [X] T005 [P] Fazer o mesmo nos e2e com a mesma checagem de tela: `e2e/seasons.spec.ts`, `e2e/keyboard.spec.ts`, `e2e/no-third-party.spec.ts`, `e2e/live-round.spec.ts` e `e2e/narrow-round.spec.ts`. Um ajudante equivalente fica em `e2e/helpers.ts`.
- [X] T006 Reescrever `apps/web/src/app/jogo/page.module.css` com as áreas `header`, `next`, `table`, `notices`, `mood` e `news`, nas quebras de research R8:
  - ≥ 1200 px: duas colunas, `minmax(0,1.6fr) minmax(0,1fr)`;
  - 720 a 1199 px: duas colunas iguais;
  - < 720 px: uma coluna, na ordem do DOM.
  - Espaços com `--space-3`.

**Checkpoint**: a suíte passa com a Início antiga, porque o ajudante de T003 funciona com o cartão de últimos resultados atual. A grade nova está pronta para receber os blocos.

---

## Phase 3: User Story 1 - Ver o essencial antes do jogo numa tela (Priority: P1) 🎯 MVP

**Goal**: a página em grade, com o cabeçalho e sem a lista de resultados da rodada, cabendo em 1440×900.

**Independent Test**: abrir a Início em 1440×900, sem avisos. A altura deve ser no máximo 900 px, e o próximo jogo e a posição devem ficar lado a lado.

### Tests for User Story 1

- [X] T007 [P] [US1] Em `apps/web/test/ui/home.test.tsx`:
  - a Início tem `h1` com o nome do clube e a linha "divisão · Nº lugar · Temporada";
  - o `WindowStatus` fica dentro do cabeçalho;
  - a região `home.lastRound` **não** existe depois de jogar uma rodada direta;
  - a ordem das regiões no DOM é cabeçalho, próximo jogo, avisos, posição, torcida e diretoria, manchetes.
- [X] T008 [P] [US1] Criar `apps/web/e2e/home-layout.spec.ts`:
  - em 1440×900, com uma carreira sem avisos, `document.scrollingElement.scrollHeight ≤ innerHeight`;
  - o cartão do próximo jogo e o da posição ficam lado a lado, com o mesmo `top` aproximado e `left` diferente;
  - em 1024, 390 e 360 px, `scrollWidth ≤ innerWidth`;
  - em 390 px, os blocos ficam empilhados na ordem do contrato.
  - Usar os ajudantes de carreira e de dispensa de avisos que já existem em `e2e/helpers.ts`.

### Implementation for User Story 1

- [X] T009 [US1] Implementar `apps/web/src/ui/home/HomeHeader.tsx` (research R9):
  - `h1` com o nome do clube;
  - a linha com a divisão (só se a competição tiver mais de uma; `divisionNameOf` e `userDivisionLevel`), `clubPosition` e a temporada;
  - à direita, o `WindowStatus` que já existe;
  - uma variante desempregado, com `career.unemployed` e a reputação.
- [X] T010 [US1] Reorganizar `apps/web/src/app/jogo/page.tsx` nas áreas de T006, na ordem do contrato:
  - remover o `WindowStatus` solto, o `RoundResults`, o import de `aggregateOf` que só ele usava, o cartão de caixa e a seção `home.lastResults` (que voltam em US4);
  - durante esta história, os blocos antigos (`NextMatchCard`, `FansCard`, `BoardCard` e `NewsCard`) entram nas áreas novas, e as histórias seguintes os trocam um a um.
- [X] T011 [US1] Rodar T007 e T008 e ajustar os espaços e as alturas até a página caber em 900 px. Se os blocos antigos ainda não couberem, registrar a altura medida no T008 com `test.fail` marcado e o comentário "remover em T029". O teste definitivo fecha em T029.

**Checkpoint**: grade e cabeçalho funcionando, sem a lista da rodada.

---

## Phase 4: User Story 2 - Decidir o próximo jogo com mais contexto (Priority: P1)

**Goal**: o cartão do próximo jogo frente a frente, com a forma dos dois times e os três indicadores.

**Independent Test**: no cartão, conferir os dois escudos, as duas formas, a força "NN × NN", a condição "NN%" e os desfalques "N" com o link para a Escalação.

### Tests for User Story 2

- [X] T012 [P] [US2] Criar `apps/web/test/game/home-view.test.ts` para `matchPreview`, usando as carreiras de `test/helpers` (`storedCareer`). Casos:
  - `home` é sempre o mandante;
  - `strength.mine` = `Math.round(teamStrength({ formation: save.lineup.formation, onField }).overall)` com os titulares do save;
  - trocar um titular forte por um reserva fraco baixa `strength.mine`;
  - `strength.opponent` é a força de `lineupForMatch` do adversário, no esquema dele e com os indisponíveis dele;
  - `fitness` é a média arredondada de `fitnessAt` dos titulares;
  - `absences` = `upcomingUnavailability(state, clubId).length`, e um jogador lesionado no save aumenta a conta em 1;
  - a forma do adversário vem de `lastResults` e fica vazia na primeira rodada;
  - sem próximo jogo, o resultado é `undefined`;
  - chamar duas vezes dá o mesmo resultado.
- [X] T013 [P] [US2] Em `apps/web/test/ui/home.test.tsx`, adaptar o teste "o cartão do próximo jogo é o primeiro bloco…" (026). Casos:
  - os dois escudos e nomes, o mandante primeiro;
  - as duas formas, ou "sem jogos";
  - a lista de indicadores `home.preview.title`, com os três valores em texto;
  - o link dos desfalques vai para `/jogo/escalacao`;
  - os botões jogar e simular;
  - a temporada encerrada mostra fim de temporada e próxima temporada;
  - sem mais jogos, mostra "avançar até o fim".

### Implementation for User Story 2

- [X] T014 [US2] Implementar `matchPreview(save)` em `apps/web/src/game/home-view.ts` (data-model `MatchPreview`, research R1–R4), com as funções do motor que já são exportadas:
  - `teamStrength`, `lineupForMatch`, `preferredFormation` e `upcomingUnavailability`;
  - `nextFixture` e `seasonStateOf` do save;
  - `lastResults` e `fitnessAt` de `selectors.ts`.

  O esquema do adversário vem da temporada da competição do jogo (`season.formations[clubId]`) ou de `preferredFormation`. Nada de sorteio. Fazer T012 passar.
- [X] T015 [US2] Implementar `apps/web/src/ui/home/MatchPreview.tsx`:
  - levar do `NextMatchCard` a competição, a fase ou rodada (`stageLabel` e `phaseLabel`), a data com o dia da semana, o mando, a divisão, a ida (`aggregateOf`), o `DerbyBadge`, as ações e os estados de fim de temporada e sem jogos;
  - acrescentar o frente a frente (escudo de 56 px, nome que quebra linha) com o `FormChips` de cada lado e a lista de indicadores (`dl` ou `ul` com rótulo acessível);
  - usar `useMemo(() => matchPreview(save), [save])`;
  - manter o `data-tip-anchor="play"`.
- [X] T016 [US2] Trocar o `NextMatchCard` pelo `MatchPreview` em `apps/web/src/app/jogo/page.tsx` e apagar `apps/web/src/ui/NextMatchCard.tsx` e o seu CSS, porque nenhum outro arquivo os usa. Rodar T013 e os testes de dicas (`test/ui/tips-anchors.test.tsx`).

**Checkpoint**: US1 e US2 completas. É o MVP da reformulação.

---

## Phase 5: User Story 3 - Avisos compactos (Priority: P2)

**Goal**: avisos lado a lado, cada um com título, uma linha e uma ação.

**Independent Test**: com o aviso de mercado e a escalação ajustada, os dois aparecem lado a lado. Dispensar um tira só ele.

### Tests for User Story 3

- [X] T017 [P] [US3] Em `apps/web/test/ui/home.test.tsx` e `test/ui/career-notices.test.tsx`, adaptar os testes "avisos pendentes aparecem agrupados em 'Antes do jogo'…" e "sem aviso pendente…". Casos:
  - cada aviso é um item da faixa `home.beforeMatch`, com título, uma linha de detalhe e uma ação;
  - a escalação ajustada mostra a **contagem** de trocas e o link para a Escalação;
  - a crise mantém `role="alert"`;
  - dispensar tira só o aviso dispensado;
  - sem avisos, a faixa não existe.

### Implementation for User Story 3

- [X] T018 [P] [US3] Acrescentar a prop `compact` a `apps/web/src/ui/LineupNotice.tsx`, `MarketNotice.tsx`, `SquadChangeNotice.tsx` e `ui/board/BoardNotice.tsx` (research R7). No modo compacto, cada aviso mostra:
  - o título;
  - uma linha (a contagem ou a frase principal);
  - uma ação: link para a tela de detalhe e, quando o aviso já se dispensa hoje, dispensar.

  Sem `compact`, nada muda nas outras telas.
- [X] T019 [US3] Implementar `apps/web/src/ui/home/NoticeStrip.tsx`:
  - recebe os avisos ativos e monta a grade `repeat(auto-fit, minmax(240px, 1fr))`;
  - a região se chama `home.beforeMatch`;
  - inclui as propostas de emprego e a crise financeira como cartões compactos (texto e link para a Carreira ou as Finanças).

  Levar a lógica `hasNotices` de `page.tsx` para um `activeNotices(save)` em `apps/web/src/game/home-view.ts`. Usar a faixa em `page.tsx` e fazer T017 passar.

---

## Phase 6: User Story 4 - Posição e resultados recentes (Priority: P2)

**Goal**: a posição em destaque, "Ver tabela" e os últimos cinco resultados coloridos, sem o caixa.

**Independent Test**: depois de três rodadas, o cartão mostra a posição, o link para a Competição e três resultados com a letra V/E/D, o adversário, o mando e o placar.

### Tests for User Story 4

- [X] T020 [P] [US4] Em `apps/web/test/ui/home.test.tsx`, adaptar "mostra próximo jogo, posição e últimos resultados" e "antes do primeiro jogo, avisa que não há resultados". Casos:
  - na região `home.position`, a posição, o link `home.seeTable` para `/jogo/competicao`, e cada resultado com nome curto, mando, rodada ou competição, placar e a letra em texto;
  - `data-result` coerente com o placar;
  - nenhum texto `home.cash`.
- [X] T021 [P] [US4] Em `apps/web/test/flows/finances.test.tsx:199`, trocar a checagem do caixa na Início por uma checagem na tela de Finanças, que já mostra o saldo. Manter o que o teste quer provar: o caixa muda depois da rodada.

### Implementation for User Story 4

- [X] T022 [US4] Implementar `apps/web/src/ui/home/TablePositionCard.tsx`, a partir da seção `home.lastResults` antiga de `page.tsx`. Ele tem:
  - a posição em destaque;
  - o link "Ver tabela";
  - uma lista de até cinco resultados, cada um com o escudo de 18 px, o nome curto, o mando, a rodada ou a competição, o placar e uma `Badge` com a letra;
  - tons de vitória, empate e derrota com as variáveis de cor do tema e `data-result`.

  Usar em `page.tsx` e fazer T020 passar.

---

## Phase 7: User Story 5 - Torcida, diretoria e manchetes de relance (Priority: P3)

**Goal**: um cartão compacto de torcida e diretoria e o cartão de manchetes com três itens e categoria.

**Independent Test**: conferir no cartão de torcida e diretoria os dois valores, as barras, as tendências e a linha de metas. Nas manchetes, no máximo três itens com etiqueta e o link "Todas as notícias".

### Tests for User Story 5

- [X] T023 [P] [US5] Em `apps/web/test/game/home-view.test.ts`:
  - `headlineCategory` tem categoria para todo `HEADLINE_TYPES` (importado do motor);
  - `goalSummary`: com metas medidas, `onTrack` conta `onTrack` e `met`, e `total` conta as medidas;
  - `goalSummary` é `undefined` para o desempregado.
- [X] T024 [P] [US5] Em `apps/web/test/flows/fans.test.tsx:22`, trocar a checagem de `fans.reasons` na Início pela do cartão compacto: valor e tendência da torcida na região `home.mood.title`. Se o teste quer provar os motivos, movê-lo para a tela onde o `FansCard` continua (Clube ou Carreira).
- [X] T025 [P] [US5] Em `apps/web/test/ui/home.test.tsx`:
  - a região `home.mood.title` tem os dois `Meter`, as tendências em texto, a linha de metas e o link para a Carreira, sem `fans.reasons`;
  - a região `news.title` tem no máximo três itens, cada um com a etiqueta `home.newsCategory.*`, e o link `news.seeAll`;
  - sem manchetes, aparece o texto de sem notícias que já existe.

### Implementation for User Story 5

- [X] T026 [US5] Implementar `goalSummary` e `headlineCategory` em `apps/web/src/game/home-view.ts` (research R5 e R6) e fazer T023 passar.
- [X] T027 [US5] Implementar `apps/web/src/ui/home/ClubMoodCard.tsx`, com duas linhas:
  - torcida: `fans.clubs[clubId].mood`, `Meter` com a faixa `moodBand` e `trendOf`;
  - diretoria: `confidence`, `Meter` e `trendOf`;
  - depois, a linha de `goalSummary` e o link para a Carreira.

  Reaproveitar `TREND_SYMBOL` e os tons de `FansCard` e `ConfidenceMeter`. Usar em `page.tsx` no lugar de `FansCard` e `BoardCard`.
- [X] T028 [US5] Acrescentar a `apps/web/src/ui/news/NewsCard.tsx` a prop `compact`, usada na Início, com:
  - no máximo três manchetes de `latestFeed`, na ordem de relevância;
  - para cada uma, a etiqueta `home.newsCategory.<headlineCategory(type)>`, o título (o texto que o `RoundFeed` já monta) e o subtítulo (o primeiro `extras`, quando houver; senão, a rodada ou a competição);
  - o link `news.seeAll`.

  Sem `compact`, nada muda. Fazer T025 passar.
- [X] T029 [US5] Com todos os blocos novos, tirar o `test.fail` de T011 (se ele existir) e fazer `e2e/home-layout.spec.ts` passar de vez: em 1440×900, sem avisos, a altura fica em no máximo 900 px.

---

## Phase 8: User Story 6 - Início do técnico desempregado (Priority: P3)

**Goal**: o desempregado no mesmo estilo compacto, sem a lista de resultados da rodada.

**Independent Test**: abrir a Início de um desempregado e conferir "Sem clube" com a reputação, as propostas com aceitar e recusar, as ações e as manchetes.

- [X] T030 [P] [US6] Em `apps/web/test/ui/home.test.tsx`, ou no teste do desempregado que já existe em `test/flows/board.test.tsx`, conferir:
  - o cabeçalho de desempregado com a reputação;
  - `JobOffers` com aceitar e recusar;
  - os botões da rodada;
  - o cartão de manchetes compacto;
  - nenhuma região `home.lastRound` depois de simular uma rodada.
- [X] T031 [US6] Reescrever `Unemployed` em `apps/web/src/app/jogo/page.tsx` na grade nova:
  - o `HomeHeader` na variante desempregado;
  - o `BoardNotice`, quando houver;
  - um cartão com `JobOffers`, as ações da rodada e as de fim de temporada;
  - o `NewsCard compact`.

  Remover o `RoundResults` e os imports que sobrarem. Fazer T030 passar.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T032 [P] Acessibilidade: rodar `pnpm test:e2e a11y keyboard` e `test/ui/headings.test.tsx`, e ajustar a hierarquia de títulos (`h1` do cabeçalho, `h2` dos cartões). Confirmar o contraste dos tons V/E/D e das barras nos temas claro e escuro, e que a cor nunca é a única informação.
- [X] T033 [P] Rodar os e2e de layout que já existem (`e2e/layout.spec.ts`, `e2e/responsive.spec.ts` e `e2e/screens.spec.ts`) e corrigir qualquer regressão. Se algum teste pedir uma largura que o `home-layout.spec.ts` não cobre, incluí-la nele.
- [X] T034 Apagar o CSS que ficou sem uso em `apps/web/src/app/jogo/page.module.css` (`.position`, `.results`, `.crisis` e outros) e rodar `pnpm lint`.
- [X] T035 Versão e notas:
  - `package.json` passa para 1.8.0;
  - em `packages/i18n/locales/pt-BR/release-notes.json`, uma entrada 1.8.0 com a data de `TZ=America/Sao_Paulo date +%F`, descrevendo a Início nova (grade, próximo jogo frente a frente com os indicadores, avisos compactos, posição com os últimos resultados, torcida e diretoria juntas, manchetes com categoria, lista da rodada na Competição);
  - commit separado `chore(release): 1.8.0`;
  - rodar `pnpm check-release`.
- [X] T036 Validação final do `quickstart.md`:
  - `pnpm test` (suíte inteira; motor e save sem mudança);
  - `pnpm --filter @brasfoot-like/web build`;
  - `pnpm test:e2e`;
  - a verificação manual, numa janela de 1440×900 e numa de 390 px.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup.
  - T003 vem antes de T004 e T005.
  - T006 é independente.
- **US1 (Phase 3)**: depende da Foundational. É a base da página para as outras histórias.
- **US2 a US6**: dependem de US1 (T010), porque todas mexem em `page.tsx`. Entre elas, os componentes são independentes, mas a ligação em `page.tsx` é sequencial.
- **Polish**: depois de todas as histórias. T035 e T036 por último.

### User Story Dependencies

- US2, US3, US4 e US5 só dependem de US1.
- US6 usa o `HomeHeader` (US1) e o `NewsCard compact` (US5).

### Parallel Opportunities

- T002 junto de T001.
- T005 junto de T004 (arquivos diferentes).
- Os testes de cada história ([P]) junto dos componentes de outra história.
- T018 (quatro avisos), T022 (posição) e T027 (torcida e diretoria) podem ser escritos em paralelo, porque são arquivos novos ou separados. Só a troca em `page.tsx` é em sequência.
- T032 e T033 juntos.

## Parallel Example: User Story 2

```text
Task: "T012 testes de matchPreview em apps/web/test/game/home-view.test.ts"
Task: "T013 testes do cartão em apps/web/test/ui/home.test.tsx"
```

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1 e Phase 2: o ajudante de rodada jogada e a grade.
2. US1: cabeçalho, grade e saída da lista da rodada.
3. US2: o próximo jogo frente a frente com os indicadores.
4. **Parar e validar**: em 1440×900, o essencial fica visível sem rolar.

### Incremental Delivery

US3 (avisos), US4 (posição), US5 (torcida e diretoria, manchetes, que fecham a meta de altura) e US6 (desempregado), cada uma com os seus testes. Depois o Polish, a versão 1.8.0 e o PR único.
