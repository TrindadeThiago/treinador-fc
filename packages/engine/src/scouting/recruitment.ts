import { seasonDate } from "../calendar/date";
import type { CareerSeasonState } from "../career/season-state";
import { draft, post } from "../finance/ledger";
import { marketRules } from "../market/rules";
import type { MarketRules } from "../market/types";
import { roundsPlayed, transferWindows } from "../market/windows";
import type { Position } from "../model/catalogs";
import type { Club, CompletedBank } from "../model/types";
import { academyOf, academyState, withAcademyPlayers } from "../renewal/academy";
import {
  academyLimit,
  DEFAULT_ACADEMY_LEVELS,
  referenceMonthlyPayroll,
} from "../renewal/academy-levels";
import type { AcademyPlayer, RegulatorState, RenewalState } from "../renewal/types";
import { createYouth, playerId } from "../renewal/youth";
import { createRng } from "../rng/xoshiro";
import { mainCompetitionOf } from "../world/countries";
import { advanceReport } from "./round";
import { scoutingRules } from "./rules";
import { effectiveScoutingLevel, openReport, scoutingManagerClub, settledScouting } from "./state";
import type { ScoutingRegion, ScoutingState, ScoutOffer } from "./types";

/**
 * Captação de jovens (040, research R1–R6): os olheiros do técnico indicam jovens de uma região. As
 * indicações ficam fora do mundo (id provisório, sem numeração nem sorte do jogo) até o técnico trazer
 * o jovem para a base, pagando o registro.
 */

export interface RecruitmentRules {
  /** Indicações por abertura de janela, por nível (1 a 5). */
  offersPerWindow: { country: readonly number[]; state: readonly number[] };
  /** Custo de registro em % da folha mensal de referência. */
  registrationPct: { state: number; country: number; abroad: number };
  ageRange: readonly [number, number];
  /** Nível da academia usado na força e no potencial dos indicados. */
  levelBasis: number;
  /** Etapas de observação com que a indicação já chega, por nível (1 a 5). */
  offerSteps: readonly number[];
}

export const DEFAULT_RECRUITMENT: RecruitmentRules = {
  offersPerWindow: { country: [1, 1, 2, 2, 3], state: [1, 1, 1, 1, 2] },
  registrationPct: { state: 10, country: 20, abroad: 35 },
  ageRange: [15, 17],
  levelBasis: 1,
  offerSteps: [1, 1, 2, 2, 2],
};

export function recruitmentRules(world: CompletedBank, clubId: string): RecruitmentRules {
  const mod = mainCompetitionOf(
    world,
    world.clubs.find((club) => club.id === clubId)?.countryId ?? "",
  )?.economy?.scouting?.recruitment;
  if (!mod) return DEFAULT_RECRUITMENT;
  return {
    offersPerWindow: {
      country: mod.offersPerWindow?.country ?? DEFAULT_RECRUITMENT.offersPerWindow.country,
      state: mod.offersPerWindow?.state ?? DEFAULT_RECRUITMENT.offersPerWindow.state,
    },
    registrationPct: {
      state: mod.registrationPct?.state ?? DEFAULT_RECRUITMENT.registrationPct.state,
      country: mod.registrationPct?.country ?? DEFAULT_RECRUITMENT.registrationPct.country,
      abroad: mod.registrationPct?.abroad ?? DEFAULT_RECRUITMENT.registrationPct.abroad,
    },
    ageRange: mod.ageRange ?? DEFAULT_RECRUITMENT.ageRange,
    levelBasis: mod.levelBasis ?? DEFAULT_RECRUITMENT.levelBasis,
    offerSteps: mod.offerSteps ?? DEFAULT_RECRUITMENT.offerSteps,
  };
}

export function regionKey(region: ScoutingRegion): string {
  return region.kind === "state"
    ? `state:${region.countryId}:${region.region}`
    : `country:${region.countryId}`;
}

const sameRegion = (a: ScoutingRegion, b: ScoutingRegion) => regionKey(a) === regionKey(b);

