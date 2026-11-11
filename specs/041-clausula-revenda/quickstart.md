# Quickstart: validar a cláusula de revenda (041)

## Motor e save

```sh
pnpm vitest run packages/engine/test/market/resale.test.ts            # regras, faixa, desconto, criação, pagamento, recompra, empréstimo/rescisão/livre não pagam
pnpm vitest run packages/engine/test/market/resale-property.test.ts   # conservação em toda transferência e ciclos de arbitragem com cláusula (SC-002, SC-003)
pnpm vitest run packages/engine/test/market                           # arbitrage.test.ts do A2 continua passando
pnpm vitest run packages/engine/test/news                             # manchete resaleReceived
pnpm vitest run packages/save                                         # migrate-v26 com saveV25 (SC-007)
```

## Linhas de base (não devem mudar: nenhuma cláusula sem o técnico)

```sh
pnpm vitest run packages/engine/test/match/baseline.test.ts packages/engine/test/career/composition-baseline.test.ts packages/engine/test/career/continental-baseline.test.ts packages/save/test/equivalence.test.ts
```

## Medidas

```sh
pnpm sim:economy   # cenário resale: ciclos com cláusula ≤ sem cláusula; 30 temporadas com técnico automático, caixa da IA e faixas do mundo nos limites (SC-005)
pnpm sim:gates
```

## No jogo

1. Com uma cria da base no elenco e a janela aberta, receba uma proposta (ou use a venda imediata).
2. Escolha 30% de revenda: o valor final cai 30% e um passo acima de 30% aparece desabilitado.
3. Confirme. Em Finanças → Revendas, o jogador aparece em "A receber" com 30%.
4. Jogue até ele ser vendido de novo (entre clubes da IA): o caixa mostra o lançamento em "Revendas" igual a 30% da venda, e a lista "Recebidas" o registra. Se a fatia passar de uma folha mensal, sai a manchete.
5. Em outro clube da IA, negocie um jogador de 19 anos: a resposta mostra "O clube pede 20% de revenda", com o valor com e sem a cláusula. Aceite e confira a cláusula no detalhe do jogador ("20% de revenda para …").
6. Abra um save da 1.13.x: ele migra sem cláusulas e a carreira continua.
