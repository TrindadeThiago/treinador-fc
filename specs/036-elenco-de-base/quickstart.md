# Quickstart: validar o elenco de base (036)

## Pré-requisitos

`pnpm install` e `pnpm build` na raiz.

## Motor e save

```sh
pnpm vitest run packages/engine/test/renewal   # academia, safra, idade-limite, promoções da IA, emergência, longo prazo
pnpm vitest run packages/engine/test/career    # linhas de base regravadas, determinismo, virada por país
pnpm vitest run packages/save                  # promoteYouth, releaseYouth, bloqueios, migrate-v21
```

Esperado:
- a safra chega à base em todas as viradas;
- nenhum jogador é criado direto num elenco principal;
- as invariantes de id (mundo, livres e base disjuntos) passam;
- a fixture v20 abre, migra e chega à virada.

## Simulações longas (Princípio V)

```sh
pnpm sim:world --seasons 30                 # faixas do mundo + critérios novos (R10)
pnpm sim:gates                              # mundo completo 10 temporadas + escala 3 países 30 temporadas
pnpm sim:size                               # tetos do save
```

Esperado:
- as faixas atuais de força, craques, promessas e idade média se mantêm;
- a base de cada clube fica dentro do limite;
- o número de jogadores do mundo fica estável (±3%);
- as safras de emergência ficam dentro do limite (0 no mundo padrão);
- os elencos da IA ficam com média entre 23 e 28;
- a virada fica dentro das metas da 020;
- o save fica dentro dos tetos.

## No jogo

1. Comece uma carreira e abra Elenco → Base: aparece o estado vazio.
2. Jogue até o fim da temporada: os jovens da safra aparecem na aba Base e no aviso de mudanças, e não no elenco profissional.
3. Promova um jovem no meio da temporada. A confirmação mostra o salário e os anos, e o jovem pode ser escalado na partida seguinte. No detalhe dele aparece "Cria da base".
4. Dispense um jovem: ele aparece entre os livres do mercado.
5. Com jovens no último ano, veja o aviso na abertura da última janela e o diálogo antes do último jogo. Na virada, eles saem e aparecem como livres.
6. Para testar o bloqueio, use um save de teste com a base cheia antes da virada: a próxima partida fica impedida até promover ou dispensar.
7. Venda jogadores até o mínimo e deixe contratos vencerem: depois da virada, a partida fica impedida com a lista de posições que faltam.

## E2E

```sh
pnpm test:e2e -- academy.spec.ts a11y.spec.ts
```
