import { describe, expect, it } from "vitest";
import { maxBidFor } from "../../src/market/club-response";
import { quoteSale, sellNow } from "../../src/market/disposal";
import { completeTransfer } from "../../src/market/effects";
import { answerIncomingOffer, marketAfterRound } from "../../src/market/incoming";
import { DEFAULT_RESALE, feeWithResale } from "../../src/market/resale";
import type { MarketContext } from "../../src/market/types";
import { applied, contractWorld, MANAGER, marketContext, totalCash } from "./helpers";

// 041 US1 (T007): o técnico vende com cláusula de revenda e recebe o valor com desconto.

const ALWAYS = {
  chancePct: 100,
  maxOpen: 3,
  expireRounds: 3,
  minPct: 85,
  maxPct: 110,
  cashBufferMonths: 0,
};

/** Contexto com uma proposta de compra recebida. */
function withBuyOffer(): MarketContext {
  const world = contractWorld((bank) => {
    const competition = bank.competitions[0];
    if (competition) competition.market = { incoming: ALWAYS };
  });
  let ctx = marketContext({ world });
  for (let round = 0; round < 12; round++) {
    ctx = applied(ctx, marketAfterRound(ctx));
    if (ctx.market.incoming.some((offer) => offer.kind === "buy")) return ctx;
  }
  throw new Error("sem proposta de compra");
}

const ownSellable = (ctx: MarketContext) =>
  ctx.world.players
    .filter((player) => player.clubId === MANAGER)
    .sort((a, b) => b.strength - a.strength)[0];

/** Um comprador que tem vaga para o jogador (o da venda imediata). */
function buyerFor(ctx: MarketContext, playerId: string): string {
  const quote = quoteSale(ctx, playerId);
  if (!quote.ok) throw new Error(JSON.stringify(quote.error));
  return quote.value.buyerClubId;
}

