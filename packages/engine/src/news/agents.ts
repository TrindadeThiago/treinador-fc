import { agentById } from "../agents/roster";
import { agentRules } from "../agents/rules";
import type { TransferRecord } from "../market/types";
import { referenceMonthlyPayroll } from "../renewal/academy-levels";
import { newsRules } from "./rules";
import type { Headline, NewsContext } from "./types";
import { variantOf } from "./variants";

/**
 * Manchetes dos empresários (042 R6), só do clube do técnico: o rompimento (relação chegou a 0 na
 * rodada) e o negócio grande (comissão a partir de `headlineMonths` folhas mensais de referência).
 */
export function agentNews(
  context: Pick<NewsContext, "world" | "league" | "careerSeed" | "managerClubId" | "market">,
  deals: readonly TransferRecord[],
  round: number,
  firstIndex = 0,
): Headline[] {
  const manager = context.managerClubId;
  if (manager === "") return [];
  const rules = newsRules(context.world, context.league.competitionId);
  const season = context.league.number;
  const headlines: Headline[] = [];
  const push = (
    type: "agentBroke" | "agentBigDeal",
    key: string,
    playerIds: string[],
    vars: Headline["vars"],
  ) => {
    headlines.push({
      id: `${season}-${round}-g${firstIndex + headlines.length}`,
      type,
      relevance: rules.relevance[type] + rules.mineBonus,
      variant: variantOf(rules, context.careerSeed, `${season}:${round}:${key}`, type),
      clubIds: [manager],
      ...(playerIds.length > 0 ? { playerIds } : {}),
      vars,
      mine: true,
    } as Headline);
  };
  for (const rupture of context.market?.agents?.ruptures ?? []) {
    if (rupture.clubId !== manager || rupture.season !== season || rupture.round !== round)
      continue;
    const agent = agentById(context.world, context.careerSeed, rupture.agentId);
    if (!agent) continue;
    push("agentBroke", rupture.agentId, [], {
      agent: agent.name,
      club: manager,
      reason: rupture.reason,
    });
  }
  const payroll = referenceMonthlyPayroll(context.world, manager);
  for (const deal of deals) {
    if (deal.toClubId !== manager || !deal.commission || !deal.agentId) continue;
    const agent = agentById(context.world, context.careerSeed, deal.agentId);
    if (!agent) continue;
    const minimum = payroll * agentRules(context.world, agent.countryId).headlineMonths;
    if (deal.commission < minimum) continue;
    push("agentBigDeal", deal.playerId, [deal.playerId], {
      agent: agent.name,
      player: deal.displayName,
      club: manager,
      commission: deal.commission,
    });
  }
  return headlines;
}
