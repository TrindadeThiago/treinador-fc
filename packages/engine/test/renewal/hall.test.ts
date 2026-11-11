import { describe, expect, it } from "vitest";
import { academyHallOf, emptyAcademy, withGraduates } from "../../src/renewal/academy";
import { HALL_SIZE, type HallPlayer, refreshHall, seedHall } from "../../src/renewal/hall";
import type { AcademyPlayer, AcademyState } from "../../src/renewal/types";

// 038 US5 (R5, R9): origem com safra, força e faixa da promoção; histórico de crias por formador.

function entry(id: string, clubId: string, strength: number, joinedSeason = 2): AcademyPlayer {
  return {
    player: {
      id,
      displayName: `Jovem ${id}`,
      position: "MF",
      birthDate: "2008-01-01",
      nationalityId: "pais",
      strength,
      traits: [],
      hidden: { potential: strength + 10, temperament: 50, injuryProneness: 50 },
    } as unknown as AcademyPlayer["player"],
    clubId,
    joinedSeason,
    estimate: { low: strength + 2, high: strength + 18 },
  };
}

const hallPlayer = (id: string, strength: number): HallPlayer => ({
  id,
  displayName: `Jovem ${id}`,
  position: "MF",
  strength,
});

describe("withGraduates com histórico (038)", () => {
  it("guarda safra e força; a faixa só com keepEstimate; soma o total do formador", () => {
    let academy: AcademyState = emptyAcademy();
    academy = withGraduates(academy, [entry("a", "clube-1", 50)], 3, { keepEstimate: true });
    academy = withGraduates(academy, [entry("b", "clube-1", 60), entry("c", "clube-2", 40)], 3);
    expect(academy.graduates.a).toEqual({
      clubId: "clube-1",
      season: 3,
      joinedSeason: 2,
      peak: 50,
      estimate: { low: 52, high: 68 },
    });
    expect(academy.graduates.b?.estimate).toBeUndefined();
    expect(academy.graduates.c?.peak).toBe(40);
    const hall = academyHallOf({ academy } as never, "clube-1");
    expect(hall.promoted).toBe(2);
    expect(hall.best.map((legend) => [legend.playerId, legend.peak])).toEqual([
      ["b", 60],
      ["a", 50],
    ]);
    expect(academyHallOf({ academy } as never, "clube-3")).toEqual({ promoted: 0, best: [] });
  });
});

describe("refreshHall (038 R9)", () => {
  it("força máxima só sobe, aposentados ficam, até 5 por clube na ordem pico, temporada, id", () => {
    let academy: AcademyState = emptyAcademy();
    const entries = Array.from({ length: 7 }, (_, index) =>
      entry(`j${index}`, "clube-1", 40 + index),
    );
    academy = withGraduates(academy, entries, 2);
    // j6 se aposentou (fora do mapa); j0 cresceu muito; j5 caiu (o pico fica).
    const living = new Map([
      ["j0", hallPlayer("j0", 90)],
      ["j1", hallPlayer("j1", 41)],
      ["j2", hallPlayer("j2", 42)],
      ["j3", hallPlayer("j3", 43)],
      ["j4", hallPlayer("j4", 44)],
      ["j5", hallPlayer("j5", 30)],
    ]);
    const refreshed = refreshHall(academy, living);
    expect(refreshed.graduates.j0?.peak).toBe(90);
    expect(refreshed.graduates.j5?.peak).toBe(45);
    const best = refreshed.hall?.["clube-1"]?.best ?? [];
    expect(best).toHaveLength(HALL_SIZE);
    expect(best.map((legend) => [legend.playerId, legend.peak])).toEqual([
      ["j0", 90],
      ["j6", 46],
      ["j5", 45],
      ["j4", 44],
      ["j3", 43],
    ]);
    expect(refreshed.hall?.["clube-1"]?.promoted).toBe(7);
  });

  it("seedHall conta os promovidos conhecidos e começa a força máxima na atual", () => {
    let academy: AcademyState = emptyAcademy();
    academy = {
      ...academy,
      graduates: { x: { clubId: "clube-9", season: 1 }, y: { clubId: "clube-9", season: 2 } },
    };
    const seeded = seedHall(academy, new Map([["x", hallPlayer("x", 55)]]));
    expect(seeded.hall?.["clube-9"]?.promoted).toBe(2);
    expect(seeded.graduates.x?.peak).toBe(55);
    expect(seeded.hall?.["clube-9"]?.best.map((legend) => legend.playerId)).toEqual(["x"]);
  });
});

describe("captados no histórico (040 FR-011)", () => {
  it("withGraduates copia a origem; o hall conta os captados e marca a lenda", () => {
    const scouted = {
      ...entry("cap", "clube-1", 70),
      origin: {
        kind: "scouted" as const,
        region: { kind: "country" as const, countryId: "pais-b" },
        season: 2,
      },
    };
    let academy: AcademyState = emptyAcademy();
    academy = withGraduates(academy, [scouted, entry("loc", "clube-1", 50)], 3);
    expect(academy.graduates.cap?.origin).toEqual(scouted.origin);
    expect(academy.graduates.loc?.origin).toBeUndefined();
    const hall = academyHallOf({ academy } as never, "clube-1");
    expect(hall.promoted).toBe(2);
    expect(hall.scouted).toBe(1);
    expect(hall.best.find((legend) => legend.playerId === "cap")?.scouted).toBe(true);
    expect(hall.best.find((legend) => legend.playerId === "loc")?.scouted).toBeUndefined();
  });
});
