import { expect, type Locator, type Page, test } from "@playwright/test";
import { createCareer, simulateSeason, t } from "./helpers";

// 036: elenco de base pelo caminho do jogador. Estado vazio na primeira temporada; depois da virada,
// a safra aparece na aba Base (e não no Profissional), dá para promover só com o teclado (no
// máximo três ações, SC-008) e dispensar (o jovem vira livre).

/** Foca o controle e o aciona com Enter. */
async function press(page: Page, control: Locator): Promise<void> {
  await control.focus();
  await expect(control).toBeFocused();
  await page.keyboard.press("Enter");
}

test("base: estado vazio, safra na virada, promover pelo teclado e dispensar (036)", async ({
  page,
}) => {
  test.setTimeout(300_000);
  await createCareer(page, "Ana Souza", 1, undefined, { noFiring: true });

  // Primeira temporada: a base já tem 10 jovens e o painel da academia (037).
  await page.keyboard.press("2");
  await page.getByRole("tab", { name: t("squad.tab.academy") }).click();
  const panel = page.getByRole("region", { name: t("academy.panel.title") });
  await expect(panel).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Promover .* ao elenco profissional$/ }),
  ).toHaveCount(10);

  // Melhorar a academia pelo teclado (SC-007): foco, Enter, Enter no diálogo.
  const upgrade = panel.getByRole("button", { name: t("academy.panel.upgrade") });
  if (await upgrade.isEnabled()) {
    await press(page, upgrade);
    const dialog = page.getByRole("dialog", { name: /^Melhorar a academia para o nível/ });
    await expect(dialog).toContainText("pago agora");
    await press(page, dialog.getByRole("button", { name: t("academy.panel.upgrade") }));
    await expect(page.getByText(t("academy.panel.done.upgrade"))).toBeVisible();
    // A obra aparece nas Finanças como "Academia".
    await page.keyboard.press("6");
    await expect(page.getByText(t("finance.category.academy")).first()).toBeVisible();
    await page.keyboard.press("2");
    await page.getByRole("tab", { name: t("squad.tab.academy") }).click();
  }

  // Virada: a safra chega à base.
  await simulateSeason(page);
  await expect(page).toHaveURL(/fim-de-temporada/);
  await page
    .getByRole("button", { name: t("seasonEnd.next") })
    .first()
    .click();
  await expect(page.getByText(/rodada 1 de/)).toBeVisible();
  await page.keyboard.press("2");
  await page.getByRole("tab", { name: t("squad.tab.academy") }).click();
  const promotes = page.getByRole("button", { name: /^Promover .* ao elenco profissional$/ });
  await expect(promotes.first()).toBeVisible();
  const before = await promotes.count();
  expect(before).toBeGreaterThan(0);
  const name = ((await promotes.first().getAttribute("aria-label")) ?? "")
    .replace(/^Promover /, "")
    .replace(/ ao elenco profissional$/, "");

  // Os jovens da base não aparecem no elenco profissional.
  await page.getByRole("tab", { name: t("squad.tab.professional") }).click();
  await expect(page.getByRole("button", { name: t("lineup.detailsOf", { name }) })).toHaveCount(0);

  // Promover com o teclado: foco no botão do jovem, Enter, Enter no diálogo.
  await page.getByRole("tab", { name: t("squad.tab.academy") }).click();
  await press(page, page.getByRole("button", { name: t("academy.promoteAria", { name }) }));
  const dialog = page.getByRole("dialog", { name: t("academy.promoteTitle", { name }) });
  await expect(dialog).toContainText("por mês até");
  await press(page, dialog.getByRole("button", { name: t("academy.promote") }));
  await expect(page.getByText(t("academy.promoted", { name }))).toBeVisible();

  // Agora ele está no elenco profissional.
  await page.getByRole("tab", { name: t("squad.tab.professional") }).click();
  await expect(page.getByRole("button", { name: t("lineup.detailsOf", { name }) })).toBeVisible();

  // Dispensar outro jovem, se houver: ele vira livre.
  await page.getByRole("tab", { name: t("squad.tab.academy") }).click();
  const releases = page.getByRole("button", { name: /^Dispensar .* da base$/ });
  if ((await releases.count()) > 0) {
    const other = ((await releases.first().getAttribute("aria-label")) ?? "")
      .replace(/^Dispensar /, "")
      .replace(/ da base$/, "");
    await releases.first().click();
    const release = page.getByRole("dialog", { name: t("academy.releaseTitle", { name: other }) });
    await expect(release).toContainText(t("academy.releaseBody"));
    await release.getByRole("button", { name: t("academy.release") }).click();
    await expect(page.getByText(t("academy.released", { name: other }))).toBeVisible();
  }
});

// 038: faixa de potencial na aba Base (ordenar e filtrar pelo teclado, SC-009), a faixa da promoção
// no detalhe do jogador e o bloco Base no fim de temporada.
test("base: faixa de potencial, promoção com a faixa e bloco Base no fim de temporada (038)", async ({
  page,
}) => {
  test.setTimeout(300_000);
  await createCareer(page, "Ana Souza", 1, undefined, { noFiring: true });
  await page.keyboard.press("2");
  await page.getByRole("tab", { name: t("squad.tab.academy") }).click();

  // Cada jovem tem a faixa por extenso para o leitor de tela.
  await expect(page.getByText(/^potencial estimado entre \d+ e \d+$/)).toHaveCount(10);
  await expect(page.getByText(t("academy.estimate.help"))).toBeVisible();

  // Filtrar e ordenar em duas ações, só com o teclado (SC-009): a posição do primeiro jovem.
  const position = (
    (await page.locator("tbody tr").first().locator("td").first().textContent()) ?? ""
  ).trim();
  const filter = page.getByRole("combobox", { name: t("academy.filter.position") });
  await filter.focus();
  await filter.selectOption({ label: position });
  const sort = page.getByRole("button", { name: t("col.estimate") });
  await press(page, sort);
  await expect(page.locator("th", { has: sort })).toHaveAttribute("aria-sort", "ascending");
  for (const cell of await page.locator("tbody tr td:first-child").allTextContents()) {
    expect(cell.trim()).toBe(position);
  }
  await filter.selectOption("");

  // Promover leva a faixa para o detalhe do jogador.
  const promotes = page.getByRole("button", { name: /^Promover .* ao elenco profissional$/ });
  const name = ((await promotes.first().getAttribute("aria-label")) ?? "")
    .replace(/^Promover /, "")
    .replace(/ ao elenco profissional$/, "");
  await press(page, promotes.first());
  const dialog = page.getByRole("dialog", { name: t("academy.promoteTitle", { name }) });
  await press(page, dialog.getByRole("button", { name: t("academy.promote") }));
  await expect(page.getByText(t("academy.promoted", { name }))).toBeVisible();
  await page.getByRole("tab", { name: t("squad.tab.professional") }).click();
  await page.getByRole("button", { name: t("lineup.detailsOf", { name }) }).click();
  await expect(page.getByText(t("player.estimatePromotion"))).toBeVisible();
  await page.keyboard.press("Escape");

  // Fim de temporada: o bloco Base com quem foi promovido.
  await simulateSeason(page);
  await expect(page).toHaveURL(/fim-de-temporada/);
  const block = page.getByRole("region", { name: t("seasonEnd.academy"), exact: true });
  await expect(block).toBeVisible();
  await expect(block).toContainText(name);
});
