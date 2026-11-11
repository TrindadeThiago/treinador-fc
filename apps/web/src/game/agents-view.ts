import {
  agentOf,
  type CommissionQuote,
  type CompletedPlayer,
  commissionQuote,
  relationBand,
  relationOf,
} from "@brasfoot-like/engine";
import { marketContextOf, type SaveFile } from "@brasfoot-like/save";

/** O jogador do banco ou da lista de livres. */
function playerOf(save: SaveFile, playerId: string) {
  return (
    save.bank.players.find((entry) => entry.id === playerId) ??
    save.market.freeAgents.find((entry) => entry.player.id === playerId)?.player ??
    save.renewal.academy?.players.find((entry) => entry.player.id === playerId)?.player
  );
}

export interface AgentLine {
  name: string;
  relation: number;
  band: ReturnType<typeof relationBand>;
}

/** Empresário do jogador e a relação com o clube em foco (042), ou nada sem empresário. */
export function agentLineOf(save: SaveFile, playerId: string): AgentLine | undefined {
  const player = playerOf(save, playerId);
  if (!player) return undefined;
  const agent = agentOf(save.bank, save.seed, player);
  if (!agent) return undefined;
  const relation = relationOf(save.market, save.clubId, agent.id);
  return { name: agent.name, relation, band: relationBand(relation) };
}

/** "Nome · Relação: boa (68)", ou nada sem empresário. */
export function agentTextOf(
  save: SaveFile,
  playerId: string,
  t: (key: string, values?: Record<string, string | number>) => string,
): string | undefined {
  const line = agentLineOf(save, playerId);
  if (!line) return undefined;
  return t("player.agentValue", {
    name: line.name,
    band: t(`agents.band.${line.band}`),
    value: line.relation,
  });
}

/** Cotação da comissão para o clube do técnico assinar com o jogador (042). */
export function commissionQuoteOf(
  save: SaveFile,
  playerId: string,
  renewal: boolean,
): CommissionQuote | undefined {
  const player = playerOf(save, playerId);
  if (!player) return undefined;
  return commissionQuote(marketContextOf(save), player as CompletedPlayer, save.clubId, renewal);
}
