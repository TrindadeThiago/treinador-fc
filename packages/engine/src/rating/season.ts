import type { CompletedPlayer } from "../model/types";
import { playerLines } from "../season/record";
import type { Season } from "../season/types";
import { compareText } from "../serialize/compare";
import { matchRatings } from "./rate";

export interface SeasonRating {
  /** Média das notas, com uma casa. */
  average: number;
  /** Partidas com nota. */
  matches: number;
  /** Quantas dessas notas são simplificadas. */
  simplified: number;
}

type Players = ReadonlyMap<string, Pick<CompletedPlayer, "position">>;

/**
 * Média das notas da temporada de cada jogador do clube (034 research R7): olha só as partidas do
 * clube, em todas as temporadas dadas (liga e demais competições do ano). Quem não teve nota fica
 * de fora.
 */
export function seasonRatings(
  seasons: readonly Season[],
  clubId: string,
  players: Players,
): Map<string, SeasonRating> {
  const sums = new Map<string, { total: number; matches: number; simplified: number }>();
  for (const season of seasons) {
    for (const record of season.records) {
      if (record.home !== clubId && record.away !== clubId) continue;
      const side = record.home === clubId ? "home" : "away";
      const ratings = matchRatings(record, players);
      const lines = playerLines(record);
      for (const [playerId, rated] of Object.entries(ratings.players)) {
        if (rated.rating === undefined || lines[playerId]?.side !== side) continue;
        const sum = sums.get(playerId) ?? { total: 0, matches: 0, simplified: 0 };
        sum.total += rated.rating;
        sum.matches += 1;
        if (rated.kind === "simplified") sum.simplified += 1;
        sums.set(playerId, sum);
      }
    }
  }
  const out = new Map<string, SeasonRating>();
  for (const playerId of [...sums.keys()].sort(compareText)) {
    const sum = sums.get(playerId) as { total: number; matches: number; simplified: number };
    out.set(playerId, {
      average: Math.round((sum.total / sum.matches) * 10) / 10,
      matches: sum.matches,
      simplified: sum.simplified,
    });
  }
  return out;
}
