import { describe, expect, it } from "vitest";
import { ageOn, seasonDate } from "../../src/calendar/date";
import { buyAskingPrice } from "../../src/market/club-response";
import { contractYearsRange } from "../../src/market/contracts";
import { QUICK_SALE_PCT, sellNow } from "../../src/market/disposal";
import { completeTransfer } from "../../src/market/effects";
import {
  DEFAULT_RESALE,
  feeWithResale,
  type ResaleRules,
  resaleSteps,
  shareOf,
} from "../../src/market/resale";
import { marketRules } from "../../src/market/rules";
import { canAddPlayer } from "../../src/market/squad";
import type { MarketContext } from "../../src/market/types";
import { marketValue } from "../../src/market/value";
import { forCases } from "../properties/cases";
import { applied, MANAGER, marketContext, totalCash, YEAR } from "./helpers";

// 041 US2 (T011): propriedades por enumeração (sem fast-check), como no A2. A cláusula nunca cria
// dinheiro e nenhum ciclo com cláusula rende mais que o mesmo ciclo sem ela.

const STEPS = resaleSteps(DEFAULT_RESALE);

/** Para cada clube: caixa − caixa do início = soma do livro-caixa dele. */
function ledgerMatches(context: MarketContext): boolean {
  const sums = new Map<string, number>();
  for (const entry of context.finances.ledger) {
    sums.set(entry.clubId, (sums.get(entry.clubId) ?? 0) + entry.amount);
  }
  return Object.values(context.finances.clubs).every(
    (club) => club.cash - club.seasonStartCash === (sums.get(club.clubId) ?? 0),
  );
}

describe("conservação do dinheiro com cláusulas (041 SC-002)", () => {
  it("transferências aleatórias, com e sem cláusula ativa e nova, não criam dinheiro", () => {
    forCases("revenda", 12, (rng, label) => {
      let context = marketContext();
      const start = totalCash(context);
      const clubs = Object.keys(context.finances.clubs).sort();
      let paid = 0;
      for (let step = 0; step < 60; step++) {
        // Metade dos passos mexe em jogadores que já têm cláusula, para cobrir os pagamentos.
        const withClause = context.market.resale?.clauses ?? [];
        const pool =
          withClause.length > 0 && rng.int(0, 1) === 0
            ? context.world.players.filter((player) =>
                withClause.some((clause) => clause.playerId === player.id),
              )
            : context.world.players;
        const player = rng.pick(pool);
        const toClubId = rng.pick(clubs.filter((id) => id !== player.clubId));
        const fee = rng.int(0, 400) * 1000 + (rng.int(0, 3) === 0 ? rng.int(1, 9) * 1000 : 0);
        const resale = rng.int(0, 2) === 0 ? undefined : { pct: rng.pick(STEPS) };
        const result = completeTransfer(context, {
          playerId: player.id,
          toClubId,
          fee,
          ...(resale ? { resale } : {}),
        });
        if (!result.ok) continue;
        if (result.value.market.log.at(-1)?.resalePaid) paid++;
        context = applied(context, result.value);
        expect(totalCash(context), label).toBe(start);
        expect(ledgerMatches(context), label).toBe(true);
        const ids = (context.market.resale?.clauses ?? []).map((clause) => clause.playerId);
        expect(new Set(ids).size, label).toBe(ids.length);
      }
      expect(paid, `${label}: nenhum pagamento exercitado`).toBeGreaterThan(0);
    });
  });

  it("vender e revender entre três clubes mantém a soma dos três", () => {
    const base = marketContext();
    const player = base.world.players
      .filter((entry) => entry.clubId === MANAGER)
      .sort((a, b) => b.strength - a.strength)[0];
    if (!player) throw new Error("sem jogador");
    const sold = sellNow(base, player.id, 30);
    if (!sold.ok) throw new Error(JSON.stringify(sold.error));
    const ctx = applied(base, sold.value);
    const first = ctx.world.players.find((entry) => entry.id === player.id)?.clubId ?? "";
    const second = Object.keys(ctx.finances.clubs)
      .sort()
      .find(
        (id) =>
          id !== first && id !== MANAGER && canAddPlayer(ctx.world, id, player.position, MANAGER),
      ) as string;
    const three = (c: MarketContext) =>
      [MANAGER, first, second].reduce((sum, id) => sum + (c.finances.clubs[id]?.cash ?? 0), 0);
    const before = three(ctx);
    const resold = completeTransfer(ctx, { playerId: player.id, toClubId: second, fee: 900_000 });
    if (!resold.ok) throw new Error(JSON.stringify(resold.error));
    expect(three(applied(ctx, resold.value))).toBe(before);
  });
});

