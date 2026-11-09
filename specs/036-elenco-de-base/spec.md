# Feature Specification: Elenco de base

**Feature Branch**: `036-elenco-de-base`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "Elenco de base (036). Elenco de base (sub-20) separado do elenco profissional, para onde vão os jovens gerados na virada (ver docs/design.md §4, §5 e §14; AUDITORIA-v1.0.0.md, ideia 3; prompt em docs/speckit-prompts/marco11/prompt036.md). Objetivo: revelar jogadores vira uma decisão do técnico. Os jovens da virada chegam à base, e o técnico escolhe quem promove, quem espera e quem dispensa. Cada clube tem um elenco de base com limite de vagas; jogador da base não joga, não recebe salário, não conta para os limites do elenco e não entra no mercado; evolui como quem joga pouco; idade-limite sub-20 com aviso; promover a qualquer momento com contrato inicial; dispensar; a IA promove os melhores quando falta gente e o reequilíbrio dos elencos busca primeiro na base; clubes só de estadual também têm base; aba Base em Elenco e origem 'cria da base' no detalhe do jogador; aviso de mudanças do elenco separando chegadas à base, promoções e saídas por idade; save novo com migração. Determinismo com linhas de base regravadas, faixas do mundo mantidas em 30 temporadas, desempenho da virada dentro das metas da 020, i18n e acessibilidade, nota e subida de versão (minor) no mesmo PR. Fora de escopo: academia e investimento (037), potencial estimado e manchetes de revelação (038), base em competições, olheiros, venda ou empréstimo da base."

## Clarifications

### Session 2026-11-09

- Q: Quando a safra encontra a base do técnico cheia, o que acontece? → A: A base aceita a safra inteira e fica acima do limite. O técnico não joga a próxima partida até promover ou dispensar o suficiente para voltar ao limite (mesmo caminho do bloqueio da escalação inválida).

## Contexto

É a primeira feature do marco 11 (Categorias de base), que vem da ideia 3 da `AUDITORIA-v1.0.0.md` e do §14 do `design.md`. A 037 traz a academia com investimento e a 038, o potencial estimado e as revelações.

Hoje, na virada, cada clube recebe de 1 a 3 jovens de 16 a 18 anos, conforme a reputação, e eles entram direto no elenco principal. O reequilíbrio dos elencos também cria jovens do nada para completar os mínimos por posição e o mínimo total.

Decisões tomadas com o usuário (2026-11-09):

- A primeira entrega do marco é o **elenco de base separado**. A base não disputa partidas.
- A safra continua **uma vez por temporada, na virada**.
- Esta feature **não muda quantos jovens chegam nem a qualidade deles**. O nível da academia fica para a 037.
- O potencial continua **oculto** nesta feature. A faixa estimada fica para a 038.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver os jovens da base (Priority: P1)

Como técnico, quero ver os jovens da base do meu clube separados do elenco profissional, com idade, posição, força, características e até quando cada um pode ficar na base.

**Why this priority**: é a mudança central. Sem ela os jovens continuam caindo no elenco principal, e nenhuma decisão de base existe.

**Independent Test**: começar uma carreira, avançar até a primeira virada e abrir a aba Base do Elenco. Os jovens da safra estão lá, e não no elenco principal.

**Acceptance Scenarios**:

1. **Given** uma carreira nova, **When** a primeira virada termina, **Then** os jovens da safra do meu clube aparecem na aba Base, e nenhum deles aparece no elenco principal nem na escalação.
2. **Given** a aba Base aberta, **When** o técnico olha a lista, **Then** cada jovem mostra nome, idade, posição, força, características e a temporada em que precisa sair da base. O número de vagas ocupadas e o limite aparecem em texto.
3. **Given** a aba Base de uma carreira nova, antes da primeira virada, **When** ela é aberta, **Then** aparece um estado vazio explicando que os jovens chegam na virada.
4. **Given** a lista da base, **When** o técnico ordena por idade, posição ou força, **Then** a lista segue a ordem escolhida, como nas outras abas do Elenco.

