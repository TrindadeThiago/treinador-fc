import { describe, expect, it } from "vitest";
import {
  FORMATION_IDS,
  FORMATIONS,
  POSTURES,
  PREFERRED_FORMATION_IDS,
} from "../../src/match/formations";

const DEFENDERS = new Set(["CB", "FB"]);
const MIDFIELDERS = new Set(["DM", "MF"]);

describe("catálogo de esquemas (FR-003)", () => {
  it("tem os 11 esquemas previstos, com os 6 originais primeiro", () => {
    expect(FORMATION_IDS).toEqual([
      "4-4-2",
      "4-3-3",
      "3-5-2",
      "4-5-1",
      "5-3-2",
      "4-2-3-1",
      "3-4-3",
      "4-1-4-1",
      "4-1-2-1-2",
      "5-4-1",
      "4-2-2-2",
    ]);
  });

  it("o computador escolhe só entre os 6 originais (a mesma seed dá a mesma carreira)", () => {
    expect(PREFERRED_FORMATION_IDS).toEqual(FORMATION_IDS.slice(0, 6));
  });

  it.each(FORMATION_IDS)("%s tem 11 vagas únicas e exatamente 1 goleiro", (id) => {
    const slots = FORMATIONS[id].slots;
    expect(slots).toHaveLength(11);
    expect(new Set(slots.map((slot) => slot.id)).size).toBe(11);
    expect(slots.filter((slot) => slot.position === "GK")).toHaveLength(1);
  });

  it.each(FORMATION_IDS)("%s distribui as posições conforme o nome", (id) => {
    const numbers = id.split("-").map(Number);
    const slots = FORMATIONS[id].slots;
    const defenders = slots.filter((slot) => DEFENDERS.has(slot.position)).length;
    const midfielders = slots.filter((slot) => MIDFIELDERS.has(slot.position)).length;
    const forwards = slots.filter((slot) => slot.position === "FW").length;
    expect(defenders).toBe(numbers[0]);
    expect(forwards).toBe(numbers[numbers.length - 1]);
    expect(midfielders).toBe(numbers.slice(1, -1).reduce((sum, value) => sum + value, 0));
  });

  it("tem as três posturas (FR-004)", () => {
    expect(POSTURES).toEqual(["defensive", "balanced", "attacking"]);
  });
});
