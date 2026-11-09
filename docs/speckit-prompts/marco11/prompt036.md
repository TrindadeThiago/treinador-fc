# 036 — Elenco de base

Marco 11 — Categorias de base

`/speckit-specify`

```text
Elenco de base (sub-20) separado do elenco profissional, para onde vão os jovens gerados na virada (ver docs/design.md §4, §5 e §14; AUDITORIA-v1.0.0.md, ideia 3).

Objetivo: revelar jogadores vira uma decisão do técnico. Hoje os jovens da virada (renewal/youth.ts) entram direto no elenco principal. Com esta feature eles chegam à base, e o técnico escolhe quem promove, quem espera e quem dispensa.

Contexto: hoje cada clube recebe de 1 a 3 jovens por temporada (16 a 18 anos), conforme a reputação. A força e o potencial seguem YOUTH_RULES e o ajuste do regulador. O balanceSquads também cria jovens ("promovidos") para completar os mínimos do elenco. Esta feature não muda quantos jovens chegam nem a qualidade deles; isso fica para a 037.

Histórias de usuário:
- Como técnico, quero ver os jovens da base do meu clube (idade, posição, força, características) separados do elenco profissional.
- Como técnico, quero promover um jovem ao elenco principal a qualquer momento da temporada, para usá-lo nos jogos.
- Como técnico, quero dispensar um jovem que não vai vingar, para abrir vaga na base.
- Como técnico, quero ser avisado de que um jovem chega à idade-limite e vai sair se eu não o promover.

Escopo:
- Cada clube tem um elenco de base, com limite de vagas (ex.: 15).
- Os jovens da virada chegam à base em vez do elenco principal. Se a base estiver cheia, o clube escolhe quem dispensar, e para a IA isso é automático.
- Jogador da base: não joga partidas, não recebe salário, não conta para o mínimo nem para o máximo do elenco e não entra no mercado nem em empréstimos.
- Evolução da base nos mesmos momentos da evolução do mundo (meio e fim da temporada), como um jogador de minutagem baixa.
- Idade-limite (sub-20): na virada, quem passou da idade é promovido (IA) ou dispensado (clube do jogador que não promoveu), com aviso antes do fim da temporada.
- Promover: o jogador passa ao elenco principal com contrato inicial de profissional, pelas regras de contrato da competição (010), respeitando o máximo do elenco.
- Dispensar: o jogador sai do mundo (ou vira livre, se for a regra mais simples no mercado atual; o plano decide).
- IA: promove os melhores da base quando falta gente no elenco. O balanceSquads busca primeiro na base e só cria jogadores do nada se a base não tiver a posição.
- Clubes só de estadual (renewal/regional.ts) têm base como os demais.
- Tela: aba Base dentro de Elenco, com a lista dos jovens, o ano em que cada um precisa sair e as ações Promover e Dispensar (com confirmação). No detalhe do jogador, a origem "cria da base" para quem subiu da base do clube.
- Fim de temporada e aviso de mudanças do elenco (SquadChangeNotice): separar quem chegou à base, quem foi promovido e quem saiu por idade.
- Save: formato novo com a base por clube. A migração de saves antigos cria a base vazia; os jovens que já estão nos elencos ficam onde estão.

Requisitos:
- Determinismo: a mesma seed dá a mesma carreira. As linhas de base por seed mudam de propósito e são regravadas no mesmo PR.
- Equilíbrio: no teste de 30 temporadas e no sim:world, a média de força, os craques, as promessas, a idade média e o tamanho dos elencos continuam nas faixas atuais. A base entra nas medidas do regulador (promessas) do jeito que o plano definir, sem dupla contagem.
- Desempenho: a virada com a base de todos os clubes do mundo padrão continua dentro das metas da 020.
- Textos, plural e formatos pelo i18n; atalhos de teclado e acessibilidade como nas outras abas do Elenco.
- Nota de versão e subida de versão (minor) no mesmo PR.

Fora de escopo: nível da academia e investimento (037), faixa de potencial estimado e manchetes de revelação (038), base disputando competições, olheiros, venda ou empréstimo de jogadores da base.

Critérios de aceite:
- Numa carreira nova, na primeira virada, os jovens do meu clube aparecem na aba Base e não no elenco principal.
- Promovo um jovem no meio da temporada e consigo escalá-lo na partida seguinte.
- Um jovem que passa da idade-limite sem ser promovido sai na virada, e o aviso apareceu antes.
- Em 30 temporadas sem interação, todo clube tem elenco válido e as faixas do mundo se mantêm.
- Um save da versão anterior abre, migra e continua a carreira.
```
