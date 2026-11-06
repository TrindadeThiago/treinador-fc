# Feature Specification: Reformulação da página Início

**Feature Branch**: `035-reformulacao-inicio`

**Created**: 2026-11-06

**Status**: Draft

**Input**: User description: "Reformulação da página Início da carreira (035), a partir da sugestão do artefato "Treinador FC — Nova Interface". Objetivo: a Início vira um painel que cabe numa tela (1440×900) em vez de uma página longa (~2.700 px). Pontos: (1) layout em grade, com o próximo jogo e a tabela lado a lado, e torcida/diretoria e manchetes embaixo; (2) cabeçalho com divisão, posição e temporada abaixo do nome do clube e o estado da janela de transferências à direita; (3) cartão do próximo jogo com os dois escudos frente a frente, a forma recente dos dois times, e três indicadores: força do time comparada com a do adversário, condição física média e número de desfalques, mais os botões Jogar rodada e Simular direto; (4) avisos "antes do jogo" lado a lado, em cartões compactos com uma ação cada; (5) cartão da posição na tabela com a posição em destaque, o link para a tabela e os últimos resultados com adversário, mando e placar colorido por vitória/empate/derrota (o saldo do caixa sai deste cartão); (6) torcida e diretoria num cartão compacto, sem as listas longas de motivos; (7) manchetes compactas: três itens com etiqueta de categoria, título curto e subtítulo, e o link para todas as notícias; (8) remover a lista completa de resultados da rodada do fim da página. Só interface: nenhum dado novo, nada muda no motor nem no save."

## Contexto

Hoje a Início empilha, em uma coluna, os blocos abaixo, e chega a cerca de 2.700 px de altura numa tela de 1440×900:
- próximo jogo;
- estado da janela de transferências, solto entre os cartões;
- avisos "antes do jogo";
- posição e caixa;
- últimos resultados;
- torcida, com a lista de motivos recentes;
- diretoria, com a lista de metas;
- manchetes;
- a lista completa de resultados da rodada.

Para ver o que importa antes do jogo, o técnico precisa rolar a página.

O artefato "Treinador FC — Nova Interface" sugere um painel em grade que cabe numa tela. Decisões tomadas com o usuário (2026-11-06):

- a reformulação segue o fluxo do Spec Kit e sai numa publicação separada da correção do calendário (1.7.4);
- a lista completa de resultados da rodada sai da Início, porque ela continua disponível na Competição.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver o essencial antes do jogo numa tela (Priority: P1)

Como técnico, ao abrir a Início quero ver numa tela só, sem rolar, o próximo jogo, a minha situação na tabela e as ações de jogar.

**Why this priority**: é o objetivo da reformulação. Hoje a página é longa e espalha a informação.

**Independent Test**: abrir a Início de uma carreira no meio da temporada numa janela de 1440×900. O cabeçalho, o próximo jogo com os botões de jogar e o cartão da posição devem estar visíveis sem rolar, lado a lado, e a página não deve passar da altura da janela.

**Acceptance Scenarios**:

1. **Given** uma carreira empregada com jogo pela frente e sem avisos, **When** o técnico abre a Início numa janela de 1440×900, **Then** todos os blocos da página cabem na altura da janela, sem rolagem vertical do conteúdo principal. Os blocos são: cabeçalho, próximo jogo, posição, torcida e diretoria, e manchetes.
2. **Given** a mesma carreira, **When** a Início abre, **Then** o próximo jogo e o cartão da posição ficam lado a lado na primeira linha, e torcida e diretoria e as manchetes ficam lado a lado na linha de baixo.
3. **Given** a mesma carreira, **When** a Início abre, **Then** a lista completa de resultados da rodada não aparece; ela continua na Competição.
4. **Given** uma janela estreita (largura de celular), **When** a Início abre, **Then** os blocos ficam um embaixo do outro, na ordem de importância (cabeçalho, próximo jogo, avisos, posição, torcida e diretoria, manchetes), sem rolagem horizontal.

---

### User Story 2 - Decidir o próximo jogo com mais contexto (Priority: P1)

Como técnico, quero ver no cartão do próximo jogo os dois times frente a frente e quem chega melhor, para decidir se jogo ao vivo, simulo ou mexo na escalação antes.

**Why this priority**: o cartão do próximo jogo é o centro da Início, e a decisão de jogar parte dele.

