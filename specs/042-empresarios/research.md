# Research: Empresários (042)

Ponto de partida:
- **Resposta do jogador:** `market/player-response.ts`:
  - `attraction` e `exigency`;
  - `wageDemand`: o salário pedido cresce com a diferença exigência − atração;
  - `respondToContract`: recusa `no_interest` quando a atração fica abaixo da exigência menos `interestMargin`.
- **Pontos de assinatura (`market/effects.ts`):**
  - `completeTransfer`: compra do técnico e da IA;
  - `completeSigning`: livre, do técnico e da IA;
  - `completeRenewal`: renovação do técnico;
  - **renovações da IA:** na etapa `expire-contracts` da virada (`market/turnover.ts`), depois de `close-finance-season`.
- **Nomes:** `nameBankFor(world, countryId)`, pelo banco do país do mod.
- **Livro-caixa:** a 041 fez o mesmo caminho com a categoria `resale`.

## R1 — Empresários e carteiras derivados, sem guardar

**Decision**: a lista de empresários e a carteira de cada jogador são **funções puras**, sem PRNG do jogo, da seed da carreira e do banco do save:
- `agentsOf(world, careerSeed, countryId)` gera os empresários do país, com memo por `world` + seed:
  - **quantidade:** `rules.perCountry`;
  - **id:** `agent-<countryId>-<n>`;
  - **nome:** nome e sobrenome do banco de nomes do país, sorteados com `createRng(\`${seed}:agent:${countryId}:${n}\`)`;
  - **ganância e influência:** de 1 a 5, pela mesma semente;
- `agentOf(world, careerSeed, player)`: o empresário do país de nacionalidade, escolhido por `hash(\`${seed}:agent-of:${player.id}\`) mod n`.

O save guarda só o que muda com a carreira: as **relações** e o histórico curto de negócios (R4).

**Rationale**:
- Todo jogador que surge (safra, captação, regulador, emergência, livres) já "tem" empresário, sem ganchos em cada ponto de criação (FR-002).
- **Migração trivial:** um save da 1.14 já tem tudo para derivar os empresários.
- **Save:** nada cresce com o número de jogadores (FR-021).
- O save tem a própria cópia do banco (Princípio VI), então os empresários de uma carreira nunca mudam.

**Alternatives considered**: guardar a lista e um `agentId` em cada jogador. Rejeitado:
- mexe no schema do jogador e do mod;
- exige ganchos em todos os pontos de criação;
- aumenta o save.

## R2 — A regra da comissão

Símbolos:
- `W`: o salário pedido pela regra de hoje (`wageDemand`);
- `Y`: os anos de contrato;
- `g`: a ganância e `i`: a influência do empresário;
- `r`: a relação com o clube do técnico (50 para a IA).

**Comissão de referência:** `Cref = arredonda_mil(W × refMonths × g / 3 × fator(r))`:
- `refMonths` vale 1,5 por padrão; com ganância 3, uma folha e meia mensal do jogador;
- `fator(r) = 1 + (50 − r) / 100`, de 0,5 com relação 100 até 1,5 com relação 0;
- **rompimento** (`r = 0`, decisão A de 2026-11-11): `Cref = Cmax = arredonda_mil(W × capMonths)`, com `capMonths` 6 por padrão.

**Comissão mínima com falta de interesse:**
- `gap = (exigência − interestMargin) − atração` > 0;
- o empresário cobre até `gapPerInfluence × i` pontos (padrão 4, ou seja, de 4 a 20);
- acima disso, o jogador continua sem interesse, qualquer que seja a comissão;
- dentro do limite, `Cmin = Cref + arredonda_mil(W × gapMonthsPerPoint × gap)`, com `gapMonthsPerPoint` 0,5 por padrão;
- com `C ≥ Cmin`, a resposta segue pela regra de salário (FR-009).

**Troca por salário:**
- o excedente `E = C − Cpedida` (a pedida é `Cmin` sem interesse, ou `Cref`) baixa o salário pedido em `ΔW = piso_cem(E × tradePct / 100 / (12 × Y))`, com `tradePct` 80 por padrão;
- o teto é `wageCapPct` (padrão 15%) de `W`.

**Garantia de FR-010:** `ΔW × 12 × Y ≤ E × 0,8 < E`. O salário economizado no contrato é sempre menor que a parte da comissão que o compra. O schema limita `tradePct` a no máximo 100.

**Sem comissão, ou com `C < Cpedida`:**
- **com interesse:** a resposta é a de hoje, e a comissão paga é `max(C, Cref)`, porque o empresário não fecha abaixo da referência;
- **sem interesse:** o jogador recusa por falta de interesse.

