import { describe, expect, it } from "vitest";
import {
  advanceCareerSeason,
  isCareerSeasonOver,
  type SaveFile,
  setScoutingLevel,
  setScoutingRegion,
} from "../src";
import { playDay, validSave } from "./fixtures";

// 040 T009: na virada, com uma região escolhida, saem as indicações da janela da pré-temporada.

describe("captação na virada (040)", () => {
  it("com o departamento aberto e uma região, a temporada nova começa com indicações", () => {
    let save: SaveFile = validSave();
    const opened = setScoutingLevel(save, 5);
    if (!opened.ok) throw new Error(JSON.stringify(opened));
    const countryId = opened.save.bank.countries[0]?.id ?? "";
    const chosen = setScoutingRegion(opened.save, { kind: "country", countryId });
    if (!chosen.ok) throw new Error(JSON.stringify(chosen));
    save = chosen.save;
    while (!isCareerSeasonOver(save)) save = playDay(save);
    const turned = advanceCareerSeason(save, "2026-11-11T00:00:00.000Z", { passiveManager: true });
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    const offers = turned.save.scouting.offers ?? [];
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.every((offer) => offer.season === turned.save.league.number)).toBe(true);
    expect(turned.save.scouting.region).toEqual({ kind: "country", countryId });
  }, 600_000);
});
