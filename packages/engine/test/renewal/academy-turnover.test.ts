import { describe, expect, it } from "vitest";
import { seasonDate } from "../../src/calendar/date";
import { advanceCareerDays } from "../../src/career/day";
import type { CareerSeasonState } from "../../src/career/season-state";
import { DEFAULT_TURNOVER_STEPS, seasonTurnover } from "../../src/career/turnover";
import type { CompletedPlayer } from "../../src/model/types";
import { academyOf, emptyAcademy, graduateOf } from "../../src/renewal/academy";
import { ACADEMY_RULES, SQUAD_RULES } from "../../src/renewal/rules";
import { squadProblems } from "../../src/renewal/squads";
import type { AcademyPlayer } from "../../src/renewal/types";
import { squadOf } from "../../src/world/squads";
import { MANAGER, newState } from "../career/day-helpers";
import { testWorld } from "../career/helpers";

const SEED = "virada-036";

function ok<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result as Extract<T, { ok: true }>;
}

let finishedCache: CareerSeasonState | undefined;
/** Temporada inteira jogada (com sistemas), pronta para a virada. */
function finished(): CareerSeasonState {
  finishedCache ??= ok(
    advanceCareerDays(
      newState(testWorld(), SEED, { systems: true }),
      { toEnd: true },
      SEED,
      MANAGER,
    ),
  ).state;
  return finishedCache;
}

