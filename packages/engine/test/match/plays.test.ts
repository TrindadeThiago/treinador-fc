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
    };
    expect(playTuple(stats)).toEqual([52, 44, 2, 4, 3, 1]);
    expect(playStatsOf(playTuple(stats))).toEqual(stats);
  });

  it("os totais somam as linhas do lado, com o aproveitamento; sem jogadas, nada", () => {
    const lines = {
      a: {
        side: "home" as const,
        plays: playTuple({
          passes: 10,
          passesCompleted: 8,
          keyPasses: 1,
          tackles: 2,
          tacklesWon: 1,
          interceptions: 0,
        }),
      },
      b: {
        side: "home" as const,
        plays: playTuple({
          passes: 30,
          passesCompleted: 24,
          keyPasses: 0,
          tackles: 0,
          tacklesWon: 0,
          interceptions: 3,
        }),
      },
      c: { side: "away" as const },
    };
    expect(playTotals(lines, "home")).toEqual({
      passes: 40,
      passesCompleted: 32,
      keyPasses: 1,
      tackles: 2,
      tacklesWon: 1,
      interceptions: 3,
      passAccuracy: 0.8,
    });
    expect(playTotals(lines, "away")).toBeUndefined();
  });
});
