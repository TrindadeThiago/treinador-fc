import { describe, expect, it } from "vitest";
import { matchRatings } from "../../src/rating/rate";
import { seasonRatings } from "../../src/rating/season";
import type { Season } from "../../src/season/types";
import { playedSeason, testWorld } from "../season/helpers/world";

// 034 US3 (T022): média das notas da temporada de cada jogador do clube.
describe("média da temporada (034)", () => {
  const world = testWorld();
  const players = new Map(world.players.map((player) => [player.id, player]));
  const season = playedSeason("media-notas");
  const clubId = season.clubIds[0] as string;
  const ratings = seasonRatings([season], clubId, players);

  it("é a média, com uma casa, das notas das partidas do clube calculada à mão", () => {
    const sums = new Map<string, { total: number; matches: number }>();
    for (const record of season.records) {
      if (record.home !== clubId && record.away !== clubId) continue;
      const side = record.home === clubId ? "home" : "away";
      for (const [playerId, rated] of Object.entries(matchRatings(record, players).players)) {
        if (rated.rating === undefined || record.players[playerId]?.side !== side) continue;
        const sum = sums.get(playerId) ?? { total: 0, matches: 0 };
        sum.total += rated.rating;
        sum.matches += 1;
        sums.set(playerId, sum);
      }
    }
    expect(ratings.size).toBe(sums.size);
    for (const [playerId, sum] of sums) {
      expect(ratings.get(playerId)).toEqual({
        average: Math.round((sum.total / sum.matches) * 10) / 10,
        matches: sum.matches,
        simplified: 0,
      });
    }
  });

  it("só jogadores do clube, e de todas as temporadas dadas", () => {
    const squad = new Set(world.players.filter((p) => p.clubId === clubId).map((p) => p.id));
    for (const playerId of ratings.keys()) expect(squad.has(playerId)).toBe(true);
    const doubled = seasonRatings([season, season], clubId, players);
    for (const [playerId, entry] of ratings) {
      expect(doubled.get(playerId)?.matches).toBe(entry.matches * 2);
      expect(doubled.get(playerId)?.average).toBe(entry.average);
    }
  });

  it("partidas sem jogadas entram como simplificadas", () => {
    const bare: Season = {
      ...season,
      records: season.records.map((record) => ({
        ...record,
        players: Object.fromEntries(
          Object.entries(record.players).map(([id, line]) => {
            const { plays: _plays, ...rest } = line;
            return [id, rest];
          }),
        ),
      })),
    };
    for (const entry of seasonRatings([bare], clubId, players).values()) {
      expect(entry.simplified).toBe(entry.matches);
    }
  });
});
