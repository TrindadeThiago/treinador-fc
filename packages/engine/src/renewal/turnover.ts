import { seasonDate } from "../calendar/date";
import { dateOfRound } from "../calendar/season-calendar";
import type { LeagueSeason, TurnoverContext, TurnoverStep } from "../career/types";
import { aiMarketRules } from "../market/ai/rules";
import { ensureContracts } from "../market/contracts";
import { addFreeAgents, toFreeAgent } from "../market/free-agents";
import type { Position } from "../model/catalogs";
import type { CompletedPlayer } from "../model/types";
import { createRng } from "../rng/xoshiro";
import { canSignForeign } from "../world/foreign";
import { squadOf } from "../world/squads";
import {
  academyFreeAgent,
  academyState,
  agedOut,
  asClubPlayer,
  byUtilityDesc,
  evolveAcademy,
  renewalUtility,
  squadShortage,
  withGraduates,
  withoutAcademyPlayers,
} from "./academy";
import { academyLevelRule } from "./academy-levels";
import { evolvePlayers, midSeasonRound } from "./evolution";
import { type HallPlayer, refreshHall } from "./hall";
import { measureWorld } from "./measure";
import { withRegionalClubs } from "./regional";
import { regulate, regulatorFor, withRegulator } from "./regulator";
import { playerRef, retirePlayers } from "./retirement";
import { ACADEMY_RULES } from "./rules";
import { balanceSquads } from "./squads";
import type { AcademyPlayer, PlayerDelta, PlayerRef, SquadChangeNotice } from "./types";
import { createYouth, generateYouth, neediestPosition } from "./youth";

/**
 * Etapas de renovação da virada (research.md R11). Sem `renewal` no contexto (usos só da liga ou
 * das finanças), não fazem nada.
 */

/**
 * Jogos das competições secundárias depois da data da evolução do meio da temporada (017 R9): os
 * anteriores já contaram na evolução do meio.
 */
function playedAfterMidSeason(context: TurnoverContext): LeagueSeason[] {
  const calendar = context.finishedCalendar;
  const finished = context.finished;
  if (!calendar) return [];
  const midDate = dateOfRound(calendar, finished.competitionId, midSeasonRound(finished));
  return (context.finishedCompetitions ?? []).map((league) => ({
    ...league,
    divisions: league.divisions.map((season) => ({
      ...season,
      records: season.records.filter((record) => {
        const date = dateOfRound(calendar, league.competitionId, record.round);
        return midDate === undefined || (date !== undefined && date > midDate);
      }),
    })),
  }));
}

/** Evolução do fim da temporada: minutagem das rodadas depois da do meio até a última. */
export const evolvePlayersStep: TurnoverStep = {
  id: "evolve-players",
  run: (context) => {
    if (!context.renewal) return context;
    const finished = context.finished;
    const last = Math.max(...finished.divisions.map((season) => season.calendar.length));
    const league = withRegionalClubs(context.world, finished);
    const { world, record } = evolvePlayers(
      context.world,
      league,
      context.careerSeed,
      "end",
      midSeasonRound(finished) + 1,
      last,
      playedAfterMidSeason(context),
    );
    // A base evolui no mesmo momento, sem minutos (036 FR-004, R4).
    const academy = evolveAcademy(
      academyState(context.renewal),
      new Set(league.divisions.flatMap((season) => season.clubIds)),
      context.careerSeed,
      finished.number,
      "end",
      seasonDate(context.world.manifest.referenceDate, finished.year),
      (clubId) => academyLevelRule(context.renewal, context.world, clubId).evolutionBonus,
    );
    return { ...context, world, renewal: { ...context.renewal, lastEvolution: record, academy } };
  },
};

/** Data da temporada que começa (idades de aposentadoria e de jovens). */
export function nextSeasonDate(context: TurnoverContext): string {
  return seasonDate(context.world.manifest.referenceDate, context.finished.year + 1);
}

/** Aviso de mudanças do clube do jogador da virada em andamento (criado vazio na primeira etapa). */
function notice(context: TurnoverContext): SquadChangeNotice | undefined {
  if (!context.renewal || !context.managerClubId) return undefined;
  const current = context.renewal.squadNotice;
  if (current && current.season === context.finished.number + 1) return current;
  return {
    season: context.finished.number + 1,
    clubId: context.managerClubId,
    retired: [],
    arrived: [],
    released: [],
    promoted: [],
    risers: [],
    fallers: [],
  };
}