**Independent Test**: abrir a Início com um jogo marcado. O cartão deve mostrar os escudos e os nomes dos dois times, a forma recente de cada um, a força do meu time contra a do adversário, a condição física média do meu time e o número de desfalques, e os botões de jogar.

**Acceptance Scenarios**:

1. **Given** um jogo marcado, **When** a Início abre, **Then** o cartão mostra os dois clubes frente a frente, o mandante à esquerda e o visitante à direita, cada um com o escudo, o nome e a sua forma recente (até cinco resultados, do mais novo ao mais antigo, em texto e não só por cor).
2. **Given** o mesmo jogo, **When** a Início abre, **Then** o cartão mostra:
   - a competição, a fase ou rodada, a data e o mando;
   - o placar da ida, quando houver;
   - a marca de clássico, quando houver.
3. **Given** o mesmo jogo, **When** a Início abre, **Then** o cartão mostra três indicadores, cada um com o valor em texto e o rótulo:
   - **força**: a força do time escalado do técnico ao lado da do adversário;
   - **condição física média** dos titulares escalados;
   - **desfalques**: número de jogadores do elenco indisponíveis para o jogo (lesionados ou suspensos).
4. **Given** um time com desfalques, **When** o técnico olha o indicador de desfalques, **Then** há um caminho direto para a escalação.
5. **Given** a temporada encerrada, **When** a Início abre, **Then** o cartão mostra o fim da temporada (posição e divisão), o link para o fim de temporada e a ação de seguir para a próxima temporada, como hoje.
6. **Given** um clube sem mais jogos na temporada que ainda não acabou, **When** a Início abre, **Then** o cartão diz que não há mais jogos e oferece avançar até o fim, como hoje.

---

### User Story 3 - Entender os avisos sem perder espaço (Priority: P2)

Como técnico, quero ver os avisos de antes do jogo em cartões compactos, lado a lado, cada um com uma ação, para resolver o que importa sem a página crescer.

Os avisos são:
- recado da diretoria;
- propostas de emprego;
- crise financeira;
- mudanças no elenco;
- mercado: propostas, contratos perto do fim e relatório da janela;
- escalação ajustada.

**Why this priority**: os avisos aparecem só em parte das rodadas, mas hoje são o que mais alonga a página.

**Independent Test**: abrir a Início com pelo menos dois avisos ativos, por exemplo mercado e escalação ajustada. Os avisos devem aparecer lado a lado, cada um com um título curto, uma linha de detalhe e uma ação, e dispensar um deles deve tirá-lo da tela.

**Acceptance Scenarios**:

1. **Given** dois ou mais avisos ativos, **When** a Início abre numa janela larga, **Then** eles aparecem lado a lado, numa faixa logo abaixo do próximo jogo, cada um com o título, uma linha de detalhe e uma ação: abrir a tela certa ou dispensar.
2. **Given** um aviso dispensável, **When** o técnico o dispensa, **Then** ele some e os outros se reorganizam, como hoje.
3. **Given** nenhum aviso ativo, **When** a Início abre, **Then** a faixa de avisos não aparece e não ocupa espaço.
4. **Given** a crise financeira, **When** a Início abre, **Then** o aviso continua sendo anunciado ao leitor de tela como alerta.

---

### User Story 4 - Ver a situação na tabela e os resultados recentes (Priority: P2)

Como técnico, quero ver a minha posição em destaque e os últimos resultados, com adversário, mando e placar, para saber como o time vem.

**Why this priority**: é a segunda informação mais olhada antes do jogo, depois do próximo adversário.

**Independent Test**: abrir a Início depois de algumas rodadas. O cartão da posição deve mostrar a posição em destaque, um link para a tabela e os últimos resultados, cada um com o escudo e o nome do adversário, o mando e o placar, marcado como vitória, empate ou derrota.

**Acceptance Scenarios**:

1. **Given** uma carreira com resultados, **When** a Início abre, **Then** o cartão da posição mostra:
   - a posição em destaque;
   - um link "Ver tabela" para a Competição;
   - os últimos cinco resultados, do mais novo ao mais antigo.
2. **Given** um resultado, **When** ele aparece na lista, **Then** ele mostra:
   - o adversário (escudo e nome curto);
   - o mando;
   - a rodada ou a competição;
   - o placar, colorido por vitória, empate ou derrota, com a letra do resultado em texto.
