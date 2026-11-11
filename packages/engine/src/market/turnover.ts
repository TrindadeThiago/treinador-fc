import { aiCommission } from "../agents/commission";
import { decayRelations } from "../agents/relations";
import { agentRules } from "../agents/rules";
import { ageOn } from "../calendar/date";
import type { TurnoverContext, TurnoverStep } from "../career/types";
import { deriveWage } from "../derived/economy";
import { draft, post } from "../finance/ledger";
import type { CompletedPlayer } from "../model/types";
import { playerRef } from "../renewal/retirement";
import { nextSeasonDate, withNotice } from "../renewal/turnover";
import { createRng } from "../rng/xoshiro";
import { aiRenewalDecision } from "./ai/renewals";
import { initialContract } from "./contracts";
import { addFreeAgents, toFreeAgent } from "./free-agents";
import { marketRules } from "./rules";
import type { FreeAgent, MarketState, TransferRecord } from "./types";

/**
 * Etapas do mercado na virada (research.md R12). Sem `market` no contexto (usos só da liga, das
 * finanças ou da renovação), `expire-contracts`, `age-out-free-agents` e `reset-market` não fazem
 * nada; `return-loans` só age em quem tem empréstimo.
 */

/** Empréstimos acabam com a temporada: o jogador volta ao clube de origem (FR-018). */
export const returnLoansStep: TurnoverStep = {
  id: "return-loans",
  run: (context) => {
    const year = context.finished.year;
    if (
      !context.world.players.some(
        (player) => (player.contract?.loan?.untilYear ?? Infinity) <= year,
      )
    ) {
      return context;
    }
    const players = context.world.players.map((player) => {
      const loan = player.contract?.loan;
      if (!player.contract || !loan || loan.untilYear > year) return player;
      const { loan: _loan, ...contract } = player.contract;
      return { ...player, clubId: loan.fromClubId, contract };
    });
    return { ...context, world: { ...context.world, players } };
  },
};

/**
 * Revisão anual dos salários dos clubes da IA (R10): quem evoluiu e ficou com o salário muito abaixo
 * do que vale ganha aumento; ninguém tem o salário cortado. Sem isso, os melhores clubes
 * acumulariam caixa com contratos defasados e a economia da 008 perderia o equilíbrio.
 */
function reviewedWage(
  player: CompletedPlayer,
  clubs: ReadonlyMap<string, TurnoverContext["world"]["clubs"][number]>,
  context: TurnoverContext,
  date: string,
): CompletedPlayer {
  const club = clubs.get(player.clubId);
  if (!club || !player.contract || player.contract.loan) return player;
  if (player.clubId === context.managerClubId) return player;
  const rules = marketRules(context.world, context.finished.competitionId);
  const fair = deriveWage(player, club, date);
  if (player.contract.wage * 100 >= fair * rules.ai.wageReviewPct) return player;
  return { ...player, contract: { ...player.contract, wage: fair } };
}

/**
 * Contratos que terminam com a temporada (FR-004): o clube da IA renova pela regra simples; o do
 * usuário só continua se foi renovado a tempo. Quem não continua vira livre, sem pagamento.
 */