/** Acrescenta ao aviso do clube do jogador os jogadores dele de uma lista. */
export function withNotice(
  context: TurnoverContext,
  field:
    | "retired"
    | "arrived"
    | "released"
    | "promoted"
    | "academyArrived"
    | "academyAgedOut"
    | "academyReleased",
  refs: readonly PlayerRef[],
  clubOf: (ref: PlayerRef) => string,
): TurnoverContext {
  const current = notice(context);
  if (!current || !context.renewal) return context;
  const own = refs.filter((ref) => clubOf(ref) === current.clubId);
  if (own.length === 0 && current[field] !== undefined) return context;
  return {
    ...context,
    renewal: {
      ...context.renewal,
      squadNotice: { ...current, [field]: [...(current[field] ?? []), ...own] },
    },
  };
}

export const retirePlayersStep: TurnoverStep = {
  id: "retire-players",
  run: (context) => {
    if (!context.renewal) return context;
    const clubs = new Map(context.world.players.map((player) => [player.id, player.clubId]));
    const { world, retired } = retirePlayers(
      context.world,
      withRegionalClubs(context.world, context.finished),
      context.careerSeed,
      context.finished.number,
      nextSeasonDate(context),
    );
    return withNotice(
      { ...context, world },
      "retired",
      retired,
      (ref) => clubs.get(ref.playerId) ?? "",
    );
  },
};

/** Livres que saem da base, acrescentados ao mercado quando ele existe (036 R7). */
function withAcademyFreeAgents(
  context: TurnoverContext,
  entries: readonly AcademyPlayer[],
): TurnoverContext {
  if (!context.market || entries.length === 0) return context;
  return {
    ...context,
    market: addFreeAgents(
      context.market,
      entries.map((entry) => academyFreeAgent(entry, context.finished.year)),
    ),
  };
}

/**
 * Idade-limite da base (036 FR-005, R5): quem tem 20 anos ou mais na nova temporada sai. Na IA, é
 * promovido (o contrato vem do `balance-squads`); no clube do técnico, vira livre.
 */
