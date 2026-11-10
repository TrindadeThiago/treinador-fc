# Contrato: motor — olheiros e relatórios (039)

Exportado por `@brasfoot-like/engine`, do módulo novo `packages/engine/src/scouting/`. Todas as funções são puras e determinísticas.

## Regras (`scouting/rules.ts`)

```ts
export interface ScoutingLevelRule { slots: number; costPct: number; shrink: number; minWidth: number }
export interface ScoutingRules { levels: readonly ScoutingLevelRule[]; initialWidth: number; reportCap: number }
export const DEFAULT_SCOUTING: ScoutingRules; // research R3
export function scoutingRules(world: CompletedBank, clubId: string): ScoutingRules; // mod do país ou padrão
export function stepsToComplete(rules: ScoutingRules, level: number): number;
export function attributeSteps(rules: ScoutingRules, level: number): number; // ceil(completo / 2)
export function scoutingCost(world: CompletedBank, clubId: string, level: number): number; // mensal; 0 no nível 0
```

## Estado e comandos (`scouting/state.ts`)

```ts
export function emptyScouting(): ScoutingState; // { level: 0, watch: [], reports: {} }

export type ScoutingError =
  | "scouting.invalid_level" | "scouting.closed" | "scouting.no_slot"
  | "scouting.already_watching" | "scouting.own_player" | "scouting.not_found"
  | "scouting.not_watching" | "scouting.match_in_progress";

export function setScoutingLevel(state: CareerSeasonState, level: number, careerSeed: string):
  { ok: true; state: CareerSeasonState; cancelled: string[] } | { ok: false; error: ScoutingError };
export function watchPlayer(state: CareerSeasonState, playerId: string, careerSeed: string):
  { ok: true; state: CareerSeasonState } | { ok: false; error: ScoutingError };
export function unwatchPlayer(state: CareerSeasonState, playerId: string):
  { ok: true; state: CareerSeasonState } | { ok: false; error: ScoutingError };
/** Troca de clube do técnico: fecha o departamento e mantém os relatórios. */
export function closeScouting(scouting: ScoutingState): ScoutingState;
```

## Avanço (`scouting/round.ts`)

```ts
/**
 * Depois da rodada de uma liga principal (chamada por applyRoundSystems): avança uma etapa para os
 * observados do país dessa liga (os livres, pela liga do país do técnico) e para o elenco do técnico
 * quando a liga é a dele. Usa só createRng(`${seed}:scout:${season}:${round}:${playerId}`).
 */
export function scoutingAfterRound(
  scouting: ScoutingState,
  context: { world: CompletedBank; league: LeagueSeason; round: number; careerSeed: string;
             managerClubId: string; renewal?: RenewalState; freeAgents?: readonly FreeAgent[] },
): ScoutingState;

/** Virada: poda aposentados e aplica o teto (research R6). */
export const scoutingTurnoverStep: TurnoverStep; // id "scouting-close", depois de "academy-close"
```

## Leitura (`scouting/view.ts`)

```ts
export interface ScoutReportView {
  estimate: PotentialEstimate;
  temperament?: 1 | 2 | 3; injury?: 1 | 2 | 3;
  confidence: "initial" | "partial" | "complete";
  steps: number; updated: { season: number; round: number };
  watching: boolean;
}
export function scoutReportOf(state: Pick<CareerSeasonState, "world" | "scouting">, clubId: string,
  playerId: string): ScoutReportView | undefined;
export function scoutingPanel(state: CareerSeasonState, clubId: string): {
  level: number; slots: number; used: number; monthlyCost: number;
  levels: { level: number; slots: number; monthlyCost: number }[];
};
```

**Garantias testadas:**
- a faixa contém o valor real e fica dentro da anterior;
- a largura é ≤ `max(mínima, inicial − redução × etapas)`;
- os graus aparecem só depois de `attributeSteps`;
- com o nível 0 não há lançamento `scouting` no livro-caixa;
- nenhuma chamada de sorte fora das chaves próprias.

## Finanças

- `LedgerCategory` ganha `"scouting"`.
- `applyRoundFinances` recebe o nível dos olheiros do clube do técnico e lança `-wageInstalment(12 × custo mensal)` por rodada, junto com a academia.
- A previsão e o resumo somam a categoria.

## Mod (`model/schemas.ts`)

`economy.scouting` é opcional e valida:
- `levels`: exatamente 5 entradas, com `slots` de 1 a 50, `costPct` de 0 a 50, `shrink` de 1 a 20 e `minWidth` de 4 a 60;
- `initialWidth`: de 8 a 60;
- `reportCap`: de 10 a 2000.

Um aviso sai quando `minWidth` cresce com o nível.
