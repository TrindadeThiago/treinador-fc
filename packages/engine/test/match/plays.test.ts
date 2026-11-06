import { describe, expect, it } from "vitest";
import { applyChange } from "../../src/match/changes";
import { advanceMatch, simulateMatch, startMatch } from "../../src/match/engine";
import { FORMATIONS } from "../../src/match/formations";
import {
  livePlayTotals,
  type PlayStats,
  playStatsOf,
  playTotals,
  playTuple,
} from "../../src/match/plays";
import { summarizeMatch } from "../../src/match/summary";
import type { Decider, MatchInput, MatchResult, MatchState, Side } from "../../src/match/types";
import { clubIds, makeInput } from "./helpers/teams";

const ids = clubIds();

function inputAt(index: number, seed = "jogadas"): MatchInput {
  const home = ids[index % ids.length] as string;
  let away = ids[(index * 7 + 3) % ids.length] as string;
  if (away === home) away = ids[(index + 1) % ids.length] as string;
  return makeInput(home, away, { seed: `${seed}-${index}` });
}

function simulate(input: MatchInput): MatchResult {
  const result = simulateMatch(input);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.result;
}

function started(input: MatchInput): MatchState {
  const result = startMatch(input);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.state;
}

const sideOf = (input: MatchInput, playerId: string): Side =>
  input.home.squad.some((player) => player.id === playerId) ? "home" : "away";

