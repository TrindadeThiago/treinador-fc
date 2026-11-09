import { describe, expect, it } from "vitest";
import { emptyAcademy } from "../../src/renewal/academy";
import { initialRenewal, measureWorld } from "../../src/renewal/measure";
import { STAR_THRESHOLD } from "../../src/renewal/rules";
import { newLeague, testWorld } from "../career/helpers";

describe("medida do mundo e estado inicial (R1)", () => {
  it("mede força e idade dos jogadores da competição", () => {
    const league = newLeague("medida");
    const measure = measureWorld(testWorld(), league, testWorld().manifest.referenceDate);
    expect(measure.players).toBe(testWorld().players.length);
    expect(measure.mean).toBeCloseTo(59.1, 0);
    expect(measure.p50).toBe(59);
    expect(measure.p10).toBe(49);
    expect(measure.p90).toBe(68);
    expect(measure.max).toBe(82);
    expect(measure.stars).toBe(
      testWorld().players.filter((player) => player.strength >= STAR_THRESHOLD).length,
    );
    expect(measure.meanAge).toBeGreaterThan(24);
    expect(measure.meanAge).toBeLessThan(27);
  });

  it("estado inicial: próximo id depois do maior, regulador neutro", () => {
    const renewal = initialRenewal(testWorld());
    const max = Math.max(
      ...testWorld().players.map((player) => Number(player.id.split("-").at(-1))),
    );
    expect(renewal).toEqual({
      nextPlayerSeq: max + 1,
      regulator: { strengthOffset: 0, potentialBonus: 0 },
      academy: emptyAcademy(),
    });
  });

  it("a base entra uma vez nas medidas (036 FR-019)", () => {
    const league = newLeague("medida");
    const date = testWorld().manifest.referenceDate;
    const template = testWorld().players[0];
    if (!template) throw new Error("banco vazio");
    const { clubId: _c, contract: _k, ...player } = template;
    const academy = {
      ...emptyAcademy(),
      players: [
        {
          player: { ...player, id: "jogador-99999", strength: 99 },
          clubId: template.clubId,
          joinedSeason: 1,
        },
      ],
    };
    const without = measureWorld(testWorld(), league, date);
    const withBase = measureWorld(testWorld(), league, date, academy);
    expect(withBase.players).toBe(without.players + 1);
    expect(withBase.max).toBe(99);
    expect(measureWorld(testWorld(), league, date, emptyAcademy())).toEqual(without);
  });
});
