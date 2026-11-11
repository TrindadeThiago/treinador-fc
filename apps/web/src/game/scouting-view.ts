import {
  academyLimit,
  academyOf,
  foreignCountWithAcademy,
  recruitmentWindows,
  type ScoutingPanel,
  type ScoutingRegion,
  type ScoutOffer,
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

/** Nome de uma região de captação (040): o estado ou o nome do país. */
export function regionName(save: SaveFile, region: ScoutingRegion): string {
  if (region.kind === "state") return region.region;
  return (
    save.bank.countries.find((country) => country.id === region.countryId)?.name ?? region.countryId
  );
}

/** Motivo (chave de texto e parâmetros) para não poder trazer a indicação agora, ou nada. */
export function signBlock(
  save: SaveFile,
  offer: ScoutOffer,
): { key: string; params?: Record<string, string | number> } | undefined {
  const clubId = save.clubId;
  const count = academyOf(save.renewal, clubId).length;
  if (count >= academyLimit(save.renewal, save.bank, clubId)) {
    return { key: "recruitment.blocked.academyFull" };
  }
  const cash = save.finances.clubs[clubId]?.cash ?? 0;
  if (offer.cost > cash) {
    return { key: "recruitment.blocked.cash", params: { missing: offer.cost - cash } };
  }
  const club = save.bank.clubs.find((entry) => entry.id === clubId);
  const limit = save.bank.countries.find((country) => country.id === club?.countryId)?.rules
    ?.foreignLimit;
  if (
    offer.player.nationalityId !== club?.countryId &&
    limit !== undefined &&
    foreignCountWithAcademy(save.bank, save.renewal, clubId) + 1 > limit
  ) {
    return { key: "recruitment.blocked.foreign", params: { limit } };
  }
  return undefined;
}

/** Rodada (jogadas) em que abre a próxima janela da temporada; nada = só na pré-temporada. */
export function nextOfferRound(save: SaveFile): number | undefined {
  const { windows, played } = recruitmentWindows(save.bank, save.league);
  return windows.find((window) => window.fromRound > played)?.fromRound;
}
