import { ageOn, seasonDate } from "../calendar/date";
import type { CareerSeasonState } from "../career/season-state";
import { clubFixtures, nextClubFixture } from "../career/season-state";
import { initialContract } from "../market/contracts";
import { addFreeAgents } from "../market/free-agents";
import { marketRules } from "../market/rules";
import { squadLimit } from "../market/squad";
import type { FreeAgent } from "../market/types";
import { isWindowOpen, roundsPlayed, transferWindows } from "../market/windows";
import { POSITIONS, type Position } from "../model/catalogs";
import type { CompletedBank, CompletedPlayer } from "../model/types";
import { createRng } from "../rng/xoshiro";
import { squadOf } from "../world/squads";
import { academyClub, academyLimit, academyRules } from "./academy-levels";
import { withEstimate } from "./estimate";
import { evolutionDelta } from "./evolution";
import { type HallPlayer, hallOf, hallWithPromotions } from "./hall";
import { regulatorFor } from "./regulator";
import { playerRef } from "./retirement";
import { ACADEMY_RULES, EVOLUTION_RULES, SQUAD_RULES } from "./rules";
import type {
  AcademyGraduate,
  AcademyHall,
  AcademyPlayer,
  AcademyState,
  PlayerRef,
  PotentialEstimate,
  RenewalState,
} from "./types";
import { createYouth } from "./youth";

/**
 * Elenco de base (036). Os jovens ficam fora de `world.players` (research.md R1): escalação,
 * mercado, folha e IA de transferências não os veem. Funções puras e determinísticas.
 */

export function emptyAcademy(): AcademyState {
  return {
    players: [],
    graduates: {},
    promotedThisSeason: [],
    releasedThisSeason: [],
    emergencies: 0,
    clubs: {},
  };
}

/** Base da renovação, vazia quando ausente (usos sem carreira). */
export function academyState(renewal: RenewalState | undefined): AcademyState {
  return renewal?.academy ?? emptyAcademy();
}

const byPlayerId = (a: AcademyPlayer, b: AcademyPlayer) =>
  a.player.id < b.player.id ? -1 : a.player.id > b.player.id ? 1 : 0;

/** Jovens da base de um clube, em ordem de id. */
export function academyOf(
  renewal: RenewalState | undefined,
  clubId: string,
): readonly AcademyPlayer[] {
  return academyState(renewal).players.filter((entry) => entry.clubId === clubId);
}

/** O jovem da base como jogador do clube, sem contrato (para medidas, avisos e promoção). */
export function asClubPlayer(entry: AcademyPlayer): CompletedPlayer {
  return { ...entry.player, clubId: entry.clubId };
}

export interface AcademyStatus {
  age: number;
  /** Ano da temporada em que o jovem já não pode estar na base (sai na virada para ela). */
  leavesYear: number;
  /** Número da temporada correspondente a `leavesYear`. */
  leavesSeason: number;
  /** Sai na próxima virada. */
  lastYear: boolean;
}

/** Idade, temporada de saída e último ano de um jovem na temporada atual (R2). */
export function academyStatus(
  entry: AcademyPlayer,
  referenceDate: string,
  season: { year: number; number: number },
): AcademyStatus {
  const age = ageOn(entry.player.birthDate, seasonDate(referenceDate, season.year));
  let leavesYear = season.year + 1;
  while (
    ageOn(entry.player.birthDate, seasonDate(referenceDate, leavesYear)) < ACADEMY_RULES.ageLimit
  )
    leavesYear += 1;
  return {
    age,
    leavesYear,
    leavesSeason: season.number + (leavesYear - season.year),
    lastYear: leavesYear === season.year + 1,
  };
}

/** Utilidade para manter no elenco ou na base (R7 da 009): força, margem dos jovens, idade. */
export function renewalUtility(
  player: CompletedPlayer | AcademyPlayer["player"],
  date: string,
): number {
  const { youthAge, youthWeight, ageFrom, agePenalty } = SQUAD_RULES.utility;
  const age = ageOn(player.birthDate, date);
  const margin =
    age <= youthAge ? youthWeight * Math.max(0, player.hidden.potential - player.strength) : 0;
  return player.strength + margin - agePenalty * Math.max(0, age - ageFrom);
}

