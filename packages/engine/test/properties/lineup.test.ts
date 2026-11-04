import { describe, expect, it } from "vitest";
import { validateLineup } from "../../src/lineup/validate";
import { autoLineup } from "../../src/match/auto-lineup";
import { FORMATION_IDS } from "../../src/match/formations";
import { testWorld } from "../match/helpers/teams";
import { forCases, sample } from "./cases";

const world = testWorld();

describe("propriedades da escalação automática", () => {
  it("com 11 disponíveis sai uma escalação válida, só com quem está no elenco e disponível", () => {
    forCases("escalação", 300, (rng, label) => {
      const squad = sample(rng, world.players, rng.int(11, 32));
      const unavailable = sample(rng, squad, rng.int(0, Math.max(0, squad.length - 11))).map(
        (player) => player.id,
      );
      const formation = rng.pick(FORMATION_IDS);
      const result = autoLineup({ squad, formation, unavailable, benchLimit: rng.int(0, 12) });
      expect(result.ok, label).toBe(true);
      if (!result.ok) return;
      const starters = Object.values(result.lineup.starters);
      const all = [...starters, ...result.lineup.bench];
      const ids = new Set(squad.map((player) => player.id));
      expect(starters.length, label).toBe(11);
      expect(new Set(all).size, label).toBe(all.length);
      for (const id of all) {
        expect(ids.has(id), label).toBe(true);
        expect(unavailable.includes(id), label).toBe(false);
      }
      const validation = validateLineup(
        result.lineup,
        squad,
        unavailable.map((playerId) => ({ playerId, reason: "injury", remaining: 1 })),
      );
      expect(
        validation.issues.filter((issue) => issue.severity === "error"),
        label,
      ).toEqual([]);
    });
  });

  it("com menos de 11 disponíveis, recusa com erro em vez de inventar", () => {
    forCases("escalação-curta", 50, (rng, label) => {
      const squad = sample(rng, world.players, rng.int(0, 10));
      const result = autoLineup({ squad, formation: rng.pick(FORMATION_IDS) });
      expect(result.ok, label).toBe(false);
    });
  });
});
