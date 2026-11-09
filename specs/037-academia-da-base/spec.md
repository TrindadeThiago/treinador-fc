# Feature Specification: Academia e investimento na base

**Feature Branch**: `037-academia-da-base`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "Academia e investimento na base (037). Nível de academia por clube (1 a 5), com obra e custo de manutenção, que decide quantos jovens chegam à base e com que qualidade. Clubes da IA: nível pela reputação, sem investir; clube do técnico: começa pela reputação e muda só pelas decisões dele. Melhorar: custo único na hora, obra pronta na virada seguinte, uma obra por vez, sem pular nível; baixar vale na virada seguinte, sem devolução. Manutenção mensal por nível numa categoria nova do livro-caixa, para todos os clubes, na previsão, no resumo e nas metas financeiras. Custos na escala de cada país. Safra por nível (quantidade e qualidade), reputação com menos peso, regulador por cima; bônus de evolução na base pelo nível. Painel da academia na aba Base com comparação da divisão. Regras de mod opcionais com padrões. Save novo com migração. Equilíbrio: faixas do mundo e critérios da 036 mantidos, caixa da IA saudável, continental em 3 seeds; investir no máximo rende mais que não investir em 10 temporadas sem virar máquina de dinheiro (sim:economy). Determinismo, linhas de base regravadas, i18n, nota e subida de versão minor. Fora de escopo: IA investindo, olheiros, outras estruturas, faixa de potencial (038)."

## Clarifications

### Session 2026-11-09

- Q: O limite de vagas da base muda com o nível da academia? → A: Sim. Níveis 1 a 3 têm 15 vagas, o nível 4 tem 20 e o nível 5 tem 25.
- Q: Como a base começa? → A: Todo clube começa com a base cheia, com 15 jovens (a quantidade-base da categoria). Isso vale para as carreiras novas e para os saves migrados.
- Q: Quanto a academia pesa no caixa? → A: Moderado. A manutenção mensal vai de cerca de 2% da folha salarial (nível 1) a 10% (nível 5), e a obra para subir um nível custa de 2 a 6 folhas mensais, crescendo com o nível de destino.
- Q: O que o painel mostra sobre o efeito do nível? → A: A quantidade de jovens por safra em número e a qualidade numa escala de texto (modesta, boa, muito boa, excelente, de elite), com o efeito do próximo nível ao lado para comparar. Força e potencial esperados não aparecem em número.
- Q: O que acontece com a academia do clube que o técnico deixou? → A: Sem técnico, o clube segue a regra da IA: a partir da virada seguinte, o nível anda um degrau por virada até o nível que a reputação dá. Uma obra já paga ainda termina, e uma redução pendente é cancelada.

## Contexto

É a segunda feature do marco 11 (Categorias de base), depois da 036 (versão 1.9.0), que criou o elenco de base.

Hoje, a quantidade de jovens da safra depende da reputação do clube: 1 jovem, mais 1 por degrau de reputação atingido (45 e 70), ou seja, de 1 a 3. A qualidade também depende da reputação, com o ajuste do regulador do mundo por cima.

Regras da 036 que continuam valendo:
- A safra chega à base, com até 15 vagas, sub-20.
- O jogo não cria jogadores direto no elenco de nenhum clube.
- A IA promove da base só até o mínimo do elenco (22) e completa com livres. A safra de emergência é a garantia final.
- O técnico completa o próprio elenco à mão. Há bloqueio antes da partida e uma saída de emergência quando não há candidatos.
- As medidas da 036 estão em `specs/036-elenco-de-base/research.md` (I1 a I7). A calibragem mostrou que a economia dos clubes só de estadual e a competição continental são sensíveis a mudanças na safra.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver a academia do clube (Priority: P1)

Como técnico, quero ver o nível da academia do meu clube, o que ele rende (quantos jovens por safra e de que qualidade) e quanto custa por mês.

**Why this priority**: sem enxergar a academia, o técnico não tem como decidir investir. É a base das outras histórias.

**Independent Test**: abrir Elenco → Base numa carreira nova e ver o painel da academia com o nível, o custo mensal e o efeito esperado.

**Acceptance Scenarios**:

