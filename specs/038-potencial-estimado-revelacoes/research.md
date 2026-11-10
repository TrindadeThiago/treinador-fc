# Research: Potencial estimado e revelações da base (038)

Ponto de partida: os `research.md` da 036 (elenco de base) e da 037 (academia e calibragem). O código lido está listado em cada decisão.

## R1 — Onde a faixa mora: guardada no jovem, não recalculada

**Decision**: cada `AcademyPlayer` ganha `estimate: { low, high }`, guardado no save. A faixa é criada quando o jovem chega à base e atualizada uma vez por virada. A interface só lê o que está guardado.

**Rationale**:
- FR-005 exige que a faixa nova fique dentro da anterior e nunca se alargue. Uma função sem estado de (nível, tempo) não garante isso quando o nível cai (redução da 037 ou IA pela reputação).
- R2 sorteia a faixa nova dentro da anterior, e isso pede a anterior guardada.
- O custo é pequeno: cerca de 6 600 jovens × 2 inteiros. `sim:size` mede (R10).

**Alternatives considered**:
- *Função pura de (seed, jogador, nível, tempo)*: não tem estado, mas alarga quando o nível cai. Além disso, com a posição relativa fixa, duas faixas seguidas permitem resolver o valor real por conta (duas equações e duas incógnitas). Rejeitada.
- *Guardar só a largura*: resolve o alargamento, mas mantém o vazamento por conta. Rejeitada.

## R2 — Como a faixa é sorteada

**Decision**:
- **Largura alvo**: `W(nível, tempo) = max(minWidth, initialWidth[nível] − shrink[nível] × tempo)`, com `tempo = temporadaAtual − joinedSeason`.
- **Chegada**: `low` é sorteado uniforme entre `[max(1, p − W), min(p, maxStrength − W)]`, e `high = low + W`.
- **A cada virada**:
  - a largura nova é `min(largura atual, W(nível novo, tempo novo))`;
  - o `low` novo é sorteado uniforme entre `[max(lowAnterior, p − w), min(p, highAnterior − w)]`;
  - esse intervalo nunca é vazio, porque `p` está na faixa anterior e `w` ≤ largura anterior.
- **Força atual**: depois do sorteio, `low = max(low, força atual)`. A faixa só encolhe e continua contendo `p`, porque o potencial é sempre ≥ força.
- **Sorte**: `createRng(\`${careerSeed}:estimate:${season}:${playerId}\`)`, o mesmo padrão de sementes por chave da renovação (`youth`, `evolve`, `retire`). Não consome nenhuma sorte do jogo, o que garante FR-007.

**Rationale**: o sorteio novo a cada virada impede que o valor real seja deduzido de faixas sucessivas (FR-004). O aninhamento e o "sempre contém" valem por construção (FR-002 e FR-005), e os testes de propriedade cobrem os dois.

**Alternatives considered**: posição relativa fixa por jovem (vaza, ver R1); faixa centrada no valor real (vaza direto).

## R3 — Valores padrão e mod

**Decision**: cada `AcademyLevelRule` ganha dois campos opcionais, `estimateWidth` e `estimateShrink`. Há ainda uma constante `ESTIMATE_MIN_WIDTH = 4`. Padrão:

| Nível | Largura inicial | Redução por virada | Tempo 0 | Tempo 1 | Tempo 2 |
|------:|----------------:|-------------------:|--------:|--------:|--------:|
| 1 | 20 | 2 | 20 | 18 | 16 |
| 2 | 18 | 2 | 18 | 16 | 14 |
| 3 | 16 | 2 | 16 | 14 | 12 |
| 4 | 14 | 3 | 14 | 11 | 8 |
| 5 | 12 | 3 | 12 | 9 | 6 |

- O nível 5 com 2 anos dá 6, ou 30% do nível 1 recém-chegado. SC-002 pede ≤ 60%.
- A largura cai a cada nível e a cada virada (SC-003). A largura mínima de 4 evita entregar o valor exato.
- O schema do mod (`economy.academy.levels[]`) aceita os dois campos como opcionais: `estimateWidth` de 4 a 60 e `estimateShrink` de 0 a 20. A validação semântica emite um aviso (sem rejeitar o mod) quando a largura inicial aumenta do nível 1 ao 5: a faixa é só informação, e um mod assim não quebra nada.
- Mods antigos continuam válidos (FR-020).

