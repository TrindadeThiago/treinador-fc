---

description: "Tarefas da feature 037: academia e investimento na base"
---

# Tasks: Academia e investimento na base

**Input**: Design documents from `/specs/037-academia-da-base/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**:
- Os testes de motor vêm antes do código (Princípio IX).
- O equilíbrio é medido em simulação longa, com limites declarados (Princípio V):
  - `sim:economy` (SC-002, SC-003);
  - o teste de 30 temporadas e os estaduais (critérios da 036 e crise);
  - a continental em 3 seeds.
- O save v22 tem migração e fixture (Princípio VI).
- Na interface: testes de componente e o e2e da base.

**Organization**:
- US1 e US2 (P1);
- US3, US5 e US6 (P2);
- US4 e US7 (P3).

A fundação leva as regras, os níveis, os custos, a manutenção e o save v22 com a base inicial cheia, porque todas as histórias dependem do nível existir e da base começar com 15 jovens.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem depender de tarefa incompleta)
- **[Story]**: história da spec (US1 a US7)

---

## Phase 1: Setup

- [ ] T001 Criar `packages/engine/src/renewal/academy-levels.ts` com os tipos `AcademyLevelRule` e `AcademyClub` e as assinaturas do contrato `contracts/engine-academy-levels.md`, com corpos "não implementado". Em `packages/engine/src/renewal/types.ts`, acrescentar `clubs: Record<string, AcademyClub>` a `AcademyState` (e `emptyAcademy` em `academy.ts` com `clubs: {}`). Exportar em `packages/engine/src/index.ts`.
- [ ] T002 Declarar `DEFAULT_ACADEMY_LEVELS` em `packages/engine/src/renewal/academy-levels.ts` com a tabela do research R2 (reputação mínima, vagas, jovens por safra, ajuste de força, bônus de potencial, bônus de evolução, manutenção em % e folhas da obra). Em `packages/engine/src/model/schemas.ts`, acrescentar `economy.academy.levels` opcional (Zod: exatamente 5 entradas, campos do data-model) e o tipo correspondente em `model/types.ts`.

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**:
- regras e níveis pela reputação;
- folha de referência e custos;
- categoria `academy` com manutenção por rodada;
- limite de vagas pelo nível;
- base inicial cheia;
- save v22.

### Testes primeiro

- [ ] T003 [P] Criar `packages/engine/test/renewal/academy-levels.test.ts`:
  - `academyRules` devolve o padrão sem `economy.academy` e as regras do mod quando declaradas;
  - `levelForReputation` segue as faixas (29 → 1, 30 → 2, 45 → 3, 65 → 4, 80 → 5);
  - `academyClub` sem registro devolve o nível da reputação;
  - `academyLimit` dá 15, 15, 15, 20 e 25;
  - `referenceMonthlyPayroll` depende só da reputação e do fator do país (igual antes e depois de uma contratação) e usa o fator regional nos clubes só regionais;
  - `academyMaintenance` é 2% a 10% da folha de referência;
  - `academyUpgradeCost` vai de 2 a 6 folhas, arredondado a 1 000;
  - validação do mod (em `packages/engine/test/validation/`): `economy.academy.levels` com 5 entradas válidas é aceito; com 4 entradas ou um campo inválido é recusado, com mensagem que aponta o campo; um mod sem a seção continua válido.
- [ ] T004 [P] Criar `packages/engine/test/finance/academy-maintenance.test.ts`:
  - na rodada, todo clube da liga e todo clube só regional paga `wageInstalment` da manutenção anual na categoria `academy`;
  - a soma da temporada dá 12 manutenções mensais;
  - `totals.academy` aparece no resumo (`summary.ts`) e na previsão (`forecast.ts`);
  - o caixa negativo não impede a cobrança;
  - a manutenção entra no caixa que as metas financeiras da diretoria avaliam (`packages/engine/src/board/goals.ts`: "não negativar" e "manter caixa"), sem mudar o cálculo das metas.
- [ ] T005 [P] Em `packages/engine/test/renewal/academy-levels.test.ts`, acrescentar `seedAcademies`:
  - cada clube fica com exatamente 15 jovens na base, 3 de cada idade de 15 a 19 na data da temporada;
  - a qualidade média sobe com o nível;
  - as posições seguem a carência de elenco mais base;
  - uma base com 4 jovens recebe só 11;
  - os ids seguem `nextPlayerSeq`, sem repetir o mundo nem os livres;
  - a mesma seed dá a mesma base;
  - nenhum jogador entra em `world.players`.
- [ ] T006 [P] Criar `packages/save/test/migrate-v22.test.ts` e a fixture `saveV21` em `packages/save/test/fixtures.ts` (padrão de `saveV20`, sem `academy.clubs` e com a base da 1.9.0):
  - v21 → v22 cria o nível de cada clube pela reputação, sem pendente;
  - a migração completa cada base até 15 sem tirar ninguém;
  - a carreira avança até a virada;
  - a validação recusa nível fora de 1–5, pendente incoerente e clube inexistente.

### Implementação

- [ ] T007 Implementar em `packages/engine/src/renewal/academy-levels.ts`:
  - `academyRules`, pelo país do clube via `rulesCompetitionOf` e com o padrão como reserva;
  - `levelForReputation`, `academyClub`, `academyLimit`;
  - `referenceMonthlyPayroll` (research R3), com `deriveWage` de um jogador típico e o fator do país ou o regional, como em `annualWageBill`;
  - `academyMaintenance`, `academyUpgradeCost` e `academyEffect`.

  Faz passar T003.
- [ ] T008 Em `packages/engine/src/finance/types.ts`, acrescentar `"academy"` a `LEDGER_CATEGORIES`. Em `packages/engine/src/finance/round.ts`, cobrar a manutenção por rodada nos mesmos dois laços da folha (clubes da liga; clubes só regionais nas rodadas da divisão mais longa), com `wageInstalment(12 × manutenção mensal, …)`. A função de rodada recebe a academia: passar `renewal?.state.academy` para `applyRoundFinances`. Incluir a categoria em `packages/engine/src/finance/forecast.ts` (manutenção restante da temporada) e conferir `summary.ts` e `turnover.ts`. Faz passar T004.
- [ ] T009 Trocar o limite fixo da 036 (`ACADEMY_RULES.maxPlayers`) por `academyLimit` (o limite do nível do clube) em todos os pontos:
  - motor: `rosterIssues` em `packages/engine/src/renewal/academy.ts` e o excedente da IA em `packages/engine/src/renewal/youth.ts`;
  - web: `academyCapacity` em `apps/web/src/game/academy-view.ts`;
  - critério do teste de 30 temporadas em `packages/engine/test/renewal/long-run.ts`: cada base fica ≤ o limite do nível do próprio clube (guardar o maior excesso por clube, não o maior tamanho);
  - testes: `packages/engine/test/renewal/academy.test.ts`, `academy-turnover.test.ts`, `youth.test.ts`, `packages/save/test/academy.test.ts` e `apps/web/test/ui/academy.test.tsx`.

  Manter `ACADEMY_RULES.maxPlayers` só como o limite dos níveis 1 a 3 (ou removê-lo, se nada mais o usar).
- [ ] T010 Implementar `seedAcademies` em `packages/engine/src/renewal/academy-levels.ts` (research R6), reaproveitando `createYouth` com idade fixa e a qualidade do nível. Se `createYouth` só sorteia a idade, acrescentar um parâmetro opcional de idade em `packages/engine/src/renewal/youth.ts`. Faz passar T005.
- [ ] T011 Save v22:
  - `packages/save/src/format.ts`: `SAVE_FORMAT_VERSION = 22`;
  - `packages/save/src/migrate.ts`: `addAcademyLevels` (`from: 21`), com `academy.clubs` pela reputação e `seedAcademies`, e a validação de níveis e pendentes;
  - `packages/save/src/create.ts` e `initialRenewal` (`packages/engine/src/renewal/measure.ts`): toda carreira nova já nasce com `academy.clubs` preenchido para **todos** os clubes, com o nível da reputação e sem pendente. Em seguida, `createSave` chama `seedAcademies`. Assim nenhum clube fica sem registro, e a etapa da IA nunca precisa adivinhar o nível de partida.

  Atualizar os testes `migrate-v*.test.ts` que fixam `formatVersion).toBe(21)` para 22. Faz passar T006.
- [ ] T012a Atualizar os testes que esperavam a base vazia numa carreira nova (FR-004b):
  - `apps/web/e2e/academy.spec.ts`: o passo "Primeira temporada: a base está vazia" passa a conferir os 15 jovens iniciais;
  - `apps/web/e2e/screens-list.ts`: o item "/jogo/elenco/ (base)" espera a lista, e não o estado vazio;
  - `apps/web/test/ui/academy.test.tsx`: o teste "estado vazio antes da primeira virada" passa a montar uma base esvaziada à mão. O estado vazio continua existindo para a base que o técnico esvazia.
- [ ] T012 Medida imediata do risco da base cheia: rodar `packages/engine/test/renewal/long-run-1.test.ts`, `long-run-2.test.ts`, `packages/engine/test/worldgen/regional-long-run.test.ts` e `pnpm sim:world --seasons 10`. Anotar em `specs/037-academia-da-base/research.md` (seção "Medição da base cheia") livres, população, folha da IA e crise. Se algum critério da 036 quebrar só pela base cheia, decidir ali, com justificativa, entre rever o limite e mudar a regra (ex.: a IA solta como livre quem sai por idade e não cabe no elenco).

**Checkpoint**: todo clube tem nível e manutenção, e a base começa cheia; saves v21 abrem.

---

## Phase 3: User Story 1 - Ver a academia do clube (Priority: P1) 🎯 MVP

**Goal**: o painel mostra o nível, a manutenção, o efeito (com o próximo nível) e as vagas.

**Independent Test**: carreira nova → Elenco → Base: a base tem 15 jovens, e o painel mostra o nível, o custo mensal e o efeito.

- [ ] T013 [P] [US1] Em `apps/web/src/game/academy-view.ts`, criar o seletor `academyPanelView(save)`, com testes em `apps/web/test/game/academy-view.test.ts`. Ele devolve:
  - o nível;
  - a manutenção mensal;
  - o efeito do nível atual e o do próximo (`academyEffect`);
  - o limite de vagas;
  - a pendente;
  - o custo da obra;
  - o caixa;
  - se pode melhorar ou baixar, e por quê.

  `academyCapacity` passa a usar `academyLimit`.
- [ ] T014 [P] [US1] Acrescentar em `packages/i18n/locales/pt-BR/ui.json` as chaves de `contracts/academy-panel.md`:
  - `academy.panel.*`;
  - `academy.quality.1` a `.5` (modesta, boa, muito boa, excelente, de elite);
  - `academy.panel.youthPerIntake` com plural;
  - `finance.category.academy` ("Academia").
- [ ] T015 [US1] Criar `apps/web/src/ui/AcademyPanel.tsx` e `.module.css`:
  - nível "Nível {n} de 5" com `Meter`;
  - manutenção;
  - efeito com o próximo nível;
  - pendente.

  Inserir no topo de `apps/web/src/ui/AcademyTab.tsx`. Teste de componente em `apps/web/test/ui/academy-panel.test.tsx`. Mostrar a categoria `academy` em `apps/web/src/ui/FinanceTables.tsx` e `apps/web/src/game/finance-series.ts`.

---

## Phase 4: User Story 2 - Melhorar a academia (Priority: P1)

**Goal**: melhorar pagando a obra na hora; o nível sobe na virada, antes da safra.

**Independent Test**: melhorar, ver o custo em Finanças e a obra no painel; na virada, o nível sobe e a safra usa o nível novo.

- [ ] T016 [P] [US2] Em `packages/engine/test/renewal/academy-levels.test.ts`, acrescentar `upgradeAcademy`:
  - lança o custo em `academy` na hora e grava `pending: { kind: "upgrade", cost }`;
  - recusa `academy.max_level` no 5, `academy.pending_change` com pendente e `academy.insufficient_cash` (com o valor que falta).
- [ ] T017 [P] [US2] Criar `packages/engine/test/renewal/academy-levels-turnover.test.ts`:
  - a etapa `academy-levels` roda depois de `academy-open` e antes de `regulate-world`;
  - a obra paga sobe o nível antes de `generate-youth`, e a safra usa a quantidade e o limite do nível novo (SC-001);
  - a manutenção da temporada nova usa o nível novo.
- [ ] T018 [US2] Implementar `upgradeAcademy` e a etapa `academyLevelsStep` em `packages/engine/src/renewal/academy-levels.ts`, com a parte do pendente do técnico, e registrá-la com `perCountry` em `DEFAULT_TURNOVER_STEPS` e `TURNOVER_STEP_IDS` de `packages/engine/src/career/turnover.ts`. Atualizar as listas de etapas em `packages/engine/test/career/turnover-steps.test.ts`, `turnover.test.ts` e `packages/engine/test/finance/turnover.test.ts`. Faz passar T016 e T017.
- [ ] T019 [US2] Fazer o save e a web:
  - save: `upgradeYouthAcademy` em `packages/save/src/academy.ts`, exportado, com testes em `packages/save/test/academy.test.ts`;
  - web: o comando `upgradeAcademy` em `apps/web/src/game/GameProvider.tsx`, e o botão Melhorar e o `Dialog` no `AcademyPanel.tsx`, conforme o contrato (custo, manutenção atual → nova, caixa depois, "na virada"), desabilitado com motivo.

---

## Phase 5: User Story 3 - Baixar a academia (Priority: P2)

**Goal**: baixar na virada, sem devolução, e com a redução cancelável.

**Independent Test**: baixar, cancelar, baixar de novo; na virada o nível e a manutenção caem.

- [ ] T020 [P] [US3] Em `academy-levels.test.ts` e `academy-levels-turnover.test.ts`, acrescentar:
  - `downgradeAcademy` (`academy.min_level`, `academy.pending_change`);
  - `cancelAcademyChange` (cancela a redução; recusa `academy.upgrade_paid` e `academy.no_pending`);
  - na virada, a redução tira um nível;
  - com a base acima do novo limite, a IA solta como livres os de menor utilidade e o técnico fica com o bloqueio da 036.
- [ ] T021 [US3] Implementar `downgradeAcademy`, `cancelAcademyChange` e a parte da redução e do excedente em `academyLevelsStep`. No save, `downgradeYouthAcademy` e `cancelYouthAcademyChange`. Na web, o botão Baixar, o `Dialog` (com o aviso de vagas) e "Cancelar redução" no `AcademyPanel.tsx`. Faz passar T020.

---

## Phase 6: User Story 5 - A academia faz diferença (Priority: P2)

**Goal**: a safra e a evolução pelo nível, com o nível 5 rendendo mais, sem virar máquina de dinheiro.

**Independent Test**: `pnpm sim:economy` com o cenário de níveis 1 e 5.

- [ ] T022 [P] [US5] Em `packages/engine/test/renewal/youth.test.ts`, verificar:
  - a quantidade da safra pelo nível (1, 1, 2, 3, 4);
  - a força e o potencial médios crescem com o nível em 30 seeds;
  - o peso da reputação caiu (dois clubes de mesma academia e reputações diferentes ficam mais próximos que antes).

  Em `packages/engine/test/renewal/academy.test.ts`, verificar que `evolveAcademy` aplica o bônus de evolução do nível.
- [ ] T023 [US5] Em `packages/engine/src/renewal/youth.ts`, `generateYouth` usa o nível (quantidade, ajuste de força, bônus de potencial) e `YOUTH_RULES.strength.perReputation` passa de 0,12 para 0,06, com `base` compensada. Em `packages/engine/src/renewal/academy.ts`, `evolveAcademy` recebe o bônus por clube. A chamada da evolução fica em `turnover.ts` e em `finance/round.ts`. Faz passar T022.
- [ ] T024 [US5] Em `tools/src/simulate-economy.ts`, criar o cenário "academia" com limites declarados: um clube pequeno com a academia fixa no nível 1 e outra carreira no nível 5 (o técnico melhora e paga), em 10 temporadas. Ele mede jovens por safra, força e potencial médios, receita das vendas das crias e custo da academia. Limites: SC-002 (≥ 1,5× os jovens) e SC-003 (vendas < custo).

---

## Phase 7: User Story 6 - Um mundo que continua saudável (Priority: P2)

**Goal**: a IA segue a reputação, a manutenção não quebra ninguém e os critérios da 036 continuam.

**Independent Test**: 30 temporadas, os estaduais e a continental em 3 seeds, verdes.

- [ ] T025 [P] [US6] Em `academy-levels-turnover.test.ts`, verificar:
  - na IA, o nível anda um degrau rumo a `levelForReputation`, sem lançar obra;
  - no clube que o técnico deixou, a obra paga termina, a redução é cancelada e depois vale a regra da IA.
- [ ] T026 [US6] Implementar a parte da IA e a do clube deixado em `academyLevelsStep`. Faz passar T025.
- [ ] T027 [US6] Em `packages/engine/test/renewal/long-run.ts`, acrescentar o nível médio da IA e a manutenção sobre a receita, e rodar os dois mundos de 30 temporadas, os estaduais (`worldgen/regional-long-run.test.ts`) e `pnpm sim:world --seasons 30`. Calibrar em `packages/engine/src/renewal/academy-levels.ts` (faixas de reputação, quantidades, percentuais) e em `YOUTH_RULES` até passar, registrando as medidas em `research.md` ("Calibragem").
- [ ] T028 [US6] Rodar a continental completa em 3 seeds (`pnpm sim:world --scale --countries 5 --seasons 30 --continental --seed padrao|var-a|var-b`) e `pnpm sim:gates`. Comparar com as médias da 1.9.0 (vagas × títulos 0,13; prêmios 16,4%) e registrar em `research.md`. Tolerância: média da correlação nas 3 seeds ≥ 0, e prêmios ≤ 18,1% (o valor da `main` da 1.8.1) em cada seed.
- [ ] T029 [US6] Regravar as linhas de base (`equivalence-baseline.json`, snapshots de composição e continental) depois de conferir que a primeira temporada difere só pela manutenção e pela base inicial. Explicar no commit e no `research.md`.

---

## Phase 8: User Story 4 - Comparar com a divisão (Priority: P3)

- [ ] T030 [US4] Implementar `divisionAcademies` em `packages/engine/src/renewal/academy-levels.ts` (clubes da divisão do técnico com o nível, ordenados pelo nível e pelo nome), com teste. Na web, um `details` "Academias da divisão" no `AcademyPanel.tsx`, com o próprio clube marcado em texto e nada dos jovens alheios (036 FR-014a). Incluir no teste de componente.

---

## Phase 9: User Story 7 - Continuar uma carreira da 1.9.0 (Priority: P3)

- [ ] T031 [US7] Em `packages/save/test/migrate-v22.test.ts`, acrescentar uma carreira longa v21 (`saveV21({ seasons: 1 })`) que migra e passa por duas viradas. Em `apps/web/e2e/save-file.spec.ts`, conferir que o save antigo importado abre com a academia.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T032 [P] Ampliar `apps/web/e2e/academy.spec.ts`: a base com 15 jovens na carreira nova, melhorar a academia pelo teclado (no máximo três ações, SC-007), ver a obra no painel e "Academia" em Finanças, e baixar e cancelar. Incluir o painel em `a11y.spec.ts` e no layout de 768 px (via `screens-list.ts`).
- [ ] T033 [P] Medir o tamanho do save (`packages/save/test/long-career.test.ts`, `football-world-scale.test.ts`) e o tempo de criação da carreira no mundo padrão com a base cheia, contra as metas da 020. Registrar no PR.
- [ ] T034 [P] Documentação:
  - `docs/guia-do-jogador.md`: academia, níveis, custos, vagas e base inicial, corrigindo o trecho da 036 que diz "até 15 vagas" e "os jovens chegam na virada" (a base agora começa cheia e as vagas dependem do nível);
  - `docs/mod-format.md`: `economy.academy.levels`, com a tabela e os padrões;
  - `docs/glossario.md`: academia, nível da academia, manutenção;
  - `docs/arquitetura.md`: `academy-levels.ts` e a etapa nova.
- [ ] T035 Rodar o quickstart inteiro: `pnpm lint`, `pnpm typecheck`, a suíte completa, `pnpm build:web` e o e2e completo. Conferir em prints o painel e os diálogos em 1440 e 768 px, nos dois temas.
- [ ] T036 Release no mesmo PR: `package.json` em 1.10.0 e uma nota em `packages/i18n/locales/pt-BR/release-notes.json` com a data de `TZ=America/Sao_Paulo date +%F` (academia, investimento, base inicial cheia, vagas por nível). Rodar `pnpm check-release` depois do build.

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → **Foundational (T003–T012, com T012a)** → histórias.
- **US1 (T013–T015)** depende da fundação.
- **US2 (T016–T019)** depende da US1 (o painel onde ficam as ações).
- **US3 (T020–T021)** depende da US2 (a etapa `academy-levels`).
- **US5 (T022–T024)** depende da fundação e pode correr junto da US1.
- **US6 (T025–T029)** depende de US2, US3 e US5 (calibra tudo junto).
- **US4 (T030)** depende da US1. **US7 (T031)** depende da T011.
- **Polish (T032–T036)** depende de todas.

### Testes antes da implementação

- T003–T006 antes de T007–T011;
- T016 e T017 antes de T018;
- T020 antes de T021;
- T022 antes de T023;
- T025 antes de T026.

### Parallel Opportunities

- T003 a T006 (arquivos diferentes).
- T013 e T014; T016 e T017.
- A US5 (motor) em paralelo com a US1 (web).
- T032, T033 e T034.

## Parallel Example: Foundational

```text
T003 packages/engine/test/renewal/academy-levels.test.ts
T004 packages/engine/test/finance/academy-maintenance.test.ts
T006 packages/save/test/migrate-v22.test.ts
```

## Implementation Strategy

### MVP (US1 e US2)

1. Fundação: níveis, custos, manutenção, base cheia, save v22 e a medição imediata (T012).
2. US1: o painel.
3. US2: melhorar e a virada.
4. **Parar e validar**: carreira nova, melhorar e passar a virada.

### Incremental Delivery

1. MVP.
2. US5 e US3: o efeito da safra e baixar.
3. US6: a calibragem, que é o maior risco.
4. US4 e US7.
5. Polish e release 1.10.0, num PR só.

## Notes

- A T012 mede cedo o risco da base cheia, para a calibragem não ficar toda para o fim.
- A continental é sempre comparada em 3 seeds, porque é ruidosa (036 I7).
- Commit por tarefa ou grupo lógico.
