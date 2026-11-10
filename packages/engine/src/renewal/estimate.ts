import type { TurnoverStep } from "../career/types";
import type { CompletedBank } from "../model/types";
import { createRng } from "../rng/xoshiro";
import { academyState } from "./academy";
import { type AcademyLevelRule, academyClub, academyRules } from "./academy-levels";
import { EVOLUTION_RULES } from "./rules";
import type { AcademyPlayer, AcademyState, PotentialEstimate, RenewalState } from "./types";

/**
 * Faixa de potencial estimado (038, research R1–R4). A faixa fica guardada no jovem: nasce na chegada
 * à base e, a cada virada, é sorteada de novo dentro da anterior, com largura que cai com o nível da
 * academia e com o tempo na base. Sempre contém o potencial real, nunca se alarga e nunca começa
 * abaixo da força atual. A sorte vem de uma semente própria por jovem e temporada, separada da sorte
 * do jogo: a faixa não muda nenhum resultado.
 */

/** Largura mínima: abaixo disso a faixa entregaria o valor (research R3). */
export const ESTIMATE_MIN_WIDTH = 4;

/** Menor força da escala do jogo (a evolução não desce abaixo de `minStrength`, mas o mod pode). */
const SCALE_MIN = 1;

/** Larguras padrão por nível (1 a 5), quando o mod não traz as suas (research R3). */
const DEFAULT_WIDTH = [20, 18, 16, 14, 12] as const;
const DEFAULT_SHRINK = [2, 2, 2, 3, 3] as const;

type EstimatedPlayer = {
  id: string;
  strength: number;
  hidden: { potential: number };
};

/** Largura alvo pelo nível da academia e pelas viradas na base. */
export function estimateWidth(rule: AcademyLevelRule, level: number, tenure: number): number {
  const index = Math.min(4, Math.max(0, level - 1));
  const initial = rule.estimateWidth ?? DEFAULT_WIDTH[index] ?? DEFAULT_WIDTH[0];
  const shrink = rule.estimateShrink ?? DEFAULT_SHRINK[index] ?? DEFAULT_SHRINK[0];
  return Math.max(ESTIMATE_MIN_WIDTH, initial - shrink * Math.max(0, tenure));
}

/** Chave da semente da faixa: própria, para não tocar na sorte do jogo (FR-007). */
export function estimateKey(careerSeed: string, season: number, playerId: string): string {
  return `${careerSeed}:estimate:${season}:${playerId}`;
}

/** Limite inferior nunca abaixo da força atual (que nunca passa do potencial real). */
function floorAtStrength(low: number, player: EstimatedPlayer): number {
  return Math.max(low, Math.min(player.strength, player.hidden.potential));
}

/** Faixa inicial: largura `width`, posição do valor real sorteada (FR-004). */
export function initialEstimate(
  player: EstimatedPlayer,
  width: number,
  rngKey: string,
): PotentialEstimate {
  const potential = player.hidden.potential;
  // Escala de força do jogo; um mod pode trazer potencial acima do teto da evolução.
  const maxStrength = Math.max(EVOLUTION_RULES.maxStrength, potential);
  const w = Math.min(width, maxStrength - SCALE_MIN);
  const from = Math.max(SCALE_MIN, potential - w);
  const to = Math.max(from, Math.min(potential, maxStrength - w));
  const low = createRng(rngKey).int(from, to);
  return { low: floorAtStrength(low, player), high: Math.max(potential, low + w) };
}

/**
 * Faixa nova dentro da anterior (FR-005): largura `min(atual, alvo)`, limite inferior sorteado entre
 * os que mantêm o valor real dentro e a faixa dentro da anterior. O intervalo nunca é vazio.
 */
export function narrowEstimate(
  previous: PotentialEstimate,
  player: EstimatedPlayer,
  width: number,
  rngKey: string,
): PotentialEstimate {
  const potential = player.hidden.potential;
  if (potential < previous.low || potential > previous.high) {
    // Só acontece com dados fora do contrato (save editado à mão): recomeça a faixa.
    return initialEstimate(player, width, rngKey);
  }
  const w = Math.min(previous.high - previous.low, width);
  const from = Math.max(previous.low, potential - w);
  const to = Math.max(from, Math.min(potential, previous.high - w));
  const low = createRng(rngKey).int(from, to);
  return { low: floorAtStrength(low, player), high: low + w };
}

/** Dá a faixa inicial a um jovem que chega à base (tempo zero). */
export function withEstimate(
  entry: AcademyPlayer,
  rules: readonly AcademyLevelRule[],
  level: number,
  careerSeed: string,
): AcademyPlayer {
  const rule = rules[Math.min(rules.length, Math.max(1, level)) - 1];
  if (!rule) throw new Error(`nível de academia inválido: ${level}`);
  const width = estimateWidth(rule, level, 0);
  return {
    ...entry,
    estimate: initialEstimate(
      entry.player,
      width,
      estimateKey(careerSeed, entry.joinedSeason, entry.player.id),
    ),
  };
}

/**
 * Etapa "academy-estimates" (R4), depois de "complete-squads": estreita a faixa de todo jovem que já
 * estava na base, em todos os clubes, com o nível atual da academia e o tempo na base. Jovens sem
 * faixa (dados antigos) ganham a faixa inicial do tempo que já têm.
 */
export const academyEstimatesStep: TurnoverStep = {
  id: "academy-estimates",
  run: (context) => {
    if (!context.renewal) return context;
    const academy = academyState(context.renewal);
    if (academy.players.length === 0) return context;
    const season = context.finished.number + 1;
    const players = academy.players.map((entry) => {
      if (entry.joinedSeason >= season && entry.estimate) return entry;
      const level = academyClub(context.renewal, context.world, entry.clubId).level;
      const rules = academyRules(context.world, entry.clubId);
      const rule = rules[Math.min(rules.length, Math.max(1, level)) - 1];
      if (!rule) return entry;
      const width = estimateWidth(rule, level, season - entry.joinedSeason);
      const key = estimateKey(context.careerSeed, season, entry.player.id);
      const estimate = entry.estimate
        ? narrowEstimate(entry.estimate, entry.player, width, key)
        : initialEstimate(entry.player, width, key);
      return { ...entry, estimate };
    });
    return { ...context, renewal: { ...context.renewal, academy: { ...academy, players } } };
  },
};

/**
 * Dá faixa a quem ainda não tem (migração da 1.10.x, R10): largura pelo nível atual da academia e
 * pelo tempo `season − joinedSeason`, com uma semente própria da migração.
 */
export function withMissingEstimates(
  academy: AcademyState,
  world: CompletedBank,
  renewal: RenewalState,
  careerSeed: string,
  season: number,
): AcademyState {
  if (academy.players.every((entry) => entry.estimate)) return academy;
  const players = academy.players.map((entry) => {
    if (entry.estimate) return entry;
    const level = academyClub(renewal, world, entry.clubId).level;
    const rules = academyRules(world, entry.clubId);
    const rule = rules[Math.min(rules.length, Math.max(1, level)) - 1];
    if (!rule) return entry;
    const width = estimateWidth(rule, level, season - entry.joinedSeason);
    const key = `${careerSeed}:estimate-migrate:${entry.player.id}`;
    return { ...entry, estimate: initialEstimate(entry.player, width, key) };
  });
  return { ...academy, players };
}