/**
 * Ciclo do A2 com cláusula: comprar pela pedida (com o piso), aceitando a cláusula pedida com
 * desconto, assinar o contrato mais longo e vender pela venda imediata, pagando a fatia ao clube de
 * origem. Devolve a razão recebido/pago com e sem cláusula para cada percentual.
 */
function roundTrips(rules: ResaleRules) {
  const context = marketContext();
  const market = marketRules(context.world, context.league.competitionId);
  const trips: { plain: number; withClause: number }[] = [];
  for (const player of context.world.players) {
    if (player.clubId === MANAGER || !player.contract || player.contract.loan) continue;
    const ask = buyAskingPrice(context, player);
    if (ask <= 0) continue;
    const age = ageOn(player.birthDate, seasonDate(context.world.manifest.referenceDate, YEAR));
    const [, longest] = contractYearsRange(age, market);
    const signed = {
      ...player,
      clubId: MANAGER,
      contract: { wage: player.contract.wage, untilYear: YEAR + longest - 1 },
    };
    const quick =
      Math.round((marketValue(signed, context.world, YEAR) * QUICK_SALE_PCT) / 100 / 1000) * 1000;
    for (const pct of resaleSteps(rules)) {
      const paid = feeWithResale(ask, pct, rules);
      const received = quick - shareOf(quick, pct);
      trips.push({ plain: quick / ask, withClause: paid > 0 ? received / paid : 0 });
    }
  }
  return trips;
}

describe("arbitragem com cláusula (041 SC-003)", () => {
  it("comprar com cláusula e vender na hora nunca rende mais que o ciclo sem cláusula", () => {
    for (const rules of [DEFAULT_RESALE, { ...DEFAULT_RESALE, discountPerPointPct: 0.6 }]) {
      const trips = roundTrips(rules);
      expect(trips.length).toBeGreaterThan(1000);
      for (const trip of trips) expect(trip.withClause).toBeLessThanOrEqual(trip.plain + 1e-12);
      expect(Math.max(...trips.map((trip) => trip.withClause))).toBeLessThanOrEqual(1);
    }
  });

  it("o mesmo vale para taxas pequenas, onde o arredondamento pesa", () => {
    for (let ask = 1000; ask <= 10_000; ask += 1000) {
      for (let quick = 1000; quick <= ask; quick += 1000) {
        for (const pct of STEPS) {
          const paid = feeWithResale(ask, pct, DEFAULT_RESALE);
          const received = quick - shareOf(quick, pct);
          expect(received / paid).toBeLessThanOrEqual(quick / ask + 1e-12);
        }
      }
    }
  });

  it("vender com cláusula e recomprar nunca rende mais que sem cláusula", () => {
    const base = marketContext();
    const players = base.world.players
      .filter((entry) => entry.clubId === MANAGER)
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 5);
    for (const player of players) {
      const cycle = (pct?: number) => {
        const sold = sellNow(base, player.id, pct);
        if (!sold.ok) return undefined;
        const ctx = applied(base, sold.value);
        const moved = ctx.world.players.find((entry) => entry.id === player.id);
        if (!moved) return undefined;
        const received =
          (ctx.finances.clubs[MANAGER]?.cash ?? 0) - (base.finances.clubs[MANAGER]?.cash ?? 0);
        const ask = buyAskingPrice(ctx, moved);
        const back = completeTransfer(ctx, { playerId: player.id, toClubId: MANAGER, fee: ask });
        if (!back.ok) return undefined;
        const after = applied(ctx, back.value);
        expect(after.finances.ledger.some((entry) => entry.category === "resale")).toBe(false);
        expect(after.market.resale?.clauses ?? []).toEqual([]);
        return received - ask;
      };
      const plain = cycle();
      if (plain === undefined) continue;
      for (const pct of STEPS.filter((step) => step <= DEFAULT_RESALE.aiMaxPct)) {
        const net = cycle(pct);
        if (net !== undefined) expect(net).toBeLessThanOrEqual(plain);
      }
    }
  });
});