---

### User Story 2 - Promover um jovem (Priority: P1)

Como técnico, quero promover um jovem ao elenco principal a qualquer momento da temporada, para usá-lo nos jogos.

**Why this priority**: sem promoção a base vira um depósito sem uso. É a ação que transforma a base em decisão.

**Independent Test**: no meio da temporada, promover um jovem, confirmar e escalá-lo na partida seguinte.

**Acceptance Scenarios**:

1. **Given** um jovem na base e vaga no elenco principal, **When** o técnico escolhe Promover e confirma, **Then** o jovem passa ao elenco principal, sai da base e pode ser escalado na partida seguinte.
2. **Given** a confirmação de promoção, **When** ela é exibida, **Then** mostra o salário e a duração do contrato inicial que o jovem vai assinar, para o técnico decidir sabendo o custo.
3. **Given** o elenco principal no máximo de jogadores, **When** o técnico tenta promover, **Then** a ação fica indisponível e uma mensagem explica que é preciso abrir vaga antes.
4. **Given** um jogador promovido, **When** o técnico abre o detalhe dele, **Then** aparece a origem "cria da base" do clube.
5. **Given** um jogador promovido, **When** a temporada segue, **Then** ele entra na folha de salários, no mercado e nas regras do elenco como qualquer jogador profissional.

---

### User Story 3 - Saída por idade com aviso (Priority: P2)

Como técnico, quero ser avisado quando um jovem chega ao último ano na base, para promovê-lo antes de perdê-lo.

**Why this priority**: sem o aviso o técnico perde jovens sem perceber. É a regra que força a decisão, mas depende da base existir (US1).

**Independent Test**: deixar um jovem chegar ao último ano na base sem promovê-lo, ver o aviso durante a temporada e conferir que ele sai na virada.

**Acceptance Scenarios**:

1. **Given** um jovem que vai passar da idade-limite na próxima virada, **When** o técnico abre a aba Base, **Then** ele aparece marcado em texto como "último ano".
2. **Given** jovens no último ano, **When** falta pouco para o fim da temporada, **Then** o jogo dá um aviso com quantos são e o caminho para a aba Base.
3. **Given** um jovem do meu clube que passou da idade-limite e não foi promovido, **When** a virada acontece, **Then** ele deixa o clube, e o aviso de mudanças do elenco o lista como "saiu da base por idade".
4. **Given** um jovem de um clube da IA que passou da idade-limite, **When** a virada acontece, **Then** o clube o promove, e o reequilíbrio dos elencos decide como com qualquer jogador.

---

### User Story 4 - Dispensar um jovem (Priority: P2)

Como técnico, quero dispensar um jovem que não vai vingar, para abrir vaga na base.

**Why this priority**: mantém a base útil quando ela enche, mas a saída por idade já resolve o caso comum.

**Independent Test**: dispensar um jovem, confirmar e ver a vaga liberada.

**Acceptance Scenarios**:

1. **Given** um jovem na base, **When** o técnico escolhe Dispensar e confirma, **Then** o jovem deixa o clube e a vaga na base fica livre.
2. **Given** a confirmação de dispensa, **When** ela é exibida, **Then** diz que a ação não pode ser desfeita.
3. **Given** a safra deixou a base do meu clube acima do limite, **When** tento jogar a próxima partida, **Then** o jogo impede, diz quantos jovens estão acima do limite e leva à aba Base.
4. **Given** a base acima do limite, **When** promovo ou dispenso até ela ficar no limite, **Then** consigo jogar a próxima partida normalmente.

---

### User Story 5 - Um mundo que continua saudável (Priority: P2)

Como jogador de carreiras longas, quero que a base não desequilibre o mundo: os clubes da IA continuam com elencos válidos, sempre há craques e promessas, e a idade média não sobe nem cai sem controle.

**Why this priority**: um mundo que se degrada em várias temporadas estraga o jogo (Princípio V), mas a falha só aparece em simulação longa.

**Independent Test**: simular 30 temporadas sem interação e conferir as faixas atuais do mundo e a validade dos elencos.

