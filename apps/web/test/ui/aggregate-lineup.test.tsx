// Placar agregado no mata-mata, linha do volante no campo e ícones das características.
import type { LiveMatch, MatchRecord } from "@brasfoot-like/engine";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { aggregateOf, liveAggregate } from "../../src/game/aggregate";
import { label, t } from "../../src/i18n";
import { LineupList } from "../../src/ui/LineupList";
import { Pitch } from "../../src/ui/Pitch";
import { RoundResults } from "../../src/ui/RoundResults";
import { careerSave } from "../helpers/saves";

function liveMatch(tie: { leg: 1 | 2; legs: 1 | 2 } | undefined, withDecider: boolean): LiveMatch {
  return {
    fixture: { home: "a", away: "b", ...(tie ? { tie: { phase: 0, id: "t", ...tie } } : {}) },
    state: {
      score: { home: 1, away: 0 },
      input: withDecider
        ? {
            decider: {
              before: { home: { goals: 0, awayGoals: 0 }, away: { goals: 2, awayGoals: 0 } },
              awayGoals: false,
              extraTime: true,
            },
          }
        : {},
    },
  } as unknown as LiveMatch;
}

describe("placar agregado", () => {
  it("ao vivo, só na volta de um ida e volta: ida somada ao placar da volta", () => {
    expect(liveAggregate(liveMatch({ leg: 2, legs: 2 }, true))).toEqual({ home: 1, away: 2 });
    // Jogo único também tem decider (agregado zerado), mas não tem agregado para mostrar.
    expect(liveAggregate(liveMatch({ leg: 1, legs: 1 }, true))).toBeUndefined();
    expect(liveAggregate(liveMatch({ leg: 1, legs: 2 }, false))).toBeUndefined();
    expect(liveAggregate(liveMatch(undefined, false))).toBeUndefined();
  });

  it("jogo de liga não tem agregado", () => {
    const save = careerSave("agregado-liga");
    const fixture = save.league.divisions[0]?.calendar[0]?.fixtures[0];
    if (!fixture) throw new Error("sem jogo");
    expect(aggregateOf(save, fixture, { home: 1, away: 0 })).toBeUndefined();
  });

  it("os resultados da rodada mostram o agregado sob o placar da volta", () => {
    const save = careerSave("agregado-resultados");
    const [home, away] = save.bank.clubs;
    if (!home || !away) throw new Error("sem clubes");
    const record = { round: 4, home: home.id, away: away.id, score: { home: 2, away: 1 } };
    render(
      <RoundResults
        round={4}
        records={[record as MatchRecord]}
        clubs={save.bank.clubs}
        clubId=""
        aggregate={() => ({ home: 3, away: 3 })}
      />,
    );
    expect(screen.getByText(t("cup.aggregateShort", { home: 3, away: 3 }))).toBeTruthy();
  });
});

describe("campo da escalação", () => {
  it("o volante fica numa linha atrás dos meias", () => {
    const save = careerSave("volante");
    render(
      <Pitch
        lineup={{ ...save.lineup, formation: "4-4-2", starters: {} }}
        players={new Map()}
        unavailable={new Map()}
        onSelect={() => {}}
        onFocusPlayer={() => {}}
      />,
    );
    const positions = screen
      .getAllByRole("button")
      .map((button) => button.querySelector("span")?.textContent);
    const dm = positions.indexOf(label("position.DM"));
    const lastMf = positions.lastIndexOf(label("position.MF"));
    const firstBack = positions.findIndex(
      (text) => text === label("position.FB") || text === label("position.CB"),
    );
    expect(dm).toBeGreaterThan(lastMf);
    expect(dm).toBeLessThan(firstBack);
    // Linhas: ATA, MEI, VOL, defesa e gol.
    expect(screen.getByRole("region").children).toHaveLength(5);
  });

  it("titulares e reservas mostram as características em ícones com o nome", () => {
    const save = careerSave("caracteristicas");
    const squad = save.bank.players.filter((player) => player.clubId === save.clubId);
    const withTraits = squad.filter((player) => player.traits.length > 0);
    const [starter, reserve] = withTraits;
    if (!starter || !reserve) throw new Error("elenco sem características");
    const players = new Map(squad.map((player) => [player.id, player]));
    const lineup = {
      ...save.lineup,
      formation: "4-4-2" as const,
      starters: { ls: starter.id },
      bench: [reserve.id],
    };
    render(
      <>
        <Pitch
          lineup={lineup}
          players={players}
          unavailable={new Map()}
          onSelect={() => {}}
          onFocusPlayer={() => {}}
        />
        <LineupList
          lineup={lineup}
          squad={squad}
          players={players}
          unavailable={new Map()}
          onSelect={() => {}}
          onFocusPlayer={() => {}}
        />
      </>,
    );
    const slot = screen.getByRole("button", { name: new RegExp(starter.displayName) });
    for (const trait of starter.traits) {
      expect(within(slot).getByRole("img", { name: label(`trait.${trait}`) })).toBeTruthy();
    }
    const row = screen.getByRole("button", { name: new RegExp(reserve.displayName) });
    for (const trait of reserve.traits) {
      expect(within(row).getByRole("img", { name: label(`trait.${trait}`) })).toBeTruthy();
    }
  });
});
