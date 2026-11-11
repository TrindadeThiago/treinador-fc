import type { HeadlineVars } from "@brasfoot-like/engine";
import { divisionNameOf, type SaveFile } from "@brasfoot-like/save";
import { formatMoney, label } from "../../i18n";

/** Variáveis que guardam ids de clube e viram nomes na apresentação. */
const CLUB_VARS = [
  "club",
  "opponent",
  "winner",
  "loser",
  "scorerClub",
  "owner",
  "newClub",
  "newOpponent",
  "prevClub",
  "prevOpponent",
];

/** Variáveis prontas para o template: nomes de clube, divisão, técnico e valores formatados. */
export function headlineVars(save: SaveFile, vars: HeadlineVars): HeadlineVars {
  const names = new Map(save.bank.clubs.map((club) => [club.id, club.name]));
  const resolved: HeadlineVars = { ...vars, manager: save.managerName };
  for (const key of CLUB_VARS) {
    const value = vars[key];
    if (typeof value === "string") resolved[key] = names.get(value) ?? value;
  }
  if (typeof vars.level === "number") resolved.division = divisionNameOf(save, vars.level);
  if (typeof vars.fee === "number") resolved.feeText = formatMoney(vars.fee);
  // Revenda recebida (041): a fatia paga ao clube da cláusula.
  if (typeof vars.amount === "number") resolved.amountText = formatMoney(vars.amount);
  // Empresários (042): a comissão do negócio grande.
  if (typeof vars.commission === "number") resolved.commissionText = formatMoney(vars.commission);
  if (typeof vars.position === "string") resolved.positionName = label(`position.${vars.position}`);
  // Manchetes guardadas antes da 040 não têm `scouted`: o texto trata como cria da safra.
  if (resolved.scouted === undefined) resolved.scouted = "no";
  // Captado (040): estado pelo nome, país pelo nome do banco.
  if (typeof vars.originRegion === "string") {
    resolved.regionName =
      vars.originKind === "country"
        ? (save.bank.countries.find((country) => country.id === vars.originRegion)?.name ??
          vars.originRegion)
        : vars.originRegion;
  }
  if (typeof vars.competition === "string") {
    const competition = save.bank.competitions.find((entry) => entry.id === vars.competition);
    resolved.competition = competition?.name ?? vars.competition;
  }
  resolved.hasScorer = typeof vars.player === "string" ? "yes" : "no";
  return resolved;
}
