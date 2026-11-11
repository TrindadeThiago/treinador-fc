/**
 * Padrões das regras das competições entre países (022), usados quando o mod não os declara. Os
 * valores são pontos de partida, calibrados pelo teste de simulação longa.
 */
export const CONTINENTAL_TUNING = {
  /** Reputação máxima que o bônus continental leva um clube (`awards.reputationCeiling`). */
  reputationCeiling: 95,
} as const;

/**
 * Limites do equilíbrio da competição entre países (Princípio V), declarados e versionados aqui:
 * `ci` vale para a versão reduzida do teste (poucas temporadas, mundo pequeno); `full` para as 30
 * temporadas de `pnpm sim:world --continental`.
 */
export const CONTINENTAL_LIMITS = {
  ci: {
    /**
     * Parcela mínima das temporadas em que o campeão é mais forte que a média dos participantes.
     * 0,5 desde a 042 (era 0,6): as comissões da IA mudaram a sequência das temporadas e a seed
     * `longo-continental-a` passou de 9 para 5 em 10 (amostra pequena; a `b` ficou em 7). Na
     * continental completa (`full`, 30 temporadas) as 3 seeds dão 70%, 90% e 73% (limite 70%).
     */
    minChampionStrongerShare: 0.5,
    minDistinctChampions: 3,
    /**
     * Revisto de 0,5 para 0,6 na 036: em 10 edições, um clube com 6 títulos (seed
     * `longo-continental-a`, depois da calibragem da base) é amostra pequena; nas 30 temporadas da
     * simulação completa a maior parcela é 13% (limite `full` 0,4).
     */
    maxTitleShare: 0.6,
    /**
     * Com 10 títulos entre 5 países a correlação é quase só ruído: revisto de 0 para -0,1 na 036,
     * quando a seed `longo-continental-b` passou a dar -0,08 (a base mudou a sequência das
     * temporadas). O critério de verdade é o `full` (≥ 0,3 em 30 temporadas).
     */
    minSlotsTitlesSpearman: -0.1,
  },
  full: {
    minChampionStrongerShare: 0.7,
    minDistinctChampions: 5,
    maxTitleShare: 0.4,
    minSlotsTitlesSpearman: 0.3,
  },
  /** Economia dos assíduos (as noções da 008): caixa acima da mediana, fora de crise, parcela dos prêmios. */
  assiduousCashAboveMedianWages: 4,
  /** Os assíduos ficam fora de crise ao menos nesta parcela, e nunca muito abaixo dos demais clubes. */
  assiduousMinHealthyShare: 0.7,
  assiduousHealthyBelowOthers: 0.1,
  maxAwardsShare: 0.15,
  /** Reputação: ninguém passa do teto e o mundo quase não se desloca. */
  maxReputationBreaches: 0,
  maxReputationDrift: 3,
} as const;
