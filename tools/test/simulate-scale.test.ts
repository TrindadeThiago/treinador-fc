import { SCALE_LIMITS } from "@brasfoot-like/save";
import { describe, expect, it } from "vitest";
import { runSimulateScale } from "../src/simulate-scale";

// 020 (T057): as metas de escala em tamanho reduzido (3 países, 120 clubes, 2 temporadas), que
// cabem no CI. O mundo de 10 países e 400 clubes por 30 temporadas roda em
// `pnpm sim:world --scale` (passo do job de simulação do release).
describe("metas de escala do mundo grande (020 FR-019)", () => {
  const report = runSimulateScale({ seed: "escala-teste", countries: 3, seasons: 2 });

  it("o dia de jogos, a virada e a memória ficam dentro das metas", () => {
    expect(report.dayMs).toBeLessThanOrEqual(SCALE_LIMITS.dayMs);
    expect(report.turnoverMs).toBeLessThanOrEqual(SCALE_LIMITS.turnoverMs);
    expect(report.heapBytes).toBeLessThanOrEqual(SCALE_LIMITS.heapBytes);
  });

  it("o tamanho do save e do arquivo exportado ficam dentro das metas", () => {
    expect(Math.max(...report.lastRoundSizes)).toBeLessThanOrEqual(SCALE_LIMITS.saveLastRoundBytes);
    expect(Math.max(...report.startSizes)).toBeLessThanOrEqual(SCALE_LIMITS.saveStart31Bytes);
    expect(report.exportedBytes).toBeLessThanOrEqual(SCALE_LIMITS.exportedBytes);
  });

  it("cada país fica nas faixas de força, idade e economia", () => {
    expect(report.lines.filter((line) => line.startsWith("✗"))).toEqual([]);
  });
}, 300_000);

// Mundo padrão (024): uma temporada no CI, com a economia de todos os clubes conferida contra as
// faixas do teste longo do motor. As 30 temporadas rodam em `pnpm sim:gates` (pré-push).
describe("mundo padrão: escala e economia em uma temporada", () => {
  const report = runSimulateScale({
    seed: "mundo-padrao-1",
    countries: 0,
    seasons: 1,
    footballWorld: {},
  });

  it("confere a economia e a estrutura (o tempo fica com o gate, que roda sem carga)", () => {
    expect(report.lines.some((line) => line.includes("clubes em crise nas 10 primeiras"))).toBe(
      true,
    );
    const timing = /dia de jogos|virada|pico de heap|temporadas: .* min/;
    expect(report.lines.filter((line) => line.startsWith("✗") && !timing.test(line))).toEqual([]);
  });
}, 300_000);
