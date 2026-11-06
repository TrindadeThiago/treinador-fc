# Contrato: nota no motor (034)

Exportado por `@brasfoot-like/engine`.

```ts
type RatingKind = "full" | "simplified";

interface PlayerRating {
  /** 0 a 10, uma casa; ausente abaixo do mínimo de minutos. */
  rating?: number;
  kind: RatingKind;
  position: Position;
}

interface MatchRatings {
  players: Record<string, PlayerRating>;
  /** Maior nota da partida, com o desempate fixo (FR-006). */
  best?: { playerId: string; side: Side; rating: number };
}

interface SeasonRating {
  average: number;   // uma casa
  matches: number;
  simplified: number;
}

function matchRatings(record: MatchRecord, bank: Pick<CompletedBank, "players">): MatchRatings;
function liveRatings(state: MatchState, players: ReadonlyMap<string, CompletedPlayer>): MatchRatings;
function seasonRatings(
  seasons: readonly Season[],
  clubId: string,
  bank: Pick<CompletedBank, "players">,
): Map<string, SeasonRating>;
```

## Garantias

1. **Função pura e determinística**: mesma entrada, mesma saída, em qualquer motor JS (só somas, multiplicações e arredondamento em inteiros).
2. **Ao vivo igual ao resumo**: `liveRatings(estadoFinal)` é igual a `matchRatings(toMatchRecord(resultado))` (SC-006).
3. **Limites**: `0 ≤ rating ≤ 10`, uma casa; sem `rating` para minutos < `RATING_TUNING.minMinutes`.
4. **Sem efeito no jogo**: nenhum módulo da simulação, da evolução, do mercado ou da IA importa `rating/`. O teste de arquitetura confere isso.
