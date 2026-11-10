import { expect, type Locator, type Page, test } from "@playwright/test";
import { createCareer, simulate, t } from "./helpers";

// 039: olheiros pelo caminho do jogador. Abrir o departamento pelo teclado, observar a partir da
// busca, jogar rodadas e ver a faixa no relatório e "Olheiros" em Finanças; filtrar os observados.

async function press(page: Page, control: Locator): Promise<void> {
  await control.focus();
  await expect(control).toBeFocused();
  await page.keyboard.press("Enter");
}

test("olheiros: abrir pelo teclado, observar, relatório nas rodadas e custo nas finanças (039)", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await createCareer(page, "Ana Souza", 1, undefined, { noFiring: true });
  await page.keyboard.press("m");
  await expect(page).toHaveURL(/mercado/);
  await page.getByRole("tab", { name: t("market.tab.scouting") }).click();
  const panel = page.getByRole("region", { name: t("scouting.title") });
  await expect(panel).toContainText(t("scouting.closed"));

  // Abrir no nível 3 pelo teclado: foco, Enter, escolher o nível, Enter em Confirmar.
  await press(page, panel.getByRole("button", { name: t("scouting.open") }));
  const dialog = page.getByRole("dialog", { name: t("scouting.dialog.title") });
  await dialog.getByRole("combobox").selectOption("3");
  await press(page, dialog.getByRole("button", { name: t("scouting.confirm") }));
  await expect(page.getByText(t("scouting.done.level"))).toBeVisible();
  await expect(panel).toContainText("0 de 8 vagas");

  // Observar o primeiro jogador da busca pelo detalhe.
  await page.getByRole("tab", { name: t("market.tab.search") }).click();
  const first = page.getByRole("button", { name: /^Detalhes de / }).first();
  const name = ((await first.getAttribute("aria-label")) ?? "").replace(/^Detalhes de /, "");
  await first.click();
  const modal = page.getByRole("dialog", { name });
  await modal.getByRole("button", { name: t("scouting.watchAria", { name }) }).click();
  await expect(modal.getByText(t("scouting.done.watch", { name }))).toBeVisible();
  await expect(modal.getByRole("region", { name: t("scouting.report.title") })).toBeVisible();
  await page.keyboard.press("Escape");

  // Jogar rodadas: o relatório avança e o custo aparece em Finanças.
  await page.keyboard.press("1");
  await simulate(page, 3);
  await page.keyboard.press("m");
  await page.getByRole("tab", { name: /^Observação/ }).click();
  await expect(page.getByRole("table", { name: t("scouting.watching.caption") })).toContainText(
    /[1-5] de 5 etapas/,
  );
  await page.keyboard.press("6");
  await expect(page.getByText(t("finance.category.scouting")).first()).toBeVisible();

  // Filtrar os observados no mercado.
  await page.keyboard.press("m");
  await page.getByRole("checkbox", { name: t("market.filter.observedOnly") }).check();
  await expect(page.getByText("1 jogador encontrado")).toBeVisible();
});
