# Contrato: API do motor e do save para a base (036)

Funções puras e determinísticas. Ficam no motor em `packages/engine/src/renewal/academy.ts` e são exportadas por `packages/engine/src/index.ts`. A camada do save (`packages/save/src/academy.ts`) as aplica ao `SaveFile`.

## Leitura

```ts
/** Jovens da base de um clube, em ordem de id. */
academyOf(renewal: RenewalState, clubId: string): readonly AcademyPlayer[]

/** Temporada em que o jovem precisa sair e se está no último ano (R2). */
academyStatus(player: AcademyPlayer, world: CompletedBank, season: LeagueSeason):
  { age: number; leavesSeason: number; lastYear: boolean }

/** Contrato que o jovem assinaria se promovido agora (salário mensal e último ano). */
promotionContract(state: CareerSeasonState, playerId: string): { wage: number; untilYear: number }

/** Problemas de elenco do clube do técnico antes da próxima partida (R8). */
rosterIssues(state: CareerSeasonState, clubId: string): RosterIssue[]

/** Aviso da última janela (R8): presente só com a janela aberta e jovens no último ano. */
academyWarning(state: CareerSeasonState, clubId: string): { kind: "last_window"; count: number } | undefined

/** Origem de um jogador promovido da base. */
graduateOf(renewal: RenewalState, playerId: string): { clubId: string; season: number } | undefined
```

## Comandos (técnico)

```ts
promoteFromAcademy(state: CareerSeasonState, clubId: string, playerId: string):
  | { ok: true; state: CareerSeasonState; player: CompletedPlayer }
  | { ok: false; error: "academy.not_found" | "academy.squad_full" | "academy.match_in_progress" }

releaseFromAcademy(state: CareerSeasonState, clubId: string, playerId: string):
  | { ok: true; state: CareerSeasonState }
  | { ok: false; error: "academy.not_found" | "academy.match_in_progress" }
```

- `promoteFromAcademy`: tira o jovem da base, põe em `bank.players` com `clubId` e o contrato de `promotionContract`, registra em `graduates` e `promotedThisSeason`. Recusa com o elenco no máximo (`squadLimit` do técnico).
- `releaseFromAcademy`: tira da base, acrescenta aos livres (`toFreeAgent`, `lastClubId` = clube) e registra em `releasedThisSeason`.
- No save: `promoteYouth(save, playerId)` e `releaseYouth(save, playerId)` usam `save.clubId` e recusam com o técnico desempregado.

## Virada (etapas, `TurnoverStep`, todas por país)

| Etapa | Antes de / depois de | Efeito |
|---|---|---|
| `evolve-players` (alterada) | — | evolui também a base (participação 0) |
| `academy-age-out` (nova) | antes de `generate-youth` | idade-limite: IA promove, técnico → livre |
| `generate-youth` (alterada) | — | safra na base; excesso da IA → livres |
| `balance-squads` (alterada) | — | IA promove por mínimo e até `aiTargetSize`; não cria ninguém |
| `complete-squads` (nova) | depois de `balance-squads` | IA abaixo do mínimo contrata livres; senão, safra de emergência (R6) |
| `regulate-world` (alterada) | — | mede mundo + base |

Também na virada: `graduates` é podado, e `promotedThisSeason` e `releasedThisSeason` são zerados depois de irem para o aviso.

## Dia da carreira

- Evolução do meio da temporada: evolui a base dos clubes da liga da rodada, inclusive em liga estrangeira (R4).
- `aiMarketRound`: antes dos livres por carência, um clube da IA abaixo do mínimo promove da base (FR-013).
- `advanceCareerSeason` e o início da rodada ao vivo no save: com `rosterIssues` de gravidade `error`, devolvem `{ ok: false, error: "roster.blocked", issues }` sem avançar. A web mostra o diálogo de bloqueio.

## Medidas

`measureWorld(world, league, date, academy?)` conta os jovens da base dos clubes da liga uma vez (FR-019).
