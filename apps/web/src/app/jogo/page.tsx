"use client";

import { isCareerSeasonOver, isEmployed, type SaveFile } from "@brasfoot-like/save";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GameLayout } from "../../game/GameLayout";
import { useT } from "../../i18n";
import { Button } from "../../ui/Button";
import { BoardNotice } from "../../ui/board/BoardNotice";
import { JobOffers } from "../../ui/board/JobOffers";
import { Card } from "../../ui/Card";
import { ClubMoodCard } from "../../ui/home/ClubMoodCard";
import { HomeHeader } from "../../ui/home/HomeHeader";
import { MatchPreview } from "../../ui/home/MatchPreview";
import { NoticeStrip } from "../../ui/home/NoticeStrip";
import { TablePositionCard } from "../../ui/home/TablePositionCard";
import { NewsCard } from "../../ui/news/NewsCard";
import { screenHref } from "../../ui/shell/screens";
import styles from "./page.module.css";

type Game = Parameters<Parameters<typeof GameLayout>[0]["children"]>[1];

/** Início do técnico desempregado (012 US4, 035 US6): reputação, propostas e as rodadas do mundo. */
function Unemployed({
  save,
  game,
  play,
}: {
  save: SaveFile;
  game: Game;
  play: (mode: "live" | "direct") => Promise<void>;
}) {
  const t = useT();
  const over = isCareerSeasonOver(save);
  return (
    <div className={styles.grid}>
      <div className={styles.header}>
        <HomeHeader save={save} unemployed />
      </div>
      {save.board.notice ? (
        <div className={styles.notices}>
          <BoardNotice save={save} onDismiss={game.dismissBoardNotice} />
        </div>
      ) : null}
      <Card aria-label={t("career.unemployed")} className={`${styles.card} ${styles.next}`}>
        <h2>{t("career.unemployed")}</h2>
        <p>{t("career.unemployedDetail")}</p>
        <h3>{t("career.offers.title")}</h3>
        <JobOffers
          save={save}
          disabled={game.state.live !== undefined}
          onAccept={(offerId) => void game.acceptJobOffer(offerId)}
          onDecline={(offerId) => game.declineJobOffer(offerId)}
        />
        <div className={styles.actions} data-tip-anchor="play">
          <Button
            variant="primary"
            disabled={over || game.state.simulating}
            onClick={() => void play("live")}
          >
            {t("home.playLive")}
          </Button>
          <Button disabled={over || game.state.simulating} onClick={() => void play("direct")}>
            {t("home.simulate")}
          </Button>
          {game.state.simulating ? <p role="status">{t("home.simulating")}</p> : null}
        </div>
        {over ? (
          <div className={styles.actions}>
            <Link href={screenHref("/jogo/fim-de-temporada", save.id)}>
              {t("home.seasonEndLink")}
            </Link>
            <Button variant="primary" onClick={() => void game.advanceToNextSeason()}>
              {t("home.nextSeason")}
            </Button>
          </div>
        ) : null}
      </Card>
      <div className={styles.table}>
        <NewsCard save={save} compact />
      </div>
    </div>
  );
}

/** Início do clube (035): um painel em grade que cabe numa tela, sem rolar. */
export default function HomePage() {
  const router = useRouter();
  return (
    <GameLayout>
      {(save, game) => {
        const play = async (mode: "live" | "direct") => {
          const outcome = await game.playRound(mode);
          if (outcome === "live") router.push(screenHref("/jogo/rodada", save.id));
          if (outcome === "finished") router.push(screenHref("/jogo/fim-de-temporada", save.id));
        };
        if (!isEmployed(save)) return <Unemployed save={save} game={game} play={play} />;
        return (
          <div className={styles.grid}>
            <div className={styles.header}>
              <HomeHeader save={save} />
            </div>
            <div className={styles.next}>
              <MatchPreview save={save} game={game} play={play} />
            </div>
            <div className={styles.notices}>
              <NoticeStrip save={save} game={game} />
            </div>
            <div className={styles.table}>
              <TablePositionCard save={save} />
            </div>
            <div className={styles.mood}>
              <ClubMoodCard save={save} />
            </div>
            <div className={styles.news}>
              <NewsCard save={save} compact />
            </div>
          </div>
        );
      }}
    </GameLayout>
  );
}
