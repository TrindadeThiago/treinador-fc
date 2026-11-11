import { describe, expect, it } from "vitest";
import type { CareerSeasonState } from "../../src/career/season-state";
import { referenceMonthlyPayroll } from "../../src/renewal/academy-levels";
import {
  availableRegions,
  DEFAULT_RECRUITMENT,
  generateOffers,
  recruitmentAfterRound,
  recruitmentAtSeasonStart,
  recruitmentRules,
  registrationCost,
  setScoutingRegion,
} from "../../src/scouting/recruitment";
import type { ScoutingRegion, ScoutingState } from "../../src/scouting/types";
import { managerOf, openState, regionWorld, SEED, worldIds } from "./recruitment-helpers";

// 040 US1 e fundação: regiões, custo, região pendente e indicações fora do mundo.

function ok<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result as Extract<T, { ok: true }>;
}

const home = () => regionWorld().countries[0]?.id ?? "";
const abroad = () => regionWorld().countries[1]?.id ?? "";

function offersFor(state: CareerSeasonState, region: ScoutingRegion, round = 4): ScoutingState {
  return generateOffers(
    { ...(state.scouting as ScoutingState), region },
    {
      world: state.world,
      renewal: state.renewal as NonNullable<CareerSeasonState["renewal"]>,
      careerSeed: SEED,
      managerClubId: managerOf(state),
      season: state.league.number,
      round,
      expiresRound: round + 3,
      year: state.league.year,
    },
  );
}

describe("regiões e custo (040 R5)", () => {
  it("estados do país, o país e os outros países; custo estado < país < exterior", () => {
    const state = openState();
    const manager = managerOf(state);
    const regions = availableRegions(state.world, manager);
    expect(regions.filter((region) => region.kind === "state")).toHaveLength(2);
    expect(regions).toContainEqual({ kind: "country", countryId: home() });
    expect(regions).toContainEqual({ kind: "country", countryId: abroad() });
    const state1 = registrationCost(state.world, manager, {
      kind: "state",
      countryId: home(),
      region: "SP",
    });
    const country = registrationCost(state.world, manager, { kind: "country", countryId: home() });
    const outside = registrationCost(state.world, manager, {
      kind: "country",
      countryId: abroad(),
    });
    expect(state1).toBeLessThan(country);
    expect(country).toBeLessThan(outside);
    expect(country).toBe(
      Math.round((referenceMonthlyPayroll(state.world, manager) * 20) / 100 / 1000) * 1000,
    );
    expect(recruitmentRules(state.world, manager)).toEqual(DEFAULT_RECRUITMENT);
  });
});

describe("região pendente (040 FR-001)", () => {
  it("fechado recusa; região inexistente recusa; a escolha vale na rodada seguinte", () => {
    const closed = { ...openState(), scouting: { level: 0, watch: [], reports: {} } };
    expect(setScoutingRegion(closed, { kind: "country", countryId: home() })).toEqual({
      ok: false,
      error: "scouting.closed",
    });
    const state = openState();
    expect(setScoutingRegion(state, { kind: "state", countryId: home(), region: "XX" })).toEqual({
      ok: false,
      error: "scouting.invalid_region",
    });
    const chosen = ok(setScoutingRegion(state, { kind: "country", countryId: abroad() })).state;
    expect(chosen.scouting?.region).toBeUndefined();
    expect(chosen.scouting?.pendingRegion).toEqual({ kind: "country", countryId: abroad() });
    const after = recruitmentAfterRound(chosen.scouting as ScoutingState, {
      world: state.world,
      renewal: state.renewal as NonNullable<CareerSeasonState["renewal"]>,
      careerSeed: SEED,
      managerClubId: managerOf(state),
      season: state.league.number,
      year: state.league.year,
      played: 1,
      marketRules: {} as never,
      windows: [{ fromRound: 0, toRound: 3 }],
    });
    expect(after.region).toEqual({ kind: "country", countryId: abroad() });
    expect(after.pendingRegion).toBeUndefined();
  });
});

describe("indicações (040 FR-002 a FR-004)", () => {
  it("idade, nacionalidade, faixa, prazo e custo; nada entra no mundo nem na numeração", () => {
    const state = openState(5);
    const before = worldIds(state);
    const seq = state.renewal?.nextPlayerSeq;
    const region: ScoutingRegion = { kind: "country", countryId: abroad() };
    const scouting = offersFor(state, region);
    const offers = scouting.offers ?? [];
    expect(offers).toHaveLength(DEFAULT_RECRUITMENT.offersPerWindow.country[4] ?? 0);
    for (const offer of offers) {
      expect(offer.id.startsWith("scout-offer-")).toBe(true);
      expect(offer.player.id).toBe(offer.id);
      expect(offer.player.nationalityId).toBe(abroad());
      expect(offer.estimate.low).toBeLessThanOrEqual(offer.player.hidden.potential);
      expect(offer.estimate.high).toBeGreaterThanOrEqual(offer.player.hidden.potential);
      expect(offer.expiresRound).toBe(7);
      expect(offer.cost).toBe(registrationCost(state.world, managerOf(state), region));
      // Graus já na indicação nos níveis 4 e 5.
      expect(offer.temperament).toBeDefined();
    }
    expect(worldIds({ ...state, scouting })).toEqual(before);
    expect(state.renewal?.nextPlayerSeq).toBe(seq);
    // Mesma chave, mesmas indicações; nível 1 sem graus.
    expect(offersFor(state, region).offers).toEqual(offers);
    const low = offersFor(openState(1), region);
    expect((low.offers ?? []).every((offer) => offer.temperament === undefined)).toBe(true);
  });

  it("início da temporada: aplica a pendência, descarta as antigas e abre a janela 0", () => {
    const state = openState(3);
    const old = offersFor(state, { kind: "country", countryId: home() });
    const pending: ScoutingState = {
      ...old,
      pendingRegion: { kind: "country", countryId: abroad() },
    };
    const started = recruitmentAtSeasonStart(pending, {
      world: state.world,
      renewal: state.renewal as NonNullable<CareerSeasonState["renewal"]>,
      careerSeed: SEED,
      managerClubId: managerOf(state),
      season: state.league.number + 1,
      year: state.league.year + 1,
      marketRules: {} as never,
      windows: [{ fromRound: 0, toRound: 3 }],
    });
    expect(started.region).toEqual({ kind: "country", countryId: abroad() });
    expect((started.offers ?? []).every((offer) => offer.season === state.league.number + 1)).toBe(
      true,
    );
    expect((started.offers ?? []).every((offer) => offer.player.nationalityId === abroad())).toBe(
      true,
    );
  });
});
