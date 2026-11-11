import { describe, expect, it } from "vitest";
import { agentById, agentOf, agentsOf, portfolioOf } from "../../src/agents/roster";
import { emptyMarket } from "../../src/market/types";
import { nameBankFor } from "../../src/renewal/names";
import { contractWorld, SEED } from "../market/helpers";

// 042 T003: empresários derivados da seed e do banco, sem guardar e sem sorte do jogo.

const world = contractWorld();
const country = world.countries[0]?.id ?? "";

describe("empresários derivados (042 R1)", () => {
  it("8 por país, com ids, nomes do banco do país e atributos de 1 a 5", () => {
    const agents = agentsOf(world, SEED, country);
    expect(agents).toHaveLength(8);
    const names = nameBankFor(world, country);
    agents.forEach((agent, index) => {
      expect(agent.id).toBe(`agent-${country}-${index + 1}`);
      const [first, ...rest] = agent.name.split(" ");
      expect(names.firstNames).toContain(first);
      expect(names.surnames).toContain(rest.join(" "));
      expect(agent.greed).toBeGreaterThanOrEqual(1);
      expect(agent.greed).toBeLessThanOrEqual(5);
      expect(agent.influence).toBeGreaterThanOrEqual(1);
      expect(agent.influence).toBeLessThanOrEqual(5);
    });
    expect(new Set(agents.map((agent) => agent.name)).size).toBe(agents.length);
  });

  it("mesma seed, mesmos empresários; outra seed, outros", () => {
    const again = agentsOf(contractWorld(), SEED, country);
    expect(again).toEqual(agentsOf(world, SEED, country));
    expect(agentsOf(world, "outra", country)).not.toEqual(again);
    expect(agentById(world, SEED, `agent-${country}-3`)).toEqual(again[2]);
  });

  it("cada jogador tem um empresário estável do país de nacionalidade", () => {
    for (const player of world.players) {
      const agent = agentOf(world, SEED, player);
      expect(agent?.countryId).toBe(player.nationalityId);
      expect(agentOf(world, SEED, player)).toBe(agent);
    }
    // Jogando em outro país: o empresário segue a nacionalidade.
    const player = world.players[0];
    if (!player) throw new Error("sem jogador");
    expect(agentOf(world, SEED, { ...player, nationalityId: country })?.countryId).toBe(country);
  });

  it("todo empresário tem jogadores na carteira", () => {
    for (const agent of agentsOf(world, SEED, country)) {
      expect(portfolioOf(world, emptyMarket(), SEED, agent.id).length).toBeGreaterThan(0);
    }
  });

  it("país com perCountry 0 não tem empresários", () => {
    const off = contractWorld((bank) => {
      for (const competition of bank.competitions) {
        competition.market = { ...(competition.market ?? {}), agents: { perCountry: 0 } };
      }
    });
    expect(agentsOf(off, SEED, country)).toEqual([]);
    const player = off.players[0];
    if (!player) throw new Error("sem jogador");
    expect(agentOf(off, SEED, player)).toBeUndefined();
  });

  it("derivar não mexe no mundo", () => {
    const before = JSON.stringify(world);
    for (const player of world.players) agentOf(world, SEED, player);
    expect(JSON.stringify(world)).toBe(before);
  });
});
