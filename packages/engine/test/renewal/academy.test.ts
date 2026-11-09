import { describe, expect, it } from "vitest";
import { ageOn, seasonDate } from "../../src/calendar/date";
import { advanceCareerDays } from "../../src/career/day";
import {
  type CareerSeasonState,
  clubFixtures,
  nextClubFixture,
} from "../../src/career/season-state";
import { applyRoundSystems } from "../../src/finance/round";
import { marketRules } from "../../src/market/rules";
import { roundsPlayed, transferWindows } from "../../src/market/windows";
import type { Position } from "../../src/model/catalogs";
import {
  academyIdsProblem,
  academyOf,
  academyStatus,
  academyWarning,
  asClubPlayer,
  emptyAcademy,
  evolveAcademy,
  graduateOf,
  promoteFromAcademy,
  promotionContract,
  releaseFromAcademy,
  rosterIssues,
} from "../../src/renewal/academy";
import { evolutionDelta, midSeasonRound } from "../../src/renewal/evolution";
import { ACADEMY_RULES, SQUAD_RULES } from "../../src/renewal/rules";
import type { AcademyPlayer } from "../../src/renewal/types";
import { createRng } from "../../src/rng/xoshiro";
import { squadOf } from "../../src/world/squads";
import { MANAGER, newState } from "../career/day-helpers";
import { testWorld } from "../career/helpers";

const SEED = "base-036";

function baseState(): CareerSeasonState {
  return newState(testWorld(), SEED, { systems: true });
}

/** Jovem da base com idade `age` no início da temporada atual. */
function youth(
  state: CareerSeasonState,
  id: string,
  options: { age?: number; position?: Position; strength?: number; clubId?: string } = {},
): AcademyPlayer {
  const template = state.world.players[0];
  if (!template) throw new Error("banco vazio");
  const { clubId: _c, contract: _k, ...player } = template;
  const start = seasonDate(state.world.manifest.referenceDate, state.league.year);
  const birthYear = Number(start.slice(0, 4)) - (options.age ?? 17);
  return {
    player: {
      ...player,
      id,
      position: options.position ?? "MF",
      strength: options.strength ?? 50,
      birthDate: `${birthYear}${start.slice(4)}`,
      hidden: { ...template.hidden, potential: (options.strength ?? 50) + 20 },
    },
    clubId: options.clubId ?? MANAGER,
    joinedSeason: 1,
  };
}

function withBase(state: CareerSeasonState, entries: AcademyPlayer[]): CareerSeasonState {
  if (!state.renewal) throw new Error("sem renovação");
  return {
    ...state,
    renewal: {
      ...state.renewal,
      academy: {
        ...emptyAcademy(),
        players: [...entries].sort((a, b) => (a.player.id < b.player.id ? -1 : 1)),
      },
    },
  };
}

function ok<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result as Extract<T, { ok: true }>;
}

describe("base: estrutura (036 R1, R2)", () => {
  it("a base começa vazia e lista os jovens do clube em ordem de id", () => {
    const state = baseState();
    expect(state.renewal?.academy).toEqual(emptyAcademy());
    const next = withBase(state, [
      youth(state, "jogador-90002"),
      youth(state, "jogador-90001"),
      youth(state, "jogador-90003", { clubId: "clube-002" }),
    ]);
    expect(academyOf(next.renewal, MANAGER).map((entry) => entry.player.id)).toEqual([
      "jogador-90001",
      "jogador-90002",
    ]);
  });

  it("idade, temporada de saída e último ano (idade-limite 20 na nova temporada)", () => {
    const state = baseState();
    const reference = state.world.manifest.referenceDate;
    const seventeen = academyStatus(
      youth(state, "jogador-90001", { age: 17 }),
      reference,
      state.league,
    );
    expect(seventeen.age).toBe(17);
    expect(seventeen.leavesYear).toBe(state.league.year + 3);
    expect(seventeen.leavesSeason).toBe(state.league.number + 3);
    expect(seventeen.lastYear).toBe(false);
    const nineteen = academyStatus(
      youth(state, "jogador-90002", { age: 19 }),
      reference,
      state.league,
    );
    expect(nineteen.lastYear).toBe(true);
    expect(nineteen.leavesYear).toBe(state.league.year + 1);
    expect(ACADEMY_RULES.ageLimit).toBe(20);
  });

  it("ids da base, do mundo e dos livres não se repetem", () => {
    const state = baseState();
    const entry = youth(state, "jogador-90001");
    expect(academyIdsProblem(state.world, { ...emptyAcademy(), players: [entry] })).toBeUndefined();
    const repeated = {
      ...entry,
      player: { ...entry.player, id: state.world.players[0]?.id ?? "" },
    };
    expect(academyIdsProblem(state.world, { ...emptyAcademy(), players: [repeated] })).toMatch(
      /repetido/,
    );
    expect(
      academyIdsProblem(state.world, { ...emptyAcademy(), players: [entry] }, ["jogador-90001"]),
    ).toMatch(/repetido/);
    const orphan = { ...entry, clubId: "clube-inexistente" };
    expect(academyIdsProblem(state.world, { ...emptyAcademy(), players: [orphan] })).toMatch(
      /inexistente/,
    );
  });

  it("a base fica fora do elenco, da escalação e do mercado (036 FR-003, FR-014a)", () => {
    const state = withBase(baseState(), [youth(state0(), "jogador-90001")]);
    expect(squadOf(state.world, MANAGER).some((player) => player.id === "jogador-90001")).toBe(
      false,
    );
    expect(state.world.players.some((player) => player.id === "jogador-90001")).toBe(false);
    expect(state.market?.freeAgents.some((agent) => agent.player.id === "jogador-90001")).toBe(
      false,
    );
  });
});

