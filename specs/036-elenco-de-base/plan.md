# Implementation Plan: Elenco de base

**Branch**: `036-elenco-de-base` | **Date**: 2026-11-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/036-elenco-de-base/spec.md`

## Summary

Cada clube ganha um elenco de base (até 15 jovens, sub-20), guardado fora do mundo vivo, em `RenewalState.academy`, como os livres ficam no mercado (research R1). A safra da virada vai para a base. O técnico promove a qualquer momento, com o contrato inicial, ou dispensa, e o jovem vira livre. Quem passa da idade-limite sai na virada: na IA é promovido, no técnico vira livre.

**Mudança de regra central (clarify):** o jogo deixa de criar jogadores direto em elencos principais.
- A IA completa os elencos promovendo da base e, se faltar, contratando livres. A safra de emergência na base é a garantia final, medida e limitada (R5, R6).
- O técnico completa o elenco sozinho. Elenco abaixo do mínimo, ou base acima do limite, bloqueia a próxima partida, pelo caminho da escalação inválida (R8).
- A safra é recalibrada só em quantidade, para o mundo não encolher (R3).

**Interface:**
- abas Profissional e Base no Elenco;
- diálogos de promoção e dispensa;
- avisos de último ano;
- origem "cria da base" no detalhe do jogador;
- seções novas no aviso de mudanças do elenco.

**Save:** v21, com migração. **Versão:** 1.9.0.

## Technical Context

**Language/Version**: TypeScript 5 (`strict`), Node 22

**Primary Dependencies**: motor próprio, Zod 4 (save), Next.js 16 em static export e React 19; nenhuma dependência nova

**Storage**: save v20 → v21 (`renewal.academy`); IndexedDB e arquivo exportado, como hoje

**Testing**: Vitest (motor, save, web), Playwright (e2e), `pnpm sim:world`, `pnpm sim:gates` e `pnpm sim:size`

**Target Platform**: navegador (PWA offline)

**Project Type**: monorepo pnpm (motor + save + i18n + web + tools)

**Performance Goals**:
- a virada do mundo padrão e da escala (020) fica dentro das metas atuais;
- a base soma perto de 5 registros por clube (cerca de 2 200 no mundo de 440 clubes), com custo linear na evolução e nas etapas novas;
- a aba Base abre sem demora perceptível.

**Constraints**:
- determinismo (seeds por etapa, clube e jogador; ordem por id);
- nenhum jogador criado direto num elenco principal;
- elencos da IA válidos em toda partida;
- tetos do save: carreira longa 5,5 MB, mundo grande 42 MB;
- linhas de base regravadas de propósito.

**Scale/Scope**:
- motor: 1 módulo novo (`renewal/academy.ts`), 2 etapas novas da virada e 4 alteradas, mais o dia da carreira e o mercado da IA;
- save: v21 e comandos novos;
- web: 1 aba, 2 diálogos, 3 bloqueios e avisos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Motor separado:** base, promoção, dispensa, idade-limite, bloqueios (`rosterIssues`) e avisos ficam no motor e na camada do save. A web só lê e dispara os comandos.
- [x] **II. Determinismo:** seeds da safra, da evolução e da emergência por temporada, clube e jogador. A base é ordenada por id e as escolhas por utilidade têm desempate por id. Sem relógio.
- [x] **III. Dados, não código:** nenhum país ou competição exige lógica nova. As regras novas (`ACADEMY_RULES`) são constantes versionadas do jogo, como `SQUAD_RULES`, e o formato de mod não muda.
- [x] **IV. Sem conteúdo protegido:** jovens com nomes dos bancos de nomes fictícios, como hoje.
- [x] **V. Balanceamento verificável:** o teste de 30 temporadas e o `sim:world` ganham limites numéricos para: base no limite, zero criação direta, safras de emergência, população estável e tamanho dos elencos da IA (R10). As faixas atuais continuam.
- [x] **VI. Saves versionados:** v21, migração `addAcademy`, fixture `saveV20` e validação de ids disjuntos.
- [x] **VII. i18n:** textos novos em `ui.json`, com plural ICU. O motor devolve códigos e parâmetros (`RosterIssue`).
- [x] **VIII. Offline e gratuito:** sem rede.
- [x] **IX. Testes primeiro no motor:** testes das regras da base, das etapas da virada, dos comandos e dos bloqueios escritos antes ou junto do código.

**Re-check após o design (Phase 1)**: mantido. A safra de emergência (R6) não viola o FR-011, porque o jovem nasce na base. Ela é medida com um limite declarado e precisa ficar em zero no mundo padrão depois da calibragem.

## Project Structure

### Documentation (this feature)

```text
specs/036-elenco-de-base/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── engine-academy.md
│   └── academy-screens.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/renewal/
├── academy.ts        # novo: AcademyState, academyOf, academyStatus, promoteFromAcademy, releaseFromAcademy,
│                     #   promotionContract, rosterIssues, academyWarning, graduateOf, evolveAcademy, emergência
├── rules.ts          # ACADEMY_RULES; YOUTH_RULES.perClub recalibrado
├── types.ts          # RenewalState.academy; SquadChangeNotice com campos da base
├── youth.ts          # safra na base; posição carente conta elenco + base
├── squads.ts         # sem createYouth; promoções da IA por mínimo e aiTargetSize
├── turnover.ts       # academy-age-out, complete-squads; evolve/regulate com a base
├── measure.ts        # measureWorld conta a base
└── evolution.ts      # evolutionDelta reaproveitado pela base
packages/engine/src/career/turnover.ts   # ordem das etapas novas (perCountry)
packages/engine/src/finance/round.ts     # evolução do meio da base (também liga estrangeira)
packages/engine/src/market/ai/round.ts   # IA abaixo do mínimo promove da base durante a temporada
packages/engine/src/index.ts             # exports
packages/engine/test/renewal/            # academy.test.ts, youth/squads alterados, long-run com critérios novos
packages/engine/test/career/             # linhas de base regravadas
packages/save/src/{format,migrate,academy,career}.ts   # v21, promoteYouth, releaseYouth, bloqueio no avanço
packages/save/test/{migrate-v21,academy}.test.ts, fixtures.ts (saveV20)
apps/web/src/app/jogo/elenco/page.tsx    # abas Profissional e Base
apps/web/src/ui/
├── AcademyTab.tsx(.module.css)          # novo: tabela, vagas, ações, diálogos, estado vazio
├── SimulateDialogs.tsx                  # bloqueios e aviso novos
├── PlayerDetails.tsx                    # cria da base
├── SquadChangeNotice.tsx                # seções da base
└── home/NoticeStrip.tsx                 # aviso da última janela
apps/web/src/game/{GameProvider.tsx,academy-view.ts}   # comandos e seletores
apps/web/e2e/academy.spec.ts             # novo
packages/i18n/locales/pt-BR/ui.json, packages/i18n/locales/pt-BR/release-notes.json
tools/src/simulate-world.ts              # medidas da base, emergências, população
docs/{guia-do-jogador,glossario,arquitetura,design}.md
package.json                             # 1.9.0
```

**Structure Decision**: monorepo existente. A base é um submódulo da renovação (`renewal/academy.ts`), porque nasce da safra e vive no `RenewalState`.

## Fases de implementação (para o /speckit-tasks)

1. **Motor, estrutura (US1 e US6):**
   - `AcademyState`, regras e safra na base;
   - evolução da base;
   - medidas;
   - save v21 e migração.
2. **Motor, comandos (US2 e US4):**
   - promover e dispensar;
   - contrato inicial;
   - livres.
3. **Motor, virada da IA e garantia (US5 e US3):**
   - idade-limite;
   - promoções da IA;
   - `complete-squads`;
   - emergência;
   - calibragem da safra;
   - longo prazo com critérios novos;
   - linhas de base regravadas.
4. **Motor e save, bloqueios e avisos (FR-009a, FR-010, FR-011b):**
   - `rosterIssues` e `academyWarning`;
   - recusa no avanço.
5. **Web:**
   - aba Base, diálogos e detalhe;
   - aviso de mudanças e fim de temporada;
   - bloqueios e avisos;
   - i18n;
   - e2e e a11y.
6. **Fechamento:**
   - `sim:gates` e `sim:size`;
   - documentação;
   - nota de versão 1.9.0.

## Riscos

- **Equilíbrio sem criação direta** (maior risco): países pequenos ou clubes regionais podem esgotar base e livres. Mitigação: safra recalibrada, `complete-squads` incluindo os clubes regionais, emergência medida e `sim:gates` na escala de 3 países.
- **Travamento do técnico:** elenco abaixo do mínimo sem dinheiro. Livres podem ser contratados fora das janelas, e o caixa não barra salário. Mesmo assim, o teste do save cobre "técnico sem caixa consegue completar com a base ou com livres".
- **Liga estrangeira e renovação:** `finance/round.ts` descarta a renovação nas ligas estrangeiras (R1, R4). Um teste específico garante que a base desses países evolui no meio da temporada.

## Complexity Tracking

Sem violações da constituição.
