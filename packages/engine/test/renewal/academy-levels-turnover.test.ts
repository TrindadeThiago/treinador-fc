import { describe, expect, it } from "vitest";
import { advanceCareerDays } from "../../src/career/day";
import type { CareerSeasonState } from "../../src/career/season-state";
import { DEFAULT_TURNOVER_STEPS, seasonTurnover } from "../../src/career/turnover";
import { seasonFinanceSummary } from "../../src/finance/summary";
import { academyOf, emptyAcademy } from "../../src/renewal/academy";
import {
  academyClub,
  academyMaintenance,
  DEFAULT_ACADEMY_LEVELS,
  levelForReputation,
} from "../../src/renewal/academy-levels";
import type { AcademyClub } from "../../src/renewal/types";
import { MANAGER, newState } from "../career/day-helpers";
import { testWorld } from "../career/helpers";

const SEED = "virada-037";

function ok<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result as Extract<T, { ok: true }>;
}

let cache: CareerSeasonState | undefined;
function finished(): CareerSeasonState {
  cache ??= ok(
    advanceCareerDays(
      newState(testWorld(), SEED, { systems: true }),
      { toEnd: true },
      SEED,
      MANAGER,
    ),
  ).state;
  return cache;
}

function withClubs(
  state: CareerSeasonState,
  clubs: Record<string, AcademyClub>,
): CareerSeasonState {
  if (!state.renewal) throw new Error("sem renovação");
  const academy = state.renewal.academy ?? emptyAcademy();
  return {
    ...state,
    renewal: {
      ...state.renewal,
      academy: { ...academy, clubs: { ...(academy.clubs ?? {}), ...clubs } },
    },
  };
}

function turn(state: CareerSeasonState, managerClubId = MANAGER) {
  return ok(
    seasonTurnover(state.league, state.world, [], {
      careerSeed: SEED,
      finances: state.finances,
      managerClubId,
      ...(state.renewal ? { renewal: state.renewal } : {}),
      ...(state.market ? { market: state.market } : {}),
      ...(state.board ? { board: state.board } : {}),
      ...(state.fans ? { fans: state.fans } : {}),
      ...(state.news ? { news: state.news } : {}),
      competitions: state.competitions,
      calendar: state.calendar,
    }),
  );
}

const reputationOf = (clubId: string) =>
  testWorld().clubs.find((club) => club.id === clubId)?.reputation ?? 0;

describe("níveis na virada (037)", () => {
  it("etapa academy-levels depois de academy-open e antes de regulate-world", () => {
    const ids = DEFAULT_TURNOVER_STEPS.map((step) => step.id);
    expect(ids.indexOf("academy-levels")).toBeGreaterThan(ids.indexOf("academy-open"));
    expect(ids.indexOf("academy-levels")).toBeLessThan(ids.indexOf("regulate-world"));
  });

  it("obra paga: o nível sobe antes da safra, e a safra usa a quantidade do nível novo", () => {
    const state = withClubs(finished(), {
      [MANAGER]: { level: 4, pending: { kind: "upgrade", cost: 1 } },
    });
    const before = academyOf(state.renewal, MANAGER).length;
    const result = turn(state);
    expect(academyClub(result.renewal, result.world, MANAGER)).toEqual({ level: 5 });
    const arrived = result.renewal?.squadNotice?.academyArrived?.length ?? 0;
    expect(arrived).toBe(DEFAULT_ACADEMY_LEVELS[4]?.youthPerIntake);
    expect(academyOf(result.renewal, MANAGER).length).toBeGreaterThanOrEqual(before);
  }, 120000);

  it("redução do técnico tira um nível; a IA anda um degrau rumo à reputação, sem obra", () => {
    const ai = "clube-002";
    const target = levelForReputation(DEFAULT_ACADEMY_LEVELS, reputationOf(ai));
    const far = target >= 3 ? 1 : 5;
    const state = withClubs(finished(), {
      [MANAGER]: { level: 3, pending: { kind: "downgrade" } },
      [ai]: { level: far },
    });
    const result = turn(state);
    expect(academyClub(result.renewal, result.world, MANAGER)).toEqual({ level: 2 });
    expect(academyClub(result.renewal, result.world, ai).level).toBe(far + Math.sign(target - far));
  }, 120000);

  it("clube deixado: a obra paga termina, a redução é cancelada, depois vale a regra da IA", () => {
    const state = withClubs(finished(), {
      [MANAGER]: { level: 2, pending: { kind: "upgrade", cost: 1 } },
    });
    // Sem técnico no clube (outro clube é o do técnico na virada).
    const result = turn(state, "clube-003");
    expect(academyClub(result.renewal, result.world, MANAGER).level).toBe(3);
    const down = withClubs(finished(), { [MANAGER]: { level: 3, pending: { kind: "downgrade" } } });
    const target = levelForReputation(DEFAULT_ACADEMY_LEVELS, reputationOf(MANAGER));
    const after = turn(down, "clube-003");
    expect(academyClub(after.renewal, after.world, MANAGER).level).toBe(3 + Math.sign(target - 3));
  }, 120000);

  it("nível da IA cai e a base passa das vagas: os de menor utilidade saem como livres", () => {
    const ai = "clube-002";
    const state = withClubs(finished(), { [ai]: { level: 5 } });
    const target = levelForReputation(DEFAULT_ACADEMY_LEVELS, reputationOf(ai));
    if (target >= 5) return;
    const result = turn(state);
    const level = academyClub(result.renewal, result.world, ai).level;
    const slots = DEFAULT_ACADEMY_LEVELS[level - 1]?.slots ?? 15;
    expect(academyOf(result.renewal, ai).length).toBeLessThanOrEqual(slots);
  }, 120000);

  it("manutenção: cobrada na temporada na categoria academy, para o técnico e a IA", () => {
    const state = finished();
    const summary = seasonFinanceSummary(state.finances, MANAGER);
    const level = academyClub(state.renewal, state.world, MANAGER).level;
    const expected = 12 * academyMaintenance(state.world, MANAGER, level);
    expect(-summary.totals.academy).toBe(expected);
    expect(-seasonFinanceSummary(state.finances, "clube-002").totals.academy).toBeGreaterThan(0);
  }, 120000);
});
