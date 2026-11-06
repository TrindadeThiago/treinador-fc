"use client";

import { fansRules, moodBand } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import Link from "next/link";
import { confidenceLevel, TREND_SYMBOL, type Trend, trendOf } from "../../game/board-view";
import { goalSummary } from "../../game/home-view";
import { useT } from "../../i18n";
import { Card } from "../Card";
import { Meter } from "../Meter";
import { screenHref } from "../shell/screens";
import styles from "./home.module.css";

function TrendText({ trend, text }: { trend: Trend; text: string }) {
  return (
    <span className={trend === "up" ? styles.up : trend === "down" ? styles.down : styles.muted}>
      <span aria-hidden="true">{TREND_SYMBOL[trend]} </span>
      {text}
    </span>
  );
}

/**
 * Torcida e diretoria num cartão só (035 US5): para cada uma, o valor, a barra e a tendência; embaixo,
 * as metas numa linha e o caminho para a Carreira. Os motivos recentes ficam na Carreira.
 */
export function ClubMoodCard({ save }: { save: SaveFile }) {
  const t = useT();
  const clubId = save.clubId;
  const fans = save.fans.clubs[clubId];
  const board = save.board.manager.clubId ? save.board.clubs[save.board.manager.clubId] : undefined;
  const goals = goalSummary(save);
  const band = fans
    ? moodBand(fansRules(save.bank, save.league.competitionId), fans.mood)
    : undefined;
  const level = board ? confidenceLevel(board.confidence) : undefined;
  return (
    <Card aria-label={t("home.mood.title")} className={styles.card}>
      <div className={styles.cardHead}>
        <h2>{t("home.mood.title")}</h2>
        <Link href={screenHref("/jogo/carreira", save.id)}>{t("nav.career")}</Link>
      </div>
      {fans && band ? (
        <div className={styles.moodRow}>
          <span className={styles.moodName}>{t("home.mood.fans")}</span>
          <span className={styles.moodValue}>{fans.mood}</span>
          <Meter
            value={fans.mood}
            label={t("fans.mood", { value: fans.mood })}
            text={t(`fans.band.${band}`)}
            tone={
              band === "furious" || band === "unhappy"
                ? "danger"
                : band === "neutral"
                  ? "warning"
                  : "accent"
            }
          />
          <TrendText trend={trendOf(fans.recent)} text={t(`fans.trend.${trendOf(fans.recent)}`)} />
        </div>
      ) : null}
      {board && level ? (
        <div className={styles.moodRow}>
          <span className={styles.moodName}>{t("home.mood.board")}</span>
          <span className={styles.moodValue}>{board.confidence}</span>
          <Meter
            value={board.confidence}
            label={t("board.confidence", { value: board.confidence })}
            text={t("board.level", { level })}
            tone={level === "high" ? "accent" : level === "medium" ? "warning" : "danger"}
          />
          <TrendText
            trend={trendOf(board.recent)}
            text={t(`board.trend.${trendOf(board.recent)}`)}
          />
        </div>
      ) : null}
      <p className={styles.muted}>
        {t("board.reputation", { value: save.board.manager.reputation })}
      </p>
      {save.board.manager.noFiring ? <p className={styles.muted}>{t("board.noFiring")}</p> : null}
      {goals ? (
        <p className={styles.muted}>
          {goals.total > 0
            ? t("home.mood.goals", { onTrack: goals.onTrack, total: goals.total })
            : t("home.mood.goalsPending")}
        </p>
      ) : null}
    </Card>
  );
}
