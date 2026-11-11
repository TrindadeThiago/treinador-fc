import { ageOn, seasonDate } from "../calendar/date";
import type { CompletedBank, CompletedPlayer } from "../model/types";
import type {
  MarketContext,
  MarketState,
  ResaleClause,
  ResaleOutcome,
  ResaleReceipt,
  ResaleState,
} from "./types";

/**
 * Cláusula de revenda (041, contracts/engine-resale.md). O clube que vende pode ficar com um
 * percentual da próxima venda definitiva do jogador. Funções puras e sem sorte: o pedido da IA é
 * uma comparação de idade, e o desconto e a fatia arredondam contra quem usa a cláusula.
 */
export interface ResaleRules {
  minPct: number;
  maxPct: number;
  stepPct: number;
  /** Desconto no valor (em % do valor) por ponto de percentual; no máximo 1 (research R6). */
  discountPerPointPct: number;
  /** Maior percentual que a IA compradora aceita. */
  aiMaxPct: number;
  /** Percentual que a IA vendedora pede ao técnico. */
  aiAskPct: number;
  /** A IA vendedora pede cláusula a jogadores até esta idade. */
  aiAskMaxAge: number;
  /** Manchete a partir desta % da folha mensal de referência do clube do técnico. */
  headlinePayrollPct: number;
}

export const DEFAULT_RESALE: ResaleRules = {
  minPct: 5,
  maxPct: 50,
  stepPct: 5,
  discountPerPointPct: 1,
  aiMaxPct: 30,
  aiAskPct: 20,
  aiAskMaxAge: 21,
  headlinePayrollPct: 100,
};

/** Recebimentos guardados no histórico (os mais recentes). */
export const RESALE_RECEIPTS_MAX = 200;

/** Regras da cláusula da competição: `competition.market.resale` com os padrões preenchidos. */
export function resaleRules(world: CompletedBank, competitionId: string): ResaleRules {
  const competition = world.competitions.find((entry) => entry.id === competitionId);
  const override = competition?.market?.resale ?? {};
  const merged = { ...DEFAULT_RESALE };
  for (const [key, value] of Object.entries(override)) {
    if (typeof value === "number") (merged as unknown as Record<string, number>)[key] = value;
  }
  return merged;
}

/** Percentuais válidos da faixa, em ordem. */
export function resaleSteps(rules: ResaleRules): number[] {
  const steps: number[] = [];
  for (let pct = rules.minPct; pct <= rules.maxPct; pct += rules.stepPct) steps.push(pct);
  return steps;
}

export function isValidResalePct(rules: ResaleRules, pct: number): boolean {
  return (
    Number.isInteger(pct) &&
    pct >= rules.minPct &&
    pct <= rules.maxPct &&
    (pct - rules.minPct) % rules.stepPct === 0
  );
}

/** Arredonda para cima ao milhar, tolerando o erro de ponto flutuante da conta. */
function ceilThousand(value: number): number {
  return Math.ceil(value / 1000 - 1e-9) * 1000;
}

/**
 * Valor com o desconto da cláusula, arredondado para cima ao milhar (nunca abaixo da conta exata
 * e nunca acima do valor sem cláusula).
 */
export function feeWithResale(fee: number, pct: number, rules: ResaleRules): number {
  if (fee <= 0) return fee;
  const exact = (fee * (100 - pct * rules.discountPerPointPct)) / 100;
  return Math.min(fee, Math.max(0, ceilThousand(exact)));
}

/** Fatia de uma venda por `fee`: o percentual arredondado para cima ao milhar, até `fee`. */
export function shareOf(fee: number, pct: number): number {
  if (fee <= 0) return 0;
  return Math.min(fee, ceilThousand((fee * pct) / 100));
}

/** Cláusula ativa do jogador, se houver. */
export function activeClause(market: MarketState, playerId: string): ResaleClause | undefined {
  return market.resale?.clauses.find((clause) => clause.playerId === playerId);
}

/** Fatia que uma venda por `fee` pagaria hoje (0 sem cláusula ou com o credor comprando). */
export function resaleShare(
  market: MarketState,
  playerId: string,
  buyerClubId: string,
  fee: number,
): number {
  const clause = activeClause(market, playerId);
  if (!clause || clause.creditorClubId === buyerClubId) return 0;
  return shareOf(fee, clause.pct);
}

