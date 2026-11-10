import { describe, expect, it } from "vitest";
import { advanceCareerDays } from "../../src/career/day";
import type { CareerSeasonState } from "../../src/career/season-state";
import { emptyAcademy } from "../../src/renewal/academy";
import { referenceMonthlyPayroll } from "../../src/renewal/academy-levels";
import {
  advanceReport,
  gradeOf,
  pruneScouting,
  scoutingAfterRound,
} from "../../src/scouting/round";
import {
  attributeSteps,
  DEFAULT_SCOUTING,
  scoutingCost,
  scoutingRules,
  stepsToComplete,
  targetWidth,
} from "../../src/scouting/rules";
import {
  emptyScouting,
  setScoutingLevel,
  unwatchPlayer,
  watchPlayer,
} from "../../src/scouting/state";
import type { ScoutingState } from "../../src/scouting/types";
import { scoutingPanel, scoutReportOf } from "../../src/scouting/view";
import { MANAGER, newState } from "../career/day-helpers";
import { testWorld } from "../career/helpers";
import { clubOfCountry, worldBank, worldState } from "../career/world-helpers";

// 039: regras, comandos, avanço por rodada e por país, graus, elenco próprio e limpeza.

const SEED = "olheiros-039";

function ok<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result as Extract<T, { ok: true }>;
}

let cached: CareerSeasonState | undefined;
function base(): CareerSeasonState {
  cached ??= { ...newState(testWorld(), SEED, { systems: true }), scouting: emptyScouting() };
  return cached;
}

const others = (state: CareerSeasonState) =>
  state.world.players.filter((player) => player.clubId !== MANAGER);

describe("regras (039 R3)", () => {
  it("etapas até o completo, tempo mínimo dos atributos e largura alvo", () => {
    const rules = DEFAULT_SCOUTING;
    expect([1, 2, 3, 4, 5].map((level) => stepsToComplete(rules, level))).toEqual([10, 6, 5, 4, 4]);
    expect([1, 2, 3, 4, 5].map((level) => attributeSteps(rules, level))).toEqual([5, 3, 3, 2, 2]);
    expect(targetWidth(rules, 1, 1)).toBe(23);
    expect(targetWidth(rules, 5, 1)).toBe(19);
    expect(targetWidth(rules, 5, 99)).toBe(6);
  });

  it("custo: 0 fechado e a % da folha de referência aberto", () => {
    const world = base().world;
    expect(scoutingCost(world, MANAGER, 0)).toBe(0);
    expect(scoutingCost(world, MANAGER, 3)).toBe(
      Math.round((referenceMonthlyPayroll(world, MANAGER) * 3) / 100),
    );
    expect(scoutingRules(world, MANAGER)).toEqual(DEFAULT_SCOUTING);
  });

  it("graus por cortes fixos", () => {
    expect([1, 33, 34, 66, 67, 100].map(gradeOf)).toEqual([1, 1, 2, 2, 3, 3]);
  });
});

