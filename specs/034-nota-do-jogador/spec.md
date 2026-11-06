# Feature Specification: Nota do jogador por partida

**Feature Branch**: `034-nota-do-jogador`

**Created**: 2026-11-06

**Status**: Draft

**Input**: User description: "Nota do jogador por partida (034). Cada jogador que entra em campo recebe uma nota de 0 a 10, com uma casa decimal, no estilo dos jornais brasileiros (6,0 é a atuação comum, acima de 8 é excepcional, abaixo de 5 é ruim). A nota é só informativa: não muda partida, evolução, mercado, IA nem qualquer resultado, a mesma seed continua dando a mesma carreira e o save não guarda a nota (ela é calculada a partir do registro da partida). Nas partidas com jogadas (todas as partidas completas: as do clube do jogador, ao vivo ou simuladas direto, e as das competições do país dele, desde a 1.6.0), a nota completa usa gols, assistências, finalizações, passes certos e aproveitamento, passes decisivos, desarmes certos, interceptações, defesas do goleiro, gols sofridos com o jogador em campo, cartões, pênalti cometido, lesão, minutos jogados e o resultado do time, com pesos por posição da vaga (zagueiros e volantes valorizados por desarmes e interceptações, meias por passes e passes decisivos, atacantes por gols e finalizações, goleiros por defesas e gols sofridos). Nas partidas sem jogadas (simulação resumida das ligas de outros países e partidas jogadas antes da 1.6.0), uma nota simplificada a partir de gols, assistências, cartões, minutos e resultado, marcada como simplificada na interface. Onde aparece: no resumo da partida (nota de cada jogador que entrou e o destaque do melhor em campo), ao vivo (nota parcial de cada jogador no painel Meu time, atualizada durante a partida) e a média da temporada atual na tela do elenco e no detalhe do jogador (com o número de partidas). Jogadores com poucos minutos (ex.: entrou no fim) recebem nota mais próxima da média ou ficam sem nota abaixo de um mínimo de minutos. Faixas de realismo verificadas por simulação longa: média geral perto de 6,3, poucas notas abaixo de 4 ou acima de 9, médias por posição parecidas entre si (nenhuma posição sistematicamente favorecida), quem marca e o time que vence têm nota maior, e o melhor em campo costuma ser do time vencedor."

## Contexto

É o item 5 da lista de melhorias de 2026-11-04 ("Não tem nota do jogador no final da partida ou durante ela? Como saber se o cabra foi bom?"). Ele foi adiado até o motor gerar passes, passes decisivos, desarmes e interceptações, o que a feature 033 (versão 1.6.0) entregou.

Decisões tomadas com o usuário (2026-11-06):

- A nota só **informa**: não pesa em nada do jogo.
- A escala vai de **0 a 10, com uma casa decimal**.
- A nota aparece no **resumo da partida** (com o melhor em campo), **ao vivo** e como **média da temporada** no elenco e no detalhe do jogador.
- As partidas **simuladas direto** do clube do jogador já têm jogadas e recebem a nota completa. As partidas **sem jogadas** (outras ligas e partidas antigas) recebem uma **nota simplificada**, marcada como tal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Saber quem jogou bem na partida (Priority: P1)

Como técnico, depois de uma partida quero ver a nota de cada jogador dos dois times e quem foi o melhor em campo, para saber quem jogou bem, inclusive os zagueiros e volantes que não marcam gols.

**Why this priority**: é a pergunta original ("como saber se o cabra foi bom?") e o centro da feature.

**Independent Test**: jogar uma partida (ao vivo ou direto), abrir o resumo e conferir uma nota de 0 a 10 com uma casa para cada jogador que entrou em campo, e o melhor em campo destacado.

**Acceptance Scenarios**:

