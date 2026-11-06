# Contrato da tela: Início (`/jogo`)

O contrato descreve o que os testes podem procurar na página, pelo papel e pelo nome acessível.

## Técnico empregado

| Região | Papel e nome | Conteúdo obrigatório |
|---|---|---|
| Cabeçalho | faixa da página (o `h1` com o clube, a divisão e a temporada é o do título da tela) | "Nº lugar · divisão"; `WindowStatus` (`role="status"`, `data-window="open\|closed"`) |
| Próximo jogo | `region` `home.nextMatch` | escudo e nome dos dois clubes (mandante primeiro); `FormChips` de cada lado ou "sem jogos"; competição, fase ou rodada, data, mando; ida e clássico quando houver; indicadores (abaixo); botões `home.playLive` e `home.simulate` (`data-tip-anchor="play"`) |
| Indicadores | `dl` com nome `home.preview.title` | `home.preview.strength` "NN × NN"; `home.preview.fitness` "NN%"; `home.preview.absences` "N", com o link `home.preview.toLineup` para `/jogo/escalacao` |
| Avisos | `region` `home.beforeMatch`, só com avisos | um item por aviso: título, uma linha e uma ação. A crise financeira tem `role="alert"`; os demais avisos, `status` |
| Posição | `region` `home.position` | posição em destaque; link `home.seeTable` para `/jogo/competicao`; até cinco resultados com escudo, nome curto, mando, rodada ou competição, placar e a letra do resultado (`V`/`E`/`D`) em texto; `data-result="win\|draw\|loss"`; sem o texto `home.cash` |
| Torcida e diretoria | `region` `home.mood.title` | torcida e diretoria: valor, `Meter` e tendência em texto; reputação do técnico; linha `home.mood.goals` ("N de M metas no caminho"); link para `/jogo/carreira`; sem `fans.reasons` nem `board.reasons` |
| Manchetes | `region` `news.title` | até três itens, cada um com a etiqueta `home.newsCategory.<categoria>`, o título e o subtítulo; link `news.seeAll` |

**Ausências obrigatórias**: a região de resultados da rodada (`RoundResults`) não aparece na Início.

**Ordem no DOM** (é a ordem de leitura e a de empilhamento em tela estreita): cabeçalho, próximo jogo, avisos, posição, torcida e diretoria, manchetes.

## Técnico desempregado

| Região | Conteúdo |
|---|---|
| Cabeçalho | reputação e `WindowStatus` (o título da tela já diz que está sem clube) |
| Recado da diretoria | quando houver |
| Propostas | `JobOffers` (aceitar e recusar) e as ações da rodada; com a temporada encerrada, o fim de temporada e a próxima temporada |
| Manchetes | o mesmo cartão compacto |

Também sem `RoundResults`.

## Layout

| Largura | Grade |
|---|---|
| ≥ 1200 px | 2 colunas (`1.6fr 1fr`). Cabeçalho e avisos ocupam as duas; `next`/`table` e `mood`/`news` lado a lado |
| 720–1199 px | 2 colunas iguais, a mesma disposição |
| < 720 px | 1 coluna, na ordem do DOM |

- **1440×900 sem avisos**: `scrollHeight ≤ innerHeight`.
- **Qualquer largura testada**: `scrollWidth ≤ innerWidth`.
