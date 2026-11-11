# Feature Specification: Captação de jovens

**Feature Branch**: `040-captacao-jovens`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "Captação de jovens (040). Regiões de captação: os olheiros do clube do técnico indicam jovens de fora para a base, além da safra da academia (ver docs/design.md §5 e §14; AUDITORIA-v1.0.0.md, ideia 5; depende da 039 e da 037; prompt em docs/speckit-prompts/marco12/prompt040.md). Região de captação do departamento (estado do clube, outro estado, o país inteiro ou outro país do banco); indicações de jovens de 15 a 17 anos em datas declaradas, com quantidade e qualidade pelo nível do departamento e pela força do país, faixa de potencial (038) e atributos em texto (039); indicados só entram no mundo se o técnico os trouxer, para a base, com custo de registro na categoria Olheiros, respeitando as vagas da base e o limite de estrangeiros; origem 'captado' com a região; nomes pelo banco de nomes do país de origem; manchetes e histórico dos captados; regras opcionais no mod; save novo com migração. Equilíbrio medido (melhora a base sem passar da academia nível 5 sozinha; mundo nas faixas da 036), sem captação a mesma seed dá a mesma carreira, semente própria, i18n, nota e subida de versão minor. Fora de escopo: IA captando, peneiras e testes presenciais, contratos de formação e compensação ao clube de origem."

## Contexto

É a segunda feature do marco 12 (Olheiros), depois da 039 (versão 1.12.0).

O que já existe e continua valendo:
- **Departamento de olheiros (039):**
  - pertence ao clube do técnico e começa fechado;
  - quando aberto, tem nível de 1 a 5 (vagas, precisão e custo mensal na categoria "Olheiros");
  - os relatórios usam a faixa de potencial da 038 e os graus de temperamento e lesões em texto.
- **Base (036, 037):**
  - os jovens chegam pela safra da academia na virada;
  - a base tem vagas pelo nível da academia;
  - o jogo nunca cria jogadores direto no elenco de nenhum clube;
  - a origem "cria da base" registra o clube e a temporada da promoção.
- **Limite de estrangeiros:** o país pode ter um limite de estrangeiros no elenco (020). Hoje todos os jovens da base são do país do clube, então a promoção não precisa conferir o limite.
- **Regra das features de informação (038, 039):** sem usar a feature, a mesma seed dá a mesma carreira, e as linhas de base existentes não são regravadas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Escolher uma região e receber indicações (Priority: P1)

Como técnico, quero escolher uma região de captação para os olheiros procurarem jovens, e receber indicações com uma faixa de potencial.

**Why this priority**: é o centro da feature. Sem indicações, não há o que trazer.

**Independent Test**: com o departamento aberto, escolher uma região, chegar à data de indicações e ver a lista de indicados, cada um com a faixa de potencial.

**Acceptance Scenarios**:

1. **Given** o departamento de olheiros fechado, **When** o técnico abre a captação, **Then** ela aparece indisponível, com a explicação de que é preciso abrir o departamento.
2. **Given** o departamento aberto e nenhuma região escolhida, **When** o técnico escolhe uma região (o estado do clube, outro estado do país, o país inteiro ou outro país do banco), **Then** a região fica registrada e vale a partir da rodada seguinte.
3. **Given** uma região escolhida, **When** chega uma data de indicações, **Then** surge uma lista de jovens indicados de 15 a 17 anos da região. Cada um traz nome, idade, posição, força, a faixa de potencial e, quando o nível permite, o temperamento e a propensão a lesões em texto.
4. **Given** uma lista de indicações, **When** o técnico a abre, **Then** vê o prazo até o qual cada indicação vale e o custo de registro para trazer cada um.

---

### User Story 2 - Trazer um indicado para a base (Priority: P1)

Como técnico, quero decidir se trago um indicado para a base, pagando o custo de registro.

**Why this priority**: sem trazer, a captação não reforça a base.

**Independent Test**: trazer um indicado, ver o custo sair do caixa e o jovem aparecer na base como "captado", com a região.

**Acceptance Scenarios**:

