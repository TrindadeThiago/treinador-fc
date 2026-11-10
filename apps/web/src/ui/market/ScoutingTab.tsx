"use client";

import type { SaveFile } from "@brasfoot-like/save";
import { useId, useState } from "react";
import type { useGame } from "../../game/GameProvider";
import { scoutingPanelOf, scoutReport } from "../../game/scouting-view";
import { formatMoney, label, useT } from "../../i18n";
import { Button } from "../Button";
import { type Column, DataTable } from "../DataTable";
import { Dialog } from "../Dialog";
import { EmptyState } from "../EmptyState";
import { EstimateRange } from "../EstimateRange";
import styles from "./market.module.css";

type Game = ReturnType<typeof useGame>;

interface WatchRow {
  playerId: string;
  name: string;
  club: string;
  position: string;
  strength: number;
}

/**
 * Aba Observação do Mercado (039 US1, US5, contracts/ui-scouting.md): o departamento de olheiros com
 * nível, vagas e custo, as ações de abrir, mudar e fechar com a previsão, e os jogadores em
 * observação com a faixa, a confiança e o andamento do relatório.
 */
export function ScoutingTab({ save, game }: { save: SaveFile; game: Game }) {
  const t = useT();
  const levelId = useId();
  const panel = scoutingPanelOf(save);
  const [dialog, setDialog] = useState(false);
  const [choice, setChoice] = useState(Math.max(1, panel.level));
  const [status, setStatus] = useState<string | undefined>();
  const live = game.state.live !== undefined;
  const employed = save.board.manager.clubId !== null;
  const slotsFor = (level: number) =>
    level === 0 ? 0 : (panel.levels.find((entry) => entry.level === level)?.slots ?? 0);
  const costFor = (level: number) =>
    level === 0 ? 0 : (panel.levels.find((entry) => entry.level === level)?.monthlyCost ?? 0);
  const cancelled = Math.max(0, panel.used - slotsFor(choice));

  const apply = (level: number) => {
    const result = game.setScoutingLevel(level);
    setDialog(false);
    setStatus(result.ok ? t("scouting.done.level") : t("scouting.error"));
  };

  const rows: WatchRow[] = panel.watch.map((entry) => {
    const player =
      save.bank.players.find((item) => item.id === entry.playerId) ??
      save.market.freeAgents.find((agent) => agent.player.id === entry.playerId)?.player;
    const clubId = save.bank.players.find((item) => item.id === entry.playerId)?.clubId;
    return {
      playerId: entry.playerId,
      name: player?.displayName ?? entry.playerId,
      club: clubId
        ? (save.bank.clubs.find((club) => club.id === clubId)?.shortName ?? "")
        : t("market.free"),
      position: player ? label(`position.${player.position}`) : "",
      strength: player?.strength ?? 0,
    };
  });

  const columns: Column<WatchRow>[] = [
    {
      key: "name",
      header: t("col.player"),
      render: (row) => row.name,
      sortValue: (row) => row.name,
    },
    { key: "club", header: t("market.col.club"), render: (row) => row.club },
    { key: "position", header: t("col.playerPosition"), render: (row) => row.position },
    {
      key: "strength",
      header: t("col.strength"),
      render: (row) => row.strength,
      sortValue: (row) => row.strength,
      align: "right",
    },
    {
      key: "potential",
      header: t("market.col.potential"),
      render: (row) => {
        const report = scoutReport(save, row.playerId);
        return report ? <EstimateRange estimate={report.estimate} /> : "—";
      },
      align: "right",
    },
    {
      key: "confidence",
      header: t("scouting.report.confidence"),
      render: (row) => {
        const report = scoutReport(save, row.playerId);
        return report ? t(`scouting.confidence.${report.confidence}`) : "—";
      },
    },
    {
      key: "progress",
      header: t("scouting.col.progress"),
      render: (row) => {
        const report = scoutReport(save, row.playerId);
        return report
          ? t("scouting.progress", {
              steps: Math.min(report.steps, report.stepsToComplete),
              total: report.stepsToComplete,
            })
          : "—";
      },
    },
    {
      key: "actions",
      header: t("col.actions"),
      render: (row) => (
        <Button
          disabled={live}
          aria-label={t("scouting.unwatchAria", { name: row.name })}
          onClick={(event) => {
            event.stopPropagation();
            const result = game.unscoutPlayer(row.playerId);
            setStatus(
              result.ok ? t("scouting.done.unwatch", { name: row.name }) : t("scouting.error"),
            );
          }}
        >
          {t("scouting.unwatch")}
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.layout}>
      <section aria-label={t("scouting.title")} className={styles.scoutingPanel}>
        <h3>{t("scouting.title")}</h3>
        {panel.level === 0 ? (
          <>
            <p>{t("scouting.closed")}</p>
            <p className={styles.hint}>{t("scouting.closedBody")}</p>
          </>
        ) : (
          <p>
            {t("scouting.level", { level: panel.level })} ·{" "}
            {t("scouting.slots", { used: panel.used, slots: panel.slots })} ·{" "}
            {t("scouting.cost", { amount: formatMoney(panel.monthlyCost) })}
          </p>
        )}
        {employed ? (
          <span className={styles.actions}>
            <Button
              variant={panel.level === 0 ? "primary" : "secondary"}
              disabled={live}
              onClick={() => {
                setChoice(Math.max(1, panel.level));
                setDialog(true);
              }}
            >
              {t(panel.level === 0 ? "scouting.open" : "scouting.change")}
            </Button>
            {panel.level > 0 ? (
              <Button
                variant="danger"
                disabled={live}
                onClick={() => {
                  setChoice(0);
                  setDialog(true);
                }}
              >
                {t("scouting.close")}
              </Button>
            ) : null}
          </span>
        ) : (
          <p className={styles.hint}>{t("scouting.unemployed")}</p>
        )}
        {status ? <p role="status">{status}</p> : null}
      </section>
      {rows.length === 0 ? (
        <EmptyState title={t("scouting.empty.title")}>
          <p>{t("scouting.empty.body")}</p>
        </EmptyState>
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.playerId}
          caption={t("scouting.watching.caption")}
        />
      )}
      <Dialog
        open={dialog}
        title={t("scouting.dialog.title")}
        onClose={() => setDialog(false)}
        actions={
          <>
            <Button variant={choice === 0 ? "danger" : "primary"} onClick={() => apply(choice)}>
              {t(choice === 0 ? "scouting.close" : "scouting.confirm")}
            </Button>
            <Button onClick={() => setDialog(false)}>{t("scouting.cancelAction")}</Button>
          </>
        }
      >
        {choice === 0 ? (
          <p>{t("scouting.dialog.closeWarn")}</p>
        ) : (
          <>
            <label className={styles.field} htmlFor={levelId}>
              <span>{t("scouting.dialog.level")}</span>
              <select
                id={levelId}
                value={choice}
                onChange={(event) => setChoice(Number(event.target.value))}
              >
                {panel.levels.map((entry) => (
                  <option key={entry.level} value={entry.level}>
                    {t("scouting.dialog.option", {
                      level: entry.level,
                      slots: entry.slots,
                      amount: formatMoney(entry.monthlyCost),
                    })}
                  </option>
                ))}
              </select>
            </label>
            <p>
              {t("scouting.dialog.summary", {
                slots: slotsFor(choice),
                amount: formatMoney(costFor(choice)),
              })}
            </p>
            {cancelled > 0 ? <p>{t("scouting.dialog.cancelled", { count: cancelled })}</p> : null}
            <p className={styles.hint}>{t("scouting.dialog.costNote")}</p>
          </>
        )}
      </Dialog>
    </div>
  );
}
