import { describe, expect, it } from "vitest";
import type { CompletedPlayer } from "../../src/model/types";
import { createRng } from "../../src/rng/xoshiro";
import { playersAt, squadOf } from "../../src/world/squads";

const POSITIONS = ["GK", "CB", "FB", "DM", "MF", "FW"] as const;

function makePlayers(count: number): CompletedPlayer[] {
  const rng = createRng("indice");
  return Array.from(
    { length: count },
    (_, index) =>
      ({
        id: `p-${String(index).padStart(4, "0")}`,
        position: rng.pick(POSITIONS),
        strength: rng.int(40, 90),
        clubId: `c-${rng.int(1, 20)}`,
      }) as CompletedPlayer,
  );
}

/** A ordenação do zero, para comparar com o índice. */
function fresh(players: readonly CompletedPlayer[], position: string): CompletedPlayer[] {
  return players
    .filter((player) => player.position === position)
    .sort((a, b) => b.strength - a.strength || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

describe("índices de jogadores por lista", () => {
  it("transferência (mesma força): a ordem reaproveitada é a da ordenação do zero", () => {
    const before = makePlayers(500);
    for (const position of POSITIONS) playersAt({ players: before }, position);
    const moved = before.map((player, index) =>
      index % 7 === 0 ? ({ ...player, clubId: "c-99" } as CompletedPlayer) : player,
    );
    for (const position of POSITIONS) {
      const indexed = playersAt({ players: moved }, position);
      expect(indexed).toEqual(fresh(moved, position));
      // Os objetos são os da lista nova (com o clube novo), não os da anterior.
      for (const player of indexed) expect(moved).toContain(player);
    }
    expect(squadOf({ players: moved }, "c-99").length).toBeGreaterThan(0);
  });

  it("força ou posição mudada: o índice é montado do zero", () => {
    const before = makePlayers(500);
    for (const position of POSITIONS) playersAt({ players: before }, position);
    const evolved = before.map((player, index) =>
      index % 5 === 0 ? ({ ...player, strength: player.strength + 7 } as CompletedPlayer) : player,
    );
    for (const position of POSITIONS) {
      expect(playersAt({ players: evolved }, position)).toEqual(fresh(evolved, position));
    }
    const repositioned = evolved.map((player, index) =>
      index === 3 ? ({ ...player, position: "GK" } as CompletedPlayer) : player,
    );
    for (const position of POSITIONS) {
      expect(playersAt({ players: repositioned }, position)).toEqual(fresh(repositioned, position));
    }
  });
});
