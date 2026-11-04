import type { Position } from "../model/catalogs";
import type { Rng } from "../rng/xoshiro";
import { adequacy } from "./adequacy";
import { fieldPlayers, type MatchContext, opponent, playerState, strengthOf } from "./minute";
import type { FieldPlayer } from "./picker";
import { poisson } from "./poisson";
import { type ClockKey, minuteRng } from "./rng";
import { PLAYS_TUNING } from "./tuning";
import type { MatchState, PlayerMatchState, Side } from "./types";

/** Jogadas de um jogador numa partida completa (033 data-model). */
export interface PlayStats {
  passes: number;
  passesCompleted: number;
  keyPasses: number;
  tackles: number;
  tacklesWon: number;
  interceptions: number;
}

/** `[passes, passesCompleted, keyPasses, tackles, tacklesWon, interceptions]`: a forma do save. */
export type PlayTuple = readonly [number, number, number, number, number, number];

export interface PlayTotals extends PlayStats {
  /** Passes certos ÷ tentados; ausente sem passes. */
  passAccuracy: number | undefined;
}

export function emptyPlays(): PlayStats {
  return {
    passes: 0,
    passesCompleted: 0,
    keyPasses: 0,
    tackles: 0,
    tacklesWon: 0,
    interceptions: 0,
  };
}

export function playTuple(stats: PlayStats): PlayTuple {
  return [
    stats.passes,
    stats.passesCompleted,
    stats.keyPasses,
    stats.tackles,
    stats.tacklesWon,
    stats.interceptions,
  ];
}

export function playStatsOf(tuple: PlayTuple): PlayStats {
  const [passes, passesCompleted, keyPasses, tackles, tacklesWon, interceptions] = tuple;
  return { passes, passesCompleted, keyPasses, tackles, tacklesWon, interceptions };
}

function add(total: PlayStats, stats: PlayStats): void {
  total.passes += stats.passes;
  total.passesCompleted += stats.passesCompleted;
  total.keyPasses += stats.keyPasses;
  total.tackles += stats.tackles;
  total.tacklesWon += stats.tacklesWon;
  total.interceptions += stats.interceptions;
}

function withAccuracy(total: PlayStats): PlayTotals {
  return {
    ...total,
    passAccuracy: total.passes > 0 ? total.passesCompleted / total.passes : undefined,
  };
}

/**
 * Totais de um lado a partir das linhas do registro (`playerLines`): a soma das jogadas dos
 * jogadores do lado. Sem nenhuma linha com jogadas (resumida ou save antigo), nada.
 */
export function playTotals(
  lines: Readonly<Record<string, { side: Side; plays?: PlayTuple | undefined }>>,
  side: Side,
): PlayTotals | undefined {
  const total = emptyPlays();
  let any = false;
  for (const line of Object.values(lines)) {
    if (line.side !== side || !line.plays) continue;
    any = true;
    add(total, playStatsOf(line.plays));
  }
  return any ? withAccuracy(total) : undefined;
}

/** Totais de um lado durante a partida, a partir do estado (estatísticas ao vivo). */
export function livePlayTotals(state: MatchState, side: Side): PlayTotals | undefined {
  const total = emptyPlays();
  let any = false;
  for (const player of Object.values(state.teams[side].players)) {
    if (!player.plays) continue;
    any = true;
    add(total, player.plays);
  }
  return any ? withAccuracy(total) : undefined;
}

type Weights = Readonly<Record<Position, number>>;

/** Pesos acumulados dos jogadores em campo para um sorteio ponderado com um só número. */
function cumulative(field: readonly FieldPlayer[], weights: Weights): number[] {
  const out: number[] = [];
  let sum = 0;
  for (const entry of field) {
    sum += weights[entry.slotPosition];
    out.push(sum);
  }
  return out;
}

function pickIndex(rng: Rng, sums: readonly number[], skip = -1): number {
  const total = (sums.at(-1) ?? 0) - (skip >= 0 ? (sums[skip] ?? 0) - (sums[skip - 1] ?? 0) : 0);
  let target = rng.float() * total;
  for (let index = 0; index < sums.length; index++) {
    if (index === skip) continue;
    const weight = (sums[index] ?? 0) - (sums[index - 1] ?? 0);
    if (target < weight) return index;
    target -= weight;
  }
  // Arredondamento no fim da lista: o último que não é o pulado.
  for (let index = sums.length - 1; index >= 0; index--) if (index !== skip) return index;
  return 0;
}

const clamp = (value: number, [min, max]: readonly [number, number]) =>
  Math.min(max, Math.max(min, value));

