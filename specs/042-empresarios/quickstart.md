# Quickstart: validar os empresários (042)

## Motor e save

```sh
pnpm vitest run packages/engine/test/agents                    # derivação (mesmo empresário sempre), regras, comissão, troca por salário, relação e rompimento
pnpm vitest run packages/engine/test/market                    # comissão nos efeitos, resposta do jogador com comissão, eventos de relação, IA pagando comissão
pnpm vitest run packages/engine/test/properties                # dinheiro: comissão sai e não volta; troca nunca vantajosa (SC-003)
pnpm vitest run packages/engine/test/news                      # agentBroke e agentBigDeal
pnpm vitest run packages/save                                  # migrate-v27 com saveV26 (SC-006), equivalência regravada
```

## Linhas de base (regravadas de propósito)

```sh
UPDATE_BASELINE=1 pnpm vitest run packages/save/test/equivalence.test.ts packages/engine/test/match/baseline.test.ts packages/engine/test/season/stages-freeze.test.ts
pnpm vitest run packages/save/test/equivalence.test.ts   # depois de regravar: a mesma seed dá a mesma carreira
```

## Medidas

```sh
pnpm sim:economy                     # caixa da IA, crise e mediana nos limites; cenário de comissões
pnpm sim:gates                       # metas da 020 (dia, virada, save) e faixas do mundo
pnpm sim:world --continental --seed padrão   # e --seed var-a, --seed var-b: continental completa (SC-004)
```

## No jogo

1. Mercado → Buscar: escolha um jogador muito mais forte que o seu clube e abra a negociação. Na etapa do contrato, aparece "sem interesse: o empresário leva a proposta adiante com uma comissão de X".
2. Ponha a comissão em X e proponha: o jogador responde pelo salário. Ao assinar, Finanças mostra a comissão em "Comissões".
3. Aumente a comissão numa outra negociação: o salário pedido cai, até o teto.
4. Rescinda um jogador e abra outro do mesmo empresário: a relação caiu e a comissão de referência subiu.
5. Mercado → Empresários: a lista mostra os empresários com quem você negociou.
6. Abra um save da 1.14: todos os jogadores têm empresário, as relações começam neutras e a carreira continua.