**Rationale**: os números ficam na escala das faixas de exemplo do prompt ("68–84", 16 pontos) e não mexem em nada do equilíbrio, porque a faixa é só informação.

**Alternatives considered**: redução multiplicativa por virada. Rejeitada porque é menos legível no `mod-format.md` e não tem ganho real.

## R4 — Quando a faixa é criada e atualizada

**Decision**:
- **Criação**: em todos os pontos que criam `AcademyPlayer`:
  - a safra (`generateYouthStep`);
  - a safra de emergência da IA e a do técnico;
  - a base inicial (`seedAcademies`);
  - a migração.
  Um helper único, `withEstimate(entry, level, season, careerSeed)`, faz a criação.
- **Atualização**: numa etapa nova, `academy-estimates`, logo depois de `completeSquadsStep` e antes de `ageOutFreeAgentsStep`. Nesse ponto a academia já está no nível novo (a etapa `academy-levels` roda antes), a evolução de fim de temporada já rodou e as chegadas da safra já têm faixa. Os recém-chegados não são reprocessados.
- A etapa roda para todos os clubes. Assim, quando o técnico troca de clube, a base do clube novo já tem faixas coerentes com o nível e o tempo de cada jovem (edge case da spec).

**Rationale**: um só ponto de atualização por virada. A ordem respeita SC-001 da 037 (nível antes da safra).

## R5 — Faixa da promoção e sigilo

**Decision**:
- `AcademyGraduate` ganha `estimate?` (copiado na promoção só quando o clube formador é o do técnico naquele momento) e `joinedSeason?` (para R6).
- `withGraduates` recebe o `managerClubId`.
- A interface mostra a faixa da promoção no detalhe do jogador com o rótulo "na promoção" (FR-008).
- Nenhum ponto novo da interface lê `hidden.potential`.
- Um teste de varredura confere que as views novas (`academy-view`, manchetes e histórico) não expõem o campo:
  - renderiza as telas com um potencial-sentinela (por exemplo, 97);
  - procura o valor como texto fora de faixas (SC-007).

**Rationale**: decisão de 2026-11-10. O sigilo cobre o que a 038 cria; os ocultos já existentes no save ficam como estão. `estimate` não permite calcular `p` (R2).

## R6 — Revelação da safra

**Decision**: etapa nova `news-academy`, depois de `newsRegionalStep`, que acrescenta manchetes na rodada 0 da temporada nova.

**Elegíveis** (safra = jovens com `joinedSeason === finished.number`):
- jovens da base do clube formador;
- promovidos (`graduates[id].joinedSeason === finished.number`) que ainda estão no clube formador.

**Escolha**:
- maior força atual;
- desempate pela menor idade e, depois, pelo id do jogador;
- só dados visíveis, nunca o potencial.

**Escopos**:
- o clube do técnico (se empregado);
- os clubes da divisão em que ele jogou a temporada encerrada (`context.finished`).

**Manchetes**:
- tipo `academyRevelation`, com as variáveis `player`, `club`, `position`, `age`, `strength` e `scope` (`club` ou `division`);
- se a revelação da divisão for do clube do técnico, sai uma só manchete, com `scope: "both"`;
- sem elegíveis num escopo, a manchete daquele escopo não sai.

**Primeira virada**: a base inicial tem `joinedSeason = 1`, então a safra da temporada 1 é a base inicial (edge case da spec).

**Saves migrados**: os promovidos antes da 038 não têm `joinedSeason` e ficam fora; os jovens da base continuam elegíveis.

## R7 — Crias nas manchetes: estreia, primeiro gol e venda

**Decision**:
- `NewsState` ganha `crias?: Record<playerId, number>`, uma máscara de bits: 1 = estreou, 2 = marcou, 4 = venda noticiada.
- `NewsContext` ganha `graduates?`, só leitura.
- `newsAfterRound`, `newsAfterExtraMatches`, `newsAfterCup` e `newsAfterContinental` olham as linhas de jogador (`playerLines`) das partidas oficiais. Para cada cria do clube formador que jogou ou marcou pelo formador, a máscara é marcada.
- A manchete (`academyDebut` ou `academyFirstGoal`) só sai quando o formador é o clube do técnico.
- Estreia e gol na mesma partida viram uma manchete com o fato do gol como `extras`.

**Venda**:
- `transferFacts` detecta `kind: "sale"` do clube do técnico de uma cria dele e gera `academySale` com o valor;
- esse negócio deixa de ser candidato a `bigTransfer`, para não repetir.