1. **Given** uma indicação válida, uma vaga na base e caixa suficiente, **When** o técnico escolhe Trazer, **Then** a confirmação mostra o custo de registro e o caixa depois. Depois de confirmar, o jovem entra na base com a origem "captado" e a região, e o custo sai do caixa na categoria "Olheiros".
2. **Given** a base cheia, **When** o técnico tenta trazer, **Then** a ação fica indisponível, com o motivo (sem vaga na base).
3. **Given** caixa menor que o custo de registro, **When** o técnico tenta trazer, **Then** a ação fica indisponível e a mensagem diz quanto falta.
4. **Given** um indicado estrangeiro, **When** trazê-lo deixaria o clube acima do limite de estrangeiros do país (contando o elenco e os captados estrangeiros da base), **Then** a ação fica indisponível, com o motivo.
5. **Given** um captado na base, **When** o técnico o promove, **Then** ele vira profissional como uma cria da base do clube, com a origem "captado" mantida no detalhe.

---

### User Story 3 - Recusar ou deixar expirar não deixa ninguém no mundo (Priority: P1)

Como jogador, quero que as indicações que não aproveito simplesmente sumam, sem encher o mundo de jogadores.

**Why this priority**: protege a regra de não criar jogadores sem decisão e a população do mundo (036).

**Independent Test**: recusar uma indicação e deixar outra expirar, e conferir que nenhum jogador novo existe no mundo, nos livres ou nas bases.

**Acceptance Scenarios**:

1. **Given** uma indicação, **When** o técnico a recusa, **Then** ela some da lista e nenhum jogador novo aparece no mundo, nos livres ou em nenhuma base.
2. **Given** uma indicação não aproveitada, **When** o prazo dela passa, **Then** ela some da lista, também sem deixar jogador no mundo.
3. **Given** a mesma seed, **When** a carreira é jogada sem captação (departamento fechado ou sem região), **Then** ela é idêntica à da versão anterior.

---

### User Story 4 - A região muda o perfil das indicações (Priority: P2)

Como técnico, quero que a região escolhida mude a quantidade, a qualidade e a nacionalidade das indicações.

**Why this priority**: é o que torna a escolha da região uma decisão, e não só uma opção.

**Independent Test**: comparar, em simulação, as indicações de uma região num país forte e num país fraco, e as de uma região pequena (um estado) e uma grande (o país inteiro).

**Acceptance Scenarios**:

1. **Given** duas regiões de países com força diferente, **When** as indicações são comparadas em muitas datas, **Then** o país mais forte rende jovens, em média, mais fortes e com potencial maior.
2. **Given** a região "o estado do clube" e a região "o país inteiro", **When** as indicações são comparadas, **Then** a região menor rende menos indicações por data, mas tem custo de registro menor.
3. **Given** uma região de outro país, **When** chegam as indicações, **Then** os jovens têm a nacionalidade daquele país e nomes do banco de nomes dele.
4. **Given** um nível maior do departamento, **When** as indicações são comparadas às de um nível menor, **Then** vêm mais indicações por data e com a faixa de potencial mais estreita.

---

### User Story 5 - Captados nas notícias e no histórico (Priority: P3)

Como torcedor do meu clube, quero que os captados que dão certo sejam lembrados.

**Why this priority**: completa a narrativa da base, mas não é essencial para captar.

**Independent Test**: promover um captado, vê-lo estrear e conferir a manchete e o histórico do clube.

**Acceptance Scenarios**:

1. **Given** um captado promovido, **When** ele estreia, marca o primeiro gol ou é vendido pelo clube, **Then** sai a mesma manchete das crias da base (038), com a menção de que foi captado e a região.
2. **Given** o histórico do clube, **When** o técnico o abre, **Then** o card de crias da base mostra quantos captados foram promovidos, separados das crias da safra, e os captados entram nas maiores revelações com a marca de origem.

---

### Edge Cases

- **Departamento fechado ou nível baixado:** fechar o departamento cancela as indicações abertas (elas somem) e suspende a captação. Baixar o nível não cancela as indicações já recebidas; o nível novo vale nas próximas datas.
- **Troca de clube do técnico:** a região e as indicações abertas são canceladas, como as observações da 039. Os captados que já estão na base ficam no clube antigo.
- **Desempregado:** não há captação.
- **Região de outro país sem estados declarados:** a região pode ser o país inteiro. A opção "estado" só aparece quando o país tem regiões (023).
- **Mudar a região perto de uma data de indicações:** vale a região do momento da data.
- **Indicado com a mesma posição de muitos da base:** as indicações não olham a carência do elenco. A posição é sorteada pelo perfil da região, e o técnico decide.
- **Captado estrangeiro e promoção:** a promoção ao profissional respeita o limite de estrangeiros do país, como uma contratação. Se o elenco estiver no limite, a promoção fica indisponível com o motivo. Só os captados podem ser estrangeiros na base, então isso não muda nada para os jovens da safra.
- **Captado chega à idade-limite da base:** vale a regra da 036. Sai da base na virada se não for promovido e vira livre, com a nacionalidade dele.
- **Caixa negativo:** não dá para trazer (o registro é pago na hora).
- **Mod antigo:** sem os campos novos, valem os padrões.