**Acceptance Scenarios**:

1. **Given** 30 temporadas simuladas sem interação, **When** o mundo é medido a cada temporada, **Then** a média de força, os percentis, os craques, as promessas, a idade média e o tamanho dos elencos ficam nas faixas atuais.
2. **Given** a mesma simulação, **When** cada clube é conferido em cada temporada, **Then** todos têm elenco principal válido (mínimos por posição e total) e base dentro do limite.
3. **Given** um clube da IA com falta de jogadores numa posição, **When** o reequilíbrio roda, **Then** o clube promove primeiro o melhor jovem da base naquela posição, e só cria um jogador novo se a base não tiver a posição.

---

### User Story 6 - Continuar uma carreira antiga (Priority: P3)

Como jogador com uma carreira salva na versão anterior, quero abri-la e continuar, e ter base a partir da próxima virada.

**Why this priority**: perder um save quebra a confiança (Princípio VI), mas é um caminho de migração e não de jogo.

**Independent Test**: abrir um save da versão anterior, avançar até a virada e ver os jovens chegarem à base.

**Acceptance Scenarios**:

1. **Given** um save da versão anterior, **When** ele é aberto, **Then** a carreira continua, cada clube tem uma base vazia e os jovens que já estão nos elencos ficam onde estão.
2. **Given** o save migrado, **When** a próxima virada acontece, **Then** a safra chega à base como numa carreira nova.

---

### Edge Cases

- **Base cheia na virada, clube da IA**: os jovens excedentes de menor utilidade (a mesma regra de utilidade do reequilíbrio dos elencos) deixam o clube, de forma automática e determinística.
- **Base cheia na virada, clube do técnico**: a safra entra inteira e a base fica acima do limite. O técnico não pode jogar a próxima partida até deixar a base dentro do limite, promovendo ou dispensando. O bloqueio segue o mesmo caminho da escalação inválida: uma mensagem diz quantos jovens estão acima do limite e leva à aba Base. As outras telas e ações (mercado, finanças, escalação) continuam disponíveis.
- **Elenco principal abaixo do mínimo, clube do jogador**: o reequilíbrio da virada promove primeiro o melhor jovem da base na posição carente, como na IA, e o aviso de mudanças do elenco lista a promoção como automática.
- **Promover com o elenco no máximo**: a ação fica indisponível com a explicação. Não há troca automática.
- **Promover durante a rodada ao vivo**: a ação não fica disponível durante uma partida em andamento, como as outras ações do elenco.
- **Jovem de 16 anos promovido**: pode ser promovido. Depois disso segue as regras do elenco principal e não volta à base.
- **Jogador dispensado da base**: deixa o clube. Se o mundo tiver jogadores livres no mercado, ele entra como livre pelas mesmas regras dos dispensados do reequilíbrio. O plano decide se isso vale para a base ou se ele sai do mundo.
- **Troca de clube do técnico** (demissão ou nova proposta): a base fica com o clube. O técnico passa a ver a base do clube novo.
- **Aposentadoria**: jogador da base nunca se aposenta (todos estão abaixo da idade mínima de aposentadoria).
- **Clubes só de estadual**: têm base e seguem as mesmas regras dos clubes das divisões nacionais.
- **Ligas de outros países com simulação resumida**: os clubes têm base pelas mesmas regras. Nada nas partidas resumidas muda, porque a base não joga.
- **Lesões e cartões**: não se aplicam à base, que não joga. Um jovem promovido começa sem suspensão nem lesão.

## Requirements *(mandatory)*

### Functional Requirements

**Elenco de base**

