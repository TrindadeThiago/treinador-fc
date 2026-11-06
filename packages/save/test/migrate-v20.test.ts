import type { MatchRecord } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import { migrateSave, SAVE_FORMAT_VERSION, type SaveFile } from "../src";
import { playDay, saveV19 } from "./fixtures";

// 034 (T003): a migração v19 → v20 só sobe a versão; as tuplas de 6 da v19 continuam válidas e as
// partidas novas gravam 9 inteiros (finalizações, defesas e posição da vaga).
const records = (save: SaveFile): MatchRecord[] =>
  [save.league, ...save.competitions].flatMap((league) =>
    league.divisions.flatMap((season) => season.records),
  );

const lengths = (list: readonly MatchRecord[]) =>
  new Set(
    list.flatMap((record) =>
      Object.values(record.players).flatMap((line) => (line.plays ? [line.plays.length] : [])),
    ),
  );

function migrated(rounds: number): SaveFile {
  const result = migrateSave(saveV19({ rounds }));
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  expect(result.migratedFrom).toBe(19);
  expect(result.save.formatVersion).toBe(SAVE_FORMAT_VERSION);
  return result.save;
}

describe("migração v19 → v20 (034)", () => {
  it("abre igual, com as tuplas de 6; as partidas novas gravam 9 inteiros", () => {
    const v19 = saveV19({ rounds: 4 });
    const save = migrated(4);
    const { formatVersion: _a, ...rest } = save;
    const { formatVersion: _b, ...restV19 } = v19;
    expect(rest).toEqual(restV19);
    const key = (record: MatchRecord) => `${record.round}:${record.home}:${record.away}`;
    const old = new Set(records(save).map(key));
    expect(old.size).toBeGreaterThan(0);
    expect(lengths(records(save))).toEqual(new Set([6]));
    const after = playDay(save);
    const fresh = records(after).filter((record) => !old.has(key(record)));
    expect(fresh.length).toBeGreaterThan(0);
    expect(lengths(fresh)).toEqual(new Set([9]));
  }, 300_000);

  it.each([
    ["sete inteiros", [10, 8, 1, 2, 1, 0, 1]],
    ["oito inteiros", [10, 8, 1, 2, 1, 0, 1, 0]],
    ["posição fora de 0 a 5", [10, 8, 1, 2, 1, 0, 1, 0, 6]],
  ])(
    "rejeita jogadas com %s",
    (_label, tuple) => {
      const save = playDay(migrated(0));
      const target = records(save).find((record) =>
        Object.values(record.players).some((line) => line.plays?.length === 9),
      ) as MatchRecord;
      const line = Object.values(target.players).find((entry) => entry.plays) as { plays: unknown };
      line.plays = tuple;
      const result = migrateSave(JSON.parse(JSON.stringify(save)));
      expect(result.status).toBe("corrupt");
    },
    300_000,
  );
});
