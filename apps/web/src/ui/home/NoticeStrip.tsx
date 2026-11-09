"use client";

import { pendingOffers } from "@brasfoot-like/engine";
import { academyWarningOf, isEmployed, rosterIssuesOf, type SaveFile } from "@brasfoot-like/save";
import Link from "next/link";
import type { useGame } from "../../game/GameProvider";
import { useT } from "../../i18n";
import { BoardNotice } from "../board/BoardNotice";
import { LineupNotice } from "../LineupNotice";
import { MarketNotice, marketNoticeCounts } from "../MarketNotice";
import { Notice } from "../Notice";
import { rosterText } from "../SimulateDialogs";
import { SquadChangeNotice } from "../SquadChangeNotice";
import { screenHref } from "../shell/screens";
import styles from "./home.module.css";

type Game = ReturnType<typeof useGame>;

/** Avisos ativos antes do jogo, na ordem em que aparecem na faixa (035 FR-011). */
export function activeNotices(save: SaveFile) {
  const market = marketNoticeCounts(save);
  const finances = save.finances.clubs[save.clubId];
  return {
    board: save.board.notice !== undefined,
    offers: pendingOffers(save.board).length,
    crisis: finances?.inCrisis === true ? finances.negativeRounds : undefined,
    squad: save.renewal.squadNotice !== undefined,
    market: market.offers + market.expiring > 0 || market.report,
    lineup: (save.lineupNotice?.length ?? 0) > 0,
    // Base (036): o que impede a próxima partida e os jovens no último ano (última janela).
    roster: rosterIssuesOf(save).filter((issue) => issue.severity === "error"),
    academy: isEmployed(save) ? academyWarningOf(save)?.count : undefined,
  };
}

export function hasNotices(save: SaveFile): boolean {
  const notices = activeNotices(save);
  return (
    notices.board ||
    notices.offers > 0 ||
    notices.crisis !== undefined ||
    notices.squad ||
    notices.market ||
    notices.lineup ||
    notices.roster.length > 0 ||
    notices.academy !== undefined
  );
}

/**
 * Faixa "Antes do jogo" da Início (035 US3): os avisos lado a lado, cada um com título, uma linha e
 * uma ação. Quando, como e onde cada aviso se dispensa não muda (026).
 */
export function NoticeStrip({ save, game }: { save: SaveFile; game: Game }) {
  const t = useT();
  const notices = activeNotices(save);
  if (!hasNotices(save)) return null;
  return (
    <section aria-label={t("home.beforeMatch")} className={styles.strip}>
      <h2 className={styles.stripTitle}>{t("home.beforeMatch")}</h2>
      <ul className={styles.notices}>
        {notices.roster.length > 0 ? (
          <li>
            <Notice tone="danger" title={t("simulate.rosterTitle")}>
              {notices.roster.map((issue) => (
                <p key={issue.code}>{rosterText(issue, t)}</p>
              ))}
              <Link href={`${screenHref("/jogo/elenco", save.id)}&aba=base`}>
                {t("academy.goToBase")}
              </Link>
            </Notice>
          </li>
        ) : null}
        {notices.academy !== undefined ? (
          <li>
            <Notice tone="warning" title={t("academy.lastYear")}>
              <p>{t("academy.warning.lastWindow", { count: notices.academy })}</p>
              <Link href={`${screenHref("/jogo/elenco", save.id)}&aba=base`}>
                {t("academy.goToBase")}
              </Link>
            </Notice>
          </li>
        ) : null}
        {notices.board ? (
          <li>
            <BoardNotice save={save} onDismiss={game.dismissBoardNotice} />
          </li>
        ) : null}
        {notices.offers > 0 ? (
          <li>
            <Notice role="status" tone="info" title={t("career.offers.title")}>
              <p>{t("career.offers.notice", { count: notices.offers })}</p>
              <Link href={`${screenHref("/jogo/carreira", save.id)}&aba=offers`}>
                {t("career.offers.open")}
              </Link>
            </Notice>
          </li>
        ) : null}
        {notices.crisis !== undefined ? (
          <li>
            <Notice tone="danger" title={t("home.notice.crisisTitle")}>
              <p role="alert">{t("home.crisis", { rounds: notices.crisis })}</p>
              <Link href={screenHref("/jogo/financas", save.id)}>
                {t("home.notice.toFinances")}
              </Link>
            </Notice>
          </li>
        ) : null}
        {notices.squad ? (
          <li>
            <SquadChangeNotice save={save} onDismiss={game.dismissSquadNotice} compact />
          </li>
        ) : null}
        {notices.market ? (
          <li>
            <MarketNotice save={save} onDismissReport={game.dismissWindowReport} />
          </li>
        ) : null}
        {notices.lineup ? (
          <li>
            <LineupNotice save={save} onDismiss={game.dismissLineupNotice} compact />
          </li>
        ) : null}
      </ul>
    </section>
  );
}
