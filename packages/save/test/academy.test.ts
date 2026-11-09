import {
  ACADEMY_RULES,
  type AcademyPlayer,
  academyOf,
  emptyAcademy,
  validateLineup,
} from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  migrateSave,
  promoteYouth,
  releaseYouth,
  rosterIssuesOf,
  type SaveFile,
  seasonStateOf,
  youthContractPreview,
} from "../src";
import { validSave } from "./fixtures";

// 036 (T024, T033): ações da base no save e os problemas que impedem a partida.

function youth(
  save: SaveFile,
  id: string,
  position: AcademyPlayer["player"]["position"] = "MF",
): AcademyPlayer {
  const template = save.bank.players.find((player) => player.clubId === save.clubId);
  if (!template) throw new Error("sem jogador");
  const { clubId: _c, contract: _k, ...player } = template;
  return {
    player: { ...player, id, position, birthDate: `${save.league.year - 17}-03-01` },
    clubId: save.clubId,
    joinedSeason: 1,
  };
}

function withBase(save: SaveFile, entries: AcademyPlayer[]): SaveFile {
  return {
    ...save,
    renewal: {
      ...save.renewal,
      nextPlayerSeq: save.renewal.nextPlayerSeq + 1000,
      academy: {
        ...emptyAcademy(),
        players: [...entries].sort((a, b) => (a.player.id < b.player.id ? -1 : 1)),
      },
    },
  };
}

function seqId(save: SaveFile, offset: number): string {
  return `jogador-${String(save.renewal.nextPlayerSeq + offset).padStart(5, "0")}`;
}

describe("base no save (036)", () => {
  it("promover: contrato da prévia, elenco e escalação válidos, save recarrega", () => {
    const start = validSave();
    const id = seqId(start, 1);
    const save = withBase(start, [youth(start, id)]);
    const preview = youthContractPreview(save, id);
    const done = promoteYouth(save, id);
    if (!done.ok) throw new Error(done.error);
    const player = done.save.bank.players.find((entry) => entry.id === id);
    expect(player?.clubId).toBe(save.clubId);
    expect(player?.contract).toEqual(preview);
    expect(academyOf(done.save.renewal, save.clubId)).toEqual([]);
    const squad = done.save.bank.players.filter((entry) => entry.clubId === save.clubId);
    expect(validateLineup(done.save.lineup, squad, []).valid).toBe(true);
    expect(migrateSave(JSON.parse(JSON.stringify(done.save))).status).toBe("ok");
  });

  it("dispensar: o jovem vira livre e o save recarrega", () => {
    const start = validSave();
    const id = seqId(start, 1);
    const done = releaseYouth(withBase(start, [youth(start, id)]), id);
    if (!done.ok) throw new Error(done.error);
    expect(done.save.market.freeAgents.some((agent) => agent.player.id === id)).toBe(true);
    expect(migrateSave(JSON.parse(JSON.stringify(done.save))).status).toBe("ok");
  });

  it("desempregado não promove nem dispensa", () => {
    const start = validSave();
    const id = seqId(start, 1);
    const save = withBase(start, [youth(start, id)]);
    const unemployed: SaveFile = {
      ...save,
      board: { ...save.board, manager: { ...save.board.manager, clubId: null } },
    };
    expect(promoteYouth(unemployed, id)).toEqual({ ok: false, error: "academy.unemployed" });
    expect(releaseYouth(unemployed, id)).toEqual({ ok: false, error: "academy.unemployed" });
    expect(rosterIssuesOf(unemployed)).toEqual([]);
  });

  it("base acima do limite impede; promover ou dispensar libera", () => {
    const start = validSave();
    const ids = Array.from({ length: ACADEMY_RULES.maxPlayers + 1 }, (_, index) =>
      seqId(start, index + 1),
    );
    const save = withBase(
      start,
      ids.map((id) => youth(start, id)),
    );
    expect(rosterIssuesOf(save).map((issue) => issue.code)).toEqual(["academy_over_limit"]);
    const done = releaseYouth(save, ids[0] ?? "");
    if (!done.ok) throw new Error(done.error);
    expect(rosterIssuesOf(done.save)).toEqual([]);
  });

  it("elenco abaixo do mínimo impede; promover da base resolve, mesmo sem caixa", () => {
    const start = validSave();
    const keepers = start.bank.players.filter(
      (player) => player.clubId === start.clubId && player.position === "GK",
    );
    const ids = keepers.map((_, index) => seqId(start, index + 1));
    const short: SaveFile = withBase(
      {
        ...start,
        bank: {
          ...start.bank,
          players: start.bank.players.filter((player) => !keepers.includes(player)),
        },
        finances: {
          ...start.finances,
          clubs: {
            ...start.finances.clubs,
            [start.clubId]: {
              ...(start.finances.clubs[start.clubId] as SaveFile["finances"]["clubs"][string]),
              cash: -5_000_000,
            },
          },
        },
      },
      ids.map((id) => youth(start, id, "GK")),
    );
    const issues = rosterIssuesOf(short);
    expect(issues.map((issue) => issue.code)).toEqual(["squad_below_minimum"]);
    expect(issues[0]?.params.positions).toBe("GK");
    let save = short;
    for (const id of ids) {
      const done = promoteYouth(save, id);
      if (!done.ok) throw new Error(done.error);
      save = done.save;
    }
    expect(rosterIssuesOf(save)).toEqual([]);
    expect(
      seasonStateOf(save).world.players.filter(
        (p) => p.clubId === save.clubId && p.position === "GK",
      ),
    ).toHaveLength(keepers.length);
  });
});
