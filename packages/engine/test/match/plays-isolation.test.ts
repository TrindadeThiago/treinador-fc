import { describe, expect, it, vi } from "vitest";
import type { MatchResult } from "../../src/match/types";

// 033 FR-006/FR-007 (research R5): as jogadas usam um fluxo próprio do gerador e não mudam nada da
// partida. A mesma partida, com a geração das jogadas trocada por nada, tem o mesmo placar, os mesmos
// eventos, estatísticas, decisão, pressão e linhas (tirando `plays`).
const MATCHES = 200;

async function capture(disable: boolean): Promise<{ results: MatchResult[]; pressure: unknown[] }> {
  vi.resetModules();
  if (disable) {
    vi.doMock("../../src/match/plays", async (importOriginal) => {
      const original = await importOriginal<typeof import("../../src/match/plays")>();
      return { ...original, playMinutePlays: () => {} };
    });
  } else {
    vi.doUnmock("../../src/match/plays");
  }
  const { advanceMatch, simulateMatch, startMatch } = await import("../../src/match/engine");
  const { clubIds, makeInput } = await import("./helpers/teams");
  const ids = clubIds();
  const results: MatchResult[] = [];
  const pressure: unknown[] = [];
  for (let index = 0; index < MATCHES; index++) {
    const home = ids[index % ids.length] as string;
    let away = ids[(index * 7 + 3) % ids.length] as string;
    if (away === home) away = ids[(index + 1) % ids.length] as string;
    const input = makeInput(home, away, { seed: `isolamento-${index}` });
    const result = simulateMatch(input);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    results.push(result.result);
    // A pressão por minuto (só nas partidas de rodada) também não muda.
    if (index < 20) {
      const started = startMatch(input);
      if (!started.ok) throw new Error("entrada inválida");
      const tracked = { ...started.state, pressure: { home: [], away: [] } };
      pressure.push(advanceMatch(tracked, { toEnd: true }).pressure);
    }
  }
  return { results, pressure };
}

/** O resultado sem o campo `plays` das linhas dos jogadores. */
function withoutPlays(result: MatchResult) {
  const players = Object.fromEntries(
    Object.entries(result.players).map(([id, line]) => {
      const { plays: _plays, ...rest } = line;
      return [id, rest];
    }),
  );
  return { ...result, players };
}

describe("jogadas não mudam a partida (033 FR-006, FR-007)", () => {
  it(`${MATCHES} partidas iguais com e sem a geração das jogadas`, async () => {
    const { results: off, pressure: offPressure } = await capture(true);
    const { results: on, pressure: onPressure } = await capture(false);
    expect(onPressure).toEqual(offPressure);
    expect(on.some((result) => Object.values(result.players).some((line) => line.plays))).toBe(
      true,
    );
    // Sem a geração, as contagens ficam zeradas: a diferença é só o campo `plays`.
    expect(
      off.every((result) =>
        Object.values(result.players).every(
          (line) =>
            !line.plays ||
            Object.values(line.plays).every((value) => typeof value !== "number" || value === 0),
        ),
      ),
    ).toBe(true);
    for (let index = 0; index < MATCHES; index++) {
      expect(withoutPlays(on[index] as MatchResult)).toEqual(
        withoutPlays(off[index] as MatchResult),
      );
    }
  }, 120_000);
});
