import { describe, expect, it } from "vitest";
import { POSITIONS, type Position } from "../../src/model/catalogs";
import type { CompletedBank } from "../../src/model/types";
import { emptyAcademy } from "../../src/renewal/academy";
import { initialRenewal } from "../../src/renewal/measure";
import { ACADEMY_RULES, SQUAD_RULES } from "../../src/renewal/rules";
import { balanceSquads, squadProblems } from "../../src/renewal/squads";
import type { AcademyPlayer, RenewalState } from "../../src/renewal/types";
import { validateBank } from "../../src/validation/validate";
import { editedWorld, newLeague, testWorld } from "../career/helpers";

const DATE = "2028-01-01";
const CLUB = "clube-001";

/** Jovem de base do CLUB (17 anos), a partir de um jogador do banco. */
function youth(
  world: CompletedBank,
  position: Position,
  strength: number,
  id: string,
): AcademyPlayer {
  const template = world.players[0];
  if (!template) throw new Error("banco vazio");
  const { clubId: _c, contract: _k, ...player } = template;
  return {
    player: {
      ...player,
      id,
      position,
      strength,
      birthDate: "2010-06-01",
      hidden: { ...template.hidden, potential: strength + 15 },
    },
    clubId: CLUB,
    joinedSeason: 1,
  };
}

function withAcademy(world: CompletedBank, entries: AcademyPlayer[]): RenewalState {
  const renewal = initialRenewal(world);
  return {
    ...renewal,
    academy: {
      ...(renewal.academy ?? emptyAcademy()),
      players: [...entries].sort((a, b) => (a.player.id < b.player.id ? -1 : 1)),
    },
  };
}

function balance(world: CompletedBank) {
  return balanceSquads(world, newLeague("elencos", {}, world), initialRenewal(world), "s", 1, DATE);
}

