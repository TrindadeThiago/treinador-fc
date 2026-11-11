import { describe, expect, it } from "vitest";
import {
  capCommission,
  interestReach,
  minCommission,
  refCommission,
  relationFactor,
  wageAfterCommission,
} from "../../src/agents/formula";
import { DEFAULT_AGENTS } from "../../src/agents/rules";
import { marketSchema } from "../../src/model/schemas";

// 042 T004: as contas da comissão (research R2).

// Regras fixas no teste (refMonths 1,5): as contas não dependem da calibração do padrão.
const rules = { ...DEFAULT_AGENTS, refMonths: 1.5 };

describe("comissão (042 R2)", () => {
  it("referência cresce com a ganância e com relação ruim; rompimento pede o teto", () => {
    expect(relationFactor(50)).toBe(1);
    expect(relationFactor(0)).toBe(1.5);
    expect(relationFactor(100)).toBe(0.5);
    // 100 mil × 1,5 mês × ganância 3 / 3 = 150 mil.
    expect(refCommission(100_000, 3, 50, rules)).toBe(150_000);
    expect(refCommission(100_000, 5, 50, rules)).toBeGreaterThan(
      refCommission(100_000, 1, 50, rules),
    );
    expect(refCommission(100_000, 3, 20, rules)).toBeGreaterThan(150_000);
    expect(refCommission(100_000, 3, 80, rules)).toBeLessThan(150_000);
    expect(refCommission(100_000, 1, 0, rules)).toBe(capCommission(100_000, rules));
    expect(capCommission(100_000, rules)).toBe(600_000);
  });

  it("falta de interesse: alcance pela influência e comissão mínima", () => {
    expect(interestReach(1, rules)).toBe(4);
    expect(interestReach(5, rules)).toBe(20);
    // ref 150 mil + 100 mil × 0,5 × 6 pontos = 450 mil.
    expect(minCommission(150_000, 100_000, 6, rules)).toBe(450_000);
  });

  it("a troca baixa o salário até o teto e nunca economiza mais que 80% do excedente", () => {
    expect(wageAfterCommission(100_000, 150_000, 150_000, 3, rules)).toBe(100_000);
    expect(wageAfterCommission(100_000, 150_000, 100_000, 3, rules)).toBe(100_000);
    const lower = wageAfterCommission(100_000, 150_000, 510_000, 3, rules);
    expect(lower).toBeLessThan(100_000);
    expect(wageAfterCommission(100_000, 150_000, 99_000_000, 1, rules)).toBe(85_000);
    for (const wage of [500, 7_300, 100_000, 2_345_600]) {
      for (const years of [1, 2, 3, 4, 5]) {
        for (const extra of [0, 1_000, 50_000, 999_000, 20_000_000]) {
          const after = wageAfterCommission(wage, 0, extra, years, rules);
          expect((wage - after) * 12 * years).toBeLessThanOrEqual(extra * 0.8 + 1e-6);
          expect(after).toBeGreaterThanOrEqual(wage * 0.85 - 100);
        }
      }
    }
  });

  it("o schema recusa troca acima de 100% e teto abaixo da referência, com o campo", () => {
    const paths = (agents: unknown) =>
      (marketSchema.safeParse({ agents }).error?.issues ?? []).map((issue) => issue.path.join("."));
    expect(marketSchema.safeParse({ agents: {} }).success).toBe(true);
    expect(paths({ tradePct: 120 })).toContain("agents.tradePct");
    expect(paths({ refMonths: 3, capMonths: 2 })).toContain("agents.capMonths");
    expect(paths({ relation: { decay: -1 } })).toContain("agents.relation.decay");
  });
});
