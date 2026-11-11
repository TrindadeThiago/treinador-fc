# Feature Specification: Cláusula de revenda

**Feature Branch**: `041-clausula-revenda`

**Created**: 2026-11-11

**Status**: Draft

**Input**: User description: "Cláusula de revenda nas transferências (041): o clube que vende um jogador pode ficar com um percentual de uma venda futura dele (ver docs/design.md §9; AUDITORIA-v1.0.0.md, ideia 2; prompt em docs/speckit-prompts/marco13/prompt041.md). Percentual em passos declarados sobre a próxima venda definitiva, uma vez só; empréstimos, rescisões e saídas como livre não pagam nem encerram. O técnico inclui a cláusula ao vender (proposta recebida ou venda feita por ele) e a IA compradora troca percentual por desconto por regra declarada, com teto; a IA vendendo ao técnico pede cláusula em jovens, e o técnico aceita ou recusa com a contrapartida no valor; sem cláusula nova entre clubes da IA. Pagamento na próxima venda, do vendedor para o clube da cláusula, na categoria 'Revendas', inclusive entre clubes da IA e entre países; recompra pelo clube da cláusula encerra sem pagamento. Telas na negociação, no detalhe do jogador e em Finanças; manchete de revenda relevante; regras opcionais no mod; save novo com migração. Conservação do dinheiro e arbitragem cobertas por testes de propriedade e sim:economy; equilíbrio em 30 temporadas; i18n; nota e subida de versão minor. Fora de escopo: outras cláusulas, cláusula em empréstimos, negociação de cláusulas entre clubes da IA."

## Contexto

É a primeira feature do marco 13 (Mercado: cláusulas e empresários), depois da 040 (versão 1.13.0).

O que já existe e continua valendo:
- **Transferência definitiva:** move o jogador e lança a taxa nos dois caixas, com a soma inalterada. Vale para compras do técnico, vendas do técnico, negócios entre clubes da IA e negócios entre países.
- **Formas de o técnico vender:**
  - **proposta recebida** de um clube da IA, que o técnico aceita, recusa ou contrapropõe uma vez;
  - **venda imediata**, com a janela aberta, por uma parte fixa do valor de mercado (75%) a um comprador da IA escolhido por regra.
- **Compra pelo técnico:** proposta ao clube da IA, que aceita, recusa ou pede um valor, com o piso da pedida do A2 (a pedida nunca fica abaixo do que a venda imediata pagaria depois).
- **Carência do A2b:** quem o técnico contratou na temporada não recebe proposta da IA até a temporada seguinte.
- **Outras saídas:** empréstimo até o fim da temporada, rescisão com multa e fim de contrato (o jogador vira livre).
- **Livro-caixa:** lançamentos por categoria (bilheteria, patrocínio, prêmios, salários, compras, vendas, base, olheiros etc.) mostrados em Finanças.
- **Crias da base (036 a 038):** origem registrada e manchete quando uma cria é vendida.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vender com cláusula de revenda (Priority: P1)

Como técnico, quero pedir um percentual de revenda ao vender um jogador, aceitando um valor menor agora.

**Why this priority**: é o centro da feature. Sem criar cláusulas, nada mais acontece.

**Independent Test**: vender uma cria da base com 30% de revenda, numa proposta recebida e numa venda imediata, e conferir o valor menor recebido e a cláusula registrada no jogador.

**Acceptance Scenarios**:

1. **Given** uma proposta recebida por um jogador do clube, **When** o técnico escolhe aceitar com cláusula e um percentual (de 5% a 50%, em passos de 5%), **Then** a tela mostra o valor da proposta, o desconto pedido pelo comprador por aquele percentual e o valor final antes de confirmar.
2. **Given** o percentual dentro do teto aceito pela IA, **When** o técnico confirma, **Then** o jogador é vendido pelo valor com desconto, o valor entra no caixa como venda e o jogador passa a ter a cláusula "30% de revenda para o clube do técnico".
3. **Given** um percentual acima do teto aceito pela IA, **When** o técnico o escolhe, **Then** a tela avisa antes de confirmar que o comprador não aceita aquele percentual e mostra o maior que ele aceita; confirmar assim não é possível.
4. **Given** a janela aberta, **When** o técnico pede a venda imediata com cláusula, **Then** a cotação mostra o valor da venda imediata, o desconto e o valor final, e o comprador é o mesmo da cotação sem cláusula.
5. **Given** uma contraproposta do técnico numa proposta recebida, **When** ela inclui uma cláusula, **Then** a IA avalia o valor pedido já com o desconto da cláusula, pela mesma regra.

---

### User Story 2 - Receber a revenda (Priority: P1)

