# Feature Specification: Empresários

**Feature Branch**: `042-empresarios`

**Created**: 2026-11-11

**Status**: Draft

**Input**: User description: "Empresários dos jogadores (042): quem decide aceitar ou não um contrato passa a ser também o empresário, que pede comissão e lembra como o clube o tratou (ver docs/design.md §9; AUDITORIA-v1.0.0.md, ideia 1; prompt em docs/speckit-prompts/marco13/prompt042.md). Empresários fictícios por país, gerados com a carreira pelo banco de nomes, com carteira de jogadores, ganância e influência; jovens que surgem entram na carteira de um empresário do país. Relação empresário × clube de 0 a 100, começando neutra: sobe com negócios e renovações, cai com rescisões, propostas recusadas depois de aceitas pelo jogador e negociações abandonadas, e volta devagar ao neutro. Na negociação de contrato (compra, livre, renovação), uma comissão paga uma vez na assinatura, na categoria nova 'Comissões', compensando por regra declarada parte do salário pedido e parte da falta de atração, com teto; a relação muda o quanto o empresário pede. A IA também paga comissão, sem relação. Telas no detalhe do jogador, na negociação e numa lista de empresários na aba Mercado; manchetes de rompimento e de negócio grande; regras opcionais no mod; save novo com migração determinística. Equilíbrio em sim:economy, 30 temporadas e continental em 3 seeds; comissão nunca volta ao clube; determinismo com linhas de base regravadas de propósito; desempenho da 020; i18n; nota e versão minor. Fora de escopo: empresário oferecendo jogadores, empresário do técnico, trocar de empresário, conflitos de interesse."

## Contexto

É a segunda feature do marco 13 (Mercado: cláusulas e empresários), depois da 041 (versão 1.14.0).

O que já existe e continua valendo:
- **Resposta do jogador ao contrato:**
  - **atração do clube:** a reputação mais um bônus pela divisão;
  - **exigência do jogador:** cresce com a força;
  - **recusa por falta de interesse:** quando a atração fica abaixo da exigência menos uma margem;
  - **salário pedido:** cresce com a diferença entre a exigência e a atração;
  - **resposta a um salário abaixo do pedido:** o jogador pede o salário dele uma vez, ou recusa se a oferta for baixa demais.
- **Negociações do técnico:** compra (clube, depois contrato), livre e renovação. A IA contrata livres, compra e renova os próprios jogadores pelas mesmas regras.
- **Rescisão (A9):** paga multa, o jogador vira livre e o clube não pode recontratá-lo logo.
- **Livro-caixa:** lançamentos por categoria, mostrados em Finanças.
- **Mundo:** países com banco de nomes (fictícios). Jogadores novos surgem pela safra das academias (036 a 038), pela captação (040) e pela renovação do mundo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Comissão para convencer um jogador (Priority: P1)

Como técnico, quero oferecer uma comissão ao empresário para baixar o salário pedido ou convencer um jogador que não teria interesse no meu clube.

**Why this priority**: é a nova alavanca da negociação e o centro da feature.

**Independent Test**: negociar um jogador que hoje recusaria por falta de interesse, oferecer comissão suficiente, ver o aceite e o lançamento em "Comissões".

**Acceptance Scenarios**:

1. **Given** um jogador sem interesse no clube do técnico, **When** o técnico abre a proposta de contrato, **Then** a tela mostra que ele não tem interesse e a comissão mínima que o empresário pede para levar a proposta adiante.
2. **Given** essa comissão mínima ou mais, **When** o técnico propõe o contrato, **Then** o jogador responde pela regra de salário de sempre (aceita, pede o salário dele ou recusa por salário baixo), e não mais por falta de interesse.
3. **Given** uma proposta aceita com comissão, **When** o contrato é assinado, **Then** a comissão sai do caixa uma única vez, na categoria "Comissões" do livro-caixa.
4. **Given** um jogador com interesse, **When** o técnico aumenta a comissão, **Then** a tela mostra, antes de propor, o salário pedido caindo pela regra declarada, até o teto.
5. **Given** uma comissão acima do teto que o empresário aceita trocar por salário, **When** o técnico a oferece, **Then** a tela avisa que o excedente não baixa mais o salário.

---

### User Story 2 - Saber quem é o empresário e a relação (Priority: P1)

Como técnico, quero saber quem é o empresário de um jogador e como está a relação dele com o meu clube.

**Why this priority**: sem ver o empresário e a relação, a alavanca e a reputação ficam invisíveis.

