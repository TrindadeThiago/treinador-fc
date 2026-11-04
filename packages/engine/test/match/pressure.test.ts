import { describe, expect, it } from "vitest";
import { advanceMatch, startMatch } from "../../src/match/engine";
import type { MatchState } from "../../src/match/types";
import { clubIds, makeInput, teamInput } from "./helpers/teams";

const [HOME, AWAY] = clubIds() as [string, string];

function started(seed: number, pressure: boolean): MatchState {
  const result = startMatch(makeInput(HOME, AWAY, { seed }));
  if (!result.ok) throw new Error("entrada inválida");
  return pressure ? { ...result.state, pressure: { home: [], away: [] } } : result.state;
}

const toEnd = (state: MatchState) => advanceMatch(state, { toEnd: true });

describe("pressão por minuto", () => {
  it("registrar a pressão não muda a partida", () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const { pressure: _pressure, ...tracked } = toEnd(started(seed, true));
      expect(tracked).toEqual(toEnd(started(seed, false)));
    }
  });

  it("um valor por minuto jogado de cada lado, entre 0 e 1, e a cópia não mexe no original", () => {
    const before = advanceMatch(started(21, true), { minutes: 30 });
    expect(before.pressure?.home).toHaveLength(30);
    expect(before.pressure?.away).toHaveLength(30);
    const after = advanceMatch(before, { minutes: 5 });
    expect(before.pressure?.home).toHaveLength(30);
    expect(after.pressure?.home).toHaveLength(35);
    expect(after.pressure?.home.slice(0, 30)).toEqual(before.pressure?.home);
    const end = toEnd(after);
    expect(end.pressure?.home.length).toBe(end.possession.total);
    for (const value of [...(end.pressure?.home ?? []), ...(end.pressure?.away ?? [])]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("sem o registro, o estado não ganha o campo", () => {
    expect(toEnd(started(31, false)).pressure).toBeUndefined();
  });

  it("time ofensivo pressiona mais que o mesmo time na defensiva", () => {
    const average = (posture: "attacking" | "defensive") => {
      const home = teamInput(HOME);
      const result = startMatch(
        makeInput(HOME, AWAY, { seed: 41, home: { ...home, lineup: { ...home.lineup, posture } } }),
      );
      if (!result.ok) throw new Error("entrada inválida");
      const end = advanceMatch(
        { ...result.state, pressure: { home: [], away: [] } },
        { minutes: 20 },
      );
      const values = end.pressure?.home ?? [];
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    };
    expect(average("attacking")).toBeGreaterThan(average("defensive"));
  });
});
