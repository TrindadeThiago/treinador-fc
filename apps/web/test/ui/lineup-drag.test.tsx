// Escalação: arrastar e soltar entre o campo, o banco e os de fora, com o clique continuando igual.
import type { SaveFile } from "@brasfoot-like/save";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { benchRegion, nameOf, outside, outsideOf, pitch, playerButton } from "../helpers/lineup";

async function loadStored(
  store: Awaited<ReturnType<typeof storedCareer>>["store"],
): Promise<SaveFile> {
  const result = await store.load("tela");
  if (result.status !== "ok") throw new Error(result.status);
  return result.save;
}

/** Arrasta `from` até `to`: o ambiente de teste não tem layout, então o alvo sob o ponteiro é dado. */
function dragTo(from: HTMLElement, to: HTMLElement, pointerType = "mouse") {
  const spy = vi.spyOn(document, "elementFromPoint").mockReturnValue(to);
  const point = { pointerId: 7, pointerType, button: 0 };
  fireEvent.pointerDown(from, { ...point, clientX: 10, clientY: 10 });
  fireEvent.pointerMove(window, { ...point, clientX: 40, clientY: 60 });
  fireEvent.pointerMove(window, { ...point, clientX: 80, clientY: 120 });
  fireEvent.pointerUp(window, { ...point, clientX: 80, clientY: 120 });
  fireEvent.click(from);
  spy.mockRestore();
}

afterEach(() => vi.restoreAllMocks());

describe("arrastar na escalação", () => {
  it("soltar um titular sobre um de fora troca os dois, como o clique", async () => {
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/escalacao?c=tela", store);
    await screen.findByRole("region", { name: t("lineup.pitch") });
    const outId = Object.values(save.lineup.starters)[5] as string;
    const inId = outsideOf(save)[0] as string;
    dragTo(playerButton(pitch(), nameOf(save, outId)), playerButton(outside(), nameOf(save, inId)));
    await waitFor(async () => {
      const stored = await loadStored(store);
      expect(Object.values(stored.lineup.starters)).toContain(inId);
      expect(Object.values(stored.lineup.starters)).not.toContain(outId);
    });
    expect(
      screen.getByText(t("lineup.swappedPair", { a: nameOf(save, outId), b: nameOf(save, inId) })),
    ).toBeDefined();
    // O soltar não vira seleção: nada fica marcado esperando o destino.
    for (const button of within(pitch()).getAllByRole("button")) {
      expect(button.getAttribute("aria-pressed")).toBe("false");
    }
  });

  it("dois titulares trocam de vaga no campo, também pelo toque", async () => {
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/escalacao?c=tela", store);
    await screen.findByRole("region", { name: t("lineup.pitch") });
    const entries = Object.entries(save.lineup.starters);
    const [slotA, a] = entries[1] as [string, string];
    const [slotB, b] = entries[9] as [string, string];
    dragTo(playerButton(pitch(), nameOf(save, a)), playerButton(pitch(), nameOf(save, b)), "touch");
    await waitFor(async () => {
      const stored = await loadStored(store);
      expect(stored.lineup.starters[slotA]).toBe(b);
      expect(stored.lineup.starters[slotB]).toBe(a);
    });
  });

  it("no toque, a linha da lista só arrasta pela alça (o resto rola a página)", async () => {
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/escalacao?c=tela", store);
    await screen.findByRole("region", { name: t("lineup.pitch") });
    const reserve = save.lineup.bench[0] as string;
    const starter = Object.values(save.lineup.starters)[3] as string;
    const row = playerButton(benchRegion(), nameOf(save, reserve));
    dragTo(row, playerButton(pitch(), nameOf(save, starter)), "touch");
    // Sem a alça o toque não arrasta: o clique final só seleciona o reserva.
    expect(row.getAttribute("aria-pressed")).toBe("true");
    const stored = await loadStored(store);
    expect(stored.lineup.bench).toContain(reserve);

    fireEvent.keyDown(window, { key: "Escape" });
    const handle = row.querySelector("[data-drag-handle]") as HTMLElement;
    dragTo(handle, playerButton(pitch(), nameOf(save, starter)), "touch");
    await waitFor(async () => {
      const after = await loadStored(store);
      expect(Object.values(after.lineup.starters)).toContain(reserve);
      expect(after.lineup.bench).toContain(starter);
    });
  });

  it("sem mover o ponteiro é um clique: seleciona e depois troca", async () => {
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/escalacao?c=tela", store);
    const user = userEvent.setup();
    await screen.findByRole("region", { name: t("lineup.pitch") });
    const starter = Object.values(save.lineup.starters)[4] as string;
    const button = playerButton(pitch(), nameOf(save, starter));
    await user.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(t("lineup.selected", { name: nameOf(save, starter) }))).toBeDefined();
  });
});
