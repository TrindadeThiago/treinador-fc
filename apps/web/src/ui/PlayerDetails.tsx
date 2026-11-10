"use client";

import { ageOn, clubUnavailability, graduateOf, seasonStats } from "@brasfoot-like/engine";
import { currentDate, type SaveFile, userSeason } from "@brasfoot-like/save";
import { clubSeasonRatings } from "../game/selectors";
import { formatRating, label, useT } from "../i18n";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { evolutionText, lastEvolution } from "./evolution-text";
import { conditionText } from "./PlayerCondition";
import styles from "./PlayerDetails.module.css";

const STATS = [
  ["player.matches", "matches"],
  ["player.minutes", "minutes"],
  ["player.goals", "goals"],
  ["player.assists", "assists"],
  ["player.yellows", "yellows"],
  ["player.reds", "reds"],
  ["player.matchesSuspended", "matchesSuspended"],
  ["player.matchesInjured", "matchesInjured"],
] as const;

/** Estatísticas do jogador na temporada, com o aviso de quem ainda não jogou (compartilhada com o modal do Elenco). */
/** Origem "cria da base" (036 FR-015): clube e ano da promoção, quando o jogador subiu da base. */
export function academyOriginText(
  save: SaveFile,
  playerId: string,
  t: ReturnType<typeof useT>,
): string | undefined {
  const origin = graduateOf(save.renewal, playerId);
  if (!origin) return undefined;
  const club = save.bank.clubs.find((entry) => entry.id === origin.clubId)?.name ?? origin.clubId;
  const year = save.league.year - (save.league.number - origin.season);
  return t("player.academyGraduate", { club, year });
}

/**
 * Faixa de potencial guardada na promoção (038 FR-008): só para quem subiu da base do clube do
 * técnico; continua depois de uma venda. O potencial real nunca é lido aqui.
 */
export function promotionEstimateText(
  save: SaveFile,
  playerId: string,
  t: ReturnType<typeof useT>,
): string | undefined {
  const estimate = graduateOf(save.renewal, playerId)?.estimate;
  return estimate
    ? t("academy.estimate.range", { low: estimate.low, high: estimate.high })
    : undefined;
}

export function PlayerStats({ save, playerId }: { save: SaveFile; playerId: string }) {
  const t = useT();
  const stats = seasonStats(userSeason(save)).find((entry) => entry.playerId === playerId);
  const clubId = save.bank.players.find((entry) => entry.id === playerId)?.clubId ?? save.clubId;
  const rating = clubSeasonRatings(save, clubId).get(playerId);
  return (
    <>
      <h3 className={styles.heading}>{t("player.season")}</h3>
      {!stats || stats.matches === 0 ? (
        <p className={styles.note}>{t("player.notPlayed")}</p>
      ) : null}
      <dl className={styles.stats}>
        {STATS.map(([key, field]) => (
          <div key={key} className={styles.row}>
            <dt>{t(key)}</dt>
            <dd>{String(stats?.[field] ?? 0)}</dd>
          </div>
        ))}
        <div className={styles.row}>
          <dt>{t("player.ratingAverage")}</dt>
          <dd>{rating ? formatRating(rating.average) : t("rating.none")}</dd>
        </div>
        <div className={styles.row}>
          <dt>{t("player.ratedMatches")}</dt>
          <dd>{String(rating?.matches ?? 0)}</dd>
        </div>
        {rating && rating.simplified > 0 ? (
          <div className={styles.row}>
            <dt>{t("player.simplifiedRatings")}</dt>
            <dd>{String(rating.simplified)}</dd>
          </div>
        ) : null}
      </dl>
    </>
  );
}

/** Atributos visíveis e histórico na temporada; nunca os ocultos (FR-019, FR-020). */
export function PlayerDetails({
  save,
  playerId,
  onClose,
}: {
  save: SaveFile;
  playerId: string | undefined;
  onClose: () => void;
}) {
  const t = useT();
  const player = playerId ? save.bank.players.find((entry) => entry.id === playerId) : undefined;
  if (!player) return null;
  const country = save.bank.countries.find((entry) => entry.id === player.nationalityId);
  const condition = clubUnavailability(userSeason(save), save.bank, save.clubId).find(
    (entry) => entry.playerId === player.id,
  );
  const visible: [string, string][] = [
    ["player.position", label(`position.${player.position}`)],
    ["player.strength", String(player.strength)],
    ["player.evolution", evolutionText(lastEvolution(save, player.id))],
    ["player.age", t("player.ageValue", { age: ageOn(player.birthDate, currentDate(save)) })],
    ["player.nationality", country?.name ?? ""],
    [
      "player.traits",
      player.traits.length > 0
        ? player.traits.map((trait) => label(`trait.${trait}`)).join(", ")
        : t("player.noTraits"),
    ],
    ["player.condition", conditionText(t, condition)],
  ];
  const origin = academyOriginText(save, player.id, t);
  if (origin) visible.push(["player.origin", origin]);
  const estimate = promotionEstimateText(save, player.id, t);
  if (estimate) visible.push(["player.estimatePromotion", estimate]);
  return (
    <Dialog
      open
      title={player.displayName}
      onClose={onClose}
      actions={<Button onClick={onClose}>{t("common.close")}</Button>}
    >
      <dl className={styles.list}>
        {visible.map(([key, value]) => (
          <div key={key} className={styles.row}>
            <dt>{t(key)}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <PlayerStats save={save} playerId={player.id} />
    </Dialog>
  );
}
