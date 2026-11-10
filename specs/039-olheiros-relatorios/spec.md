# Feature Specification: Olheiros e relatórios de jogadores

**Feature Branch**: `039-olheiros-relatorios`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "Olheiros e relatórios de jogadores (039). Departamento de olheiros do clube do técnico e relatórios de jogadores de outros clubes, com o potencial estimado em faixa que fica mais precisa com o tempo de observação (ver docs/design.md §4 e §14; AUDITORIA-v1.0.0.md, ideia 5; continua a 038; prompt em docs/speckit-prompts/marco12/prompt039.md). Departamento com nível de 1 a 5 (vagas, precisão e custo mensal na categoria nova "Olheiros"), mudança de nível na hora; observação de jogadores de qualquer clube, país ou livres, avançando a cada rodada; relatório com faixa de potencial pelo mecanismo da 038, temperamento e propensão a lesões em texto, data e confiança; relatórios guardados com teto e descarte; relatório automático do elenco próprio; mercado com coluna e filtro de observados, faixa com ordenação, ação Observar e aba de observação; detalhe do jogador com o relatório; IA sem olheiros; regras opcionais no mod; save novo com migração. Sigilo do valor real, nenhum resultado muda sem usar olheiros, medidas de contenção e largura, desempenho nas metas da 020, i18n, nota e subida de versão minor. Fora de escopo: captação de jovens (040), IA com olheiros, relatório de clubes inteiros ou de adversários."

## Clarifications

### Session 2026-11-10

- Q: O departamento começa pela reputação (com custo desde o início) ou fechado? → A: Começa **fechado** (nível 0, sem custo e sem vagas). O técnico abre o departamento, num nível de 1 a 5, quando quiser. Sem abrir, a carreira é idêntica à da versão anterior e as linhas de base não mudam. O relatório automático do elenco próprio funciona mesmo com o departamento fechado, porque não custa nada.

## Contexto

É a primeira feature do marco 12 (Olheiros), que continua o marco 11 (Categorias de base, até a 1.11.0).

O que já existe e continua valendo:
- O potencial, o temperamento e a propensão a lesões de cada jogador são atributos ocultos e fixos (design §4). O temperamento pesa nos cartões e a propensão, nas lesões.
- A 038 criou a faixa de potencial estimado para os jovens da base do clube do técnico:
  - a faixa sempre contém o valor real, só estreita e é sorteada com semente própria;
  - ela não muda nenhum resultado do jogo;
  - os promovidos levam a "faixa da promoção" para o detalhe.
- Fora da base do próprio clube, o técnico só vê a força. Os clubes da IA decidem pelo valor real.
- Decisão de 2026-11-10 (038): o sigilo cobre o que a feature cria; os atributos ocultos que o save já guarda ficam como estão.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abrir o departamento e observar um jogador (Priority: P1)

Como técnico, quero abrir o departamento de olheiros e mandar observar um jogador de outro clube (ou um livre), recebendo um relatório com a faixa de potencial, para decidir se vale a contratação.

**Why this priority**: é o centro da feature. Sem observação, nada mais existe.

**Independent Test**: abrir o departamento, mandar observar um jogador de outro clube, jogar algumas rodadas e ver o relatório com a faixa no detalhe do jogador.

**Acceptance Scenarios**:

1. **Given** uma carreira nova, **When** o técnico abre o Mercado, **Then** o departamento aparece fechado, sem custo, com a explicação do que ele faz e a ação de abrir.
2. **Given** o departamento fechado, **When** o técnico o abre num nível de 1 a 5, **Then** a confirmação mostra o custo mensal, as vagas e a precisão do nível. Depois de confirmar, o custo passa a valer a partir da próxima cobrança.
3. **Given** o departamento aberto com vaga livre, **When** o técnico manda observar um jogador de outro clube, de qualquer país, ou um livre, **Then** o jogador entra na lista de observação e o relatório começa, já com uma faixa inicial.
4. **Given** um jogador em observação, **When** passam as rodadas, **Then** o relatório avança a cada rodada: a faixa estreita, sempre contém o valor real e fica dentro da anterior.
5. **Given** todas as vagas ocupadas, **When** o técnico tenta observar mais um, **Then** a ação fica indisponível, com o motivo e a contagem de vagas.
6. **Given** um jogador em observação, **When** o técnico cancela, **Then** a vaga é liberada e o relatório fica guardado como estava.

---

### User Story 2 - O relatório melhora com o tempo e com o departamento (Priority: P1)

