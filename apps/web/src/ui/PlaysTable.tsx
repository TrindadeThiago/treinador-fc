"use client";

import {
  type MatchRecord,
  type PlayStats,
  playStatsOf,
  playTotals,
  type Side,
} from "@brasfoot-like/engine";
import { formatNumber, useT } from "../i18n";
import styles from "./PlaysTable.module.css";

/**
 * Jogadas de um time numa partida (033): uma linha por jogador que entrou em campo, na ordem de
 * entrada, e o total. O quadro rola na horizontal dentro de si; a página não.
 */
export function PlaysTable({
  record,
  side,
  club,
  names,
}: {
  record: MatchRecord;
  side: Side;
  club: string;
  names: ReadonlyMap<string, string>;
}) {
  const t = useT();
  const totals = playTotals(record.players, side);
  if (!totals) return null;
  const rows = Object.entries(record.players).flatMap(([playerId, line]) =>
    line.side === side && line.plays && line.minutes > 0
      ? [{ playerId, plays: playStatsOf(line.plays) }]
      : [],
  );
  const ratio = (done: number, tried: number) => t("summary.plays.ratio", { done, tried });
  const accuracy = (plays: PlayStats) =>
    plays.passes > 0
      ? t("summary.plays.percent", {
          value: formatNumber(Math.round((plays.passesCompleted / plays.passes) * 100)),
        })
      : t("summary.plays.noPasses");
  const cells = (plays: PlayStats) => (
    <>
      <td>{ratio(plays.passesCompleted, plays.passes)}</td>
      <td>{accuracy(plays)}</td>
      <td>{plays.keyPasses}</td>
      <td>{ratio(plays.tacklesWon, plays.tackles)}</td>
      <td>{plays.interceptions}</td>
    </>
  );
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <caption>{t("summary.plays.caption", { club })}</caption>
        <thead>
          <tr>
            <th scope="col">{t("summary.plays.player")}</th>
            <th scope="col">{t("summary.plays.passes")}</th>
            <th scope="col">{t("summary.plays.accuracy")}</th>
            <th scope="col">{t("summary.plays.keyPasses")}</th>
            <th scope="col">{t("summary.plays.tackles")}</th>
            <th scope="col">{t("summary.plays.interceptions")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ playerId, plays }) => (
            <tr key={playerId}>
              <th scope="row">{names.get(playerId) ?? playerId}</th>
              {cells(plays)}
            </tr>
          ))}
          <tr className={styles.total}>
            <th scope="row">{t("summary.plays.total")}</th>
            {cells(totals)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