export const expireContractsStep: TurnoverStep = {
  id: "expire-contracts",
  run: (context) => {
    if (!context.market) return context;
    const year = context.finished.year;
    const nextYear = year + 1;
    const date = nextSeasonDate(context);
    const expiringAll = context.world.players.filter(
      (player) => player.contract && player.contract.untilYear <= year,
    );
    if (expiringAll.length === 0) return context;
    const clubIds = [...new Set(expiringAll.map((player) => player.clubId))].sort();
    const renewed = new Map<string, CompletedPlayer>();
    const freed: CompletedPlayer[] = [];
    for (const clubId of clubIds) {
      const club = context.world.clubs.find((entry) => entry.id === clubId);
      const expiring = expiringAll.filter((player) => player.clubId === clubId);
      if (!club) continue;
      if (clubId === context.managerClubId) {
        freed.push(...expiring);
        continue;
      }
      const squad = context.world.players.filter((player) => player.clubId === clubId);
      const keep = aiRenewalDecision(context, squad, expiring, date);
      for (const player of expiring) {
        if (!keep.has(player.id)) {
          freed.push(player);
          continue;
        }
        const rng = createRng(`${context.careerSeed}:renew:${nextYear}:${player.id}`);
        renewed.set(player.id, {
          ...player,
          contract: initialContract(
            player,
            club,
            nextYear,
            context.world.manifest.referenceDate,
            rng,
          ),
        });
      }
    }
    // Comissão do empresário nas renovações da IA (042 R3), na temporada nova (depois do
    // fechamento das finanças, como a manutenção da academia).
    const finances = context.finances ? draft(context.finances) : undefined;
    if (finances && context.market) {
      const marketContext = {
        world: context.world,
        league: context.finished,
        finances: context.finances as NonNullable<typeof context.finances>,
        market: context.market,
        managerClubId: context.managerClubId ?? "",
        careerSeed: context.careerSeed,
      };
      for (const player of [...renewed.values()].sort((a, b) => (a.id < b.id ? -1 : 1))) {
        if (!finances.clubs[player.clubId]) continue;
        const amount = aiCommission(marketContext, player, player.clubId);
        if (amount <= 0) continue;
        post(finances, {
          clubId: player.clubId,
          season: context.finished.number + 1,
          round: 0,
          category: "commission",
          amount: -amount,
        });
      }
    }
    const freedIds = new Set(freed.map((player) => player.id));
    const clubs = new Map(context.world.clubs.map((club) => [club.id, club]));
    const players = context.world.players
      .filter((player) => !freedIds.has(player.id))
      .map((player) => renewed.get(player.id) ?? reviewedWage(player, clubs, context, date));
    const agents: FreeAgent[] = freed.map((player) => toFreeAgent(player, player.clubId, year));
    const log: TransferRecord[] = freed
      .filter((player) => player.clubId === context.managerClubId)
      .map((player) => ({
        season: context.finished.number + 1,
        round: 0,
        playerId: player.id,
        displayName: player.displayName,
        kind: "expired",
        fromClubId: player.clubId,
        fee: 0,
      }));
    const clubOf = new Map(freed.map((player) => [player.id, player.clubId]));
    const market: MarketState = {
      ...addFreeAgents(context.market, agents),
      log: [...context.market.log, ...log],
    };
    return withNotice(
      {
        ...context,
        world: { ...context.world, players },
        market,
        ...(finances ? { finances } : {}),
      },
      "released",
      freed.map((player) => playerRef(player, date)),
      (ref) => clubOf.get(ref.playerId) ?? "",
    );
  },
};

/** Livres que ninguém contratou por uma temporada inteira, ou veteranos, deixam o mercado (R11). */
export const ageOutFreeAgentsStep: TurnoverStep = {
  id: "age-out-free-agents",
  run: (context) => {
    if (!context.market) return context;
    const rules = marketRules(context.world, context.finished.competitionId);
    const date = nextSeasonDate(context);
    const freeAgents = context.market.freeAgents.filter(
      (agent) =>
        context.finished.year - agent.sinceYear < rules.freeAgents.maxSeasons &&
        ageOn(agent.player.birthDate, date) < rules.freeAgents.retireAge,
    );
    return { ...context, market: { ...context.market, freeAgents } };
  },
};

/** Negociações e propostas expiram na virada; fica só o registro desta virada (FR-014). */
export const resetMarketStep: TurnoverStep = {
  id: "reset-market",
  run: (context) => {
    if (!context.market) return context;
    // Relações com empresários voltam devagar ao neutro (042 R4).
    const world = context.world;
    const market = decayRelations(
      context.market,
      (agentId) => agentRules(world, /^agent-(.+)-\d+$/.exec(agentId)?.[1] ?? ""),
      context.finished.number + 1,
    );
    return {
      ...context,
      market: {
        ...market,
        negotiations: [],
        incoming: [],
        log: context.market.log.filter((entry) => entry.season > context.finished.number),
      },
    };
  },
};
