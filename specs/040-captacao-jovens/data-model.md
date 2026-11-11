# Data Model: Captação de jovens (040)

## ScoutingRegion (novo, `scouting/types.ts`)

```text
{ kind: "state";   countryId: string; region: string }   // um estado (clubs[].region) do país
{ kind: "country"; countryId: string }                   // o país inteiro (o do clube ou outro)
```

"Outro país" é `kind: "country"` com `countryId` diferente do país do clube; o custo e a nacionalidade decorrem disso.

## ScoutingState (alterado, 039)

| Campo | Mudança |
|---|---|
| `region?` | **novo**; a região em vigor |
| `pendingRegion?` | **novo**; a escolhida, que vale a partir da rodada seguinte |
| `offers?` | **novo**; `ScoutOffer[]`, as indicações abertas |
| `nextOfferSeq?` | **novo**; numeração local das indicações (`scout-offer-N`) |

Fechar o departamento ou trocar de clube (`closeScouting`) remove `region`, `pendingRegion` e `offers`.

## ScoutOffer (novo)

| Campo | Tipo | Regra |
|---|---|---|
| `id` | string | `scout-offer-N`; nunca é id de jogador do mundo |
| `player` | `Omit<CompletedPlayer, "clubId" \| "contract">` | `player.id` = `id` até ser trazido |
| `estimate` | `PotentialEstimate` | contém o potencial (038) |
| `temperament?`, `injury?` | 1, 2 ou 3 | só quando o nível já alcança o tempo mínimo (039) |
| `region` | `ScoutingRegion` | região da indicação |
| `cost` | inteiro | custo de registro |
| `expiresRound` | inteiro | a indicação vale até `roundsPlayed ≤ expiresRound` |
| `season` | inteiro | temporada em que surgiu |

## AcademyPlayer e AcademyGraduate (alterados)

| Campo | Mudança |
|---|---|
| `origin?: { kind: "scouted"; region: ScoutingRegion; season: number }` | **novo**; ausente = safra da academia (ou anterior à 040) |

## AcademyHall e AcademyLegend (alterados, 038)

| Campo | Mudança |
|---|---|
| `AcademyHall.scouted?` | **novo**; total de captados promovidos (incluído também em `promoted`) |
| `AcademyLegend.scouted?: true` | **novo**; marca a origem na lista das maiores revelações |

## RecruitmentRules (padrão + mod `economy.scouting.recruitment`)

| Campo | Padrão |
|---|---|
| `offersPerWindow.country` | 1, 1, 2, 2, 3 (nível 1 a 5) |
| `offersPerWindow.state` | 1, 1, 1, 1, 2 |
| `registrationPct` | `state` 10, `country` 20, `abroad` 35 (% da folha mensal de referência) |
| `ageRange` | [15, 17] |
| `levelBasis` | 1 (nível da academia usado em força e potencial; calibrado, ver research "Medidas") |
| `offerSteps` | 1, 1, 2, 2, 2 (etapas de observação com que a indicação já chega, por nível) |

## Transições

```text
departamento aberto ──escolher região──▶ pendingRegion ──rodada seguinte──▶ region
abertura de janela (região ≠ ∅) ──▶ offers += N indicações (semente própria, id provisório)
trazer(offer) [vaga, caixa, estrangeiros] ──▶ academy.players += jovem (id real, faixa, origin); caixa −= custo; offers −= offer
recusar(offer) | roundsPlayed > expiresRound | fechar | trocar de clube ──▶ offers −= offer (nada no mundo)
promover(captado) ──▶ graduate.origin = origin; hall.scouted += 1 (estrangeiro: confere o limite)
```

## Migração v24 → v25

Nada a preencher: os campos novos são opcionais e ausentes.
