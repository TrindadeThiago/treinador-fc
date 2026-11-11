import { bumpRelation, DEFAULT_AGENTS, relationOf } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import { advanceCareerSeason, isCareerSeasonOver, type SaveFile } from "../src";
import { playDay, validSave } from "./fixtures";

// 042 T017: as relações voltam ao neutro na virada e ficam presas ao clube, não ao técnico.

const when = { season: 1, round: 1 };

describe("relações com empresários no save (042)", () => {
  it("na virada, cada relação se aproxima de 50", () => {
    let save: SaveFile = validSave();
    let market = bumpRelation(
      save.market,
      save.clubId,
      "agent-x-1",
      "terminated",
      DEFAULT_AGENTS,
      when,
    ).market;
    market = bumpRelation(market, save.clubId, "agent-x-2", "signed", DEFAULT_AGENTS, when).market;
    save = { ...save, market };
    while (!isCareerSeasonOver(save)) save = playDay(save);
    const turned = advanceCareerSeason(save, "2026-11-11T00:00:00.000Z", { passiveManager: true });
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    expect(relationOf(turned.save.market, save.clubId, "agent-x-1")).toBe(40);
    expect(relationOf(turned.save.market, save.clubId, "agent-x-2")).toBe(50);
  }, 600_000);

  it("as relações são do clube: no clube novo começam neutras e as do antigo ficam guardadas", () => {
    const save = validSave();
    const oldClub = save.clubId;
    const newClub = save.league.divisions[0]?.clubIds.find((id) => id !== oldClub) ?? "";
    let market = bumpRelation(
      save.market,
      oldClub,
      "agent-x-1",
      "terminated",
      DEFAULT_AGENTS,
      when,
    ).market;
    expect(relationOf(market, newClub, "agent-x-1")).toBe(50);
    market = bumpRelation(market, newClub, "agent-x-1", "signed", DEFAULT_AGENTS, when).market;
    expect(relationOf(market, newClub, "agent-x-1")).toBe(55);
    expect(relationOf(market, oldClub, "agent-x-1")).toBe(35);
  });
});