1. **Given** uma partida completa encerrada, **When** o técnico abre o resumo, **Then** cada jogador que entrou em campo nos dois times tem uma nota de 0,0 a 10,0, com uma casa decimal, ao lado das suas estatísticas.
2. **Given** a mesma partida, **When** o resumo é aberto, **Then** o jogador de maior nota da partida aparece destacado como melhor em campo, com o nome, o time e a nota, em texto.
3. **Given** um jogador que entrou nos últimos minutos e jogou menos que o mínimo, **When** o resumo é aberto, **Then** ele aparece "sem nota" (em texto), sem um número.
4. **Given** uma partida sem jogadas (de outra liga ou de antes da 1.6.0), **When** o resumo é aberto, **Then** cada jogador tem a nota simplificada, e o resumo diz em texto que as notas daquela partida são simplificadas.
5. **Given** a mesma partida aberta duas vezes, ou antes e depois de salvar e carregar, **When** o resumo é aberto, **Then** as notas são as mesmas.

---

### User Story 2 - Acompanhar as notas durante o jogo (Priority: P2)

Como técnico, durante a partida ao vivo quero ver a nota parcial de cada jogador do meu time no painel Meu time, para decidir quem substituir.

**Why this priority**: ajuda nas decisões durante o jogo, mas o técnico já tem a condição física, os cartões e a pressão para decidir.

**Independent Test**: iniciar uma rodada ao vivo, pausar no meio do jogo e ver a nota parcial de cada jogador em campo; ao fim, conferir que a nota final de cada um é a do resumo.

**Acceptance Scenarios**:

1. **Given** uma rodada ao vivo pausada, **When** o técnico abre o painel Meu time, **Then** cada jogador em campo e cada um que já saiu tem a nota parcial (ou "sem nota", se ainda não jogou o mínimo).
2. **Given** a partida avançando, **When** um jogador marca um gol ou toma um vermelho, **Then** a nota parcial dele muda no mesmo sentido (sobe com o gol, desce com o vermelho).
3. **Given** a partida encerrada, **When** o resumo é aberto, **Then** a nota de cada jogador é exatamente a última nota parcial dele.

---

### User Story 3 - Ver a média da temporada (Priority: P2)

Como técnico, quero ver a média de notas de cada jogador do meu elenco na temporada, com o número de partidas, para comparar jogadores e escolher a escalação.

**Why this priority**: transforma as notas em informação útil para a escalação e o mercado, mas depende das notas por partida (US1).

**Independent Test**: depois de algumas rodadas, abrir o elenco e o detalhe de um jogador e conferir a média e o número de partidas com nota.

**Acceptance Scenarios**:

1. **Given** algumas rodadas jogadas, **When** o técnico abre o elenco, **Then** cada jogador tem a média de notas da temporada atual, com uma casa decimal, e o número de partidas com nota; quem não tem nota na temporada aparece "sem nota".
2. **Given** o detalhe de um jogador, **When** é aberto, **Then** mostra a mesma média e o mesmo número de partidas do elenco.
3. **Given** a lista do elenco, **When** o técnico ordena pela média de notas, **Then** a lista fica em ordem de média, e quem não tem nota fica por último.
4. **Given** a virada de temporada, **When** a nova começa, **Then** as médias recomeçam do zero.

---

### User Story 4 - Notas que fazem sentido (Priority: P2)

Como jogador do jogo, quero que as notas pareçam as de um jornal: quase todas entre 5 e 8, quem faz gol ou é decisivo tem nota alta, quem é expulso tem nota baixa, o time que vence tem notas melhores, e nenhuma posição leva vantagem sistemática.

**Why this priority**: notas sem sentido tiram a confiança na feature.

**Independent Test**: simular milhares de partidas sem interação e conferir as faixas declaradas.

**Acceptance Scenarios**:

1. **Given** milhares de partidas completas, **When** as notas são medidas, **Then** a média geral, a dispersão e os extremos ficam nas faixas declaradas.
2. **Given** as mesmas partidas, **When** as médias por posição da vaga são comparadas, **Then** nenhuma posição fica, na média, mais de meio ponto acima ou abaixo da média geral.
3. **Given** as mesmas partidas, **When** quem marcou é comparado com quem não marcou, e o time que venceu com o que perdeu, **Then** quem marcou e o time vencedor têm média de nota maior.
4. **Given** as mesmas partidas, **When** o melhor em campo é contado, **Then** na maioria das partidas com vencedor ele é do time vencedor.
5. **Given** partidas sem jogadas (nota simplificada), **When** as notas são medidas, **Then** a média geral e a média por resultado ficam próximas das da nota completa.

---

