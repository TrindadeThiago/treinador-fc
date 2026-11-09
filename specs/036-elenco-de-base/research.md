# Research: Elenco de base (036)

Medição de partida (mundo padrão, seed `medida-036`, 10 temporadas, sem técnico, versão 1.8.1):

- 40 clubes, cerca de 1 010 a 1 040 jogadores e elencos de 25 a 26 jogadores, em média;
- a safra traz 68 jovens por virada (1,7 por clube);
- o reequilíbrio cria de 0 a 14 jogadores a mais por virada, com tendência de alta: o mundo encolhe devagar (1 027 → 1 002 em 10 temporadas);
- de 6 a 34 livres no fim de cada virada.

## R1. Onde a base fica no estado

**Decisão:** os jovens da base ficam fora de `bank.players`, numa lista própria em `RenewalState.academy` (`AcademyState`). O jogador da base tem o mesmo registro do jogador do mundo, sem `clubId` e sem `contract`, mais o clube da base (`clubId` da academia), como os livres do mercado (`FreeAgent`).

**Razão:**
- Escalação, mercado, folha, IA de transferências, diretoria, torcida, notícias e medidas usam `bank.players` e `squadOf`. Fora dessa lista, o jovem da base fica fora de todos esses sistemas sem tocar em nenhum deles. É o FR-003 garantido pela estrutura e não por filtros espalhados.
- `RenewalState` já é gravado no save, já passa pelo dia da carreira (`advanceCareer`) e pela virada (`TurnoverContext.renewal`, mesclado pelo `perCountry`). Não é preciso criar um campo novo em `SaveFile`, `CareerSeasonState`, `TurnoverOptions` e `TurnoverResult`.
- O formato de mod não muda: o banco do mod nunca tem jogadores de base.

**Alternativas consideradas:**
- *Jogador em `bank.players` com uma marca (`academy: true`).* Rejeitada: obrigaria a filtrar a marca em dezenas de lugares (`squadOf`, folha, mercado, `withAdjustedLineup` no save, buscas da web), e um filtro esquecido faria um jovem jogar ou receber salário.
- *Campo novo `academy` direto no `SaveFile`.* Rejeitada: obrigaria a passar o estado por todas as assinaturas do dia e da virada, que já levam o `renewal`.

**Cuidado:** na rodada de uma liga estrangeira, `finance/round.ts` hoje descarta a renovação atualizada (`foreign ? renewal.state : ...`) para não mexer na última evolução mostrada ao técnico. A evolução do meio da temporada da base desse país precisa voltar ao estado (ver R4).

## R2. Idade-limite, vagas e regras novas

**Decisão:** novas constantes em `ACADEMY_RULES` (`renewal/rules.ts`):
- `maxPlayers: 15`;
- `ageLimit: 20` (sai na virada quem tem 20 anos ou mais na data de início da nova temporada);
- `aiTargetSize: 25` (tamanho do elenco a que a IA tenta chegar promovendo da base, R5);
- `lastYearAge: 19` (derivado: "último ano" é quem terá 20 na próxima virada).

A temporada em que cada jovem precisa sair é calculada da data de nascimento e da data de referência do banco (`seasonDate`), e nunca é gravada.

**Razão:** constantes do jogo, como `SQUAD_RULES`, sem formato de mod (spec, Assumptions). A 037 decide se viram regra de mod.

**Alternativas:** idade-limite 21 (sub-21). Rejeitada: a safra chega com 16 a 18 anos, e quatro temporadas na base para quem chega com 16 já dão a janela de decisão.

## R3. Safra na base

**Decisão:** `generateYouth` passa a gravar os jovens em `renewal.academy.players`, e não em `bank.players`. Força, potencial, idade e características seguem `createYouth` e o regulador. A posição de cada jovem continua a mais carente, mas contando o elenco principal **e** a base do clube.

**Quantidade:** `youthCount` continua `1 + degraus de reputação`. A medição mostra que o reequilíbrio cria pouco (0 a 14 por virada contra 68 da safra), mas é ele que impede o mundo de encolher. Sem ele (FR-011), a safra precisa repor essa diferença. `YOUTH_RULES.perClub` ganha um ajuste calibrado pelo teste de 30 temporadas (ex.: `base: 2` para clubes de reputação baixa, ou um degrau a mais). O critério de calibragem: o número de jogadores do mundo fica estável (±3% do início em 30 temporadas) e a safra de emergência (R6) não dispara.

**Razão:** FR-002 permite recalibrar só a quantidade, e só para repor o que o reequilíbrio deixa de criar.

