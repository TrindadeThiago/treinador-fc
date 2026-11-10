import {
  type AcademyPlayer,
  emptyAcademy,
  type Position,
  type PotentialEstimate,
} from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { academyRows, estimateSortValue } from "../../src/game/academy-view";
import { label, t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";

// 038 US1: coluna da faixa de potencial na aba Base, com ordenação e filtro por posição.

const GK: Position = "GK";
const FW: Position = "FW";

function youth(
  save: SaveFile,
  offset: number,
  estimate: PotentialEstimate,
  position = FW,
): AcademyPlayer {
  const template = save.bank.players.find((player) => player.clubId === save.clubId);
  if (!template) throw new Error("sem jogador");
  const { clubId: _c, contract: _k, ...player } = template;
  const start = save.bank.manifest.referenceDate;
  return {
    player: {
      ...player,
      id: `jogador-${String(save.renewal.nextPlayerSeq + offset).padStart(5, "0")}`,
      displayName: `Jovem ${offset}`,
      position,
      birthDate: `${Number(start.slice(0, 4)) - 17}${start.slice(4)}`,
      strength: 40,
      hidden: { ...player.hidden, potential: estimate.low + 1 },
    },
    clubId: save.clubId,
    joinedSeason: 1,
    estimate,
  };
}

const BANDS: [PotentialEstimate, Position][] = [
  [{ low: 60, high: 76 }, FW],
  [{ low: 50, high: 70 }, GK],
  [{ low: 62, high: 74 }, FW],
];

function withBands(save: SaveFile): SaveFile {
  return {
    ...save,
    renewal: {
      ...save.renewal,
      nextPlayerSeq: save.renewal.nextPlayerSeq + 100,
      academy: {
        ...emptyAcademy(),
        players: BANDS.map(([band, position], index) => youth(save, index + 1, band, position)),
      },
    },
  };
}

async function table(save: SaveFile) {
  return screen.findByRole("table", {
    name: t("academy.caption", {
      club: save.bank.clubs.find((club) => club.id === save.clubId)?.name ?? "",
    }),
  });
}

const bodyRows = (element: HTMLElement) =>
  within(within(element).getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole("row");

describe("faixa de potencial na aba Base (038)", () => {
  it("cada jovem mostra a faixa, com a frase por extenso para o leitor de tela", async () => {
    const { store, save } = await storedCareer(1, withBands);
    renderApp("/jogo/elenco?c=tela&aba=base", store);
    const element = await table(save);
    for (const [band] of BANDS) {
      expect(within(element).getByText(t("academy.estimate.range", { ...band }))).toBeDefined();
      expect(within(element).getByText(t("academy.estimate.aria", { ...band }))).toBeDefined();
    }
    expect(screen.getByText(t("academy.estimate.help"))).toBeDefined();
  });

  it("a faixa da tela é a guardada no save, sem o potencial real", async () => {
    const { save } = await storedCareer(1, withBands);
    const rows = academyRows(save);
    expect(rows.map((row) => row.estimate)).toEqual(BANDS.map(([band]) => band));
    // A mesma faixa depois de reabrir o save (JSON ida e volta).
    const reopened = JSON.parse(JSON.stringify(save)) as SaveFile;
    expect(academyRows(reopened).map((row) => row.estimate)).toEqual(
      rows.map((row) => row.estimate),
    );
  });

  it("ordena pelo centro e, no empate, pelo limite superior, nos dois sentidos", async () => {
    expect(estimateSortValue({ low: 60, high: 76 })).toBeGreaterThan(
      estimateSortValue({ low: 62, high: 74 }) ?? 0,
    );
    const { store, save } = await storedCareer(1, withBands);
    renderApp("/jogo/elenco?c=tela&aba=base", store);
    const user = userEvent.setup();
    const element = await table(save);
    const sort = within(element).getByRole("button", { name: t("col.estimate") });
    await user.click(sort);
    const header = sort.closest("th");
    expect(header?.getAttribute("aria-sort")).toBe("ascending");
    const names = () => bodyRows(element).map((row) => row.textContent ?? "");
    // Centros: 68 (60–76), 60 (50–70), 68 (62–74): 50–70, 62–74, 60–76.
    expect(names()[0]).toContain("Jovem 2");
    expect(names()[1]).toContain("Jovem 3");
    expect(names()[2]).toContain("Jovem 1");
    await user.click(sort);
    expect(header?.getAttribute("aria-sort")).toBe("descending");
    expect(names()[0]).toContain("Jovem 1");
  });

  it("filtra por posição mantendo a ordenação", async () => {
    const { store, save } = await storedCareer(1, withBands);
    renderApp("/jogo/elenco?c=tela&aba=base", store);
    const user = userEvent.setup();
    const element = await table(save);
    await user.click(within(element).getByRole("button", { name: t("col.estimate") }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: t("academy.filter.position") }),
      FW,
    );
    const rows = bodyRows(await table(save));
    expect(rows).toHaveLength(2);
    expect(rows[0]?.textContent).toContain("Jovem 3");
    expect(rows[1]?.textContent).toContain("Jovem 1");
    for (const row of rows) expect(row.textContent).toContain(label(`position.${FW}`));
  });

  it("depois de trocar de clube, a aba mostra só a base do clube novo, com as faixas dela", async () => {
    const { store, save } = await storedCareer(1, (current) => {
      const other = current.bank.clubs.find((club) => club.id !== current.clubId);
      if (!other) throw new Error("sem outro clube");
      const own = withBands(current);
      const moved = (own.renewal.academy?.players ?? []).map((entry, index) =>
        index === 0 ? { ...entry, clubId: other.id } : entry,
      );
      return {
        ...own,
        renewal: {
          ...own.renewal,
          academy: { ...emptyAcademy(), players: moved },
        },
      };
    });
    renderApp("/jogo/elenco?c=tela&aba=base", store);
    const element = await table(save);
    expect(bodyRows(element)).toHaveLength(2);
    expect(within(element).queryByText("Jovem 1")).toBeNull();
    expect(
      within(element).queryByText(t("academy.estimate.range", { ...BANDS[0]?.[0] })),
    ).toBeNull();
  });
});
