"use client";

import {
  divisionNameOf,
  isCareerSeasonOver,
  type SaveFile,
  userDivisionLevel,
  userSeason,
} from "@brasfoot-like/save";
import Link from "next/link";
import { useMemo } from "react";
import { aggregateOf } from "../../game/aggregate";
import type { useGame } from "../../game/GameProvider";
import { matchPreview, type PreviewSide } from "../../game/home-view";
import { clubPosition } from "../../game/selectors";
import { formatDate, formatWeekday, useT } from "../../i18n";
import { Button } from "../Button";
import { Card } from "../Card";
import { Crest } from "../Crest";
import { phaseLabel } from "../cup/phase";
import { FormChips } from "../FormChips";
import { DerbyBadge } from "../fans/DerbyBadge";
import { screenHref } from "../shell/screens";
import { stageLabel } from "../stages/label";
import styles from "./home.module.css";

type Game = ReturnType<typeof useGame>;

function Side({ save, side }: { save: SaveFile; side: PreviewSide }) {
  const t = useT();
  const club = save.bank.clubs.find((entry) => entry.id === side.clubId);
  if (!club) return null;
  return (
    <div className={styles.side}>
      <Crest crest={club.crest} label={club.name} size={44} />
      <strong className={styles.sideName}>{club.name}</strong>
      <span>
        {side.form.length > 0 ? (
          <FormChips form={side.form} />
        ) : (
          <span className={styles.muted}>{t("home.noGames")}</span>
        )}
      </span>
    </div>
  );
}

/**
 * Próximo jogo na Início (035 US2): os dois clubes frente a frente, com a forma de cada um, os
 * dados do jogo, três indicadores (força, condição e desfalques) e as ações de jogar. Troca o
 * conteúdo quando a temporada acabou ou o clube não tem mais jogos (026).
 */
export function MatchPreview({
  save,
  game,
  play,
}: {
  save: SaveFile;
  game: Game;
  play: (mode: "live" | "direct") => Promise<void>;
}) {
  const t = useT();
  const preview = useMemo(() => matchPreview(save), [save]);
  const over = isCareerSeasonOver(save);
  const next = preview?.fixture;
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const isHome = next?.home === save.clubId;
  const opponentId = next ? (isHome ? next.away : next.home) : undefined;
  const competition = next
    ? save.bank.competitions.find((entry) => entry.id === next.competitionId)
    : undefined;
  const firstLeg = next
    ? aggregateOf(save, next, { home: 0, away: 0 }, next.competitionId)
    : undefined;
  return (
    <Card aria-label={t("home.nextMatch")} className={styles.card}>
      <h2>{t("home.nextMatch")}</h2>
      {over ? (
        <p>
          {t("home.seasonOver", {
            position: clubPosition(userSeason(save), save.bank, save.clubId),
            division: divisionNameOf(save, userDivisionLevel(save)),
          })}
        </p>
      ) : preview && next && opponentId ? (
        <>
          <div className={styles.versus}>
            <Side save={save} side={preview.home} />
            <span className={styles.vs} aria-hidden="true">
              ×
            </span>
            <Side save={save} side={preview.away} />
          </div>
          <p className={styles.facts}>
            <span>{competition?.name}</span>
            {(competition?.divisions.length ?? 0) > 1 ? (
              <span>{divisionNameOf(save, userDivisionLevel(save))}</span>
            ) : null}
            <span>
              {stageLabel(save, next) ??
                phaseLabel(save, next.competitionId, next.round) ??
                t("home.roundLabel", { round: next.round })}
            </span>
            <span>
              {t("home.matchWhen", {
                weekday: formatWeekday(next.date),
                date: formatDate(next.date),
              })}
            </span>
            <span>{isHome ? t("home.homeGame") : t("home.awayGame")}</span>
            {firstLeg ? (
              <span>
                {t("cup.firstLeg", {
                  home: clubs.get(next.home)?.shortName ?? next.home,
                  homeGoals: firstLeg.home,
                  awayGoals: firstLeg.away,
                  away: clubs.get(next.away)?.shortName ?? next.away,
                })}
              </span>
            ) : null}
            <DerbyBadge rivalries={save.bank.rivalries} home={save.clubId} away={opponentId} />
          </p>
          <dl className={styles.kpis} aria-label={t("home.preview.title")}>
            <div>
              <dt>{t("home.preview.strength")}</dt>
              <dd>
                {t("home.preview.strengthValue", {
                  mine: preview.strength.mine,
                  opponent: preview.strength.opponent,
                })}
              </dd>
            </div>
            <div>
              <dt>{t("home.preview.fitness")}</dt>
              <dd>{t("home.preview.fitnessValue", { value: preview.fitness })}</dd>
            </div>
            <div>
              <dt>{t("home.preview.absences")}</dt>
              <dd>
                {preview.absences}{" "}
                <Link className={styles.kpiLink} href={screenHref("/jogo/escalacao", save.id)}>
                  {t("home.preview.toLineup")}
                </Link>
              </dd>
            </div>
          </dl>
        </>
      ) : (
        <p>{t("home.noMoreMatches")}</p>
      )}
      <div className={styles.actions} data-tip-anchor="play">
        {next || over ? (
          <>
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
          </>
        ) : (
          <Button
            variant="primary"
            disabled={game.state.simulating}
            onClick={() => void play("direct")}
          >
            {t("home.advanceToEnd")}
          </Button>
        )}
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
  );
}
