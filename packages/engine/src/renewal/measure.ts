import { ageOn } from "../calendar/date";
import type { LeagueSeason } from "../career/types";
import type { CompletedBank } from "../model/types";
import { seedAcademies, withAcademyClubs } from "./academy-levels";
import { PROSPECT_POTENTIAL, REGULATOR_RULES, STAR_THRESHOLD } from "./rules";
import type { AcademyState, RenewalState, WorldMeasure } from "./types";

/** Percentil pelo método do posto mais próximo sobre valores ordenados. */
function percentile(sorted: readonly number[], fraction: number): number {
  return sorted[Math.floor(fraction * (sorted.length - 1))] ?? 0;
}

/** Distribuição de força e idade dos jogadores dos clubes da competição (R1, R9). */
export function measureWorld(
  world: CompletedBank,
  league: LeagueSeason,
  date: string,
  academy?: AcademyState,
): WorldMeasure {
  const clubs = new Set(league.divisions.flatMap((season) => season.clubIds));
  // A base entra uma vez nas medidas (036 FR-019): os jovens estão fora de `world.players`.
  const players = [
    ...world.players.filter((player) => clubs.has(player.clubId)),
    ...(academy?.players ?? [])
      .filter((entry) => clubs.has(entry.clubId))
      .map((entry) => ({ ...entry.player, clubId: entry.clubId })),
  ];
  const strengths = players.map((player) => player.strength).sort((a, b) => a - b);
  const total = strengths.reduce((sum, value) => sum + value, 0);
  const ages = players.reduce((sum, player) => sum + ageOn(player.birthDate, date), 0);
  return {
    players: players.length,
    mean: players.length ? total / players.length : 0,
    p10: percentile(strengths, 0.1),
    p50: percentile(strengths, 0.5),
    p90: percentile(strengths, 0.9),
    max: strengths.at(-1) ?? 0,
    stars: strengths.filter((value) => value >= STAR_THRESHOLD).length,
    prospects: players.filter(
      (player) =>
        player.hidden.potential >= PROSPECT_POTENTIAL &&
        ageOn(player.birthDate, date) <= REGULATOR_RULES.prospectAge,
    ).length,
    meanAge: players.length ? ages / players.length : 0,
  };
}

/** Número sequencial de um id `prefixo-NNNNN` (0 se não tiver). */
export function playerSeq(id: string): number {
  const value = Number(id.split("-").at(-1));
  return Number.isInteger(value) ? value : 0;
}

/** Estado inicial da renovação: próximo id depois do maior existente, regulador neutro. */
export function initialRenewal(world: CompletedBank): RenewalState {
  const max = world.players.reduce((highest, player) => Math.max(highest, playerSeq(player.id)), 0);
  return {
    nextPlayerSeq: max + 1,
    regulator: { strengthOffset: 0, potentialBonus: 0 },
    // Academia de todos os clubes pelo nível da reputação desde o início (037).
    academy: withAcademyClubs(world, {
      players: [],
      graduates: {},
      promotedThisSeason: [],
      releasedThisSeason: [],
      emergencies: 0,
    }),
  };
}

/**
 * Renovação de uma carreira nova (037 FR-004b): o estado inicial com a base de todos os clubes
 * cheia (15 jovens). Usada pela criação do save e pelas simulações sem interação.
 */
export function initialCareerRenewal(
  world: CompletedBank,
  careerSeed: string,
  date: string,
): RenewalState {
  return seedAcademies(world, initialRenewal(world), careerSeed, date);
}
