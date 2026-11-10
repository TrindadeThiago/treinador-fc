// 039: aba Observação (US1, US5), relatório no detalhe (US3) e observados no mercado (US4).
import type { ScoutingState, ScoutReport } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reportSortValue, scoutingPanelOf } from "../../src/game/scouting-view";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 60000 });

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo/mercado?c=tela&aba=scouting");
});

const others = (save: SaveFile) =>
  save.bank.players.filter((player) => player.clubId !== save.clubId);

function report(low: number, high: number, extra: Partial<ScoutReport> = {}): ScoutReport {
  return { estimate: { low, high }, steps: 3, updated: { season: 1, round: 3 }, ...extra };
}

/** Departamento aberto no nível 3 com dois observados e um relatório antigo (cancelado). */
function withScouting(save: SaveFile): SaveFile {
  const [a, b, c] = others(save);
  if (!a || !b || !c) throw new Error("mundo pequeno");
  const scouting: ScoutingState = {
    clubId: save.clubId,
    level: 3,
    watch: [
      { playerId: a.id, since: { season: 1, round: 0 } },
      { playerId: b.id, since: { season: 1, round: 0 } },
    ],
    reports: {
      [a.id]: report(60, 76, { temperament: 3, injury: 1 }),
      [b.id]: report(50, 70),
      [c.id]: report(62, 74),
    },
  };
  return { ...save, scouting };
}

describe("aba Observação (039)", () => {
  it("começa fechada, com a explicação, e abrir mostra custo e vagas no diálogo", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/mercado?c=tela&aba=scouting", store);
    const user = userEvent.setup({ delay: null });
    expect(await screen.findByText(t("scouting.closed"))).toBeDefined();
    expect(screen.getByText(t("scouting.empty.title"))).toBeDefined();
    await user.click(screen.getByRole("button", { name: t("scouting.open") }));
    const dialog = await screen.findByRole("dialog", { name: t("scouting.dialog.title") });
    await user.selectOptions(within(dialog).getByRole("combobox"), "3");
    expect(dialog.textContent).toMatch(/8 vagas de observação/);
    await user.click(within(dialog).getByRole("button", { name: t("scouting.confirm") }));
    expect(await screen.findByText(t("scouting.done.level"))).toBeDefined();
    expect(screen.getByText(new RegExp(t("scouting.slots", { used: 0, slots: 8 })))).toBeDefined();
  });

  it("lista os observados com faixa, confiança e andamento; cancelar libera a vaga", async () => {
    const { store, save } = await storedCareer(1, withScouting);
    renderApp("/jogo/mercado?c=tela&aba=scouting", store);
    const user = userEvent.setup({ delay: null });
    const table = await screen.findByRole("table", { name: t("scouting.watching.caption") });
    expect(
      within(table).getByText(t("academy.estimate.aria", { low: 60, high: 76 })),
    ).toBeDefined();
    expect(within(table).getAllByText(t("scouting.confidence.partial")).length).toBeGreaterThan(0);
    const [a] = others(save);
    await user.click(
      within(table).getByRole("button", {
        name: t("scouting.unwatchAria", { name: a?.displayName ?? "" }),
      }),
    );
    expect(
      await screen.findByText(t("scouting.done.unwatch", { name: a?.displayName ?? "" })),
    ).toBeDefined();
    expect(screen.getByText(new RegExp(t("scouting.slots", { used: 1, slots: 8 })))).toBeDefined();
  });

  it("baixar para um nível com menos vagas avisa quantas observações serão canceladas", async () => {
    const { store } = await storedCareer(1, withScouting);
    renderApp("/jogo/mercado?c=tela&aba=scouting", store);
    const user = userEvent.setup({ delay: null });
    await user.click(await screen.findByRole("button", { name: t("scouting.change") }));
    const dialog = await screen.findByRole("dialog", { name: t("scouting.dialog.title") });
    // O nível 1 tem 3 vagas: com 2 observados, nada é cancelado; com o fechar, tudo.
    await user.selectOptions(within(dialog).getByRole("combobox"), "1");
    expect(dialog.textContent).not.toMatch(/será cancelada|serão canceladas/);
    await user.click(within(dialog).getByRole("button", { name: t("scouting.cancelAction") }));
    await user.click(screen.getByRole("button", { name: t("scouting.close") }));
    const closing = await screen.findByRole("dialog", { name: t("scouting.dialog.title") });
    expect(closing.textContent).toContain(t("scouting.dialog.closeWarn"));
  });
});

