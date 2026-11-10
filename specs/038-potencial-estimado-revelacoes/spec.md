# Feature Specification: Potencial estimado e revelações da base

**Feature Branch**: `038-potencial-estimado-revelacoes`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "Potencial estimado e revelações (038). Faixa de potencial estimado para os jovens e destaque para as revelações da base (ver docs/design.md §4 e §10; prompt em docs/speckit-prompts/marco11/prompt038.md). O potencial continua oculto, mas aparece como uma faixa (ex.: 68–84) para os jovens da base do próprio clube; a largura cai com o nível da academia (037) e com as temporadas na base; a faixa sempre contém o valor real, é determinística pela seed e não muda nenhum resultado (só informação, como a nota da 034). Depois de promovido, o jogador mantém a última faixa conhecida. Coluna da faixa na aba Base com ordenação e filtro por posição. Manchete da revelação da safra do meu clube e da divisão na virada; bloco Base no fim de temporada (quem chegou, subiu e saiu). Manchetes de cria da base: estreia no profissional, primeiro gol e venda. Histórico do clube: crias que subiram e maiores revelações (força máxima atingida). A faixa não vaza o potencial real na interface nem no save exportado de forma legível; medir em simulação que a faixa contém o valor real em 100% dos casos e que a largura média cai com o nível e o tempo; i18n e acessibilidade (nunca só por cor); nota e subida de versão minor no mesmo PR. Fora de escopo: olheiros e relatórios de outros clubes, faixa para o elenco principal inteiro, base em competições."

## Clarifications

### Session 2026-11-10

- Q: O sigilo no save cobre o quê? → A: Só o que a 038 cria. Faixas e registros novos não revelam o potencial real; os atributos ocultos que o save já guarda (JSON compactado) continuam como estão.
- Q: Quem é a revelação da safra? → A: O jovem da safra anterior (chegou na virada passada, ainda na base ou já promovido no clube formador) com a maior força atual. Só dados visíveis, nunca o potencial.

## Contexto

É a terceira e última feature do marco 11 (Categorias de base), depois da 036 (elenco de base, versão 1.9.0) e da 037 (academia, versão 1.10.0, calibrada na 1.10.1).

O que já existe e continua valendo:
- O potencial de cada jogador é um atributo oculto e fixo, definido quando o jogador é criado (design §4). Hoje ele não aparece em nenhum ponto da interface.
- A safra chega à base na virada; a quantidade e a qualidade dependem do nível da academia (1 a 5).
- A origem "cria da base" registra o clube e a temporada da promoção (036 FR-015).
- Só a base do clube do técnico é visível; a comparação da divisão mostra só o nível da academia (036 FR-014a, 037 FR-014).
- As manchetes são geradas por templates com variações, sem texto concatenado (design §10).
- A nota do jogador (034) é um exemplo de informação que não altera nenhum resultado do jogo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver a faixa de potencial dos jovens (Priority: P1)

Como técnico, quero ver uma estimativa do potencial de cada jovem da base do meu clube, para decidir quem promover e quem dispensar.

**Why this priority**: é o centro da feature. Sem a faixa, a escolha na base continua às cegas.

**Independent Test**: abrir Elenco → Base numa carreira nova e ver, para cada jovem, uma faixa de potencial (por exemplo, "68–84"), ordenar pela faixa e filtrar por posição.

**Acceptance Scenarios**:

1. **Given** uma carreira nova, **When** o técnico abre a aba Base, **Then** cada jovem mostra uma faixa de potencial estimado (mínimo–máximo), e o valor real está dentro dela.
2. **Given** a aba Base, **When** o técnico ordena pela coluna da faixa, **Then** os jovens ficam ordenados pela faixa (pelo valor central, e no empate pelo limite superior), nos dois sentidos.
3. **Given** a aba Base, **When** o técnico filtra por posição, **Then** só os jovens daquela posição aparecem, e a ordenação escolhida continua valendo.
4. **Given** um leitor de tela, **When** ele lê a coluna da faixa, **Then** ouve a faixa por extenso (por exemplo, "potencial estimado entre 68 e 84"), e nenhuma informação da faixa é passada só por cor.
5. **Given** o mesmo jovem, **When** o técnico abre a tela várias vezes na mesma temporada, ou recarrega o save, **Then** a faixa é sempre a mesma.

