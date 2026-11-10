# Quickstart: validar a academia (037)

## Motor e save

```sh
pnpm vitest run packages/engine/test/renewal   # níveis, safra por nível, obra, redução, IA pela reputação, base inicial
pnpm vitest run packages/engine/test/finance   # manutenção por rodada, categoria academy, previsão e resumo
pnpm vitest run packages/save                  # ações no save, migrate-v22 (nível pela reputação, base completada até 15)
```

## Equilíbrio

```sh
pnpm vitest run packages/engine/test/renewal/long-run-1.test.ts packages/engine/test/renewal/long-run-2.test.ts packages/engine/test/worldgen/regional-long-run.test.ts
pnpm sim:world --seasons 30
pnpm sim:economy                 # cenário academia nível 1 × 5 em 10 temporadas (SC-002, SC-003)
pnpm sim:gates
for s in padrao var-a var-b; do pnpm sim:world --scale --countries 5 --seasons 30 --continental --seed $s; done
pnpm sim:size
```

Esperado:
- as faixas do mundo e os critérios da 036 continuam passando;
- os clubes da IA ficam fora de crise dentro dos limites atuais;
- o nível 5 rende pelo menos 1,5× os jovens do nível 1;
- as vendas das crias de um clube pequeno não pagam o nível 5;
- na continental, as médias ficam no nível da 1.9.0;
- o save fica dentro dos tetos.

## No jogo

1. Comece uma carreira e abra Elenco → Base: a base tem 15 jovens, e o painel mostra o nível, a manutenção, o efeito e a comparação com a divisão.
2. Melhore a academia: o diálogo mostra o custo, a manutenção nova e o caixa depois. O custo aparece em Finanças → Academia, e o painel mostra a obra em andamento.
3. Jogue até a virada: o nível sobe, a safra chega com a quantidade do nível novo e as vagas mudam nos níveis 4 e 5.
4. Baixe a academia e cancele a redução; baixe de novo e passe a virada: o nível cai e a manutenção também.
5. Abra um save da 1.9.0: cada clube tem o nível da reputação e a base com 15 jovens.

## E2E

```sh
pnpm build:web && pnpm test:e2e -- academy.spec.ts a11y.spec.ts layout.spec.ts
```
