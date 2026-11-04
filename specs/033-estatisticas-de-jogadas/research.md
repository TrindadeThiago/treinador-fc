# Research: Estatísticas de jogadas (033)

Decisões técnicas da feature. Cada uma com a decisão, a razão e as alternativas descartadas.

## R1. Fluxo próprio do gerador, sem tocar nos atuais

**Decisão**: as jogadas de cada minuto usam `minuteRng(context.root, clock, "plays")`, um gerador derivado só da seed e do relógio. Ele é chamado no fim de `playMinute`, depois de finalizações, disciplina e lesões.

**Razão**: `minuteRng` faz `root.fork(rótulo)`, que não avança o gerador raiz (`match/rng.ts`). Um rótulo novo dá um fluxo independente: os sorteios de `"minute"` (finalizações, cartões, lesões) e de `"stoppage"` saem exatamente iguais. Avançar em passos (ao vivo) ou de uma vez (direto) consome os mesmos números, então o Princípio II continua valendo para as jogadas.

**Alternativas**: sortear as jogadas com o gerador `"minute"`, depois dos outros sorteios. Isso também não mudaria os resultados, porque só acrescenta sorteios no fim, mas acopla a ordem dos fluxos e quebra na primeira mudança futura do minuto. Descartada.

## R2. Modelo: totais por minuto distribuídos entre os jogadores

**Decisão**: a cada minuto e para cada lado (`p` = parte da posse do lado no minuto, a mesma `homeShare` que já alimenta a posse):

1. **Passes**: `n ~ Poisson(PASSES_PER_MINUTE × 2p × emCampo/11)`. Cada passe vai para um jogador sorteado com peso por posição da vaga e é certo com probabilidade que sobe com a força efetiva do passador (força × adequação, já com cansaço) e cai com o meio-campo do adversário.
2. **Interceptações**: cada passe errado vira interceptação com probabilidade fixa, creditada a um jogador do adversário sorteado com peso por posição. Assim as interceptações de um time vêm da posse do outro (FR-005).
3. **Desarmes**: o lado sem a bola tenta `Poisson(TACKLES_PER_MINUTE × 2(1−p) × emCampo/11)` desarmes, com o desarmador sorteado por posição. O desarme é certo com probabilidade que sobe com a força efetiva do desarmador e cai com o ataque do adversário.
4. **Passes decisivos**: para cada finalização do lado no minuto (eventos `shot` emitidos neste minuto), o autor da assistência, se houver, ganha um passe decisivo. Sem assistência, com probabilidade por tipo de finalização, um companheiro (nunca o finalizador) sorteado por posição ganha o passe decisivo. Todo passe decisivo também conta como passe tentado e certo.

**Razão**: com totais por time, o custo é de cerca de 30 sorteios por minuto e partida, contra cerca de 130 de um sorteio por jogador e estatística. Também garante por construção os invariantes da spec: certos ≤ tentados (FR-002), decisivos ≥ assistências e decisivos do time ≤ finalizações (FR-003), e interceptações vindas dos passes errados do adversário (FR-005). Os pesos por posição dão os perfis do SC-004 e a dependência da força dá o aproveitamento do US3.

**Alternativas**:
- (a) Um sorteio Bernoulli por jogador, por minuto e por estatística: mais simples, mas 4× mais sorteios e sem amarrar interceptação a passe errado. Descartada.
- (b) Um evento por passe no estado: cerca de 900 eventos por partida no save. Descartada pela FR-010 e pelo tamanho do save.

## R3. Exponencial determinística

**Decisão**: o Poisson usa a mesma inversão com `expNegative` (só multiplicações) da simulação resumida (`match/summary.ts`). A função sai para um módulo comum (`match/poisson.ts`), usado pelos dois.

**Razão**: funções transcendentais podem variar entre motores de JavaScript, e o resultado tem de ser o mesmo em qualquer navegador (Princípio II, a mesma regra de `powQuarters`).

**Alternativas**: `Math.exp`, descartada pelo Princípio II.

## R4. Onde as contagens vivem

**Decisão**:
- **No estado da partida**: `PlayerMatchState.plays?: PlayStats`, um objeto com seis inteiros, criado zerado quando o jogador entra no estado de uma partida completa. A simulação resumida não o cria, então "sem jogadas" é distinguível de "jogadas zeradas" (FR-011).
- **No registro da partida** (`PlayerLine`): `plays?: PlayTuple`, uma tupla de seis inteiros `[tentados, certos, decisivos, desarmes tentados, desarmes certos, interceptações]`.
- **Os totais do time** são calculados a partir das linhas (`playTotals`), sem campo novo em `TeamStats`.

