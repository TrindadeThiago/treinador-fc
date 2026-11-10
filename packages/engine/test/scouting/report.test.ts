import { describe, expect, it } from "vitest";
import { EVOLUTION_RULES } from "../../src/renewal/rules";
import { createRng } from "../../src/rng/xoshiro";
import { advanceReport } from "../../src/scouting/round";
import { DEFAULT_SCOUTING, stepsToComplete } from "../../src/scouting/rules";
import { openReport } from "../../src/scouting/state";
import type { ScoutReport } from "../../src/scouting/types";

// 039 SC-001 a SC-003: grade nível × etapa com jogadores sintéticos.

const SEED = "grade-039";
const PER_CELL = 2000;

function players(key: string) {
  const rng = createRng(`${SEED}:${key}`);
  return Array.from({ length: PER_CELL }, (_, index) => {
    const strength = rng.int(30, 75);
    return {
      id: `j-${index}`,
      strength,
      hidden: {
        potential: Math.min(EVOLUTION_RULES.maxStrength, strength + rng.int(0, 25)),
        temperament: rng.int(1, 100),
        injuryProneness: rng.int(1, 100),
      },
    };
  });
}

const width = (report: ScoutReport) => report.estimate.high - report.estimate.low;

/** Largura média por etapa (0 a 10) num nível, checando contenção e aninhamento a cada etapa. */
function widths(level: number): number[] {
  const list = players(`nivel-${level}`);
  const sums = new Array(11).fill(0);
  for (const player of list) {
    let report = openReport(player, DEFAULT_SCOUTING.initialWidth, SEED, { season: 1, round: 0 });
    sums[0] += width(report);
    for (let step = 1; step <= 10; step++) {
      const next = advanceReport(report, player, DEFAULT_SCOUTING, level, SEED, {
        season: 1,
        round: step,
      });
      expect(next.estimate.low).toBeGreaterThanOrEqual(report.estimate.low);
      expect(next.estimate.high).toBeLessThanOrEqual(report.estimate.high);
      expect(next.estimate.low).toBeLessThanOrEqual(player.hidden.potential);
      expect(next.estimate.high).toBeGreaterThanOrEqual(player.hidden.potential);
      report = next;
      sums[step] += width(report);
    }
  }
  return sums.map((sum) => sum / list.length);
}

describe("grade nível × etapa (039)", () => {
  const grid = [1, 2, 3, 4, 5].map(widths);

  it("100% de contenção e aninhamento (checados dentro da grade)", () => {
    expect(grid).toHaveLength(5);
  });

  it("a largura média cai a cada nível e a cada etapa até a completa (SC-003)", () => {
    for (let level = 1; level <= 5; level++) {
      const row = grid[level - 1] ?? [];
      const total = stepsToComplete(DEFAULT_SCOUTING, level);
      for (let step = 1; step <= total; step++) {
        expect(row[step] ?? 0).toBeLessThan(row[step - 1] ?? 0);
      }
      if (level > 1) {
        for (let step = 1; step <= 3; step++) {
          expect(row[step] ?? 0).toBeLessThan(grid[level - 2]?.[step] ?? 0);
        }
      }
    }
  });

  it("nível 5 completo fica em no máximo 40% do nível 1 na primeira etapa (SC-002)", () => {
    const complete = grid[4]?.[stepsToComplete(DEFAULT_SCOUTING, 5)] ?? 0;
    expect(complete / (grid[0]?.[1] ?? 1)).toBeLessThanOrEqual(0.4);
  });
});
