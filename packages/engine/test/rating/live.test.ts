import { describe, expect, it } from "vitest";
import { advanceMatch, simulateMatch, startMatch } from "../../src/match/engine";
import type { MatchInput, MatchState, Side } from "../../src/match/types";
import { liveRatings, matchRatings } from "../../src/rating/rate";
import { toMatchRecord } from "../../src/season/record";
import { clubIds, makeInput } from "../match/helpers/teams";

// 034 US2 (T018): a nota parcial ao vivo termina igual à do resumo (SC-006).
const ids = clubIds();

function inputAt(index: number, seed = "ao-vivo"): MatchInput {
  const home = ids[index % ids.length] as string;
  let away = ids[(index * 7 + 3) % ids.length] as string;
  if (away === home) away = ids[(index + 1) % ids.length] as string;
  return makeInput(home, away, { seed: `${seed}-${index}` });
}

const playersOf = (input: MatchInput) =>
  new Map([...input.home.squad, ...input.away.squad].map((player) => [player.id, player]));

function started(input: MatchInput): MatchState {
  const result = startMatch(input);
  if (!result.ok) throw new Error("entrada inválida");
  return result.state;
}

describe("nota ao vivo (034 SC-006)", () => {
  it("no fim da partida é igual à do resumo, em 50 partidas", () => {
    for (let index = 0; index < 50; index++) {
      const input = inputAt(index);
      let state = started(input);
      while (state.status !== "finished" && state.status !== "abandoned") {
        state = advanceMatch(state, { minutes: 5 });
      }
      const simulated = simulateMatch(input);
      if (!simulated.ok) throw new Error("simulação falhou");
      const sides: Record<string, Side> = Object.fromEntries([
        ...input.home.squad.map((player) => [player.id, "home" as const]),
        ...input.away.squad.map((player) => [player.id, "away" as const]),
      ]);
      const record = toMatchRecord(
        1,
        input.home.clubId,
        input.away.clubId,
        simulated.result,
        sides,
        {
          home: [],
          away: [],
        },
      );
      expect(liveRatings(state, playersOf(input))).toEqual(matchRatings(record, playersOf(input)));
    }
  });

  it("a nota parcial sobe com o gol do jogador e desce com o vermelho", () => {
    let goals = 0;
    let reds = 0;
    for (let index = 0; index < 120 && (goals < 3 || reds < 2); index++) {
      const input = inputAt(index, "reacao");
      const players = playersOf(input);
      let state = advanceMatch(started(input), { minutes: 15 });
      while (state.status !== "finished" && state.status !== "abandoned") {
        const before = liveRatings(state, players).players;
        const seen = state.events.length;
        const next = advanceMatch(state, { minutes: 1 });
        const after = liveRatings(next, players).players;
        for (const event of next.events.slice(seen)) {
          const was = before[("playerId" in event ? event.playerId : "") as string]?.rating;
          const now = after[("playerId" in event ? event.playerId : "") as string]?.rating;
          if (was === undefined || now === undefined) continue;
          if (event.type === "shot" && event.outcome === "goal") {
            expect(now).toBeGreaterThan(was);
            goals += 1;
          }
          if (event.type === "red_card") {
            expect(now).toBeLessThan(was);
            reds += 1;
          }
        }
        state = next;
      }
    }
    expect(goals).toBeGreaterThan(0);
    expect(reds).toBeGreaterThan(0);
  });
});
