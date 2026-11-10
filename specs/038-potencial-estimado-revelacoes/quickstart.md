# Quickstart: validar a faixa de potencial e as revelações (038)

## Motor e save

```sh
pnpm vitest run packages/engine/test/renewal/estimate.test.ts   # contém, aninha, largura, espalhamento; grade nível × tempo (SC-001 a SC-004)
pnpm vitest run packages/engine/test/renewal                    # criação em todos os pontos, academy-estimates, hall, relatório da temporada
pnpm vitest run packages/engine/test/news                       # revelação (clube, divisão, both), estreia, primeiro gol, venda, poda de crias
pnpm vitest run packages/engine/test/career/estimate-neutral.test.ts  # mesma seed com e sem a feature (SC-005)
pnpm vitest run packages/save                                   # migrate-v23 e fixture saveV22
```

Esperado:
- 100% das faixas contêm o valor real e ficam dentro da anterior;
- o nível 5 com 2 anos fica em ≤ 60% da largura do nível 1 recém-chegado;
- a largura média cai a cada nível e a cada virada.

## Linhas de base (não devem mudar)

```sh
pnpm vitest run packages/engine/test/match/baseline.test.ts packages/engine/test/career/composition-baseline.test.ts packages/engine/test/career/continental-baseline.test.ts packages/save/test/equivalence.test.ts
```

Esperado: todos passam **sem** regravar snapshots. A faixa não muda nenhum resultado.

## Medidas

```sh
pnpm vitest run packages/engine/test/renewal/long-run-1.test.ts packages/engine/test/renewal/long-run-2.test.ts   # contenção em 30 temporadas
pnpm sim:world --seasons 30     # largura média por nível e tempo; taxa de contenção = 100%
pnpm sim:size                   # save dentro dos tetos
```

## No jogo

1. Comece uma carreira e abra Elenco → Base:
   - cada jovem tem a faixa "low–high";
   - ordene pela coluna e filtre por posição;
   - com leitor de tela, a faixa é lida por extenso.
2. Promova um jovem e abra o detalhe: aparece "Potencial estimado na promoção".
3. Escale a cria: na rodada, sai a manchete de estreia (e a de primeiro gol, quando ela marca).
4. Chegue ao fim da temporada: há o bloco Base com "chegaram", "subiram" e "saíram".
5. Passe a virada: a rodada 0 traz a revelação da safra do clube e da divisão, e as faixas dos jovens que ficaram estão mais estreitas e dentro das anteriores.
6. Venda uma cria: sai a manchete de venda (e não a de grande transferência).
7. Abra Histórico → Clubes: o card "Crias da base" mostra o total e as maiores revelações.
8. Abra um save da 1.10.x: todo jovem da base tem faixa, e nenhuma cria antiga ganha manchete de estreia.

## E2E

```sh
pnpm build:web && pnpm test:e2e -- academy.spec.ts a11y.spec.ts layout.spec.ts
```
