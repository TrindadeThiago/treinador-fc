import type { Tiebreaker } from "../model/catalogs";
import type { CompletedBank } from "../model/types";
import { stagedStandings } from "../stages/ranking";
import { type Points, rankRows } from "./rank";
import type { Season, StandingRow } from "./types";

export type { Points, RankOptions } from "./rank";
export { rankRows } from "./rank";

function leagueFormat(
  season: Season,
  world: CompletedBank,
): { points: Points; tiebreakers: Tiebreaker[] } {
  const competition = world.competitions.find((entry) => entry.id === season.competitionId);
  if (!competition) throw new Error(`competição inexistente: ${season.competitionId}`);
  // Uma copa não tem classificação por pontos; os padrões só evitam falhar se alguém a pedir.
  if (competition.format.type !== "league") {
    return {
      points: { win: 3, draw: 1, loss: 0 },
      tiebreakers: ["wins", "goal-difference", "goals-for", "draw-lots"],
    };
  }
  return { points: competition.format.points, tiebreakers: competition.format.tiebreakers };
}

/** Tabela de classificação derivada dos registros (FR-010 a FR-014). */
export function standings(season: Season, world: CompletedBank): StandingRow[] {
  // A diretoria, a torcida e as notícias pedem a mesma tabela várias vezes por rodada (a diretoria,
  // uma por clube). Registros, clubes, fases e competições nunca mudam no lugar: a tabela vale
  // enquanto as mesmas listas forem as da temporada. A lista devolvida é compartilhada (somente leitura).
  const hit = TABLES.get(season);
  if (
    hit &&
    hit.records === season.records &&
    hit.clubIds === season.clubIds &&
    hit.stages === season.stages &&
    hit.competitions === world.competitions
  ) {
    return hit.table;
  }
  const table = computeStandings(season, world);
  TABLES.set(season, {
    records: season.records,
    clubIds: season.clubIds,
    stages: season.stages,
    competitions: world.competitions,
    table,
  });
  return table;
}

const TABLES = new WeakMap<
  Season,
  {
    records: Season["records"];
    clubIds: Season["clubIds"];
    stages: Season["stages"];
    competitions: CompletedBank["competitions"];
    table: StandingRow[];
  }
>();

function computeStandings(season: Season, world: CompletedBank): StandingRow[] {
  // Divisão em fases (019): a posição final de FR-024, para torcida, diretoria, composição e histórico.
  if (season.stages) return stagedStandings(season, world);
  const { points, tiebreakers } = leagueFormat(season, world);
  return rankRows(season.clubIds, season.records, points, tiebreakers, season.seed);
}
