import { describe, expect, it } from "vitest";
import type { CareerSeasonState } from "../../src/career/season-state";
import { generateOffers } from "../../src/scouting/recruitment";
import type { ScoutingRegion, ScoutingState, ScoutOffer } from "../../src/scouting/types";
import { managerOf, openState, regionWorld, SEED } from "./recruitment-helpers";

// 040 SC-003: país mais forte rende jovens melhores; nível maior, mais indicações e faixa mais
// estreita; um estado rende menos indicações que o país.

const DATES = 200;

function many(state: CareerSeasonState, region: ScoutingRegion): ScoutOffer[] {
  const out: ScoutOffer[] = [];
  for (let date = 0; date < DATES; date++) {
    const scouting = generateOffers(
      { ...(state.scouting as ScoutingState), region, offers: [] },
      {
        world: state.world,
        renewal: state.renewal as NonNullable<CareerSeasonState["renewal"]>,
        careerSeed: `${SEED}:${date}`,
        managerClubId: managerOf(state),
        season: 1,
        round: date + 1,
        expiresRound: date + 4,
        year: state.league.year,
      },
    );
    out.push(...(scouting.offers ?? []));
  }
  return out;
}

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

describe("perfil das indicações (040 SC-003)", () => {
  it("o país de clubes mais fortes rende força e potencial médios maiores", () => {
    // No mundo de teste os países têm quase a mesma reputação; aqui eles ficam bem diferentes,
    // como no mundo padrão (reputação é o que mede a força da região, research R4).
    const base = regionWorld();
    const [strong, , weak] = base.countries.map((country) => country.id);
    const world = {
      ...base,
      clubs: base.clubs.map((club) =>
        club.countryId === strong
          ? { ...club, reputation: Math.min(100, club.reputation + 25) }
          : club.countryId === weak
            ? { ...club, reputation: Math.max(1, club.reputation - 25) }
            : club,
      ),
    };
    const state = openState(3, world);
    const a = many(state, { kind: "country", countryId: strong ?? "" });
    const b = many(state, { kind: "country", countryId: weak ?? "" });
    expect(mean(a.map((offer) => offer.player.strength))).toBeGreaterThan(
      mean(b.map((offer) => offer.player.strength)),
    );
    expect(mean(a.map((offer) => offer.player.hidden.potential))).toBeGreaterThan(
      mean(b.map((offer) => offer.player.hidden.potential)),
    );
  });

  it("nível 5 rende mais indicações e faixa mais estreita que o nível 1; estado rende menos", () => {
    const home = regionWorld().countries[0]?.id ?? "";
    const country: ScoutingRegion = { kind: "country", countryId: home };
    const low = many(openState(1), country);
    const high = many(openState(5), country);
    expect(high.length).toBeGreaterThan(low.length);
    const width = (offers: ScoutOffer[]) =>
      mean(offers.map((offer) => offer.estimate.high - offer.estimate.low));
    expect(width(high)).toBeLessThan(width(low));
    for (const offer of [...low, ...high]) {
      expect(offer.estimate.low).toBeLessThanOrEqual(offer.player.hidden.potential);
      expect(offer.estimate.high).toBeGreaterThanOrEqual(offer.player.hidden.potential);
    }
    const state = many(openState(5), { kind: "state", countryId: home, region: "SP" });
    expect(state.length).toBeLessThan(high.length);
  });
});