/** Regiões possíveis: os estados (com clubes) do país do clube, o país do clube e os outros países. */
export function availableRegions(world: CompletedBank, clubId: string): ScoutingRegion[] {
  const home = world.clubs.find((club) => club.id === clubId)?.countryId;
  if (home === undefined) return [];
  const states = [
    ...new Set(
      world.clubs
        .filter((club) => club.countryId === home && club.region)
        .map((club) => club.region as string),
    ),
  ].sort();
  const others = world.countries
    .map((country) => country.id)
    .filter((id) => id !== home && world.clubs.some((club) => club.countryId === id))
    .sort();
  return [
    ...states.map((region): ScoutingRegion => ({ kind: "state", countryId: home, region })),
    { kind: "country", countryId: home },
    ...others.map((countryId): ScoutingRegion => ({ kind: "country", countryId })),
  ];
}

/** Custo de registro de quem vem da região (arredondado a 1 000). */
export function registrationCost(
  world: CompletedBank,
  clubId: string,
  region: ScoutingRegion,
): number {
  const rules = recruitmentRules(world, clubId);
  const home = world.clubs.find((club) => club.id === clubId)?.countryId;
  const pct =
    region.kind === "state"
      ? rules.registrationPct.state
      : region.countryId === home
        ? rules.registrationPct.country
        : rules.registrationPct.abroad;
  return Math.round((referenceMonthlyPayroll(world, clubId) * pct) / 100 / 1000) * 1000;
}

export type RecruitmentError =
  | "scouting.closed"
  | "scouting.invalid_region"
  | "scouting.offer_not_found"
  | "scouting.academy_full"
  | "scouting.insufficient_cash"
  | "scouting.foreign_limit";

type RecruitmentResult =
  | { ok: true; state: CareerSeasonState }
  | { ok: false; error: RecruitmentError; params?: Record<string, number> };

/** Escolhe a região de captação (ou nenhuma); vale a partir da rodada seguinte (FR-001). */
export function setScoutingRegion(
  state: CareerSeasonState,
  region: ScoutingRegion | undefined,
): RecruitmentResult {
  const manager = scoutingManagerClub(state);
  const scouting = settledScouting(state.scouting, manager);
  if (effectiveScoutingLevel(scouting, manager) === 0)
    return { ok: false, error: "scouting.closed" };
  if (region && !availableRegions(state.world, manager).some((item) => sameRegion(item, region))) {
    return { ok: false, error: "scouting.invalid_region" };
  }
  return {
    ok: true,
    state: { ...state, scouting: { ...scouting, pendingRegion: region ?? null } },
  };
}

function regulatorOf(
  world: CompletedBank,
  renewal: RenewalState,
  countryId: string,
): RegulatorState {
  if (countryId === world.competitions[0]?.countryId) return renewal.regulator;
  return renewal.regulators?.[countryId] ?? { strengthOffset: 0, potentialBonus: 0 };
}

/** Clube virtual da região: reputação média dos clubes dela, país dela (força e nomes). */
function regionClub(world: CompletedBank, region: ScoutingRegion): Club | undefined {
  const clubs = world.clubs.filter(
    (club) =>
      club.countryId === region.countryId &&
      (region.kind === "country" || club.region === region.region),
  );
  const first = clubs[0];
  if (!first) return undefined;
  const reputation = Math.round(
    clubs.reduce((sum, club) => sum + club.reputation, 0) / clubs.length,
  );
  return { ...first, id: `regiao:${regionKey(region)}`, reputation };
}

const POSITION_WEIGHTS: readonly { value: Position; weight: number }[] = [
  { value: "GK", weight: 1 },
  { value: "FB", weight: 2 },
  { value: "CB", weight: 2 },
  { value: "DM", weight: 2 },
  { value: "MF", weight: 2 },
  { value: "FW", weight: 2 },
];

export interface OfferContext {
  world: CompletedBank;
  renewal: RenewalState;
  careerSeed: string;
  managerClubId: string;
  season: number;
  /** Rodadas jogadas da liga no momento das indicações (0 = pré-temporada). */
  round: number;
  expiresRound: number;
  /** Ano da temporada (idades). */
  year: number;
}

