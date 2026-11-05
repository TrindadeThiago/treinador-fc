// Simula muitas partidas entre clubes do banco padrão e compara as métricas com as faixas de
// realismo. Uso: pnpm sim:matches [--n 10000] [--seed calibragem]
import { parseArgs } from "node:util";
import {
  autoLineup,
  checkRealism,
  completeHiddenAttributes,
  createMetricsAccumulator,
  createRng,
  FORMATION_IDS,
  FORMATIONS,
  type FormationId,
  generateDefaultBank,
  type Lineup,
  type MatchInput,
  PLAY_REALISM_LIMITS,
  type Position,
  simulateMatch,
} from "@brasfoot-like/engine";
import { DEFAULT_SEED } from "./default-seed";

const { values } = parseArgs({
  options: {
    n: { type: "string", default: "10000" },
    seed: { type: "string", default: "calibragem" },
  },
});

const matches = Number(values.n);
const seed = values.seed ?? "calibragem";
const world = completeHiddenAttributes(generateDefaultBank({ seed: DEFAULT_SEED }), "sim-matches");
const squads = new Map<string, typeof world.players>();
for (const player of world.players) {
  const squad = squads.get(player.clubId) ?? [];
  squad.push(player);
  squads.set(player.clubId, squad);
}
const lineups = new Map<string, Lineup>();
function lineupFor(clubId: string, formation: FormationId): Lineup {
  const key = `${clubId}|${formation}`;
  let lineup = lineups.get(key);
  if (!lineup) {
    const result = autoLineup({ squad: squads.get(clubId) ?? [], formation, benchLimit: 7 });
    if (!result.ok) throw new Error(`escalação impossível para ${clubId}`);
    lineup = result.lineup;
    lineups.set(key, lineup);
  }
  return lineup;
}

const divisions = world.competitions.flatMap((competition) => competition.divisions);
const rng = createRng(seed);
const metrics = createMetricsAccumulator();
// Jogadas (033): totais por time e por minuto em cada posição de vaga (titulares do jogo inteiro).
const plays = { teams: 0, passes: 0, completed: 0, tacklesWon: 0, interceptions: 0, keyPasses: 0 };
const byPosition = new Map<Position, { minutes: number; defensive: number; passes: number }>();
const started = performance.now();
for (let index = 0; index < matches; index++) {
  const division = divisions[index % divisions.length];
  if (!division) continue;
  const [home, away] = rng.shuffle(division.clubIds) as [string, string];
  const input: MatchInput = {
    home: {
      clubId: home,
      squad: squads.get(home) ?? [],
      lineup: lineupFor(home, rng.pick(FORMATION_IDS)),
    },
    away: {
      clubId: away,
      squad: squads.get(away) ?? [],
      lineup: lineupFor(away, rng.pick(FORMATION_IDS)),
    },
    seed: `${seed}:${index}`,
  };
  const outcome = simulateMatch(input);
  if (!outcome.ok) throw new Error(JSON.stringify(outcome.errors));
  metrics.add(input, outcome.result);
  for (const side of ["home", "away"] as const) {
    plays.teams += 1;
    const lineup = input[side].lineup;
    for (const player of input[side].squad) {
      const line = outcome.result.players[player.id]?.plays;
      if (!line) continue;
      plays.passes += line.passes;
      plays.completed += line.passesCompleted;
      plays.tacklesWon += line.tacklesWon;
      plays.interceptions += line.interceptions;
      plays.keyPasses += line.keyPasses;
    }
    for (const slot of FORMATIONS[lineup.formation].slots) {
      const state = outcome.result.players[lineup.starters[slot.id] ?? ""];
      if (!state?.plays || state.subbedOut !== null || state.sentOff) continue;
      const entry = byPosition.get(slot.position) ?? { minutes: 0, defensive: 0, passes: 0 };
      entry.minutes += state.minutesPlayed;
      entry.defensive += state.plays.tacklesWon + state.plays.interceptions;
      entry.passes += state.plays.passes;
      byPosition.set(slot.position, entry);
    }
  }
}
const elapsed = (performance.now() - started) / 1000;

const summary = metrics.summary();
const checks = checkRealism(summary);
const format = (value: number) => (Number.isFinite(value) ? value.toFixed(3) : "∞");
console.log(`${summary.matches} partidas em ${elapsed.toFixed(1)} s (seed "${seed}")\n`);
for (const check of checks) {
  const limit = `${check.min ?? ""}${check.min !== undefined && check.max !== undefined ? "–" : ""}${check.max ?? ""}`;
  const bound =
    check.min !== undefined && check.max === undefined
      ? `≥ ${limit}`
      : check.max !== undefined && check.min === undefined
        ? `≤ ${limit}`
        : limit;
  console.log(
    `${check.ok ? "✓" : "✗"} ${check.metric.padEnd(24)} ${format(check.value).padStart(8)}   ${bound}`,
  );
}
const L = PLAY_REALISM_LIMITS;
const per = (positions: Position[], key: "defensive" | "passes") => {
  let value = 0;
  let minutes = 0;
  for (const position of positions) {
    value += byPosition.get(position)?.[key] ?? 0;
    minutes += byPosition.get(position)?.minutes ?? 0;
  }
  return value / minutes;
};
const playChecks: { metric: string; value: number; min?: number; max?: number }[] = [
  {
    metric: "passesPerTeam",
    value: plays.passes / plays.teams,
    min: L.passesPerTeam[0],
    max: L.passesPerTeam[1],
  },
  {
    metric: "passAccuracy",
    value: plays.completed / plays.passes,
    min: L.passAccuracy[0],
    max: L.passAccuracy[1],
  },
  {
    metric: "tacklesWonPerTeam",
    value: plays.tacklesWon / plays.teams,
    min: L.tacklesWonPerTeam[0],
    max: L.tacklesWonPerTeam[1],
  },
  {
    metric: "interceptionsPerTeam",
    value: plays.interceptions / plays.teams,
    min: L.interceptionsPerTeam[0],
    max: L.interceptionsPerTeam[1],
  },
  {
    metric: "keyPassesPerTeam",
    value: plays.keyPasses / plays.teams,
    min: L.keyPassesPerTeam[0],
    max: L.keyPassesPerTeam[1],
  },
  {
    metric: "defensiveRatio",
    value: per(["CB", "DM"], "defensive") / per(["MF", "FW"], "defensive"),
    min: L.minDefensiveRatio,
  },
  {
    metric: "passingRatio",
    value: per(["MF"], "passes") / per(["CB"], "passes"),
    min: L.minPassingRatio,
  },
];
const playsOk = playChecks.every(
  (check) =>
    (check.min === undefined || check.value >= check.min) &&
    (check.max === undefined || check.value <= check.max),
);
console.log("\njogadas (033)");
for (const check of playChecks) {
  const ok =
    (check.min === undefined || check.value >= check.min) &&
    (check.max === undefined || check.value <= check.max);
  const bound = check.max === undefined ? `≥ ${check.min}` : `${check.min}–${check.max}`;
  console.log(
    `${ok ? "✓" : "✗"} ${check.metric.padEnd(24)} ${format(check.value).padStart(8)}   ${bound}`,
  );
}
console.log(
  `\n  (informativo) vitórias do mandante ${format(summary.homeWinRate)}, do visitante ${format(summary.awayWinRate)}`,
);
process.exit(checks.every((check) => check.ok) && playsOk ? 0 : 1);
