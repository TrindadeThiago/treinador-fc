# Research: Cláusula de revenda (041)

Ponto de partida:
- **Transferência definitiva:** um único ponto, `completeTransfer` (`market/effects.ts`), usado pela compra do técnico (`negotiation.ts`), pela venda imediata (`disposal.ts`), pelas propostas recebidas (`incoming.ts`) e pela IA (`market/ai/round.ts`), inclusive nas ligas de fora (`day.ts`, `foreign: true`).
- **Estado único:** `FinanceState` e `MarketState` do save valem para todos os países. Um pagamento entre países é só um lançamento em dois clubes do mesmo `finances`.
- **Manchetes de mercado:** saem do log da rodada (`TransferRecord`), como `criaSaleNews` (`news/academy.ts`).
- **Testes de arbitragem:** enumeração sobre o mundo de teste (`test/market/arbitrage.test.ts`). Não há `fast-check`, e esta feature não o adiciona: os "testes de propriedade" são enumerações exaustivas determinísticas, como no A2.

## R1 — Onde mora a cláusula

**Decision**: `MarketState.resale?: ResaleState`, opcional (ausente = nenhuma cláusula):
- `clauses: ResaleClause[]`: as cláusulas ativas, no máximo uma por `playerId`, em ordem de criação;
- `receipts: ResaleReceipt[]`: o histórico de cláusulas encerradas (pagas, recompradas ou de jogador que saiu do mundo);
- `nextSeq`: contador local dos ids (`resale-N`).

**Rationale**:
- A cláusula é um fato do mercado, não um atributo do jogador. Fora do `bank`, o formato de mod não muda, e o jogador livre (`market.freeAgents`) mantém a cláusula sem cópia.
- Com o campo ausente, o save serializado de quem nunca usou a feature é igual ao da 1.13 (neutralidade, FR-020).
- Toda cláusula nasce de um negócio do técnico (a IA não cria cláusula entre si), então o histórico cresce só com a atividade do técnico. Teto de segurança: `receipts` guarda os últimos `RESALE_RECEIPTS_MAX = 200`, uma constante exportada por `market/resale.ts` (motor). O `scale-limits` do save só valida usando essa constante.

**Alternatives considered**: um campo `resale` em `CompletedPlayer`. Rejeitado: entraria no schema do banco e do mod e teria de ser copiado para `FreePlayer`.

## R2 — Pagamento dentro de `completeTransfer`

**Decision**: `completeTransfer` ganha a entrada opcional `resale?: { creditorClubId; pct }` (a cláusula nova) e passa a:
1. procurar a cláusula ativa do jogador;
2. se houver e o comprador for o credor: encerrá-la sem pagamento (`outcome: "bought_back"`);
3. se houver e o comprador for outro clube: calcular `amount = min(fee, arredonda_mil_para_cima(fee × pct / 100))` e lançar `-amount` no vendedor e `+amount` no credor, na categoria `resale`; encerrar com `outcome: "paid"`;
4. depois, se a entrada trouxer uma cláusula nova, registrá-la (o credor é o vendedor).

O `TransferRecord` ganha `resalePaid?: { clubId; amount }` e `resaleCreated?: { clubId; pct }`.

**Rationale**:
- Um ponto só cobre todos os caminhos: técnico, IA, entre países e ligas de fora (FR-009).
- O mesmo valor sai e entra (`post` duas vezes com sinais opostos), então a soma dos caixas não muda (FR-013), e a checagem do save (`cash = seasonStartCash + Σ ledger`) continua valendo.
- A fatia sai do valor recebido na mesma operação. O vendedor nunca fica devendo por falta de caixa: o pagamento não passa pela checagem de caixa, que vale só para o comprador.
- Arredondamento: a fatia arredonda **para cima** ao milhar, limitada a `fee`. Assim quem paga a cláusula nunca paga menos que o percentual.

**Alternatives considered**: lançar a venda já líquida em `transfer_sale`. Rejeitado: esconderia a revenda paga no livro-caixa, e a spec pede a categoria "Revendas" nos dois lados.

## R3 — Categoria do livro-caixa

**Decision**: `LEDGER_CATEGORIES` ganha `"resale"` no fim (pt-BR: "Revendas"). Positiva no credor, negativa no vendedor. Os resumos de temporada antigos (`totals`) sem a chave são lidos como 0, como foi feito com `academy` e `scouting` (037, 039). A migração preenche `resale: 0` nos resumos para manter o tipo `Record<LedgerCategory, number>`.

## R4 — Regra de desconto e teto

**Decision**: regras em `competition.market.resale` (por competição, como as demais de mercado), com os padrões:

| Regra | Padrão |
|---|---|
| `minPct`, `maxPct`, `stepPct` | 5, 50, 5 |
| `discountPerPointPct` | 1 (cada ponto tira 1% do valor) |
| `aiMaxPct` (teto que a IA compradora aceita) | 30 |
| `aiAskPct` (o que a IA vendedora pede) | 20 |
| `aiAskMaxAge` | 21 |
| `headlinePayrollPct` (manchete a partir de) | 100 (uma folha mensal de referência) |

O valor com cláusula é `arredonda_mil_para_cima(valor × (100 − pct × discountPerPointPct) / 100)`. O desconto nunca passa do percentual exato, então quem compra com cláusula nunca paga menos que a conta exata. A regra usada é a da competição do clube que vende.

**Validação (Zod)**: `minPct ≥ 1`, `maxPct ≤ 90`, `minPct ≤ maxPct`, `(maxPct − minPct)` múltiplo de `stepPct`, `aiMaxPct` e `aiAskPct` dentro da faixa e no passo, `discountPerPointPct` entre 0 e 1 (ver R6), `aiAskMaxAge` entre 15 e 40.

