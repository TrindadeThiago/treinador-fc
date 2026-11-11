import { describe, expect, it } from "vitest";
import {
  bumpRelation,
  decayRelations,
  recordDeal,
  relationBand,
  relationOf,
} from "../../src/agents/relations";
import { DEFAULT_AGENTS } from "../../src/agents/rules";
import { emptyMarket } from "../../src/market/types";

// 042 T005: relação empresário × clube do técnico (research R4).

const when = { season: 1, round: 3 };
const rules = DEFAULT_AGENTS;

describe("relação com empresários (042 R4)", () => {
  it("neutra sem registro; cada motivo muda pelo valor declarado, entre 0 e 100", () => {
    const market = emptyMarket();
    expect(relationOf(market, "c1", "a1")).toBe(50);
    const signed = bumpRelation(market, "c1", "a1", "signed", rules, when).market;
    expect(relationOf(signed, "c1", "a1")).toBe(55);
    expect(relationOf(signed, "c2", "a1")).toBe(50);
    const cases = [
      ["renewed", 53],
      ["terminated", 35],
      ["demand_refused", 42],
      ["abandoned", 46],
    ] as const;
    for (const [reason, value] of cases) {
      expect(
        relationOf(bumpRelation(market, "c1", "a1", reason, rules, when).market, "c1", "a1"),
      ).toBe(value);
    }
    let high = market;
    for (let i = 0; i < 20; i++)
      high = bumpRelation(high, "c1", "a1", "signed", rules, when).market;
    expect(relationOf(high, "c1", "a1")).toBe(100);
  });

  it("rompimento só ao chegar a 0 vindo de cima", () => {
    let market = emptyMarket();
    let broke = 0;
    for (let i = 0; i < 5; i++) {
      const step = bumpRelation(market, "c1", "a1", "terminated", rules, when);
      market = step.market;
      if (step.broke) broke++;
    }
    expect(relationOf(market, "c1", "a1")).toBe(0);
    expect(broke).toBe(1);
  });

  it("a virada aproxima de 50 sem passar", () => {
    let market = bumpRelation(emptyMarket(), "c1", "a1", "terminated", rules, when).market;
    market = bumpRelation(market, "c1", "a2", "signed", rules, when).market;
    market = bumpRelation(market, "c1", "a3", "demand_refused", rules, when).market;
    const next = decayRelations(market, () => rules, 2);
    expect(relationOf(next, "c1", "a1")).toBe(40);
    expect(relationOf(next, "c1", "a2")).toBe(50);
    expect(relationOf(next, "c1", "a3")).toBe(47);
    expect(next.agents?.relations.c1?.a1).toMatchObject({ reason: "decay", season: 2 });
    expect(decayRelations(emptyMarket(), () => rules, 2)).toEqual(emptyMarket());
  });

  it("faixas em texto", () => {
    expect([0, 1, 24, 25, 44, 45, 55, 56, 79, 80, 100].map(relationBand)).toEqual([
      "broken",
      "bad",
      "bad",
      "cold",
      "cold",
      "neutral",
      "neutral",
      "good",
      "good",
      "great",
      "great",
    ]);
  });

  it("guarda só os últimos 100 negócios", () => {
    let market = emptyMarket();
    for (let i = 0; i < 105; i++) {
      market = recordDeal(market, {
        agentId: "a1",
        clubId: "c1",
        playerId: `p${i}`,
        displayName: "X",
        kind: "buy",
        commission: 1000,
        season: 1,
        round: 1,
      });
    }
    expect(market.agents?.deals).toHaveLength(100);
    expect(market.agents?.deals[0]?.playerId).toBe("p5");
  });
});
