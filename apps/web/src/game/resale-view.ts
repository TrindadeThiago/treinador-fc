import {
  clubResaleView,
  marketValue,
  type ResaleClause,
  type ResaleOutcome,
} from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";

/** Uma cláusula ativa pronta para a tabela (041): o clube atual e o valor de mercado de hoje. */
export interface ResaleClauseRow {
  id: string;
  player: string;
  /** Nome do clube atual; `undefined` = jogador livre. */
  club: string | undefined;
  /** Clube credor (nas cláusulas a pagar). */
  creditor: string;
  pct: number;
  /** Ano da venda que criou a cláusula. */
  year: number;
  /** Valor de mercado atual; `undefined` para jogador livre. */
  value: number | undefined;
}

export interface ResaleReceiptRow {
  id: string;
  player: string;
  outcome: ResaleOutcome;
  buyer: string | undefined;
  saleFee: number;
  amount: number;
  year: number;
}

export interface ResaleView {
  receivable: ResaleClauseRow[];
  payable: ResaleClauseRow[];
  /** Só as pagas. */
  received: ResaleReceiptRow[];
  /** Recompradas pelo clube ou de jogadores que saíram do mundo. */
  closed: ResaleReceiptRow[];
  totalReceived: number;
}

/** Cláusulas a receber e a pagar do clube do técnico e o histórico (041 US4). */
export function resaleViewOf(save: SaveFile): ResaleView {
  const view = clubResaleView(save.market, save.bank, save.clubId);
  const clubName = (id: string | undefined) =>
    id === undefined ? undefined : (save.bank.clubs.find((club) => club.id === id)?.name ?? id);
  const yearOf = (season: number) => save.league.year - (save.league.number - season);
  const players = new Map(save.bank.players.map((player) => [player.id, player]));
  const clauseRow = (clause: ResaleClause): ResaleClauseRow => {
    const player = players.get(clause.playerId);
    return {
      id: clause.id,
      player: player?.displayName ?? clause.displayName,
      club: clubName(player?.clubId),
      creditor: clubName(clause.creditorClubId) ?? clause.creditorClubId,
      pct: clause.pct,
      year: yearOf(clause.season),
      value: player ? marketValue(player, save.bank, save.league.year) : undefined,
    };
  };
  const receipts = view.receipts.map((receipt) => ({
    id: receipt.clauseId,
    player: receipt.displayName,
    outcome: receipt.outcome,
    buyer: clubName(receipt.buyerClubId),
    saleFee: receipt.saleFee,
    amount: receipt.amount,
    year: yearOf(receipt.season),
  }));
  return {
    receivable: view.receivable.map(clauseRow),
    payable: view.payable.map(clauseRow),
    received: receipts.filter((receipt) => receipt.outcome === "paid"),
    closed: receipts.filter((receipt) => receipt.outcome !== "paid"),
    totalReceived: view.totalReceived,
  };
}
