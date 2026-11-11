# Data Model: Cláusula de revenda (041)

Valores monetários são inteiros (múltiplos de mil nas taxas), e os percentuais são inteiros.

## ResaleClause (ativa)

| Campo | Tipo | Regra |
|---|---|---|
| `id` | `string` | `resale-N`, de `ResaleState.nextSeq` |
| `playerId` | `string` | no máximo uma cláusula ativa por jogador |
| `creditorClubId` | `string` | o clube que vendeu e vai receber |
| `pct` | `int` | dentro de `[minPct, maxPct]` e no passo `stepPct` da regra da venda |
| `season`, `round` | `int` | quando nasceu |
| `fromClubId`, `toClubId` | `string` | a venda que a criou (o credor é `fromClubId`) |
| `fee` | `int` | o valor pago na venda que a criou (já com desconto) |

## ResaleReceipt (encerrada)

| Campo | Tipo | Regra |
|---|---|---|
| `clauseId`, `playerId`, `displayName`, `creditorClubId`, `pct` | — | copiados da cláusula |
| `outcome` | `"paid" \| "bought_back" \| "retired"` | |
| `sellerClubId?`, `buyerClubId?` | `string` | presentes em `paid` e `bought_back` |
| `saleFee` | `int` | o valor da venda que encerrou (0 em `retired`) |
| `amount` | `int` | `min(saleFee, arredonda_mil_para_cima(saleFee × pct / 100))` em `paid`; 0 nos outros |
| `season`, `round` | `int` | quando encerrou |

## ResaleState (em `MarketState.resale?`)

```text
{ clauses: ResaleClause[]; receipts: ResaleReceipt[]; nextSeq: number }
```

Ausente = nenhuma cláusula criada (neutralidade). `receipts` guarda no máximo os últimos `RESALE_RECEIPTS_MAX` (200, constante do motor).

## Mudanças em tipos existentes

- **`LedgerCategory`:** `+ "resale"`.
- **`TransferRecord`:**
  - `resalePaid?: { clubId: string; amount: number }`, quando a venda pagou uma cláusula (`amount` pode ser 0 em venda de valor 0);
  - `resaleCreated?: { clubId: string; pct: number }`, quando a venda criou uma cláusula.
- **`Negotiation`:** `resaleAsk?: { pct: number }`, o que a IA vendedora pede (só em `kind: "buy"`, jogador de até `aiAskMaxAge`).
- **`IncomingAnswer`:** `{ kind: "accept"; resalePct?: number }` e `{ kind: "counter"; fee; resalePct?: number }`.
- **`SaleQuote`:** `+ resalePct?`, `discount`, `netFee` (sem cláusula: `discount = 0`, `netFee = fee`).
- **Regras:** `ResaleRules` fica fora de `MarketRules`, com função própria (`resaleRules(world, competitionId)`), como `aiMarketRules`; lê `competition.market.resale`.
- **`ResaleClause`:** guarda também `displayName` (o histórico precisa do nome depois que o jogador sai do mundo).
- **`Negotiation`:** `resaleAccepted?: boolean`, a escolha do técnico, que sobrevive ao pedido de salário do atleta.

## ResaleRules (mod: `competitions[].market.resale`, opcional)

| Campo | Padrão | Validação |
|---|---|---|
| `minPct` | 5 | 1 ≤ `minPct` ≤ `maxPct` |
| `maxPct` | 50 | ≤ 90 |
| `stepPct` | 5 | ≥ 1; `(maxPct − minPct) % stepPct = 0` |
| `discountPerPointPct` | 1 | 0 ≤ x ≤ 1 (garante o piso do A2 no líquido, research R6) |
| `aiMaxPct` | 30 | na faixa e no passo |
| `aiAskPct` | 20 | na faixa e no passo |
| `aiAskMaxAge` | 21 | 15 a 40 |
| `headlinePayrollPct` | 100 | ≥ 0; % da folha mensal de referência |

## Transições

```text
(nenhuma) ──venda definitiva com resale──▶ ATIVA
ATIVA ──empréstimo / rescisão / fim de contrato / contratação como livre──▶ ATIVA (sem pagamento)
ATIVA ──venda definitiva a outro clube──▶ receipt "paid" (fatia: vendedor → credor, categoria resale)
ATIVA ──venda definitiva ao credor──▶ receipt "bought_back" (sem pagamento)
ATIVA ──jogador sai do mundo (virada)──▶ receipt "retired"
```

Uma mesma venda pode encerrar a cláusula anterior e criar uma nova. A ordem é sempre encerrar, depois criar.

## Invariantes

1. `|{ c ∈ clauses : c.playerId = x }| ≤ 1` para todo `x`.
2. Toda transferência e todo pagamento de revenda mantêm `Σ finances.clubs[*].cash`.
3. `cash = seasonStartCash + Σ ledger` por clube (checagem do save, inalterada).
4. Sem cláusulas criadas, `market.resale` ausente e o `TransferRecord` igual ao da 1.13.
