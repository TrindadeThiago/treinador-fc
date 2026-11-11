# Arquitetura

Visão técnica do Treinador FC: como o código se organiza, como uma rodada é processada, como o
estado é guardado e como a interface consome o motor. As regras que guiam tudo isso estão na
[constituição](../.specify/memory/constitution.md). Para rodar, testar e publicar, veja
[desenvolvimento.md](desenvolvimento.md).

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Pacotes](#2-pacotes)
3. [Motor (`packages/engine`)](#3-motor-packagesengine)
4. [Determinismo](#4-determinismo)
5. [Uma rodada, do clique ao save](#5-uma-rodada-do-clique-ao-save)
6. [Save (`packages/save`)](#6-save-packagessave)
7. [Mods (`packages/modkit`) e validação](#7-mods-packagesmodkit-e-validação)
8. [Textos (`packages/i18n`)](#8-textos-packagesi18n)
9. [Interface (`apps/web`)](#9-interface-appsweb)
10. [Offline e publicação](#10-offline-e-publicação)
11. [Ferramentas (`tools`)](#11-ferramentas-tools)
12. [Limites e balanceamento](#12-limites-e-balanceamento)

---

## 1. Visão geral

```text
┌──────────────────────────── apps/web (Next.js, static export) ────────────────────────────┐
│  telas (app/)  ·  componentes (ui/)  ·  estado da sessão (game/GameProvider)             │
│  armazenamento (storage/: IndexedDB, preferências, mods)  ·  service worker (offline)    │
└──────────────┬──────────────────────────┬──────────────────────────┬─────────────────────┘
               │ lê e salva               │ textos                   │ carrega mods
        packages/save               packages/i18n             packages/modkit
   (formato, migrações,         (ui.json, mensagens,        (.zip, CSV, imagens)
    .blsave, consultas)          notas de versão)                    │
               │                                                     │
               └──────────────────────┬──────────────────────────────┘
                                      ▼
                             packages/engine
       (regras puras: partida, temporada, carreira, finanças, mercado, diretoria,
        torcida, notícias, notas; validação; geração do mundo; PRNG com seed)
```

- O **motor** é TypeScript puro: não importa React, não acessa o DOM nem APIs do navegador e não lê
  o relógio. Ele recebe estado e devolve estado novo, sem mutação.
- A **interface** só chama a API pública do motor e do save. Nenhuma regra de jogo vive nos
  componentes.
- Não há servidor: o site é estático, os saves ficam no IndexedDB e os mods são lidos no próprio
  navegador.

## 2. Pacotes

| Pacote | Papel | Depende de |
|---|---|---|
| `packages/engine` | Toda a regra de jogo e a validação dos dados | Zod |
| `packages/save` | O formato `SaveFile`, as migrações, o `.blsave` e as consultas sobre a carreira | engine |
| `packages/modkit` | Leitura de pacotes de mod (`.zip`), CSV e imagens de escudo | engine |
| `packages/i18n` | Textos pt-BR (ICU MessageFormat), formatação de números e datas, notas de versão | — |
| `apps/web` | A interface (Next.js 16, React 19, CSS Modules) e o service worker | todos acima |
| `tools` | Geração de bancos, validação, simulações longas, capturas e verificações de release | engine, save, modkit |
| `mods/` | `default` (um país, base dos testes) e `exemplo` (mod de exemplo) | — |

## 3. Motor (`packages/engine`)

Os módulos ficam em `packages/engine/src`. A API pública é o `index.ts`.

| Módulo | O que faz |
|---|---|
| `model/` | Tipos e schemas Zod do banco (países, competições, clubes, jogadores) e os catálogos (posições, características, posturas, formatos de escudo). |
| `validation/` | Validação estrutural e semântica de bancos e mods, com a lista completa de problemas. |
| `world/`, `worldgen/` | Montagem do mundo a partir do banco e geração procedural (o mundo padrão, os nomes, os elencos, as rivalidades e os mods de exemplo). |
| `rng/` | O PRNG xoshiro128\*\*, o hash `cyrb128` e as distribuições (Poisson e outras). |
| `match/` | A partida minuto a minuto (`startMatch`/`simulateMatch`): força por setor (`strength.ts`), adequação à posição, escolha de quem finaliza e de quem assiste (`picker.ts`), desgaste, substituições e mudanças, prorrogação, pênaltis, as jogadas por jogador (`plays.ts`) e a simulação resumida das ligas de fora (`summary.ts`). As constantes ficam em `tuning.ts`. |
| `lineup/` | Escalação do técnico: validação, ajuste por lesão ou suspensão, troca de esquema e indisponíveis. A escalação automática fica em `match/auto-lineup.ts` e distribui os jogadores pelas vagas com o algoritmo húngaro. |
| `fitness/` | Condição física: recuperação entre jogos e desgaste. |
| `season/` | A temporada de uma divisão: tabela, critérios de desempate, disciplina (cartões, suspensões, lesões), o registro da partida (`record.ts`), as estatísticas e a rodada ao vivo (`live-round.ts`). |
| `calendar/` | O calendário de datas da temporada e os dias de jogo de cada competição. |
| `career/` | A carreira: o dia de jogos (`day.ts`) que fecha as rodadas de todas as competições na data, a liga com divisões, acesso e rebaixamento, a virada de temporada e o histórico. |
| `knockout/`, `stages/` | Copas em mata-mata (sorteio, chaveamento, ida e volta, agregado, prêmios) e competições em fases (grupos, classificação, cruzamentos). |
| `qualification/` | Vagas entre competições: zonas, ordem de preenchimento e repasse de vagas. |
| `continental/`, `regional/` | Competições continentais (campanhas, reputação, prêmios) e estaduais. |
| `finance/` | Livro-caixa por rodada: bilheteria (`gate.ts`), salários, patrocínio, prêmios, crédito, estádio, a IA financeira e a previsão de caixa (`forecast.ts`). |
| `market/` | Janelas, valor de mercado, busca, negociação com o clube e com o jogador, propostas recebidas, contratos, empréstimos, rescisão, jogadores livres e a IA de transferências. |
| `scouting/` | Olheiros do técnico (039): o departamento (nível, vagas, custo na categoria `scouting` do livro-caixa), as observações e os relatórios em `CareerSeasonState.scouting`. Os relatórios avançam no `day.ts` depois da rodada de cada liga principal (`scoutingAfterRound`), com a faixa da 038 e semente própria; a limpeza de aposentados e o teto rodam no save, depois da virada (`pruneScouting`). Só informação: com o departamento fechado, nada muda. A captação (`recruitment.ts`, 040) guarda a região e as indicações no mesmo estado; as indicações ficam fora do mundo, com id provisório, até o técnico trazer o jovem (`signOffer`), e saem na abertura das janelas (`recruitmentAfterRound`) e na virada, no save (`recruitmentAtSeasonStart`). |
| `board/` | Diretoria: metas, confiança, avaliação, demissão, propostas de emprego, técnicos da IA e reputação. |
| `fans/` | Torcida: humor, rivalidades, ídolos. |
| `news/` | Manchetes: fatos da rodada, recordes, conquistas e o feed por rodada (só dados: tipo, variante e variáveis). As notícias da base (`academy.ts`, 038) dão a revelação da safra na etapa `news-academy` da virada e a estreia, o primeiro gol e a venda das crias do clube do técnico, com as marcas por jogador em `NewsState.crias`. |
| `renewal/` | Virada do mundo: evolução, aposentadoria, regulador de força e nomes novos. O elenco de base (`academy.ts`, 036) vive em `RenewalState.academy`, fora de `world.players`: safra, idade-limite, promoções, dispensas, bloqueios (`rosterIssues`) e as etapas `academy-age-out` e `complete-squads` da virada. A academia (`academy-levels.ts`, 037) guarda o nível de cada clube em `RenewalState.academy.clubs`, com a etapa `academy-levels`, a manutenção na categoria `academy` do livro-caixa e a base inicial (`seedAcademies`). A faixa de potencial estimado (`estimate.ts`, 038) fica guardada em cada jovem (`AcademyPlayer.estimate`): nasce na chegada e é sorteada de novo dentro da anterior na etapa `academy-estimates`, com semente própria (não toca na sorte do jogo). As crias por clube formador (`hall.ts`, 038) guardam o total promovido e as maiores revelações pela força máxima, em `RenewalState.academy.hall`. |
| `rating/` | A nota do jogador (completa e simplificada), a média da temporada e o melhor em campo. É só informativa: o teste de arquitetura impede que outro módulo a importe. |
| `derived/` | Valores derivados da economia, usados por vários módulos. |
| `serialize/` | JSON canônico, clonagem e comparação de textos estável. |

## 4. Determinismo

- Toda aleatoriedade passa pelo PRNG com seed (`rng/xoshiro.ts`). O teste de arquitetura
  (`packages/engine/test/architecture.test.ts`) proíbe no motor:
  - `Math.random`, `Date` e `performance`;
  - as funções transcendentais (`Math.exp`, `Math.log`, `Math.pow`, `Math.sin` e outras), cujo
    resultado varia entre engines;
  - o operador `**`;
  - `localeCompare` sem `"pt-BR"`.
- Cada sorteio vem de um **fork rotulado** (`rng.fork("rotulo")`), derivado da seed da carreira e do
  contexto (temporada, rodada, partida, minuto). Mudar a ordem de outro sorteio não altera este.
- Ordenações que afetam resultado usam critérios estáveis (por id, com `compareText`), nunca a ordem
  de inserção.
- Os cálculos usam somas, multiplicações e arredondamento em inteiros.
- A **rodada ao vivo** e o **simular direto** passam pelo mesmo caminho (`career/day.ts`). Ao vivo,
  o motor só é avançado minuto a minuto; as decisões do técnico entram como eventos.
- Os testes de **linha de base** fixam o resultado de carreiras inteiras por seed. Uma mudança que
  altera resultados precisa ser intencional e regravar as linhas de base.

## 5. Uma rodada, do clique ao save

1. **Jogar rodada** ou **Simular direto** chama `game.playRound(mode)` no `GameProvider`
   (`apps/web/src/game/GameProvider.tsx`).
2. A escalação do técnico é validada e, se preciso, ajustada (`lineup/`). Os outros clubes usam
   `lineupForMatch`.
3. **Direto:** `career/day.ts` fecha as rodadas de todas as competições na data:
   - as partidas completas (as do país do técnico) geram registros com eventos-chave, estatísticas
     e jogadas por jogador;
   - as ligas de fora usam a simulação resumida.
4. **Ao vivo:** `season/live-round.ts` prepara as partidas, e o hook `useLiveRound`
   (`apps/web/src/game/useLiveRound.ts`) avança o relógio por passos (cerca de 98 por rodada),
   pausando no intervalo do jogo do técnico. Ao terminar, o resultado é fechado pelo mesmo caminho
   do direto.
5. Depois das partidas, o dia aplica as consequências: tabela, disciplina, lesões, condição física,
   finanças da rodada, mercado (IA e janelas), diretoria, torcida e manchetes.
6. O `SaveFile` novo é gravado no IndexedDB (`storage/indexeddb.ts`). Um aviso por
   `BroadcastChannel` (`storage/channel.ts`) informa as outras abas, e um conflito de gravação abre
   um diálogo.
7. Na última data, a carreira vai para o **fim de temporada**. A virada (`career/next-season.ts`)
   aplica acesso e rebaixamento, renovação do mundo, contratos, metas novas e o calendário novo.

## 6. Save (`packages/save`)

- `SaveFile` (em `format.ts`) guarda:
  - a versão do formato, a seed, o técnico e o clube;
  - uma **cópia do banco** do mod (`bank`), para que trocar de mod não estrague a carreira;
  - o estado da liga, das demais competições e do calendário;
  - finanças, mercado, diretoria, torcida, notícias e condição física;
  - a escalação e os avisos pendentes.
- **Versão atual: 20.** As migrações (`migrate.ts`) são encadeadas, v1 → v2 → … → v20, e cada uma
  tem um teste com uma fixture da versão anterior. Um save mais novo que o jogo é recusado com um
  aviso.
- **Exportação:** `.blsave` é o gzip de `{ format, exportedAt, save }` (`file.ts`). Na importação,
  o jogo valida, migra e trata conflito de id (substituir ou importar como cópia).
- **Consultas:** `career.ts` reúne as consultas que a interface usa:
  - `seasonStateOf`, `userSeason`, `nextFixture`;
  - `currentDate` (data de referência das idades) e `careerToday` (o "hoje" do calendário);
  - `isEmployed`, `managedClubId`.
- **Tamanho:** `scale-limits.ts` declara os tetos (por exemplo, a carreira longa de um país e o
  mundo grande), medidos por `pnpm sim:size`. Por isso, as jogadas guardadas são tuplas de
  inteiros, e as partidas resumidas não guardam jogadas.

## 7. Mods (`packages/modkit`) e validação

- Um mod é um `.zip` com JSON (ou CSV) de países, competições, clubes, jogadores e rivalidades, mais
  imagens de escudo opcionais. O formato está em [mod-format.md](mod-format.md).
- `modkit` lê o pacote, converte CSV, normaliza as imagens em data URI e aplica os limites de
  tamanho (`limits.ts`).
- `engine/validation` valida a estrutura (Zod) e a semântica (referências, formatos de
  competição, vagas), e devolve **todos** os problemas com o caminho de cada um. As mensagens
  ficam em `packages/i18n/locales/pt-BR/errors.json`.
- Adicionar um país ou uma competição é trabalho de dados: o motor não muda.

## 8. Textos (`packages/i18n`)

- Arquivos em `packages/i18n/locales/pt-BR/`:
  - `ui.json` (interface);
  - `catalog.json` (posições, características, posturas);
  - `events.json` e `messages.json` (eventos e mensagens do motor);
  - os arquivos de erros por área;
  - `release-notes.json` e `release-notes-beta.json`.
- As mensagens são frases completas em ICU MessageFormat, com plural e `select`. O motor devolve
  dados estruturados (por exemplo, o tipo, a variante e as variáveis de uma manchete), e a
  interface monta o texto.
- Testes garantem que nenhum texto visível fica fixo no código e que toda chave de `ui.json` é
  usada.
- O tom e os termos estão no [glossário](glossario.md).

## 9. Interface (`apps/web`)

- **Rotas** (`src/app/`):

  | Rota | Tela |
  |---|---|
  | `/` | Menu inicial |
  | `/carreiras` | Carreiras salvas |
  | `/nova-carreira` | Nova carreira |
  | `/mods` | Mods |
  | `/configuracoes` | Configurações |
  | `/sobre` | Sobre |
  | `/notas-de-versao` | Notas de versão |
  | `/jogo` | Início |
  | `/jogo/elenco` | Elenco |
  | `/jogo/escalacao` | Escalação |
  | `/jogo/competicao` (`/resultados`, `/artilharia`) | Competição |
  | `/jogo/calendario` | Calendário |
  | `/jogo/financas` | Finanças |
  | `/jogo/historico` | Histórico |
  | `/jogo/mercado` | Mercado |
  | `/jogo/carreira` | Carreira |
  | `/jogo/noticias` | Notícias |
  | `/jogo/rodada` | Rodada ao vivo |
  | `/jogo/fim-de-temporada` | Fim de temporada |

  A carreira aberta vai na query string (`?c=<id>`). O helper `screenHref` monta os links.
- **Estado da sessão:** o `GameProvider` carrega o save, expõe as ações (jogar a rodada, escalar,
  negociar, dispensar avisos, virar a temporada) e grava depois de cada uma. O `GameLayout`
  entrega `(save, game)` às telas e redireciona o técnico desempregado das telas do clube.
- **Visões derivadas** (`src/game/*-view.ts`, `selectors.ts`): funções puras que preparam o que as
  telas mostram (próximo jogo e indicadores, previsão de caixa, pressão, metas, calendário).
  Elas podem ser testadas sem renderizar.
- **Componentes** (`src/ui/`): base (`Card`, `Badge`, `Meter`, `Tabs`, `Dialog`, `DataTable`)
  e componentes por área (`home/`, `board/`, `fans/`, `market/`, `news/`, `live/`, `cup/`,
  `charts/` e outros). Os estilos usam CSS Modules com os tokens de `src/styles/tokens.css`. Um teste
  proíbe cor literal, espaçamento fora dos tokens e classe sem uso.
- **Shell:** barra lateral (`ui/shell/Sidebar.tsx`), o título de cada tela (`ScreenHeader`),
  os atalhos (`ui/shortcuts.ts`, um registro único que serve à ajuda e ao despacho) e as dicas de
  primeiro acesso.
- **Armazenamento** (`src/storage/`):
  - saves no IndexedDB, com escrita otimista por `savedAt`;
  - mods guardados no navegador;
  - preferências no `localStorage` (tema, velocidade, modo da rodada, dicas): perdê-las não perde
    progresso.

## 10. Offline e publicação

- O build é um **static export** (`apps/web/out`). Depois do `next build`, as ferramentas geram:
  - o mundo padrão público;
  - o `manifest` do PWA;
  - o `precache.json`, a lista de arquivos com a versão.
- O **service worker** (`public/sw.js`) guarda os arquivos do `precache.json` no primeiro acesso e
  serve o jogo sem rede. Quando a versão muda, a interface avisa e oferece recarregar.
- O `version.json` publicado diz a versão do site. O badge do README e o `check-release` leem esse
  arquivo.
- O deploy vai para a Vercel pelo workflow de release (ver [desenvolvimento.md](desenvolvimento.md)).

## 11. Ferramentas (`tools`)

| Script | Uso |
|---|---|
| `gen-default-bank`, `gen-football-world`, `gen-*-example-mod` | Geram o banco de testes, o mundo padrão e os mods de exemplo. |
| `validate-bank` | Valida uma pasta ou `.zip` e lista os erros. |
| `simulate-matches` | Milhares de partidas: faixas de realismo de gols, jogadas e notas. |
| `simulate-season`, `simulate-economy`, `simulate-world`, `simulate-scale` | Temporadas, economia, mundo e escala em simulações longas (as "gates" de release). |
| `measure-save` | Tamanho do save em cenários longos. |
| `screenshots` | Capturas da página Sobre e do README e ícones do aplicativo. |
| `check-release` | Versão, notas, capturas, textos e tamanho do pacote antes de publicar. |
| `precache`, `manifest`, `serve-static` | Etapas do build e o servidor do build para o e2e. |

## 12. Limites e balanceamento

Todo sistema que afeta o equilíbrio do mundo tem **limites declarados** e verificados por simulação
longa, sem interação. Exemplos:
- gols por partida e vantagem do mandante (`match/limits.ts`);
- força média e evolução do mundo ao longo das temporadas (`renewal/`, `worldgen/limits.ts`);
- economia: caixa, salários e transferências (`finance/`, `market/`);
- jogadas por partida e as faixas das notas (`rating/limits.ts`).

Mudar um sistema que quebra um limite exige ajustar o sistema ou justificar e revisar o limite, no
mesmo PR (Princípio V).
