import { describe, expect, it } from "vitest";
import { ageOn, seasonDate } from "../../src/calendar/date";
import type { CareerSeasonState } from "../../src/career/season-state";
import { emptyAcademy } from "../../src/renewal/academy";
import {
  academyClub,
  academyLimit,
  academyMaintenance,
  academyRules,
  academyUpgradeCost,
  cancelAcademyChange,
  DEFAULT_ACADEMY_LEVELS,
  divisionAcademies,
  downgradeAcademy,
  levelForReputation,
  referenceMonthlyPayroll,
  seedAcademies,
  upgradeAcademy,
} from "../../src/renewal/academy-levels";
import { initialRenewal } from "../../src/renewal/measure";
import { validateBank } from "../../src/validation/validate";
import { MANAGER, newState } from "../career/day-helpers";
import { editedWorld, testWorld } from "../career/helpers";

const SEED = "academia-037";

function state(cash?: number): CareerSeasonState {
  const start = newState(testWorld(), SEED, { systems: true });
  if (cash === undefined) return start;
  const club = start.finances.clubs[MANAGER];
  if (!club) throw new Error("sem finanças");
  return {
    ...start,
    finances: {
      ...start.finances,
      clubs: { ...start.finances.clubs, [MANAGER]: { ...club, cash } },
    },
  };
}

function atLevel(start: CareerSeasonState, level: number): CareerSeasonState {
  if (!start.renewal) throw new Error("sem renovação");
  const academy = start.renewal.academy ?? emptyAcademy();
  return {
    ...start,
    renewal: { ...start.renewal, academy: { ...academy, clubs: { [MANAGER]: { level } } } },
  };
}

function ok<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result as Extract<T, { ok: true }>;
}