A UI mostra `Cref` e já vem preenchida com ele, então "propor sem mexer" dá a resposta de hoje com `Cref` paga (FR-011).

**Rationale**: a regra só usa números que o jogo já calcula (salário pedido, exigência e atração). Os padrões ficam numa escala que pesa (meses de salário), mas sem dominar a folha.

## R3 — Onde a comissão é paga

**Decision**:
- **Entrada nova `commission?: number`** em `completeTransfer`, `completeSigning` e `completeRenewal`. Ela lança `-commission` no clube que contrata, na categoria nova `commission` ("Comissões"), e não lança nada em contrapartida: o dinheiro sai do mundo, como o salário.
- **Checagem de caixa:** a do comprador passa a cobrir `fee + commission`.
- **Técnico:** `proposeContract` recebe `commission`. O valor passa a `conclude`, que o envia ao efeito, e a negociação guarda a comissão proposta (`Negotiation.commission`) para o pedido de salário do atleta.
- **IA:** `aiMarketRound` (compras e livres) passa `Cref` calculado com `r = 50`. As renovações da IA em `expire-contracts` lançam `Cref` na temporada nova, como a manutenção da academia (depois de `close-finance-season`).

**Rationale**: os mesmos efeitos já são o ponto único das transferências (041); a comissão segue o mesmo caminho para técnico e IA (FR-012).

## R4 — Relações

**Decision**: `MarketState.agents?: AgentsState`, ausente até o primeiro evento:
- `relations: Record<clubId, Record<agentId, { value; reason; season; round }>>`: só entram clubes do técnico (o atual e os anteriores);
- `deals: AgentDeal[]`: os últimos 100 negócios do técnico com empresários (jogador, tipo, comissão, data), para a lista da aba Mercado.

**Eventos** (valores em `rules.relation`):

| Evento | Variação padrão |
|---|---|
| contratação concluída (compra ou livre) | +5 |
| renovação concluída | +3 |
| rescisão | −15 |
| o técnico recusa o salário pedido pelo jogador | −8 |
| o técnico cancela a negociação na etapa do contrato ou do pedido | −4 |
| retorno ao neutro na virada (`reset-market`) | 5 pontos |

O valor fica sempre entre 0 e 100. Chegar a 0 vindo de cima marca o **rompimento**, com manchete (R6).

**Rationale**: no mercado, as ações do técnico já devolvem `MarketUpdate.market`. Os clubes da IA nunca entram (FR-006).

## R5 — Regras e mod

**Decision**: `competition.market.agents` (opcional, a da competição principal do país do empresário), com os padrões:

| Campo | Padrão | Faixa |
|---|---|---|
| `perCountry` | 8 | 0 a 30 |
| `refMonths` | 1,5 | 0 a 6 |
| `capMonths` | 6 | ≥ `refMonths`, até 24 |
| `gapPerInfluence` | 4 | 0 a 20 |
| `gapMonthsPerPoint` | 0,5 | 0 a 5 |
| `tradePct` | 80 | 0 a 100 |
| `wageCapPct` | 15 | 0 a 50 |
| `relation` | +5, +3, −15, −8, −4, retorno 5 | inteiros de −50 a 50; retorno de 0 a 50 |
| `headlineMonths` | 3 (folhas mensais de referência do clube) | 0 a 100 |

`perCountry = 0` desliga os empresários do país: sem comissão, com a regra de hoje.

## R6 — Manchetes

- **`agentBroke`:** a relação de um empresário com o clube do técnico chega a 0. Variáveis: o empresário, o clube e o motivo do último desgaste (`select`).
- **`agentBigDeal`:** o técnico assina com comissão ≥ `headlineMonths` × `referenceMonthlyPayroll`. Variáveis: o empresário, o jogador e a comissão.

As duas saem do log da rodada, como a `resaleReceived` da 041. O log ganha `TransferRecord.commission?` e `agentId?`.

## R7 — Equilíbrio e linhas de base

**Decision**:
- **Calibração de `refMonths`:** pelo `sim:economy`, com o caixa da IA e as faixas atuais. A conta inicial: uns 1,5 mês de salário por assinatura, com cerca de um terço do elenco assinando por ano, dá perto de 4% da folha anual. Se o caixa da IA sair dos limites, baixa `refMonths` ou ajusta a reserva da IA (como na 037), registrando no research.
- **Medidas:** as 30 temporadas (`sim:economy` e `long-run`), o `sim:gates` e a continental completa em 3 seeds (`padrão`, `var-a`, `var-b`), comparada à 1.14.0, como na 037.
- **Linhas de base regravadas no mesmo PR:** `equivalence-baseline.json`, os snapshots de composição e continental e `stages-freeze`, se mudar. O PR registra o que mudou e desde quando.
- **Determinismo:** a mesma seed dá a mesma carreira (teste de equivalência regravado e repetido).

