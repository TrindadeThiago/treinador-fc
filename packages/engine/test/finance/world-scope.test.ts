import { describe, expect, it } from "vitest";
import { advanceCareerDays } from "../../src/career/day";
import type { CareerSeasonState } from "../../src/career/season-state";
import { aiRoundReview } from "../../src/finance/ai";
import { annualWageBill } from "../../src/finance/create";
import { applyRoundFinances } from "../../src/finance/round";
import { DEFAULT_REGIONAL_WAGE_FACTOR_PCT } from "../../src/finance/rules";
import { financeClubIds } from "../../src/finance/scope";
import type { FinanceState } from "../../src/finance/types";
import { ensureContracts } from "../../src/market/contracts";
import { isRegionalOnly } from "../../src/regional/scope";
import { isCountryMain } from "../../src/world/countries";
import { DEFAULT_PROFILE, generateFootballWorld } from "../../src/worldgen/football-world";
import { completeHiddenAttributes } from "../../src/worldgen/hidden";
import { worldState } from "../career/world-helpers";

// Mundo padrão (024): cada liga principal fecha a sua rodada, e as finanças guardam os clubes de
// todos os países. Juros, obras, crise e decisões da IA andam só para os clubes do país da liga;
// antes andavam uma vez por liga do mundo a cada rodada (15 cobranças de juros por rodada).
const SEED = "mundo-padrao-1";

function setup(): { state: CareerSeasonState; manager: string } {
  const bank = generateFootballWorld(DEFAULT_PROFILE, SEED);
  const world = ensureContracts(
    completeHiddenAttributes(bank, SEED),
    Number(bank.manifest.referenceDate.slice(0, 4)),
    SEED,
  );
  const manager =
    world.clubs.find((club) => club.countryId === "brasil" && club.reputation > 0)?.id ?? "";
  return { state: worldState(world, SEED, manager), manager };
}

/** Todos os clubes endividados e com obra em andamento, para que juros e obras apareçam. */
function indebted(finances: FinanceState): FinanceState {
  return {
    ...finances,
    clubs: Object.fromEntries(
      Object.entries(finances.clubs).map(([id, club]) => [
        id,
        { ...club, debt: 1_000_000, works: { seats: 1000, cost: 0, remainingRounds: 99 } },
      ]),
    ),
  };
}

const { state, manager } = setup();
const countryOf = new Map(state.world.clubs.map((club) => [club.id, club.countryId]));
const brazil = state.league;
const england = state.competitions.find((league) => league.competitionId === "liga-eng");

describe("finanças por liga no mundo padrão", () => {
  it("o recorte é o país da liga, com os clubes só regionais do Brasil", () => {
    const ids = financeClubIds(state.finances, state.world, brazil);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => countryOf.get(id) === "brasil")).toBe(true);
    expect(ids.some((id) => isRegionalOnly(state.world, id))).toBe(true);
    const all = Object.keys(state.finances.clubs).filter((id) => countryOf.get(id) === "brasil");
    expect(ids).toEqual(all.sort());
  });

  it("a rodada de uma liga não cobra juros nem avança obras dos clubes de outros países", () => {
    expect(england).toBeDefined();
    if (!england) return;
    const before = indebted(state.finances);
    const after = applyRoundFinances(before, england, state.world, 1, manager);
    const english = financeClubIds(before, state.world, england);
    const charged = new Set(
      after.ledger.filter((entry) => entry.category === "interest").map((entry) => entry.clubId),
    );
    expect([...charged].sort()).toEqual(english);
    for (const [id, club] of Object.entries(after.clubs)) {
      const expected = countryOf.get(id) === "inglaterra" ? 98 : 99;
      expect(club.works?.remainingRounds, id).toBe(expected);
    }
  });

  it("a IA de outra liga não mexe nas finanças dos clubes de fora dela", () => {
    if (!england) return;
    const before = indebted(state.finances);
    const after = aiRoundReview(before, england, state.world, 4, manager);
    for (const [id, club] of Object.entries(after.clubs)) {
      if (countryOf.get(id) === "inglaterra") continue;
      expect(club, id).toEqual(before.clubs[id]);
    }
  });

  it("dias de jogos: no máximo uma cobrança de juros por clube e rodada", () => {
    // Os estaduais abrem a temporada: joga até as primeiras rodadas das ligas principais.
    const first = state.calendar.days.findIndex((day) =>
      day.slots.some((slot) => isCountryMain(state.world, slot.competitionId)),
    );
    expect(first).toBeGreaterThanOrEqual(0);
    const start = { ...state, finances: indebted(state.finances) };
    const played = advanceCareerDays(start, { days: first + 2 }, SEED, manager);
    expect(played.ok).toBe(true);
    if (!played.ok) return;
    const perRound = new Map<string, number>();
    for (const entry of played.state.finances.ledger) {
      if (entry.category !== "interest") continue;
      const key = `${entry.clubId}:${entry.season}:${entry.round}`;
      perRound.set(key, (perRound.get(key) ?? 0) + 1);
    }
    expect(perRound.size).toBeGreaterThan(0);
    expect([...perRound].filter(([, count]) => count > 1)).toEqual([]);
  }, 60_000);
});

describe("folha dos clubes só regionais (023, A12)", () => {
  const regional = state.world.clubs.find((club) => isRegionalOnly(state.world, club.id));

  it("pagam a folha nas rodadas da liga do país, com o fator do estadual", () => {
    expect(regional).toBeDefined();
    if (!regional) return;
    const after = applyRoundFinances(state.finances, brazil, state.world, 1, manager);
    const wages = after.ledger.filter(
      (entry) => entry.clubId === regional.id && entry.category === "wages",
    );
    expect(wages).toHaveLength(1);
    expect(wages[0]?.amount).toBeLessThan(0);
  });

  it("estadual sem economia (saves e mods antigos) usa o fator padrão de clube pequeno", () => {
    if (!regional) return;
    const date = state.world.manifest.referenceDate;
    const withEconomy = annualWageBill(state.world, regional.id, date);
    const legacy = {
      ...state.world,
      competitions: state.world.competitions.map((competition) =>
        competition.regional ? { ...competition, economy: undefined } : competition,
      ),
    } as typeof state.world;
    expect(DEFAULT_REGIONAL_WAGE_FACTOR_PCT).toBe(36);
    expect(annualWageBill(legacy, regional.id, date)).toBe(withEconomy);
  });
});