**Independent Test**: abrir o detalhe de jogadores de vários empresários e ver o nome, a faixa da relação e a comissão de referência.

**Acceptance Scenarios**:

1. **Given** qualquer jogador com contrato ou livre, **When** o técnico abre o detalhe ou a negociação, **Then** vê o nome do empresário e a relação com o clube em texto (por exemplo, "Relação: boa (68)"), nunca só por cor.
2. **Given** a aba Mercado, **When** o técnico abre a lista de empresários, **Then** vê os empresários com quem o clube já negociou, com a relação, a ganância e a influência em texto, o número de jogadores da carteira e o último negócio.
3. **Given** um empresário da lista, **When** o técnico o escolhe, **Then** vê os jogadores da carteira dele e pode abrir o detalhe de cada um.

---

### User Story 3 - A relação pesa nas próximas negociações (Priority: P2)

Como técnico, quero que tratar bem os empresários facilite as próximas negociações, e que rescisões e negociações desfeitas pesem contra.

**Why this priority**: transforma a comissão numa reputação de longo prazo.

**Independent Test**: rescindir com um jogador e, depois, negociar outro jogador do mesmo empresário; comparar a comissão pedida e a relação com as de antes.

**Acceptance Scenarios**:

1. **Given** uma contratação ou renovação concluída, **When** o contrato é assinado, **Then** a relação com o empresário sobe pelo valor declarado.
2. **Given** uma rescisão de um jogador do empresário, **When** ela acontece, **Then** a relação cai pelo valor declarado, e nas negociações seguintes o empresário pede mais comissão (o detalhe mostra a relação nova).
3. **Given** uma negociação em que o jogador pediu um salário e o técnico recusou, ou uma negociação que o técnico cancela na etapa do contrato (cancelamentos automáticos, como janela fechada, prazo vencido ou elenco cheio, não contam), **When** ela se encerra, **Then** a relação cai pelo valor declarado para cada caso.
4. **Given** uma relação acima ou abaixo do neutro, **When** passam viradas de temporada sem negócios, **Then** ela volta devagar ao neutro.
5. **Given** a relação chega ao mínimo, **When** isso acontece, **Then** o empresário rompe com o clube: sai uma manchete, e enquanto a relação estiver no mínimo ele pede a comissão no teto (a negociação nunca é bloqueada; decisão de 2026-11-11).

---

### User Story 4 - A IA também paga comissões (Priority: P2)

Como jogador, quero que o mundo siga as mesmas regras: os clubes da IA também pagam comissão nas contratações e renovações deles.

**Why this priority**: a economia é fechada e igual para todos (design §8); sem isso, o técnico pagaria um custo que a IA não paga.

**Independent Test**: simular temporadas e ver lançamentos em "Comissões" nos clubes da IA, sem nenhuma relação registrada para eles.

**Acceptance Scenarios**:

1. **Given** uma contratação ou renovação de um clube da IA, **When** ela se conclui, **Then** o clube paga a comissão de referência do empresário, pela mesma regra, na categoria "Comissões".
2. **Given** os clubes da IA, **When** negociam, **Then** não há relação com empresários registrada para eles.
3. **Given** 30 temporadas sem interação, **When** o mundo é medido, **Then** o caixa da IA, as faixas do mundo e o volume de transferências ficam dentro dos limites atuais.

---

### User Story 5 - Empresários no noticiário (Priority: P3)

Como torcedor do meu clube, quero saber quando um empresário rompe com o clube ou quando o clube fecha um negócio grande com ele.

**Why this priority**: dá narrativa à relação, mas não é essencial para negociar.

**Independent Test**: provocar um rompimento e um negócio com comissão alta e conferir as manchetes.

**Acceptance Scenarios**:

1. **Given** o rompimento de um empresário com o clube do técnico, **When** acontece, **Then** sai uma manchete com o nome do empresário e o motivo do último desgaste.
2. **Given** um negócio do clube do técnico com comissão acima do valor relevante declarado, **When** é assinado, **Then** sai uma manchete com o empresário, o jogador e a comissão.

---

### Edge Cases

