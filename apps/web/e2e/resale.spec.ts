import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createCareer, t } from "./helpers";

// 041: cláusula de revenda pelo caminho do jogador. Vender um jogador com 20% de revenda pela venda
// imediata, ver a cláusula no detalhe dele e em Finanças → Revendas, sem violações graves de a11y.

test("vender com cláusula de revenda e acompanhar em Finanças (041)", async ({ page }) => {
  test.setTimeout(240_000);
  await createCareer(page, "Ana Souza", 1, undefined, { noFiring: true });
  await page.keyboard.press("2");
  await expect(page).toHaveURL(/elenco/);
  // Vender o primeiro jogador que pode sair sem quebrar o mínimo do elenco ou da posição.
  const all = page.getByRole("button", { name: /^Detalhes de / });
  let name = "";
  let dialog = page.getByRole("dialog", { name: "—" });
  for (let index = 0; index < (await all.count()); index++) {
    const details = all.nth(index);
    name = ((await details.getAttribute("aria-label")) ?? "").replace(/^Detalhes de /, "");
    await details.click();
    const modal = page.getByRole("dialog", { name });
    await modal.getByRole("button", { name: t("squad.sellOf", { name }) }).click();
    dialog = page.getByRole("dialog", { name: t("disposal.sell.title", { name }) });
    await expect(dialog).toBeVisible();
    if ((await dialog.getByRole("combobox", { name: t("market.resale.label") }).count()) > 0) {
      break;
    }
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
  }
  await dialog.getByRole("combobox", { name: t("market.resale.label") }).selectOption("20");
  await expect(dialog.getByText(/fica com 20% da próxima venda/)).toBeVisible();
  const axe = await new AxeBuilder({ page })
    .include("[role=dialog]")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual(
    [],
  );
  await dialog.getByRole("button", { name: t("disposal.sell.confirm") }).click();
  await expect(page.getByText(/com 20% de revenda para o seu clube/)).toBeVisible();

  await page.keyboard.press("6");
  await expect(page).toHaveURL(/financas/);
  await page.getByRole("tab", { name: t("finance.tab.resale") }).click();
  const receivable = page.getByRole("table", { name: t("finance.resale.receivable") });
  await expect(receivable).toContainText(name);
  await expect(receivable).toContainText("20%");
  const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(scan.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual(
    [],
  );
});
