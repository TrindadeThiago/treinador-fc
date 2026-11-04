import { diffDays } from "../calendar/date";
import type { CompletedBank, CompletedPlayer } from "../model/types";
import { playerLines } from "../season/record";
import type { MatchRecord } from "../season/types";
import type { FitnessRules, FitnessState } from "./types";

const FULL = 100;

/** Condição do jogador na data: a do último jogo mais a recuperação dos dias, até 100. */
export function fitnessOn(
  state: FitnessState,
  playerId: string,
  date: string,
  rules: FitnessRules,
): number {
  const entry = state.players[playerId];
  if (!entry) return FULL;
  const days = Math.max(0, diffDays(entry.date, date));
  return Math.min(FULL, entry.value + days * rules.recoveryPerDay);
}

/** Multiplicador da força em pontos-base (10000 = sem efeito). */
export function fitnessFactorBp(value: number, rules: FitnessRules): number {
  return 10000 - (FULL - value) * rules.penaltyBpPerPoint;
}

/**
 * Elenco com a força reduzida pela condição na data. Com todos em 100 devolve o próprio elenco;
 * senão, cópias dos jogadores cansados com a força arredondada (o motor de partida não conhece a
 * condição, 017 R5).
 */
export function squadWithFitness(
  squad: readonly CompletedPlayer[],
  state: FitnessState,
  date: string,
  rules: FitnessRules,
): readonly CompletedPlayer[] {
  let changed = false;
  const adjusted = squad.map((player) => {
    const value = fitnessOn(state, player.id, date, rules);
    if (value >= FULL) return player;
    changed = true;
    const strength = Math.round((player.strength * fitnessFactorBp(value, rules)) / 10000);
    return { ...player, strength };
  });
  return changed ? adjusted : squad;
}

/** Mundo cujos jogadores cansados têm a força reduzida; o mesmo mundo se ninguém está cansado. */
export function worldWithFitness(
  world: CompletedBank,
  state: FitnessState,
  date: string,
  rules: FitnessRules,
): CompletedBank {
  // Só quem está no estado pode estar cansado (os demais têm 100): mede a condição deles e não a de
  // cada jogador do mundo. O resultado é o de `squadWithFitness` sobre o mundo inteiro.
  const tired = new Map<string, number>();
  for (const id of Object.keys(state.players)) {
    const value = fitnessOn(state, id, date, rules);
    if (value < FULL) tired.set(id, value);
  }
  if (tired.size === 0) return world;
  let changed = false;
  const players = world.players.map((player) => {
    const value = tired.get(player.id);
    if (value === undefined) return player;
    changed = true;
    const strength = Math.round((player.strength * fitnessFactorBp(value, rules)) / 10000);
    return { ...player, strength };
  });
  return changed ? { ...world, players } : world;
}

/**
 * Condição depois dos jogos de um dia: quem atuou perde `drainPer90` proporcional aos minutos, a
 * partir da condição que tinha no dia. Quem já voltou a 100 sai do estado. Não altera a entrada.
 */
export function fitnessAfterMatches(
  state: FitnessState,
  records: readonly MatchRecord[],
  date: string,
  rules: FitnessRules,
): FitnessState {
  const players: FitnessState["players"] = {};
  for (const [id, entry] of Object.entries(state.players)) {
    if (fitnessOn(state, id, date, rules) < FULL) players[id] = entry;
  }
  for (const record of records) {
    for (const [id, line] of Object.entries(playerLines(record))) {
      if (line.minutes <= 0) continue;
      const current = fitnessOn({ players }, id, date, rules);
      const value = Math.max(0, current - Math.round((line.minutes * rules.drainPer90) / 90));
      if (value >= FULL) delete players[id];
      else players[id] = { value, date };
    }
  }
  return { players };
}
