// 033 US2 (T021): os totais de jogadas dos dois times nas estatísticas ao vivo.
import { livePlayTotals, type PlayTotals } from "@brasfoot-like/engine";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { formatNumber, t } from "../../src/i18n";
import { LiveStats } from "../../src/ui/LiveStats";
import { advance, liveRoundOf, mineOf, played } from "../helpers/live-round";

/** As duas células (mandante e visitante) de uma linha da tabela, pelo rótulo. */
function row(label: string): string[] {
  const table = screen.getByRole("table", { name: t("summary.stats") });
  const header = within(table).getByRole("rowheader", { name: label });
  return within(header.closest("tr") as HTMLElement)
    .getAllByRole("cell")
    .map((cell) => cell.textContent ?? "");
}

const expected = (totals: PlayTotals | undefined) => ({
  passes: t("summary.plays.ratio", {
    done: totals?.passesCompleted ?? 0,
    tried: totals?.passes ?? 0,
  }),
  accuracy:
    totals?.passAccuracy === undefined
      ? t("summary.plays.noPasses")
      : t("summary.plays.percent", { value: formatNumber(Math.round(totals.passAccuracy * 100)) }),
  tackles: String(totals?.tacklesWon ?? 0),
  interceptions: String(totals?.interceptions ?? 0),
});

describe("jogadas nas estatísticas ao vivo (033)", () => {
  it("mostram os totais dos dois times, que só crescem e terminam iguais aos do estado", async () => {
    const { round, save } = await liveRoundOf();
    let previous = 0;
    for (const minutes of [10, 40, 80]) {
      const mine = mineOf(advance(round, minutes), save.clubId);
      const { unmount } = render(<LiveStats match={mine.match} save={save} />);
      const home = expected(livePlayTotals(mine.match.state, "home"));
      const away = expected(livePlayTotals(mine.match.state, "away"));
      expect(row(t("live.plays.passes"))).toEqual([home.passes, away.passes]);
      expect(row(t("live.plays.accuracy"))).toEqual([home.accuracy, away.accuracy]);
      expect(row(t("live.plays.tackles"))).toEqual([home.tackles, away.tackles]);
      expect(row(t("live.plays.interceptions"))).toEqual([home.interceptions, away.interceptions]);
      const passes = livePlayTotals(mine.match.state, "home")?.passes ?? 0;
      expect(passes).toBeGreaterThanOrEqual(previous);
      previous = passes;
      unmount();
    }
    const end = mineOf(played(round), save.clubId).match.state;
    expect(livePlayTotals(end, "home")?.passes).toBeGreaterThan(previous);
  });
});
