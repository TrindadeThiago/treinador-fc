import { describe, expect, it } from "vitest";
import {
  advanceCareerSeason,
  isCareerSeasonOver,
  migrateSave,
  SAVE_FORMAT_VERSION,
  type SaveFile,
} from "../src";
import { playDay, saveV23 } from "./fixtures";

// 039 (T005, T008): a migração v23 → v24 dá o departamento de olheiros fechado, sem observações nem
// relatórios; os relatórios automáticos do elenco nascem na primeira rodada.
const NOW = "2026-11-10T00:00:00.000Z";

function migrated(step: Parameters<typeof saveV23>[0]): SaveFile {
  const result = migrateSave(saveV23(step));
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  expect(result.migratedFrom).toBe(23);
  expect(result.save.formatVersion).toBe(SAVE_FORMAT_VERSION);
  return result.save;
}

describe("migração v23 → v24 (039)", () => {
  it("departamento fechado e o resto igual", () => {
    const v23 = saveV23({ rounds: 2 });
    const save = migrated({ rounds: 2 });
    expect(save.scouting).toEqual({ level: 0, watch: [], reports: {} });
    const { formatVersion: _a, scouting: _s, ...rest } = save;
    const { formatVersion: _b, ...old } = v23;
    expect(rest).toEqual(old);
  }, 300_000);

  it("um save v23 migrado chega à virada seguinte e ganha os relatórios do elenco (SC-008)", () => {
    let save = migrated({ rounds: 0 });
    save = playDay(save);
    expect(Object.keys(save.scouting.reports).length).toBeGreaterThan(0);
    while (!isCareerSeasonOver(save)) save = playDay(save);
    const turned = advanceCareerSeason(save, NOW, { passiveManager: true });
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    const reloaded = migrateSave(JSON.parse(JSON.stringify(turned.save)));
    expect(reloaded.status === "corrupt" ? reloaded.reason : "ok").toBe("ok");
  }, 600_000);

  it("rejeita nível fora de 0 a 5, observação repetida e faixa invertida", () => {
    const save = migrated({ rounds: 0 });
    const bad = (edit: (copy: SaveFile) => void) => {
      const copy = JSON.parse(JSON.stringify(save)) as SaveFile;
      edit(copy);
      return migrateSave(copy).status;
    };
    expect(bad((copy) => (copy.scouting.level = 6))).toBe("corrupt");
    const since = { season: 1, round: 0 };
    expect(
      bad(
        (copy) =>
          (copy.scouting.watch = [
            { playerId: "jogador-00001", since },
            { playerId: "jogador-00001", since },
          ]),
      ),
    ).toBe("corrupt");
    expect(
      bad(
        (copy) =>
          (copy.scouting.reports = {
            "jogador-00001": { estimate: { low: 80, high: 60 }, steps: 1, updated: since },
          }),
      ),
    ).toBe("corrupt");
  }, 300_000);
});
