import { describe, expect, it } from "vitest";
import { commissionQuote, wageWithCommission } from "../../src/agents/commission";
import { completeRenewal, completeTransfer } from "../../src/market/effects";
import {
  answerPlayerDemand,
  proposeContract,
  startNegotiation,
} from "../../src/market/negotiation";
import { attraction, exigency, respondToContract } from "../../src/market/player-response";
import { marketRules } from "../../src/market/rules";
import { canAddPlayer, canRemovePlayer } from "../../src/market/squad";
import type { MarketContext } from "../../src/market/types";
import type { CompletedPlayer } from "../../src/model/types";
import {
  applied,
  commissionsPaid,
  contractWorld,
  MANAGER,
  marketContext,
  totalCash,
} from "./helpers";

// 042 US1 (T011): a comissão do empresário na assinatura e na resposta do jogador.

// Clube do técnico de reputação baixa: há jogadores sem interesse nele.
const open = marketContext({
  world: contractWorld((world) => {
    const club = world.clubs.find((entry) => entry.id === MANAGER);
    if (club) club.reputation = 5;
  }),
});
const margin = marketRules(open.world, open.league.competitionId).player.interestMargin;

/** Um jogador comprável, com ou sem falta de interesse no clube do técnico. */
function target(predicate: (gap: number, quote: ReturnType<typeof commissionQuote>) => boolean) {
  const player = open.world.players.find((entry) => {
    if (entry.clubId === MANAGER || entry.contract?.loan) return false;
    if (!canAddPlayer(open.world, MANAGER, entry.position, MANAGER)) return false;
    if (!canRemovePlayer(open.world, entry.clubId, entry.id)) return false;
    const gap = exigency(entry) - margin - attraction(open, MANAGER);
    return predicate(gap, commissionQuote(open, entry, MANAGER, false));
  });
  if (!player) throw new Error("sem jogador");
  return player;
}

const reachable = target((gap, quote) => gap > 0 && quote?.min !== undefined);
const interested = target((gap) => gap <= -5);

/** Compra aceita pelo clube: o contexto na etapa do contrato. */
function atContract(ctx: MarketContext, player: CompletedPlayer) {
  const step = startNegotiation(ctx, { kind: "buy", playerId: player.id, fee: 50_000_000 });
  if (!step.ok || step.value.negotiation?.stage !== "contract") {
    throw new Error(JSON.stringify(step.ok ? step.value.clubResponse : step.error));
  }
  return { ctx: applied(ctx, step.value.update), id: step.value.negotiation.id };
}

/** Contexto com caixa de sobra para o clube do técnico. */
function rich(): MarketContext {
  const club = open.finances.clubs[MANAGER];
  if (!club) throw new Error("sem finanças");
  return {
    ...open,
    finances: {
      ...open.finances,
      clubs: { ...open.finances.clubs, [MANAGER]: { ...club, cash: 900_000_000 } },
    },
  };
}

describe("comissão nos efeitos (042 R3)", () => {
  it("compra e renovação lançam a comissão só no clube que contrata", () => {
    const player = interested;
    const done = completeTransfer(rich(), {
      playerId: player.id,
      toClubId: MANAGER,
      fee: 1_000_000,
      commission: 120_000,
    });
    if (!done.ok) throw new Error(JSON.stringify(done.error));
    const entries = done.value.finances.ledger.filter((entry) => entry.category === "commission");
    expect(entries).toEqual([
      expect.objectContaining({ clubId: MANAGER, amount: -120_000, category: "commission" }),
    ]);
    expect(totalCash(done.value)).toBe(totalCash(rich()) - 120_000);
    expect(done.value.market.log.at(-1)).toMatchObject({
      commission: 120_000,
      agentId: expect.stringMatching(/^agent-/),
    });
    const own = open.world.players.find((entry) => entry.clubId === MANAGER);
    if (!own?.contract) throw new Error("sem jogador");
    const renewed = completeRenewal(rich(), {
      playerId: own.id,
      contract: { wage: own.contract.wage, untilYear: own.contract.untilYear + 2 },
      commission: 30_000,
    });
    if (!renewed.ok) throw new Error(JSON.stringify(renewed.error));
    expect(commissionsPaid(renewed.value)).toBe(30_000);
  });

  it("sem caixa para taxa + comissão, a compra falha com o total", () => {
    const cash = open.finances.clubs[MANAGER]?.cash ?? 0;
    const done = completeTransfer(open, {
      playerId: interested.id,
      toClubId: MANAGER,
      fee: cash - 1000,
      commission: 5000,
    });
    expect(done).toMatchObject({
      ok: false,
      error: { code: "market.insufficient_cash", params: { needed: cash + 4000 } },
    });
  });
});

