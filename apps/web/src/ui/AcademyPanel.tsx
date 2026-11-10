"use client";

import type { SaveFile } from "@brasfoot-like/save";
import { useId, useMemo, useState } from "react";
import { type AcademyPanelView, academyPanelView } from "../game/academy-view";
import type { useGame } from "../game/GameProvider";
import { formatMoney, useT } from "../i18n";
import styles from "./AcademyPanel.module.css";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Meter } from "./Meter";

type Game = ReturnType<typeof useGame>;

/** Painel da academia (037 US1–US4): nível, efeito, manutenção, mudança pendente e ações. */
export function AcademyPanel({ save, game }: { save: SaveFile; game: Game }) {
  const t = useT();
  const view = useMemo(() => academyPanelView(save), [save]);
  const [dialog, setDialog] = useState<"upgrade" | "downgrade" | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const upgradeHint = useId();
  const downgradeHint = useId();
  const effectText = (effect: AcademyPanelView["effect"]) =>
    t("academy.panel.effect", {
      count: effect.youthPerIntake,
      quality: t(`academy.quality.${effect.quality}`),
      slots: effect.slots,
    });
  const why = (reason: string, missing?: number) =>
    t(`academy.panel.why.${reason}`, missing !== undefined ? { amount: formatMoney(missing) } : {});
  const run = (kind: "upgrade" | "downgrade" | "cancel") => {
    const result =
      kind === "upgrade"
        ? game.upgradeAcademy()
        : kind === "downgrade"
          ? game.downgradeAcademy()
          : game.cancelAcademyChange();
    setDialog(undefined);
    setStatus(result.ok ? t(`academy.panel.done.${kind}`) : t("academy.error"));
  };
  const title = t("academy.panel.title");
  // Mesmo motivo nos dois botões (pendência, sem clube): uma explicação só.
  const sameReason =
    !view.canUpgrade.ok &&
    !view.canDowngrade.ok &&
    view.canUpgrade.reason === view.canDowngrade.reason;
  const downgradeDescribedBy = view.canDowngrade.ok
    ? undefined
    : sameReason
      ? upgradeHint
      : downgradeHint;
  return (
    <section aria-label={title} className={styles.panel}>
      <h2>{title}</h2>
      {status ? <p role="status">{status}</p> : null}
      <Meter
        value={(100 * view.level) / view.maxLevel}
        label={title}
        text={t("academy.panel.level", { level: view.level, max: view.maxLevel })}
      />
      <p className={styles.text}>
        {t("academy.panel.maintenance", { amount: formatMoney(view.maintenance) })}
      </p>
      <p className={styles.text}>{effectText(view.effect)}</p>
      <p className={styles.muted}>
        {view.next
          ? t("academy.panel.next", { effect: effectText(view.next) })
          : t("academy.panel.maxLevel")}
      </p>
      {view.pending ? (
        <div className={styles.row}>
          <p className={styles.text}>
            {view.pending.kind === "upgrade"
              ? t("academy.panel.pendingUpgrade", { level: view.level + 1 })
              : t("academy.panel.pendingDowngrade", { level: view.level - 1 })}
          </p>
          {view.pending.kind === "downgrade" ? (
            <Button onClick={() => run("cancel")}>{t("academy.panel.cancelDowngrade")}</Button>
          ) : null}
        </div>
      ) : null}
      <div className={styles.row}>
        <Button
          variant="primary"
          disabled={!view.canUpgrade.ok}
          aria-describedby={view.canUpgrade.ok ? undefined : upgradeHint}
          onClick={() => setDialog("upgrade")}
        >
          {t("academy.panel.upgrade")}
        </Button>
        <Button
          disabled={!view.canDowngrade.ok}
          aria-describedby={downgradeDescribedBy}
          onClick={() => setDialog("downgrade")}
        >
          {t("academy.panel.downgrade")}
        </Button>
      </div>
      {!view.canUpgrade.ok ? (
        <p id={upgradeHint} className={styles.muted}>
          {why(view.canUpgrade.reason, view.canUpgrade.missing)}
        </p>
      ) : null}
      {!view.canDowngrade.ok && !sameReason ? (
        <p id={downgradeHint} className={styles.muted}>
          {why(view.canDowngrade.reason)}
        </p>
      ) : null}
      <details>
        <summary>{t("academy.panel.division")}</summary>
        <ol className={styles.list}>
          {view.division.map((entry) => (
            <li key={entry.clubId}>
              {t("academy.panel.divisionRow", { club: entry.name, level: entry.level })}
              {entry.own ? ` ${t("academy.panel.own")}` : null}
            </li>
          ))}
        </ol>
      </details>
      <Dialog
        open={dialog !== undefined}
        title={
          dialog === "upgrade"
            ? t("academy.panel.upgradeTitle", { level: view.level + 1 })
            : t("academy.panel.downgradeTitle", { level: view.level - 1 })
        }
        onClose={() => setDialog(undefined)}
        actions={
          <>
            <Button variant="primary" onClick={() => (dialog ? run(dialog) : undefined)}>
              {t(dialog === "upgrade" ? "academy.panel.upgrade" : "academy.panel.downgrade")}
            </Button>
            <Button onClick={() => setDialog(undefined)}>{t("academy.panel.cancel")}</Button>
          </>
        }
      >
        {dialog === "upgrade" && view.next ? (
          <p>
            {t("academy.panel.upgradeBody", {
              cost: formatMoney(view.next.cost),
              cash: formatMoney(view.cash - view.next.cost),
              current: formatMoney(view.maintenance),
              next: formatMoney(view.next.maintenance),
            })}
          </p>
        ) : null}
        {dialog === "downgrade" && view.previous ? (
          <>
            <p>
              {t("academy.panel.downgradeBody", {
                current: formatMoney(view.maintenance),
                next: formatMoney(view.previous.maintenance),
              })}
            </p>
            <p>{t("academy.panel.downgradeSlots", { slots: view.previous.slots })}</p>
          </>
        ) : null}
      </Dialog>
    </section>
  );
}