describe("comandos (039 FR-002, FR-006, FR-012)", () => {
  it("começa fechado; abrir, observar até as vagas, cancelar e mudar de nível", () => {
    const state = base();
    expect(scoutingPanel(state)).toMatchObject({ level: 0, slots: 0, used: 0, monthlyCost: 0 });
    expect(watchPlayer(state, others(state)[0]?.id ?? "", SEED)).toEqual({
      ok: false,
      error: "scouting.closed",
    });
    let next = ok(setScoutingLevel(state, 1)).state;
    expect(scoutingPanel(next)).toMatchObject({ level: 1, slots: 3, used: 0 });
    const ids = others(state)
      .slice(0, 4)
      .map((player) => player.id);
    for (const id of ids.slice(0, 3)) next = ok(watchPlayer(next, id, SEED)).state;
    expect(watchPlayer(next, ids[3] ?? "", SEED)).toEqual({ ok: false, error: "scouting.no_slot" });
    expect(watchPlayer(next, ids[0] ?? "", SEED)).toEqual({
      ok: false,
      error: "scouting.already_watching",
    });
    const own = state.world.players.find((player) => player.clubId === MANAGER)?.id ?? "";
    expect(watchPlayer(next, own, SEED)).toEqual({ ok: false, error: "scouting.own_player" });
    expect(watchPlayer(next, "jogador-nao-existe", SEED)).toEqual({
      ok: false,
      error: "scouting.not_found",
    });
    // A faixa inicial contém o potencial e tem no máximo a largura inicial.
    for (const id of ids.slice(0, 3)) {
      const report = next.scouting?.reports[id];
      const player = state.world.players.find((entry) => entry.id === id);
      if (!report || !player) throw new Error("sem relatório");
      expect(report.estimate.low).toBeLessThanOrEqual(player.hidden.potential);
      expect(report.estimate.high).toBeGreaterThanOrEqual(player.hidden.potential);
      expect(report.estimate.high - report.estimate.low).toBeLessThanOrEqual(24);
    }
    // Cancelar libera a vaga e guarda o relatório; observar de novo continua o mesmo.
    const before = next.scouting?.reports[ids[0] ?? ""];
    next = ok(unwatchPlayer(next, ids[0] ?? "")).state;
    expect(next.scouting?.reports[ids[0] ?? ""]).toEqual(before);
    next = ok(watchPlayer(next, ids[0] ?? "", SEED)).state;
    expect(next.scouting?.reports[ids[0] ?? ""]).toEqual(before);
    // Baixar para um nível com menos vagas cancela as mais recentes; fechar cancela todas.
    next = ok(setScoutingLevel(next, 5)).state;
    next = ok(watchPlayer(next, ids[3] ?? "", SEED)).state;
    const lowered = ok(setScoutingLevel(next, 1));
    expect(lowered.cancelled).toEqual([ids[3]]);
    const closed = ok(setScoutingLevel(lowered.state, 0));
    expect(closed.state.scouting?.watch).toEqual([]);
    expect(closed.state.scouting?.level).toBe(0);
    expect(Object.keys(closed.state.scouting?.reports ?? {})).toHaveLength(4);
    expect(setScoutingLevel(state, 6)).toEqual({ ok: false, error: "scouting.invalid_level" });
  });

  it("departamento de outro clube (técnico trocou de clube) conta como fechado", () => {
    const state = ok(setScoutingLevel(base(), 3)).state;
    const id = others(state)[0]?.id ?? "";
    const watching = ok(watchPlayer(state, id, SEED)).state;
    if (!watching.board || !watching.scouting) throw new Error("sem diretoria");
    const moved: CareerSeasonState = {
      ...watching,
      board: { ...watching.board, manager: { ...watching.board.manager, clubId: "clube-002" } },
    };
    expect(scoutingPanel(moved).level).toBe(0);
    expect(watchPlayer(moved, others(state)[1]?.id ?? "", SEED)).toEqual({
      ok: false,
      error: "scouting.closed",
    });
    const unemployed: CareerSeasonState = {
      ...watching,
      board: { ...watching.board, manager: { ...watching.board.manager, clubId: null } },
    };
    expect(scoutingPanel(unemployed).level).toBe(0);
    // O relatório continua visível.
    expect(scoutReportOf(unemployed, id)).toBeDefined();
  });
});

