import type { LeagueSeason } from "../career/types";
import type { CompletedBank } from "../model/types";
import type { FinanceState } from "./types";

/**
 * Clubes cujas finanças andam na rodada (ou na virada) de uma liga principal: os do país dela,
 * incluídos os só regionais (023), que não estão em nenhuma liga, e os que jogam a liga vindos de
 * outro país. Cada liga principal roda num dia próprio, e o estado de finanças tem os clubes de
 * todos os países: sem este recorte, juros, obras, crise e IA andariam uma vez por liga do mundo
 * a cada rodada. Liga sem país (mundo de um país só): todos os clubes. Em ordem de id.
 */
export function financeClubIds(
  finances: Pick<FinanceState, "clubs">,
  world: Pick<CompletedBank, "clubs" | "competitions">,
  league: Pick<LeagueSeason, "competitionId" | "divisions">,
): string[] {
  const all = Object.keys(finances.clubs).sort();
  const countryId = world.competitions.find(
    (competition) => competition.id === league.competitionId,
  )?.countryId;
  if (countryId === undefined) return all;
  const inLeague = new Set(league.divisions.flatMap((season) => season.clubIds));
  const ofCountry = new Set(
    world.clubs.filter((club) => club.countryId === countryId).map((club) => club.id),
  );
  return all.filter((clubId) => ofCountry.has(clubId) || inLeague.has(clubId));
}
