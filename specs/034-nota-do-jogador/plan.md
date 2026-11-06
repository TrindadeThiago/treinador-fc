# Implementation Plan: Nota do jogador por partida

**Branch**: `034-nota-do-jogador` | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/034-nota-do-jogador/spec.md`

## Summary

Cada jogador que joga pelo menos 10 minutos ganha uma nota de 0 a 10, com uma casa, calculada a partir do registro da partida, ou do estado dela ao vivo. A nota nunca é guardada e não pesa em nada do jogo.

**Dados:** a nota completa usa as jogadas da 033 mais três dados que o motor passa a contar sem sorteio, guardados no save v20 na tupla de jogadas, que vai de 6 para 9 inteiros (research R1, R2):
- finalizações por jogador;
- defesas do goleiro;
- posição da vaga em que o jogador mais atuou.

**Nota simplificada:** as partidas sem jogadas recebem uma versão sem os termos de jogadas, calibrada para ficar perto da completa (research R4).

**Interface:**
- resumo da partida, com o melhor em campo;
- nota parcial ao vivo no painel Meu time;
- média da temporada no elenco (ordenável) e no detalhe do jogador.

## Technical Context

**Language/Version**: TypeScript 5 (`strict`), Node 22

**Primary Dependencies**: motor próprio, Zod 4 (save), Next.js 16 em static export e React 19; nenhuma dependência nova

**Storage**: save v19 → v20 (`PlayerLine.plays` com 6 ou 9 inteiros); a nota não é guardada

**Testing**: Vitest (motor, save, web), Playwright (e2e), `pnpm sim:matches`

**Target Platform**: navegador (PWA offline)

**Project Type**: monorepo pnpm (motor + save + i18n + web)

**Performance Goals**: orçamento de partida inalterado (10 partidas < 100 ms; 2.000 < 12 s). `seasonRatings` só olha as partidas do clube (≈ 50 a 70 por temporada). O resumo, o elenco e o detalhe abrem sem demora perceptível (SC-007)

**Constraints**:
- nenhum resultado muda, e as linhas de base passam sem regravar;
- determinismo: só somas, multiplicações e arredondamento em inteiros;
- tetos de tamanho do save: carreira longa 5,5 MB, mundo grande 42 MB

**Scale/Scope**: +3 inteiros por linha de jogador nas partidas completas (~+6 bytes)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Motor separado:** fórmula, entradas, médias e faixas ficam no motor (`packages/engine/src/rating/`); a interface só lê.
- [x] **II. Determinismo:** a nota é função pura do registro ou do estado. Finalizações, defesas e vaga são contadas sem sorteio. Arredondamento em inteiros, desempate fixo e ordenação por id.
- [x] **III. Dados, não código:** nada muda no banco nem nos mods; as constantes da fórmula são calibragem do motor.
- [x] **IV. Sem conteúdo protegido:** não se aplica.
- [x] **V. Balanceamento verificável:** `RATING_REALISM_LIMITS` declaradas e verificadas por simulação longa, e linhas de base inalteradas. A nota não afeta o equilíbrio, e o teste de arquitetura garante que nenhum sistema do jogo importa `rating/`.
- [x] **VI. Saves versionados:** v20 com migração, a fixture `saveV19` e a validação de 6 ou 9 inteiros.
- [x] **VII. i18n:** textos novos em `ui.json`; a nota é formatada com vírgula decimal pelo `formatNumber`.
- [x] **VIII. Offline e gratuito:** sem rede.
- [x] **IX. Testes primeiro no motor:** regras, ao vivo = resumo, gols sofridos, desempate e realismo escritos antes ou junto do código.

**Re-check após o design (Phase 1)**: mantido. O único dado novo no save são três inteiros contados sem sorteio, dentro dos tetos de tamanho.

## Project Structure

### Documentation (this feature)

```text
specs/034-nota-do-jogador/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── engine-rating.md
│   └── rating-screens.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/match/plays.ts      # shots, saves, slotMinutes; tupla de 9; playStatsOf aceita 6 ou 9
packages/engine/src/rating/
├── index.ts          # matchRatings, liveRatings, seasonRatings, tipos
├── input.ts          # RatingInput a partir do registro e do estado (gols sofridos, minutos, resultado)
├── rate.ts           # fórmula completa e simplificada, arredondamento, melhor em campo
├── tuning.ts         # RATING_TUNING
└── limits.ts         # RATING_REALISM_LIMITS
packages/engine/test/rating/            # regras, ao vivo = resumo, realismo
packages/engine/test/architecture.test.ts  # a simulação não importa rating/
packages/save/src/{format,migrate}.ts   # v20, validação de 6 ou 9 inteiros
packages/save/test/migrate-v20.test.ts, fixtures.ts (saveV19)
apps/web/src/ui/
├── MatchSummary.tsx, PlaysTable.tsx    # melhor em campo, coluna Nota, tabela simplificada
├── SubstitutionPanel.tsx               # nota parcial
├── RatingValue.tsx(.module.css)        # número com tom (bom, médio, ruim) e "sem nota"
└── PlayerDetails.tsx                   # média e partidas
apps/web/src/app/jogo/elenco/page.tsx   # coluna Nota ordenável
packages/i18n/locales/pt-BR/ui.json
tools/src/simulate-matches.ts           # bloco "notas"
```

**Structure Decision**: monorepo existente. Um módulo novo do motor (`rating/`), isolado da simulação.

## Complexity Tracking

Sem violações da constituição.