---

### User Story 2 - A estimativa melhora com o tempo e com a academia (Priority: P1)

Como técnico, quero que a estimativa fique mais confiável com o tempo do jovem na base e com uma academia melhor.

**Why this priority**: é o que liga a faixa ao investimento da 037 e dá motivo para esperar antes de decidir.

**Independent Test**: comparar, em simulação, a largura média das faixas no nível 1 com jovens recém-chegados e no nível 5 com jovens de dois anos de base.

**Acceptance Scenarios**:

1. **Given** um jovem recém-chegado, **When** passa uma virada e ele continua na base, **Then** a faixa nova é mais estreita ou igual e fica dentro da faixa anterior.
2. **Given** dois clubes iguais, um com academia nível 1 e outro nível 5, **When** os jovens recém-chegados são comparados, **Then** as faixas do nível 5 são, em média, mais estreitas.
3. **Given** a academia nível 5 e jovens com dois anos de base, **When** a largura média é comparada à do nível 1 com jovens recém-chegados, **Then** ela é visivelmente menor (ver SC-002).
4. **Given** a academia do clube muda de nível na virada (obra ou redução da 037), **When** o técnico olha a base depois da virada, **Then** a faixa de cada jovem continua contendo o valor real e nunca fica mais larga do que era.

---

### User Story 3 - A revelação da safra nas manchetes (Priority: P2)

Como técnico, quero saber, na virada, quem foi a grande revelação da safra do meu clube e da divisão: o jovem da safra que chegou um ano antes e que está mais forte agora.

**Why this priority**: transforma a base em história, mas depende da base e da faixa já existirem.

**Independent Test**: jogar até a virada e ver a manchete da revelação da safra do meu clube e da divisão.

**Acceptance Scenarios**:

1. **Given** a virada da temporada, **When** as manchetes saem, **Then** há uma manchete com a principal revelação da safra do meu clube e a principal revelação da safra da minha divisão, escolhidas pelo critério de FR-011.
2. **Given** o meu clube sem nenhum jovem elegível naquela safra, **When** as manchetes saem, **Then** só a revelação da divisão aparece, com um texto que não cita o meu clube.
3. **Given** que a revelação da divisão é do meu clube, **When** as manchetes saem, **Then** sai uma única manchete que diz isso, sem repetir o mesmo jovem duas vezes.
4. **Given** a manchete da revelação de outro clube, **When** o técnico a lê, **Then** ela mostra o nome, a posição, a idade, o clube e a força atual, e nunca o potencial ou uma faixa de potencial.

---

### User Story 4 - Bloco Base no fim de temporada (Priority: P2)

Como técnico, quero um resumo da base no fim de temporada: quem chegou, quem subiu e quem saiu.

**Why this priority**: fecha o ciclo da temporada da base num só lugar.

**Independent Test**: chegar ao fim de temporada e conferir o bloco Base no resumo.

**Acceptance Scenarios**:

1. **Given** o fim da temporada, **When** o técnico abre o resumo, **Then** há um bloco Base com três listas: os jovens que chegaram à base do meu clube na temporada, os que foram promovidos e os que saíram (dispensa ou idade), com os totais.
2. **Given** uma lista vazia (por exemplo, ninguém foi promovido), **When** o bloco aparece, **Then** a lista mostra um texto de "nenhum" em vez de sumir.
3. **Given** os jovens que chegaram, **When** o técnico olha o bloco, **Then** cada um mostra a faixa de potencial atual, se ainda estiver na base do meu clube.

---

### User Story 5 - Crias da base lembradas nas notícias e no histórico (Priority: P3)

Como torcedor do meu clube, quero que uma cria da base que vira titular seja lembrada nas notícias e no histórico.

**Why this priority**: dá memória à base, mas é complemento das histórias anteriores.

**Independent Test**: promover um jovem, escalá-lo, ver as manchetes de estreia e de primeiro gol, vendê-lo e ver a manchete da venda; depois abrir o histórico do clube.

**Acceptance Scenarios**:

