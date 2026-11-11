import { describe, expect, it } from "vitest";
import { agentOf } from "../../src/agents/roster";
import type { MarketState, TransferRecord } from "../../src/market/types";
import { emptyMarket } from "../../src/market/types";
import { agentNews } from "../../src/news/agents";
import { referenceMonthlyPayroll } from "../../src/renewal/academy-levels";
import { MANAGER, marketContext } from "../market/helpers";

// 042 T021: manchetes de rompimento e de negócio grande, só do clube do técnico.

const context = marketContext();
const player = context.world.players.find((entry) => entry.clubId !== MANAGER);
if (!player) throw new Error("sem jogador");
const agent = agentOf(context.world, context.careerSeed, player);
if (!agent) throw new Error("sem empresário");
const payroll = referenceMonthlyPayroll(context.world, MANAGER);
const season = context.league.number;

function base(market: MarketState = emptyMarket()) {
  return {
    world: context.world,
    league: context.league,
    careerSeed: context.careerSeed,
    managerClubId: MANAGER,
    market,
  };
}

function deal(commission: number, toClubId = MANAGER): TransferRecord {
  return {
    season,
    round: 4,
    playerId: player?.id ?? "",
    displayName: "Fulano",
    kind: "buy",
    fromClubId: "clube-009",
    toClubId,
    fee: 1_000_000,
    commission,
    agentId: agent?.id ?? "",
  };
}

describe("manchetes dos empresários (042)", () => {
  it("rompimento na rodada sai com o empresário e o motivo", () => {
    const market: MarketState = {
      ...emptyMarket(),
      agents: {
        relations: {},
        deals: [],
        ruptures: [{ agentId: agent.id, clubId: MANAGER, reason: "terminated", season, round: 4 }],
      },
    };
    const [headline] = agentNews(base(market), [], 4);
    expect(headline).toMatchObject({
      type: "agentBroke",
      mine: true,
      vars: { agent: agent.name, club: MANAGER, reason: "terminated" },
    });
    expect(agentNews(base(market), [], 5)).toEqual([]);
  });

  it("negócio grande a partir de 3 folhas mensais; não abaixo nem de outro clube", () => {
    const big = Math.ceil((payroll * 3) / 1000) * 1000;
    const [headline] = agentNews(base(), [deal(big)], 4);
    expect(headline).toMatchObject({
      type: "agentBigDeal",
      vars: { agent: agent.name, player: "Fulano", club: MANAGER, commission: big },
    });
    expect(agentNews(base(), [deal(Math.floor(payroll))], 4)).toEqual([]);
    expect(agentNews(base(), [deal(big, "clube-003")], 4)).toEqual([]);
    expect(agentNews({ ...base(), managerClubId: "" }, [deal(big)], 4)).toEqual([]);
  });
});
