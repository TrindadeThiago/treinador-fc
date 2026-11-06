import type { SaveFile } from "@brasfoot-like/save";
import { act, fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";
import { t } from "../../src/i18n";
import type { SaveStore } from "../../src/storage/indexeddb";

/** Relógio falso só para o laço da rodada (o IndexedDB falso continua com o relógio real). */
export function useRoundClock(): void {
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "performance"],
    shouldAdvanceTime: true,
  });
}

export async function elapse(ms: number): Promise<void> {
  await act(() => vi.advanceTimersByTimeAsync(ms));
}

/**
 * Avança o relógio da rodada em passos curtos, retomando quando ela para no intervalo do meu jogo
 * (a pausa do intervalo espera o técnico): para os testes que deixam a rodada correr até o fim.
 */
export async function elapseResuming(ms: number, step = 250): Promise<void> {
  for (let passed = 0; passed < ms; passed += step) {
    await elapse(Math.min(step, ms - passed));
    const resume = screen.queryByRole("button", { name: t("round.resume") });
    if (resume && screen.queryAllByText(t("round.halfTime")).length > 0) {
      await act(async () => {
        fireEvent.click(resume);
      });
    }
  }
}

export async function loadSaved(store: SaveStore, id = "tela"): Promise<SaveFile> {
  const result = await store.load(id);
  if (result.status !== "ok") throw new Error(result.status);
  return result.save;
}
