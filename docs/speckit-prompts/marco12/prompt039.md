# 039 — Olheiros e relatórios de jogadores

Marco 12 — Olheiros

`/speckit-specify`

```text
Departamento de olheiros do clube do técnico e relatórios de jogadores de outros clubes, com o potencial estimado em faixa que fica mais precisa com o tempo de observação (ver docs/design.md §4 e §14; AUDITORIA-v1.0.0.md, ideia 5; continua a 038).

Objetivo: o técnico consegue avaliar um jogador antes de comprá-lo sem saber o futuro dele. Hoje, fora da base do próprio clube, ele só vê a força: o potencial, o temperamento e a propensão a lesões são ocultos e nunca se revelam. Observar custa tempo e dinheiro, e o relatório reduz a incerteza aos poucos.

Histórias de usuário:
- Como técnico, quero mandar observar um jogador de outro clube (ou um livre) e receber um relatório com a faixa de potencial, para decidir se vale a contratação.
- Como técnico, quero que o relatório fique mais confiável quanto mais tempo o jogador é observado e quanto melhor é o meu departamento de olheiros.
- Como técnico, quero saber, em texto, se o jogador é esquentado (cartões) ou propenso a lesões, depois de observá-lo.
- Como técnico, quero ver no mercado quais jogadores já foram observados, filtrar e ordenar pela faixa de potencial.
- Como técnico, quero decidir quanto gastar com olheiros, como decido com a academia.

Escopo:
- Departamento de olheiros do clube do técnico, com nível de 1 a 5. O nível decide quantos jogadores podem ser observados ao mesmo tempo, a precisão do relatório e o custo mensal, numa categoria nova do livro-caixa ("Olheiros"). Subir ou baixar o nível vale na hora (é contratar e dispensar gente, não obra) e mexe só no custo dos meses seguintes. O nível inicial vem da reputação do clube.
- Observação: o técnico escolhe jogadores de qualquer clube, de qualquer país, e livres, até o limite de vagas do nível. A cada rodada da liga principal do país do jogador, o relatório avança. Cancelar libera a vaga e guarda o relatório como está.
- Relatório:
  - faixa de potencial com o mesmo mecanismo da 038: sempre contém o valor real, só estreita, é sorteada com semente própria e nunca permite deduzir o valor exato;
  - temperamento e propensão a lesões em escala de texto (ex.: tranquilo, normal, esquentado), que aparecem só depois de um tempo mínimo de observação e nunca em número;
  - data (rodada e temporada) e grau de confiança em texto.
- O relatório fica guardado com o jogador mesmo se ele mudar de clube. Há um teto de relatórios guardados, com a regra de descarte declarada (ex.: os mais antigos de quem não interessa mais), para o tamanho do save.
- Elenco próprio: os jogadores do clube do técnico ganham relatório automático pelo tempo no clube, sem ocupar vaga (a faixa da 038 passa a valer para o elenco principal inteiro).
- Mercado: coluna e filtro "Observado", coluna da faixa com ordenação, ação "Observar" no detalhe e na busca, e a lista de observação numa aba própria do Mercado com o andamento de cada relatório.
- Detalhe do jogador: o relatório (faixa, atributos em texto, confiança e data) quando existe.
- Clubes da IA: não usam olheiros e continuam decidindo pelo valor real, como hoje.
- Mods: níveis, custos, vagas, rodadas por etapa do relatório e larguras como regras com valores padrão, opcionais no formato de mod e documentadas no mod-format.md.
- Save: formato novo com o nível do departamento, a lista de observação e os relatórios; a migração dá ao clube do técnico o nível da reputação, a lista vazia e os relatórios automáticos do elenco.

Requisitos:
- Sigilo: nem a interface nem o que a feature guarda no save revelam o valor real de forma legível (a mesma regra da 038, decisão de 2026-11-10: os ocultos que o save já guarda ficam como estão).
- Os relatórios não mudam nenhum resultado do jogo: com o departamento fechado (nível mínimo e nenhuma observação), a mesma seed dá a mesma carreira que a versão anterior, e as linhas de base existentes não são regravadas. O único efeito no jogo é o custo mensal no caixa do clube do técnico.
- Medir em simulação: a faixa contém o valor real em 100% dos casos; a largura média cai com o nível do departamento e com as rodadas de observação.
- Desempenho: observar o máximo de jogadores não pode tirar a rodada nem a virada das metas da 020.
- Textos, plural e formatos pelo i18n; a faixa e os atributos nunca são sinalizados só por cor.
- Nota de versão e subida de versão (minor) no mesmo PR.

Fora de escopo: indicação de jovens e regiões de captação (040), clubes da IA com olheiros, relatório de clubes inteiros ou de adversários antes do jogo.

Critérios de aceite:
- Mando observar um jogador de outro clube e, ao longo das rodadas, a faixa do relatório estreita e sempre contém o valor real.
- Com o departamento no nível 5 e observação completa, a faixa média é visivelmente mais estreita que no nível 1 com a observação no começo.
- No mercado, filtro os observados e ordeno pela faixa.
- A mesma seed, sem usar olheiros, dá a mesma carreira da versão anterior.
- Um save da versão anterior abre, migra e continua a carreira.
```
