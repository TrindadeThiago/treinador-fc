# Contrato: motor — captação de jovens (040)

Arquivo novo: `packages/engine/src/scouting/recruitment.ts`. Todas as funções são puras e determinísticas, e exportadas por `@brasfoot-like/engine`.

```ts
export interface RecruitmentRules {
  offersPerWindow: { country: readonly number[]; state: readonly number[] }; // por nível 1..5
  registrationPct: { state: number; country: number; abroad: number };
  ageRange: readonly [number, number];
  levelBasis: number;
}
export const DEFAULT_RECRUITMENT: RecruitmentRules;
export function recruitmentRules(world: CompletedBank, clubId: string): RecruitmentRules;

/** Regiões que o técnico pode escolher: os estados do país do clube (com clubes), o país e os outros países. */
export function availableRegions(world: CompletedBank, clubId: string): ScoutingRegion[];
export function regionKey(region: ScoutingRegion): string;
export function registrationCost(world: CompletedBank, clubId: string, region: ScoutingRegion): number;

export type RecruitmentError =
  | "scouting.closed" | "scouting.invalid_region" | "scouting.offer_not_found"
  | "scouting.academy_full" | "scouting.insufficient_cash" | "scouting.foreign_limit";

/** Escolhe a região; vale a partir da rodada seguinte (fica em `pendingRegion`). */
export function setScoutingRegion(state: CareerSeasonState, region: ScoutingRegion | undefined):
  { ok: true; state: CareerSeasonState } | { ok: false; error: RecruitmentError };

/** Indicações de uma data (abertura de janela): semente própria, id provisório, fora do mundo. */
export function generateOffers(
  scouting: ScoutingState,
  context: { world: CompletedBank; renewal: RenewalState; careerSeed: string; managerClubId: string;
             season: number; round: number; expiresRound: number },
): ScoutingState;

/** Rodada (chamado pelo gancho da 039): aplica `pendingRegion`, abre indicações na abertura de janela e tira as vencidas. */
export function recruitmentAfterRound(scouting: ScoutingState, context: ScoutingRoundContext & {
  renewal?: RenewalState; marketRules: MarketRules }): ScoutingState;

/** Traz um indicado para a base: id real, faixa (038), origem; custo na categoria scouting. */
export function signOffer(state: CareerSeasonState, offerId: string, careerSeed: string):
  { ok: true; state: CareerSeasonState; playerId: string } | { ok: false; error: RecruitmentError; params?: Record<string, number> };

export function declineOffer(state: CareerSeasonState, offerId: string):
  { ok: true; state: CareerSeasonState } | { ok: false; error: RecruitmentError };

/** Estrangeiros do clube contando os captados estrangeiros da base. */
export function foreignCountWithAcademy(world: CompletedBank, renewal: RenewalState | undefined, clubId: string): number;
```

**Alterações em outros módulos:**
- `closeScouting` (039) também limpa `region`, `pendingRegion` e `offers`.
- `promoteFromAcademy` (036) passa a recusar com `academy.foreign_limit` quando o jovem é estrangeiro e `canSignForeign` falha.
- `withGraduates` copia o `origin`; `hallWithPromotions` soma `scouted` e marca a lenda.
- As manchetes de cria (038, `news/academy.ts`) ganham as variáveis `scouted` e `region` quando o promovido tem `origin`.
- Virada (save): `advanceCareerSeason` chama `recruitmentAfterRound` com `round = 0` para a janela do começo, depois da limpeza da 039.

**Mod (`economy.scouting.recruitment`):** opcional. Valida:
- `offersPerWindow.country` e `offersPerWindow.state`: 5 inteiros de 0 a 10;
- `registrationPct`: de 0 a 200 cada;
- `ageRange`: de 14 a 19, com o mínimo ≤ o máximo;
- `levelBasis`: de 1 a 5.

**Garantias testadas:**
- uma indicação nunca altera `world.players`, `market.freeAgents`, `academy.players` nem `nextPlayerSeq`;
- trazer gera exatamente 1 jogador novo, com o id `playerId(nextPlayerSeq)`;
- recusar e expirar não deixam nada no mundo;
- a faixa contém o potencial;
- a mesma chave gera as mesmas indicações.
