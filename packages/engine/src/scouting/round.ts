import type { LeagueSeason } from "../career/types";
import type { FreeAgent } from "../market/types";
import type { CompletedBank, CompletedPlayer } from "../model/types";
import { narrowEstimate } from "../renewal/estimate";
import type { RenewalState } from "../renewal/types";
import { attributeSteps, scoutingRules, targetWidth } from "./rules";
import { effectiveScoutingLevel, openReport, scoutKey, settledScouting } from "./state";
import type { ScoutGrade, ScoutingMoment, ScoutingState, ScoutReport } from "./types";

/**
 * Avanço dos relatórios (039 research R2, R4, R5) depois da rodada de uma liga principal: os
 * observados do país dela (os livres, pela liga do país do técnico) e o elenco do técnico, quando a
 * liga é a dele. Só informação: nada aqui muda resultado nenhum do jogo.
 */

/** Grau em texto de um atributo oculto de 1 a 100 (cortes fixos: ≤ 33, 34–66, ≥ 67). */
export function gradeOf(value: number): ScoutGrade {
  return value <= 33 ? 1 : value <= 66 ? 2 : 3;
}

type Scoutable = Pick<CompletedPlayer, "id" | "strength" | "hidden">;

/** Uma etapa num relatório: faixa estreitada e, a partir do tempo mínimo, os graus. */
export function advanceReport(
  report: ScoutReport,
  player: Scoutable,
  rules: ReturnType<typeof scoutingRules>,
  level: number,
  careerSeed: string,
  at: ScoutingMoment,
): ScoutReport {
  const steps = report.steps + 1;
  const width = Math.min(
    report.estimate.high - report.estimate.low,
    targetWidth(rules, level, steps),
  );
  const estimate = narrowEstimate(
    report.estimate,
    player,
    width,
    scoutKey(careerSeed, `${at.season}:${at.round}`, player.id),
  );
  const graded = steps >= attributeSteps(rules, level);
  return {
    estimate,
    steps,
    ...(graded || report.temperament !== undefined
      ? { temperament: report.temperament ?? gradeOf(player.hidden.temperament) }
      : {}),
    ...(graded || report.injury !== undefined
      ? { injury: report.injury ?? gradeOf(player.hidden.injuryProneness) }
      : {}),
    updated: at,
  };
}

export interface ScoutingRoundContext {
  world: CompletedBank;
  /** Liga principal que fechou a rodada. */
  league: LeagueSeason;
  round: number;
  careerSeed: string;
  /** Clube do técnico; "" desempregado. */
  managerClubId: string;
  renewal?: RenewalState | undefined;
  freeAgents?: readonly FreeAgent[] | undefined;
}

function countryOfLeague(world: CompletedBank, league: LeagueSeason): string | undefined {
  return world.competitions.find((entry) => entry.id === league.competitionId)?.countryId;
}

/** Relatórios depois da rodada `round` da liga (039 FR-007, FR-014, FR-015). */
export function scoutingAfterRound(
  scouting: ScoutingState,
  context: ScoutingRoundContext,
): ScoutingState {
  const { world, league, round, careerSeed, managerClubId } = context;
  const current = settledScouting(scouting, managerClubId);
  const country = countryOfLeague(world, league);
  if (country === undefined) return current;
  const clubCountry = new Map(world.clubs.map((club) => [club.id, club.countryId]));
  const managerCountry = clubCountry.get(managerClubId);
  const level = effectiveScoutingLevel(current, managerClubId);
  const rules = scoutingRules(world, managerClubId || (world.clubs[0]?.id ?? ""));
  const at = { season: league.number, round };
  const byId = new Map<string, Scoutable & { clubId?: string }>(
    world.players.map((player) => [player.id, player]),
  );
  for (const agent of context.freeAgents ?? []) {
    if (!byId.has(agent.player.id)) byId.set(agent.player.id, agent.player);
  }
  let reports = current.reports;
  const touch = (playerId: string, step: (report: ScoutReport | undefined) => ScoutReport) => {
    reports = { ...reports, [playerId]: step(reports[playerId]) };
  };
  // Observados: avançam pelas rodadas da liga do país do clube atual (livres: o do técnico).
  if (level > 0) {
    for (const entry of current.watch) {
      const player = byId.get(entry.playerId);
      if (!player) continue;
      const playerCountry = player.clubId ? clubCountry.get(player.clubId) : managerCountry;
      if (playerCountry !== country) continue;
      touch(entry.playerId, (report) =>
        advanceReport(
          report ?? openReport(player, rules.initialWidth, careerSeed, at),
          player,
          rules,
          level,
          careerSeed,
          at,
        ),
      );
    }
  }
  // Elenco do técnico: relatório automático, sem vaga, mesmo com o departamento fechado.
  const managerLeague =
    managerClubId !== "" &&
    league.divisions.some((season) => season.clubIds.includes(managerClubId));
  if (managerLeague) {
    const graduates = context.renewal?.academy?.graduates ?? {};
    const watched = new Set(current.watch.map((entry) => entry.playerId));
    for (const player of world.players) {
      if (player.clubId !== managerClubId || (level > 0 && watched.has(player.id))) continue;
      touch(player.id, (report) =>
        advanceReport(
          report ??
            openReport(player, rules.initialWidth, careerSeed, at, graduates[player.id]?.estimate),
          player,
          rules,
          Math.max(1, level),
          careerSeed,
          at,
        ),
      );
    }
  }
  return reports === current.reports ? current : { ...current, reports };
}

const byUpdated = (a: [string, ScoutReport], b: [string, ScoutReport]) =>
  a[1].updated.season - b[1].updated.season ||
  a[1].updated.round - b[1].updated.round ||
  (a[0] < b[0] ? -1 : 1);

/**
 * Limpeza (virada e ao passar do teto, research R6): saem relatórios e observações de quem não está
 * mais no mundo nem entre os livres; acima do teto, saem os mais antigos pela última atualização,
 * fora da observação e do elenco do técnico.
 */
export function pruneScouting(
  scouting: ScoutingState,
  world: CompletedBank,
  managerClubId: string,
  freeAgents: readonly FreeAgent[] = [],
): ScoutingState {
  const alive = new Set([
    ...world.players.map((player) => player.id),
    ...freeAgents.map((agent) => agent.player.id),
  ]);
  const watch = scouting.watch.filter((entry) => alive.has(entry.playerId));
  const kept = Object.entries(scouting.reports).filter(([playerId]) => alive.has(playerId));
  const cap = scoutingRules(world, managerClubId || (world.clubs[0]?.id ?? "")).reportCap;
  let reports = kept;
  if (kept.length > cap) {
    const protectedIds = new Set([
      ...watch.map((entry) => entry.playerId),
      ...world.players.filter((p) => p.clubId === managerClubId).map((p) => p.id),
    ]);
    const removable = kept.filter(([id]) => !protectedIds.has(id)).sort(byUpdated);
    const drop = new Set(removable.slice(0, kept.length - cap).map(([id]) => id));
    reports = kept.filter(([id]) => !drop.has(id));
  }
  if (
    watch.length === scouting.watch.length &&
    reports.length === Object.keys(scouting.reports).length
  ) {
    return scouting;
  }
  return { ...scouting, watch, reports: Object.fromEntries(reports) };
}
