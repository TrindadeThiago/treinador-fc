# Contrato: API do motor e do save para a academia (037)

As funções novas ficam em `packages/engine/src/renewal/academy-levels.ts` e são exportadas pelo índice. A camada do save fica em `packages/save/src/academy.ts`.

## Leitura

```ts
academyRules(world: CompletedBank, clubId: string): AcademyLevelRule[]   // padrão ou do mod do país
levelForReputation(rules: AcademyLevelRule[], reputation: number): 1 | 2 | 3 | 4 | 5
academyClub(renewal: RenewalState | undefined, world: CompletedBank, clubId: string): AcademyClub
academyLimit(renewal, world, clubId): number                              // vagas da base pelo nível
referenceMonthlyPayroll(world: CompletedBank, clubId: string): number     // research R3
academyMaintenance(world, clubId, level): number                          // mensal
academyUpgradeCost(world, clubId, toLevel): number
academyEffect(rules, level): { youthPerIntake: number; quality: 1 | 2 | 3 | 4 | 5 }
divisionAcademies(state: CareerSeasonState, clubId: string): { clubId: string; level: number }[]
```

## Comandos

```ts
upgradeAcademy(state, clubId, careerSeed):
  | { ok: true; state }
  | { ok: false; error: "academy.max_level" | "academy.pending_change" | "academy.insufficient_cash"; params }
downgradeAcademy(state, clubId):
  | { ok: true; state }
  | { ok: false; error: "academy.min_level" | "academy.pending_change" }
cancelAcademyChange(state, clubId):
  | { ok: true; state }
  | { ok: false; error: "academy.no_pending" | "academy.upgrade_paid" }
```

- `upgradeAcademy` lança o custo da obra em `academy` no livro-caixa e grava `pending.cost`.
- `cancelAcademyChange` só cancela redução. A obra, já paga, não volta.
- No save: `upgradeYouthAcademy(save)`, `downgradeYouthAcademy(save)` e `cancelYouthAcademyChange(save)`. As três usam `save.clubId` e recusam com o técnico desempregado.

## Virada

| Etapa | Posição | Efeito |
|---|---|---|
| `academy-levels` (nova, por país) | depois de `academy-open`, antes de `regulate-world` | aplica o pendente do técnico; clube deixado vira IA; a IA anda um degrau rumo à reputação; excedente de vagas da IA vira livre |
| `generate-youth` (alterada) | — | quantidade, força e potencial pelo nível; limite de vagas pelo nível |
| `evolve-players` e evolução do meio (alteradas) | — | bônus de evolução da base pelo nível |

## Finanças

Na rodada (`applyRoundFinances`), a manutenção é cobrada nos mesmos laços da folha (clubes da liga e só regionais) e entra na categoria `academy`. Ela também entra em `forecast.ts`, `summary.ts` e nos totais.

## Criação e migração

`seedAcademies(world, renewal, careerSeed, date): RenewalState` completa cada base até 15 jovens (research R6). É chamada por `createSave` e pela migração v21 → v22.
