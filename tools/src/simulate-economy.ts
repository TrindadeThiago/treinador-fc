// Simula a economia de uma carreira sem interação e confere os limites da 008 (research.md R10).
// Uso: pnpm sim:economy [--seed <seed>] [--seasons <n>]
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  academyUpgradeCost,
  advanceCareer,
  ageOn,
  annualWageBill,
  buyAskingPrice,
  type CompletedBank,
  canAddPlayer,
  canRemovePlayer,
  completeHiddenAttributes,
  contractYearsRange,
  createFans,
  createFinances,
  createLeagueSeason,
  emptyMarket,
  ensureContracts,
  type FinanceState,
  feeWithResale,
  generateDefaultBank,
  generateOffers,
  initialCareerRenewal,
  type MarketContext,
  marketRules,
  marketValue,
  measureWorld,
  proposeContract,
  pruneResale,
  QUICK_SALE_PCT,
  resaleRules,
  resaleSteps,
  type SeasonHistoryEntry,
  scoutingCost,
  seasonDate,
  seasonFinanceSummary,
  seasonTurnover,
  sellNow,
  shareOf,
  signOffer,
  spearman,
  startNegotiation,
  wageDemand,
} from "@brasfoot-like/engine";
import { DEFAULT_SEED } from "./default-seed";
import { WORLD_LIMITS } from "./simulate-world";

/** Limites de research.md R10 (os mesmos de finance/long-run.test.ts). */
export const ECONOMY_LIMITS = {
  maxAboveMedianInWageBills: 4,
  minHealthyShareEachSeason: 0.8,
  minHealthyShareAverage: 0.9,
  minSpearmanReputationCash: 0.4,
  medianCashMaxInWageBills: 5,
} as const;

export interface SimulateEconomyOptions {
  seed: string;
  seasons?: number;
  world?: CompletedBank;
}

