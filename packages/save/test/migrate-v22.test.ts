import {
  academyClub,
  academyLevelRule,
  academyOf,
  DEFAULT_ACADEMY_LEVELS,
  initialAcademySize,
  levelForReputation,
} from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  advanceCareerSeason,
  isCareerSeasonOver,
  migrateSave,
  SAVE_FORMAT_VERSION,
  type SaveFile,
} from "../src";
import { playDay, saveV21 } from "./fixtures";

// 037 (T006, T031): a migração v21 → v22 dá a cada clube o nível da reputação e completa a base
// até 15 jovens, sem tirar ninguém.
const NOW = "2026-11-09T00:00:00.000Z";

function migrated(step: Parameters<typeof saveV21>[0]): SaveFile {
  const result = migrateSave(saveV21(step));
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  expect(result.migratedFrom).toBe(21);
  expect(result.save.formatVersion).toBe(SAVE_FORMAT_VERSION);
  return result.save;
}

function toTurnover(save: SaveFile): SaveFile {
  let current = save;
  while (!isCareerSeasonOver(current)) current = playDay(current);
  const turned = advanceCareerSeason(current, NOW, { passiveManager: true });
  if (!turned.ok) throw new Error(JSON.stringify(turned.error));
  return turned.save;
}

describe("migração v21 → v22 (037)", () => {
  it("nível da reputação, sem pendência, e base completada (técnico 10, IA 3 safras)", () => {
    const v21 = saveV21({ rounds: 2 });
    const save = migrated({ rounds: 2 });
    for (const club of save.bank.clubs) {
      expect(academyClub(save.renewal, save.bank, club.id)).toEqual({
        level: levelForReputation(DEFAULT_ACADEMY_LEVELS, club.reputation),
      });
      const rule = academyLevelRule(save.renewal, save.bank, club.id);
      const target = initialAcademySize(rule, club.id === save.clubId);
      expect(academyOf(save.renewal, club.id).length).toBeGreaterThanOrEqual(target);
    }
    for (const entry of v21.renewal.academy?.players ?? []) {
      expect(save.renewal.academy?.players).toContainEqual(entry);
    }
  }, 300_000);

  it("uma carreira longa v21 migra e passa por duas viradas", () => {
    let save = migrated({ seasons: 1 });
    for (let season = 0; season < 2; season++) save = toTurnover(save);
    const reloaded = migrateSave(JSON.parse(JSON.stringify(save)));
    expect(reloaded.status === "corrupt" ? reloaded.reason : "ok").toBe("ok");
  }, 900_000);

  it("rejeita nível fora de 1–5, pendência incoerente e clube inexistente", () => {
    const save = migrated({ rounds: 0 });
    const bad = (edit: (copy: SaveFile) => void) => {
      const copy = JSON.parse(JSON.stringify(save)) as SaveFile;
      edit(copy);
      return migrateSave(copy).status;
    };
    const clubs = () => save.renewal.academy?.clubs ?? {};
    expect(
      bad((copy) => {
        if (copy.renewal.academy)
          copy.renewal.academy.clubs = { ...clubs(), [save.clubId]: { level: 6 } };
      }),
    ).toBe("corrupt");
    expect(
      bad((copy) => {
        if (copy.renewal.academy)
          copy.renewal.academy.clubs = {
            ...clubs(),
            [save.clubId]: { level: 1, pending: { kind: "downgrade" } },
          };
      }),
    ).toBe("corrupt");
    expect(
      bad((copy) => {
        if (copy.renewal.academy)
          copy.renewal.academy.clubs = { ...clubs(), "clube-x": { level: 2 } };
      }),
    ).toBe("corrupt");
  }, 300_000);
});
