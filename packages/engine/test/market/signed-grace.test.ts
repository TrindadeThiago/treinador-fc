import { describe, expect, it } from "vitest";
import { incomingOfferFor, signedThisSeason } from "../../src/market/ai/offers";
import type { MarketContext, TransferRecord } from "../../src/market/types";
import { createRng } from "../../src/rng/xoshiro";
import { contractWorld, MANAGER, marketContext } from "./helpers";

// A2b: comprar barato de um clube de reputação baixa e esperar uma proposta rendia até 60% (a
// pedida vem do valor no clube vendedor; a proposta, do valor no clube do usuário e da
// contraproposta). Carência: quem o usuário contratou na temporada não recebe proposta da IA.
const ALWAYS = {
  chancePct: 100,
  maxOpen: 3,
  expireRounds: 3,
  minPct: 85,
  maxPct: 110,
  cashBufferMonths: 0,
};

function context(): MarketContext {
  return marketContext({
    world: contractWorld((world) => {
      const competition = world.competitions[0];
      if (competition) competition.market = { incoming: ALWAYS };
    }),
  });
}

/** Um jogador do usuário que recebe proposta quando é o único disponível. */
function offeredPlayer(ctx: MarketContext): { playerId: string; blocked: Set<string> } {
  const own = ctx.world.players.filter((player) => player.clubId === MANAGER);
  for (const candidate of own) {
    const blocked = new Set(own.filter((player) => player.id !== candidate.id).map((p) => p.id));
    if (incomingOfferFor(ctx, createRng("carencia"), blocked)) {
      return { playerId: candidate.id, blocked };
    }
  }
  throw new Error("nenhum jogador do usuário recebe proposta no mundo de teste");
}

function signing(ctx: MarketContext, playerId: string, kind: "buy" | "free", season: number) {
  const entry: TransferRecord = {
    season,
    round: 0,
    playerId,
    displayName: playerId,
    kind,
    toClubId: MANAGER,
    fee: kind === "buy" ? 1_000_000 : 0,
  };
  return { ...ctx, market: { ...ctx.market, log: [...ctx.market.log, entry] } };
}

describe("carência de propostas para quem o usuário contratou (A2b)", () => {
  const base = context();
  const { playerId, blocked } = offeredPlayer(base);

  it("comprado ou contratado livre na temporada: nenhuma proposta da IA", () => {
    for (const kind of ["buy", "free"] as const) {
      const ctx = signing(base, playerId, kind, base.league.number);
      expect(signedThisSeason(ctx).has(playerId)).toBe(true);
      expect(incomingOfferFor(ctx, createRng("carencia"), blocked)).toBeUndefined();
    }
  });

  it("contratado numa temporada anterior: volta a receber propostas", () => {
    const ctx = signing(base, playerId, "buy", base.league.number - 1);
    expect(signedThisSeason(ctx).has(playerId)).toBe(false);
    expect(incomingOfferFor(ctx, createRng("carencia"), blocked)?.playerId).toBe(playerId);
  });

  it("negociação expirada ou recusada não conta como contratação", () => {
    const expired = signing(base, playerId, "buy", base.league.number);
    const entry = expired.market.log.at(-1) as TransferRecord;
    const ctx = {
      ...expired,
      market: {
        ...expired.market,
        log: [...expired.market.log.slice(0, -1), { ...entry, outcome: "expired" as const }],
      },
    };
    expect(signedThisSeason(ctx).has(playerId)).toBe(false);
  });
});
