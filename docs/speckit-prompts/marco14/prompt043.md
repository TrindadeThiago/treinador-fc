# 043 — Programa de sócio-torcedor

Marco 14 — Sócio-torcedor

`/speckit-specify`

```text
Programa de sócio-torcedor: receita recorrente que depende do humor da torcida, como contrapeso ao ingresso (ver docs/design.md §8 e §10; AUDITORIA-v1.0.0.md, ideia 4 e nota do A6).

Objetivo: a torcida passa a ser também uma fonte de receita estável e uma decisão de preço. Hoje a única receita ligada à torcida é a bilheteria, e o preço ótimo do ingresso é praticamente um número fixo por clube (A6). Com os sócios, o técnico equilibra mensalidade, ingresso e humor.

Histórias de usuário:
- Como técnico, quero ver quantos sócios o clube tem, quanto eles rendem por mês e como o número muda.
- Como técnico, quero definir o preço da mensalidade sabendo o efeito esperado nas adesões e no caixa.
- Como técnico, quero que o desempenho do time e o humor da torcida façam o número de sócios subir ou cair.

Escopo:
- Sócios por clube: um número, com adesões e cancelamentos a cada mês pelo humor da torcida (013), pela fase do time, pelo preço da mensalidade e pela reputação, com um teto ligado ao tamanho da torcida do clube.
- Mensalidade definida pelo técnico numa faixa por divisão, na escala do país (020); a mudança vale no mês seguinte. Clubes da IA usam o preço padrão da regra, sem decidir.
- Receita mensal numa categoria nova do livro-caixa ("Sócios"), também para os clubes da IA, na previsão financeira, no resumo da temporada e nas metas financeiras da diretoria.
- Ligação com a bilheteria: parte dos lugares de cada jogo em casa vai para os sócios, que já pagaram na mensalidade. O ingresso avulso fica com o resto da capacidade, então lotar com sócios rende menos por jogo e mais por mês. A regra é declarada e cobre os estádios menores que o número de sócios.
- Tela: em Finanças, um painel de sócios com o número, a tendência, a mensalidade, a receita do mês e a previsão, e a ação de mudar o preço com o efeito esperado; o número de sócios no painel da torcida.
- Sócios iniciais pela reputação, pela torcida e pela capacidade do estádio, em carreira nova e na migração.
- Mods: faixas de preço, pesos de adesão e cancelamento, teto, fração de lugares dos sócios e sócios iniciais como regras com valores padrão, opcionais e documentadas.
- Save: formato novo com os sócios e a mensalidade por clube; a migração deriva os sócios iniciais.

Requisitos:
- Equilíbrio: a receita nova entra na economia de todos os clubes. Calibrar junto com a bilheteria e o patrocínio para o caixa médio da IA continuar nas faixas da 1.0.6 e da 037 (sim:economy, teste de 30 temporadas, estaduais e a continental em 3 seeds), sem inflar a economia.
- O preço da mensalidade precisa ter um dilema real: nem o mínimo nem o máximo da faixa podem ser sempre o melhor (medir a curva de receita por preço, como no A6).
- Determinismo; as linhas de base mudam de propósito e são regravadas no mesmo PR.
- Textos, plural e formatos pelo i18n; a tendência nunca só por cor.
- Nota de versão e subida de versão (minor) no mesmo PR.

Fora de escopo: planos de sócio diferentes, benefícios e prioridade em jogos decisivos, meta de sócios na diretoria e manchetes (044), campanhas de sócios.

Critérios de aceite:
- Vejo o número de sócios e a receita mensal em Finanças; mudo a mensalidade e, nos meses seguintes, vejo o efeito nas adesões e no caixa.
- Uma sequência de derrotas derruba o humor e o número de sócios; uma boa fase faz o contrário.
- A curva de receita por mensalidade tem um ótimo no meio da faixa, e não nas pontas.
- Em 30 temporadas sem interação, o caixa da IA e as faixas do mundo continuam dentro dos limites.
- Um save da versão anterior abre, migra e continua a carreira.
```
