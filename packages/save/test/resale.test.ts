import { describe, expect, it } from "vitest";
import {
  advanceCareerSeason,
  isCareerSeasonOver,
  migrateSave,
  quoteManagerSale,
  type SaveFile,
  sellManagerPlayer,
} from "../src";
import { playDay, validSave } from "./fixtures";

// 041 T013: cláusulas no save — vender com cláusula salva e reabre; na virada, a cláusula de quem
// saiu do mundo vira recibo "retired" e as dos demais (inclusive de outro credor) continuam.

function clause(id: string, playerId: string, creditorClubId: string) {
  return {
    id,
    playerId,
    displayName: `Nome ${playerId}`,
    creditorClubId,
    pct: 20,
    season: 1,
    round: 0,
    fromClubId: creditorClubId,
    toClubId: "x",
    fee: 1_000_000,
  };
}

describe("cláusulas de revenda no save (041)", () => {
  it("vender com cláusula grava a cláusula e o save reabre coerente", () => {
    const save = validSave();
    const player = save.bank.players
      .filter((entry) => entry.clubId === save.clubId)
      .sort((a, b) => b.strength - a.strength)[0];
    if (!player) throw new Error("sem jogador");
    const quote = quoteManagerSale(save, player.id, 30);
    if (!quote.ok) throw new Error(JSON.stringify(quote.error));
    const sold = sellManagerPlayer(save, player.id, 30);
    if (!sold.ok) throw new Error(JSON.stringify(sold.error));
    expect(sold.save.market.resale?.clauses).toEqual([
      expect.objectContaining({ playerId: player.id, creditorClubId: save.clubId, pct: 30 }),
    ]);
    const reloaded = migrateSave(JSON.parse(JSON.stringify(sold.save)));
    expect(reloaded.status === "corrupt" ? reloaded.reason : reloaded.status).toBe("ok");
  });

  it("na virada, a cláusula de quem saiu do mundo vira recibo e as outras continuam", () => {
    let save: SaveFile = validSave();
    const alive = save.bank.players.find((entry) => entry.clubId !== save.clubId);
    if (!alive) throw new Error("sem jogador");
    const otherClub = save.league.divisions[0]?.clubIds.find((id) => id !== save.clubId) ?? "";
    save = {
      ...save,
      market: {
        ...save.market,
        resale: {
          clauses: [
            clause("resale-1", alive.id, save.clubId),
            clause("resale-2", "jogador-que-saiu", save.clubId),
            // Credor que não é o clube do técnico (ex.: clube antigo dele): continua valendo.
            clause("resale-3", "outro-que-saiu", otherClub),
          ],
          receipts: [],
          nextSeq: 4,
        },
      },
    };
    while (!isCareerSeasonOver(save)) save = playDay(save);
    const turned = advanceCareerSeason(save, "2026-11-11T00:00:00.000Z", { passiveManager: true });
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    const resale = turned.save.market.resale;
    const stillAlive = turned.save.bank.players.some((entry) => entry.id === alive.id);
    expect(resale?.clauses.map((entry) => entry.id)).toEqual(stillAlive ? ["resale-1"] : []);
    expect(resale?.receipts.map((entry) => [entry.clauseId, entry.outcome])).toEqual(
      expect.arrayContaining([
        ["resale-2", "retired"],
        ["resale-3", "retired"],
      ]),
    );
    expect(resale?.receipts.find((entry) => entry.clauseId === "resale-2")).toMatchObject({
      displayName: "Nome jogador-que-saiu",
      season: turned.save.league.number,
      amount: 0,
    });
  }, 600_000);
});
