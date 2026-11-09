import { ACADEMY_RULES, type AcademyPlayer, emptyAcademy } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { academyCapacity, academyRows } from "../../src/game/academy-view";
import { label, t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";

// 036: aba Base do Elenco (US1, US2, US4) e os bloqueios antes da partida.

function youth(save: SaveFile, offset: number, age = 17): AcademyPlayer {
  const template = save.bank.players.find((player) => player.clubId === save.clubId);
  if (!template) throw new Error("sem jogador");
  const { clubId: _c, contract: _k, ...player } = template;
  const start = save.bank.manifest.referenceDate;
  return {
    player: {
      ...player,
      id: `jogador-${String(save.renewal.nextPlayerSeq + offset).padStart(5, "0")}`,
      displayName: `Jovem ${offset}`,
      birthDate: `${Number(start.slice(0, 4)) - age}${start.slice(4)}`,
      strength: 40 + offset,
    },
    clubId: save.clubId,
    joinedSeason: 1,
  };
}

function withBase(count: number, ages: number[] = []) {
  return (save: SaveFile): SaveFile => ({
    ...save,
    renewal: {
      ...save.renewal,
      nextPlayerSeq: save.renewal.nextPlayerSeq + 100,
      academy: {
        ...emptyAcademy(),
        players: Array.from({ length: count }, (_, index) => youth(save, index + 1, ages[index])),
      },
    },
  });
}

describe("aba Base (036)", () => {
  it("seletores: linhas com saída e último ano, e vagas", async () => {
    const { save } = await storedCareer(1, withBase(2, [19, 17]));
    const rows = academyRows(save);
    expect(rows.map((row) => row.lastYear)).toEqual([true, false]);
    expect(rows[0]?.leavesYear).toBe(save.league.year + 1);
    expect(academyCapacity(save)).toEqual({ count: 2, limit: ACADEMY_RULES.maxPlayers, excess: 0 });
  });

  it("estado vazio antes da primeira virada", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/elenco?c=tela&aba=base", store);
    expect(await screen.findByText(t("academy.empty.title"))).toBeDefined();
    expect(
      screen.getByText(t("academy.capacity", { count: 0, limit: ACADEMY_RULES.maxPlayers })),
    ).toBeDefined();
  });

  it("lista os jovens com posição, idade, força, saída e último ano em texto", async () => {
    const { store, save } = await storedCareer(1, withBase(2, [19, 17]));
    renderApp("/jogo/elenco?c=tela&aba=base", store);
    const table = await screen.findByRole("table", {
      name: t("academy.caption", {
        club: save.bank.clubs.find((club) => club.id === save.clubId)?.name ?? "",
      }),
    });
    const rows = within(within(table).getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole(
      "row",
    );
    expect(rows).toHaveLength(2);
    expect(within(table).getByText(t("academy.lastYear"))).toBeDefined();
    const first = youth(save, 1, 19);
    expect(within(table).getAllByText(label(`position.${first.player.position}`)).length).toBe(2);
  });

  it("promover pelo teclado: confirmação com salário, o jovem vai ao elenco (SC-008)", async () => {
    const { store, save } = await storedCareer(1, withBase(1));
    renderApp("/jogo/elenco?c=tela&aba=base", store);
    const user = userEvent.setup();
    const name = youth(save, 1).player.displayName;
    const promote = await screen.findByRole("button", {
      name: t("academy.promoteAria", { name }),
    });
    // 1: foco no botão do jovem; 2: ação; 3: confirmar.
    promote.focus();
    await user.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", {
      name: t("academy.promoteTitle", { name }),
    });
    expect(dialog.textContent).toMatch(/por mês até/);
    await user.click(within(dialog).getByRole("button", { name: t("academy.promote") }));
    expect(await screen.findByText(t("academy.promoted", { name }))).toBeDefined();
    expect(await screen.findByText(t("academy.empty.title"))).toBeDefined();
  });

  it("dispensar: avisa que é irreversível e o jovem vira livre", async () => {
    const { store, save } = await storedCareer(1, withBase(1));
    renderApp("/jogo/elenco?c=tela&aba=base", store);
    const user = userEvent.setup();
    const name = youth(save, 1).player.displayName;
    await user.click(
      await screen.findByRole("button", { name: t("academy.releaseAria", { name }) }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: t("academy.releaseTitle", { name }),
    });
    expect(dialog.textContent).toContain(t("academy.releaseBody"));
    await user.click(within(dialog).getByRole("button", { name: t("academy.release") }));
    expect(await screen.findByText(t("academy.released", { name }))).toBeDefined();
  });

  it("base acima do limite: excesso em texto e a partida fica impedida", async () => {
    const { store } = await storedCareer(1, withBase(ACADEMY_RULES.maxPlayers + 2));
    renderApp("/jogo/elenco?c=tela&aba=base", store);
    expect(await screen.findByText(t("academy.excess", { excess: 2 }))).toBeDefined();
  });

  it("na Início, o bloqueio da base aparece com o caminho para a aba", async () => {
    const { store } = await storedCareer(1, withBase(ACADEMY_RULES.maxPlayers + 1));
    renderApp("/jogo?c=tela", store);
    expect(
      await screen.findByText(
        t("rosterIssue.academy_over_limit", { excess: 1, limit: ACADEMY_RULES.maxPlayers }),
      ),
    ).toBeDefined();
    expect(screen.getAllByRole("link", { name: t("academy.goToBase") }).length).toBeGreaterThan(0);
  });
});
