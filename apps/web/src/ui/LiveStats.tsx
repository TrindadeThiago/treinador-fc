"use client";

import { type LiveMatch, livePlayTotals, liveStats, type PlayTotals } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { formatNumber, useT } from "../i18n";
import { Card } from "./Card";
import styles from "./LiveStats.module.css";
import { type ExtraStatRow, StatsTable } from "./StatsTable";

/** Estatísticas comparativas do meu jogo, atualizadas a cada minuto (recolhível). */
export function LiveStats({ match, save }: { match: LiveMatch; save: SaveFile }) {
  const t = useT();
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const home = livePlayTotals(match.state, "home");
  const away = livePlayTotals(match.state, "away");
  const accuracy = (totals: PlayTotals | undefined) =>
    totals?.passAccuracy === undefined
      ? t("summary.plays.noPasses")
      : t("summary.plays.percent", { value: formatNumber(Math.round(totals.passAccuracy * 100)) });
  const passes = (totals: PlayTotals | undefined) =>
    t("summary.plays.ratio", { done: totals?.passesCompleted ?? 0, tried: totals?.passes ?? 0 });
  // Jogadas (033): só nas partidas completas; antes do apito não há nada a mostrar.
  const extra: ExtraStatRow[] =
    home || away
      ? [
          {
            key: "passes",
            label: t("live.plays.passes"),
            home: passes(home),
            away: passes(away),
            bar: [home?.passes ?? 0, away?.passes ?? 0],
          },
          {
            key: "accuracy",
            label: t("live.plays.accuracy"),
            home: accuracy(home),
            away: accuracy(away),
          },
          {
            key: "tackles",
            label: t("live.plays.tackles"),
            home: String(home?.tacklesWon ?? 0),
            away: String(away?.tacklesWon ?? 0),
            bar: [home?.tacklesWon ?? 0, away?.tacklesWon ?? 0],
          },
          {
            key: "interceptions",
            label: t("live.plays.interceptions"),
            home: String(home?.interceptions ?? 0),
            away: String(away?.interceptions ?? 0),
            bar: [home?.interceptions ?? 0, away?.interceptions ?? 0],
          },
        ]
      : [];
  return (
    <Card>
      <details open className={styles.panel}>
        <summary>{t("round.liveStats")}</summary>
        <StatsTable
          home={clubs.get(match.sides.home)?.shortName}
          away={clubs.get(match.sides.away)?.shortName}
          stats={liveStats(match.state)}
          extra={extra}
          bars
        />
      </details>
    </Card>
  );
}
