import { describe, expect, it } from "vitest";
import { agentsViewOf } from "../../src/agents";
import { bumpRelation, recordDeal } from "../../src/agents/relations";
import { agentOf } from "../../src/agents/roster";
import { DEFAULT_AGENTS } from "../../src/agents/rules";
import { emptyMarket } from "../../src/market/types";
import { contractWorld, MANAGER, SEED } from "../market/helpers";

// 042 T014: os empresários com quem o clube negociou, para a aba do Mercado.

const world = contractWorld();
const when = { season: 1, round: 2 };

describe("lista de empresários (042 US2)", () => {
  it("só quem tem relação ou negócio com o clube, da melhor relação para a pior", () => {
    const [p1, p2, p3] = world.players.filter((player, index, all) => {
      const id = agentOf(world, SEED, player)?.id;
      return all.findIndex((other) => agentOf(world, SEED, other)?.id === id) === index;
    });
    if (!p1 || !p2 || !p3) throw new Error("sem jogadores de empresários diferentes");
    const a1 = agentOf(world, SEED, p1)?.id ?? "";
    const a2 = agentOf(world, SEED, p2)?.id ?? "";
    const a3 = agentOf(world, SEED, p3)?.id ?? "";
    let market = bumpRelation(
      emptyMarket(),
      MANAGER,
      a1,
      "terminated",
      DEFAULT_AGENTS,
      when,
    ).market;
    market = bumpRelation(market, MANAGER, a2, "signed", DEFAULT_AGENTS, when).market;
    market = bumpRelation(market, "clube-002", a3, "signed", DEFAULT_AGENTS, when).market;
    market = recordDeal(market, {
      agentId: a2,
      clubId: MANAGER,
      playerId: p2.id,
      displayName: p2.displayName,
      kind: "buy",
      commission: 50_000,
      ...when,
    });
    const rows = agentsViewOf(market, world, SEED, MANAGER);
    expect(rows.map((row) => row.agent.id)).toEqual([a2, a1]);
    expect(rows[0]).toMatchObject({
      relation: 55,
      band: "neutral",
      lastDeal: { commission: 50_000 },
    });
    expect(rows[1]).toMatchObject({ relation: 35, band: "cold" });
    expect(rows[0]?.portfolio).toBeGreaterThan(0);
    expect(agentsViewOf(emptyMarket(), world, SEED, MANAGER)).toEqual([]);
  });
});
