import { leagueRound } from "../career/league";
import type { CareerSeasonState } from "../career/season-state";
import type { CompletedPlayer } from "../model/types";
import { initialEstimate } from "../renewal/estimate";
import { MAX_SCOUTING_LEVEL, scoutingRules, scoutingSlots } from "./rules";
import type { ScoutingState, ScoutReport } from "./types";

/**
 * Comandos do departamento de olheiros (039 contracts/engine-scouting.md). Funções puras: a sorte
 * vem só de chaves próprias (`seed:scout:…`), sem tocar na do jogo.
 */

export function emptyScouting(): ScoutingState {
  return { level: 0, watch: [], reports: {} };
}

export type ScoutingError =
  | "scouting.invalid_level"
  | "scouting.closed"
  | "scouting.no_slot"
  | "scouting.already_watching"
  | "scouting.own_player"
  | "scouting.not_found"
  | "scouting.not_watching";

export type ScoutingResult =
  | { ok: true; state: CareerSeasonState }
  | { ok: false; error: ScoutingError };

/** Clube que o técnico treina agora; "" desempregado. */
export function scoutingManagerClub(state: Pick<CareerSeasonState, "board">): string {
  return state.board?.manager.clubId ?? "";
}

/** Nível que vale: 0 se o departamento é de outro clube (o técnico saiu) ou está fechado. */
export function effectiveScoutingLevel(
  scouting: ScoutingState | undefined,
  managerClubId: string,
): number {
  if (!scouting || managerClubId === "" || scouting.clubId !== managerClubId) return 0;
  return scouting.level;
}

/** Troca de clube do técnico: fecha o departamento e mantém os relatórios. */
export function closeScouting(scouting: ScoutingState): ScoutingState {
  // Fechar também encerra a captação (040): a região e as indicações abertas somem.
  const {
    clubId: _clubId,
    region: _region,
    pendingRegion: _pending,
    offers: _offers,
    ...rest
  } = scouting;
  return { ...rest, level: 0, watch: [] };
}

/** Estado coerente com o clube atual do técnico (fecha o departamento de outro clube). */
export function settledScouting(
  scouting: ScoutingState | undefined,
  managerClubId: string,
): ScoutingState {
  const current = scouting ?? emptyScouting();
  if (current.clubId === undefined || current.clubId === managerClubId) return current;
  return closeScouting(current);
}

/** Chave da semente da faixa inicial de um relatório. */
export function scoutKey(careerSeed: string, label: string, playerId: string): string {
  return `${careerSeed}:scout:${label}:${playerId}`;
}

/** Relatório recém-aberto: só a faixa inicial (largura das regras), sem graus. */
export function openReport(
  player: Pick<CompletedPlayer, "id" | "strength" | "hidden">,
  initialWidth: number,
  careerSeed: string,
  at: ScoutReport["updated"],
  start?: ScoutReport["estimate"],
): ScoutReport {
  return {
    estimate:
      start ?? initialEstimate(player, initialWidth, scoutKey(careerSeed, "init", player.id)),
    steps: 0,
    updated: at,
  };
}

function withScouting(state: CareerSeasonState, scouting: ScoutingState): CareerSeasonState {
  return { ...state, scouting };
}

/** Abre, muda ou fecha o departamento; observações acima das vagas novas são canceladas. */
export function setScoutingLevel(
  state: CareerSeasonState,
  level: number,
):
  | { ok: true; state: CareerSeasonState; cancelled: string[] }
  | { ok: false; error: ScoutingError } {
  if (!Number.isInteger(level) || level < 0 || level > MAX_SCOUTING_LEVEL) {
    return { ok: false, error: "scouting.invalid_level" };
  }
  const manager = scoutingManagerClub(state);
  if (manager === "" && level > 0) return { ok: false, error: "scouting.closed" };
  const current = settledScouting(state.scouting, manager);
  const slots = level === 0 ? 0 : scoutingSlots(scoutingRules(state.world, manager), level);
  const kept = current.watch.slice(0, slots);
  const cancelled = current.watch.slice(slots).map((entry) => entry.playerId);
  const next: ScoutingState =
    level === 0 ? closeScouting(current) : { ...current, clubId: manager, level, watch: kept };
  return { ok: true, state: withScouting(state, next), cancelled };
}

/** Jogador observável: de outro clube, de qualquer país, ou livre. */
function findPlayer(
  state: CareerSeasonState,
  playerId: string,
): (Pick<CompletedPlayer, "id" | "strength" | "hidden"> & { clubId?: string }) | undefined {
  return (
    state.world.players.find((player) => player.id === playerId) ??
    state.market?.freeAgents.find((agent) => agent.player.id === playerId)?.player
  );
}

/** Manda observar um jogador, se houver vaga (039 FR-006). */
export function watchPlayer(
  state: CareerSeasonState,
  playerId: string,
  careerSeed: string,
): ScoutingResult {
  const manager = scoutingManagerClub(state);
  const scouting = settledScouting(state.scouting, manager);
  const level = effectiveScoutingLevel(scouting, manager);
  if (level === 0) return { ok: false, error: "scouting.closed" };
  const player = findPlayer(state, playerId);
  if (!player) return { ok: false, error: "scouting.not_found" };
  if (player.clubId === manager) return { ok: false, error: "scouting.own_player" };
  if (scouting.watch.some((entry) => entry.playerId === playerId)) {
    return { ok: false, error: "scouting.already_watching" };
  }
  const rules = scoutingRules(state.world, manager);
  if (scouting.watch.length >= scoutingSlots(rules, level)) {
    return { ok: false, error: "scouting.no_slot" };
  }
  const at = { season: state.league.number, round: Math.max(0, leagueRound(state.league) - 1) };
  const reports = scouting.reports[playerId]
    ? scouting.reports
    : {
        ...scouting.reports,
        [playerId]: openReport(player, rules.initialWidth, careerSeed, at),
      };
  return {
    ok: true,
    state: withScouting(state, {
      ...scouting,
      watch: [...scouting.watch, { playerId, since: at }],
      reports,
    }),
  };
}

/** Cancela uma observação: libera a vaga e guarda o relatório (039 FR-012). */
export function unwatchPlayer(state: CareerSeasonState, playerId: string): ScoutingResult {
  const manager = scoutingManagerClub(state);
  const scouting = settledScouting(state.scouting, manager);
  if (!scouting.watch.some((entry) => entry.playerId === playerId)) {
    return { ok: false, error: "scouting.not_watching" };
  }
  return {
    ok: true,
    state: withScouting(state, {
      ...scouting,
      watch: scouting.watch.filter((entry) => entry.playerId !== playerId),
    }),
  };
}
