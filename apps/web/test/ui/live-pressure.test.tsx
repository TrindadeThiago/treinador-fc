// Pressão ao vivo: barra dos últimos minutos com veredito em texto e o gráfico da partida.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { pressureView, RECENT } from "../../src/game/pressure-view";
import { t } from "../../src/i18n";
import { PressurePanel } from "../../src/ui/live/PressurePanel";
import { advance, liveRoundOf, mineOf } from "../helpers/live-round";

describe("painel de pressão (ao vivo)", () => {
  it("antes do apito avisa que a partida não começou", async () => {
    const { round, save } = await liveRoundOf();
    const mine = mineOf(round, save.clubId);
    render(<PressurePanel match={mine.match} side={mine.side} save={save} />);
    const panel = screen.getByRole("region", { name: t("live.pressure.title") });
    expect(within(panel).getByText(t("live.pressure.waiting"))).toBeDefined();
  });

  it("no jogo mostra o veredito, as duas partes e o gráfico com resumo e legenda", async () => {
    const { round, save } = await liveRoundOf();
    const mine = mineOf(advance(round, 30), save.clubId);
    const view = pressureView(mine.match.state, mine.side);
    if (!view) throw new Error("sem pressão");
    const clubs = new Map(save.bank.clubs.map((club) => [club.id, club.shortName]));
    const me = clubs.get(mine.match.sides[mine.side]) ?? "";
    const other = clubs.get(mine.match.sides[mine.side === "home" ? "away" : "home"]) ?? "";
    render(<PressurePanel match={mine.match} side={mine.side} save={save} />);
    const panel = screen.getByRole("region", { name: t("live.pressure.title") });
    expect(
      within(panel).getByText(t(`live.pressure.verdict.${view.verdict}`, { club: me })),
    ).toBeDefined();
    expect(
      within(panel).getByText(t("live.pressure.share", { club: me, share: view.recent })),
    ).toBeDefined();
    expect(
      within(panel).getByText(t("live.pressure.share", { club: other, share: 100 - view.recent })),
    ).toBeDefined();
    const summary = t("live.pressure.summary", {
      mine: me,
      theirs: other,
      recent: view.recent,
      overall: view.overall,
      minutes: RECENT,
    });
    expect(within(panel).getByRole("img", { name: summary })).toBeDefined();
    // Legenda fora do desenho (o rótulo dentro do gráfico é decorativo).
    const legend = within(panel).getByRole("list");
    expect(within(legend).getByText(t("live.pressure.key", { club: me }))).toBeDefined();
    expect(within(legend).getByText(t("live.pressure.key", { club: other }))).toBeDefined();
    // Valores para leitor de tela: um a cada 5 minutos.
    expect(within(panel).getAllByRole("row").length).toBeGreaterThanOrEqual(6);
  });

  it('sem os textos de explicação: o título do gráfico é só "Pressão ao longo do jogo"', async () => {
    const { round, save } = await liveRoundOf();
    const mine = mineOf(advance(round, 30), save.clubId);
    render(<PressurePanel match={mine.match} side={mine.side} save={save} />);
    const panel = screen.getByRole("region", { name: t("live.pressure.title") });
    expect(within(panel).getByText("Pressão ao longo do jogo")).toBeDefined();
    expect(panel.textContent).not.toMatch(
      /últimos 10 minutos|média de 5 minutos|chance de cada time/,
    );
  });
});
