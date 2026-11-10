import { describe, expect, it } from "vitest";
import { seasonDate } from "../../src/calendar/date";
import type { CareerSeasonState } from "../../src/career/season-state";
import type { TurnoverContext } from "../../src/career/types";
import type { TransferRecord } from "../../src/market/types";
import type { CompletedPlayer } from "../../src/model/types";
import {
  academyRevelation,
  criaMatchNews,
  criaSaleNews,
  newsAcademyStep,
} from "../../src/news/academy";
import { createNews } from "../../src/news/create";
import { CRIA_DEBUT, CRIA_GOAL, CRIA_SALE, type NewsState } from "../../src/news/types";
import { emptyAcademy } from "../../src/renewal/academy";
import type { AcademyGraduate, AcademyPlayer, RenewalState } from "../../src/renewal/types";
import type { MatchRecord, PlayerLine } from "../../src/season/types";
import { MANAGER, newState } from "../career/day-helpers";
import { testWorld } from "../career/helpers";

// 038 US3 (revelação da safra) e US5 (estreia, primeiro gol e venda das crias).

const SEED = "noticias-038";

let cached: CareerSeasonState | undefined;
function base(): CareerSeasonState {
  cached ??= newState(testWorld(), SEED, { systems: true });
  return cached;
}

function rival(state: CareerSeasonState): string {
  const division = state.league.divisions.find((season) => season.clubIds.includes(MANAGER));
  const other = division?.clubIds.find((clubId) => clubId !== MANAGER);
  if (!other) throw new Error("sem rival");
  return other;
}

function outsider(state: CareerSeasonState): string {
  const division = state.league.divisions.find((season) => season.clubIds.includes(MANAGER));
  const other = state.world.clubs.find((club) => !division?.clubIds.includes(club.id));
  if (!other) throw new Error("sem clube de outra divisão");
  return other.id;
}

/** Jovem com força e idade dadas (nascido no começo do ano `birthYear`). */
function youth(
  id: string,
  clubId: string,
  strength: number,
  birthYear: number,
  joinedSeason = 1,
): AcademyPlayer {
  const template = base().world.players[0];
  if (!template) throw new Error("banco vazio");
  const { clubId: _c, contract: _k, ...player } = template;
  return {
    player: {
      ...player,
      id,
      displayName: `Jovem ${id}`,
      birthDate: `${birthYear}-01-15`,
      strength,
      hidden: { ...template.hidden, potential: 99 },
    },
    clubId,
    joinedSeason,
  };
}

function renewalWith(
  players: AcademyPlayer[],
  graduates: Record<string, AcademyGraduate> = {},
): RenewalState {
  const state = base();
  if (!state.renewal) throw new Error("sem renovação");
  return {
    ...state.renewal,
    academy: {
      ...emptyAcademy(),
      players: [...players].sort((a, b) => (a.player.id < b.player.id ? -1 : 1)),
      graduates,
    },
  };
}

function stepContext(
  renewal: RenewalState,
  options: { manager?: string; world?: CareerSeasonState["world"] } = {},
): TurnoverContext {
  const state = base();
  const next = state.league.number + 1;
  const news: NewsState = {
    ...createNews(),
    feed: [{ season: next, year: state.league.year + 1, round: 0, headlines: [] }],
  };
  return {
    world: options.world ?? state.world,
    careerSeed: SEED,
    finished: state.league,
    finalStandings: {},
    history: [],
    next: {} as TurnoverContext["next"],
    renewal,
    news,
    managerClubId: options.manager ?? MANAGER,
  } as unknown as TurnoverContext;
}

function revelations(context: TurnoverContext) {
  const out = newsAcademyStep.run(context) as TurnoverContext;
  return (out.news?.feed.at(-1)?.headlines ?? []).filter(
    (headline) => headline.type === "academyRevelation",
  );
}

