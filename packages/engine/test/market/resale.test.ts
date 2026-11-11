import { describe, expect, it } from "vitest";
import { ageOn, seasonDate } from "../../src/calendar/date";
import {
  activeClause,
  aiAsksResale,
  clubResaleView,
  DEFAULT_RESALE,
  feeWithResale,
  isValidResalePct,
  pruneResale,
  resaleRules,
  resaleShare,
  resaleSteps,
  shareOf,
} from "../../src/market/resale";
import type { MarketState, ResaleClause, ResaleReceipt } from "../../src/market/types";
import { emptyMarket } from "../../src/market/types";
import { marketSchema } from "../../src/model/schemas";
import { contractWorld, MANAGER, marketContext, YEAR } from "./helpers";

function clause(partial: Partial<ResaleClause> & { playerId: string }): ResaleClause {
  return {
    id: `resale-${partial.playerId}`,
    displayName: partial.playerId,
    creditorClubId: MANAGER,
    pct: 30,
    season: 1,
    round: 0,
    fromClubId: MANAGER,
    toClubId: "clube-002",
    fee: 1_000_000,
    ...partial,
  };
}

function withClauses(clauses: ResaleClause[], receipts: ResaleReceipt[] = []): MarketState {
  return { ...emptyMarket(), resale: { clauses, receipts, nextSeq: clauses.length + 1 } };
}

describe("regras da cláusula de revenda (041)", () => {
  it("faixa padrão de 5% a 50% em passos de 5%", () => {
    expect(resaleSteps(DEFAULT_RESALE)).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
    expect(isValidResalePct(DEFAULT_RESALE, 30)).toBe(true);
    for (const pct of [0, 7, 55, 2.5]) expect(isValidResalePct(DEFAULT_RESALE, pct)).toBe(false);
  });

  it("o desconto arredonda para cima ao milhar e nunca fica abaixo da conta exata", () => {
    expect(feeWithResale(1_000_000, 30, DEFAULT_RESALE)).toBe(700_000);
    expect(feeWithResale(3_000, 30, DEFAULT_RESALE)).toBe(3_000);
    expect(feeWithResale(0, 30, DEFAULT_RESALE)).toBe(0);
    const rules = { ...DEFAULT_RESALE, discountPerPointPct: 0.8 };
    for (const fee of [1_000, 7_000, 123_000, 2_345_000]) {
      for (const pct of resaleSteps(rules)) {
        const exact = (fee * (100 - pct * rules.discountPerPointPct)) / 100;
        const value = feeWithResale(fee, pct, rules);
        expect(value % 1000).toBe(0);
        expect(value).toBeGreaterThanOrEqual(exact - 1e-6);
        expect(value).toBeLessThanOrEqual(fee);
      }
    }
  });

  it("a fatia arredonda para cima ao milhar e nunca passa da venda", () => {
    expect(shareOf(1_000_000, 30)).toBe(300_000);
    expect(shareOf(1_000, 5)).toBe(1_000);
    expect(shareOf(0, 30)).toBe(0);
    expect(shareOf(2_001_000, 30)).toBe(601_000);
  });

  it("cláusula ativa e fatia: 0 sem cláusula ou com o credor comprando", () => {
    const market = withClauses([clause({ playerId: "j1" })]);
    expect(activeClause(market, "j1")?.pct).toBe(30);
    expect(activeClause(market, "j2")).toBeUndefined();
    expect(resaleShare(market, "j2", "clube-003", 1_000_000)).toBe(0);
    expect(resaleShare(market, "j1", MANAGER, 1_000_000)).toBe(0);
    expect(resaleShare(market, "j1", "clube-003", 1_000_000)).toBe(300_000);
    expect(resaleShare(emptyMarket(), "j1", "clube-003", 1_000_000)).toBe(0);
  });

  it("a IA pede cláusula até 21 anos na data da temporada, sem sorte", () => {
    const context = marketContext();
    const date = seasonDate(context.world.manifest.referenceDate, YEAR);
    const young = context.world.players.find((player) => ageOn(player.birthDate, date) === 21);
    const older = context.world.players.find((player) => ageOn(player.birthDate, date) === 22);
    if (!young || !older) throw new Error("sem jogadores de 21 e 22 anos");
    expect(aiAsksResale(context, young)).toEqual({ pct: 20 });
    expect(aiAsksResale(context, older)).toBeUndefined();
  });

  it("resaleRules usa o mod quando presente", () => {
    const world = contractWorld((bank) => {
      for (const competition of bank.competitions) {
        competition.market = { ...(competition.market ?? {}), resale: { aiAskPct: 10 } };
      }
    });
    const competitionId = world.competitions[0]?.id ?? "";
    expect(resaleRules(world, competitionId)).toEqual({ ...DEFAULT_RESALE, aiAskPct: 10 });
  });

  it("o schema recusa desconto acima de 1 por ponto e faixa inválida, com o campo", () => {
    const paths = (resale: unknown) =>
      (marketSchema.safeParse({ resale }).error?.issues ?? []).map((issue) => issue.path.join("."));
    expect(marketSchema.safeParse({ resale: {} }).success).toBe(true);
    expect(marketSchema.safeParse({ resale: DEFAULT_RESALE }).success).toBe(true);
    expect(paths({ discountPerPointPct: 1.5 })).toContain("resale.discountPerPointPct");
    expect(paths({ maxPct: 95 })).toContain("resale.maxPct");
    expect(paths({ stepPct: 7 })).toContain("resale.stepPct");
    expect(paths({ aiMaxPct: 33 })).toContain("resale.aiMaxPct");
    expect(paths({ aiAskMaxAge: 12 })).toContain("resale.aiAskMaxAge");
  });
});

