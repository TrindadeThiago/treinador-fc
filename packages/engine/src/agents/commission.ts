import { attraction, exigency, wageDemand } from "../market/player-response";
import { marketRules } from "../market/rules";
import type { FreePlayer, MarketContext } from "../market/types";
import type { CompletedPlayer } from "../model/types";
import {
  capCommission,
  interestReach,
  minCommission,
  refCommission,
  wageAfterCommission,
} from "./formula";
import { NEUTRAL_RELATION, relationOf } from "./relations";
import { type Agent, agentOf } from "./roster";
import { agentRules } from "./rules";

type AnyPlayer = CompletedPlayer | (FreePlayer & { clubId?: string });

export interface CommissionQuote {
  agent: Agent;
  /** Relação com o clube (50 para a IA). */
  relation: number;
  /** Salário pedido pela regra de sempre. */
  wageDemand: number;
  /** Comissão de referência (com o efeito da relação). */
  ref: number;
  /** Falta de interesse dentro do alcance: a comissão que leva a proposta adiante. */
  min?: number;
  /** Falta de interesse fora do alcance da influência. */
  unreachable?: true;
  /** Teto da comissão. */
  cap: number;
}

/** Comissão pedida ao clube (a mínima, se faltar interesse; senão a de referência). */
export function askedCommission(quote: CommissionQuote): number {
  return quote.min ?? quote.ref;
}

/**
 * Cotação da comissão para o jogador assinar com o clube (R2). Sem empresário (país com
 * `perCountry = 0`), `undefined`: a negociação segue a regra de antes, sem comissão.
 */
export function commissionQuote(
  context: MarketContext,
  player: AnyPlayer,
  clubId: string,
  renewal: boolean,
): CommissionQuote | undefined {
  const agent = agentOf(context.world, context.careerSeed, player);
  if (!agent) return undefined;
  const rules = agentRules(context.world, agent.countryId);
  const relation =
    clubId === context.managerClubId
      ? relationOf(context.market, clubId, agent.id)
      : NEUTRAL_RELATION;
  const wage = wageDemand(context, player, clubId, renewal);
  const ref = refCommission(wage, agent.greed, relation, rules);
  const quote: CommissionQuote = {
    agent,
    relation,
    wageDemand: wage,
    ref,
    cap: capCommission(wage, rules),
  };
  if (renewal) return quote;
  const margin = marketRules(context.world, context.league.competitionId).player.interestMargin;
  const gap = exigency(player) - margin - attraction(context, clubId);
  if (gap <= 0) return quote;
  if (gap > interestReach(agent.influence, rules)) return { ...quote, unreachable: true };
  return { ...quote, min: minCommission(ref, wage, gap, rules) };
}

/** Salário pedido com a comissão oferecida (a troca de R2, até o teto). */
export function wageWithCommission(
  context: Pick<MarketContext, "world">,
  quote: CommissionQuote,
  commission: number,
  years: number,
): number {
  const rules = agentRules(context.world, quote.agent.countryId);
  return wageAfterCommission(quote.wageDemand, askedCommission(quote), commission, years, rules);
}

/** Comissão que um clube da IA paga: a de referência, com relação neutra (R3). */
export function aiCommission(context: MarketContext, player: AnyPlayer, clubId: string): number {
  const agent = agentOf(context.world, context.careerSeed, player);
  if (!agent) return 0;
  const rules = agentRules(context.world, agent.countryId);
  const wage = wageDemand(context, player, clubId);
  return refCommission(wage, agent.greed, NEUTRAL_RELATION, rules);
}
