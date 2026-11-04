# Feature Specification: Estatísticas de jogadas (passes, passes decisivos, desarmes e interceptações)

**Feature Branch**: `033-estatisticas-de-jogadas`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Estatísticas de passes, passes decisivos, desarmes e interceptações por jogador nas partidas completas do motor (033). O motor de partida passa a gerar, para cada jogador em campo, contagens de passes tentados e certos, passes decisivos (passes que viraram finalização; a assistência é o passe decisivo que virou gol), desarmes tentados e certos e interceptações. As contagens são apenas descritivas: são derivadas do que o motor já calcula a cada minuto (posse de cada lado, pressão/chance de finalização, força e posição de cada jogador na vaga, cansaço, expulsões) e NÃO podem mudar gols, finalizações, cartões, lesões, substituições nem qualquer outro resultado; a mesma seed deve continuar dando exatamente a mesma carreira (linhas de base inalteradas), por isso a aleatoriedade nova usa um fluxo próprio do gerador. Só as partidas simuladas minuto a minuto (as do clube do jogador e as das competições que ele acompanha) geram as estatísticas; a simulação resumida das outras ligas continua sem elas. Guardar contagens por jogador (não um evento por passe) no registro da partida e no save, com migração do formato e teste de save antigo (Princípio VI), respeitando os limites de tamanho do save do mundo grande. Valores com faixas de realismo verificáveis por simulação longa (Princípio V): por exemplo, passes por time por jogo, aproveitamento de passe, desarmes e interceptações por jogo, distribuição por posição (zagueiros e volantes desarmam e interceptam mais; meias passam mais e dão mais passes decisivos). A interface mostra os totais do time nas estatísticas ao vivo e no resumo da partida, e as contagens por jogador no resumo da partida. Isto prepara a futura nota do jogador (fora do escopo desta feature)."

## Contexto

Hoje cada partida completa registra, por jogador, minutos, gols, assistências, cartões e lesão, e por time finalizações, no alvo, posse, cartões e pênaltis. Não há como saber o que um zagueiro ou um volante fez em campo, nem como o meio-campo jogou. Esta feature acrescenta quatro estatísticas por jogador, passes (tentados e certos), passes decisivos, desarmes (tentados e certos) e interceptações, sem mudar nada do que acontece nas partidas. Ela é a base da nota do jogador, que vem numa feature seguinte.

Decisões já tomadas com o usuário (2026-11-04):

- As estatísticas só **descrevem** a partida: não mudam o resultado. A mesma seed continua dando a mesma carreira.
- Só as partidas **completas** (simuladas minuto a minuto) geram as estatísticas.
- As quatro estatísticas entram juntas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver o que cada jogador fez na partida (Priority: P1)

Como técnico, depois de uma partida quero ver, para cada jogador dos dois times, quantos passes ele tentou e acertou, quantos passes decisivos deu, quantos desarmes tentou e acertou e quantas interceptações fez, para saber quem jogou bem além de quem fez gol.

**Why this priority**: é o valor principal da feature e o que prepara a nota do jogador. Sem as contagens por jogador, zagueiros e volantes continuam invisíveis.

**Independent Test**: jogar uma partida (ao vivo ou direto), abrir o resumo e conferir as quatro estatísticas de cada jogador que entrou em campo, nos dois times.

**Acceptance Scenarios**:

1. **Given** uma partida completa encerrada, **When** o técnico abre o resumo, **Then** cada jogador que entrou em campo, dos dois times, aparece com passes certos e tentados, passes decisivos, desarmes certos e tentados e interceptações.
2. **Given** um jogador que deu uma assistência, **When** o resumo é aberto, **Then** os passes decisivos dele são pelo menos o número de assistências.
3. **Given** um jogador que não entrou em campo, **When** o resumo é aberto, **Then** ele não aparece nas estatísticas por jogador.
4. **Given** o resumo de uma partida jogada antes desta versão (save antigo), **When** é aberto, **Then** o resumo abre como antes e diz, em texto, que as estatísticas de jogadas não existem para aquela partida, em vez de mostrar zeros.

---

### User Story 2 - Acompanhar o jogo do time ao vivo (Priority: P2)

Como técnico, durante a partida ao vivo quero ver, junto das estatísticas que já existem, os totais de passes, o aproveitamento de passe, os desarmes e as interceptações de cada time, para entender como o jogo está e decidir substituições.

**Why this priority**: complementa o painel de pressão e as estatísticas ao vivo, mas o técnico já tem informação para decidir sem isso.

**Independent Test**: iniciar uma rodada ao vivo, deixar correr e conferir que os totais dos dois times aparecem e só crescem ao longo do jogo; ao fim, eles batem com a soma das contagens dos jogadores no resumo.

**Acceptance Scenarios**:

1. **Given** uma rodada ao vivo em andamento, **When** o técnico olha as estatísticas do jogo, **Then** vê, para os dois times, passes certos e tentados, aproveitamento de passe, desarmes certos e interceptações, ao lado das que já existiam.
2. **Given** a partida avançando, **When** os minutos passam, **Then** os totais nunca diminuem.
3. **Given** a partida encerrada, **When** o resumo é aberto, **Then** os totais de cada time no resumo são exatamente a soma das contagens dos jogadores daquele time.

