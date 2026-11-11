import { describe, expect, it } from "vitest";
import { migrateSave, SAVE_FORMAT_VERSION, type SaveFile } from "../src";
import { saveV24 } from "./fixtures";

// 040 (T004, T006): a migração v24 → v25 só sobe a versão; a captação começa sem região nem
// indicações. Indicações incoerentes tornam o save corrupto.

function migrated(): SaveFile {
  const result = migrateSave(saveV24({ rounds: 2 }));
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  expect(result.migratedFrom).toBe(24);
  expect(result.save.formatVersion).toBe(SAVE_FORMAT_VERSION);
  return result.save;
}

describe("migração v24 → v25 (040)", () => {
  it("abre igual, sem região nem indicações", () => {
    const v24 = saveV24({ rounds: 2 });
    const save = migrated();
    expect(save.scouting.region).toBeUndefined();
    expect(save.scouting.offers).toBeUndefined();
    const { formatVersion: _a, ...rest } = save;
    const { formatVersion: _b, ...old } = v24;
    expect(rest).toEqual(old);
  }, 300_000);

  it("rejeita indicação com id de jogador do mundo ou com faixa invertida", () => {
    const save = migrated();
    const player = save.bank.players[0];
    if (!player) throw new Error("banco vazio");
    const offer = (id: string, low: number, high: number) => ({
      id,
      player: { ...player, id },
      estimate: { low, high },
      region: { kind: "country" as const, countryId: player.nationalityId },
      cost: 1000,
      expiresRound: 3,
      season: 1,
    });
    const bad = (offers: unknown[]) => {
      const copy = JSON.parse(JSON.stringify(save)) as SaveFile;
      copy.scouting.offers = offers as NonNullable<SaveFile["scouting"]["offers"]>;
      return migrateSave(copy).status;
    };
    expect(bad([offer("scout-offer-1", 40, 60)])).toBe("ok");
    expect(bad([offer(player.id, 40, 60)])).toBe("corrupt");
    expect(bad([offer("scout-offer-1", 70, 60)])).toBe("corrupt");
  }, 300_000);
});
