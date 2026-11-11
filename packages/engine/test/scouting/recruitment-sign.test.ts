import { describe, expect, it } from "vitest";
import type { CareerSeasonState } from "../../src/career/season-state";
import { promoteFromAcademy } from "../../src/renewal/academy";
import { academyLimit } from "../../src/renewal/academy-levels";
import { playerId } from "../../src/renewal/youth";
import { generateOffers, signOffer } from "../../src/scouting/recruitment";
import type { ScoutingRegion, ScoutingState } from "../../src/scouting/types";
import { managerOf, openState, regionWorld, SEED } from "./recruitment-helpers";

// 040 US2: trazer um indicado (vaga, caixa, estrangeiros) e o limite na promoção.

const abroad = () => regionWorld().countries[1]?.id ?? "";
const home = () => regionWorld().countries[0]?.id ?? "";

function withOffers(state: CareerSeasonState, region: ScoutingRegion): CareerSeasonState {
  const scouting = generateOffers(
    { ...(state.scouting as ScoutingState), region },
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

function withCash(state: CareerSeasonState, cash: number): CareerSeasonState {
  const manager = managerOf(state);
  const club = state.finances.clubs[manager];
  if (!club) throw new Error("sem finanças");
  return {
    ...state,
    finances: {
      ...state.finances,
      clubs: { ...state.finances.clubs, [manager]: { ...club, cash } },
    },
  };
}

function withForeignLimit(state: CareerSeasonState, limit: number): CareerSeasonState {
  return {
    ...state,
    world: {
      ...state.world,
      countries: state.world.countries.map((country) =>
        country.id === home() ? { ...country, rules: { foreignLimit: limit } } : country,
      ),
    },
  };
}

describe("trazer para a base (040 FR-005, FR-007)", () => {
  it("cria 1 jogador na base com id real, faixa e origem; custo em scouting", () => {
    const state = withCash(
      withOffers(openState(5), { kind: "country", countryId: home() }),
      50_000_000,
    );
    const offer = state.scouting?.offers?.[0];
    if (!offer || !state.renewal) throw new Error("sem indicação");
    const seq = state.renewal.nextPlayerSeq;
    const base = state.renewal.academy?.players.length ?? 0;
    const result = signOffer(state, offer.id);
    if (!result.ok) throw new Error(JSON.stringify(result));
    const next = result.state;
    expect(next.renewal?.nextPlayerSeq).toBe(seq + 1);
    expect(next.renewal?.academy?.players).toHaveLength(base + 1);
    const entry = next.renewal?.academy?.players.find((item) => item.player.id === playerId(seq));
    expect(entry?.clubId).toBe(managerOf(state));
    expect(entry?.estimate).toEqual(offer.estimate);
    expect(entry?.origin).toEqual({
      kind: "scouted",
      region: offer.region,
      season: state.league.number,
    });
    expect(next.scouting?.offers?.some((item) => item.id === offer.id)).toBe(false);
    const charge = next.finances.ledger.filter((item) => item.category === "scouting");
    expect(charge.map((item) => item.amount)).toEqual([-offer.cost]);
  });

  it("recusa sem vaga, sem caixa e com estrangeiro acima do limite (contando a base)", () => {
    const base = withOffers(openState(5), { kind: "country", countryId: abroad() });
    const offer = base.scouting?.offers?.[0];
    if (!offer || !base.renewal) throw new Error("sem indicação");
    const poor = signOffer(withCash(base, 0), offer.id);
    expect(poor).toMatchObject({
      ok: false,
      error: "scouting.insufficient_cash",
      params: { missing: offer.cost },
    });
    const rich = withCash(base, 50_000_000);
    const manager = managerOf(rich);
    const limit = academyLimit(rich.renewal, rich.world, manager);
    const filler = rich.renewal?.academy?.players.find((entry) => entry.clubId === manager);
    if (!filler || !rich.renewal?.academy) throw new Error("base vazia");
    const full: CareerSeasonState = {
      ...rich,
      renewal: {
        ...rich.renewal,
        academy: {
          ...rich.renewal.academy,
          players: [
            ...rich.renewal.academy.players.filter((entry) => entry.clubId !== manager),
            ...Array.from({ length: limit }, (_, index) => ({
              ...filler,
              player: { ...filler.player, id: `jogador-cheio-${index}` },
            })),
          ],
        },
      },
    };
    expect(signOffer(full, offer.id)).toMatchObject({ ok: false, error: "scouting.academy_full" });
    // Limite de estrangeiros: com o elenco já cheio de estrangeiros (limite 0), não traz.
    expect(signOffer(withForeignLimit(rich, 0), offer.id)).toMatchObject({
      ok: false,
      error: "scouting.foreign_limit",
    });
  });
});

describe("limite de estrangeiros na promoção (040 FR-008)", () => {
  it("captado estrangeiro com o elenco no limite não sobe; jovem da safra sobe", () => {
    const state = withCash(
      withOffers(openState(5), { kind: "country", countryId: abroad() }),
      50_000_000,
    );
    const offer = state.scouting?.offers?.[0];
    if (!offer) throw new Error("sem indicação");
    const signed = signOffer(state, offer.id);
    if (!signed.ok || !signed.playerId) throw new Error(JSON.stringify(signed));
    const limited = withForeignLimit(signed.state, 0);
    const manager = managerOf(limited);
    expect(promoteFromAcademy(limited, manager, signed.playerId, SEED)).toEqual({
      ok: false,
      error: "academy.foreign_limit",
    });
    const local = limited.renewal?.academy?.players.find(
      (entry) => entry.clubId === manager && !entry.origin,
    );
    if (!local) throw new Error("sem jovem da safra");
    expect(promoteFromAcademy(limited, manager, local.player.id, SEED).ok).toBe(true);
    const promoted = promoteFromAcademy(signed.state, manager, signed.playerId, SEED);
    if (!promoted.ok) throw new Error(JSON.stringify(promoted));
    expect(promoted.state.renewal?.academy?.graduates[signed.playerId]?.origin?.kind).toBe(
      "scouted",
    );
  });
});
