import { describe, expect, it } from "vitest";
import { DEFAULT_ACADEMY_LEVELS } from "../../src/renewal/academy-levels";
import {
  ESTIMATE_MIN_WIDTH,
  estimateKey,
  estimateWidth,
  initialEstimate,
  narrowEstimate,
} from "../../src/renewal/estimate";
import { EVOLUTION_RULES } from "../../src/renewal/rules";
import type { PotentialEstimate } from "../../src/renewal/types";
import { createRng } from "../../src/rng/xoshiro";

const SEED = "faixa-038";
const rule = (level: number) => {
  const found = DEFAULT_ACADEMY_LEVELS[level - 1];
  if (!found) throw new Error(`nível ${level}`);
  return found;
};

interface Youth {
  id: string;
  strength: number;
  hidden: { potential: number };
}

/** Jovens sintéticos: força de 30 a 70, potencial acima da força (até o teto). */
function youths(count: number, key: string): Youth[] {
  const rng = createRng(`${SEED}:${key}`);
  return Array.from({ length: count }, (_, index) => {
    const strength = rng.int(30, 70);
    const potential = Math.min(EVOLUTION_RULES.maxStrength, strength + rng.int(1, 30));
    return { id: `jogador-${index}`, strength, hidden: { potential } };
  });
}

const contains = (estimate: PotentialEstimate, value: number) =>
  estimate.low <= value && value <= estimate.high;
const inside = (inner: PotentialEstimate, outer: PotentialEstimate) =>
  inner.low >= outer.low && inner.high <= outer.high;
const widthOf = (estimate: PotentialEstimate) => estimate.high - estimate.low;

describe("estimateWidth (038 R3)", () => {
  it("segue a tabela padrão por nível e tempo, com mínimo de 4", () => {
    const table = [1, 2, 3, 4, 5].map((level) =>
      [0, 1, 2].map((tenure) => estimateWidth(rule(level), level, tenure)),
    );
    expect(table).toEqual([
      [20, 18, 16],
      [18, 16, 14],
      [16, 14, 12],
      [14, 11, 8],
      [12, 9, 6],
    ]);
    expect(estimateWidth(rule(5), 5, 10)).toBe(ESTIMATE_MIN_WIDTH);
  });

  it("usa os valores do mod quando presentes e o padrão do nível quando ausentes", () => {
    expect(estimateWidth({ ...rule(1), estimateWidth: 30, estimateShrink: 5 }, 1, 2)).toBe(20);
    const { estimateWidth: _w, estimateShrink: _s, ...bare } = rule(4);
    expect(estimateWidth(bare, 4, 1)).toBe(11);
  });
});

describe("initialEstimate (038 FR-002, FR-004)", () => {
  it("contém o potencial, respeita a largura, a força e a escala", () => {
    for (const youth of youths(4000, "inicial")) {
      for (const width of [20, 12, 4]) {
        const estimate = initialEstimate(youth, width, estimateKey(SEED, 1, youth.id));
        expect(contains(estimate, youth.hidden.potential)).toBe(true);
        expect(widthOf(estimate)).toBeLessThanOrEqual(width);
        expect(estimate.low).toBeGreaterThanOrEqual(youth.strength);
        expect(estimate.low).toBeGreaterThanOrEqual(1);
        expect(estimate.high).toBeLessThanOrEqual(EVOLUTION_RULES.maxStrength);
      }
    }
  });

  it("cobre os extremos da escala", () => {
    for (const [strength, potential] of [
      [1, 2],
      [1, 1],
      [97, 99],
      [99, 99],
      [60, 61],
    ] as const) {
      const youth = { id: "x", strength, hidden: { potential } };
      const estimate = initialEstimate(youth, 20, "chave");
      expect(contains(estimate, potential)).toBe(true);
      expect(estimate.high).toBeLessThanOrEqual(EVOLUTION_RULES.maxStrength);
      expect(estimate.low).toBeGreaterThanOrEqual(1);
    }
  });

  it("a mesma chave dá a mesma faixa; outra chave pode dar outra", () => {
    const youth = { id: "a", strength: 40, hidden: { potential: 70 } };
    expect(initialEstimate(youth, 16, "k1")).toEqual(initialEstimate(youth, 16, "k1"));
    const many = new Set(
      Array.from({ length: 50 }, (_, index) => initialEstimate(youth, 16, `k${index}`).low),
    );
    expect(many.size).toBeGreaterThan(5);
  });

  it("a posição do valor real é espalhada, sem padrão fixo (FR-004)", () => {
    const width = 16;
    // Só quem não encosta na força nem nos limites da escala (a análise, U3).
    const free = youths(8000, "espalhamento").filter(
      (youth) =>
        youth.hidden.potential - width >= youth.strength &&
        youth.hidden.potential + width <= EVOLUTION_RULES.maxStrength,
    );
    expect(free.length).toBeGreaterThan(2000);
    const buckets = [0, 0, 0, 0, 0];
    for (const youth of free) {
      const estimate = initialEstimate(youth, width, estimateKey(SEED, 1, youth.id));
      const relative = (youth.hidden.potential - estimate.low) / widthOf(estimate);
      const bucket = Math.min(4, Math.floor(relative * 5));
      buckets[bucket] = (buckets[bucket] ?? 0) + 1;
    }
    for (const count of buckets) {
      expect(count / free.length).toBeGreaterThan(0.12);
      expect(count / free.length).toBeLessThan(0.28);
    }
  });
});

