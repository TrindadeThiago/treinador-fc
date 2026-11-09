import { describe, expect, it } from "vitest";
import { ageOn } from "../../src/calendar/date";
import type { CompletedBank } from "../../src/model/types";
import { asClubPlayer, emptyAcademy } from "../../src/renewal/academy";
import { initialRenewal } from "../../src/renewal/measure";
import { nameBankFor } from "../../src/renewal/names";
import { ACADEMY_RULES, YOUTH_RULES } from "../../src/renewal/rules";
import type { RenewalState } from "../../src/renewal/types";
import { generateYouth, youthCount } from "../../src/renewal/youth";
import { validateBank } from "../../src/validation/validate";
import { editedWorld, newLeague, testWorld } from "../career/helpers";

const DATE = "2028-01-01";

function generate(
  seed: string,
  world: CompletedBank = testWorld(),
  renewal?: RenewalState,
  managerClubId?: string,
) {
  return generateYouth(
    world,
    newLeague("jovens", {}, world),
    renewal ?? initialRenewal(world),
    seed,
    1,
    DATE,
    managerClubId,
  );
}

/** Jovens da safra como jogadores do clube (a base fica fora do mundo, 036 R1). */
function arrivals(result: ReturnType<typeof generate>) {
  return (result.renewal.academy?.players ?? []).map(asClubPlayer);
}

