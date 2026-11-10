# Data Model: Academia e investimento na base (037)

## AcademyClub (novo, em `AcademyState.clubs[clubId]`)

| Campo | Tipo | Regra |
|---|---|---|
| `level` | `1..5` | nível atual |
| `pending` | `{ kind: "upgrade"; cost: number } \| { kind: "downgrade" }` (opcional) | só uma; obra com `level < 5`, redução com `level > 1` |

Derivados (não gravados):
- limite de vagas: 15, 15, 15, 20 ou 25, pelo nível;
- efeito: jovens por safra, rótulo de qualidade e bônus de evolução;
- manutenção mensal e custo da obra (R3).

## AcademyLevelRule (regra, padrão no motor; opcional no mod em `competition.economy.academy.levels`)

| Campo | Tipo |
|---|---|
| `minReputation` | inteiro 0–100 (nível inicial e alvo da IA) |
| `slots` | inteiro ≥ 1 |
| `youthPerIntake` | inteiro ≥ 1 |
| `strengthAdjust` | inteiro |
| `potentialBonus` | inteiro |
| `evolutionBonus` | 0–1 |
| `maintenancePct` | inteiro (% da folha mensal de referência) |
| `buildMonths` | número ≥ 0 (folhas mensais da obra para chegar ao nível) |

O mod declara as 5 entradas ou nenhuma (validação Zod). Sem a seção, valem os padrões (research R2).

## LedgerCategory (alterado)

A categoria nova `academy` recebe obras (na hora) e manutenção (por rodada). Ela entra em
`totals`, no resumo, na previsão e nos gráficos.

## AcademyState (alterado)

O campo novo é `clubs: Record<string, AcademyClub>`. Os demais campos da 036 não mudam. O limite
de vagas da base passa a ser pelo nível do clube (substitui `ACADEMY_RULES.maxPlayers`).

## Transições do nível

```text
técnico:  Melhorar (paga) ──► pending=upgrade ──virada──► level+1
          Baixar ──► pending=downgrade ──virada──► level−1      (cancelável antes)
sem técnico (clube deixado): upgrade pago termina; downgrade cancelado; depois regra da IA
IA:       virada ──► level anda 1 degrau em direção a levelForReputation(rep)
```

## Save v22

`renewal.academy.clubs` é obrigatório e tem um registro para cada clube do banco.
- **Carreira nova:** `initialRenewal` (ou `createSave`) cria o registro de todos os clubes pela reputação, antes de `seedAcademies`.

A migração v21 → v22:
- cria o nível de cada clube pela reputação, sem pendente;
- completa a base até 15 jovens (`seedAcademies`).

A validação recusa:
- nível fora de 1–5;
- pendente incoerente;
- clube inexistente.
