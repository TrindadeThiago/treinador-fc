# Research: Reformulação da página Início (035)

## R1. Força do time e do adversário

**Decisão**: a força de cada lado é `teamStrength({ formation, onField }).overall`, a medida que o motor usa na simulação (`packages/engine/src/match/strength.ts`). Ela é a força de cada jogador × adequação à vaga, ponderada por setor. O valor aparece arredondado para inteiro.

- **Meu time**: a escalação atual do técnico (`save.lineup`): esquema e titulares, com os jogadores do banco do save.
- **Adversário**: a escalação que a temporada daria a ele, que é a mesma que o motor vai usar: `lineupForMatch(elenco, esquema, indisponíveis)`. O esquema vem de `season.formations[clubId]` ou de `preferredFormation(elenco)`, e os indisponíveis de `upcomingUnavailability(state, clubId)`.
- As duas forças usam a força **sem** a perda por cansaço. O cansaço aparece no indicador próprio (R2), para não contar duas vezes.

**Razão**: é a mesma medida, calculada do mesmo jeito para os dois lados (FR-009), e é o que de fato decide a partida. Não precisa de dado novo.

**Alternativas**:
- Média simples da força dos titulares: ignora a vaga e a adequação, e diverge do motor. Descartada.
- Força com o cansaço aplicado (`squadWithFitness`): mistura dois indicadores. Descartada.

## R2. Condição física média

**Decisão**: média de `fitnessAt(save)(playerId)` dos titulares de `save.lineup`, arredondada, em %. É a mesma condição que a escalação mostra (`apps/web/src/game/selectors.ts`). Para o adversário, não há indicador de condição.

**Razão**: a spec pede a condição dos titulares escalados do técnico. A do adversário não é mostrada em lugar nenhum do jogo.

## R3. Desfalques

**Decisão**: o número de entradas de `upcomingUnavailability(state, save.clubId)`: lesões em qualquer competição e suspensões na competição do próximo jogo. É a mesma lista que a escalação usa (`lineupContext`). O indicador leva à Escalação.

## R4. Forma do adversário

**Decisão**: `lastResults(seasonStateOf(save), opponentId, 5)`, a mesma função que já dá a forma do clube do técnico, com `FormChips`. Sem resultados, o texto "sem jogos".

## R5. Categoria das manchetes

**Decisão**: um mapa, na interface, de `HeadlineType` para uma categoria com texto em `ui.json` (`home.newsCategory.*`):

| Categoria | Tipos |
|---|---|
| Resultado | `result`, `hatTrick`, `rout`, `comeback`, `upset`, `streak`, `droughtEnd`, `record` |
| Clássico | `derby` |
| Técnicos | `coachFired`, `coachHired`, `managerFired`, `managerHired` |
| Mercado | `bigTransfer` |
| Tabela | `titleClinched`, `promotionClinched`, `relegationConfirmed`, `seasonSummary`, `qualification` |
| Copa | `cupUpset`, `cupElimination`, `cupFinal`, `cupChampion` |
| Continental | `continentalAdvanced`, `continentalEliminated`, `continentalChampion`, `continentalRout` |
| Estadual | `regionalChampion`, `regionalPromoted`, `regionalRelegated` |

Um teste confere que todo `HEADLINE_TYPES` tem categoria, para que um tipo novo não fique sem etiqueta.

**Razão**: o artefato sugere Diretoria, Torcida e Lesão, mas esses tipos de manchete não existem no motor, e criar tipos novos é dado novo (fora do escopo, FR-020). As categorias seguem os tipos que existem.

**Título e subtítulo**: o título é o texto da manchete que já existe (`RoundFeed`). O subtítulo é o primeiro fato complementar (`extras`), quando houver; senão, a rodada ou a competição. Ficam no máximo três, na ordem de relevância que já existe (`latestFeed`).

## R6. Torcida e diretoria compactas

**Decisão**: um cartão novo, `ClubMoodCard`, com duas linhas, cada uma com o valor, `Meter` e a tendência:
- torcida: `club.mood` com `trendOf(club.recent)`;
- diretoria: `confidence` com `trendOf(recent)`.