/** Jovem com `age` anos no início da temporada que vai começar. */
function youth(
  state: CareerSeasonState,
  id: string,
  clubId: string,
  age: number,
  position: CompletedPlayer["position"] = "MF",
): AcademyPlayer {
  const template = state.world.players[0];
  if (!template) throw new Error("banco vazio");
  const { clubId: _c, contract: _k, ...player } = template;
  const start = seasonDate(state.world.manifest.referenceDate, state.league.year + 1);
  return {
    player: {
      ...player,
      id,
      position,
      birthDate: `${Number(start.slice(0, 4)) - age}${start.slice(4)}`,
      strength: 55,
      hidden: { ...template.hidden, potential: 70 },
    },
    clubId,
    joinedSeason: 1,
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

describe("virada com a base (036)", () => {
  it("ordem das etapas novas", () => {
    const ids = DEFAULT_TURNOVER_STEPS.map((step) => step.id);
    const at = (id: string) => ids.indexOf(id);
    expect(at("academy-age-out")).toBeGreaterThan(-1);
    expect(at("academy-age-out")).toBeLessThan(at("generate-youth"));
    expect(at("complete-squads")).toBeGreaterThan(at("balance-squads"));
    expect(at("complete-squads")).toBeLessThan(at("age-out-free-agents"));
    expect(at("academy-close")).toBeGreaterThan(at("age-out-free-agents"));
  });

  it("a safra chega à base, ninguém é criado direto no elenco e os elencos ficam válidos", () => {
    const state = finished();
    const before = new Set(state.world.players.map((player) => player.id));
    const result = turn(state);
    const academy = result.renewal?.academy;
    expect(academy?.players.length ?? 0).toBeGreaterThan(0);
    const created = result.world.players.filter(
      (player) =>
        !before.has(player.id) &&
        Number(player.id.split("-").at(-1)) >= (state.renewal?.nextPlayerSeq ?? 0),
    );
    // Todo jogador novo no mundo passou pela base (origem registrada).
    for (const player of created) expect(graduateOf(result.renewal, player.id)).toBeDefined();
    expect(
      squadProblems(result.world, result.league, MANAGER).filter((p) => !p.startsWith(MANAGER)),
    ).toEqual([]);
    for (const club of result.world.clubs) {
      if (club.id === MANAGER) continue;
      expect(academyOf(result.renewal, club.id).length).toBeLessThanOrEqual(
        ACADEMY_RULES.maxPlayers,
      );
    }
    // A safra do técnico aparece no aviso.
    const own = academyOf(result.renewal, MANAGER)
      .map((entry) => entry.player.id)
      .sort();
    expect(result.renewal?.squadNotice?.academyArrived?.map((ref) => ref.playerId).sort()).toEqual(
      own,
    );
  }, 120000);

  it("idade-limite: a IA promove, o técnico perde o jovem para os livres", () => {
    const state = withBase(finished(), [
      youth(finished(), "jogador-91001", MANAGER, 20),
      youth(finished(), "jogador-91002", "clube-002", 20),
      youth(finished(), "jogador-91003", MANAGER, 18),
    ]);
    const result = turn(state);
    expect(
      academyOf(result.renewal, MANAGER).some((entry) => entry.player.id === "jogador-91001"),
    ).toBe(false);
    expect(
      academyOf(result.renewal, MANAGER).some((entry) => entry.player.id === "jogador-91003"),
    ).toBe(true);
    expect(
      result.market?.freeAgents.find((agent) => agent.player.id === "jogador-91001")?.lastClubId,
    ).toBe(MANAGER);
    expect(result.renewal?.squadNotice?.academyAgedOut?.map((ref) => ref.playerId)).toEqual([
      "jogador-91001",
    ]);
    const promoted = result.world.players.find((player) => player.id === "jogador-91002");
    // Promovido pela IA (pode sair depois pelo teto, mas nunca some sem rastro).
    if (promoted) {
      expect(promoted.clubId).toBe("clube-002");
      expect(promoted.contract).toBeDefined();
    } else {
      expect(result.market?.freeAgents.some((agent) => agent.player.id === "jogador-91002")).toBe(
        true,
      );
    }
  }, 120000);

  it("clube da IA sem a posição na base nem no mercado recebe a safra de emergência", () => {
    const start = finished();
    const target = "clube-002";
    const state: CareerSeasonState = {
      ...withBase(start, []),
      world: {
        ...start.world,
        players: start.world.players.filter(
          (player) => !(player.clubId === target && player.position === "GK"),
        ),
      },
      ...(start.market
        ? {
            market: {
              ...start.market,
              freeAgents: start.market.freeAgents.filter((agent) => agent.player.position !== "GK"),
            },
          }
        : {}),
    };
    const result = turn(state);
    const keepers = squadOf(result.world, target).filter((player) => player.position === "GK");
    expect(keepers.length).toBeGreaterThanOrEqual(SQUAD_RULES.positionMin.GK);
    for (const keeper of keepers) {
      expect(graduateOf(result.renewal, keeper.id)?.clubId ?? target).toBe(target);
    }
    expect(result.renewal?.academy?.emergencies ?? 0).toBeGreaterThan(0);
  }, 120000);

  it("clube da IA abaixo do mínimo contrata o livre da posição antes da emergência", () => {
    const start = finished();
    const target = "clube-002";
    const removed = start.world.players.filter(
      (player) => player.clubId === target && player.position === "GK",
    );
    const state: CareerSeasonState = {
      ...withBase(start, []),
      world: {
        ...start.world,
        players: start.world.players.filter((player) => !removed.includes(player)),
      },
      ...(start.market
        ? {
            market: {
              ...start.market,
              freeAgents: [
                ...start.market.freeAgents.filter((agent) => agent.player.position !== "GK"),
                ...removed.map((player) => {
                  const { clubId: _c, contract: _k, ...rest } = player;
                  return { player: rest, lastClubId: "clube-003", sinceYear: start.league.year };
                }),
              ],
            },
          }
        : {}),
    };
    const result = turn(state);
    const keepers = squadOf(result.world, target).filter((player) => player.position === "GK");
    expect(keepers.length).toBeGreaterThanOrEqual(SQUAD_RULES.positionMin.GK);
    expect(result.renewal?.academy?.emergencies ?? 0).toBe(0);
  }, 120000);

  it("no clube do técnico, ninguém é promovido nem criado", () => {
    const start = finished();
    const state: CareerSeasonState = {
      ...withBase(start, [youth(start, "jogador-91010", MANAGER, 17, "GK")]),
      world: {
        ...start.world,
        players: start.world.players.filter(
          (player) => !(player.clubId === MANAGER && player.position === "GK"),
        ),
      },
    };
    const result = turn(state);
    expect(squadOf(result.world, MANAGER).filter((player) => player.position === "GK")).toEqual([]);
    expect(
      academyOf(result.renewal, MANAGER).some((entry) => entry.player.id === "jogador-91010"),
    ).toBe(true);
  }, 120000);

  it("promoções e dispensas do técnico vão para o aviso e são zeradas; a origem é podada", () => {
    const start = finished();
    if (!start.renewal) throw new Error("sem renovação");
    const ref = {
      playerId: "jogador-00001",
      displayName: "X",
      position: "MF" as const,
      age: 18,
      strength: 50,
    };
    const state: CareerSeasonState = {
      ...start,
      renewal: {
        ...start.renewal,
        academy: {
          ...emptyAcademy(),
          promotedThisSeason: [ref],
          releasedThisSeason: [{ ...ref, playerId: "jogador-00002" }],
          graduates: { "jogador-inexistente": { clubId: MANAGER, season: 1 } },
        },
      },
    };
    const result = turn(state);
    expect(result.renewal?.squadNotice?.promoted.map((entry) => entry.playerId)).toContain(
      "jogador-00001",
    );
    expect(result.renewal?.squadNotice?.academyReleased?.map((entry) => entry.playerId)).toEqual([
      "jogador-00002",
    ]);
    expect(result.renewal?.academy?.promotedThisSeason).toEqual([]);
    expect(result.renewal?.academy?.releasedThisSeason).toEqual([]);
    expect(result.renewal?.academy?.graduates["jogador-inexistente"]).toBeUndefined();
  }, 120000);

  it("a mesma seed dá a mesma virada", () => {
    expect(turn(finished())).toEqual(turn(finished()));
  }, 120000);
});
