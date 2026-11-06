import { describe, expect, it } from "vitest";
import { simulateMatch } from "../../src/match/engine";
import { emptyPlays } from "../../src/match/plays";
import type { MatchInput, Side } from "../../src/match/types";
import type { RatingInput } from "../../src/rating/input";
import { matchRatings, rate } from "../../src/rating/rate";
import { RATING_TUNING } from "../../src/rating/tuning";
import { toMatchRecord } from "../../src/season/record";
import { clubIds, makeInput } from "../match/helpers/teams";

// 034 (T008): regras da nota (FR-001 a FR-006, SC-001).
function base(overrides: Partial<RatingInput> = {}): RatingInput {
  return {
    playerId: "j1",
    side: "home",
    minutes: 90,
    position: "MF",
    goals: 0,
    assists: 0,
    yellows: 0,
    red: false,
    penaltiesConceded: 0,
    goalsConceded: 1,
    result: "draw",
    plays: { ...emptyPlays(), passes: 40, passesCompleted: 33 },
    ...overrides,
  };
}

const value = (input: RatingInput) => rate(input).rating as number;

describe("nota do jogador (034)", () => {
  it("fica entre 0 e 10, com uma casa", () => {
    const extremes = [
      base({ goals: 6, assists: 4, result: "win" }),
      base({
        red: true,
        yellows: 1,
        penaltiesConceded: 2,
        goalsConceded: 7,
        result: "loss",
        position: "GK",
      }),
    ];
    for (const input of extremes) {
      const rating = value(input);
      expect(rating).toBeGreaterThanOrEqual(0);
      expect(rating).toBeLessThanOrEqual(10);
      expect(Math.round(rating * 10)).toBeCloseTo(rating * 10, 9);
    }
    expect(value(extremes[0] as RatingInput)).toBe(10);
  });

  it("sem nota abaixo do mínimo de minutos", () => {
    expect(rate(base({ minutes: RATING_TUNING.minMinutes - 1, goals: 1 })).rating).toBeUndefined();
    expect(rate(base({ minutes: RATING_TUNING.minMinutes })).rating).toBeDefined();
  });

  it("com os mesmos números, mais minutos afasta a nota de 6,0", () => {
    const ref = RATING_TUNING.reference;
    const short = value(base({ minutes: 20, goals: 1 })) - ref;
    const long = value(base({ minutes: 80, goals: 1 })) - ref;
    expect(long).toBeGreaterThan(short);
    expect(short).toBeGreaterThan(0);
  });

  it("gol sobe, vermelho e pênalti cometido descem; lesão não muda", () => {
    expect(value(base({ goals: 1 }))).toBeGreaterThan(value(base()));
    expect(value(base({ red: true }))).toBeLessThan(value(base()));
    expect(value(base({ penaltiesConceded: 1 }))).toBeLessThan(value(base()));
  });

  it("gols sofridos pesam mais no goleiro que no atacante", () => {
    const drop = (position: RatingInput["position"]) =>
      value(base({ position, goalsConceded: 0 })) - value(base({ position, goalsConceded: 3 }));
    expect(drop("GK")).toBeGreaterThan(drop("FW"));
  });

  it("sem jogadas a nota é simplificada; com tupla de 6 ou 9, completa", () => {
    const { plays: _plays, ...rest } = base();
    expect(rate(rest).kind).toBe("simplified");
    expect(rate(base()).kind).toBe("full");
  });
});

describe("melhor em campo (FR-006)", () => {
  const [HOME, AWAY] = clubIds() as [string, string];
  const input: MatchInput = makeInput(HOME, AWAY, { seed: "melhor" });
  const simulated = simulateMatch(input);
  if (!simulated.ok) throw new Error("simulação falhou");
  const sides: Record<string, Side> = Object.fromEntries([
    ...input.home.squad.map((player) => [player.id, "home" as const]),
    ...input.away.squad.map((player) => [player.id, "away" as const]),
  ]);
  const record = toMatchRecord(1, HOME, AWAY, simulated.result, sides, { home: [], away: [] });
  const players = new Map([...input.home.squad, ...input.away.squad].map((p) => [p.id, p]));

  it("é o de maior nota, e não depende da ordem das linhas", () => {
    const ratings = matchRatings(record, players);
    const max = Math.max(
      ...Object.values(ratings.players).flatMap((entry) =>
        entry.rating === undefined ? [] : [entry.rating],
      ),
    );
    expect(ratings.best?.rating).toBe(max);
    const reversed = {
      ...record,
      players: Object.fromEntries(Object.entries(record.players).reverse()),
    };
    expect(matchRatings(reversed, players).best).toEqual(ratings.best);
  });

  it("todo jogador com o mínimo de minutos tem nota (SC-001)", () => {
    const ratings = matchRatings(record, players);
    for (const [playerId, line] of Object.entries(record.players)) {
      const rated = ratings.players[playerId];
      if (line.minutes >= RATING_TUNING.minMinutes) expect(rated?.rating).toBeDefined();
      else expect(rated?.rating).toBeUndefined();
    }
  });
});