- **FR-001**: Todo clube do mundo DEVE ter um elenco de base, com um limite de vagas (cerca de 15), igual para todos os clubes.
- **FR-002**: Os jovens gerados na virada DEVEM chegar à base do clube, e não ao elenco principal. A quantidade, as idades, a força, o potencial e as características dos jovens da safra seguem as regras de hoje.
- **FR-003**: Jogador da base NÃO PODE ser escalado, ser relacionado para partidas, receber salário, contar para o mínimo ou o máximo do elenco principal, nem entrar em mercado, propostas, empréstimos ou listas de jogadores livres enquanto está na base.
- **FR-004**: Jogador da base DEVE evoluir nos mesmos momentos da evolução do mundo (meio e fim da temporada), com as mesmas regras de idade, tratado como um jogador sem minutos em partidas.
- **FR-005**: A base DEVE ter uma idade-limite (sub-20). Na virada, um jovem que estaria acima da idade-limite na nova temporada deixa a base: nos clubes da IA ele é promovido; no clube do técnico, se não foi promovido, deixa o clube.

**Ações do técnico**

- **FR-006**: O técnico DEVE poder promover um jovem da base do seu clube ao elenco principal a qualquer momento fora de uma partida em andamento, com confirmação.
- **FR-007**: O jovem promovido DEVE assinar o contrato inicial de profissional (salário e duração) pelas regras de contrato da competição do clube, e a confirmação DEVE mostrar esse salário e essa duração.
- **FR-008**: A promoção NÃO PODE deixar o elenco principal acima do máximo do clube do técnico. Quando estiver no máximo, a ação fica indisponível com uma explicação.
- **FR-009**: O técnico DEVE poder dispensar um jovem da base do seu clube, com confirmação que avisa que a ação não pode ser desfeita.
- **FR-009a**: Se a safra deixar a base do clube do técnico acima do limite, a base DEVE aceitar a safra inteira, e o jogo DEVE impedir a próxima partida até a base voltar ao limite. A mensagem do bloqueio diz quantos jovens estão acima do limite e leva à aba Base, e as demais telas e ações continuam disponíveis. A aba Base mostra o excesso em texto.
- **FR-010**: Durante a temporada, a aba Base DEVE marcar em texto os jovens no último ano, e o jogo DEVE dar um aviso antes do fim da temporada com quantos são.

**Clubes da IA e reequilíbrio**

- **FR-011**: Quando faltar jogador no elenco principal (mínimos por posição ou mínimo total), o reequilíbrio da virada DEVE promover primeiro o melhor jovem da base naquela posição, e só criar um jogador novo quando a base não tiver ninguém na posição. Isso vale para todos os clubes, inclusive o do técnico.
- **FR-012**: Quando a safra encontra a base de um clube da IA cheia, os excedentes de menor utilidade DEVEM deixar o clube, de forma determinística.
- **FR-013**: Os clubes da IA NÃO promovem jovens durante a temporada. As promoções da IA acontecem só na virada, por idade-limite ou por falta no elenco.

**Avisos e interface**

- **FR-014**: O Elenco DEVE ter uma aba Base com a lista dos jovens (nome, idade, posição, força, características, temporada em que precisa sair), as vagas ocupadas e o limite, ordenação e as ações Promover e Dispensar. Também DEVE ter um estado vazio desenhado.
- **FR-015**: O detalhe do jogador DEVE indicar a origem "cria da base" e o clube, para quem foi promovido da base de um clube.
- **FR-016**: O aviso de mudanças do elenco na virada e o fim de temporada DEVEM separar, para o clube do técnico: quem chegou à base, quem foi promovido (pelo técnico ou automaticamente), quem saiu da base por idade, quem foi dispensado e quem foi criado para completar o elenco.
- **FR-017**: Todo texto novo DEVE estar nas traduções, com plural e formatos pelo i18n. As novas telas e ações DEVEM ser acessíveis por teclado e leitor de tela, como as outras abas do Elenco, e a cor nunca pode ser o único sinal de "último ano".

**Determinismo, equilíbrio e saves**

- **FR-018**: A mesma seed DEVE dar a mesma carreira. As linhas de base por seed mudam de propósito com esta feature e são regravadas no mesmo PR, com a mudança explicada.
- **FR-019**: Os jogadores da base DEVEM entrar uma vez nas medidas do mundo (média de força, percentis, craques, promessas e idade média), sem dupla contagem.
- **FR-020**: O formato do save DEVE guardar a base de cada clube e a origem dos jogadores promovidos. Um save da versão anterior DEVE abrir e migrar, com bases vazias e os jogadores onde estão.
- **FR-021**: A versão do jogo DEVE subir (minor) no mesmo PR, com a nota de versão datada pelo dia de Brasília.

