// 038 US6 (FR-009, SC-007): o potencial real não aparece em nenhuma tela nova. Cada tela é desenhada
// duas vezes, com potenciais reais diferentes e as mesmas faixas; o texto tem de ser idêntico.
import type { SaveFile } from "@brasfoot-like/save";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClubHistory } from "../../src/ui/history/WorldHistory";
import { PlayerDetails } from "../../src/ui/PlayerDetails";
import { AcademySeason } from "../../src/ui/season/AcademySeason";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 60000 });

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo/elenco?c=tela&aba=base");
});
afterEach(cleanup);

/** Troca o potencial real de todos (base e elenco), mantendo as faixas guardadas. */
function withPotential(potential: number) {
  return (save: SaveFile): SaveFile => {
    const academy = save.renewal.academy;
    if (!academy) throw new Error("sem base");
    const [promoted] = save.bank.players.filter((player) => player.clubId === save.clubId);
    if (!promoted) throw new Error("sem elenco");
    return {
      ...save,
      bank: {
        ...save.bank,
        players: save.bank.players.map((player) => ({
          ...player,
          strength: Math.min(player.strength, 40),
          hidden: { ...player.hidden, potential },
        })),
      },
      renewal: {
        ...save.renewal,
        academy: {
          ...academy,
          players: academy.players.map((entry) => ({
            ...entry,
            player: {
              ...entry.player,
              strength: Math.min(entry.player.strength, 40),
              hidden: { ...entry.player.hidden, potential },
            },
            estimate: { low: 41, high: 98 },
          })),
          graduates: {
            ...academy.graduates,
            [promoted.id]: {
              clubId: save.clubId,
              season: 1,
              peak: 40,
              estimate: { low: 41, high: 98 },
            },
          },
          hall: {
            [save.clubId]: {
              promoted: 1,
              best: [
                {
                  playerId: promoted.id,
                  name: promoted.displayName,
                  position: promoted.position,
                  peak: 40,
                  season: 1,
                },
              ],
            },
          },
        },
      },
    } as SaveFile;
  };
}

async function texts(potential: number): Promise<string[]> {
  const { store, save } = await storedCareer(1, withPotential(potential));
  const out: string[] = [];
  renderApp("/jogo/elenco?c=tela&aba=base", store);
  await screen.findAllByText("41–98");
  out.push(document.body.textContent ?? "");
  cleanup();
  const promoted = save.bank.players.find((player) => player.clubId === save.clubId);
  for (const node of [
    <PlayerDetails key="d" save={save} playerId={promoted?.id} onClose={() => {}} />,
    <AcademySeason key="s" save={save} />,
    <ClubHistory key="h" save={save} />,
  ]) {
    render(node);
    out.push(document.body.textContent ?? "");
    cleanup();
  }
  return out;
}

describe("sigilo do potencial (038)", () => {
  it("aba Base, detalhe, bloco Base e histórico não mudam com o potencial real", async () => {
    const a = await texts(97);
    const b = await texts(52);
    expect(a.every((text) => text.length > 0)).toBe(true);
    expect(a[1]).toContain("41–98");
    expect(b).toEqual(a);
  });
});
