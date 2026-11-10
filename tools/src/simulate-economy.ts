// Simula a economia de uma carreira sem interação e confere os limites da 008 (research.md R10).
// Uso: pnpm sim:economy [--seed <seed>] [--seasons <n>]
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  academyUpgradeCost,
  advanceCareer,
  annualWageBill,
  type CompletedBank,
  completeHiddenAttributes,
  createFans,
  createFinances,
  createLeagueSeason,
  emptyMarket,
  ensureContracts,
  type FinanceState,
  generateDefaultBank,
  initialCareerRenewal,
  type SeasonHistoryEntry,
  seasonFinanceSummary,
  seasonTurnover,
  spearman,
} from "@brasfoot-like/engine";
import { DEFAULT_SEED } from "./default-seed";

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
  process.exit(output.exitCode || academy.exitCode);
}