describe("revelação da safra (038 R6)", () => {
  const year = () => base().league.year;
  const date = () => seasonDate(base().world.manifest.referenceDate, year() + 1);

  it("o mais forte da safra, ainda na base ou promovido no formador; desempate pela idade e id", () => {
    const state = base();
    const promotedId = state.world.players.find((player) => player.clubId === MANAGER)?.id ?? "";
    const strength = state.world.players.find((player) => player.id === promotedId)?.strength ?? 0;
    const renewal = renewalWith(
      [
        youth("jogador-90001", MANAGER, strength - 1, year() - 17),
        youth("jogador-90002", MANAGER, strength + 5, year() - 16, 2),
      ],
      { [promotedId]: { clubId: MANAGER, season: 1, joinedSeason: 1 } },
    );
    const found = academyRevelation(renewal, state.world, new Set([MANAGER]), 1, date());
    expect(found?.playerId).toBe(promotedId);
    expect(found?.strength).toBe(strength);
    // Promovido que saiu do formador não conta.
    const moved = {
      ...state.world,
      players: state.world.players.map((player) =>
        player.id === promotedId ? { ...player, clubId: rival(state) } : player,
      ),
    };
    expect(academyRevelation(renewal, moved, new Set([MANAGER]), 1, date())?.playerId).toBe(
      "jogador-90001",
    );
    // Empate de força: o mais novo; depois, o menor id.
    const tie = renewalWith([
      youth("jogador-90011", MANAGER, 50, year() - 18),
      youth("jogador-90012", MANAGER, 50, year() - 16),
      youth("jogador-90013", MANAGER, 50, year() - 16),
    ]);
    expect(academyRevelation(tie, state.world, new Set([MANAGER]), 1, date())?.playerId).toBe(
      "jogador-90012",
    );
  });

  it("clube e divisão com jogadores diferentes: duas manchetes, sem potencial nem faixa", () => {
    const state = base();
    const renewal = renewalWith([
      youth("jogador-90021", MANAGER, 48, year() - 17),
      youth("jogador-90022", rival(state), 60, year() - 17),
      youth("jogador-90023", outsider(state), 80, year() - 17),
    ]);
    const found = revelations(stepContext(renewal));
    expect(found.map((headline) => headline.vars.scope)).toEqual(["club", "division"]);
    expect(found.map((headline) => headline.playerIds?.[0])).toEqual([
      "jogador-90021",
      "jogador-90022",
    ]);
    for (const headline of found) {
      expect(Object.keys(headline.vars).sort()).toEqual(
        ["age", "club", "player", "position", "scope", "strength"].sort(),
      );
      expect(JSON.stringify(headline)).not.toMatch(/potential|estimate/);
      expect(headline.id.startsWith(`${state.league.number + 1}-0-a`)).toBe(true);
    }
  });

  it("a revelação da divisão é do clube do técnico: uma só manchete (both)", () => {
    const state = base();
    const renewal = renewalWith([
      youth("jogador-90031", MANAGER, 70, year() - 17),
      youth("jogador-90032", rival(state), 60, year() - 17),
    ]);
    const found = revelations(stepContext(renewal));
    expect(found).toHaveLength(1);
    expect(found[0]?.vars.scope).toBe("both");
    expect(found[0]?.mine).toBe(true);
  });

  it("sem elegíveis no clube só a da divisão; desempregado, nada; safra nova não conta", () => {
    const state = base();
    const renewal = renewalWith([
      youth("jogador-90041", rival(state), 60, year() - 17),
      youth("jogador-90042", MANAGER, 90, year() - 17, state.league.number + 1),
    ]);
    const found = revelations(stepContext(renewal));
    expect(found.map((headline) => headline.vars.scope)).toEqual(["division"]);
    expect(revelations(stepContext(renewal, { manager: "" }))).toEqual([]);
  });
});

function line(side: "home" | "away", minutes: number, goals = 0): PlayerLine {
  return { side, minutes, goals, assists: 0, yellows: 0, red: false } as PlayerLine;
}

function match(home: string, away: string, players: Record<string, PlayerLine>): MatchRecord {
  return {
    round: 3,
    home,
    away,
    score: { home: 1, away: 0 },
    outcome: "finished",
    events: [],
    stats: {} as MatchRecord["stats"],
    players,
    unavailable: { home: [], away: [] },
  };
}