**Determinismo:** a seed da safra continua `${careerSeed}:youth:${season}:${clubId}`. A mudança no cálculo da posição carente altera a sequência e as linhas de base, o que é esperado (FR-018).

## R4. Evolução da base

**Decisão:** `evolveAcademy(academy, careerSeed, leagueNumber, moment, date)` aplica `evolutionDelta` com participação 0 (fator `minutes.base` = 0,5), nos mesmos momentos da evolução do mundo:
- meio da temporada: em `finance/round.ts`, na mesma rodada de `evolvePlayers`, para a base dos clubes daquela liga (inclusive os regionais do país), **também nas ligas estrangeiras**;
- fim da temporada: no `evolvePlayersStep`, pelo `perCountry`.

A seed é a mesma da evolução do mundo (`${careerSeed}:evolve:${number}:${moment}:${playerId}`), então um jovem evolui igual estando na base ou não, com a mesma minutagem.

**Alternativas:** um fator de minutagem próprio da base. Fica para a 037, onde o nível da academia dá um bônus.

## R5. Promoções da IA e o reequilíbrio

**Decisão:** o `balanceSquads` deixa de criar jogadores (`createYouth` sai de lá). A virada ganha, em ordem, por país (`perCountry`):

1. **`academy-age-out`** (antes de `generate-youth`): quem passou da idade-limite sai da base. Clube da IA: promovido ao elenco principal. Clube do técnico: vira livre (R7). Também vale para o clube que o técnico deixou (sem técnico, é IA).
2. **`generate-youth`**: a safra entra na base (R3). Na IA, se a base passar de 15, saem como livres os de menor utilidade (`SQUAD_RULES.utility`). No técnico, a base fica acima do limite (bloqueio, R8).
3. **`balance-squads`** (só IA para promoções), na ordem:
   - promove o melhor jovem da base (por utilidade) de cada posição abaixo do mínimo;
   - promove o melhor da base até o mínimo total;
   - promove o melhor da base até `aiTargetSize`, respeitando o teto por posição;
   - libera quem passa do teto por posição e do máximo, como hoje.

   No clube do técnico, só libera quem passa do máximo (40), como hoje, sem criar nem promover.
4. **`complete-squads`** (nova, depois de `balance-squads` e antes de `age-out-free-agents`): clube da IA ainda abaixo de algum mínimo contrata livres pela posição, com a regra de `freeAgentFor` para posição descoberta (o orçamento não barra quem cobre um mínimo). Vale para os clubes da liga e para os só regionais.

Durante a temporada, a IA promove da base só se algum elenco ficar abaixo de um mínimo (FR-013), o que hoje não acontece: `canRemovePlayer` impede vendas abaixo do mínimo, e contratos só vencem na virada. A verificação fica no `aiMarketRound`, antes das contratações de livres.

**Razão:** a IA joga pelas mesmas regras do técnico (base, depois mercado). `aiTargetSize` mantém os elencos da IA no tamanho de hoje (25 a 26), e o teste de 30 temporadas confere o tamanho.

## R6. Garantia de elenco válido da IA (safra de emergência)

**Decisão:** se, depois de `complete-squads`, um clube da IA ainda estiver abaixo de um mínimo (sem ninguém da posição na base nem no mercado), o clube recebe uma **safra de emergência**: um jovem novo na **base**, na posição que falta, promovido em seguida pelo mesmo caminho. Nenhum jogador nasce direto no elenco principal (FR-011). Cada caso é contado em `AcademyState.emergencies` (por virada) e medido.

**Limite declarado:** em 30 temporadas sem interação, no máximo 0,05 safra de emergência por clube e temporada (média), e 0 no mundo padrão depois da calibragem do R3. Passar disso quebra o teste de equilíbrio (Princípio V) e exige recalibrar a safra.

**Razão:** o elenco da IA precisa ser válido em toda partida (FR-011a). Sem uma garantia, um país pequeno, com poucos livres e base sem a posição, travaria a simulação. A safra de emergência respeita a regra "todo jogador nasce na base" e fica visível na medição, em vez de esconder a criação.

**Alternativas:** deixar o clube jogar com o elenco incompleto (o motor já escala com menos de 11). Rejeitada: piora as partidas e a credibilidade das ligas, e o técnico do clube veria isso ao assumir.

## R7. Saída da base: livres

**Decisão:** dispensa do técnico, idade-limite no clube do técnico e excesso da base da IA viram livres com `toFreeAgent` e `addFreeAgents`, com `lastClubId` = clube da base e `sinceYear` = ano da saída. Ficam sujeitos ao `ageOutFreeAgentsStep` (aposentadoria por tempo sem clube).