export interface SimulateEconomyOutput {
  exitCode: number;
  lines: string[];
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

const millions = (value: number) => `${(value / 1_000_000).toFixed(1)} mi`;

/** Executa a simulação e devolve a saída (testável, sem encerrar o processo). */
export function runSimulateEconomy(options: SimulateEconomyOptions): SimulateEconomyOutput {
  const seasons = options.seasons ?? 30;
  const bank: CompletedBank =
    options.world ??
    completeHiddenAttributes(generateDefaultBank({ seed: DEFAULT_SEED }), options.seed);
  const competition = bank.competitions[0];
  if (!competition) throw new Error("banco sem competição");
  const created = createLeagueSeason(bank, {
    competitionId: competition.id,
    careerSeed: options.seed,
  });
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  // Contratos e livres (010): a folha vem dos salários contratuais.
  let world: CompletedBank = ensureContracts(bank, created.league.year, options.seed);
  let market = emptyMarket();
  let league = created.league;
  let finances: FinanceState = createFinances(world, league);
  let renewal = initialCareerRenewal(world, options.seed, world.manifest.referenceDate);
  // Torcidas ativas (013): o humor mexe na bilheteria.
  let fans = createFans(world, league);
  let history: SeasonHistoryEntry[] = [];
  const clubIds = Object.keys(finances.clubs).sort();
  const wages = median(
    clubIds.map((clubId) => annualWageBill(world, clubId, world.manifest.referenceDate)),
  );
  const totals = new Map(clubIds.map((clubId) => [clubId, 0]));
  const lines = [
    `Economia de ${seasons} temporadas — seed "${options.seed}"`,
    `Mediana da folha anual: ${millions(wages)}`,
    "",
  ];
  lines.push("Temp.   mínimo   mediana    máximo   crise   folha mediana   livres");
  let ok = true;
  let healthySum = 0;
  let lastMedian = 0;
  for (let index = 0; index < seasons; index++) {
    const played = advanceCareer(
      league,
      finances,
      world,
      { toEnd: true },
      "",
      undefined,
      { state: renewal, careerSeed: options.seed },
      { state: market, careerSeed: options.seed },
      undefined,
      { state: fans },
    );
    if (!played.ok) throw new Error(JSON.stringify(played.error));
    const turned = seasonTurnover(played.league, played.world, history, {
      careerSeed: options.seed,
      finances: played.finances,
      managerClubId: "",
      renewal: played.renewal ?? renewal,
      market: played.market ?? market,
      fans: played.fans ?? fans,
    });
    if (!turned.ok || !turned.finances) throw new Error(JSON.stringify(turned));
    market = turned.market ?? market;
    fans = turned.fans ?? fans;
    league = turned.league;
    history = turned.history;
    finances = turned.finances;
    world = turned.world;
    renewal = turned.renewal ?? renewal;
    const cash = clubIds.map((clubId) => finances.clubs[clubId]?.cash ?? 0);
    for (const [position, clubId] of clubIds.entries()) {
      totals.set(clubId, (totals.get(clubId) ?? 0) + (cash[position] ?? 0));
    }
    const crisis = clubIds.filter((clubId) => finances.clubs[clubId]?.inCrisis).length;
    const healthy = 1 - crisis / clubIds.length;
    healthySum += healthy;
    lastMedian = median(cash);
    const spread = Math.max(...cash) - lastMedian;
    const seasonOk =
      spread <= ECONOMY_LIMITS.maxAboveMedianInWageBills * wages &&
      healthy >= ECONOMY_LIMITS.minHealthyShareEachSeason;
    ok &&= seasonOk;
    lines.push(
      `${seasonOk ? "✓" : "✗"} ${String(index + 1).padStart(3)} ${millions(Math.min(...cash)).padStart(9)} ${millions(lastMedian).padStart(9)} ${millions(Math.max(...cash)).padStart(9)} ${String(crisis).padStart(6)} ${millions(median(clubIds.map((clubId) => annualWageBill(world, clubId, world.manifest.referenceDate)))).padStart(15)} ${String(market.freeAgents.length).padStart(8)}`,
    );
  }
  const reputation = clubIds.map(
    (clubId) => world.clubs.find((club) => club.id === clubId)?.reputation ?? 0,
  );
  const correlation = spearman(
    reputation,
    clubIds.map((clubId) => (totals.get(clubId) ?? 0) / seasons),
  );
  const average = healthySum / seasons;
  const checks = [
    [
      average >= ECONOMY_LIMITS.minHealthyShareAverage,
      `clubes fora de crise na média: ${(100 * average).toFixed(1)}% (≥ ${100 * ECONOMY_LIMITS.minHealthyShareAverage}%)`,
    ],
    [
      correlation >= ECONOMY_LIMITS.minSpearmanReputationCash,
      `Spearman reputação × caixa médio: ${correlation.toFixed(3)} (≥ ${ECONOMY_LIMITS.minSpearmanReputationCash})`,
    ],
    [
      lastMedian >= 0 && lastMedian <= ECONOMY_LIMITS.medianCashMaxInWageBills * wages,
      `mediana do caixa no fim: ${millions(lastMedian)} (0 a ${millions(ECONOMY_LIMITS.medianCashMaxInWageBills * wages)})`,
    ],
  ] as const;
  lines.push("");
  for (const [passed, text] of checks) {
    ok &&= passed;
    lines.push(`${passed ? "✓" : "✗"} ${text}`);
  }
  return { exitCode: ok ? 0 : 1, lines };
}

/** Limites do cenário da academia (037 SC-002, SC-003). */
export const ACADEMY_SCENARIO_LIMITS = {
  /** O nível 5 traz pelo menos isto vezes os jovens do nível 1. */
  minYouthRatio: 1.5,
} as const;

interface AcademyRun {
  youths: number;
  strength: number;
  potential: number;
  /** Receita de vendas de crias da base do clube. */
  sales: number;
  /** Obras e manutenção da academia pagas pelo clube. */
  cost: number;
  /** Custo das obras para chegar ao nível. */
  build: number;
  /** Vendas de crias nas primeiras temporadas (retorno lento). */
  earlySales: number;
}

/** Temporadas em que o retorno ainda não paga a obra (037 SC-003, clube formador). */
const EARLY_SEASONS = 3;

/**
 * Cenário da academia (037): o clube de menor reputação com a academia fixa num nível por
 * `seasons` temporadas. Mede a safra (quantidade, força e potencial), a venda das crias e o custo.
 */
function academyRun(seed: string, level: number, seasons: number): AcademyRun {
  const bank = completeHiddenAttributes(generateDefaultBank({ seed: DEFAULT_SEED }), seed);
  const competition = bank.competitions[0];
  if (!competition) throw new Error("banco sem competição");
  const created = createLeagueSeason(bank, { competitionId: competition.id, careerSeed: seed });
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  let world: CompletedBank = ensureContracts(bank, created.league.year, seed);
  const club = [...world.clubs].sort(
    (a, b) => a.reputation - b.reputation || (a.id < b.id ? -1 : 1),
  )[0];
  if (!club) throw new Error("sem clubes");
  let market = emptyMarket();
  let league = created.league;
  let finances: FinanceState = createFinances(world, league);
  let renewal = initialCareerRenewal(world, seed, world.manifest.referenceDate);
  let fans = createFans(world, league);
  let history: SeasonHistoryEntry[] = [];
  // Obras para chegar ao nível, pagas no início (como o técnico faria nas primeiras viradas).
  const start = renewal.academy?.clubs?.[club.id]?.level ?? 1;
  let cost = 0;
  for (let next = start + 1; next <= level; next++)
    cost += academyUpgradeCost(world, club.id, next);
  const build = cost;
  let earlySales = 0;
  const youths: { strength: number; potential: number }[] = [];
  let sales = 0;
  for (let index = 0; index < seasons; index++) {
    const academy = renewal.academy;
    if (academy) {
      renewal = {
        ...renewal,
        academy: { ...academy, clubs: { ...(academy.clubs ?? {}), [club.id]: { level } } },
      };
    }
    const played = advanceCareer(
      league,
      finances,
      world,
      { toEnd: true },
      "",
      undefined,
      { state: renewal, careerSeed: seed },
      { state: market, careerSeed: seed },
      undefined,
      { state: fans },
    );
    if (!played.ok) throw new Error(JSON.stringify(played.error));
    const turned = seasonTurnover(played.league, played.world, history, {
      careerSeed: seed,
      finances: played.finances,
      managerClubId: "",
      renewal: played.renewal ?? renewal,
      market: played.market ?? market,
      fans: played.fans ?? fans,
    });
    if (!turned.ok || !turned.finances) throw new Error(JSON.stringify(turned));
    cost += -seasonFinanceSummary(played.finances, club.id).totals.academy;
    // O registro do mercado é zerado na virada: soma as vendas de crias da temporada.
    const graduates = played.renewal?.academy?.graduates ?? {};
    sales += (played.market?.log ?? [])
      .filter(
        (entry) =>
          entry.fromClubId === club.id &&
          entry.kind === "sale" &&
          graduates[entry.playerId]?.clubId === club.id,
      )
      .reduce((sum, entry) => sum + (entry.fee ?? 0), 0);
    if (index === EARLY_SEASONS - 1) earlySales = sales;
    market = turned.market ?? market;
    fans = turned.fans ?? fans;
    league = turned.league;
    history = turned.history;
    finances = turned.finances;
    world = turned.world;
    renewal = turned.renewal ?? renewal;
    for (const entry of renewal.academy?.players ?? []) {
      if (entry.clubId === club.id && entry.joinedSeason === league.number) {
        youths.push({ strength: entry.player.strength, potential: entry.player.hidden.potential });
      }
    }
  }
  const mean = (values: number[]) =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  return {
    youths: youths.length,
    strength: mean(youths.map((youth) => youth.strength)),
    potential: mean(youths.map((youth) => youth.potential)),
    sales,
    cost,
    build,
    earlySales,
  };
}

/** Cenário academia nível 1 × nível 5 (037 SC-002, SC-003). */
export function runAcademyScenario(seed: string, seasons = 10): SimulateEconomyOutput {
  const low = academyRun(seed, 1, seasons);
  const high = academyRun(seed, 5, seasons);
  const ratio = low.youths > 0 ? high.youths / low.youths : Number.POSITIVE_INFINITY;
  const checks: [boolean, string][] = [
    [
      ratio >= ACADEMY_SCENARIO_LIMITS.minYouthRatio,
      `nível 5 traz ${high.youths} jovens contra ${low.youths} do nível 1 (${ratio.toFixed(2)}×, ≥ ${ACADEMY_SCENARIO_LIMITS.minYouthRatio}×)`,
    ],
    [
      high.strength > low.strength && high.potential > low.potential,
      `força ${high.strength.toFixed(1)} × ${low.strength.toFixed(1)} e potencial ${high.potential.toFixed(1)} × ${low.potential.toFixed(1)}`,
    ],
    [
      high.earlySales < high.build,
      `clube pequeno no nível 5: o retorno leva tempo — vendas de crias nas ${EARLY_SEASONS} primeiras temporadas ${millions(high.earlySales)} < obra ${millions(high.build)} (em ${seasons}: ${millions(high.sales)} de vendas para ${millions(high.cost)} de custo, o clube formador)`,
    ],
  ];
  const lines = [`Academia — ${seasons} temporadas, clube de menor reputação, seed "${seed}"`];
  let ok = true;
  for (const [passed, text] of checks) {
    ok &&= passed;
    lines.push(`${passed ? "✓" : "✗"} ${text}`);
  }
  return { exitCode: ok ? 0 : 1, lines };
}

/** Limites do cenário dos olheiros (039 T030, Princípio V). */
export const SCOUTING_SCENARIO_LIMITS = {
  /** Custo anual do nível 5 sobre a receita da temporada do clube de menor reputação. */
  maxRevenueShare: 0.06,
} as const;

/**
 * Cenário dos olheiros (039): o clube de menor reputação por `seasons` temporadas, com o custo do
 * departamento no nível 5 calculado à parte. O limite é o peso do custo na receita de cada
 * temporada. A linha do caixa é só informativa: a IA gasta a sobra em contratações e termina as
 * temporadas com o caixa perto de zero, então somar um custo que ela nunca pagou não mede crise
 * (research.md, "Medidas").
 */
export function runScoutingScenario(seed: string, seasons = 10): SimulateEconomyOutput {
  const bank = completeHiddenAttributes(generateDefaultBank({ seed: DEFAULT_SEED }), seed);
  const competition = bank.competitions[0];
  if (!competition) throw new Error("banco sem competição");
  const created = createLeagueSeason(bank, { competitionId: competition.id, careerSeed: seed });
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  let world: CompletedBank = ensureContracts(bank, created.league.year, seed);
  const club = [...world.clubs].sort(
    (a, b) => a.reputation - b.reputation || (a.id < b.id ? -1 : 1),
  )[0];
  if (!club) throw new Error("sem clubes");
  let market = emptyMarket();
  let league = created.league;
  let finances: FinanceState = createFinances(world, league);
  let renewal = initialCareerRenewal(world, seed, world.manifest.referenceDate);
  let fans = createFans(world, league);
  let history: SeasonHistoryEntry[] = [];
  let worstShare = 0;
  let paid = 0;
  let lowestEndCash = Number.POSITIVE_INFINITY;
  for (let index = 0; index < seasons; index++) {
    const played = advanceCareer(
      league,
      finances,
      world,
      { toEnd: true },
      "",
      undefined,
      { state: renewal, careerSeed: seed },
      { state: market, careerSeed: seed },
      undefined,
      { state: fans },
    );
    if (!played.ok) throw new Error(JSON.stringify(played.error));
    const totals = seasonFinanceSummary(played.finances, club.id).totals;
    const revenue = totals.gate + totals.sponsorship + totals.prize + totals.transfer_sale;
    const annual = 12 * scoutingCost(played.world, club.id, 5);
    paid += annual;
    if (revenue > 0) worstShare = Math.max(worstShare, annual / revenue);
    lowestEndCash = Math.min(lowestEndCash, played.finances.clubs[club.id]?.cash ?? 0);
    const turned = seasonTurnover(played.league, played.world, history, {
      careerSeed: seed,
      finances: played.finances,
      managerClubId: "",
      renewal: played.renewal ?? renewal,
      market: played.market ?? market,
      fans: played.fans ?? fans,
    });
    if (!turned.ok || !turned.finances) throw new Error(JSON.stringify(turned));
    market = turned.market ?? market;
    fans = turned.fans ?? fans;
    league = turned.league;
    history = turned.history;
    finances = turned.finances;
    world = turned.world;
    renewal = turned.renewal ?? renewal;
  }
  const checks: [boolean, string][] = [
    [
      worstShare <= SCOUTING_SCENARIO_LIMITS.maxRevenueShare,
      `olheiros no nível 5 custam no máximo ${(100 * worstShare).toFixed(1)}% da receita da temporada (≤ ${100 * SCOUTING_SCENARIO_LIMITS.maxRevenueShare}%)`,
    ],
  ];
  const lines = [`Olheiros — ${seasons} temporadas, clube de menor reputação, seed "${seed}"`];
  lines.push(
    `  (informativo) custo de ${millions(paid)} em ${seasons} temporadas; menor caixa da IA no fim de uma temporada: ${millions(lowestEndCash)}`,
  );
  let ok = true;
  for (const [passed, text] of checks) {
    ok &&= passed;
    lines.push(`${passed ? "✓" : "✗"} ${text}`);
  }
  return { exitCode: ok ? 0 : 1, lines };
}

/** Limites do cenário da captação (040 SC-004, Princípio V). */
export const RECRUITMENT_SCENARIO_LIMITS = {
  /** Registros pagos sobre a receita da temporada. */
  maxRevenueShare: 0.06,
} as const;

interface RecruitmentRun {
  /** Potencial médio da base do clube no fim de cada temporada. */
  basePotential: number;
  scouted: { strength: number; potential: number; count: number };
  worstShare: number;
}

/**
 * Cenário da captação (040): o clube de menor reputação por `seasons` temporadas. Com `recruit`, a
 * cada virada o departamento (nível 5, região = o país do clube) gera as indicações de duas janelas, e
 * o clube traz a de maior centro de faixa enquanto houver vaga e caixa. A IA cuida das promoções.
 */
function recruitmentRun(seed: string, seasons: number, recruit: boolean): RecruitmentRun {
  const bank = completeHiddenAttributes(generateDefaultBank({ seed: DEFAULT_SEED }), seed);
  const competition = bank.competitions[0];
  if (!competition) throw new Error("banco sem competição");
  const created = createLeagueSeason(bank, { competitionId: competition.id, careerSeed: seed });
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  let world: CompletedBank = ensureContracts(bank, created.league.year, seed);
  const club = [...world.clubs].sort(
    (a, b) => a.reputation - b.reputation || (a.id < b.id ? -1 : 1),
  )[0];
  if (!club) throw new Error("sem clubes");
  let market = emptyMarket();
  let league = created.league;
  let finances: FinanceState = createFinances(world, league);
  let renewal = initialCareerRenewal(world, seed, world.manifest.referenceDate);
  let fans = createFans(world, league);
  let history: SeasonHistoryEntry[] = [];
  const potentials: number[] = [];
  const scouted: { strength: number; potential: number }[] = [];
  let worstShare = 0;
  let scouting = {
    clubId: club.id,
    level: 5,
    watch: [],
    reports: {},
    region: { kind: "country" as const, countryId: club.countryId },
  } as Parameters<typeof generateOffers>[0];
  for (let index = 0; index < seasons; index++) {
    let paid = 0;
    if (recruit) {
      for (const round of [0, 1]) {
        scouting = generateOffers(
          { ...scouting, offers: [] },
          {
            world,
            renewal,
            careerSeed: seed,
            managerClubId: club.id,
            season: league.number,
            round,
            expiresRound: round + 3,
            year: league.year,
          },
        );
        const best = [...(scouting.offers ?? [])].sort(
          (a, b) => b.estimate.low + b.estimate.high - (a.estimate.low + a.estimate.high),
        )[0];
        if (!best) continue;
        const state = {
          league,
          world,
          renewal,
          finances,
          competitions: [],
          scouting,
          board: { manager: { clubId: club.id } },
        } as unknown as Parameters<typeof signOffer>[0];
        const signed = signOffer(state, best.id);
        if (!signed.ok) continue;
        renewal = signed.state.renewal ?? renewal;
        finances = signed.state.finances;
        paid += best.cost;
        scouted.push({ strength: best.player.strength, potential: best.player.hidden.potential });
      }
    }
    const played = advanceCareer(
      league,
      finances,
      world,
      { toEnd: true },
      "",
      undefined,
      { state: renewal, careerSeed: seed },
      { state: market, careerSeed: seed },
      undefined,
      { state: fans },
    );
    if (!played.ok) throw new Error(JSON.stringify(played.error));
    const totals = seasonFinanceSummary(played.finances, club.id).totals;
    const revenue = totals.gate + totals.sponsorship + totals.prize + totals.transfer_sale;
    if (revenue > 0) worstShare = Math.max(worstShare, paid / revenue);
    const turned = seasonTurnover(played.league, played.world, history, {
      careerSeed: seed,
      finances: played.finances,
      managerClubId: "",
      renewal: played.renewal ?? renewal,
      market: played.market ?? market,
      fans: played.fans ?? fans,
    });
    if (!turned.ok || !turned.finances) throw new Error(JSON.stringify(turned));
    market = turned.market ?? market;
    fans = turned.fans ?? fans;
    league = turned.league;
    history = turned.history;
    finances = turned.finances;
    world = turned.world;
    renewal = turned.renewal ?? renewal;
    const base = (renewal.academy?.players ?? []).filter((entry) => entry.clubId === club.id);
    if (base.length > 0) {
      potentials.push(
        base.reduce((sum, entry) => sum + entry.player.hidden.potential, 0) / base.length,
      );
    }
  }
  const mean = (values: number[]) =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  return {
    basePotential: mean(potentials),
    scouted: {
      strength: mean(scouted.map((item) => item.strength)),
      potential: mean(scouted.map((item) => item.potential)),
      count: scouted.length,
    },
    worstShare,
  };
}

/** Cenário captação × sem captação × safra da academia nível 5 (040 SC-004). */
export function runRecruitmentScenario(seed: string, seasons = 10): SimulateEconomyOutput {
  const without = recruitmentRun(seed, seasons, false);
  const withIt = recruitmentRun(seed, seasons, true);
  const academy5 = academyRun(seed, 5, seasons);
  const checks: [boolean, string][] = [
    [
      withIt.basePotential > without.basePotential,
      `potencial médio da base: ${withIt.basePotential.toFixed(1)} com captação × ${without.basePotential.toFixed(1)} sem`,
    ],
    [
      withIt.scouted.strength <= academy5.strength &&
        withIt.scouted.potential <= academy5.potential,
      `${withIt.scouted.count} captados: força ${withIt.scouted.strength.toFixed(1)} e potencial ${withIt.scouted.potential.toFixed(1)} ≤ safra nível 5 (${academy5.strength.toFixed(1)} e ${academy5.potential.toFixed(1)})`,
    ],
    [
      withIt.worstShare <= RECRUITMENT_SCENARIO_LIMITS.maxRevenueShare,
      `registros custam no máximo ${(100 * withIt.worstShare).toFixed(1)}% da receita da temporada (≤ ${100 * RECRUITMENT_SCENARIO_LIMITS.maxRevenueShare}%)`,
    ],
  ];
  const lines = [`Captação — ${seasons} temporadas, clube de menor reputação, seed "${seed}"`];
  let ok = true;
  for (const [passed, text] of checks) {
    ok &&= passed;
    lines.push(`${passed ? "✓" : "✗"} ${text}`);
  }
  return { exitCode: ok ? 0 : 1, lines };
}

/** Limites do cenário da cláusula de revenda (041 SC-003, SC-005, research R6 e R7). */
export const RESALE_SCENARIO_LIMITS = {
  /** O caixa mediano dos clubes da IA no fim fica a esta distância (%) da mesma carreira sem cláusulas. */
  maxAiCashShiftPct: 15,
} as const;

interface ResaleRun {
  /** Caixa mediano dos clubes (fora o do técnico) no fim. */
  aiMedianCash: number;
  /** Parcela média de clubes fora de crise. */
  healthy: number;
  /** Temporadas com as faixas de força do mundo dentro de `WORLD_LIMITS`. */
  seasonsInBands: number;
  /** Soma dos lançamentos `resale` de todos os clubes (tem de ser 0). */
  resaleNet: number;
  created: number;
  paid: number;
  received: number;
}

/**
 * Cenário da cláusula (041): o clube de reputação mediana tem um técnico automático. A cada
 * temporada, na janela do começo, vende o jogador mais jovem que pode sair (com 30% de revenda, se
 * `clauses`) e compra um jovem de até 21 anos de um clube da IA pela pedida (aceitando a cláusula
 * pedida, se `clauses`). O resto da carreira é da IA.
 */
function resaleRun(seed: string, seasons: number, clauses: boolean): ResaleRun {
  const bank = completeHiddenAttributes(generateDefaultBank({ seed: DEFAULT_SEED }), seed);
  const competition = bank.competitions[0];
  if (!competition) throw new Error("banco sem competição");
  const created = createLeagueSeason(bank, { competitionId: competition.id, careerSeed: seed });
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  let world: CompletedBank = ensureContracts(bank, created.league.year, seed);
  const byReputation = [...world.clubs].sort(
    (a, b) => a.reputation - b.reputation || (a.id < b.id ? -1 : 1),
  );
  const club = byReputation[Math.floor(byReputation.length / 2)];
  if (!club) throw new Error("sem clubes");
  let market = emptyMarket();
  let league = created.league;
  let finances: FinanceState = createFinances(world, league);
  let renewal = initialCareerRenewal(world, seed, world.manifest.referenceDate);
  let fans = createFans(world, league);
  let history: SeasonHistoryEntry[] = [];
  let healthySum = 0;
  let seasonsInBands = 0;
  let resaleNet = 0;
  let createdCount = 0;
  const within = (value: number, [min, max]: readonly [number, number]) =>
    value >= min && value <= max;
  for (let index = 0; index < seasons; index++) {
    const context = (): MarketContext => ({
      world,
      league,
      finances,
      market,
      managerClubId: club.id,
      careerSeed: seed,
    });
    const date = seasonDate(world.manifest.referenceDate, league.year);
    // Venda: o mais jovem que pode sair.
    const young = world.players
      .filter((player) => player.clubId === club.id && !player.contract?.loan)
      .filter((player) => canRemovePlayer(world, club.id, player.id))
      .sort((a, b) => b.birthDate.localeCompare(a.birthDate) || (a.id < b.id ? -1 : 1))[0];
    if (young) {
      const sold = sellNow(context(), young.id, clauses ? 30 : undefined);
      if (sold.ok) {
        world = sold.value.world;
        finances = sold.value.finances;
        market = sold.value.market;
        if (clauses) createdCount++;
      }
    }
    // Compra: um jovem de até 21 anos, pela pedida, que caiba no caixa e no elenco.
    const cash = finances.clubs[club.id]?.cash ?? 0;
    const target = world.players
      .filter(
        (player) =>
          player.clubId !== club.id &&
          !player.contract?.loan &&
          ageOn(player.birthDate, date) <= 21 &&
          canAddPlayer(world, club.id, player.position, club.id) &&
          canRemovePlayer(world, player.clubId, player.id),
      )
      .map((player) => ({ player, fee: buyAskingPrice(context(), player) }))
      .filter((entry) => entry.fee > 0 && entry.fee <= cash / 3)
      .sort((a, b) => b.player.hidden.potential - a.player.hidden.potential || a.fee - b.fee)[0];
    if (target) {
      const step = startNegotiation(context(), {
        kind: "buy",
        playerId: target.player.id,
        fee: target.fee,
      });
      if (step.ok && step.value.negotiation?.stage === "contract") {
        const negotiation = step.value.negotiation;
        const opened = { ...context(), market: step.value.update.market };
        const done = proposeContract(opened, negotiation.id, {
          wage: wageDemand(opened, target.player, club.id),
          years: 4,
          acceptResale: clauses,
        });
        if (done.ok) {
          world = done.value.update.world;
          finances = done.value.update.finances;
          market = done.value.update.market;
          if (clauses && negotiation.resaleAsk) createdCount++;
        }
      }
    }
    const played = advanceCareer(
      league,
      finances,
      world,
      { toEnd: true },
      "",
      undefined,
      { state: renewal, careerSeed: seed },
      { state: market, careerSeed: seed },
      undefined,
      { state: fans },
    );
    if (!played.ok) throw new Error(JSON.stringify(played.error));
    resaleNet += played.finances.ledger
      .filter((entry) => entry.category === "resale")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const turned = seasonTurnover(played.league, played.world, history, {
      careerSeed: seed,
      finances: played.finances,
      managerClubId: "",
      renewal: played.renewal ?? renewal,
      market: played.market ?? market,
      fans: played.fans ?? fans,
    });
    if (!turned.ok || !turned.finances) throw new Error(JSON.stringify(turned));
    fans = turned.fans ?? fans;
    league = turned.league;
    history = turned.history;
    finances = turned.finances;
    world = turned.world;
    renewal = turned.renewal ?? renewal;
    market = pruneResale(turned.market ?? market, world, league.number);
    const clubIds = Object.keys(finances.clubs);
    healthySum += 1 - clubIds.filter((id) => finances.clubs[id]?.inCrisis).length / clubIds.length;
    const m = measureWorld(
      world,
      league,
      seasonDate(world.manifest.referenceDate, league.year),
      renewal.academy,
    );
    if (
      within(m.mean, WORLD_LIMITS.mean) &&
      within(m.p10, WORLD_LIMITS.p10) &&
      within(m.p50, WORLD_LIMITS.p50) &&
      within(m.p90, WORLD_LIMITS.p90) &&
      within(m.max, WORLD_LIMITS.max) &&
      m.stars >= WORLD_LIMITS.minStars
    ) {
      seasonsInBands++;
    }
  }
  const ai = Object.keys(finances.clubs)
    .filter((id) => id !== club.id)
    .map((id) => finances.clubs[id]?.cash ?? 0);
  const receipts = market.resale?.receipts ?? [];
  return {
    aiMedianCash: median(ai),
    healthy: healthySum / seasons,
    seasonsInBands,
    resaleNet,
    created: createdCount,
    paid: receipts.filter((receipt) => receipt.outcome === "paid").length,
    received: receipts
      .filter((receipt) => receipt.outcome === "paid" && receipt.creditorClubId === club.id)
      .reduce((sum, receipt) => sum + receipt.amount, 0),
  };
}

/** Maior razão recebido/pago do ciclo do A2 (comprar e vender na hora), com e sem cláusula. */
function resaleCycles(seed: string): { plain: number; withClause: number } {
  const bank = completeHiddenAttributes(generateDefaultBank({ seed: DEFAULT_SEED }), seed);
  const competition = bank.competitions[0];
  if (!competition) throw new Error("banco sem competição");
  const created = createLeagueSeason(bank, { competitionId: competition.id, careerSeed: seed });
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  const world = ensureContracts(bank, created.league.year, seed);
  const manager = world.clubs[0]?.id ?? "";
  const context: MarketContext = {
    world,
    league: created.league,
    finances: createFinances(world, created.league),
    market: emptyMarket(),
    managerClubId: manager,
    careerSeed: seed,
  };
  const year = created.league.year;
  const rules = marketRules(world, competition.id);
  const resale = resaleRules(world, competition.id);
  let plain = 0;
  let withClause = 0;
  for (const player of world.players) {
    if (player.clubId === manager || !player.contract || player.contract.loan) continue;
    const ask = buyAskingPrice(context, player);
    if (ask <= 0) continue;
    const age = ageOn(player.birthDate, seasonDate(world.manifest.referenceDate, year));
    const [, longest] = contractYearsRange(age, rules);
    const signed = {
      ...player,
      clubId: manager,
      contract: { wage: player.contract.wage, untilYear: year + longest - 1 },
    };
    const quick =
      Math.round((marketValue(signed, world, year) * QUICK_SALE_PCT) / 100 / 1000) * 1000;
    plain = Math.max(plain, quick / ask);
    for (const pct of resaleSteps(resale)) {
      const paid = feeWithResale(ask, pct, resale);
      if (paid > 0) withClause = Math.max(withClause, (quick - shareOf(quick, pct)) / paid);
    }
  }
  return { plain, withClause };
}

/** Cenário da cláusula de revenda (041): arbitragem, conservação, caixa da IA e faixas do mundo. */
export function runResaleScenario(seed: string, seasons = 30): SimulateEconomyOutput {
  const cycles = resaleCycles(seed);
  const without = resaleRun(seed, seasons, false);
  const withIt = resaleRun(seed, seasons, true);
  const shift =
    without.aiMedianCash === 0
      ? 0
      : (100 * Math.abs(withIt.aiMedianCash - without.aiMedianCash)) /
        Math.abs(without.aiMedianCash);
  const checks: [boolean, string][] = [
    [
      cycles.withClause <= cycles.plain && cycles.withClause <= 1,
      `comprar e vender na hora: razão máxima ${cycles.withClause.toFixed(3)} com cláusula × ${cycles.plain.toFixed(3)} sem (≤ 1)`,
    ],
    [
      withIt.resaleNet === 0,
      `revendas somadas em todos os clubes: ${withIt.resaleNet} (o dinheiro só muda de caixa)`,
    ],
    [
      withIt.created > 0 && withIt.paid > 0,
      `${withIt.created} cláusulas criadas, ${withIt.paid} pagas; o clube do técnico recebeu ${millions(withIt.received)}`,
    ],
    [
      shift <= RESALE_SCENARIO_LIMITS.maxAiCashShiftPct,
      `caixa mediano da IA no fim: ${millions(withIt.aiMedianCash)} com cláusulas × ${millions(without.aiMedianCash)} sem (${shift.toFixed(1)}%, ≤ ${RESALE_SCENARIO_LIMITS.maxAiCashShiftPct}%)`,
    ],
    [
      withIt.healthy >= ECONOMY_LIMITS.minHealthyShareAverage,
      `clubes fora de crise na média: ${(100 * withIt.healthy).toFixed(1)}% (≥ ${100 * ECONOMY_LIMITS.minHealthyShareAverage}%)`,
    ],
    [
      withIt.seasonsInBands >= without.seasonsInBands,
      `temporadas com o mundo nas faixas de força: ${withIt.seasonsInBands} com cláusulas × ${without.seasonsInBands} sem (de ${seasons})`,
    ],
  ];
  const lines = [`Cláusula de revenda — ${seasons} temporadas, técnico automático, seed "${seed}"`];
  let ok = true;
  for (const [passed, text] of checks) {
    ok &&= passed;
    lines.push(`${passed ? "✓" : "✗"} ${text}`);
  }
  return { exitCode: ok ? 0 : 1, lines };
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const { values } = parseArgs({
    options: { seed: { type: "string", default: "economia" }, seasons: { type: "string" } },
  });
  const output = runSimulateEconomy({
    seed: values.seed ?? "economia",
    ...(values.seasons ? { seasons: Number(values.seasons) } : {}),
  });
  for (const line of output.lines) console.log(line);
  const academy = runAcademyScenario(values.seed ?? "economia");
  console.log("");
  for (const line of academy.lines) console.log(line);
  const scouting = runScoutingScenario(values.seed ?? "economia");
  console.log("");
  for (const line of scouting.lines) console.log(line);
  const recruitment = runRecruitmentScenario(values.seed ?? "economia");
  console.log("");
  for (const line of recruitment.lines) console.log(line);
  const resale = runResaleScenario(values.seed ?? "economia");
  console.log("");
  for (const line of resale.lines) console.log(line);
  process.exit(
    output.exitCode ||
      academy.exitCode ||
      scouting.exitCode ||
      recruitment.exitCode ||
      resale.exitCode,
  );
}
