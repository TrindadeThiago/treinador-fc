import { expect, type Page, test } from "@playwright/test";
import { createCareer, expectNoHorizontalScroll, simulate, t } from "./helpers";

// 035: a Início cabe numa tela de 1440×900 e empilha os blocos nas telas estreitas.

/** Altura da página sem a faixa de avisos, que só aparece em parte das rodadas (SC-001). */
async function heightWithoutNotices(page: Page): Promise<{ height: number; viewport: number }> {
  return page.evaluate(() => {
    const strip = document.querySelector<HTMLElement>('section[aria-label="Antes do jogo"]');
    const gap = strip
      ? Number.parseFloat(getComputedStyle(strip.parentElement as Element).rowGap)
      : 0;
    const notices = strip
      ? strip.getBoundingClientRect().height + (Number.isNaN(gap) ? 0 : gap)
      : 0;
    const root = document.scrollingElement ?? document.documentElement;
    return { height: root.scrollHeight - notices, viewport: window.innerHeight };
  });
}

test("Início em 1440×900: cabe na tela, com o próximo jogo e a posição lado a lado", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await createCareer(page, "Ana Souza", 3);
  await simulate(page, 3);
  await page.setViewportSize({ width: 1440, height: 900 });
  const next = page.getByRole("region", { name: t("home.nextMatch") });
  const table = page.getByRole("region", { name: t("home.position") });
  await expect(next).toBeVisible();
  const [a, b] = [await next.boundingBox(), await table.boundingBox()];
  expect(Math.abs((a?.y ?? 0) - (b?.y ?? 0))).toBeLessThan(4);
  expect(b?.x ?? 0).toBeGreaterThan((a?.x ?? 0) + (a?.width ?? 0) - 1);
  const { height, viewport } = await heightWithoutNotices(page);
  expect(height, "altura da Início sem avisos").toBeLessThanOrEqual(viewport);
  await expect(page.getByRole("region", { name: t("home.lastRound", { round: 3 }) })).toHaveCount(
    0,
  );
});

for (const width of [1024, 390, 360]) {
  test(`Início sem rolagem horizontal em ${width} px`, async ({ page }) => {
    test.setTimeout(120_000);
    await createCareer(page, "Ana Souza", 3);
    await simulate(page, 2);
    await page.setViewportSize({ width, height: 800 });
    await expect(page.getByRole("region", { name: t("home.nextMatch") })).toBeVisible();
    await expectNoHorizontalScroll(page, `Início @${width}`);
    if (width < 720) {
      // Empilhada, na ordem de leitura: próximo jogo, posição, torcida e diretoria, manchetes.
      const order = [
        t("home.nextMatch"),
        t("home.position"),
        t("home.mood.title"),
        t("news.title"),
      ];
      const tops: number[] = [];
      for (const name of order) {
        tops.push((await page.getByRole("region", { name }).boundingBox())?.y ?? 0);
      }
      expect([...tops].sort((x, y) => x - y)).toEqual(tops);
    }
  });
}