### Edge Cases

- **Poucos minutos**: abaixo do mínimo de minutos o jogador fica sem nota; acima dele, quanto menos minutos, mais a nota fica perto da média (um gol em cinco minutos dá nota boa, mas não 10).
- **Expulsão**: o expulso tem a nota bem reduzida, e o time que fica com um a menos não é punido de novo jogador a jogador.
- **Goleiro**: valorizado pelas defesas e punido pelos gols sofridos com ele em campo; o reserva que entra só responde pelos gols depois da entrada.
- **Gols sofridos e substituições**: cada jogador de linha responde só pelos gols sofridos enquanto estava em campo.
- **Gol contra o próprio time não existe no motor**: não há essa entrada.
- **Prorrogação**: os minutos e as jogadas da prorrogação contam; a disputa de pênaltis não muda a nota.
- **Partida abandonada**: as notas valem até o minuto do abandono, como as estatísticas.
- **Troca de posição durante o jogo**: a nota usa a vaga em que o jogador passou a maior parte do tempo.
- **Notas no limite**: nunca abaixo de 0,0 nem acima de 10,0.
- **Média da temporada com partidas simplificadas**: no elenco do técnico, quase todas as partidas têm a nota completa; se houver partidas com nota simplificada (de um save anterior à 1.6.0), elas entram na média, e o detalhe do jogador diz quantas foram simplificadas.

## Requirements *(mandatory)*

### Functional Requirements

**Cálculo**

- **FR-001**: Todo jogador que esteve em campo por pelo menos o mínimo de minutos numa partida DEVE ter uma nota de 0,0 a 10,0, com uma casa decimal. Abaixo do mínimo, ele fica sem nota.
- **FR-002**: A nota completa (partidas com jogadas) DEVE considerar:
  - gols, assistências e finalizações;
  - passes certos e aproveitamento de passe;
  - passes decisivos;
  - desarmes certos e interceptações;
  - para o goleiro, as defesas;
  - os gols sofridos pelo time enquanto o jogador estava em campo;
  - cartões amarelo e vermelho, pênalti cometido e lesão;
  - os minutos jogados e o resultado do time.
- **FR-003**: Os pesos DEVEM depender da posição da vaga: zagueiros e volantes ganham mais com desarmes e interceptações; meias, com passes e passes decisivos; atacantes, com gols e finalizações; goleiros, com defesas e gols sofridos.
- **FR-004**: A nota simplificada (partidas sem jogadas) DEVE considerar gols, assistências, cartões, minutos, gols sofridos com o jogador em campo e o resultado do time. Ela é marcada como simplificada onde aparece.
- **FR-005**: Quanto menos minutos acima do mínimo, mais a nota DEVE ficar perto da nota média de referência.
- **FR-006**: O melhor em campo DEVE ser o jogador de maior nota da partida. Em caso de empate na nota, o critério de desempate é fixo e independe da ordem dos dados: mais gols, depois mais assistências, depois o time vencedor, depois a ordem do identificador.

**Sem efeito no jogo**

- **FR-007**: A nota NÃO PODE mudar nenhum resultado, sorteio, evolução, valor de mercado, decisão do computador nem a escolha de escalação. A mesma seed continua dando exatamente a mesma carreira, e os testes de linha de base existentes passam sem mudança.
- **FR-008**: A nota DEVE ser determinística: calculada a partir do registro da partida, ela é a mesma em qualquer navegador, ao vivo ou direto, e depois de salvar e carregar.
- **FR-009**: O save NÃO DEVE guardar a nota. Se a nota completa precisar de dados da partida que hoje não são guardados (por exemplo, as finalizações por jogador e as defesas do goleiro), eles podem passar a ser guardados nas partidas novas, com migração e teste de save antigo (Princípio VI), dentro dos limites de tamanho declarados. As partidas antigas continuam com a nota completa ou simplificada conforme os dados que tiverem.

**Interface**

