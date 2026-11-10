# 044 — Sócios na vida do clube

Marco 14 — Sócio-torcedor

`/speckit-specify`

```text
Os sócios ganham peso na diretoria, nas campanhas de adesão, nas manchetes e no histórico (ver docs/design.md §10; depende da 043).

Objetivo: o número de sócios deixa de ser só uma linha de receita e passa a contar a história do clube. A diretoria cobra, o técnico pode investir numa campanha, e os recordes e as debandadas viram notícia.

Histórias de usuário:
- Como técnico, quero uma meta de sócios da diretoria em temporadas em que ela fizer sentido, e ser avaliado por ela.
- Como técnico, quero lançar uma campanha de sócios pagando um custo e ver o efeito nas adesões.
- Como torcedor do meu clube, quero que recordes de sócios e debandadas apareçam nas notícias e no histórico.

Escopo:
- Diretoria (012): uma meta de sócios (ex.: manter ou crescer uma porcentagem) entra nas metas da temporada pelas regras da diretoria, com peso na avaliação, quando o clube tem margem para crescer. A meta usa o número do começo da temporada.
- Campanha de sócios: ação do técnico com custo único (categoria "Sócios", como despesa) e efeito por algumas rodadas nas adesões, com uma por vez e um intervalo mínimo entre campanhas. O efeito diminui com campanhas seguidas, para não virar compra de sócios.
- Torcida (013): os sócios pesam no humor e na pressão sobre a diretoria (uma base grande de sócios descontente pressiona mais); a regra é declarada e medida.
- Manchetes: recorde de sócios do clube, marca redonda atingida, debandada (queda forte num mês) e o maior quadro de sócios da divisão no fim da temporada.
- Histórico: número de sócios por temporada no histórico do clube e o recorde em Histórico → Recordes; a série de sócios em Finanças.
- Fim de temporada: a variação de sócios no resumo financeiro.
- Mods: pesos da meta, custo, efeito, duração e intervalo da campanha, pesos na torcida e limiares das manchetes como regras com valores padrão, opcionais e documentadas.
- Save: formato novo com a campanha em andamento e o histórico de sócios por temporada; a migração começa sem campanha e com o histórico a partir da temporada atual.

Requisitos:
- Equilíbrio: a campanha não pode se pagar sozinha sempre (medir o retorno por custo em sim:economy); a meta de sócios não pode tornar a demissão mais frequente que hoje além dos limites atuais da diretoria.
- Determinismo; as linhas de base mudam onde a torcida e a diretoria mudam, de propósito, e são regravadas no mesmo PR.
- Textos, plural e formatos pelo i18n.
- Nota de versão e subida de versão (minor) no mesmo PR.

Fora de escopo: planos de sócio e benefícios, sócios da IA com campanhas, venda de produtos e outras receitas de marca.

Critérios de aceite:
- Recebo uma meta de sócios, ela aparece na avaliação da diretoria e conta no fim da temporada.
- Lanço uma campanha, pago o custo e vejo as adesões subirem nas rodadas seguintes; uma segunda campanha seguida rende menos.
- Quando o clube bate o recorde de sócios, sai uma manchete, e o recorde aparece no histórico.
- Um save da versão anterior abre, migra e continua a carreira.
```
