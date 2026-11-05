// 033 US1 (T011): o resumo da partida mostra as jogadas por jogador e por time.
import { type MatchRecord, type PlayTuple, playStatsOf, playTotals } from "@brasfoot-like/engine";
import { userSeason } from "@brasfoot-like/save";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { formatNumber, t } from "../../src/i18n";
import { MatchSummary } from "../../src/ui/MatchSummary";
import { storedCareer } from "../helpers/career";

const percent = (value: number) =>
  t("summary.plays.percent", { value: formatNumber(Math.round(value * 100)) });

describe("jogadas no resumo da partida (033)", () => {
  it("duas tabelas com uma linha por jogador que entrou, na ordem de entrada, e o total", async () => {
    const { save } = await storedCareer(3);
    const record = userSeason(save).records[0] as MatchRecord;
    const names = new Map(save.bank.players.map((player) => [player.id, player.displayName]));
    render(<MatchSummary record={record} save={save} />);
    const section = screen.getByRole("region", { name: t("summary.plays") });
    const tables = within(section).getAllByRole("table");
    expect(tables).toHaveLength(2);
    (["home", "away"] as const).forEach((side, index) => {
      const table = tables[index] as HTMLElement;
      const club = save.bank.clubs.find((entry) => entry.id === record[side]);
      expect(
        within(table).getByText(t("summary.plays.caption", { club: club?.shortName ?? "" })),
      ).toBeDefined();
      const expected = Object.entries(record.players).filter(
        ([, line]) => line.side === side && line.plays && line.minutes > 0,
      );
      const rows = within(table).getAllByRole("row").slice(1);
      // Uma linha por jogador e a do total.
      expect(rows).toHaveLength(expected.length + 1);
      expected.forEach(([playerId, line], row) => {
        const cells = (rows[row] as HTMLElement).querySelectorAll("th, td");
        expect(cells[0]?.textContent).toBe(names.get(playerId));
        const plays = playStatsOf(line.plays as PlayTuple);
        expect(cells[1]?.textContent).toBe(
          t("summary.plays.ratio", { done: plays.passesCompleted, tried: plays.passes }),
        );
      });
      const totals = playTotals(record.players, side);
      const last = (rows.at(-1) as HTMLElement).querySelectorAll("th, td");
      expect(last[0]?.textContent).toBe(t("summary.plays.total"));
      expect(last[1]?.textContent).toBe(
        t("summary.plays.ratio", {
          done: totals?.passesCompleted ?? 0,
          tried: totals?.passes ?? 0,
        }),
      );
      expect(last[2]?.textContent).toBe(percent(totals?.passAccuracy ?? 0));
      expect(last[5]?.textContent).toBe(String(totals?.interceptions));
    });
  });

  it("uma partida sem jogadas (save antigo ou resumida) diz isso, sem zeros", async () => {
    const { save } = await storedCareer(3);
    const original = userSeason(save).records[0] as MatchRecord;
    const players = Object.fromEntries(
      Object.entries(original.players).map(([id, line]) => {
        const { plays: _plays, ...rest } = line;
        return [id, rest];
      }),
    );
    render(<MatchSummary record={{ ...original, players }} save={save} />);
    const section = screen.getByRole("region", { name: t("summary.plays") });
    expect(within(section).queryAllByRole("table")).toHaveLength(0);
    expect(within(section).getByText(t("summary.plays.none"))).toBeDefined();
  });
});
