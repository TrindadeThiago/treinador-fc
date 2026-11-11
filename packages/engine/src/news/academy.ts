import { ageOn, seasonDate } from "../calendar/date";
import type { TurnoverStep } from "../career/types";
import type { TransferRecord } from "../market/types";
import type { Position } from "../model/catalogs";
import type { CompletedBank } from "../model/types";
import { academyState } from "../renewal/academy";
import type { AcademyGraduate, RenewalState } from "../renewal/types";
import { playerLines } from "../season/record";
import type { MatchRecord } from "../season/types";
import type { Fact } from "./facts";
import { toHeadlines } from "./round";
import { newsRules } from "./rules";
import {
  CRIA_DEBUT,
  CRIA_GOAL,
  CRIA_SALE,
  type Headline,
  type HeadlineVars,
  type NewsContext,
} from "./types";
import { variantOf } from "./variants";

/**
 * Notícias da base (038): a revelação da safra na virada (research R6) e as crias do clube do técnico
 * na estreia, no primeiro gol e na venda (R7). Só dados visíveis: nunca o potencial nem a faixa.
 */

export interface AcademyRevelation {
  playerId: string;
  name: string;
  position: Position;
  age: number;
  strength: number;
  clubId: string;
}

interface Candidate {
  id: string;
  displayName: string;
  position: Position;
  birthDate: string;
  strength: number;
}

/**
 * Revelação da safra `season` (jovens com `joinedSeason === season`) entre os clubes dados: o de maior
 * força atual, ainda na base ou já promovido e no clube formador; desempate pela menor idade e pelo id.
 */
export function academyRevelation(
  renewal: RenewalState | undefined,
  world: CompletedBank,
  clubIds: ReadonlySet<string>,
  season: number,
  date: string,
): AcademyRevelation | undefined {
  const academy = academyState(renewal);
  const candidates: { player: Candidate; clubId: string }[] = [];
  for (const entry of academy.players) {
    if (entry.joinedSeason === season && clubIds.has(entry.clubId)) {
      candidates.push({ player: entry.player, clubId: entry.clubId });
    }
  }
  const promoted = new Map(
    Object.entries(academy.graduates).filter(
      ([, graduate]) => graduate.joinedSeason === season && clubIds.has(graduate.clubId),
    ),
  );
  if (promoted.size > 0) {
    for (const player of world.players) {
      const graduate = promoted.get(player.id);
      if (graduate && player.clubId === graduate.clubId) {
        candidates.push({ player, clubId: graduate.clubId });
      }
    }
  }
  const best = candidates.sort(
    (a, b) =>
      b.player.strength - a.player.strength ||
      // Mais novo = nascido depois.
      (a.player.birthDate > b.player.birthDate
        ? -1
        : a.player.birthDate < b.player.birthDate
          ? 1
          : 0) ||
      (a.player.id < b.player.id ? -1 : 1),
  )[0];
  if (!best) return undefined;
  return {
    playerId: best.player.id,
    name: best.player.displayName,
    position: best.player.position,
    age: ageOn(best.player.birthDate, date),
    strength: best.player.strength,
    clubId: best.clubId,
  };
}

function revelationFact(revelation: AcademyRevelation, scope: "club" | "division" | "both"): Fact {
  return {
    type: "academyRevelation",
    clubIds: [revelation.clubId],
    playerIds: [revelation.playerId],
    vars: {
      player: revelation.name,
      club: revelation.clubId,
      position: revelation.position,
      age: revelation.age,
      strength: revelation.strength,
      scope,
    },
  };
}

/**
 * Etapa "news-academy" (R6), depois de "news-regional": a revelação da safra que acabou de completar
 * a temporada, no clube do técnico e na divisão em que ele jogou, na rodada 0 da temporada nova.
 */
export const newsAcademyStep: TurnoverStep = {
  id: "news-academy",
  run: (context) => {
    if (!context.news || !context.renewal) return context;
    const managerClubId = context.board?.manager.clubId ?? context.managerClubId ?? "";
    if (managerClubId === "") return context;
    const finished = context.finished;
    const date = seasonDate(context.world.manifest.referenceDate, finished.year + 1);
    const own = academyRevelation(
      context.renewal,
      context.world,
      new Set([managerClubId]),
      finished.number,
      date,
    );
    const division = finished.divisions.find((season) => season.clubIds.includes(managerClubId));
    const best = division
      ? academyRevelation(
          context.renewal,
          context.world,
          new Set(division.clubIds),
          finished.number,
          date,
        )
      : undefined;
    const facts: Fact[] = [];
    if (own && best && own.playerId === best.playerId) facts.push(revelationFact(own, "both"));
    else {
      if (own) facts.push(revelationFact(own, "club"));
      if (best) facts.push(revelationFact(best, "division"));
    }
    if (facts.length === 0) return context;
    const next = finished.number + 1;
    const headlines = toHeadlines(
      {
        world: context.world,
        league: { ...finished, number: next, year: finished.year + 1 },
        careerSeed: context.careerSeed,
        managerClubId,
      },
      0,
      facts,
    ).map((headline, index) => ({ ...headline, id: `${next}-0-a${index}` }));
    const feed = context.news.feed.map((round) =>
      round.season === next && round.round === 0
        ? { ...round, headlines: [...round.headlines, ...headlines] }
        : round,
    );
    return { ...context, news: { ...context.news, feed } };
  },
};

