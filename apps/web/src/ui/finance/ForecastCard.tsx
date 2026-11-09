"use client";

import type { CashForecast } from "@brasfoot-like/engine";
import { formatDate, formatMoney, useT } from "../../i18n";
import { Card } from "../Card";
import panel from "../FinancePanel.module.css";
import styles from "./finance.module.css";

/**
 * Previsão até o fim da temporada: de onde vem e para onde vai o dinheiro que falta, o saldo
 * previsto e quanto dá para gastar hoje sem o caixa ficar negativo antes da premiação.
 */
export function ForecastCard({ forecast }: { forecast: CashForecast }) {
  const t = useT();
  const title = t("finance.forecast.title");
  const rows = [
    { label: t("finance.forecast.cash"), value: forecast.cash },
    { label: t("finance.forecast.gate", { games: forecast.gateGames }), value: forecast.gate },
    { label: t("finance.forecast.wages", { rounds: forecast.wageRounds }), value: forecast.wages },
    { label: t("finance.forecast.academy"), value: forecast.academy },
    ...(forecast.interest !== 0
      ? [{ label: t("finance.forecast.interest"), value: forecast.interest }]
      : []),
    {
      label: forecast.positionGuessed
        ? t("finance.forecast.prizeGuess", { position: forecast.position })
        : t("finance.forecast.prize", { position: forecast.position }),
      value: forecast.prize,
    },
  ];
  const margin = forecast.lowestCash;
  return (
    <Card aria-label={title} className={panel.card}>
      <h2>{title}</h2>
      <dl className={panel.list}>
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd className={row.value < 0 ? styles.negative : undefined}>
              {formatMoney(row.value)}
            </dd>
          </div>
        ))}
        <div className={panel.total}>
          <dt>{t("finance.forecast.end")}</dt>
          <dd className={forecast.endCash < 0 ? styles.negative : undefined}>
            {formatMoney(forecast.endCash)}
          </dd>
        </div>
      </dl>
      <p className={panel.muted}>
        {t("finance.forecast.prizeRange", {
          min: formatMoney(forecast.prizeRange.min),
          max: formatMoney(forecast.prizeRange.max),
        })}
      </p>
      {margin < 0 ? (
        <p role="status" className={styles.negative}>
          {t("finance.forecast.negative", {
            amount: formatMoney(margin),
            date: formatDate(forecast.lowestDate ?? ""),
          })}
        </p>
      ) : (
        <p role="status" className={styles.spend}>
          {forecast.lowestDate
            ? t("finance.forecast.spend", {
                amount: formatMoney(margin),
                date: formatDate(forecast.lowestDate),
              })
            : t("finance.forecast.spendToday", { amount: formatMoney(margin) })}
        </p>
      )}
      <p className={panel.muted}>{t("finance.forecast.excluded")}</p>
    </Card>
  );
}
