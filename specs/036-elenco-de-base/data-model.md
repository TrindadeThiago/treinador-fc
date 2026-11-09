# Data Model: Elenco de base (036)

## AcademyPlayer (novo, motor)

Jovem da base de um clube. É o registro do jogador do mundo sem `contract`, com o clube da base.

| Campo | Tipo | Regra |
|---|---|---|
| `player` | `Omit<CompletedPlayer, "clubId" \| "contract">` | id `jogador-NNNNN` da mesma sequência (`renewal.nextPlayerSeq`); nunca repete um id do mundo ou dos livres |
| `clubId` | `string` | clube dono da base; existe no banco |
| `joinedSeason` | `number` | temporada (`LeagueSeason.number`) da safra em que chegou |

Derivados (não gravados): idade na data da temporada; `leavesSeason` (primeira temporada em que terá 20 anos ou mais na data de início); `lastYear` (`leavesSeason` é a próxima).

## AcademyState (novo, em `RenewalState.academy`)

| Campo | Tipo | Regra |
|---|---|---|
| `players` | `AcademyPlayer[]` | ordenados por id; por clube, no máximo `ACADEMY_RULES.maxPlayers`, exceto o clube do técnico logo depois da safra (bloqueio) |
| `graduates` | `Record<string, { clubId: string; season: number }>` | promovidos da base; podado na virada (só quem ainda está no mundo ou entre os livres) |
| `promotedThisSeason` | `PlayerRef[]` | promoções do técnico na temporada atual, para o fim de temporada; zerado na virada |
| `releasedThisSeason` | `PlayerRef[]` | dispensas do técnico na temporada atual, para o fim de temporada; zerado na virada |
| `emergencies` | `number` | safras de emergência da última virada (R6), para medição |

`RenewalState.academy` é opcional no tipo (usos só da liga) e obrigatório no save v21.

## ACADEMY_RULES (novo, `renewal/rules.ts`)

| Constante | Valor | Uso |
|---|---|---|
| `maxPlayers` | 15 | limite de vagas por clube |
| `ageLimit` | 20 | idade na data de início da nova temporada que obriga a sair |
| `aiTargetSize` | 22 | tamanho do elenco a que a IA chega promovendo da base (o mínimo; ver research I7) |
| `emergencyLimitPerClubSeason` | 0,05 | teto da média de safras de emergência (teste longo) |

`YOUTH_RULES.perClub` é recalibrado (R3).

## SquadChangeNotice (alterado)

Campos novos: `academyArrived`, `academyAgedOut` e `academyReleased` (`PlayerRef[]`). O campo `promoted` passa a listar as promoções da temporada do técnico (de `promotedThisSeason`), e `academyReleased` junta as dispensas da temporada do técnico (de `releasedThisSeason`). Na IA, `academyReleased` é o excesso da base na virada. `arrived` deixa de receber a safra.

## Problemas de elenco (novo, motor)

`RosterIssue { code: "academy_over_limit" | "squad_below_minimum" | "academy_last_year"; severity: "error" | "warning"; params }`:
- `academy_over_limit`: `{ excess, limit }`;
- `squad_below_minimum`: `{ missing, positions: "GK,CB" }` (posições como códigos; a web traduz);
- `academy_last_year`: `{ count }` (aviso, só antes do último jogo do clube na temporada).

## Transições de estado de um jovem

```text
safra (virada) ──► base ──┬─► promovido (técnico, a qualquer momento; IA na virada) ──► elenco principal (+ graduates)
                          ├─► dispensado (técnico) ──────────────► livre
                          ├─► idade-limite (virada): IA ─────────► elenco principal (+ graduates)
                          │                          técnico ───► livre
                          └─► excesso na base da IA (virada) ────► livre
safra de emergência (IA, virada) ──► base ──► promovido na hora (+ graduates, emergencies++)
```

Invariantes:
- um id está em no máximo um destes lugares: `bank.players`, `market.freeAgents` ou `academy.players`;
- jovem da base nunca tem contrato, salário, suspensão, lesão nem condição física;
- nenhum jogador entra em `bank.players` sem ter passado pela base, exceto o mundo inicial da carreira e as transferências.

## Save v21

`renewal.academy` obrigatório. A migração v20 → v21 cria `{ players: [], graduates: {}, promotedThisSeason: [], releasedThisSeason: [], emergencies: 0 }`. A validação recusa ids repetidos entre base, mundo e livres, e clubes inexistentes.
