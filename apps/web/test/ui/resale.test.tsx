// 041: cláusula de revenda na venda (US1), na compra (US3) e em Finanças (US4).
import { ageOn, buyAskingPrice, feeWithResale, resaleRules } from "@brasfoot-like/engine";
import {
  currentDate,
  marketContextOf,
  quoteManagerSale,
  type SaveFile,
  startManagerNegotiation,
} from "@brasfoot-like/save";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatMoney, t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 60000 });

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo/mercado?c=tela&aba=incoming");
});
afterEach(cleanup);

/** O meia mais forte do clube (vendável sem quebrar o mínimo do elenco). */
function sellable(save: SaveFile) {
  const player = save.bank.players
    .filter((entry) => entry.clubId === save.clubId && entry.position === "MF")
    .sort((a, b) => b.strength - a.strength)[0];
  if (!player) throw new Error("sem meia");
  return player;
}

/** Uma proposta de compra pelo meia, do comprador da venda imediata (que tem vaga e caixa). */
function withOffer(save: SaveFile): SaveFile {
  const player = sellable(save);
  const quote = quoteManagerSale(save, player.id);
  if (!quote.ok) throw new Error(JSON.stringify(quote.error));
  return {
    ...save,
    market: {
      ...save.market,
      incoming: [
        {
          id: "off-resale",
          playerId: player.id,
          fromClubId: quote.quote.buyerClubId,
          fee: quote.quote.fee,
          kind: "buy",
          expiresRound: 3,
        },
      ],
    },
  };
}

describe("vender com cláusula de revenda (041 US1)", () => {
  it("a proposta mostra o seletor, o teto e o valor final; aceitar com 30% vende", async () => {
    const { store, save } = await storedCareer(1, withOffer);
    const offer = withOffer(save).market.incoming[0];
    const player = sellable(save);
    if (!offer) throw new Error("sem proposta");
    renderApp("/jogo/mercado?c=tela&aba=incoming", store);
    const user = userEvent.setup({ delay: null });
    const select = (await screen.findByRole("combobox", {
      name: t("market.resale.label"),
    })) as HTMLSelectElement;
    const above = within(select).getByRole("option", {
      name: t("market.resale.optionAbove", { pct: 35 }),
    }) as HTMLOptionElement;
    expect(above.disabled).toBe(true);
    expect(screen.getByText(t("market.resale.ceiling", { max: 30 }))).toBeDefined();
    await user.selectOptions(select, "30");
    const rules = resaleRules(save.bank, save.league.competitionId);
    const net = feeWithResale(offer.fee, 30, rules);
    expect(
      screen.getByText(
        same(
          t("market.resale.summary", {
            fee: formatMoney(offer.fee),
            discount: formatMoney(offer.fee - net),
            net: formatMoney(net),
            pct: 30,
          }),
        ),
      ),
    ).toBeDefined();
    await user.click(screen.getByRole("button", { name: t("market.action.accept") }));
    expect(
      await screen.findByText(t("market.incoming.response.accepted", { name: player.displayName })),
    ).toBeDefined();
  });

  it("a venda imediata mostra a cláusula e o valor com desconto antes de confirmar", async () => {
    const { store, save } = await storedCareer(1);
    const player = sellable(save);
    memoryRouter.reset("/jogo/elenco?c=tela");
    renderApp("/jogo/elenco?c=tela", store);
    await screen.findByRole("table");
    const user = userEvent.setup({ delay: null });
    await user.click(
      screen.getByRole("button", { name: t("lineup.detailsOf", { name: player.displayName }) }),
    );
    const modal = await screen.findByRole("dialog", { name: player.displayName });
    await user.click(
      within(modal).getByRole("button", { name: t("squad.sellOf", { name: player.displayName }) }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: t("disposal.sell.title", { name: player.displayName }),
    });
    const quote = quoteManagerSale(save, player.id);
    if (!quote.ok) throw new Error("sem cotação");
    await user.selectOptions(
      within(dialog).getByRole("combobox", { name: t("market.resale.label") }),
      "20",
    );
    const net = feeWithResale(
      quote.quote.fee,
      20,
      resaleRules(save.bank, save.league.competitionId),
    );
    const summary = dialog.querySelector("[aria-live=polite]")?.textContent ?? "";
    expect(normalize(summary)).toContain(normalize(`você recebe ${formatMoney(net)}`));
  });
});

/** Espaços (inclusive o não separável do dinheiro) viram um espaço comum. */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Matcher de texto que compara os dois lados normalizados. */
function same(expected: string) {
  return (_: string, element: Element | null) =>
    element?.tagName === "P" && normalize(element.textContent ?? "") === normalize(expected);
}

/** Uma compra aceita (etapa do contrato) de um jogador de 19 anos de um clube da IA. */
function withYoungPurchase(save: SaveFile): SaveFile {
  const context = marketContextOf(save);
  const cash = save.finances.clubs[save.clubId]?.cash ?? 0;
  for (const player of save.bank.players) {
    if (player.clubId === save.clubId || player.contract?.loan) continue;
    if (ageOn(player.birthDate, currentDate(save)) !== 19) continue;
    const fee = buyAskingPrice(context, player);
    if (fee > cash / 2) continue;
    const step = startManagerNegotiation(save, { kind: "buy", playerId: player.id, fee });
    if (step.ok && step.step.negotiation?.stage === "contract") return step.save;
  }
  throw new Error("sem jovem para comprar");
}