---

### User Story 3 - Números que se parecem com futebol (Priority: P2)

Como jogador do jogo, quero que os números façam sentido: um time troca centenas de passes por partida, acerta a maioria, quem tem mais posse passa mais, zagueiros e volantes desarmam e interceptam mais, meias passam mais e dão mais passes decisivos, e jogadores mais fortes acertam mais.

**Why this priority**: números absurdos desacreditam a feature e a futura nota do jogador.

**Independent Test**: simular milhares de partidas completas sem interação e conferir as faixas declaradas de realismo.

**Acceptance Scenarios**:

1. **Given** milhares de partidas simuladas, **When** as médias são medidas, **Then** passes por time, aproveitamento de passe, desarmes e interceptações por time ficam dentro das faixas declaradas.
2. **Given** as mesmas partidas, **When** as médias por posição da vaga são comparadas, **Then** zagueiros e volantes têm mais desarmes e interceptações por minuto do que meias e atacantes, e meias têm mais passes e mais passes decisivos por minuto do que zagueiros.
3. **Given** um time com mais posse, **When** a partida termina, **Then**, na média de muitas partidas, ele tem mais passes que o adversário.
4. **Given** dois jogadores na mesma vaga com forças diferentes, **When** muitas partidas são simuladas, **Then** o mais forte tem aproveitamento de passe maior.

---

### Edge Cases

- **Expulsão ou lesão sem substituição**: o jogador para de acumular estatísticas a partir do minuto em que sai de campo; o time com um a menos passa a ter menos passes, refletindo a posse menor.
- **Substituição**: quem sai e quem entra têm estatísticas só dos minutos que jogaram; os dois aparecem no resumo.
- **Troca de posição ou de esquema durante o jogo**: a partir do minuto da troca, as estatísticas seguem a nova vaga do jogador.
- **Jogador fora de posição**: rende como o motor já considera (adequação à vaga), o que reflete no aproveitamento de passe e nos desarmes.
- **Prorrogação**: os minutos da prorrogação também geram estatísticas; a disputa de pênaltis não gera.
- **Partida abandonada** (menos de sete jogadores): as estatísticas vão até o minuto do abandono.
- **Goleiro**: tem passes (principalmente reposições), poucos ou nenhum desarme e interceptação.
- **Partida da simulação resumida** (outras ligas): não tem estatísticas de jogadas; qualquer tela que mostre uma partida assim diz, em texto, que as estatísticas não existem, e nunca mostra zeros.
- **Save de versão anterior**: abre normalmente; as partidas já jogadas ficam sem estatísticas de jogadas, e as partidas novas passam a tê-las.

## Requirements *(mandatory)*

### Functional Requirements

**Geração**

- **FR-001**: Toda partida completa DEVE gerar, para cada jogador que esteve em campo, as contagens de passes tentados, passes certos, passes decisivos, desarmes tentados, desarmes certos e interceptações.
- **FR-002**: Os passes certos NÃO PODEM passar dos tentados, e os desarmes certos NÃO PODEM passar dos tentados.
- **FR-003**: Os passes decisivos de cada jogador DEVEM ser pelo menos as assistências dele, e o total de passes decisivos de um time NÃO PODE passar das finalizações do time.
- **FR-004**: As contagens DEVEM depender do que já acontece na partida minuto a minuto: a posse de cada lado (mais posse, mais passes do time), a força do jogador e a adequação dele à vaga (mais força, melhor aproveitamento de passe e de desarme), a posição da vaga (perfis diferentes para goleiro, zagueiro, lateral, volante, meia e atacante), a pressão do adversário (mais desarmes e interceptações para quem defende), o cansaço e quem está em campo naquele minuto.
- **FR-005**: Os desarmes e as interceptações de um time DEVEM vir da posse do adversário: um time que fica mais tempo sem a bola desarma e intercepta mais.

**Sem efeito no resultado**

- **FR-006**: A geração das estatísticas NÃO PODE mudar nenhum outro resultado da partida: gols, finalizações, cartões, lesões, pênaltis, substituições automáticas, acréscimos, prorrogação, disputa de pênaltis, posse e pressão por minuto.
- **FR-007**: A mesma seed DEVE continuar dando exatamente a mesma carreira de antes desta feature: todos os testes de linha de base existentes passam sem mudança.
- **FR-008**: As estatísticas DEVEM ser determinísticas: a mesma partida, com a mesma seed, gera exatamente as mesmas contagens, ao vivo ou direto, e depois de salvar e carregar.

**Onde existem**

- **FR-009**: Só as partidas completas DEVEM gerar estatísticas de jogadas; as partidas da simulação resumida NÃO as têm, e nada da simulação resumida muda.
- **FR-010**: O registro de cada partida completa DEVE guardar as contagens por jogador (não um evento por passe ou desarme).
- **FR-011**: Uma partida sem estatísticas de jogadas (simulação resumida ou save antigo) DEVE ser distinguível de uma partida com estatísticas zeradas.

**Save**

