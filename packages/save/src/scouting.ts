import {
  type ScoutingError,
  setScoutingLevel as setLevel,
  unwatchPlayer,
  watchPlayer,
} from "@brasfoot-like/engine";
import { seasonStateOf, withDayResult } from "./career";
import type { SaveFile } from "./format";

/** Ações dos olheiros no save (039, contracts/engine-scouting.md). */

export type ScoutingSaveResult =
  | { ok: true; save: SaveFile; cancelled?: string[] }
  | { ok: false; error: ScoutingError };

/** Abre, muda ou fecha o departamento de olheiros do clube do técnico. */
export function setScoutingLevel(save: SaveFile, level: number): ScoutingSaveResult {
  const done = setLevel(seasonStateOf(save), level);
  if (!done.ok) return done;
  return { ok: true, save: withDayResult(save, done.state), cancelled: done.cancelled };
}

/** Manda observar um jogador de outro clube (ou livre). */
export function scoutPlayer(save: SaveFile, playerId: string): ScoutingSaveResult {
  const done = watchPlayer(seasonStateOf(save), playerId, save.seed);
  if (!done.ok) return done;
  return { ok: true, save: withDayResult(save, done.state) };
}

/** Cancela a observação de um jogador; o relatório fica guardado. */
export function unscoutPlayer(save: SaveFile, playerId: string): ScoutingSaveResult {
  const done = unwatchPlayer(seasonStateOf(save), playerId);
  if (!done.ok) return done;
  return { ok: true, save: withDayResult(save, done.state) };
}
