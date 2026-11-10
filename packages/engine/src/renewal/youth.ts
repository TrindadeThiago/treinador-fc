import type { LeagueSeason } from "../career/types";
import { aiMarketRules } from "../market/ai/rules";
import { POSITIONS, type Position } from "../model/catalogs";
import type { Club, CompletedBank, CompletedPlayer } from "../model/types";
import { intIrwinHall, triangular } from "../rng/distributions";
import { createRng, type Rng } from "../rng/xoshiro";
import { squadOf } from "../world/squads";
import { birthDateFor, personName, pickTraits } from "../worldgen/players";
import { GENERATOR_TUNING } from "../worldgen/tuning";
import {
  academyState,
  asClubPlayer,
  byUtilityDesc,
  withAcademyPlayers,
  withoutAcademyPlayers,
} from "./academy";
import { type AcademyLevelRule, academyLevelRule } from "./academy-levels";
import { nameBankFor } from "./names";
import { regulatorFor } from "./regulator";
import { playerRef } from "./retirement";
import { EVOLUTION_RULES, YOUTH_RULES } from "./rules";
import type { AcademyPlayer, PlayerRef, RegulatorState, RenewalState } from "./types";

/** Jovens por clube por temporada: base + 1 por degrau de reputação atingido (R6). */
export function youthCount(reputation: number): number {
  return (
    YOUTH_RULES.perClub.base +
    YOUTH_RULES.perClub.reputationSteps.filter((step) => reputation >= step).length
  );
}

/** Id de jogador pelo número da sequência. */
export function playerId(seq: number): string {
  return `jogador-${String(seq).padStart(5, "0")}`;
}

/** Posição mais carente do elenco em relação à composição-alvo do gerador. */
export function neediestPosition(
  squad: readonly CompletedPlayer[],
  rng: Rng,
  caps?: Readonly<Record<Position, number>>,
): Position {
  const counts = new Map<Position, number>(POSITIONS.map((position) => [position, 0]));
  for (const player of squad) counts.set(player.position, (counts.get(player.position) ?? 0) + 1);
  const shortage = (position: Position) =>
    (GENERATOR_TUNING.squad.min[position] - (counts.get(position) ?? 0)) /
    GENERATOR_TUNING.squad.min[position];
  // Posições no teto (011 R3) não recebem jovens; sem teto informado, todas concorrem.
  const open = POSITIONS.filter(
    (position) => !caps || (counts.get(position) ?? 0) < caps[position],
  );
  const candidates = open.length > 0 ? open : POSITIONS;
  const best = Math.max(...candidates.map(shortage));
  return rng.pick(candidates.filter((position) => shortage(position) === best));
}

/** Um jovem novo para o clube, numa posição (R6). */
export function createYouth(
  world: CompletedBank,
  club: Club,
  position: Position,
  seq: number,
  regulator: RegulatorState,
  date: string,
  rng: Rng,
  /** Idade fixa (base inicial, 037) e regra do nível da academia (força e potencial). */
  options: {
    age?: number;
    level?: Pick<AcademyLevelRule, "strengthAdjust" | "potentialBonus">;
    /** Fração da margem de potencial (base inicial, 037: poucas joias). Padrão 1. */
    marginScale?: number;
  } = {},
): CompletedPlayer {
  const { strength: rules, age, potentialMargin } = YOUTH_RULES;
  const playerAge = options.age ?? rng.int(age[0], age[1]);
  const base =
    rules.base +
    rules.perReputation * club.reputation +
    (options.level?.strengthAdjust ?? 0) +
    regulator.strengthOffset;
  const strength = Math.round(
    Math.min(
      EVOLUTION_RULES.maxStrength - 1,
      Math.max(EVOLUTION_RULES.minStrength, base + triangular(rng, -rules.noise, 0, rules.noise)),
    ),
  );
  const margin = Math.round(
    (rng.int(potentialMargin[0], potentialMargin[1]) +
      Math.round(regulator.potentialBonus) +
      (options.level?.potentialBonus ?? 0)) *
      (options.marginScale ?? 1),
  );
  const potential = Math.min(
    EVOLUTION_RULES.maxStrength,
    Math.max(strength + 1, strength + margin),
  );
  return {
    id: playerId(seq),
    ...personName(rng, nameBankFor(world, club.countryId)),
    birthDate: birthDateFor(rng, playerAge, date),
    nationalityId: club.countryId,
    clubId: club.id,
    position,
    strength,
    traits: pickTraits(rng, position),
    hidden: {
      potential,
      temperament: intIrwinHall(rng, 1, 100),
      injuryProneness: intIrwinHall(rng, 1, 100),
    },
  };
}

/**
 * Safra da virada para todos os clubes da competição (FR-008 a FR-010 da 009; 036 FR-002): os
 * jovens chegam à base, em ordem de id de clube; a sequência de ids avança no estado devolvido. A
 * posição de cada jovem é a mais carente contando elenco e base. Na IA, a base acima do limite manda
 * os de menor utilidade para os livres (FR-012); a do técnico fica acima do limite (FR-009a).
 */
export function generateYouth(
  world: CompletedBank,
  league: LeagueSeason,
  renewal: RenewalState,
  careerSeed: string,
  season: number,
  date: string,
  managerClubId?: string,
): {
  world: CompletedBank;
  renewal: RenewalState;
  arrived: PlayerRef[];
  /** Jovens que saíram da base por excesso (clubes da IA), com o clube de origem. */
  released: AcademyPlayer[];
} {
  const clubIds = league.divisions.flatMap((entry) => entry.clubIds).sort();
  const caps = aiMarketRules(world, league.competitionId).positionMax;
  const arrived: PlayerRef[] = [];
  const released: AcademyPlayer[] = [];
  let academy = academyState(renewal);
  const fresh: AcademyPlayer[] = [];
  let seq = renewal.nextPlayerSeq;
  for (const clubId of clubIds) {
    const club = world.clubs.find((entry) => entry.id === clubId);
    if (!club) continue;
    const rng = createRng(`${careerSeed}:youth:${season}:${clubId}`);
    const own = academy.players.filter((entry) => entry.clubId === clubId);
    const base: AcademyPlayer[] = [...own];
    // Quantidade, força e potencial pelo nível da academia (037 FR-004).
    const rule = academyLevelRule(renewal, world, clubId);
    for (let index = 0; index < rule.youthPerIntake; index++) {
      const pool = [...squadOf(world, clubId), ...base.map(asClubPlayer)];
      const youth = createYouth(
        world,
        club,
        neediestPosition(pool, rng, caps),
        seq,
        regulatorFor(renewal, world, league),
        date,
        rng,
        { level: rule },
      );
      seq += 1;
      const { clubId: _clubId, contract: _contract, ...player } = youth;
      const entry: AcademyPlayer = { player, clubId, joinedSeason: season + 1 };
      base.push(entry);
      fresh.push(entry);
      arrived.push(playerRef(youth, date));
    }
    if (clubId !== managerClubId && base.length > rule.slots) {
      const order = [...base].sort(byUtilityDesc(date));
      released.push(...order.slice(rule.slots));
    }
  }
  const out = new Set(released.map((entry) => entry.player.id));
  academy = withAcademyPlayers(
    withoutAcademyPlayers(academy, out),
    fresh.filter((entry) => !out.has(entry.player.id)),
  );
  return {
    world,
    renewal: { ...renewal, nextPlayerSeq: seq, academy },
    arrived,
    released: released.sort((a, b) => (a.player.id < b.player.id ? -1 : 1)),
  };
}