3. **Given** uma carreira sem jogos ainda, **When** a Início abre, **Then** o cartão diz que ainda não há resultados.
4. **Given** a Início, **When** ela abre, **Then** o saldo do caixa não aparece no cartão da posição; o caixa continua nas Finanças.

---

### User Story 5 - Torcida, diretoria e manchetes de relance (Priority: P3)

Como técnico, quero ver numa olhada como estão a torcida e a diretoria e as principais manchetes, com o caminho para os detalhes.

**Why this priority**: é contexto da carreira e muda devagar. Hoje ocupa muito espaço com listas que o técnico já vê na Carreira e nas Notícias.

**Independent Test**: abrir a Início e conferir:
- um cartão com a torcida e a diretoria, cada uma com o valor, a barra, a tendência e uma linha de estado, e o link para a Carreira;
- um cartão com até três manchetes, cada uma com a etiqueta da categoria, o título e um subtítulo, e o link para todas as notícias.

**Acceptance Scenarios**:

1. **Given** um técnico empregado, **When** a Início abre, **Then** o cartão de torcida e diretoria mostra:
   - o apoio da torcida, em número e em barra, com a tendência em texto (subindo, estável ou caindo);
   - a confiança da diretoria, em número e em barra, com a tendência;
   - uma linha com o estado das metas da temporada;
   - o link para a Carreira.
2. **Given** o mesmo cartão, **When** a Início abre, **Then** as listas longas de motivos recentes da torcida e da diretoria não aparecem; elas continuam na Carreira.
3. **Given** uma rodada com manchetes, **When** a Início abre, **Then** o cartão de manchetes mostra no máximo três, das mais relevantes. Cada uma tem:
   - uma etiqueta de categoria em texto (por exemplo Diretoria, Torcida, Lesão, Mercado, Resultado);
   - o título;
   - uma linha de subtítulo.
4. **Given** o mesmo cartão, **When** a Início abre, **Then** há o link "Todas as notícias" para a tela de Notícias.
5. **Given** uma rodada sem manchetes, **When** a Início abre, **Then** o cartão diz que não há notícias.

---

### User Story 6 - Início do técnico desempregado (Priority: P3)

Como técnico sem clube, quero que a Início continue mostrando a minha reputação, as propostas e as ações de avançar, no mesmo estilo compacto.

**Why this priority**: é um estado menos comum, mas não pode quebrar com a reformulação.

**Independent Test**: abrir a Início de um técnico desempregado e conferir:
- a reputação;
- as propostas, com aceitar e recusar;
- as manchetes;
- os botões de jogar e de simular a rodada;
- quando a temporada acabou, o link para o fim de temporada e a ação de seguir.

**Acceptance Scenarios**:

1. **Given** um técnico desempregado, **When** a Início abre, **Then** o cabeçalho diz que ele está sem clube, com a reputação, e a página mostra:
   - as propostas de emprego;
   - as ações da rodada;
   - as manchetes.
2. **Given** o mesmo técnico, **When** a Início abre, **Then** a lista completa de resultados da rodada não aparece, como na Início do técnico empregado.

---

### Edge Cases

- **Muitos avisos ao mesmo tempo** (por exemplo seis): a faixa quebra em mais de uma linha. A página pode passar da altura da janela nesse caso, e nenhum aviso some.
- **Nomes longos de clube** no cabeçalho e no próximo jogo: quebram em linhas, sem cortar o texto e sem rolagem horizontal.
- **Jogo de copa com ida e volta**: o cartão mostra o placar da ida. Na fase de grupos ou na fase inicial de um estadual, mostra a fase em vez da rodada.
- **Adversário sem resultados ainda** (primeira rodada): a forma do adversário aparece vazia, com o texto "sem jogos".
- **Escalação incompleta** (menos de onze titulares disponíveis): os indicadores de força e de condição usam os titulares escalados disponíveis, e o de desfalques mostra o número real.
- **Janela de transferências fechada**: o cabeçalho mostra "janela fechada" e quando abre; aberta, mostra até quando vai.
- **Competição sem divisões** (liga única): o cabeçalho não mostra a divisão.
- **Rodada ao vivo em andamento**: os botões de jogar continuam bloqueados enquanto há simulação, como hoje.
- **Tema claro e escuro, e alto contraste**: as cores de vitória, empate e derrota e as barras mantêm contraste suficiente. A letra do resultado e os números ficam sempre em texto.
- **Larguras intermediárias** (tablet, cerca de 768 a 1100 px): a grade passa a duas colunas ou a uma, sem sobrepor blocos.

