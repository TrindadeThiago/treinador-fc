import { describe, expect, it } from "vitest";
import type { TransferRecord } from "../../src/market/types";
import { resaleNews } from "../../src/news/resale";
import { referenceMonthlyPayroll } from "../../src/renewal/academy-levels";
import { MANAGER, marketContext } from "../market/helpers";

// 041 T014: manchete quando o clube do técnico recebe uma revenda relevante.

const context = marketContext();
const base = {
  world: context.world,
  league: context.league,
  careerSeed: context.careerSeed,
  managerClubId: MANAGER,
};
const payroll = referenceMonthlyPayroll(context.world, MANAGER);

function deal(amount: number, creditor = MANAGER, playerId = "j1"): TransferRecord {
  return {
    season: context.league.number,
    round: 3,
    playerId,
    displayName: "Fulano",
    kind: "sale",
    fromClubId: "clube-002",
    toClubId: "clube-003",
    fee: amount * 4,
    resalePaid: { clubId: creditor, amount },
  };
}

describe("manchete de revenda recebida (041)", () => {
  it("sai a partir de uma folha mensal de referência, só para o clube do técnico", () => {
    expect(payroll).toBeGreaterThan(0);
    const big = Math.ceil(payroll / 1000) * 1000;
    const [headline] = resaleNews(base, [deal(big)], 3);
    expect(headline).toMatchObject({
      type: "resaleReceived",
      mine: true,
      clubIds: [MANAGER],
      playerIds: ["j1"],
      vars: {
        player: "Fulano",
        club: MANAGER,
        owner: "clube-002",
        opponent: "clube-003",
        fee: big * 4,
        amount: big,
        cria: "no",
      },
    });
    expect(resaleNews(base, [deal(Math.floor(payroll / 2000) * 1000)], 3)).toEqual([]);
    expect(resaleNews(base, [deal(big, "clube-009")], 3)).toEqual([]);
    expect(resaleNews({ ...base, managerClubId: "" }, [deal(big)], 3)).toEqual([]);
  });

  it("marca a cria da base do clube", () => {
    const big = Math.ceil(payroll / 1000) * 1000;
    const graduates = { j1: { clubId: MANAGER, season: 1 } } as never;
    const [headline] = resaleNews({ ...base, graduates }, [deal(big)], 3);
    expect(headline?.vars.cria).toBe("yes");
  });
});