1. **Given** uma carreira nova, **When** o técnico abre a aba Base, **Then** a base já tem 15 jovens, e o painel da academia mostra o nível atual (de 1 a 5), o custo mensal de manutenção e o efeito esperado do nível: a faixa de jovens por safra em número e a qualidade em texto (modesta, boa, muito boa, excelente ou de elite), com o efeito do próximo nível ao lado.
2. **Given** o painel da academia, **When** o técnico olha a manutenção, **Then** o valor aparece em dinheiro na escala do país do clube.
3. **Given** um clube de reputação alta e outro de reputação baixa em carreiras novas, **When** o técnico abre a academia de cada um, **Then** o clube de reputação alta começa com nível maior ou igual ao do de reputação baixa.

---

### User Story 2 - Melhorar a academia (Priority: P1)

Como técnico, quero mandar melhorar a academia sabendo o custo da obra, quando ela fica pronta e o efeito no caixa.

**Why this priority**: é o centro do dilema financeiro que a feature cria.

**Independent Test**: melhorar a academia, ver o custo sair do caixa e a obra em andamento, e conferir na virada que o nível subiu e a safra mudou.

**Acceptance Scenarios**:

1. **Given** a academia no nível N (menor que 5) e caixa suficiente, **When** o técnico escolhe Melhorar, **Then** a confirmação mostra o custo da obra, o novo custo mensal, quando a obra fica pronta (na virada da temporada) e o caixa depois do pagamento.
2. **Given** a confirmação, **When** o técnico confirma, **Then** o custo da obra sai do caixa na hora, aparece no livro-caixa e o painel mostra a obra em andamento até a virada.
3. **Given** uma obra em andamento, **When** chega a virada, **Then** o nível passa a N+1 antes da safra, e a safra dessa virada já usa o nível novo.
4. **Given** uma obra em andamento, **When** o técnico olha as ações, **Then** Melhorar e Baixar ficam indisponíveis, com a explicação de que há uma mudança pendente.
5. **Given** o caixa menor que o custo da obra, **When** o técnico tenta melhorar, **Then** a ação fica indisponível e a mensagem diz quanto falta.
6. **Given** a academia no nível 5, **When** o técnico abre o painel, **Then** não há ação Melhorar, e o texto diz que o nível é o máximo.

---

### User Story 3 - Baixar a academia para cortar gastos (Priority: P2)

Como técnico de um clube em crise, quero baixar o nível da academia para reduzir o custo mensal.

**Why this priority**: é a válvula de escape do investimento, e depende de a academia já existir (US1).

**Independent Test**: baixar a academia e ver, na virada, o nível cair e a manutenção diminuir.

**Acceptance Scenarios**:

1. **Given** a academia no nível N (maior que 1), **When** o técnico escolhe Baixar, **Then** a confirmação diz que o nível cai para N-1 na virada, mostra o novo custo mensal e avisa que nenhum dinheiro investido volta.
2. **Given** uma redução confirmada, **When** chega a virada, **Then** o nível passa a N-1 antes da safra, e a manutenção nova vale a partir da temporada que começa.
3. **Given** uma redução pendente, **When** o técnico abre o painel, **Then** ele vê a redução marcada e pode cancelá-la até a virada, sem custo.

---

### User Story 4 - Comparar com a divisão (Priority: P3)

Como técnico, quero comparar a academia do meu clube com a dos outros clubes da divisão.

**Why this priority**: ajuda a decidir, mas não é essencial para investir.

**Independent Test**: abrir a comparação no painel e ver o nível de cada clube da divisão.

**Acceptance Scenarios**:

1. **Given** o painel da academia, **When** o técnico abre a comparação, **Then** vê uma lista dos clubes da divisão com o nível da academia de cada um, o próprio clube destacado em texto, ordenada pelo nível.
2. **Given** a comparação, **When** o técnico a lê, **Then** ela mostra só o nível. Os jovens da base dos outros clubes continuam invisíveis (036 FR-014a).

---

### User Story 5 - A academia faz diferença (Priority: P2)

Como jogador de carreiras longas, quero que investir na academia valha a pena: com o tempo, uma academia melhor traz mais jovens e jovens melhores. Ao mesmo tempo, não deve virar um jeito garantido de ganhar dinheiro.

**Why this priority**: sem efeito mensurável, o investimento é só uma despesa; com efeito exagerado, quebra a economia.