/** Indicações de uma data (abertura de janela): semente própria, id provisório, fora do mundo. */
export function generateOffers(scouting: ScoutingState, context: OfferContext): ScoutingState {
  const region = scouting.region;
  const level = effectiveScoutingLevel(scouting, context.managerClubId);
  if (!region || level === 0) return scouting;
  const club = regionClub(context.world, region);
  if (!club) return scouting;
  const rules = recruitmentRules(context.world, context.managerClubId);
  const scoutRules = scoutingRules(context.world, context.managerClubId);
  const count =
    (region.kind === "state" ? rules.offersPerWindow.state : rules.offersPerWindow.country)[
      Math.min(5, Math.max(1, level)) - 1
    ] ?? 0;
  const basis = DEFAULT_ACADEMY_LEVELS[Math.min(5, Math.max(1, rules.levelBasis)) - 1];
  const steps = rules.offerSteps[Math.min(5, Math.max(1, level)) - 1] ?? 1;
  const date = seasonDate(context.world.manifest.referenceDate, context.year);
  const key = `${context.careerSeed}:scout-offer:${context.season}:${context.round}:${regionKey(region)}`;
  const rng = createRng(key);
  const cost = registrationCost(context.world, context.managerClubId, region);
  let seq = scouting.nextOfferSeq ?? 1;
  const offers: ScoutOffer[] = [];
  for (let index = 0; index < count; index++) {
    const id = `scout-offer-${seq}`;
    seq += 1;
    const age = rng.int(rules.ageRange[0], rules.ageRange[1]);
    const youth = createYouth(
      context.world,
      club,
      rng.weighted(POSITION_WEIGHTS),
      0,
      regulatorOf(context.world, context.renewal, region.countryId),
      date,
      rng,
      { age, ...(basis ? { level: basis } : {}) },
    );
    const { clubId: _club, contract: _contract, ...rest } = youth;
    const player = { ...rest, id };
    let report = openReport(player, scoutRules.initialWidth, `${key}:${index}`, {
      season: context.season,
      round: context.round,
    });
    for (let step = 0; step < steps; step++) {
      report = advanceReport(report, player, scoutRules, level, `${key}:${index}`, {
        season: context.season,
        round: context.round,
      });
    }
    offers.push({
      id,
      player,
      estimate: report.estimate,
      ...(report.temperament !== undefined ? { temperament: report.temperament } : {}),
      ...(report.injury !== undefined ? { injury: report.injury } : {}),
      region,
      cost,
      expiresRound: context.expiresRound,
      season: context.season,
    });
  }
  return { ...scouting, offers: [...(scouting.offers ?? []), ...offers], nextOfferSeq: seq };
}

export interface RecruitmentRoundContext {
  world: CompletedBank;
  renewal: RenewalState;
  careerSeed: string;
  managerClubId: string;
  season: number;
  year: number;
  /** Rodadas jogadas da liga do clube do técnico depois desta rodada. */
  played: number;
  marketRules: MarketRules;
  windows: readonly { fromRound: number; toRound: number }[];
}

/**
 * Rodada da liga do técnico (R3): aplica a região pendente, tira as indicações vencidas e, se uma
 * janela abre agora (`played === fromRound`), gera as indicações dela.
 */
export function recruitmentAfterRound(
  scouting: ScoutingState,
  context: RecruitmentRoundContext,
): ScoutingState {
  let next = scouting;
  if (next.pendingRegion !== undefined) {
    const { pendingRegion, region: _region, ...rest } = next;
    next = pendingRegion === null ? rest : { ...rest, region: pendingRegion };
  }
  const offers = next.offers ?? [];
  const alive = offers.filter(
    (offer) => offer.season > context.season || context.played <= offer.expiresRound,
  );
  if (alive.length !== offers.length) next = { ...next, offers: alive };
  const opening = context.windows.find((window) => window.fromRound === context.played);
  if (opening && context.played > 0) {
    next = generateOffers(next, {
      world: context.world,
      renewal: context.renewal,
      careerSeed: context.careerSeed,
      managerClubId: context.managerClubId,
      season: context.season,
      round: context.played,
      expiresRound: opening.toRound,
      year: context.year,
    });
  }
  return next;
}

/** Janelas e rodadas jogadas da liga (para o gancho do dia de jogos). */
export function recruitmentWindows(
  world: CompletedBank,
  league: Parameters<typeof transferWindows>[0],
) {
  const rules = marketRules(world, league.competitionId);
  return { rules, windows: transferWindows(league, rules), played: roundsPlayed(league) };
}

/** Estrangeiros do clube contando os captados estrangeiros da base (R6). */
export function foreignCountWithAcademy(
  world: CompletedBank,
  renewal: RenewalState | undefined,
  clubId: string,
): number {
  const country = world.clubs.find((club) => club.id === clubId)?.countryId;
  const squad = world.players.filter(
    (player) => player.clubId === clubId && player.nationalityId !== country,
  ).length;
  const base = academyOf(renewal, clubId).filter(
    (entry) => entry.player.nationalityId !== country,
  ).length;
  return squad + base;
}

