import {
  academyClub,
  academyHallOf,
  academyRules,
  CRIA_DEBUT,
  CRIA_GOAL,
  CRIA_SALE,
  estimateWidth,
  HALL_SIZE,
} from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  advanceCareerSeason,
  isCareerSeasonOver,
  migrateSave,
  SAVE_FORMAT_VERSION,
  type SaveFile,
} from "../src";
import { playDay, saveV22 } from "./fixtures";

// 038 (T004, T008): a migração v22 → v23 dá faixa a todo jovem da base, força máxima e histórico às
// crias, e marca as crias antigas para nenhuma ganhar manchete de estreia.
const NOW = "2026-11-10T00:00:00.000Z";

function migrated(step: Parameters<typeof saveV22>[0]): SaveFile {
  const result = migrateSave(saveV22(step));
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  expect(result.migratedFrom).toBe(22);
  expect(result.save.formatVersion).toBe(SAVE_FORMAT_VERSION);
  return result.save;
}

describe("migração v22 → v23 (038)", () => {
  it("todo jovem da base ganha faixa que contém o potencial, com a largura do nível e do tempo", () => {
    const save = migrated({ seasons: 1, rounds: 2 });
    const players = save.renewal.academy?.players ?? [];
    expect(players.length).toBeGreaterThan(0);
    for (const entry of players) {
      const estimate = entry.estimate;
      if (!estimate) throw new Error(`sem faixa: ${entry.player.id}`);
      expect(estimate.low).toBeLessThanOrEqual(entry.player.hidden.potential);
      expect(estimate.high).toBeGreaterThanOrEqual(entry.player.hidden.potential);
      const level = academyClub(save.renewal, save.bank, entry.clubId).level;
      const rule = academyRules(save.bank, entry.clubId)[level - 1];
      if (!rule) throw new Error("sem regra");
      expect(estimate.high - estimate.low).toBeLessThanOrEqual(
        estimateWidth(rule, level, save.league.number - entry.joinedSeason),
      );
    }
  }, 300_000);

  it("crias: força máxima, histórico do formador e marcas nas notícias", () => {
    const v22 = saveV22({ seasons: 1 });
    const save = migrated({ seasons: 1 });
    const graduates = Object.entries(save.renewal.academy?.graduates ?? {});
    expect(graduates.length).toBe(Object.keys(v22.renewal.academy?.graduates ?? {}).length);
    expect(graduates.length).toBeGreaterThan(0);
    const strength = new Map(save.bank.players.map((player) => [player.id, player.strength]));
    const byClub = new Map<string, number>();
    for (const [playerId, graduate] of graduates) {
      const current = strength.get(playerId);
      if (current !== undefined) expect(graduate.peak).toBe(current);
      expect(graduate.estimate).toBeUndefined();
      expect(graduate.joinedSeason).toBeUndefined();
      expect(save.news.crias?.[playerId]).toBe(CRIA_DEBUT | CRIA_GOAL | CRIA_SALE);
      byClub.set(graduate.clubId, (byClub.get(graduate.clubId) ?? 0) + 1);
    }
    for (const [clubId, count] of byClub) {
      const hall = academyHallOf(save.renewal, clubId);
      expect(hall.promoted).toBe(count);
      expect(hall.best.length).toBe(Math.min(HALL_SIZE, count));
      const peaks = hall.best.map((legend) => legend.peak);
      expect(peaks).toEqual([...peaks].sort((a, b) => b - a));
    }
  }, 300_000);

  it("um save v22 migrado chega à virada seguinte e reabre (SC-008)", () => {
    let save = migrated({ rounds: 2 });
    while (!isCareerSeasonOver(save)) save = playDay(save);
    const turned = advanceCareerSeason(save, NOW, { passiveManager: true });
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    const reloaded = migrateSave(JSON.parse(JSON.stringify(turned.save)));
    expect(reloaded.status === "corrupt" ? reloaded.reason : "ok").toBe("ok");
  }, 600_000);

  it("rejeita uma faixa invertida", () => {
    const save = migrated({ rounds: 0 });
    const copy = JSON.parse(JSON.stringify(save)) as SaveFile;
    const first = copy.renewal.academy?.players[0];
    if (!first) throw new Error("base vazia");
    first.estimate = { low: 80, high: 60 };
    expect(migrateSave(copy).status).toBe("corrupt");
  }, 300_000);
});
