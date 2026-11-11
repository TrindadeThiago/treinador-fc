// 042: empresários na negociação (US1), no detalhe e na aba Empresários (US2).
import { agentOf, askedCommission, buyAskingPrice, relationBand } from "@brasfoot-like/engine";
import { marketContextOf, type SaveFile, startManagerNegotiation } from "@brasfoot-like/save";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { commissionQuoteOf } from "../../src/game/agents-view";
import { formatMoney, t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 60000 });

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo/mercado?c=tela&aba=negotiations");
});
afterEach(cleanup);

/** Espaços (inclusive o não separável do dinheiro) viram um espaço comum. */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Uma compra aceita pelo clube (etapa do contrato) de um jogador de outro clube. */
function withPurchase(save: SaveFile): SaveFile {
  const context = marketContextOf(save);
  const cash = save.finances.clubs[save.clubId]?.cash ?? 0;
  for (const player of save.bank.players) {
    if (player.clubId === save.clubId || player.contract?.loan) continue;
    const fee = buyAskingPrice(context, player);
    if (fee > cash / 3) continue;
    const step = startManagerNegotiation(save, { kind: "buy", playerId: player.id, fee });
    if (step.ok && step.step.negotiation?.stage === "contract") return step.save;
  }
  throw new Error("sem compra");
}

describe("comissão na negociação (042 US1)", () => {
  it("mostra o empresário, a relação em texto e o campo com a comissão pedida", async () => {
    const { store, save } = await storedCareer(1, withPurchase);
    const negotiation = save.market.negotiations[0];
    if (!negotiation) throw new Error("sem negociação");
    const quote = commissionQuoteOf(save, negotiation.playerId, false);
    if (!quote) throw new Error("sem empresário");
    renderApp("/jogo/mercado?c=tela&aba=negotiations", store);
    const field = (await screen.findByLabelText(t("market.commission.label"))) as HTMLInputElement;
    expect(field.value.replace(/\D/g, "")).toBe(String(askedCommission(quote)));
    const agent = t("market.commission.agent", {
      name: quote.agent.name,
      band: t(`agents.band.${relationBand(quote.relation)}`),
      value: quote.relation,
    });
    expect(screen.getByText(agent)).toBeDefined();
    const hint = normalize(
      t("market.commission.hint", { commission: formatMoney(askedCommission(quote)) }),
    );
    expect(
      screen.getAllByText((_, el) => normalize(el?.textContent ?? "") === hint).length,
    ).toBeGreaterThan(0);
  });
});

describe("empresário visível (042 US2)", () => {
  it("a aba Empresários lista quem negociou com o clube e mostra a carteira", async () => {
    const { store, save } = await storedCareer(1, (career) => {
      const player = career.bank.players.find((entry) => entry.clubId !== career.clubId);
      if (!player) throw new Error("sem jogador");
      const agent = agentOf(career.bank, career.seed, player);
      if (!agent) throw new Error("sem empresário");
      return {
        ...career,
        market: {
          ...career.market,
          agents: {
            relations: {
              [career.clubId]: { [agent.id]: { value: 68, reason: "signed", season: 1, round: 1 } },
            },
            deals: [],
          },
        },
      };
    });
    const player = save.bank.players.find((entry) => entry.clubId !== save.clubId);
    const agent = player ? agentOf(save.bank, save.seed, player) : undefined;
    if (!player || !agent) throw new Error("sem empresário");
    memoryRouter.reset("/jogo/mercado?c=tela&aba=agents");
    renderApp("/jogo/mercado?c=tela&aba=agents", store);
    const table = await screen.findByRole("table", { name: t("agents.caption") });
    expect(
      within(table).getByText(t("agents.relationValue", { band: "boa", value: 68 })),
    ).toBeDefined();
    await userEvent
      .setup({ delay: null })
      .click(within(table).getByRole("button", { name: agent.name }));
    const portfolio = screen.getByRole("region", {
      name: t("agents.portfolioOf", { name: agent.name }),
    });
    expect(within(portfolio).getByRole("button", { name: player.displayName })).toBeDefined();
  });

  it("o detalhe do jogador mostra o empresário e a relação em texto", async () => {
    const { store, save } = await storedCareer(1);
    const player = save.bank.players.find(
      (entry) => entry.clubId === save.clubId && entry.position === "MF",
    );
    if (!player) throw new Error("sem meia");
    const agent = agentOf(save.bank, save.seed, player);
    if (!agent) throw new Error("sem empresário");
    memoryRouter.reset("/jogo/elenco?c=tela");
    renderApp("/jogo/elenco?c=tela", store);
    await screen.findByRole("table");
    await userEvent
      .setup({ delay: null })
      .click(
        screen.getByRole("button", { name: t("lineup.detailsOf", { name: player.displayName }) }),
      );
    const modal = await screen.findByRole("dialog", { name: player.displayName });
    expect(
      within(modal).getByText(
        t("player.agentValue", { name: agent.name, band: t("agents.band.neutral"), value: 50 }),
      ),
    ).toBeDefined();
  });
});