Como técnico, quero receber a minha parte quando um jogador que vendi com cláusula for vendido de novo, por qualquer clube.

**Why this priority**: é a recompensa da aposta. Sem o pagamento, a cláusula não vale nada.

**Independent Test**: vender um jogador com 30% de revenda, simular até ele ser vendido de novo entre clubes da IA (no mesmo país ou para outro) e conferir o lançamento em "Revendas".

**Acceptance Scenarios**:

1. **Given** um jogador com cláusula de 30% para o clube do técnico, **When** o clube atual o vende em definitivo a qualquer outro clube (da IA, de outro país ou o próprio técnico em outro clube), **Then** 30% do valor da venda sai do caixa do vendedor e entra no caixa do clube do técnico, na categoria "Revendas", e a cláusula se encerra.
2. **Given** o mesmo jogador, **When** ele é emprestado, tem o contrato rescindido ou sai livre, **Then** nada é pago e a cláusula continua valendo para a próxima venda definitiva.
3. **Given** um jogador com cláusula para o clube do técnico, **When** o próprio clube do técnico o compra de volta, **Then** a cláusula se encerra sem pagamento.
4. **Given** uma revenda recebida acima do valor relevante declarado, **When** ela é lançada, **Then** sai uma manchete com o nome do jogador, o clube comprador e o valor recebido. Se for uma cria da base, a manchete diz isso.

---

### User Story 3 - Comprar um jovem com cláusula pedida pela IA (Priority: P2)

Como técnico, quero saber, ao comprar, se o jogador tem cláusula de revenda a favor de outro clube e quanto ela tira de uma venda futura, e decidir se aceito a cláusula que a IA pede nos jovens.

**Why this priority**: torna a regra simétrica (a IA também aposta) e protege o técnico de surpresas na revenda.

**Independent Test**: negociar um jovem com um clube da IA, ver a cláusula pedida e o efeito no valor, aceitar numa carreira e recusar em outra, e comparar o preço e a cláusula registrada.

**Acceptance Scenarios**:

1. **Given** um jogador de até a idade máxima declarada (por padrão, 21 anos) num clube da IA, **When** o técnico negocia a compra, **Then** a resposta do clube mostra a cláusula pedida (por padrão, 20%) e dois valores: com a cláusula (com o desconto) e sem ela.
2. **Given** a cláusula pedida, **When** o técnico aceita a cláusula, **Then** paga o valor com desconto e o jogador chega com "20% de revenda para o clube vendedor".
3. **Given** a cláusula pedida, **When** o técnico recusa a cláusula, **Then** paga o valor sem desconto e o jogador chega sem cláusula nova.
4. **Given** um jogador que já tem cláusula ativa a favor de outro clube, **When** o técnico abre o detalhe ou negocia a compra, **Then** vê "X% de revenda para o clube Y" e o aviso de que, se comprá-lo, uma venda futura paga essa fatia (a não ser que o comprador futuro seja o próprio Y).
5. **Given** um jogador acima da idade máxima, **When** o técnico negocia a compra, **Then** a IA não pede cláusula.

---

### User Story 4 - Acompanhar as cláusulas a receber (Priority: P3)

Como técnico, quero ver as cláusulas que tenho a receber e o que elas já renderam.

**Why this priority**: ajuda a acompanhar as apostas, mas o pagamento acontece mesmo sem a tela.

**Independent Test**: com cláusulas ativas e algumas já pagas, abrir Finanças e conferir a lista e o histórico.

**Acceptance Scenarios**:

1. **Given** cláusulas ativas a favor do clube do técnico, **When** ele abre a lista em Finanças, **Then** vê cada jogador, o clube atual, o percentual, a data da venda original e o valor de mercado atual como referência.
2. **Given** revendas já recebidas, **When** ele abre o histórico, **Then** vê cada recebimento (jogador, comprador, valor da venda, valor recebido, data) e o total recebido.
3. **Given** as cláusulas a pagar (jogadores do clube com cláusula a favor de outro), **When** ele abre a lista, **Then** elas aparecem separadas das a receber.

---

### Edge Cases