## Requirements *(mandatory)*

### Functional Requirements

**Estrutura**

- **FR-001**: A Início do técnico empregado DEVE ter:
  - um cabeçalho;
  - uma primeira linha com o próximo jogo e o cartão da posição, lado a lado;
  - a faixa de avisos, quando houver;
  - uma linha com o cartão de torcida e diretoria e o cartão de manchetes.
- **FR-002**: Numa janela de 1440×900, sem avisos, a Início DEVE caber na altura da janela, sem rolagem vertical do conteúdo principal.
- **FR-003**: Em larguras estreitas, os blocos DEVEM ficar um embaixo do outro, na ordem: cabeçalho, próximo jogo, avisos, posição, torcida e diretoria, manchetes. Nenhuma largura já suportada pode ter rolagem horizontal da página.
- **FR-004**: A lista completa de resultados da rodada NÃO DEVE aparecer na Início (empregado ou desempregado). Ela continua acessível na Competição.

**Cabeçalho**

- **FR-005**: O cabeçalho DEVE mostrar o nome do clube e, abaixo dele, numa linha, a divisão (quando a competição tiver divisões), a posição e a temporada.
- **FR-006**: O cabeçalho DEVE mostrar, à direita (embaixo em telas estreitas), o estado da janela de transferências, com a mesma informação que hoje aparece solta entre os cartões. Esse texto solto deixa de aparecer.

**Próximo jogo**

- **FR-007**: O cartão do próximo jogo DEVE mostrar:
  - os dois clubes frente a frente, o mandante à esquerda;
  - para cada clube, o escudo, o nome e a forma recente (até cinco resultados).
- **FR-008**: O cartão DEVE manter as informações de hoje:
  - competição, fase ou rodada, data com o dia da semana, e mando;
  - divisão, quando houver;
  - placar da ida, quando houver;
  - marca de clássico, quando houver.
- **FR-009**: O cartão DEVE mostrar três indicadores, com o valor e o rótulo em texto:
  - a força do time do técnico ao lado da força do adversário, as duas na mesma escala e calculadas da mesma forma;
  - a condição física média dos titulares escalados;
  - o número de desfalques (jogadores do elenco lesionados ou suspensos para aquele jogo), com um link para a escalação.
- **FR-010**: O cartão DEVE manter as ações e os estados de hoje:
  - jogar ao vivo e simular direto;
  - avançar até o fim, quando não há mais jogos;
  - fim de temporada e próxima temporada, quando a temporada acabou;
  - o aviso de simulação em andamento.

**Avisos**

- **FR-011**: Os avisos de antes do jogo DEVEM aparecer numa faixa de cartões compactos, lado a lado em telas largas, cada um com título, uma linha de detalhe e uma ação. Os avisos são:
  - recado da diretoria;
  - propostas de emprego;
  - crise financeira;
  - mudanças no elenco;
  - mercado;
  - escalação ajustada.
- **FR-012**: Cada aviso DEVE manter o comportamento de hoje:
  - quando ele aparece;
  - a ação de dispensar, quando existe;
  - o link para a tela relacionada;
  - o anúncio ao leitor de tela (status ou alerta).
  - Detalhes longos (por exemplo a lista de jogadores trocados na escalação) podem ficar resumidos na Início, desde que a ação leve à tela com o detalhe completo.
- **FR-013**: Sem avisos ativos, a faixa NÃO DEVE aparecer.

**Posição e resultados**

- **FR-014**: O cartão da posição DEVE mostrar a posição em destaque e um link para a tabela da Competição.
- **FR-015**: O cartão da posição DEVE listar os últimos cinco resultados do clube em todas as competições, do mais novo ao mais antigo. Cada resultado tem:
  - o escudo e o nome curto do adversário;
  - o mando;
  - a rodada (liga) ou o nome da competição;
  - o placar, colorido por vitória, empate ou derrota, com a letra do resultado em texto.
- **FR-016**: O saldo do caixa NÃO DEVE aparecer no cartão da posição.

**Torcida, diretoria e manchetes**