export const academyAgeOutStep: TurnoverStep = {
  id: "academy-age-out",
  run: (context) => {
    if (!context.renewal) return context;
    const league = withRegionalClubs(context.world, context.finished);
    const clubIds = new Set(league.divisions.flatMap((season) => season.clubIds));
    const academy = academyState(context.renewal);
    const leaving = agedOut(
      academy,
      clubIds,
      context.world.manifest.referenceDate,
      context.finished.year + 1,
    );
    if (leaving.length === 0) return context;
    const date = nextSeasonDate(context);
    const toFree = leaving.filter((entry) => entry.clubId === context.managerClubId);
    // IA (037): sobe quem cabe — elenco abaixo do teto de promoção por idade, ou melhor que o pior
    // da posição. Os demais saem como livres (com a base cheia, ~3 por clube por virada).
    const toSquad: AcademyPlayer[] = [];
    const byClub = new Map<string, AcademyPlayer[]>();
    for (const entry of leaving) {
      if (entry.clubId === context.managerClubId) continue;
      byClub.set(entry.clubId, [...(byClub.get(entry.clubId) ?? []), entry]);
    }
    for (const [clubId, entries] of [...byClub.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
      const squad = [...squadOf(context.world, clubId)];
      for (const entry of [...entries].sort(byUtilityDesc(date))) {
        const value = renewalUtility(entry.player, date);
        const rivals = squad.filter((player) => player.position === entry.player.position);
        const weakest = Math.min(...rivals.map((player) => renewalUtility(player, date)));
        if (squad.length < ACADEMY_RULES.aiAgeOutSquad || rivals.length === 0 || value > weakest) {
          toSquad.push(entry);
          squad.push(asClubPlayer(entry));
        } else {
          toFree.push(entry);
        }
      }
    }
    const ids = new Set(leaving.map((entry) => entry.player.id));
    const next = withGraduates(
      withoutAcademyPlayers(academy, ids),
      toSquad,
      context.finished.number + 1,
    );
    const world = {
      ...context.world,
      players: [...context.world.players, ...toSquad.map(asClubPlayer)],
    };
    const updated = withAcademyFreeAgents(
      { ...context, world, renewal: { ...context.renewal, academy: next } },
      toFree,
    );
    return withNotice(
      updated,
      "academyAgedOut",
      toFree.map((entry) => playerRef(asClubPlayer(entry), date)),
      (ref) => toFree.find((entry) => entry.player.id === ref.playerId)?.clubId ?? "",
    );
  },
};

export const generateYouthStep: TurnoverStep = {
  id: "generate-youth",
  run: (context) => {
    if (!context.renewal) return context;
    const { renewal, arrived, released } = generateYouth(
      context.world,
      withRegionalClubs(context.world, context.finished),
      context.renewal,
      context.careerSeed,
      context.finished.number,
      nextSeasonDate(context),
      context.managerClubId,
    );
    const clubs = new Map(
      academyState(renewal).players.map((entry) => [entry.player.id, entry.clubId]),
    );
    return withNotice(
      withAcademyFreeAgents({ ...context, renewal }, released),
      "academyArrived",
      arrived,
      (ref) => clubs.get(ref.playerId) ?? "",
    );
  },
};

/** Com mercado, jovens e repostos nascem com contrato para a temporada que começa (R3). */
function contracted(context: TurnoverContext, world: TurnoverContext["world"]) {
  return context.market
    ? ensureContracts(world, context.finished.year + 1, context.careerSeed)
    : world;
}

/** Quantas maiores altas e quedas o aviso mostra. */
const NOTICE_MOVERS = 5;

export const balanceSquadsStep: TurnoverStep = {
  id: "balance-squads",
  run: (context) => {
    if (!context.renewal) return context;
    const date = nextSeasonDate(context);
    const before = new Map(context.world.players.map((player) => [player.id, player.clubId]));
    const { world, renewal, promoted, released, releasedPlayers } = balanceSquads(
      context.world,
      withRegionalClubs(context.world, context.finished),
      context.renewal,
      context.careerSeed,
      context.finished.number,
      date,
      context.passiveManager ? undefined : context.managerClubId,
    );
    const after = new Map(world.players.map((player) => [player.id, player.clubId]));
    void promoted;
    void after;
    let next: TurnoverContext = {
      ...context,
      world: contracted(context, world),
      renewal,
      ...(context.market
        ? {
            market: addFreeAgents(
              context.market,
              releasedPlayers.map((player) =>
                toFreeAgent(player, before.get(player.id) ?? player.clubId, context.finished.year),
              ),
            ),
          }
        : {}),
    };
    next = withNotice(next, "released", released, (ref) => before.get(ref.playerId) ?? "");
    const current = next.renewal?.squadNotice;
    const deltas = next.renewal?.lastEvolution?.deltas ?? {};
    if (!current || !next.renewal) return next;
    const movers: PlayerDelta[] = world.players
      .filter((player) => player.clubId === current.clubId && (deltas[player.id] ?? 0) !== 0)
      .map((player) => ({ ...playerRef(player, date), delta: deltas[player.id] ?? 0 }));
    const order = (a: PlayerDelta, b: PlayerDelta) =>
      b.delta - a.delta || (a.playerId < b.playerId ? -1 : 1);
    const risers = movers
      .filter((mover) => mover.delta > 0)
      .sort(order)
      .slice(0, NOTICE_MOVERS);
    const fallers = movers
      .filter((mover) => mover.delta < 0)
      .sort((a, b) => order(b, a))
      .slice(0, NOTICE_MOVERS);
    return { ...next, renewal: { ...next.renewal, squadNotice: { ...current, risers, fallers } } };
  },
};

/**
 * Completa os elencos da IA que continuam abaixo de um mínimo depois das promoções (036 FR-011a,
 * R5, R6): primeiro com o livre mais forte da posição (contrato inicial); sem livre, com a safra de
 * emergência — um jovem novo na base, promovido na hora. Nenhum jogador nasce direto no elenco.
 */
export const completeSquadsStep: TurnoverStep = {
  id: "complete-squads",
  run: (context) => {
    if (!context.renewal) return context;
    const league = withRegionalClubs(context.world, context.finished);
    const date = nextSeasonDate(context);
    const caps = aiMarketRules(context.world, context.finished.competitionId).positionMax;
    let world = context.world;
    let freeAgents = [...(context.market?.freeAgents ?? [])];
    let academy = academyState(context.renewal);
    let seq = context.renewal.nextPlayerSeq;
    let emergencies = 0;
    let signed = 0;
    const born: AcademyPlayer[] = [];
    for (const clubId of league.divisions.flatMap((season) => season.clubIds).sort()) {
      if (clubId === context.managerClubId && !context.passiveManager) continue;
      const club = world.clubs.find((entry) => entry.id === clubId);
      if (!club) continue;
      let shortage = squadShortage(squadOf(world, clubId));
      const rng = createRng(`${context.careerSeed}:emergency:${context.finished.number}:${clubId}`);
      while (shortage.missing > 0) {
        const position: Position =
          shortage.positions[0] ?? neediestPosition(squadOf(world, clubId), rng, caps);
        const foreignOk = canSignForeign(world, clubId);
        const agent = freeAgents
          .filter(
            (candidate) =>
              candidate.player.position === position &&
              (foreignOk || candidate.player.nationalityId === club.countryId),
          )
          .sort(
            (a, b) => b.player.strength - a.player.strength || (a.player.id < b.player.id ? -1 : 1),
          )[0];
        let player: CompletedPlayer;
        if (agent) {
          freeAgents = freeAgents.filter((candidate) => candidate !== agent);
          player = { ...agent.player, clubId };
        } else {
          const youth = createYouth(
            world,
            club,
            position,
            seq,
            regulatorFor(context.renewal, world, league),
            date,
            rng,
          );
          seq += 1;
          emergencies += 1;
          const { clubId: _c, contract: _k, ...rest } = youth;
          born.push({ player: rest, clubId, joinedSeason: context.finished.number + 1 });
          player = youth;
        }
        world = { ...world, players: [...world.players, player] };
        signed += 1;
        shortage = squadShortage(squadOf(world, clubId));
      }
    }
    if (signed === 0) return context;
    academy = withGraduates(academy, born, context.finished.number + 1);
    academy = { ...academy, emergencies: academy.emergencies + emergencies };
    return {
      ...context,
      world: contracted(context, world),
      renewal: { ...context.renewal, nextPlayerSeq: seq, academy },
      ...(context.market ? { market: { ...context.market, freeAgents } } : {}),
    };
  },
};

/**
 * Fecha a base na virada (036): as promoções e dispensas do técnico na temporada vão para o aviso,
 * `graduates` fica só com quem ainda está no mundo ou entre os livres, e o contador de emergências
 * é zerado no início (ele mede a virada em andamento).
 */
export const academyOpenStep: TurnoverStep = {
  id: "academy-open",
  run: (context) => {
    if (!context.renewal) return context;
    const academy = academyState(context.renewal);
    let next: TurnoverContext = {
      ...context,
      renewal: { ...context.renewal, academy: { ...academy, emergencies: 0 } },
    };
    const own = () => context.managerClubId ?? "";
    next = withNotice(next, "promoted", academy.promotedThisSeason, own);
    next = withNotice(next, "academyReleased", academy.releasedThisSeason, own);
    return next;
  },
};

export const academyCloseStep: TurnoverStep = {
  id: "academy-close",
  run: (context) => {
    if (!context.renewal) return context;
    const living = new Map<string, HallPlayer>([
      ...context.world.players.map((player): [string, HallPlayer] => [player.id, player]),
      ...(context.market?.freeAgents ?? []).map((agent): [string, HallPlayer] => [
        agent.player.id,
        agent.player,
      ]),
    ]);
    // Força máxima e revelações antes da poda: quem se aposentou fica no histórico (038 R9).
    const academy = refreshHall(academyState(context.renewal), living);
    const graduates = Object.fromEntries(
      Object.entries(academy.graduates).filter(([playerId]) => living.has(playerId)),
    );
    const crias = context.news?.crias;
    return {
      ...context,
      renewal: {
        ...context.renewal,
        academy: { ...academy, graduates, promotedThisSeason: [], releasedThisSeason: [] },
      },
      ...(context.news && crias
        ? {
            news: {
              ...context.news,
              crias: Object.fromEntries(
                Object.entries(crias).filter(([playerId]) => playerId in graduates),
              ),
            },
          }
        : {}),
    };
  },
};

/** Mede o mundo depois das aposentadorias e ajusta a geração de jovens desta virada (R8). */
export const regulateWorldStep: TurnoverStep = {
  id: "regulate-world",
  run: (context) => {
    if (!context.renewal) return context;
    // A força que o regulador persegue é a dos profissionais (os jovens da base, mais fracos,
    // puxariam a média de cada país de um jeito diferente e distorceriam o equilíbrio entre
    // países); as promessas contam também a base, senão o regulador inflaria o potencial (036 R10).
    const date = nextSeasonDate(context);
    const professionals = measureWorld(context.world, context.finished, date);
    const withAcademy = measureWorld(
      context.world,
      context.finished,
      date,
      context.renewal.academy,
    );
    const measure = { ...professionals, prospects: withAcademy.prospects };
    return {
      ...context,
      renewal: withRegulator(
        context.renewal,
        context.world,
        context.finished,
        regulate(regulatorFor(context.renewal, context.world, context.finished), measure),
      ),
    };
  },
};
