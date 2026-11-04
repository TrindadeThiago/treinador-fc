import { FORMATION_IDS, FORMATIONS } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import { PITCH_LAYOUT } from "../../src/ui/pitch-layout";

describe("desenho dos esquemas no campo", () => {
  it("toda vaga de todo esquema tem lugar no campo, dentro dele", () => {
    for (const formation of FORMATION_IDS) {
      const layout = PITCH_LAYOUT[formation];
      const slots = FORMATIONS[formation].slots.map((slot) => slot.id);
      expect(Object.keys(layout).sort(), formation).toEqual([...slots].sort());
      for (const point of Object.values(layout)) {
        expect(point.x).toBeGreaterThanOrEqual(8);
        expect(point.x).toBeLessThanOrEqual(92);
        expect(point.y).toBeGreaterThanOrEqual(10);
        expect(point.y).toBeLessThanOrEqual(94);
      }
    }
  });

  it("nenhum par de vagas fica perto demais (os cards não se cobrem)", () => {
    for (const formation of FORMATION_IDS) {
      const points = Object.entries(PITCH_LAYOUT[formation]);
      for (const [i, [a, p]] of points.entries()) {
        for (const [b, q] of points.slice(i + 1)) {
          // Lado a lado precisam de 18% de largura; um atrás do outro, de 12% de altura.
          const apart = Math.abs(p.x - q.x) >= 18 || Math.abs(p.y - q.y) >= 12;
          expect(apart, `${formation}: ${a} e ${b}`).toBe(true);
        }
      }
    }
  });

  it("dentro de cada esquema, o volante fica entre os meias e a defesa", () => {
    for (const formation of FORMATION_IDS) {
      const layout = PITCH_LAYOUT[formation];
      const ys = (position: string) =>
        FORMATIONS[formation].slots
          .filter((slot) => slot.position === position)
          .map((slot) => layout[slot.id]?.y ?? 0);
      const dm = ys("DM");
      if (dm.length === 0) continue;
      for (const mf of ys("MF")) expect(Math.min(...dm), formation).toBeGreaterThan(mf);
      for (const cb of ys("CB")) expect(Math.max(...dm), formation).toBeLessThan(cb);
    }
  });
});
