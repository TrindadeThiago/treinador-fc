/**
 * Faixas de realismo do motor de partida (FR-040 a FR-049), verificadas por simulação longa
 * (Princípio V). Afrouxar uma faixa exige justificativa registrada.
 */
export const MATCH_REALISM_LIMITS = {
  /** FR-040 */
  goalsPerMatch: [2.2, 3.0],
  /** FR-041 */
  drawRate: [0.22, 0.3],
  /** FR-042: times de força equivalente. */
  equalHomeWinRate: [0.4, 0.52],
  equalAwayWinRate: [0.22, 0.34],
  maxNeutralWinGap: 0.04,
  /** FR-043: diferença de 10 pontos na força média dos titulares. */
  favouriteGap: 10,
  minFavouriteWinRate: 0.6,
  favouriteLossRate: [0.05, 0.2],
  /** FR-044: efeito relativo mínimo da postura sobre gols marcados e sofridos. */
  minPostureEffect: 0.1,
  /** FR-045: queda mínima da taxa de vitória com um expulso até o minuto 30. */
  earlyRedMinute: 30,
  minRedCardWinDrop: 0.1,
  /** FR-046 */
  yellowsPerMatch: [3, 6],
  redsPerMatch: [0.05, 0.3],
  minTemperamentCardRatio: 2,
  /** FR-047 */
  injuriesPerMatch: [0.1, 0.5],
  minPronenessInjuryRatio: 2,
  /** FR-048 */
  penaltiesPerMatch: [0.15, 0.4],
  penaltyConversion: [0.7, 0.85],
  /** FR-049 */
  shotsPerMatch: [18, 30],
  onTargetRate: [0.3, 0.45],
  maxSevenGoalRate: 0.005,
  possessionRange: [30, 70],
  minPossessionInRangeRate: 0.95,
  /** Faixas de atributo para comparar alto × baixo (temperamento, propensão). */
  highAttribute: 80,
  lowAttribute: 20,
} as const;

export type Range = readonly [number, number];

/**
 * Faixas de realismo das jogadas (033 FR-019, FR-020), por time e por jogo, verificadas por
 * `realism/plays.test.ts` e por `pnpm sim:matches`. São de referência do futebol profissional;
 * afrouxar uma faixa exige justificativa registrada (Princípio V).
 */
export const PLAY_REALISM_LIMITS = {
  passesPerTeam: [350, 600],
  passAccuracy: [0.72, 0.88],
  tacklesWonPerTeam: [12, 25],
  interceptionsPerTeam: [6, 16],
  keyPassesPerTeam: [6, 15],
  /** (Desarmes + interceptações) por minuto de ZAG e VOL ÷ os de MEI e ATA. */
  minDefensiveRatio: 1.5,
  /** Passes e passes decisivos por minuto de MEI ÷ os de ZAG. */
  minPassingRatio: 1.3,
  /** Nos jogos com 10 pontos ou mais de diferença de posse, parte em que o time com mais posse passa mais. */
  possessionGap: 10,
  minPossessionPassRate: 0.8,
} as const;
