import { describe, expect, it } from "vitest";
import { academySeasonReport, emptyAcademy } from "../../src/renewal/academy";
import type { AcademyPlayer, PlayerRef, RenewalState } from "../../src/renewal/types";

// 038 US4 (R8): bloco Base do fim de temporada.

const REFERENCE = "2026-01-15";
const SEASON = { year: 2027, number: 2 };

function entry(
  id: string,
  birthYear: number,
  joinedSeason: number,
  clubId = "clube-1",
): AcademyPlayer {
  return {
    player: {
      id,
      displayName: `Jovem ${id}`,
      position: "MF",
      birthDate: `${birthYear}-06-01`,
      nationalityId: "pais",
      strength: 50,
      traits: [],
      hidden: { potential: 70, temperament: 50, injuryProneness: 50 },
    } as unknown as AcademyPlayer["player"],
    clubId,
    joinedSeason,
    estimate: { low: 60, high: 76 },
  };
}

const ref = (id: string): PlayerRef => ({
  playerId: id,
  displayName: `Jovem ${id}`,
  position: "MF",
  age: 17,
  strength: 50,
});

function renewal(extra: Partial<RenewalState> = {}): RenewalState {
  return {
    nextPlayerSeq: 100,
    regulator: { strengthOffset: 0, potentialBonus: 0 },
    academy: {
      ...emptyAcademy(),
      players: [entry("a", 2010, 2), entry("b", 2007, 1), entry("x", 2010, 2, "clube-2")],
      graduates: { p: { clubId: "clube-1", season: 2, estimate: { low: 55, high: 70 } } },
      promotedThisSeason: [ref("p")],
      releasedThisSeason: [ref("r")],
    },
    ...extra,
  };
}

describe("academySeasonReport (038)", () => {
  it("chegaram pelo aviso da virada; subiram com a faixa da promoção; saíram com o motivo", () => {
    const report = academySeasonReport(
      renewal({
        squadNotice: {
          season: 2,
          clubId: "clube-1",
          retired: [],
          arrived: [],
          released: [],
          promoted: [],
          risers: [],
          fallers: [],
          academyArrived: [ref("a"), ref("gone")],
        },
      }),
      "clube-1",
      SEASON,
      REFERENCE,
    );
    expect(report.arrived.map((row) => [row.playerId, row.estimate])).toEqual([
      ["a", { low: 60, high: 76 }],
      ["gone", undefined],
    ]);
    expect(report.promoted).toEqual([{ ...ref("p"), estimate: { low: 55, high: 70 } }]);
    // "b" nasceu em 2007: tem 20 anos no início da temporada seguinte, então está no último ano.
    expect(report.left.map((row) => [row.playerId, row.reason])).toEqual([
      ["r", "released"],
      ["b", "ageOut"],
    ]);
  });

  it("sem aviso do clube (primeira temporada ou troca de clube), chegaram = os da base desta temporada", () => {
    const report = academySeasonReport(renewal(), "clube-1", SEASON, REFERENCE);
    expect(report.arrived.map((row) => row.playerId)).toEqual(["a"]);
    const other = academySeasonReport(
      renewal({
        squadNotice: {
          season: 2,
          clubId: "clube-9",
          retired: [],
          arrived: [],
          released: [],
          promoted: [],
          risers: [],
          fallers: [],
          academyArrived: [ref("z")],
        },
      }),
      "clube-1",
      SEASON,
      REFERENCE,
    );
    expect(other.arrived.map((row) => row.playerId)).toEqual(["a"]);
  });
});