describe("resposta do jogador com comissão (042 R2)", () => {
  it("sem interesse: abaixo da mínima recusa com ela; com a mínima responde pelo salário", () => {
    const quote = commissionQuote(open, reachable, MANAGER, false);
    if (!quote?.min) throw new Error("sem mínima");
    const wage = quote.wageDemand;
    expect(respondToContract(open, reachable, MANAGER, wage)).toEqual({
      kind: "refused",
      reason: "no_interest",
      minCommission: quote.min,
    });
    expect(
      respondToContract(open, reachable, MANAGER, wage, false, { commission: quote.min - 1000 }),
    ).toMatchObject({ reason: "no_interest" });
    expect(
      respondToContract(open, reachable, MANAGER, wage, false, { commission: quote.min, years: 3 }),
    ).toEqual({ kind: "accepted" });
  });

  it("fora do alcance da influência, nem a comissão convence", () => {
    const far = open.world.players.find(
      (entry) =>
        entry.clubId !== MANAGER &&
        commissionQuote(open, entry, MANAGER, false)?.unreachable === true,
    );
    if (!far) return;
    expect(
      respondToContract(open, far, MANAGER, 99_000_000, false, { commission: 999_000_000 }),
    ).toEqual({ kind: "refused", reason: "no_interest" });
  });

  it("com interesse, a comissão acima da pedida baixa o salário pedido até o teto", () => {
    const quote = commissionQuote(open, interested, MANAGER, false);
    if (!quote) throw new Error("sem empresário");
    const lower = wageWithCommission(open, quote, quote.ref + 2_000_000, 2);
    expect(lower).toBeLessThan(quote.wageDemand);
    expect(lower).toBeGreaterThanOrEqual(Math.floor(quote.wageDemand * 0.85) - 100);
    expect(
      respondToContract(open, interested, MANAGER, lower, false, {
        commission: quote.ref + 2_000_000,
        years: 2,
      }),
    ).toEqual({ kind: "accepted" });
    // Sem comissão, a mesma oferta não basta (FR-011: a regra de antes).
    expect(respondToContract(open, interested, MANAGER, lower).kind).not.toBe("accepted");
  });
});

describe("comissão na negociação do técnico (042 US1)", () => {
  it("o jogador sem interesse assina com a comissão mínima, paga em Comissões (SC-001)", () => {
    const { ctx, id } = atContract(rich(), reachable);
    const quote = commissionQuote(ctx, reachable, MANAGER, false);
    if (!quote?.min) throw new Error("sem mínima");
    const done = proposeContract(ctx, id, {
      wage: quote.wageDemand * 2,
      years: 2,
      commission: quote.min,
    });
    if (!done.ok) throw new Error(JSON.stringify(done.error));
    expect(done.value.negotiation).toBeUndefined();
    expect(commissionsPaid(done.value.update)).toBe(quote.min);
  });

  it("sem comissão, paga a de referência; a comissão sobrevive ao pedido de salário", () => {
    const { ctx, id } = atContract(rich(), interested);
    const quote = commissionQuote(ctx, interested, MANAGER, false);
    if (!quote) throw new Error("sem empresário");
    const plain = proposeContract(ctx, id, { wage: quote.wageDemand * 2, years: 2 });
    if (!plain.ok) throw new Error(JSON.stringify(plain.error));
    expect(commissionsPaid(plain.value.update)).toBe(quote.ref);

    const offered = quote.ref + 50_000;
    const asked = proposeContract(ctx, id, {
      wage: Math.ceil((quote.wageDemand * 0.85) / 100) * 100,
      years: 2,
      commission: offered,
    });
    if (!asked.ok) throw new Error(JSON.stringify(asked.error));
    expect(asked.value.negotiation?.stage).toBe("player_demanded");
    expect(asked.value.negotiation?.commission).toBe(offered);
    const accepted = answerPlayerDemand(
      applied(ctx, asked.value.update),
      asked.value.negotiation?.id ?? "",
      true,
    );
    if (!accepted.ok) throw new Error(JSON.stringify(accepted.error));
    expect(commissionsPaid(accepted.value.update)).toBe(offered);
  });

  it("comissão inválida é recusada", () => {
    const { ctx, id } = atContract(rich(), interested);
    expect(proposeContract(ctx, id, { wage: 1000, years: 2, commission: -1 })).toMatchObject({
      ok: false,
      error: { code: "market.invalid_amount" },
    });
  });
});
