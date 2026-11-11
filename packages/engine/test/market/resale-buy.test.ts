import { describe, expect, it } from "vitest";
import { ageOn, seasonDate } from "../../src/calendar/date";
import { signedThisSeason } from "../../src/market/ai/offers";
import { aiMarketRound } from "../../src/market/ai/round";
import { buyAskingPrice } from "../../src/market/club-response";
import { answerClubCounter, proposeContract, startNegotiation } from "../../src/market/negotiation";
import { wageDemand } from "../../src/market/player-response";
import { DEFAULT_RESALE, feeWithResale } from "../../src/market/resale";
import { canAddPlayer, canRemovePlayer } from "../../src/market/squad";
import type { MarketContext } from "../../src/market/types";
import type { CompletedPlayer } from "../../src/model/types";
import { applied, contextAfter, MANAGER, marketContext, totalCash, YEAR } from "./helpers";

// 041 US3 (T016): a IA pede cláusula nos jovens que vende ao técnico; ele aceita ou recusa.

const open = marketContext();
const date = seasonDate(open.world.manifest.referenceDate, YEAR);

function targetAged(test: (age: number) => boolean): CompletedPlayer {
  const player = open.world.players.find(
    (entry) =>
      entry.clubId !== MANAGER &&
      test(ageOn(entry.birthDate, date)) &&
      !entry.contract?.loan &&
      canAddPlayer(open.world, MANAGER, entry.position, MANAGER) &&
      canRemovePlayer(open.world, entry.clubId, entry.id) &&
      buyAskingPrice(open, entry) <= (open.finances.clubs[MANAGER]?.cash ?? 0) / 2,
  );
  if (!player) throw new Error("sem alvo");
  return player;
}

const young = targetAged((age) => age === 19);
const older = targetAged((age) => age === 22);

/** Abre a compra pela pedida (o clube aceita) e devolve o contexto na etapa do contrato. */
function agreed(player: CompletedPlayer) {
  const fee = buyAskingPrice(open, player);
  const step = startNegotiation(open, { kind: "buy", playerId: player.id, fee });
  if (!step.ok) throw new Error(JSON.stringify(step.error));
  expect(step.value.clubResponse).toEqual({ kind: "accepted" });
  const negotiation = step.value.negotiation;
  if (!negotiation) throw new Error("sem negociação");
  return { ctx: applied(open, step.value.update), negotiation, fee };
}

function conclude(ctx: MarketContext, id: string, player: CompletedPlayer, acceptResale?: boolean) {
  const wage = wageDemand(open, player, MANAGER);
  const result = proposeContract(ctx, id, {
    wage,
    years: 3,
    ...(acceptResale === undefined ? {} : { acceptResale }),
  });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return applied(ctx, result.value.update);
}

describe("compra com cláusula pedida pela IA (041 US3)", () => {
  it("o clube pede 20% num jogador de 19 anos e nada num de 22", () => {
    expect(agreed(young).negotiation.resaleAsk).toEqual({ pct: 20 });
    expect(agreed(older).negotiation.resaleAsk).toBeUndefined();
  });

  it("aceitar paga o valor com desconto e cria a cláusula a favor do vendedor", () => {
    const { ctx, negotiation, fee } = agreed(young);
    const before = ctx.finances.clubs[MANAGER]?.cash ?? 0;
    const after = conclude(ctx, negotiation.id, young, true);
    const net = feeWithResale(fee, 20, DEFAULT_RESALE);
    expect(after.finances.clubs[MANAGER]?.cash).toBe(before - net);
    expect(after.market.resale?.clauses).toEqual([
      expect.objectContaining({
        playerId: young.id,
        creditorClubId: young.clubId,
        toClubId: MANAGER,
        pct: 20,
        fee: net,
      }),
    ]);
    expect(totalCash(after)).toBe(totalCash(ctx));
  });

  it("recusar paga o valor cheio e não cria cláusula", () => {
    const { ctx, negotiation, fee } = agreed(young);
    const before = ctx.finances.clubs[MANAGER]?.cash ?? 0;
    const after = conclude(ctx, negotiation.id, young, false);
    expect(after.finances.clubs[MANAGER]?.cash).toBe(before - fee);
    expect(after.market.resale).toBeUndefined();
    // Sem escolha explícita, também não há cláusula.
    const plain = conclude(ctx, negotiation.id, young);
    expect(plain.market.resale).toBeUndefined();
  });

  it("a escolha sobrevive ao pedido de salário do atleta", () => {
    const { ctx, negotiation } = agreed(young);
    const demand = wageDemand(open, young, MANAGER);
    const asked = proposeContract(ctx, negotiation.id, {
      wage: Math.ceil(demand * 0.85),
      years: 3,
      acceptResale: true,
    });
    if (!asked.ok) throw new Error(JSON.stringify(asked.error));
    expect(asked.value.negotiation?.resaleAccepted).toBe(true);
  });

  it("a contraproposta do clube mantém o pedido de cláusula", () => {
    const fee = Math.floor((buyAskingPrice(open, young) * 0.8) / 1000) * 1000;
    const step = startNegotiation(open, { kind: "buy", playerId: young.id, fee });
    if (!step.ok) throw new Error(JSON.stringify(step.error));
    if (step.value.clubResponse?.kind !== "countered") return;
    const ctx = applied(open, step.value.update);
    const accepted = answerClubCounter(ctx, step.value.negotiation?.id ?? "", true);
    if (!accepted.ok) throw new Error(JSON.stringify(accepted.error));
    expect(accepted.value.negotiation?.resaleAsk).toEqual({ pct: 20 });
  });

  it("carência do A2b: o jogador comprado com cláusula não recebe proposta na temporada", () => {
    const { ctx, negotiation } = agreed(young);
    const after = conclude(ctx, negotiation.id, young, true);
    expect(signedThisSeason(after).has(young.id)).toBe(true);
  });
});

describe("IA × IA não cria cláusula (041 FR-008)", () => {
  it("uma rodada da IA não cria cláusulas e dá o mesmo resultado com o estado vazio", () => {
    const ctx = contextAfter(1);
    const plain = aiMarketRound(ctx);
    const empty = aiMarketRound({
      ...ctx,
      market: { ...ctx.market, resale: { clauses: [], receipts: [], nextSeq: 1 } },
    });
    expect(plain.market.resale).toBeUndefined();
    expect(empty.market.resale?.clauses).toEqual([]);
    expect(empty.world).toEqual(plain.world);
    expect(empty.finances).toEqual(plain.finances);
    expect(empty.market.log).toEqual(plain.market.log);
  });
});
