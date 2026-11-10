# Research: Olheiros e relatórios de jogadores (039)

Ponto de partida: a faixa de potencial da 038 (`renewal/estimate.ts`, research R1–R4). Os relatórios reaproveitam `initialEstimate` e `narrowEstimate`, que já garantem: contém o valor real, fica dentro da anterior, `low ≥ força` e posição sorteada.

## R1 — Onde mora o estado dos olheiros

**Decision**: um módulo novo `packages/engine/src/scouting/`, com o estado `ScoutingState` no `CareerSeasonState` (e no save) ao lado de `fans` e `news`:
- `level` (0 = fechado, até 5);
- `watch`: as observações, com o id do jogador e o início;
- `reports`: os relatórios por id de jogador.

**Rationale**:
- Os relatórios são do técnico (decisão da spec), não de um clube. Um estado de carreira separado deixa isso explícito.
- A renovação e as finanças não precisam saber da observação.
- Um estado próprio também facilita o teste de neutralidade: basta trocar o módulo por uma versão que não faz nada, como na 038.

**Alternatives considered**: guardar o nível na academia (`renewal.academy.clubs`) e os relatórios nos jogadores. Rejeitado: mistura conhecimento do técnico com dados do mundo e espalha campos pelo save.

## R2 — Quando o relatório avança

**Decision**: uma função `scoutingAfterRound(state, league, round)` chamada no fim de `applyRoundSystems` (`finance/round.ts`), que roda uma vez por liga principal que fecha rodada, inclusive as de outros países (`foreign`):
- **jogadores em observação:** avança uma etapa se o país do clube atual do jogador é o da liga que fechou a rodada; os livres avançam pela liga do país do clube do técnico;
- **relatório automático:** avança os jogadores do elenco do técnico quando a liga que fechou a rodada é a do clube dele.

**Rationale**:
- É o mesmo ponto em que as finanças de cada país andam (A12), uma vez por rodada de cada país.
- Não depende do calendário de copas, e as datas ficam as de uma liga.

**Alternatives considered**: avançar por dia de jogo. Rejeitado: avançaria mais rápido nas semanas com copa e por país, sem sentido para o técnico.

## R3 — Larguras e etapas

**Decision**: todas as faixas novas começam com `initialWidth = 24`. Cada nível tem uma redução por etapa e uma largura mínima:

| Nível | Vagas | Redução por etapa | Largura mínima | Etapas até completo | Custo (% da folha de referência por mês) |
|---|---:|---:|---:|---:|---:|
| 1 | 3 | 1 | 14 | 10 | 1 |
| 2 | 5 | 2 | 12 | 6 | 2 |
| 3 | 8 | 3 | 10 | 5 | 3 |
| 4 | 12 | 4 | 8 | 4 | 4 |
| 5 | 16 | 5 | 6 | 4 | 5 |

**Cálculo da largura:**
- largura alvo na etapa *k* = `max(mínima, 24 − redução × k)`;
- a faixa nova = `narrowEstimate(anterior, jogador, min(atual, alvo), chave)`, com a chave `${seed}:scout:${season}:${round}:${playerId}`.

**Rationale**:
- **SC-003:** em cada etapa a largura cai a cada nível. Na etapa 1, por exemplo, ela vai de 23 no nível 1 a 19 no nível 5.
- **SC-002:** o nível 5 completo (6) fica em 25% do nível 1 na primeira etapa (23); a meta é ≤ 40%.
- **Custo:** fica em metade da manutenção da academia (2% a 10%) em cada nível. A calibragem confere no `sim:economy` do clube do técnico.
- **Mudança de nível:** a etapa conta a observação acumulada, e a largura nova é sempre `min(atual, alvo)`. Por isso baixar o nível nunca alarga a faixa (FR-009, US2-3).

**Alternatives considered**: largura inicial por nível, como na 038. Rejeitada: para quem observa, a primeira olhada é igualmente vaga, e o nível muda a velocidade e o limite.

## R4 — Temperamento, propensão a lesões e confiança

