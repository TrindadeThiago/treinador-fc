import { seasonDate } from "../calendar/date";
import type { CareerSeasonState } from "../career/season-state";
import type { TurnoverContext, TurnoverStep } from "../career/types";
import { deriveWage } from "../derived/economy";
import { wageFactorOf } from "../finance/create";
import { draft, post } from "../finance/ledger";
import { addFreeAgents } from "../market/free-agents";
import type { CompletedBank, CompletedPlayer } from "../model/types";
import { createRng } from "../rng/xoshiro";
import { rulesCompetitionOf } from "../world/countries";
import { squadOf } from "../world/squads";
import {
  academyFreeAgent,
  academyState,
  asClubPlayer,
  byUtilityDesc,
  withAcademyPlayers,
  withoutAcademyPlayers,
} from "./academy";
import { withRegionalClubs } from "./regional";
import type { AcademyClub, AcademyPlayer, AcademyState, RenewalState } from "./types";
import { createYouth, neediestPosition } from "./youth";

/**
 * Academia da base (037): nível de 1 a 5 por clube, que decide a safra, a evolução e as vagas da
 * base, com obra e manutenção. Regras padrão abaixo; o mod pode trazê-las em
 * `competition.economy.academy.levels` (competição principal do país).
 */
export interface AcademyLevelRule {
  /** Reputação mínima para este nível (nível inicial e alvo da IA). */
  minReputation: number;
  /** Vagas da base. */
  slots: number;
  /** Jovens por safra. */
  youthPerIntake: number;
  /** Ajuste da força inicial dos jovens. */
  strengthAdjust: number;
  /** Bônus na margem de potencial. */
  potentialBonus: number;
  /** Participação mínima na evolução da base (0 = sem minutos, como na 036). */
  evolutionBonus: number;
  /** Manutenção mensal, em % da folha mensal de referência. */
  maintenancePct: number;
  /** Obra para chegar a este nível, em folhas mensais de referência (0 no nível 1). */
  buildMonths: number;
}

/** Padrão (research.md R2); a calibragem (T027) ajusta e registra no research. */
export const DEFAULT_ACADEMY_LEVELS: readonly AcademyLevelRule[] = [
  {
    minReputation: 0,
    slots: 15,
    youthPerIntake: 1,
    strengthAdjust: -3,
    potentialBonus: -4,
    evolutionBonus: 0,
    maintenancePct: 2,
    buildMonths: 0,
  },
  {
    minReputation: 30,
    slots: 15,
    youthPerIntake: 1,
    strengthAdjust: -1,
    potentialBonus: -2,
    evolutionBonus: 0,
    maintenancePct: 4,
    buildMonths: 2,
  },
  {
    minReputation: 45,
    slots: 15,
    youthPerIntake: 2,
    strengthAdjust: 0,
    potentialBonus: 0,
    evolutionBonus: 0.05,
    maintenancePct: 6,
    buildMonths: 3,
  },
  {
    minReputation: 65,
    slots: 20,
    youthPerIntake: 3,
    strengthAdjust: 1,
    potentialBonus: 1,
    evolutionBonus: 0.1,
    maintenancePct: 8,
    buildMonths: 4.5,
  },
  {
    minReputation: 80,
    slots: 25,
    youthPerIntake: 4,
    strengthAdjust: 4,
    potentialBonus: 6,
    evolutionBonus: 0.3,
    maintenancePct: 10,
    buildMonths: 6,
  },
];

export const MAX_ACADEMY_LEVEL = 5;
/** Jovens com que toda base começa (037 FR-004b). */
/** Jovens com que a base do clube do técnico começa (037, decisão de 2026-11-09). */
export const INITIAL_ACADEMY_SIZE = 10;
/** Clubes da IA começam com o equivalente a este número de safras do nível (até o teto acima). */
export const INITIAL_AI_INTAKES = 3;

/** Tamanho da base inicial de um clube: o técnico, 10; a IA, 3 safras do nível, até 10. */
export function initialAcademySize(rule: AcademyLevelRule, isManager: boolean): number {
  return isManager
    ? INITIAL_ACADEMY_SIZE
    : Math.min(INITIAL_ACADEMY_SIZE, INITIAL_AI_INTAKES * rule.youthPerIntake);
}
/**
 * A base inicial tem metade da margem de potencial de uma safra: são ~9 safras de uma vez, e com a
 * margem cheia a onda de talentos inflava força e salários do mundo (037, research "Calibragem").
 */
