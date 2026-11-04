import type { Position } from "../model/catalogs";

/** Vaga de um esquema: identificador e posição esperada. */
export interface Slot {
  id: string;
  position: Position;
}

export interface Formation {
  id: FormationId;
  slots: readonly Slot[];
}

export const FORMATION_IDS = [
  "4-4-2",
  "4-3-3",
  "3-5-2",
  "4-5-1",
  "5-3-2",
  "4-2-3-1",
  "3-4-3",
  "4-1-4-1",
  "4-1-2-1-2",
  "5-4-1",
  "4-2-2-2",
] as const;
export type FormationId = (typeof FORMATION_IDS)[number];

/**
 * Esquemas entre os quais o computador escolhe o preferido de cada clube (`preferredFormation`),
 * inclusive o inicial do técnico: os seis do catálogo original. Os demais ficam à escolha do
 * técnico. Assim a mesma seed continua dando a mesma carreira de antes dos esquemas novos.
 */
export const PREFERRED_FORMATION_IDS: readonly FormationId[] = [
  "4-4-2",
  "4-3-3",
  "3-5-2",
  "4-5-1",
  "5-3-2",
  "4-2-3-1",
];

export const POSTURES = ["defensive", "balanced", "attacking"] as const;
export type Posture = (typeof POSTURES)[number];

const s = (id: string, position: Position): Slot => ({ id, position });
const BACK_FOUR = [s("lb", "FB"), s("lcb", "CB"), s("rcb", "CB"), s("rb", "FB")];

/** Catálogo fixo de esquemas (FR-003); cada um tem 11 vagas e exatamente um goleiro. */
export const FORMATIONS: Record<FormationId, Formation> = {
  "4-4-2": {
    id: "4-4-2",
    slots: [
      s("gk", "GK"),
      ...BACK_FOUR,
      s("lm", "MF"),
      s("lcm", "DM"),
      s("rcm", "MF"),
      s("rm", "MF"),
      s("ls", "FW"),
      s("rs", "FW"),
    ],
  },
  "4-3-3": {
    id: "4-3-3",
    slots: [
      s("gk", "GK"),
      ...BACK_FOUR,
      s("dm", "DM"),
      s("lcm", "MF"),
      s("rcm", "MF"),
      s("lw", "FW"),
      s("st", "FW"),
      s("rw", "FW"),
    ],
  },
  "3-5-2": {
    id: "3-5-2",
    slots: [
      s("gk", "GK"),
      s("lcb", "CB"),
      s("cb", "CB"),
      s("rcb", "CB"),
      s("lm", "MF"),
      s("ldm", "DM"),
      s("cm", "MF"),
      s("rdm", "DM"),
      s("rm", "MF"),
      s("ls", "FW"),
      s("rs", "FW"),
    ],
  },
  "4-5-1": {
    id: "4-5-1",
    slots: [
      s("gk", "GK"),
      ...BACK_FOUR,
      s("lm", "MF"),
      s("ldm", "DM"),
      s("cm", "MF"),
      s("rdm", "DM"),
      s("rm", "MF"),
      s("st", "FW"),
    ],
  },
  "5-3-2": {
    id: "5-3-2",
    slots: [
      s("gk", "GK"),
      s("lb", "FB"),
      s("lcb", "CB"),
      s("cb", "CB"),
      s("rcb", "CB"),
      s("rb", "FB"),
      s("ldm", "DM"),
      s("cm", "MF"),
      s("rcm", "MF"),
      s("ls", "FW"),
      s("rs", "FW"),
    ],
  },
  "4-2-3-1": {
    id: "4-2-3-1",
    slots: [
      s("gk", "GK"),
      ...BACK_FOUR,
      s("ldm", "DM"),
      s("rdm", "DM"),
      s("lm", "MF"),
      s("am", "MF"),
      s("rm", "MF"),
      s("st", "FW"),
    ],
  },
  "3-4-3": {
    id: "3-4-3",
    slots: [
      s("gk", "GK"),
      s("lcb", "CB"),
      s("cb", "CB"),
      s("rcb", "CB"),
      // As alas jogam na linha do meio: são meias abertos, não laterais.
      s("lm", "MF"),
      s("ldm", "DM"),
      s("rdm", "DM"),
      s("rm", "MF"),
      s("lw", "FW"),
      s("st", "FW"),
      s("rw", "FW"),
    ],
  },
  "4-1-4-1": {
    id: "4-1-4-1",
    slots: [
      s("gk", "GK"),
      ...BACK_FOUR,
      s("dm", "DM"),
      s("lm", "MF"),
      s("lcm", "MF"),
      s("rcm", "MF"),
      s("rm", "MF"),
      s("st", "FW"),
    ],
  },
  "4-1-2-1-2": {
    id: "4-1-2-1-2",
    slots: [
      s("gk", "GK"),
      ...BACK_FOUR,
      s("dm", "DM"),
      s("lcm", "MF"),
      s("rcm", "MF"),
      s("am", "MF"),
      s("ls", "FW"),
      s("rs", "FW"),
    ],
  },
  "5-4-1": {
    id: "5-4-1",
    slots: [
      s("gk", "GK"),
      s("lwb", "FB"),
      s("lcb", "CB"),
      s("cb", "CB"),
      s("rcb", "CB"),
      s("rwb", "FB"),
      s("lm", "MF"),
      s("ldm", "DM"),
      s("rdm", "DM"),
      s("rm", "MF"),
      s("st", "FW"),
    ],
  },
  "4-2-2-2": {
    id: "4-2-2-2",
    slots: [
      s("gk", "GK"),
      ...BACK_FOUR,
      s("ldm", "DM"),
      s("rdm", "DM"),
      s("lam", "MF"),
      s("ram", "MF"),
      s("ls", "FW"),
      s("rs", "FW"),
    ],
  },
};

export function slotPosition(formation: FormationId, slotId: string): Position | undefined {
  return FORMATIONS[formation].slots.find((slot) => slot.id === slotId)?.position;
}