describe("jogadas por jogador (033 FR-001 a FR-005, SC-001)", () => {
  const inputs = Array.from({ length: 80 }, (_, index) => inputAt(index));
  const results = inputs.map(simulate);

  it("todo jogador que jogou tem jogadas, e quem não jogou não tem", () => {
    for (const result of results) {
      for (const line of Object.values(result.players)) {
        if (line.minutesPlayed > 0) expect(line.plays).toBeDefined();
        else expect(line.plays).toBeUndefined();
      }
    }
  });

  it("certos ≤ tentados e decisivos ≥ assistências, para cada jogador", () => {
    for (const result of results) {
      for (const line of Object.values(result.players)) {
        const plays = line.plays as PlayStats | undefined;
        if (!plays) continue;
        expect(plays.passesCompleted).toBeLessThanOrEqual(plays.passes);
        expect(plays.tacklesWon).toBeLessThanOrEqual(plays.tackles);
        expect(plays.keyPasses).toBeGreaterThanOrEqual(line.assists);
        expect(plays.keyPasses).toBeLessThanOrEqual(plays.passesCompleted);
        for (const value of Object.values(plays)) {
          if (typeof value !== "number") continue;
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("decisivos do time ≤ finalizações; interceptações ≤ passes errados do adversário", () => {
    results.forEach((result, index) => {
      const input = inputs[index] as MatchInput;
      const totals = (side: Side) => {
        const sum = { passes: 0, completed: 0, keyPasses: 0, interceptions: 0, passing: 0 };
        for (const [playerId, line] of Object.entries(result.players)) {
          const plays = line.plays as PlayStats | undefined;
          if (!plays || sideOf(input, playerId) !== side) continue;
          sum.passes += plays.passes;
          sum.completed += plays.passesCompleted;
          sum.keyPasses += plays.keyPasses;
          sum.interceptions += plays.interceptions;
        }
        return sum;
      };
      for (const side of ["home", "away"] as const) {
        const other = side === "home" ? "away" : "home";
        expect(totals(side).keyPasses).toBeLessThanOrEqual(result.stats[side].shots);
        expect(totals(side).interceptions).toBeLessThanOrEqual(
          totals(other).passes - totals(other).completed,
        );
        expect(totals(side).passes).toBeGreaterThan(0);
      }
    });
  });
});

describe("jogadas determinísticas (033 FR-008)", () => {
  it("ao vivo, minuto a minuto, é igual a simular direto", () => {
    for (let index = 0; index < 10; index++) {
      const input = inputAt(index, "ao-vivo");
      let state = started(input);
      while (state.status !== "finished" && state.status !== "abandoned") {
        state = advanceMatch(state, { minutes: 1 });
      }
      const live = Object.fromEntries(
        [
          ...Object.entries(state.teams.home.players),
          ...Object.entries(state.teams.away.players),
        ].map(([id, player]) => [id, player.plays]),
      );
      const direct = Object.fromEntries(
        Object.entries(simulate(input).players).map(([id, line]) => [id, line.plays]),
      );
      expect(live).toEqual(direct);
    }
  });

  it("salvar e carregar no meio da partida não muda as jogadas", () => {
    const input = inputAt(3, "salvar");
    const half = advanceMatch(started(input), { minutes: 40 });
    const reloaded = JSON.parse(JSON.stringify(half)) as MatchState;
    const a = advanceMatch(half, { toEnd: true });
    const b = advanceMatch(reloaded, { toEnd: true });
    expect(b.teams).toEqual(a.teams);
  });

  it("avançar não altera as jogadas do estado anterior", () => {
    const input = inputAt(4, "copia");
    const before = advanceMatch(started(input), { minutes: 30 });
    const snapshot = JSON.stringify(before.teams);
    advanceMatch(before, { minutes: 30 });
    expect(JSON.stringify(before.teams)).toBe(snapshot);
  });
});

describe("jogadas e quem está em campo (033, casos de borda)", () => {
  it("quem entra só acumula depois da entrada; quem sai para de acumular", () => {
    const input = inputAt(5, "troca");
    let state = advanceMatch(started(input), { minutes: 60 });
    const team = state.teams.home;
    const slot = FORMATIONS[team.formation].slots[6] as { id: string };
    const out = team.onField[slot.id] as string;
    const sub = team.bench[0] as string;
    const outAt60 = { ...(team.players[out]?.plays as PlayStats) };
    expect(team.players[sub]?.plays).toBeUndefined();
    const changed = applyChange(state, "home", { type: "substitution", out, in: sub });
    if (!changed.ok) throw new Error(JSON.stringify(changed.error));
    state = advanceMatch(changed.state, { toEnd: true });
    expect(state.teams.home.players[out]?.plays).toEqual(outAt60);
    const subPlays = state.teams.home.players[sub]?.plays as PlayStats;
    expect(subPlays).toBeDefined();
    expect(subPlays.passes).toBeGreaterThan(0);
  });

  it("o expulso para de acumular no minuto em que sai", () => {
    const input = inputAt(6, "expulso");
    const state = advanceMatch(started(input), { minutes: 20 });
    const team = state.teams.home;
    const slot = FORMATIONS[team.formation].slots[4] as { id: string };
    const playerId = team.onField[slot.id] as string;
    team.onField[slot.id] = null;
    (team.players[playerId] as { sentOff: boolean }).sentOff = true;
    const at20 = { ...(team.players[playerId]?.plays as PlayStats) };
    const end = advanceMatch(state, { toEnd: true });
    expect(end.teams.home.players[playerId]?.plays).toEqual(at20);
  });

  it("a prorrogação acumula jogadas e a disputa de pênaltis não", () => {
    const zero = { goals: 0, awayGoals: 0 };
    const decider: Decider = {
      before: { home: zero, away: zero },
      awayGoals: false,
      extraTime: true,
    };
    let checked = 0;
    for (let index = 0; index < 300 && checked < 3; index++) {
      const input = { ...inputAt(index, "prorrogacao"), decider };
      let state = started(input);
      while (state.status !== "finished" && state.status !== "abandoned" && !state.extraTime) {
        state = advanceMatch(state, { minutes: 1 });
      }
      if (!state.extraTime) continue;
      const atRegulation = livePlayTotals(state, "home")?.passes ?? 0;
      while (state.status !== "penalties" && state.status !== "finished") {
        state = advanceMatch(state, { minutes: 1 });
      }
      const afterExtra = livePlayTotals(state, "home")?.passes ?? 0;
      expect(afterExtra).toBeGreaterThan(atRegulation);
      const end = advanceMatch(state, { toEnd: true });
      expect(livePlayTotals(end, "home")?.passes).toBe(afterExtra);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("a simulação resumida não tem jogadas", () => {
    const result = summarizeMatch(inputAt(7, "resumida"));
    for (const line of Object.values(result.players)) expect(line.plays).toBeUndefined();
  });
});

describe("tupla e totais (contrato engine-plays)", () => {
  it("a tupla ida e volta preserva as contagens", () => {
    const stats: PlayStats = {
      passes: 52,
      passesCompleted: 44,
      keyPasses: 2,
      tackles: 4,
      tacklesWon: 3,
      interceptions: 1,
      shots: 3,
      saves: 0,
      slotMinutes: { MF: 30, DM: 60 },
    };
    // A vaga com mais minutos vira o índice em POSITIONS (VOL = 3).
    expect(playTuple(stats)).toEqual([52, 44, 2, 4, 3, 1, 3, 0, 3]);
    const { slotMinutes: _slots, ...counts } = stats;
    expect(playStatsOf(playTuple(stats))).toEqual({ ...counts, position: "DM" });
    // A tupla de 6 (v19) fica sem finalizações, defesas e posição.
    expect(playStatsOf([52, 44, 2, 4, 3, 1])).toEqual({
      passes: 52,
      passesCompleted: 44,
      keyPasses: 2,
      tackles: 4,
      tacklesWon: 3,
      interceptions: 1,
      shots: 0,
      saves: 0,
    });
  });

  it("os totais somam as linhas do lado, com o aproveitamento; sem jogadas, nada", () => {
    const lines = {
      a: { side: "home" as const, plays: [10, 8, 1, 2, 1, 0, 2, 0, 4] },
      // Tupla de 6 (v19): sem finalizações nem defesas.
      b: { side: "home" as const, plays: [30, 24, 0, 0, 0, 3] },
      c: { side: "away" as const },
    };
    expect(playTotals(lines, "home")).toEqual({
      passes: 40,
      passesCompleted: 32,
      keyPasses: 1,
      tackles: 2,
      tacklesWon: 1,
      interceptions: 3,
      shots: 2,
      saves: 0,
      passAccuracy: 0.8,
    });
    expect(playTotals(lines, "away")).toBeUndefined();
  });
});

describe("finalizações, defesas e vaga (034 research R1)", () => {
  const input = inputAt(11, "extras");
  const result = simulate(input);
  const shotsBy = new Map<string, number>();
  const savesBy = new Map<string, number>();
  for (const event of result.events) {
    if (event.type !== "shot") continue;
    shotsBy.set(event.playerId, (shotsBy.get(event.playerId) ?? 0) + 1);
    if (event.outcome === "saved" && event.goalkeeperId) {
      savesBy.set(event.goalkeeperId, (savesBy.get(event.goalkeeperId) ?? 0) + 1);
    }
  }

  it("finalizações e defesas de cada jogador são as dos eventos", () => {
    for (const [playerId, line] of Object.entries(result.players)) {
      if (!line.plays) continue;
      expect(line.plays.shots).toBe(shotsBy.get(playerId) ?? 0);
      expect(line.plays.saves).toBe(savesBy.get(playerId) ?? 0);
    }
    expect([...savesBy.values()].reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });

  it("os minutos por vaga somam os minutos jogados, e a tupla leva a vaga com mais minutos", () => {
    const slots = FORMATIONS[input.home.lineup.formation].slots;
    for (const slot of slots) {
      const playerId = input.home.lineup.starters[slot.id] as string;
      const line = result.players[playerId];
      if (!line?.plays || line.subbedOut !== null || line.sentOff) continue;
      const minutes = Object.values(line.plays.slotMinutes ?? {}).reduce((a, b) => a + (b ?? 0), 0);
      expect(minutes).toBe(line.minutesPlayed);
      expect(playTuple(line.plays)).toHaveLength(9);
      expect(playStatsOf(playTuple(line.plays)).position).toBe(slot.position);
    }
  });

  it("depois de mudar de vaga, vale a vaga com mais minutos", () => {
    let state = advanceMatch(started(input), { minutes: 20 });
    const team = state.teams.home;
    const formation = team.formation === "4-3-3" ? "4-4-2" : "4-3-3";
    const slots = FORMATIONS[formation].slots;
    const assignment: Record<string, string | null> = {};
    const players = Object.values(team.onField).filter((id): id is string => id !== null);
    slots.forEach((slot, index) => {
      assignment[slot.id] = players[index] ?? null;
    });
    const changed = applyChange(state, "home", { type: "formation", formation, assignment });
    if (!changed.ok) throw new Error(JSON.stringify(changed.error));
    state = advanceMatch(changed.state, { toEnd: true });
    for (const slot of slots) {
      const playerId = assignment[slot.id];
      const plays = playerId ? state.teams.home.players[playerId]?.plays : undefined;
      if (!plays || !playerId) continue;
      const minutes = plays.slotMinutes ?? {};
      const best = Object.entries(minutes).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0];
      expect(playStatsOf(playTuple(plays)).position).toBe(best);
    }
  });
});