const INITIAL_MARGIN_SCALE = 0.5;
/** Idades da base inicial, espalhadas para não saírem todas na mesma virada. */
const INITIAL_AGES = [15, 16, 17, 18, 19] as const;

/** Regras do país do clube: as do mod (competição principal) ou o padrão. */
export function academyRules(world: CompletedBank, clubId: string): readonly AcademyLevelRule[] {
  return rulesCompetitionOf(world, clubId).economy?.academy?.levels ?? DEFAULT_ACADEMY_LEVELS;
}

/**
 * Maior nível que a reputação dá sozinha (037): o 5 só vem por obra. Sem o teto, os clubes grandes da
 * IA tinham a academia de elite de graça e viravam formadores ricos (caixa e continental fora da faixa).
 */
export const MAX_REPUTATION_LEVEL = 4;

/** Nível que a reputação dá (o maior cuja reputação mínima foi atingida), até `MAX_REPUTATION_LEVEL`. */
export function levelForReputation(rules: readonly AcademyLevelRule[], reputation: number): number {
  let level = 1;
  rules.forEach((rule, index) => {
    if (reputation >= rule.minReputation) level = index + 1;
  });
  return Math.min(level, MAX_REPUTATION_LEVEL);
}

function ruleOf(rules: readonly AcademyLevelRule[], level: number): AcademyLevelRule {
  const rule = rules[Math.min(MAX_ACADEMY_LEVEL, Math.max(1, level)) - 1];
  if (!rule) throw new Error(`nível de academia inválido: ${level}`);
  return rule;
}

/** Academia do clube; sem registro, o nível da reputação e nenhuma pendência. */
export function academyClub(
  renewal: RenewalState | undefined,
  world: CompletedBank,
  clubId: string,
): AcademyClub {
  const stored = academyState(renewal).clubs?.[clubId];
  if (stored) return stored;
  const reputation = world.clubs.find((club) => club.id === clubId)?.reputation ?? 0;
  return { level: levelForReputation(academyRules(world, clubId), reputation) };
}

/** Regra do nível atual do clube. */
export function academyLevelRule(
  renewal: RenewalState | undefined,
  world: CompletedBank,
  clubId: string,
): AcademyLevelRule {
  return ruleOf(academyRules(world, clubId), academyClub(renewal, world, clubId).level);
}

/** Vagas da base do clube pelo nível da academia (037 FR-004a). */
export function academyLimit(
  renewal: RenewalState | undefined,
  world: CompletedBank,
  clubId: string,
): number {
  return academyLevelRule(renewal, world, clubId).slots;
}

/** Jogadores típicos da folha de referência (calibrado na 037: 20 deixa a IA fora de crise). */
const REFERENCE_PLAYERS = 18;

/**
 * Folha mensal de referência (research R3): `REFERENCE_PLAYERS` jogadores típicos da reputação do clube, na escala
 * de salários do país (ou do estadual). Não depende do elenco do dia.
 */
export function referenceMonthlyPayroll(world: CompletedBank, clubId: string): number {
  const club = world.clubs.find((entry) => entry.id === clubId);
  if (!club) throw new Error(`clube inexistente: ${clubId}`);
  const typical = { strength: Math.round(50 + 0.15 * club.reputation) } as CompletedPlayer;
  const wage = deriveWage(typical, club, world.manifest.referenceDate);
  return Math.round((REFERENCE_PLAYERS * wage * wageFactorOf(world, clubId)) / 100);
}

/** Manutenção mensal do nível (037 FR-010, FR-011). */
export function academyMaintenance(world: CompletedBank, clubId: string, level: number): number {
  const rule = ruleOf(academyRules(world, clubId), level);
  return Math.round((referenceMonthlyPayroll(world, clubId) * rule.maintenancePct) / 100);
}

/** Custo da obra para chegar ao nível, arredondado a 1 000. */
export function academyUpgradeCost(world: CompletedBank, clubId: string, toLevel: number): number {
  const rule = ruleOf(academyRules(world, clubId), toLevel);
  return Math.round((referenceMonthlyPayroll(world, clubId) * rule.buildMonths) / 1000) * 1000;
}

/** Efeito de um nível para a tela: jovens por safra e o degrau de qualidade (1 a 5). */
export function academyEffect(
  rules: readonly AcademyLevelRule[],
  level: number,
): { youthPerIntake: number; quality: number; slots: number } {
  const rule = ruleOf(rules, level);
  return { youthPerIntake: rule.youthPerIntake, quality: level, slots: rule.slots };
}