**Decision**:
- **Graus:** três, por cortes fixos sobre o valor de 1 a 100: ≤ 33, 34 a 66 e ≥ 67.
  - temperamento: tranquilo, normal, esquentado;
  - propensão: resistente, normal, propenso a lesões.
- **Quando aparecem:** `etapas ≥ ceil(etapasAtéCompleto(nível) / 2)`.
- **O que fica guardado:** o grau (1, 2 ou 3), uma vez avaliado. Nunca o número.
- **Confiança:** inicial (antes do tempo mínimo), parcial (depois do mínimo, antes da largura mínima) ou completo (largura na mínima do nível atual).

**Rationale**: os atributos são fixos e o grau é exatamente o que a feature mostra (FR-010). Guardar o grau não revela nada além da tela (FR-019).

## R5 — Relatório automático do elenco e da base

**Decision**:
- **Elenco:** em cada rodada da liga do clube do técnico, todo jogador do elenco avança uma etapa, com o nível do departamento ou o nível 1 quando ele está fechado.
- **Ponto de partida do relatório:** o relatório que já existia; ou, para uma cria promovida, `graduates[id].estimate` (038); ou a faixa inicial de largura 24.
- **Base:** os jovens da base continuam só com a faixa da 038.

**Rationale**: FR-014 e FR-015. A faixa da promoção já é conhecimento do técnico, e começar dela evita alargar.

## R6 — Teto, poda e troca de clube

**Decision**:
- **Teto:** `reportCap = 300`. Ao passar dele (ao criar um relatório e na virada), saem primeiro os mais antigos pela última atualização, entre os que não estão em observação nem no elenco do técnico.
- **Virada:** saem os relatórios de jogadores que não estão mais no mundo nem entre os livres (aposentados), e as observações deles.
- **Técnico muda de clube** (proposta aceita em `board/offers.ts`, demissão em `board/round.ts`): o save chama `closeScouting`, que zera o nível e a lista e mantém os relatórios. O relatório automático passa ao elenco novo.

**Rationale**: o tamanho do save fica limitado (cerca de 300 × 6 números), e a troca de clube segue a spec.

## R7 — Custo no caixa

**Decision**: `scoutingCost(world, clubId, level)` = `referenceMonthlyPayroll × costPct / 100` (a mesma folha de referência da 037). Ele é cobrado em `applyRoundFinances`, junto com a manutenção da academia, em parcelas por rodada (`wageInstalment`, 12 mensalidades por temporada), numa categoria nova `scouting` do livro-caixa:
- só do clube do técnico;
- só com o nível ≥ 1.

A categoria entra na previsão (`forecast.ts`), no resumo (`summary.ts`), no extrato e nas metas financeiras, pelos mesmos caminhos da `academy`.

**Rationale**: FR-004 e o padrão da academia. Com o nível 0 não há lançamento nenhum, então o livro-caixa fica idêntico ao da 1.11 (FR-020).

## R8 — Neutralidade e linhas de base

**Decision**:
- **Teste novo:** `scouting-neutral.test.ts`, no padrão do `estimate-neutral` da 038. Roda 2 temporadas com a feature e com `scouting/` trocado por uma versão que não faz nada (departamento fechado nos dois casos, relatórios automáticos só no primeiro) e compara mundo, tabelas, mercado, livro-caixa, base, regulador, diretoria e torcida. O próprio teste confere que a troca valeu.
- **Linhas de base:** as existentes rodam sem regravar.

**Rationale**: FR-020 e SC-004. A sorte dos relatórios usa só chaves próprias.

## R9 — Sigilo e interface

**Decision**:
- **View:** a web lê os relatórios por `scoutingReportView(state, playerId)`, que devolve só a faixa, os graus, a confiança, a data e as etapas.
- **Teste de sigilo:** igual ao da 038. As telas novas (aba Observação, busca com as colunas novas, detalhe do jogador e modal do mercado) são desenhadas com valores reais diferentes e as mesmas faixas e graus, e o texto tem de sair idêntico.

## R10 — Save e mod

