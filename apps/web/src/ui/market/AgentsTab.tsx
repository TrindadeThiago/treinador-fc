"use client";

import { type AgentRow, agentsViewOf, portfolioOf } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useState } from "react";
import { formatMoney, useT } from "../../i18n";
import { Button } from "../Button";
import { Card } from "../Card";
import { type Column, DataTable } from "../DataTable";
import { EmptyState } from "../EmptyState";
import styles from "./market.module.css";

/**
 * Empresários com quem o clube negociou (042 US2): relação, ganância e influência em texto, o
 * tamanho da carteira e o último negócio. Escolher um mostra a carteira, com o detalhe de cada jogador.
 */
export function AgentsTab({
  save,
  onOpen,
}: {
  save: SaveFile;
  onOpen: (playerId: string) => void;
}) {
  const t = useT();
  const [chosen, setChosen] = useState<string | undefined>();
  const rows = agentsViewOf(save.market, save.bank, save.seed, save.clubId);
  const country = (id: string) => save.bank.countries.find((entry) => entry.id === id)?.name ?? id;
  const level = (value: number) => t(`agents.level.${value}`);
  const columns: Column<AgentRow>[] = [
    {
      key: "name",
      header: t("agents.name"),
      render: (row) => (
        <Button
          aria-pressed={chosen === row.agent.id}
          onClick={() => setChosen(chosen === row.agent.id ? undefined : row.agent.id)}
        >
          {row.agent.name}
        </Button>
      ),
    },
    { key: "country", header: t("agents.country"), render: (row) => country(row.agent.countryId) },
    {
      key: "relation",
      header: t("agents.relation"),
      render: (row) =>
        t("agents.relationValue", { band: t(`agents.band.${row.band}`), value: row.relation }),
      sortValue: (row) => row.relation,
      align: "right",
    },
    { key: "greed", header: t("agents.greed"), render: (row) => level(row.agent.greed) },
    {
      key: "influence",
      header: t("agents.influence"),
      render: (row) => level(row.agent.influence),
    },
    {
      key: "portfolio",
      header: t("agents.portfolio"),
      render: (row) => t("agents.portfolioValue", { count: row.portfolio }),
      sortValue: (row) => row.portfolio,
      align: "right",
    },
    {
      key: "last",
      header: t("agents.lastDeal"),
      render: (row) =>
        row.lastDeal
          ? t("agents.lastDealValue", {
              player: row.lastDeal.displayName,
              commission: formatMoney(row.lastDeal.commission),
            })
          : "—",
    },
  ];
  const agent = rows.find((row) => row.agent.id === chosen);
  const names = new Map(
    [...save.bank.players, ...save.market.freeAgents.map((entry) => entry.player)].map((player) => [
      player.id,
      player.displayName,
    ]),
  );
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club.shortName]));
  return (
    <Card className={styles.card} aria-label={t("agents.title")}>
      <h2>{t("agents.title")}</h2>
      <p className={styles.muted}>{t("agents.intro")}</p>
      {rows.length === 0 ? (
        <EmptyState title={t("agents.empty")} />
      ) : (
        <DataTable
          caption={t("agents.caption")}
          rows={rows}
          columns={columns}
          rowKey={(row) => row.agent.id}
        />
      )}
      {agent ? (
        <section aria-label={t("agents.portfolioOf", { name: agent.agent.name })}>
          <h3>{t("agents.portfolioOf", { name: agent.agent.name })}</h3>
          <ul className={styles.list}>
            {portfolioOf(save.bank, save.market, save.seed, agent.agent.id).map((entry) => (
              <li key={entry.playerId}>
                <Button onClick={() => onOpen(entry.playerId)}>
                  {names.get(entry.playerId) ?? entry.playerId}
                </Button>{" "}
                <span className={styles.muted}>
                  {entry.clubId ? (clubs.get(entry.clubId) ?? entry.clubId) : t("market.free")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Card>
  );
}
