import type { LeagueSeason } from "../career/types";
import { aiMarketRules } from "../market/ai/rules";
import { squadLimit } from "../market/squad";
import { POSITIONS, type Position } from "../model/catalogs";
import type { CompletedBank, CompletedPlayer } from "../model/types";
import { isRegionalOnly } from "../regional/scope";
import { squadOf } from "../world/squads";
import {
  academyState,
  asClubPlayer,
  byUtilityDesc,
  promotionsForMinimums,
  renewalUtility,
  withGraduates,
  withoutAcademyPlayers,
} from "./academy";
import { playerRef } from "./retirement";
import { ACADEMY_RULES, SQUAD_RULES } from "./rules";
import type { AcademyPlayer, PlayerRef, RenewalState } from "./types";

/** Máximo do elenco de um clube só regional (036). */
const REGIONAL_SQUAD_MAX = 24;

/** Problemas de elenco de cada clube da competição (vazio = todos dentro das regras). */
export function squadProblems(
  world: CompletedBank,
  league: LeagueSeason,
  managerClubId?: string,
): string[] {
  const problems: string[] = [];
  for (const clubId of league.divisions.flatMap((season) => season.clubIds).sort()) {
    const squad = world.players.filter((player) => player.clubId === clubId);
    if (squad.length < SQUAD_RULES.min || squad.length > squadLimit(clubId, managerClubId)) {
      problems.push(`${clubId}: ${squad.length} jogadores`);
    }
    for (const position of POSITIONS) {
      const count = squad.filter((player) => player.position === position).length;
      if (count < SQUAD_RULES.positionMin[position])
        problems.push(`${clubId}: ${count} ${position}`);
    }
  }
  return problems;
}

/**
 * Promoções da base e dispensas até as regras de elenco (036 R5; FR-011 a FR-013 da 009), clube por
 * clube em ordem de id. Ninguém é criado aqui (036 FR-011): a IA promove o melhor da base de cada
 * posição abaixo do mínimo, depois até o mínimo total e depois até `aiTargetSize` (respeitando o
 * teto por posição); depois libera os de menor utilidade acima dos tetos e do máximo. O clube do
 * técnico só libera acima do máximo dele: o elenco é decisão dele (FR-011b).
 */
export function balanceSquads(
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
  /** Promovidos da base pela IA. */
  promoted: PlayerRef[];
  released: PlayerRef[];
  /** Registros completos dos dispensados (viram livres quando há mercado, 010). */
  releasedPlayers: CompletedPlayer[];
} {
  // Elencos de trabalho por clube; os promovidos entram no fim do mundo (como no `push`), e os
  // dispensados saem do mundo de uma vez no final.
  void careerSeed;
  const graduates: CompletedPlayer[] = [];
  const graduatedEntries: AcademyPlayer[] = [];
  const removed = new Set<string>();
  const promoted: PlayerRef[] = [];
  const released: PlayerRef[] = [];
  const releasedPlayers: CompletedPlayer[] = [];
  const caps = aiMarketRules(world, league.competitionId).positionMax;
  const utilities = new Map<string, number>();
  const utilityOf = (player: CompletedPlayer) => {
    let value = utilities.get(player.id);
    if (value === undefined) {
      value = renewalUtility(player, date);
      utilities.set(player.id, value);
    }
    return value;
  };
  const byUtility = (a: CompletedPlayer, b: CompletedPlayer) =>
    utilityOf(a) - utilityOf(b) || (a.id < b.id ? -1 : 1);
  let academy = academyState(renewal);
  for (const clubId of league.divisions.flatMap((entry) => entry.clubIds).sort()) {
    const club = world.clubs.find((entry) => entry.id === clubId);
    if (!club) continue;
    const squad: CompletedPlayer[] = [...squadOf(world, clubId)];
    const count = (position: Position) =>
      squad.reduce((total, player) => total + (player.position === position ? 1 : 0), 0);
    const release = (out: CompletedPlayer) => {
      released.push(playerRef(out, date));
      releasedPlayers.push(out);
      removed.add(out.id);
      squad.splice(squad.indexOf(out), 1);
    };
    const isManager = clubId === managerClubId;
    // Clubes só regionais (023): elenco curto, porque a receita deles não sustenta uma folha maior
    // (com a base, todo jovem que sai por idade sobe; sem este teto a folha crescia sem parar).
    const regionalOnly = !isManager && isRegionalOnly(world, clubId);
    const max = regionalOnly ? REGIONAL_SQUAD_MAX : squadLimit(clubId, managerClubId);
    if (!isManager) {
      const pool = academy.players.filter((entry) => entry.clubId === clubId);
      const chosen = promotionsForMinimums(squad, pool, date);
      const rest = pool.filter((entry) => !chosen.includes(entry)).sort(byUtilityDesc(date));
      let size = squad.length + chosen.length;
      const counts = new Map<Position, number>(
        POSITIONS.map((position) => [position, count(position)]),
      );
      for (const entry of chosen)
        counts.set(entry.player.position, (counts.get(entry.player.position) ?? 0) + 1);
      // Clubes só regionais (023): elenco menor (a receita deles não sustenta a folha de 25), mas
      // acima do mínimo, porque no mínimo o clube não pode vender e a venda é parte da receita.
      const target = regionalOnly ? SQUAD_RULES.min + 2 : ACADEMY_RULES.aiTargetSize;
      for (const entry of rest) {
        if (size >= Math.min(target, max)) break;
        const position = entry.player.position;
        if ((counts.get(position) ?? 0) >= caps[position]) continue;
        chosen.push(entry);
        counts.set(position, (counts.get(position) ?? 0) + 1);
        size += 1;
      }
      for (const entry of chosen) {
        const player = asClubPlayer(entry);
        graduates.push(player);
        graduatedEntries.push(entry);
        squad.push(player);
        promoted.push(playerRef(player, date));
      }
    }
    // Teto por posição (011 R3): libera os de menor utilidade acima dele (só a IA).
    for (const position of isManager ? [] : POSITIONS) {
      while (count(position) > caps[position]) {
        const out = squad.filter((player) => player.position === position).sort(byUtility)[0];
        if (!out) break;
        release(out);
      }
    }
    while (squad.length > max) {
      const counts = new Map(POSITIONS.map((position) => [position, count(position)]));
      const out = squad
        .filter(
          (player) => (counts.get(player.position) ?? 0) > SQUAD_RULES.positionMin[player.position],
        )
        .sort(byUtility)[0];
      if (!out) break;
      release(out);
    }
  }
  const graduatedIds = new Set(graduatedEntries.map((entry) => entry.player.id));
  academy = withGraduates(
    withoutAcademyPlayers(academy, graduatedIds),
    graduatedEntries,
    season + 1,
  );
  const players = [...world.players, ...graduates].filter((player) => !removed.has(player.id));
  return {
    world: { ...world, players },
    renewal: { ...renewal, academy },
    promoted,
    released,
    releasedPlayers,
  };
}
