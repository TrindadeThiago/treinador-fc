import { describe, expect, it } from "vitest";
import { terminateContract } from "../../src/market/disposal";
import { completeLoan, completeSigning, completeTransfer } from "../../src/market/effects";
import { canAddPlayer, canRemovePlayer } from "../../src/market/squad";
import { emptyMarket, type MarketContext, type ResaleClause } from "../../src/market/types";
import type { CompletedPlayer } from "../../src/model/types";
import { clubOfCountry, worldBank, worldState } from "../career/world-helpers";
import { applied, MANAGER, marketContext, totalCash } from "./helpers";

// 041 US2 (T010): a próxima venda definitiva paga a fatia ao credor na categoria "resale"; a
// recompra pelo credor encerra sem pagamento; empréstimo, rescisão e livre não pagam.

/** Um clube (fora de `exclude`) que pode receber o jogador. */
function takerFor(ctx: MarketContext, player: CompletedPlayer, exclude: string[] = []): string {
  const clubId = Object.keys(ctx.finances.clubs)
    .sort()
    .find(
      (id) =>
        id !== player.clubId &&
        !exclude.includes(id) &&
        canAddPlayer(ctx.world, id, player.position, ctx.managerClubId),
    );
  if (!clubId) throw new Error("sem clube que receba o jogador");
  return clubId;
}

function playerIn(ctx: MarketContext, id: string): CompletedPlayer {
  const player = ctx.world.players.find((entry) => entry.id === id);
  if (!player) throw new Error(`sem jogador ${id}`);
  return player;
}

/** Jogador do técnico vendido com 30% a um clube da IA: devolve o contexto e o comprador. */
function soldWithClause(pct = 30) {
  const base = marketContext();
  const player = base.world.players
    .filter((entry) => entry.clubId === MANAGER && canRemovePlayer(base.world, MANAGER, entry.id))
    .sort((a, b) => b.strength - a.strength)[0];
  if (!player) throw new Error("sem jogador");
  const buyer = takerFor(base, player);
  const sold = completeTransfer(base, {
    playerId: player.id,
    toClubId: buyer,
    fee: 1_000_000,
    resale: { pct },
  });
  if (!sold.ok) throw new Error(JSON.stringify(sold.error));
  return { ctx: applied(base, sold.value), playerId: player.id, buyer };
}

const resaleEntries = (ctx: MarketContext) =>
  ctx.finances.ledger.filter((entry) => entry.category === "resale");