describe("geração de jovens (US3, R6)", () => {
  it("cada clube recebe 1 a 3 jovens pela reputação, na base, com dados válidos", () => {
    const before = initialRenewal(testWorld());
    const result = generate("jovens");
    const { world, renewal, arrived } = result;
    // A safra vai para a base (036 FR-002): o mundo não muda.
    expect(world.players).toHaveLength(testWorld().players.length);
    const fresh = arrivals(result);
    expect(result.renewal.academy?.players.every((entry) => entry.joinedSeason === 2)).toBe(true);
    expect(arrived.map((ref) => ref.playerId).sort()).toEqual(
      fresh.map((player) => player.id).sort(),
    );
    for (const club of testWorld().clubs) {
      const own = fresh.filter((player) => player.clubId === club.id);
      expect(own).toHaveLength(youthCount(club.reputation));
      for (const player of own) {
        const age = ageOn(player.birthDate, DATE);
        expect(age).toBeGreaterThanOrEqual(YOUTH_RULES.age[0]);
        expect(age).toBeLessThanOrEqual(YOUTH_RULES.age[1]);
        expect(player.hidden.potential).toBeGreaterThan(player.strength);
        expect(player.traits.length).toBeLessThanOrEqual(2);
        expect(player.hidden.temperament).toBeGreaterThanOrEqual(1);
        expect(player.hidden.injuryProneness).toBeLessThanOrEqual(100);
        const names = nameBankFor(testWorld(), club.countryId);
        expect(names.firstNames.some((first) => player.displayName.startsWith(first))).toBe(true);
      }
    }
    const ids = new Set([...world.players, ...fresh].map((player) => player.id));
    expect(ids.size).toBe(world.players.length + fresh.length);
    expect(renewal.nextPlayerSeq).toBe(before.nextPlayerSeq + fresh.length);
    expect(validateBank({ ...world, players: [...world.players, ...fresh] }).ok).toBe(true);
  });

  it("youthCount segue os degraus de reputação", () => {
    expect(youthCount(30)).toBe(1);
    expect(youthCount(60)).toBe(2);
    expect(youthCount(90)).toBe(3);
  });

  it("clubes de reputação maior recebem jovens melhores em média", () => {
    const rich = testWorld().clubs.reduce((best, club) =>
      club.reputation > best.reputation ? club : best,
    );
    const poor = testWorld().clubs.reduce((worst, club) =>
      club.reputation < worst.reputation ? club : worst,
    );
    const average = (clubId: string, field: "strength" | "potential") => {
      let sum = 0;
      let count = 0;
      for (let seed = 0; seed < 30; seed++) {
        for (const player of arrivals(generate(`media-${seed}`))) {
          if (player.clubId !== clubId) continue;
          sum += field === "strength" ? player.strength : player.hidden.potential;
          count += 1;
        }
      }
      return sum / count;
    };
    expect(average(rich.id, "strength")).toBeGreaterThan(average(poor.id, "strength"));
    expect(average(rich.id, "potential")).toBeGreaterThan(average(poor.id, "potential"));
  }, 60000);

  it("o regulador desloca força e potencial dos jovens", () => {
    const base = initialRenewal(testWorld());
    const mean = (renewal: RenewalState) => {
      const fresh = arrivals(generate("regulador", testWorld(), renewal));
      return {
        strength: fresh.reduce((sum, player) => sum + player.strength, 0) / fresh.length,
        potential: fresh.reduce((sum, player) => sum + player.hidden.potential, 0) / fresh.length,
      };
    };
    const neutral = mean(base);
    const boosted = mean({ ...base, regulator: { strengthOffset: 5, potentialBonus: 8 } });
    expect(boosted.strength).toBeGreaterThan(neutral.strength + 3);
    expect(boosted.potential).toBeGreaterThan(neutral.potential + 8);
  });

  it("usa o banco de nomes do país do mod", () => {
    const names = {
      firstNames: Array.from({ length: 20 }, (_, index) => `Zé${index}`),
      surnames: Array.from({ length: 20 }, (_, index) => `Mod${index}`),
    };
    const world = editedWorld((w) => {
      const country = w.countries[0];
      if (country) country.names = names;
    });
    const { arrived } = generate("nomes-mod", world);
    expect(arrived.every((ref) => ref.displayName.startsWith("Zé"))).toBe(true);
  });

  it("a posição carente conta elenco e base (036 R3)", () => {
    const club = testWorld().clubs[0];
    if (!club) throw new Error("sem clube");
    const template = testWorld().players.find((player) => player.clubId === club.id);
    if (!template) throw new Error("sem jogador");
    const { clubId: _c, contract: _k, ...player } = template;
    // Base cheia de goleiros: a safra do clube não traz goleiro.
    const keepers = Array.from({ length: 6 }, (_, index) => ({
      player: { ...player, id: `jogador-9800${index}`, position: "GK" as const },
      clubId: club.id,
      joinedSeason: 1,
    }));
    const renewal = initialRenewal(testWorld());
    const result = generate("carente", testWorld(), {
      ...renewal,
      academy: { ...(renewal.academy ?? emptyAcademy()), players: keepers },
    });
    const fresh = arrivals(result).filter(
      (entry) => entry.clubId === club.id && !entry.id.startsWith("jogador-98"),
    );
    expect(fresh.length).toBeGreaterThan(0);
    expect(fresh.some((entry) => entry.position === "GK")).toBe(false);
  });

  it("base da IA acima do limite manda os de menor utilidade para os livres; a do técnico fica acima (036 FR-009a, FR-012)", () => {
    const club = testWorld().clubs[0];
    if (!club) throw new Error("sem clube");
    const template = testWorld().players.find((player) => player.clubId === club.id);
    if (!template) throw new Error("sem jogador");
    const { clubId: _c, contract: _k, ...player } = template;
    const full = Array.from({ length: ACADEMY_RULES.maxPlayers }, (_, index) => ({
      player: {
        ...player,
        id: `jogador-970${String(index).padStart(2, "0")}`,
        strength: 30 + index,
        birthDate: "2010-01-01",
        hidden: { ...player.hidden, potential: 40 + index },
      },
      clubId: club.id,
      joinedSeason: 1,
    }));
    const renewal = initialRenewal(testWorld());
    const start = {
      ...renewal,
      academy: { ...(renewal.academy ?? emptyAcademy()), players: full },
    };
    const ai = generate("cheia", testWorld(), start);
    const own = (result: ReturnType<typeof generate>) =>
      (result.renewal.academy?.players ?? []).filter((entry) => entry.clubId === club.id);
    expect(own(ai)).toHaveLength(ACADEMY_RULES.maxPlayers);
    expect(ai.released.length).toBe(youthCount(club.reputation));
    expect(ai.released.every((entry) => entry.clubId === club.id)).toBe(true);
    // Sai o mais fraco (jogador-97000 tem a menor utilidade).
    expect(ai.released.map((entry) => entry.player.id)).toContain("jogador-97000");
    const manager = generate("cheia", testWorld(), start, club.id);
    expect(own(manager)).toHaveLength(ACADEMY_RULES.maxPlayers + youthCount(club.reputation));
    expect(manager.released.filter((entry) => entry.clubId === club.id)).toEqual([]);
    expect(generate("cheia", testWorld(), start)).toEqual(ai);
  });
});