function state0() {
  return baseState();
}

describe("base: promover (036 US2)", () => {
  it("promove com o contrato da prévia, registra a origem e entra no elenco", () => {
    const state = withBase(baseState(), [youth(state0(), "jogador-90001")]);
    const preview = promotionContract(state, "jogador-90001", SEED);
    expect(preview).toBeDefined();
    const done = ok(promoteFromAcademy(state, MANAGER, "jogador-90001", SEED));
    const player = done.state.world.players.find((entry) => entry.id === "jogador-90001");
    expect(player?.clubId).toBe(MANAGER);
    expect(player?.contract).toEqual(preview);
    expect(academyOf(done.state.renewal, MANAGER)).toHaveLength(0);
    expect(graduateOf(done.state.renewal, "jogador-90001")).toEqual({
      clubId: MANAGER,
      season: state.league.number,
    });
    expect(done.state.renewal?.academy?.promotedThisSeason.map((ref) => ref.playerId)).toEqual([
      "jogador-90001",
    ]);
  });

  it("recusa com o elenco no máximo e para jovem fora da base do clube", () => {
    const start = baseState();
    const template = squadOf(start.world, MANAGER)[0];
    if (!template) throw new Error("sem jogador");
    const missing = SQUAD_RULES.userMax - squadOf(start.world, MANAGER).length;
    const full: CareerSeasonState = {
      ...start,
      world: {
        ...start.world,
        players: [
          ...start.world.players,
          ...Array.from({ length: missing }, (_, index) => ({
            ...template,
            id: `jogador-95${String(index).padStart(3, "0")}`,
          })),
        ],
      },
    };
    const state = withBase(full, [youth(start, "jogador-90001")]);
    expect(promoteFromAcademy(state, MANAGER, "jogador-90001", SEED)).toEqual({
      ok: false,
      error: "academy.squad_full",
    });
    expect(promoteFromAcademy(state, "clube-002", "jogador-90001", SEED)).toEqual({
      ok: false,
      error: "academy.not_found",
    });
  });
});

describe("base: dispensar e bloqueios (036 US4)", () => {
  it("dispensa: o jovem vira livre e fica no registro da temporada", () => {
    const state = withBase(baseState(), [youth(state0(), "jogador-90001")]);
    const done = ok(releaseFromAcademy(state, MANAGER, "jogador-90001"));
    expect(academyOf(done.state.renewal, MANAGER)).toHaveLength(0);
    const agent = done.state.market?.freeAgents.find(
      (entry) => entry.player.id === "jogador-90001",
    );
    expect(agent?.lastClubId).toBe(MANAGER);
    expect(agent?.sinceYear).toBe(state.league.year);
    expect(done.state.renewal?.academy?.releasedThisSeason.map((ref) => ref.playerId)).toEqual([
      "jogador-90001",
    ]);
  });

  it("base acima do limite e elenco abaixo do mínimo impedem a partida", () => {
    const start = baseState();
    expect(rosterIssues(start, MANAGER)).toEqual([]);
    const over = withBase(
      start,
      Array.from({ length: ACADEMY_RULES.maxPlayers + 2 }, (_, index) =>
        youth(start, `jogador-90${String(index).padStart(3, "0")}`),
      ),
    );
    expect(rosterIssues(over, MANAGER)).toEqual([
      {
        code: "academy_over_limit",
        severity: "error",
        params: { excess: 2, limit: ACADEMY_RULES.maxPlayers },
      },
    ]);
    const short: CareerSeasonState = {
      ...start,
      world: {
        ...start.world,
        players: start.world.players.filter(
          (player) => !(player.clubId === MANAGER && player.position === "GK"),
        ),
      },
    };
    const issues = rosterIssues(short, MANAGER);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("squad_below_minimum");
    expect(issues[0]?.params.positions).toBe("GK");
    expect(Number(issues[0]?.params.missing)).toBeGreaterThanOrEqual(SQUAD_RULES.positionMin.GK);
  });
});

