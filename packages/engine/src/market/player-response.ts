import {
  interestReach,
  minCommission,
  refCommission,
  wageAfterCommission,
} from "../agents/formula";
import { NEUTRAL_RELATION, relationOf } from "../agents/relations";
import { agentOf } from "../agents/roster";
import { agentRules } from "../agents/rules";
import { seasonDate } from "../calendar/date";
import { clubDivision } from "../career/league";
import { deriveWage } from "../derived/economy";
import type { CompletedPlayer } from "../model/types";
import { createRng } from "../rng/xoshiro";
import { marketRules } from "./rules";
import type { MarketContext, PlayerResponse } from "./types";

const EXIGENCY_MAX = 90;

/** Atração do clube: reputação + bônus pela divisão (R7). */
export function attraction(context: MarketContext, clubId: string): number {
  const club = context.world.clubs.find((entry) => entry.id === clubId);
  const rules = marketRules(context.world, context.league.competitionId);
  const level = clubDivision(context.league, clubId)?.divisionLevel ?? 1;
  const bonuses = rules.player.divisionBonus;
  const bonus = bonuses[Math.min(level, bonuses.length) - 1] ?? 0;
  return (club?.reputation ?? 0) + bonus;
}

/** Exigência do atleta: cresce com a força (R7). */
export function exigency(player: Pick<CompletedPlayer, "strength">): number {
  return Math.min(EXIGENCY_MAX, Math.max(0, 2 * (player.strength - 50)));
}

/** Salário que o atleta pede para jogar no clube (múltiplo de 100). */
export function wageDemand(
  context: MarketContext,
  player: CompletedPlayer | (Omit<CompletedPlayer, "clubId" | "contract"> & { clubId?: string }),
  clubId: string,
  renewal = false,
): number {
  const club = context.world.clubs.find((entry) => entry.id === clubId);
  if (!club) return 0;
  const gap = Math.max(0, exigency(player) - attraction(context, clubId));
  const rng = createRng(
    `${context.careerSeed}:wage:${context.league.number}:${player.id}:${clubId}`,
  );
  const noise = rng.int(95, 105);
  const date = seasonDate(context.world.manifest.referenceDate, context.league.year);
  const base = deriveWage({ ...player, clubId } as CompletedPlayer, club, date);
  const demand = Math.round((base * (100 + gap) * noise) / 10_000 / 100) * 100;
  const current = renewal && "contract" in player ? (player.contract?.wage ?? 0) : 0;
  return Math.max(500, demand, current);
}

/**
 * Resposta do atleta a uma proposta de salário (R7), com o empresário (042 R2). A comissão pode
 * cobrir parte da falta de interesse (até o alcance da influência) e o excedente sobre a pedida baixa
 * o salário pedido. Sem empresário, ou sem `commission`, a regra é a de antes.
 */
export function respondToContract(
  context: MarketContext,
  player: CompletedPlayer | (Omit<CompletedPlayer, "clubId" | "contract"> & { clubId?: string }),
  clubId: string,
  wage: number,
  renewal = false,
  offer: { commission?: number; years?: number } = {},
): PlayerResponse {
  const rules = marketRules(context.world, context.league.competitionId);
  const agent = agentOf(context.world, context.careerSeed, player);
  const agentRule = agent ? agentRules(context.world, agent.countryId) : undefined;
  let demand = wageDemand(context, player, clubId, renewal);
  const commission = offer.commission ?? 0;
  let asked = 0;
  if (agent && agentRule) {
    const relation =
      clubId === context.managerClubId
        ? relationOf(context.market, clubId, agent.id)
        : NEUTRAL_RELATION;
    asked = refCommission(demand, agent.greed, relation, agentRule);
  }
  const gap = exigency(player) - rules.player.interestMargin - attraction(context, clubId);
  if (!renewal && gap > 0) {
    if (!agent || !agentRule || gap > interestReach(agent.influence, agentRule)) {
      return { kind: "refused", reason: "no_interest" };
    }
    const minimum = minCommission(asked, demand, gap, agentRule);
    if (commission < minimum) {
      return { kind: "refused", reason: "no_interest", minCommission: minimum };
    }
    asked = minimum;
  }
  if (agentRule) {
    demand = wageAfterCommission(demand, asked, commission, offer.years ?? 1, agentRule);
  }
  if (wage >= demand) return { kind: "accepted" };
  if (wage * 100 >= demand * rules.player.demandThresholdPct) {
    return { kind: "demanded", wage: demand };
  }
  return { kind: "refused", reason: "low_wage" };
}
