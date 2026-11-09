"use client";

import type { PlayerDelta, PlayerRef } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { label, useT } from "../i18n";
import { Button } from "./Button";
import { evolutionText } from "./evolution-text";
import styles from "./SquadChangeNotice.module.css";

// A safra vai para a base (036): "arrived" só aparece em avisos de saves antigos.
const SECTIONS = [
  "retired",
  "arrived",
  "released",
  "academyArrived",
  "promoted",
  "academyAgedOut",
  "academyReleased",
] as const;

/** Resumo das mudanças do elenco na virada (009 US6), até o jogador dispensar. */
export function SquadChangeNotice({
  save,
  onDismiss,
  compact,
}: {
  save: SaveFile;
  onDismiss: () => void;
  /** Na Início (035): uma linha com a contagem e as listas num detalhe que abre com um clique. */
  compact?: boolean | undefined;
}) {
  const t = useT();
  const notice = save.renewal.squadNotice;
  if (!notice || notice.season !== save.league.number || notice.clubId !== save.clubId) return null;
  const title = t("renewal.notice.title", { year: save.league.year });
  const playerLine = (ref: PlayerRef) =>
    t("renewal.notice.player", {
      name: ref.displayName,
      position: label(`position.${ref.position}`),
      age: ref.age,
      strength: ref.strength,
    });
  const deltaLine = (ref: PlayerDelta) =>
    t("renewal.notice.delta", { name: ref.displayName, delta: evolutionText(ref.delta) });
  const groups: { key: string; title: string; lines: string[] }[] = [
    ...SECTIONS.map((section) => ({
      key: section,
      title: t(`renewal.notice.${section}`),
      lines: (notice[section] ?? []).map(playerLine),
    })),
    { key: "risers", title: t("renewal.notice.risers"), lines: notice.risers.map(deltaLine) },
    { key: "fallers", title: t("renewal.notice.fallers"), lines: notice.fallers.map(deltaLine) },
  ].filter((group) => group.lines.length > 0);
  const count = groups.reduce((sum, group) => sum + group.lines.length, 0);
  const detail = (
    <div className={styles.groups}>
      {groups.map((group) => (
        <section key={group.key} aria-label={group.title}>
          <h3>{group.title}</h3>
          <ul>
            {group.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
  return (
    <section aria-label={title} className={styles.notice}>
      <h2>{title}</h2>
      {groups.length === 0 ? (
        <p>{t("renewal.notice.empty")}</p>
      ) : compact ? (
        <>
          <p>{t("home.notice.squadChanges", { count })}</p>
          <details>
            <summary>{t("home.notice.details")}</summary>
            {detail}
          </details>
        </>
      ) : (
        detail
      )}
      <Button onClick={onDismiss}>{t("renewal.notice.dismiss")}</Button>
    </section>
  );
}
