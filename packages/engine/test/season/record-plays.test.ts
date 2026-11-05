import { describe, expect, it } from "vitest";
import { simulateMatch } from "../../src/match/engine";
import { type PlayStats, playTotals, playTuple } from "../../src/match/plays";
import { summarizeMatch } from "../../src/match/summary";
import type { MatchInput, Side } from "../../src/match/types";
import { playerLines, toMatchRecord, toSummaryRecord } from "../../src/season/record";
import { clubIds, makeInput } from "../match/helpers/teams";

// 033 US1 (T009): o registro da partida guarda as jogadas como tupla; o resumido não as tem.
const [HOME, AWAY] = clubIds() as [string, string];

function sides(input: MatchInput): Record<string, Side> {
  return Object.fromEntries([
    ...input.home.squad.map((player) => [player.id, "home" as const]),
    ...input.away.squad.map((player) => [player.id, "away" as const]),
  ]);
}

describe("jogadas no registro da partida (033)", () => {
  const input = makeInput(HOME, AWAY, { seed: "registro-jogadas" });
  const simulated = simulateMatch(input);
  if (!simulated.ok) throw new Error("simulação falhou");
  const result = simulated.result;
  const record = toMatchRecord(1, HOME, AWAY, result, sides(input), { home: [], away: [] });

  it("cada linha de quem jogou traz a tupla das jogadas do estado", () => {
    for (const [playerId, state] of Object.entries(result.players)) {
      const line = record.players[playerId];
      if (!line) continue;
      if (state.plays) expect(line.plays).toEqual(playTuple(state.plays as PlayStats));
      else expect(line.plays).toBeUndefined();
    }
    expect(Object.values(record.players).some((line) => line.plays)).toBe(true);
  });

  it("playerLines preserva as jogadas, e os totais do registro somam as linhas", () => {
    const lines = playerLines(record);
    for (const [playerId, line] of Object.entries(record.players)) {
      expect(lines[playerId]?.plays).toEqual(line.plays);
    }
    for (const side of ["home", "away"] as const) {
      const totals = playTotals(lines, side);
      const passes = Object.entries(result.players)
        .filter(([playerId]) => sides(input)[playerId] === side)
        .reduce((sum, [, state]) => sum + (state.plays?.passes ?? 0), 0);
      expect(totals?.passes).toBe(passes);
    }
  });

  it("o registro resumido (simulação resumida) não tem jogadas", () => {
    const summary = summarizeMatch(input);
    const compact = toSummaryRecord(
      toMatchRecord(1, HOME, AWAY, summary, sides(input), { home: [], away: [] }),
      {
        home: Object.values(input.home.lineup.starters),
        away: Object.values(input.away.lineup.starters),
      },
      90,
    );
    for (const line of Object.values(playerLines(compact))) expect(line.plays).toBeUndefined();
    expect(playTotals(playerLines(compact), "home")).toBeUndefined();
  });
});