1. **Given** uma cria da base do meu clube, **When** ela joga a primeira partida oficial pelo profissional do meu clube, **Then** sai uma manchete de estreia.
2. **Given** uma cria da base do meu clube, **When** ela marca o primeiro gol oficial como profissional pelo meu clube, **Then** sai uma manchete de primeiro gol (na mesma rodada da estreia, as duas viram uma manchete só ou duas que não se contradizem).
3. **Given** uma cria da base do meu clube, **When** o meu clube a vende, **Then** sai uma manchete de venda com o valor, formatado na moeda do clube.
4. **Given** o histórico do clube, **When** o técnico o abre, **Then** vê quantas crias da base o clube promoveu e a lista das maiores revelações, ordenada pela força máxima que cada uma atingiu na carreira, mesmo as que já saíram do clube ou se aposentaram.
5. **Given** um jogador promovido da base do meu clube, **When** o técnico abre o detalhe dele, **Then** vê a última faixa conhecida, marcada como "na promoção", mesmo depois de uma venda.

---

### User Story 6 - A faixa não muda o jogo nem entrega o segredo (Priority: P1)

Como jogador, quero que a faixa seja só informação: a mesma seed dá a mesma carreira com ou sem ela, e o valor real não aparece em lugar nenhum.

**Why this priority**: Princípio II (determinismo) e o objetivo de manter o potencial oculto.

**Independent Test**: rodar a mesma seed com a faixa ligada e desligada e comparar a carreira; buscar o potencial real na interface e no save.

**Acceptance Scenarios**:

1. **Given** a mesma seed, **When** a carreira é simulada com e sem a feature, **Then** partidas, safras, transferências, finanças e evolução são idênticas.
2. **Given** a interface inteira, **When** o técnico procura o potencial real de qualquer jogador, **Then** não o encontra: só aparecem faixas, e só para os jovens da base do clube dele e para as crias promovidas de lá.
3. **Given** uma faixa, **When** o técnico olha muitos jovens, **Then** a posição do valor real dentro da faixa não segue um padrão fixo (por exemplo, não está sempre no meio).

---

### Edge Cases

- **Faixa nos limites da escala**: a faixa nunca sai da escala de força do jogo (1 a 100) e nunca começa abaixo da força atual do jovem. Nesses casos ela pode ficar mais estreita, mas continua contendo o valor real.
- **Jovem que evolui além do limite inferior**: se a força atual passar do limite inferior da faixa, o limite inferior sobe até a força atual. A faixa continua contendo o valor real.
- **Técnico troca de clube** (demissão ou proposta aceita): a base do clube novo passa a mostrar faixas na hora, calculadas pelo nível da academia do clube novo e pelo tempo de cada jovem naquela base. As faixas da base antiga deixam de aparecer (a base de outros clubes é invisível).
- **Desempregado**: não há base própria e, portanto, nenhuma faixa nova; as crias promovidas antes mantêm a última faixa no detalhe.
- **Promovido por outro clube** (IA): não tem faixa, porque a base de outros clubes nunca foi visível.
- **Promoção de emergência** (036): o jovem promovido na hora mantém a faixa que tinha na base.
- **Jovem dispensado ou que sai por idade**: deixa a base e a faixa some; se outro clube o contratar, ele não leva faixa.
- **Revelação com empate**: o desempate é determinístico (FR-011), para a mesma seed dar a mesma manchete.
- **Safra sem jovens na divisão** (por exemplo, mod com divisão pequena): a manchete da divisão não sai.
- **Revelação que saiu do clube formador** (dispensada, vendida ou saiu por idade): deixa de ser elegível; a revelação é escolhida entre os jovens daquela safra que continuam no clube formador.
- **Primeira virada de uma carreira nova ou de um save migrado**: a safra anterior é a base inicial; os jovens dela entram como elegíveis.
- **Estreia ou gol em competição amistosa ou fora do profissional**: não conta; só partidas oficiais do profissional.
- **Cria vendida mais de uma vez**: a manchete de venda sai só na venda feita pelo meu clube; vendas posteriores entre outros clubes não geram manchete.
- **Histórico de saves antigos**: num save migrado da 1.10.x, as crias promovidas antes da 038 contam no total e nas revelações com o que o save já registra (origem, força atual); a força máxima começa a ser acompanhada a partir da migração.
- **Mod antigo**: sem campos novos; a feature usa os valores padrão.

## Requirements *(mandatory)*

### Functional Requirements

**Faixa de potencial**

