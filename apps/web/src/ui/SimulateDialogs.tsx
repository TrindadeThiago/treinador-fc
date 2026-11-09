"use client";

import type { RosterIssue } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import type { useGame } from "../game/GameProvider";
import { label, useT } from "../i18n";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { issueText } from "./lineup-text";
import { screenHref } from "./shell/screens";

/**
 * Escalação inválida (bloqueia) e time sem goleiro (pede confirmação) antes de simular; desde a 036
 * também a base acima do limite e o elenco incompleto (bloqueiam) e os jovens no último ano antes do
 * último jogo (pedem confirmação).
 */
export function SimulateDialogs({
  save,
  game,
}: {
  save: SaveFile;
  game: ReturnType<typeof useGame>;
}) {
  const t = useT();
  const router = useRouter();
  const pending = game.state.simulateIssues;
  const { dispatch } = game;
  const close = useCallback(() => dispatch({ type: "simulateIssues" }), [dispatch]);
  const goToLineup = () => {
    close();
    router.push(screenHref("/jogo/escalacao", save.id));
  };
  const goTo = (path: string, query = "") => {
    close();
    router.push(`${screenHref(path, save.id)}${query}`);
  };
  if (!pending) return null;
  const blocked = pending.kind === "blocked";
  const roster = pending.roster ?? [];
  const rosterOnly = pending.issues.length === 0 && roster.length > 0;
  const needsPlayers = roster.some((issue) => issue.code === "squad_below_minimum");
  const title = rosterOnly
    ? t(blocked ? "simulate.rosterTitle" : "simulate.lastYearTitle")
    : t(blocked ? "simulate.invalidTitle" : "simulate.noGoalkeeperTitle");
  return (
    <Dialog
      open
      title={title}
      onClose={close}
      actions={
        <>
          {rosterOnly ? (
            <>
              <Button variant="primary" onClick={() => goTo("/jogo/elenco", "&aba=base")}>
                {t("simulate.goToBase")}
              </Button>
              {needsPlayers ? (
                <Button onClick={() => goTo("/jogo/mercado")}>{t("simulate.goToMarket")}</Button>
              ) : null}
            </>
          ) : (
            <Button variant="primary" onClick={goToLineup}>
              {t("simulate.goToLineup")}
            </Button>
          )}
          {blocked ? (
            <Button onClick={close}>{t("common.close")}</Button>
          ) : (
            <Button
              onClick={async () => {
                const mode = pending.mode;
                const outcome = await game.playRound(mode, { confirmed: true });
                if (outcome === "live") router.push(screenHref("/jogo/rodada", save.id));
                if (outcome === "finished") {
                  router.push(screenHref("/jogo/fim-de-temporada", save.id));
                }
              }}
            >
              {t("simulate.playAnyway")}
            </Button>
          )}
        </>
      }
    >
      {blocked ? <p>{t(rosterOnly ? "simulate.rosterBody" : "simulate.invalidBody")}</p> : null}
      <ul>
        {roster.map((issue) => (
          <li key={issue.code}>{rosterText(issue, t)}</li>
        ))}
        {pending.issues.map((issue, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: lista fixa enquanto o diálogo está aberto
          <li key={index}>{issueText(issue, save)}</li>
        ))}
      </ul>
    </Dialog>
  );
}

/** Texto de um problema do elenco ou da base (036); as posições vêm como códigos do motor. */
export function rosterText(issue: RosterIssue, t: ReturnType<typeof useT>): string {
  if (issue.code === "squad_below_minimum") {
    const codes = String(issue.params.positions ?? "")
      .split(",")
      .filter(Boolean);
    return t("rosterIssue.squad_below_minimum", {
      missing: issue.params.missing ?? 0,
      positions:
        codes.length > 0 ? codes.map((code) => label(`position.${code}`)).join(", ") : "none",
    });
  }
  return t(`rosterIssue.${issue.code}`, issue.params);
}
