import { type CashForecast, seasonCashForecast } from "@brasfoot-like/engine";
import { type SaveFile, seasonStateOf } from "@brasfoot-like/save";

/** Previsão do caixa do clube do jogador até o fim da temporada; nada se ele não tem liga. */
export function cashForecastOf(save: SaveFile): CashForecast | undefined {
  if (!save.finances.clubs[save.clubId]) return undefined;
  return seasonCashForecast(seasonStateOf(save), save.clubId);
}