/** A IA vendedora pede cláusula a este jogador? Só pela idade na data da temporada (sem sorte). */
export function aiAsksResale(
  context: Pick<MarketContext, "world" | "league">,
  player: Pick<CompletedPlayer, "birthDate">,
): { pct: number } | undefined {
  const rules = resaleRules(context.world, context.league.competitionId);
  const date = seasonDate(context.world.manifest.referenceDate, context.league.year);
  return ageOn(player.birthDate, date) <= rules.aiAskMaxAge ? { pct: rules.aiAskPct } : undefined;
}

export interface ClubResaleView {
  /** Cláusulas ativas a favor do clube. */
  receivable: ResaleClause[];
  /** Cláusulas ativas de jogadores do clube a favor de outro. */
  payable: ResaleClause[];
  /** Cláusulas do clube já encerradas, da mais recente para a mais antiga. */
  receipts: ResaleReceipt[];
  /** Soma do que o clube já recebeu (só as pagas). */
  totalReceived: number;
}

/** Cláusulas a receber e a pagar do clube, e o histórico de recebimentos dele. */
export function clubResaleView(
  market: MarketState,
  world: Pick<CompletedBank, "players">,
  clubId: string,
): ClubResaleView {
  const state = market.resale;
  if (!state) return { receivable: [], payable: [], receipts: [], totalReceived: 0 };
  const owner = new Map(world.players.map((player) => [player.id, player.clubId]));
  const receipts = state.receipts.filter((receipt) => receipt.creditorClubId === clubId).reverse();
  return {
    receivable: state.clauses.filter((clause) => clause.creditorClubId === clubId),
    payable: state.clauses.filter(
      (clause) => clause.creditorClubId !== clubId && owner.get(clause.playerId) === clubId,
    ),
    receipts,
    totalReceived: receipts
      .filter((receipt) => receipt.outcome === "paid")
      .reduce((sum, receipt) => sum + receipt.amount, 0),
  };
}

function emptyResale(): ResaleState {
  return { clauses: [], receipts: [], nextSeq: 1 };
}

function withReceipts(receipts: ResaleReceipt[]): ResaleReceipt[] {
  return receipts.length > RESALE_RECEIPTS_MAX
    ? receipts.slice(receipts.length - RESALE_RECEIPTS_MAX)
    : receipts;
}

/** Encerra uma cláusula e guarda o recebimento (pago, recomprado ou aposentado). */
export function closeClause(
  state: ResaleState,
  clause: ResaleClause,
  close: {
    outcome: ResaleOutcome;
    displayName: string;
    saleFee: number;
    amount: number;
    season: number;
    round: number;
    sellerClubId?: string;
    buyerClubId?: string;
  },
): ResaleState {
  const receipt: ResaleReceipt = {
    clauseId: clause.id,
    playerId: clause.playerId,
    displayName: close.displayName,
    creditorClubId: clause.creditorClubId,
    pct: clause.pct,
    outcome: close.outcome,
    ...(close.sellerClubId !== undefined ? { sellerClubId: close.sellerClubId } : {}),
    ...(close.buyerClubId !== undefined ? { buyerClubId: close.buyerClubId } : {}),
    saleFee: close.saleFee,
    amount: close.amount,
    season: close.season,
    round: close.round,
  };
  return {
    ...state,
    clauses: state.clauses.filter((entry) => entry.id !== clause.id),
    receipts: withReceipts([...state.receipts, receipt]),
  };
}

/** Registra uma cláusula nova (a anterior do jogador já deve ter sido encerrada). */
export function openClause(
  state: ResaleState | undefined,
  clause: Omit<ResaleClause, "id">,
): ResaleState {
  const base = state ?? emptyResale();
  return {
    ...base,
    clauses: [...base.clauses, { id: `resale-${base.nextSeq}`, ...clause }],
    nextSeq: base.nextSeq + 1,
  };
}

/** Virada: encerra como "retired" as cláusulas de quem não está no mundo nem nos livres. */
export function pruneResale(
  market: MarketState,
  world: Pick<CompletedBank, "players">,
  season: number,
): MarketState {
  const state = market.resale;
  if (!state || state.clauses.length === 0) return market;
  const alive = new Set(world.players.map((player) => player.id));
  for (const agent of market.freeAgents) alive.add(agent.player.id);
  let next = state;
  for (const clause of state.clauses) {
    if (alive.has(clause.playerId)) continue;
    next = closeClause(next, clause, {
      outcome: "retired",
      displayName: clause.displayName,
      saleFee: 0,
      amount: 0,
      season,
      round: 0,
    });
  }
  return next === state ? market : { ...market, resale: next };
}