/** Do mais útil para o menos útil, com desempate por id. */
export function byUtilityDesc(date: string) {
  return (a: AcademyPlayer, b: AcademyPlayer) =>
    renewalUtility(b.player, date) - renewalUtility(a.player, date) || byPlayerId(a, b);
}

/** Crias de um clube formador: total promovido e as maiores revelações (038 FR-016). */
export function academyHallOf(renewal: RenewalState | undefined, clubId: string): AcademyHall {
  return hallOf(academyState(renewal), clubId);
}

export function graduateOf(
  renewal: RenewalState | undefined,
  playerId: string,
): AcademyGraduate | undefined {
  return academyState(renewal).graduates[playerId];
}

/** Livre que sai da base (dispensa, idade-limite ou excesso, R7). */
export function academyFreeAgent(entry: AcademyPlayer, sinceYear: number): FreeAgent {
  return { player: entry.player, lastClubId: entry.clubId, sinceYear };
}

/** Tira jogadores da base e devolve a base nova (lista em ordem de id). */
export function withoutAcademyPlayers(
  academy: AcademyState,
  playerIds: ReadonlySet<string>,
): AcademyState {
  return {
    ...academy,
    players: academy.players.filter((entry) => !playerIds.has(entry.player.id)),
  };
}

/** Acrescenta jovens à base, mantendo a ordem por id. */
export function withAcademyPlayers(
  academy: AcademyState,
  entries: readonly AcademyPlayer[],
): AcademyState {
  return { ...academy, players: [...academy.players, ...entries].sort(byPlayerId) };
}

/**
 * Registra a origem de promovidos (036) com a safra, a força na promoção e, só quando o formador é o
 * clube do técnico (`keepEstimate`), a faixa da promoção (038 FR-008); soma no histórico do formador.
 */
export function withGraduates(
  academy: AcademyState,
  entries: readonly AcademyPlayer[],
  season: number,
  options: { keepEstimate?: boolean } = {},
): AcademyState {
  if (entries.length === 0) return academy;
  const graduates = { ...academy.graduates };
  const promoted: { player: HallPlayer; graduate: AcademyGraduate }[] = [];
  for (const entry of entries) {
    const graduate: AcademyGraduate = {
      clubId: entry.clubId,
      season,
      joinedSeason: entry.joinedSeason,
      peak: entry.player.strength,
      ...(options.keepEstimate && entry.estimate ? { estimate: entry.estimate } : {}),
    };
    graduates[entry.player.id] = graduate;
    promoted.push({ player: entry.player, graduate });
  }
  return hallWithPromotions({ ...academy, graduates }, promoted);
}

/** Contrato que o jovem assinaria se promovido na temporada `year` (mesma seed de `ensureContracts`). */
function contractFor(world: CompletedBank, entry: AcademyPlayer, year: number, careerSeed: string) {
  const club = world.clubs.find((candidate) => candidate.id === entry.clubId);
  if (!club) throw new Error(`clube inexistente: ${entry.clubId}`);
  const rng = createRng(`${careerSeed}:contract:${year}:${entry.player.id}`);
  return initialContract(asClubPlayer(entry), club, year, world.manifest.referenceDate, rng);
}

/** Contrato que o jovem assinaria se promovido agora (FR-007). */
export function promotionContract(
  state: Pick<CareerSeasonState, "world" | "league" | "renewal">,
  playerId: string,
  careerSeed: string,
): { wage: number; untilYear: number } | undefined {
  const entry = academyState(state.renewal).players.find((item) => item.player.id === playerId);
  if (!entry) return undefined;
  const contract = contractFor(state.world, entry, state.league.year, careerSeed);
  return { wage: contract.wage, untilYear: contract.untilYear };
}

export type AcademyError = "academy.not_found" | "academy.squad_full";

export type AcademyResult =
  | { ok: true; state: CareerSeasonState; player: PlayerRef }
  | { ok: false; error: AcademyError };

function findEntry(state: CareerSeasonState, clubId: string, playerId: string) {
  return academyState(state.renewal).players.find(
    (entry) => entry.player.id === playerId && entry.clubId === clubId,
  );
}

