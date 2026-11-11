"use client";

import { availableRegions, regionKey, type ScoutOffer } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useId, useState } from "react";
import type { useGame } from "../../game/GameProvider";
import { nextOfferRound, regionName, scoutingPanelOf, signBlock } from "../../game/scouting-view";
import { formatMoney, label, useT } from "../../i18n";
import { Button } from "../Button";
import { type Column, DataTable } from "../DataTable";
import { Dialog } from "../Dialog";
import { EstimateRange } from "../EstimateRange";
import styles from "./market.module.css";

type Game = ReturnType<typeof useGame>;

/**
 * Captação de jovens (040, contracts/ui-recruitment.md): região de captação, a próxima data e as
 * indicações abertas, com Trazer (confirmação com o custo e o caixa depois) e Recusar. Os motivos de
 * indisponibilidade aparecem em texto.
 */
export function RecruitmentPanel({ save, game }: { save: SaveFile; game: Game }) {
  const t = useT();
  const regionId = useId();
  const [pending, setPending] = useState<ScoutOffer | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const panel = scoutingPanelOf(save);
  const live = game.state.live !== undefined;
  const scouting = save.scouting;
  const regions = availableRegions(save.bank, save.clubId);
  const chosen = scouting.pendingRegion === undefined ? scouting.region : scouting.pendingRegion;
  const offers = scouting.offers ?? [];
  const cash = save.finances.clubs[save.clubId]?.cash ?? 0;
  const next = nextOfferRound(save);
  const country = (id: string) => save.bank.countries.find((entry) => entry.id === id)?.code ?? id;

  if (panel.level === 0) {
    return (
      <section aria-label={t("recruitment.title")} className={styles.scoutingPanel}>
        <h3>{t("recruitment.title")}</h3>
        <p className={styles.hint}>{t("recruitment.closed")}</p>
      </section>
    );
  }

  const columns: Column<ScoutOffer>[] = [
    { key: "name", header: t("col.player"), render: (row) => row.player.displayName },
    {
      key: "age",
      header: t("col.age"),
      render: (row) => t("recruitment.age", { age: ageOf(row, save) }),
    },
    {
      key: "position",
      header: t("col.playerPosition"),
      render: (row) => label(`position.${row.player.position}`),
    },
    {
      key: "strength",
      header: t("col.strength"),
      render: (row) => row.player.strength,
      align: "right",
    },
    {
      key: "country",
      header: t("col.country"),
      render: (row) => country(row.player.nationalityId),
    },
    {
      key: "potential",
      header: t("market.col.potential"),
      render: (row) => <EstimateRange estimate={row.estimate} />,
      align: "right",
    },
    {
      key: "attributes",
      header: t("recruitment.col.attributes"),
      render: (row) =>
        row.temperament && row.injury
          ? `${t(`scouting.temperament.${row.temperament}`)} · ${t(`scouting.injury.${row.injury}`)}`
          : t("scouting.notYet"),
    },
    {
      key: "cost",
      header: t("recruitment.col.cost"),
      render: (row) => formatMoney(row.cost),
      align: "right",
    },
    {
      key: "until",
      header: t("recruitment.col.until"),
      render: (row) => t("recruitment.until", { round: row.expiresRound }),
    },
    {
      key: "actions",
      header: t("col.actions"),
      render: (row) => {
        const block = signBlock(save, row);
        return (
          <span className={styles.actions}>
            <Button
              variant="primary"
              disabled={live || block !== undefined}
              aria-label={t("recruitment.signAria", { name: row.player.displayName })}
              title={block ? t(block.key, formatParams(block.params)) : undefined}
              onClick={() => setPending(row)}
            >
              {t("recruitment.sign")}
            </Button>
            <Button
              disabled={live}
              aria-label={t("recruitment.declineAria", { name: row.player.displayName })}
              onClick={() => {
                const result = game.declineScoutOffer(row.id);
                setStatus(
                  result.ok
                    ? t("recruitment.done.decline", { name: row.player.displayName })
                    : t("scouting.error"),
                );
              }}
            >
              {t("recruitment.decline")}
            </Button>
            {block ? (
              <span className={styles.hint}>{t(block.key, formatParams(block.params))}</span>
            ) : null}
          </span>
        );
      },
    },
  ];

  return (
    <section aria-label={t("recruitment.title")} className={styles.scoutingPanel}>
      <h3>{t("recruitment.title")}</h3>
      <label className={styles.field} htmlFor={regionId}>
        <span>{t("recruitment.region")}</span>
        <select
          id={regionId}
          value={chosen ? regionKey(chosen) : ""}
          disabled={live}
          onChange={(event) => {
            const region = regions.find((item) => regionKey(item) === event.target.value);
            const result = game.setScoutingRegion(region);
            setStatus(result.ok ? t("recruitment.done.region") : t("scouting.error"));
          }}
        >
          <option value="">{t("recruitment.region.none")}</option>
          {regions.map((region) => (
            <option key={regionKey(region)} value={regionKey(region)}>
              {region.kind === "state"
                ? t("recruitment.region.state", { name: regionName(save, region) })
                : t("recruitment.region.country", { name: regionName(save, region) })}
            </option>
          ))}
        </select>
      </label>
      {scouting.pendingRegion !== undefined ? (
        <p className={styles.hint}>{t("recruitment.pending")}</p>
      ) : null}
      <p className={styles.hint}>
        {next !== undefined
          ? t("recruitment.next.round", { round: next })
          : t("recruitment.next.preseason")}
      </p>
      {status ? <p role="status">{status}</p> : null}
      {offers.length === 0 ? (
        <p className={styles.hint}>{t("recruitment.empty")}</p>
      ) : (
        <DataTable
          rows={offers}
          columns={columns}
          rowKey={(row) => row.id}
          caption={t("recruitment.caption")}
        />
      )}
      <Dialog
        open={pending !== undefined}
        title={pending ? t("recruitment.confirmTitle", { name: pending.player.displayName }) : ""}
        onClose={() => setPending(undefined)}
        actions={
          <>
            <Button
              variant="primary"
              onClick={() => {
                if (!pending) return;
                const result = game.signScoutOffer(pending.id);
                setStatus(
                  result.ok
                    ? t("recruitment.done.sign", { name: pending.player.displayName })
                    : t("scouting.error"),
                );
                setPending(undefined);
              }}
            >
              {t("recruitment.sign")}
            </Button>
            <Button onClick={() => setPending(undefined)}>{t("scouting.cancelAction")}</Button>
          </>
        }
      >
        {pending ? (
          <p>
            {t("recruitment.confirmBody", {
              cost: formatMoney(pending.cost),
              cash: formatMoney(cash - pending.cost),
            })}
          </p>
        ) : null}
      </Dialog>
    </section>
  );
}

function ageOf(offer: ScoutOffer, save: SaveFile): number {
  return save.league.year - Number(offer.player.birthDate.slice(0, 4));
}

function formatParams(params: Record<string, string | number> | undefined) {
  if (!params) return {};
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      key === "missing" && typeof value === "number" ? formatMoney(value) : value,
    ]),
  );
}
