"use client";

import { feeWithResale, type ResaleRules, resaleSteps } from "@brasfoot-like/engine";
import { formatMoney, useT } from "../../i18n";
import styles from "./market.module.css";

/**
 * Cláusula de revenda numa venda (041): "Sem cláusula" e os passos da regra. Os passos acima do
 * teto do comprador da IA ficam desabilitados, com o motivo. Embaixo, o valor, o desconto e o valor
 * final (calculados pelo motor), num `aria-live`.
 */
export function ResaleSelect({
  rules,
  fee,
  value,
  onChange,
  disabled,
}: {
  rules: ResaleRules;
  /** Valor sem cláusula. */
  fee: number;
  value: number | undefined;
  onChange: (pct: number | undefined) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const net = value === undefined ? fee : feeWithResale(fee, value, rules);
  return (
    <div className={styles.resale}>
      <label className={styles.field}>
        <span>{t("market.resale.label")}</span>
        <select
          value={value === undefined ? "" : String(value)}
          disabled={disabled}
          onChange={(event) =>
            onChange(event.target.value === "" ? undefined : Number(event.target.value))
          }
        >
          <option value="">{t("market.resale.none")}</option>
          {resaleSteps(rules).map((pct) => (
            <option key={pct} value={pct} disabled={pct > rules.aiMaxPct}>
              {pct > rules.aiMaxPct
                ? t("market.resale.optionAbove", { pct })
                : t("market.resale.option", { pct })}
            </option>
          ))}
        </select>
      </label>
      <p className={styles.muted}>{t("market.resale.ceiling", { max: rules.aiMaxPct })}</p>
      <p aria-live="polite">
        {value === undefined
          ? t("market.resale.summaryNone", { fee: formatMoney(fee) })
          : t("market.resale.summary", {
              fee: formatMoney(fee),
              discount: formatMoney(fee - net),
              net: formatMoney(net),
              pct: value,
            })}
      </p>
    </div>
  );
}