describe("elencos válidos (US4, R7)", () => {
  it("não cria jogadores: sem base, o elenco abaixo do mínimo continua abaixo (036 FR-011)", () => {
    const world = editedWorld((w) => {
      w.players = w.players.filter(
        (player) => !(player.clubId === CLUB && player.position === "GK"),
      );
    });
    const before = initialRenewal(world);
    const result = balance(world);
    expect(result.renewal.nextPlayerSeq).toBe(before.nextPlayerSeq);
    expect(result.promoted).toEqual([]);
    expect(
      result.world.players.filter((player) => player.clubId === CLUB && player.position === "GK"),
    ).toHaveLength(0);
  });

  it("a IA promove da base o melhor goleiro até o mínimo, com origem registrada (036 R5)", () => {
    const world = editedWorld((w) => {
      w.players = w.players.filter(
        (player) => !(player.clubId === CLUB && player.position === "GK"),
      );
    });
    const renewal = withAcademy(world, [
      youth(world, "GK", 50, "jogador-90001"),
      youth(world, "GK", 60, "jogador-90002"),
      youth(world, "GK", 55, "jogador-90003"),
      youth(world, "GK", 40, "jogador-90004"),
    ]);
    const result = balanceSquads(world, newLeague("elencos", {}, world), renewal, "s", 1, DATE);
    const keepers = result.world.players.filter(
      (player) => player.clubId === CLUB && player.position === "GK",
    );
    expect(keepers.map((player) => player.id).sort()).toEqual([
      "jogador-90001",
      "jogador-90002",
      "jogador-90003",
    ]);
    expect(result.renewal.academy?.players.map((entry) => entry.player.id)).toEqual([
      "jogador-90004",
    ]);
    expect(result.renewal.academy?.graduates["jogador-90002"]).toEqual({ clubId: CLUB, season: 2 });
    expect(result.renewal.nextPlayerSeq).toBe(renewal.nextPlayerSeq);
  });

  it("a IA promove da base até o tamanho-alvo, sem passar do teto por posição", () => {
    const world = editedWorld((w) => {
      const own = w.players.filter((player) => player.clubId === CLUB);
      const keep = new Set(own.slice(0, 22).map((player) => player.id));
      w.players = w.players.filter((player) => player.clubId !== CLUB || keep.has(player.id));
    });
    const entries = Array.from({ length: 6 }, (_, index) =>
      youth(world, "CB", 45 + index, `jogador-9100${index}`),
    );
    const result = balanceSquads(
      world,
      newLeague("elencos", {}, world),
      withAcademy(world, entries),
      "s",
      1,
      DATE,
    );
    const own = result.world.players.filter((player) => player.clubId === CLUB);
    const caps = 6;
    expect(own.length).toBeLessThanOrEqual(ACADEMY_RULES.aiTargetSize);
    expect(own.filter((player) => player.position === "CB").length).toBeLessThanOrEqual(caps);
    expect(own.length).toBeGreaterThan(22);
  });

  it("no clube do técnico, ninguém é promovido da base", () => {
    const world = editedWorld((w) => {
      w.players = w.players.filter(
        (player) => !(player.clubId === CLUB && player.position === "GK"),
      );
    });
    const renewal = withAcademy(world, [youth(world, "GK", 60, "jogador-90002")]);
    const result = balanceSquads(
      world,
      newLeague("elencos", {}, world),
      renewal,
      "s",
      1,
      DATE,
      CLUB,
    );
    expect(result.promoted).toEqual([]);
    expect(result.renewal.academy?.players).toHaveLength(1);
  });

  it("dispensa os de menor utilidade até o máximo sem quebrar os mínimos", () => {
    const extra = Array.from({ length: 10 }, (_, index) => index);
    const world = editedWorld((w) => {
      const template = w.players.find(
        (player) => player.clubId === CLUB && player.position === "MF",
      );
      if (!template) return;
      for (const index of extra) {
        w.players.push({
          ...template,
          id: `jogador-9${String(index).padStart(4, "0")}`,
          strength: 25 + index,
          birthDate: "1993-01-01",
          hidden: { ...template.hidden, potential: 40 },
        });
      }
    });
    const before = world.players.filter((player) => player.clubId === CLUB).length;
    const result = balance(world);
    const after = result.world.players.filter((player) => player.clubId === CLUB);
    expect(after).toHaveLength(SQUAD_RULES.max);
    expect(result.released.filter((ref) => ref.playerId.startsWith("jogador-9"))).toHaveLength(
      before - SQUAD_RULES.max,
    );
    for (const position of POSITIONS) {
      expect(after.filter((player) => player.position === position).length).toBeGreaterThanOrEqual(
        SQUAD_RULES.positionMin[position],
      );
    }
  });

  describe("elenco do jogador (até 40, sem teto por posição)", () => {
    /** O clube ganha `count` meio-campistas fracos e veteranos (os primeiros a sair). */
    function withExtra(count: number) {
      return editedWorld((w) => {
        const template = w.players.find(
          (player) => player.clubId === CLUB && player.position === "MF",
        );
        if (!template) return;
        for (let index = 0; index < count; index++) {
          w.players.push({
            ...template,
            id: `jogador-9${String(index).padStart(4, "0")}`,
            strength: 25 + (index % 10),
            birthDate: "1993-01-01",
            hidden: { ...template.hidden, potential: 40 },
          });
        }
      });
    }
    const own = (world: CompletedBank) => world.players.filter((player) => player.clubId === CLUB);

    it("não dispensa quem passa dos 28 da IA nem dos tetos por posição", () => {
      const world = withExtra(8);
      expect(own(world).length).toBeGreaterThan(SQUAD_RULES.max);
      const kept = balanceSquads(
        world,
        newLeague("elencos", {}, world),
        initialRenewal(world),
        "s",
        1,
        DATE,
        CLUB,
      );
      expect(own(kept.world)).toHaveLength(own(world).length);
      expect(kept.released.filter((ref) => ref.playerId.startsWith("jogador-9"))).toHaveLength(0);
      // Sem ser o clube do jogador, o mesmo elenco é cortado até 28.
      expect(own(balance(world).world)).toHaveLength(SQUAD_RULES.max);
    });

    it("dispensa só o que passa de 40", () => {
      const world = withExtra(30);
      const result = balanceSquads(
        world,
        newLeague("elencos", {}, world),
        initialRenewal(world),
        "s",
        1,
        DATE,
        CLUB,
      );
      expect(own(result.world)).toHaveLength(SQUAD_RULES.userMax);
    });
  });

  it("todo clube termina dentro das regras, o banco segue válido e é determinístico", () => {
    const result = balance(testWorld());
    expect(squadProblems(result.world, newLeague("elencos"))).toEqual([]);
    expect(validateBank(result.world).ok).toBe(true);
    expect(balance(testWorld())).toEqual(result);
  });
});
