# Research: Nota do jogador por partida (034)

## R1. Os dados que faltam no registro: finalizações, defesas e vaga

**Decisão**: a tupla de jogadas (`PlayerLine.plays`) passa de 6 para 9 inteiros nas partidas novas:

`[passes, passesCompleted, keyPasses, tackles, tacklesWon, interceptions, shots, saves, position]`

- `shots`: finalizações do jogador (todo evento `shot` dele).
- `saves`: defesas do goleiro (eventos `shot` com `outcome: "saved"` e `goalkeeperId` = jogador).
- `position`: índice, em `POSITIONS` (GOL, LAT, ZAG, VOL, MEI, ATA), da posição da vaga em que o jogador passou mais minutos. Em empate de minutos, vale a primeira vaga em que ele ficou.

As três contagens saem de eventos que o motor já emite e de quem está em cada vaga a cada minuto, **sem nenhum sorteio**. O teste de isolamento da 033 continua provando que nada muda.

**Razão**: a nota precisa dos três dados, e o registro guardado não tem nenhum deles. As finalizações que não viram gol são filtradas em `toMatchRecord`, e a vaga não fica em lugar nenhum. Guardar os três números custa cerca de 6 bytes por linha (de ~24 para ~30). Guardar os eventos `shot` custaria uma linha de evento por finalização (~24 por partida, ~90 bytes cada).

**Alternativas**:
- Derivar as defesas de `stats` (finalizações no alvo do adversário menos gols): é por time, não por goleiro, e erra quando o goleiro é trocado. Descartada.
- Usar a posição natural do jogador em vez da vaga: fere a FR-003 (pesos pela vaga), e o jogador fora de posição seria avaliado pela posição errada. Fica só como recurso para partidas antigas (R6).

## R2. Save v20

**Decisão**: `SAVE_FORMAT_VERSION` passa de 19 a 20. A migração só troca a versão. A validação de `plays` (`playsProblem`) passa a aceitar tuplas de 6 (partidas da v19) ou 9 inteiros, com as regras atuais mais `position` entre 0 e 5. A fixture `saveV19` é a carreira atual com as tuplas cortadas para 6.

**Razão**: Princípio VI. Os registros da v19 continuam válidos e mantêm a nota completa (R6).

**Tamanho**: +6 bytes por linha nas partidas completas. Na carreira longa de um país só (teto de 5,5 MB, medido 4,99 MB), isso dá cerca de +0,1 MB; no mundo compacto, cerca de +0,25 MB no fim da temporada (teto de 42 MB). A medição entra no T de escala.

## R3. Fórmula da nota completa

**Decisão**: `nota = clamp(0, 10, REF + encolhimento × (bruta − REF))`, arredondada para uma casa (com arredondamento determinístico de meio para cima, em inteiros), onde:

- `REF` = 6,0 (Assumption da spec).
- `bruta = REF + offset[pos] + Σ peso[pos][estatística] × contagem + resultado + gols sofridos + disciplina`.
- `encolhimento = min(1, minutos / MINUTOS_CHEIOS)` com `MINUTOS_CHEIOS` = 60. Abaixo de `MIN_MINUTOS` = 10, o jogador fica sem nota (FR-001, FR-005).
- **Resultado**: +`vitória` ou −`derrota`, proporcional aos minutos (`minutos ÷ 90`); empate é 0.
- **Gols sofridos com o jogador em campo** (R5), com peso por posição: GOL > ZAG > LAT > VOL > MEI > ATA. Goleiro e zagueiros com 60 minutos ou mais e nenhum gol sofrido ganham um bônus de jogo sem sofrer gol.
- **Disciplina e lesão**: amarelo, vermelho e pênalti cometido (`penalty_awarded.foulerId`) descontam. A lesão não muda a nota, porque não é culpa do jogador.
- **Pesos por posição** (FR-003): ZAG e VOL ganham mais com desarmes certos e interceptações; MEI, com passes certos acima do esperado e passes decisivos; ATA, com gols e finalizações; GOL, com defesas. O passe entra como `passesCompleted − esperado(pos) × passes`, para não premiar só volume.
- **`offset[pos]`**: constante por posição, calibrada para a média de cada posição ficar perto da média geral (SC-003).

As constantes ficam em `RATING_TUNING` (`packages/engine/src/rating/tuning.ts`), calibradas pelo teste de realismo, como `PLAYS_TUNING` na 033.

**Razão**: é linear e fácil de explicar ("um gol vale cerca de 1 ponto"), sai determinística só com somas e multiplicações (Princípio II) e se calibra com poucas constantes.

