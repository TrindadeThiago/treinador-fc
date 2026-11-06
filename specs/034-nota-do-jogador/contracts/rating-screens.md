# Contrato: nota na interface (034)

## Resumo da partida (`MatchSummary`)
- **Melhor em campo**: o nome, o time e a nota em texto (ex.: "Melhor em campo: Raul Reis (Cajarana), 8,4"), acima das tabelas de jogadas.
- **Tabelas de jogadas por time**: nova coluna **Nota**, com o número com uma casa ou "sem nota". A linha de total não tem nota.
- **Partida sem jogadas**: uma tabela por time com Jogador · Minutos · Nota, e o texto "Notas simplificadas: esta partida não tem estatísticas de jogadas."

## Painel Meu time (`SubstitutionPanel`, ao vivo)
- Coluna **Nota** nas listas "Em campo" e "Já saíram": a nota parcial ou "sem nota".

## Elenco (`/jogo/elenco`)
- Coluna **Nota**: a média com uma casa e, ao lado, o número de partidas (ex.: "7,1 (12)"), ou "sem nota". Ordenável: "sem nota" sempre por último, nos dois sentidos.

## Detalhe do jogador (`PlayerStats`)
- Linhas **Nota média** e **Partidas com nota**. Com simplificadas, também "Notas simplificadas: N".

## Comum
- O número da nota está sempre em texto. A cor (boa ≥ 7,0, ruim < 5,5) só reforça.
- Todos os textos ficam em `ui.json`, sem rolagem horizontal da página nas larguras já suportadas.
