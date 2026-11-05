import { describe, expect, it } from "vitest";
import { FORMATION_IDS, FORMATIONS, type FormationId } from "../../../src/match/formations";
import { PLAY_REALISM_LIMITS as L } from "../../../src/match/limits";
import type { MatchInput, MatchResult, Side } from "../../../src/match/types";
import type { Position } from "../../../src/model/catalogs";
import { createRng } from "../../../src/rng/xoshiro";
import { clubIds, squadOf, testWorld, withStrengthDelta } from "../helpers/teams";
import { cloneSquad, play, team } from "./harness";

// 033 FR-019/FR-020 (Princípio V): as jogadas da partida completa ficam nas faixas declaradas.
const SAMPLE = 3000;

interface Sample {
  input: MatchInput;
  result: MatchResult;
}

/** Amostra "de campeonato", como `runLeagueSample`, guardando entrada e resultado. */
function leagueSample(n: number, seed: string): Sample[] {
  const world = testWorld();
  const divisions = world.competitions.flatMap((competition) => competition.divisions);
  const rng = createRng(seed);
  const out: Sample[] = [];
  for (let index = 0; index < n; index++) {
    const division = divisions[index % divisions.length];
    if (!division) continue;
    const [homeId, awayId] = rng.shuffle(division.clubIds) as [string, string];
    const input: MatchInput = {
      home: team(homeId, squadOf(homeId), rng.pick(FORMATION_IDS) as FormationId),
      away: team(awayId, squadOf(awayId), rng.pick(FORMATION_IDS) as FormationId),
      seed: `${seed}:${index}`,
    };
    out.push({ input, result: play(input) });
  }
  return out;
}

function sideTotals(sample: Sample, side: Side) {
  const ids = new Set(sample.input[side].squad.map((player) => player.id));
  const total = { passes: 0, completed: 0, keyPasses: 0, tacklesWon: 0, interceptions: 0 };
  for (const [playerId, line] of Object.entries(sample.result.players)) {
    if (!ids.has(playerId) || !line.plays) continue;
    total.passes += line.plays.passes;
    total.completed += line.plays.passesCompleted;
    total.keyPasses += line.plays.keyPasses;
    total.tacklesWon += line.plays.tacklesWon;
    total.interceptions += line.plays.interceptions;
  }
  return total;
}

/** Jogadas por minuto de quem jogou a partida inteira na vaga de titular, por posição da vaga. */
function perPosition(samples: readonly Sample[]) {
  const sum = new Map<
    Position,
    { minutes: number; defensive: number; passes: number; keyPasses: number }
  >();
  for (const sample of samples) {
    for (const side of ["home", "away"] as const) {
      const lineup = sample.input[side].lineup;
      const slots = FORMATIONS[lineup.formation].slots;
      const moved = sample.result.events.some(
        (event) =>
          (event.type === "formation_change" ||
            event.type === "positions_change" ||
            event.type === "reorganization") &&
          event.side === side,
      );
      if (moved) continue;
      for (const slot of slots) {
        const line = sample.result.players[lineup.starters[slot.id] ?? ""];
        if (!line?.plays || line.subbedOut !== null || line.sentOff) continue;
        const entry = sum.get(slot.position) ?? {
          minutes: 0,
          defensive: 0,
          passes: 0,
          keyPasses: 0,
        };
        entry.minutes += line.minutesPlayed;
        entry.defensive += line.plays.tacklesWon + line.plays.interceptions;
        entry.passes += line.plays.passes;
        entry.keyPasses += line.plays.keyPasses;
        sum.set(slot.position, entry);
      }
    }
  }
  const rate = (positions: Position[], key: "defensive" | "passes" | "keyPasses") => {
    let value = 0;
    let minutes = 0;
    for (const position of positions) {
      value += sum.get(position)?.[key] ?? 0;
      minutes += sum.get(position)?.minutes ?? 0;
    }
    return value / minutes;
  };
  return rate;
}

describe("jogadas com cara de futebol (033 FR-019, SC-003)", () => {
  const samples = leagueSample(SAMPLE, "jogadas-liga");
  const teams = samples.flatMap((sample) => [
    sideTotals(sample, "home"),
    sideTotals(sample, "away"),
  ]);
  const mean = (pick: (entry: (typeof teams)[number]) => number) =>
    teams.reduce((acc, entry) => acc + pick(entry), 0) / teams.length;
  const inRange = (value: number, [min, max]: readonly [number, number]) => {
    expect(value).toBeGreaterThanOrEqual(min);
    expect(value).toBeLessThanOrEqual(max);
  };

  it("médias por time dentro das faixas", () => {
    inRange(
      mean((entry) => entry.passes),
      L.passesPerTeam,
    );
    inRange(mean((entry) => entry.completed) / mean((entry) => entry.passes), L.passAccuracy);
    inRange(
      mean((entry) => entry.tacklesWon),
      L.tacklesWonPerTeam,
    );
    inRange(
      mean((entry) => entry.interceptions),
      L.interceptionsPerTeam,
    );
    inRange(
      mean((entry) => entry.keyPasses),
      L.keyPassesPerTeam,
    );
  });

  it("zagueiros e volantes desarmam e interceptam mais; meias passam mais (FR-020, SC-004)", () => {
    const rate = perPosition(samples);
    expect(
      rate(["CB", "DM"], "defensive") / rate(["MF", "FW"], "defensive"),
    ).toBeGreaterThanOrEqual(L.minDefensiveRatio);
    expect(rate(["MF"], "passes") / rate(["CB"], "passes")).toBeGreaterThanOrEqual(
      L.minPassingRatio,
    );
    expect(rate(["MF"], "keyPasses") / rate(["CB"], "keyPasses")).toBeGreaterThanOrEqual(
      L.minPassingRatio,
    );
  });

  it("quem tem mais posse passa mais (FR-020)", () => {
    let games = 0;
    let more = 0;
    for (const sample of samples) {
      const gap = sample.result.stats.home.possession - sample.result.stats.away.possession;
      if (Math.abs(gap) < L.possessionGap) continue;
      games += 1;
      const home = sideTotals(sample, "home").passes;
      const away = sideTotals(sample, "away").passes;
      if (gap > 0 ? home > away : away > home) more += 1;
    }
    expect(games).toBeGreaterThan(100);
    expect(more / games).toBeGreaterThanOrEqual(L.minPossessionPassRate);
  });
}, 300_000);

describe("jogador mais forte acerta mais passes (FR-020)", () => {
  it("o mesmo elenco com força +10 tem aproveitamento maior", () => {
    const accuracy = (delta: number) => {
      let passes = 0;
      let completed = 0;
      for (const clubId of clubIds().slice(0, 15)) {
        const squad = withStrengthDelta(squadOf(clubId), delta);
        const a = team(
          `${clubId}-forca${delta}`,
          cloneSquad(squad, `f${delta}-`, `${clubId}-f${delta}`),
        );
        const b = team(`${clubId}-rival`, cloneSquad(squadOf(clubId), "r-", `${clubId}-r`));
        for (let index = 0; index < 20; index++) {
          const result = play({ home: a, away: b, seed: `forca:${clubId}:${index}` });
          for (const player of a.squad) {
            const plays = result.players[player.id]?.plays;
            if (!plays) continue;
            passes += plays.passes;
            completed += plays.passesCompleted;
          }
        }
      }
      return completed / passes;
    };
    expect(accuracy(10)).toBeGreaterThan(accuracy(0));
  }, 300_000);
});
