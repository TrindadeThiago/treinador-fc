import { resaleRules } from "../market/resale";
import type { TransferRecord } from "../market/types";
import { referenceMonthlyPayroll } from "../renewal/academy-levels";
import type { AcademyGraduate } from "../renewal/types";
import { newsRules } from "./rules";
import type { Headline, NewsContext } from "./types";
import { variantOf } from "./variants";

/**
 * Revenda recebida pelo clube do técnico (041 R9): uma manchete por venda que pagou uma cláusula a
 * favor dele, a partir de `headlinePayrollPct`% da folha mensal de referência do clube.
 */
export function resaleNews(
  context: Pick<NewsContext, "world" | "league" | "careerSeed" | "managerClubId"> & {
    graduates?: Readonly<Record<string, AcademyGraduate>> | undefined;
  },
  deals: readonly TransferRecord[],
  round: number,
  firstIndex = 0,
): Headline[] {
  const manager = context.managerClubId;
  if (manager === "") return [];
  const paid = deals.filter((deal) => deal.resalePaid?.clubId === manager);
  if (paid.length === 0) return [];
  const rules = newsRules(context.world, context.league.competitionId);
  const resale = resaleRules(context.world, context.league.competitionId);
  const minimum =
    (referenceMonthlyPayroll(context.world, manager) * resale.headlinePayrollPct) / 100;
  const season = context.league.number;
  const headlines: Headline[] = [];
  for (const deal of paid) {
    const amount = deal.resalePaid?.amount ?? 0;
    if (amount <= 0 || amount < minimum) continue;
    const cria = context.graduates?.[deal.playerId]?.clubId === manager;
    const index = firstIndex + headlines.length;
    headlines.push({
      id: `${season}-${round}-r${index}`,
      type: "resaleReceived",
      relevance: rules.relevance.resaleReceived + rules.mineBonus,
      variant: variantOf(
        rules,
        context.careerSeed,
        `${season}:${round}:${deal.playerId}`,
        "resaleReceived",
      ),
      clubIds: [manager],
      playerIds: [deal.playerId],
      vars: {
        player: deal.displayName,
        club: manager,
        ...(deal.fromClubId ? { owner: deal.fromClubId } : {}),
        ...(deal.toClubId ? { opponent: deal.toClubId } : {}),
        fee: deal.fee,
        amount,
        cria: cria ? "yes" : "no",
      },
      mine: true,
    });
  }
  return headlines;
}
