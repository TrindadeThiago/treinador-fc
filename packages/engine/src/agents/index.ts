import type { AgentDeal, MarketState } from "../market/types";
import type { CompletedBank } from "../model/types";
import { type RelationBand, relationBand, relationOf } from "./relations";
import { type Agent, agentById, portfolioOf } from "./roster";

export * from "./commission";
export * from "./formula";
export * from "./relations";
export * from "./roster";
export * from "./rules";

export interface AgentRow {
  agent: Agent;
  relation: number;
  band: RelationBand;
  /** Jogadores na carteira (do mundo e livres). */
  portfolio: number;
  lastDeal?: AgentDeal;
}

/**
 * Empresários com quem o clube já negociou (relação registrada ou negócio), para a aba do
 * Mercado (US2), da melhor relação para a pior.
 */
export function agentsViewOf(
  market: MarketState,
  world: CompletedBank,
  careerSeed: string,
  clubId: string,
): AgentRow[] {
  const state = market.agents;
  if (!state) return [];
  const ids = new Set<string>([
    ...Object.keys(state.relations[clubId] ?? {}),
    ...state.deals.filter((deal) => deal.clubId === clubId).map((deal) => deal.agentId),
  ]);
  const rows: AgentRow[] = [];
  for (const id of ids) {
    const agent = agentById(world, careerSeed, id);
    if (!agent) continue;
    const relation = relationOf(market, clubId, id);
    const lastDeal = [...state.deals]
      .reverse()
      .find((deal) => deal.clubId === clubId && deal.agentId === id);
    rows.push({
      agent,
      relation,
      band: relationBand(relation),
      portfolio: portfolioOf(world, market, careerSeed, id).length,
      ...(lastDeal ? { lastDeal } : {}),
    });
  }
  return rows.sort((a, b) => b.relation - a.relation || (a.agent.id < b.agent.id ? -1 : 1));
}
