import { describe, expect, it } from "vitest";
import { simulateMatch } from "../../src/match/engine";
import { FORMATION_IDS, type FormationId } from "../../src/match/formations";
import type { MatchInput, Side } from "../../src/match/types";
import type { Position } from "../../src/model/catalogs";
import { RATING_REALISM_LIMITS as L } from "../../src/rating/limits";
import { matchRatings } from "../../src/rating/rate";
import { createRng } from "../../src/rng/xoshiro";
import { toMatchRecord } from "../../src/season/record";
import type { MatchRecord } from "../../src/season/types";
import { squadOf, testWorld } from "../match/helpers/teams";
import { team } from "../match/realism/harness";

// 034 FR-016 (Princípio V): as notas ficam nas faixas declaradas numa amostra de liga.
const SAMPLE = 3000;

export interface RatedMatch {
  record: MatchRecord;
  full: ReturnType<typeof matchRatings>;
  simplified: ReturnType<typeof matchRatings>;
}

export function ratedSample(n: number, seed: string): RatedMatch[] {
  const world = testWorld();
  const players = new Map(world.players.map((player) => [player.id, player]));
  const divisions = world.competitions.flatMap((competition) => competition.divisions);
  const rng = createRng(seed);
  const out: RatedMatch[] = [];
  for (let index = 0; index < n; index++) {
    const division = divisions[index % divisions.length];
    if (!division) continue;
    const [homeId, awayId] = rng.shuffle(division.clubIds) as [string, string];
    const input: MatchInput = {
      home: team(homeId, squadOf(homeId), rng.pick(FORMATION_IDS) as FormationId),
      away: team(awayId, squadOf(awayId), rng.pick(FORMATION_IDS) as FormationId),
      seed: `${seed}:${index}`,
    };
    const simulated = simulateMatch(input);
    if (!simulated.ok) throw new Error("simulação falhou");
    const sides: Record<string, Side> = Object.fromEntries([
      ...input.home.squad.map((player) => [player.id, "home" as const]),
      ...input.away.squad.map((player) => [player.id, "away" as const]),
    ]);
    const record = toMatchRecord(1, homeId, awayId, simulated.result, sides, {
      home: [],
      away: [],
    });
    const bare = {
      ...record,
      players: Object.fromEntries(
        Object.entries(record.players).map(([id, line]) => {
          const { plays: _plays, ...rest } = line;
          return [id, rest];
        }),
      ),
    };
    out.push({
      record,
      full: matchRatings(record, players),
      simplified: matchRatings(bare, players),
    });
  }
  return out;
}

export function summarize(samples: readonly RatedMatch[]) {
  const all: number[] = [];
  const simplified: number[] = [];
  const byPosition = new Map<Position, number[]>();
  const scorers: number[] = [];
  const others: number[] = [];
  const winners: number[] = [];
  const losers: number[] = [];
  let decided = 0;
  let bestFromWinner = 0;
  for (const { record, full, simplified: simple } of samples) {
    const winner: Side | undefined =
      record.score.home > record.score.away
        ? "home"
        : record.score.away > record.score.home
          ? "away"
          : undefined;
    for (const [playerId, rated] of Object.entries(full.players)) {
      if (rated.rating === undefined) continue;
      const line = record.players[playerId];
      if (!line) continue;
      all.push(rated.rating);
      byPosition.set(rated.position, [...(byPosition.get(rated.position) ?? []), rated.rating]);
      (line.goals > 0 ? scorers : others).push(rated.rating);
      if (winner) (line.side === winner ? winners : losers).push(rated.rating);
      const simpleRating = simple.players[playerId]?.rating;
      if (simpleRating !== undefined) simplified.push(simpleRating);
    }
    if (winner) {
      decided += 1;
      if (full.best?.side === winner) bestFromWinner += 1;
    }
  }
  const mean = (values: readonly number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  const overall = mean(all);
  return {
    mean: overall,
    below4: all.filter((value) => value < 4).length / all.length,
    above9: all.filter((value) => value > 9).length / all.length,
    positionGaps: Object.fromEntries(
      [...byPosition].map(([position, values]) => [position, mean(values) - overall]),
    ) as Record<Position, number>,
    scorerGap: mean(scorers) - mean(others),
    winnerGap: mean(winners) - mean(losers),
    bestFromWinner: bestFromWinner / decided,
    simplifiedGap: mean(simplified) - overall,
  };
}

describe("notas com cara de jornal (034 SC-003 a SC-005)", () => {
  const result = summarize(ratedSample(SAMPLE, "notas-liga"));

  it("média, dispersão e extremos", () => {
    expect(result.mean).toBeGreaterThanOrEqual(L.mean[0]);
    expect(result.mean).toBeLessThanOrEqual(L.mean[1]);
    expect(result.below4).toBeLessThanOrEqual(L.maxBelow4);
    expect(result.above9).toBeLessThanOrEqual(L.maxAbove9);
  });

  it("nenhuma posição sistematicamente favorecida", () => {
    for (const [position, gap] of Object.entries(result.positionGaps)) {
      expect(Math.abs(gap), position).toBeLessThanOrEqual(L.maxPositionGap);
    }
  });

  it("quem marca e quem vence têm nota maior; o melhor em campo costuma ser do vencedor", () => {
    expect(result.scorerGap).toBeGreaterThanOrEqual(L.minScorerGap);
    expect(result.winnerGap).toBeGreaterThanOrEqual(L.minWinnerGap);
    expect(result.bestFromWinner).toBeGreaterThanOrEqual(L.minBestFromWinner);
  });

  it("a simplificada fica perto da completa", () => {
    expect(Math.abs(result.simplifiedGap)).toBeLessThanOrEqual(L.maxSimplifiedGap);
  });
}, 300_000);
