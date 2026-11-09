import {
  type AcademyError,
  type AcademyLevelError,
  type AcademyLevelResult,
  academyWarning,
  cancelAcademyChange,
  downgradeAcademy,
  emergencyPositions,
  emergencyPromotion,
  type Position,
  promoteFromAcademy,
  promotionContract,
  type RosterIssue,
  releaseFromAcademy,
  rosterIssues,
  upgradeAcademy,
} from "@brasfoot-like/engine";
import { isEmployed } from "./board";
import { seasonStateOf, withAdjustedLineup, withDayResult } from "./career";
import type { SaveFile } from "./format";

/** Ações da base no save (036, contracts/engine-academy.md). */

export type AcademySaveResult =
  | { ok: true; save: SaveFile }
  | { ok: false; error: AcademyError | "academy.unemployed" | "academy.no_emergency" };

/** Posições em que a safra de emergência está liberada (nenhum candidato para o mínimo). */
export function emergencyPositionsOf(save: SaveFile): Position[] {
  if (!isEmployed(save)) return [];
  return emergencyPositions(seasonStateOf(save), save.clubId);
}

/** Safra de emergência pedida pelo técnico: o jovem nasce na base e sobe na hora. */
export function emergencyYouth(save: SaveFile, position: Position): AcademySaveResult {
  if (!isEmployed(save)) return { ok: false, error: "academy.unemployed" };
  const done = emergencyPromotion(seasonStateOf(save), save.clubId, position, save.seed);
  if (!done.ok) return done;
  return { ok: true, save: withAdjustedLineup(withDayResult(save, done.state)) };
}

/** Promove um jovem da base do clube do técnico; a escalação é ajustada como em outras saídas. */
export function promoteYouth(save: SaveFile, playerId: string): AcademySaveResult {
  if (!isEmployed(save)) return { ok: false, error: "academy.unemployed" };
  const done = promoteFromAcademy(seasonStateOf(save), save.clubId, playerId, save.seed);
  if (!done.ok) return done;
  return { ok: true, save: withAdjustedLineup(withDayResult(save, done.state)) };
}

/** Dispensa um jovem da base do clube do técnico: ele vira livre. */
export function releaseYouth(save: SaveFile, playerId: string): AcademySaveResult {
  if (!isEmployed(save)) return { ok: false, error: "academy.unemployed" };
  const done = releaseFromAcademy(seasonStateOf(save), save.clubId, playerId);
  if (!done.ok) return done;
  return { ok: true, save: withDayResult(save, done.state) };
}

/** Prévia do contrato de promoção (salário mensal e último ano). */
export function youthContractPreview(
  save: SaveFile,
  playerId: string,
): { wage: number; untilYear: number } | undefined {
  return promotionContract(seasonStateOf(save), playerId, save.seed);
}

/**
 * Problemas do elenco antes da próxima partida do técnico (FR-009a, FR-010, FR-011b): os de
 * gravidade `error` impedem a partida, pelo mesmo caminho da escalação inválida. Desempregado, não há.
 */
export function rosterIssuesOf(save: SaveFile): RosterIssue[] {
  if (!isEmployed(save)) return [];
  return rosterIssues(seasonStateOf(save), save.clubId);
}

/** Aviso da última janela (jovens no último ano). */
export function academyWarningOf(
  save: SaveFile,
): { kind: "last_window"; count: number } | undefined {
  return academyWarning(seasonStateOf(save), save.clubId);
}

/** Academia (037): melhorar (paga a obra agora), baixar e cancelar a redução. */
export type AcademyLevelSaveResult =
  | { ok: true; save: SaveFile }
  | { ok: false; error: AcademyLevelError | "academy.unemployed"; params?: Record<string, number> };

function levelAction(
  save: SaveFile,
  action: (state: ReturnType<typeof seasonStateOf>, clubId: string) => AcademyLevelResult,
): AcademyLevelSaveResult {
  if (!isEmployed(save)) return { ok: false, error: "academy.unemployed" };
  const done = action(seasonStateOf(save), save.clubId);
  if (!done.ok) return done;
  return { ok: true, save: withDayResult(save, done.state) };
}

export function upgradeYouthAcademy(save: SaveFile): AcademyLevelSaveResult {
  return levelAction(save, upgradeAcademy);
}

export function downgradeYouthAcademy(save: SaveFile): AcademyLevelSaveResult {
  return levelAction(save, downgradeAcademy);
}

export function cancelYouthAcademyChange(save: SaveFile): AcademyLevelSaveResult {
  return levelAction(save, cancelAcademyChange);
}