Como técnico, quero que o relatório fique mais confiável quanto mais tempo o jogador é observado e quanto melhor é o meu departamento.

**Why this priority**: é o que dá sentido ao investimento e ao tempo de observação.

**Independent Test**: comparar, em simulação, a largura média das faixas no nível 1 no começo da observação e no nível 5 com a observação completa.

**Acceptance Scenarios**:

1. **Given** dois departamentos iguais, um no nível 1 e outro no nível 5, **When** observam jogadores pelo mesmo número de rodadas, **Then** as faixas do nível 5 são, em média, mais estreitas.
2. **Given** a observação completa no nível 5, **When** a largura média é comparada à do nível 1 no começo da observação, **Then** ela é visivelmente menor (SC-002).
3. **Given** o técnico baixa o nível no meio de uma observação, **When** as rodadas seguintes passam, **Then** a faixa continua dentro da anterior e nunca se alarga.
4. **Given** um relatório, **When** o técnico o abre, **Then** vê o grau de confiança em texto (ex.: inicial, parcial, completo) e a data da última atualização (rodada e temporada).

---

### User Story 3 - Temperamento e propensão a lesões em texto (Priority: P2)

Como técnico, quero saber, em texto, se o jogador é esquentado (cartões) ou propenso a lesões, depois de observá-lo.

**Why this priority**: completa o relatório e torna visível o que hoje nunca se revela; depende do relatório existir (US1).

**Independent Test**: observar um jogador até o tempo mínimo e ver os dois atributos em texto no relatório.

**Acceptance Scenarios**:

1. **Given** um relatório antes do tempo mínimo de observação, **When** o técnico o abre, **Then** o temperamento e a propensão a lesões aparecem como "ainda não avaliado".
2. **Given** um relatório depois do tempo mínimo, **When** o técnico o abre, **Then** vê os dois atributos numa escala de texto (ex.: tranquilo, normal ou esquentado; resistente, normal ou propenso a lesões), nunca em número.
3. **Given** dois jogadores com atributos em extremos opostos, **When** ambos têm o relatório completo, **Then** os textos refletem essa diferença.

---

### User Story 4 - Observados no mercado (Priority: P2)

Como técnico, quero ver no mercado quais jogadores já foram observados, filtrar e ordenar pela faixa de potencial, e acompanhar a lista de observação.

**Why this priority**: transforma os relatórios em decisões de compra; depende de US1.

**Independent Test**: com alguns relatórios, filtrar os observados no mercado, ordenar pela faixa e abrir a aba de observação.

**Acceptance Scenarios**:

1. **Given** relatórios guardados, **When** o técnico busca no mercado, **Then** há uma coluna "Observado" (em texto) e uma coluna de potencial com a faixa, vazia para quem não tem relatório.
2. **Given** a busca, **When** o técnico filtra só os observados e ordena pela faixa, **Then** só os observados aparecem, na ordem da faixa (valor central e, no empate, limite superior), nos dois sentidos.
3. **Given** a busca ou o detalhe de um jogador, **When** o técnico escolhe "Observar", **Then** o jogador entra na lista de observação, se houver vaga.
4. **Given** a aba de observação do Mercado, **When** o técnico a abre, **Then** vê o departamento (nível, vagas, custo mensal, ações de mudar o nível e fechar) e cada jogador observado com o andamento do relatório e a ação de cancelar.

---

### User Story 5 - Gastar com olheiros (Priority: P2)

Como técnico, quero decidir quanto gastar com olheiros, como decido com a academia.

**Why this priority**: o custo é o dilema da feature; depende do departamento existir (US1).

**Independent Test**: mudar o nível do departamento e ver o custo mensal mudar no livro-caixa, na previsão e no resumo; fechar o departamento e ver o custo parar.

**Acceptance Scenarios**:

1. **Given** o departamento aberto, **When** o técnico muda o nível, **Then** a confirmação mostra o custo mensal novo e as vagas novas. A mudança vale na hora para vagas e precisão, e o custo novo vale a partir da próxima cobrança.
2. **Given** um nível com menos vagas que as observações em andamento, **When** o técnico baixa para ele, **Then** a confirmação avisa quantas observações serão canceladas (as mais recentes), e os relatórios delas ficam guardados.
3. **Given** o departamento aberto, **When** o técnico o fecha, **Then** o custo para a partir da próxima cobrança, todas as observações são canceladas e os relatórios ficam guardados.
4. **Given** o custo mensal, **When** o técnico abre Finanças, **Then** a despesa aparece numa categoria própria ("Olheiros"), na previsão, no resumo da temporada e no extrato.

