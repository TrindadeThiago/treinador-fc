import type { CompletedBank } from "../model/types";
import { mainCompetitionOf } from "../world/countries";

/** Regras dos empresários (042, research R5). Ficam em `market.agents` da competição principal. */
export interface AgentRules {
  /** Empresários por país; 0 desliga os empresários do país. */
  perCountry: number;
  /**
   * Comissão de referência, em meses do salário pedido, com ganância 3. Calibrada em 0,5 pelo
   * `sim:economy` de 30 temporadas (research, "Calibração"): com 1,5 a IA entrava em crise.
   */
  refMonths: number;
  /** Teto da comissão, em meses do salário pedido (o rompimento pede o teto). */
  capMonths: number;
  /** Pontos de falta de interesse que o empresário cobre por nível de influência. */
  gapPerInfluence: number;
  /** Meses do salário pedido por ponto de falta de interesse coberto. */
  gapMonthsPerPoint: number;
  /** Parte (%) da comissão excedente que vira desconto no salário ao longo do contrato (≤ 100). */
  tradePct: number;
  /** Desconto máximo (%) no salário pedido pela comissão. */
  wageCapPct: number;
  /** Manchete de negócio grande a partir destas folhas mensais de referência do clube. */
  headlineMonths: number;
  relation: {
    signed: number;
    renewed: number;
    terminated: number;
    demandRefused: number;
    abandoned: number;
    /** Pontos de volta ao neutro por virada. */
    decay: number;
  };
}

export const DEFAULT_AGENTS: AgentRules = {
  perCountry: 8,
  refMonths: 0.5,
  capMonths: 6,
  gapPerInfluence: 4,
  gapMonthsPerPoint: 0.5,
  tradePct: 80,
  wageCapPct: 15,
  headlineMonths: 3,
  relation: {
    signed: 5,
    renewed: 3,
    terminated: -15,
    demandRefused: -8,
    abandoned: -4,
    decay: 5,
  },
};

/** Regras do país: `market.agents` da competição principal dele, com os padrões preenchidos. */
export function agentRules(
  world: Pick<CompletedBank, "competitions">,
  countryId: string,
): AgentRules {
  const override = mainCompetitionOf(world, countryId)?.market?.agents;
  if (!override) return DEFAULT_AGENTS;
  const { relation, ...rest } = override;
  const merged = { ...DEFAULT_AGENTS, relation: { ...DEFAULT_AGENTS.relation } };
  for (const [key, value] of Object.entries(rest)) {
    if (typeof value === "number") (merged as unknown as Record<string, number>)[key] = value;
  }
  for (const [key, value] of Object.entries(relation ?? {})) {
    if (typeof value === "number") {
      (merged.relation as unknown as Record<string, number>)[key] = value;
    }
  }
  return merged;
}