Embaixo, uma linha de metas: "N de M metas no caminho", contada em `goalRows(save)` (status `onTrack` ou `met` conta como no caminho; `inProgress` não entra na conta de nenhum lado e aparece como "em andamento"). Termina com o link para a Carreira.

`FansCard`, `GoalsList` e `ConfidenceMeter` continuam como estão, porque a Carreira os usa. O `BoardCard` só era usado na Início e sai. A reputação do técnico, que só aparecia nele, passa para o cartão compacto.

## R7. Avisos compactos

**Decisão**: um invólucro `NoticeStrip` com grade `repeat(auto-fit, minmax(240px, 1fr))`. Cada aviso continua sendo o componente que já existe (`BoardNotice`, `MarketNotice`, `LineupNotice`, `SquadChangeNotice`, a crise e as propostas), com uma variante `compact`:
- título;
- uma linha de detalhe;
- uma ação (link ou dispensar).

Listas longas viram uma linha com a contagem, e a lista completa fica num `<details>` ("Ver detalhes"), a um clique (FR-012, SC-004). Isso vale para os jogadores trocados na `LineupNotice` e para as mudanças do elenco na `SquadChangeNotice`, que não aparecem em outra tela. O `MarketNotice` e o `BoardNotice` já eram compactos e não mudam. O `role` (`status` ou `alert`) de cada aviso se mantém.

**Razão**: reaproveita a lógica de quando cada aviso aparece e de como dispensá-lo, e só muda a apresentação.

## R8. Grade e altura

**Decisão**: a página vira uma grade de duas colunas `minmax(0, 1.6fr) minmax(0, 1fr)` em larguras ≥ 1200 px. As áreas são:
- `header` (as duas colunas);
- `next` e `table`;
- `notices` (as duas colunas, quando houver);
- `mood` e `news`.

Entre 720 e 1199 px fica igual, sem a proporção fixa. Abaixo de 720 px, uma coluna, na ordem da FR-003.

A meta de caber em 900 px (SC-001) é verificada em e2e numa janela de 1440×900: a altura do documento é medida com `document.scrollingElement.scrollHeight ≤ innerHeight`, com uma carreira sem avisos. Para caber:
- o cartão do próximo jogo fica com cerca de 300 px;
- os da linha de baixo, com cerca de 220 px;
- as manchetes ficam com três itens de uma linha mais o subtítulo;
- os espaços internos usam `--space-3`.

## R9. Cabeçalho

**Decisão (revista na implementação)**: o título de cada tela (`ScreenHeader`) já mostra, em todas as telas do clube, o `h1` com o nome do clube, a divisão, a temporada e a rodada. Repetir esses dados na Início gastaria altura e criaria um segundo `h1`. Por isso, o `HomeHeader` é uma faixa fina, só da página, com:
- à esquerda, "Nº lugar · divisão";
- à direita, o `WindowStatus` que já existe, que sai do meio dos cartões e mantém o `role="status"`.

O desempregado tem a mesma faixa, com a reputação no lugar da posição (o título da tela já diz "sem clube").

## R10. Testes que mudam

- `test/flows/finances.test.tsx:199` procura `home.cash` na Início. O caixa sai do cartão da posição (FR-016), e o teste passa a conferir o caixa nas Finanças.
- `test/flows/fans.test.tsx:22` procura `fans.reasons` no cartão da Início. Os motivos saem da Início, e o teste passa a ler o cartão compacto (valor e tendência). Os motivos continuam conferidos onde o `FansCard` segue em uso.
- `test/ui/home.test.tsx` e os `e2e` de layout e responsivo (`layout.spec.ts`, `responsive.spec.ts`, `narrow-round.spec.ts`) ganham as verificações novas.
- Os testes que leem os resultados da rodada pela Início passam a lê-los na Competição. A tarefa de busca encontra esses testes por `RoundResults` e pelo rótulo `round.results` nos testes.