/**
 * Captado pelos olheiros (040 FR-010): `scouted` e a região de origem (`originKind` "state" com o
 * nome do estado, ou "country" com o id do país, que a apresentação troca pelo nome).
 */
function originVars(graduate: AcademyGraduate | undefined): HeadlineVars {
  const origin = graduate?.origin;
  if (origin?.kind !== "scouted") return { scouted: "no" };
  return origin.region.kind === "state"
    ? { scouted: "yes", originKind: "state", originRegion: origin.region.region }
    : { scouted: "yes", originKind: "country", originRegion: origin.region.countryId };
}

/** Manchetes e marcas novas das crias numa leva de jogos ou transferências. */
export interface CriaNews {
  headlines: Headline[];
  crias: Record<string, number> | undefined;
}

function criaHeadline(
  context: Pick<NewsContext, "world" | "league" | "careerSeed">,
  round: number,
  type: "academyDebut" | "academyFirstGoal" | "academySale",
  playerId: string,
  clubId: string,
  vars: HeadlineVars,
  index: number,
): Headline {
  const rules = newsRules(context.world, context.league.competitionId);
  const season = context.league.number;
  return {
    id: `${season}-${round}-b${index}`,
    type,
    relevance: rules.relevance[type] + rules.mineBonus,
    variant: variantOf(rules, context.careerSeed, `${season}:${round}:${playerId}`, type),
    clubIds: [clubId],
    playerIds: [playerId],
    vars,
    mine: true,
  };
}

/**
 * Estreia e primeiro gol das crias (R7) em jogos oficiais: marca toda cria que joga ou marca pelo
 * clube formador; só as do clube do técnico viram manchete (uma vez por jogador). Estreia com gol no
 * mesmo jogo = uma manchete de estreia com o gol como fato complementar.
 */
export function criaMatchNews(
  context: Pick<NewsContext, "world" | "league" | "careerSeed" | "managerClubId" | "news"> & {
    graduates?: Readonly<Record<string, AcademyGraduate>> | undefined;
  },
  matches: readonly { record: MatchRecord; competitionId?: string | undefined }[],
  round: number,
  firstIndex = 0,
): CriaNews {
  const graduates = context.graduates;
  const before = context.news.crias;
  if (!graduates || matches.length === 0) return { headlines: [], crias: before };
  const names = new Map(context.world.players.map((player) => [player.id, player.displayName]));
  let crias = before;
  const headlines: Headline[] = [];
  for (const { record, competitionId } of matches) {
    for (const [playerId, line] of Object.entries(playerLines(record))) {
      if (line.minutes <= 0) continue;
      const graduate = graduates[playerId];
      if (!graduate) continue;
      const clubId = line.side === "home" ? record.home : record.away;
      if (clubId !== graduate.clubId) continue;
      const mask = crias?.[playerId] ?? 0;
      const debut = (mask & CRIA_DEBUT) === 0;
      const goal = line.goals > 0 && (mask & CRIA_GOAL) === 0;
      if (!debut && !goal) continue;
      crias = {
        ...(crias ?? {}),
        [playerId]: mask | CRIA_DEBUT | (line.goals > 0 ? CRIA_GOAL : 0),
      };
      if (clubId !== context.managerClubId || context.managerClubId === "") continue;
      const vars: HeadlineVars = {
        player: names.get(playerId) ?? playerId,
        club: clubId,
        opponent: clubId === record.home ? record.away : record.home,
        goals: line.goals,
        ...(competitionId ? { competition: competitionId } : {}),
        ...originVars(graduate),
      };
      const headline = criaHeadline(
        context,
        round,
        debut ? "academyDebut" : "academyFirstGoal",
        playerId,
        clubId,
        vars,
        firstIndex + headlines.length,
      );
      headlines.push(
        debut && goal ? { ...headline, extras: [{ type: "academyFirstGoal", vars }] } : headline,
      );
    }
  }
  return { headlines, crias };
}

/** Venda de uma cria pelo clube do técnico que a formou (R7); devolve também os negócios usados. */
export function criaSaleNews(
  context: Pick<NewsContext, "world" | "league" | "careerSeed" | "managerClubId" | "news"> & {
    graduates?: Readonly<Record<string, AcademyGraduate>> | undefined;
  },
  deals: readonly TransferRecord[],
  round: number,
  firstIndex = 0,
): CriaNews & { used: ReadonlySet<TransferRecord> } {
  const used = new Set<TransferRecord>();
  const graduates = context.graduates;
  const manager = context.managerClubId;
  let crias = context.news.crias;
  const headlines: Headline[] = [];
  if (!graduates || manager === "") return { headlines, crias, used };
  for (const deal of deals) {
    if (deal.fromClubId !== manager || deal.fee <= 0 || !deal.toClubId) continue;
    if (deal.kind !== "sale" && deal.kind !== "buy") continue;
    if (graduates[deal.playerId]?.clubId !== manager) continue;
    used.add(deal);
    const mask = crias?.[deal.playerId] ?? 0;
    if ((mask & CRIA_SALE) !== 0) continue;
    crias = { ...(crias ?? {}), [deal.playerId]: mask | CRIA_SALE };
    headlines.push(
      criaHeadline(
        context,
        round,
        "academySale",
        deal.playerId,
        manager,
        {
          player: deal.displayName,
          club: manager,
          opponent: deal.toClubId,
          fee: deal.fee,
          ...originVars(graduates[deal.playerId]),
        },
        firstIndex + headlines.length,
      ),
    );
  }
  return { headlines, crias, used };
}
