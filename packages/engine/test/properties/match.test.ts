import { describe, expect, it } from "vitest";
import { advanceMatch, startMatch } from "../../src/match/engine";
import { matchResult } from "../../src/match/result";
import { clubIds, makeInput } from "../match/helpers/teams";
import { forCases, sample } from "./cases";

const CLUBS = clubIds();

describe("propriedades da partida", () => {
  it("placar = gols nos eventos = gols dos jogadores; avançar em passos = de uma vez", () => {
    forCases("partida", 40, (rng, label) => {
      const [home, away] = sample(rng, CLUBS, 2) as [string, string];
      const started = startMatch(makeInput(home, away, { seed: label }));
      expect(started.ok, label).toBe(true);
      if (!started.ok) return;
      const once = advanceMatch(started.state, { toEnd: true });
      let stepped = started.state;
      while (stepped.status !== "finished" && stepped.status !== "abandoned") {
        stepped = advanceMatch(stepped, { minutes: rng.int(1, 17) });
      }
      expect(JSON.stringify(stepped), label).toBe(JSON.stringify(once));
      const result = matchResult(once);
      for (const side of ["home", "away"] as const) {
        const goalEvents = result.events.filter(
          (event) => event.type === "shot" && event.side === side && event.outcome === "goal",
        ).length;
        expect(result.score[side], label).toBe(goalEvents);
        const byPlayers = Object.values(once.teams[side].players).reduce(
          (sum, player) => sum + player.goals,
          0,
        );
        expect(byPlayers, label).toBe(goalEvents);
      }
    });
  });
});
