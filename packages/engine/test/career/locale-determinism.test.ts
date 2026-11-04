import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { advanceCareerDays } from "../../src/career/day";
import type { CareerSeasonState } from "../../src/career/season-state";
import { ensureContracts } from "../../src/market/contracts";
import { DEFAULT_PROFILE, generateFootballWorld } from "../../src/worldgen/football-world";
import { completeHiddenAttributes } from "../../src/worldgen/hidden";
import { worldState } from "./world-helpers";

// Princípio II: a mesma seed dá o mesmo resultado em qualquer navegador, qualquer que seja o idioma.
// Com `localeCompare` sem locale fixo, o desempate por id seguia o idioma: em tcheco "ch" vai para
// depois do "h", e os ids da China (`clube-chn-…`, `jogador-chn-…`) mudavam de lugar. No mundo
// padrão, o estado das competições divergia a partir do 20º dia de jogos.
const SEED = "mundo-padrao-1";
const DAYS = 24;
const original = String.prototype.localeCompare;

function play(): string {
  const bank = generateFootballWorld(DEFAULT_PROFILE, SEED);
  const world = ensureContracts(
    completeHiddenAttributes(bank, SEED),
    Number(bank.manifest.referenceDate.slice(0, 4)),
    SEED,
  );
  const manager =
    world.clubs.find((club) => club.countryId === "brasil" && club.reputation > 0)?.id ?? "";
  const start: CareerSeasonState = worldState(world, SEED, manager);
  const played = advanceCareerDays(start, { days: DAYS }, SEED, manager);
  if (!played.ok) throw new Error(JSON.stringify(played.error));
  const { league, competitions, finances } = played.state;
  return createHash("sha256")
    .update(JSON.stringify([league, competitions, finances]))
    .digest("hex");
}

describe("determinismo independente do idioma do navegador", () => {
  afterEach(() => {
    String.prototype.localeCompare = original;
  });

  it("dias de jogos do mundo padrão dão o mesmo estado com a ordem do tcheco", () => {
    const reference = play();
    const czech = new Intl.Collator("cs");
    String.prototype.localeCompare = function (this: string, other: string) {
      return czech.compare(String(this), other);
    };
    expect(play()).toBe(reference);
  }, 180_000);
});
