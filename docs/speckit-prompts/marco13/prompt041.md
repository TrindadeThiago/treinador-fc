# 041 — Cláusula de revenda

Marco 13 — Mercado: cláusulas e empresários

`/speckit-specify`

```text
Cláusula de revenda nas transferências: o clube que vende um jogador pode ficar com um percentual de uma venda futura dele (ver docs/design.md §9; AUDITORIA-v1.0.0.md, ideia 2).

Objetivo: vender uma promessa deixa de ser um corte definitivo. O técnico troca dinheiro hoje por uma aposta no futuro do jogador, o que combina com as crias da base (marco 11): vender cedo com cláusula ou esperar para vender caro.

Histórias de usuário:
- Como técnico, quero pedir um percentual de revenda ao vender um jogador, aceitando um valor menor agora.
- Como técnico, quero receber a minha parte quando um jogador que vendi com cláusula for vendido de novo, por qualquer clube.
- Como técnico, quero saber, ao comprar, se o jogador tem cláusula de revenda a favor de outro clube e quanto ela tira de uma venda futura.
- Como técnico, quero ver as cláusulas que tenho a receber e o que elas já renderam.

Escopo:
- Cláusula: percentual (ex.: de 5% a 50%, em passos declarados) sobre o valor da próxima venda do jogador. Vale uma vez, só para a próxima venda definitiva; empréstimos, rescisões e saídas como livre não pagam e não a encerram.
- Negociação: na venda (proposta recebida ou venda feita pelo técnico), o técnico pode incluir a cláusula. O clube comprador da IA responde por uma regra declarada que troca percentual por desconto no valor (ex.: cada ponto de percentual vale um desconto fixo), podendo recusar acima de um teto.
- Clubes da IA vendendo ao técnico pedem cláusula em jogadores jovens, pela mesma regra, e o técnico pode aceitar ou recusar com a contrapartida no valor. Entre clubes da IA não há cláusula nova.
- Pagamento: na próxima venda do jogador, a fatia sai do valor recebido pelo vendedor e vai para o clube da cláusula, numa categoria nova do livro-caixa ("Revendas"), inclusive entre clubes da IA e entre países. Se o clube da cláusula recomprar o jogador, a cláusula se encerra sem pagamento.
- Telas: a cláusula aparece na negociação com o efeito no valor, no detalhe do jogador ("20% de revenda para o X") e numa lista de cláusulas a receber em Finanças, com o histórico do que já foi recebido.
- Manchete quando o clube do técnico recebe uma revenda relevante.
- Mods: faixa de percentual, desconto por ponto, teto aceito pela IA e idade máxima em que a IA pede cláusula como regras com valores padrão, opcionais e documentadas.
- Save: formato novo com as cláusulas ativas e o histórico de recebimentos; a migração começa sem cláusulas.

Requisitos:
- Conservação do dinheiro: toda revenda sai de um caixa e entra em outro; testes de propriedade nas transferências cobrem as cláusulas.
- Arbitragem: vender com cláusula e recomprar, ou vender e revender entre clubes, nunca gera dinheiro do nada (medir em sim:economy e em testes de propriedade, como no A2).
- Equilíbrio: como a IA também pede cláusula ao técnico, medir o caixa da IA e as faixas do mundo em 30 temporadas; as linhas de base mudam só onde há cláusula, e isso é registrado no PR.
- Textos, plural e formatos (dinheiro e percentual) pelo i18n.
- Nota de versão e subida de versão (minor) no mesmo PR.

Fora de escopo: outras cláusulas (multa rescisória, bônus por gol, opção de recompra), cláusulas em empréstimos, negociação de cláusulas entre clubes da IA.

Critérios de aceite:
- Vendo uma cria da base com 30% de revenda por um valor menor; quando ela é vendida de novo, o caixa recebe 30% dessa venda em "Revendas".
- Ao comprar um jovem de um clube da IA, vejo a cláusula pedida e o efeito no valor, e posso aceitar ou recusar.
- Nenhum ciclo de comprar e vender com cláusula cria dinheiro.
- Um save da versão anterior abre, migra e continua a carreira.
```
