import type { CompletedPlayer } from "../model/types";

interface Index {
  length: number;
  byClub: Map<string, CompletedPlayer[]>;
}

/** Elencos por clube, memorizados por lista de jogadores (as listas do mundo não mudam no lugar). */
const INDEX = new WeakMap<readonly CompletedPlayer[], Index>();

function indexOf(players: readonly CompletedPlayer[]): Index {
  const hit = INDEX.get(players);
  if (hit && hit.length === players.length) return hit;
  const byClub = new Map<string, CompletedPlayer[]>();
  for (const player of players) {
    const squad = byClub.get(player.clubId);
    if (squad) squad.push(player);
    else byClub.set(player.clubId, [player]);
  }
  const index = { length: players.length, byClub };
  INDEX.set(players, index);
  return index;
}

const NONE: readonly CompletedPlayer[] = [];

/**
 * Elencos de todos os clubes, na ordem do mundo, do mesmo índice de `squadOf` (compartilhado e
 * memorizado por lista de jogadores: somente leitura).
 */
export function squadsIndex(world: {
  players: readonly CompletedPlayer[];
}): ReadonlyMap<string, readonly CompletedPlayer[]> {
  return indexOf(world.players).byClub;
}

/**
 * Elenco do clube (incluídos os emprestados que ele recebeu), na ordem do mundo. O índice é
 * construído uma vez por lista de jogadores: consultar o elenco de um clube custa o tamanho dele,
 * não o do mundo (020 R12, mundo de ~11 000 jogadores).
 */
export function squadOf(
  world: { players: readonly CompletedPlayer[] },
  clubId: string,
): readonly CompletedPlayer[] {
  return indexOf(world.players).byClub.get(clubId) ?? NONE;
}

const BY_ID = new WeakMap<
  readonly CompletedPlayer[],
  { length: number; map: Map<string, CompletedPlayer> }
>();

/** Jogador do mundo pelo id, em tempo constante (índice por lista de jogadores). */
export function playerById(
  world: { players: readonly CompletedPlayer[] },
  playerId: string,
): CompletedPlayer | undefined {
  return idMapOf(world.players).get(playerId);
}

function idMapOf(players: readonly CompletedPlayer[]): Map<string, CompletedPlayer> {
  let hit = BY_ID.get(players);
  if (!hit || hit.length !== players.length) {
    hit = { length: players.length, map: new Map(players.map((p) => [p.id, p])) };
    BY_ID.set(players, hit);
  }
  return hit.map;
}

const BY_POSITION = new WeakMap<
  readonly CompletedPlayer[],
  { length: number; map: Map<string, CompletedPlayer[]> }
>();

/** Jogadores do mundo numa posição, do mais forte ao mais fraco (desempate por id); índice por lista. */
export function playersAt(
  world: { players: readonly CompletedPlayer[] },
  position: string,
): readonly CompletedPlayer[] {
  let hit = BY_POSITION.get(world.players);
  if (!hit || hit.length !== world.players.length) {
    const map = reusedOrder(world.players) ?? sortedByPosition(world.players);
    hit = { length: world.players.length, map };
    BY_POSITION.set(world.players, hit);
    LAST_ORDER = { players: world.players, map };
  }
  return hit.map.get(position) ?? NONE;
}

/** Último índice por posição montado: a lista seguinte quase sempre só troca o clube de alguém. */
let LAST_ORDER: {
  players: readonly CompletedPlayer[];
  map: Map<string, CompletedPlayer[]>;
} | null = null;

function sortedByPosition(players: readonly CompletedPlayer[]): Map<string, CompletedPlayer[]> {
  const map = new Map<string, CompletedPlayer[]>();
  for (const player of players) {
    const list = map.get(player.position);
    if (list) list.push(player);
    else map.set(player.position, [player]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => b.strength - a.strength || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }
  return map;
}

/**
 * A ordem do último índice vale para a lista nova se ela tem exatamente os mesmos jogadores, cada um
 * com a mesma força e posição (o caso de uma transferência ou empréstimo, que só troca clube e
 * contrato): a chave de ordem (força, id) não mudou. Custa uma passada em vez de uma ordenação; sem
 * isso, devolve nada e o índice é montado do zero.
 */
function reusedOrder(players: readonly CompletedPlayer[]): Map<string, CompletedPlayer[]> | null {
  const last = LAST_ORDER;
  if (!last || last.players.length !== players.length) return null;
  const byId = idMapOf(players);
  if (byId.size !== players.length) return null;
  const map = new Map<string, CompletedPlayer[]>();
  for (const [position, list] of last.map) {
    const next: CompletedPlayer[] = new Array(list.length);
    for (let index = 0; index < list.length; index++) {
      const before = list[index] as CompletedPlayer;
      const now = byId.get(before.id);
      if (!now || now.strength !== before.strength || now.position !== before.position) return null;
      next[index] = now;
    }
    map.set(position, next);
  }
  return map;
}
