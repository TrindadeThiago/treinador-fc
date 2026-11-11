import type { AgentRelationReason, AgentsState, MarketState } from "../market/types";
import type { AgentRules } from "./rules";

export const NEUTRAL_RELATION = 50;
/** Negócios guardados para a lista do Mercado (os mais recentes). */
export const AGENT_DEALS_MAX = 100;
/** Rompimentos guardados para as manchetes (os mais recentes). */
export const AGENT_RUPTURES_MAX = 20;

/** Relação do empresário com o clube; 50 (neutra) sem registro. */
export function relationOf(
  market: Pick<MarketState, "agents">,
  clubId: string,
  agentId: string,
): number {
  return market.agents?.relations[clubId]?.[agentId]?.value ?? NEUTRAL_RELATION;
}

const DELTA: Record<Exclude<AgentRelationReason, "decay">, keyof AgentRules["relation"]> = {
  signed: "signed",
  renewed: "renewed",
  terminated: "terminated",
  demand_refused: "demandRefused",
  abandoned: "abandoned",
};

function emptyAgents(): AgentsState {
  return { relations: {}, deals: [] };
}

/**
 * Muda a relação pelo motivo (R4), entre 0 e 100. `broke` marca a chegada a 0 vindo de cima: o
 * rompimento, com manchete e comissão no teto enquanto durar.
 */
export function bumpRelation(
  market: MarketState,
  clubId: string,
  agentId: string,
  reason: Exclude<AgentRelationReason, "decay">,
  rules: AgentRules,
  when: { season: number; round: number },
): { market: MarketState; broke: boolean } {
  const state = market.agents ?? emptyAgents();
  const before = relationOf(market, clubId, agentId);
  const value = Math.max(0, Math.min(100, before + rules.relation[DELTA[reason]]));
  const relations = {
    ...state.relations,
    [clubId]: { ...state.relations[clubId], [agentId]: { value, reason, ...when } },
  };
  const broke = value === 0 && before > 0;
  const ruptures = broke
    ? [...(state.ruptures ?? []), { agentId, clubId, reason, ...when }].slice(-AGENT_RUPTURES_MAX)
    : state.ruptures;
  return {
    market: { ...market, agents: { ...state, relations, ...(ruptures ? { ruptures } : {}) } },
    broke,
  };
}

/** Registra um negócio do técnico (os mais recentes, até `AGENT_DEALS_MAX`). */
export function recordDeal(market: MarketState, deal: AgentsState["deals"][number]): MarketState {
  const state = market.agents ?? emptyAgents();
  const deals = [...state.deals, deal];
  return {
    ...market,
    agents: {
      ...state,
      deals: deals.length > AGENT_DEALS_MAX ? deals.slice(deals.length - AGENT_DEALS_MAX) : deals,
    },
  };
}

/** Virada: cada relação se aproxima de 50 por `decay` pontos, sem passar. */
export function decayRelations(
  market: MarketState,
  rulesOf: (agentId: string) => AgentRules,
  season: number,
): MarketState {
  const state = market.agents;
  if (!state) return market;
  const relations: AgentsState["relations"] = {};
  for (const [clubId, byAgent] of Object.entries(state.relations)) {
    relations[clubId] = {};
    for (const [agentId, relation] of Object.entries(byAgent)) {
      const step = rulesOf(agentId).relation.decay;
      const gap = NEUTRAL_RELATION - relation.value;
      const value =
        gap > 0 ? relation.value + Math.min(step, gap) : relation.value - Math.min(step, -gap);
      relations[clubId][agentId] =
        value === relation.value ? relation : { value, reason: "decay", season, round: 0 };
    }
  }
  return { ...market, agents: { ...state, relations } };
}

export type RelationBand = "broken" | "bad" | "cold" | "neutral" | "good" | "great";

/** Faixa da relação em texto (contrato de UI). */
export function relationBand(value: number): RelationBand {
  if (value <= 0) return "broken";
  if (value < 25) return "bad";
  if (value < 45) return "cold";
  if (value <= 55) return "neutral";
  if (value < 80) return "good";
  return "great";
}
