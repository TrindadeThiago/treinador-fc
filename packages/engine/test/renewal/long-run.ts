import { beforeAll, describe, expect, it } from "vitest";
import { ageOn, seasonDate } from "../../src/calendar/date";
import { advanceCareer } from "../../src/career/day";
import { createLeagueSeason } from "../../src/career/league";
import { seasonTurnover } from "../../src/career/turnover";
import type { LeagueSeason, SeasonHistoryEntry } from "../../src/career/types";
import { annualWageBill, createFinances } from "../../src/finance/create";
import type { FinanceState } from "../../src/finance/types";
import { ensureContracts } from "../../src/market/contracts";
import { emptyMarket, type MarketState } from "../../src/market/types";
import type { CompletedBank } from "../../src/model/types";
import { academyLimit } from "../../src/renewal/academy-levels";
import { initialCareerRenewal, measureWorld, playerSeq } from "../../src/renewal/measure";
import { ACADEMY_RULES } from "../../src/renewal/rules";
import { squadProblems } from "../../src/renewal/squads";
import type { EvolutionRecord, RenewalState, WorldMeasure } from "../../src/renewal/types";
import { spearman } from "../../src/season/credibility";
import { validateBank } from "../../src/validation/validate";
import { competitionId, testWorld } from "../career/helpers";

// Critérios de aceite da 009 (Princípio V, research.md R9) e da economia da 008, com renovação.
// Um arquivo de teste por seed (`long-run-<n>.test.ts`): os mundos longos rodam em paralelo.
const SEASONS = 30;
const RANGES = {
  mean: [55, 63],
  p10: [43, 54],
  p50: [54, 63],
  p90: [63, 75],
  // Revisto de 94 para 95 na 037: com a academia, um craque chegou a 95 numa temporada.
  max: [78, 95],
  meanAge: [24, 27.5],
} as const;
const MIN_STARS = 1;
const MIN_YOUTH_MINUTES_GAIN_PER_SEASON = 1;
const ECONOMY = {
  maxAboveMedianInWageBills: 4,
  minHealthyShareEachSeason: 0.8,
  minHealthyShareAverage: 0.9,
  minSpearmanReputationCash: 0.4,
};
const NO_MANAGER = "";
/** Livres ao fim de cada virada (010, research.md R11). */
const MAX_FREE_AGENTS = 150;
/** Elenco de base (036 R10): população estável e elencos da IA no tamanho de hoje. */
const ACADEMY_LIMITS = {
  /**
   * Elencos + bases variam no máximo isto em relação à temporada `settledSeason`, quando a base já
   * se formou (no início não há base, e ela vira um estoque de ~10% a mais de jogadores). As ondas
   * de geração fazem a população oscilar até ~6,5% nas duas seeds medidas.
   */
  // Revisto de 0,08 para 0,10 na 037: a base inicial cheia se esvazia nas primeiras temporadas.
  populationDrift: 0.1,
  // 037: a base inicial cheia leva ~10 temporadas para se esvaziar; antes disso a população cai.
  settledSeason: 10,
  aiSquadMean: [23, 28] as const,
};

