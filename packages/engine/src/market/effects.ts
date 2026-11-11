import { agentOf } from "../agents/roster";
import { draft, post } from "../finance/ledger";
import type { CompletedBank, CompletedPlayer } from "../model/types";
import { canSignForeign } from "../world/foreign";
import { activeClause, closeClause, openClause, shareOf } from "./resale";
import { canAddPlayer, canRemovePlayer } from "./squad";
import type {
  Contract,
  FreeAgent,
  MarketContext,
  MarketResult,
  MarketState,
  MarketUpdate,
  TransferRecord,
} from "./types";
import { fail } from "./types";
import { roundsPlayed } from "./windows";

/** Estado de partida de qualquer efeito: cópias rasas que podem ser alteradas à vontade. */
function working(context: MarketContext): MarketUpdate {
  return {
    world: { ...context.world, players: [...context.world.players] },
    finances: draft(context.finances),
    market: {
      ...context.market,
      freeAgents: [...context.market.freeAgents],
      negotiations: [...context.market.negotiations],
      incoming: [...context.market.incoming],
      log: [...context.market.log],
    },
    departed: [],
  };
}

function replacePlayer(world: CompletedBank, player: CompletedPlayer): void {
  const index = world.players.findIndex((entry) => entry.id === player.id);
  if (index >= 0) world.players[index] = player;
}

function record(context: MarketContext, entry: Omit<TransferRecord, "season" | "round">) {
  return { season: context.league.number, round: roundsPlayed(context.league), ...entry };
}

/** Lança a taxa: despesa do comprador e receita do vendedor, sem criar dinheiro (R9). */
function postFee(
  context: MarketContext,
  update: MarketUpdate,
  fee: number,
  buyerId: string,
  sellerId: string,
): void {
  const base = { season: context.league.number, round: roundsPlayed(context.league) };
  post(update.finances, { clubId: buyerId, ...base, category: "transfer_purchase", amount: -fee });
  post(update.finances, { clubId: sellerId, ...base, category: "transfer_sale", amount: fee });
}

/**
 * Limite de estrangeiros do país do comprador (020 FR-002a): quem chega com nacionalidade
 * diferente da do clube só entra se o clube ainda tem vaga de estrangeiro.
 */
function foreignProblem(
  world: CompletedBank,
  player: Pick<CompletedPlayer, "nationalityId">,
  buyerId: string,
): MarketResult<never> | undefined {
  const buyer = world.clubs.find((club) => club.id === buyerId);
  if (!buyer || player.nationalityId === buyer.countryId) return undefined;
  if (canSignForeign(world, buyerId)) return undefined;
  const limit = world.countries.find((country) => country.id === buyer.countryId)?.rules
    ?.foreignLimit;
  return fail("market.foreign_limit", { limit: limit ?? 0 });
}

/**
 * Comissão do empresário na assinatura (042 R3): sai do caixa do clube na categoria `commission`,
 * sem contrapartida (o dinheiro sai do mundo, como o salário). Devolve os campos do registro.
 */
function postCommission(
  context: MarketContext,
  update: MarketUpdate,
  clubId: string,
  player: Pick<CompletedPlayer, "id" | "nationalityId">,
  amount: number | undefined,
): Pick<TransferRecord, "commission" | "agentId"> {
  if (!amount || amount <= 0) return {};
  const agent = agentOf(context.world, context.careerSeed, player);
  if (!agent) return {};
  post(update.finances, {
    clubId,
    season: context.league.number,
    round: roundsPlayed(context.league),
    category: "commission",
    amount: -amount,
  });
  // Só os negócios do clube do técnico guardam a comissão no registro (manchetes e lista do
  // Mercado); nos da IA ela fica só no livro-caixa, sem aumentar o save (metas da 020).
  return clubId === context.managerClubId ? { commission: amount, agentId: agent.id } : {};
}

/** Caixa para pagar a comissão (042) numa assinatura sem taxa. */
function commissionCashProblem(
  context: MarketContext,
  clubId: string,
  amount: number | undefined,
): MarketResult<never> | undefined {
  if (!amount || amount <= 0) return undefined;
  if ((context.finances.clubs[clubId]?.cash ?? 0) < amount) {
    return fail("market.insufficient_cash", { needed: amount });
  }
  return undefined;
}