**Alternativas**: um modelo tipo "contribuição esperada" (xG, xT): o motor não tem a geometria do campo para isso. Descartada.

## R4. Nota simplificada

**Decisão**: a mesma fórmula, sem os termos de jogadas (passes, decisivos, desarmes, interceptações, finalizações, defesas), com outro `offset[pos]` (`simplifiedOffset`). O offset é calibrado para a média da simplificada ficar a no máximo 0,3 da completa nas mesmas partidas (SC-005). A posição vem da natural do jogador (R6).

**Razão**: FR-004. Comparar as duas nas mesmas partidas completas, calculando a simplificada como se não houvesse jogadas, é o que torna a SC-005 verificável.

## R5. Gols sofridos com o jogador em campo e tempo de cada um

**Decisão**: a função percorre os eventos da partida em ordem de `seq`:
- quem está em campo no início: o lado de cada jogador que tem linha e não aparece como `inId` de uma substituição;
- `substitution`: sai `outId`, entra `inId`;
- `red_card`: sai `playerId`;
- `shot` com `outcome: "goal"` do adversário: soma 1 aos gols sofridos de todos os jogadores do lado que estão em campo naquele momento.

O registro guardado mantém exatamente esses eventos (`isKeyEvent` em `season/record.ts`), e ao vivo o estado tem todos os eventos. O mesmo cálculo dá o mesmo resultado nos dois casos (SC-006).

**Limitação aceita**: um jogador que se lesiona e sai sem substituição (sem trocas restantes) continua contando como em campo até o fim, porque não há evento de saída. É raro, e a diferença é pequena.

## R6. Partidas antigas e sem jogadas

| Dados da linha | Tipo da nota | Posição usada |
|---|---|---|
| tupla de 9 (v20) | completa | `position` da tupla |
| tupla de 6 (v19) | completa, com `shots` = 0 e `saves` = 0 | posição natural do jogador no banco |
| sem `plays` (resumida ou anterior à v19) | simplificada | posição natural do jogador no banco |

Uma tupla de 6 sem defesas puniria o goleiro injustamente. Nesse caso, as defesas do goleiro vêm de `stats` do adversário (finalizações no alvo menos gols), atribuídas ao goleiro que jogou mais minutos.

## R7. Onde a nota é calculada (motor) e lida (interface)

**Decisão**: novo módulo do motor, `packages/engine/src/rating/`, com:
- `matchRatings(record, bank)`: para cada jogador do registro, `{ rating?: number; kind: "full" | "simplified"; position }`, mais o melhor em campo;
- `liveRatings(state, players)`: o mesmo, a partir do estado ao vivo;
- `seasonRatings(seasons, clubId, bank)`: média, número de partidas e quantas foram simplificadas, por jogador do clube, nas temporadas da carreira do ano atual (liga e demais competições);
- `RATING_TUNING` e `RATING_REALISM_LIMITS`.

As duas primeiras montam a mesma estrutura de entrada (`RatingInput` por jogador) e chamam uma só `rate(input)`, o que garante que ao vivo e resumo batem (SC-006).

**Desempenho** (SC-007): `seasonRatings` olha só os registros em que o clube jogou (`record.home` ou `record.away` igual ao `clubId`): cerca de 50 a 70 partidas por temporada.

## R8. Faixas de realismo

`RATING_REALISM_LIMITS` (SC-003 a SC-005), verificadas em `packages/engine/test/rating/realism.test.ts` sobre uma amostra de liga (como `realism/plays.test.ts`):

| Critério | Faixa |
|---|---|
| Média geral | 6,1–6,5 |
| Notas < 4,0 | ≤ 5% |
| Notas > 9,0 | ≤ 3% |
| Desvio de cada posição em relação à média geral | ≤ 0,5 |
| Quem marcou − quem não marcou | ≥ 1,0 |
| Vencedor − perdedor | ≥ 0,5 |
| Melhor em campo do time vencedor | ≥ 70% |
| Simplificada − completa, nas mesmas partidas | ≤ 0,3 |

## R9. Interface

- **Resumo da partida**: coluna "Nota" na tabela de jogadas de cada time (033) e um destaque "Melhor em campo" acima das tabelas. Partida sem jogadas: uma tabela só com jogador, minutos e nota, e o aviso de nota simplificada.
- **Painel Meu time (ao vivo)**: coluna de nota parcial nas listas "Em campo" e "Já saíram".
- **Elenco**: coluna "Nota" (média com uma casa e partidas), ordenável; "sem nota" ordena por último.
- **Detalhe do jogador**: média, partidas com nota e simplificadas, em `PlayerStats`.
- **Cor**: tons para boa, média e ruim, sempre com o número em texto (FR-015).
