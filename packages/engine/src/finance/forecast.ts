import { seasonDate } from "../calendar/date";
import { clubDivision, leagueRound } from "../career/league";
import { type CareerSeasonState, calendarNext } from "../career/season-state";
import type { LeagueSeason } from "../career/types";
import { neutralCapacityOf } from "../knockout/prizes";
import { academyClub, academyMaintenance } from "../renewal/academy-levels";
import { scoutingCost } from "../scouting/rules";
import { effectiveScoutingLevel } from "../scouting/state";
import { standings } from "../season/standings";
import type { Fixture } from "../season/types";
import { interestFor } from "./actions";
import { annualWageBill } from "./create";
import { gateFor } from "./gate";
import { economyRules } from "./rules";
import { prizeFor } from "./turnover";

/** Previsão do caixa do clube até o fim da temporada, com o que já se sabe hoje. */
export interface CashForecast {
  /** Caixa de hoje. */
  cash: number;
  /** Bilheteria dos jogos em casa que faltam e já estão no calendário. */
  gate: number;
  gateGames: number;
  /** Parcelas da folha que faltam (negativo), com o elenco de hoje. */
  wages: number;
  wageRounds: number;
  /** Manutenção da academia que falta na temporada (negativo, 037). */
  academy: number;
  /** Custo dos olheiros que falta na temporada (negativo, 039); 0 com o departamento fechado. */
  scouting: number;
  /** Juros da dívida de hoje nas rodadas que faltam (negativo). */
  interest: number;
  /**
   * Premiação da liga pela posição de hoje, paga na virada da temporada. Antes do primeiro jogo da
   * liga a tabela não diz nada, e vale o meio dela (`positionGuessed`).
   */
  prize: number;
  position: number;
  positionGuessed: boolean;
  /** Premiação do último colocado e a do campeão (com o prêmio de título). */
  prizeRange: { min: number; max: number };
  /** Caixa previsto ao fim da temporada, depois da premiação. */
  endCash: number;
  /** Menor caixa previsto até lá (o de hoje, se nada ficar abaixo dele). */
  lowestCash: number;
  /** Data do menor caixa previsto; ausente quando o menor é o de hoje. */
  lowestDate?: string;
}

/** Liga do clube: a principal da carreira ou outra liga não regional em que ele está. */
function leagueOf(state: CareerSeasonState, clubId: string): LeagueSeason | undefined {
  return [state.league, ...state.competitions].find((league) => {
    const competition = state.world.competitions.find((entry) => entry.id === league.competitionId);
    return (
      competition?.format.type === "league" &&
      competition.regional === undefined &&
      clubDivision(league, clubId) !== undefined
    );
  });
}

/** Parcela da folha na rodada `round` de `total`, a mesma conta de `applyRoundFinances`. */
function wageInstalment(annual: number, round: number, total: number): number {
  return Math.floor((annual * round) / total) - Math.floor((annual * (round - 1)) / total);
}

/**
 * Previsão do caixa até o fim da temporada (sem sorteio, sem alterar nada): percorre os dias que
 * faltam no calendário com as mesmas regras da rodada (bilheteria sem ruído, folha, juros e obras
 * do estádio) e soma a premiação da liga pela posição atual. Ficam de fora o que ainda não se
 * sabe: prêmios de copa, jogos de mata-mata não sorteados, transferências, mudanças de preço, de
 * elenco e de dívida. `undefined` se o clube não disputa uma liga na carreira.
 */
