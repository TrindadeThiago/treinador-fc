// Rodada ao vivo: no intervalo do meu jogo a rodada para, e o 2º tempo só começa ao retomar.
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { elapse, useRoundClock } from "../helpers/live";
import { memoryRouter } from "../helpers/router";

beforeEach(() => {
  localStorage.clear();
  // Sem a pausa por lesão ou expulsão: a do intervalo vale do mesmo jeito.
  localStorage.setItem(
    "brasfoot-like:preferences",
    JSON.stringify({ autoPause: false, roundMode: "live" }),
  );
  useRoundClock();
});
afterEach(() => vi.useRealTimers());

describe("pausa no intervalo", () => {
  it("para no intervalo, fica parada e só começa o 2º tempo ao retomar", async () => {
    const career = await storedCareer(1);
    renderApp("/jogo?c=tela", career.store);
    const user = userEvent.setup({ delay: null });
    await user.click(await screen.findByRole("button", { name: t("home.playLive") }));
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo/rodada"));
    const mine = await screen.findByRole("region", { name: t("round.myMatch") });
    await user.selectOptions(screen.getByLabelText(t("round.speed")), "fast");

    // Na velocidade rápida o intervalo chega antes dos 20 s.
    await elapse(20_000);
    expect(within(mine).getAllByText(t("round.halfTime")).length).toBeGreaterThan(0);
    expect(screen.getByText(t("round.state.paused"))).toBeDefined();

    // Parada: o tempo passa e o jogo continua no intervalo.
    await elapse(10_000);
    expect(within(mine).getAllByText(t("round.halfTime")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: t("round.resume") }));
    await elapse(3_000);
    expect(within(mine).queryAllByText(t("round.halfTime"))).toHaveLength(0);
    expect(within(mine).getByText(/^(4[6-9]|5\d)'$/)).toBeDefined();
  });
});