---

### User Story 6 - Relatório automático do elenco próprio (Priority: P3)

Como técnico, quero conhecer aos poucos o potencial dos jogadores do meu próprio elenco, sem gastar vagas.

**Why this priority**: estende a faixa da 038 ao elenco principal inteiro, mas não é essencial para comprar.

**Independent Test**: jogar algumas rodadas e ver, no detalhe de um jogador do elenco, o relatório automático que avança com o tempo.

**Acceptance Scenarios**:

1. **Given** um jogador no elenco do técnico, **When** passam as rodadas, **Then** ele ganha um relatório automático que avança como uma observação, sem ocupar vaga, mesmo com o departamento fechado.
2. **Given** uma cria promovida com a faixa da promoção (038), **When** o relatório automático começa, **Then** ele parte dessa faixa e só estreita a partir dela.
3. **Given** um jogador observado antes de ser contratado, **When** ele chega ao elenco, **Then** o relatório automático continua o relatório que já existia.

---

### User Story 7 - Nada muda para quem não usa olheiros (Priority: P1)

Como jogador, quero que os relatórios sejam só informação: sem abrir o departamento, a mesma seed dá a mesma carreira; e o valor real não aparece em lugar nenhum.

**Why this priority**: Princípio II (determinismo) e o objetivo de manter os atributos ocultos.

**Independent Test**: rodar a mesma seed com e sem a feature, sem abrir o departamento, e comparar a carreira; desenhar as telas com valores reais diferentes e conferir que o texto é o mesmo.

**Acceptance Scenarios**:

1. **Given** a mesma seed, **When** a carreira é simulada com a feature (departamento fechado) e sem ela, **Then** partidas, mercado, finanças, evolução e diretoria são idênticos.
2. **Given** a interface inteira, **When** o técnico procura o potencial, o temperamento ou a propensão real de um jogador, **Then** não os encontra: só aparecem faixas e textos de escala.
3. **Given** o departamento aberto e observações em andamento, **When** a carreira continua, **Then** o único efeito no jogo é o custo mensal no caixa do clube do técnico; nenhuma decisão da IA muda por causa dos relatórios.

---

### Edge Cases

- **Jogador observado muda de clube ou de país:** a observação continua (se o departamento seguir aberto). O relatório passa a avançar pelas rodadas da liga principal do país novo.
- **Livre:** o relatório avança pelas rodadas da liga principal do país do clube do técnico.
- **Jogador observado se aposenta:** a observação é encerrada, a vaga é liberada e o relatório é descartado na virada seguinte.
- **Técnico troca de clube** (demissão ou proposta aceita): os relatórios seguem o técnico (são conhecimento dele).
  - O departamento do clube antigo fecha e as observações são canceladas.
  - No clube novo o departamento começa fechado.
  - O relatório automático passa a valer para o elenco novo, começando do zero para quem ainda não tinha relatório.
- **Desempregado:** não há departamento nem relatório automático; os relatórios guardados continuam visíveis no mercado e no detalhe.
- **Faixa nos limites da escala:** a faixa nunca sai da escala de força do jogo e nunca começa abaixo da força atual. Ela pode ficar mais estreita que o mínimo quando a força se aproxima do potencial, mas continua contendo o valor real (mesma regra da 038).
- **Jovem da base do próprio clube:** continua com a faixa da 038, sem ocupar vaga; o relatório automático só começa depois da promoção, a partir da faixa da promoção.
- **Teto de relatórios atingido:** o relatório mais antigo (pela última atualização) de quem não está em observação nem no elenco do técnico é descartado. Os relatórios em observação e os do elenco nunca são descartados.
- **Caixa negativo ou crise:** o custo do departamento continua sendo cobrado, como a academia; fechar ou baixar o nível é o caminho para cortar.
- **Cancelar e voltar a observar o mesmo jogador:** o relatório continua de onde parou, sem recomeçar.
- **Mod antigo:** sem os campos novos; valem os padrões.

## Requirements *(mandatory)*

### Functional Requirements

**Departamento**