describe("observados no mercado (039 US4)", () => {
  it("ordem pela faixa: centro e, no empate, limite superior; sem relatório vai ao fim", () => {
    const value = (low: number, high: number) =>
      reportSortValue({
        estimate: { low, high },
        confidence: "partial",
        steps: 1,
        stepsToComplete: 5,
        updated: { season: 1, round: 1 },
        watching: false,
      });
    expect(value(60, 76)).toBeGreaterThan(value(62, 74) ?? 0);
    expect(reportSortValue(undefined)).toBeUndefined();
  });

  it("filtrar só observados, escolher a posição e ordenar pela faixa em três ações (SC-007)", async () => {
    memoryRouter.reset("/jogo/mercado?c=tela");
    const { store, save } = await storedCareer(1, withScouting);
    renderApp("/jogo/mercado?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await user.click(
      await screen.findByRole("checkbox", { name: t("market.filter.observedOnly") }),
    );
    const table = await screen.findByRole("table", { name: t("market.resultsCaption") });
    const body = () =>
      within(within(table).getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole("row");
    expect(body()).toHaveLength(3);
    await user.click(within(table).getByRole("button", { name: t("market.col.potential") }));
    // Centros: 68 (60–76), 60 (50–70), 68 (62–74): 50–70, 62–74, 60–76.
    const [a, b, c] = others(save);
    expect(body()[0]?.textContent).toContain(b?.displayName);
    expect(body()[1]?.textContent).toContain(c?.displayName);
    expect(body()[2]?.textContent).toContain(a?.displayName);
    expect(within(table).getAllByText(t("market.observed.watching")).length).toBe(2);
  });

  it("Observar pelo detalhe em duas ações, e o relatório aparece com os graus em texto", async () => {
    memoryRouter.reset("/jogo/mercado?c=tela");
    const { store, save } = await storedCareer(1, withScouting);
    renderApp("/jogo/mercado?c=tela", store);
    const user = userEvent.setup({ delay: null });
    const [a, b, c] = others(save);
    // O observado: filtrar os observados deixa ele na primeira página.
    await user.click(
      await screen.findByRole("checkbox", { name: t("market.filter.observedOnly") }),
    );
    await user.click(
      (
        await screen.findAllByRole("button", {
          name: t("lineup.detailsOf", { name: a?.displayName ?? "" }),
        })
      )[0] as HTMLElement,
    );
    const modal = await screen.findByRole("dialog", { name: a?.displayName ?? "" });
    expect(within(modal).getByText(t("scouting.temperament.3"))).toBeDefined();
    expect(within(modal).getByText(t("scouting.injury.1"))).toBeDefined();
    await user.click(within(modal).getByRole("button", { name: t("common.close") }));
    await user.click(screen.getByRole("checkbox", { name: t("market.filter.observedOnly") }));
    // Outro jogador, o mais forte da busca (primeira página): 1 abrir o detalhe, 2 Observar.
    const taken = new Set([a?.id, b?.id, c?.id]);
    const d = [...others(save)]
      .filter((player) => !taken.has(player.id))
      .sort((x, y) => y.strength - x.strength)[0];
    await user.click(
      (
        await screen.findAllByRole("button", {
          name: t("lineup.detailsOf", { name: d?.displayName ?? "" }),
        })
      )[0] as HTMLElement,
    );
    const other = await screen.findByRole("dialog", { name: d?.displayName ?? "" });
    await user.click(
      within(other).getByRole("button", {
        name: t("scouting.watchAria", { name: d?.displayName ?? "" }),
      }),
    );
    expect(
      await within(other).findByText(t("scouting.done.watch", { name: d?.displayName ?? "" })),
    ).toBeDefined();
    expect(within(other).getAllByText(t("scouting.notYet"))).toHaveLength(2);
  });
});

describe("custo nas finanças (039 US5)", () => {
  it("o painel mostra o custo mensal do nível e zero fechado", async () => {
    const { save } = await storedCareer(1);
    expect(scoutingPanelOf(save).monthlyCost).toBe(0);
    const opened = withScouting(save);
    expect(scoutingPanelOf(opened).monthlyCost).toBeGreaterThan(0);
    expect(scoutingPanelOf(opened).levels.map((entry) => entry.slots)).toEqual([3, 5, 8, 12, 16]);
  });
});
