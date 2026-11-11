# Research: Captação de jovens (040)

Ponto de partida:
- o departamento de olheiros da 039 (`scouting/`);
- a safra da 036 e da 037 (`renewal/youth.ts`, `createYouth`);
- a faixa da 038 (`renewal/estimate.ts`).

## R1 — Onde mora a captação

**Decision**: o `ScoutingState` (039) ganha os campos abaixo, todos opcionais:
- `region?: ScoutingRegion` — `{ kind: "state"; countryId; region }`, `{ kind: "country"; countryId }`;
- `offers?: ScoutOffer[]` — as indicações abertas;
- `nextOfferSeq?` — contador local das indicações;
- `pendingRegion?` — a região escolhida que entra em vigor na rodada seguinte (FR-001).

Os captados ganham na base o campo `AcademyPlayer.origin?: { kind: "scouted"; region: ScoutingRegion; season }`. Os promovidos guardam o mesmo campo em `AcademyGraduate.origin?`.

**Rationale**:
- A captação é do departamento do técnico. Ela fecha junto com ele (`closeScouting`) e segue a mesma regra de troca de clube (`clubId`).
- A origem na base e nos promovidos é o que as manchetes (038) e o histórico (`hall`) precisam.

**Alternatives considered**: um estado próprio `recruitment`. Rejeitado: duplicaria o fechamento por troca de clube e o nível.

## R2 — Indicações fora do mundo

**Decision**:
- **Geração:** a indicação guarda o jogador completo (`Omit<CompletedPlayer, "clubId" | "contract">`) com um **id provisório**, `scout-offer-${seq}`, e não toca em `renewal.nextPlayerSeq`.
- **Ao trazer:** o jogador recebe o id real (`playerId(nextPlayerSeq)`), a sequência avança e ele entra em `academy.players` com a faixa da 038 (`withEstimate`) e a origem.
- **Recusar, expirar, fechar ou trocar de clube:** a indicação sai de `offers`; nada entra no mundo, nos livres ou na base (FR-004, SC-001).

**Rationale**: sem captação, a numeração e toda a sorte do jogo ficam iguais à 1.12 (FR-014, SC-002).

## R3 — Quando surgem e quanto duram

**Decision**:
- **Momento:** na abertura de cada janela de transferências da liga do país do clube do técnico (`transferWindows`; padrão rodadas 0 e meio).
- **Janela do começo** (`fromRound = 0`): sai na virada, no save (`advanceCareerSeason`, como a limpeza da 039), já para a temporada nova.
- **Demais janelas:** saem no `day.ts`, depois da rodada em que `roundsPlayed === fromRound`, pelo mesmo gancho `withScoutingRound`.
- **Prazo:** o fim da janela (`toRound`). As indicações vencidas saem na rodada em que `roundsPlayed > toRound`.

**Rationale**: as datas declaradas pela spec, sem calendário próprio. O mod já controla as janelas.

## R4 — Quantidade, qualidade e perfil da região

**Decision**:

| Nível do departamento | Indicações por data (país inteiro ou outro país) | Indicações por data (estado) |
|---|---:|---:|
| 1 | 1 | 1 |
| 2 | 1 | 1 |
| 3 | 2 | 1 |
| 4 | 2 | 1 |
| 5 | 3 | 2 |

- **Jogador:** `createYouth` com um "clube virtual" da região:
  - reputação = a média dos clubes da região (do estado ou do país inteiro);
  - `countryId` = o país da região;
  - nacionalidade e nomes vêm do país.
- **Regulador:** o do país da região (`regulators`).
- **Ajuste de força e potencial:** o da academia nível 3 (`strengthAdjust 0`, `potentialBonus 0`), a qualidade de uma academia média.
- **Idade:** sorteada de 15 a 17.
- **Posição:** sorteio com pesos (GK 1, FB 2, CB 2, DM 2, MF 2, FW 2), sem olhar a carência do elenco.
- **Sorte:** `createRng(\`${seed}:scout-offer:${season}:${round}:${regionKey}\`)`.
- **Faixa da indicação:** as etapas que o relatório já chega com elas são declaradas por nível, `offerSteps` = 1, 1, 2, 2, 2. A faixa é `initialEstimate` seguida de `offerSteps` estreitamentos da 039 (`advanceReport`), com a chave da indicação. Os graus de temperamento e lesões aparecem quando `offerSteps ≥ attributeSteps(nível)`, o que hoje dá os níveis 4 e 5 (`attributeSteps` = 2).

**Rationale**:
- **Força da região:** sai da reputação dos clubes, porque o banco não tem um "nível do país" declarado. Países e estados fortes têm clubes de reputação alta, o que cumpre SC-003.
- **Teto de qualidade:** a academia nível 3 como base garante que os captados não passem da safra nível 5 (SC-004). O nível do departamento muda a quantidade e a faixa, não o jogador.

**Alternatives considered**: o nível do departamento melhorando a força. Rejeitado: faria da captação no nível 5 uma academia nível 5 de graça.

## R5 — Custo de registro

**Decision**: `registrationCost = round(referenceMonthlyPayroll × pct / 100, para 1 000)`:
- 10% para um estado;
- 20% para o país inteiro;
- 35% para outro país.

