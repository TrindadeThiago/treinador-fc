---

description: "Tarefas da feature 040: captação de jovens"
---

# Tasks: Captação de jovens

**Input**: Design documents from `/specs/040-captacao-jovens/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**:
- **Motor:** os testes vêm antes do código (Princípio IX).
- **"Nada no mundo" e neutralidade:** testes próprios, e as linhas de base existentes rodam **sem regravar** (SC-001, SC-002).
- **Equilíbrio:** um cenário novo no `sim:economy` (SC-004).
- **Save:** v25 com fixture.
- **Web:** testes de componente e o e2e.

**Organization**:
- US1, US2 e US3 (P1);
- US4 (P2);
- US5 (P3).

A fundação leva os tipos, as regras, o mod e o save v25.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem depender de tarefa incompleta)
- **[Story]**: história da spec (US1 a US5)

---

## Phase 1: Setup

- [X] T001 Em `packages/engine/src/scouting/types.ts`, acrescentar:
  - `ScoutingRegion` (`{ kind: "state"; countryId; region }` ou `{ kind: "country"; countryId }`);
  - `ScoutOffer` (data-model);
  - os campos opcionais `region?`, `pendingRegion?`, `offers?` e `nextOfferSeq?` em `ScoutingState`.

  Em `packages/engine/src/renewal/types.ts`, acrescentar:
  - `origin?: { kind: "scouted"; region: ScoutingRegion; season: number }` em `AcademyPlayer` e `AcademyGraduate`;
  - `scouted?: number` em `AcademyHall`;
  - `scouted?: true` em `AcademyLegend`.

  Criar `packages/engine/src/scouting/recruitment.ts` com as assinaturas de `contracts/engine-recruitment.md` e exportar em `packages/engine/src/index.ts`.
- [X] T002 `DEFAULT_RECRUITMENT` (research R4 e R5, com `offerSteps`) e `recruitmentRules` em `packages/engine/src/scouting/recruitment.ts`. Em `packages/engine/src/model/schemas.ts`, `economy.scouting.recruitment` opcional (limites do contrato), documentado em `docs/mod-format.md` e na cópia `apps/web/public/docs/mod-format.md`.

---

## Phase 2: Foundational

### Testes primeiro

- [X] T003 [P] Criar `packages/engine/test/scouting/recruitment.test.ts` (parte da fundação):
  - `availableRegions` lista os estados com clubes do país do clube, o país do clube e os outros países;
  - `registrationCost`: o estado < o país < outro país, todos proporcionais a `referenceMonthlyPayroll`;
  - `recruitmentRules` usa o mod quando presente.
- [X] T004 [P] Criar `packages/save/test/migrate-v25.test.ts` e a fixture `saveV24` em `packages/save/test/fixtures.ts`:
  - um save v24 abre com `scouting` sem região e sem indicações, igual no resto, e chega à virada seguinte;
  - uma indicação com faixa invertida ou com id igual ao de um jogador do mundo deixa o save corrupto.

### Implementação

- [X] T005 Implementar `availableRegions`, `regionKey` e `registrationCost` em `packages/engine/src/scouting/recruitment.ts`. O `closeScouting` (`packages/engine/src/scouting/state.ts`) passa a limpar `region`, `pendingRegion` e `offers`. Fazer a T003 passar.
- [X] T006 Save v25: `SAVE_FORMAT_VERSION = 25` (`packages/save/src/format.ts`), o schema dos campos novos (opcionais) e a migração `addRecruitment` (v24 → v25, só a versão) em `packages/save/src/migrate.ts`. Na checagem de coerência:
  - ids das indicações distintos e nunca iguais aos de jogadores do mundo ou dos livres;
  - faixas em ordem.

  Atualizar os `formatVersion).toBe(24)` dos testes de migração antigos. Fazer a T004 passar.

**Checkpoint**: tipos, regras e save prontos.

---

## Phase 3: User Story 1 - Região e indicações (Priority: P1) 🎯 MVP

**Goal**: escolher a região e receber indicações nas aberturas de janela.

**Independent Test**: com o departamento aberto, escolher uma região e ver as indicações na janela seguinte, com faixa.

- [X] T007 [P] [US1] Em `packages/engine/test/scouting/recruitment.test.ts`, testar:
  - `setScoutingRegion` recusa com o departamento fechado (`scouting.closed`) e com uma região que não existe (`scouting.invalid_region`), e grava `pendingRegion`;
  - `recruitmentAfterRound` aplica o `pendingRegion` na rodada seguinte e gera indicações só quando `roundsPlayed` é o `fromRound` de uma janela;
  - as indicações têm idade de 15 a 17, a nacionalidade e os nomes do país da região, a faixa que contém o potencial, o prazo `toRound` da janela e o custo;
  - os graus vêm nas indicações dos níveis 4 e 5 e não nas dos níveis 1 a 3;
  - **nada no mundo:** gerar indicações não altera `world.players`, `market.freeAgents`, `academy.players` nem `renewal.nextPlayerSeq`, e os ids são `scout-offer-N`;
  - a mesma chave gera as mesmas indicações.
- [X] T008 [US1] Implementar em `packages/engine/src/scouting/recruitment.ts`:
  - `setScoutingRegion`;
  - `generateOffers`:
    - `createYouth` com um clube virtual de reputação média da região, o `countryId` dela, o regulador do país e o nível da academia `levelBasis`;
    - idade sorteada em `ageRange`;
    - posição sorteada com pesos (GK 1, FB 2, CB 2, DM 2, MF 2, FW 2);
    - a chave `${seed}:scout-offer:${season}:${round}:${regionKey}`;
    - o id provisório;
    - a faixa por `initialEstimate` seguida de `offerSteps(nível)` etapas da 039 (`advanceReport`, com a chave da indicação), e os graus quando `offerSteps ≥ attributeSteps(nível)` (níveis 4 e 5 no padrão);
  - `recruitmentAfterRound` (aplica a pendência, abre e expira).

  Chamar a `recruitmentAfterRound` no gancho `withScoutingRound` de `packages/engine/src/career/day.ts`, só para a liga do clube do técnico, com as regras de mercado da liga (`marketRules`). Fazer a T007 passar.
- [X] T009 [US1] Virada no save (`advanceCareerSeason` em `packages/save/src/career.ts`): depois de `pruneScouting`, aplicar a pendência e gerar as indicações da janela do começo (`fromRound = 0`) da temporada nova; as indicações da temporada anterior somem. Testar em `packages/save/test/scouting.test.ts` (novo): depois da virada, com uma região, há indicações para a temporada nova.
- [X] T010 [US1] Ação `setScoutingRegion` no save (`packages/save/src/scouting.ts`) e no `apps/web/src/game/GameProvider.tsx`. Criar `apps/web/src/ui/market/RecruitmentPanel.tsx` (`contracts/ui-recruitment.md`):
  - o estado fechado;
  - o `select` de região, com a região pendente;
  - a próxima data;
  - a tabela das indicações.

  Incluir o painel em `ScoutingTab.tsx`. Textos `recruitment.*` em `ui.json`. Testar em `apps/web/test/ui/recruitment.test.tsx`.

**Checkpoint**: indicações aparecem na janela certa, fora do mundo.

---

## Phase 4: User Story 2 - Trazer para a base (Priority: P1)

**Goal**: trazer com custo, respeitando vagas, caixa e estrangeiros.

**Independent Test**: trazer um indicado e vê-lo na base como captado; tentar com a base cheia, sem caixa e no limite de estrangeiros.

- [X] T011 [P] [US2] Em `packages/engine/test/scouting/recruitment-sign.test.ts` (arquivo próprio, para rodar em paralelo), testar `signOffer`:
  - cria exatamente 1 jogador novo na base, com o id `playerId(nextPlayerSeq)`, a sequência +1, a faixa da 038 (`withEstimate`) e a origem com a região;
  - o custo entra no livro-caixa na categoria `scouting`;
  - recusa sem vaga (`scouting.academy_full`), sem caixa (`scouting.insufficient_cash`, com `missing`) e com estrangeiro acima do limite contando a base (`scouting.foreign_limit`).

  Em `packages/engine/test/renewal/academy.test.ts`: promover um captado estrangeiro com o elenco no limite falha com `academy.foreign_limit`; um jovem da safra nunca é afetado.
- [X] T012 [US2] Implementar `signOffer` e `foreignCountWithAcademy` em `packages/engine/src/scouting/recruitment.ts`. Em `withGraduates` (`packages/engine/src/renewal/academy.ts`), copiar o `origin` do jovem para o promovido (usado pelo detalhe na T013). Em `promoteFromAcademy` (`packages/engine/src/renewal/academy.ts`), o limite de estrangeiros para jovem estrangeiro (`canSignForeign`), com o erro novo em `AcademyError` e o texto em `ui.json`/`errors`. Fazer a T011 passar.
- [X] T013 [US2] Ações `signScoutOffer` e `declineScoutOffer` no save e no `GameProvider`. Na interface:
  - **Trazer**, com confirmação (custo e caixa depois) e motivos de indisponibilidade em texto, em `RecruitmentPanel.tsx`;
  - a origem "Captado (região)" na aba Base (`apps/web/src/ui/AcademyTab.tsx`);
  - "Captado em {região} ({ano})" no detalhe (`apps/web/src/ui/PlayerDetails.tsx`, `academyOriginText`).

  Testar em `apps/web/test/ui/recruitment.test.tsx`, incluindo trazer em até três ações (SC-006). Estender `apps/web/test/ui/scouting-secrecy.test.tsx` ao painel de captação (com indicações) e à aba Base com um captado: o texto não muda com os valores reais (FR-013a).

---

## Phase 5: User Story 3 - Recusar e expirar sem deixar ninguém (Priority: P1)

**Goal**: SC-001 e SC-002.

**Independent Test**: recusar, deixar expirar, fechar o departamento e trocar de clube; nenhum jogador novo no mundo. A mesma carreira sem região.

- [X] T014 [P] [US3] Em `packages/engine/test/scouting/recruitment-expire.test.ts` (arquivo próprio):
  - `declineOffer` remove a indicação;
  - na rodada em que `roundsPlayed > expiresRound`, as vencidas saem;
  - fechar o departamento e trocar de clube (`clubId`) removem as indicações e a região;
  - nos quatro casos, o conjunto de ids do mundo, dos livres e das bases é idêntico ao de antes, e `nextPlayerSeq` não muda;
  - baixar o nível do departamento (sem fechar) mantém as indicações já recebidas;
  - um captado estrangeiro que chega à idade-limite sai da base na virada como livre, com a nacionalidade dele (regra da 036).
- [X] T015 [US3] Implementar `declineOffer` e a expiração (se ainda faltar). Criar `packages/engine/test/career/recruitment-neutral.test.ts`, no padrão de `scouting-neutral.test.ts`:
  - mesma seed por 2 temporadas, com o departamento aberto no nível 3 e **sem região**, com e sem `recruitmentAfterRound` trocado por uma versão que não faz nada;
  - comparar o mundo, as tabelas, o mercado, a base e o regulador;
  - mais um caso **com região e sem trazer ninguém**: o mundo, as bases e `nextPlayerSeq` iguais aos do caso sem região.
- [X] T016 [P] [US3] Rodar sem `-u`:
  - `packages/engine/test/match/baseline.test.ts`;
  - `packages/engine/test/career/composition-baseline.test.ts`;
  - `packages/engine/test/career/continental-baseline.test.ts`;
  - `packages/save/test/equivalence.test.ts`.

  Se algum mudar, corrigir a causa em vez de regravar.

---

## Phase 6: User Story 4 - A região muda o perfil (Priority: P2)

**Goal**: SC-003 e SC-004.

**Independent Test**: grade por país e por nível; cenário do `sim:economy`.

- [X] T017 [P] [US4] Em `packages/engine/test/scouting/recruitment-grid.test.ts` (arquivo próprio), gerar muitas datas (por exemplo, 200) para o país de clubes de maior e de menor reputação média de `worldBank()`. O país mais forte deve dar força e potencial médios maiores. O nível 5 deve dar mais indicações e uma faixa média mais estreita que o nível 1. Um estado deve dar menos indicações que o país.
- [X] T018 [US4] Cenário "captação" em `tools/src/simulate-economy.ts` (`runRecruitmentScenario`):
  - 10 temporadas, clube de menor reputação, departamento no nível 5, região = o país do clube;
  - traz sempre a indicação de maior centro de faixa quando há vaga e caixa, e promove os captados quando sobra vaga no elenco, como um técnico faria.

  Limites declarados:
  - o potencial médio da base com captação > o sem captação;
  - a força e o potencial médios dos captados ≤ os da safra nível 5 do cenário da 037 (`academyRun(seed, 5, …)`);
  - os registros pagos ≤ 6% da receita da temporada.

  Registrar o resultado em `research.md` (seção "Medidas").

---

## Phase 7: User Story 5 - Captados nas notícias e no histórico (Priority: P3)

**Goal**: FR-010 e FR-011.

**Independent Test**: promover um captado, vê-lo estrear e conferir a manchete e o histórico.

- [X] T019 [P] [US5] Em `packages/engine/test/renewal/hall.test.ts`: `withGraduates` copia `origin` (feito na T012, só o teste aqui); `hall.scouted` soma os captados (também contados em `promoted`); a lenda tem `scouted: true`. Em `packages/engine/test/news/academy-news.test.ts`: a estreia de um captado tem `vars.scouted = "yes"` e `vars.region`.
- [X] T020 [US5] Implementar em:
  - `packages/engine/src/renewal/hall.ts` (`scouted`);
  - `packages/engine/src/news/academy.ts` (variáveis nas três manchetes de cria; o nome da região sai do estado ou do país).

  Templates: um `select` em `scouted` nas variações de `news.academyDebut.*`, `news.academyFirstGoal.*` e `news.academySale.*` em `ui.json`. O card "Crias da base" (`apps/web/src/ui/history/WorldHistory.tsx`) mostra "N crias promovidas, das quais M captadas" e a marca na lista. Fazer a T019 passar e testar o card em `apps/web/test/ui/academy-history.test.tsx`.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T021 [P] Ampliar `apps/web/e2e/scouting.spec.ts`: abrir o nível 5, escolher a região do país, simular até a janela do meio, trazer uma indicação e vê-la na aba Base como captado.
- [X] T022 [P] Documentação:
  - `docs/guia-do-jogador.md`: a captação na seção dos olheiros;
  - `docs/glossario.md`: captação, indicação, captado, região de captação;
  - `docs/arquitetura.md`: o `scouting/recruitment.ts` e a virada no save.
- [X] T023 Rodar, em ordem e sem nada em paralelo:
  - `pnpm lint` e `pnpm typecheck`;
  - a suíte completa sozinha (estouros de tempo conferidos isolados), incluindo `long-run-1` e `long-run-2`, que provam o FR-017 e o SC-005 (o mundo sem técnico não muda);
  - `pnpm build:web` e o e2e completo;
  - `pnpm sim:gates`.
- [X] T024 Release no mesmo PR: `package.json` em 1.13.0 e a nota em `packages/i18n/locales/pt-BR/release-notes.json` com a data de `TZ=America/Sao_Paulo date +%F`. Rodar `pnpm check-release` depois do build.

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → **Foundational (T003–T006)** → histórias.
- **US1 (T007–T010)** depende da fundação.
- **US2 (T011–T013)** depende de T008.
- **US3 (T014–T016)** depende de T008; a T015 também de T012.
- **US4 (T017–T018)** depende de T008; a T018 também de T012.
- **US5 (T019–T020)** depende de T012.
- **Polish (T021–T024)** depende de todas.

### Testes antes da implementação

- T003 e T004 antes de T005 e T006;
- T007 antes de T008;
- T011 antes de T012;
- T014 antes de T015;
- T019 antes de T020.

### Parallel Opportunities

- T003 e T004.
- Depois de T008: T011, T014 e T017.
- T019 em paralelo com US3 e US4 (depois de T012).
- T021 e T022.

## Parallel Example: depois de T008

```text
T011 recruitment-sign.test.ts     [US2]
T014 recruitment-expire.test.ts   [US3]
T017 recruitment-grid.test.ts     [US4]
```

## Implementation Strategy

### MVP (US1, US2 e US3)

1. Fundação: tipos, regras, mod e save v25.
2. US1: a região e as indicações fora do mundo.
3. US2: trazer, com vagas, caixa e estrangeiros.
4. US3: recusar e expirar sem deixar ninguém; neutralidade e linhas de base.
5. **Parar e validar**: escolher a região, receber indicações, trazer uma e confirmar que nada mais entrou no mundo.

### Incremental Delivery

1. MVP.
2. US4: o perfil por país e o cenário do `sim:economy`.
3. US5: manchetes e histórico.
4. Acabamento e release 1.13.0, num PR só.

## Notes

- Nunca regravar as linhas de base nesta feature.
- Os indicados só ganham id de jogador ao serem trazidos.
- Rodar a suíte completa sozinha, sem build ou e2e em paralelo.
