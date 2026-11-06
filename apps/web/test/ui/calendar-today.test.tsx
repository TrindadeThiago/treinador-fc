// O calendário marca "hoje" no último dia de jogos disputado, não no início da temporada.
import { careerToday, seasonStateOf } from "@brasfoot-like/save";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { eachMonth, monthGrid } from "../helpers/calendar";
import { storedCareer } from "../helpers/career";

describe("calendário: hoje", () => {
  it("a marca hoje fica no dia do último jogo disputado, em um só dia da temporada", async () => {
    const { store, save } = await storedCareer(8);
    const today = careerToday(save);
    expect(today).not.toBe(seasonStateOf(save).calendar.start);
    renderApp("/jogo/calendario?c=tela", store);
    await monthGrid();
    const user = userEvent.setup({ delay: null });
    const marked: string[] = [];
    await eachMonth(user, async () => {
      const grid = await monthGrid();
      for (const mark of grid.querySelectorAll("[data-date]")) {
        if (mark.textContent?.includes(t("calendar.today"))) {
          marked.push(mark.getAttribute("data-date") ?? "");
        }
      }
      return undefined;
    });
    expect(marked).toEqual([today]);
    expect(screen.getByRole("navigation", { name: t("calendar.months") })).toBeDefined();
  });
});
