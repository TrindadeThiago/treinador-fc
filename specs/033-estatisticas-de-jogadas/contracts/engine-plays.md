# Contrato: jogadas no motor (033)

API pública que o motor (`@brasfoot-like/engine`) passa a exportar. Os nomes são o contrato com a interface e com o save.

## Tipos

```ts
interface PlayStats {
  passes: number;
  passesCompleted: number;
  keyPasses: number;
  tackles: number;
  tacklesWon: number;
  interceptions: number;
}

/** [passes, passesCompleted, keyPasses, tackles, tacklesWon, interceptions] */
type PlayTuple = readonly [number, number, number, number, number, number];

interface PlayTotals extends PlayStats {
  /** passesCompleted ÷ passes; undefined sem passes. */
  passAccuracy: number | undefined;
}
```

- `PlayerMatchState.plays?: PlayStats`: presente em toda partida completa, desde o primeiro minuto em campo do jogador.
- `PlayerLine.plays?: PlayTuple`: presente no registro de toda partida completa jogada a partir do save v19.

## Funções

| Função | Entrada | Saída | Regra |
|---|---|---|---|
| `playTuple(stats)` | `PlayStats` | `PlayTuple` | ordem fixa da tupla |
| `playStatsOf(tuple)` | `PlayTuple` | `PlayStats` | inversa de `playTuple` |
| `playTotals(lines, side)` | linhas do registro (`playerLines(record)`) ou estados da partida, e o lado | `PlayTotals \| undefined` | `undefined` se nenhuma linha do lado tem jogadas (partida sem jogadas); senão, a soma |
| `livePlayTotals(state, side)` | `MatchState`, lado | `PlayTotals \| undefined` | a soma dos `players` do time no estado; ao vivo |

## Garantias

1. Com ou sem o fluxo de jogadas, `MatchResult` (placar, eventos, `stats`, linhas dos jogadores sem `plays`, `decision`) é idêntico para a mesma entrada.
2. Mesma entrada e mesma seed dão as mesmas jogadas, ao vivo (`advanceMatch` em passos) ou direto (`simulateMatch`), e depois de serializar e desserializar o estado.
3. Para todo jogador: `passesCompleted ≤ passes`, `tacklesWon ≤ tackles` e `keyPasses ≥ assists`. Para todo time: Σ `keyPasses` ≤ finalizações.
4. `summarizeMatch` (simulação resumida) não produz `plays`.
