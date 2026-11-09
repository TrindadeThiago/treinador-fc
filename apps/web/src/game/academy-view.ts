import {
  ACADEMY_RULES,
  type AcademyPlayer,
  academyOf,
  academyStatus,
  squadLimit,
} from "@brasfoot-like/engine";
import { isEmployed, managedClubId, type SaveFile } from "@brasfoot-like/save";

/** Linha da aba Base (036): só leitura do motor, sem regra própria. */
export interface AcademyRow {
  entry: AcademyPlayer;
  age: number;
  /** Ano da temporada em que o jovem já não pode estar na base. */
  leavesYear: number;
  lastYear: boolean;
}

export function academyRows(save: SaveFile): AcademyRow[] {
  const reference = save.bank.manifest.referenceDate;
  return academyOf(save.renewal, save.clubId).map((entry) => {
    const status = academyStatus(entry, reference, save.league);
    return { entry, age: status.age, leavesYear: status.leavesYear, lastYear: status.lastYear };
  });
}

export interface AcademyCapacity {
  count: number;
  limit: number;
  excess: number;
}

export function academyCapacity(save: SaveFile): AcademyCapacity {
  const count = academyOf(save.renewal, save.clubId).length;
  const limit = ACADEMY_RULES.maxPlayers;
  return { count, limit, excess: Math.max(0, count - limit) };
}

/** O elenco está no máximo do técnico: a promoção fica indisponível (FR-008). */
export function squadIsFull(save: SaveFile): { full: boolean; max: number } {
  const max = squadLimit(save.clubId, managedClubId(save));
  const count = save.bank.players.filter((player) => player.clubId === save.clubId).length;
  return { full: count >= max, max };
}

/** Só o técnico empregado mexe na base; desempregado, a aba é só leitura (FR-014a). */
export function canManageAcademy(save: SaveFile): boolean {
  return isEmployed(save);
}