- **Uma cláusula por jogador:** um jogador tem no máximo uma cláusula ativa. Uma venda definitiva paga e encerra a cláusula anterior antes de a cláusula nova da mesma venda (se houver) passar a valer.
- **Clube da cláusula compra de volta:** encerra sem pagamento, mesmo vindo de outro país.
- **O técnico troca de clube:** as cláusulas pertencem ao clube, não ao técnico. O clube antigo continua credor e passa a ser um clube da IA com cláusulas. Se o técnico, no clube novo, comprar um jogador com cláusula a favor do clube antigo, é uma compra comum.
- **Desempregado:** a lista de Finanças não aparece; as cláusulas continuam valendo e sendo pagas entre os clubes.
- **Caixa do vendedor negativo:** a fatia sai do valor recebido na mesma venda, então sempre há dinheiro para pagá-la; o vendedor recebe a venda menos a fatia.
- **Venda por valor zero ou simbólico:** a fatia é o percentual do valor efetivamente pago; zero paga zero e encerra a cláusula.
- **Jogador aposentado ou que deixa o mundo:** a cláusula se encerra sem pagamento e sai da lista a receber, com a menção no histórico.
- **Rescisão e livre:** o jogador livre mantém a cláusula; um clube que o contrata como livre não paga nada, mas a próxima venda definitiva dele paga.
- **Carência do A2b:** não muda. Um jogador comprado com cláusula segue a carência como qualquer contratação.
- **Clube credor rebaixado, de outro país ou em liga sem acompanhamento:** recebe do mesmo jeito.
- **Arredondamento:** a fatia segue o arredondamento das taxas de transferência; o que sai de um caixa é exatamente o que entra no outro.
- **Mod antigo:** sem os campos novos, valem os padrões.

## Requirements *(mandatory)*

### Functional Requirements

**Cláusula**

- **FR-001**: Uma cláusula de revenda DEVE ter um percentual dentro de uma faixa em passos declarados (por padrão, de 5% a 50%, em passos de 5%), um clube credor e a data da venda que a criou.
- **FR-002**: A cláusula DEVE valer uma única vez, na próxima venda definitiva do jogador. Empréstimos, rescisões, fim de contrato e contratação como livre NÃO PODEM pagar nem encerrar a cláusula.
- **FR-003**: Um jogador DEVE ter no máximo uma cláusula ativa.

**Negociação: o técnico vende**

- **FR-004**: Ao aceitar ou contrapropor uma proposta recebida, e na venda imediata, o técnico DEVE poder incluir uma cláusula com o percentual escolhido.
- **FR-005**: A IA compradora DEVE responder por uma regra declarada: cada ponto de percentual vale um desconto fixo no valor (por padrão, 1% do valor por ponto) e há um teto aceito (por padrão, 30%). Acima do teto, a IA não aceita, e a tela mostra isso antes da confirmação.
- **FR-006**: A venda imediata com cláusula DEVE manter o comprador da cotação sem cláusula; muda só o valor.

**Negociação: a IA vende ao técnico**

- **FR-007**: Um clube da IA que vende ao técnico um jogador de até a idade máxima declarada (por padrão, 21 anos) DEVE pedir uma cláusula com o percentual declarado (por padrão, 20%), mostrando o valor com e sem cláusula pela mesma regra de desconto. O técnico aceita ou recusa a cláusula ao fechar a compra.
- **FR-008**: Entre clubes da IA NÃO PODE ser criada cláusula nova. A decisão de pedir cláusula não usa sorte.

**Pagamento**

- **FR-009**: Na venda definitiva de um jogador com cláusula, a fatia (percentual × valor da venda) DEVE sair do valor recebido pelo vendedor e entrar no caixa do credor, na categoria nova "Revendas" do livro-caixa (positiva no credor, negativa no vendedor). Vale também entre clubes da IA e entre países.
- **FR-010**: Se o comprador for o próprio credor, a cláusula DEVE se encerrar sem pagamento.
- **FR-011**: O registro da transferência DEVE guardar a cláusula paga (credor e valor) e a cláusula criada (credor e percentual), quando houver.

**Arbitragem**

- **FR-012**: O piso da pedida de compra do A2 DEVE valer sobre o líquido: comprar com cláusula pelo valor com desconto e vender em seguida (pagando a fatia) nunca rende mais do que o mesmo ciclo sem cláusula.
- **FR-013**: Nenhum ciclo de comprar e vender, com ou sem cláusula, por qualquer combinação de clubes, DEVE criar dinheiro: a soma dos caixas é a mesma antes e depois de cada transferência e de cada pagamento de revenda.

**Telas e narrativa**

- **FR-014**: A negociação DEVE mostrar a cláusula com o efeito no valor (valor sem cláusula, desconto, valor final). O detalhe do jogador DEVE mostrar a cláusula ativa ("20% de revenda para o X").
- **FR-015**: Finanças DEVE ter uma lista das cláusulas a receber e a pagar do clube do técnico e o histórico do que já foi recebido, com o total.
- **FR-016**: O clube do técnico DEVE ganhar uma manchete ao receber uma revenda acima de um valor relevante declarado (por padrão, relativo à escala econômica do país do clube). Se o jogador for uma cria da base do clube, a manchete diz isso.
- **FR-017**: Todo texto novo DEVE passar pelo i18n, com plural e formatos de dinheiro e percentual. O tipo de cláusula (a receber ou a pagar) nunca é sinalizado só por cor.

