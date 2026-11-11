import type { MarketState } from "../market/types";
import type { CompletedBank, CompletedPlayer } from "../model/types";
import { nameBankFor } from "../renewal/names";
import { cyrb128 } from "../rng/hash";
import { createRng } from "../rng/xoshiro";
import { agentRules } from "./rules";

/** Empresário fictício de um país (042, R1): derivado da seed e do banco, nunca guardado. */
export interface Agent {
  id: string;
  countryId: string;
  name: string;
  /** Ganância, de 1 a 5: pesa na comissão de referência. */
  greed: number;
  /** Influência, de 1 a 5: quanto da falta de interesse a comissão cobre. */
  influence: number;
}

const cache = new WeakMap<object, Map<string, Agent[]>>();

/**
 * Empresários do país, sempre os mesmos para o mesmo banco e a mesma seed. Usam sementes próprias
 * (`<seed>:agent:<país>:<n>`), sem tocar na sorte do jogo.
 */
export function agentsOf(
  world: Pick<CompletedBank, "competitions" | "countries">,
  careerSeed: string,
  countryId: string,
): Agent[] {
  let byKey = cache.get(world);
  if (!byKey) {
    byKey = new Map();
    cache.set(world, byKey);
  }
  const key = `${careerSeed}|${countryId}`;
  const cached = byKey.get(key);
  if (cached) return cached;
  const count = agentRules(world, countryId).perCountry;
  const names = nameBankFor(world as CompletedBank, countryId);
  const agents: Agent[] = [];
  const used = new Set<string>();
  for (let n = 1; n <= count; n++) {
    const rng = createRng(`${careerSeed}:agent:${countryId}:${n}`);
    let name = "";
    for (let attempt = 0; attempt < 20; attempt++) {
      name = `${rng.pick(names.firstNames)} ${rng.pick(names.surnames)}`;
      if (!used.has(name)) break;
    }
    used.add(name);
    agents.push({
      id: `agent-${countryId}-${n}`,
      countryId,
      name,
      greed: rng.int(1, 5),
      influence: rng.int(1, 5),
    });
  }
  byKey.set(key, agents);
  return agents;
}

/** O empresário do jogador: um do país de nacionalidade, por hash do id (estável). */
export function agentOf(
  world: Pick<CompletedBank, "competitions" | "countries">,
  careerSeed: string,
  player: Pick<CompletedPlayer, "id" | "nationalityId">,
): Agent | undefined {
  const agents = agentsOf(world, careerSeed, player.nationalityId);
  if (agents.length === 0) return undefined;
  const [hash] = cyrb128(`${careerSeed}:agent-of:${player.id}`);
  return agents[(hash >>> 0) % agents.length];
}

/** Empresário pelo id (`agent-<país>-<n>`). */
export function agentById(
  world: Pick<CompletedBank, "competitions" | "countries">,
  careerSeed: string,
  agentId: string,
): Agent | undefined {
  const match = /^agent-(.+)-(\d+)$/.exec(agentId);
  if (!match?.[1]) return undefined;
  return agentsOf(world, careerSeed, match[1]).find((agent) => agent.id === agentId);
}

/** Jogadores da carteira: os do mundo (com o clube) e os livres. */
export function portfolioOf(
  world: CompletedBank,
  market: Pick<MarketState, "freeAgents">,
  careerSeed: string,
  agentId: string,
): { playerId: string; clubId?: string }[] {
  const country = /^agent-(.+)-\d+$/.exec(agentId)?.[1];
  if (!country) return [];
  const mine = (player: Pick<CompletedPlayer, "id" | "nationalityId">) =>
    player.nationalityId === country && agentOf(world, careerSeed, player)?.id === agentId;
  return [
    ...world.players.filter(mine).map((player) => ({ playerId: player.id, clubId: player.clubId })),
    ...market.freeAgents
      .filter((agent) => mine(agent.player))
      .map((agent) => ({
        playerId: agent.player.id,
      })),
  ];
}
