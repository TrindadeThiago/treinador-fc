# 037 — Academia e investimento na base

Marco 11 — Categorias de base

`/speckit-specify`

```text
Nível de academia por clube, com obra e custo de manutenção, que decide quantos jovens chegam à base e com que qualidade (ver docs/design.md §5 e §8; AUDITORIA-v1.0.0.md, ideia 3).

Objetivo: investir na base passa a ser um dilema financeiro. O dinheiro gasto na academia hoje rende jogadores (e vendas) daqui a algumas temporadas. Hoje a qualidade dos jovens depende só da reputação.

Histórias de usuário:
- Como técnico, quero ver o nível da academia do meu clube, o que ele rende e quanto custa por mês.
- Como técnico, quero mandar melhorar a academia sabendo o custo da obra, quando ela fica pronta e o efeito no caixa.
- Como técnico de um clube em crise, quero baixar o nível da academia para cortar gastos.
- Como técnico, quero comparar a academia do meu clube com a dos outros clubes da divisão.

Escopo:
- Nível da academia de 1 a 5 por clube.
- Clubes da IA: o nível vem da reputação e muda com ela na virada; a IA não decide investir.
- Clube do jogador: começa com o nível que a reputação daria, e a partir daí só muda pelas decisões do técnico.
- Melhorar: custo único, pago na hora, e a obra fica pronta na virada seguinte. Só uma obra por vez, sem pular nível. Baixar: vale na virada seguinte e não devolve o dinheiro.
- Manutenção mensal por nível, numa categoria nova do livro-caixa, também para os clubes da IA. Ela entra na previsão financeira, no resumo da temporada e nas metas financeiras da diretoria.
- Custos na escala de cada país (as regras econômicas da competição principal, 020), como os salários.
- A safra da virada passa a depender do nível: quantidade (ex.: 1 a 4 jovens) e qualidade (força base e margem de potencial). A reputação perde peso, e o regulador continua aplicando o ajuste dele por cima.
- A evolução dos jovens na base ganha um bônus pelo nível da academia.
- Tela: na aba Base, painel da academia com nível, obra em andamento, custo mensal, efeito esperado, ações Melhorar e Baixar (com a previsão no caixa) e a comparação com a divisão.
- Mods: níveis, custos e efeitos como regras com valores padrão, opcionais no formato de mod e documentados no mod-format.md. O nível inicial de cada clube vem da reputação.
- Save: formato novo com o nível e a obra por clube; a migração deriva o nível da reputação.

Requisitos:
- Equilíbrio: no teste de 30 temporadas e no sim:world, as faixas de força, craques e promessas continuam. O caixa médio dos clubes da IA não entra em crise com a manutenção, que é calibrada junto com a receita.
- Investir no máximo precisa render mais que não investir em 10 temporadas (mais jovens e melhores), sem virar uma máquina de dinheiro: a revenda de crias da base não pode pagar sozinha o custo em clubes pequenos (medir em sim:economy).
- Determinismo e linhas de base regravadas de propósito, como na 036.
- Textos, plural e formatos pelo i18n.
- Nota de versão e subida de versão (minor) no mesmo PR.

Fora de escopo: IA investindo por conta própria, olheiros e regiões de captação, outras estruturas do clube (CT, estádio), faixa de potencial (038).

Critérios de aceite:
- Mando melhorar a academia, vejo a obra e o custo no caixa, e na virada seguinte o nível sobe e a safra reflete o nível novo.
- Em 30 temporadas sem interação, as faixas do mundo e o caixa da IA se mantêm.
- Em carreiras simuladas de 10 temporadas, a academia no nível 5 gera em média mais jovens e jovens mais fortes que a academia no nível 1.
- Um save da 036 abre, migra e continua a carreira.
```
