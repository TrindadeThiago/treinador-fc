import type { FormationId } from "@brasfoot-like/engine";

/** Ponto de uma vaga no campo, em % da largura (`x`) e da altura (`y`, ataque no alto). */
export interface PitchPoint {
  x: number;
  y: number;
}

/** Faixas do campo, do ataque ao gol: o volante fica atrás dos meias, como no jogo real. */
const Y = { fw: 13, wing: 18, am: 34, mf: 42, dm: 58, fb: 73, cb: 77, gk: 93 } as const;

const GK = { gk: { x: 50, y: Y.gk } };
const BACK_FOUR = {
  lb: { x: 13, y: Y.fb },
  lcb: { x: 37, y: Y.cb },
  rcb: { x: 63, y: Y.cb },
  rb: { x: 87, y: Y.fb },
};
const TWO_UP = { ls: { x: 36, y: Y.fw }, rs: { x: 64, y: Y.fw } };

/**
 * Posição de cada vaga de cada esquema no desenho do campo. É só apresentação: o motor continua
 * usando a posição da vaga (GOL, LAT, ZAG, VOL, MEI, ATA) e não a coordenada.
 */
export const PITCH_LAYOUT: Record<FormationId, Record<string, PitchPoint>> = {
  "4-4-2": {
    ...GK,
    ...BACK_FOUR,
    lm: { x: 14, y: Y.mf },
    rcm: { x: 50, y: Y.mf - 4 },
    rm: { x: 86, y: Y.mf },
    lcm: { x: 50, y: Y.dm },
    ...TWO_UP,
  },
  "4-3-3": {
    ...GK,
    ...BACK_FOUR,
    dm: { x: 50, y: Y.dm },
    lcm: { x: 30, y: Y.mf },
    rcm: { x: 70, y: Y.mf },
    lw: { x: 16, y: Y.wing },
    st: { x: 50, y: Y.fw },
    rw: { x: 84, y: Y.wing },
  },
  "3-5-2": {
    ...GK,
    lcb: { x: 26, y: Y.cb },
    cb: { x: 50, y: Y.cb },
    rcb: { x: 74, y: Y.cb },
    lm: { x: 11, y: Y.mf },
    ldm: { x: 33, y: Y.dm },
    cm: { x: 50, y: Y.mf - 4 },
    rdm: { x: 67, y: Y.dm },
    rm: { x: 89, y: Y.mf },
    ...TWO_UP,
  },
  "4-5-1": {
    ...GK,
    ...BACK_FOUR,
    lm: { x: 12, y: Y.mf },
    ldm: { x: 33, y: Y.dm },
    cm: { x: 50, y: Y.mf - 4 },
    rdm: { x: 67, y: Y.dm },
    rm: { x: 88, y: Y.mf },
    st: { x: 50, y: Y.fw },
  },
  "5-3-2": {
    ...GK,
    lb: { x: 10, y: Y.fb - 6 },
    lcb: { x: 30, y: Y.cb },
    cb: { x: 50, y: Y.cb },
    rcb: { x: 70, y: Y.cb },
    rb: { x: 90, y: Y.fb - 6 },
    ldm: { x: 50, y: Y.dm },
    cm: { x: 30, y: Y.mf },
    rcm: { x: 70, y: Y.mf },
    ...TWO_UP,
  },
  "4-2-3-1": {
    ...GK,
    ...BACK_FOUR,
    ldm: { x: 36, y: Y.dm },
    rdm: { x: 64, y: Y.dm },
    lm: { x: 15, y: Y.am },
    am: { x: 50, y: Y.am },
    rm: { x: 85, y: Y.am },
    st: { x: 50, y: Y.fw },
  },
};
