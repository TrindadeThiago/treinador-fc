# Implementation Plan: Academia e investimento na base

**Branch**: `037-academia-da-base` | **Date**: 2026-11-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/037-academia-da-base/spec.md`

## Summary

Cada clube ganha uma academia com nível de 1 a 5, guardada em `RenewalState.academy.clubs` (research R1). O nível decide:
- a quantidade da safra;
- a qualidade dos jovens (força e margem de potencial);
- o bônus de evolução na base;
- as vagas da base: 15, 15, 15, 20 ou 25.

**IA:** o nível segue a reputação, um degrau por virada, sem investir.

**Técnico:** melhora o nível pagando a obra na hora (pronta na virada) ou baixa na virada, com a redução cancelável. O clube que ele deixa volta a seguir a IA.

**Custos:** a manutenção mensal fica entre 2% e 10% de uma folha de referência estável (reputação e escala do país), cobrada por rodada numa categoria nova do livro-caixa. A obra custa de 2 a 6 folhas (research R3).

**Base cheia no início:** todo clube começa com 15 jovens, de 15 a 19 anos, nas carreiras novas e nos saves migrados (R6).

**Interface:** painel da academia na aba Base, com a quantidade em número, a qualidade em escala de texto, o próximo nível ao lado, as ações e a comparação com a divisão.

**Save e versão:** save v22 e versão 1.10.0.

## Technical Context

**Language/Version**: TypeScript 5 (`strict`), Node 22

**Primary Dependencies**: motor próprio, Zod 4 (save e mod), Next.js 16 em static export e React 19; nenhuma dependência nova

**Storage**: save v21 → v22 (`renewal.academy.clubs`); formato de mod com `economy.academy` opcional

**Testing**: Vitest (motor, save, web), Playwright (e2e), `sim:world`, `sim:economy`, `sim:gates`, `sim:size` e a continental em 3 seeds

**Target Platform**: navegador (PWA offline)

**Project Type**: monorepo pnpm (motor + save + i18n + web + tools)

**Performance Goals**:
- a virada e a criação da carreira com a base cheia ficam dentro das metas da 020;
- a criação no mundo padrão gera cerca de 6 600 jovens, que precisam caber no orçamento de tempo da tela de nova carreira.

**Constraints**:
- determinismo;
- nenhum jogador criado direto no elenco (a base inicial também nasce na base);
- tetos do save (5,5 MB e 42 MB);
- critérios da 036 mantidos;
- linhas de base regravadas de propósito.

**Scale/Scope**:
- motor: 1 módulo novo (`academy-levels.ts`), 1 etapa nova da virada, safra, evolução e finanças;
- save: v22 e 3 comandos;
- web: 1 painel, 2 diálogos e a categoria nova nas finanças.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Motor separado:** níveis, custos, safra e comandos ficam no motor e no save; a web só lê e dispara.
- [x] **II. Determinismo:** seeds por clube na base inicial; níveis da IA por regra fixa; nada de relógio.
- [x] **III. Dados, não código:** as regras de nível são dados com padrão e podem vir do mod (`economy.academy`), validados por Zod.
- [x] **IV. Sem conteúdo protegido:** os jovens usam os bancos de nomes fictícios.
- [x] **V. Balanceamento verificável:** limites declarados em `sim:economy` (SC-002, SC-003), no teste de 30 temporadas (crise e critérios da 036) e na continental em 3 seeds.
- [x] **VI. Saves versionados:** v22 com migração, fixture `saveV21` e validação.
- [x] **VII. i18n:** textos em `ui.json`, com a escala de qualidade como rótulos.
- [x] **VIII. Offline e gratuito:** sem rede.
- [x] **IX. Testes primeiro no motor:** testes de regras, comandos, virada e finanças antes do código.

**Re-check após o design**: mantido. A base inicial gera jogadores na base, e não no elenco, o que respeita a regra da 036.

## Project Structure

### Documentation (this feature)

```text
specs/037-academia-da-base/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── engine-academy-levels.md
│   └── academy-panel.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/renewal/
├── academy-levels.ts   # novo: regras, níveis, custos, comandos, etapa academy-levels, seedAcademies
├── academy.ts          # limite de vagas pelo nível; evolveAcademy com bônus; rosterIssues com o limite novo
├── youth.ts            # safra por nível (quantidade, força, potencial)
├── types.ts            # AcademyClub, AcademyState.clubs
└── turnover.ts         # etapa academy-levels; excedente de vagas da IA
packages/engine/src/finance/{types,round,forecast,summary}.ts   # categoria academy e manutenção
packages/engine/src/model/schemas.ts                         # economy.academy opcional
packages/engine/src/career/turnover.ts                       # registra academy-levels
packages/engine/test/renewal/academy-levels.test.ts          # novo
packages/engine/test/finance/academy-maintenance.test.ts     # novo
packages/engine/test/renewal/long-run.ts, worldgen/regional-long-run.test.ts  # medidas
packages/save/src/{format,migrate,create,academy}.ts         # v22, seedAcademies, comandos
packages/save/test/{migrate-v22,academy}.test.ts, fixtures.ts (saveV21)
apps/web/src/ui/{AcademyPanel.tsx(.module.css),AcademyTab.tsx,FinanceTables.tsx}
apps/web/src/game/{academy-view.ts,GameProvider.tsx,finance-series.ts}
apps/web/test/ui/academy-panel.test.tsx, apps/web/e2e/academy.spec.ts
packages/i18n/locales/pt-BR/{ui,release-notes}.json
tools/src/{simulate-economy,simulate-world}.ts
docs/{guia-do-jogador,mod-format,glossario,arquitetura}.md
package.json                                                  # 1.10.0
```

**Structure Decision**: monorepo existente. A academia é um submódulo da renovação, ao lado da base da 036.

## Fases (para o /speckit-tasks)

1. **Fundação:**
   - regras, tipos e níveis;
   - folha de referência e custos;
   - categoria `academy` e manutenção por rodada;
   - save v22 com `seedAcademies` e migração.
2. **US1 (ver):** painel, efeito e vagas pelo nível.
3. **US2 e US3 (melhorar e baixar):** comandos, etapa `academy-levels`, diálogos e o cancelamento.
4. **US5 e US6 (efeito e equilíbrio):**
   - safra e evolução pelo nível;
   - IA pela reputação;
   - excedente de vagas;
   - calibragem com `sim:economy`, o teste de 30 temporadas, os estaduais e a continental em 3 seeds;
   - linhas de base.
5. **US4 (comparar)** e **US7 (save antigo).**
6. **Fechamento:**
   - e2e e a11y;
   - `sim:size` e tempo de criação;
   - documentação;
   - 1.10.0.

## Riscos

- **Base inicial cheia** (maior risco): cerca de 15 jovens por clube saem por idade aos poucos e sobem na IA. Isso infla livres, população e folha nas primeiras temporadas. Mitigação: medir já na fundação e, se preciso, rever com justificativa o limite de livres e de população da 036, ou fazer a IA deixar sair como livre quem não cabe no elenco.
- **Economia dos clubes pequenos** com a manutenção: a calibragem fecha as faixas de reputação e os percentuais. Os clubes só de estadual usam a folha regional como referência.
- **Continental:** a mudança na qualidade dos jovens (menos peso da reputação) pode mexer de novo na correlação. Ela é medida em 3 seeds.
- **Tempo de criação** no mundo padrão com a base cheia: medido contra a meta da 020.

## Complexity Tracking

Sem violações da constituição.
