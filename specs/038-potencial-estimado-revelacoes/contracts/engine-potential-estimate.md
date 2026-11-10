# Contrato: motor — faixa de potencial, revelações e crias (038)

Exportado por `@brasfoot-like/engine`. Todas as funções são puras e determinísticas.

## Faixa (`packages/engine/src/renewal/estimate.ts`, novo)

```ts
export const ESTIMATE_MIN_WIDTH = 4;

/** Largura alvo pelo nível da academia e pelas viradas na base (R2, R3). */
export function estimateWidth(rule: AcademyLevelRule, tenure: number): number;

/** Faixa inicial de um jovem que chega à base. */
export function initialEstimate(
  player: { id: string; strength: number; hidden: { potential: number } },
  width: number,
  rngKey: string, // `${careerSeed}:estimate:${season}:${playerId}`
): PotentialEstimate;

/** Faixa nova dentro da anterior, com largura min(atual, alvo) e low ≥ força. */
export function narrowEstimate(
  previous: PotentialEstimate,
  player: { id: string; strength: number; hidden: { potential: number } },
  width: number,
  rngKey: string,
): PotentialEstimate;

/** Atalho: dá a faixa inicial a um AcademyPlayer recém-criado. */
export function withEstimate(
  entry: AcademyPlayer,
  rules: readonly AcademyLevelRule[],
  level: number,
  season: number,
  careerSeed: string,
): AcademyPlayer;

/** Etapa da virada, depois de "complete-squads" e antes de "age-out-free-agents". */
export const academyEstimatesStep: TurnoverStep; // id: "academy-estimates"
```

Garantias testadas:
- `low ≤ potencial ≤ high`;
- `narrowEstimate(prev, …)` ⊆ `prev`;
- `high − low ≤ width`;
- `low ≥ strength`;
- nenhuma chamada a outro rng além de `createRng(rngKey)`.

## Promoção e histórico (`renewal/academy.ts`)

```ts
// alterada: recebe o clube do técnico; copia joinedSeason, peak e (só do técnico) estimate; soma hall.promoted
export function withGraduates(
  academy: AcademyState,
  entries: readonly AcademyPlayer[],
  season: number,
  managerClubId: string,
  world: Pick<CompletedBank, "players">,
): AcademyState;

/** Crias de um clube: total promovido e as maiores revelações (até 5). */
export function academyHallOf(renewal: RenewalState | undefined, clubId: string): AcademyHall;

/** Bloco Base do fim de temporada (R8). */
export function academySeasonReport(
  renewal: RenewalState | undefined,
  clubId: string,
  season: { year: number; number: number },
  referenceDate: string,
): AcademySeasonReport;
```

`academyCloseStep` passa a atualizar `peak` e `hall.best` antes de podar `graduates`, e a podar `news.crias`.

## Notícias (`news/`)

```ts
// HEADLINE_TYPES += "academyRevelation" | "academyDebut" | "academyFirstGoal" | "academySale"

/** Etapa da virada, depois de "news-regional": revelação da safra do clube e da divisão (R6). */
export const newsAcademyStep: TurnoverStep; // id: "news-academy"

/** Revelação de um conjunto de clubes; undefined sem elegíveis. Só força, idade e id. */
export function academyRevelation(
  renewal: RenewalState,
  world: CompletedBank,
  clubIds: readonly string[],
  season: number, // a safra = joinedSeason
  date: string,
): AcademyRevelation | undefined;
```

As funções `newsAfterRound`, `newsAfterExtraMatches`, `newsAfterCup` e `newsAfterContinental` aceitam `context.graduates`. Com ele:
- marcam `news.crias`;
- emitem `academyDebut` e `academyFirstGoal` para as crias do clube do técnico;
- emitem `academySale` no lugar de `bigTransfer` quando a venda do técnico é de uma cria dele.

Sem `graduates`, o comportamento é exatamente o de hoje (compatibilidade e teste de FR-007).

## Mod (`model/schemas.ts`)

`economy.academy.levels[]` aceita os campos opcionais `estimateWidth` (4–60) e `estimateShrink` (0–20). Um aviso semântico sai quando a largura cresce com o nível. Isso vai documentado no `mod-format.md`.
