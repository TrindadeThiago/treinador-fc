import { academyClub, academyUpgradeCost } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { academyPanelView } from "../../src/game/academy-view";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { loadSaved } from "../helpers/live";

// 037: painel da academia na aba Base.

function withCash(cash: number) {
  return (save: SaveFile): SaveFile => {
    const club = save.finances.clubs[save.clubId];
    if (!club) throw new Error("sem finanças");
    // Caixa coerente com o livro-caixa: o ajuste entra como um lançamento.
    return {
      ...save,
      finances: {
        ...save.finances,
        clubs: { ...save.finances.clubs, [save.clubId]: { ...club, cash } },
        ledger: [
          ...save.finances.ledger,
          {
            clubId: save.clubId,
            season: save.league.number,
            round: 0,
            category: "loan_in",
            amount: cash - club.cash,
          },
        ],
      },
    };
  };
}

describe("painel da academia (037)", () => {
  it("mostra nível, manutenção, efeito com o próximo nível e a comparação da divisão", async () => {
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/elenco?c=tela&aba=base", store);
    const panel = await screen.findByRole("region", { name: t("academy.panel.title") });
    const view = academyPanelView(save);
    expect(
      within(panel).getByText(t("academy.panel.level", { level: view.level, max: 5 })),
    ).toBeDefined();
    expect(panel.textContent).toContain(t(`academy.quality.${view.effect.quality}`));
    const division = within(panel).getByText(t("academy.panel.division"));
    expect(division).toBeDefined();
    expect(panel.textContent).toContain(t("academy.panel.own"));
    expect(view.division.some((entry) => entry.own)).toBe(true);
  });

  it("melhorar: o diálogo mostra a obra e o caixa; confirmar deixa a obra pendente", async () => {
    const { store, save } = await storedCareer(1, withCash(500_000_000));
    renderApp("/jogo/elenco?c=tela&aba=base", store);
    const user = userEvent.setup();
    const level = academyClub(save.renewal, save.bank, save.clubId).level;
    if (level >= 5) return;
    await user.click(await screen.findByRole("button", { name: t("academy.panel.upgrade") }));
    const dialog = await screen.findByRole("dialog", {
      name: t("academy.panel.upgradeTitle", { level: level + 1 }),
    });
    expect(dialog.textContent).toContain("pago agora");
    await user.click(within(dialog).getByRole("button", { name: t("academy.panel.upgrade") }));
    expect(await screen.findByText(t("academy.panel.done.upgrade"))).toBeDefined();
    expect(screen.getByText(t("academy.panel.pendingUpgrade", { level: level + 1 }))).toBeDefined();
    const saved = await loadSaved(store);
    const cost = academyUpgradeCost(save.bank, save.clubId, level + 1);
    expect(saved.finances.clubs[save.clubId]?.cash).toBe(500_000_000 - cost);
  });

  it("sem caixa, Melhorar fica desabilitado e diz quanto falta", async () => {
    const { store } = await storedCareer(1, withCash(0));
    renderApp("/jogo/elenco?c=tela&aba=base", store);
    const button = await screen.findByRole("button", { name: t("academy.panel.upgrade") });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    const hint = document.getElementById(button.getAttribute("aria-describedby") ?? "");
    expect(hint?.textContent).toMatch(/Faltam/);
  });

  it("baixar e cancelar a redução", async () => {
    const { store, save } = await storedCareer(1);
    const level = academyClub(save.renewal, save.bank, save.clubId).level;
    if (level <= 1) return;
    renderApp("/jogo/elenco?c=tela&aba=base", store);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: t("academy.panel.downgrade") }));
    const dialog = await screen.findByRole("dialog", {
      name: t("academy.panel.downgradeTitle", { level: level - 1 }),
    });
    expect(dialog.textContent).toContain("Nenhum dinheiro investido volta");
    await user.click(within(dialog).getByRole("button", { name: t("academy.panel.downgrade") }));
    await user.click(
      await screen.findByRole("button", { name: t("academy.panel.cancelDowngrade") }),
    );
    expect(await screen.findByText(t("academy.panel.done.cancel"))).toBeDefined();
  });
});