**Poda e migração**:
- a máscara é podada na virada com os `graduates` vivos;
- na migração, todos os promovidos existentes recebem a máscara 7, para nenhum veterano ganhar manchete de "estreia".

**Rationale**:
- as manchetes não afetam torcida nem diretoria (só a camada de notícias as lê), então FR-007 vale;
- a marcação vale para todos os formadores, para que, quando o técnico assumir outro clube, as crias que já jogaram não "estreiem" de novo.

**Alternatives considered**: guardar as marcas em `AcademyGraduate`. Rejeitada porque as funções de notícias só devolvem `NewsState`, e levar a renovação até elas espalharia mudanças por `day.ts` e `finance/round.ts`.

## R8 — Bloco Base no fim de temporada

**Decision**: um seletor puro no motor, `academySeasonReport(renewal, clubId, season)`. Ele devolve:
- **chegaram**: `squadNotice.academyArrived`, quando o aviso é da temporada e do clube;
- **subiram**: `promotedThisSeason`;
- **saíram**: `releasedThisSeason` mais os jovens em último ano (saem por idade na virada que vem), cada um com o motivo;
- os jovens que chegaram e continuam na base levam a faixa atual.

Componente `AcademySeason` na tela `/jogo/fim-de-temporada`, depois de `Moves`. As listas vazias mostram o texto "nenhum".

**Rationale**: os dados já existem (036). Nenhum estado novo; a tela de fim de temporada vem antes da virada.

## R9 — Histórico: crias e maiores revelações

**Decision**:
- `AcademyState` ganha `hall?: Record<clubId, { promoted: number; best: AcademyLegend[] }>`;
- `AcademyLegend` tem `playerId`, `name`, `position`, `peak` e `season`;
- `AcademyGraduate` ganha `peak?`.

**Atualização**:
- na promoção (`withGraduates`), `promoted += 1` e `peak` = força atual;
- no `academyCloseStep`, antes da poda: `peak = max(peak, força)` para os vivos (elenco e livres), e o `best` do formador é refeito (até 5, por `peak`, desempate pela temporada da promoção e depois pelo id);
- quem se aposentou continua no `best`.

**Interface**: card "Crias da base" no `ClubHistory`, com o total e a lista. O clube atual ou "aposentado" vem do mundo na hora de mostrar.

**Migração**: `promoted` = os promovidos vivos que o save conhece; `peak` = força atual.

**Rationale**: a força máxima é medida uma vez por virada, depois da evolução de fim de temporada. Um pico no meio da temporada que caia até a virada só acontece com veteranos, e esses já registraram o pico antes. A limitação está documentada.

## R10 — Save, determinismo e linhas de base

**Decision**: save v22 → v23 (`migrate-v23`):
- dá faixa a todos os jovens da base, com o nível e o tempo atuais e a semente da migração;
- preenche `hall` e `peak`;
- marca `crias` com 7 para os promovidos existentes.

**Determinismo**:
- as linhas de base existentes (`match/baseline`, `composition-baseline`, `continental-baseline`, `save/equivalence`) **não devem mudar**, e não são regravadas;
- um teste novo roda a mesma seed com `DEFAULT_TURNOVER_STEPS` e com a lista sem `academy-estimates` e `news-academy`, e com as funções de notícia sem `graduates`. Compara mundo, finanças, mercado, classificações e base sem `estimate` (SC-005).

**Tamanho**: `sim:size` mede o mundo padrão (cerca de 6 600 jovens, cada um com 2 inteiros, e `hall` de até 5 por clube). A expectativa é bem abaixo dos tetos de 5,5 MB e 42 MB.

## R11 — Medidas (FR-021)

**Decision**:
- **Teste de propriedade** (`estimate.test.ts`), em milhares de jovens sintéticos por nível e tempo:
  - a faixa contém `p`;
  - fica dentro da anterior;
  - respeita a largura alvo;
  - a posição relativa de `p` é bem espalhada (o desvio de `(p − low) / w` em relação à uniforme fica abaixo de um limite).
- **Grade nível × tempo**: as médias cumprem SC-002 e SC-003.
- **Carreira longa** (`long-run`, 30 temporadas): em toda virada, 100% das faixas guardadas contêm `p` (SC-001).
- **`sim:world`**: imprime a largura média por nível e tempo e a taxa de contenção.

**Rationale**: a IA só chega ao nível 4 pela reputação. O nível 5 aparece na carreira só por obra, então a grade sintética cobre o nível 5.