## Requirements *(mandatory)*

### Functional Requirements

**Região e indicações**

- **FR-001**: Com o departamento de olheiros aberto (039), o técnico DEVE poder escolher uma região de captação:
  - o estado do clube;
  - outro estado do país (quando o país tem regiões);
  - o país inteiro;
  - outro país do banco.
  A troca vale a partir da rodada seguinte.
- **FR-002**: Em datas declaradas (por padrão, na abertura de cada janela de transferências), o departamento DEVE gerar indicações de jovens de 15 a 17 anos da região. A quantidade e a qualidade (força inicial e margem de potencial) dependem do nível do departamento e da força do país da região. Uma região menor rende menos indicações por data.
- **FR-003**: Cada indicação DEVE trazer:
  - nome (pelo banco de nomes do país de origem), idade, posição, força e nacionalidade;
  - a faixa de potencial, pelo mecanismo da 038 e com a largura pela precisão do nível;
  - o temperamento e a propensão a lesões em texto, quando o nível alcança o tempo mínimo da 039 já na indicação;
  - o prazo da indicação (por padrão, o fim da janela em que surgiu);
  - o custo de registro.
- **FR-004**: Os jovens indicados NÃO PODEM existir no mundo, nos livres nem em nenhuma base enquanto forem só indicações. Recusar, deixar expirar, fechar o departamento ou trocar de clube faz a indicação sumir sem deixar jogador.

**Trazer para a base**

- **FR-005**: O técnico DEVE poder trazer um indicado para a base pagando o custo de registro na hora, na categoria "Olheiros" do livro-caixa. Só é possível se:
  - houver vaga na base (037);
  - o caixa for suficiente;
  - para um estrangeiro, o clube não passar do limite de estrangeiros do país (contando o elenco e os captados estrangeiros da base).
- **FR-006**: Antes de confirmar, o jogo DEVE mostrar o custo de registro e o caixa depois. As ações indisponíveis mostram o motivo em texto.
- **FR-007**: O jovem trazido DEVE entrar na base como qualquer jovem da base (sem salário, evolução da base, idade-limite da 036, faixa de potencial da 038), com a origem "captado" e a região registradas.
- **FR-008**: A promoção de um captado estrangeiro ao profissional DEVE respeitar o limite de estrangeiros do país, como uma contratação.
- **FR-009**: O custo de registro DEVE seguir a escala econômica do país do clube e ser menor para regiões menores.

**Narrativa e histórico**

- **FR-010**: As manchetes de cria da base (estreia, primeiro gol e venda, 038) DEVEM valer para os captados, com a menção de que foram captados e a região.
- **FR-011**: O histórico do clube DEVE contar os captados promovidos separados das crias da safra, e as maiores revelações DEVEM marcar a origem (safra ou captado).

**Interface**

- **FR-012**: A captação DEVE ter uma tela própria, na aba Observação do Mercado (039) ou ao lado dela, com:
  - a região e a ação de trocá-la;
  - a próxima data de indicações;
  - a lista de indicações abertas, com as ações Trazer e Recusar e o prazo.
  A aba Base (036) mostra a origem "captado" de cada jovem.
- **FR-013**: Todo texto novo DEVE estar nas traduções, com plural e formatos pelo i18n. A origem, os motivos e os atributos nunca são sinalizados só por cor.

**Dados, equilíbrio e versão**