describe("narrowEstimate (038 FR-005)", () => {
  it("fica dentro da anterior, contém o potencial e respeita a largura e a força", () => {
    for (const youth of youths(3000, "estreita")) {
      let estimate = initialEstimate(youth, 20, estimateKey(SEED, 1, youth.id));
      let strength = youth.strength;
      for (const [season, width] of [
        [2, 18],
        [3, 22],
        [4, 9],
        [5, 4],
        [6, 4],
      ] as const) {
        // A força cresce rumo ao potencial (às vezes passa do limite inferior anterior).
        strength = Math.min(youth.hidden.potential, strength + 4);
        const current = { ...youth, strength };
        const next = narrowEstimate(estimate, current, width, estimateKey(SEED, season, youth.id));
        expect(inside(next, estimate)).toBe(true);
        expect(contains(next, youth.hidden.potential)).toBe(true);
        expect(widthOf(next)).toBeLessThanOrEqual(Math.min(widthOf(estimate), width));
        expect(next.low).toBeGreaterThanOrEqual(strength);
        estimate = next;
      }
    }
  });

  it("com a força perto do potencial a faixa pode ficar abaixo de 4, começando na força", () => {
    const youth = { id: "maduro", strength: 68, hidden: { potential: 70 } };
    const before = { low: 60, high: 76 };
    const next = narrowEstimate(before, youth, 12, "k");
    expect(next.low).toBeGreaterThanOrEqual(68);
    expect(contains(next, 70)).toBe(true);
    expect(inside(next, before)).toBe(true);
  });

  it("nunca se alarga quando a largura alvo cresce (academia rebaixada)", () => {
    const youth = { id: "b", strength: 40, hidden: { potential: 66 } };
    const before = { low: 60, high: 69 };
    const next = narrowEstimate(before, youth, 20, "k");
    expect(next).toEqual(before);
  });
});

describe("grade nível × tempo (038 SC-001 a SC-004)", () => {
  const meanWidth = (level: number, tenure: number) => {
    let total = 0;
    const list = youths(2000, `grade-${level}`);
    for (const youth of list) {
      let estimate = initialEstimate(
        youth,
        estimateWidth(rule(level), level, 0),
        estimateKey(SEED, 1, youth.id),
      );
      for (let step = 1; step <= tenure; step++) {
        const next = narrowEstimate(
          estimate,
          youth,
          estimateWidth(rule(level), level, step),
          estimateKey(SEED, 1 + step, youth.id),
        );
        expect(inside(next, estimate)).toBe(true);
        expect(contains(next, youth.hidden.potential)).toBe(true);
        estimate = next;
      }
      total += widthOf(estimate);
    }
    return total / list.length;
  };

  const grid = [1, 2, 3, 4, 5].map((level) => [0, 1, 2].map((tenure) => meanWidth(level, tenure)));

  it("a largura média cai a cada nível e a cada virada (SC-003)", () => {
    for (let level = 0; level < 5; level++) {
      for (let tenure = 0; tenure < 3; tenure++) {
        const cell = grid[level]?.[tenure] ?? 0;
        if (tenure > 0) expect(cell).toBeLessThan(grid[level]?.[tenure - 1] ?? 0);
        if (level > 0) expect(cell).toBeLessThan(grid[level - 1]?.[tenure] ?? 0);
      }
    }
  });

  it("nível 5 com dois anos fica em no máximo 60% do nível 1 recém-chegado (SC-002)", () => {
    const ratio = (grid[4]?.[2] ?? 0) / (grid[0]?.[0] ?? 1);
    expect(ratio).toBeLessThanOrEqual(0.6);
  });
});
