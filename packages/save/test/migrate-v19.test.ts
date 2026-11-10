import type { MatchRecord } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import { exportSave, importSave, migrateSave, SAVE_FORMAT_VERSION, type SaveFile } from "../src";
import { playDay, sansAcademy, saveV18 } from "./fixtures";

// 033 (T010): a migração v18 → v19 só sobe a versão; as partidas antigas ficam sem jogadas e as
// novas passam a tê-las. Jogadas inválidas num save importado são rejeitadas (FR-014).
const records = (save: SaveFile): MatchRecord[] =>
  [save.league, ...save.competitions].flatMap((league) =>
    league.divisions.flatMap((season) => season.records),
  );

const hasPlays = (record: MatchRecord) =>
  Object.values(record.players).some((line) => line.plays !== undefined);

function migrated(rounds: number): SaveFile {
  const result = migrateSave(saveV18({ rounds }));
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  expect(result.migratedFrom).toBe(18);
  expect(result.save.formatVersion).toBe(SAVE_FORMAT_VERSION);
  return result.save;
}

/** Primeira linha com jogadas de um save que acabou de jogar um dia. */
function firstPlays(save: SaveFile): number[] {
  for (const record of records(save)) {
    for (const line of Object.values(record.players)) {
      if (line.plays) return line.plays as unknown as number[];
    }
  }
  throw new Error("sem jogadas");
}

describe("migração v18 → v19 (033 FR-012, SC-005)", () => {
  it("abre igual, com as partidas antigas sem jogadas; as novas passam a tê-las", () => {
    const v18 = saveV18({ rounds: 5 });
    const save = migrated(5);
    const { formatVersion: _a, ...rest } = save;
    const { formatVersion: _b, ...restV18 } = v18;
    expect(sansAcademy(rest)).toEqual(sansAcademy(restV18));
    const before = records(save).length;
    expect(before).toBeGreaterThan(0);
    expect(records(save).some(hasPlays)).toBe(false);
    const after = playDay(save);
    const fresh = records(after).slice(before);
    expect(fresh.length).toBeGreaterThan(0);
    expect(fresh.some(hasPlays)).toBe(true);
  }, 300_000);

  it("um arquivo exportado na v18 passa pela mesma migração ao importar", () => {
    const bytes = exportSave(
      saveV18({ rounds: 3 }) as unknown as SaveFile,
      "2026-11-04T00:00:00.000Z",
    );
    const result = importSave(bytes);
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    expect(result.migratedFrom).toBe(18);
  }, 120_000);
});

describe("jogadas no save (033 FR-014)", () => {
  let cached: SaveFile | undefined;
  const played = (): SaveFile => {
    cached ??= playDay(migrated(0));
    return JSON.parse(JSON.stringify(cached)) as SaveFile;
  };

  it("exportar e importar preserva as tuplas", () => {
    const save = played();
    const result = importSave(exportSave(save, "2026-11-04T00:00:00.000Z"));
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    expect(firstPlays(result.save)).toEqual(firstPlays(save));
  }, 300_000);

  it.each([
    ["tamanho errado", [10, 8, 1, 2, 1]],
    ["valor negativo", [10, 8, 1, 2, 1, -1]],
    ["não inteiro", [10, 8.5, 1, 2, 1, 0]],
    ["passes certos acima dos tentados", [10, 11, 1, 2, 1, 0]],
    ["desarmes certos acima dos tentados", [10, 8, 1, 2, 3, 0]],
  ])(
    "rejeita jogadas com %s, dizendo onde",
    (_label, tuple) => {
      const save = played();
      const target = records(save).find(hasPlays) as MatchRecord;
      const [playerId, line] = Object.entries(target.players).find(([, entry]) => entry.plays) as [
        string,
        MatchRecord["players"][string],
      ];
      (line as { plays: unknown }).plays = tuple;
      const result = migrateSave(JSON.parse(JSON.stringify(save)));
      expect(result.status).toBe("corrupt");
      if (result.status === "corrupt") {
        expect(result.reason).toContain("jogadas");
        expect(result.reason).toContain(playerId);
      }
    },
    300_000,
  );
});
