"use client";

import type { Headline } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import { HeadlineCard } from "./HeadlineCard";
import styles from "./news.module.css";

/** Lista de manchetes de uma rodada, cada uma em seu cartão (as mais relevantes primeiro). */
export function RoundFeed({
  save,
  headlines,
  round,
  limit,
  compact,
}: {
  save: SaveFile;
  headlines: readonly Headline[];
  round: number;
  limit?: number;
  compact?: boolean | undefined;
}) {
  const t = useT();
  if (headlines.length === 0) return <p className={styles.empty}>{t("news.empty")}</p>;
  return (
    <ul className={styles.list}>
      {headlines.slice(0, limit ?? headlines.length).map((headline) => (
        <li key={headline.id}>
          <HeadlineCard save={save} headline={headline} round={round} compact={compact} />
        </li>
      ))}
    </ul>
  );
}