- **FR-013a**: O potencial, o temperamento e a propensão reais dos indicados e dos captados NÃO PODEM aparecer na interface: só a faixa e os graus em texto, como na 039. O indicado guarda os atributos ocultos no save como qualquer jogador do mundo (decisão de 2026-11-10: o sigilo cobre o que a feature cria e mostra, e os ocultos ficam como os dos demais jogadores).
- **FR-014**: Sem captação (departamento fechado ou sem região), a mesma seed DEVE dar a mesma carreira que a versão anterior, e as linhas de base existentes não são regravadas. As indicações vêm de uma semente própria por data e região e não consomem a sorte do jogo nem a numeração de jogadores enquanto forem só indicações.
- **FR-015**: Regiões, datas, quantidade e qualidade por nível, prazo e custo de registro DEVEM ser regras com valores padrão, opcionais no formato de mod e documentadas no `mod-format.md`.
- **FR-016**: O save DEVE guardar a região, as indicações abertas e a origem dos captados. Um save da 1.12.x DEVE abrir e migrar sem região e sem indicações.
- **FR-017**: O equilíbrio DEVE ser medido:
  - em carreiras de 10 temporadas com a captação no máximo (nível 5, trazendo sempre o melhor indicado), a base melhora em relação a não captar, mas a força e o potencial médios dos captados não passam dos da safra da academia nível 5;
  - em 30 temporadas sem interação, a população do mundo e as faixas de força, craques e promessas continuam dentro dos limites da 036.
- **FR-018**: A versão do jogo DEVE subir (minor) no mesmo PR, com a nota de versão do dia em Brasília.

### Key Entities *(include if feature involves data)*

- **Região de captação**: pertence ao departamento de olheiros do técnico; é um estado, o país inteiro ou outro país do banco.
- **Indicação**: um jovem ainda fora do mundo, com os dados visíveis, a faixa de potencial, os atributos em texto (quando houver), a nacionalidade, a região, o prazo e o custo de registro.
- **Captado**: jovem da base que veio de uma indicação. Guarda a origem "captado" e a região.
- **Regras da captação**: por nível, a quantidade e a qualidade das indicações; por tipo de região, o tamanho e o custo; as datas e o prazo. Têm valores padrão e podem vir do mod.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das indicações recusadas, expiradas ou canceladas, nenhum jogador novo aparece no mundo, nos livres ou em qualquer base.
- **SC-002**: Sem captação, a mesma seed dá a mesma carreira em 100% das comparações, e as linhas de base existentes passam sem ser regravadas.
- **SC-003**: Em simulação de muitas datas, as indicações de um país mais forte têm força e potencial médios maiores que as de um país mais fraco. As de um nível maior do departamento são mais numerosas e têm a faixa mais estreita.
- **SC-004**: Em carreiras de 10 temporadas com a captação no máximo, o potencial médio da base do clube supera o da mesma carreira sem captação. A força e o potencial médios dos captados ficam abaixo ou iguais aos da safra da academia nível 5.
- **SC-005**: Em 30 temporadas sem interação, o mundo fica dentro das faixas e dos critérios da 036.
- **SC-006**: O técnico traz um indicado para a base em no máximo três ações (abrir a captação, escolher Trazer, confirmar).
- **SC-007**: 100% dos saves da 1.12.x abrem, migram e chegam à virada seguinte sem erro.

## Assumptions

- **Departamento aberto:** a captação depende do departamento de olheiros aberto, que já tem custo mensal (039). A captação acrescenta só o custo de registro de quem é trazido.
- **Datas de indicações:** na abertura de cada janela de transferências da liga do país do clube (duas por temporada no padrão).
- **Quantidade por data:**
  - pelo nível do departamento, de 1 (nível 1) a 3 (nível 5) para o país inteiro;
  - um estado rende cerca de metade (no mínimo 1);
  - outro país rende como o país inteiro.
  O plano calibra os números.
- **Qualidade:** fica na escala da safra de uma academia de nível médio, ajustada pela força do país da região. Um nível maior do departamento melhora a faixa, não o jogador, e aumenta a quantidade.
- **Custo de registro:** uma fração da folha mensal de referência (037), maior para outro país e menor para um estado. O plano calibra.
- **Nomes e nacionalidade:** os nomes vêm do banco de nomes do país da região; para outro país, o jovem é estrangeiro.
- **Ocultos dos indicados:** o indicado guarda o potencial, o temperamento e a propensão no save como qualquer jogador; a tela só mostra a faixa e os graus (FR-013a).
- **Numeração:** os indicados só recebem id de jogador do mundo quando são trazidos, o que mantém a numeração e a carreira iguais sem captação.
- **Versão:** sobe de 1.12.0 para 1.13.0.