- **FR-001**: O clube do técnico DEVE ter um departamento de olheiros que começa **fechado** (sem custo e sem vagas), numa carreira nova e num save migrado.
- **FR-002**: O técnico DEVE poder abrir o departamento em qualquer nível de 1 a 5, mudar de nível e fechá-lo a qualquer momento fora de uma partida em andamento. A mudança vale na hora para as vagas e a precisão; o custo novo vale a partir da próxima cobrança (a cada rodada, como a manutenção da academia).
- **FR-003**: Cada nível DEVE definir o número de vagas de observação simultâneas, a precisão (quanto a faixa estreita por rodada e a largura mínima alcançável) e o custo mensal. O custo segue a escala econômica do país do clube, como a academia.
- **FR-004**: O custo mensal DEVE ser cobrado nos mesmos momentos dos salários e da manutenção da academia (parcelas por rodada que somam 12 mensalidades por temporada), numa categoria nova do livro-caixa ("Olheiros"), e aparecer na previsão financeira, no resumo da temporada, no extrato e nas metas financeiras da diretoria.
- **FR-005**: Antes de abrir, mudar o nível ou fechar, o jogo DEVE mostrar o custo mensal novo, as vagas novas e, quando houver, quantas observações serão canceladas.

**Observação e relatório**

- **FR-006**: O técnico DEVE poder observar jogadores de qualquer clube, de qualquer país, e livres, até o limite de vagas. Não pode observar os jogadores do próprio elenco nem os jovens da própria base.
- **FR-007**: O relatório de um jogador observado DEVE avançar uma etapa a cada rodada da liga principal do país do clube dele (para livres, a do país do clube do técnico), até a observação completa.
- **FR-008**: A faixa de potencial do relatório DEVE seguir o mecanismo da 038:
  - conter o valor real em 100% dos casos;
  - ficar dentro da anterior e nunca se alargar;
  - começar no máximo na força atual;
  - variar a posição do valor real dentro da faixa;
  - ser sorteada com semente própria por jogador e etapa, sem tocar na sorte do jogo.
- **FR-009**: A largura da faixa DEVE cair com o número de etapas observadas e com o nível do departamento no momento de cada etapa.
- **FR-010**: Depois de um tempo mínimo de observação, o relatório DEVE mostrar o temperamento e a propensão a lesões numa escala de texto de três graus, nunca em número. Antes disso, aparecem como "ainda não avaliado".
- **FR-011**: O relatório DEVE mostrar o grau de confiança em texto (inicial, parcial ou completo) e a data da última atualização (rodada e temporada).
- **FR-012**: Cancelar uma observação DEVE liberar a vaga e guardar o relatório. Observar de novo continua o relatório de onde parou.
- **FR-013**: Os relatórios DEVEM seguir o técnico, mesmo se o jogador ou o técnico mudar de clube, até um teto de relatórios guardados. Ao passar do teto, descarta-se o mais antigo pela última atualização entre os que não estão em observação nem no elenco do técnico.

**Elenco próprio**

- **FR-014**: Todo jogador do elenco do clube do técnico DEVE ganhar um relatório automático que avança uma etapa por rodada da liga do clube, sem ocupar vaga, com a precisão do nível do departamento (ou a do nível 1, se ele estiver fechado).
- **FR-015**: O relatório automático DEVE continuar um relatório que já existia (observação anterior ou faixa da promoção da 038) e nunca alargá-lo.

**Interface**

- **FR-016**: O Mercado DEVE ter:
  - na busca, uma coluna "Observado" em texto e uma coluna de potencial com a faixa, ordenável pelo valor central e, no empate, pelo limite superior;
  - um filtro só para os observados;
  - a ação "Observar" na busca e no detalhe;
  - uma aba de observação com o departamento (nível, vagas, custo, ações de abrir, mudar e fechar) e a lista de observados com o andamento e a ação de cancelar.
- **FR-017**: O detalhe do jogador DEVE mostrar o relatório quando ele existe: a faixa, o temperamento e a propensão em texto, a confiança e a data.
- **FR-018**: Todo texto novo DEVE estar nas traduções, com plural e formatos pelo i18n. A faixa e os atributos têm rótulo por extenso para leitor de tela e nunca são sinalizados só por cor.

**Sigilo, determinismo e dados**

