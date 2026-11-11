import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createCareer, t } from "./helpers";

// 042: empresários pelo caminho do jogador. Renovar um jogador do elenco com a comissão do empresário,
// ver "Comissões" em Finanças e o empresário na aba Empresários, sem violações graves de a11y.

async function noSeriousViolations(page: import("@playwright/test").Page, include?: string) {
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]);
  if (include) builder = builder.include(include);
  const results = await builder.analyze();
  expect(
    results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);
}

test("renovar com a comissão do empresário e acompanhar na aba Empresários (042)", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await createCareer(page, "Ana Souza", 1, undefined, { noFiring: true });
  await page.keyboard.press("2");
  await expect(page).toHaveURL(/elenco/);
  await page
    .getByRole("button", { name: /^Detalhes de / })
    .first()
    .click();
  const modal = page.getByRole("dialog");
  const name = (await modal.getByRole("heading", { level: 2 }).textContent()) ?? "";
  await expect(modal.getByText(t("player.agent"))).toBeVisible();
  await modal.getByRole("button", { name: /^Renovar/ }).click();
  const renew = page.getByRole("dialog", { name: t("market.dialog.renew", { name }) });
  await renew.getByRole("button", { name: t("market.action.start") }).click();
  const commission = renew.getByLabel(t("market.commission.label"));
  await expect(commission).toBeVisible();
  await expect(renew.getByText(/^Empresário: /)).toBeVisible();
  await noSeriousViolations(page, "[role=dialog]");
  await renew.getByLabel(t("market.form.wage")).fill("9000000");
  await renew.getByRole("button", { name: t("market.action.propose") }).click();
  await expect(renew.getByText(t("market.feedback.signed"))).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  await page.keyboard.press("6");
  await expect(page).toHaveURL(/financas/);
  await page.getByRole("tab", { name: t("finance.tab.flow") }).click();
  await expect(page.getByText(t("finance.category.commission")).first()).toBeVisible();

  await page.keyboard.press("m");
  await page.getByRole("tab", { name: t("market.tab.agents") }).click();
  const table = page.getByRole("table", { name: t("agents.caption") });
  await expect(table.getByRole("row")).toHaveCount(2);
  await noSeriousViolations(page);
});