/** Valida caixa e elencos antes de mover jogador e dinheiro. */
function checkTransfer(
  context: MarketContext,
  player: CompletedPlayer,
  buyerId: string,
  fee: number,
): MarketResult<never> | undefined {
  if ((context.finances.clubs[buyerId]?.cash ?? 0) < fee) {
    return fail("market.insufficient_cash", { needed: fee });
  }
  if (!canAddPlayer(context.world, buyerId, player.position, context.managerClubId))
    return fail("market.squad_full");
  const foreign = foreignProblem(context.world, player, buyerId);
  if (foreign) return foreign;
  if (!canRemovePlayer(context.world, player.clubId, player.id)) {
    return fail("market.squad_minimum");
  }
  return undefined;
}

/**
 * Cláusula de revenda na venda definitiva (041 R2): primeiro encerra a cláusula ativa (paga a fatia
 * do vendedor ao credor na categoria `resale`, ou nada se o comprador é o credor); depois cria a
 * nova, a favor do vendedor. O mesmo valor sai de um caixa e entra no outro.
 */
function settleResale(
  context: MarketContext,
  update: MarketUpdate,
  sale: {
    player: CompletedPlayer;
    fromClubId: string;
    toClubId: string;
    fee: number;
    resale?: { pct: number };
  },
): Pick<TransferRecord, "resalePaid" | "resaleCreated"> {
  const extra: Pick<TransferRecord, "resalePaid" | "resaleCreated"> = {};
  const clause = activeClause(context.market, sale.player.id);
  const season = context.league.number;
  const round = roundsPlayed(context.league);
  let state = context.market.resale;
  if (clause && state) {
    const boughtBack = clause.creditorClubId === sale.toClubId;
    // Credor sem finanças no mundo (não acontece no jogo): encerra sem pagar, sem criar dinheiro.
    const tracked = update.finances.clubs[clause.creditorClubId] !== undefined;
    const amount = boughtBack || !tracked ? 0 : shareOf(sale.fee, clause.pct);
    if (amount > 0) {
      const base = { season, round, category: "resale" as const };
      post(update.finances, { clubId: sale.fromClubId, ...base, amount: -amount });
      post(update.finances, { clubId: clause.creditorClubId, ...base, amount });
    }
    if (!boughtBack) extra.resalePaid = { clubId: clause.creditorClubId, amount };
    state = closeClause(state, clause, {
      outcome: boughtBack ? "bought_back" : "paid",
      displayName: sale.player.displayName,
      saleFee: sale.fee,
      amount,
      season,
      round,
      sellerClubId: sale.fromClubId,
      buyerClubId: sale.toClubId,
    });
  }
  if (sale.resale) {
    state = openClause(state, {
      playerId: sale.player.id,
      displayName: sale.player.displayName,
      creditorClubId: sale.fromClubId,
      pct: sale.resale.pct,
      season,
      round,
      fromClubId: sale.fromClubId,
      toClubId: sale.toClubId,
      fee: sale.fee,
    });
    extra.resaleCreated = { clubId: sale.fromClubId, pct: sale.resale.pct };
  }
  if (state !== context.market.resale && state) update.market.resale = state;
  return extra;
}

/**
 * Transferência definitiva (compra do usuário ou venda a clube da IA): move o jogador, lança a taxa
 * nos dois caixas (soma inalterada, SC-004) e respeita os limites de elenco (SC-005). Sem
 * `contract`, o jogador leva o contrato atual. Com `resale`, nasce uma cláusula de revenda a favor
 * do vendedor (041); uma cláusula ativa do jogador é paga ou encerrada antes.
 */
export function completeTransfer(
  context: MarketContext,
  input: {
    playerId: string;
    toClubId: string;
    fee: number;
    contract?: Contract;
    resale?: { pct: number };
    /** Comissão do empresário (042), paga pelo comprador na assinatura. */
    commission?: number;
  },
): MarketResult<MarketUpdate> {
  const player = context.world.players.find((entry) => entry.id === input.playerId);
  if (!player?.contract) return fail("market.not_found");
  const problem = checkTransfer(
    context,
    player,
    input.toClubId,
    input.fee + (input.commission ?? 0),
  );
  if (problem) return problem;
  const fromClubId = player.clubId;
  const update = working(context);
  const contract = input.contract ?? {
    wage: player.contract.wage,
    untilYear: player.contract.untilYear,
  };
  replacePlayer(update.world, { ...player, clubId: input.toClubId, contract });
  postFee(context, update, input.fee, input.toClubId, fromClubId);
  const resale = settleResale(context, update, {
    player,
    fromClubId,
    toClubId: input.toClubId,
    fee: input.fee,
    ...(input.resale ? { resale: input.resale } : {}),
  });
  const commission = postCommission(context, update, input.toClubId, player, input.commission);
  if (fromClubId === context.managerClubId) update.departed.push(player.id);
  update.market.log.push(
    record(context, {
      playerId: player.id,
      displayName: player.displayName,
      kind: input.toClubId === context.managerClubId ? "buy" : "sale",
      fromClubId,
      toClubId: input.toClubId,
      fee: input.fee,
      wage: contract.wage,
      untilYear: contract.untilYear,
      ...resale,
      ...commission,
    }),
  );
  return { ok: true, value: update };
}

