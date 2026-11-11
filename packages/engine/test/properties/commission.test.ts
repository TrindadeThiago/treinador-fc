import { describe, expect, it } from "vitest";
import { wageAfterCommission } from "../../src/agents/formula";
import { DEFAULT_AGENTS } from "../../src/agents/rules";
import { terminateContract } from "../../src/market/disposal";
import { completeRenewal, completeTransfer } from "../../src/market/effects";
import { canAddPlayer, canRemovePlayer } from "../../src/market/squad";
import type { MarketContext } from "../../src/market/types";
import { applied, commissionsPaid, MANAGER, marketContext, totalCash } from "../market/helpers";
import { forCases } from "./cases";

// 042 T023 (research R8): a comissão sai do mundo e não volta; trocar comissão por salário nunca
// dá lucro; comprar e vender com comissão nunca rende mais que sem.

function rich(): MarketContext {
  const base = marketContext();
  const clubs = Object.fromEntries(
    Object.entries(base.finances.clubs).map(([id, club]) => [id, { ...club, cash: 900_000_000 }]),
  );
  return { ...base, finances: { ...base.finances, clubs } };
}

describe("dinheiro com comissões (042 SC-003)", () => {
  it("transferências e renovações aleatórias: o caixa total cai exatamente pelas comissões", () => {
    forCases("comissao", 10, (rng, label) => {
      let ctx = rich();
      const start = totalCash(ctx);
      const clubs = Object.keys(ctx.finances.clubs).sort();
      for (let step = 0; step < 40; step++) {
        const player = rng.pick(ctx.world.players);
        const commission = rng.int(0, 50) * 1000;
        if (rng.int(0, 3) === 0 && player.contract) {
          const done = completeRenewal(ctx, {
            playerId: player.id,
            contract: { wage: player.contract.wage, untilYear: player.contract.untilYear + 1 },
            commission,
          });
          if (done.ok) ctx = applied(ctx, done.value);
        } else {
          const toClubId = rng.pick(clubs.filter((id) => id !== player.clubId));
          const done = completeTransfer(ctx, {
            playerId: player.id,
            toClubId,
            fee: rng.int(0, 300) * 1000,
            commission,
          });
          if (done.ok) ctx = applied(ctx, done.value);
        }
        expect(totalCash(ctx), label).toBe(start - commissionsPaid(ctx));
      }
    });
  });

  it("vender ou rescindir depois não devolve a comissão", () => {
    const ctx = rich();
    const player = ctx.world.players.find(
      (entry) =>
        entry.clubId !== MANAGER &&
        !entry.contract?.loan &&
        canAddPlayer(ctx.world, MANAGER, entry.position, MANAGER) &&
        canRemovePlayer(ctx.world, entry.clubId, entry.id),
    );
    if (!player) throw new Error("sem jogador");
    const bought = completeTransfer(ctx, {
      playerId: player.id,
      toClubId: MANAGER,
      fee: 1_000_000,
      commission: 200_000,
    });
    if (!bought.ok) throw new Error(JSON.stringify(bought.error));
    const after = applied(ctx, bought.value);
    const released = terminateContract(after, player.id);
    if (!released.ok) throw new Error(JSON.stringify(released.error));
    const end = applied(after, released.value);
    expect(commissionsPaid(end)).toBe(200_000);
    const refunds = end.finances.ledger.filter(
      (entry) => entry.category === "commission" && entry.amount > 0,
    );
    expect(refunds).toEqual([]);
  });

  it("a troca nunca economiza mais salário que a comissão a mais", () => {
    for (const tradePct of [0, 50, 80, 100]) {
      const rules = { ...DEFAULT_AGENTS, tradePct };
      for (const wage of [500, 9_900, 120_000, 3_000_000]) {
        for (const years of [1, 2, 3, 4, 5]) {
          for (const asked of [0, 1_000, 60_000]) {
            for (const commission of [0, 1_000, 33_000, 500_000, 90_000_000]) {
              const after = wageAfterCommission(wage, asked, commission, years, rules);
              const extra = Math.max(0, commission - asked);
              expect((wage - after) * 12 * years).toBeLessThanOrEqual(extra);
              expect(after).toBeLessThanOrEqual(wage);
            }
          }
        }
      }
    }
  });
});
