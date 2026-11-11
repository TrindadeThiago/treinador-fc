import type { CompletedPlayer } from "../model/types";
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

/** Região de captação (040): um estado (`clubs[].region`) de um país, ou um país inteiro. */
export type ScoutingRegion =
  | { kind: "state"; countryId: string; region: string }
  | { kind: "country"; countryId: string };

/**
 * Indicação de um jovem (040): ainda fora do mundo, com id provisório (`scout-offer-N`) que nunca é
 * id de jogador do mundo. Só ao ser trazido ganha o id real e entra na base.
 */
export interface ScoutOffer {
  id: string;
  player: Omit<CompletedPlayer, "clubId" | "contract">;
  estimate: PotentialEstimate;
  temperament?: ScoutGrade;
  injury?: ScoutGrade;
  region: ScoutingRegion;
  cost: number;
  /** A indicação vale enquanto as rodadas jogadas da liga forem ≤ este número. */
  expiresRound: number;
  season: number;
}

export interface ScoutingState {
  /** Clube do departamento; se o técnico não está mais nele, o departamento conta como fechado. */
  clubId?: string;
  /** 0 = fechado (sem custo e sem vagas), 1 a 5. */
  level: number;
  watch: Observation[];
  /** Por id de jogador. */
  reports: Record<string, ScoutReport>;
  /** Região de captação em vigor (040). */
  region?: ScoutingRegion;
  /** Região escolhida, que vale a partir da rodada seguinte (040 FR-001). */
  pendingRegion?: ScoutingRegion | null;
  /** Indicações abertas (040). */
  offers?: ScoutOffer[];
  /** Numeração local das indicações (040). */
  nextOfferSeq?: number;
}