describe("visão do clube e limpeza das cláusulas", () => {
  it("clubResaleView separa a receber, a pagar e o histórico do clube", () => {
    const world = contractWorld();
    const own = world.players.find((player) => player.clubId === MANAGER);
    const other = world.players.find((player) => player.clubId === "clube-002");
    if (!own || !other) throw new Error("sem jogadores");
    const receipt = (outcome: ResaleReceipt["outcome"], amount: number, creditor = MANAGER) => ({
      clauseId: `c-${outcome}-${amount}`,
      playerId: "x",
      displayName: "X",
      creditorClubId: creditor,
      pct: 20,
      outcome,
      saleFee: amount * 5,
      amount,
      season: 1,
      round: 3,
    });
    const market = withClauses(
      [
        clause({ playerId: other.id }),
        clause({ playerId: own.id, creditorClubId: "clube-003", id: "resale-b" }),
      ],
      [receipt("paid", 100_000), receipt("bought_back", 0), receipt("paid", 50_000, "clube-009")],
    );
    const view = clubResaleView(market, world, MANAGER);
    expect(view.receivable.map((entry) => entry.playerId)).toEqual([other.id]);
    expect(view.payable.map((entry) => entry.playerId)).toEqual([own.id]);
    expect(view.receipts.map((entry) => entry.outcome)).toEqual(["bought_back", "paid"]);
    expect(view.totalReceived).toBe(100_000);
    expect(clubResaleView(emptyMarket(), world, MANAGER).totalReceived).toBe(0);
  });

  it("pruneResale encerra a cláusula de quem saiu do mundo e mantém a de um livre", () => {
    const world = contractWorld();
    const alive = world.players[0];
    if (!alive) throw new Error("sem jogador");
    const free = { ...alive, id: "livre-1" };
    const market: MarketState = {
      ...withClauses([
        clause({ playerId: alive.id }),
        clause({ playerId: "livre-1", id: "resale-livre" }),
        clause({ playerId: "aposentado", id: "resale-apos", displayName: "Velho" }),
      ]),
      freeAgents: [{ player: free, lastClubId: "clube-002", sinceYear: YEAR }],
    };
    const next = pruneResale(market, world, 4);
    expect(next.resale?.clauses.map((entry) => entry.playerId)).toEqual([alive.id, "livre-1"]);
    expect(next.resale?.receipts).toEqual([
      expect.objectContaining({
        playerId: "aposentado",
        displayName: "Velho",
        outcome: "retired",
        amount: 0,
        season: 4,
      }),
    ]);
    expect(pruneResale(emptyMarket(), world, 4)).toEqual(emptyMarket());
  });
});