describe("regras e níveis da academia (037)", () => {
  it("padrão sem mod e níveis pela reputação", () => {
    const rules = academyRules(testWorld(), MANAGER);
    expect(rules).toEqual(DEFAULT_ACADEMY_LEVELS);
    expect(
      [0, 29, 30, 44, 45, 64, 65, 79, 80, 100].map((rep) => levelForReputation(rules, rep)),
    ).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it("vagas 15, 15, 15, 20 e 25; sem registro, o nível da reputação", () => {
    const world = testWorld();
    const renewal = initialRenewal(world);
    const slots = [1, 2, 3, 4, 5].map((level) =>
      academyLimit(
        { ...renewal, academy: { ...emptyAcademy(), clubs: { [MANAGER]: { level } } } },
        world,
        MANAGER,
      ),
    );
    expect(slots).toEqual([15, 15, 15, 20, 25]);
    const reputation = world.clubs.find((club) => club.id === MANAGER)?.reputation ?? 0;
    expect(academyClub(undefined, world, MANAGER).level).toBe(
      levelForReputation(DEFAULT_ACADEMY_LEVELS, reputation),
    );
    // A renovação inicial já traz a academia de todos os clubes.
    expect(Object.keys(renewal.academy?.clubs ?? {}).sort()).toEqual(
      world.clubs.map((c) => c.id).sort(),
    );
  });

  it("folha de referência estável e custos de 2% a 10% e de 2 a 6 folhas", () => {
    const world = testWorld();
    const payroll = referenceMonthlyPayroll(world, MANAGER);
    expect(payroll).toBeGreaterThan(0);
    const fewer = {
      ...world,
      players: world.players.filter((player) => player.clubId !== MANAGER),
    };
    expect(referenceMonthlyPayroll(fewer, MANAGER)).toBe(payroll);
    expect(academyMaintenance(world, MANAGER, 1)).toBe(Math.round(payroll * 0.02));
    expect(academyMaintenance(world, MANAGER, 5)).toBe(Math.round(payroll * 0.1));
    expect(academyUpgradeCost(world, MANAGER, 2)).toBe(Math.round((payroll * 2) / 1000) * 1000);
    expect(academyUpgradeCost(world, MANAGER, 5)).toBe(Math.round((payroll * 6) / 1000) * 1000);
  });

  it("regras do mod: 5 níveis válidos aceitos; 4 níveis recusados; sem a seção, válido", () => {
    const levels = DEFAULT_ACADEMY_LEVELS.map((rule) => ({ ...rule, slots: rule.slots + 1 }));
    const withMod = editedWorld((w) => {
      const main = w.competitions[0];
      if (main) main.economy = { ...(main.economy ?? {}), academy: { levels } };
    });
    expect(validateBank(withMod).ok).toBe(true);
    expect(academyRules(withMod, MANAGER)[0]?.slots).toBe(16);
    const four = editedWorld((w) => {
      const main = w.competitions[0];
      if (main) main.economy = { ...(main.economy ?? {}), academy: { levels: levels.slice(0, 4) } };
    });
    expect(validateBank(four).ok).toBe(false);
    expect(validateBank(testWorld()).ok).toBe(true);
  });
});

describe("base inicial cheia (037 FR-004b)", () => {
  it("15 jovens por clube, 3 de cada idade de 15 a 19, fora do mundo e determinístico", () => {
    const world = testWorld();
    const date = seasonDate(
      world.manifest.referenceDate,
      Number(world.manifest.referenceDate.slice(0, 4)),
    );
    const renewal = seedAcademies(world, initialRenewal(world), SEED, date);
    const players = renewal.academy?.players ?? [];
    for (const club of world.clubs) {
      const own = players.filter((entry) => entry.clubId === club.id);
      expect(own).toHaveLength(15);
      const ages = own.map((entry) => ageOn(entry.player.birthDate, date)).sort();
      expect(ages).toEqual([15, 15, 15, 16, 16, 16, 17, 17, 17, 18, 18, 18, 19, 19, 19]);
    }
    const ids = new Set(world.players.map((player) => player.id));
    expect(players.some((entry) => ids.has(entry.player.id))).toBe(false);
    expect(renewal.nextPlayerSeq).toBe(
      initialRenewal(world).nextPlayerSeq + 15 * world.clubs.length,
    );
    expect(seedAcademies(world, initialRenewal(world), SEED, date)).toEqual(renewal);
  });

  it("completa uma base parcial sem tirar ninguém", () => {
    const world = testWorld();
    const date = world.manifest.referenceDate;
    const full = seedAcademies(world, initialRenewal(world), SEED, date);
    const four = (full.academy?.players ?? [])
      .filter((entry) => entry.clubId === MANAGER)
      .slice(0, 4);
    const partial = {
      ...initialRenewal(world),
      nextPlayerSeq: full.nextPlayerSeq,
      academy: { ...emptyAcademy(), players: four },
    };
    const done = seedAcademies(world, partial, `${SEED}-b`, date);
    const own = (done.academy?.players ?? []).filter((entry) => entry.clubId === MANAGER);
    expect(own).toHaveLength(15);
    for (const entry of four) expect(own).toContainEqual(entry);
  });

  it("qualidade média sobe com o nível", () => {
    const world = testWorld();
    const date = world.manifest.referenceDate;
    const mean = (level: number) => {
      const clubs = Object.fromEntries(world.clubs.map((club) => [club.id, { level }]));
      const renewal = seedAcademies(
        world,
        { ...initialRenewal(world), academy: { ...emptyAcademy(), clubs } },
        SEED,
        date,
      );
      const list = renewal.academy?.players ?? [];
      return (
        list.reduce(
          (sum, entry) => sum + entry.player.strength + entry.player.hidden.potential,
          0,
        ) / list.length
      );
    };
    expect(mean(5)).toBeGreaterThan(mean(1) + 5);
  });
});

describe("investimento do técnico (037 US2, US3)", () => {
  it("melhorar: paga a obra agora e fica pendente; recusa sem caixa, com pendência e no 5", () => {
    const start = state(1_000_000_000);
    const before = academyClub(start.renewal, start.world, MANAGER);
    const done = ok(upgradeAcademy(start, MANAGER));
    const cost = academyUpgradeCost(start.world, MANAGER, before.level + 1);
    expect(done.state.finances.clubs[MANAGER]?.cash).toBe(1_000_000_000 - cost);
    expect(done.state.finances.ledger.at(-1)).toMatchObject({
      clubId: MANAGER,
      category: "academy",
      amount: -cost,
    });
    expect(academyClub(done.state.renewal, done.state.world, MANAGER)).toEqual({
      level: before.level,
      pending: { kind: "upgrade", cost },
    });
    expect(upgradeAcademy(done.state, MANAGER)).toEqual({
      ok: false,
      error: "academy.pending_change",
    });
    const poor = upgradeAcademy(state(0), MANAGER);
    expect(poor).toMatchObject({ ok: false, error: "academy.insufficient_cash" });
    const top = state(1_000_000_000);
    const atFive = atLevel(top, 5);
    expect(upgradeAcademy(atFive, MANAGER)).toEqual({ ok: false, error: "academy.max_level" });
  });

  it("baixar e cancelar; a obra paga não se cancela", () => {
    const start = state(1_000_000_000);
    const atThree = atLevel(start, 3);
    const down = ok(downgradeAcademy(atThree, MANAGER));
    expect(academyClub(down.state.renewal, down.state.world, MANAGER).pending).toEqual({
      kind: "downgrade",
    });
    const cancelled = ok(cancelAcademyChange(down.state, MANAGER));
    expect(academyClub(cancelled.state.renewal, cancelled.state.world, MANAGER)).toEqual({
      level: 3,
    });
    expect(cancelAcademyChange(cancelled.state, MANAGER)).toEqual({
      ok: false,
      error: "academy.no_pending",
    });
    const up = ok(upgradeAcademy(atThree, MANAGER));
    expect(cancelAcademyChange(up.state, MANAGER)).toEqual({
      ok: false,
      error: "academy.upgrade_paid",
    });
    const atOne = atLevel(start, 1);
    expect(downgradeAcademy(atOne, MANAGER)).toEqual({ ok: false, error: "academy.min_level" });
  });

  it("comparação da divisão: só os níveis, do maior ao menor", () => {
    const list = divisionAcademies(state(), MANAGER);
    expect(list.some((entry) => entry.clubId === MANAGER)).toBe(true);
    for (let index = 1; index < list.length; index++) {
      expect((list[index - 1]?.level ?? 0) >= (list[index]?.level ?? 0)).toBe(true);
    }
    expect(Object.keys(list[0] ?? {}).sort()).toEqual(["clubId", "level"]);
  });
});