**Independent Test**: simular carreiras de 10 temporadas com a academia no nível 1 e no nível 5 e comparar a quantidade e a força das safras, e o resultado financeiro de vender as crias da base.

**Acceptance Scenarios**:

1. **Given** carreiras simuladas de 10 temporadas com o mesmo clube, uma com academia no nível 1 e outra no nível 5, **When** as safras são comparadas, **Then** a academia no nível 5 gera, em média, mais jovens e jovens mais fortes, com potencial maior.
2. **Given** as mesmas carreiras, **When** a venda das crias da base é comparada ao custo da academia, **Then** num clube pequeno a receita das vendas não paga sozinha o custo do nível 5.

---

### User Story 6 - Um mundo que continua saudável (Priority: P2)

Como jogador de carreiras longas, quero que a academia não desequilibre o mundo: a IA não quebra com a manutenção e as faixas do mundo se mantêm.

**Why this priority**: Princípio V; a 036 mostrou que mudar a safra mexe na economia dos clubes pequenos e na competição continental.

**Independent Test**: simular 30 temporadas sem interação e conferir as faixas do mundo, os critérios da 036 e o caixa da IA.

**Acceptance Scenarios**:

1. **Given** 30 temporadas sem interação, **When** o mundo é medido, **Then** as faixas de força, craques, promessas e idade e os critérios da 036 continuam dentro dos limites: base no limite, nenhuma criação direta, emergências, elencos da IA e caixa dos clubes só de estadual.
2. **Given** a mesma simulação, **When** o caixa dos clubes da IA é medido, **Then** a manutenção não leva mais clubes a crise do que os limites atuais da economia permitem.
3. **Given** a simulação continental completa em 3 seeds, **When** os critérios são medidos, **Then** os resultados ficam no nível da 1.9.0.

---

### User Story 7 - Continuar uma carreira da 1.9.0 (Priority: P3)

Como jogador com uma carreira salva na 1.9.0, quero abri-la e continuar, com a academia de cada clube já definida.

**Why this priority**: Princípio VI.

**Independent Test**: abrir um save da 1.9.0 e ver a academia de cada clube no nível que a reputação daria.

**Acceptance Scenarios**:

1. **Given** um save da 1.9.0, **When** ele é aberto, **Then** cada clube tem a academia no nível que a reputação dá, sem obra em andamento, com a base completada até 15 jovens, e a carreira continua.

---

### Edge Cases

- **Técnico troca de clube** (demissão ou proposta aceita): a academia, a obra e a redução pendentes ficam com o clube. Sem técnico, o clube passa a seguir a regra da IA a partir da virada seguinte: o nível anda um degrau por virada até o nível que a reputação dá. Uma obra paga ainda termina, e uma redução pendente é cancelada.
- **Obra e reputação mudando na mesma virada** (clube do técnico): só a obra conta. O clube do técnico não segue a reputação.
- **Caixa negativo ou crise**: a manutenção continua sendo cobrada, como os salários. Baixar é o caminho para cortar.
- **Baixar no nível 1**: indisponível.
- **Melhorar para além do 5**: indisponível.
- **Mudar de ideia**: uma obra paga não pode ser cancelada (o dinheiro já saiu); uma redução pendente pode ser cancelada até a virada.
- **Base cheia e nível alto**: o limite de vagas cresce com o nível (15 até o nível 3, 20 no nível 4 e 25 no nível 5). Na IA, os excedentes da safra saem como livres; no técnico, a base fica acima do limite e há bloqueio, como na 036.
- **Nível cai e a base passa do novo limite** (redução do técnico, ou da IA pela reputação): ninguém é dispensado na hora. Na IA, os excedentes de menor utilidade saem como livres na virada; no técnico, vale o bloqueio da 036 até ele resolver.
- **Base inicial cheia**: os 15 jovens iniciais de cada clube têm idades espalhadas de 15 a 19 anos, para não saírem todos por idade na mesma virada. A qualidade segue o nível da academia do clube.
- **Clubes só de estadual**: têm academia e manutenção pelas mesmas regras, com custos na escala do país, e o equilíbrio deles é medido (critério da 036).
- **Ligas de outros países**: a academia vale para todos os clubes, com custos na escala de cada país.
- **Desempregado**: o painel mostra a academia do clube em foco só para leitura, sem ações.