- **FR-001**: Todo jovem da base do clube do técnico DEVE mostrar uma faixa de potencial estimado, com limite inferior e superior inteiros.
- **FR-002**: A faixa DEVE conter o potencial real em 100% dos casos, em qualquer momento.
- **FR-003**: A largura da faixa DEVE cair com o nível da academia do clube e com o número de viradas que o jovem passou na base daquele clube. Os valores (largura inicial por nível e quanto cai por virada) são regras do jogo, com valores padrão.
- **FR-004**: A posição do potencial real dentro da faixa DEVE variar de jovem para jovem, sem padrão fixo, para que a faixa não entregue o valor real.
- **FR-005**: Quando a faixa de um jovem muda (virada, troca de nível da academia, evolução da força), a faixa nova DEVE ficar dentro da anterior, com largura menor ou igual. A faixa nunca se alarga nem contradiz a anterior para o mesmo jovem no mesmo clube.
- **FR-006**: A faixa DEVE ser gerada de forma determinística a partir da seed da carreira e do jovem, e DEVE ser a mesma ao reabrir a tela ou o save.
- **FR-007**: Gerar e mostrar a faixa NÃO PODE alterar nenhum resultado do jogo: a mesma seed dá a mesma carreira com e sem a feature (partidas, safras, decisões da IA, mercado, finanças e evolução).
- **FR-008**: Depois de promovido da base do clube do técnico, o jogador DEVE manter no detalhe a última faixa conhecida, marcada como a faixa da promoção, mesmo depois de trocar de clube.

**Sigilo do potencial**

- **FR-009**: O potencial real NÃO PODE aparecer em nenhum ponto da interface, das manchetes, do histórico ou dos textos. Só a faixa aparece, e só para os jovens da base do clube do técnico e para as crias promovidas de lá (FR-008).
- **FR-010**: O save NÃO PODE ganhar nenhum dado novo que revele o potencial real de forma legível: o que a 038 guarda (faixas, registros de cria, força máxima) não contém nem deixa calcular o valor real. Os atributos ocultos que o save já guarda continuam como estão (decisão de 2026-11-10).

**Revelações e manchetes**

- **FR-011**: Na virada, o jogo DEVE escolher a principal revelação da safra do clube do técnico e a da divisão dele, usando só dados visíveis. A revelação é o jovem da safra que chegou na virada anterior (ainda na base ou já promovido, no clube formador) com a maior força atual. O desempate é determinístico: menor idade e, depois, ordem estável dos jogadores.
- **FR-012**: Na virada, DEVE sair uma manchete com a revelação da safra do clube do técnico e da divisão, conforme os cenários da US3, sem citar potencial nem faixa.
- **FR-013**: DEVEM existir manchetes de cria da base do clube do técnico para: estreia em partida oficial pelo profissional, primeiro gol oficial como profissional e venda pelo clube do técnico (com o valor na moeda do clube). Cada manchete sai uma única vez por jogador.
- **FR-014**: As manchetes novas DEVEM seguir o padrão do jogo: templates com frases completas e várias variações, plural e gênero, prontos para tradução, sem texto gerado em tempo de execução.

**Fim de temporada e histórico**

- **FR-015**: O resumo do fim de temporada DEVE ter um bloco Base com os jovens que chegaram à base do clube do técnico na temporada, os promovidos e os que saíram (por dispensa ou por idade), com o total de cada lista e um texto próprio quando a lista está vazia.
- **FR-016**: O histórico do clube DEVE mostrar quantas crias da base o clube promoveu e as maiores revelações (as 5 crias com maior força máxima atingida na carreira, com a força máxima, a temporada da promoção e o clube atual ou "aposentado").
- **FR-017**: O jogo DEVE acompanhar a força máxima atingida por cada cria da base ao longo da carreira, inclusive depois de sair do clube. A força máxima é medida na promoção e em cada virada; um pico no meio da temporada que caia antes da virada não é registrado.

**Interface e acessibilidade**

- **FR-018**: A aba Base DEVE ter a coluna da faixa, com ordenação (pelo valor central e, no empate, pelo limite superior) e filtro por posição.
- **FR-019**: Todo texto novo DEVE estar nas traduções, com plural e formatos pelo i18n. A faixa DEVE ter um rótulo por extenso para leitor de tela e nunca ser sinalizada só por cor.

**Dados, verificação e versão**

