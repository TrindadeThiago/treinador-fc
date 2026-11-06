"use client";

import type { SaveFile } from "@brasfoot-like/save";
import Link from "next/link";
import { useT } from "../i18n";
import { Button } from "./Button";
import styles from "./LineupNotice.module.css";
import { changeText } from "./lineup-text";
import { Notice } from "./Notice";
import { screenHref } from "./shell/screens";

/** Aviso do ajuste automático da escalação (FR-015), até o jogador dispensar. */
export function LineupNotice({
  save,
  onDismiss,
  compact,
}: {
  save: SaveFile;
  onDismiss: () => void;
  /** Na Início (035): uma linha com a contagem e as trocas num detalhe que abre com um clique. */
  compact?: boolean | undefined;
}) {
  const t = useT();
  const title = t("lineupChange.title");
  const changes = save.lineupNotice ?? [];
  const list = (
    <ul>
      {changes.map((change, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: trocas em ordem, sem identificador próprio
        <li key={index}>{changeText(change, save)}</li>
      ))}
    </ul>
  );
  return (
    <Notice tone="warning" title={title}>
      {compact ? (
        <>
          <p>{t("home.notice.lineupChanges", { count: changes.length })}</p>
          <details>
            <summary>{t("home.notice.details")}</summary>
            {list}
          </details>
        </>
      ) : (
        list
      )}
      <div className={styles.actions}>
        <Link href={screenHref("/jogo/escalacao", save.id)}>{t("lineupChange.view")}</Link>
        <Button onClick={onDismiss}>{t("lineupChange.dismiss")}</Button>
      </div>
    </Notice>
  );
}
