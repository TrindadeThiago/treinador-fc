import { describe, expect, it } from "vitest";
import { ensureContracts } from "../../src/market/contracts";
import { isRegionalOnly } from "../../src/regional/scope";
import { midSeasonRound } from "../../src/renewal/evolution";
import { withRegionalClubs } from "../../src/renewal/regional";
import { DEFAULT_PROFILE, generateFootballWorld } from "../../src/worldgen/football-world";
import { completeHiddenAttributes } from "../../src/worldgen/hidden";
import { worldState } from "../career/world-helpers";

// A13: os clubes só de estadual não estão em nenhuma divisão da liga principal; a renovação dos
// jogadores (evolução, aposentadoria, jovens, elencos) os recebe numa divisão a mais.
const SEED = "mundo-padrao-1";
const bank = generateFootballWorld(DEFAULT_PROFILE, SEED);
const world = ensureContracts(
  completeHiddenAttributes(bank, SEED),
  Number(bank.manifest.referenceDate.slice(0, 4)),
  SEED,
);
const manager =
  world.clubs.find((club) => club.countryId === "brasil" && club.reputation > 0)?.id ?? "";
const state = worldState(world, SEED, manager);

describe("withRegionalClubs (A13)", () => {
  it("a liga do Brasil ganha uma divisão com os clubes só regionais do país, sem jogos", () => {
    const league = withRegionalClubs(world, state.league);
    expect(league.divisions).toHaveLength(state.league.divisions.length + 1);
    const extra = league.divisions.at(-1);
    const regional = world.clubs
      .filter((club) => club.countryId === "brasil" && isRegionalOnly(world, club.id))
      .map((club) => club.id)
      .sort();
    expect(extra?.clubIds).toEqual(regional);
    expect(extra?.records).toEqual([]);
    expect(extra?.calendar).toEqual([]);
    expect(extra?.stages).toBeUndefined();
    // A rodada do meio da temporada continua a da liga.
    expect(midSeasonRound(league)).toBe(midSeasonRound(state.league));
    // As divisões da liga não mudam.
    expect(league.divisions.slice(0, -1)).toEqual(state.league.divisions);
  });

  it("país sem estadual: a mesma liga", () => {
    const england = state.competitions.find((entry) => entry.competitionId === "liga-eng");
    expect(england).toBeDefined();
    if (!england) return;
    expect(withRegionalClubs(world, england)).toBe(england);
  });
});