/** Traz um indicado para a base: id real, faixa, origem; custo na categoria scouting (FR-005). */
export function signOffer(
  state: CareerSeasonState,
  offerId: string,
): RecruitmentResult & { playerId?: string } {
  const manager = scoutingManagerClub(state);
  const scouting = settledScouting(state.scouting, manager);
  if (effectiveScoutingLevel(scouting, manager) === 0 || !state.renewal) {
    return { ok: false, error: "scouting.closed" };
  }
  const offer = scouting.offers?.find((entry) => entry.id === offerId);
  if (!offer) return { ok: false, error: "scouting.offer_not_found" };
  if (
    academyOf(state.renewal, manager).length >= academyLimit(state.renewal, state.world, manager)
  ) {
    return { ok: false, error: "scouting.academy_full" };
  }
  const cash = state.finances.clubs[manager]?.cash ?? 0;
  if (offer.cost > cash) {
    return {
      ok: false,
      error: "scouting.insufficient_cash",
      params: { cost: offer.cost, missing: offer.cost - cash },
    };
  }
  const club = state.world.clubs.find((entry) => entry.id === manager);
  const limit = state.world.countries.find((country) => country.id === club?.countryId)?.rules
    ?.foreignLimit;
  if (
    offer.player.nationalityId !== club?.countryId &&
    limit !== undefined &&
    foreignCountWithAcademy(state.world, state.renewal, manager) + 1 > limit
  ) {
    return { ok: false, error: "scouting.foreign_limit", params: { limit } };
  }
  const seq = state.renewal.nextPlayerSeq;
  const id = playerId(seq);
  const entry: AcademyPlayer = {
    player: { ...offer.player, id },
    clubId: manager,
    joinedSeason: state.league.number,
    estimate: offer.estimate,
    origin: { kind: "scouted", region: offer.region, season: state.league.number },
  };
  const finances = draft(state.finances);
  post(finances, {
    clubId: manager,
    season: state.league.number,
    round: 0,
    category: "scouting",
    amount: -offer.cost,
  });
  return {
    ok: true,
    playerId: id,
    state: {
      ...state,
      finances,
      renewal: {
        ...state.renewal,
        nextPlayerSeq: seq + 1,
        academy: withAcademyPlayers(academyState(state.renewal), [entry]),
      },
      scouting: {
        ...scouting,
        offers: (scouting.offers ?? []).filter((item) => item.id !== offerId),
      },
    },
  };
}

/** Recusa uma indicação: ela some, sem deixar jogador no mundo (FR-004). */
export function declineOffer(state: CareerSeasonState, offerId: string): RecruitmentResult {
  const manager = scoutingManagerClub(state);
  const scouting = settledScouting(state.scouting, manager);
  if (!scouting.offers?.some((entry) => entry.id === offerId)) {
    return { ok: false, error: "scouting.offer_not_found" };
  }
  return {
    ok: true,
    state: {
      ...state,
      scouting: { ...scouting, offers: scouting.offers.filter((item) => item.id !== offerId) },
    },
  };
}

/**
 * Início da temporada (virada, no save): aplica a região pendente, descarta as indicações da
 * temporada anterior e gera as da janela da pré-temporada (`fromRound = 0`), se houver.
 */
export function recruitmentAtSeasonStart(
  scouting: ScoutingState,
  context: Omit<RecruitmentRoundContext, "played">,
): ScoutingState {
  let next: ScoutingState = { ...scouting };
  if (next.pendingRegion !== undefined) {
    const { pendingRegion, region: _region, ...rest } = next;
    next = pendingRegion === null ? rest : { ...rest, region: pendingRegion };
  }
  if (next.offers) {
    const { offers: _offers, ...rest } = next;
    next = rest;
  }
  const opening = context.windows.find((window) => window.fromRound === 0);
  if (!opening) return next;
  return generateOffers(next, {
    world: context.world,
    renewal: context.renewal,
    careerSeed: context.careerSeed,
    managerClubId: context.managerClubId,
    season: context.season,
    round: 0,
    expiresRound: opening.toRound,
    year: context.year,
  });
}
