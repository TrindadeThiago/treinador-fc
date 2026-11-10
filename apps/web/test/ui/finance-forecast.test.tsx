// Previsão do caixa até o fim da temporada, no resumo das Finanças e na Visão geral.
import type { CashForecast } from "@brasfoot-like/engine";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { cashForecastOf } from "../../src/game/forecast";
import { formatDate, formatMoney, t } from "../../src/i18n";
import { ForecastCard } from "../../src/ui/finance/ForecastCard";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo/financas?c=tela");
});

/** O dinheiro vem com espaço não separável; a página é lida com os espaços normalizados. */
const text = (value: string) => value.replace(/\s+/g, " ");

const base: CashForecast = {
  cash: 5_000_000,
  gate: 2_000_000,
  gateGames: 10,
  wages: -6_000_000,
  wageRounds: 20,
  academy: 0,
  scouting: 0,
  interest: 0,
  prize: 900_000,
  position: 8,
  positionGuessed: false,
  prizeRange: { min: 300_000, max: 3_000_000 },
  endCash: 1_900_000,
  lowestCash: 1_000_000,
  lowestDate: "2027-11-20",
};

describe("previsão de caixa", () => {
  it("o resumo fixo e a Visão geral mostram a previsão da carreira", async () => {
    const { store, save } = await storedCareer(6);
    const forecast = cashForecastOf(save);
    if (!forecast) throw new Error("sem previsão");
    renderApp("/jogo/financas?c=tela", store);
    await screen.findByRole("tablist", { name: t("finance.tablist") });
    const header = screen.getByText(t("finance.forecast")).closest("div") as HTMLElement;
    expect(within(header).getByText(text(formatMoney(forecast.endCash)))).toBeDefined();
    const card = screen.getByRole("region", { name: t("finance.forecast.title") });
    const terms = within(card)
      .getAllByRole("term")
      .map((term) => term.textContent);
    expect(terms).toContain(t("finance.forecast.gate", { games: forecast.gateGames }));
    expect(terms).toContain(t("finance.forecast.prize", { position: forecast.position }));
    expect(terms.at(-1)).toBe(t("finance.forecast.end"));
  });

  it("detalha o que falta e diz quanto dá para gastar até o ponto mais baixo", () => {
    render(<ForecastCard forecast={base} />);
    const card = screen.getByRole("region", { name: t("finance.forecast.title") });
    const terms = within(card)
      .getAllByRole("term")
      .map((term) => term.textContent);
    expect(terms).toEqual([
      t("finance.forecast.cash"),
      t("finance.forecast.gate", { games: 10 }),
      t("finance.forecast.wages", { rounds: 20 }),
      t("finance.forecast.prize", { position: 8 }),
      t("finance.forecast.end"),
    ]);
    const spend = t("finance.forecast.spend", {
      amount: formatMoney(1_000_000),
      date: formatDate("2027-11-20"),
    });
    expect(screen.getByRole("status").textContent).toBe(spend);
    const range = t("finance.forecast.prizeRange", {
      min: formatMoney(300_000),
      max: formatMoney(3_000_000),
    });
    expect(screen.getByText(text(range))).toBeDefined();
  });

  it("avisa quando o caixa deve ficar negativo, e mostra os juros quando há dívida", () => {
    render(
      <ForecastCard
        forecast={{ ...base, interest: -90_000, lowestCash: -400_000, lowestDate: "2027-09-01" }}
      />,
    );
    expect(screen.getByText(t("finance.forecast.interest"))).toBeDefined();
    expect(screen.getByRole("status").textContent).toBe(
      t("finance.forecast.negative", {
        amount: formatMoney(-400_000),
        date: formatDate("2027-09-01"),
      }),
    );
  });

  it("sem jogos, a premiação é a do meio da tabela; sem queda, a margem é o saldo de hoje", () => {
    const { lowestDate: _date, ...rest } = base;
    render(
      <ForecastCard
        forecast={{ ...rest, positionGuessed: true, position: 10, lowestCash: 5_000_000 }}
      />,
    );
    expect(screen.getByText(t("finance.forecast.prizeGuess", { position: 10 }))).toBeDefined();
    expect(screen.getByRole("status").textContent).toBe(
      t("finance.forecast.spendToday", { amount: formatMoney(5_000_000) }),
    );
  });
});
