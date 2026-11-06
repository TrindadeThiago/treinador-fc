"use client";

import { type MatchRatings, type MatchRecord, playerLines, type Side } from "@brasfoot-like/engine";
import { useT } from "../i18n";
import styles from "./PlaysTable.module.css";
import { RatingValue } from "./RatingValue";

/**
 * Notas de um time numa partida sem jogadas (034): Jogador · Minutos · Nota, uma linha por
 * jogador que entrou em campo, na ordem de entrada. As notas aqui são as simplificadas.
 */
export function RatingsTable({
  record,
  side,
  club,
  names,
  ratings,
}: {
  record: MatchRecord;
  side: Side;
  club: string;
  names: ReadonlyMap<string, string>;
  ratings: MatchRatings;
}) {
  const t = useT();
  const rows = Object.entries(playerLines(record)).filter(
    ([, line]) => line.side === side && line.minutes > 0,
  );
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <caption>{t("rating.caption", { club })}</caption>
        <thead>
          <tr>
            <th scope="col">{t("summary.plays.player")}</th>
            <th scope="col">{t("rating.minutes")}</th>
            <th scope="col">{t("rating.column")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([playerId, line]) => (
            <tr key={playerId}>
              <th scope="row">{names.get(playerId) ?? playerId}</th>
              <td>{line.minutes}</td>
              <td>
                <RatingValue rating={ratings.players[playerId]?.rating} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
