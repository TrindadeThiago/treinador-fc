import {
  declineOffer,
  type RecruitmentError,
  type ScoutingError,
  type ScoutingRegion,
  setScoutingLevel as setLevel,
  setScoutingRegion as setRegion,
  signOffer,
  unwatchPlayer,
  watchPlayer,
} from "@brasfoot-like/engine";
import { seasonStateOf, withDayResult } from "./career";
import type { SaveFile } from "./format";

/** Ações dos olheiros no save (039, contracts/engine-scouting.md). */

export type ScoutingSaveResult =
  | { ok: true; save: SaveFile; cancelled?: string[]; playerId?: string }
  | { ok: false; error: ScoutingError | RecruitmentError; params?: Record<string, number> };

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

/** Escolhe a região de captação (040); vale a partir da rodada seguinte. */
export function setScoutingRegion(
  save: SaveFile,
  region: ScoutingRegion | undefined,
): ScoutingSaveResult {
  const done = setRegion(seasonStateOf(save), region);
  if (!done.ok) return done;
  return { ok: true, save: withDayResult(save, done.state) };
}

/** Traz um indicado para a base (040), pagando o registro. */
export function signScoutOffer(save: SaveFile, offerId: string): ScoutingSaveResult {
  const done = signOffer(seasonStateOf(save), offerId);
  if (!done.ok) return done;
  return {
    ok: true,
    save: withDayResult(save, done.state),
    ...(done.playerId ? { playerId: done.playerId } : {}),
  };
}

/** Recusa uma indicação (040): ela some sem deixar jogador. */
export function declineScoutOffer(save: SaveFile, offerId: string): ScoutingSaveResult {
  const done = declineOffer(seasonStateOf(save), offerId);
  if (!done.ok) return done;
  return { ok: true, save: withDayResult(save, done.state) };
}
