# Contrato: jogadas na interface (033)

## Resumo da partida (`MatchSummary`)

- Seção **Jogadas**, com um título e uma tabela por time (mandante e visitante), cada uma com legenda (`caption`) e cabeçalhos de coluna.
- **Colunas**: Jogador · Passes (certos/tentados) · Aproveitamento (%) · Decisivos · Desarmes (certos/tentados) · Interceptações.
- **Linhas**: cada jogador do time que entrou em campo, na ordem de entrada (titulares na ordem das vagas, depois quem entrou). A última linha é o **Total** do time, que é igual a `playTotals`.
- **Partida sem jogadas**: no lugar das tabelas, um texto que diz que as estatísticas de jogadas não existem para esta partida. Nunca aparecem zeros.
- **Tela estreita**: a tabela rola dentro do próprio quadro; a página não ganha rolagem horizontal (teste de layout em 768 px e no tema claro e escuro).

## Estatísticas ao vivo (`LiveStats`)

- Quatro linhas novas na tabela comparativa, depois das existentes: **Passes** (certos/tentados), **Aproveitamento de passe** (%), **Desarmes certos** e **Interceptações**, de `livePlayTotals` de cada lado.
- Atualizadas a cada minuto, como as outras; os números nunca diminuem durante o jogo.

## Textos

- Todas as frases novas ficam em `packages/i18n/locales/pt-BR/ui.json`, com plural onde houver contagem.