describe("pagamento da revenda (041 US2)", () => {
  it("venda IA × IA: a fatia sai do vendedor e entra no credor, e a cláusula vira recibo", () => {
    const { ctx, playerId, buyer } = soldWithClause();
    const player = playerIn(ctx, playerId);
    const next = takerFor(ctx, player, [MANAGER]);
    const before = totalCash(ctx);
    const managerCash = ctx.finances.clubs[MANAGER]?.cash ?? 0;
    const done = completeTransfer(ctx, { playerId, toClubId: next, fee: 2_000_000 });
    if (!done.ok) throw new Error(JSON.stringify(done.error));
    const after = applied(ctx, done.value);
    expect(resaleEntries(after)).toEqual([
      expect.objectContaining({ clubId: buyer, amount: -600_000, category: "resale" }),
      expect.objectContaining({ clubId: MANAGER, amount: 600_000, category: "resale" }),
    ]);
    expect(after.finances.clubs[MANAGER]?.cash).toBe(managerCash + 600_000);
    expect(totalCash(after)).toBe(before);
    expect(after.market.resale?.clauses).toEqual([]);
    expect(after.market.resale?.receipts).toEqual([
      expect.objectContaining({
        playerId,
        outcome: "paid",
        creditorClubId: MANAGER,
        sellerClubId: buyer,
        buyerClubId: next,
        saleFee: 2_000_000,
        amount: 600_000,
      }),
    ]);
    expect(after.market.log.at(-1)).toMatchObject({
      resalePaid: { clubId: MANAGER, amount: 600_000 },
    });
    expect(after.market.log.at(-1)).not.toHaveProperty("resaleCreated");
  });

  it("o credor compra de volta: encerra sem pagamento", () => {
    const { ctx, playerId } = soldWithClause();
    const done = completeTransfer(ctx, { playerId, toClubId: MANAGER, fee: 1_500_000 });
    if (!done.ok) throw new Error(JSON.stringify(done.error));
    const after = applied(ctx, done.value);
    expect(resaleEntries(after)).toEqual([]);
    expect(after.market.resale?.clauses).toEqual([]);
    expect(after.market.resale?.receipts).toEqual([
      expect.objectContaining({ playerId, outcome: "bought_back", amount: 0 }),
    ]);
    expect(after.market.log.at(-1)).not.toHaveProperty("resalePaid");
  });

  it("empréstimo não paga nem encerra a cláusula", () => {
    const { ctx, playerId } = soldWithClause();
    const player = playerIn(ctx, playerId);
    const loanee = takerFor(ctx, player, [MANAGER]);
    const done = completeLoan(ctx, { playerId, toClubId: loanee, fee: 0 });
    if (!done.ok) throw new Error(JSON.stringify(done.error));
    const after = applied(ctx, done.value);
    expect(resaleEntries(after)).toEqual([]);
    expect(after.market.resale?.clauses.map((clause) => clause.playerId)).toEqual([playerId]);
  });

  it("rescisão e contratação como livre não pagam; a próxima venda paga ao credor", () => {
    // Uma cláusula a favor de um clube da IA num jogador do técnico (comprado com cláusula).
    const base = marketContext();
    const seller = base.world.players.find(
      (entry) =>
        entry.clubId !== MANAGER &&
        canAddPlayer(base.world, MANAGER, entry.position, MANAGER) &&
        canRemovePlayer(base.world, entry.clubId, entry.id),
    );
    if (!seller) throw new Error("sem jogador");
    const creditor = seller.clubId;
    const bought = completeTransfer(base, {
      playerId: seller.id,
      toClubId: MANAGER,
      fee: 1_000_000,
      resale: { pct: 20 },
    });
    if (!bought.ok) throw new Error(JSON.stringify(bought.error));
    let ctx = applied(base, bought.value);
    expect(ctx.market.resale?.clauses[0]).toMatchObject({ creditorClubId: creditor, pct: 20 });

    const released = terminateContract(ctx, seller.id);
    if (!released.ok) throw new Error(JSON.stringify(released.error));
    ctx = applied(ctx, released.value);
    expect(resaleEntries(ctx)).toEqual([]);
    expect(ctx.market.resale?.clauses).toHaveLength(1);

    const agent = ctx.market.freeAgents.find((entry) => entry.player.id === seller.id);
    if (!agent) throw new Error("não virou livre");
    const signer = takerFor(ctx, { ...agent.player, clubId: "" } as CompletedPlayer, [
      MANAGER,
      creditor,
    ]);
    const signed = completeSigning(ctx, {
      agent,
      clubId: signer,
      contract: { wage: 1000, untilYear: ctx.league.year + 2 },
    });
    if (!signed.ok) throw new Error(JSON.stringify(signed.error));
    ctx = applied(ctx, signed.value);
    expect(resaleEntries(ctx)).toEqual([]);
    expect(ctx.market.resale?.clauses).toHaveLength(1);

    const player = playerIn(ctx, seller.id);
    const next = takerFor(ctx, player, [MANAGER, creditor]);
    const sold = completeTransfer(ctx, { playerId: seller.id, toClubId: next, fee: 500_000 });
    if (!sold.ok) throw new Error(JSON.stringify(sold.error));
    const after = applied(ctx, sold.value);
    expect(resaleEntries(after)).toEqual([
      expect.objectContaining({ clubId: signer, amount: -100_000 }),
      expect.objectContaining({ clubId: creditor, amount: 100_000 }),
    ]);
  });

  it("uma venda paga a cláusula antiga e cria a nova; no fim há uma só ativa", () => {
    const { ctx, playerId, buyer } = soldWithClause();
    const player = playerIn(ctx, playerId);
    const next = takerFor(ctx, player, [MANAGER]);
    const done = completeTransfer(ctx, {
      playerId,
      toClubId: next,
      fee: 1_000_000,
      resale: { pct: 10 },
    });
    if (!done.ok) throw new Error(JSON.stringify(done.error));
    const after = applied(ctx, done.value);
    expect(after.market.resale?.clauses).toEqual([
      expect.objectContaining({ playerId, creditorClubId: buyer, pct: 10, id: "resale-2" }),
    ]);
    expect(after.market.resale?.receipts).toEqual([
      expect.objectContaining({ clauseId: "resale-1", outcome: "paid", amount: 300_000 }),
    ]);
  });

  it("venda por 0 paga 0 e encerra", () => {
    const { ctx, playerId } = soldWithClause();
    const next = takerFor(ctx, playerIn(ctx, playerId), [MANAGER]);
    const done = completeTransfer(ctx, { playerId, toClubId: next, fee: 0 });
    if (!done.ok) throw new Error(JSON.stringify(done.error));
    const after = applied(ctx, done.value);
    expect(resaleEntries(after)).toEqual([]);
    expect(after.market.resale?.clauses).toEqual([]);
    expect(after.market.resale?.receipts[0]).toMatchObject({ outcome: "paid", amount: 0 });
  });

  it("vendedor com caixa negativo paga a fatia com o valor da própria venda", () => {
    const { ctx: base, playerId, buyer } = soldWithClause();
    const club = base.finances.clubs[buyer];
    if (!club) throw new Error("sem finanças");
    const ctx: MarketContext = {
      ...base,
      finances: {
        ...base.finances,
        clubs: { ...base.finances.clubs, [buyer]: { ...club, cash: -5_000_000 } },
      },
    };
    const next = takerFor(ctx, playerIn(ctx, playerId), [MANAGER]);
    const done = completeTransfer(ctx, { playerId, toClubId: next, fee: 1_000_000 });
    if (!done.ok) throw new Error(JSON.stringify(done.error));
    expect(done.value.finances.clubs[buyer]?.cash).toBe(-5_000_000 + 1_000_000 - 300_000);
  });
});

