"use client";

import { type SaveFile, seasonStateOf, userSeason } from "@brasfoot-like/save";
import Link from "next/link";
import { clubPosition, lastResults } from "../../game/selectors";
import { useT } from "../../i18n";
import { Card } from "../Card";
import { Crest } from "../Crest";
import { screenHref } from "../shell/screens";
import styles from "./home.module.css";

const RESULT = { W: "win", D: "draw", L: "loss" } as const;

/**
 * Posição na tabela (035 US4): a posição em destaque, o caminho para a tabela e os últimos cinco
 * resultados, do mais novo ao mais antigo, com a letra do resultado em texto e o placar colorido.
 */
export function TablePositionCard({ save }: { save: SaveFile }) {
  const t = useT();
  const position = clubPosition(userSeason(save), save.bank, save.clubId);
  const results = lastResults(seasonStateOf(save), save.clubId, 5).reverse();
  const leagueId = userSeason(save).competitionId;
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  return (
    <Card aria-label={t("home.position")} className={styles.card}>
      <div className={styles.cardHead}>
        <h2>{t("home.position")}</h2>
        <Link href={screenHref("/jogo/competicao", save.id)}>{t("home.seeTable")}</Link>
      </div>
      <p className={styles.position}>{t("home.positionValue", { position })}</p>
      <h3 className={styles.subhead}>{t("home.lastResults")}</h3>
      {results.length === 0 ? (
        <p className={styles.muted}>{t("home.noResults")}</p>
      ) : (
        <ul className={styles.results}>
          {results.map((result) => {
            const other = clubs.get(result.opponentId);
            return (
              <li
                key={`${result.competitionId}-${result.round}-${result.opponentId}`}
                data-result={RESULT[result.result]}
              >
                <abbr
                  title={t(`result.${RESULT[result.result]}`)}
                  className={`${styles.letter} ${styles[RESULT[result.result]]}`}
                >
                  {t(`result.${result.result}`)}
                </abbr>
                {other ? <Crest crest={other.crest} label={other.name} size={18} /> : null}
                <span className={styles.opponent}>{other?.shortName}</span>
                <span className={styles.muted}>
                  {result.isHome ? t("calendar.home") : t("calendar.away")}
                </span>
                <span className={styles.muted}>
                  {result.competitionId === leagueId
                    ? t("home.roundLabel", { round: result.round })
                    : save.bank.competitions.find((entry) => entry.id === result.competitionId)
                        ?.name}
                </span>
                <strong className={styles.score}>
                  {result.goalsFor} × {result.goalsAgainst}
                </strong>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
