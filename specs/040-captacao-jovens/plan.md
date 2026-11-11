# Implementation Plan: Captação de jovens

**Branch**: `040-captacao-jovens` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/040-captacao-jovens/spec.md`

## Summary

A captação mora no `ScoutingState` da 039: a região, a região pendente, as indicações e um contador próprio (research R1). Ela fecha junto com o departamento.

**Indicações fora do mundo:** cada uma é um jogador completo com id provisório (`scout-offer-N`), sem tocar em `world.players`, nos livres, nas bases nem em `nextPlayerSeq`. Só ao **trazer** o jovem recebe o id real, a faixa da 038 e a origem "captado" (R2).

**Quando surgem:** na abertura de cada janela. A do começo sai na virada (save), as outras no gancho do `day.ts` da 039. Cada uma vale até o fim da janela (R3).

**Como são geradas:**
- **gerador:** `createYouth` com um clube virtual da região, ajustado pela academia nível 3, sem acréscimo pelo nível do departamento;
- **qualidade:** vem da reputação média dos clubes da região;
- **quantidade:** pelo nível do departamento, de 1 a 3 por data, e menor num estado (R4).

**Custo de registro:** 10%, 20% ou 35% da folha mensal de referência, pela região (R5).

**Estrangeiros:** o limite vale ao trazer (contando a base) e na promoção (R6).

**Manchetes e histórico:** as das crias e o hall ganham a origem (R7).

**Save, mod e neutralidade:** save v25, com os campos opcionais; mod `economy.scouting.recruitment`. Sem região, a carreira é idêntica (R8).

**Versão:** 1.13.0.

## Technical Context

**Language/Version**: TypeScript 5 (`strict`), Node 22

**Primary Dependencies**: motor próprio, Zod 4, Next.js 16 (static export) e React 19; nenhuma dependência nova

**Storage**: save v24 → v25 (`scouting.region`, `pendingRegion`, `offers`, `nextOfferSeq`; `origin` nos jovens e promovidos; `hall.scouted`)

**Testing**: Vitest (motor, save, web), Playwright, `sim:economy` (cenário novo), `sim:gates`; as linhas de base existentes como prova de neutralidade

**Target Platform**: navegador (PWA offline)

**Project Type**: monorepo pnpm

**Performance Goals**: no máximo 3 indicações por janela; custo desprezível

**Constraints**:
- nenhum jogador no mundo sem decisão do técnico;
- determinismo;
- sem região, nada muda;
- tetos do save.

**Scale/Scope**:
- motor: 1 arquivo novo (`scouting/recruitment.ts`), ajustes em `scouting/state.ts` e `round.ts`, `renewal/academy.ts` e `hall.ts`, `news/academy.ts`;
- save: v25 e 3 ações;
- web: o bloco Captação, a origem na base, no detalhe e no histórico, e os templates.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Motor separado:** regiões, indicações, registro e regras de estrangeiros ficam no motor; a web só lê e dispara.
- [x] **II. Determinismo:** semente por data e região; ids provisórios fora da numeração; sem região, a carreira é idêntica (teste novo e linhas de base intactas).
- [x] **III. Dados, não código:** a quantidade, o custo, as idades e a qualidade-base são regras com padrão, opcionais no mod e validadas por Zod.
- [x] **IV. Sem conteúdo protegido:** os nomes vêm dos bancos de nomes fictícios dos países.
- [x] **V. Balanceamento verificável:** o cenário do `sim:economy` (captação × safra nível 5, peso dos registros) tem limites declarados; o mundo sem técnico não muda.
- [x] **VI. Saves versionados:** v25 com migração e fixture `saveV24`.
- [x] **VII. i18n:** textos e manchetes com `select` e plural.
- [x] **VIII. Offline e gratuito:** sem rede.
- [x] **IX. Testes primeiro no motor:** "fora do mundo", trazer, recusar, expirar, estrangeiros e a grade por país, antes do código.

**Re-check após o design**: mantido. O id provisório (R2) é o que garante SC-001 e SC-002 juntos.

## Project Structure

### Documentation (this feature)

```text
specs/040-captacao-jovens/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── engine-recruitment.md
│   └── ui-recruitment.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/scouting/{types,state,round,recruitment}.ts   # região, indicações, trazer, recusar, regras
packages/engine/src/renewal/{types,academy,hall}.ts               # origin, limite na promoção, hall.scouted
packages/engine/src/news/academy.ts                               # variáveis scouted e region
packages/engine/src/career/day.ts                                 # gancho da 039 com as regras de janela
packages/engine/src/model/schemas.ts, validation/                 # economy.scouting.recruitment
packages/engine/test/scouting/recruitment.test.ts                 # novo
packages/engine/test/career/recruitment-neutral.test.ts           # novo
packages/save/src/{format,migrate,career,scouting}.ts             # v25, virada, ações
packages/save/test/{migrate-v25.test.ts,fixtures.ts}              # saveV24
apps/web/src/ui/market/{ScoutingTab.tsx,RecruitmentPanel.tsx}
apps/web/src/ui/{AcademyTab.tsx,PlayerDetails.tsx,history/WorldHistory.tsx}
apps/web/src/game/{scouting-view.ts,GameProvider.tsx}
apps/web/test/ui/recruitment.test.tsx, apps/web/e2e/scouting.spec.ts
packages/i18n/locales/pt-BR/{ui,errors,release-notes}.json
tools/src/simulate-economy.ts                                     # cenário da captação
docs/{guia-do-jogador,mod-format,glossario,arquitetura}.md
package.json                                                       # 1.13.0
```

**Structure Decision**: a captação é parte do módulo `scouting/` da 039 e reaproveita o gerador da safra (`createYouth`) e a faixa da 038.

## Fases (para o /speckit-tasks)

1. **Fundação:** tipos, regras e mod; ids provisórios; save v25.
2. **US1:**
   - região e região pendente;
   - indicações na abertura de janela (`day.ts`) e na virada (save);
   - o bloco Captação.
3. **US2:** trazer (vaga, caixa, estrangeiros), a origem na base e no detalhe, e o limite na promoção.
4. **US3:** recusar e expirar; o teste "nada no mundo"; a neutralidade.
5. **US4:** a grade por país e por nível; o cenário do `sim:economy`.
6. **US5:** manchetes e histórico.
7. **Fechamento:**
   - e2e e a11y;
   - documentação;
   - `sim:gates`;
   - suíte completa sozinha;
   - 1.13.0.

## Riscos

- **Neutralidade:** gerar indicações não pode consumir `nextPlayerSeq` nem a sorte do jogo. Mitigação: ids provisórios e chave própria, com um teste que compara a numeração e o mundo depois de gerar indicações.
- **Força da região:** a reputação média dos clubes é uma aproximação da força do país. Mitigação: medir na grade (SC-003); se um país fraco render melhor que um forte, rever a fórmula.
- **Limite de estrangeiros na promoção:** é uma mudança na 036. Mitigação: só vale para jovens estrangeiros, que só existem pela captação; as linhas de base confirmam que nada mudou para a safra.

## Complexity Tracking

Sem violações da constituição.