## Requirements *(mandatory)*

### Functional Requirements

**Nível e efeito**

- **FR-001**: Todo clube DEVE ter uma academia com nível de 1 a 5.
- **FR-002**: O nível inicial de cada clube, numa carreira nova e na migração, DEVE vir da reputação, por faixas declaradas como regra do jogo (reputação maior → nível maior ou igual).
- **FR-003**: Nos clubes da IA, o nível DEVE seguir a reputação. Na virada, ele anda um degrau na direção do nível que a reputação atual dá. A IA não decide investir.
- **FR-004**: A safra da virada DEVE depender do nível da academia, na quantidade de jovens (por exemplo, de 1 a 4 por safra) e na qualidade (força inicial e margem de potencial). A reputação perde peso, e o regulador do mundo continua aplicando o ajuste dele por cima.
- **FR-004a**: O limite de vagas da base DEVE depender do nível da academia: 15 nos níveis 1 a 3, 20 no nível 4 e 25 no nível 5. A 036 tinha 15 para todos.
- **FR-004b**: Todo clube DEVE começar com a base cheia, com 15 jovens, numa carreira nova e num save migrado da 1.9.0. Os jovens têm idades espalhadas de 15 a 19 anos, qualidade pelo nível da academia do clube e posições pela carência do elenco mais a base. Num save migrado, as bases que já têm jovens são completadas até 15, sem dispensar ninguém.
- **FR-005**: Os jovens na base DEVEM ganhar um bônus de evolução pelo nível da academia, nos mesmos momentos da evolução do mundo.

**Investimento do técnico**

- **FR-006**: O técnico DEVE poder melhorar a academia do seu clube em um nível por vez, até o 5. O custo da obra é pago na hora, fica registrado no livro-caixa e exige caixa suficiente. A obra fica pronta na virada seguinte, antes da safra.
- **FR-007**: Só pode existir uma mudança pendente por vez (obra ou redução). Com uma pendente, as ações ficam indisponíveis, com explicação.
- **FR-008**: O técnico DEVE poder baixar a academia em um nível por vez, até o 1. A redução vale na virada seguinte, não devolve dinheiro e pode ser cancelada até a virada.
- **FR-009**: Antes de confirmar qualquer mudança, o jogo DEVE mostrar o custo da obra (se houver), o custo mensal novo, quando a mudança vale e o caixa depois.

**Custos e finanças**

- **FR-010**: Todo clube DEVE pagar a manutenção mensal da academia pelo nível, numa categoria nova do livro-caixa, nos mesmos momentos em que paga salários.
- **FR-011**: Custos de obra e de manutenção DEVEM seguir a escala econômica do país do clube, como os salários, com peso moderado: a manutenção mensal vai de cerca de 2% da folha salarial de referência do clube (nível 1) a 10% (nível 5), e a obra para subir um nível custa de 2 (para o nível 2) a 6 folhas mensais (para o nível 5). A folha de referência é a que o plano define a partir da escala do país e da reputação, para o custo não mudar a cada contratação.
- **FR-012**: A manutenção DEVE entrar na previsão financeira, no resumo da temporada, no extrato das finanças e nas metas financeiras da diretoria, como as outras despesas.

**Interface**

- **FR-013**: A aba Base DEVE ter um painel da academia com:
  - o nível;
  - o efeito esperado: a faixa de jovens por safra em número e a qualidade numa escala de texto (modesta, boa, muito boa, excelente, de elite), com o efeito do próximo nível ao lado para comparar. Força e potencial esperados nunca aparecem em número (o potencial continua oculto até a 038);
  - o custo mensal;
  - a mudança pendente;
  - as ações Melhorar e Baixar com confirmação;
  - a comparação com a divisão.
- **FR-014**: A comparação DEVE mostrar só o nível da academia de cada clube da divisão, com o clube do técnico destacado em texto.
- **FR-015**: Todo texto novo DEVE estar nas traduções, com plural e formatos pelo i18n. O painel e as confirmações DEVEM ser acessíveis por teclado e leitor de tela, e o nível nunca pode ser indicado só por cor.

**Dados, equilíbrio e saves**

