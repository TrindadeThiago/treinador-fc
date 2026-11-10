# Data Model: Potencial estimado e revelações da base (038)

Tudo fica em `packages/engine/src/renewal/types.ts` e `packages/engine/src/news/types.ts`. O save v23 carrega os campos novos.

## PotentialEstimate (novo)

| Campo | Tipo | Regra |
|-------|------|-------|
| `low` | inteiro | `max(1, força atual)` ≤ `low` ≤ potencial real |
| `high` | inteiro | potencial real ≤ `high` ≤ `maxStrength` (99) |

Invariantes:
- `high − low` ≥ `ESTIMATE_MIN_WIDTH` (4), exceto quando o teto da escala (99) ou a força atual não deixam: `low = max(low, força)` estreita a faixa quando a força do jovem se aproxima do potencial, e no limite (força = potencial) a faixa começa na própria força, o que não revela nada além do que a força já mostra;
- a faixa de uma virada fica dentro da anterior (R2).

## AcademyPlayer (alterado)

| Campo | Mudança |
|-------|---------|
| `estimate: PotentialEstimate` | **novo**; criado na chegada e atualizado na etapa `academy-estimates` |
| `joinedSeason` | sem mudança; define o tempo na base e a safra (R6) |

## AcademyGraduate (alterado)

| Campo | Mudança |
|-------|---------|
| `clubId`, `season` | sem mudança |
| `joinedSeason?: number` | **novo**; a safra do jovem (ausente nos promovidos antes da 038) |
| `estimate?: PotentialEstimate` | **novo**; a faixa da promoção, só se o formador era o clube do técnico |
| `peak?: number` | **novo**; a força máxima vista nas viradas desde a promoção |

## AcademyState (alterado)

| Campo | Mudança |
|-------|---------|
| `hall?: Record<clubId, AcademyHall>` | **novo** |

**AcademyHall**: `{ promoted: number; best: AcademyLegend[] }`, com `best` de até 5 itens, ordenado por `peak` desc, temporada asc e id asc.

**AcademyLegend**: `{ playerId, name, position, peak, season }`. O nome fica guardado e sobrevive à aposentadoria, como as lendas da 014.

## AcademyLevelRule (alterado)

| Campo | Tipo | Padrão (níveis 1→5) |
|-------|------|---------------------|
| `estimateWidth?` | inteiro 4–60 | 20, 18, 16, 14, 12 |
| `estimateShrink?` | inteiro 0–20 | 2, 2, 2, 3, 3 |

Validação semântica do mod: `estimateWidth` não pode crescer do nível 1 ao 5.

## NewsState e NewsContext (alterados)

- `NewsState.crias?: Record<playerId, number>`: máscara de bits (1 = estreou pelo formador, 2 = marcou pelo formador, 4 = venda noticiada). É podada na virada com os `graduates` vivos.
- `NewsContext.graduates?: Readonly<Record<string, AcademyGraduate>>`: só leitura.
- `HEADLINE_TYPES` ganha `academyRevelation`, `academyDebut`, `academyFirstGoal` e `academySale`.

### Variáveis das manchetes

| Tipo | Variáveis |
|------|-----------|
| `academyRevelation` | `player`, `club`, `position`, `age`, `strength` e `scope` (`club`, `division` ou `both`) |
| `academyDebut` | `player`, `club`, `opponent`, `competition` |
| `academyFirstGoal` | as mesmas; vira `extras` da estreia quando os dois fatos são da mesma partida |
| `academySale` | `player`, `club`, `opponent` (comprador), `fee` |

## Relatório da base na temporada (derivado, sem estado)

`AcademySeasonReport { arrived: Row[]; promoted: Row[]; left: (Row & { reason: "released" | "ageOut" })[] }`

`Row` = `PlayerRef` com `estimate?`.

## Transições

```text
chegada à base ──(withEstimate: largura W(nível, 0))──▶ estimate₀
virada (academy-estimates) ──(w = min(atual, W(nível, tempo)); sorteio dentro da anterior; low ≥ força)──▶ estimateₙ₊₁ ⊆ estimateₙ
promoção (técnico) ──▶ graduate.estimate = estimate atual (congelada)
promoção (IA) ──▶ graduate sem estimate
dispensa / idade ──▶ a faixa some com o AcademyPlayer
```

## Migração v22 → v23

- Para cada jovem da base: `estimate` com o nível atual, `tempo = temporada − joinedSeason` e a semente `${seed}:estimate-migrate:${playerId}`.
- `graduates`: `peak` = força atual; sem `joinedSeason` e sem `estimate`.
- `hall[clubId].promoted` = número de `graduates` vivos do clube; `best` vem desses graduates.
- `news.crias[id] = 7` para cada graduate existente.