describe("comprar com cláusula pedida pela IA (041 US3)", () => {
  it("a negociação mostra a cláusula pedida, os dois valores e a escolha", async () => {
    const { store, save } = await storedCareer(1, withYoungPurchase);
    const negotiation = save.market.negotiations[0];
    if (!negotiation?.resaleAsk || negotiation.agreedFee === undefined) {
      throw new Error("sem pedido de cláusula");
    }
    memoryRouter.reset("/jogo/mercado?c=tela&aba=negotiations");
    renderApp("/jogo/mercado?c=tela&aba=negotiations", store);
    const club = save.bank.clubs.find((entry) => entry.id === negotiation.fromClubId)?.shortName;
    const rules = resaleRules(save.bank, save.league.competitionId);
    const text = t("market.resale.asked", {
      club: club ?? "",
      pct: 20,
      withFee: formatMoney(feeWithResale(negotiation.agreedFee, 20, rules)),
      withoutFee: formatMoney(negotiation.agreedFee),
    });
    expect(await screen.findByText(same(text))).toBeDefined();
    const box = screen.getByRole("checkbox", {
      name: t("market.resale.accept", { pct: 20 }),
    }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    await userEvent.setup({ delay: null }).click(box);
    expect(box.checked).toBe(true);
  });

  it("o detalhe do jogador mostra a cláusula ativa", async () => {
    const { store, save } = await storedCareer(1, (career) => {
      const player = sellable(career);
      const creditor = career.bank.clubs.find((club) => club.id !== career.clubId);
      return {
        ...career,
        market: {
          ...career.market,
          resale: {
            clauses: [
              {
                id: "resale-1",
                playerId: player.id,
                displayName: player.displayName,
                creditorClubId: creditor?.id ?? "",
                pct: 20,
                season: 1,
                round: 0,
                fromClubId: creditor?.id ?? "",
                toClubId: career.clubId,
                fee: 1_000_000,
              },
            ],
            receipts: [],
            nextSeq: 2,
          },
        },
      };
    });
    const player = sellable(save);
    const creditor = save.bank.clubs.find((club) => club.id !== save.clubId);
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
      within(modal).getByText(t("player.resaleValue", { pct: 20, club: creditor?.name ?? "" })),
    ).toBeDefined();
  });
});

describe("Revendas em Finanças (041 US4)", () => {
  it("lista a receber, a pagar, recebidas com total e encerradas, com rótulos em texto", async () => {
    const { store, save } = await storedCareer(1, (career) => {
      const own = sellable(career);
      const other = career.bank.players.find((player) => player.clubId !== career.clubId);
      const rival = career.bank.clubs.find((club) => club.id !== career.clubId)?.id ?? "";
      if (!other) throw new Error("sem jogador");
      const clause = (id: string, playerId: string, creditor: string) => ({
        id,
        playerId,
        displayName: playerId,
        creditorClubId: creditor,
        pct: 30,
        season: 1,
        round: 0,
        fromClubId: creditor,
        toClubId: "x",
        fee: 1_000_000,
      });
      const receipt = (id: string, outcome: "paid" | "bought_back", amount: number) => ({
        clauseId: id,
        playerId: `p-${id}`,
        displayName: `Vendido ${id}`,
        creditorClubId: career.clubId,
        pct: 20,
        outcome,
        buyerClubId: rival,
        sellerClubId: rival,
        saleFee: amount * 5,
        amount,
        season: 1,
        round: 1,
      });
      return {
        ...career,
        market: {
          ...career.market,
          resale: {
            clauses: [
              clause("resale-1", other.id, career.clubId),
              clause("resale-2", own.id, rival),
            ],
            receipts: [receipt("r-1", "paid", 400_000), receipt("r-2", "bought_back", 0)],
            nextSeq: 3,
          },
        },
      };
    });
    memoryRouter.reset("/jogo/financas?c=tela");
    renderApp("/jogo/financas?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await user.click(await screen.findByRole("tab", { name: t("finance.tab.resale") }));
    const receivable = await screen.findByRole("table", { name: t("finance.resale.receivable") });
    const other = save.bank.players.find((player) => player.clubId !== save.clubId);
    expect(within(receivable).getByText(other?.displayName ?? "")).toBeDefined();
    const payable = screen.getByRole("table", { name: t("finance.resale.payable") });
    expect(within(payable).getByText(sellable(save).displayName)).toBeDefined();
    expect(
      screen.getByText(same(t("finance.resale.total", { count: 1, total: formatMoney(400_000) }))),
    ).toBeDefined();
    const closed = screen.getByRole("table", { name: t("finance.resale.closed") });
    expect(within(closed).getByText(t("finance.resale.outcome.bought_back"))).toBeDefined();
    // "A receber" e "A pagar" são títulos em texto, não só cor (FR-017).
    expect(screen.getByRole("heading", { name: t("finance.resale.receivable") })).toBeDefined();
    expect(screen.getByRole("heading", { name: t("finance.resale.payable") })).toBeDefined();
  });
});
