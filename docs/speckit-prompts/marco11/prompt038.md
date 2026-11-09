# 038 — Potencial estimado e revelações

Marco 11 — Categorias de base

`/speckit-specify`

```text
Faixa de potencial estimado para os jovens e destaque para as revelações da base (ver docs/design.md §4 e §10).

Objetivo: o técnico consegue apostar num jovem sem saber o futuro dele. O potencial continua oculto, mas aparece como uma faixa que fica mais precisa com uma academia melhor e com o tempo do jovem na base. As revelações também viram história nas manchetes.

Histórias de usuário:
- Como técnico, quero ver uma estimativa do potencial de cada jovem da base, para decidir quem promover e quem dispensar.
- Como técnico, quero que a estimativa fique mais confiável com o tempo e com uma academia melhor.
- Como técnico, quero saber, ao fim da temporada, quem foi a grande revelação da safra do meu clube e dos rivais.
- Como torcedor do meu clube, quero que uma cria da base que vira titular seja lembrada nas notícias e no histórico.

Escopo:
- Faixa de potencial estimado (ex.: 68–84) para jogadores da base do próprio clube. A largura da faixa cai com o nível da academia (037) e com as temporadas na base. O valor real continua oculto, e a faixa sempre o contém.
- A faixa é gerada de forma determinística pela seed e não muda nenhum resultado do jogo (é só informação, como a nota da 034).
- Depois de promovido, o jogador mantém a última faixa conhecida no detalhe.
- Na aba Base, coluna da faixa com ordenação e filtro por posição.
- Safra da virada: manchete com a principal revelação do meu clube e da divisão. No fim de temporada, um bloco "Base" com quem chegou, quem subiu e quem saiu.
- Manchetes de cria da base: estreia no profissional, primeiro gol e venda de uma cria da base.
- Histórico do clube: quantas crias da base subiram e as maiores revelações (força máxima atingida).

Requisitos:
- A faixa não pode vazar o potencial real em outros pontos da interface nem do save exportado de forma legível.
- Medir em simulação que a faixa contém o valor real em 100% dos casos e que a largura média cai com o nível e o tempo.
- Textos, plural e formatos pelo i18n; a faixa nunca é sinalizada só por cor.
- Nota de versão e subida de versão (minor) no mesmo PR.

Fora de escopo: olheiros e relatórios de jogadores de outros clubes, faixa de potencial para o elenco principal inteiro, base disputando competições.

Critérios de aceite:
- Cada jovem da base do meu clube mostra uma faixa de potencial que contém o valor real.
- Com academia nível 5 e dois anos de base, a faixa média é visivelmente mais estreita que com nível 1 recém-chegado.
- Na virada aparece a manchete da revelação da safra, e no fim de temporada o bloco Base.
- A mesma seed dá a mesma carreira, com e sem a feature (a faixa não altera resultados).
```
