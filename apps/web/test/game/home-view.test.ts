// 035: o próximo jogo com os indicadores, o resumo das metas e a categoria das manchetes.
import {
  type CompletedPlayer,
  HEADLINE_TYPES,
  teamStrength,
  upcomingUnavailability,
} from "@brasfoot-like/engine";
import { nextFixture, type SaveFile, seasonStateOf, userSeason } from "@brasfoot-like/save";
import { describe, expect, it } from "vitest";
import { goalSummary, headlineCategory, matchPreview } from "../../src/game/home-view";
import { fitnessAt } from "../../src/game/selectors";
import { storedCareer } from "../helpers/career";

function mineStrength(save: SaveFile): number {
  const players = new Map(save.bank.players.map((player) => [player.id, player]));
  const onField: Record<string, CompletedPlayer | undefined> = {};
  for (const [slot, id] of Object.entries(save.lineup.starters)) onField[slot] = players.get(id);
  return Math.round(teamStrength({ formation: save.lineup.formation, onField }).overall);
}

describe("matchPreview (035)", () => {
  it("o mandante fica em home, e a forma de cada lado tem até cinco resultados", async () => {
    const { save } = await storedCareer(6);
    const preview = matchPreview(save);
    const fixture = nextFixture(save);
    expect(preview?.home.clubId).toBe(fixture?.home);
    expect(preview?.away.clubId).toBe(fixture?.away);
    expect(preview?.home.form.length).toBe(5);
    expect(preview?.away.form.length).toBe(5);
  });

  it("na primeira rodada, as formas estão vazias", async () => {
    const { save } = await storedCareer(1);
    const preview = matchPreview(save);
    expect(preview?.home.form).toEqual([]);
    expect(preview?.away.form).toEqual([]);
  });

  it("a força do meu time é a do motor com a escalação do save, e cai com um reserva fraco", async () => {
    const { save } = await storedCareer(3);
    const preview = matchPreview(save);
    expect(preview?.strength.mine).toBe(mineStrength(save));
    expect(preview?.strength.opponent).toBeGreaterThan(0);

    // Troca o titular mais forte de linha pelo jogador mais fraco do elenco fora do time.
    const players = new Map(save.bank.players.map((player) => [player.id, player]));
    const starters = Object.entries(save.lineup.starters);
    const used = new Set(starters.map(([, id]) => id));
    const [slot] = starters
      .filter(([, id]) => players.get(id)?.position !== "GK")
      .sort(
        (a, b) => (players.get(b[1])?.strength ?? 0) - (players.get(a[1])?.strength ?? 0),
      )[0] ?? [""];
    const weakest = save.bank.players
      .filter((player) => player.clubId === save.clubId && !used.has(player.id))
      .sort((a, b) => a.strength - b.strength)[0];
    const weaker: SaveFile = {
      ...save,
      lineup: {
        ...save.lineup,
        starters: { ...save.lineup.starters, [slot]: weakest?.id ?? "" },
        bench: save.lineup.bench.filter((id) => id !== weakest?.id),
      },
    };
    expect(matchPreview(weaker)?.strength.mine).toBeLessThan(preview?.strength.mine ?? 0);
  });

  it("a condição é a média arredondada dos titulares", async () => {
    const { save } = await storedCareer(4);
    const fitness = fitnessAt(save);
    const ids = Object.values(save.lineup.starters);
    const expected = Math.round(ids.reduce((sum, id) => sum + fitness(id), 0) / ids.length);
    expect(matchPreview(save)?.fitness).toBe(expected);
  });

  it("os desfalques são os indisponíveis do próximo jogo, e uma lesão soma um", async () => {
    const { save } = await storedCareer(2);
    const before = matchPreview(save)?.absences ?? 0;
    expect(before).toBe(upcomingUnavailability(seasonStateOf(save), save.clubId).length);
    const raw = structuredClone(save);
    const healthy = raw.bank.players.find(
      (player) => player.clubId === raw.clubId && !userSeason(raw).status[player.id]?.injury,
    );
    userSeason(raw).status[healthy?.id ?? ""] = { yellows: 0, suspension: 0, injury: 3 };
    expect(matchPreview(raw)?.absences).toBe(before + 1);
  });

  it("é determinístico", async () => {
    const { save } = await storedCareer(5);
    expect(matchPreview(save)).toEqual(matchPreview(save));
  });
});

describe("goalSummary e headlineCategory (035)", () => {
  it("toda manchete tem categoria", () => {
    for (const type of HEADLINE_TYPES) expect(headlineCategory(type)).toBeTruthy();
  });

  it("conta as metas no caminho entre as já medidas", async () => {
    const { save } = await storedCareer(6);
    const summary = goalSummary(save);
    expect(summary).toBeDefined();
    expect(summary?.onTrack).toBeLessThanOrEqual(summary?.total ?? 0);
    expect((summary?.total ?? 0) + (summary?.pending ?? 0)).toBeGreaterThan(0);
  });

  it("sem clube, não há resumo de metas", async () => {
    const { save } = await storedCareer(1, (career) => ({
      ...career,
      board: { ...career.board, manager: { ...career.board.manager, clubId: null } },
    }));
    expect(goalSummary(save)).toBeUndefined();
  });
});
