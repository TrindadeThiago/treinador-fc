import { aggregateWith, type LiveMatch, legAggregate, type Side } from "@brasfoot-like/engine";
import { type SaveFile, seasonStateOf } from "@brasfoot-like/save";

/** Agregado do jogo de volta em andamento; `undefined` fora da volta de um ida e volta. */
export function liveAggregate(match: LiveMatch): Record<Side, number> | undefined {
  const decider = match.state.input.decider;
  if (match.fixture.tie?.legs !== 2 || !decider) return undefined;
  return aggregateWith(decider, match.state.score);
}

interface Game {
  round: number;
  home: string;
  away: string;
}

/**
 * Agregado de um jogo de volta da temporada atual, somando a ida a `score` (o placar da volta; na
 * véspera, zero a zero). Procura o jogo em `competitionId` ou, sem ele, em todas as competições.
 */
export function aggregateOf(
  save: SaveFile,
  game: Game,
  score: Record<Side, number>,
  competitionId?: string,
): Record<Side, number> | undefined {
  const state = seasonStateOf(save);
  const leagues = [state.league, ...state.competitions].filter(
    (league) => competitionId === undefined || league.competitionId === competitionId,
  );
  for (const league of leagues) {
    for (const division of league.divisions) {
      const fixture = division.calendar[game.round - 1]?.fixtures.find(
        (entry) => entry.home === game.home && entry.away === game.away,
      );
      if (fixture?.tie) return legAggregate(state.world, division, fixture, score);
    }
  }
  return undefined;
}
