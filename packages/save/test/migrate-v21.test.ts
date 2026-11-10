import { academyOf, emptyAcademy } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  advanceCareerSeason,
  isCareerSeasonOver,
  migrateSave,
  SAVE_FORMAT_VERSION,
  type SaveFile,
} from "../src";
import { playDay, saveV20 } from "./fixtures";

// 036 (T009, T041): a migração v20 → v21 cria a base vazia de todos os clubes; os jogadores ficam
// onde estavam, e a carreira migrada recebe a safra na base na virada seguinte.
const NOW = "2026-11-09T00:00:00.000Z";

function migrated(step: Parameters<typeof saveV20>[0]): SaveFile {
  const result = migrateSave(saveV20(step));
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  expect(result.migratedFrom).toBe(20);
  expect(result.save.formatVersion).toBe(SAVE_FORMAT_VERSION);
  return result.save;
}

function toTurnover(save: SaveFile): SaveFile {
  let current = save;
  while (!isCareerSeasonOver(current)) current = playDay(current);
  const turned = advanceCareerSeason(current, NOW);
  if (!turned.ok) throw new Error(JSON.stringify(turned.error));
  return turned.save;
}

describe("migração v20 → v21 (036)", () => {
  it("abre com os jogadores onde estavam (a base inicial chega pela v22)", () => {
    const v20 = saveV20({ rounds: 3 });
    const save = migrated({ rounds: 3 });
    // Na v21 a base nascia vazia; a migração seguinte (v22, 037) a completa até 15 jovens.
    expect(save.renewal.academy?.players.every((entry) => entry.joinedSeason === 1)).toBe(true);
    expect(save.bank.players).toEqual(v20.bank.players);
  }, 300_000);

  it("a carreira migrada chega à virada e a safra vai para a base", () => {
    const save = toTurnover(migrated({ rounds: 0 }));
    expect(academyOf(save.renewal, save.clubId).length).toBeGreaterThan(0);
    expect(save.renewal.squadNotice?.academyArrived?.length).toBeGreaterThan(0);
  }, 600_000);

  it("uma carreira longa v20 migra e passa por duas viradas", () => {
    let save = migrated({ seasons: 1 });
    for (let season = 0; season < 2; season++) save = toTurnover(save);
    const reloaded = migrateSave(JSON.parse(JSON.stringify(save)));
    expect(reloaded.status).toBe("ok");
  }, 900_000);

  it("rejeita jogador repetido entre base e mundo, e base de clube inexistente", () => {
    const save = migrated({ rounds: 0 });
    const template = save.bank.players[0];
    if (!template) throw new Error("banco vazio");
    const { clubId: _c, contract: _k, ...player } = template;
    const repeated = JSON.parse(JSON.stringify(save)) as SaveFile;
    repeated.renewal.academy = {
      ...emptyAcademy(),
      players: [{ player, clubId: template.clubId, joinedSeason: 1 }],
    };
    expect(migrateSave(repeated).status).toBe("corrupt");
    const orphan = JSON.parse(JSON.stringify(save)) as SaveFile;
    orphan.renewal.academy = {
      ...emptyAcademy(),
      players: [
        {
          player: { ...player, id: `jogador-${orphan.renewal.nextPlayerSeq - 1 + 0}x` },
          clubId: "clube-inexistente",
          joinedSeason: 1,
        },
      ],
    };
    expect(migrateSave(orphan).status).toBe("corrupt");
  }, 300_000);
});