function withClub(academy: AcademyState, clubId: string, club: AcademyClub): AcademyState {
  return { ...academy, clubs: { ...(academy.clubs ?? {}), [clubId]: club } };
}

/** Registro da academia de todos os clubes pelo nível da reputação (carreira nova e migração). */
export function withAcademyClubs(world: CompletedBank, academy: AcademyState): AcademyState {
  const clubs: Record<string, AcademyClub> = { ...(academy.clubs ?? {}) };
  for (const club of world.clubs) {
    clubs[club.id] ??= { level: levelForReputation(academyRules(world, club.id), club.reputation) };
  }
  return { ...academy, clubs };
}

export type AcademyLevelError =
  | "academy.max_level"
  | "academy.min_level"
  | "academy.pending_change"
  | "academy.insufficient_cash"
  | "academy.no_pending"
  | "academy.upgrade_paid";

export type AcademyLevelResult =
  | { ok: true; state: CareerSeasonState }
  | { ok: false; error: AcademyLevelError; params?: Record<string, number> };

function setClub(state: CareerSeasonState, clubId: string, club: AcademyClub): CareerSeasonState {
  if (!state.renewal) throw new Error("carreira sem renovação");
  return {
    ...state,
    renewal: { ...state.renewal, academy: withClub(academyState(state.renewal), clubId, club) },
  };
}

/** Melhorar a academia: paga a obra agora; o nível sobe na virada (037 FR-006). */
export function upgradeAcademy(state: CareerSeasonState, clubId: string): AcademyLevelResult {
  const current = academyClub(state.renewal, state.world, clubId);
  if (current.pending) return { ok: false, error: "academy.pending_change" };
  if (current.level >= MAX_ACADEMY_LEVEL) return { ok: false, error: "academy.max_level" };
  const cost = academyUpgradeCost(state.world, clubId, current.level + 1);
  const cash = state.finances.clubs[clubId]?.cash ?? 0;
  if (cost > cash) {
    return {
      ok: false,
      error: "academy.insufficient_cash",
      params: { cost, missing: cost - cash },
    };
  }
  const finances = draft(state.finances);
  post(finances, {
    clubId,
    season: state.league.number,
    round: 0,
    category: "academy",
    amount: -cost,
  });
  return {
    ok: true,
    state: setClub({ ...state, finances }, clubId, {
      level: current.level,
      pending: { kind: "upgrade", cost },
    }),
  };
}

/** Baixar a academia: vale na virada, sem devolução (037 FR-008). */
export function downgradeAcademy(state: CareerSeasonState, clubId: string): AcademyLevelResult {
  const current = academyClub(state.renewal, state.world, clubId);
  if (current.pending) return { ok: false, error: "academy.pending_change" };
  if (current.level <= 1) return { ok: false, error: "academy.min_level" };
  return {
    ok: true,
    state: setClub(state, clubId, { level: current.level, pending: { kind: "downgrade" } }),
  };
}

/** Cancela a redução pendente; a obra, já paga, não volta. */
export function cancelAcademyChange(state: CareerSeasonState, clubId: string): AcademyLevelResult {
  const current = academyClub(state.renewal, state.world, clubId);
  if (!current.pending) return { ok: false, error: "academy.no_pending" };
  if (current.pending.kind === "upgrade") return { ok: false, error: "academy.upgrade_paid" };
  return { ok: true, state: setClub(state, clubId, { level: current.level }) };
}

/**
 * Níveis na virada (037 research R5), por país, antes da safra:
 * - técnico: aplica a pendência;
 * - clube sem técnico: a obra paga termina, a redução é cancelada, e vale a regra da IA;
 * - IA: um degrau rumo ao nível da reputação, sem obra;
 * - IA com a base acima das vagas novas: os de menor utilidade saem como livres.
 */
