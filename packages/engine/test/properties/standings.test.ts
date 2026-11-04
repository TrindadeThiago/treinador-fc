import { describe, expect, it } from "vitest";
import { rankRows } from "../../src/season/rank";
import type { MatchRecord } from "../../src/season/types";
import { forCases } from "./cases";

const POINTS = { win: 3, draw: 1, loss: 0 };

describe("propriedades da classificação", () => {
  it("posições são uma permutação, pontos e jogos fecham com vitórias, empates e derrotas", () => {
    forCases("tabela", 200, (rng, label) => {
      const clubs = Array.from({ length: rng.int(2, 20) }, (_, index) => `c-${index}`);
      const records = Array.from({ length: rng.int(0, 60) }, (_, round) => {
        const [home, away] = rng.shuffle(clubs);
        return {
          round,
          home,
          away,
          score: { home: rng.int(0, 5), away: rng.int(0, 5) },
          stats: { home: { redCards: rng.int(0, 2) }, away: { redCards: rng.int(0, 2) } },
        } as unknown as MatchRecord;
      });
      const rows = rankRows(
        clubs,
        records,
        POINTS,
        ["wins", "goal-difference", "goals-for", "head-to-head"],
        label,
        { drawLots: true },
      );
      expect(
        rows.map((row) => row.position).sort((a, b) => a - b),
        label,
      ).toEqual(clubs.map((_, index) => index + 1));
      for (const row of rows) {
        expect(row.played, label).toBe(row.wins + row.draws + row.losses);
        expect(row.points, label).toBe(3 * row.wins + row.draws);
        expect(row.goalDifference, label).toBe(row.goalsFor - row.goalsAgainst);
      }
      const goals = rows.reduce((sum, row) => sum + row.goalsFor, 0);
      expect(goals, label).toBe(rows.reduce((sum, row) => sum + row.goalsAgainst, 0));
      expect(
        rows.reduce((sum, row) => sum + row.played, 0),
        label,
      ).toBe(2 * records.length);
      for (let index = 1; index < rows.length; index++) {
        expect(rows[index - 1]?.points ?? 0, label).toBeGreaterThanOrEqual(
          rows[index]?.points ?? 0,
        );
      }
    });
  });
});