- **FR-019**: O potencial, o temperamento e a propensão reais NÃO PODEM aparecer na interface, e o que a feature guarda no save NÃO PODE revelá-los de forma legível nem deixar calculá-los. Os atributos ocultos que o save já guarda ficam como estão (decisão de 2026-11-10).
- **FR-020**: Os relatórios NÃO PODEM mudar nenhum resultado do jogo. O único efeito é o custo do departamento no caixa do clube do técnico. Com o departamento fechado, a mesma seed dá a mesma carreira que a versão anterior, e as linhas de base existentes não são regravadas.
- **FR-021**: Os clubes da IA NÃO DEVEM ter departamento de olheiros; eles continuam decidindo pelo valor real.
- **FR-022**: Níveis, custos, vagas, etapas, tempo mínimo para os atributos, larguras e o teto de relatórios DEVEM ser regras com valores padrão, opcionais no formato de mod e documentadas no `mod-format.md`. Mods antigos continuam válidos.
- **FR-023**: O save DEVE guardar o departamento, a lista de observação e os relatórios. Um save da 1.11.x DEVE abrir e migrar com o departamento fechado, a lista vazia e os relatórios automáticos do elenco começando do zero (as crias promovidas partem da faixa da promoção).
- **FR-024**: Uma simulação DEVE medir que a faixa contém o valor real em 100% dos casos e que a largura média cai com o nível do departamento e com as etapas observadas.
- **FR-025**: Observar o máximo de jogadores e manter os relatórios automáticos NÃO PODE tirar a rodada nem a virada das metas de desempenho da 020.
- **FR-026**: A versão do jogo DEVE subir (minor) no mesmo PR, com a nota de versão do dia em Brasília.

### Key Entities *(include if feature involves data)*

- **Departamento de olheiros**: pertence ao clube do técnico; nível de 0 (fechado) a 5, com vagas, precisão e custo mensal pelo nível.
- **Observação**: um jogador na lista de observação, ocupando uma vaga, com a data de início.
- **Relatório**: pertence ao técnico e é ligado a um jogador. Guarda:
  - a faixa de potencial;
  - as etapas observadas;
  - a avaliação em texto do temperamento e da propensão (depois do tempo mínimo);
  - a confiança e a data da última atualização.
- **Regras dos olheiros**: por nível, as vagas, o custo e a precisão; as etapas, o tempo mínimo, as larguras e o teto de relatórios. Têm valores padrão e podem vir do mod.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em simulação, 100% das faixas dos relatórios contêm o valor real, em todos os níveis e etapas, e 100% das faixas sucessivas do mesmo jogador ficam dentro da anterior.
- **SC-002**: Com o departamento no nível 5 e a observação completa, a largura média da faixa é no máximo 40% da largura média no nível 1 na primeira etapa.
- **SC-003**: A largura média cai a cada nível (do 1 ao 5) e a cada etapa de observação, até a observação completa.
- **SC-004**: Com o departamento fechado, a mesma seed dá a mesma carreira em 100% das comparações (resultados, mercado, finanças, evolução e diretoria), e as linhas de base existentes passam sem ser regravadas.
- **SC-005**: Em nenhuma tela aparece o valor real do potencial, do temperamento ou da propensão a lesões.
- **SC-006**: Com o número máximo de observações e o elenco inteiro com relatório automático, a rodada e a virada ficam dentro das metas de desempenho da 020, e o save fica dentro dos tetos.
- **SC-007**: O técnico manda observar um jogador em no máximo duas ações a partir da busca ou do detalhe, e encontra os observados com a melhor faixa de uma posição em no máximo três ações (filtrar, escolher a posição e ordenar).
- **SC-008**: 100% dos saves da 1.11.x abrem, migram e chegam à virada seguinte sem erro.

## Assumptions

- **Observação completa:** a faixa chega à largura mínima do nível em cerca de 10 etapas no nível 1 e cerca de 4 no nível 5. O plano calibra os números para cumprir SC-002 e SC-003.
- **Tempo mínimo para os atributos:** cerca de metade das etapas da observação completa do nível.
- **Teto de relatórios:** na casa das centenas (ex.: 300), conferido pelo tamanho do save.
- **Custo:** fica entre a manutenção da academia nos níveis equivalentes e metade dela, porque o departamento é uma estrutura menor. O plano calibra pelo `sim:economy` do clube do técnico.
- **Faixa dos atributos:** o temperamento e a propensão são fixos. A escala de texto em três graus usa cortes declarados; ela revela o grau, que é o que a feature pretende mostrar, mas nunca o número.
- **Relatórios do técnico:** como o técnico é um só por carreira, os relatórios ficam guardados com a carreira.
- **Faixa da 038:** a faixa da base (038) continua como está; o relatório automático assume depois da promoção.
- **Versão:** sobe de 1.11.0 para 1.12.0.