- **FR-016**: Níveis, faixas de reputação, custos e efeitos DEVEM ser regras com valores padrão, opcionais no formato de mod e documentadas no `mod-format.md`. Mods antigos continuam válidos.
- **FR-017**: A mesma seed DEVE dar a mesma carreira. As linhas de base mudam de propósito e são regravadas no mesmo PR.
- **FR-018**: O equilíbrio DEVE ser verificado:
  - no teste de 30 temporadas e no `sim:world`: faixas do mundo, critérios da 036 e caixa da IA;
  - no `sim:economy`: o nível 5 rende mais que o 1 em 10 temporadas, e a venda das crias não paga sozinha o nível 5 num clube pequeno;
  - na simulação continental completa, em 3 seeds.
- **FR-019**: O save DEVE guardar o nível da academia e a mudança pendente de cada clube. Um save da 1.9.0 (v21) DEVE abrir e migrar, com o nível de cada clube vindo da reputação, sem mudança pendente e com a base completada até 15 jovens (FR-004b).
- **FR-020**: A versão do jogo DEVE subir (minor) no mesmo PR, com a nota de versão do dia em Brasília.

### Key Entities *(include if feature involves data)*

- **Academia**: pertence a um clube; tem nível (1 a 5), o limite de vagas da base que vem do nível e, no máximo, uma mudança pendente.
- **Mudança pendente**: obra (melhorar, com custo já pago) ou redução (baixar, cancelável), que vale na virada seguinte.
- **Regras da academia**: por nível, a faixa de reputação inicial, o custo da obra para chegar a ele, a manutenção mensal, a quantidade e a qualidade da safra e o bônus de evolução. Têm valores padrão e podem vir do mod.
- **Manutenção da academia**: despesa mensal no livro-caixa, numa categoria própria.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das viradas com obra paga, o nível sobe antes da safra, e a safra daquela virada usa o nível novo.
- **SC-002**: Em carreiras simuladas de 10 temporadas, a academia no nível 5 gera, em média, pelo menos 50% mais jovens que a do nível 1, com força inicial e potencial médios maiores.
- **SC-003**: Num clube pequeno, ao longo de 10 temporadas, a receita das vendas das crias da base fica abaixo do custo total do nível 5 (obras mais manutenção).
- **SC-004**: Em 30 temporadas sem interação, as faixas do mundo e os critérios da 036 ficam dentro dos limites, e a fração de clubes da IA em crise não passa dos limites atuais da economia.
- **SC-005**: Na simulação continental completa, a média dos critérios em 3 seeds fica no nível da 1.9.0.
- **SC-006**: 100% dos saves da 1.9.0 abrem, migram e chegam à virada seguinte sem erro.
- **SC-006a**: Em 100% das carreiras novas e dos saves migrados, todo clube começa com 15 jovens na base, e nenhum clube começa acima do limite do próprio nível.
- **SC-007**: Melhorar ou baixar a academia leva no máximo três ações (escolher a ação, revisar e confirmar), com o teclado ou o mouse.

## Assumptions

- As faixas de reputação para o nível inicial ficam perto dos degraus de hoje, distribuídas em 5 níveis (por exemplo: até 30 → 1, até 45 → 2, até 60 → 3, até 75 → 4, acima → 5). O plano calibra os valores.
- A quantidade da safra por nível fica perto da de hoje para os níveis que a reputação dá, para não mexer no total de jovens do mundo (a 036 mostrou que isso afeta a economia e o equilíbrio continental). Por exemplo: nível 1 → 1 jovem, nível 3 → 2, nível 5 → 4.
- A calibragem confere que a manutenção do nível que a reputação dá não leva os clubes da IA à crise (SC-004).
- A IA não investe, mas o nível dela muda com a reputação na virada, sem pagar obra. Só paga manutenção.
- A comparação da divisão mostra só o nível, não os jovens.
- A obra fica pronta na virada, sem contagem por rodadas (diferente da obra do estádio).
- A base cheia no início acrescenta cerca de 15 jovens por clube ao mundo (no mundo padrão, perto de 6 600). A calibragem, as medidas do mundo, o tamanho do save e o desempenho da virada são medidos com isso, e os critérios da 036 (população, emergências, caixa dos clubes só de estadual) são revistos com justificativa se precisarem.
- A versão sobe de 1.9.0 para 1.10.0.
