import { seasonDate } from "../calendar/date";
import type { LeagueSeason } from "../career/types";
import { deriveWage } from "../derived/economy";
import type { Competition, CompletedBank } from "../model/types";
import { rulesCompetitionOf } from "../world/countries";
import { squadOf } from "../world/squads";
import { draft, post } from "./ledger";
import { DEFAULT_REGIONAL_WAGE_FACTOR_PCT, divisionEconomy, economyRules } from "./rules";
import type { ClubFinance, EconomyRules, FinanceState } from "./types";

/**
 * Patrocínio anual de um clube numa divisão (FR-011): parte fixa, parte pela reputação e parte
 * proporcional à folha (patrocinador paga mais por elenco mais caro; research.md R6).
 */
export function sponsorshipFor(
  rules: EconomyRules,
  level: number,
  reputation: number,
  annualWages: number,
): number {
  const { base, perReputation, wageSharePct } = divisionEconomy(rules, level).sponsorship;
  return base + perReputation * reputation + Math.round((annualWages * wageSharePct) / 100);
}

/** Preço padrão do ingresso de um clube (R7), dentro da faixa. */
export function defaultTicketPrice(rules: EconomyRules, level: number, reputation: number): number {
  const price = Math.round(
    (divisionEconomy(rules, level).referencePrice * (80 + (40 * reputation) / 100)) / 100,
  );
  return Math.min(rules.priceRange.max, Math.max(rules.priceRange.min, price));
}

/** Estadual de cada clube só regional (023): está num estadual e em nenhuma outra competição. */
const REGIONAL_HOME = new WeakMap<readonly Competition[], Map<string, string>>();

function regionalHome(world: Pick<CompletedBank, "competitions">): Map<string, string> {
  const hit = REGIONAL_HOME.get(world.competitions);
  if (hit) return hit;
  const elsewhere = new Set<string>();
  const regional = new Map<string, string>();
  for (const competition of world.competitions) {
    for (const division of competition.divisions) {
      for (const clubId of division.clubIds) {
        if (competition.regional === undefined) elsewhere.add(clubId);
        else if (!regional.has(clubId)) regional.set(clubId, competition.id);
      }
    }
  }
  for (const clubId of elsewhere) regional.delete(clubId);
  REGIONAL_HOME.set(world.competitions, regional);
  return regional;
}

/**
 * Patrocínio da temporada de um clube só regional (023), pelas regras do estadual e pela divisão
 * dele no estadual, como na criação da carreira; nada para quem joga uma competição não regional.
 */
export function regionalSponsorship(
  world: CompletedBank,
  clubId: string,
  referenceDate: string,
): number | undefined {
  const competitionId = regionalHome(world).get(clubId);
  if (competitionId === undefined) return undefined;
  const competition = world.competitions.find((entry) => entry.id === competitionId);
  const level =
    competition?.divisions.find((division) => division.clubIds.includes(clubId))?.level ?? 1;
  const reputation = world.clubs.find((club) => club.id === clubId)?.reputation ?? 0;
  const wages = annualWageBill(world, clubId, referenceDate);
  return sponsorshipFor(economyRules(world, competitionId), level, reputation, wages);
}

/**
 * Fator de salários do clube (R4): o da competição principal do país; para um clube só regional
 * (023), o do estadual onde ele vive.
 */
export function wageFactorOf(world: CompletedBank, clubId: string): number {
  const regional = regionalHome(world).get(clubId);
  return regional === undefined
    ? economyRules(world, rulesCompetitionOf(world, clubId).id).wageFactorPct
    : (world.competitions.find((entry) => entry.id === regional)?.economy?.wageFactorPct ??
        DEFAULT_REGIONAL_WAGE_FACTOR_PCT);
}

/**
 * Folha anual do clube: 12 × Σ salários mensais × wageFactorPct (R4). O fator é o da competição
 * principal do país; para um clube só regional (023), o do estadual onde ele vive.
 */
export function annualWageBill(
  world: CompletedBank,
  clubId: string,
  referenceDate: string,
): number {
  const club = world.clubs.find((entry) => entry.id === clubId);
  if (!club) throw new Error(`clube inexistente: ${clubId}`);
  const factor = wageFactorOf(world, clubId);
  const monthly = squadOf(world, clubId).reduce(
    (sum, player) => sum + (player.contract?.wage ?? deriveWage(player, club, referenceDate)),
    0,
  );
  return Math.round((12 * monthly * factor) / 100);
}

/**
 * Finanças iniciais da carreira (contracts/finance-api.md): caixa do banco, preço padrão, estádio do
 * banco, sem dívida, obra ou crise; lança o patrocínio da temporada atual (rodada 0).
 */
export function createFinances(world: CompletedBank, league: LeagueSeason): FinanceState {
  const rules = economyRules(world, league.competitionId);
  const clubs: Record<string, ClubFinance> = {};
  const levels = new Map<string, number>();
  for (const season of league.divisions) {
    for (const clubId of season.clubIds) levels.set(clubId, season.divisionLevel);
  }
  const ids = [...levels.keys()].sort();
  for (const clubId of ids) {
    const club = world.clubs.find((entry) => entry.id === clubId);
    if (!club) throw new Error(`clube inexistente: ${clubId}`);
    clubs[clubId] = {
      clubId,
      cash: club.initialCash,
      debt: 0,
      ticketPrice: defaultTicketPrice(rules, levels.get(clubId) ?? 1, club.reputation),
      capacity: Math.min(club.stadiumCapacity, rules.stadium.maxCapacity),
      negativeRounds: 0,
      inCrisis: false,
      seasonStartCash: club.initialCash,
    };
  }
  const working = draft({ clubs, ledger: [], gates: [], seasons: [], crises: [] });
  for (const clubId of ids) {
    const reputation = world.clubs.find((entry) => entry.id === clubId)?.reputation ?? 0;
    const wages = annualWageBill(
      world,
      clubId,
      seasonDate(world.manifest.referenceDate, league.year),
    );
    post(working, {
      clubId,
      season: league.number,
      round: 0,
      category: "sponsorship",
      amount: sponsorshipFor(rules, levels.get(clubId) ?? 1, reputation, wages),
    });
  }
  return working;
}