- **FR-012**: O formato do save DEVE ganhar uma nova versão com migração da anterior; um save da versão anterior DEVE abrir, e as partidas já jogadas ficam sem estatísticas de jogadas.
- **FR-013**: O crescimento do save causado pelas estatísticas DEVE respeitar os limites declarados do mundo grande (save no fim da temporada, no início da 31ª temporada e o arquivo exportado), sem afrouxar os limites.
- **FR-014**: Um save importado com estatísticas de jogadas inválidas (certos acima dos tentados, valores negativos ou não inteiros) DEVE ser rejeitado com mensagem clara, como os outros dados inválidos.

**Interface**

- **FR-015**: O resumo da partida DEVE mostrar, por jogador que entrou em campo dos dois times, as quatro estatísticas, com o aproveitamento de passe em percentual.
- **FR-016**: O resumo da partida DEVE mostrar os totais de cada time: passes certos e tentados, aproveitamento de passe, passes decisivos, desarmes certos e tentados e interceptações.
- **FR-017**: As estatísticas ao vivo DEVEM mostrar os totais dos dois times (passes certos e tentados, aproveitamento, desarmes certos, interceptações), atualizados a cada minuto como as que já existem.
- **FR-018**: Todo texto novo DEVE estar nas traduções; as tabelas novas DEVEM ser acessíveis por teclado e leitor de tela e ler bem nas larguras já suportadas, sem rolagem horizontal da página.

**Realismo**

- **FR-019**: DEVE haver faixas de realismo declaradas e verificadas por simulação longa, sem interação, para: passes por time por jogo, aproveitamento de passe por time, desarmes certos por time por jogo, interceptações por time por jogo e passes decisivos por time por jogo.
- **FR-020**: DEVE haver verificação por simulação de que zagueiros e volantes têm mais desarmes e interceptações por minuto do que meias e atacantes, de que meias têm mais passes e passes decisivos por minuto do que zagueiros, de que o time com mais posse passa mais e de que o jogador mais forte na mesma vaga tem aproveitamento de passe maior.

### Key Entities *(include if feature involves data)*

- **Estatísticas de jogadas de um jogador numa partida**: passes tentados, passes certos, passes decisivos, desarmes tentados, desarmes certos e interceptações. Inteiros não negativos, com certos ≤ tentados. Pertencem à linha do jogador no registro da partida e acumulam só os minutos em que ele esteve em campo.
- **Totais do time numa partida**: a soma das estatísticas dos jogadores do time, mais o aproveitamento de passe (passes certos ÷ tentados). Mostrados ao vivo e no resumo.
- **Faixas de realismo das jogadas**: limites numéricos declarados para as médias por time e por posição, verificados pela simulação longa (Princípio V).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em toda partida completa, 100% dos jogadores que entraram em campo têm as quatro estatísticas no resumo, com certos ≤ tentados e passes decisivos ≥ assistências.
- **SC-002**: Com as estatísticas ligadas, 100% dos testes de linha de base de carreira e de partida existentes passam sem nenhuma mudança (a mesma seed dá a mesma carreira).
- **SC-003**: Em milhares de partidas simuladas, as médias por time ficam nas faixas de referência do futebol: de 350 a 600 passes tentados, aproveitamento de passe de 72% a 88%, de 12 a 25 desarmes certos, de 6 a 16 interceptações e de 6 a 15 passes decisivos por time por jogo.
- **SC-004**: Nas mesmas partidas, zagueiros e volantes têm, por minuto jogado, pelo menos 1,5 vez os desarmes mais interceptações dos meias e atacantes, e meias têm pelo menos 1,3 vez os passes e os passes decisivos dos zagueiros.
- **SC-005**: Um save da versão anterior abre sem erro e sem perder dados, e as partidas novas dele passam a ter estatísticas.
- **SC-006**: O save do mundo grande continua dentro dos limites declarados de tamanho no fim da temporada, no início da 31ª temporada e no arquivo exportado.
- **SC-007**: O dia de jogos e a virada de temporada continuam dentro dos limites declarados de tempo do mundo grande, e a rodada ao vivo continua sem travamentos perceptíveis.

## Assumptions

- As faixas de referência do SC-003 são de futebol profissional real (médias de ligas nacionais) e podem ser ajustadas no plano, com justificativa, se o modelo do motor (posse por minuto e 90 minutos mais acréscimos) pedir; o que importa é que sejam declaradas e verificadas.
- O goleiro conta passes (reposições e passes curtos), mas não entra nas comparações por posição do SC-004.
- As estatísticas de jogadas não aparecem na tela do elenco, no histórico do jogador nem na artilharia nesta feature; acumulados da temporada ficam para a feature da nota do jogador.
- Não há narração de passes ou desarmes na linha do tempo nem no feed: só contagens.
- A simulação resumida das outras ligas continua igual; estendê-la é uma decisão futura, se a nota do jogador precisar de dados de todas as ligas.
- Nenhum formato de mod muda: as estatísticas não são configuráveis por mod nesta feature.
- A versão do jogo sobe junto com a entrega (com a correção das datas das notas de versão que já está na branch de origem).
