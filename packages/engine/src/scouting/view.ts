import type { CareerSeasonState } from "../career/season-state";
import type { PotentialEstimate } from "../renewal/types";
import {
  attributeSteps,
  MAX_SCOUTING_LEVEL,
  scoutingCost,
  scoutingLevelRule,
  scoutingRules,
  scoutingSlots,
  stepsToComplete,
} from "./rules";
import { effectiveScoutingLevel, scoutingManagerClub } from "./state";
import type { ScoutGrade, ScoutingMoment } from "./types";

/**
 * Leitura dos olheiros para a interface (039 R9): só faixas, graus em texto, confiança e datas.
 * Nunca o potencial, o temperamento ou a propensão reais.
 */

export type ScoutConfidence = "initial" | "partial" | "complete";

export interface ScoutReportView {
  estimate: PotentialEstimate;
  temperament?: ScoutGrade;
  injury?: ScoutGrade;
  confidence: ScoutConfidence;
  steps: number;
  /** Etapas até a observação completa no nível que vale agora (mínimo 1). */
  stepsToComplete: number;
  updated: ScoutingMoment;
  watching: boolean;
}

export function scoutReportOf(
  state: Pick<CareerSeasonState, "world" | "scouting" | "board">,
  playerId: string,
): ScoutReportView | undefined {
  const report = state.scouting?.reports[playerId];
  if (!report) return undefined;
  const manager = scoutingManagerClub(state);
  const level = Math.max(1, effectiveScoutingLevel(state.scouting, manager));
  const rules = scoutingRules(state.world, manager || (state.world.clubs[0]?.id ?? ""));
  const minWidth = scoutingLevelRule(rules, level).minWidth;
  const total = stepsToComplete(rules, level);
  const complete = report.estimate.high - report.estimate.low <= minWidth || report.steps >= total;
  const confidence: ScoutConfidence = complete
    ? "complete"
    : report.steps >= attributeSteps(rules, level)
      ? "partial"
      : "initial";
  return {
    estimate: report.estimate,
    ...(report.temperament !== undefined ? { temperament: report.temperament } : {}),
    ...(report.injury !== undefined ? { injury: report.injury } : {}),
    confidence,
    steps: report.steps,
    stepsToComplete: total,
    updated: report.updated,
    watching: state.scouting?.watch.some((entry) => entry.playerId === playerId) ?? false,
  };
}

export interface ScoutingPanel {
  /** Nível que vale (0 = fechado). */
  level: number;
  slots: number;
  used: number;
  monthlyCost: number;
  /** Os níveis de 1 a 5, para o diálogo de mudança. */
  levels: { level: number; slots: number; monthlyCost: number }[];
  watch: { playerId: string; since: ScoutingMoment }[];
}

/** Painel do departamento para o clube do técnico. */
export function scoutingPanel(
  state: Pick<CareerSeasonState, "world" | "scouting" | "board">,
): ScoutingPanel {
  const manager = scoutingManagerClub(state);
  const level = effectiveScoutingLevel(state.scouting, manager);
  const base = manager || (state.world.clubs[0]?.id ?? "");
  const rules = scoutingRules(state.world, base);
  const levels = Array.from({ length: MAX_SCOUTING_LEVEL }, (_, index) => ({
    level: index + 1,
    slots: scoutingSlots(rules, index + 1),
    monthlyCost: manager ? scoutingCost(state.world, manager, index + 1) : 0,
  }));
  const watch = level > 0 ? (state.scouting?.watch ?? []) : [];
  return {
    level,
    slots: scoutingSlots(rules, level),
    used: watch.length,
    monthlyCost: manager ? scoutingCost(state.world, manager, level) : 0,
    levels,
    watch: watch.map((entry) => ({ playerId: entry.playerId, since: entry.since })),
  };
}