- **FR-017**: A torcida e a diretoria DEVEM ficar num só cartão compacto, com:
  - para cada uma, o valor em número, uma barra e a tendência em texto;
  - uma linha com o estado das metas da temporada (por exemplo "2 de 3 metas no caminho");
  - o link para a Carreira.
  - As listas de motivos recentes não aparecem na Início.
- **FR-018**: O cartão de manchetes DEVE mostrar no máximo três manchetes da última rodada, das mais relevantes. Cada uma tem uma etiqueta de categoria em texto, o título e uma linha de subtítulo. O cartão termina com o link para todas as notícias.

**Desempregado**

- **FR-019**: A Início do técnico desempregado DEVE usar o mesmo estilo compacto e mostrar:
  - um cabeçalho que diz que ele está sem clube, com a reputação;
  - o recado da diretoria, quando houver;
  - as propostas de emprego, com aceitar e recusar;
  - as ações da rodada e as de fim de temporada;
  - as manchetes.

**Escopo e qualidade**

- **FR-020**: A reformulação é só de interface:
  - nenhum dado novo é guardado;
  - o motor e o formato do save não mudam;
  - a mesma carreira mostra as mesmas informações de antes, só reorganizadas, mais os indicadores do próximo jogo, que derivam de dados que já existem.
- **FR-021**: Todo texto novo DEVE ficar nas traduções. A Início DEVE continuar navegável por teclado, com rótulos para o leitor de tela em cada cartão e indicador, e contraste suficiente nos temas claro e escuro. A cor nunca é a única forma de informar um resultado ou um valor.

### Key Entities *(include if feature involves data)*

Nenhuma entidade nova é guardada. A Início passa a mostrar valores derivados do que já existe:

- **Indicadores do próximo jogo**: força do time do técnico e do adversário, condição física média dos titulares escalados e número de desfalques. Calculados na hora a partir do elenco, da escalação, das lesões e das suspensões.
- **Forma recente do adversário**: os últimos resultados do adversário, a partir dos registros da temporada, como já é feito para o clube do técnico.
- **Categoria de uma manchete**: a etiqueta mostrada no cartão de manchetes, derivada do tipo da manchete que já existe.
- **Estado das metas**: o resumo, numa linha, das metas da temporada que já aparecem na Carreira.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Numa janela de 1440×900, sem avisos, a Início do técnico empregado tem altura total de no máximo 900 px. Hoje são cerca de 2.700 px.
- **SC-002**: O técnico vê o próximo adversário, a força dos dois times, a condição física, os desfalques e os botões de jogar sem rolar, em 100% das carreiras com jogo marcado, numa janela de 1440×900.
- **SC-003**: Nenhuma das larguras já verificadas nos testes de layout (incluindo 390 e 360 px) tem rolagem horizontal na Início.
- **SC-004**: 100% das informações e ações da Início atual continuam disponíveis, na Início ou a um clique dela. Isso vale para:
  - próximo jogo e ações de jogar;
  - avisos e suas ações;
  - posição e últimos resultados;
  - torcida, diretoria e metas;
  - manchetes;
  - propostas do desempregado;
  - fim de temporada.
- **SC-005**: Os testes de acessibilidade existentes da Início continuam passando, e cada cartão e indicador novo tem nome acessível.
- **SC-006**: Com a mesma carreira, os resultados, o save e os testes do motor ficam idênticos aos de antes da reformulação.

## Assumptions

- A **força** do time é a mesma medida que o jogo já usa para comparar times. O plano escolhe qual, com justificativa. Para o adversário, ela usa a escalação provável dele, porque a do computador não é conhecida antes do jogo.
- A **tendência** da torcida e da diretoria sai dos motivos recentes que já existem (soma das últimas mudanças): subindo, estável ou caindo.
- A **categoria** da manchete é derivada do tipo de manchete que já existe. Os tipos sem categoria clara ficam numa etiqueta genérica (por exemplo "Rodada").
- O **cabeçalho** da Início é da página. A barra de navegação do jogo não muda.
- Os **avisos compactos** mudam só a apresentação na Início. As telas de detalhe (Mercado, Escalação, Carreira, Finanças) não mudam.
- O critério de "cabe numa tela" vale para a janela de 1440×900 sem avisos. Com avisos, a página pode crescer o necessário.
- A versão do jogo sobe com a entrega (1.8.0), com a data do dia no horário de Brasília.
