import type { CareerSeasonState } from "../../src/career/season-state";
import type { CompletedBank } from "../../src/model/types";
import { emptyScouting } from "../../src/scouting/state";
import type { ScoutingState } from "../../src/scouting/types";
import { clubOfCountry, worldBank, worldState } from "../career/world-helpers";

export const SEED = "captacao-040";

let cachedWorld: CompletedBank | undefined;

/** Mundo de 3 países com estados no país 0 (metade dos clubes "SP", metade "RJ"). */
export function regionWorld(): CompletedBank {
  if (cachedWorld) return cachedWorld;
  const world = worldBank();
  const home = world.countries[0]?.id;
  let toggle = false;
  cachedWorld = {
    ...world,
    clubs: world.clubs.map((club) => {
      if (club.countryId !== home) return club;
      toggle = !toggle;
      return { ...club, region: toggle ? "SP" : "RJ" };
    }),
  };
  return cachedWorld;
}

/** Estado da carreira com o departamento aberto no nível dado (no clube do técnico). */
export function openState(level = 5, world: CompletedBank = regionWorld()): CareerSeasonState {
  const manager = clubOfCountry(world, 0);
  const state = worldState(world, SEED, manager);
  const scouting: ScoutingState = { ...emptyScouting(), clubId: manager, level };
  return { ...state, scouting };
}

export function managerOf(state: CareerSeasonState): string {
  return state.board?.manager.clubId ?? "";
}

/** Ids de jogadores do mundo, dos livres e das bases (para conferir "nada no mundo"). */
export function worldIds(state: CareerSeasonState): string[] {
  return [
    ...state.world.players.map((player) => player.id),
    ...(state.market?.freeAgents ?? []).map((agent) => agent.player.id),
    ...(state.renewal?.academy?.players ?? []).map((entry) => entry.player.id),
  ].sort();
}
