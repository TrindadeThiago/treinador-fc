# Data Model: Nota do jogador por partida (034)

## PlayStats (motor, estado da partida) — campos novos

| Campo | Tipo | Regra |
|---|---|---|
| `shots` | inteiro ≥ 0 | finalizações do jogador (eventos `shot` dele, de qualquer resultado) |
| `saves` | inteiro ≥ 0 | defesas: eventos `shot` do adversário com `outcome: "saved"` e `goalkeeperId` = jogador |
| `slotMinutes` | `Partial<Record<Position, number>>` | minutos em cada posição de vaga; só no estado (não vai para o save) |

Nenhum dos três usa sorteio.

## PlayTuple (registro e save)

- v20: `[passes, passesCompleted, keyPasses, tackles, tacklesWon, interceptions, shots, saves, position]`.
- v19 (aceita): os 6 primeiros.
- `position`: índice em `POSITIONS` (0 GOL … 5 ATA) da vaga com mais minutos. Em empate, a primeira em que o jogador ficou.
- Validação: comprimento 6 ou 9; inteiros ≥ 0; `[1] ≤ [0]`; `[4] ≤ [3]`; com 9, `[8]` entre 0 e 5.

## RatingInput (motor, derivado, não guardado)

Por jogador e partida: `minutes`, `position`, `goals`, `assists`, `yellows`, `red`, `penaltiesConceded`, `goalsConceded` (com ele em campo), `result` (vitória, empate ou derrota, do ponto de vista dele) e, quando houver jogadas, `plays` (PlayStats com `shots` e `saves`).

Montado a partir do registro (`matchRatings`) ou do estado ao vivo (`liveRatings`), pela mesma função de gols sofridos (research R5).

## PlayerRating (motor, derivado)

| Campo | Tipo | Regra |
|---|---|---|
| `rating` | número com uma casa, 0 a 10, ou ausente | ausente abaixo de `minMinutes` |
| `kind` | `"full"` \| `"simplified"` | `"full"` com jogadas na linha (tupla de 6 ou 9) |
| `position` | `Position` | a da tupla de 9 ou a posição natural |

## MatchRatings

`{ players: Record<playerId, PlayerRating>, best?: { playerId, side, rating } }`. O melhor em campo é o de maior nota, desempatado por gols, assistências, time vencedor e id (FR-006).

## SeasonRating

Por jogador do clube: `average` (uma casa), `matches` (partidas com nota) e `simplified` (quantas dessas são simplificadas). Sem nota na temporada: ausente.

## RATING_TUNING e RATING_REALISM_LIMITS

Constantes da fórmula (research R3 e R4) e faixas (research R8), versionadas no motor.
