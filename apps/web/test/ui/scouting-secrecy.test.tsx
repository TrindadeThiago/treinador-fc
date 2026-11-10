// 039 US7 (FR-019, SC-005): o potencial, o temperamento e a propensão a lesões reais não aparecem em
// nenhuma tela dos olheiros. Cada tela é desenhada duas vezes, com valores reais diferentes e os
// mesmos relatórios; o texto tem de ser idêntico.
import type { ScoutingState } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlayerDetails } from "../../src/ui/PlayerDetails";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 60000 });

beforeEach(() => {
  localStorage.clear();
});
afterEach(cleanup);

function withHidden(potential: number, temperament: number, injury: number) {
  return (save: SaveFile): SaveFile => {
    const others = save.bank.players.filter((player) => player.clubId !== save.clubId);
    const own = save.bank.players.find((player) => player.clubId === save.clubId);
    const [a, b] = others;
    if (!a || !b || !own) throw new Error("mundo pequeno");
    const band = { low: 41, high: 98 };
    const scouting: ScoutingState = {
      clubId: save.clubId,
      level: 3,
      watch: [{ playerId: a.id, since: { season: 1, round: 0 } }],
      reports: {
        [a.id]: {
          estimate: band,
          steps: 4,
          temperament: 2,
          injury: 2,
          updated: { season: 1, round: 4 },
        },
        [b.id]: { estimate: band, steps: 1, updated: { season: 1, round: 1 } },
        [own.id]: { estimate: band, steps: 2, updated: { season: 1, round: 2 } },
      },
    };
    return {
      ...save,
      bank: {
        ...save.bank,
        players: save.bank.players.map((player) => ({
          ...player,
          strength: Math.min(player.strength, 40),
          hidden: { ...player.hidden, potential, temperament, injuryProneness: injury },
        })),
      },
      scouting,
    } as SaveFile;
  };
}

/**
 * O valor de mercado dos jovens já dependia do potencial antes da 039 (é o preço que a IA paga, não
 * o relatório): fica de fora da comparação, que cobre o que os olheiros mostram.
 */
const sansMoney = (text: string) => text.replace(/\$\s?[\d.,]+/g, "$");

async function texts(potential: number, temperament: number, injury: number): Promise<string[]> {
  const out: string[] = [];
  for (const path of ["/jogo/mercado?c=tela&aba=scouting", "/jogo/mercado?c=tela"]) {
    memoryRouter.reset(path);
    const { store } = await storedCareer(1, withHidden(potential, temperament, injury));
    renderApp(path, store);
    await screen.findAllByText("41–98");
    out.push(sansMoney(document.body.textContent ?? ""));
    cleanup();
  }
  const { save } = await storedCareer(1, withHidden(potential, temperament, injury));
  for (const playerId of Object.keys(save.scouting.reports)) {
    render(<PlayerDetails save={save} playerId={playerId} onClose={() => {}} />);
    out.push(sansMoney(document.body.textContent ?? ""));
    cleanup();
  }
  return out;
}

describe("sigilo dos olheiros (039)", () => {
  it("as telas não mudam com os valores reais (só com o relatório)", async () => {
    const a = await texts(97, 5, 95);
    const b = await texts(52, 60, 10);
    expect(a.every((text) => text.includes("41–98"))).toBe(true);
    expect(b).toEqual(a);
  });
});
