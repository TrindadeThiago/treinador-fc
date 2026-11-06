/**
 * Faixas de realismo da nota do jogador (034 FR-016, SC-003 a SC-005), verificadas por
 * `test/rating/realism.test.ts` e por `pnpm sim:matches`. Afrouxar uma faixa exige justificativa
 * registrada (Princípio V).
 */
export const RATING_REALISM_LIMITS = {
  mean: [6.1, 6.5],
  /** Parte das notas abaixo de 4,0 e acima de 9,0. */
  maxBelow4: 0.05,
  maxAbove9: 0.03,
  /** Distância máxima da média de cada posição da vaga até a média geral. */
  maxPositionGap: 0.5,
  /** Quem marcou − quem não marcou; vencedor − perdedor. */
  minScorerGap: 1,
  minWinnerGap: 0.5,
  /** Parte das partidas com vencedor em que o melhor em campo é do time vencedor. */
  minBestFromWinner: 0.7,
  /** Simplificada − completa, nas mesmas partidas. */
  maxSimplifiedGap: 0.3,
} as const;