- **Jogador livre:** continua na carteira do empresário. Contratar um livre também envolve o empresário.
- **Jogador que surge no mundo** (safra, captação, regulador, emergência): entra na carteira de um empresário do país de nacionalidade dele, por uma regra determinística. Um jovem da base sem contrato já tem empresário.
- **País sem empresários** (mod com zero): os jogadores desse país não têm empresário, e a negociação segue a regra de hoje, sem comissão.
- **Aposentadoria:** o jogador sai da carteira.
- **Troca de clube do técnico:** a relação é com o clube, não com o técnico. No clube novo, as relações começam neutras; as do antigo ficam guardadas para ele.
- **Desempregado:** não há negociação; a lista de empresários não aparece.
- **Comissão e venda posterior:** a comissão paga nunca volta ao caixa. Uma venda, uma rescisão ou o fim do contrato não devolvem nada.
- **Comissão maior que o caixa:** a proposta fica indisponível, com o motivo, como uma compra sem caixa.
- **Renovação:** a renovação também tem comissão. A relação sobe quando ela é concluída.
- **Negociação que o clube vendedor recusa:** não mexe na relação com o empresário. Só as etapas do contrato com o jogador contam.
- **Jovem da base:** o detalhe mostra o empresário dele, como o de um profissional.
- **Empréstimo:** não tem comissão nem mexe na relação.
- **Mod antigo:** sem os campos novos, valem os padrões.

## Requirements *(mandatory)*

### Functional Requirements

**Empresários e carteiras**

- **FR-001**: Cada país DEVE ter um número declarado de empresários fictícios (por padrão, 8), gerados com a carreira e com nomes do banco de nomes do país. Cada empresário tem:
  - **ganância:** de 1 a 5; define a comissão de referência;
  - **influência:** de 1 a 5; define quanto a comissão consegue mudar a decisão do jogador.
- **FR-002**: Todo jogador do mundo (com contrato, livre ou da base) DEVE estar na carteira de exatamente um empresário do país da nacionalidade dele, quando o país tem empresários. A distribuição dos jogadores existentes e a dos que surgem são determinísticas.

**Relação**

- **FR-003**: A relação de cada empresário com o clube do técnico DEVE ir de 0 a 100, começando em 50 (neutra).
- **FR-004**: A relação DEVE mudar por valores declarados:
  - **sobe:** com contratações concluídas (compra ou livre) e com renovações;
  - **cai:** com rescisões, com o técnico recusando o salário pedido pelo jogador e com negociações abandonadas pelo técnico na etapa do contrato.
- **FR-005**: A cada virada, a relação DEVE se aproximar do neutro por um valor declarado, sem passar dele.
- **FR-006**: A relação só existe com o clube do técnico. Os clubes da IA NÃO PODEM ter relação registrada.
- **FR-007**: A relação no mínimo (0) DEVE contar como rompimento: sai a manchete, e enquanto a relação estiver em 0 o empresário pede a comissão no teto. O rompimento nunca bloqueia a negociação; a relação volta a subir pelos negócios e pelo retorno ao neutro.

**Comissão na negociação**

- **FR-008**: A proposta de contrato (compra, livre e renovação) DEVE aceitar uma comissão, paga uma única vez na assinatura, na categoria nova "Comissões" do livro-caixa.
- **FR-009**: A regra da comissão DEVE ser declarada:
  - **comissão de referência:** pela ganância e pelo salário pedido;
  - **efeito da relação:** a comissão pedida aumenta com relação ruim e diminui com relação boa;
  - **troca por salário:** acima da comissão de referência, cada parte da comissão baixa o salário pedido, até um teto declarado;
  - **troca por interesse:** a comissão cobre parte da falta de atração do clube, até um teto declarado pela influência. Um jogador sem interesse passa a responder pela regra de salário quando a comissão alcança a comissão mínima mostrada.
- **FR-010**: A troca de comissão por salário NÃO PODE ser vantajosa: o salário economizado ao longo do contrato DEVE ser sempre menor ou igual à parte da comissão que o compra.
- **FR-011**: Sem comissão, ou com a comissão de referência, a resposta do jogador DEVE ser a de hoje.
- **FR-012**: Os clubes da IA DEVEM pagar a comissão de referência nas contratações e renovações deles, pela mesma regra, sem efeito de relação.

**Telas e narrativa**

- **FR-013**: O detalhe do jogador e a negociação DEVEM mostrar o empresário e a relação em texto. A negociação mostra também:
  - o campo de comissão;
  - o salário pedido com a comissão escolhida;
  - a comissão mínima, quando o jogador não tem interesse.