describe("revenda entre países (041 US2)", () => {
  it("um clube de outro país vende: o credor recebe no mesmo livro-caixa", () => {
    const bank = worldBank();
    const manager = clubOfCountry(bank, 0);
    const state = worldState(bank, "revenda-paises", manager);
    const countryOf = (id: string) => state.world.clubs.find((club) => club.id === id)?.countryId;
    const player = state.world.players.find(
      (entry) =>
        countryOf(entry.clubId) !== countryOf(manager) &&
        !entry.contract?.loan &&
        canRemovePlayer(state.world, entry.clubId, entry.id),
    );
    if (!player) throw new Error("sem jogador estrangeiro");
    const clause: ResaleClause = {
      id: "resale-1",
      playerId: player.id,
      displayName: player.displayName,
      creditorClubId: manager,
      pct: 25,
      season: 1,
      round: 0,
      fromClubId: manager,
      toClubId: player.clubId,
      fee: 1_000_000,
    };
    const ctx: MarketContext = {
      world: state.world,
      league: state.league,
      finances: state.finances,
      market: { ...emptyMarket(), resale: { clauses: [clause], receipts: [], nextSeq: 2 } },
      managerClubId: manager,
      careerSeed: "revenda-paises",
    };
    const next = takerFor(ctx, player, [manager]);
    const before = totalCash(ctx);
    const done = completeTransfer(ctx, { playerId: player.id, toClubId: next, fee: 4_000_000 });
    if (!done.ok) throw new Error(JSON.stringify(done.error));
    const after = applied(ctx, done.value);
    expect(after.finances.clubs[manager]?.cash).toBe(
      (ctx.finances.clubs[manager]?.cash ?? 0) + 1_000_000,
    );
    expect(totalCash(after)).toBe(before);
  });
});
