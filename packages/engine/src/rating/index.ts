// Nota do jogador por partida (034): só informa; nenhum sistema do jogo importa este módulo.
export { liveRatingInputs, type MatchResultKind, type RatingInput, ratingInputs } from "./input";
export { RATING_REALISM_LIMITS } from "./limits";
export {
  liveRatings,
  type MatchRatings,
  matchRatings,
  type PlayerRating,
  type RatingKind,
  rate,
} from "./rate";
export { type SeasonRating, seasonRatings } from "./season";
export { RATING_TUNING } from "./tuning";
