# Quickstart: validar as estatísticas de jogadas (033)

Pré-requisito: `pnpm install` na raiz.

## 1. Nada mudou nas partidas (FR-006, FR-007, SC-002)

```sh
pnpm vitest run packages/engine/test/match/baseline.test.ts \
  packages/engine/test/career/composition-baseline.test.ts \
  packages/engine/test/career/continental-baseline.test.ts \
  packages/engine/test/career/locale-determinism.test.ts \
  packages/engine/test/match/plays-isolation.test.ts
```

Esperado: tudo verde, sem regravar linha de base nem snapshot. `plays-isolation` compara a partida com e sem o fluxo de jogadas.

## 2. Invariantes e determinismo (FR-001 a FR-005, FR-008, SC-001)

```sh
pnpm vitest run packages/engine/test/match/plays.test.ts
```

Esperado:
- certos ≤ tentados, decisivos ≥ assistências e decisivos do time ≤ finalizações;
- jogadas iguais ao vivo e direto;
- quem entra ou sai só acumula os minutos jogados;
- a simulação resumida sem `plays`.

## 3. Realismo (FR-019, FR-020, SC-003, SC-004)

```sh
pnpm vitest run packages/engine/test/match/realism/plays.test.ts
pnpm sim:matches
```

Esperado: as faixas de `PLAY_REALISM_LIMITS` com ✓ no `sim:matches` (bloco "jogadas") e o teste verde.

## 4. Save (FR-012 a FR-014, SC-005, SC-006)

```sh
pnpm vitest run packages/save/test
```

Esperado:
- a fixture v18 abre como v19, com as partidas antigas sem jogadas;
- um save com `plays` inválido é rejeitado com o caminho do campo;
- os testes de escala (`football-world-scale`, `continental-scale`, `regional-scale`) dentro de `SCALE_LIMITS`.

## 5. Interface (FR-015 a FR-018)

```sh
pnpm vitest run apps/web/test
pnpm build:web && pnpm test:e2e
```

Na mão (`pnpm build:web && pnpm preview:web`):
- jogar uma rodada ao vivo e ver passes, aproveitamento, desarmes e interceptações nas estatísticas do jogo;
- ao fim, abrir o resumo e conferir as duas tabelas de jogadas, com os totais igual à soma;
- em 768 px, sem rolagem horizontal.
