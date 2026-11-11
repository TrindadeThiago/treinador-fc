import { agentOf } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  advanceCareerSeason,
  isCareerSeasonOver,
  migrateSave,
  SAVE_FORMAT_VERSION,
  type SaveFile,
} from "../src";
import { playDay, saveV26 } from "./fixtures";

// 042 (T006, T010): a migração v26 → v27 não cria nada além da categoria `commission` zerada nos
// resumos: os empresários são derivados e as relações começam neutras (sem `market.agents`).

const NOW = "2026-11-11T00:00:00.000Z";

function migrated(rounds = 2): SaveFile {
  const result = migrateSave(saveV26({ rounds }));
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  expect(result.migratedFrom).toBe(26);
  expect(result.save.formatVersion).toBe(SAVE_FORMAT_VERSION);
  return result.save;
}

describe("migração v26 → v27 (042)", () => {
  it("abre igual, sem relações, e todo jogador tem empresário derivável (SC-006)", () => {
    const v26 = saveV26({ rounds: 2 });
    const save = migrated();
    expect(save.market.agents).toBeUndefined();
    const { formatVersion: _a, finances: fa, ...rest } = save;
    const { formatVersion: _b, finances: fb, ...old } = v26;
    expect(rest).toEqual(old);
    expect(fa.clubs).toEqual(fb.clubs);
    for (const player of save.bank.players) {
      expect(agentOf(save.bank, save.seed, player)?.countryId).toBe(player.nationalityId);
    }
  }, 300_000);

  it("um save v26 migrado chega à virada seguinte", () => {
    let save = migrated(0);
    while (!isCareerSeasonOver(save)) save = playDay(save);
    const turned = advanceCareerSeason(save, NOW, { passiveManager: true });
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    const reloaded = migrateSave(JSON.parse(JSON.stringify(turned.save)));
    expect(reloaded.status === "corrupt" ? reloaded.reason : "ok").toBe("ok");
  }, 600_000);

  it("rejeita relação de clube inexistente", () => {
    const save = migrated();
    const bad = (clubId: string) => {
      const copy = JSON.parse(JSON.stringify(save)) as SaveFile;
      copy.market.agents = {
        relations: {
          [clubId]: { "agent-x-1": { value: 40, reason: "signed", season: 1, round: 1 } },
        },
        deals: [],
      };
      return migrateSave(copy).status;
    };
    expect(bad(save.clubId)).toBe("ok");
    expect(bad("clube-que-nao-existe")).toBe("corrupt");
  }, 300_000);
});
