import { describe, expect, it } from "vitest";
import { applyChange } from "../../src/match/changes";
import { advanceMatch, simulateMatch, startMatch } from "../../src/match/engine";
import { FORMATIONS } from "../../src/match/formations";
import type { MatchEvent, MatchInput, MatchState, Side } from "../../src/match/types";
import { liveRatingInputs, ratingInputs } from "../../src/rating/input";
import { toMatchRecord } from "../../src/season/record";
import type { MatchRecord } from "../../src/season/types";
import { clubIds, makeInput } from "../match/helpers/teams";

// 034 (T004): entradas da nota — gols sofridos com o jogador em campo, pênaltis cometidos,
// resultado — iguais a partir do registro e do estado ao vivo.
const ids = clubIds();

function inputAt(index: number, seed = "entradas"): MatchInput {
  const home = ids[index % ids.length] as string;
  let away = ids[(index * 7 + 3) % ids.length] as string;
  if (away === home) away = ids[(index + 1) % ids.length] as string;
  return makeInput(home, away, { seed: `${seed}-${index}` });
}

function playersOf(input: MatchInput) {
  return new Map([...input.home.squad, ...input.away.squad].map((player) => [player.id, player]));
}

function sides(input: MatchInput): Record<string, Side> {
  return Object.fromEntries([
    ...input.home.squad.map((player) => [player.id, "home" as const]),
    ...input.away.squad.map((player) => [player.id, "away" as const]),
  ]);
}

function recordOf(input: MatchInput, state: MatchState): MatchRecord {
  const simulated = simulateMatch(input);
  if (!simulated.ok) throw new Error("simulação falhou");
  void state;
  return toMatchRecord(1, input.home.clubId, input.away.clubId, simulated.result, sides(input), {
    home: [],
    away: [],
  });
}

function played(input: MatchInput): MatchState {
  const started = startMatch(input);
  if (!started.ok) throw new Error("entrada inválida");
  return advanceMatch(started.state, { toEnd: true });
}

describe("entradas da nota (034 research R5)", () => {
  it("do registro e do estado final da mesma partida são iguais", () => {
    for (let index = 0; index < 40; index++) {
      const input = inputAt(index);
      const state = played(input);
      const fromRecord = ratingInputs(recordOf(input, state), playersOf(input));
      const live = liveRatingInputs(state, playersOf(input));
      const byId = (list: typeof live) =>
        Object.fromEntries(list.map((entry) => [entry.playerId, entry]));
      const record = byId(fromRecord);
      for (const entry of live) {
        const { plays: livePlays, ...rest } = entry;
        const { plays: recordPlays, ...recordRest } = record[entry.playerId] ?? {};
        expect(recordRest).toEqual(rest);
        if (livePlays) {
          const { slotMinutes: _s, ...counts } = livePlays;
          const { position: _p, ...recordCounts } = recordPlays ?? {};
          expect(recordCounts).toEqual(counts);
        }
      }
    }
  });

  it("gols sofridos contam só com o jogador em campo; resultado de cada lado", () => {
    for (let index = 0; index < 60; index++) {
      const input = inputAt(index, "sofridos");
      const state = played(input);
      const inputs = liveRatingInputs(state, playersOf(input));
      const goals = (side: Side) => state.score[side];
      for (const entry of inputs) {
        const other = entry.side === "home" ? "away" : "home";
        expect(entry.goalsConceded).toBeLessThanOrEqual(goals(other));
        expect(entry.result).toBe(
          goals(entry.side) > goals(other)
            ? "win"
            : goals(entry.side) === goals(other)
              ? "draw"
              : "loss",
        );
      }
      // Quem jogou os 90 minutos inteiros respondeu por todos os gols do adversário.
      for (const entry of inputs) {
        const player = state.teams[entry.side].players[entry.playerId];
        if (!player || player.subbedIn !== null || player.subbedOut !== null || player.sentOff)
          continue;
        const other = entry.side === "home" ? "away" : "home";
        expect(entry.goalsConceded).toBe(goals(other));
      }
    }
  });

  it("o titular que sai antes de um gol não responde por ele, e o reserva só pelos seguintes", () => {
    const input = inputAt(2, "troca");
    let state = advanceMatch((startMatch(input) as { ok: true; state: MatchState }).state, {
      minutes: 45,
    });
    const slot = FORMATIONS[state.teams.home.formation].slots[2] as { id: string };
    const out = state.teams.home.onField[slot.id] as string;
    const sub = state.teams.home.bench[0] as string;
    const changed = applyChange(state, "home", { type: "substitution", out, in: sub });
    if (!changed.ok) throw new Error(JSON.stringify(changed.error));
    state = advanceMatch(changed.state, { toEnd: true });
    const subSeq = state.events.find(
      (event): event is Extract<MatchEvent, { type: "substitution" }> =>
        event.type === "substitution" && event.outId === out,
    )?.seq as number;
    const awayGoals = state.events.filter(
      (event) => event.type === "shot" && event.outcome === "goal" && event.side === "away",
    );
    const before = awayGoals.filter((event) => event.seq < subSeq).length;
    const after = awayGoals.length - before;
    const inputs = liveRatingInputs(state, playersOf(input));
    expect(inputs.find((entry) => entry.playerId === out)?.goalsConceded).toBe(before);
    expect(inputs.find((entry) => entry.playerId === sub)?.goalsConceded).toBe(after);
  });

  it("pênaltis cometidos vêm de quem fez a falta", () => {
    let found = 0;
    for (let index = 0; index < 200 && found < 5; index++) {
      const input = inputAt(index, "penalti");
      const state = played(input);
      const fouls = state.events.filter((event) => event.type === "penalty_awarded");
      if (fouls.length === 0) continue;
      const inputs = liveRatingInputs(state, playersOf(input));
      for (const foul of fouls) {
        if (foul.type !== "penalty_awarded") continue;
        expect(
          inputs.find((entry) => entry.playerId === foul.foulerId)?.penaltiesConceded,
        ).toBeGreaterThan(0);
      }
      found += 1;
    }
    expect(found).toBeGreaterThan(0);
  });
});