function effective(entry: FieldPlayer): number {
  return entry.player.strength * adequacy(entry.player.position, entry.slotPosition);
}

function playsOf(state: MatchState, side: Side, playerId: string): PlayStats {
  const player: PlayerMatchState = playerState(state, side, playerId);
  if (!player.plays) player.plays = emptyPlays();
  return player.plays;
}

/**
 * Jogadas de um minuto (033 research R1 e R2), depois de finalizações, cartões e lesões: só
 * contagens, com um gerador próprio (`"plays"`) que não consome nada dos outros sorteios.
 * `eventsBefore` é o tamanho de `state.events` no início do minuto (as finalizações deste minuto
 * dão os passes decisivos).
 */
export function playMinutePlays(
  state: MatchState,
  context: MatchContext,
  clock: ClockKey,
  homeShare: number,
  eventsBefore: number,
): void {
  const rng = minuteRng(context.root, clock, "plays");
  const tuning = PLAYS_TUNING;
  const field = {
    home: fieldPlayers(state, "home", context),
    away: fieldPlayers(state, "away", context),
  };
  const strength = {
    home: strengthOf(state, "home", context),
    away: strengthOf(state, "away", context),
  };
  for (const side of ["home", "away"] as const) {
    const other = opponent(side);
    const mine = field[side];
    const theirs = field[other];
    if (mine.length === 0) continue;
    const share = side === "home" ? homeShare : 1 - homeShare;
    const presence = mine.length / 11;

    // Passes: pela posse do minuto; os errados podem virar interceptação do adversário.
    const passers = cumulative(mine, tuning.passWeight);
    const interceptors = theirs.length > 0 ? cumulative(theirs, tuning.interceptWeight) : [];
    const passes = poisson(rng, tuning.passesPerMinute * 2 * share * presence);
    for (let pass = 0; pass < passes; pass++) {
      const passer = mine[pickIndex(rng, passers)] as FieldPlayer;
      const stats = playsOf(state, side, passer.player.id);
      stats.passes += 1;
      const accuracy = clamp(
        tuning.passBase +
          tuning.passAdjust[passer.slotPosition] +
          tuning.passSlope * (effective(passer) - tuning.pivot) -
          tuning.passPressure * (strength[other].midfield - tuning.pivot),
        tuning.passRange,
      );
      if (rng.float() < accuracy) {
        stats.passesCompleted += 1;
      } else if (interceptors.length > 0 && rng.float() < tuning.interceptionShare) {
        const cutter = theirs[pickIndex(rng, interceptors)] as FieldPlayer;
        playsOf(state, other, cutter.player.id).interceptions += 1;
      }
    }

    // Desarmes: de quem está sem a bola, pela posse do adversário.
    if (theirs.length > 0) {
      const tacklers = cumulative(mine, tuning.tackleWeight);
      const tackles = poisson(rng, tuning.tacklesPerMinute * 2 * (1 - share) * presence);
      for (let tackle = 0; tackle < tackles; tackle++) {
        const tackler = mine[pickIndex(rng, tacklers)] as FieldPlayer;
        const stats = playsOf(state, side, tackler.player.id);
        stats.tackles += 1;
        const win = clamp(
          tuning.tackleBase +
            tuning.tackleSlope * (effective(tackler) - tuning.pivot) -
            tuning.tacklePressure * (strength[other].attack - tuning.pivot),
          tuning.tackleRange,
        );
        if (rng.float() < win) stats.tacklesWon += 1;
      }
    }
  }

  // Passes decisivos: um por finalização do minuto com assistência; sem ela, às vezes, de um
  // companheiro do finalizador. Também contam como passe certo.
  const keyPassers = {
    home: cumulative(field.home, tuning.keyPassWeight),
    away: cumulative(field.away, tuning.keyPassWeight),
  };
  for (let index = eventsBefore; index < state.events.length; index++) {
    const event = state.events[index];
    if (event?.type !== "shot") continue;
    const mine = field[event.side];
    let passerId: string | undefined = event.assistId;
    if (
      passerId === undefined &&
      mine.length > 1 &&
      rng.float() < tuning.keyPassChance[event.kind]
    ) {
      const shooter = mine.findIndex((entry) => entry.player.id === event.playerId);
      passerId = mine[pickIndex(rng, keyPassers[event.side], shooter)]?.player.id;
    }
    if (passerId === undefined) continue;
    const stats = playsOf(state, event.side, passerId);
    stats.keyPasses += 1;
    stats.passes += 1;
    stats.passesCompleted += 1;
  }
}