/** Promove um jovem da base do clube do técnico ao elenco, com o contrato inicial (FR-006 a FR-008). */
export function promoteFromAcademy(
  state: CareerSeasonState,
  clubId: string,
  playerId: string,
  careerSeed: string,
): AcademyResult {
  const entry = findEntry(state, clubId, playerId);
  if (!entry || !state.renewal) return { ok: false, error: "academy.not_found" };
  if (squadOf(state.world, clubId).length >= squadLimit(clubId, clubId)) {
    return { ok: false, error: "academy.squad_full" };
  }
  const contract = contractFor(state.world, entry, state.league.year, careerSeed);
  const player: CompletedPlayer = { ...asClubPlayer(entry), contract };
  const ref = playerRef(player, seasonDate(state.world.manifest.referenceDate, state.league.year));
  let academy = withoutAcademyPlayers(academyState(state.renewal), new Set([playerId]));
  academy = withGraduates(academy, [entry], state.league.number, { keepEstimate: true });
  academy = { ...academy, promotedThisSeason: [...academy.promotedThisSeason, ref] };
  return {
    ok: true,
    player: ref,
    state: {
      ...state,
      world: { ...state.world, players: [...state.world.players, player] },
      renewal: { ...state.renewal, academy },
    },
  };
}

/** Dispensa um jovem da base: ele vira livre (FR-009, FR-009b). */
export function releaseFromAcademy(
  state: CareerSeasonState,
  clubId: string,
  playerId: string,
): AcademyResult {
  const entry = findEntry(state, clubId, playerId);
  if (!entry || !state.renewal) return { ok: false, error: "academy.not_found" };
  const ref = playerRef(
    asClubPlayer(entry),
    seasonDate(state.world.manifest.referenceDate, state.league.year),
  );
  let academy = withoutAcademyPlayers(academyState(state.renewal), new Set([playerId]));
  academy = { ...academy, releasedThisSeason: [...academy.releasedThisSeason, ref] };
  return {
    ok: true,
    player: ref,
    state: {
      ...state,
      renewal: { ...state.renewal, academy },
      ...(state.market
        ? { market: addFreeAgents(state.market, [academyFreeAgent(entry, state.league.year)]) }
        : {}),
    },
  };
}

export type RosterIssueCode = "academy_over_limit" | "squad_below_minimum" | "academy_last_year";

export interface RosterIssue {
  code: RosterIssueCode;
  severity: "error" | "warning";
  params: Record<string, string | number>;
}

/** Posições abaixo do mínimo e quantos faltam no total (mínimos por posição e total). */
export function squadShortage(squad: readonly CompletedPlayer[]): {
  missing: number;
  positions: Position[];
} {
  const positions: Position[] = [];
  let byPosition = 0;
  for (const position of POSITIONS) {
    const count = squad.filter((player) => player.position === position).length;
    const lack = SQUAD_RULES.positionMin[position] - count;
    if (lack > 0) {
      positions.push(position);
      byPosition += lack;
    }
  }
  const missing = Math.max(byPosition, SQUAD_RULES.min - squad.length);
  return { missing, positions };
}

function lastYearCount(
  state: Pick<CareerSeasonState, "world" | "league" | "renewal">,
  clubId: string,
) {
  const referenceDate = state.world.manifest.referenceDate;
  return academyOf(state.renewal, clubId).filter(
    (entry) => academyStatus(entry, referenceDate, state.league).lastYear,
  ).length;
}

/**
 * Problemas do clube do técnico antes da próxima partida (FR-009a, FR-010, FR-011b, R8): base
 * acima do limite e elenco abaixo do mínimo impedem; jovens no último ano antes do último jogo do
 * clube pedem confirmação.
 */
export function rosterIssues(state: CareerSeasonState, clubId: string): RosterIssue[] {
  const issues: RosterIssue[] = [];
  const academy = academyOf(state.renewal, clubId);
  const limit = academyLimit(state.renewal, state.world, clubId);
  if (academy.length > limit) {
    issues.push({
      code: "academy_over_limit",
      severity: "error",
      params: { excess: academy.length - limit, limit },
    });
  }
  const shortage = squadShortage(squadOf(state.world, clubId));
  if (shortage.missing > 0) {
    issues.push({
      code: "squad_below_minimum",
      severity: "error",
      params: { missing: shortage.missing, positions: shortage.positions.join(",") },
    });
  }
  const count = lastYearCount(state, clubId);
  if (count > 0) {
    const last = clubFixtures(state, clubId).at(-1);
    const next = nextClubFixture(state, clubId);
    if (next && last && next.day === last.day) {
      issues.push({ code: "academy_last_year", severity: "warning", params: { count } });
    }
  }
  return issues;
}

