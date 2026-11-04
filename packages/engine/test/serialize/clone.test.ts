import { describe, expect, it } from "vitest";
import { createRng, type Rng } from "../../src/rng/xoshiro";
import { cloneData } from "../../src/serialize/clone";

const viaJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Estrutura aleatória parecida com os estados do motor, com os casos que o JSON trata à parte. */
function randomValue(rng: Rng, depth: number): unknown {
  const kind = rng.int(0, depth > 3 ? 5 : 8);
  switch (kind) {
    case 0:
      return rng.int(-1000, 1000);
    case 1:
      return rng.pick([0, -0, 1.5, -2.25, Number.NaN, Number.POSITIVE_INFINITY, 1e21]);
    case 2:
      return rng.pick(["", "a", "clube-chn-001", "ção"]);
    case 3:
      return rng.int(0, 1) === 1;
    case 4:
      return null;
    case 5:
      return rng.pick([undefined, () => 1]);
    case 6:
      return Array.from({ length: rng.int(0, 5) }, () => randomValue(rng, depth + 1));
    default: {
      const out: Record<string, unknown> = {};
      for (let index = 0; index < rng.int(0, 5); index++) {
        out[rng.pick(["b", "a", "10", "2", "z", `k${index}`])] = randomValue(rng, depth + 1);
      }
      return out;
    }
  }
}

describe("cloneData: o mesmo resultado de JSON.parse(JSON.stringify())", () => {
  it("casos de borda do JSON", () => {
    const value = {
      zero: -0,
      nan: Number.NaN,
      inf: Number.NEGATIVE_INFINITY,
      gone: undefined,
      fn: () => 1,
      list: [undefined, () => 1, -0, Number.NaN, { a: undefined }],
      "10": "ordem",
      "2": "das chaves",
      nested: { deep: [[{ x: 1 }]] },
    };
    const cloned = cloneData(value);
    expect(JSON.stringify(cloned)).toBe(JSON.stringify(viaJson(value)));
    expect(cloned).toEqual(viaJson(value));
    expect(Object.is(cloned.zero, 0)).toBe(true);
    expect(Object.keys(cloned)).toEqual(Object.keys(viaJson(value)));
  });

  it("2.000 estruturas aleatórias", () => {
    const rng = createRng("clone");
    for (let index = 0; index < 2000; index++) {
      // Embrulhado: no topo, `undefined` e funções não têm JSON (o motor só clona estados).
      const value = { root: randomValue(rng, 0) };
      expect(JSON.stringify(cloneData(value))).toBe(JSON.stringify(viaJson(value)));
    }
  });

  it("não compartilha objetos com a entrada", () => {
    const value = { a: { b: [1, 2] } };
    const cloned = cloneData(value);
    cloned.a.b.push(3);
    expect(value.a.b).toEqual([1, 2]);
  });
});
