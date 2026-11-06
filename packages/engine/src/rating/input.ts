import { mainPosition, type PlayStats, playStatsOf } from "../match/plays";
import type { MatchEvent, MatchState, Side } from "../match/types";
import type { Position } from "../model/catalogs";
import type { CompletedPlayer } from "../model/types";
import { playerLines } from "../season/record";
import type { MatchRecord } from "../season/types";

export type MatchResultKind = "win" | "draw" | "loss";

/** O que a nota de um jogador usa numa partida (034 data-model). */
export interface RatingInput {
  playerId: string;
  side: Side;
  minutes: number;
  position: Position;
  goals: number;
  assists: number;
  yellows: number;
  red: boolean;
  penaltiesConceded: number;
  /** Gols do adversário com o jogador em campo. */
  goalsConceded: number;
  result: MatchResultKind;
  /** Jogadas da partida; ausentes nas partidas sem jogadas (nota simplificada). */
  plays?: PlayStats;
}

type Players = ReadonlyMap<string, Pick<CompletedPlayer, "position">>;

interface Line {
  side: Side;
  minutes: number;
  goals: number;
  assists: number;
  yellows: number;
  red: boolean;
  plays?: PlayStats;
}

const opposite = (side: Side): Side => (side === "home" ? "away" : "home");

function resultOf(score: Record<Side, number>, side: Side): MatchResultKind {
  const mine = score[side];
  const theirs = score[opposite(side)];
  return mine > theirs ? "win" : mine === theirs ? "draw" : "loss";
}

/**
 * Gols sofridos por cada jogador com ele em campo e pênaltis cometidos (034 research R5): percorre
 * os eventos em ordem. Começa em campo quem tem linha e não entrou por substituição; sai quem é
 * substituído ou expulso. O registro guarda exatamente esses eventos, então ao vivo e no resumo a
 * conta é a mesma.
 */
function eventTotals(lines: ReadonlyMap<string, Line>, events: readonly MatchEvent[]) {
  const subbedIn = new Set<string>();
  for (const event of events) if (event.type === "substitution") subbedIn.add(event.inId);
  const onField = new Set([...lines.keys()].filter((playerId) => !subbedIn.has(playerId)));
  const conceded = new Map<string, number>();
  const penalties = new Map<string, number>();
  for (const event of [...events].sort((a, b) => a.seq - b.seq)) {
    if (event.type === "substitution") {
      onField.delete(event.outId);
      onField.add(event.inId);
    } else if (event.type === "red_card") {
      onField.delete(event.playerId);
    } else if (event.type === "penalty_awarded") {
      penalties.set(event.foulerId, (penalties.get(event.foulerId) ?? 0) + 1);
    } else if (event.type === "shot" && event.outcome === "goal") {
      for (const playerId of onField) {
        if (lines.get(playerId)?.side === opposite(event.side)) {
          conceded.set(playerId, (conceded.get(playerId) ?? 0) + 1);
        }
      }
    }
  }
  return { conceded, penalties };
}

function build(
  lines: ReadonlyMap<string, Line>,
  events: readonly MatchEvent[],
  score: Record<Side, number>,
  players: Players,
): RatingInput[] {
  const { conceded, penalties } = eventTotals(lines, events);
  const inputs: RatingInput[] = [];
  for (const [playerId, line] of lines) {
    const position =
      (line.plays && mainPosition(line.plays)) ?? players.get(playerId)?.position ?? "MF";
    inputs.push({
      playerId,
      side: line.side,
      minutes: line.minutes,
      position,
      goals: line.goals,
      assists: line.assists,
      yellows: line.yellows,
      red: line.red,
      penaltiesConceded: penalties.get(playerId) ?? 0,
      goalsConceded: conceded.get(playerId) ?? 0,
      result: resultOf(score, line.side),
      ...(line.plays ? { plays: line.plays } : {}),
    });
  }
  return inputs;
}

/**
 * Defesas do goleiro numa tupla de 6 (v19, sem as defesas): as finalizações no alvo do adversário
 * menos os gols dele, para o goleiro com mais minutos do lado (034 research R6).
 */
function estimateSaves(record: MatchRecord, inputs: RatingInput[]): void {
  for (const side of ["home", "away"] as const) {
    const keepers = inputs.filter(
      (input) => input.side === side && input.position === "GK" && input.plays,
    );
    const keeper = keepers.sort((a, b) => b.minutes - a.minutes)[0];
    if (!keeper?.plays) continue;
    const other = record.stats[opposite(side)];
    keeper.plays = {
      ...keeper.plays,
      saves: Math.max(0, other.shotsOnTarget - record.score[opposite(side)]),
    };
  }
}

/** Entradas da nota de cada jogador a partir do registro da partida (034). */
export function ratingInputs(record: MatchRecord, players: Players): RatingInput[] {
  const lines = new Map<string, Line>();
  let sixOnly = false;
  for (const [playerId, line] of Object.entries(playerLines(record))) {
    if (line.plays && line.plays.length < 9) sixOnly = true;
    lines.set(playerId, {
      side: line.side,
      minutes: line.minutes,
      goals: line.goals,
      assists: line.assists,
      yellows: line.yellows,
      red: line.red,
      ...(line.plays ? { plays: playStatsOf(line.plays) } : {}),
    });
  }
  const inputs = build(lines, record.events, record.score, players);
  if (sixOnly) estimateSaves(record, inputs);
  return inputs;
}

/** Entradas da nota durante a partida, a partir do estado ao vivo (034). */
export function liveRatingInputs(state: MatchState, players: Players): RatingInput[] {
  const reds = new Set(
    state.events.filter((event) => event.type === "red_card").map((event) => event.playerId),
  );
  const lines = new Map<string, Line>();
  for (const side of ["home", "away"] as const) {
    for (const [playerId, player] of Object.entries(state.teams[side].players)) {
      lines.set(playerId, {
        side,
        minutes: player.minutesPlayed,
        goals: player.goals,
        assists: player.assists,
        yellows: player.yellowCards,
        red: reds.has(playerId),
        ...(player.plays ? { plays: player.plays } : {}),
      });
    }
  }
  return build(lines, state.events, state.score, players);
}
