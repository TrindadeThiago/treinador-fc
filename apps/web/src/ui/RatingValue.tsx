"use client";

import { formatRating, useT } from "../i18n";
import styles from "./RatingValue.module.css";

/** A partir desta nota o tom é bom, e abaixo de `BAD_BELOW` é ruim; o número é sempre o texto. */
export const GOOD_FROM = 7;
export const BAD_BELOW = 5.5;

/** Nota de um jogador (034) com uma casa, ou "sem nota"; a cor só reforça o número. */
export function RatingValue({ rating }: { rating: number | undefined }) {
  const t = useT();
  if (rating === undefined) return <span className={styles.none}>{t("rating.none")}</span>;
  const tone = rating >= GOOD_FROM ? styles.good : rating < BAD_BELOW ? styles.bad : "";
  return <span className={`${styles.rating} ${tone}`}>{formatRating(rating)}</span>;
}
