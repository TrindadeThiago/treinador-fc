# Quickstart: validar a captação (040)

## Motor e save

```sh
pnpm vitest run packages/engine/test/scouting                          # regiões, indicações fora do mundo, trazer, recusar, expirar, estrangeiros, grade por país
pnpm vitest run packages/engine/test/renewal packages/engine/test/news  # origem na promoção, hall, limite de estrangeiros na promoção, manchetes
pnpm vitest run packages/engine/test/career/recruitment-neutral.test.ts # mesma carreira sem região (SC-002)
pnpm vitest run packages/save                                          # migrate-v25 e saveV24
```

## Linhas de base (não devem mudar)

```sh
pnpm vitest run packages/engine/test/match/baseline.test.ts packages/engine/test/career/composition-baseline.test.ts packages/engine/test/career/continental-baseline.test.ts packages/save/test/equivalence.test.ts
```

## Medidas

```sh
pnpm sim:economy   # cenário da captação: base com e sem captação; captados ≤ safra nível 5 (SC-004)
pnpm sim:gates
```

## No jogo

1. Mercado → Observação: abra o departamento no nível 5.
2. Na Captação, escolha outro país: na próxima rodada a região está em vigor.
3. Jogue até a janela do meio da temporada:
   - surgem 3 indicações, com faixa e graus;
   - os nomes são do país escolhido.
4. Traga uma indicação:
   - o custo sai em "Olheiros";
   - o jovem aparece na aba Base como "Captado (país)".
5. Recuse outra e deixe a terceira vencer: nenhuma aparece no mercado, nos livres ou em outra base.
6. Num país com limite de estrangeiros, tente trazer um estrangeiro com o elenco no limite: a ação fica indisponível, com o motivo.
7. Abra um save da 1.12: sem região e sem indicações; a carreira continua.

## E2E

```sh
pnpm build:web && cd apps/web && npx playwright test e2e/scouting.spec.ts e2e/a11y.spec.ts e2e/layout.spec.ts
```
