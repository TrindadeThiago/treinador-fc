import type { PotentialEstimate } from "../renewal/types";

/**
 * Olheiros (039, data-model.md): o departamento do clube do técnico, a lista de observação e os
 * relatórios, que são conhecimento do técnico e o acompanham entre clubes.
 */

/** Momento de uma etapa: temporada (`LeagueSeason.number`) e rodada da liga. */
export interface ScoutingMoment {
  season: number;
  round: number;
}

export interface Observation {
  playerId: string;
  since: ScoutingMoment;
}

/** Grau de um atributo oculto em texto: 1 (baixo), 2 (normal) ou 3 (alto). Nunca o número. */
export type ScoutGrade = 1 | 2 | 3;

export interface ScoutReport {
  /** Faixa de potencial (mecanismo da 038): contém o valor real e só estreita. */
  estimate: PotentialEstimate;
  /** Etapas observadas (observação e relatório automático somados). */
  steps: number;
  temperament?: ScoutGrade;
  injury?: ScoutGrade;
  updated: ScoutingMoment;
}

export interface ScoutingState {
  /** Clube do departamento; se o técnico não está mais nele, o departamento conta como fechado. */
  clubId?: string;
  /** 0 = fechado (sem custo e sem vagas), 1 a 5. */
  level: number;
  watch: Observation[];
  /** Por id de jogador. */
  reports: Record<string, ScoutReport>;
}
