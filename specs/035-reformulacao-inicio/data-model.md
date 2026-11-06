# Data Model: Reformulação da página Início (035)

Nada é guardado. Todos os tipos abaixo são calculados na hora, a partir do save, em `apps/web/src/game/home-view.ts`.

## MatchPreview

Saída de `matchPreview(save)`. É `undefined` quando não há próximo jogo.

| Campo | Tipo | Origem |
|---|---|---|
| `fixture` | próximo jogo | `nextFixture(save)` |
| `home`, `away` | `{ clubId, form: FormResult[] }` | `lastResults(state, clubId, 5)` de cada lado |
| `strength` | `{ mine: number; opponent: number }` (inteiros) | `teamStrength(...).overall` (research R1) |
| `fitness` | `number` (0–100, inteiro) | média de `fitnessAt(save)` dos titulares de `save.lineup` (R2) |
| `absences` | `number` | `upcomingUnavailability(state, save.clubId).length` (R3) |

**Regras**:
- Titulares vazios ou indisponíveis não entram na média de condição. A força conta a vaga vazia como zero, como o motor.
- O adversário é o outro lado do `fixture`. A força dele usa `lineupForMatch` com os indisponíveis dele.
- O mandante fica sempre em `home`, mesmo quando o técnico joga fora.

## GoalSummary

Saída de `goalSummary(save)`. É `undefined` quando o técnico está sem clube ou sem metas.

| Campo | Tipo | Origem |
|---|---|---|
| `onTrack` | `number` | metas de `goalRows(save)` com status `onTrack` ou `met` |
| `total` | `number` | metas com status medido (`onTrack`, `atRisk`, `met` ou `missed`) |
| `pending` | `number` | metas `inProgress` (ainda sem medida) |

## HeadlineCategory

`headlineCategory(type: HeadlineType)` devolve uma das categorias: `result`, `derby`, `coaches`, `market`, `table`, `cup`, `continental` ou `regional` (research R5). A função cobre todo `HEADLINE_TYPES`, e um teste confere isso.

## Mood row (ClubMoodCard)

Uma linha para a torcida e outra para a diretoria, cada uma com `{ value: number; trend: "up" | "flat" | "down" }`. A torcida usa `save.fans.clubs[clubId]` e a diretoria `save.board.clubs[clubId]`, as duas com `trendOf(recent)`.