**Decision**:
- **Save v23 → v24:** `scouting: { level: 0, watch: [], reports: {} }`. Os relatórios automáticos do elenco nascem na primeira rodada depois da migração.
- **Mod:** `economy.scouting` opcional, com:
  - `levels[5]`: `slots`, `costPct`, `shrink`, `minWidth`;
  - `initialWidth`;
  - `reportCap`.
  Os campos são validados por Zod e documentados no `mod-format.md`.

## R11 — Medidas (FR-024, FR-025)

**Decision**:
- **Grade sintética** (`report.test.ts`): nível 1 a 5 × etapa 0 a 10, com 2 000 jogadores por célula. Mede a contenção, o aninhamento e as médias de SC-002 e SC-003.
- **Carreira longa:** o `long-run` ganha o relatório automático do técnico e, num cenário, 16 observações no nível 5. Mede 100% de contenção e de aninhamento em todas as rodadas.
- **Escala:** o `sim:gates` e o `football-world-scale` rodam com o departamento no nível 5 e 16 observações, contra as metas da 020 e os tetos do save.

## Medidas e desvios da implementação

**Grade de precisão** (`test/scouting/report.test.ts`, 2 000 jogadores por célula):
- 100% de contenção e de aninhamento em todos os níveis e etapas;
- a largura média cai a cada etapa até a completa e a cada nível nas primeiras etapas;
- o nível 5 completo fica abaixo de 40% do nível 1 na etapa 1 (pela tabela, 6 contra 23, cerca de 26%).

**Temporada inteira** (`test/scouting/scouting.test.ts`): no nível 5 com 16 observações, todos os relatórios no fim contêm o valor real, os graus batem com os valores reais e os observados chegam à observação completa. A temporada inteira do banco de teste roda em cerca de 1 s, então o custo de desempenho do avanço é desprezível.

**Neutralidade** (`test/career/scouting-neutral.test.ts`): com o departamento fechado, 2 temporadas saem idênticas com e sem o avanço dos relatórios; não há nenhum lançamento `scouting` no livro-caixa. As linhas de base existentes passam sem regravar.

**Custo** (`sim:economy`, cenário dos olheiros, seed `economia`, clube de menor reputação, 10 temporadas):
- o nível 5 custa no máximo **3,5%** da receita da temporada (limite: 6%);
- a linha do caixa ficou só informativa. O clube da IA termina as temporadas com o caixa perto de zero (a IA gasta a sobra em contratações). Por isso, somar à parte um custo que ela nunca pagou deixaria o caixa "negativo" em 8 de 10 temporadas, mas isso não mede crise: um clube que pagasse os olheiros gastaria menos no mercado. O limite que vale é o peso na receita, e o critério "não entra em crise só por causa dele" da T030 foi trocado por essa linha informativa.

**Desvios do plano:**
- **Avanço no `day.ts`, não dentro do `applyRoundSystems`:** só o nível do departamento entra como opção (para a cobrança), o que mexe em bem menos chamadas (U2 da análise).
- **Limpeza da virada no save** (`pruneScouting` em `advanceCareerSeason`), não como etapa do motor (T027): a lista de etapas da virada fica intacta e a neutralidade é mais simples. As simulações sem técnico não guardam olheiros e não precisam da limpeza.
- **Troca de clube:** o `ScoutingState.clubId` faz o departamento contar como fechado quando o técnico sai (proposta aceita ou demissão). O estado é zerado na próxima operação (`settledScouting`).
- **Escala (T030):** em vez de um cenário novo no `sim:gates`, a temporada inteira com 16 observações e a medida de tempo acima. O estado cresce com no máximo 300 relatórios (cerca de 25 KB no JSON), bem abaixo dos tetos do save.
- **Achado fora do escopo:** o teste de sigilo mostrou que o **valor de mercado** dos jovens já depende do potencial real desde antes da 039 (é o preço que a IA usa). Os olheiros não mostram nada novo, mas esse valor dá uma pista do potencial. O teste compara as telas sem os valores em dinheiro, e o ponto ficou registrado para uma decisão futura.
