// 038 US4: bloco Base no fim de temporada (quem chegou, subiu e saiu).
import type { PlayerRef } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";
import { finishedSeason } from "../helpers/season-end";

vi.setConfig({ testTimeout: 60000 });

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo/fim-de-temporada?c=tela");
});

async function open(edit: (save: SaveFile) => SaveFile) {
  const career = await storedCareer(1, (save) => edit(finishedSeason(save)));
  renderApp("/jogo/fim-de-temporada?c=tela", career.store);
  return screen.findByRole("region", { name: t("seasonEnd.academy") });
}

const ref = (id: string, name: string): PlayerRef => ({
  playerId: id,
  displayName: name,
  position: "FW",
  age: 18,
  strength: 50,
});

describe("bloco Base do fim de temporada (038)", () => {
  it("três listas com totais; a vazia mostra Nenhum; quem chegou leva a faixa", async () => {
    const block = await open((save) => {
      const academy = save.renewal.academy;
      if (!academy) throw new Error("sem base");
      const first = academy.players.find((entry) => entry.clubId === save.clubId);
      if (!first) throw new Error("base vazia");
      return {
        ...save,
        renewal: {
          ...save.renewal,
          academy: {
            ...academy,
            players: academy.players.map((entry) =>
              entry === first
                ? { ...entry, joinedSeason: save.league.number, estimate: { low: 61, high: 77 } }
                : { ...entry, joinedSeason: Math.min(entry.joinedSeason, save.league.number - 1) },
            ),
            promotedThisSeason: [],
            releasedThisSeason: [ref("jogador-99999", "Dispensado Teste")],
          },
        },
      };
    });
    const arrived = within(block).getByRole("region", {
      name: t("seasonEnd.academy.arrived", { count: 1 }),
    });
    expect(
      within(arrived).getByText(t("academy.estimate.aria", { low: 61, high: 77 })),
    ).toBeDefined();
    const promoted = within(block).getByRole("region", {
      name: t("seasonEnd.academy.promoted", { count: 0 }),
    });
    expect(within(promoted).getByText(t("seasonEnd.academy.none"))).toBeDefined();
    const left = within(block).getByRole("region", { name: /^Saíram da base/ });
    expect(left.textContent).toContain("Dispensado Teste");
    expect(left.textContent).toContain(t("seasonEnd.academy.reason.released"));
  });
});
