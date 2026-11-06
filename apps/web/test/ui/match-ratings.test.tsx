// 034 US1 (T009): notas e melhor em campo no resumo da partida.
import { type MatchRecord, matchRatings } from "@brasfoot-like/engine";
import { userSeason } from "@brasfoot-like/save";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { formatRating, t } from "../../src/i18n";
import { MatchSummary } from "../../src/ui/MatchSummary";
import { storedCareer } from "../helpers/career";

/** Texto da coluna Nota da linha de um jogador (a última célula). */
function ratingCell(table: HTMLElement, name: string): string {
  const header = within(table).getByRole("rowheader", { name });
  const cells = (header.closest("tr") as HTMLElement).querySelectorAll("td");
  return cells[cells.length - 1]?.textContent ?? "";
}

describe("notas no resumo da partida (034)", () => {
  it("cada jogador tem a nota de matchRatings, e o melhor em campo aparece com nome, time e nota", async () => {
    const { save } = await storedCareer(3);
    const record = userSeason(save).records[0] as MatchRecord;
    const bank = new Map(save.bank.players.map((player) => [player.id, player]));
    const ratings = matchRatings(record, bank);
    render(<MatchSummary record={record} save={save} />);
    const section = screen.getByRole("region", { name: t("summary.plays") });
    const tables = within(section).getAllByRole("table");
    for (const [playerId, rated] of Object.entries(ratings.players)) {
      const line = record.players[playerId];
      if (!line || line.minutes === 0) continue;
      const name = bank.get(playerId)?.displayName ?? "";
      const table = tables[line.side === "home" ? 0 : 1] as HTMLElement;
      const expected = rated.rating === undefined ? t("rating.none") : formatRating(rated.rating);
      expect(ratingCell(table, name)).toBe(expected);
    }
    const best = ratings.best;
    if (!best) throw new Error("sem melhor em campo");
    const club = save.bank.clubs.find((entry) => entry.id === record[best.side]);
    expect(
      within(section).getByText(
        new RegExp(
          t("rating.best", {
            player: bank.get(best.playerId)?.displayName ?? "",
            club: club?.shortName ?? "",
          }).replace(/[()]/g, "\\$&"),
        ),
      ).textContent,
    ).toContain(formatRating(best.rating));
  });

  it("sem jogadas: tabela simplificada (Jogador, Minutos, Nota) e o aviso", async () => {
    const { save } = await storedCareer(3);
    const original = userSeason(save).records[0] as MatchRecord;
    const players = Object.fromEntries(
      Object.entries(original.players).map(([id, line]) => {
        const { plays: _plays, ...rest } = line;
        return [id, rest];
      }),
    );
    const record = { ...original, players };
    render(<MatchSummary record={record} save={save} />);
    const section = screen.getByRole("region", { name: t("summary.plays") });
    expect(within(section).getByText(t("rating.simplified"))).toBeDefined();
    const tables = within(section).getAllByRole("table");
    expect(tables).toHaveLength(2);
    const headers = within(tables[0] as HTMLElement)
      .getAllByRole("columnheader")
      .map((cell) => cell.textContent);
    expect(headers).toEqual([t("summary.plays.player"), t("rating.minutes"), t("rating.column")]);
    const ratings = matchRatings(record, new Map(save.bank.players.map((p) => [p.id, p])));
    expect(Object.values(ratings.players).every((entry) => entry.kind === "simplified")).toBe(true);
  });
});
