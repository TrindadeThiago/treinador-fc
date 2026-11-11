import { generateWorldBank, type ModPackage, validateBank } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import { createSave, migrateSave } from "../src";

// Os classificados das copas continentais mudam a cada virada: o banco do save pode ter mais
// clubes de um país numa fase de grupos do que há grupos. O sorteio da carreira viola o mínimo e
// avisa (019 FR-014); o save continua legível.
describe("banco vivo com separação por país impossível", () => {
  const bank = structuredClone(
    generateWorldBank({
      seed: "escala-continental",
      countries: 6,
      divisionsPerCountry: 1,
      clubsPerDivision: 12,
      cup: true,
      continental: "full",
    }),
  ) as ModPackage;
  const major = bank.competitions.find((entry) => entry.countryId === undefined);
  const created = createSave({
    id: "continental",
    now: "2026-10-25T12:00:00.000Z",
    managerName: "Ana",
    clubId: major?.divisions[0]?.clubIds[0] ?? "",
    seed: "escala-continental",
    defaultBank: bank,
    noFiring: true,
  });
  if (!created.ok) throw new Error(JSON.stringify(created.error));

  it("abre o save mesmo com mais clubes de um país do que grupos", () => {
    const save = structuredClone(created.save);
    const competition = save.bank.competitions.find((entry) => entry.id === major?.id);
    const format = competition?.format;
    const stages = format && "stages" in format ? format.stages : [];
    const stage = stages.find((entry) => "draw" in entry && entry.draw);
    const entered = new Set(stage?.enter ?? []);
    expect(entered.size).toBeGreaterThan(0);
    const country = save.bank.clubs.find((club) => entered.has(club.id))?.countryId;
    save.bank.clubs = save.bank.clubs.map((club) =>
      entered.has(club.id) && country ? { ...club, countryId: country } : club,
    );
    const issues = validateBank(save.bank);
    expect(issues.ok).toBe(false);
    if (!issues.ok) {
      expect(new Set(issues.errors.map((issue) => issue.code))).toEqual(
        new Set(["stages.separation_impossible"]),
      );
    }
    expect(migrateSave(save).status).toBe("ok");
  });
});
