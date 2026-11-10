# Implementation Plan: Potencial estimado e revelações da base

**Branch**: `038-potencial-estimado-revelacoes` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/038-potencial-estimado-revelacoes/spec.md`

## Summary

**Faixa de potencial:**
- cada jovem da base ganha uma faixa guardada (`estimate: { low, high }`), criada na chegada e estreitada uma vez por virada numa etapa nova, `academy-estimates` (research R1, R4);
- a faixa nova é sorteada dentro da anterior, com largura `min(atual, W(nível, tempo))` e `low ≥ força`;
- a sorte é própria, por chave (`${seed}:estimate:${season}:${playerId}`). Assim a faixa sempre contém o valor real, só encolhe, não permite deduzir o valor de faixas seguidas e não muda nenhum resultado (R2);
- as larguras padrão vão de 20 (nível 1, recém-chegado) a 6 (nível 5, dois anos), como campos opcionais do nível da academia no mod (R3).

**Promoção:** o promovido do clube do técnico leva a faixa congelada, além da safra (`joinedSeason`) e da força máxima (`peak`) (R5).

**Revelação da safra:** nova etapa `news-academy` na rodada 0. A revelação é o jovem da safra anterior com a maior força atual, no clube do técnico e na divisão (R6).

**Crias nas manchetes:** estreia, primeiro gol e venda, detectados nas funções de notícia com a máscara `news.crias` (R7).

**Fim de temporada:** bloco Base derivado dos dados da 036 (R8).

**Histórico:** `hall` por clube, com o total promovido e as 5 maiores revelações (R9).

**Save e versão:** save v23 e versão 1.11.0. As linhas de base existentes **não mudam** (R10).

## Technical Context

**Language/Version**: TypeScript 5 (`strict`), Node 22

**Primary Dependencies**: motor próprio, Zod 4 (save e mod), Next.js 16 em static export e React 19; nenhuma dependência nova

**Storage**: save v22 → v23 (`estimate` nos jovens; `joinedSeason`, `estimate` e `peak` nos graduates; `academy.hall`; `news.crias`); mod com `estimateWidth` e `estimateShrink` opcionais por nível

**Testing**: Vitest (motor, save, web), Playwright (e2e e a11y), `sim:world`, `sim:size`, e as linhas de base existentes como prova de neutralidade

**Target Platform**: navegador (PWA offline)

**Project Type**: monorepo pnpm (motor + save + i18n + web + tools)

**Performance Goals**: a etapa `academy-estimates` faz um `createRng` por jovem (cerca de 6 600 no mundo padrão), o mesmo custo da evolução; a virada fica dentro das metas da 020.

**Constraints**:
- determinismo;
- a faixa não altera nenhum resultado, e as linhas de base não são regravadas;
- o potencial real não aparece na interface;
- tetos do save (5,5 MB e 42 MB);
- nenhum jogador criado direto no elenco (sem mudança).

**Scale/Scope**:
- motor: 1 módulo novo (`renewal/estimate.ts`), 2 etapas novas da virada, 4 tipos de manchete, o seletor do bloco Base e o `hall`;
- save: v23 e a fixture `saveV22`;
- web: coluna e filtro na aba Base, linhas no detalhe do jogador, o bloco Base e o card de crias no histórico.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Motor separado:** faixa, revelação, crias, relatório e histórico ficam no motor; a web só lê.
- [x] **II. Determinismo:** semente por chave para a faixa, sem consumir a sorte do jogo; desempates fixos na revelação; um teste mostra a mesma carreira com e sem a feature.
- [x] **III. Dados, não código:** larguras por nível como regra com padrão, opcionais no mod e validadas por Zod.
- [x] **IV. Sem conteúdo protegido:** só templates e nomes fictícios.
- [x] **V. Balanceamento verificável:** a faixa não mexe no equilíbrio; contenção e largura medidas em testes de propriedade, na carreira longa e no `sim:world` (FR-021).
- [x] **VI. Saves versionados:** v23 com migração e fixture `saveV22`.
- [x] **VII. i18n:** textos e manchetes em `ui.json`, com plural e gênero; a faixa tem rótulo por extenso.
- [x] **VIII. Offline e gratuito:** sem rede.
- [x] **IX. Testes primeiro no motor:** propriedades da faixa, etapas, manchetes e migração, antes do código.

**Re-check após o design**: mantido. A faixa guardada (R1) é o que permite cumprir FR-005 sem vazar o valor real.

## Project Structure

### Documentation (this feature)

```text
specs/038-potencial-estimado-revelacoes/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── engine-potential-estimate.md
│   └── ui-academy-estimate.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/renewal/
├── estimate.ts          # novo: largura, faixa inicial, estreitamento, withEstimate, academyEstimatesStep
├── types.ts             # PotentialEstimate, AcademyPlayer.estimate, AcademyGraduate.{joinedSeason,estimate,peak}, AcademyState.hall
├── academy.ts           # withGraduates (técnico, peak, hall), academyHallOf, academySeasonReport, promoção/emergência com faixa
├── academy-levels.ts    # estimateWidth/estimateShrink nas regras; seedAcademies com faixa
├── youth.ts             # safra com faixa
└── turnover.ts          # emergência com faixa; academyCloseStep (peak, hall, poda de crias)
packages/engine/src/news/{types,round,turnover,academy}.ts   # tipos novos, crias, academySale, newsAcademyStep, academyRevelation
packages/engine/src/career/{turnover,day}.ts, finance/round.ts  # registrar as etapas; passar graduates às notícias
packages/engine/src/model/schemas.ts                          # campos opcionais do mod
packages/engine/test/renewal/estimate.test.ts                 # novo
packages/engine/test/news/academy-news.test.ts                # novo
packages/engine/test/career/estimate-neutral.test.ts          # novo (SC-005)
packages/save/src/{format,migrate}.ts                         # v23
packages/save/test/{migrate-v23.test.ts,fixtures.ts}          # saveV22
apps/web/src/ui/{AcademyTab.tsx,PlayerDetails.tsx}
apps/web/src/ui/season/AcademySeason.tsx                      # novo
apps/web/src/ui/history/WorldHistory.tsx                      # card de crias
apps/web/src/app/jogo/fim-de-temporada/page.tsx
apps/web/src/game/{academy-view.ts,news-view.ts}
apps/web/test/ui/{academy-tab,academy-season,potential-secrecy}.test.tsx
apps/web/e2e/academy.spec.ts, a11y.spec.ts
packages/i18n/locales/pt-BR/{ui,release-notes}.json
tools/src/{simulate-world,measure-save}.ts
docs/{guia-do-jogador,mod-format,glossario,arquitetura}.md
package.json                                                   # 1.11.0
```

**Structure Decision**: monorepo existente. A faixa é um submódulo da renovação, ao lado da base (036) e da academia (037). As manchetes seguem o padrão das etapas `news-*` da virada.

## Fases (para o /speckit-tasks)

1. **Fundação:**
   - tipos e regras de largura;
   - `estimate.ts`, com os testes de propriedade primeiro;
   - faixa em todos os pontos de criação;
   - etapa `academy-estimates`;
   - save v23 com migração.
2. **US1 e US2 (ver a faixa e o estreitamento):** coluna, ordenação e filtro; grade nível × tempo; contenção na carreira longa e no `sim:world`.
3. **US6 (neutralidade e sigilo):** teste com e sem a feature; linhas de base intactas; varredura do potencial-sentinela na web.
4. **US3 (revelação):** `academyRevelation` e a etapa `news-academy`, com os templates.
5. **US4 (bloco Base):** `academySeasonReport` e `AcademySeason`.
6. **US5 (crias):**
   - `withGraduates` com `joinedSeason`, `estimate`, `peak` e `hall`;
   - `news.crias`, estreia, primeiro gol e venda;
   - card no histórico;
   - faixa da promoção no detalhe.
7. **Fechamento:**
   - e2e e a11y;
   - `sim:size`;
   - documentação (guia, mod-format, glossário, arquitetura);
   - nota de versão do dia em Brasília e 1.11.0.

## Riscos

- **Vazamento sutil:** a ordenação pelo valor central e a posição de `p` na faixa poderiam sugerir o valor. Mitigação: o sorteio uniforme a cada virada (R2) e o teste de espalhamento (R11).
- **Neutralidade:** um ponto de criação que use o rng da safra para a faixa mudaria as linhas de base. Mitigação: a faixa só usa `createRng` com a chave própria, e as linhas de base existentes rodam sem regravar.
- **Manchetes em excesso:** estreias e gols das crias de clubes grandes. Mitigação: só as crias do clube do técnico viram manchete; a máscara garante uma vez por jogador.
- **Saves migrados:** as crias antigas não podem "estrear". Mitigação: a máscara 7 na migração.

## Complexity Tracking

Sem violações da constituição.