export const academyLevelsStep: TurnoverStep = {
  id: "academy-levels",
  run: (context) => {
    if (!context.renewal) return context;
    const league = withRegionalClubs(context.world, context.finished);
    const date = seasonDate(context.world.manifest.referenceDate, context.finished.year + 1);
    let academy = academyState(context.renewal);
    const released: AcademyPlayer[] = [];
    for (const clubId of league.divisions.flatMap((season) => season.clubIds).sort()) {
      const club = context.world.clubs.find((entry) => entry.id === clubId);
      if (!club) continue;
      const rules = academyRules(context.world, clubId);
      const current = academyClub(context.renewal, context.world, clubId);
      const isManager = clubId === context.managerClubId && !context.passiveManager;
      let level = current.level;
      if (current.pending?.kind === "upgrade") level += 1;
      else if (current.pending?.kind === "downgrade" && isManager) level -= 1;
      else if (!isManager) {
        const target = levelForReputation(rules, club.reputation);
        level += Math.sign(target - level);
      }
      level = Math.min(MAX_ACADEMY_LEVEL, Math.max(1, level));
      academy = withClub(academy, clubId, { level });
      if (!isManager) {
        const slots = ruleOf(rules, level).slots;
        const own = academy.players.filter((entry) => entry.clubId === clubId);
        if (own.length > slots) released.push(...[...own].sort(byUtilityDesc(date)).slice(slots));
      }
    }
    if (released.length > 0) {
      academy = withoutAcademyPlayers(academy, new Set(released.map((entry) => entry.player.id)));
    }
    return {
      ...context,
      renewal: { ...context.renewal, academy },
      ...(context.market && released.length > 0
        ? {
            market: addFreeAgents(
              context.market,
              released.map((entry) => academyFreeAgent(entry, context.finished.year)),
            ),
          }
        : {}),
    } satisfies TurnoverContext;
  },
};

/**
 * Base inicial cheia (037 FR-004b, research R6): completa a base de cada clube até 15 jovens, com
 * idades espalhadas de 15 a 19, qualidade pelo nível e posição pela carência de elenco mais base.
 * Ninguém sai; ninguém entra em `world.players`.
 */
export function seedAcademies(
  world: CompletedBank,
  renewal: RenewalState,
  careerSeed: string,
  date: string,
  /** Clube do técnico, que começa com a base de 10; sem ele (simulações), todos seguem a IA. */
  managerClubId?: string,
): RenewalState {
  let academy = withAcademyClubs(world, academyState(renewal));
  let seq = renewal.nextPlayerSeq;
  const fresh: AcademyPlayer[] = [];
  const byClub = new Map<string, AcademyPlayer[]>();
  for (const entry of academy.players) {
    byClub.set(entry.clubId, [...(byClub.get(entry.clubId) ?? []), entry]);
  }
  const regulated: RenewalState = { ...renewal, academy };
  for (const club of [...world.clubs].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const own = [...(byClub.get(club.id) ?? [])];
    const rule = academyLevelRule(regulated, world, club.id);
    const missing = initialAcademySize(rule, club.id === managerClubId) - own.length;
    if (missing <= 0) continue;
    const rng = createRng(`${careerSeed}:academy-seed:${club.id}`);
    const first = world.competitions[0]?.countryId;
    const regulator =
      club.countryId === first
        ? renewal.regulator
        : (renewal.regulators?.[club.countryId] ?? { strengthOffset: 0, potentialBonus: 0 });
    for (let index = 0; index < missing; index++) {
      const age = INITIAL_AGES[index % INITIAL_AGES.length] ?? 17;
      const pool: CompletedPlayer[] = [...squadOf(world, club.id), ...own.map(asClubPlayer)];
      const youth = createYouth(
        world,
        club,
        neediestPosition(pool, rng),
        seq,
        regulator,
        date,
        rng,
        { age, level: rule, marginScale: INITIAL_MARGIN_SCALE },
      );
      seq += 1;
      const { clubId: _clubId, contract: _contract, ...player } = youth;
      const entry: AcademyPlayer = { player, clubId: club.id, joinedSeason: 1 };
      own.push(entry);
      fresh.push(entry);
    }
  }
  academy = withAcademyPlayers(academy, fresh);
  return { ...renewal, nextPlayerSeq: seq, academy };
}

/** Clubes da divisão do clube com o nível da academia, do maior ao menor (037 FR-014). */
export function divisionAcademies(
  state: CareerSeasonState,
  clubId: string,
): { clubId: string; level: number }[] {
  const season = state.league.divisions.find((entry) => entry.clubIds.includes(clubId));
  if (!season) return [];
  const name = (id: string) => state.world.clubs.find((club) => club.id === id)?.name ?? id;
  return season.clubIds
    .map((id) => ({ clubId: id, level: academyClub(state.renewal, state.world, id).level }))
    .sort((a, b) => b.level - a.level || (name(a.clubId) < name(b.clubId) ? -1 : 1));
}
