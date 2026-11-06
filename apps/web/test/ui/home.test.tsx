import { latestFeed } from "@brasfoot-like/engine";
import { nextFixture } from "@brasfoot-like/save";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { matchPreview } from "../../src/game/home-view";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { roundPlayed } from "../helpers/round";

vi.setConfig({ testTimeout: 60000 });

describe("Início do clube (FR-016, 035)", () => {
  it("mostra o próximo jogo frente a frente, a posição e os últimos resultados", async () => {
    const { store, save } = await storedCareer(6);
    renderApp("/jogo?c=tela", store);
    const next = await screen.findByRole("region", { name: t("home.nextMatch") });
    const fixture = nextFixture(save);
    const home = save.bank.clubs.find((club) => club.id === fixture?.home);
    const away = save.bank.clubs.find((club) => club.id === fixture?.away);
    const crests = within(next).getAllByRole("img");
    // Os dois escudos, o mandante primeiro.
    expect(crests[0]?.getAttribute("aria-label")).toBe(home?.name);
    expect(crests[1]?.getAttribute("aria-label")).toBe(away?.name);
    expect(
      within(next).getByText(
        fixture?.home === save.clubId ? t("home.homeGame") : t("home.awayGame"),
      ),
    ).toBeDefined();
    expect(within(next).getByText(t("home.roundLabel", { round: 6 }))).toBeDefined();
    const position = screen.getByRole("region", { name: t("home.position") });
    expect(within(position).getByText(/º lugar/)).toBeDefined();
    expect(within(position).getAllByRole("listitem")).toHaveLength(5);
  });

  it("os três indicadores do próximo jogo aparecem em texto, com o caminho para a escalação", async () => {
    const { store, save } = await storedCareer(4);
    renderApp("/jogo?c=tela", store);
    const next = await screen.findByRole("region", { name: t("home.nextMatch") });
    const preview = matchPreview(save);
    expect(
      within(next).getByText(
        t("home.preview.strengthValue", {
          mine: preview?.strength.mine ?? 0,
          opponent: preview?.strength.opponent ?? 0,
        }),
      ),
    ).toBeDefined();
    expect(
      within(next).getByText(t("home.preview.fitnessValue", { value: preview?.fitness ?? 0 })),
    ).toBeDefined();
    expect(within(next).getByText(t("home.preview.absences"))).toBeDefined();
    const link = within(next).getByRole("link", { name: t("home.preview.toLineup") });
    expect(link.getAttribute("href")).toContain("/jogo/escalacao");
  });

  it("mostra se a janela de transferências está aberta ou fechada, com as rodadas", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo?c=tela", store);
    const status = await screen.findByRole("status", { name: "" });
    expect(status.getAttribute("data-window")).toBe("open");
    expect(status.textContent).toMatch(/Janela aberta até .* \(faltam \d+ rodadas?\)/);
  });

  it("antes do primeiro jogo, avisa que não há resultados e as formas ficam vazias", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo?c=tela", store);
    expect(await screen.findByText(t("home.noResults"))).toBeDefined();
    const next = screen.getByRole("region", { name: t("home.nextMatch") });
    expect(within(next).getAllByText(t("home.noGames"))).toHaveLength(2);
  });

  it("os resultados têm a letra em texto, o placar e o link para a tabela; o caixa não aparece", async () => {
    const { store } = await storedCareer(4);
    renderApp("/jogo?c=tela", store);
    const position = await screen.findByRole("region", { name: t("home.position") });
    const link = within(position).getByRole("link", { name: t("home.seeTable") });
    expect(link.getAttribute("href")).toContain("/jogo/competicao");
    const items = within(position).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    for (const item of items) {
      const kind = item.getAttribute("data-result");
      const letter = { win: t("result.W"), draw: t("result.D"), loss: t("result.L") }[
        kind as "win" | "draw" | "loss"
      ];
      expect(item.querySelector("abbr")?.textContent).toBe(letter);
      const [goalsFor, goalsAgainst] = (item.querySelector("strong")?.textContent ?? "")
        .split("×")
        .map((value) => Number(value.trim()));
      const expected =
        (goalsFor ?? 0) > (goalsAgainst ?? 0) ? "win" : goalsFor === goalsAgainst ? "draw" : "loss";
      expect(kind).toBe(expected);
    }
    expect(screen.queryByText(/^Saldo:/)).toBeNull();
  });

  it("depois de uma rodada direta, a lista completa da rodada não aparece na Início", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo?c=tela", store);
    await userEvent.setup().click(await screen.findByRole("button", { name: t("home.simulate") }));
    await roundPlayed(1);
    expect(screen.queryByRole("region", { name: t("home.lastRound", { round: 1 }) })).toBeNull();
  });

  it("mostra 'Simulando…' e trava os botões enquanto a rodada direta é calculada (016 FR-029)", async () => {
    // Segura o próximo quadro para observar o estado antes do cálculo.
    let paint: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      paint = callback;
      return 1;
    });
    try {
      const { store } = await storedCareer(1);
      renderApp("/jogo?c=tela", store);
      const simulate = await screen.findByRole("button", { name: t("home.simulate") });
      await userEvent.setup().click(simulate);
      await waitFor(() => expect(paint).toBeDefined());
      expect(screen.getByText(t("home.simulating")).getAttribute("role")).toBe("status");
      expect((simulate as HTMLButtonElement).disabled).toBe(true);
      paint?.(0);
      expect(await roundPlayed(1)).toBeDefined();
      expect(screen.queryByText(t("home.simulating"))).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("o cartão do próximo jogo é o primeiro bloco, com mando, forma recente e as ações (026)", async () => {
    const { store } = await storedCareer(4);
    renderApp("/jogo?c=tela", store);
    const next = await screen.findByRole("region", { name: t("home.nextMatch") });
    const regions = screen.getAllByRole("region");
    expect(regions[0]).toBe(next);
    expect(
      within(next).getByText(new RegExp(`^(${t("home.homeGame")}|${t("home.awayGame")})$`)),
    ).toBeDefined();
    expect(next.querySelectorAll("abbr").length).toBeGreaterThan(0);
    expect(within(next).getByRole("button", { name: t("home.playLive") })).toBeDefined();
    expect(within(next).getByRole("button", { name: t("home.simulate") })).toBeDefined();
  });

  it("a ordem dos blocos é próximo jogo, avisos, posição, torcida e diretoria, manchetes (035)", async () => {
    const { store } = await storedCareer(2, (save) => ({
      ...save,
      lineupNotice: [{ kind: "injured", out: "x", in: "y" }] as unknown as NonNullable<
        typeof save.lineupNotice
      >,
    }));
    renderApp("/jogo?c=tela", store);
    await screen.findByRole("region", { name: t("home.nextMatch") });
    const names = [
      t("home.nextMatch"),
      t("home.beforeMatch"),
      t("home.position"),
      t("home.mood.title"),
      t("news.title"),
    ];
    const nodes = names.map((name) => screen.getByRole("region", { name }));
    for (let index = 1; index < nodes.length; index++) {
      const previous = nodes[index - 1] as HTMLElement;
      const current = nodes[index] as HTMLElement;
      expect(previous.compareDocumentPosition(current) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }
  });

  it("avisos pendentes aparecem em 'Antes do jogo', compactos e com a ação de dispensar (026, 035)", async () => {
    const { store } = await storedCareer(2, (save) => ({
      ...save,
      lineupNotice: [{ kind: "injured", out: "x", in: "y" }] as unknown as NonNullable<
        typeof save.lineupNotice
      >,
    }));
    renderApp("/jogo?c=tela", store);
    const strip = await screen.findByRole("region", { name: t("home.beforeMatch") });
    const notice = within(strip).getByRole("region", { name: t("lineupChange.title") });
    expect(within(notice).getByText(t("home.notice.lineupChanges", { count: 1 }))).toBeDefined();
    expect(within(notice).getByText(t("home.notice.details"))).toBeDefined();
    const user = userEvent.setup();
    await user.click(within(notice).getByRole("button", { name: t("lineupChange.dismiss") }));
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: t("lineupChange.title") })).toBeNull(),
    );
  });

  it("sem aviso pendente, o grupo 'Antes do jogo' não aparece (026)", async () => {
    const { store } = await storedCareer(1, (save) => ({
      ...save,
      lineupNotice: [],
      market: { ...save.market, incoming: [] },
    }));
    renderApp("/jogo?c=tela", store);
    await screen.findByRole("region", { name: t("home.nextMatch") });
    const hasStrip = screen.queryByRole("region", { name: t("home.beforeMatch") }) !== null;
    // O mercado pode avisar contratos que terminam; só vale o caso sem nenhum aviso.
    if (!screen.queryByRole("region", { name: t("market.notice.title") })) {
      expect(hasStrip).toBe(false);
    }
  });

  it("torcida e diretoria ficam num cartão compacto, sem os motivos, com o link para a Carreira", async () => {
    const { store, save } = await storedCareer(4);
    renderApp("/jogo?c=tela", store);
    const card = await screen.findByRole("region", { name: t("home.mood.title") });
    expect(within(card).getAllByRole("meter")).toHaveLength(2);
    expect(within(card).getAllByText(/Em alta|Em queda|Estável/)).toHaveLength(2);
    expect(within(card).queryByText(t("fans.reasons"))).toBeNull();
    expect(within(card).queryByText(t("board.reasons"))).toBeNull();
    expect(within(card).getByRole("link", { name: t("nav.career") })).toBeDefined();
    expect(within(card).getByText(/metas? no caminho|Metas ainda sem avaliação/)).toBeDefined();
    expect(save.board.clubs[save.clubId]).toBeDefined();
  });

  it("as manchetes são no máximo três, cada uma com a categoria, e levam a todas as notícias", async () => {
    const { store, save } = await storedCareer(4);
    renderApp("/jogo?c=tela", store);
    const card = await screen.findByRole("region", { name: t("news.title") });
    const items = within(card).queryAllByRole("article");
    const expected = Math.min(3, latestFeed(save.news)?.headlines.length ?? 0);
    expect(items).toHaveLength(expected);
    const categories = [
      "result",
      "derby",
      "coaches",
      "market",
      "table",
      "cup",
      "continental",
      "regional",
    ].map((category) => t(`home.newsCategory.${category}`));
    for (const item of items) {
      expect(categories.some((category) => item.textContent?.includes(category))).toBe(true);
    }
    expect(within(card).getByRole("link", { name: t("news.seeAll") })).toBeDefined();
  });
});
