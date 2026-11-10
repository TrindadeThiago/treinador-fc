import {
  type AcademyPlayer,
  academyClub,
  academyEffect,
  academyLimit,
  academyMaintenance,
  academyOf,
  academyRules,
  academyStatus,
  academyUpgradeCost,
  divisionAcademies,
  MAX_ACADEMY_LEVEL,
  type PotentialEstimate,
  squadLimit,
} from "@brasfoot-like/engine";
import { isEmployed, managedClubId, type SaveFile, seasonStateOf } from "@brasfoot-like/save";

/** Linha da aba Base (036): só leitura do motor, sem regra própria. */
export interface AcademyRow {
  entry: AcademyPlayer;
  age: number;
  /** Ano da temporada em que o jovem já não pode estar na base. */
  leavesYear: number;
  lastYear: boolean;
  /** Faixa de potencial estimado (038); o potencial real nunca chega à tela. */
  estimate?: PotentialEstimate | undefined;
}

export function academyRows(save: SaveFile): AcademyRow[] {
  const reference = save.bank.manifest.referenceDate;
  return academyOf(save.renewal, save.clubId).map((entry) => {
    const status = academyStatus(entry, reference, save.league);
    return {
      entry,
      age: status.age,
      leavesYear: status.leavesYear,
      lastYear: status.lastYear,
      estimate: entry.estimate,
    };
  });
}

/** Valor de ordenação da faixa: o centro e, no empate, o limite superior (038 FR-018). */
export function estimateSortValue(estimate: PotentialEstimate | undefined): number | undefined {
  return estimate ? (estimate.low + estimate.high) * 1000 + estimate.high : undefined;
}

export interface AcademyCapacity {
  count: number;
  limit: number;
  excess: number;
}

export function academyCapacity(save: SaveFile): AcademyCapacity {
  const count = academyOf(save.renewal, save.clubId).length;
  const limit = academyLimit(save.renewal, save.bank, save.clubId);
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

/** Painel da academia (037): só leitura do motor. */
export interface AcademyPanelView {
  level: number;
  maxLevel: number;
  maintenance: number;
  effect: { youthPerIntake: number; quality: number; slots: number };
  next?: {
    youthPerIntake: number;
    quality: number;
    slots: number;
    maintenance: number;
    cost: number;
  };
  previous?: { maintenance: number; slots: number };
  pending?: { kind: "upgrade" } | { kind: "downgrade" };
  cash: number;
  canUpgrade:
    | { ok: true }
    | { ok: false; reason: "max" | "pending" | "cash" | "readOnly"; missing?: number };
  canDowngrade: { ok: true } | { ok: false; reason: "min" | "pending" | "readOnly" };
  division: { clubId: string; name: string; level: number; own: boolean }[];
}

export function academyPanelView(save: SaveFile): AcademyPanelView {
  const state = seasonStateOf(save);
  const club = academyClub(save.renewal, save.bank, save.clubId);
  const rules = academyRules(save.bank, save.clubId);
  const level = club.level;
  const cash = save.finances.clubs[save.clubId]?.cash ?? 0;
  const manage = isEmployed(save);
  const next =
    level < MAX_ACADEMY_LEVEL
      ? {
          ...academyEffect(rules, level + 1),
          maintenance: academyMaintenance(save.bank, save.clubId, level + 1),
          cost: academyUpgradeCost(save.bank, save.clubId, level + 1),
        }
      : undefined;
  const previous =
    level > 1
      ? {
          maintenance: academyMaintenance(save.bank, save.clubId, level - 1),
          slots: academyEffect(rules, level - 1).slots,
        }
      : undefined;
  const canUpgrade: AcademyPanelView["canUpgrade"] = !manage
    ? { ok: false, reason: "readOnly" }
    : club.pending
      ? { ok: false, reason: "pending" }
      : !next
        ? { ok: false, reason: "max" }
        : next.cost > cash
          ? { ok: false, reason: "cash", missing: next.cost - cash }
          : { ok: true };
  const canDowngrade: AcademyPanelView["canDowngrade"] = !manage
    ? { ok: false, reason: "readOnly" }
    : club.pending
      ? { ok: false, reason: "pending" }
      : level <= 1
        ? { ok: false, reason: "min" }
        : { ok: true };
  const name = (id: string) => save.bank.clubs.find((entry) => entry.id === id)?.name ?? id;
  return {
    level,
    maxLevel: MAX_ACADEMY_LEVEL,
    maintenance: academyMaintenance(save.bank, save.clubId, level),
    effect: academyEffect(rules, level),
    ...(next ? { next } : {}),
    ...(previous ? { previous } : {}),
    ...(club.pending ? { pending: { kind: club.pending.kind } } : {}),
    cash,
    canUpgrade,
    canDowngrade,
    division: divisionAcademies(state, save.clubId).map((entry) => ({
      ...entry,
      name: name(entry.clubId),
      own: entry.clubId === save.clubId,
    })),
  };
}
