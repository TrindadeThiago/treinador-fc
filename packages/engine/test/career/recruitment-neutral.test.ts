import { describe, expect, it, vi } from "vitest";
import type { CareerSeasonState } from "../../src/career/season-state";

// 040 SC-002, FR-014: com o departamento aberto, a captação não muda a carreira enquanto ninguém é
// trazido. (1) Sem região: igual com e sem o módulo de captação. (2) Com região e indicações, sem
// trazer: igual ao caso sem região (mundo, tabelas, mercado, livro-caixa, base, regulador, diretoria
// e torcida), e a numeração de jogadores não anda.

const SEED = "neutra-040";
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

function digest(
  engine: Engine,
  withRegion = false,
): { out: unknown[]; reports: number; charges: number } {
  const start = engine.newState(engine.testWorld(), SEED, { systems: true });
  const countryId = start.world.countries[0]?.id ?? "";
  let state: CareerSeasonState = {
    ...start,
    scouting: {
      clubId: engine.MANAGER,
      level: 3,
      watch: [],
      reports: {},
      ...(withRegion ? { region: { kind: "country" as const, countryId } } : {}),
    },
  };
  const out: unknown[] = [];
  let reports = 0;
  let charges = 0;
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
    // Indicações geradas (numeração local) e o próximo id de jogador do mundo.
    reports = (done.scouting?.nextOfferSeq ?? 1) - 1;
    charges = done.renewal?.nextPlayerSeq ?? 0;
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
  return { out, reports, charges };
}

describe("a captação não muda a carreira sem trazer ninguém (040 SC-002)", () => {
  it("sem região: igual com e sem o módulo de captação", async () => {
    const withFeature = digest(await load());
    vi.resetModules();
    vi.doMock("../../src/scouting/recruitment", async (original) => {
      const real = await original<typeof import("../../src/scouting/recruitment")>();
      return { ...real, recruitmentAfterRound: (scouting: unknown) => scouting };
    });
    const without = digest(await load());
    vi.doUnmock("../../src/scouting/recruitment");
    vi.resetModules();
    expect(withFeature.reports).toBe(0);
    expect(without.out).toEqual(withFeature.out);
  }, 600_000);

  it("com região e indicações, sem trazer: igual ao sem região e sem mexer na numeração", async () => {
    const engine = await load();
    const none = digest(engine);
    const region = digest(engine, true);
    expect(region.reports).toBeGreaterThan(0);
    expect(region.charges).toBe(none.charges);
    expect(region.out).toEqual(none.out);
  }, 600_000);
});
