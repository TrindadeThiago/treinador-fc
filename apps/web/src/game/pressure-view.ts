import type { MatchState, ShotOutcome, Side } from "@brasfoot-like/engine";

/** Um passo do relógio: o minuto como a tela escreve ("45+2'") e a chave dos eventos dele. */
export interface PressureTick {
  half: number;
  minute: number;
  stoppage: number;
}

export interface PressurePoint extends PressureTick {
  /** Parte do meu time na pressão (0–100), na média dos últimos minutos. */
  share: number;
}

export type PressureVerdict = "pressing" | "balanced" | "underPressure";

export interface PressureView {
  points: PressurePoint[];
  /** Passos previstos para a partida (90 ou 120 mais os acréscimos já conhecidos). */
  span: number;
  /** Índice do último passo do primeiro tempo, para marcar o intervalo. */
  halfTimeIndex: number | undefined;
  /** Minha parte da pressão nos últimos `RECENT` minutos e no jogo todo. */
  recent: number;
  overall: number;
  verdict: PressureVerdict;
  goals: { index: number; mine: boolean; tick: PressureTick }[];
}

/**
 * Lances que somam à pressão de quem os fez, no minuto deles, além da chance de finalizar que o
 * motor calcula (≈ 0,13 por minuto e time): a linha reage quando um time ataca de verdade e volta
 * quando o lance sai da média móvel.
 */
export const SHOT_PRESSURE: Readonly<Record<ShotOutcome, number>> = {
  off_target: 0.2,
  blocked: 0.2,
  saved: 0.35,
  goal: 0.5,
};
export const PENALTY_PRESSURE = 0.3;

/** Minutos da média móvel da linha e do recorte "agora". */
export const SMOOTH = 5;
export const RECENT = 10;
/** A partir de quantos pontos acima ou abaixo de 50% um lado está pressionando. */
export const VERDICT_MARGIN = 7;

/** Passos do relógio na ordem do motor: 1–45, acréscimos, 46–90, acréscimos, 91–105, 106–120. */
export function pressureTicks(state: MatchState, count: number): PressureTick[] {
  const ticks: PressureTick[] = [];
  const push = (half: number, minute: number, stoppage: number) => {
    if (ticks.length < count) ticks.push({ half, minute, stoppage });
  };
  for (let minute = 1; minute <= 45; minute++) push(1, minute, 0);
  for (let extra = 1; extra <= (state.stoppage.first ?? 0); extra++) push(1, 45, extra);
  for (let minute = 46; minute <= 90; minute++) push(2, minute, 0);
  for (let extra = 1; extra <= (state.stoppage.second ?? 0); extra++) push(2, 90, extra);
  for (let minute = 91; minute <= 105; minute++) push(3, minute, 0);
  for (let minute = 106; minute <= 120; minute++) push(4, minute, 0);
  return ticks;
}

const shareOf = (mine: number, theirs: number) =>
  mine + theirs === 0 ? 50 : Math.round((100 * mine) / (mine + theirs));

function windowShare(
  mine: readonly number[],
  theirs: readonly number[],
  end: number,
  size: number,
) {
  let a = 0;
  let b = 0;
  for (let index = Math.max(0, end - size + 1); index <= end; index++) {
    a += mine[index] ?? 0;
    b += theirs[index] ?? 0;
  }
  return shareOf(a, b);
}

export function verdictOf(share: number): PressureVerdict {
  if (share >= 50 + VERDICT_MARGIN) return "pressing";
  if (share <= 50 - VERDICT_MARGIN) return "underPressure";
  return "balanced";
}

/**
 * Pressão do meu jogo para a tela ao vivo: a linha (média móvel da minha parte da pressão: a
 * chance de finalizar de cada minuto mais as finalizações e pênaltis que aconteceram), o recorte dos
 * últimos minutos com o veredito e os gols no eixo do tempo. Sem o registro do motor (partida que
 * não é de uma rodada), nada.
 */
export function pressureView(state: MatchState, side: Side): PressureView | undefined {
  const pressure = state.pressure;
  if (!pressure) return undefined;
  const other: Side = side === "home" ? "away" : "home";
  const ticks = pressureTicks(state, pressure[side].length);
  const indexOf = new Map(
    ticks.map((tick, index) => [`${tick.half}:${tick.minute}:${tick.stoppage}`, index]),
  );
  // A pressão de cada lado com os lances de verdade somados no minuto deles.
  const lively = { home: [...pressure.home], away: [...pressure.away] };
  for (const event of state.events) {
    if (event.type !== "shot" && event.type !== "penalty_awarded") continue;
    const index = indexOf.get(`${event.half}:${event.minute}:${event.stoppage}`);
    if (index === undefined) continue;
    const weight = event.type === "shot" ? SHOT_PRESSURE[event.outcome] : PENALTY_PRESSURE;
    lively[event.side][index] = (lively[event.side][index] ?? 0) + weight;
  }
  const mine = lively[side];
  const theirs = lively[other];
  const points = ticks.map((tick, index) => ({
    ...tick,
    share: windowShare(mine, theirs, index, SMOOTH),
  }));
  const last = mine.length - 1;
  const recent = last < 0 ? 50 : windowShare(mine, theirs, last, RECENT);
  const overall = last < 0 ? 50 : windowShare(mine, theirs, last, mine.length);
  const extra = state.extraTime === true || ticks.some((tick) => tick.half >= 3);
  const span = Math.max(
    mine.length,
    (extra ? 120 : 90) + (state.stoppage.first ?? 0) + (state.stoppage.second ?? 0),
  );
  const firstHalf = ticks.findLastIndex((tick) => tick.half === 1);
  const halfTimeIndex = ticks.some((tick) => tick.half >= 2) ? firstHalf : undefined;
  const goals = state.events.flatMap((event) => {
    if (event.type !== "shot" || event.outcome !== "goal") return [];
    const index = indexOf.get(`${event.half}:${event.minute}:${event.stoppage}`);
    if (index === undefined) return [];
    const tick = ticks[index] as PressureTick;
    return [{ index, mine: event.side === side, tick }];
  });
  return {
    points,
    span,
    halfTimeIndex,
    recent,
    overall,
    verdict: verdictOf(recent),
    goals,
  };
}
