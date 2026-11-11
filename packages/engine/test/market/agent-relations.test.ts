import { describe, expect, it } from "vitest";
import { commissionQuote } from "../../src/agents/commission";
import { capCommission } from "../../src/agents/formula";
import { bumpRelation, relationOf } from "../../src/agents/relations";
import { agentOf } from "../../src/agents/roster";
import { DEFAULT_AGENTS } from "../../src/agents/rules";
import { terminateContract } from "../../src/market/disposal";
import {
  answerPlayerDemand,
  cancelNegotiation,
  proposeContract,
  startNegotiation,
} from "../../src/market/negotiation";
import { canAddPlayer, canRemovePlayer } from "../../src/market/squad";
import type { MarketContext } from "../../src/market/types";
import type { CompletedPlayer } from "../../src/model/types";
import { applied, MANAGER, marketContext } from "./helpers";

// 042 US3 (T016): os eventos mudam a relação; a relação muda a comissão; rompimento = teto.

function rich(): MarketContext {
  const base = marketContext();
  const club = base.finances.clubs[MANAGER];
  if (!club) throw new Error("sem finanças");
  return {
    ...base,
    finances: {
      ...base.finances,
      clubs: { ...base.finances.clubs, [MANAGER]: { ...club, cash: 900_000_000 } },
    },
  };
}

const open = rich();
const buyable = open.world.players.filter(
  (entry) =>
    entry.clubId !== MANAGER &&
    !entry.contract?.loan &&
    canAddPlayer(open.world, MANAGER, entry.position, MANAGER) &&
    canRemovePlayer(open.world, entry.clubId, entry.id) &&
    commissionQuote(open, entry, MANAGER, false)?.min === undefined &&
    commissionQuote(open, entry, MANAGER, false)?.unreachable === undefined,
);
const target = buyable[0];
if (!target) throw new Error("sem alvo");
const agentId = agentOf(open.world, open.careerSeed, target)?.id ?? "";

/** Na etapa do contrato de uma compra aceita. */
function atContract(ctx: MarketContext, player: CompletedPlayer = target as CompletedPlayer) {
  const step = startNegotiation(ctx, { kind: "buy", playerId: player.id, fee: 90_000_000 });
  if (!step.ok || step.value.negotiation?.stage !== "contract") throw new Error("sem acordo");
  return { ctx: applied(ctx, step.value.update), id: step.value.negotiation.id };
}

describe("eventos de relação (042 US3)", () => {
  it("contratação concluída: +5", () => {
    const { ctx, id } = atContract(open);
    const quote = commissionQuote(ctx, target, MANAGER, false);
    const done = proposeContract(ctx, id, { wage: (quote?.wageDemand ?? 0) * 2, years: 2 });
    if (!done.ok) throw new Error(JSON.stringify(done.error));
    expect(relationOf(done.value.update.market, MANAGER, agentId)).toBe(55);
    expect(done.value.update.market.agents?.deals.at(-1)).toMatchObject({
      agentId,
      clubId: MANAGER,
      playerId: target.id,
      kind: "buy",
    });
  });

  it("salário pedido recusado: −8", () => {
    const { ctx, id } = atContract(open);
    const quote = commissionQuote(ctx, target, MANAGER, false);
    const asked = proposeContract(ctx, id, {
      wage: Math.ceil(((quote?.wageDemand ?? 0) * 0.85) / 100) * 100,
      years: 2,
    });
    if (!asked.ok || asked.value.negotiation?.stage !== "player_demanded") {
      throw new Error("sem pedido");
    }
    const refused = answerPlayerDemand(applied(ctx, asked.value.update), id, false);
    if (!refused.ok) throw new Error(JSON.stringify(refused.error));
    expect(relationOf(refused.value.update.market, MANAGER, agentId)).toBe(42);
  });

  it("cancelar na etapa do contrato: −4; automático ou na etapa do clube: nada", () => {
    const { ctx, id } = atContract(open);
    expect(relationOf(cancelNegotiation(ctx, id).market, MANAGER, agentId)).toBe(46);
    expect(cancelNegotiation(ctx, id, "window_closed").market.agents).toBeUndefined();
    const low = startNegotiation(open, { kind: "buy", playerId: target.id, fee: 1000 });
    if (!low.ok) throw new Error(JSON.stringify(low.error));
    if (low.value.negotiation?.stage === "club_countered") {
      const atClub = applied(open, low.value.update);
      expect(cancelNegotiation(atClub, low.value.negotiation.id).market.agents).toBeUndefined();
    }
  });

  it("rescisão: −15, e a comissão de outro jogador do mesmo empresário sobe (SC-002)", () => {
    const own = open.world.players.find(
      (entry) =>
        entry.clubId === MANAGER &&
        canRemovePlayer(open.world, MANAGER, entry.id) &&
        agentOf(open.world, open.careerSeed, entry) !== undefined,
    );
    if (!own) throw new Error("sem jogador");
    const ownAgent = agentOf(open.world, open.careerSeed, own)?.id ?? "";
    const other = open.world.players.find(
      (entry) =>
        entry.id !== own.id &&
        entry.clubId !== MANAGER &&
        agentOf(open.world, open.careerSeed, entry)?.id === ownAgent,
    );
    if (!other) throw new Error("sem outro jogador do empresário");
    const before = commissionQuote(open, other, MANAGER, false)?.ref ?? 0;
    const done = terminateContract(open, own.id);
    if (!done.ok) throw new Error(JSON.stringify(done.error));
    const after = applied(open, done.value);
    expect(relationOf(after.market, MANAGER, ownAgent)).toBe(35);
    expect(commissionQuote(after, other, MANAGER, false)?.ref ?? 0).toBeGreaterThan(before);
  });

  it("rompimento: relação 0 pede o teto e registra o rompimento", () => {
    let market = open.market;
    for (let i = 0; i < 4; i++) {
      market = bumpRelation(market, MANAGER, agentId, "terminated", DEFAULT_AGENTS, {
        season: 1,
        round: 2,
      }).market;
    }
    const ctx = { ...open, market };
    expect(relationOf(market, MANAGER, agentId)).toBe(0);
    const quote = commissionQuote(ctx, target, MANAGER, false);
    expect(quote?.ref).toBe(capCommission(quote?.wageDemand ?? 0, DEFAULT_AGENTS));
    expect(market.agents?.ruptures).toEqual([
      { agentId, clubId: MANAGER, reason: "terminated", season: 1, round: 2 },
    ]);
  });

  it("clubes da IA nunca ganham relação", () => {
    const { ctx, id } = atContract(open);
    const quote = commissionQuote(ctx, target, MANAGER, false);
    const done = proposeContract(ctx, id, { wage: (quote?.wageDemand ?? 0) * 2, years: 2 });
    if (!done.ok) throw new Error(JSON.stringify(done.error));
    expect(Object.keys(done.value.update.market.agents?.relations ?? {})).toEqual([MANAGER]);
  });
});
