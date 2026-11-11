// 040: painel de captação (US1, US2), origem na base e sigilo das indicações (FR-013a).
import { generateOffers, type ScoutingState } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 60000 });

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo/mercado?c=tela&aba=scouting");
});
afterEach(cleanup);

/** Departamento aberto no nível 5, região do país do clube e indicações abertas. */
/** `cost` troca o custo de registro (o caixa não pode ser editado: o save confere o livro-caixa). */
function withOffers(cost?: number, hidden?: { potential: number; temperament: number }) {
  return (save: SaveFile): SaveFile => {
    const countryId = save.bank.countries[0]?.id ?? "";
    const region = { kind: "country" as const, countryId };
    const scouting = generateOffers(
      { ...save.scouting, clubId: save.clubId, level: 5, region } as ScoutingState,
      {
        world: save.bank,
        renewal: save.renewal,
        careerSeed: save.seed,
        managerClubId: save.clubId,
        season: save.league.number,
        round: 1,
        expiresRound: 3,
        year: save.league.year,
      },
    );
    const offers = (scouting.offers ?? [])
      .map((original) => ({
        ...original,
        ...(cost !== undefined ? { cost } : {}),
      }))
      .map((offer) =>
        hidden
          ? {
              ...offer,
              player: {
                ...offer.player,
                hidden: {
                  ...offer.player.hidden,
                  potential: hidden.potential,
                  temperament: hidden.temperament,
                },
              },
              estimate: { low: 41, high: 98 },
            }
          : offer,
      );
    return { ...save, scouting: { ...scouting, offers } };
  };
}

describe("captação na aba Observação (040)", () => {
  it("fechado: o painel explica que é preciso abrir o departamento", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/mercado?c=tela&aba=scouting", store);
    const panel = await screen.findByRole("region", { name: t("recruitment.title") });
    expect(panel.textContent).toContain(t("recruitment.closed"));
  });

  it("indicações com faixa; trazer em três ações e o jovem aparece na base como captado", async () => {
    const { store, save } = await storedCareer(1, withOffers());
    renderApp("/jogo/mercado?c=tela&aba=scouting", store);
    const user = userEvent.setup({ delay: null });
    const table = await screen.findByRole("table", { name: t("recruitment.caption") });
    const offer = withOffers()(save).scouting.offers?.[0];
    if (!offer) throw new Error("sem indicação");
    const name = offer.player.displayName;
    // 1: Trazer; 2: confirmar (a aba já mostra as indicações: abrir a aba é a terceira).
    await user.click(
      within(table).getByRole("button", { name: t("recruitment.signAria", { name }) }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: t("recruitment.confirmTitle", { name }),
    });
    expect(dialog.textContent).toMatch(/O registro custa/);
    await user.click(within(dialog).getByRole("button", { name: t("recruitment.sign") }));
    expect(await screen.findByText(t("recruitment.done.sign", { name }))).toBeDefined();
    memoryRouter.reset("/jogo/elenco?c=tela&aba=base");
    cleanup();
    renderApp("/jogo/elenco?c=tela&aba=base", store);
    const country = save.bank.countries[0]?.name ?? "";
    expect(await screen.findByText(t("academy.origin.scouted", { region: country }))).toBeDefined();
  });

  it("sem caixa, Trazer fica indisponível com o motivo em texto", async () => {
    const { store } = await storedCareer(1, withOffers(999_000_000_000));
    renderApp("/jogo/mercado?c=tela&aba=scouting", store);
    const table = await screen.findByRole("table", { name: t("recruitment.caption") });
    const buttons = within(table).getAllByRole("button", { name: /^Trazer / });
    expect(buttons.every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
    expect(within(table).getAllByText(/Caixa insuficiente: faltam/).length).toBeGreaterThan(0);
  });

  it("sigilo: o painel não muda com o potencial e o temperamento reais dos indicados", async () => {
    const text = async (potential: number, temperament: number) => {
      const { store } = await storedCareer(1, withOffers(undefined, { potential, temperament }));
      renderApp("/jogo/mercado?c=tela&aba=scouting", store);
      const panel = await screen.findByRole("region", { name: t("recruitment.title") });
      const out = panel.textContent ?? "";
      cleanup();
      return out;
    };
    const a = await text(97, 5);
    const b = await text(52, 90);
    expect(a).toContain("41–98");
    expect(b).toEqual(a);
  });
});