export function seasonCashForecast(
  state: CareerSeasonState,
  clubId: string,
): CashForecast | undefined {
  const finance = state.finances.clubs[clubId];
  const league = leagueOf(state, clubId);
  const division = league ? clubDivision(league, clubId) : undefined;
  if (!finance || !league || !division) return undefined;
  const { world, finances } = state;
  const rules = economyRules(world, league.competitionId);
  const annual = annualWageBill(
    world,
    clubId,
    seasonDate(world.manifest.referenceDate, league.year),
  );
  const instalment = interestFor(finance.debt, rules.credit.interestBp);
  const total = division.calendar.length;

  let cash = finance.cash;
  let lowestCash = cash;
  let lowestDate: string | undefined;
  let gate = 0;
  let gateGames = 0;
  let wages = 0;
  let wageRounds = 0;
  let academy = 0;
  let scouting = 0;
  const scoutingAnnual =
    12 *
    scoutingCost(
      world,
      clubId,
      clubId === state.board?.manager.clubId ? effectiveScoutingLevel(state.scouting, clubId) : 0,
    );
  const academyAnnual =
    12 * academyMaintenance(world, clubId, academyClub(state.renewal, world, clubId).level);
  let interest = 0;
  let capacity = finance.capacity;
  let worksLeft = finance.works?.remainingRounds;
  // Rodada da liga em que caem os jogos das outras competições (a mesma conta de `applyExtraGates`).
  let round = leagueRound(league);

  const fixtureOf = (
    competitionId: string,
    slotRound: number,
  ): { fixture: Fixture; divisionLevel: number } | undefined => {
    const season =
      competitionId === league.competitionId
        ? league
        : state.competitions.find((entry) => entry.competitionId === competitionId);
    for (const candidate of season?.divisions ?? []) {
      const fixture = candidate.calendar[slotRound - 1]?.fixtures.find(
        (entry) => entry.home === clubId || entry.away === clubId,
      );
      if (fixture) return { fixture, divisionLevel: candidate.divisionLevel };
    }
    return undefined;
  };

  const days = state.calendar.days.slice(calendarNext(state));
  for (const day of days) {
    for (const slot of day.slots) {
      const principal = slot.competitionId === league.competitionId;
      const found = fixtureOf(slot.competitionId, slot.round);
      if (found) {
        const { fixture, divisionLevel } = found;
        const mood = state.fans?.clubs[fixture.home]?.mood;
        const neutral = !principal && fixture.neutral === true && fixture.tie !== undefined;
        if (fixture.home === clubId || neutral) {
          const estimate = gateFor(
            finances,
            league,
            world,
            { ...fixture, round: principal ? slot.round : round },
            finances.clubs[fixture.home]?.ticketPrice ?? rules.priceRange.min,
            {
              noise: false,
              ...(mood !== undefined ? { mood } : {}),
              ...(neutral && fixture.tie
                ? {
                    capacity: neutralCapacityOf(
                      world,
                      slot.competitionId,
                      fixture.tie.phase,
                      fixture.stage ? { stage: fixture.stage.index, divisionLevel } : undefined,
                    ),
                  }
                : { capacity }),
            },
          );
          // Campo neutro: a renda é dividida, e o mandante fica com o centavo ímpar.
          const revenue = neutral
            ? fixture.home === clubId
              ? Math.ceil(estimate.revenue / 2)
              : Math.floor(estimate.revenue / 2)
            : estimate.revenue;
          gate += revenue;
          gateGames += 1;
          cash += revenue;
        }
      }
      if (!principal) continue;
      // Fechamento da rodada da liga: folha (só nas rodadas da divisão), juros e obras.
      if (slot.round <= total) {
        const wage = wageInstalment(annual, slot.round, total);
        wages -= wage;
        wageRounds += 1;
        cash -= wage;
        const maintenance = wageInstalment(academyAnnual, slot.round, total);
        academy -= maintenance;
        cash -= maintenance;
        const scouts = wageInstalment(scoutingAnnual, slot.round, total);
        scouting -= scouts;
        cash -= scouts;
      }
      interest -= instalment;
      cash -= instalment;
      if (worksLeft !== undefined) {
        worksLeft -= 1;
        if (worksLeft <= 0) {
          capacity = Math.min(rules.stadium.maxCapacity, capacity + (finance.works?.seats ?? 0));
          worksLeft = undefined;
        }
      }
      round = slot.round + 1;
    }
    if (cash < lowestCash) {
      lowestCash = cash;
      lowestDate = day.date;
    }
  }

  const table = standings(division, world);
  const clubs = table.length;
  const positionGuessed = !division.records.some(
    (record) => record.home === clubId || record.away === clubId,
  );
  const position = positionGuessed
    ? Math.ceil(clubs / 2)
    : (table.find((row) => row.clubId === clubId)?.position ?? clubs);
  const prizeAt = (place: number) =>
    prizeFor(rules, division.divisionLevel, place, clubs, place === 1);
  const prize = prizeAt(position);
  return {
    cash: finance.cash,
    gate,
    gateGames,
    wages,
    wageRounds,
    academy,
    scouting,
    interest,
    prize,
    position,
    positionGuessed,
    prizeRange: { min: prizeAt(clubs), max: prizeAt(1) },
    endCash: cash + prize,
    lowestCash,
    ...(lowestDate !== undefined ? { lowestDate } : {}),
  };
}