describe("avanço por rodada (039 R2, R4, R5)", () => {
  it("observados avançam pela liga do país deles; livres pela do técnico; graus no tempo mínimo", () => {
    const world = worldBank();
    const manager = clubOfCountry(world, 0);
    const state = {
      ...worldState(world, SEED, manager),
      scouting: { ...emptyScouting(), clubId: manager, level: 5 } as ScoutingState,
    };
    const home = world.clubs.find((club) => club.id === manager)?.countryId;
    const foreignClub = world.clubs.find((club) => club.countryId !== home);
    const local = world.players.find(
      (p) => p.clubId !== manager && world.clubs.find((c) => c.id === p.clubId)?.countryId === home,
    );
    const abroad = world.players.find((p) => p.clubId === foreignClub?.id);
    if (!local || !abroad || !foreignClub) throw new Error("mundo sem jogadores");
    let next = ok(watchPlayer(state, local.id, SEED)).state;
    next = ok(watchPlayer(next, abroad.id, SEED)).state;
    const scouting = next.scouting ?? emptyScouting();
    const homeLeague = next.league;
    const foreignLeague = next.competitions.find(
      (entry) =>
        world.competitions.find((c) => c.id === entry.competitionId)?.countryId ===
        foreignClub.countryId,
    );
    if (!foreignLeague) throw new Error("sem liga estrangeira");
    const context = { world, careerSeed: SEED, managerClubId: manager, renewal: next.renewal };
    const afterHome = scoutingAfterRound(scouting, { ...context, league: homeLeague, round: 1 });
    expect(afterHome.reports[local.id]?.steps).toBe(1);
    expect(afterHome.reports[abroad.id]?.steps).toBe(0);
    expect(afterHome.reports[local.id]?.updated).toEqual({ season: homeLeague.number, round: 1 });
    const afterForeign = scoutingAfterRound(afterHome, {
      ...context,
      league: foreignLeague,
      round: 1,
    });
    expect(afterForeign.reports[abroad.id]?.steps).toBe(1);
    expect(afterForeign.reports[local.id]?.steps).toBe(1);
    // Elenco do técnico: relatório automático na liga dele.
    const ownId = world.players.find((p) => p.clubId === manager)?.id ?? "";
    expect(afterHome.reports[ownId]?.steps).toBe(1);
    expect(afterForeign.reports[ownId]?.steps).toBe(1);
    // Graus: nenhum antes do tempo mínimo (2 no nível 5), presentes depois.
    expect(afterHome.reports[local.id]?.temperament).toBeUndefined();
    const again = scoutingAfterRound(afterForeign, { ...context, league: homeLeague, round: 2 });
    expect(again.reports[local.id]?.temperament).toBe(gradeOf(local.hidden.temperament));
    expect(again.reports[local.id]?.injury).toBe(gradeOf(local.hidden.injuryProneness));
    // Livre: avança pela liga do país do técnico.
    const free = { ...abroad, id: "jogador-livre-1" };
    const { clubId: _club, contract: _contract, ...freePlayer } = free;
    const withFree = ok(
      watchPlayer(
        {
          ...next,
          market: next.market
            ? { ...next.market, freeAgents: [{ player: freePlayer, sinceYear: 2026 }] }
            : next.market,
          scouting: { ...scouting, watch: [] },
        } as unknown as CareerSeasonState,
        free.id,
        SEED,
      ),
    ).state;
    const freeRound = scoutingAfterRound(withFree.scouting ?? emptyScouting(), {
      ...context,
      league: homeLeague,
      round: 3,
      freeAgents: withFree.market?.freeAgents,
    });
    expect(freeRound.reports[free.id]?.steps).toBe(1);
  });

  it("elenco próprio avança mesmo fechado e parte da faixa da promoção (038)", () => {
    const state = base();
    const own = state.world.players.filter((player) => player.clubId === MANAGER);
    const promoted = own[0];
    if (!promoted || !state.renewal) throw new Error("sem elenco");
    const band = {
      low: Math.min(promoted.hidden.potential, Math.max(promoted.strength, 30)),
      high: Math.min(99, promoted.hidden.potential + 3),
    };
    const renewal = {
      ...state.renewal,
      academy: {
        ...emptyAcademy(),
        graduates: { [promoted.id]: { clubId: MANAGER, season: 1, estimate: band } },
      },
    };
    const after = scoutingAfterRound(emptyScouting(), {
      world: state.world,
      league: state.league,
      round: 1,
      careerSeed: SEED,
      managerClubId: MANAGER,
      renewal,
    });
    expect(Object.keys(after.reports)).toHaveLength(own.length);
    const report = after.reports[promoted.id];
    expect(report?.estimate.low).toBeGreaterThanOrEqual(band.low);
    expect(report?.estimate.high).toBeLessThanOrEqual(band.high);
    // Desempregado: nada avança.
    const none = scoutingAfterRound(emptyScouting(), {
      world: state.world,
      league: state.league,
      round: 1,
      careerSeed: SEED,
      managerClubId: "",
      renewal,
    });
    expect(none.reports).toEqual({});
  });

  it("limpeza: aposentados saem e o teto descarta os mais antigos fora da observação e do elenco", () => {
    const state = base();
    const players = others(state).slice(0, 5);
    const at = (round: number) => ({ season: 1, round });
    const reports = Object.fromEntries(
      players.map((player, index) => [
        player.id,
        { estimate: { low: 1, high: 99 }, steps: 1, updated: at(index) },
      ]),
    );
    const scouting: ScoutingState = {
      clubId: MANAGER,
      level: 1,
      watch: [{ playerId: players[0]?.id ?? "", since: at(0) }],
      reports: {
        ...reports,
        "jogador-aposentado": { estimate: { low: 1, high: 99 }, steps: 1, updated: at(9) },
      },
    };
    const world = {
      ...state.world,
      competitions: state.world.competitions.map((competition, index) =>
        index === 0
          ? {
              ...competition,
              economy: { ...(competition.economy ?? {}), scouting: { reportCap: 10 } },
            }
          : competition,
      ),
    } as typeof state.world;
    const pruned = pruneScouting(scouting, world, MANAGER);
    expect(pruned.reports["jogador-aposentado"]).toBeUndefined();
    expect(Object.keys(pruned.reports)).toHaveLength(5);
    // Com teto 3, saem os mais antigos que não estão em observação (o observado fica).
    const tight = {
      ...world,
      competitions: world.competitions.map((competition, index) =>
        index === 0
          ? {
              ...competition,
              economy: { ...(competition.economy ?? {}), scouting: { reportCap: 3 } },
            }
          : competition,
      ),
    } as typeof world;
    const capped = pruneScouting(pruned, tight, MANAGER);
    expect(Object.keys(capped.reports).sort()).toEqual(
      [players[0]?.id, players[3]?.id, players[4]?.id].sort(),
    );
  });
});

