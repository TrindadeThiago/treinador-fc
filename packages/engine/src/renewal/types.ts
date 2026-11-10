import type { Position } from "../model/catalogs";
import type { CompletedPlayer } from "../model/types";

/** Renovação do mundo (data-model.md da 009). */

export interface WorldMeasure {
  players: number;
  mean: number;
  p10: number;
  p50: number;
  p90: number;
  max: number;
  /** Jogadores com força ≥ STAR_THRESHOLD. */
  stars: number;
  /** Jovens (até REGULATOR_RULES.prospectAge) com potencial ≥ PROSPECT_POTENTIAL. */
  prospects: number;
  meanAge: number;
}

export interface RegulatorState {
  /** Somado à força base dos jovens gerados. */
  strengthOffset: number;
  /** Somado à margem de potencial dos jovens gerados. */
  potentialBonus: number;
  lastMeasure?: WorldMeasure;
}

export interface EvolutionRecord {
  season: number;
  moment: "mid" | "end";
  deltas: Record<string, number>;
  minutes: Record<string, number>;
}

export interface PlayerRef {
  playerId: string;
  displayName: string;
  position: Position;
  age: number;
  strength: number;
}

export interface PlayerDelta extends PlayerRef {
  delta: number;
}

/** Jovem da base de um clube (036): o jogador do mundo sem clube nem contrato. */
export interface AcademyPlayer {
  player: Omit<CompletedPlayer, "clubId" | "contract">;
  /** Clube dono da base. */
  clubId: string;
  /** Temporada (`LeagueSeason.number`) da safra em que chegou. */
  joinedSeason: number;
}

/** Origem de um jogador promovido da base. */
export interface AcademyGraduate {
  clubId: string;
  season: number;
}

/** Academia de um clube (037): nível e, no máximo, uma mudança pendente. */
export interface AcademyClub {
  level: number;
  pending?: { kind: "upgrade"; cost: number } | { kind: "downgrade" };
}

/** Bases de todos os clubes (036, data-model.md). */
export interface AcademyState {
  /** Academias por clube (037); clube sem registro = nível da reputação. */
  clubs?: Record<string, AcademyClub>;
  /** Em ordem de id. */
  players: AcademyPlayer[];
  /** Promovidos da base, por id de jogador; podado na virada. */
  graduates: Record<string, AcademyGraduate>;
  /** Promoções do técnico na temporada atual (para o aviso da virada). */
  promotedThisSeason: PlayerRef[];
  /** Dispensas do técnico na temporada atual (para o aviso da virada). */
  releasedThisSeason: PlayerRef[];
  /** Safras de emergência da última virada (R6). */
  emergencies: number;
}

export interface SquadChangeNotice {
  season: number;
  clubId: string;
  retired: PlayerRef[];
  arrived: PlayerRef[];
  released: PlayerRef[];
  promoted: PlayerRef[];
  /** Chegaram à base na safra (036). */
  academyArrived?: PlayerRef[];
  /** Saíram da base por idade e viraram livres (036). */
  academyAgedOut?: PlayerRef[];
  /** Dispensados da base na temporada (036). */
  academyReleased?: PlayerRef[];
  risers: PlayerDelta[];
  fallers: PlayerDelta[];
}

export interface RenewalState {
  /** Próximo número de id de jogador (`jogador-NNNNN`). */
  nextPlayerSeq: number;
  /** Regulador do primeiro país do banco (único, num banco de um país). */
  regulator: RegulatorState;
  /** Reguladores dos demais países, por id do país (020 R13); ausente = ainda no estado inicial. */
  regulators?: Record<string, RegulatorState>;
  lastEvolution?: EvolutionRecord;
  squadNotice?: SquadChangeNotice;
  /** Elencos de base (036); ausente só em usos sem carreira. */
  academy?: AcademyState;
}
