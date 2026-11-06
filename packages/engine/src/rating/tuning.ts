import type { Position } from "../model/catalogs";

type ByPosition = Readonly<Record<Position, number>>;

/**
 * Constantes da nota do jogador (034 research R3 e R4). A nota parte de `reference`, soma as
 * contribuições da partida e encolhe na direção de `reference` com poucos minutos. Calibradas por
 * `test/rating/realism.test.ts` contra `RATING_REALISM_LIMITS`.
 */
export const RATING_TUNING = {
  /** A atuação comum (6,0) e o ponto para onde encolhem as notas de quem jogou pouco. */
  reference: 6,
  /** Abaixo disto o jogador fica sem nota. */
  minMinutes: 10,
  /** A partir disto a nota não encolhe mais. */
  fullMinutes: 60,
  goal: { GK: 1.2, CB: 1.2, FB: 1.2, DM: 1.1, MF: 1, FW: 0.9 } as ByPosition,
  assist: 0.6,
  keyPass: { GK: 0.1, CB: 0.15, FB: 0.15, DM: 0.15, MF: 0.2, FW: 0.15 } as ByPosition,
  shot: { GK: 0, CB: 0.03, FB: 0.03, DM: 0.03, MF: 0.04, FW: 0.05 } as ByPosition,
  tackleWon: { GK: 0, CB: 0.15, FB: 0.12, DM: 0.15, MF: 0.08, FW: 0.05 } as ByPosition,
  interception: { GK: 0.1, CB: 0.15, FB: 0.12, DM: 0.15, MF: 0.08, FW: 0.05 } as ByPosition,
  /** Passes certos acima do esperado (`expectedAccuracy` × tentados), por posição. */
  passOverExpected: { GK: 0.02, CB: 0.02, FB: 0.03, DM: 0.04, MF: 0.04, FW: 0.03 } as ByPosition,
  expectedAccuracy: 0.83,
  save: 0.3,
  /** Por gol sofrido com o jogador em campo. */
  conceded: { GK: -0.5, CB: -0.3, FB: -0.25, DM: -0.15, MF: -0.08, FW: -0.03 } as ByPosition,
  /** Jogo sem sofrer gol, para quem jogou ao menos `cleanSheetMinutes`. */
  cleanSheet: { GK: 0.6, CB: 0.4, FB: 0.3, DM: 0.1, MF: 0, FW: 0 } as ByPosition,
  cleanSheetMinutes: 60,
  /** Resultado do time, proporcional aos minutos (÷ 90). */
  win: 0.4,
  loss: -0.4,
  yellow: -0.3,
  red: -1.5,
  penaltyConceded: -0.6,
  /** Ajuste por posição para nenhuma posição ficar, na média, acima ou abaixo das outras. */
  offset: { GK: 0, CB: 0, FB: 0, DM: 0, MF: 0, FW: 0 } as ByPosition,
  /** O mesmo ajuste para a nota simplificada (sem os termos de jogadas). */
  simplifiedOffset: { GK: 0, CB: 0, FB: 0, DM: 0, MF: 0, FW: 0 } as ByPosition,
} as const;
