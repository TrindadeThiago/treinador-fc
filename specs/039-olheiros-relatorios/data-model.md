# Data Model: Olheiros e relatórios de jogadores (039)

Os tipos ficam em `packages/engine/src/scouting/types.ts`; o save v24 os carrega.

## ScoutingState (novo, em `CareerSeasonState.scouting` e no save)

| Campo | Tipo | Regra |
|---|---|---|
| `clubId?` | string | clube do departamento; se o técnico não está mais nele, o departamento conta como fechado (tasks.md, decisão de implementação) |
| `level` | inteiro 0 a 5 | 0 = fechado (sem custo e sem vagas) |
| `watch` | `Observation[]` | tamanho ≤ vagas do nível; vazio com o nível 0 |
| `reports` | `Record<playerId, ScoutReport>` | no máximo `reportCap` |

## Observation

| Campo | Tipo |
|---|---|
| `playerId` | string |
| `since` | `{ season, round }` |

Invariantes:
- sem repetição;
- nunca um jogador do elenco do técnico nem da base dele.

## ScoutReport

| Campo | Tipo | Regra |
|---|---|---|
| `estimate` | `PotentialEstimate` (038) | contém o valor real; só estreita |
| `steps` | inteiro ≥ 0 | etapas observadas (somando observação e relatório automático) |
| `temperament?` | 1, 2 ou 3 | grau, gravado ao atingir o tempo mínimo |
| `injury?` | 1, 2 ou 3 | idem |
| `updated` | `{ season, round }` | última etapa |

**Derivado** (não guardado): `confidence`, que pode ser `initial`, `partial` ou `complete` (R4).

## ScoutingLevelRule (padrão + mod `economy.scouting.levels[5]`)

| Campo | Padrão, níveis 1 a 5 |
|---|---|
| `slots` | 3, 5, 8, 12, 16 |
| `costPct` | 1, 2, 3, 4, 5 (% da folha mensal de referência) |
| `shrink` | 1, 2, 3, 4, 5 |
| `minWidth` | 14, 12, 10, 8, 6 |

Também globais: `initialWidth` (24) e `reportCap` (300).

## LedgerCategory

Ganha o valor `"scouting"` (rótulo "Olheiros").

## Transições

```text
level 0 ──abrir(n)──▶ level n ──mudar(m)──▶ level m (cancela as observações mais recentes acima das vagas)
level n ──fechar──▶ level 0 (cancela todas; os relatórios ficam)
observar(id) ──▶ watch += id; reports[id] ??= faixa inicial (largura 24, chave da rodada)
rodada da liga do país do jogador ──▶ steps += 1; estimate = narrow(min(atual, alvo(nível, steps)))
steps ≥ mínimo ──▶ temperament e injury gravados (grau)
cancelar(id) ──▶ watch −= id (o relatório fica)
técnico muda de clube ──▶ level 0, watch = [] (os relatórios ficam)
virada ──▶ poda dos aposentados e teto
```

## Migração v23 → v24

`scouting = { level: 0, watch: [], reports: {} }`. Os relatórios automáticos do elenco nascem na primeira rodada; as crias promovidas partem de `graduates[id].estimate`.
