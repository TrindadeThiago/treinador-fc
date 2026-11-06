// 034 US3 (T023): média das notas da temporada no elenco e no detalhe do jogador.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { clubSeasonRatings } from "../../src/game/selectors";
import { formatRating, t } from "../../src/i18n";
import { PlayerStats } from "../../src/ui/PlayerDetails";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";

const headerIndex = (table: HTMLElement, name: string) =>
  within(table)
    .getAllByRole("columnheader")
    .findIndex((cell) => cell.textContent?.includes(name));

describe("média das notas da temporada (034)", () => {
  it("o elenco mostra média (jogos) ou sem nota, e ordenar põe sem nota por último", async () => {
    const { store, save } = await storedCareer(4);
    const ratings = clubSeasonRatings(save, save.clubId);
    expect(ratings.size).toBeGreaterThan(0);
    renderApp("/jogo/elenco?c=tela", store);
    const table = await screen.findByRole("table");
    const column = headerIndex(table, t("col.rating"));
    const body = within(table).getAllByRole("rowgroup")[1] as HTMLElement;
    const cellsOf = () =>
      within(body)
        .getAllByRole("row")
        .map((row) => row.querySelectorAll("td, th")[column]?.textContent ?? "");
    const expected = new Set(
      [...ratings.values()].map((entry) =>
        t("rating.average", { rating: formatRating(entry.average), matches: entry.matches }),
      ),
    );
    for (const value of expected) expect(cellsOf()).toContain(value);
    const user = userEvent.setup();
    for (const _direction of [0, 1]) {
      await user.click(screen.getByRole("button", { name: new RegExp(t("col.rating")) }));
      const values = cellsOf();
      const firstNone = values.indexOf(t("rating.none"));
      if (firstNone >= 0) {
        expect(values.slice(firstNone).every((value) => value === t("rating.none"))).toBe(true);
      }
    }
  });

  it("o detalhe do jogador mostra a mesma média e os jogos com nota", async () => {
    const { save } = await storedCareer(4);
    const [playerId, entry] = [...clubSeasonRatings(save, save.clubId)][0] ?? [];
    if (!playerId || !entry) throw new Error("sem nota");
    render(<PlayerStats save={save} playerId={playerId} />);
    const value = (label: string) =>
      screen.getByText(label).closest("div")?.querySelector("dd")?.textContent;
    expect(value(t("player.ratingAverage"))).toBe(formatRating(entry.average));
    expect(value(t("player.ratedMatches"))).toBe(String(entry.matches));
    expect(screen.queryByText(t("player.simplifiedRatings"))).toBeNull();
  });
});