- **FR-010**: O resumo da partida DEVE mostrar a nota (ou "sem nota") de cada jogador que entrou em campo, nos dois times, e o melhor em campo em destaque, com nome, time e nota.
- **FR-011**: Numa partida com nota simplificada, o resumo DEVE dizer, em texto, que as notas são simplificadas.
- **FR-012**: O painel Meu time, na rodada ao vivo, DEVE mostrar a nota parcial de cada jogador do time do técnico que já entrou em campo, atualizada como as outras informações do painel. A nota final no resumo é a última nota parcial.
- **FR-013**: A tela do elenco DEVE mostrar a média de notas da temporada atual e o número de partidas com nota de cada jogador, ordenável. Quem não tem nota fica "sem nota" e por último na ordenação.
- **FR-014**: O detalhe do jogador DEVE mostrar a média e o número de partidas da temporada atual, e quantas dessas notas foram simplificadas, quando houver.
- **FR-015**: A cor não pode ser a única forma de indicar a nota boa ou ruim: o número está sempre em texto. Todo texto novo fica nas traduções, e as telas continuam acessíveis por teclado e leitor de tela, sem rolagem horizontal da página nas larguras já suportadas.

**Realismo**

- **FR-016**: DEVE haver faixas de realismo declaradas e verificadas por simulação longa, sem interação, para:
  - a média geral e a dispersão;
  - a parte das notas abaixo de 4,0 e acima de 9,0;
  - a diferença entre a média de cada posição e a média geral;
  - a diferença entre quem marcou e quem não marcou;
  - a diferença entre o time vencedor e o perdedor;
  - a parte das partidas com vencedor em que o melhor em campo é do time vencedor;
  - a diferença entre a nota simplificada e a completa nas mesmas partidas.

### Key Entities *(include if feature involves data)*

- **Nota de um jogador numa partida**: valor de 0,0 a 10,0 com uma casa decimal, ou "sem nota" (abaixo do mínimo de minutos), e o tipo (completa ou simplificada). Calculada a partir do registro da partida, ou do estado dela ao vivo; não é guardada.
- **Melhor em campo**: o jogador de maior nota da partida, com o critério de desempate fixo.
- **Média da temporada de um jogador**: a média das notas das partidas da temporada atual em que ele teve nota, o número dessas partidas e quantas foram simplificadas.
- **Faixas de realismo das notas**: limites declarados para a distribuição das notas, verificados por simulação longa (Princípio V).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em toda partida encerrada, 100% dos jogadores que jogaram pelo menos o mínimo de minutos têm nota no resumo, e o melhor em campo é sempre o de maior nota.
- **SC-002**: Com as notas, 100% dos testes de linha de base existentes passam sem mudança (a mesma seed dá a mesma carreira).
- **SC-003**: Em milhares de partidas completas simuladas:
  - a média geral fica entre 6,1 e 6,5;
  - no máximo 5% das notas ficam abaixo de 4,0 e no máximo 3% acima de 9,0;
  - a média de cada posição da vaga fica a no máximo 0,5 ponto da média geral.
- **SC-004**: Nas mesmas partidas:
  - quem marcou tem média pelo menos 1,0 ponto acima de quem não marcou;
  - o time vencedor tem média pelo menos 0,5 ponto acima do perdedor;
  - em pelo menos 70% das partidas com vencedor, o melhor em campo é do time vencedor.
- **SC-005**: Nas mesmas partidas, a média geral da nota simplificada fica a no máximo 0,3 ponto da média da completa.
- **SC-006**: A nota parcial ao vivo de cada jogador termina exatamente igual à nota do resumo em 100% das partidas.
- **SC-007**: Abrir o resumo, o elenco e o detalhe do jogador continua sem demora perceptível, inclusive no fim da temporada.

## Assumptions

- O mínimo de minutos para ter nota é de cerca de 10 minutos, e a nota média de referência é 6,0. O plano pode ajustar os dois, com justificativa.
- A média da temporada usa as partidas de todas as competições da temporada atual (liga, copas e as demais), e só a temporada atual. Médias de temporadas anteriores ficam fora desta feature.
- A média do elenco é a do clube do técnico; os jogadores de outros clubes têm a média no detalhe do jogador, se abertos (por exemplo, no mercado), calculada da mesma forma.
- A nota não aparece na linha do tempo da partida nem nas notícias nesta feature.
- Nenhum formato de mod muda.
- A versão do jogo sobe com a entrega, com a data do dia no horário de Brasília.
