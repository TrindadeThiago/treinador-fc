# Implementation Plan: Estatísticas de jogadas (passes, passes decisivos, desarmes e interceptações)

**Branch**: `033-estatisticas-de-jogadas` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/033-estatisticas-de-jogadas/spec.md`

## Summary

O motor de partida completo passa a gerar, por jogador, passes tentados e certos, passes decisivos, desarmes tentados e certos e interceptações. Tudo sai de um fluxo próprio do gerador por minuto (`minuteRng(…, "plays")`), que não consome nada dos fluxos atuais: gols, cartões, lesões e todo o resto ficam idênticos, e a mesma seed dá a mesma carreira.

**Modelo** (research R2):
- os passes de cada lado são um Poisson pela posse do minuto, distribuído entre os jogadores pela posição da vaga e acertado conforme a força efetiva;
- as interceptações vêm dos passes errados do adversário;
- os desarmes vêm da posse do adversário;
- os passes decisivos vêm das finalizações do minuto, a partir das assistências.

**Armazenamento**:
- no estado da partida, como objeto;
- no registro e no save, como tupla de seis inteiros, com save v19 e migração sem dados.

**Interface**: o resumo da partida ganha as tabelas por jogador e por time, e as estatísticas ao vivo ganham os totais do time.

## Technical Context

**Language/Version**: TypeScript 5 (`strict`), Node 22 para testes e ferramentas

**Primary Dependencies**: motor próprio (`packages/engine`), Zod 4 (save), Next.js 16 em static export e React 19 (`apps/web`); nenhuma dependência nova

**Storage**: save em IndexedDB e arquivo exportado (`packages/save`, formato v18 → v19)

**Testing**: Vitest (motor, save, web), Playwright (e2e), `pnpm sim:matches` (realismo)

**Target Platform**: navegador (PWA offline), futuro Electron

**Project Type**: monorepo pnpm (motor + save + i18n + web)

**Performance Goals**: sem mudança de orçamento. 10 partidas em menos de 100 ms e 2.000 em menos de 12 s (`test/match/performance.test.ts`); dia e virada do mundo grande em `SCALE_LIMITS`; rodada ao vivo sem tarefa longa (`live-perf`)

**Constraints**:
- determinismo entre motores de JavaScript, sem `Math.exp` (R3);
- save do mundo grande dentro de `SCALE_LIMITS` (42 MB na última rodada, 12,5 MB no início da 31ª temporada, 6 MB exportado);
- nenhum resultado de partida muda.

**Scale/Scope**: cerca de 30 sorteios novos por minuto e partida completa; cerca de 28 linhas de jogador por registro, com 6 inteiros cada

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Motor separado:** geração, tipos, totais e limites no motor; a interface só lê `plays` e chama `playTotals`/`livePlayTotals`.
- [x] **II. Determinismo:**
  - fluxo `"plays"` derivado da seed e do relógio, sem avançar o gerador raiz;
  - Poisson com `expNegative` (só multiplicações);
  - ordem de iteração pelos jogadores em campo na ordem das vagas;
  - ao vivo e direto iguais.
- [x] **III. Dados, não código:** nada muda no banco nem nos mods; as constantes do modelo são calibragem do motor, como `MATCH_TUNING`.
- [x] **IV. Sem conteúdo protegido:** não se aplica (sem nomes novos).
- [x] **V. Balanceamento verificável:** `PLAY_REALISM_LIMITS` declaradas e verificadas por simulação longa (`realism/plays.test.ts` e `sim:matches`); as linhas de base existentes continuam valendo, sem regravar.
- [x] **VI. Saves versionados:** v19 com migração e teste da fixture v18; validação de `plays` no save importado.
- [x] **VII. i18n:** todos os textos novos em `ui.json`.
- [x] **VIII. Offline e gratuito:** nada de rede.
- [x] **IX. Testes primeiro no motor:** isolamento, invariantes, determinismo e realismo escritos antes ou junto da geração.

**Re-check após o design (Phase 1)**: mantido. O design não guarda eventos novos (as linhas de base comparam eventos), não muda `TeamStats` (já validado e comparado) e não toca na simulação resumida.

## Project Structure

### Documentation (this feature)

```text
specs/033-estatisticas-de-jogadas/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── engine-plays.md
│   └── plays-screens.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/match/
├── plays.ts              # novo: PlayStats, playMinutePlays, playTuple/playStatsOf, playTotals, livePlayTotals
├── poisson.ts            # novo: expNegative + poisson (saem de summary.ts)
├── minute.ts             # chama playMinutePlays no fim de playMinute
├── summary.ts            # passa a importar poisson.ts (sem mudar resultado)
├── types.ts              # PlayerMatchState.plays?
├── tuning.ts             # PLAYS_TUNING (taxas e pesos por posição)
└── limits.ts             # PLAY_REALISM_LIMITS
packages/engine/src/season/
├── types.ts              # PlayerLine.plays?
└── record.ts             # registro com a tupla
packages/engine/test/match/
├── plays.test.ts         # invariantes, determinismo, entra/sai, resumida sem plays
├── plays-isolation.test.ts
└── realism/plays.test.ts
packages/save/src/
├── format.ts             # SAVE_FORMAT_VERSION = 19
└── migrate.ts            # v18 → v19 e validação de plays
packages/save/test/       # fixture v18 → v19, plays inválido
apps/web/src/ui/
├── MatchSummary.tsx      # seção Jogadas
├── PlaysTable.tsx(.module.css)  # novo
└── LiveStats.tsx / StatsTable.tsx  # linhas de totais
packages/i18n/locales/pt-BR/ui.json
tools/src/simulate-matches.ts      # bloco "jogadas"
```

**Structure Decision**: monorepo existente. O motor concentra a geração e as regras, o save versiona, e a interface só apresenta.

## Complexity Tracking

Sem violações da constituição.
