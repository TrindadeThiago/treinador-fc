# Data Model: Empresários (042)

## Agent (derivado, não guardado)

| Campo | Tipo | Regra |
|---|---|---|
| `id` | `string` | `agent-<countryId>-<n>`, com n de 1 a `perCountry` |
| `countryId` | `string` | o país do empresário |
| `name` | `string` | nome e sobrenome do banco de nomes do país |
| `greed` | `1..5` | ganância |
| `influence` | `1..5` | influência |

Gerado por `agentsOf(world, careerSeed, countryId)`. A carteira é `agentOf(world, careerSeed, player)`: o empresário do país de nacionalidade, por hash do id do jogador. País com `perCountry = 0` não tem empresários.

## AgentRelation (guardado)

| Campo | Tipo | Regra |
|---|---|---|
| `value` | `int 0..100` | 50 = neutro (o valor quando não há registro) |
| `reason` | `"signed" \| "renewed" \| "terminated" \| "demand_refused" \| "abandoned" \| "decay"` | o último motivo da mudança |
| `season`, `round` | `int` | quando mudou |

## AgentDeal (guardado; últimos 100)

`{ agentId, clubId, playerId, displayName, kind: "buy" | "free" | "renew", commission, season, round }`

## AgentsState (em `MarketState.agents?`)

```text
{ relations: Record<clubId, Record<agentId, AgentRelation>>; deals: AgentDeal[] }
```

Ausente = nenhum evento ainda: todas as relações são neutras. Só os clubes do técnico (o atual e os anteriores) aparecem.

## Mudanças em tipos existentes

- **`LedgerCategory`:** `+ "commission"`.
- **`completeTransfer`, `completeSigning`, `completeRenewal`:** entrada `commission?: number`.
- **`TransferRecord`:** `commission?: number` e `agentId?: string`.
- **`Negotiation`:** `commission?: number`, a proposta do técnico, mantida para o pedido de salário.
- **`proposeContract`:** a oferta ganha `commission?: number`.
- **`PlayerResponse`:** a recusa `no_interest` ganha `minCommission?: number`, quando a comissão alcança.

## AgentRules (mod: `competitions[].market.agents`, opcional)

Ver a tabela de `research.md` (R5). Validação Zod: as faixas, `capMonths ≥ refMonths` e `tradePct ≤ 100` (este garante FR-010).

## Funções da comissão (`agents/commission.ts`)

- `commissionQuote(context, player, clubId, years, relation)` devolve `{ ref, min?, cap, wageDemand, agent }`, onde `min` só existe com falta de interesse dentro do alcance da influência.
- `wageWithCommission(quote, commission, years)` devolve o salário pedido depois da troca.
- `relationFactor(r) = 1 + (50 − r) / 100`. Com `r = 0`, a comissão de referência vai ao teto.

## Transições da relação

```text
neutro (50, sem registro)
  ──contratação +5 / renovação +3──▶ sobe (≤ 100)
  ──rescisão −15 / salário recusado −8 / abandono −4──▶ desce (≥ 0)
  ──virada──▶ aproxima-se de 50 por 5, sem passar
  ──chega a 0──▶ rompimento: manchete; comissão de referência = teto enquanto r = 0
```

## Invariantes

1. Todo jogador de um país com empresários tem exatamente um empresário, e ele não muda.
2. `Σ cash` depois de uma assinatura = antes − comissão: a taxa só muda de caixa, e a comissão é o único dinheiro que sai do mundo.
3. Salário economizado pela troca ≤ comissão excedente (FR-010).
4. Nenhum clube da IA aparece em `relations`.
