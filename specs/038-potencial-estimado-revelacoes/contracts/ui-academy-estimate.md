# Contrato: interface — faixa, bloco Base, crias e manchetes (038)

Todos os textos ficam em `packages/i18n/locales/pt-BR/ui.json`, com plural e formatos pelo i18n.

## Aba Base (`apps/web/src/ui/AcademyTab.tsx`)

**Coluna "Potencial":**
- texto `academy.estimate.range` → "{low}–{high}";
- `aria-label` `academy.estimate.aria` → "potencial estimado entre {low} e {high}";
- sem cor como único sinal.

**Ordenação** pela coluna: pelo valor central `(low + high) / 2` e, no empate, pelo `high`, depois pelo nome. Funciona nos dois sentidos, com `aria-sort`.

**Filtro de posição**: `select` com "Todas" e as posições do catálogo. A ordenação continua valendo e o filtro fica no estado da aba.

**Dica (tooltip ou texto de ajuda)** `academy.estimate.help`: "A faixa fica mais estreita com o tempo na base e com uma academia melhor."

## Detalhe do jogador (`apps/web/src/ui/PlayerDetails.tsx`)

**Na base do clube do técnico:** linha `player.estimate` → "Potencial estimado: {low}–{high}".

**Promovido com `graduate.estimate`:** linha `player.estimate.promotion` → "Potencial estimado na promoção: {low}–{high}". A linha continua depois de uma venda.

**Nenhum outro jogador** ganha linha de potencial.

## Fim de temporada (`apps/web/src/ui/season/AcademySeason.tsx`, novo)

**Título:** `seasonEnd.academy` → "Base".

**Três listas, cada uma com título e total no plural:**
- `seasonEnd.academy.arrived`;
- `seasonEnd.academy.promoted`;
- `seasonEnd.academy.left` (o motivo vai em texto: "dispensado" ou "sai por idade").

**Listas vazias:** `seasonEnd.academy.none` ("Nenhum").

**Os que chegaram e continuam na base** mostram a faixa atual.

## Histórico do clube (`apps/web/src/ui/history/WorldHistory.tsx` → `ClubHistory`)

**Card `history.clubs.academy`** ("Crias da base"):
- `history.clubs.academy.promoted` → "{count, plural, …} crias promovidas";
- lista das maiores revelações: nome, posição, força máxima, ano da promoção e clube atual ou `history.clubs.academy.retired`;
- sem crias: `history.clubs.academy.none`.

## Manchetes (`news.<tipo>.<variação>`)

São 3 ou mais variações por tipo, com frases completas, plural e gênero (design §10). Nenhuma cita potencial nem faixa.

| Tipo | Variações |
|------|-----------|
| `academyRevelation` | por `scope`: `club`, `division`, `both` |
| `academyDebut` | uma família de variações |
| `academyFirstGoal` | uma família, mais o texto de `extras` para a estreia com gol |
| `academySale` | uma família; `fee` formatado na moeda do clube |

## Acessibilidade

- A coluna e as linhas novas são lidas por extenso.
- A tabela continua navegável por teclado.
- `a11y.spec.ts` cobre a aba Base com a coluna nova e a tela de fim de temporada com o bloco Base.