describe("vender com cláusula de revenda (041 US1)", () => {
  it("completeTransfer com resale cria a cláusula a favor do vendedor e marca o registro", () => {
    const ctx = marketContext();
    const player = ownSellable(ctx);
    if (!player) throw new Error("sem jogador");
    const buyer = buyerFor(ctx, player.id);
    const done = completeTransfer(ctx, {
      playerId: player.id,
      toClubId: buyer,
      fee: 700_000,
      resale: { pct: 30 },
    });
    if (!done.ok) throw new Error(JSON.stringify(done.error));
    expect(done.value.market.resale?.clauses).toEqual([
      {
        id: "resale-1",
        playerId: player.id,
        displayName: player.displayName,
        creditorClubId: MANAGER,
        pct: 30,
        season: ctx.league.number,
        round: 0,
        fromClubId: MANAGER,
        toClubId: buyer,
        fee: 700_000,
      },
    ]);
    expect(done.value.market.log.at(-1)).toMatchObject({
      kind: "sale",
      resaleCreated: { clubId: MANAGER, pct: 30 },
    });
    expect(totalCash({ finances: done.value.finances })).toBe(totalCash(ctx));
  });

  it("sem cláusula, a transferência fica como era (sem estado nem campos novos)", () => {
    const ctx = marketContext();
    const player = ownSellable(ctx);
    if (!player) throw new Error("sem jogador");
    const done = completeTransfer(ctx, {
      playerId: player.id,
      toClubId: buyerFor(ctx, player.id),
      fee: 1000,
    });
    if (!done.ok) throw new Error(JSON.stringify(done.error));
    expect(done.value.market.resale).toBeUndefined();
    const record = done.value.market.log.at(-1);
    expect(record).not.toHaveProperty("resalePaid");
    expect(record).not.toHaveProperty("resaleCreated");
    expect(done.value.finances.ledger.some((entry) => entry.category === "resale")).toBe(false);
  });

  it("aceitar a proposta com 30% liquida pelo valor com desconto e cria a cláusula", () => {
    const ctx = withBuyOffer();
    const offer = ctx.market.incoming.find((entry) => entry.kind === "buy");
    if (!offer) throw new Error("sem proposta");
    const result = answerIncomingOffer(ctx, offer.id, { kind: "accept", resalePct: 30 });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const net = feeWithResale(offer.fee, 30, DEFAULT_RESALE);
    expect(net).toBeLessThan(offer.fee);
    expect(result.value.update.finances.clubs[MANAGER]?.cash).toBe(
      (ctx.finances.clubs[MANAGER]?.cash ?? 0) + net,
    );
    expect(result.value.update.market.resale?.clauses[0]).toMatchObject({
      playerId: offer.playerId,
      creditorClubId: MANAGER,
      toClubId: offer.fromClubId,
      pct: 30,
      fee: net,
    });
  });

  it("acima do teto da IA ou fora do passo, a proposta não é liquidada", () => {
    const ctx = withBuyOffer();
    const offer = ctx.market.incoming.find((entry) => entry.kind === "buy");
    if (!offer) throw new Error("sem proposta");
    expect(answerIncomingOffer(ctx, offer.id, { kind: "accept", resalePct: 35 })).toMatchObject({
      ok: false,
      error: { code: "market.resale_above_ceiling", params: { max: 30 } },
    });
    expect(answerIncomingOffer(ctx, offer.id, { kind: "accept", resalePct: 7 })).toMatchObject({
      ok: false,
      error: { code: "market.resale_invalid_pct" },
    });
  });

  it("a contraproposta com cláusula é avaliada pelo valor já com o desconto", () => {
    const ctx = withBuyOffer();
    const offer = ctx.market.incoming.find((entry) => entry.kind === "buy");
    const player = ctx.world.players.find((entry) => entry.id === offer?.playerId);
    if (!offer || !player) throw new Error("sem proposta");
    const limit = Math.min(
      maxBidFor(ctx, player, offer.id),
      ctx.finances.clubs[offer.fromClubId]?.cash ?? 0,
    );
    // Pedir acima do limite sem cláusula é recusado; o mesmo pedido com 30% cabe no limite.
    const asked = Math.floor((limit * 1.2) / 1000) * 1000;
    const plain = answerIncomingOffer(ctx, offer.id, { kind: "counter", fee: asked });
    if (!plain.ok) throw new Error("falhou");
    expect(plain.value.response).toBe("refused");
    const withClause = answerIncomingOffer(ctx, offer.id, {
      kind: "counter",
      fee: asked,
      resalePct: 30,
    });
    if (!withClause.ok) throw new Error(JSON.stringify(withClause.error));
    expect(withClause.value.response).toBe("accepted");
    expect(withClause.value.update.finances.clubs[MANAGER]?.cash).toBe(
      (ctx.finances.clubs[MANAGER]?.cash ?? 0) + feeWithResale(asked, 30, DEFAULT_RESALE),
    );
  });

  it("a venda imediata com cláusula mantém o comprador e o valor de referência", () => {
    const ctx = marketContext();
    const player = ownSellable(ctx);
    if (!player) throw new Error("sem jogador");
    const plain = quoteSale(ctx, player.id);
    const quote = quoteSale(ctx, player.id, 20);
    if (!plain.ok || !quote.ok) throw new Error("sem cotação");
    expect(plain.value).toMatchObject({ discount: 0, netFee: plain.value.fee });
    expect(quote.value.buyerClubId).toBe(plain.value.buyerClubId);
    expect(quote.value.fee).toBe(plain.value.fee);
    expect(quote.value.netFee).toBe(feeWithResale(plain.value.fee, 20, DEFAULT_RESALE));
    expect(quote.value.discount).toBe(plain.value.fee - quote.value.netFee);
    expect(quoteSale(ctx, player.id, 40)).toMatchObject({
      ok: false,
      error: { code: "market.resale_above_ceiling" },
    });
    const sold = sellNow(ctx, player.id, 20);
    if (!sold.ok) throw new Error(JSON.stringify(sold.error));
    expect(sold.value.finances.clubs[MANAGER]?.cash).toBe(
      (ctx.finances.clubs[MANAGER]?.cash ?? 0) + quote.value.netFee,
    );
    expect(sold.value.market.resale?.clauses[0]).toMatchObject({
      playerId: player.id,
      creditorClubId: MANAGER,
      toClubId: quote.value.buyerClubId,
      pct: 20,
    });
  });

  it("a contraproposta acima do caixa do comprador continua recusada, com ou sem cláusula", () => {
    const ctx = withBuyOffer();
    const offer = ctx.market.incoming.find((entry) => entry.kind === "buy");
    if (!offer) throw new Error("sem proposta");
    const huge = (ctx.finances.clubs[offer.fromClubId]?.cash ?? 0) * 3 + 10_000_000;
    const result = answerIncomingOffer(ctx, offer.id, {
      kind: "counter",
      fee: huge,
      resalePct: 30,
    });
    if (!result.ok) throw new Error("falhou");
    expect(result.value.response).toBe("refused");
  });
});