describe("crias nas manchetes (038 R7)", () => {
  const squad = (clubId: string) =>
    base().world.players.filter((player) => player.clubId === clubId) as CompletedPlayer[];

  function context(graduates?: Record<string, AcademyGraduate>, news: NewsState = createNews()) {
    const state = base();
    return {
      world: state.world,
      league: state.league,
      careerSeed: SEED,
      managerClubId: MANAGER,
      news,
      ...(graduates ? { graduates } : {}),
    };
  }

  it("estreia e primeiro gol uma vez por jogador; estreia com gol vira uma manchete com extra", () => {
    const state = base();
    const [a, b] = squad(MANAGER);
    const [c] = squad(rival(state));
    if (!a || !b || !c) throw new Error("elenco curto");
    const graduates = {
      [a.id]: { clubId: MANAGER, season: 1 },
      [b.id]: { clubId: MANAGER, season: 1 },
      [c.id]: { clubId: rival(state), season: 1 },
    };
    const first = criaMatchNews(
      context(graduates),
      [
        {
          record: match(MANAGER, rival(state), {
            [a.id]: line("home", 90),
            [b.id]: line("home", 30, 2),
            [c.id]: line("away", 90),
          }),
        },
      ],
      3,
    );
    expect(first.headlines.map((headline) => [headline.type, headline.playerIds?.[0]])).toEqual([
      ["academyDebut", a.id],
      ["academyDebut", b.id],
    ]);
    expect(first.headlines[1]?.extras).toEqual([
      { type: "academyFirstGoal", vars: first.headlines[1]?.vars },
    ]);
    expect(first.headlines.every((headline) => headline.mine)).toBe(true);
    // A cria do rival é marcada, sem manchete.
    expect(first.crias).toEqual({
      [a.id]: CRIA_DEBUT,
      [b.id]: CRIA_DEBUT | CRIA_GOAL,
      [c.id]: CRIA_DEBUT,
    });
    const news = { ...createNews(), ...(first.crias ? { crias: first.crias } : {}) };
    const second = criaMatchNews(
      context(graduates, news),
      [
        {
          record: match(rival(state), MANAGER, {
            [a.id]: line("away", 90, 1),
            [b.id]: line("away", 90, 1),
          }),
          competitionId: "copa",
        },
      ],
      4,
    );
    expect(second.headlines.map((headline) => [headline.type, headline.playerIds?.[0]])).toEqual([
      ["academyFirstGoal", a.id],
    ]);
    expect(second.headlines[0]?.vars.competition).toBe("copa");
  });

  it("jogando por outro clube ou sem minutos não conta; sem graduates, nada muda", () => {
    const state = base();
    const [a] = squad(MANAGER);
    if (!a) throw new Error("elenco curto");
    const graduates = { [a.id]: { clubId: rival(state), season: 1 } };
    const result = criaMatchNews(
      context(graduates),
      [{ record: match(MANAGER, rival(state), { [a.id]: line("home", 90, 1) }) }],
      3,
    );
    expect(result.headlines).toEqual([]);
    expect(result.crias).toBeUndefined();
    const none = criaMatchNews(
      context(),
      [{ record: match(MANAGER, rival(state), { [a.id]: line("home", 90, 1) }) }],
      3,
    );
    expect(none).toEqual({ headlines: [], crias: undefined });
  });

  it("venda de uma cria pelo clube do técnico: manchete própria, uma vez, e o negócio sai do mercado", () => {
    const state = base();
    const [a, b] = squad(MANAGER);
    if (!a || !b) throw new Error("elenco curto");
    const graduates = { [a.id]: { clubId: MANAGER, season: 1 } };
    const deal = (playerId: string, displayName: string): TransferRecord => ({
      season: state.league.number,
      round: 3,
      playerId,
      displayName,
      kind: "sale",
      fromClubId: MANAGER,
      toClubId: rival(state),
      fee: 1_000_000,
    });
    const deals = [deal(a.id, a.displayName), deal(b.id, b.displayName)];
    const result = criaSaleNews(context(graduates), deals, 3);
    expect(result.headlines).toHaveLength(1);
    expect(result.headlines[0]?.type).toBe("academySale");
    expect(result.headlines[0]?.vars).toMatchObject({
      club: MANAGER,
      opponent: rival(state),
      fee: 1_000_000,
    });
    expect([...result.used]).toEqual([deals[0]]);
    expect(result.crias?.[a.id]).toBe(CRIA_SALE);
    const again = criaSaleNews(
      context(graduates, { ...createNews(), ...(result.crias ? { crias: result.crias } : {}) }),
      deals,
      3,
    );
    expect(again.headlines).toEqual([]);
  });
});
