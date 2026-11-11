"use client";

import { POSITIONS, type Position } from "@brasfoot-like/engine";
import { emergencyPositionsOf, type SaveFile, youthContractPreview } from "@brasfoot-like/save";
import { useId, useMemo, useState } from "react";
import {
  type AcademyRow,
  academyCapacity,
  academyRows,
  canManageAcademy,
  estimateSortValue,
  squadIsFull,
} from "../game/academy-view";
import type { useGame } from "../game/GameProvider";
import { regionName } from "../game/scouting-view";
import { formatMoney, label, useT } from "../i18n";
import { AcademyPanel } from "./AcademyPanel";
import styles from "./AcademyTab.module.css";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { type Column, DataTable } from "./DataTable";
import { Dialog } from "./Dialog";
import { EmptyState } from "./EmptyState";
import { EstimateRange } from "./EstimateRange";
import { Notice } from "./Notice";

type Game = ReturnType<typeof useGame>;
type Pending = { kind: "promote" | "release"; row: AcademyRow };

/** Aba Base do Elenco (036 US1, US2, US4): jovens, vagas, promover e dispensar. */
export function AcademyTab({
  save,
  game,
  warning,
}: {
  save: SaveFile;
  game: Game;
  /** Aviso da última janela (jovens no último ano), quando houver. */
  warning?: { count: number } | undefined;
}) {
  const t = useT();
  const hintId = useId();
  const [pending, setPending] = useState<Pending | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [position, setPosition] = useState<Position | "">("");
  const filterId = useId();
  const all = useMemo(() => academyRows(save), [save]);
  const rows = useMemo(
    () => (position ? all.filter((row) => row.entry.player.position === position) : all),
    [all, position],
  );
  const capacity = academyCapacity(save);
  // Sem nenhum candidato para o mínimo, a safra de emergência fica disponível (036).
  const emergency = useMemo(() => emergencyPositionsOf(save), [save]);
  const manage = canManageAcademy(save);
  const { full, max } = squadIsFull(save);
  const live = game.state.live !== undefined;
  const club = save.bank.clubs.find((entry) => entry.id === save.clubId);
  const promoteBlocked = full
    ? t("academy.squadFull", { max })
    : live
      ? t("academy.matchInProgress")
      : undefined;

  const confirm = () => {
    if (!pending) return;
    const name = pending.row.entry.player.displayName;
    const result =
      pending.kind === "promote"
        ? game.promoteYouth(pending.row.entry.player.id)
        : game.releaseYouth(pending.row.entry.player.id);
    setPending(undefined);
    setStatus(
      result.ok
        ? t(pending.kind === "promote" ? "academy.promoted" : "academy.released", { name })
        : result.error === "academy.squad_full"
          ? t("academy.squadFull", { max })
          : result.error === "academy.match_in_progress"
            ? t("academy.matchInProgress")
            : result.error === "academy.foreign_limit"
              ? t("academy.foreignLimit")
              : t("academy.error"),
    );
  };

  const columns: Column<AcademyRow>[] = [
    {
      key: "position",
      header: t("col.playerPosition"),
      render: (row) => label(`position.${row.entry.player.position}`),
      sortValue: (row) => POSITIONS.indexOf(row.entry.player.position),
    },
    {
      key: "name",
      header: t("col.player"),
      render: (row) => row.entry.player.displayName,
      sortValue: (row) => row.entry.player.displayName,
    },
    {
      // Captação (040): "Safra" ou "Captado (região)", sempre em texto.
      key: "origin",
      header: t("col.origin"),
      render: (row) =>
        row.entry.origin
          ? t("academy.origin.scouted", { region: regionName(save, row.entry.origin.region) })
          : t("academy.origin.academy"),
    },
    {
      key: "age",
      header: t("col.age"),
      render: (row) => row.age,
      sortValue: (row) => row.age,
      align: "right",
    },
    {
      key: "strength",
      header: t("col.strength"),
      render: (row) => row.entry.player.strength,
      sortValue: (row) => row.entry.player.strength,
      align: "right",
    },
    {
      key: "estimate",
      header: t("col.estimate"),
      render: (row) => (row.estimate ? <EstimateRange estimate={row.estimate} /> : "—"),
      sortValue: (row) => estimateSortValue(row.estimate),
      align: "right",
    },
    {
      key: "traits",
      header: t("col.traits"),
      render: (row) => row.entry.player.traits.map((trait) => label(`trait.${trait}`)).join(", "),
    },
    {
      key: "leaves",
      header: t("col.leaves"),
      render: (row) =>
        row.lastYear ? (
          <>
            {row.leavesYear} <Badge tone="warning">{t("academy.lastYear")}</Badge>
          </>
        ) : (
          row.leavesYear
        ),
      sortValue: (row) => row.leavesYear,
      align: "right",
    },
    ...(manage
      ? [
          {
            key: "actions",
            header: t("col.actions"),
            render: (row: AcademyRow) => (
              <span className={styles.actions}>
                <Button
                  disabled={promoteBlocked !== undefined}
                  aria-label={t("academy.promoteAria", { name: row.entry.player.displayName })}
                  aria-describedby={promoteBlocked ? hintId : undefined}
                  onClick={(event) => {
                    event.stopPropagation();
                    setPending({ kind: "promote", row });
                  }}
                >
                  {t("academy.promote")}
                </Button>
                <Button
                  variant="danger"
                  disabled={live}
                  aria-label={t("academy.releaseAria", { name: row.entry.player.displayName })}
                  onClick={(event) => {
                    event.stopPropagation();
                    setPending({ kind: "release", row });
                  }}
                >
                  {t("academy.release")}
                </Button>
              </span>
            ),
          } satisfies Column<AcademyRow>,
        ]
      : []),
  ];

  const contract =
    pending?.kind === "promote"
      ? youthContractPreview(save, pending.row.entry.player.id)
      : undefined;

  return (
    <div className={styles.layout}>
      <AcademyPanel save={save} game={game} />
      {status ? <p role="status">{status}</p> : null}
      {warning ? (
        <Notice tone="warning" title={t("academy.lastYear")}>
          <p>{t("academy.warning.lastWindow", { count: warning.count })}</p>
        </Notice>
      ) : null}
      {manage && emergency.length > 0 ? (
        <Notice tone="danger" title={t("academy.emergency.title")}>
          <p>{t("academy.emergency.body")}</p>
          <span className={styles.actions}>
            {emergency.map((position) => (
              <Button
                key={position}
                variant="primary"
                disabled={live}
                onClick={() => {
                  const result = game.emergencyYouth(position);
                  const name = label(`position.${position}`);
                  setStatus(
                    result.ok
                      ? t("academy.emergency.done", { position: name })
                      : t("academy.error"),
                  );
                }}
              >
                {t("academy.emergency.action", { position: label(`position.${position}`) })}
              </Button>
            ))}
          </span>
        </Notice>
      ) : null}
      <div className={styles.header}>
        <p className={styles.capacity}>
          {t("academy.capacity", { count: capacity.count, limit: capacity.limit })}
        </p>
        {capacity.excess > 0 ? (
          <p className={styles.excess}>{t("academy.excess", { excess: capacity.excess })}</p>
        ) : null}
      </div>
      {!manage ? (
        <p className={styles.hint}>{t("academy.readOnly", { club: club?.name ?? "" })}</p>
      ) : null}
      {manage && promoteBlocked ? (
        <p id={hintId} className={styles.hint}>
          {promoteBlocked}
        </p>
      ) : null}
      {all.length > 0 ? (
        <div className={styles.filters}>
          <label className={styles.field} htmlFor={filterId}>
            <span>{t("academy.filter.position")}</span>
            <select
              id={filterId}
              value={position}
              onChange={(event) => setPosition(event.target.value as Position | "")}
            >
              <option value="">{t("academy.filter.anyPosition")}</option>
              {POSITIONS.map((item) => (
                <option key={item} value={item}>
                  {label(`position.${item}`)}
                </option>
              ))}
            </select>
          </label>
          <p className={styles.hint}>{t("academy.estimate.help")}</p>
        </div>
      ) : null}
      {all.length === 0 ? (
        <EmptyState title={t("academy.empty.title")}>
          <p>{t("academy.empty.body")}</p>
        </EmptyState>
      ) : rows.length === 0 ? (
        <p className={styles.hint}>{t("academy.filter.none")}</p>
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.entry.player.id}
          caption={t("academy.caption", { club: club?.name ?? "" })}
          initialSort={{ column: "position", direction: "ascending" }}
        />
      )}
      <Dialog
        open={pending !== undefined}
        title={
          pending
            ? t(pending.kind === "promote" ? "academy.promoteTitle" : "academy.releaseTitle", {
                name: pending.row.entry.player.displayName,
              })
            : ""
        }
        onClose={() => setPending(undefined)}
        actions={
          <>
            <Button variant={pending?.kind === "release" ? "danger" : "primary"} onClick={confirm}>
              {t(pending?.kind === "release" ? "academy.release" : "academy.promote")}
            </Button>
            <Button onClick={() => setPending(undefined)}>{t("academy.cancel")}</Button>
          </>
        }
      >
        <p>
          {pending?.kind === "promote" && contract
            ? t("academy.promoteBody", {
                wage: formatMoney(contract.wage),
                year: contract.untilYear,
              })
            : t("academy.releaseBody")}
        </p>
      </Dialog>
    </div>
  );
}
