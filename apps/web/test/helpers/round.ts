import { screen, waitFor, within } from "@testing-library/react";
import { expect } from "vitest";
import { t } from "../../src/i18n";

/**
 * Espera a rodada aparecer como jogada na Início (035): o resultado dela entre os últimos do cartão
 * da posição. A lista completa da rodada saiu da Início e fica na Competição e na tela da rodada.
 */
export async function roundPlayed(round: number): Promise<HTMLElement> {
  const label = t("home.roundLabel", { round });
  let item: HTMLElement | undefined;
  await waitFor(
    () => {
      const card = screen.getByRole("region", { name: t("home.position") });
      item = within(card)
        .getAllByRole("listitem")
        .find((entry) => entry.textContent?.includes(label));
      expect(item).toBeDefined();
    },
    { timeout: 10000 },
  );
  return item as HTMLElement;
}