/** Aviso da última janela (FR-010, R8): jovens no último ano com a última janela aberta. */
export function academyWarning(
  state: CareerSeasonState,
  clubId: string,
): { kind: "last_window"; count: number } | undefined {
  const rules = marketRules(state.world, state.league.competitionId);
  const windows = transferWindows(state.league, rules);
  const last = windows.at(-1);
  if (!last || !isWindowOpen(state.league, rules)) return undefined;
  const played = roundsPlayed(state.league);
  if (played < last.fromRound || played > last.toRound) return undefined;
  const count = lastYearCount(state, clubId);
  return count > 0 ? { kind: "last_window", count } : undefined;
}

/**
 * Evolução da base (FR-004, R4): mesma regra e mesma seed da evolução do mundo, sem minutos
 * (participação 0). Só os clubes informados.
 */
export function evolveAcademy(
  academy: AcademyState,
  clubIds: ReadonlySet<string>,
  careerSeed: string,
  seasonNumber: number,
  moment: "mid" | "end",
  date: string,
  /** Participação mínima pelo nível da academia de cada clube (037 FR-005); padrão 0. */
  bonusOf: (clubId: string) => number = () => 0,
): AcademyState {
  let changed = false;
  const players = academy.players.map((entry) => {
    if (!clubIds.has(entry.clubId)) return entry;
    const { player } = entry;
    const rng = createRng(`${careerSeed}:evolve:${seasonNumber}:${moment}:${player.id}`);
    const delta = evolutionDelta(
      asClubPlayer(entry),
      ageOn(player.birthDate, date),
      bonusOf(entry.clubId),
      rng,
    );
    const ceiling = Math.max(
      EVOLUTION_RULES.minStrength,
      Math.min(EVOLUTION_RULES.maxStrength, player.hidden.potential),
    );
    const strength = Math.min(
      ceiling,
      Math.max(EVOLUTION_RULES.minStrength, player.strength + delta),
    );
    if (strength === player.strength) return entry;
    changed = true;
    return { ...entry, player: { ...player, strength } };
  });
  return changed ? { ...academy, players } : academy;
}

/**
 * Promove da base os melhores para cobrir os mínimos de um elenco (FR-011a, FR-013), sem contrato
 * (quem chama o preenche). Devolve os promovidos, em ordem de escolha.
 */
export function promotionsForMinimums(
  squad: readonly CompletedPlayer[],
  academy: readonly AcademyPlayer[],
  date: string,
): AcademyPlayer[] {
  const chosen: AcademyPlayer[] = [];
  const pool = [...academy].sort(byUtilityDesc(date));
  const counts = new Map<Position, number>(POSITIONS.map((position) => [position, 0]));
  for (const player of squad) counts.set(player.position, (counts.get(player.position) ?? 0) + 1);
  let size = squad.length;
  const take = (entry: AcademyPlayer) => {
    chosen.push(entry);
    pool.splice(pool.indexOf(entry), 1);
    counts.set(entry.player.position, (counts.get(entry.player.position) ?? 0) + 1);
    size += 1;
  };
  for (const position of POSITIONS) {
    while ((counts.get(position) ?? 0) < SQUAD_RULES.positionMin[position]) {
      const best = pool.find((entry) => entry.player.position === position);
      if (!best) break;
      take(best);
    }
  }
  while (size < SQUAD_RULES.min && pool[0]) take(pool[0]);
  return chosen;
}

/** Jovens que passam da idade-limite na temporada que começa em `nextYear` (R5). */
export function agedOut(
  academy: AcademyState,
  clubIds: ReadonlySet<string>,
  referenceDate: string,
  nextYear: number,
): AcademyPlayer[] {
  const date = seasonDate(referenceDate, nextYear);
  return academy.players.filter(
    (entry) =>
      clubIds.has(entry.clubId) && ageOn(entry.player.birthDate, date) >= ACADEMY_RULES.ageLimit,
  );
}