- **FR-020**: As regras da faixa (largura inicial por nível da academia e redução por virada na base) DEVEM ter valores padrão, ser opcionais no formato de mod e estar documentadas no `mod-format.md`. Mods antigos continuam válidos.
- **FR-021**: Uma simulação DEVE medir, em carreiras longas, que a faixa contém o valor real em 100% dos casos e que a largura média cai com o nível da academia e com o tempo na base.
- **FR-022**: O save DEVE guardar o que for preciso para a faixa da promoção, as crias e a força máxima. Um save da 1.10.x DEVE abrir e migrar sem perder nada.
- **FR-023**: A versão do jogo DEVE subir (minor) no mesmo PR, com a nota de versão do dia em Brasília.

### Key Entities *(include if feature involves data)*

- **Faixa de potencial estimado**: limite inferior e superior de um jovem, que dependem do potencial real, do nível da academia, das viradas na base e da seed; sempre contém o valor real e só encolhe.
- **Faixa da promoção**: a última faixa conhecida de um jogador promovido da base do clube do técnico, guardada com ele.
- **Revelação da safra**: o jovem escolhido na virada para o clube do técnico e para a divisão, pelo critério de FR-011.
- **Registro de cria**: o clube formador, a temporada da promoção e a força máxima atingida; alimenta o histórico do clube e as manchetes de estreia, primeiro gol e venda.
- **Regras da faixa**: largura inicial por nível da academia e redução por virada; têm valores padrão e podem vir do mod.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em simulação de carreiras longas, 100% das faixas mostradas contêm o potencial real, em todos os níveis de academia e tempos de base.
- **SC-002**: Com academia nível 5 e jovens de dois anos de base, a largura média da faixa é no máximo 60% da largura média com academia nível 1 e jovens recém-chegados.
- **SC-003**: A largura média cai a cada nível de academia (do 1 ao 5) e a cada virada na base (do recém-chegado aos dois anos), sem exceção na simulação.
- **SC-004**: Em 100% das faixas sucessivas do mesmo jovem no mesmo clube, a faixa nova fica dentro da anterior.
- **SC-005**: A mesma seed dá a mesma carreira com e sem a feature em 100% das comparações (resultados, safras, mercado, finanças e evolução idênticos).
- **SC-006**: Em 100% das viradas com jovens elegíveis na divisão, sai a manchete da revelação da safra; em 100% dos fins de temporada, aparece o bloco Base.
- **SC-007**: Em nenhuma tela, manchete ou texto aparece o potencial real de um jogador.
- **SC-008**: 100% dos saves da 1.10.x abrem, migram e chegam à virada seguinte sem erro.
- **SC-009**: O técnico encontra o jovem de maior faixa de uma posição em no máximo duas ações (filtrar e ordenar).

## Assumptions

- A faixa é só para a base do clube do técnico e para as crias promovidas de lá; olheiros e relatórios de outros clubes e a faixa para o elenco principal inteiro ficam fora (prompt).
- "Tempo na base" conta as viradas que o jovem passou na base do clube atual. Um jovem que chega na virada começa com zero.
- A largura inicial esperada é algo como 16 pontos no nível 1 e cai até algo como 6 pontos no nível 5 com dois anos de base; o plano calibra os valores para cumprir SC-002 e SC-003.
- A faixa usa uma fonte de sorte própria, derivada da seed e do jovem, separada da sorte do jogo, para cumprir FR-007. As linhas de base existentes não devem mudar por causa da faixa; se mudarem por outro motivo (por exemplo, o registro da força máxima no save), a mudança é justificada e regravada no mesmo PR.
- A IA continua decidindo promoções pelo valor real, como na 036 e na 037; a faixa não entra nas decisões da IA.
- As manchetes de estreia, primeiro gol e venda valem só para as crias do clube do técnico, para não encher o feed.
- O bloco Base e as manchetes da revelação seguem o clube do técnico no momento da virada ou do fim da temporada.
- A força máxima das crias é medida na promoção e a cada virada (FR-017). Um pico no meio da temporada que caia antes da virada só acontece com veteranos, que já registraram o pico antes.
- As maiores revelações do histórico mostram as 5 primeiras; o histórico vale para qualquer clube, com os dados que o jogo registra de todas as crias.
- A versão sobe de 1.10.1 para 1.11.0.
