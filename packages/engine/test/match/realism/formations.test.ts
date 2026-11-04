import { describe, expect, it } from "vitest";
import {
  FORMATION_IDS,
  type FormationId,
  PREFERRED_FORMATION_IDS,
} from "../../../src/match/formations";
import { MATCH_REALISM_LIMITS as L } from "../../../src/match/limits";
import { clubIds, squadOf } from "../helpers/teams";
import { cloneSquad, emptyOutcome, play, record, team } from "./harness";

const CLUBS = clubIds().slice(0, 15);
const PER_CLUB = 100;
/** Saldo máximo (vitórias − derrotas, em fração dos jogos) contra o mesmo elenco no 4-4-2. */
const MAX_BALANCE = 0.1;

/** Os esquemas que só o técnico escolhe: os do computador já são medidos nos outros testes. */
const MANAGER_ONLY = FORMATION_IDS.filter((id) => !PREFERRED_FORMATION_IDS.includes(id));

/** O mesmo elenco no esquema `formation` contra a cópia dele no 4-4-2, alternando o mando. */
function mirror(formation: FormationId) {
  const outcome = emptyOutcome();
  let shots = 0;
  let possession = 0;
  for (const clubId of CLUBS) {
    const squad = squadOf(clubId);
    const a = team(`${clubId}-a`, cloneSquad(squad, "a-", `${clubId}-a`), formation);
    const b = team(`${clubId}-b`, cloneSquad(squad, "b-", `${clubId}-b`), "4-4-2");
    for (let index = 0; index < PER_CLUB; index++) {
      const aIsHome = index % 2 === 0;
      const result = play({
        home: aIsHome ? a : b,
        away: aIsHome ? b : a,
        seed: `esquema:${clubId}:${index}`,
      });
      record(outcome, result, aIsHome);
      shots += result.stats.home.shots + result.stats.away.shots;
      possession += aIsHome ? result.stats.home.possession : result.stats.away.possession;
    }
  }
  const matches = outcome.matches;
  return {
    goals: (outcome.goalsFor + outcome.goalsAgainst) / matches,
    balance: (outcome.wins - outcome.losses) / matches,
    shots: shots / matches,
    possession: possession / matches,
  };
}

describe("esquemas do técnico: realismo e equilíbrio", () => {
  it.each(MANAGER_ONLY)(
    "%s fica dentro das faixas de realismo e não domina o mesmo elenco no 4-4-2",
    (formation) => {
      const result = mirror(formation);
      const [minGoals, maxGoals] = L.goalsPerMatch;
      const [minShots, maxShots] = L.shotsPerMatch;
      expect(result.goals).toBeGreaterThanOrEqual(minGoals);
      expect(result.goals).toBeLessThanOrEqual(maxGoals);
      expect(result.shots).toBeGreaterThanOrEqual(minShots);
      expect(result.shots).toBeLessThanOrEqual(maxShots);
      expect(Math.abs(result.balance), `saldo ${result.balance.toFixed(3)}`).toBeLessThanOrEqual(
        MAX_BALANCE,
      );
      expect(result.possession).toBeGreaterThan(45);
      expect(result.possession).toBeLessThan(55);
    },
    120_000,
  );
});