- **FR-014**: A aba Mercado DEVE ter a lista dos empresários com quem o clube negociou, com a relação, a ganância, a influência, o tamanho da carteira, o último negócio e os jogadores da carteira.
- **FR-015**: DEVEM sair manchetes no rompimento de um empresário com o clube do técnico e nos negócios do clube do técnico com comissão acima de um valor relevante declarado.
- **FR-016**: Todo texto novo DEVE passar pelo i18n, com plural e formatos de dinheiro.

**Dados, equilíbrio e versão**

- **FR-017**: DEVEM ser regras com valores padrão, opcionais no formato de mod e documentadas:
  - o número de empresários por país;
  - as faixas de ganância e influência;
  - a comissão de referência e os pesos;
  - os tetos;
  - os efeitos da relação e os valores de subida, queda e retorno ao neutro;
  - o limiar da manchete.
- **FR-018**: O save DEVE guardar as relações e os últimos negócios com empresários. Os empresários e as carteiras DEVEM poder ser reconstruídos sempre iguais a partir do save (seed da carreira e banco do save), sem consumir a sorte do jogo. Um save da 1.14.x DEVE abrir, ter todos os jogadores com empresário (quando o país tem empresários) e continuar a carreira.
- **FR-019**: Como a IA passa a pagar comissões, as linhas de base de determinismo mudam de propósito e são regravadas no mesmo PR. A mesma seed continua dando a mesma carreira.
- **FR-020**: O equilíbrio DEVE ser medido:
  - no `sim:economy` e no teste de 30 temporadas: o caixa da IA, as faixas do mundo e as transferências dentro dos limites atuais;
  - a competição continental completa em 3 seeds, como na 037.
- **FR-021**: O desempenho DEVE ficar dentro das metas da 020 (dia, virada, tamanho do save) no mundo padrão e no mundo grande.
- **FR-022**: A versão do jogo DEVE subir (minor) no mesmo PR, com a nota de versão do dia em Brasília.

### Key Entities *(include if feature involves data)*

- **Empresário**: pessoa fictícia de um país. Tem nome, ganância, influência e a carteira de jogadores.
- **Carteira**: o vínculo de cada jogador com um empresário, determinado pelo jogador e pela carreira; não muda enquanto o jogador existir.
- **Relação**: de 0 a 100, entre um empresário e o clube do técnico. Guarda o valor atual e o último motivo de mudança.
- **Comissão**: o valor pago uma vez na assinatura de um contrato, ao empresário do jogador. Sai do caixa do clube e não volta.
- **Regras dos empresários**: o número por país, as faixas, a comissão de referência, os pesos, os tetos, os efeitos da relação e o limiar da manchete. Têm valores padrão e podem vir do mod.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um jogador que recusaria o clube do técnico por falta de interesse responde pela regra de salário quando o técnico oferece a comissão mínima mostrada. Na assinatura, o caixa paga essa comissão em "Comissões".
- **SC-002**: Depois de uma rescisão, a comissão pedida pelo empresário do jogador rescindido, para um mesmo jogador, é maior que antes, e a relação mostrada é menor.
- **SC-003**: Em 100% das negociações geradas pelos testes de propriedade, o salário economizado ao longo do contrato nunca passa da comissão que o comprou, e nenhuma operação devolve comissão ao clube.
- **SC-004**: Em 30 temporadas sem interação, o caixa da IA, as faixas do mundo e o volume de transferências ficam dentro dos limites atuais, e a competição continental completa fecha em 3 seeds.
- **SC-005**: O dia de jogos, a virada e o tamanho do save ficam dentro das metas da 020.
- **SC-006**: 100% dos saves da 1.14.x abrem, migram (todo jogador com empresário, quando o país tem empresários) e chegam à virada seguinte sem erro.

## Assumptions

- **Destino da comissão:** ela sai do mundo, como o salário. Não há caixa de empresário.
- **Empresário por país:** é o do país de nacionalidade do jogador, mesmo quando ele joga em outro país.
- **Relação e técnico:** a relação é com o clube, como nas cláusulas da 041.
- **Padrões iniciais** (a calibrar no plano pelo `sim:economy`):
  - 8 empresários por país;
  - ganância e influência de 1 a 5;
  - relação +5 por contratação, +3 por renovação, −15 por rescisão, −8 por salário pedido recusado, −4 por negociação abandonada e 5 pontos de volta ao neutro por virada.
- **IA sem barganha:** a IA paga sempre a comissão de referência e não troca comissão por salário. Assim a decisão dela continua determinística e simples.
- **Neutralidade:** esta feature não promete carreira igual à anterior, porque as comissões da IA mudam a economia de propósito.
