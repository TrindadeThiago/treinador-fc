"use client";

import {
  askedCommission,
  type CommissionQuote,
  relationBand,
  wageWithCommission,
} from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { formatMoney, useT } from "../../i18n";
import { MoneyInput } from "../MoneyInput";
import styles from "./market.module.css";

/**
 * Comissão do empresário na proposta de contrato (042 US1): o empresário e a relação em texto, o
 * campo (preenchido com a pedida) e, em `aria-live`, o efeito no salário pedido, a comissão mínima
 * de quem não tem interesse ou o aviso de que nem a comissão convence. Os valores vêm do motor.
 */
export function CommissionField({
  save,
  quote,
  value,
  years,
  fee = 0,
  onChange,
}: {
  save: SaveFile;
  quote: CommissionQuote;
  value: string;
  years: number;
  /** Taxa da compra, paga junto com a comissão. */
  fee?: number;
  onChange: (digits: string) => void;
}) {
  const t = useT();
  const commission = value === "" ? askedCommission(quote) : Number(value);
  const wage = wageWithCommission({ world: save.bank }, quote, commission, Math.max(1, years || 1));
  const cash = save.finances.clubs[save.clubId]?.cash ?? 0;
  let effect: string;
  if (quote.unreachable) effect = t("market.commission.unreachable");
  else if (quote.min !== undefined && commission < quote.min) {
    effect = t("market.commission.min", { commission: formatMoney(quote.min) });
  } else if (wage < quote.wageDemand) {
    effect = t("market.commission.wage", {
      wage: formatMoney(wage),
      before: formatMoney(quote.wageDemand),
    });
  } else effect = t("market.commission.asked", { wage: formatMoney(quote.wageDemand) });
  const atCap = wage <= Math.floor(quote.wageDemand * 0.85);
  return (
    <div className={styles.resale}>
      <p>
        {t("market.commission.agent", {
          name: quote.agent.name,
          band: t(`agents.band.${relationBand(quote.relation)}`),
          value: quote.relation,
        })}
      </p>
      <label className={styles.field}>
        <span>{t("market.commission.label")}</span>
        <MoneyInput
          value={value === "" ? String(askedCommission(quote)) : value}
          onValueChange={onChange}
        />
      </label>
      <p className={styles.muted}>
        {t("market.commission.hint", { commission: formatMoney(askedCommission(quote)) })}
      </p>
      <p aria-live="polite">{effect}</p>
      {atCap ? <p className={styles.muted}>{t("market.commission.cap")}</p> : null}
      {fee + commission > cash ? (
        <p role="alert">
          {t("market.commission.noCash", { missing: formatMoney(fee + commission - cash) })}
        </p>
      ) : null}
    </div>
  );
}
