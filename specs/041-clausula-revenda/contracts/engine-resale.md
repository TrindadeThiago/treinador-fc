# Contrato: motor — cláusula de revenda (041)

Arquivo novo: `packages/engine/src/market/resale.ts`. Todas as funções são puras e determinísticas, e exportadas por `@brasfoot-like/engine`.

```ts
export interface ResaleRules {
  minPct: number; maxPct: number; stepPct: number;
  discountPerPointPct: number;
  aiMaxPct: number; aiAskPct: number; aiAskMaxAge: number;
  headlinePayrollPct: number;
}
export const DEFAULT_RESALE: ResaleRules;
/** Recebimentos guardados no histórico (os mais recentes). */
export const RESALE_RECEIPTS_MAX = 200;
export function resaleRules(world: CompletedBank, competitionId: string): ResaleRules;

/** Percentuais válidos da faixa, em ordem (para o seletor da UI). */
export function resaleSteps(rules: ResaleRules): number[];
export function isValidResalePct(rules: ResaleRules, pct: number): boolean;

/** Valor com o desconto da cláusula: arredonda_mil_para_cima(fee × (100 − pct × discountPerPointPct) / 100). */
export function feeWithResale(fee: number, pct: number, rules: ResaleRules): number;

/** Cláusula ativa do jogador, se houver. */
export function activeClause(market: MarketState, playerId: string): ResaleClause | undefined;

/** Fatia que uma venda por `fee` pagaria hoje (0 se o comprador for o credor ou sem cláusula). */
export function resaleShare(market: MarketState, playerId: string, buyerClubId: string, fee: number): number;

/** A IA vendedora pede cláusula a este jogador? (idade ≤ aiAskMaxAge na data da temporada; sem PRNG) */
export function aiAsksResale(context: MarketContext, player: CompletedPlayer): { pct: number } | undefined;

/** Cláusulas a receber e a pagar do clube, e o histórico de recebimentos dele. */
export function clubResaleView(market: MarketState, clubId: string): {
  receivable: ResaleClause[]; payable: ResaleClause[]; receipts: ResaleReceipt[]; totalReceived: number;
};

/** Virada: encerra como "retired" as cláusulas de quem não está no mundo nem nos livres. */
export function pruneResale(market: MarketState, world: CompletedBank, season: number): MarketState;
```

**Erros novos (`MarketErrorCode`):** `market.resale_invalid_pct` e `market.resale_above_ceiling` (params: `max`).

## Alterações em outros módulos

- **`market/effects.ts`, `completeTransfer(context, { playerId, toClubId, fee, contract?, resale? })`:**
  - `resale?: { pct: number }`; o credor é sempre o clube vendedor;
  - antes de mover o dinheiro, encerra a cláusula ativa (pagando ou não, research R2);
  - depois, cria a nova;
  - preenche `resalePaid` e `resaleCreated` no `TransferRecord`.
- **`market/incoming.ts`, `answerIncomingOffer`:** `accept` e `counter` aceitam `resalePct?`:
  - valida a faixa e o passo (`resale_invalid_pct`) e o teto (`resale_above_ceiling`);
  - liquida pelo `feeWithResale`;
  - no `counter`, compara o valor já com desconto a `maxBidFor` e ao caixa.
- **`market/disposal.ts`:**
  - `quoteSale(context, playerId, resalePct?)` escolhe o comprador sem olhar o percentual e devolve `fee`, `discount` e `netFee`;
  - `sellNow(context, playerId, resalePct?)`.
- **`market/negotiation.ts`:**
  - `startNegotiation` e `answerClubCounter` gravam `resaleAsk` quando `aiAsksResale` responde;
  - `proposeContract(context, id, wage, years, { acceptResale?: boolean })`: com `true` e `resaleAsk`, o `fee` vira `feeWithResale(agreedFee, pct)` e a cláusula nasce a favor de `fromClubId`; a checagem de caixa usa o valor final.
- **`market/rules.ts` e `model/schemas.ts`:** `market.resale` opcional, validado por Zod (data-model).
- **`finance/types.ts`:** `"resale"` no fim de `LEDGER_CATEGORIES`.
- **`news/resale.ts` (novo), chamado em `news/round.ts`:** manchete `resaleReceived` (research R9).
- **`market/ai/round.ts`:** sem mudança de lógica; os pagamentos vêm do `completeTransfer`.
