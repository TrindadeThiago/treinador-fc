# 042 — Empresários

Marco 13 — Mercado: cláusulas e empresários

`/speckit-specify`

```text
Empresários dos jogadores: quem decide aceitar ou não um contrato passa a ser também o empresário, que pede comissão e lembra como o clube o tratou (ver docs/design.md §9; AUDITORIA-v1.0.0.md, ideia 1).

Objetivo: dar uma segunda alavanca à negociação. Hoje o jogador aceita ou recusa só pelo salário e pela atração do clube. Com o empresário, o técnico pode trocar salário por comissão, e a relação com os empresários vira uma reputação que pesa nas próximas contratações.

Histórias de usuário:
- Como técnico, quero saber quem é o empresário de um jogador e como está a relação dele com o meu clube.
- Como técnico, quero oferecer uma comissão ao empresário para baixar o salário pedido ou convencer um jogador que não teria interesse no meu clube.
- Como técnico, quero que tratar bem os empresários (fechar negócios, cumprir o combinado) facilite as próximas negociações, e que rescisões e negociações desfeitas pesem contra.

Escopo:
- Empresários fictícios por país, gerados com a carreira pelo banco de nomes (Princípio IV), cada um com uma carteira de jogadores e atributos simples: comissão pedida (ganância) e influência. Jogadores jovens que surgem no mundo entram na carteira de um empresário do país.
- Relação empresário × clube de 0 a 100, começando neutra. Sobe com negócios concluídos e renovações; cai com rescisões (A9), propostas recusadas pelo técnico depois de aceitas pelo jogador e negociações abandonadas. Volta devagar ao neutro com o tempo.
- Negociação de contrato (compra, livre e renovação): além do salário e dos anos, a proposta tem uma comissão, paga uma vez na assinatura, numa categoria nova do livro-caixa ("Comissões"). A regra é declarada: comissão compensa parte do salário pedido e parte da falta de atração do clube, com teto; a relação muda o quanto o empresário pede.
- Clubes da IA também pagam comissão nas contratações e renovações deles, pela mesma regra, sem gerir relação (a relação existe só com o clube do técnico).
- Telas: o empresário e a relação (em texto, nunca só por cor) no detalhe do jogador e na negociação; o campo de comissão com o efeito no salário pedido; a lista de empresários com quem o clube já negociou, na aba de Mercado.
- Manchete quando um empresário rompe com o clube (relação mínima) ou quando o clube fecha um negócio grande com ele.
- Mods: comissões, pesos, teto, efeito da relação e o número de empresários por país como regras com valores padrão, opcionais e documentadas; nomes pelo banco de nomes do país.
- Save: formato novo com os empresários, as carteiras e as relações; a migração cria os empresários e distribui os jogadores existentes de forma determinística.

Requisitos:
- Equilíbrio: as comissões entram na economia de todos os clubes. Calibrar com sim:economy e o teste de 30 temporadas para o caixa da IA, as faixas do mundo e as transferências continuarem nos limites atuais; a continental completa em 3 seeds, como na 037.
- Arbitragem: comissão nunca pode virar dinheiro de volta para o clube; testes de propriedade de dinheiro cobrem as comissões.
- Determinismo; as linhas de base mudam de propósito (comissões da IA) e são regravadas no mesmo PR.
- Desempenho dentro das metas da 020 com o mundo padrão.
- Textos, plural e formatos pelo i18n.
- Nota de versão e subida de versão (minor) no mesmo PR.

Fora de escopo: empresário oferecendo jogadores por conta própria, empresário do técnico, trocar de empresário, conflitos de interesse entre clubes.

Critérios de aceite:
- Um jogador sem interesse no meu clube aceita quando ofereço comissão suficiente, e o caixa paga a comissão em "Comissões".
- Depois de rescindir com um jogador, o empresário dele pede mais nas negociações seguintes, e isso aparece na relação.
- Em 30 temporadas sem interação, o caixa da IA e as faixas do mundo continuam dentro dos limites.
- Um save da versão anterior abre, migra e continua a carreira.
```
