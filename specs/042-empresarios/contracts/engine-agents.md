# Contrato: motor — empresários (042)

Módulo novo `packages/engine/src/agents/`. Todas as funções são puras e determinísticas, e exportadas por `@brasfoot-like/engine`.

```ts
// agents/rules.ts
export interface AgentRules {
  perCountry: number; refMonths: number; capMonths: number;
  gapPerInfluence: number; gapMonthsPerPoint: number;
  tradePct: number; wageCapPct: number; headlineMonths: number;
  relation: { signed: number; renewed: number; terminated: number;
              demandRefused: number; abandoned: number; decay: number };
}
export const DEFAULT_AGENTS: AgentRules;
export function agentRules(world: CompletedBank, countryId: string): AgentRules;

// agents/roster.ts
export interface Agent { id: string; countryId: string; name: string; greed: number; influence: number }
export function agentsOf(world: CompletedBank, careerSeed: string, countryId: string): Agent[];
export function agentOf(
  world: CompletedBank, careerSeed: string,
  player: Pick<CompletedPlayer, "id" | "nationalityId">,
): Agent | undefined;
/** Jogadores da carteira (do mundo e livres). */
export function portfolioOf(
  world: CompletedBank, market: MarketState, careerSeed: string, agentId: string,
): { playerId: string; clubId?: string }[];

// agents/relations.ts
export type RelationReason = "signed" | "renewed" | "terminated" | "demand_refused" | "abandoned" | "decay";
export function relationOf(market: MarketState, clubId: string, agentId: string): number; // 50 sem registro
export function bumpRelation(
  market: MarketState, clubId: string, agentId: string,
  reason: Exclude<RelationReason, "decay">, rules: AgentRules,
  when: { season: number; round: number },
): { market: MarketState; broke: boolean };
/** Virada: aproxima as relações de 50. */
export function decayRelations(market: MarketState, rulesOf: (agentId: string) => AgentRules, season: number): MarketState;
export function relationBand(value: number): "broken" | "bad" | "cold" | "neutral" | "good" | "great";

// agents/index.ts
export interface AgentRow { agent: Agent; relation: number; band: ReturnType<typeof relationBand>;
  portfolio: number; lastDeal?: AgentDeal }
export function agentsViewOf(market: MarketState, world: CompletedBank, careerSeed: string,
  clubId: string): AgentRow[];

// agents/commission.ts
export interface CommissionQuote {
  agent: Agent; relation: number;
  wageDemand: number;      // W, a regra de hoje
  ref: number;             // comissão de referência (com o efeito da relação)
  min?: number;            // falta de interesse ao alcance da influência
  unreachable?: true;      // falta de interesse fora do alcance
  cap: number;             // teto
}
export function commissionQuote(
  context: MarketContext, player: CompletedPlayer | FreePlayer,
  clubId: string, years: number, renewal: boolean,
): CommissionQuote | undefined; // undefined: país sem empresários
export function wageWithCommission(quote: CommissionQuote, commission: number, years: number): number;
/** Comissão que a IA paga (relação neutra). */
export function aiCommission(context: MarketContext, player: CompletedPlayer | FreePlayer, clubId: string): number;
```

## Alterações em outros módulos

- **`market/effects.ts`:** `completeTransfer`, `completeSigning` e `completeRenewal` aceitam `commission?: number`:
  - checam o caixa com a taxa e a comissão;
  - lançam `commission` (negativo, sem contrapartida);
  - preenchem `TransferRecord.commission` e `agentId`.
- **`market/player-response.ts`:** `respondToContract(context, player, clubId, wage, renewal, commission?)` usa `commissionQuote`:
  - sem interesse e com `commission ≥ min`: segue pela regra de salário;
  - a comparação do salário usa `wageWithCommission`;
  - `no_interest` devolve `minCommission` quando alcança.
- **`market/negotiation.ts`:**
  - `proposeContract` aceita `commission`; a negociação guarda o valor, e `conclude` o paga (`max(commission, ref)`);
  - eventos de relação: conclusão (+ `signed` ou `renewed`), `answerPlayerDemand(false)` (`demand_refused`), `cancelNegotiation` do técnico na etapa `contract` ou `player_demanded` (`abandoned`).
- **`market/disposal.ts`:** `terminateContract` chama `bumpRelation(..., "terminated")`.
- **`market/ai/round.ts`:** compras e livres da IA passam `aiCommission`.
- **`market/turnover.ts`:**
  - `expire-contracts`: as renovações da IA lançam `aiCommission` na temporada nova;
  - `reset-market`: `decayRelations`.
- **`finance/types.ts`:** `"commission"` em `LEDGER_CATEGORIES`.
- **`model/schemas.ts`:** `market.agents` opcional.
- **`news/agents.ts` (novo), chamado em `news/round.ts`:** manchetes `agentBroke` e `agentBigDeal`.
- **`market/types.ts`:** `AgentsState` em `MarketState.agents?`; `Negotiation.commission?`; `TransferRecord.commission?` e `agentId?`.