describe("no dia de jogos (039)", () => {
  it("relatórios avançam com as rodadas e a cobrança só existe com o departamento aberto", () => {
    const closed = ok(advanceCareerDays(base(), { days: 3 }, SEED, MANAGER)).state;
    expect(closed.finances.ledger.some((entry) => entry.category === "scouting")).toBe(false);
    const ownReports = Object.values(closed.scouting?.reports ?? {});
    expect(ownReports.length).toBeGreaterThan(0);
    const opened = ok(setScoutingLevel(base(), 3)).state;
    const id = others(opened)[0]?.id ?? "";
    const watching = ok(watchPlayer(opened, id, SEED)).state;
    const played = ok(advanceCareerDays(watching, { days: 3 }, SEED, MANAGER)).state;
    const charges = played.finances.ledger.filter((entry) => entry.category === "scouting");
    expect(charges.length).toBeGreaterThan(0);
    expect(charges.every((entry) => entry.clubId === MANAGER)).toBe(true);
    expect(played.scouting?.reports[id]?.steps ?? 0).toBeGreaterThan(0);
  });
});

describe("advanceReport nunca alarga (039 FR-009)", () => {
  it("baixar o nível no meio não alarga a faixa", () => {
    const player = {
      id: "x",
      strength: 40,
      hidden: { potential: 70, temperament: 50, injuryProneness: 50 },
    };
    let report = { estimate: { low: 60, high: 72 }, steps: 3, updated: { season: 1, round: 3 } };
    report = advanceReport(report, player, DEFAULT_SCOUTING, 1, SEED, { season: 1, round: 4 });
    expect(report.estimate.high - report.estimate.low).toBeLessThanOrEqual(12);
    expect(report.estimate.low).toBeGreaterThanOrEqual(60);
    expect(report.estimate.high).toBeLessThanOrEqual(72);
  });
});

describe("temporada inteira no nível 5 com 16 observações (039 T014)", () => {
  it("todo relatório contém os valores reais e os observados chegam ao completo", () => {
    let state = ok(setScoutingLevel(base(), 5)).state;
    for (const player of others(state).slice(0, 16)) {
      state = ok(watchPlayer(state, player.id, SEED)).state;
    }
    const done = ok(advanceCareerDays(state, { toEnd: true }, SEED, MANAGER)).state;
    const byId = new Map(done.world.players.map((player) => [player.id, player]));
    let checked = 0;
    for (const [playerId, report] of Object.entries(done.scouting?.reports ?? {})) {
      const player = byId.get(playerId);
      if (!player) continue;
      checked += 1;
      expect(report.estimate.low).toBeLessThanOrEqual(player.hidden.potential);
      expect(report.estimate.high).toBeGreaterThanOrEqual(player.hidden.potential);
      if (report.temperament) expect(report.temperament).toBe(gradeOf(player.hidden.temperament));
    }
    expect(checked).toBeGreaterThan(16);
    for (const entry of done.scouting?.watch ?? []) {
      expect(done.scouting?.reports[entry.playerId]?.steps ?? 0).toBeGreaterThanOrEqual(
        stepsToComplete(DEFAULT_SCOUTING, 5),
      );
    }
  }, 300_000);
});
