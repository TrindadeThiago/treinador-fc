import {
  type ScoutingPanel,
  type ScoutReportView,
  scoutingPanel,
  scoutReportOf,
} from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";

/** Olheiros (039): só views do motor; a web nunca lê os atributos ocultos. */

const stateOf = (save: SaveFile) => ({
  world: save.bank,
  scouting: save.scouting,
  board: save.board,
});

export function scoutReport(save: SaveFile, playerId: string): ScoutReportView | undefined {
  return scoutReportOf(stateOf(save), playerId);
}

export function scoutingPanelOf(save: SaveFile): ScoutingPanel {
  return scoutingPanel(stateOf(save));
}

/** Ano da temporada `season` (número da temporada da carreira). */
export function yearOfSeason(save: SaveFile, season: number): number {
  return save.league.year - (save.league.number - season);
}

/** Motivo para não poder observar o jogador agora (chave de texto), ou nada. */
export function watchBlock(save: SaveFile, playerId: string): string | undefined {
  const panel = scoutingPanelOf(save);
  if (panel.level === 0) return "scouting.blocked.closed";
  if (panel.watch.some((entry) => entry.playerId === playerId)) return "scouting.blocked.watching";
  if (panel.used >= panel.slots) return "scouting.blocked.slots";
  return undefined;
}

/** Valor de ordenação da faixa: centro e, no empate, limite superior; sem relatório, nada. */
export function reportSortValue(report: ScoutReportView | undefined): number | undefined {
  return report
    ? (report.estimate.low + report.estimate.high) * 1000 + report.estimate.high
    : undefined;
}
