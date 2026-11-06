import { expect, test } from "@playwright/test";
import { createCareer, expectNoHorizontalScroll, resumeWhenPaused, t } from "./helpers";

// Fim da rodada no celular: o resumo da partida (estatísticas em duas colunas) e a lista de
// resultados cabem na tela, sem rolagem horizontal da página. As tabelas de jogadas rolam por dentro.
for (const width of [390, 360]) {
  test(`fim da rodada sem rolagem horizontal em ${width} px`, async ({ page }) => {
    test.setTimeout(120_000);
    await createCareer(page, "Ana Souza", 1);
    await page.setViewportSize({ width, height: 800 });
    await page.getByRole("button", { name: t("home.playLive") }).click();
    await expect(page.getByRole("region", { name: t("round.myMatch") })).toBeVisible();
    await resumeWhenPaused(page);
    await page.getByRole("button", { name: t("round.finishNow") }).click();
    await expect(page.getByRole("article", { name: /^Resumo:/ })).toBeVisible();
    await expect(
      page.getByRole("region", { name: t("home.lastRound", { round: 1 }) }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page, `fim da rodada @${width}`);
  });
}
