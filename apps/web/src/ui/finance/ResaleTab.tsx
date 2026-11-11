"use client";

import type { SaveFile } from "@brasfoot-like/save";
import { type ResaleClauseRow, type ResaleReceiptRow, resaleViewOf } from "../../game/resale-view";
import { formatMoney, useT } from "../../i18n";
import { Card } from "../Card";
import { type Column, DataTable } from "../DataTable";
import { EmptyState } from "../EmptyState";
import styles from "./finance.module.css";

/**
 * Revendas (041 US4): cláusulas a receber e a pagar, o que já foi recebido (com o total) e as
 * encerradas sem pagamento. Cada lista tem título em texto; nada depende só de cor.
 */
export function ResaleTab({ save }: { save: SaveFile }) {
  const t = useT();
  const view = resaleViewOf(save);
  const clauseColumns = (kind: "receivable" | "payable"): Column<ResaleClauseRow>[] => [
    { key: "player", header: t("finance.resale.player"), render: (row) => row.player },
    {
      key: "club",
      header: t(kind === "receivable" ? "finance.resale.club" : "finance.resale.creditor"),
      render: (row) =>
        kind === "receivable" ? (row.club ?? t("finance.resale.free")) : row.creditor,
    },
    {
      key: "pct",
      header: t("finance.resale.pct"),
      render: (row) => t("finance.resale.pctValue", { pct: row.pct }),
      align: "right",
    },
    { key: "year", header: t("finance.resale.year"), render: (row) => row.year, align: "right" },
    {
      key: "value",
      header: t("finance.resale.value"),
      render: (row) => (row.value === undefined ? "—" : formatMoney(row.value)),
      align: "right",
    },
  ];
  const receiptColumns: Column<ResaleReceiptRow>[] = [
    { key: "player", header: t("finance.resale.player"), render: (row) => row.player },
    {
      key: "buyer",
      header: t("finance.resale.buyer"),
      render: (row) => row.buyer ?? "—",
    },
    {
      key: "fee",
      header: t("finance.resale.saleFee"),
      render: (row) => formatMoney(row.saleFee),
      align: "right",
    },
    {
      key: "amount",
      header: t("finance.resale.amount"),
      render: (row) => formatMoney(row.amount),
      align: "right",
    },
    { key: "year", header: t("finance.resale.year"), render: (row) => row.year, align: "right" },
  ];
  const closedColumns: Column<ResaleReceiptRow>[] = [
    { key: "player", header: t("finance.resale.player"), render: (row) => row.player },
    {
      key: "reason",
      header: t("finance.resale.reason"),
      render: (row) => t(`finance.resale.outcome.${row.outcome}`),
    },
    { key: "year", header: t("finance.resale.year"), render: (row) => row.year, align: "right" },
  ];
  return (
    <div className={styles.tab}>
      <p>{t("finance.resale.intro")}</p>
      <Card aria-label={t("finance.resale.receivable")}>
        <h3>{t("finance.resale.receivable")}</h3>
        {view.receivable.length === 0 ? (
          <EmptyState title={t("finance.resale.emptyReceivable")} />
        ) : (
          <DataTable
            caption={t("finance.resale.receivable")}
            rows={view.receivable}
            columns={clauseColumns("receivable")}
            rowKey={(row) => row.id}
          />
        )}
      </Card>
      <Card aria-label={t("finance.resale.payable")}>
        <h3>{t("finance.resale.payable")}</h3>
        {view.payable.length === 0 ? (
          <EmptyState title={t("finance.resale.emptyPayable")} />
        ) : (
          <DataTable
            caption={t("finance.resale.payable")}
            rows={view.payable}
            columns={clauseColumns("payable")}
            rowKey={(row) => row.id}
          />
        )}
      </Card>
      <Card aria-label={t("finance.resale.received")}>
        <h3>{t("finance.resale.received")}</h3>
        <p>
          {t("finance.resale.total", {
            count: view.received.length,
            total: formatMoney(view.totalReceived),
          })}
        </p>
        {view.received.length > 0 ? (
          <DataTable
            caption={t("finance.resale.received")}
            rows={view.received}
            columns={receiptColumns}
            rowKey={(row) => row.id}
          />
        ) : null}
      </Card>
      {view.closed.length > 0 ? (
        <Card aria-label={t("finance.resale.closed")}>
          <h3>{t("finance.resale.closed")}</h3>
          <DataTable
            caption={t("finance.resale.closed")}
            rows={view.closed}
            columns={closedColumns}
            rowKey={(row) => row.id}
          />
        </Card>
      ) : null}
    </div>
  );
}
