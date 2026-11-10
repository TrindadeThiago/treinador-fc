# Implementation Plan: Olheiros e relatórios de jogadores

**Branch**: `039-olheiros-relatorios` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/039-olheiros-relatorios/spec.md`

## Summary

Um módulo novo, `scouting/`, com o estado `ScoutingState` na carreira e no save (research R1):
- o departamento do clube do técnico, que **começa fechado** (nível 0);
- a lista de observação;
- os relatórios, que seguem o técnico.

**Avanço do relatório:** uma etapa por rodada da liga principal do país do jogador, chamada no fim de `applyRoundSystems` (R2). A faixa reaproveita `initialEstimate` e `narrowEstimate` da 038, com a chave própria `seed:scout:temporada:rodada:jogador`:
- largura inicial 24;
- redução de 1 a 5 por etapa e largura mínima de 14 a 6, pelo nível (R3).

**Temperamento e propensão:** guardados só como grau de 1 a 3, depois de metade das etapas da observação completa (R4).

**Relatório automático:** vale para o elenco do técnico, mesmo com o departamento fechado, e parte da faixa da promoção (R5).

**Teto:** 300 relatórios, com poda na virada. A troca de clube fecha o departamento (R6).

**Custo:** em parcelas por rodada, na categoria nova `scouting`, só com o nível ≥ 1 (R7). Com o departamento fechado, a carreira é idêntica à da 1.11, e as linhas de base **não** mudam (R8).

**Interface:** aba Observação no Mercado, colunas e filtro na busca, e o relatório no detalhe.

**Save e versão:** save v24 e versão 1.12.0.

## Technical Context

**Language/Version**: TypeScript 5 (`strict`), Node 22

**Primary Dependencies**: motor próprio, Zod 4, Next.js 16 (static export) e React 19; nenhuma dependência nova

**Storage**: save v23 → v24 (`scouting`); formato de mod com `economy.scouting` opcional

**Testing**: Vitest (motor, save, web), Playwright, `sim:gates`, `sim:size`; as linhas de base existentes como prova de neutralidade

**Target Platform**: navegador (PWA offline)

**Project Type**: monorepo pnpm (motor + save + i18n + web + tools)

**Performance Goals**: até 16 observações e cerca de 30 jogadores do elenco por rodada, cada um com um `createRng`; a rodada e a virada ficam nas metas da 020

**Constraints**:
- determinismo;
- nenhum resultado muda com o departamento fechado;
- sigilo dos ocultos;
- tetos do save (5,5 MB e 42 MB).

**Scale/Scope**:
- motor: 1 módulo novo (5 arquivos), 1 categoria do livro-caixa, 1 etapa da virada e o gancho na rodada;
- save: v24 e 3 comandos;
- web: 1 aba, colunas e filtro, o bloco no detalhe e os diálogos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Motor separado:** regras, estado, avanço e custo ficam no motor; a web só lê views e dispara comandos pelo save.
- [x] **II. Determinismo:** sementes por chave própria; com o departamento fechado, a carreira é idêntica (teste de neutralidade e linhas de base intactas).
- [x] **III. Dados, não código:** os níveis e as larguras são regras com padrão, opcionais no mod e validadas por Zod.
- [x] **IV. Sem conteúdo protegido:** nada novo de nomes ou marcas.
- [x] **V. Balanceamento verificável:** a contenção e a largura são medidas na grade e na carreira longa; o custo, no `sim:economy` do clube do técnico; a IA não muda.
- [x] **VI. Saves versionados:** v24 com migração, fixture `saveV23` e validação.
- [x] **VII. i18n:** textos e graus em `ui.json`, com plural.
- [x] **VIII. Offline e gratuito:** sem rede.
- [x] **IX. Testes primeiro no motor:** propriedades da faixa, comandos, avanço por país, custo e migração antes do código.

**Re-check após o design**: mantido. O estado separado (R1) é o que permite provar a neutralidade trocando um módulo.

## Project Structure

### Documentation (this feature)

```text
specs/039-olheiros-relatorios/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── engine-scouting.md
│   └── ui-scouting.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/scouting/
├── types.ts       # ScoutingState, Observation, ScoutReport
├── rules.ts       # DEFAULT_SCOUTING, scoutingRules, stepsToComplete, attributeSteps, scoutingCost
├── state.ts       # emptyScouting, setScoutingLevel, watchPlayer, unwatchPlayer, closeScouting
├── round.ts       # scoutingAfterRound, scoutingTurnoverStep (poda e teto)
└── view.ts        # scoutReportOf, scoutingPanel
packages/engine/src/career/season-state.ts, career/turnover.ts, career/day.ts  # estado, etapa e passagem do estado
packages/engine/src/finance/{types,round,forecast,summary}.ts                # categoria scouting
# troca de clube: sem gancho na diretoria; o ScoutingState guarda o clubId do departamento (tasks.md)
packages/engine/src/model/schemas.ts, validation/                           # economy.scouting
packages/engine/test/scouting/{rules,state,round,report}.test.ts            # novos
packages/engine/test/career/scouting-neutral.test.ts                        # novo (SC-004)
packages/save/src/{format,migrate,scouting}.ts                              # v24 e ações
packages/save/test/{migrate-v24.test.ts,fixtures.ts}                        # saveV23
apps/web/src/app/jogo/mercado/page.tsx
apps/web/src/ui/market/{ScoutingTab.tsx,MarketTable.tsx,MarketFilters.tsx,MarketPlayerModal.tsx}
apps/web/src/ui/{ScoutReport.tsx,PlayerDetails.tsx,PlayerModal.tsx,FinanceTables.tsx}
apps/web/src/game/{scouting-view.ts,GameProvider.tsx}
apps/web/test/ui/{scouting-tab,scouting-secrecy}.test.tsx, apps/web/e2e/scouting.spec.ts
packages/i18n/locales/pt-BR/{ui,errors,release-notes}.json
docs/{guia-do-jogador,mod-format,glossario,arquitetura}.md, apps/web/public/docs/mod-format.md
package.json                                                                 # 1.12.0
```

**Structure Decision**: um módulo de motor próprio, ao lado de `renewal/`. Ele reaproveita `renewal/estimate.ts`, não mexe nele, e a 038 fica intacta.

## Fases (para o /speckit-tasks)

1. **Fundação:**
   - tipos, regras e estado;
   - comandos, com os testes primeiro;
   - categoria `scouting` nas finanças;
   - save v24.
2. **US1 e US2 (observar e precisão):**
   - avanço por rodada e por país;
   - grade nível × etapa;
   - aba Observação.
3. **US7 (neutralidade e sigilo):** teste de neutralidade, linhas de base intactas e teste de sigilo na web.
4. **US3 (atributos em texto)** e **US5 (custo e mudança de nível).**
5. **US4 (mercado):** colunas, filtro e ação Observar.
6. **US6 (elenco próprio):** relatório automático e ponto de partida na faixa da promoção.
7. **Fechamento:**
   - troca de clube e virada (poda);
   - e2e, a11y e layout;
   - `sim:gates` com o cenário de olheiros;
   - documentação;
   - nota de versão e 1.12.0.

## Riscos

- **Neutralidade:** um lançamento de custo zero no livro-caixa mudaria o save e as linhas de base. Mitigação: nenhum lançamento com o nível 0, e o teste compara o livro-caixa.
- **Tamanho do save:** o relatório automático de todos os elencos que o técnico treinou pode crescer. Mitigação: só o elenco atual e os observados contam fora do teto, e a poda é medida no `sim:size`.
- **Liga de cada país:** o relatório de um jogador de um país com calendário diferente avança no ritmo da liga dele, o que é a regra da spec. O teste de avanço cobre dois países.

## Complexity Tracking

Sem violações da constituição.