### Key Entities *(include if feature involves data)*

- **Elenco de base**: o conjunto de jovens de um clube que ainda não são profissionais, com limite de vagas. Pertence ao clube e não ao técnico.
- **Jovem da base**: um jogador do mundo (nome, idade, posição, força, características, potencial oculto) ligado à base de um clube. Não tem contrato profissional nem salário.
- **Idade-limite da base**: a idade a partir da qual o jovem não pode continuar na base na temporada seguinte. Dela vem a temporada em que cada jovem precisa sair.
- **Origem "cria da base"**: o registro de que um jogador profissional subiu da base de um clube, com o clube e a temporada da promoção.
- **Movimentos da base na virada**: chegadas à base, promoções (do técnico ou automáticas), saídas por idade, dispensas e jogadores criados para completar o elenco. Alimentam o aviso de mudanças do elenco e o fim de temporada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das viradas, todos os jovens da safra do clube do técnico estão na base, e nenhum está no elenco principal.
- **SC-002**: Um jovem promovido no meio da temporada pode ser escalado na partida seguinte em 100% dos casos com vaga no elenco.
- **SC-003**: 100% dos jovens do clube do técnico que saem da base por idade estavam marcados como "último ano" e foram contados no aviso antes do fim da temporada.
- **SC-004**: Em 30 temporadas simuladas sem interação, todo clube tem elenco principal válido e base dentro do limite em todas as temporadas. A média de força, os percentis, os craques, as promessas e a idade média ficam nas faixas já declaradas no teste de 30 temporadas.
- **SC-005**: Na mesma simulação, a quantidade de jogadores criados do nada para completar elencos cai em relação à versão atual, porque a base supre parte das faltas.
- **SC-006**: A virada do mundo padrão, com a base de todos os clubes, fica dentro das metas de tempo da 020.
- **SC-007**: 100% dos saves de teste da versão anterior abrem, migram e chegam à virada seguinte sem erro.
- **SC-007a**: Em 100% das viradas em que a safra enche a base do técnico além do limite, a próxima partida fica impedida até a base voltar ao limite, e nenhum jovem do técnico sai sem uma ação dele (exceto por idade-limite).
- **SC-008**: Promover ou dispensar um jovem leva no máximo três ações (escolher o jovem, a ação e confirmar), com o teclado ou o mouse.

## Assumptions

- A idade-limite é 20 anos: na virada sai da base quem tiver 20 anos ou mais na data de início da nova temporada. Como a safra chega com 16 a 18 anos, cada jovem fica de uma a quatro temporadas na base.
- O limite de vagas é 15 para todos os clubes. A 037 pode fazê-lo depender da academia.
- O contrato inicial do promovido usa as mesmas regras dos jovens que hoje chegam ao elenco (salário e duração da competição do clube, 010).
- "Utilidade" para escolher quem sai é a mesma regra que o reequilíbrio dos elencos já usa (força mais uma parte da margem até 22 anos).
- O jovem promovido não volta à base.
- O bloqueio por base acima do limite só se aplica ao clube do técnico e só depois da virada. Durante a temporada a base nunca passa do limite, porque nada entra nela fora da virada.
- Se o técnico for demitido ou trocar de clube com a base acima do limite, o clube antigo passa a seguir a regra da IA na virada seguinte, e o bloqueio deixa de valer para o técnico.
- Os jovens da base não aparecem na busca do mercado, nas listas de outros clubes nem nas notícias nesta feature. Manchetes de revelação ficam para a 038.
- Nenhuma regra nova entra no formato de mod nesta feature: limite de vagas e idade-limite ficam como regras do jogo, com valores padrão. A 037 decide se viram regras de mod.
- A versão sobe de 1.8.1 para 1.9.0.