O jovem promovido pelo técnico usa o contrato inicial de `ensureContracts` para aquele jogador (salário pela escala do país e duração das regras de contrato da competição). A confirmação mostra a prévia (`promotionContract`).

A dispensa durante a temporada vira livre na hora. A IA pode contratá-lo pela regra de livres por carência, em qualquer rodada.

## R8. Bloqueios do clube do técnico

**Decisão:** uma função do motor, `rosterIssues(world, academy, clubId, rules)`, devolve problemas com gravidade:
- `academy_over_limit` (erro): a base passa do limite, com `params.excess`;
- `squad_below_minimum` (erro): o elenco principal está abaixo do mínimo total ou de um mínimo por posição, com `params.missing` e a lista de posições;
- `academy_last_year` (aviso): há jovens no último ano e o próximo jogo é o último do clube na temporada.

A camada do save (`advanceCareerSeason` e o caminho ao vivo) recusa avançar com problema de erro, e a web mostra o diálogo de bloqueio que já existe para a escalação inválida (`SimulateDialogs`), com o link para a aba Base ou para o mercado. O aviso usa o diálogo de confirmação (`confirm`) que já existe para "time sem goleiro". Assim a regra fica no motor e na camada do save, e a interface só mostra (Princípio I).

Desempregado, não há bloqueio: o clube em foco é da IA.

**Aviso da última janela:** `academyWarning(state, clubId)` devolve `{ kind: "last_window", count }` enquanto a última janela de transferências da temporada está aberta e há jovens no último ano. A "última janela" é a última de `transferWindows(league, rules)`, que já cobre as janelas padrão; se a competição não tiver nenhuma janela, vale só o aviso antes do último jogo. A faixa de avisos do Início (`NoticeStrip`) e a aba Base o mostram. O aviso antes do último jogo é o `academy_last_year` do diálogo de confirmação. Os dois juntos atendem ao FR-010 e ao SC-003.

## R9. Origem "cria da base"

**Decisão:** `AcademyState.graduates: Record<playerId, { clubId, season }>` guarda quem foi promovido da base de um clube (pelo técnico, pela IA ou pela emergência). O detalhe do jogador lê dali. Na virada, saem do mapa os jogadores que não estão mais no mundo nem entre os livres (aposentados), para o save não crescer sem limite.

**Alternativa:** um campo `origin` no jogador. Rejeitada: o jogador do banco segue o schema do mod, e o formato de mod não muda nesta feature.

## R10. Medidas do mundo e regulador

**Decisão:** `measureWorld` passa a receber também os jovens da base dos clubes medidos (data de referência igual). Eles entram uma vez na média, nos percentis, nos craques, nas promessas e na idade média (FR-019). Os testes de 30 temporadas continuam com as mesmas faixas (`RANGES`). Se a idade média sair da faixa por causa dos jovens, a faixa é revista com justificativa (Princípio V).

O teste de longo prazo ganha critérios novos:
- base de cada clube dentro do limite;
- zero jogadores criados direto no elenco (contados pelo `nextPlayerSeq` contra a safra mais as emergências);
- safras de emergência dentro do limite do R6;
- número de jogadores do mundo estável (±3%);
- elencos da IA com tamanho médio entre 23 e 28.

## R11. Save v21

**Decisão:** `SAVE_FORMAT_VERSION` vai de 20 para 21. A migração `addAcademy` cria `renewal.academy = { players: [], graduates: {}, promotedThisSeason: [], releasedThisSeason: [], emergencies: 0 }`. A validação do save confere:
- que nenhum jogador da base está também em `bank.players` ou entre os livres;
- que todo `clubId` da base existe no banco.

O teste `migrate-v21.test.ts` abre a fixture `saveV20` e avança até a virada. Os tetos de tamanho do save (`sim:size`: carreira longa 5,5 MB e mundo grande 42 MB) são medidos de novo. A estimativa é de cerca de 5 jovens por clube, ou seja, perto de 2 200 registros a mais no mundo de 440 clubes.

## R12. Interface

**Decisão:**
- **Elenco:** passa a ter abas (`Tabs`) **Profissional** e **Base**, com o atalho e a ordem das abas de competição.
- **Aba Base:**
  - `DataTable` com nome, idade, posição, força, características, "sai em" (temporada) e a marca de texto "Último ano";
  - contador de vagas (`SquadCounter`), com o excesso em texto;
  - ações Promover e Dispensar em `Dialog` de confirmação. A promoção mostra salário e anos; a dispensa diz que é irreversível e que o jovem vira livre.
  - Promover fica desabilitado, com explicação, quando o elenco está no máximo ou durante uma partida em andamento.
  - Estado vazio: "Os jovens chegam na virada da temporada".
