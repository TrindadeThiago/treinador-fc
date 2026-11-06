import type { MatchState } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  pressureTicks,
  pressureView,
  RECENT,
  SHOT_PRESSURE,
  SMOOTH,
  VERDICT_MARGIN,
  verdictOf,
} from "../../src/game/pressure-view";
import { advance, liveRoundOf, mineOf, played } from "../helpers/live-round";

/** Estado mínimo com a pressão escolhida (o resto não importa para a vista). */
function stateWith(home: number[], away: number[], extra: Partial<MatchState> = {}): MatchState {
  return {
    stoppage: {},
    events: [],
    pressure: { home, away },
    ...extra,
  } as unknown as MatchState;
}

describe("pressão do meu jogo", () => {
  it("os passos seguem o relógio do motor, com os acréscimos de cada tempo", () => {
    const state = stateWith([], [], { stoppage: { first: 2, second: 3 } } as Partial<MatchState>);
    const ticks = pressureTicks(state, 200);
    expect(ticks).toHaveLength(45 + 2 + 45 + 3 + 30);
    expect(ticks[44]).toEqual({ half: 1, minute: 45, stoppage: 0 });
    expect(ticks[46]).toEqual({ half: 1, minute: 45, stoppage: 2 });
    expect(ticks[47]).toEqual({ half: 2, minute: 46, stoppage: 0 });
    expect(ticks[94]).toEqual({ half: 2, minute: 90, stoppage: 3 });
    expect(ticks[95]).toEqual({ half: 3, minute: 91, stoppage: 0 });
    expect(pressureTicks(state, 10)).toHaveLength(10);
  });

  it("a minha parte vem do lado certo e o veredito segue os últimos minutos", () => {
    // 20 minutos equilibrados e os últimos 10 com o mandante criando o triplo.
    const home = [...Array(20).fill(0.02), ...Array(RECENT).fill(0.06)];
    const away = Array(30).fill(0.02);
    const state = stateWith(home, away);
    const asHome = pressureView(state, "home");
    const asAway = pressureView(state, "away");
    expect(asHome?.recent).toBe(75);
    expect(asAway?.recent).toBe(25);
    expect(asHome?.verdict).toBe("pressing");
    expect(asAway?.verdict).toBe("underPressure");
    expect(asHome?.points[10]?.share).toBe(50);
    expect(asHome?.overall).toBe(Math.round((100 * (0.4 + 0.6)) / (0.4 + 0.6 + 0.6)));
    expect(asHome?.span).toBe(90);
    expect(asHome?.halfTimeIndex).toBeUndefined();
  });

  it("o veredito tem margem em volta do equilíbrio", () => {
    expect(verdictOf(50)).toBe("balanced");
    expect(verdictOf(50 + VERDICT_MARGIN - 1)).toBe("balanced");
    expect(verdictOf(50 + VERDICT_MARGIN)).toBe("pressing");
    expect(verdictOf(50 - VERDICT_MARGIN)).toBe("underPressure");
  });

  it("sem o registro do motor não há vista", () => {
    expect(pressureView({ stoppage: {}, events: [] } as unknown as MatchState, "home")).toBe(
      undefined,
    );
  });

  it("numa rodada de verdade: um ponto por minuto, intervalo marcado e cada gol no seu minuto", async () => {
    const { round, save } = await liveRoundOf();
    const early = pressureView(mineOf(advance(round, 20), save.clubId).match.state, "home");
    expect(early?.points).toHaveLength(20);
    const done = played(round);
    for (const match of done.matches) {
      const view = pressureView(match.state, "home");
      expect(view?.points.length).toBe(match.state.pressure?.home.length);
      expect(view?.halfTimeIndex).toBe(44 + (match.state.stoppage.first ?? 0));
      const goals = match.state.events.filter(
        (event) => event.type === "shot" && event.outcome === "goal",
      );
      expect(view?.goals).toHaveLength(goals.length);
      for (const goal of view?.goals ?? []) {
        const point = view?.points[goal.index];
        expect(point).toMatchObject(goal.tick);
      }
    }
  });

  it("a finalização soma à pressão de quem finalizou, e sai da linha depois da média móvel", () => {
    const flat = Array(40).fill(0.13);
    const shot = { type: "shot", side: "home", half: 1, minute: 20, stoppage: 0, outcome: "saved" };
    const state = stateWith([...flat], [...flat], {
      events: [shot],
    } as unknown as Partial<MatchState>);
    const view = pressureView(state, "home");
    const before = view?.points[18]?.share ?? 0;
    const at = view?.points[19]?.share ?? 0;
    const after = view?.points[19 + SMOOTH]?.share ?? 0;
    expect(before).toBe(50);
    expect(at).toBe(
      Math.round(
        (100 * (0.13 * SMOOTH + SHOT_PRESSURE.saved)) / (0.13 * SMOOTH * 2 + SHOT_PRESSURE.saved),
      ),
    );
    expect(after).toBe(50);
    // Do ponto de vista do adversário, o mesmo lance é pressão sofrida.
    expect(pressureView(state, "away")?.points[19]?.share).toBe(100 - at);
  });
});
