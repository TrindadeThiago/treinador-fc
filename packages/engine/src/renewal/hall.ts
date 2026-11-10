import type { Position } from "../model/catalogs";
import type { AcademyGraduate, AcademyHall, AcademyLegend, AcademyState } from "./types";

/**
 * Crias da base por clube formador (038, research R9): quantas o clube promoveu e as maiores
 * revelações pela força máxima atingida. A força máxima é medida na promoção e a cada virada; quem se
 * aposenta continua na lista com o nome guardado.
 */

/** Maiores revelações guardadas por clube (FR-016). */
export const HALL_SIZE = 5;

export interface HallPlayer {
  id: string;
  displayName: string;
  position: Position;
  strength: number;
}

const byLegend = (a: AcademyLegend, b: AcademyLegend) =>
  b.peak - a.peak || a.season - b.season || (a.playerId < b.playerId ? -1 : 1);

/** Lista nova de revelações: a atual com as candidatas, sem repetir jogador (maior pico vale). */
export function mergeLegends(
  current: readonly AcademyLegend[],
  candidates: readonly AcademyLegend[],
): AcademyLegend[] {
  const byId = new Map(current.map((legend) => [legend.playerId, legend]));
  for (const candidate of candidates) {
    const known = byId.get(candidate.playerId);
    if (!known || candidate.peak > known.peak) byId.set(candidate.playerId, candidate);
  }
  return [...byId.values()].sort(byLegend).slice(0, HALL_SIZE);
}

export function emptyHall(): AcademyHall {
  return { promoted: 0, best: [] };
}

/** Crias de um clube; vazio quando o clube nunca promoveu ninguém (registrado). */
export function hallOf(academy: AcademyState, clubId: string): AcademyHall {
  return academy.hall?.[clubId] ?? emptyHall();
}

function legendOf(player: HallPlayer, graduate: AcademyGraduate, peak: number): AcademyLegend {
  return {
    playerId: player.id,
    name: player.displayName,
    position: player.position,
    peak,
    season: graduate.season,
  };
}

/**
 * Atualiza a força máxima dos promovidos vivos e refaz as revelações de cada formador (virada, R9).
 * `players` traz quem está no mundo e entre os livres; os demais (aposentados) ficam como estão.
 */
export function refreshHall(
  academy: AcademyState,
  players: ReadonlyMap<string, HallPlayer>,
): AcademyState {
  const graduates: Record<string, AcademyGraduate> = {};
  const candidates = new Map<string, AcademyLegend[]>();
  for (const [playerId, graduate] of Object.entries(academy.graduates)) {
    const player = players.get(playerId);
    if (!player) {
      graduates[playerId] = graduate;
      continue;
    }
    const peak = Math.max(graduate.peak ?? player.strength, player.strength);
    graduates[playerId] = { ...graduate, peak };
    candidates.set(graduate.clubId, [
      ...(candidates.get(graduate.clubId) ?? []),
      legendOf(player, graduate, peak),
    ]);
  }
  const hall: Record<string, AcademyHall> = { ...(academy.hall ?? {}) };
  for (const [clubId, list] of candidates) {
    const current = hall[clubId] ?? emptyHall();
    hall[clubId] = { ...current, best: mergeLegends(current.best, list) };
  }
  return { ...academy, graduates, hall };
}

/** Registra promoções no histórico do formador: soma o total e considera cada um como revelação. */
export function hallWithPromotions(
  academy: AcademyState,
  promoted: readonly { player: HallPlayer; graduate: AcademyGraduate }[],
): AcademyState {
  if (promoted.length === 0) return academy;
  const hall: Record<string, AcademyHall> = { ...(academy.hall ?? {}) };
  for (const { player, graduate } of promoted) {
    const current = hall[graduate.clubId] ?? emptyHall();
    hall[graduate.clubId] = {
      promoted: current.promoted + 1,
      best: mergeLegends(current.best, [legendOf(player, graduate, graduate.peak ?? 0)]),
    };
  }
  return { ...academy, hall };
}

/**
 * Histórico inicial a partir dos promovidos que o save conhece (migração da 1.10.x): o total são os
 * promovidos vivos; a força máxima começa na força atual.
 */
export function seedHall(
  academy: AcademyState,
  players: ReadonlyMap<string, HallPlayer>,
): AcademyState {
  const hall: Record<string, AcademyHall> = {};
  for (const graduate of Object.values(academy.graduates)) {
    const current = hall[graduate.clubId] ?? emptyHall();
    hall[graduate.clubId] = { ...current, promoted: current.promoted + 1 };
  }
  return refreshHall({ ...academy, hall }, players);
}
