"use client";

import type { SaveFile } from "@brasfoot-like/save";
import { scoutReport, yearOfSeason } from "../game/scouting-view";
import { useT } from "../i18n";
import { EstimateRange } from "./EstimateRange";
import styles from "./PlayerDetails.module.css";

/**
 * Relatório do olheiro (039 FR-017): faixa de potencial, temperamento e propensão a lesões em texto,
 * confiança e data. Nada aparece em número além da faixa; nada é sinalizado só por cor.
 */
export function ScoutReport({ save, playerId }: { save: SaveFile; playerId: string }) {
  const t = useT();
  const report = scoutReport(save, playerId);
  if (!report) return null;
  const rows: [string, React.ReactNode][] = [
    ["scouting.report.potential", <EstimateRange key="e" estimate={report.estimate} />],
    [
      "scouting.report.temperament",
      report.temperament ? t(`scouting.temperament.${report.temperament}`) : t("scouting.notYet"),
    ],
    [
      "scouting.report.injury",
      report.injury ? t(`scouting.injury.${report.injury}`) : t("scouting.notYet"),
    ],
    ["scouting.report.confidence", t(`scouting.confidence.${report.confidence}`)],
  ];
  return (
    <section aria-label={t("scouting.report.title")}>
      <h3 className={styles.heading}>{t("scouting.report.title")}</h3>
      <dl className={styles.list}>
        {rows.map(([key, value]) => (
          <div key={key} className={styles.row}>
            <dt>{t(key)}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.note}>
        {t("scouting.report.updated", {
          round: report.updated.round,
          year: yearOfSeason(save, report.updated.season),
        })}
      </p>
    </section>
  );
}
