import { describe, expect, it, vi } from "vitest";

// 038 SC-005, FR-007: a mesma seed dá a mesma carreira com e sem a feature. A carreira "sem" troca
// os módulos da faixa e das notícias da base por versões que não fazem nada; tudo o que é resultado
// do jogo (mundo, tabelas, mercado, finanças, base sem a faixa e regulador) tem de ser idêntico.

const SEED = "neutra-038";
const SEASONS = 2;

type Engine = {
  advanceCareerDays: typeof import("../../src/career/day").advanceCareerDays;
  seasonTurnover: typeof import("../../src/career/turnover").seasonTurnover;
  newState: typeof import("./day-helpers").newState;
  MANAGER: string;
  testWorld: typeof import("./helpers").testWorld;
};

async function load(): Promise<Engine> {
  const day = await import("../../src/career/day");
  const turnover = await import("../../src/career/turnover");
  const helpers = await import("./day-helpers");
  const world = await import("./helpers");
  return {
    advanceCareerDays: day.advanceCareerDays,
    seasonTurnover: turnover.seasonTurnover,
    newState: helpers.newState,
    MANAGER: helpers.MANAGER,
    testWorld: world.testWorld,
  };
}

function digest(engine: Engine): { out: unknown[]; estimates: number; academyNews: number } {
  let state = engine.newState(engine.testWorld(), SEED, { systems: true });
  const out: unknown[] = [];
  let estimates = 0;
  let academyNews = 0;
  for (let season = 0; season < SEASONS; season++) {
    const played = engine.advanceCareerDays(state, { toEnd: true }, SEED, engine.MANAGER);
    if (!played.ok) throw new Error(JSON.stringify(played));
    const done = played.state;
    const turned = engine.seasonTurnover(done.league, done.world, [], {
      careerSeed: SEED,
      finances: done.finances,
      managerClubId: engine.MANAGER,
      ...(done.renewal ? { renewal: done.renewal } : {}),
      ...(done.market ? { market: done.market } : {}),
      ...(done.board ? { board: done.board } : {}),
      ...(done.fans ? { fans: done.fans } : {}),
      ...(done.news ? { news: done.news } : {}),
      competitions: done.competitions,
      calendar: done.calendar,
    });
    if (!turned.ok) throw new Error(JSON.stringify(turned));
    estimates += (turned.renewal?.academy?.players ?? []).filter((entry) => entry.estimate).length;
    academyNews += (turned.news?.feed ?? [])
      .flatMap((round) => round.headlines)
      .filter((headline) => headline.type.startsWith("academy")).length;
    out.push({
      standings: done.league.divisions.map((division) =>
        division.records.map((record) => [record.home, record.away, record.score]),
      ),
      players: turned.world.players.map((player) => [
        player.id,
        player.clubId,
        player.strength,
        player.contract,
      ]),
      ledger: turned.finances?.ledger,
      cash: Object.values(turned.finances?.clubs ?? {}).map((club) => club.cash),
      market: done.market?.log,
      academy: (turned.renewal?.academy?.players ?? []).map((entry) => [
        entry.player.id,
        entry.clubId,
        entry.player.strength,
        entry.player.hidden.potential,
      ]),
      regulator: turned.renewal?.regulator,
      board: turned.board?.clubs,
      fans: turned.fans?.clubs,
    });
    state = {
      ...done,
      league: turned.league,
      world: turned.world,
      ...(turned.finances ? { finances: turned.finances } : {}),
      ...(turned.renewal ? { renewal: turned.renewal } : {}),
      ...(turned.market ? { market: turned.market } : {}),
      ...(turned.board ? { board: turned.board } : {}),
      ...(turned.fans ? { fans: turned.fans } : {}),
      ...(turned.news ? { news: turned.news } : {}),
      ...(turned.competitions ? { competitions: turned.competitions } : {}),
      ...(turned.calendar ? { calendar: turned.calendar } : {}),
    };
  }
  return { out, estimates, academyNews };
}

describe("a faixa e as notícias da base não mudam a carreira (038 SC-005)", () => {
  it("mesma seed, com e sem a feature", async () => {
    const withFeature = digest(await load());

    vi.resetModules();
    vi.doMock("../../src/renewal/estimate", async (original) => {
      const real = await original<typeof import("../../src/renewal/estimate")>();
      return {
        ...real,
        withEstimate: (entry: unknown) => entry,
        withMissingEstimates: (academy: unknown) => academy,
        academyEstimatesStep: { id: "academy-estimates", run: (context: unknown) => context },
      };
    });
    vi.doMock("../../src/news/academy", async (original) => {
      const real = await original<typeof import("../../src/news/academy")>();
      return {
        ...real,
        newsAcademyStep: { id: "news-academy", run: (context: unknown) => context },
        criaMatchNews: (context: { news: { crias?: unknown } }) => ({
          headlines: [],
          crias: context.news.crias,
        }),
        criaSaleNews: (context: { news: { crias?: unknown } }) => ({
          headlines: [],
          crias: context.news.crias,
          used: new Set(),
        }),
      };
    });
    const without = digest(await load());
    vi.doUnmock("../../src/renewal/estimate");
    vi.doUnmock("../../src/news/academy");
    vi.resetModules();

    // A troca dos módulos valeu: sem a feature não há faixa nem manchete da base.
    expect(withFeature.estimates).toBeGreaterThan(0);
    expect(withFeature.academyNews).toBeGreaterThan(0);
    expect(without.estimates).toBe(0);
    expect(without.academyNews).toBe(0);
    expect(without.out).toEqual(withFeature.out);
  }, 600_000);
});