## R8 — Propriedades de dinheiro

Por enumeração, como na 041:
- **comissão sai e não volta:** `Σ cash` depois = antes − comissões pagas, e nenhuma operação posterior (venda, rescisão, fim de contrato) devolve comissão;
- **troca por salário:** para todo `W`, `Y`, ganância, influência, relação e `C`, `ΔW × 12 × Y ≤ E`;
- **comprar, renovar e vender:** nunca rende mais que o mesmo ciclo sem comissão.

## R9 — Desempenho

`agentOf` é um hash; `agentsOf` tem memo por mundo e seed. Por assinatura, o custo é constante. Medido no `sim:gates`, com as metas da 020 (dia ≤ 600 ms, virada ≤ 6 s, save).

## R10 — Save

Save v26 → v27: `market.agents` opcional, ausente na migração (todas as relações neutras). A fixture `saveV26` e o teste `migrate-v27.test.ts` cobrem SC-006: todo jogador do save migrado tem empresário derivável, e ele chega à virada.

## R11 — Versão

1.15.0 (minor), com a nota do dia em Brasília, no mesmo PR.

## Calibração (T020)

`sim:economy`, seed `economia`, 30 temporadas sem interação, com a IA pagando a comissão de referência nas compras, nos livres e nas renovações:

| `refMonths` | Fora de crise (média) | Spearman reputação × caixa | Caixa mediano no fim | Resultado |
|---|---|---|---|---|
| sem empresários (= 1.14.0) | 99,5% | 0,880 | 5,3 mi | referência |
| 1,5 (plano) | 69,8% | 0,165 | 0,7 mi | ✗ a partir da 16ª temporada |
| 1,0 | 84,7% | 0,646 | 3,0 mi | ✗ |
| 0,75 | 95,0% | 0,873 | 4,2 mi | ✓, mas com perda visível |
| **0,5 (padrão)** | **99,0%** | **0,886** | **5,3 mi** | ✓, igual à 1.14.0 |
| 0,25 | 98,1% | 0,888 | 5,2 mi | ✓ |

**Decisão**: `refMonths = 0,5`. A comissão de referência fica entre 0,17 e 0,83 mês do salário pedido, pela ganância de 1 a 5. A economia é fechada e apertada: um custo recorrente de uma folha e meia mensal por assinatura tirava, em 30 temporadas, mais do que os clubes da IA acumulam. Com 0,5, o efeito no caixa da IA fica dentro do ruído da seed. Os outros padrões (`capMonths` 6, `gapMonthsPerPoint` 0,5, `tradePct` 80, `wageCapPct` 15) não mudam: só afetam o técnico.

## Linhas de base regravadas (T020)

- `equivalence-baseline.json`: nas duas seeds, as partidas só diferem na 2ª temporada (rodada 57 de 76 em `equivalencia`, 59 em `banco-padrao`), quando as compras da IA já pagaram comissões. Todos os resumos financeiros diferem, porque a categoria `commission` entra neles.
- Snapshots `composition-baseline` e `continental-baseline` (5): as composições das temporadas seguintes mudam com as compras da IA.
- `match/baseline.json` e `stages-freeze`: não mudam (partidas isoladas e fases).
- Depois de regravar, a equivalência roda de novo sem regravar e passa (determinismo).

## Outros limites revistos

- **Save de 30 temporadas** (`packages/save/test/long-career.test.ts`): 1,6 MB → 1,65 MB, decisão do usuário em 2026-11-11. A categoria "Comissões" nos resumos financeiros soma +29,5 KB (1.661.270 → 1.690.806 bytes). As comissões dos negócios da IA ficam só no livro-caixa (o registro de transferência só as guarda nos negócios do técnico).
- **CI da continental** (`CONTINENTAL_LIMITS.ci.minChampionStrongerShare`): 0,6 → 0,5. A seed `longo-continental-a` passou de 9 para 5 em 10; a `b` ficou em 7. Na continental completa (30 temporadas, mundo grande) as 3 seeds dão 70%, 90% e 73% (limite `full` 70%) e passam em todos os critérios.
- **Tamanho do save no modo `--continental`** (fora do `sim:gates`): já passava das metas da 020 sem empresários (14,08 MB no início da temporada 31, 269 KB por temporada, 42,08 MB na última rodada). Com os empresários: 14,38 MB, 271 KB e 42,57 MB.
