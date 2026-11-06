# Quickstart: validar a nota do jogador (034)

## 1. Nada mudou no jogo (FR-007, SC-002)
```sh
pnpm vitest run packages/engine/test/match/baseline.test.ts \
  packages/engine/test/career/composition-baseline.test.ts \
  packages/engine/test/career/continental-baseline.test.ts \
  packages/engine/test/career/locale-determinism.test.ts \
  packages/engine/test/match/plays-isolation.test.ts \
  packages/engine/test/architecture.test.ts
```
Esperado: verde, sem regravar nada. A simulação não importa `rating/`.

## 2. Regras da nota (FR-001 a FR-006, SC-001, SC-006)
```sh
pnpm vitest run packages/engine/test/rating
```
Esperado:
- notas entre 0 e 10 com uma casa;
- sem nota abaixo do mínimo de minutos;
- gol sobe e vermelho desce a nota;
- gols sofridos contam só com o jogador em campo;
- desempate fixo do melhor em campo;
- ao vivo igual ao resumo.

## 3. Realismo (FR-016, SC-003 a SC-005)
```sh
pnpm vitest run packages/engine/test/rating/realism.test.ts
pnpm sim:matches
```
Esperado: as faixas de `RATING_REALISM_LIMITS` em ✓ (bloco "notas").

## 4. Save v20
```sh
pnpm vitest run packages/save/test
```
Esperado:
- a fixture v19 abre como v20;
- as tuplas de 6 continuam válidas;
- tuplas inválidas são rejeitadas;
- a escala (`long-career`, `football-world-scale`) fica dentro dos tetos.

## 5. Interface
```sh
pnpm vitest run apps/web/test
pnpm build:web && pnpm test:e2e
```
Na mão:
- jogar ao vivo e ver as notas parciais no painel Meu time;
- no fim, conferir o melhor em campo e as notas no resumo;
- abrir o elenco e ordenar por nota;
- abrir o detalhe de um jogador e ver a média.
