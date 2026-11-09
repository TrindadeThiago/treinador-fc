# Contrato: telas da base (036)

## Elenco → abas Profissional e Base

- A rota `/jogo/elenco` ganha abas (`Tabs`): **Profissional** (a tela atual) e **Base**. A aba fica na URL (`?aba=base`) para links diretos dos avisos e dos bloqueios.
- A navegação entre abas segue o teclado das outras abas do jogo (setas, Home e End).

## Aba Base

| Elemento | Conteúdo |
|---|---|
| Cabeçalho | "Base", contador "{n} de {limite} vagas" (`SquadCounter`). Acima do limite: "{excesso} acima do limite: promova ou dispense para jogar a próxima partida" |
| Aviso da última janela | `Notice` com "{count} jovens estão no último ano na base" enquanto vale `academyWarning` |
| Tabela (`DataTable`) | Nome, Idade, Posição, Força, Características, "Sai em" (temporada) e Situação ("Último ano" em texto, com `Badge`). Ordenável por idade, posição e força |
| Ações por linha | **Promover** e **Dispensar** (botões com o nome do jovem no rótulo acessível) |
| Estado vazio | "Os jovens da base chegam na virada da temporada." |
| Desempregado | A aba mostra a base do clube em foco só para leitura, sem ações |

### Diálogo Promover

- Título "Promover {nome}?" e o texto "Ele vai para o elenco profissional com salário de {salário} por mês até {ano}".
- Botões Promover e Cancelar.
- Com o elenco no máximo, o botão Promover da linha fica desabilitado, com a explicação "O elenco está no máximo ({max}). Abra uma vaga antes de promover" (`aria-describedby`).
- Durante uma partida ao vivo, as ações ficam desabilitadas, como as outras ações do elenco.

### Diálogo Dispensar

- Título "Dispensar {nome}?" e o texto "Ele deixa o clube e vira jogador livre. Não dá para desfazer".
- Botões Dispensar e Cancelar.

## Bloqueios antes da partida (`SimulateDialogs`)

| Código | Título | Texto | Ação |
|---|---|---|---|
| `academy_over_limit` | "Base acima do limite" | "A base tem {excesso} jovens acima do limite de {limite}. Promova ou dispense para jogar." | Botão "Ir para a base" |
| `squad_below_minimum` | "Elenco incompleto" | "Faltam {missing} jogadores no elenco ({posições}). Promova da base ou contrate para jogar." | Botões "Ir para a base" e "Ir para o mercado" |
| `academy_last_year` (aviso) | "Jovens no último ano" | "{count} jovens da base saem na virada se não forem promovidos. Jogar mesmo assim?" | "Jogar" e "Ir para a base" |

## Detalhe do jogador

Uma linha "Cria da base do {clube} (temporada {n})" quando `graduateOf` existe.

## Aviso de mudanças do elenco e fim de temporada

Novas seções:
- "Chegaram à base" (`academyArrived`);
- "Saíram da base por idade" (`academyAgedOut`, com "agora livre");
- "Promovidos da base" (`promoted`, as promoções do técnico na temporada);
- "Dispensados da base" (`academyReleased`, as dispensas do técnico na temporada, agora livres).

A seção "Promovidos automaticamente" some do clube do técnico.

## i18n e acessibilidade

- Todas as chaves ficam em `packages/i18n/locales/pt-BR/ui.json` (`academy.*`, `simulate.academy*`, `squadNotice.academy*`), com plural ICU para contagens.
- "Último ano" e excesso nunca são sinalizados só por cor.
- O teste de acessibilidade (`a11y.spec.ts`) inclui a aba Base nos dois temas.
