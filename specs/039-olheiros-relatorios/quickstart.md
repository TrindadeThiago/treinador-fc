# Quickstart: validar os olheiros (039)

## Motor e save

```sh
pnpm vitest run packages/engine/test/scouting                       # regras, comandos, avanço, graus, teto, grade nível × etapa (SC-001 a SC-003)
pnpm vitest run packages/engine/test/finance                        # categoria scouting; nada lançado com o nível 0
pnpm vitest run packages/engine/test/career/scouting-neutral.test.ts # mesma carreira com o departamento fechado (SC-004)
pnpm vitest run packages/save                                       # migrate-v24 e saveV23
```

## Linhas de base (não devem mudar)

```sh
pnpm vitest run packages/engine/test/match/baseline.test.ts packages/engine/test/career/composition-baseline.test.ts packages/engine/test/career/continental-baseline.test.ts packages/save/test/equivalence.test.ts
```

## Medidas e escala

```sh
pnpm vitest run packages/engine/test/renewal/long-run-1.test.ts packages/engine/test/renewal/long-run-2.test.ts
pnpm sim:gates      # com o cenário de olheiros no nível 5 e 16 observações (SC-006)
pnpm sim:size
```

## No jogo

1. Carreira nova → Mercado → Observação: o departamento está fechado e sem custo.
2. Abra no nível 3: o diálogo mostra o custo e 8 vagas.
3. Na busca, observe 2 jogadores de outros clubes (um de outro país) e 1 livre.
4. Jogue 5 rodadas:
   - as faixas estreitaram e "Olheiros" aparece em Finanças;
   - no detalhe, o temperamento e a propensão já estão em texto.
5. Filtre "Só observados" e ordene pela faixa.
6. Baixe para o nível 1:
   - o diálogo avisa quantas observações serão canceladas;
   - as faixas não alargam.
7. Abra o detalhe de um jogador do seu elenco: há relatório automático.
8. Abra um save da 1.11: o departamento está fechado e a carreira continua.

## E2E

```sh
pnpm build:web && cd apps/web && npx playwright test e2e/scouting.spec.ts e2e/a11y.spec.ts e2e/layout.spec.ts
```