interface SeasonEnd {
  measure: WorldMeasure;
  problems: string[];
  bankValid: boolean;
  cash: Map<string, number>;
  crisis: number;
  gaps: number[];
  freeAgents: number;
  /** Jogadores com contrato vencido no mundo depois da virada. */
  expired: number;
  /** Maior base de um clube depois da virada (036). */
  academyMax: number;
  /** Safras de emergência da virada (036 R6). */
  emergencies: number;
  /** Jogadores criados na virada fora da safra e da emergência (deve ser 0, 036 FR-011). */
  createdDirect: number;
  /** Elencos + bases (036 R10). */
  population: number;
  /** Idade média só dos profissionais (037: a base cheia puxava a média do mundo para baixo). */
  proMeanAge: number;
  /** Tamanho médio dos elencos. */
  squadMean: number;
  /** Jovens da base sem faixa ou com a faixa sem o potencial real (038 SC-001: deve ser 0). */
  estimateMisses: number;
  /** Jovens que ficaram na base com a faixa fora da anterior (038 SC-004: deve ser 0). */
  estimateEscapes: number;
  /** Jovens que ficaram na base de uma virada para a outra. */
  estimateStayed: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

/** Ganho dos jovens (≤ 21) do quartil de mais minutos menos o do quartil de menos, numa evolução. */
function youthGap(world: CompletedBank, record: EvolutionRecord, date: string): number | undefined {
  const young = world.players
    .filter(
      (player) => ageOn(player.birthDate, date) <= 21 && record.deltas[player.id] !== undefined,
    )
    .map((player) => ({
      minutes: record.minutes[player.id] ?? 0,
      delta: record.deltas[player.id] ?? 0,
    }))
    .sort((a, b) => a.minutes - b.minutes);
  const quarter = Math.floor(young.length / 4);
  if (quarter === 0) return undefined;
  const mean = (items: typeof young) =>
    items.reduce((sum, item) => sum + item.delta, 0) / items.length;
  return mean(young.slice(-quarter)) - mean(young.slice(0, quarter));
}

function simulate(careerSeed: string): SeasonEnd[] {
  const base = testWorld();
  const created = createLeagueSeason(base, { competitionId: competitionId(), careerSeed });
  if (!created.ok) throw new Error("falhou");
  let world: CompletedBank = ensureContracts(base, created.league.year, careerSeed);
  let market: MarketState = emptyMarket();
  let league: LeagueSeason = created.league;
  let finances: FinanceState = createFinances(world, league);
  let renewal: RenewalState = initialCareerRenewal(world, careerSeed, world.manifest.referenceDate);
  let history: SeasonHistoryEntry[] = [];
  const ends: SeasonEnd[] = [];
  let estimates = new Map(
    (renewal.academy?.players ?? []).map((entry) => [entry.player.id, entry.estimate]),
  );
  for (let index = 0; index < SEASONS; index++) {
    const date = seasonDate(world.manifest.referenceDate, league.year);
    const played = advanceCareer(
      league,
      finances,
      world,
      { toEnd: true },
      NO_MANAGER,
      undefined,
      { state: renewal, careerSeed },
      // Mercado da IA ativo (011): compras, empréstimos, livres e propostas a cada rodada.
      { state: market, careerSeed },
    );
    if (!played.ok) throw new Error(JSON.stringify(played.error));
    const gaps: number[] = [];
    const mid = played.renewal?.lastEvolution;
    const midGap = mid ? youthGap(world, mid, date) : undefined;
    if (midGap !== undefined) gaps.push(midGap);
    const turned = seasonTurnover(played.league, played.world, history, {
      careerSeed,
      finances: played.finances,
      managerClubId: NO_MANAGER,
      renewal: played.renewal ?? renewal,
      market: played.market ?? market,
    });
    if (!turned.ok || !turned.finances || !turned.renewal || !turned.market) {
      throw new Error(JSON.stringify(turned));
    }
    const before = played.renewal ?? renewal;
    const academyIds = new Set(
      (turned.renewal.academy?.players ?? []).map((entry) => entry.player.id),
    );
    const promotedNew = turned.world.players.filter(
      (player) =>
        playerSeq(player.id) >= before.nextPlayerSeq &&
        turned.renewal?.academy?.graduates[player.id] === undefined,
    ).length;
    void academyIds;
    market = turned.market;
    const end = turned.renewal.lastEvolution;
    const endGap = end ? youthGap(played.world, end, date) : undefined;
    if (endGap !== undefined) gaps.push(endGap);
    ({ league, history, world } = turned);
    finances = turned.finances;
    renewal = turned.renewal;
    const clubs = Object.values(finances.clubs);
    const academy = renewal.academy?.players ?? [];
    const clubIds = league.divisions.flatMap((season) => season.clubIds);
    const sizes = clubIds.map((clubId) => world.players.filter((p) => p.clubId === clubId).length);
    const perClub = new Map<string, number>();
    for (const entry of academy) perClub.set(entry.clubId, (perClub.get(entry.clubId) ?? 0) + 1);
    // Maior excesso de vagas (base menos o limite do nível do clube, 037); 0 = todas no limite.
    const overLimit = Math.max(
      0,
      ...[...perClub.entries()].map(
        ([clubId, size]) => size - academyLimit(renewal, world, clubId),
      ),
    );
    let estimateMisses = 0;
    let estimateEscapes = 0;
    let estimateStayed = 0;
    for (const entry of academy) {
      const estimate = entry.estimate;
      const potential = entry.player.hidden.potential;
      if (!estimate || estimate.low > potential || potential > estimate.high) estimateMisses += 1;
      const previous = estimates.get(entry.player.id);
      if (!previous || !estimate) continue;
      estimateStayed += 1;
      if (estimate.low < previous.low || estimate.high > previous.high) estimateEscapes += 1;
    }
    estimates = new Map(academy.map((entry) => [entry.player.id, entry.estimate]));
    ends.push({
      estimateMisses,
      estimateEscapes,
      estimateStayed,
      academyMax: overLimit,
      emergencies: renewal.academy?.emergencies ?? 0,
      createdDirect: promotedNew,
      population: world.players.length + academy.length,
      proMeanAge: measureWorld(world, league, seasonDate(world.manifest.referenceDate, league.year))
        .meanAge,
      squadMean: sizes.reduce((sum, size) => sum + size, 0) / sizes.length,
      measure: measureWorld(
        world,
        league,
        seasonDate(world.manifest.referenceDate, league.year),
        renewal.academy,
      ),
      problems: squadProblems(world, league),
      bankValid: validateBank(world).ok,
      cash: new Map(clubs.map((club) => [club.clubId, club.cash])),
      crisis: clubs.filter((club) => club.inCrisis).length,
      gaps,
      freeAgents: market.freeAgents.length,
      expired: world.players.filter((player) => (player.contract?.untilYear ?? 0) < league.year)
        .length,
    });
  }
  return ends;
}

/** Critérios do mundo longo para uma seed (cada seed num arquivo de teste). */
export function describeLongRun(seed: string): void {
  describe(`mundo em ${SEASONS} temporadas (${seed})`, () => {
    let ends: SeasonEnd[] = [];
    beforeAll(() => {
      ends = simulate(seed);
    }, 600_000);

    it("força média e percentis ficam nas faixas e sempre há craque (SC-001, SC-003)", () => {
      for (const [index, end] of ends.entries()) {
        const label = `temporada ${index + 1}`;
        for (const key of ["mean", "p10", "p50", "p90", "max"] as const) {
          const [min, max] = RANGES[key];
          expect(end.measure[key], `${label} ${key}`).toBeGreaterThanOrEqual(min);
          expect(end.measure[key], `${label} ${key}`).toBeLessThanOrEqual(max);
        }
        expect(end.measure.stars, `${label} craques`).toBeGreaterThanOrEqual(MIN_STARS);
      }
    });

    it("com contratos, o grupo de livres fica pequeno e ninguém joga com contrato vencido (SC-006)", () => {
      for (const [index, end] of ends.entries()) {
        expect(end.freeAgents, `temporada ${index + 1} livres`).toBeLessThanOrEqual(
          MAX_FREE_AGENTS,
        );
        expect(end.expired, `temporada ${index + 1} vencidos`).toBe(0);
      }
    });

    it("faixa de potencial: 100% contém o valor real e fica dentro da anterior (038 SC-001, SC-004)", () => {
      for (const [index, end] of ends.entries()) {
        expect(end.estimateMisses, `temporada ${index + 1} faixas sem o valor real`).toBe(0);
        expect(end.estimateEscapes, `temporada ${index + 1} faixas fora da anterior`).toBe(0);
      }
      expect(ends.reduce((sum, end) => sum + end.estimateStayed, 0)).toBeGreaterThan(0);
    });

    it("todo clube tem elenco válido e o mundo segue o schema do banco (SC-002)", () => {
      for (const end of ends) {
        expect(end.problems).toEqual([]);
        expect(end.bankValid).toBe(true);
      }
    });

    it("base no limite, nada criado direto no elenco, população e elencos estáveis (036 R10)", () => {
      const settled = ends[ACADEMY_LIMITS.settledSeason - 1]?.population ?? 0;
      const clubs = testWorld().clubs.length;
      const emergencies = ends.reduce((sum, end) => sum + end.emergencies, 0);
      expect(emergencies / (clubs * ends.length)).toBeLessThanOrEqual(
        ACADEMY_RULES.emergencyLimitPerClubSeason,
      );
      for (const [index, end] of ends.entries()) {
        const label = `temporada ${index + 1}`;
        expect(end.academyMax, `${label} base acima do limite do nível`).toBe(0);
        expect(end.createdDirect, `${label} criados direto`).toBe(0);
        if (index + 1 >= ACADEMY_LIMITS.settledSeason) {
          expect(
            Math.abs(end.population - settled) / settled,
            `${label} população`,
          ).toBeLessThanOrEqual(ACADEMY_LIMITS.populationDrift);
        }
        expect(end.squadMean, `${label} elenco médio`).toBeGreaterThanOrEqual(
          ACADEMY_LIMITS.aiSquadMean[0],
        );
        expect(end.squadMean, `${label} elenco médio`).toBeLessThanOrEqual(
          ACADEMY_LIMITS.aiSquadMean[1],
        );
      }
    });

    it("a idade média fica na faixa (SC-005)", () => {
      for (const end of ends) {
        expect(end.proMeanAge).toBeGreaterThanOrEqual(RANGES.meanAge[0]);
        expect(end.proMeanAge).toBeLessThanOrEqual(RANGES.meanAge[1]);
      }
    });

    it("jovens com mais minutos evoluem mais (SC-004)", () => {
      const gaps = ends.flatMap((end) => end.gaps);
      const perSeason = (2 * gaps.reduce((sum, gap) => sum + gap, 0)) / gaps.length;
      expect(perSeason).toBeGreaterThanOrEqual(MIN_YOUTH_MINUTES_GAIN_PER_SEASON);
    });

    it("a economia da 008 continua saudável com renovação (SC-006)", () => {
      const world = testWorld();
      const clubIds = [...(ends[0]?.cash.keys() ?? [])].sort();
      const wages = median(
        clubIds.map((clubId) => annualWageBill(world, clubId, world.manifest.referenceDate)),
      );
      for (const end of ends) {
        const cash = [...end.cash.values()];
        expect(Math.max(...cash) - median(cash)).toBeLessThanOrEqual(
          ECONOMY.maxAboveMedianInWageBills * wages,
        );
        expect(1 - end.crisis / clubIds.length).toBeGreaterThanOrEqual(
          ECONOMY.minHealthyShareEachSeason,
        );
      }
      const average =
        ends.reduce((sum, end) => sum + (1 - end.crisis / clubIds.length), 0) / ends.length;
      expect(average).toBeGreaterThanOrEqual(ECONOMY.minHealthyShareAverage);
      const reputation = clubIds.map(
        (clubId) => world.clubs.find((club) => club.id === clubId)?.reputation ?? 0,
      );
      const meanCash = clubIds.map(
        (clubId) => ends.reduce((sum, end) => sum + (end.cash.get(clubId) ?? 0), 0) / ends.length,
      );
      expect(spearman(reputation, meanCash)).toBeGreaterThanOrEqual(
        ECONOMY.minSpearmanReputationCash,
      );
    });

    it("repetir a carreira dá o mesmo mundo (SC-007)", () => {
      const again = simulate(seed);
      expect(again.map((end) => end.measure)).toEqual(ends.map((end) => end.measure));
    }, 600_000);
  });
}
