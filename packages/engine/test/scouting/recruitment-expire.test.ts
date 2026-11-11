import { describe, expect, it } from "vitest";
import type { CareerSeasonState } from "../../src/career/season-state";
import {
  declineOffer,
  generateOffers,
  recruitmentAfterRound,
} from "../../src/scouting/recruitment";
import { setScoutingLevel, settledScouting } from "../../src/scouting/state";
import type { ScoutingState } from "../../src/scouting/types";
import { managerOf, openState, regionWorld, SEED, worldIds } from "./recruitment-helpers";

// 040 US3: indicações recusadas, vencidas ou canceladas somem sem deixar jogador no mundo.

const region = () => ({
  kind: "country" as const,
  countryId: regionWorld().countries[1]?.id ?? "",
});

function withOffers(level = 5): CareerSeasonState {
  const state = openState(level);
  const scouting = generateOffers(
    { ...(state.scouting as ScoutingState), region: region() },
    {
      world: state.world,
      renewal: state.renewal as NonNullable<CareerSeasonState["renewal"]>,
      careerSeed: SEED,
      managerClubId: managerOf(state),
      season: state.league.number,
      round: 4,
      expiresRound: 7,
      year: state.league.year,
    },
  );
  return { ...state, scouting };
}

describe("nada no mundo (040 SC-001)", () => {
  it("recusar, vencer, fechar e trocar de clube removem as indicações sem criar jogadores", () => {
    const state = withOffers();
    const ids = worldIds(state);
    const seq = state.renewal?.nextPlayerSeq;
    const offers = state.scouting?.offers ?? [];
    expect(offers.length).toBeGreaterThan(1);
    const declined = declineOffer(state, offers[0]?.id ?? "");
    if (!declined.ok) throw new Error("recusa falhou");
    expect(declined.state.scouting?.offers).toHaveLength(offers.length - 1);
    const expired = recruitmentAfterRound(state.scouting as ScoutingState, {
      world: state.world,
      renewal: state.renewal as NonNullable<CareerSeasonState["renewal"]>,
      careerSeed: SEED,
      managerClubId: managerOf(state),
      season: state.league.number,
      year: state.league.year,
      played: 8,
      marketRules: {} as never,
      windows: [],
    });
    expect(expired.offers).toEqual([]);
    const closed = setScoutingLevel(state, 0);
    if (!closed.ok) throw new Error("fechar falhou");
    expect(closed.state.scouting?.offers).toBeUndefined();
    expect(closed.state.scouting?.region).toBeUndefined();
    const moved = settledScouting(state.scouting, "outro-clube");
    expect(moved.offers).toBeUndefined();
    for (const next of [declined.state, closed.state, { ...state, scouting: expired }]) {
      expect(worldIds(next)).toEqual(ids);
      expect(next.renewal?.nextPlayerSeq).toBe(seq);
    }
  });

  it("baixar o nível (sem fechar) mantém as indicações já recebidas", () => {
    const state = withOffers(5);
    const lowered = setScoutingLevel(state, 1);
    if (!lowered.ok) throw new Error("baixar falhou");
    expect(lowered.state.scouting?.offers).toEqual(state.scouting?.offers);
  });
});

describe("captado que passa da idade-limite (040, regra da 036)", () => {
  it("sai como livre com a nacionalidade dele", async () => {
    const { academyFreeAgent } = await import("../../src/renewal/academy");
    const state = withOffers();
    const offer = state.scouting?.offers?.[0];
    if (!offer) throw new Error("sem indicação");
    const agent = academyFreeAgent(
      { player: offer.player, clubId: managerOf(state), joinedSeason: 1 },
      state.league.year,
    );
    expect(agent.player.nationalityId).toBe(region().countryId);
  });
});