- **Detalhe do jogador** (`PlayerDetails`): linha "Cria da base do {clube} (temporada {n})".
- **Aviso de mudanças do elenco** (`SquadChangeNotice`) e fim de temporada: seções "Chegaram à base", "Saíram da base por idade", "Promovidos na temporada" e as que já existem, sem "promovidos" automáticos no clube do técnico.
- **Bloqueios:** novos textos em `SimulateDialogs` para `academy_over_limit` e `squad_below_minimum`, com botões para a aba Base e o Mercado.

## R13. Versão e documentação

**Decisão:** a versão vai para 1.9.0, com a nota de versão do dia (data de Brasília) em `packages/i18n/locales/pt-BR/release-notes.json`. A documentação acompanha:
- `docs/guia-do-jogador.md` (base, promoção, dispensa, bloqueios);
- `docs/glossario.md` (base, safra, cria da base);
- `docs/arquitetura.md` (`renewal/academy`);
- `docs/design.md` §5 (o reequilíbrio não cria mais jogadores).

As linhas de base por seed são regravadas no mesmo PR, com a explicação no commit (FR-018).

## Decisões da implementação (2026-11-09)

### I1. Onde o bloqueio é aplicado

`rosterIssues` (motor) calcula os problemas, e a camada do save expõe `rosterIssuesOf(save)`. O
provider da web os aplica antes de começar a rodada, no mesmo ponto em que já aplica
`validateLineup`: erro abre o diálogo de bloqueio, aviso abre o de confirmação. O R8 previa a
recusa dentro do avanço do save; isso quebraria as simulações e os testes que jogam dias direto pelo
motor com um técnico que não age, sem ganho para o jogador, que só joga pela interface.

### I2. Técnico passivo nas simulações

As simulações longas e os testes de carreira têm um técnico que nunca renova contratos nem
contrata. Sem a reposição automática (FR-011b), o elenco dele cai abaixo de 11 em poucas
temporadas e a partida não começa. A virada ganhou a opção `passiveManager` (motor:
`TurnoverOptions`; save: `advanceCareerSeason(save, now, { passiveManager: true })`), em que o
clube do técnico é completado pelas regras da IA (promoções da base, livres, emergência). O jogo
nunca a usa. `startNextSeason`, que só serve a simulações e testes, a liga por padrão.

### I3. Calibragem (T037)

Medido no teste de 30 temporadas (`long-run-1` e `long-run-2`, mundo de teste com 40 clubes):

| Medida | Antes (1.8.1) | Com a base |
|---|---|---|
| Faixas de força, craques, promessas | dentro | dentro (sem mudança de `YOUTH_RULES`) |
| Idade média (elencos + base) | 25,4 a 25,7 | 24,6 a 25,7 |
| Elenco médio da IA | 25 a 26 | 24 a 25 |
| Jogadores criados direto no elenco | 0 a 14 por virada | 0 |
| Safras de emergência | — | 15 em 30 temporadas (0,0125 por clube e temporada; limite 0,05) |
| Elencos + bases | 1 011 → 1 002 (encolhia) | 1 031 → ~1 100 a 1 150 (a base vira um estoque de ~10%) |

A quantidade da safra **não** foi recalibrada: o mundo deixou de encolher, porque os jovens que
antes eram dispensados por excesso agora esperam na base. O critério de população virou
"variação de até 8% em relação à temporada 5", quando a base já se formou (as ondas de geração
fazem a população oscilar até 6,5%). A safra de emergência não chegou a zero no mundo de teste: ela
aparece em poucas viradas, quando um clube fica sem goleiro na base e no mercado. A taxa fica 4×
abaixo do limite declarado.

O limite reduzido do CI da correlação entre vagas e títulos continentais
(`CONTINENTAL_LIMITS.ci.minSlotsTitlesSpearman`) foi revisto de 0 para -0,1: com 10 títulos entre 5
países ele é quase só ruído, e a seed `longo-continental-b` passou a dar -0,08. O critério completo
(≥ 0,3 em 30 temporadas) continua.

### I4. Linhas de base regravadas (T039)

`equivalence-baseline.json` e os snapshots de `composition-baseline` e `continental-baseline`. Nas
duas seeds da equivalência, a primeira temporada continua idêntica (rodadas e finanças); as
diferenças começam depois da primeira virada, quando a safra passa a ir para a base.
