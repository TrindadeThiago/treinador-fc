import {
  type ClubFixture,
  type CompletedPlayer,
  clubDivision,
  competitionSeason,
  type FormResult,
  type HeadlineType,
  lineupForMatch,
  preferredFormation,
  teamStrength,
  upcomingUnavailability,
} from "@brasfoot-like/engine";
import { nextFixture, type SaveFile, seasonStateOf } from "@brasfoot-like/save";
import { goalRows } from "./board-view";
import { fitnessAt, lastResults } from "./selectors";

/** Um lado do próximo jogo: o clube e a forma recente (do mais antigo ao mais novo). */
export interface PreviewSide {
  clubId: string;
  form: FormResult[];
}

/** O próximo jogo na Início (035): os dois lados e os três indicadores (research R1–R4). */
export interface MatchPreview {
  fixture: ClubFixture;
  /** O mandante, sempre à esquerda. */
  home: PreviewSide;
  away: PreviewSide;
  /** Força do time escalado do técnico e da escalação provável do adversário, inteiras. */
  strength: { mine: number; opponent: number };
  /** Condição física média (0–100) dos titulares escalados. */
  fitness: number;
  /** Jogadores do elenco indisponíveis para o jogo (lesões e suspensões da competição). */
  absences: number;
}

function squadOf(save: SaveFile, clubId: string): CompletedPlayer[] {
  return save.bank.players.filter((player) => player.clubId === clubId);
}

function formOf(save: SaveFile, clubId: string): FormResult[] {
  return lastResults(seasonStateOf(save), clubId, 5).map((result) => result.result);
}

/** Força do adversário com a escalação que a temporada daria a ele (a mesma que vai a campo). */
function opponentStrength(save: SaveFile, fixture: ClubFixture, clubId: string): number {
  const state = seasonStateOf(save);
  const squad = squadOf(save, clubId);
  if (squad.length === 0) return 0;
  const season = clubDivision(competitionSeason(state, fixture.competitionId), clubId);
  const formation = season?.formations[clubId] ?? preferredFormation(squad);
  try {
    const { lineup } = lineupForMatch(squad, formation, upcomingUnavailability(state, clubId));
    return strengthOf(lineup.formation, lineup.starters, squad);
  } catch {
    // Elenco sem onze jogadores: sem escalação possível, a força não se aplica.
    return 0;
  }
}

function strengthOf(
  formation: Parameters<typeof teamStrength>[0]["formation"],
  starters: Readonly<Record<string, string>>,
  squad: readonly CompletedPlayer[],
): number {
  const players = new Map(squad.map((player) => [player.id, player]));
  const onField: Record<string, CompletedPlayer | undefined> = {};
  for (const [slotId, playerId] of Object.entries(starters))
    onField[slotId] = players.get(playerId);
  return Math.round(teamStrength({ formation, onField }).overall);
}

/** Próximo jogo com os indicadores; `undefined` sem jogo marcado. Função pura do save. */
export function matchPreview(save: SaveFile): MatchPreview | undefined {
  const fixture = nextFixture(save);
  if (!fixture) return undefined;
  const opponentId = fixture.home === save.clubId ? fixture.away : fixture.home;
  const squad = squadOf(save, save.clubId);
  const unavailable = upcomingUnavailability(seasonStateOf(save), save.clubId);
  const blocked = new Set(unavailable.map((entry) => entry.playerId));
  const fitness = fitnessAt(save);
  const starters = Object.values(save.lineup.starters).filter(
    (playerId) => playerId && !blocked.has(playerId),
  );
  const average =
    starters.length === 0
      ? 0
      : Math.round(
          starters.reduce((sum, playerId) => sum + fitness(playerId), 0) / starters.length,
        );
  return {
    fixture,
    home: { clubId: fixture.home, form: formOf(save, fixture.home) },
    away: { clubId: fixture.away, form: formOf(save, fixture.away) },
    strength: {
      mine: strengthOf(save.lineup.formation, save.lineup.starters, squad),
      opponent: opponentStrength(save, fixture, opponentId),
    },
    fitness: average,
    absences: unavailable.length,
  };
}

/** Resumo das metas da temporada numa linha (035 FR-017). */
export interface GoalSummary {
  /** Metas no caminho ou já cumpridas. */
  onTrack: number;
  /** Metas já medidas (no caminho, em risco, cumpridas ou perdidas). */
  total: number;
  /** Metas ainda sem medida. */
  pending: number;
}

export function goalSummary(save: SaveFile): GoalSummary | undefined {
  const rows = goalRows(save);
  if (!rows || rows.length === 0) return undefined;
  let onTrack = 0;
  let total = 0;
  let pending = 0;
  for (const row of rows) {
    if (row.status === "inProgress") {
      pending += 1;
      continue;
    }
    total += 1;
    if (row.status === "onTrack" || row.status === "met") onTrack += 1;
  }
  return { onTrack, total, pending };
}

export type HeadlineCategory =
  | "result"
  | "derby"
  | "coaches"
  | "market"
  | "table"
  | "cup"
  | "continental"
  | "regional"
  | "academy";

const CATEGORY: Record<HeadlineType, HeadlineCategory> = {
  result: "result",
  hatTrick: "result",
  rout: "result",
  comeback: "result",
  upset: "result",
  streak: "result",
  droughtEnd: "result",
  record: "result",
  derby: "derby",
  coachFired: "coaches",
  coachHired: "coaches",
  managerFired: "coaches",
  managerHired: "coaches",
  bigTransfer: "market",
  titleClinched: "table",
  promotionClinched: "table",
  relegationConfirmed: "table",
  seasonSummary: "table",
  qualification: "table",
  cupUpset: "cup",
  cupElimination: "cup",
  cupFinal: "cup",
  cupChampion: "cup",
  continentalAdvanced: "continental",
  continentalEliminated: "continental",
  continentalChampion: "continental",
  continentalRout: "continental",
  regionalChampion: "regional",
  regionalPromoted: "regional",
  regionalRelegated: "regional",
  academyRevelation: "academy",
  academyDebut: "academy",
  academyFirstGoal: "academy",
  academySale: "academy",
};

/** Etiqueta de categoria de uma manchete no cartão da Início (research R5). */
export function headlineCategory(type: HeadlineType): HeadlineCategory {
  return CATEGORY[type];
}
