# Data Model: Estatísticas de jogadas (033)

## PlayStats (estado da partida, motor)

Contagens de um jogador numa partida completa, acumuladas só nos minutos em que ele está em campo.

| Campo | Tipo | Regra |
|---|---|---|
| `passes` | inteiro ≥ 0 | passes tentados |
| `passesCompleted` | inteiro, 0 ≤ x ≤ `passes` | passes certos |
| `keyPasses` | inteiro, ≥ assistências do jogador | passes que viraram finalização; também contam em `passes` e `passesCompleted` |
| `tackles` | inteiro ≥ 0 | desarmes tentados |
| `tacklesWon` | inteiro, 0 ≤ x ≤ `tackles` | desarmes certos |
| `interceptions` | inteiro ≥ 0 | passes do adversário cortados |

- Fica em `PlayerMatchState.plays?`. O motor completo cria o objeto zerado quando o jogador entra no estado da partida; a simulação resumida não cria.
- Invariante do time: Σ `keyPasses` ≤ finalizações do time.
- Invariante entre times: Σ `interceptions` de um time ≤ Σ (`passes` − `passesCompleted`) do outro.

## PlayTuple (registro da partida e save)

`[passes, passesCompleted, keyPasses, tackles, tacklesWon, interceptions]`: seis inteiros, na ordem do PlayStats.

- Fica em `PlayerLine.plays?`, nos registros de partida (`Season.records[*].players[*]`).
- Ausente: a partida não tem jogadas (simulação resumida ou partida jogada antes do save v19).
- Validação no save: comprimento 6, inteiros ≥ 0, `[1] ≤ [0]` e `[4] ≤ [3]`. Fora disso, o save é rejeitado com o caminho do campo.

## PlayTotals (derivado, motor)

A soma das linhas de um lado, mais o aproveitamento de passe (`passesCompleted ÷ passes`, ou nada se `passes` = 0).

- Calculado por `playTotals(lines, side)` a partir do registro (resumo) ou do estado da partida (ao vivo).
- Nada é guardado: o total de um time é sempre a soma dos jogadores (US2, cenário 3).

## PLAY_REALISM_LIMITS (configuração versionada, motor)

Faixas declaradas (R7) ao lado de `MATCH_REALISM_LIMITS`:

| Chave | Faixa |
|---|---|
| `passesPerTeam` | [350, 600] |
| `passAccuracy` | [0.72, 0.88] |
| `tacklesWonPerTeam` | [12, 25] |
| `interceptionsPerTeam` | [6, 16] |
| `keyPassesPerTeam` | [6, 15] |
| `minDefensiveRatio` | 1.5 (ZAG e VOL ÷ MEI e ATA, em desarmes + interceptações por minuto) |
| `minPassingRatio` | 1.3 (MEI ÷ ZAG, em passes e em decisivos por minuto) |
| `minPossessionPassRate` | 0.8 (o time com ≥ 10 pontos a mais de posse passa mais) |

## Save

- `SAVE_FORMAT_VERSION` = 19. A migração v18 → v19 só troca a versão.
- Nada muda no formato do mod.
