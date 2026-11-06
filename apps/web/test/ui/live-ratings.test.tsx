// 034 US2 (T019): nota parcial no painel Meu time.
import { liveRatings } from "@brasfoot-like/engine";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formatRating, t } from "../../src/i18n";
import { SubstitutionPanel } from "../../src/ui/SubstitutionPanel";
import { advance, liveRoundOf, mineOf } from "../helpers/live-round";

describe("nota parcial no painel Meu time (034)", () => {
  it("cada jogador em campo mostra a nota de liveRatings, ou sem nota", async () => {
    const { round, save } = await liveRoundOf();
    const mine = mineOf(advance(round, 40), save.clubId);
    render(
      <SubstitutionPanel match={mine.match} side={mine.side} save={save} onChange={vi.fn()} />,
    );
    const players = new Map(save.bank.players.map((player) => [player.id, player]));
    const ratings = liveRatings(mine.match.state, players).players;
    const team = mine.match.state.teams[mine.side];
    const onField = Object.values(team.onField).filter((id): id is string => id !== null);
    expect(onField.length).toBeGreaterThan(0);
    for (const id of onField) {
      const name = players.get(id)?.displayName ?? "";
      const row = screen.getByRole("button", { name: new RegExp(name) });
      const rating = ratings[id]?.rating;
      const expected = rating === undefined ? t("rating.none") : formatRating(rating);
      expect(within(row).getByText(expected)).toBeDefined();
      expect(row.textContent).toContain(t("rating.live"));
    }
  });
});