O custo é pago na hora, na categoria `scouting`. Ele exige caixa suficiente (sem caixa negativo depois) e uma vaga na base (`academyLimit`, contando a base atual).

**Rationale**:
- é proporcional à escala do país do clube (FR-009);
- é menor para regiões menores (US4-2);
- a calibragem confere no `sim:economy`.

## R6 — Limite de estrangeiros

**Decision**:
- **Contagem nova:** `foreignCountWithAcademy(world, academy, clubId)` = estrangeiros do elenco + captados estrangeiros da base do clube.
- **Ao trazer:** um estrangeiro passa só se a contagem + 1 ≤ `foreignLimit` (quando o país tem limite).
- **Na promoção:** a `promoteFromAcademy` passa a recusar com `academy.foreign_limit` quando o jovem é estrangeiro e o elenco já está no limite (`canSignForeign`).

**Rationale**: os jovens da safra são sempre do país, então a regra nova não muda nada para eles. Isso preserva a neutralidade (FR-008).

## R7 — Manchetes e histórico

**Decision**:
- **Origem:** `withGraduates` copia o `origin` do jovem para o promovido.
- **Manchetes de cria** (`academyDebut`, `academyFirstGoal`, `academySale`, 038): ganham a variável `scouted: "yes" | "no"` e a `regionName`, e as variações dos templates usam `select` para a menção "captado em …".
- **Histórico:**
  - `AcademyHall` ganha `scouted?: number` (total de captados promovidos);
  - `AcademyLegend` ganha `scouted?: true`;
  - o card "Crias da base" mostra os dois totais e marca a origem na lista.

**Rationale**: FR-010 e FR-011, reaproveitando o que já existe.

## R8 — Save, mod e neutralidade

**Decision**:
- **Save v24 → v25:** `scouting.region`, `offers` e `nextOfferSeq` ausentes. A origem fica ausente em todos os jovens e promovidos que já existiam.
- **Mod:** `economy.scouting.recruitment` opcional, com:
  - `offersPerWindow` (5 entradas por tipo de região);
  - `registrationPct` (`state`, `country`, `abroad`);
  - `ageRange`;
  - `levelBasis` (o nível da academia usado na qualidade).
- **Neutralidade:**
  - o teste `recruitment-neutral.test.ts` roda a mesma seed com o departamento aberto e **sem região**, com e sem o módulo de captação trocado por uma versão que não faz nada, e compara a carreira;
  - as linhas de base existentes rodam sem regravar.

## R9 — Medidas (FR-017)

**Decision**:
- **Grade sintética** (`recruitment.test.ts`), em muitas datas:
  - força e potencial médios por país, para um forte e um fraco (SC-003);
  - quantidade e largura por nível.
- **`sim:economy`, cenário "captação"** (10 temporadas, clube de menor reputação, nível 5, trazendo sempre o melhor indicado do país inteiro quando há vaga). Mede:
  - o potencial médio da base com e sem captação;
  - a força e o potencial médios dos captados, contra a safra da academia nível 5 do cenário da 037 (SC-004);
  - o peso dos registros na receita.
- **Mundo:** `sim:world` e o teste de 30 temporadas continuam sem técnico, então não mudam. A população só cresce por decisão do técnico, que fica limitado às vagas da base.

## Medidas e ajustes da implementação

**Cenário da captação** (`sim:economy`, clube de menor reputação, 10 temporadas, nível 5, região = o país do clube, trazendo a indicação de maior centro de faixa em cada uma de duas janelas por temporada):

| Seed | Potencial médio da base (com × sem) | Captados: força / potencial | Safra nível 5: força / potencial | Registros / receita |
|---|---|---|---|---|
| `economia` | 61,8 × 58,7 | 43,4 / 65,3 | 45,0 / 69,5 | ≤ 2,2% |
| `captacao-b` | 61,4 × 57,4 | 43,2 / 64,4 | 45,7 / 68,8 | ≤ 1,9% |

**Ajuste — `levelBasis` 3 → 1:**
- Com a academia nível 3 como base, os captados passavam da safra nível 5 (potencial 71,9 contra 69,5).
- Isso tem dois motivos: a reputação média do país é maior que a do clube mais fraco, e o técnico escolhe o melhor de cada lote.
- Com a base no nível 1, a captação melhora a base (SC-004) sem passar da academia nível 5 nas duas seeds.

**Força da região:** os três países do mundo de teste têm quase a mesma reputação média (52 a 54), e a diferença some no sorteio. A grade (`recruitment-grid.test.ts`) usa países com reputações afastadas, como no mundo padrão, e confirma que a região mais forte rende jovens melhores (SC-003).

**Neutralidade** (`recruitment-neutral.test.ts`):
- sem região, a carreira é igual com e sem o módulo de captação;
- com região e indicações, sem trazer ninguém, a carreira e `nextPlayerSeq` são iguais às do caso sem região;
- as linhas de base existentes passam sem regravar.

**Implementação:**
- A janela da pré-temporada sai na virada, no save (`recruitmentAtSeasonStart`). As demais saem no gancho do `day.ts` quando `roundsPlayed` chega ao `fromRound`.
- Numa carreira nova, a primeira janela já passou quando o técnico abre o departamento, então as primeiras indicações chegam na janela do meio.
- Os textos das manchetes guardadas antes da 040 não têm `scouted`; a apresentação assume `"no"`.