/** Ids na base, no mundo e entre os livres nunca se repetem (data-model.md). */
export function academyIdsProblem(
  world: CompletedBank,
  academy: AcademyState,
  freeAgentIds: readonly string[] = [],
): string | undefined {
  const seen = new Set<string>([...world.players.map((player) => player.id), ...freeAgentIds]);
  const clubs = new Set(world.clubs.map((club) => club.id));
  for (const entry of academy.players) {
    if (seen.has(entry.player.id)) return `jogador da base repetido: ${entry.player.id}`;
    if (!clubs.has(entry.clubId)) return `base de clube inexistente: ${entry.clubId}`;
    seen.add(entry.player.id);
  }
  return undefined;
}

/**
 * Durante a temporada, clube da IA abaixo de um mínimo promove da base, com o contrato inicial
 * (036 FR-013). Sem falta, devolve os mesmos objetos.
 */
export function fillShortSquadsFromAcademy(
  world: CompletedBank,
  renewal: RenewalState,
  clubIds: readonly string[],
  date: string,
  seasonNumber: number,
  careerSeed: string,
  year: number,
): { world: CompletedBank; renewal: RenewalState } {
  let academy = academyState(renewal);
  if (academy.players.length === 0) return { world, renewal };
  const added: CompletedPlayer[] = [];
  const entries: AcademyPlayer[] = [];
  for (const clubId of [...clubIds].sort()) {
    const squad = squadOf(world, clubId);
    if (squadShortage(squad).missing === 0) continue;
    const pool = academy.players.filter((entry) => entry.clubId === clubId);
    for (const entry of promotionsForMinimums(squad, pool, date)) {
      added.push({ ...asClubPlayer(entry), contract: contractFor(world, entry, year, careerSeed) });
      entries.push(entry);
    }
  }
  if (added.length === 0) return { world, renewal };
  academy = withGraduates(
    withoutAcademyPlayers(academy, new Set(entries.map((entry) => entry.player.id))),
    entries,
    seasonNumber,
  );
  return {
    world: { ...world, players: [...world.players, ...added] },
    renewal: { ...renewal, academy },
  };
}

/**
 * Posições em que o técnico pode pedir a safra de emergência (036, decisão de 2026-11-09): o elenco
 * está abaixo de um mínimo e não há nenhum candidato — ninguém da posição na base, nenhum livre da
 * posição e a compra impossível (janela fechada ou caixa negativo). Sem posição específica faltando
 * (só o mínimo total), vale a posição mais carente, e o critério é não haver ninguém na base nem
 * entre os livres. Vazio = não há emergência.
 */
export function emergencyPositions(state: CareerSeasonState, clubId: string): Position[] {
  const squad = squadOf(state.world, clubId);
  const shortage = squadShortage(squad);
  if (shortage.missing === 0) return [];
  const rules = marketRules(state.world, state.league.competitionId);
  const cash = state.finances.clubs[clubId]?.cash ?? 0;
  const canBuy = isWindowOpen(state.league, rules) && cash > 0;
  if (canBuy) return [];
  const base = academyOf(state.renewal, clubId);
  const free = state.market?.freeAgents ?? [];
  const has = (position?: Position) =>
    base.some((entry) => position === undefined || entry.player.position === position) ||
    free.some((agent) => position === undefined || agent.player.position === position);
  if (shortage.positions.length > 0) return shortage.positions.filter((position) => !has(position));
  if (has()) return [];
  const counts = new Map<Position, number>(POSITIONS.map((position) => [position, 0]));
  for (const player of squad) counts.set(player.position, (counts.get(player.position) ?? 0) + 1);
  const neediest = [...POSITIONS].sort(
    (a, b) =>
      (counts.get(a) ?? 0) / SQUAD_RULES.positionMin[a] -
        (counts.get(b) ?? 0) / SQUAD_RULES.positionMin[b] ||
      POSITIONS.indexOf(a) - POSITIONS.indexOf(b),
  )[0];
  return neediest ? [neediest] : [];
}

/**
 * Safra de emergência pedida pelo técnico (036): um jovem novo nasce na base, na posição, e sobe na
 * hora com o contrato inicial. Só quando `emergencyPositions` a permite.
 */
