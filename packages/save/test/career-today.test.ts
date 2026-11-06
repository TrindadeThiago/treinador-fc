import { calendarNext } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import { careerToday, currentDate, seasonStateOf } from "../src";
import { playDay, validSave } from "./fixtures";

// O "hoje" do calendário é o último dia de jogos disputado, não o início da temporada.
describe("hoje da carreira", () => {
  it("antes do primeiro jogo é o início da temporada", () => {
    const save = validSave();
    expect(careerToday(save)).toBe(seasonStateOf(save).calendar.start);
  });

  it("depois de jogar, é o dia do último jogo disputado e avança com a carreira", () => {
    let save = validSave();
    const dates: string[] = [];
    for (let day = 0; day < 5; day++) {
      save = playDay(save);
      const state = seasonStateOf(save);
      const today = careerToday(save);
      expect(today).toBe(state.calendar.days[calendarNext(state) - 1]?.date);
      dates.push(today);
    }
    expect([...dates].sort()).toEqual(dates);
    expect(new Set(dates).size).toBe(5);
    // A data de referência das idades continua a mesma.
    expect(currentDate(save)).toBe(currentDate(validSave()));
    expect(careerToday(save) > currentDate(save)).toBe(true);
  });
});