## Medidas (T014, T015, T016)

**`pnpm sim:world --seasons 30`** (seed padrão, 2026-11-10), largura média das faixas guardadas depois de cada virada, por nível da academia e tempo na base:

| Nível | Tempo 0 | Tempo 1 | Tempo 2 | Tempo 3+ |
|------:|--------:|--------:|--------:|---------:|
| 1 | 18,9 | 16,3 | 14,2 | 12,5 |
| 2 | 17,8 | 15,2 | 12,9 | 10,3 |
| 3 | 15,9 | 13,8 | 11,8 | 9,4 |
| 4 | 14,0 | 10,9 | 7,9 | 4,9 |
| 5 | — | — | — | — |

- **Contenção:** 5 832 de 5 832 faixas contêm o potencial real (100%).
- **Nível 5:** a IA só chega ao nível 4 pela reputação, então o nível 5 não aparece no mundo sem técnico. A grade sintética (`estimate.test.ts`, 2 000 jovens por célula) cobre o nível 5: com dois anos de base, ele fica em cerca de 30% da largura do nível 1 recém-chegado (SC-002 pede ≤ 60%).
- **Largura abaixo do alvo:** as médias ficam um pouco abaixo da tabela R3 porque a largura também encolhe quando a força do jovem se aproxima do potencial (`low ≥ força`) ou quando a faixa encosta no teto da escala.
- **Carreira longa:** `long-run-1` e `long-run-2` conferem em toda virada 0 faixas sem o valor real e 0 faixas fora da anterior.

**Neutralidade (SC-005):** `estimate-neutral.test.ts` roda 2 temporadas com a feature e com os módulos `renewal/estimate` e `news/academy` trocados por versões que não fazem nada. São idênticos:
- tabelas;
- mundo (clube, força e contrato de cada jogador);
- livro-caixa e caixa;
- log do mercado;
- base (sem a faixa);
- regulador;
- diretoria e torcida.

O próprio teste confere que a troca valeu: com a feature há faixas e manchetes da base; sem ela, nenhuma.

**Linhas de base:** `match/baseline`, `composition-baseline`, `continental-baseline` e `save/equivalence` passam **sem regravar**.

**Decisões tomadas na implementação:**
- **"Chegaram" no bloco Base (U1 da análise):** sem aviso da virada para o clube (primeira temporada ou troca de clube), a lista mostra os jovens da base com `joinedSeason` igual à temporada. Na primeira temporada, isso é a base inicial.
- **Marcas das crias de outros clubes:** são feitas pelos jogos da liga e pelos jogos do clube do técnico em outras competições. Uma cria da IA que só jogou copa ainda pode "estrear" pela liga. Só as crias do clube do técnico viram manchete, então o efeito se limita a um técnico que assume um clube novo.
- **`news-new-season`:** passou a manter os campos que outras features guardam em `NewsState` (`crias`). Antes, a etapa montava o estado do zero.
- **Detalhe de jovem da base (T011):** a aba Base não abre detalhe do jovem. A faixa fica na coluna "Potencial", e a linha "Potencial estimado na promoção" aparece no detalhe e no modal do jogador profissional.

**Tamanho do save (T032, `pnpm sim:size`, mundo de 10 países):**

| Momento | Antes (1.10.1) | Depois (1.11.0) | Diferença |
|---|---:|---:|---:|
| Início | 5 298 KB | 5 365 KB | +67 KB (+1,3%) |
| Fim da temporada 1 | 34 511 KB | 34 579 KB | +68 KB |
| Início da temporada 2 | 5 995 KB | 6 107 KB | +112 KB (+1,9%) |

O aumento vem quase todo de `renewal`: as faixas, as crias e o histórico. O save fica abaixo do teto de 42 MB, e o `long-career` (5,5 MB) passa.

**Rodada completa:**
- `pnpm lint` e `pnpm typecheck`: limpos.
- **Suíte completa:** 17 arquivos falharam com o e2e e o build rodando na mesma máquina. Rodados sozinhos:
  - 2 falhas eram reais, dois testes antigos que comparavam a origem do promovido com igualdade exata; trocados por `toMatchObject`;
  - 3 eram estouros de tempo por carga: passam sozinhos com as mesmas durações da 1.10.1 (2,8 s e 2,9 s);
  - os demais passam.
- **E2E completo, sozinho:** 70 passaram e 2 foram pulados.
- **`pnpm check-release`:** ok.
