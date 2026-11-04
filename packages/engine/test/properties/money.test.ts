import { describe, expect, it } from "vitest";
import { advanceCareer } from "../../src/career/day";
import type { FinanceState } from "../../src/finance/types";
import { completeLoan, completeTransfer } from "../../src/market/effects";
import { squadLimit } from "../../src/market/squad";
import type { MarketContext } from "../../src/market/types";
import { SQUAD_RULES } from "../../src/renewal/rules";
import { applied, marketContext, totalCash } from "../market/helpers";
import { forCases } from "./cases";

/** Para cada clube: caixa − caixa do início da temporada = soma do livro-caixa dele. */
function ledgerMismatches(finances: FinanceState): string[] {
  const sums = new Map<string, number>();
  for (const entry of finances.ledger) {
    sums.set(entry.clubId, (sums.get(entry.clubId) ?? 0) + entry.amount);
  }
  return Object.values(finances.clubs)
    .filter((club) => club.cash - club.seasonStartCash !== (sums.get(club.clubId) ?? 0))
    .map((club) => club.clubId);
}

function squadSize(context: MarketContext, clubId: string): number {
  return context.world.players.filter((player) => player.clubId === clubId).length;
}

describe("propriedades do dinheiro", () => {
  it("transferências e empréstimos aleatórios não criam dinheiro e respeitam os elencos", () => {
    forCases("mercado", 12, (rng, label) => {
      let context = marketContext();
      const start = totalCash(context);
      const clubs = Object.keys(context.finances.clubs).sort();
      let done = 0;
      for (let step = 0; step < 40; step++) {
        const player = rng.pick(context.world.players);
        const toClubId = rng.pick(clubs.filter((id) => id !== player.clubId));
        const fromClubId = player.clubId;
        const fromBefore = squadSize(context, fromClubId);
        const fee = rng.int(0, 3_000_000);
        const result =
          rng.int(0, 3) === 0
            ? completeLoan(context, { playerId: player.id, toClubId, fee })
            : completeTransfer(context, { playerId: player.id, toClubId, fee });
        if (!result.ok) continue;
        done++;
        context = applied(context, result.value);
        expect(totalCash(context), label).toBe(start);
        expect(ledgerMismatches(context.finances), label).toEqual([]);
        const ids = context.world.players.map((entry) => entry.id);
        expect(new Set(ids).size, label).toBe(ids.length);
        expect(squadSize(context, toClubId), label).toBeLessThanOrEqual(
          squadLimit(toClubId, context.managerClubId),
        );
        if (fromBefore > SQUAD_RULES.min) {
          expect(squadSize(context, fromClubId), label).toBeGreaterThanOrEqual(SQUAD_RULES.min);
        }
      }
      // Os casos precisam exercitar o mercado de verdade, não só ser recusados.
      expect(done, label).toBeGreaterThan(0);
    });
  });

  it("uma temporada inteira: o caixa de cada clube fecha com o livro-caixa", () => {
    const context = marketContext();
    const played = advanceCareer(
      context.league,
      context.finances,
      context.world,
      { toEnd: true },
      context.managerClubId,
    );
    expect(played.ok).toBe(true);
    if (!played.ok) return;
    expect(played.finances.ledger.length).toBeGreaterThan(0);
    expect(ledgerMismatches(played.finances)).toEqual([]);
  });
});