/** Empréstimo até o fim da temporada: o clube que recebe paga o salário (FR-018). */
export function completeLoan(
  context: MarketContext,
  input: { playerId: string; toClubId: string; fee: number },
): MarketResult<MarketUpdate> {
  const player = context.world.players.find((entry) => entry.id === input.playerId);
  if (!player?.contract) return fail("market.not_found");
  if (player.contract.loan) return fail("market.player_on_loan");
  const problem = checkTransfer(context, player, input.toClubId, input.fee);
  if (problem) return problem;
  const fromClubId = player.clubId;
  const update = working(context);
  const contract: Contract = {
    ...player.contract,
    loan: { fromClubId, untilYear: context.league.year },
  };
  replacePlayer(update.world, { ...player, clubId: input.toClubId, contract });
  postFee(context, update, input.fee, input.toClubId, fromClubId);
  if (fromClubId === context.managerClubId) update.departed.push(player.id);
  update.market.log.push(
    record(context, {
      playerId: player.id,
      displayName: player.displayName,
      kind: input.toClubId === context.managerClubId ? "loan" : "loan_out",
      fromClubId,
      toClubId: input.toClubId,
      fee: input.fee,
      wage: contract.wage,
      untilYear: context.league.year,
    }),
  );
  return { ok: true, value: update };
}

/** Contratação de livre: entra no banco com clube e contrato (US7). */
export function completeSigning(
  context: MarketContext,
  input: { agent: FreeAgent; clubId: string; contract: Contract; commission?: number },
): MarketResult<MarketUpdate> {
  if (
    !canAddPlayer(context.world, input.clubId, input.agent.player.position, context.managerClubId)
  ) {
    return fail("market.squad_full");
  }
  const foreign = foreignProblem(context.world, input.agent.player, input.clubId);
  if (foreign) return foreign;
  const cash = commissionCashProblem(context, input.clubId, input.commission);
  if (cash) return cash;
  const update = working(context);
  const player = {
    ...input.agent.player,
    clubId: input.clubId,
    contract: input.contract,
  } as CompletedPlayer;
  update.world.players.push(player);
  update.market.freeAgents = update.market.freeAgents.filter(
    (entry) => entry.player.id !== player.id,
  );
  const commission = postCommission(context, update, input.clubId, player, input.commission);
  update.market.log.push(
    record(context, {
      playerId: player.id,
      displayName: player.displayName,
      kind: "free",
      toClubId: input.clubId,
      fee: 0,
      wage: input.contract.wage,
      untilYear: input.contract.untilYear,
      ...commission,
    }),
  );
  return { ok: true, value: update };
}

/** Renovação: só muda o contrato (US6). */
export function completeRenewal(
  context: MarketContext,
  input: { playerId: string; contract: Contract; commission?: number },
): MarketResult<MarketUpdate> {
  const player = context.world.players.find((entry) => entry.id === input.playerId);
  if (!player) return fail("market.not_found");
  const cash = commissionCashProblem(context, player.clubId, input.commission);
  if (cash) return cash;
  const update = working(context);
  replacePlayer(update.world, { ...player, contract: input.contract });
  const commission = postCommission(context, update, player.clubId, player, input.commission);
  update.market.log.push(
    record(context, {
      playerId: player.id,
      displayName: player.displayName,
      kind: "renew",
      toClubId: player.clubId,
      fee: 0,
      wage: input.contract.wage,
      untilYear: input.contract.untilYear,
      ...commission,
    }),
  );
  return { ok: true, value: update };
}

export type { MarketState };