**Dados, equilíbrio e versão**

- **FR-018**: A faixa e o passo do percentual, o desconto por ponto, o teto aceito pela IA, o percentual pedido pela IA, a idade máxima em que a IA pede cláusula e o valor relevante da manchete DEVEM ser regras com valores padrão, opcionais no formato de mod e documentadas no `mod-format.md`.
- **FR-019**: O save DEVE guardar as cláusulas ativas e o histórico de recebimentos. Um save da 1.13.x DEVE abrir e migrar sem cláusulas e continuar a carreira.
- **FR-020**: Sem nenhuma cláusula criada, a mesma seed DEVE dar a mesma carreira da versão anterior. As linhas de base mudam só onde há cláusula, e as mudanças ficam registradas no PR.
- **FR-021**: O equilíbrio DEVE ser medido com a IA pedindo cláusula ao técnico: em 30 temporadas, o caixa dos clubes da IA e as faixas do mundo (força, craques, promessas) ficam dentro dos limites atuais. As medições de arbitragem do A2 em `sim:economy` DEVEM incluir ciclos com cláusula.
- **FR-022**: A versão do jogo DEVE subir (minor) no mesmo PR, com a nota de versão do dia em Brasília.

### Key Entities *(include if feature involves data)*

- **Cláusula de revenda**: pertence a um jogador; guarda o clube credor, o percentual e a data e a transferência que a criaram. Ativa até a próxima venda definitiva, a recompra pelo credor ou a saída do jogador do mundo.
- **Recebimento de revenda**: registro de uma cláusula paga: jogador, vendedor, comprador, credor, valor da venda, valor pago e data.
- **Regras da cláusula**: faixa e passo do percentual, desconto por ponto, teto aceito pela IA, percentual pedido pela IA, idade máxima e valor relevante da manchete. Têm valores padrão e podem vir do mod.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ao vender uma cria da base com 30% de revenda, o valor recebido é menor que sem cláusula pela regra declarada, e, quando ela é vendida de novo, o caixa recebe exatamente 30% dessa venda em "Revendas".
- **SC-002**: Em 100% das transferências e pagamentos de revenda gerados por testes de propriedade (qualquer par de clubes, países, contratos e percentuais), a soma dos caixas do mundo fica inalterada.
- **SC-003**: Em 100% dos ciclos de comprar e vender com cláusula (vender e recomprar, comprar com cláusula e vender em seguida, vender e revender entre clubes), nenhum clube termina com mais dinheiro do que o mesmo ciclo sem cláusula permitiria.
- **SC-004**: Sem cláusulas criadas, a mesma seed dá a mesma carreira em 100% das comparações, e as linhas de base existentes passam sem ser regravadas.
- **SC-005**: Em 30 temporadas com a IA pedindo cláusula, o caixa médio dos clubes da IA e as faixas do mundo ficam dentro dos limites atuais.
- **SC-006**: Ao comprar um jovem de um clube da IA, o técnico vê a cláusula pedida e o valor com e sem ela, e fecha a compra com ou sem cláusula em no máximo uma ação a mais que uma compra comum.
- **SC-007**: 100% dos saves da 1.13.x abrem, migram e chegam à virada seguinte sem erro.

## Assumptions

- O desconto por ponto é proporcional ao valor (1% do valor por ponto, por padrão) para que a regra valha em qualquer escala econômica; o prompt fala em "desconto fixo por ponto", lido como fixo em percentual.
- Com desconto de 1% por ponto, a cláusula é uma aposta justa no momento da venda: o vendedor só ganha se o jogador valorizar. O teto padrão de 30% evita trocar quase todo o valor por uma promessa.
- A IA pede a cláusula com um percentual fixo, sem sorte, para não mudar a sequência aleatória do mundo. O técnico não negocia o percentual pedido pela IA; só aceita ou recusa.
- As cláusulas pertencem ao clube, não ao técnico. Clubes da IA podem ser credores (quando venderam ao técnico ou quando o técnico deixou o clube).
- Jogadores livres mantêm a cláusula até a próxima venda definitiva, como diz o escopo ("saídas como livre não pagam e não a encerram").
- Cláusulas de jogadores que se aposentam ou saem do mundo se encerram sem pagamento.
- O valor relevante da manchete usa a escala econômica do país do clube, como os demais valores monetários do jogo.
