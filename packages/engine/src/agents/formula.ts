import type { AgentRules } from "./rules";

/**
 * Contas da comissão (042, research R2), sem dependências do mercado. `W` é o salário pedido pela
 * regra de sempre; os valores em dinheiro arredondam ao milhar e os salários a cem.
 */

function roundThousand(value: number): number {
  return Math.round(value / 1000) * 1000;
}

/** Efeito da relação: 0,5 com relação 100, 1 com 50 (neutra), 1,5 com 0. */
export function relationFactor(relation: number): number {
  return 1 + (50 - relation) / 100;
}

/** Teto da comissão. */
export function capCommission(wage: number, rules: AgentRules): number {
  return roundThousand(wage * rules.capMonths);
}

/** Comissão de referência; no rompimento (relação 0), o teto. */
export function refCommission(
  wage: number,
  greed: number,
  relation: number,
  rules: AgentRules,
): number {
  const cap = capCommission(wage, rules);
  if (relation <= 0) return cap;
  const ref = roundThousand((wage * rules.refMonths * greed * relationFactor(relation)) / 3);
  return Math.min(cap, ref);
}

/** Quantos pontos de falta de interesse o empresário cobre. */
export function interestReach(influence: number, rules: AgentRules): number {
  return rules.gapPerInfluence * influence;
}

/** Comissão mínima para um jogador sem interesse (`gap` > 0, dentro do alcance). */
export function minCommission(ref: number, wage: number, gap: number, rules: AgentRules): number {
  return ref + roundThousand(wage * rules.gapMonthsPerPoint * gap);
}

/**
 * Salário pedido depois da troca: o excedente da comissão sobre a pedida baixa o salário mensal,
 * até `wageCapPct`. O salário economizado no contrato nunca passa de `tradePct`% do excedente.
 */
export function wageAfterCommission(
  wage: number,
  asked: number,
  commission: number,
  years: number,
  rules: AgentRules,
): number {
  const extra = Math.max(0, commission - asked);
  if (extra === 0 || years <= 0) return wage;
  const perMonth = Math.floor((extra * rules.tradePct) / 100 / (12 * years) / 100) * 100;
  const cap = Math.floor((wage * rules.wageCapPct) / 100 / 100) * 100;
  return wage - Math.min(perMonth, cap);
}