describe("base: avisos de último ano (036 US3)", () => {
  it("antes do último jogo do clube, avisa quantos estão no último ano", () => {
    let state = withBase(baseState(), [
      youth(state0(), "jogador-90001", { age: 19 }),
      youth(state0(), "jogador-90002", { age: 19 }),
      youth(state0(), "jogador-90003", { age: 17 }),
    ]);
    expect(rosterIssues(state, MANAGER).some((issue) => issue.code === "academy_last_year")).toBe(
      false,
    );
    const last = clubFixtures(state, MANAGER).at(-1);
    while (
      nextClubFixture(state, MANAGER) !== undefined &&
      nextClubFixture(state, MANAGER)?.day !== last?.day
    ) {
      state = ok(advanceCareerDays(state, { days: 1 }, SEED, MANAGER)).state;
    }
    expect(rosterIssues(state, MANAGER)).toContainEqual({
      code: "academy_last_year",
      severity: "warning",
      params: { count: 2 },
    });
  }, 120000);

  it("com a última janela aberta, avisa; antes dela, não", () => {
    let state = withBase(baseState(), [youth(state0(), "jogador-90001", { age: 19 })]);
    const rules = marketRules(state.world, state.league.competitionId);
    const last = transferWindows(state.league, rules).at(-1);
    if (!last) throw new Error("sem janela");
    expect(academyWarning(state, MANAGER)).toBeUndefined();
    while (roundsPlayed(state.league) < last.fromRound) {
      state = ok(advanceCareerDays(state, { days: 1 }, SEED, MANAGER)).state;
    }
    expect(academyWarning(state, MANAGER)).toEqual({ kind: "last_window", count: 1 });
  }, 120000);
});

describe("base: evolução (036 FR-004, R4)", () => {
  it("evolui como um jogador sem minutos, com a seed da evolução do mundo", () => {
    const state = baseState();
    const entry = youth(state, "jogador-90001", { age: 17, strength: 50 });
    const date = seasonDate(state.world.manifest.referenceDate, state.league.year);
    const academy = { ...emptyAcademy(), players: [entry] };
    const evolved = evolveAcademy(academy, new Set([MANAGER]), SEED, 1, "end", date);
    const rng = createRng(`${SEED}:evolve:1:end:jogador-90001`);
    const delta = evolutionDelta(asClubPlayer(entry), ageOn(entry.player.birthDate, date), 0, rng);
    expect(evolved.players[0]?.player.strength).toBe(Math.max(20, 50 + delta));
    expect(evolveAcademy(academy, new Set(["clube-002"]), SEED, 1, "end", date)).toBe(academy);
    expect(evolveAcademy(academy, new Set([MANAGER]), SEED, 1, "end", date)).toEqual(evolved);
  });
});

describe("base durante a temporada (036 R4, FR-013)", () => {
  it("na rodada do meio de uma liga estrangeira, a base evolui e volta ao estado", () => {
    const state = withBase(baseState(), [
      youth(state0(), "jogador-90001", { age: 16, strength: 40 }),
    ]);
    if (!state.renewal) throw new Error("sem renovação");
    const lastEvolution = state.renewal.lastEvolution;
    const applied = applyRoundSystems(
      state.league,
      state.finances,
      state.world,
      midSeasonRound(state.league),
      "",
      { state: state.renewal, careerSeed: SEED },
      undefined,
      undefined,
      undefined,
      undefined,
      [],
      { foreign: true },
    );
    if (!applied.ok) throw new Error("rodada falhou");
    const date = seasonDate(state.world.manifest.referenceDate, state.league.year);
    const expected = evolveAcademy(
      state.renewal.academy ?? emptyAcademy(),
      new Set([MANAGER]),
      SEED,
      state.league.number,
      "mid",
      date,
    );
    expect(applied.renewal?.academy?.players).toEqual(expected.players);
    expect(applied.renewal?.lastEvolution).toEqual(lastEvolution);
  });

  it("clube da IA abaixo do mínimo promove da base na rodada; o do técnico não", () => {
    const start = baseState();
    const short = (clubId: string) => (player: { clubId: string; position: string }) =>
      !(player.clubId === clubId && player.position === "GK");
    const state = withBase(
      {
        ...start,
        world: {
          ...start.world,
          players: start.world.players.filter(short("clube-002")).filter(short(MANAGER)),
        },
      },
      [
        ...Array.from({ length: SQUAD_RULES.positionMin.GK }, (_, index) =>
          youth(start, `jogador-9200${index}`, { position: "GK", clubId: "clube-002" }),
        ),
        youth(start, "jogador-92010", { position: "GK" }),
      ],
    );
    if (!state.renewal) throw new Error("sem renovação");
    const applied = applyRoundSystems(state.league, state.finances, state.world, 1, MANAGER, {
      state: state.renewal,
      careerSeed: SEED,
    });
    if (!applied.ok) throw new Error("rodada falhou");
    const keepers = squadOf(applied.world, "clube-002").filter(
      (player) => player.position === "GK",
    );
    expect(keepers).toHaveLength(SQUAD_RULES.positionMin.GK);
    expect(keepers.every((player) => player.contract)).toBe(true);
    expect(squadOf(applied.world, MANAGER).filter((player) => player.position === "GK")).toEqual(
      [],
    );
    expect(academyOf(applied.renewal, MANAGER)).toHaveLength(1);
  });
});
