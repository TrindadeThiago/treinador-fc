import { describe, expect, it } from "vitest";
import { aiCommission } from "../../src/agents/commission";
import { advanceCareer } from "../../src/career/day";
import { seasonTurnover } from "../../src/career/turnover";
import { aiMarketRound } from "../../src/market/ai/round";
import type { MarketContext } from "../../src/market/types";
import { initialRenewal } from "../../src/renewal/measure";
import { contextAfter, MANAGER, marketContext, SEED, YEAR } from "./helpers";

// 042 US4 (T018): a IA paga a comissão de referência e nunca ganha relação.

function ledgerMatches(context: Pick<MarketContext, "finances">): boolean {
  const sums = new Map<string, number>();
  for (const entry of context.finances.ledger) {
    sums.set(entry.clubId, (sums.get(entry.clubId) ?? 0) + entry.amount);
  }
  return Object.values(context.finances.clubs).every(
    (club) => club.cash - club.seasonStartCash === (sums.get(club.clubId) ?? 0),
  );
}

describe("comissões da IA (042 US4)", () => {
  it("compras e livres da IA lançam a comissão no clube que contrata, sem relação", () => {
    const ctx = contextAfter(1);
    const update = aiMarketRound(ctx);
    const signed = update.market.log.filter(
      (entry) =>
        entry.season === ctx.league.number &&
        entry.outcome === undefined &&
        (entry.kind === "sale" || entry.kind === "free") &&
        entry.toClubId !== MANAGER,
    );
    expect(signed.length).toBeGreaterThan(0);
    for (const entry of signed) {
      // Nos negócios da IA a comissão fica só no livro-caixa (o registro não cresce).
      expect(entry).not.toHaveProperty("commission");
      const paid = update.finances.ledger.filter(
        (line) => line.category === "commission" && line.clubId === entry.toClubId,
      );
      expect(paid.length).toBeGreaterThan(0);
    }
    expect(update.market.agents).toBeUndefined();
    expect(ledgerMatches(update)).toBe(true);
  });

  it("as renovações da IA pagam a comissão na temporada nova e o livro-caixa bate", () => {
    const start = marketContext();
    const played = advanceCareer(
      start.league,
      start.finances,
      start.world,
      { toEnd: true },
      MANAGER,
      undefined,
      { state: initialRenewal(start.world), careerSeed: SEED },
    );
    if (!played.ok) throw new Error(JSON.stringify(played.error));
    const expiring = {
      ...played.world,
      players: played.world.players.map((player) =>
        player.contract && player.clubId !== MANAGER
          ? { ...player, contract: { ...player.contract, untilYear: YEAR } }
          : player,
      ),
    };
    const result = seasonTurnover(played.league, expiring, [], {
      careerSeed: SEED,
      finances: played.finances,
      managerClubId: MANAGER,
      renewal: initialRenewal(expiring),
      market: start.market,
    });
    if (!result.ok || !result.finances || !result.market) throw new Error("falhou");
    const commissions = result.finances.ledger.filter((entry) => entry.category === "commission");
    expect(commissions.length).toBeGreaterThan(50);
    expect(commissions.every((entry) => entry.amount < 0 && entry.clubId !== MANAGER)).toBe(true);
    expect(commissions.every((entry) => entry.season === played.league.number + 1)).toBe(true);
    expect(ledgerMatches({ finances: result.finances })).toBe(true);
    expect(result.market.agents).toBeUndefined();
  }, 120_000);

  it("a comissão da IA é a de referência com relação neutra", () => {
    const ctx = marketContext();
    const player = ctx.world.players.find((entry) => entry.clubId !== MANAGER);
    if (!player) throw new Error("sem jogador");
    const amount = aiCommission(ctx, player, player.clubId);
    expect(amount).toBeGreaterThan(0);
    expect(amount % 1000).toBe(0);
  });
});
