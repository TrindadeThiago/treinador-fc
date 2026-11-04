import { describe, expect, it } from "vitest";
import { advanceCareerDays } from "../../src/career/day";
import { clubDivision } from "../../src/career/league";
import type { CareerSeasonState } from "../../src/career/season-state";
import { takeLoan } from "../../src/finance/actions";
import { seasonCashForecast } from "../../src/finance/forecast";
import { economyRules } from "../../src/finance/rules";
import { prizeFor } from "../../src/finance/turnover";
import type { LedgerCategory } from "../../src/finance/types";
import { standings } from "../../src/season/standings";
import { MANAGER, newState } from "../career/day-helpers";
import { TOURNAMENT_ID, twoCompetitionsBank } from "../fixtures/two-competitions";
import { testWorld } from "../season/helpers/world";

const SEED = "previsao-caixa";

function ok(result: { ok: boolean }): CareerSeasonState {
  const typed = result as { ok: true; state: CareerSeasonState } | { ok: false };
  if (!typed.ok) throw new Error(JSON.stringify(result));
  return typed.state;
}

function forecastOf(state: CareerSeasonState) {
  const forecast = seasonCashForecast(state, MANAGER);
  if (!forecast) throw new Error("sem previsão");
  return forecast;
}

const total = (state: CareerSeasonState, category: LedgerCategory, competitionId?: string) =>
  state.finances.ledger
    .filter(
      (entry) =>
        entry.clubId === MANAGER &&
        entry.category === category &&
        (competitionId === undefined || entry.competitionId === competitionId),
    )
    .reduce((sum, entry) => sum + entry.amount, 0);

describe("previsão de caixa até o fim da temporada", () => {
  it("no primeiro dia: a folha inteira, todos os jogos em casa e a premiação pela posição", () => {
    const state = newState(testWorld(), SEED);
    const forecast = forecastOf(state);
    const division = clubDivision(state.league, MANAGER);
    const homeGames = (division?.calendar ?? []).filter((round) =>
      round.fixtures.some((fixture) => fixture.home === MANAGER),
    ).length;
    expect(forecast.cash).toBe(state.finances.clubs[MANAGER]?.cash);
    expect(forecast.gateGames).toBe(homeGames);
    expect(forecast.gate).toBeGreaterThan(0);
    expect(forecast.wageRounds).toBe(division?.calendar.length);
    expect(forecast.wages).toBeLessThan(0);
    expect(forecast.interest).toBe(0);
    expect(forecast.endCash).toBe(
      forecast.cash + forecast.gate + forecast.wages + forecast.interest + forecast.prize,
    );
    expect(forecast.lowestCash).toBeLessThanOrEqual(forecast.cash);
    // Sem jogos, a posição da tabela não diz nada: vale o meio dela.
    const clubs = division?.clubIds.length ?? 0;
    expect(forecast.positionGuessed).toBe(true);
    expect(forecast.position).toBe(Math.ceil(clubs / 2));
    expect(forecast.prizeRange.min).toBeLessThan(forecast.prize);
    expect(forecast.prizeRange.max).toBeGreaterThan(forecast.prize);
  });

  it("bate com a temporada jogada: folha exata e bilheteria perto da real", () => {
    const state = newState(testWorld(), SEED);
    const forecast = forecastOf(state);
    const end = ok(advanceCareerDays(state, { toEnd: true }, SEED, MANAGER));
    // Sem renovação nem mercado o elenco não muda: a folha prevista é a cobrada.
    expect(forecast.wages).toBe(total(end, "wages"));
    const gate = total(end, "gate");
    // A real tem ruído de ±5% por jogo e a fase do time muda o público.
    expect(Math.abs(forecast.gate - gate) / gate).toBeLessThan(0.2);
    expect(forecastOf(end)).toMatchObject({ gate: 0, gateGames: 0, wages: 0, wageRounds: 0 });
  }, 120_000);

  it("com a temporada encerrada, só falta a premiação pela posição final", () => {
    const state = ok(
      advanceCareerDays(newState(testWorld(), SEED), { toEnd: true }, SEED, MANAGER),
    );
    const forecast = forecastOf(state);
    const division = clubDivision(state.league, MANAGER);
    if (!division) throw new Error("sem divisão");
    const table = standings(division, state.world);
    const position = table.find((row) => row.clubId === MANAGER)?.position ?? 0;
    const rules = economyRules(state.world, state.league.competitionId);
    expect(forecast.position).toBe(position);
    expect(forecast.positionGuessed).toBe(false);
    expect(forecast.prize).toBe(
      prizeFor(rules, division.divisionLevel, position, table.length, position === 1),
    );
    expect(forecast.endCash).toBe((state.finances.clubs[MANAGER]?.cash ?? 0) + forecast.prize);
  }, 120_000);

  it("cobra os juros da dívida de hoje em cada rodada que falta", () => {
    const state = newState(testWorld(), SEED);
    const loan = takeLoan(state.finances, state.league, state.world, MANAGER, 1_000_000);
    if (!loan.ok) throw new Error(JSON.stringify(loan.error));
    const withDebt = { ...state, finances: loan.finances };
    const forecast = forecastOf(withDebt);
    const end = ok(advanceCareerDays(withDebt, { toEnd: true }, SEED, MANAGER));
    expect(forecast.interest).toBeLessThan(0);
    expect(forecast.interest).toBe(total(end, "interest"));
    // O empréstimo entra no caixa de hoje.
    expect(forecast.cash).toBe((state.finances.clubs[MANAGER]?.cash ?? 0) + 1_000_000);
  }, 120_000);

  it("soma os jogos em casa das outras competições já no calendário", () => {
    const world = twoCompetitionsBank();
    const state = newState(world, SEED);
    const forecast = forecastOf(state);
    const alone = forecastOf(newState(testWorld(), SEED));
    const end = ok(advanceCareerDays(state, { toEnd: true }, SEED, MANAGER));
    const tournament = end.finances.gates.filter(
      (gate) => gate.clubId === MANAGER && gate.competitionId === TOURNAMENT_ID,
    ).length;
    expect(tournament).toBeGreaterThan(0);
    expect(forecast.gateGames).toBe(alone.gateGames + tournament);
    expect(forecast.gate).toBeGreaterThan(alone.gate);
  }, 120_000);

  it("não muda o estado e é a mesma em duas chamadas", () => {
    const state = newState(testWorld(), SEED);
    const before = JSON.stringify(state.finances);
    expect(forecastOf(state)).toEqual(forecastOf(state));
    expect(JSON.stringify(state.finances)).toBe(before);
  });

  it("clube fora da carreira não tem previsão", () => {
    expect(seasonCashForecast(newState(testWorld(), SEED), "clube-inexistente")).toBeUndefined();
  });
});
