import { describe, expect, it, vi } from "vitest";
import type { CareerSeasonState } from "../../src/career/season-state";

// 039 SC-004, FR-020: com o departamento de olheiros fechado, a mesma seed dá a mesma carreira com e
// sem os olheiros. A carreira "sem" troca o avanço dos relatórios por uma versão que não faz nada;
// tudo o que é resultado do jogo (mundo, tabelas, mercado, livro-caixa, base, regulador, diretoria e
// torcida) tem de ser idêntico, e nenhuma cobrança de olheiros pode aparecer.

const SEED = "neutra-039";
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

function digest(engine: Engine): { out: unknown[]; reports: number; charges: number } {
  let state: CareerSeasonState = {
    ...engine.newState(engine.testWorld(), SEED, { systems: true }),
    scouting: { level: 0, watch: [], reports: {} },
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
    reports += Object.keys(done.scouting?.reports ?? {}).length;
    charges += done.finances.ledger.filter((entry) => entry.category === "scouting").length;
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

describe("os olheiros não mudam a carreira com o departamento fechado (039 SC-004)", () => {
  it("mesma seed, com e sem a feature", async () => {
    const withFeature = digest(await load());

    vi.resetModules();
    vi.doMock("../../src/scouting/round", async (original) => {
      const real = await original<typeof import("../../src/scouting/round")>();
      return { ...real, scoutingAfterRound: (scouting: unknown) => scouting };
    });
    const without = digest(await load());
    vi.doUnmock("../../src/scouting/round");
    vi.resetModules();

    // A troca valeu: com a feature há relatórios automáticos; sem ela, nenhum. Fechado, sem cobrança.
    expect(withFeature.reports).toBeGreaterThan(0);
    expect(without.reports).toBe(0);
    expect(withFeature.charges).toBe(0);
    expect(without.charges).toBe(0);
    expect(without.out).toEqual(withFeature.out);
  }, 600_000);
});
