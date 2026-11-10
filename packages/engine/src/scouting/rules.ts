import type { CompletedBank } from "../model/types";
import { referenceMonthlyPayroll } from "../renewal/academy-levels";
import { rulesCompetitionOf } from "../world/countries";

/** Regras de um nível do departamento de olheiros (039 research R3). */
export interface ScoutingLevelRule {
  /** Observações simultâneas. */
  slots: number;
  /** Custo mensal, em % da folha mensal de referência (a mesma da academia, 037). */
  costPct: number;
  /** Quanto a faixa estreita por etapa. */
  shrink: number;
  /** Largura mínima que a observação alcança. */
  minWidth: number;
}

export interface ScoutingRules {
  /** Do nível 1 ao 5. */
  levels: readonly ScoutingLevelRule[];
  /** Largura da faixa de quem começa a ser observado. */
  initialWidth: number;
  /** Relatórios guardados no máximo. */
  reportCap: number;
}

export const MAX_SCOUTING_LEVEL = 5;

/** Padrão (research R3). */
export const DEFAULT_SCOUTING: ScoutingRules = {
  levels: [
    { slots: 3, costPct: 1, shrink: 1, minWidth: 14 },
    { slots: 5, costPct: 2, shrink: 2, minWidth: 12 },
    { slots: 8, costPct: 3, shrink: 3, minWidth: 10 },
    { slots: 12, costPct: 4, shrink: 4, minWidth: 8 },
    { slots: 16, costPct: 5, shrink: 5, minWidth: 6 },
  ],
  initialWidth: 24,
  reportCap: 300,
};

/** Regras do país do clube: as do mod (competição principal) com os padrões preenchidos. */
export function scoutingRules(world: CompletedBank, clubId: string): ScoutingRules {
  const mod = rulesCompetitionOf(world, clubId).economy?.scouting;
  if (!mod) return DEFAULT_SCOUTING;
  return {
    levels: mod.levels ?? DEFAULT_SCOUTING.levels,
    initialWidth: mod.initialWidth ?? DEFAULT_SCOUTING.initialWidth,
    reportCap: mod.reportCap ?? DEFAULT_SCOUTING.reportCap,
  };
}

/** Regra do nível (1 a 5); o nível 0 (fechado) usa a do 1 para o relatório automático. */
export function scoutingLevelRule(rules: ScoutingRules, level: number): ScoutingLevelRule {
  const rule = rules.levels[Math.min(MAX_SCOUTING_LEVEL, Math.max(1, level)) - 1];
  if (!rule) throw new Error(`nível de olheiros inválido: ${level}`);
  return rule;
}

/** Largura alvo depois de `steps` etapas no nível. */
export function targetWidth(rules: ScoutingRules, level: number, steps: number): number {
  const rule = scoutingLevelRule(rules, level);
  return Math.max(rule.minWidth, rules.initialWidth - rule.shrink * steps);
}

/** Etapas até a observação completa (a faixa chega à largura mínima do nível). */
export function stepsToComplete(rules: ScoutingRules, level: number): number {
  const rule = scoutingLevelRule(rules, level);
  return Math.max(1, Math.ceil((rules.initialWidth - rule.minWidth) / rule.shrink));
}

/** Etapas mínimas para o temperamento e a propensão a lesões aparecerem (metade do completo). */
export function attributeSteps(rules: ScoutingRules, level: number): number {
  return Math.ceil(stepsToComplete(rules, level) / 2);
}

/** Vagas do nível; 0 com o departamento fechado. */
export function scoutingSlots(rules: ScoutingRules, level: number): number {
  return level <= 0 ? 0 : scoutingLevelRule(rules, level).slots;
}

/** Custo mensal do departamento (039 FR-003); 0 com o departamento fechado. */
export function scoutingCost(world: CompletedBank, clubId: string, level: number): number {
  if (level <= 0) return 0;
  const rule = scoutingLevelRule(scoutingRules(world, clubId), level);
  return Math.round((referenceMonthlyPayroll(world, clubId) * rule.costPct) / 100);
}