**Razão**: o registro vai para o save. Como objeto, cada linha teria cerca de 90 bytes a mais; como tupla, cerca de 25. As partidas completas por temporada são todas as do país do clube do jogador, mais estaduais e copas que ele disputa. No mundo grande isso dá centenas a milhares de partidas, cerca de 28 linhas por partida. Não mexer em `TeamStats` evita duplicar informação e mudar um formato que já é validado e comparado.

**Alternativas**: objeto no registro, descartado pelo tamanho; totais do time guardados, descartados por redundância (soma das linhas, US2 cenário 3).

## R5. Linhas de base

**Decisão**: nenhuma linha de base é regravada. `match/baseline` compara placares e eventos; `composition-baseline` e `continental-baseline` comparam a composição das divisões; `locale-determinism` compara carreiras. As jogadas não geram eventos, então todas continuam iguais. Um teste novo confirma que a partida sem o fluxo de jogadas é idêntica à partida com ele, tirando o campo `plays` (o mesmo padrão do teste da pressão na 1.3.0).

**Razão**: é a prova da FR-006 e da FR-007, e é o que a spec chama de "linhas de base inalteradas".

## R6. Save v19

**Decisão**: `SAVE_FORMAT_VERSION` passa de 18 a 19. A migração v18 → v19 não muda dados (o campo é opcional, então as partidas antigas ficam sem jogadas), como a v13 → v14 e as seguintes. O schema do save passa a validar, nos registros de todas as temporadas, que `plays` (quando existe) é uma tupla de seis inteiros ≥ 0 com certos ≤ tentados (FR-014). O teste abre a fixture de um save v18 e confere a migração.

**Razão**: Princípio VI. Hoje `records` é validado só como lista (`z.array(z.unknown())`); validar o registro inteiro custaria caro em saves grandes. Então a validação nova olha só `players[*].plays`.

## R7. Faixas de realismo

**Decisão**: `PLAY_REALISM_LIMITS` em `match/limits.ts`, ao lado de `MATCH_REALISM_LIMITS`, verificadas em `test/match/realism/plays.test.ts` (amostra de liga com `runLeagueSample`) e informadas no `pnpm sim:matches`.
- **Por time e por jogo**: passes tentados de 350 a 600, aproveitamento de 72% a 88%, desarmes certos de 12 a 25, interceptações de 6 a 16 e passes decisivos de 6 a 15.
- **Por posição**: (desarmes + interceptações) por minuto de ZAG e VOL ≥ 1,5 × os de MEI e ATA; passes e decisivos por minuto de MEI ≥ 1,3 × os de ZAG.
- **Posse e força**: o time com mais posse passa mais em ≥ 80% dos jogos com diferença de posse ≥ 10 pontos; o jogador 10 pontos mais forte na mesma vaga tem aproveitamento maior na média.

As constantes do modelo (R2) são calibradas para cair no meio das faixas.

**Razão**: Princípio V. As faixas da spec são de referência do futebol e ficam como limites declarados.

## R8. Desempenho

**Decisão**: o orçamento existente vale sem mudança: 10 partidas em menos de 100 ms e 2.000 em menos de 12 s (`test/match/performance.test.ts`), e o dia e a virada do mundo grande (`SCALE_LIMITS`). Medido antes: 10.000 partidas em 4,1 s. O acréscimo esperado, de cerca de 30 sorteios por minuto e partida, fica bem dentro do orçamento.

## R9. Interface

**Decisão**:
- **Resumo da partida**: uma seção "Jogadas" com uma tabela por time. Cada linha é um jogador que entrou em campo, com passes certos/tentados, aproveitamento, decisivos, desarmes certos/tentados e interceptações; a última linha é o total. Em partida sem jogadas, um texto diz que elas não existem.
- **Estatísticas ao vivo**: quatro linhas novas na tabela comparativa (passes certos/tentados, aproveitamento, desarmes certos, interceptações), calculadas a partir das linhas dos jogadores no estado da partida.
- **Tela estreita**: as tabelas ficam roláveis dentro do próprio quadro, sem rolagem horizontal da página. Na 1.3.0, o teste de layout pegou justamente uma tabela que alargava a página.

**Razão**: FR-015 a FR-018.