export function emergencyPromotion(
  state: CareerSeasonState,
  clubId: string,
  position: Position,
  careerSeed: string,
): AcademyResult | { ok: false; error: "academy.no_emergency" } {
  if (!state.renewal || !emergencyPositions(state, clubId).includes(position)) {
    return { ok: false, error: "academy.no_emergency" };
  }
  const club = state.world.clubs.find((entry) => entry.id === clubId);
  if (!club) return { ok: false, error: "academy.not_found" };
  const seq = state.renewal.nextPlayerSeq;
  const date = seasonDate(state.world.manifest.referenceDate, state.league.year);
  const rng = createRng(`${careerSeed}:emergency-manager:${state.league.number}:${seq}`);
  const youth = createYouth(
    state.world,
    club,
    position,
    seq,
    regulatorFor(state.renewal, state.world, state.league),
    date,
    rng,
  );
  const { clubId: _c, contract: _k, ...player } = youth;
  const entry = withEstimate(
    { player, clubId, joinedSeason: state.league.number },
    academyRules(state.world, clubId),
    academyClub(state.renewal, state.world, clubId).level,
    careerSeed,
  );
  const withEntry: CareerSeasonState = {
    ...state,
    renewal: {
      ...state.renewal,
      nextPlayerSeq: seq + 1,
      academy: withAcademyPlayers(academyState(state.renewal), [entry]),
    },
  };
  const promoted = promoteFromAcademy(withEntry, clubId, player.id, careerSeed);
  if (!promoted.ok || !promoted.state.renewal) return promoted;
  const academy = academyState(promoted.state.renewal);
  return {
    ...promoted,
    state: {
      ...promoted.state,
      renewal: {
        ...promoted.state.renewal,
        academy: { ...academy, emergencies: academy.emergencies + 1 },
      },
    },
  };
}

/** Jovem de uma lista do bloco Base, com a faixa quando ela é conhecida. */
export interface AcademyReportRow extends PlayerRef {
  estimate?: PotentialEstimate;
}

/** Bloco Base do fim de temporada (038 FR-015, research R8). */
export interface AcademySeasonReport {
  arrived: AcademyReportRow[];
  promoted: AcademyReportRow[];
  left: (AcademyReportRow & { reason: "released" | "ageOut" })[];
}

/**
 * Quem chegou, subiu e saiu da base do clube na temporada. "Chegaram" vem do aviso da virada que
 * abriu a temporada (mesmo clube); sem ele (primeira temporada, ou o técnico trocou de clube), são os
 * jovens da base que chegaram nesta temporada. "Saíram" junta as dispensas e quem está no último ano
 * (sai por idade na virada que vem). Só dados visíveis e a faixa; nada de potencial.
 */
export function academySeasonReport(
  renewal: RenewalState | undefined,
  clubId: string,
  season: { year: number; number: number },
  referenceDate: string,
): AcademySeasonReport {
  const academy = academyState(renewal);
  const own = academy.players.filter((entry) => entry.clubId === clubId);
  const inBase = new Map(own.map((entry) => [entry.player.id, entry]));
  const date = seasonDate(referenceDate, season.year);
  const withEstimate = (ref: PlayerRef): AcademyReportRow => {
    const estimate =
      inBase.get(ref.playerId)?.estimate ?? academy.graduates[ref.playerId]?.estimate;
    return estimate ? { ...ref, estimate } : { ...ref };
  };
  const notice = renewal?.squadNotice;
  const arrivedRefs =
    notice && notice.season === season.number && notice.clubId === clubId
      ? (notice.academyArrived ?? [])
      : own
          .filter((entry) => entry.joinedSeason === season.number)
          .map((entry) => playerRef(asClubPlayer(entry), date));
  const lastYear = own
    .filter((entry) => academyStatus(entry, referenceDate, season).lastYear)
    .map((entry) => ({
      ...withEstimate(playerRef(asClubPlayer(entry), date)),
      reason: "ageOut" as const,
    }));
  return {
    arrived: arrivedRefs.map(withEstimate),
    promoted: academy.promotedThisSeason.map(withEstimate),
    left: [
      ...academy.releasedThisSeason.map((ref) => ({ ...ref, reason: "released" as const })),
      ...lastYear,
    ],
  };
}
