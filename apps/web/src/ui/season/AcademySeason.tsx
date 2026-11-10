"use client";

import { type AcademyReportRow, academySeasonReport } from "@brasfoot-like/engine";
import { isEmployed, type SaveFile } from "@brasfoot-like/save";
import { label, useT } from "../../i18n";
import { EstimateRange } from "../EstimateRange";
import styles from "./season.module.css";

/**
 * Bloco Base do fim de temporada (038 FR-015): quem chegou à base, quem subiu e quem saiu, com o total
 * de cada lista e "Nenhum" quando ela está vazia. Desempregado, não há base própria: o bloco some.
 */
export function AcademySeason({ save }: { save: SaveFile }) {
  const t = useT();
  if (!isEmployed(save)) return null;
  const report = academySeasonReport(
    save.renewal,
    save.clubId,
    save.league,
    save.bank.manifest.referenceDate,
  );
  const lists: [string, (AcademyReportRow & { reason?: "released" | "ageOut" })[]][] = [
    ["arrived", report.arrived],
    ["promoted", report.promoted],
    ["left", report.left],
  ];
  return (
    <section aria-label={t("seasonEnd.academy")} className={styles.section}>
      <h2>{t("seasonEnd.academy")}</h2>
      <div className={styles.moves}>
        {lists.map(([key, rows]) => {
          const title = t(`seasonEnd.academy.${key}`, { count: rows.length });
          return (
            <section key={key} aria-label={title} className={styles.move}>
              <h3>{title}</h3>
              {rows.length === 0 ? (
                <p className={styles.note}>{t("seasonEnd.academy.none")}</p>
              ) : (
                <ul>
                  {rows.map((row) => (
                    <li key={row.playerId}>
                      {t("seasonEnd.academy.line", {
                        name: row.displayName,
                        position: label(`position.${row.position}`),
                        age: row.age,
                      })}
                      {row.reason ? ` · ${t(`seasonEnd.academy.reason.${row.reason}`)}` : null}
                      {key === "arrived" && row.estimate ? (
                        <>
                          {" · "}
                          {t("col.estimate")} <EstimateRange estimate={row.estimate} />
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
