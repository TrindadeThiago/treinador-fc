import { describe, expect, it } from "vitest";
import {
  advanceCareerSeason,
  isCareerSeasonOver,
  migrateSave,
  SAVE_FORMAT_VERSION,
  type SaveFile,
} from "../src";
import { playDay, saveV25 } from "./fixtures";

const NOW = "2026-11-11T00:00:00.000Z";

// 041 (T004, T006): a migração v25 → v26 começa sem cláusulas de revenda e zera a categoria
// `resale` nos resumos de temporada. Cláusulas incoerentes tornam o save corrupto.

function migrated(rounds = 2): SaveFile {
  const result = migrateSave(saveV25({ rounds }));
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  expect(result.migratedFrom).toBe(25);
  expect(result.save.formatVersion).toBe(SAVE_FORMAT_VERSION);
  return result.save;
}

function clause(id: string, playerId: string, pct = 30) {
  return {
    id,
    playerId,
    displayName: playerId,
    creditorClubId: "clube-001",
    pct,
    season: 1,
    round: 0,
    fromClubId: "clube-001",
    toClubId: "clube-002",
    fee: 1_000_000,
  };
}

describe("migração v25 → v26 (041)", () => {
  it("abre igual, sem cláusulas e com a categoria resale zerada nos resumos", () => {
    const v25 = saveV25({ rounds: 2 });
    const save = migrated();
    expect(save.market.resale).toBeUndefined();
    for (const summary of save.finances.seasons) expect(summary.totals.resale).toBe(0);
    const { formatVersion: _a, finances: fa, ...rest } = save;
    const { formatVersion: _b, finances: fb, ...old } = v25;
    expect(rest).toEqual(old);
    expect(fa.clubs).toEqual(fb.clubs);
    expect(fa.ledger).toEqual(fb.ledger);
  }, 300_000);

  it("um save v25 migrado chega à virada seguinte (SC-007)", () => {
    let save = migrated(0);
    while (!isCareerSeasonOver(save)) save = playDay(save);
    const turned = advanceCareerSeason(save, NOW, { passiveManager: true });
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    for (const summary of turned.save.finances.seasons) {
      expect(summary.totals.resale).toBe(0);
    }
    const reloaded = migrateSave(JSON.parse(JSON.stringify(turned.save)));
    expect(reloaded.status === "corrupt" ? reloaded.reason : "ok").toBe("ok");
  }, 600_000);

  it("rejeita duas cláusulas para o mesmo jogador e percentual fora dos limites", () => {
    const save = migrated();
    const bad = (clauses: unknown[]) => {
      const copy = JSON.parse(JSON.stringify(save)) as SaveFile;
      copy.market.resale = {
        clauses: clauses as NonNullable<SaveFile["market"]["resale"]>["clauses"],
        receipts: [],
        nextSeq: 9,
      };
      return migrateSave(copy).status;
    };
    expect(bad([clause("resale-1", "j1"), clause("resale-2", "j2")])).toBe("ok");
    expect(bad([clause("resale-1", "j1"), clause("resale-2", "j1")])).toBe("corrupt");
    expect(bad([clause("resale-1", "j1"), clause("resale-1", "j2")])).toBe("corrupt");
    expect(bad([clause("resale-1", "j1", 95)])).toBe("corrupt");
  }, 300_000);
});
