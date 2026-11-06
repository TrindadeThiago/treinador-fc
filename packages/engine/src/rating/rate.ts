import type { MatchState, Side } from "../match/types";
import type { Position } from "../model/catalogs";
import type { CompletedPlayer } from "../model/types";
import type { MatchRecord } from "../season/types";
import { compareText } from "../serialize/compare";
import { liveRatingInputs, type RatingInput, ratingInputs } from "./input";
import { RATING_TUNING } from "./tuning";

export type RatingKind = "full" | "simplified";

export interface PlayerRating {
  /** 0 a 10, uma casa; ausente abaixo do mínimo de minutos. */
  rating?: number;
  kind: RatingKind;
  position: Position;
}

export interface MatchRatings {
  players: Record<string, PlayerRating>;
  /** Maior nota da partida, com o desempate fixo (FR-006). */
  best?: { playerId: string; side: Side; rating: number };
}

type Players = ReadonlyMap<string, Pick<CompletedPlayer, "position">>;

/** Uma casa decimal, arredondando em inteiros (o mesmo em qualquer engine). */
function oneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Nota de um jogador a partir das entradas (034 research R3 e R4); nada abaixo do mínimo. */
export function rate(input: RatingInput): PlayerRating {
  const tuning = RATING_TUNING;
  const position = input.position;
  const kind: RatingKind = input.plays ? "full" : "simplified";
  if (input.minutes < tuning.minMinutes) return { kind, position };
  const share = Math.min(1, input.minutes / 90);
  let delta = kind === "full" ? tuning.offset[position] : tuning.simplifiedOffset[position];
  delta += tuning.goal[position] * input.goals + tuning.assist * input.assists;
  delta += tuning.conceded[position] * input.goalsConceded;
  if (input.goalsConceded === 0 && input.minutes >= tuning.cleanSheetMinutes) {
    delta += tuning.cleanSheet[position];
  }
  if (input.result === "win") delta += tuning.win * share;
  if (input.result === "loss") delta += tuning.loss * share;
  delta += tuning.yellow * input.yellows + (input.red ? tuning.red : 0);
  delta += tuning.penaltyConceded * input.penaltiesConceded;
  const plays = input.plays;
  if (plays) {
    delta += tuning.keyPass[position] * plays.keyPasses;
    delta += tuning.shot[position] * plays.shots;
    delta += tuning.tackleWon[position] * plays.tacklesWon;
    delta += tuning.interception[position] * plays.interceptions;
    delta +=
      tuning.passOverExpected[position] *
      (plays.passesCompleted - tuning.expectedAccuracy * plays.passes);
    if (position === "GK") delta += tuning.save * plays.saves;
  }
  const shrink = Math.min(1, input.minutes / tuning.fullMinutes);
  const rating = oneDecimal(Math.min(10, Math.max(0, tuning.reference + shrink * delta)));
  return { rating, kind, position };
}

function ratingsOf(inputs: readonly RatingInput[]): MatchRatings {
  const players: Record<string, PlayerRating> = {};
  let best: { input: RatingInput; rating: number } | undefined;
  for (const input of inputs) {
    const rated = rate(input);
    players[input.playerId] = rated;
    if (rated.rating === undefined) continue;
    if (!best || better(input, rated.rating, best.input, best.rating)) {
      best = { input, rating: rated.rating };
    }
  }
  return {
    players,
    ...(best
      ? { best: { playerId: best.input.playerId, side: best.input.side, rating: best.rating } }
      : {}),
  };
}

/** Desempate do melhor em campo (FR-006): nota, gols, assistências, time vencedor e id. */
function better(a: RatingInput, ra: number, b: RatingInput, rb: number): boolean {
  if (ra !== rb) return ra > rb;
  if (a.goals !== b.goals) return a.goals > b.goals;
  if (a.assists !== b.assists) return a.assists > b.assists;
  const aWin = a.result === "win" ? 1 : 0;
  const bWin = b.result === "win" ? 1 : 0;
  if (aWin !== bWin) return aWin > bWin;
  return compareText(a.playerId, b.playerId) < 0;
}

/** Notas da partida a partir do registro (034 contrato engine-rating). */
export function matchRatings(record: MatchRecord, players: Players): MatchRatings {
  return ratingsOf(ratingInputs(record, players));
}

/** Notas parciais durante a partida, a partir do estado ao vivo. */
export function liveRatings(state: MatchState, players: Players): MatchRatings {
  return ratingsOf(liveRatingInputs(state, players));
}