**Rationale**: um desconto proporcional ao valor vale em qualquer escala econômica. Com 1% por ponto, a cláusula é uma aposta justa no momento da venda (o vendedor só ganha se o jogador valorizar).

## R5 — Onde a cláusula entra em cada negociação

**Decision**:
- **Proposta recebida (`answerIncomingOffer`):** `accept` e `counter` ganham `resalePct?`. No `accept`, a IA aceita se `resalePct ≤ aiMaxPct` e paga o valor com desconto. No `counter`, o valor pedido é avaliado já com desconto contra `maxBidFor` e o caixa, como hoje. Acima do teto, o motor recusa com `market.resale_above_ceiling` (a UI impede antes).
- **Venda imediata (`quoteSale`, `sellNow`):** `resalePct?` opcional. O comprador é escolhido exatamente como hoje, com o `fee` sem desconto (FR-006). O desconto é aplicado depois da escolha. A cotação devolve `fee`, `discount` e `netFee`.
- **Compra do técnico (`startNegotiation`, `proposeContract`):** quando o clube aceita ou contrapropõe por um jogador de até `aiAskMaxAge` na data da temporada, a negociação guarda `resaleAsk: { pct }`. No `proposeContract`, a entrada `acceptResale?: boolean` decide. Com `true`, o `fee` vira o valor com desconto e a cláusula nasce a favor do clube vendedor; com `false` ou ausente, o `fee` cheio e nenhuma cláusula nova.
- **IA × IA (`aiMarketRound`):** nunca passa `resale`. Só paga as cláusulas existentes (R2).

**Rationale**: a decisão de pedir é uma comparação de idade (sem PRNG), então não consome sorte (FR-008). A pedida e a resposta do clube não mudam, e o desconto é aplicado por cima. Por isso a resposta sem cláusula é idêntica à 1.13.

## R6 — Arbitragem e o piso do A2

**Decision**: provar por enumeração, sobre todos os jogadores do mundo de teste e todos os percentuais válidos, que:
1. **comprar com cláusula e vender na hora:** `fee_compra × (1 − p·d) ≥ venda_imediata × (1 − p)` para `d ≤ 1%`. Como o piso do A2 garante `fee_compra ≥ venda_imediata`, basta `d ≤ 1`. Por isso o schema limita `discountPerPointPct ≤ 1`;
2. **vender com cláusula e recomprar:** o técnico recebe `fee × (1 − p·d)` e paga ao recomprar a pedida normal (`buyAskingPrice`, com o piso), e a cláusula se encerra sem pagamento. O ganho nunca supera o do mesmo ciclo sem cláusula;
3. **conservação:** em cada transferência gerada (qualquer par de clubes, inclusive de países diferentes, com ou sem cláusula ativa e nova), `Σ cash` antes = `Σ cash` depois.

O `sim:economy` ganha o cenário `resale`, com os limites declarados no cenário:
- **ciclos de arbitragem com cláusula:** razão máxima ≤ a do ciclo sem cláusula;
- **carreira de 10 temporadas:** um técnico automático vende as crias com 30% e compra jovens aceitando a cláusula. Mede o caixa da IA e a soma do dinheiro.

**Rationale**: é o mesmo método do A2 (`arbitrage.test.ts`) e da 040 (`runRecruitmentScenario`), sem dependência nova.

## R7 — Equilíbrio e neutralidade

**Decision**:
- **Sem cláusula criada, nada muda:** `completeTransfer` sem cláusula ativa e sem `resale` faz exatamente o que faz hoje (nenhum lançamento novo, nenhum campo novo no record), e `market.resale` fica ausente. As linhas de base existentes (`sim:gates`, os testes de seed) passam sem regravar.
- **Equilíbrio em 30 temporadas:** o mundo sem técnico não cria cláusulas. Por isso a medição de 30 temporadas usa o técnico automático do cenário `resale` (R6) por 30 temporadas. Os limites do caixa da IA e das faixas do mundo (força, craques, promessas) são os da 036 e do `sim:economy` atual. Uma linha de base que mude só por cláusula é registrada no PR.

## R8 — Fim da cláusula por saída do mundo

**Decision**: na virada, depois da aposentadoria (`retirePlayersStep`), o save remove as cláusulas de jogadores que não estão em `bank.players` nem em `market.freeAgents` e registra `ResaleReceipt` com `outcome: "retired"` e `amount: 0`.

**Rationale**: o jogador aposentado some do mundo. Sem limpeza, a lista "a receber" mostraria fantasmas.

## R9 — Manchete

**Decision**: a manchete nova `resaleReceived` sai do log da rodada (como `criaSaleNews`) quando:
- `resalePaid.clubId` é o clube do técnico;
- `amount ≥ headlinePayrollPct% × referenceMonthlyPayroll(clube do técnico)`.

Variáveis: `player`, `buyer`, `fee`, `amount`, `pct` e `cria` (`select`: o jogador é cria da base do clube, pelo `renewal.academy.graduates`). Vale nas rodadas do país do técnico e nas ligas de fora (pagamento de outro país).

## R10 — Save

**Decision**: save v25 → v26:
- `market.resale` é opcional e começa ausente;
- os resumos de temporada recebem `resale: 0`;
- as negociações abertas não têm `resaleAsk`, então uma compra em andamento na migração segue sem cláusula pedida.

Fixture `saveV25` e teste `migrate-v26.test.ts`: abre, migra e chega à virada seguinte (SC-007).

## R11 — Versão

**Decision**: 1.14.0 (minor), com a nota do dia em Brasília (`date`), no mesmo PR.
