# Guia do jogador

Este guia explica como jogar o Treinador FC, tela por tela, e como funcionam os sistemas do jogo.
Para as regras de projeto por trás de cada sistema, veja o [documento de design](design.md). Para
criar bancos de dados próprios, veja o [formato de mods](mod-format.md).

**Jogar:** https://treinador-fc.vercel.app. O jogo roda no navegador, sem cadastro e sem anúncios.
Depois do primeiro acesso, ele funciona sem internet.

## Sumário

1. [Começar uma carreira](#1-começar-uma-carreira)
2. [A tela do jogo](#2-a-tela-do-jogo)
3. [Início](#3-início)
4. [Elenco](#4-elenco)
5. [Escalação](#5-escalação)
6. [Rodada ao vivo e simulação direta](#6-rodada-ao-vivo-e-simulação-direta)
7. [Competição](#7-competição)
8. [Calendário](#8-calendário)
9. [Finanças](#9-finanças)
10. [Mercado de transferências](#10-mercado-de-transferências)
11. [Carreira: diretoria, propostas, técnicos e torcida](#11-carreira-diretoria-propostas-técnicos-e-torcida)
12. [Notícias](#12-notícias)
13. [Histórico](#13-histórico)
14. [Fim de temporada](#14-fim-de-temporada)
15. [Saves, mods e configurações](#15-saves-mods-e-configurações)
16. [Atalhos de teclado](#16-atalhos-de-teclado)
17. [Acessibilidade](#17-acessibilidade)
18. [Perguntas frequentes](#18-perguntas-frequentes)

---

## 1. Começar uma carreira

No **Menu inicial**, escolha **Nova carreira** e preencha:

| Campo | O que faz |
|---|---|
| Nome do técnico | Aparece no título das telas e no histórico da carreira. |
| Banco de dados | O mundo padrão (fictício) ou um mod carregado na tela **Mods**. |
| Divisão e clube | A tabela lista os clubes da divisão escolhida, com a força e a reputação de cada um. Clubes grandes recebem metas mais exigentes da diretoria. |
| Avançado: seed | A semente do mundo. A mesma seed com as mesmas decisões dá exatamente a mesma carreira. |
| Avançado: sem demissão | A diretoria cobra as metas, mas nunca demite o técnico. |

Todos os clubes, jogadores, escudos e competições do mundo padrão são **fictícios**. Os nomes de
países, estados e cidades podem ser reais. O mundo padrão é descrito em
[mundo-completo.md](mundo-completo.md).

Na primeira visita a cada tela, uma **dica** explica o que ela faz. Para vê-las de novo, use
**Configurações › Dicas**.

## 2. A tela do jogo

- **Barra lateral (menu principal):** Início, Elenco, Escalação, Competição, Calendário,
  Finanças, Histórico, Mercado, Carreira e Notícias. Embaixo dela ficam o Menu inicial, as
  Configurações e os Atalhos.
- **Título da tela:** o escudo e o nome do clube, o técnico, a divisão, a temporada e a rodada
  ("Série A · temporada 2027 · rodada 4 de 38"). À direita, o indicador de salvamento.
- **Técnico sem clube:** depois de uma demissão, as telas do clube (Elenco, Escalação, Mercado e
  outras) somem do menu até o técnico aceitar uma proposta.

O jogo salva sozinho depois de cada rodada e de cada ação importante.

## 3. Início

A Início é o painel da carreira e cabe numa tela de 1440×900. Em telas estreitas, os blocos ficam
um embaixo do outro, na ordem abaixo.

1. **Faixa do topo:** a posição na tabela e a divisão, à esquerda, e o estado da janela de
   transferências, à direita ("Janela aberta até 24 de janeiro…" ou "Janela fechada — abre em…").
2. **Próximo jogo:**
   - os dois clubes frente a frente (o mandante à esquerda), cada um com o escudo e a forma recente
     (até cinco resultados: V, E e D);
   - a competição, a divisão, a fase ou rodada, a data, o mando e, em mata-mata, o placar da ida;
     a marca de clássico, quando houver;
   - três indicadores:
     - **Força dos times:** a força da sua escalação contra a da escalação provável do adversário,
       com a mesma medida que o motor usa na partida;
     - **Condição média:** a condição física média dos seus titulares;
     - **Desfalques:** quantos jogadores do elenco estão lesionados ou suspensos para o jogo, com o
       atalho **Ver escalação**;
   - os botões **Jogar rodada** (ao vivo) e **Simular direto**.
3. **Antes do jogo:** avisos lado a lado, cada um com uma ação, que só aparecem quando há algo a
   resolver:
   - recado da diretoria (contratação ou demissão);
   - propostas de emprego;
   - crise financeira (caixa negativo há algumas rodadas);
   - mudanças no elenco na virada da temporada;
   - mercado (propostas recebidas, contratos que terminam, resumo da janela);
   - escalação ajustada (trocas automáticas por lesão ou suspensão).

   As listas longas abrem em **Ver detalhes**.
4. **Posição na tabela:** a posição em destaque, o link **Ver tabela** e os últimos cinco
   resultados do clube em todas as competições. Cada resultado mostra a letra V/E/D, o adversário,
   o mando, a rodada (ou a competição) e o placar.
5. **Torcida e diretoria:**
   - o humor da torcida e a confiança da diretoria, cada um com o valor, uma barra e a tendência
     (em alta, estável ou em queda);
   - a reputação do técnico e quantas metas estão no caminho;
   - o link para a **Carreira**.
6. **Manchetes:** as três mais relevantes da última rodada, cada uma com uma etiqueta de categoria
   (Resultado, Clássico, Técnicos, Mercado, Tabela, Copa, Continental ou Estadual), e o link para
   todas as notícias.

A lista completa de resultados da rodada fica na **Competição › Resultados** e no fim da rodada ao
vivo.

## 4. Elenco

A tabela do elenco mostra, para cada jogador:
- posição: GOL, LAT, ZAG, VOL, MEI ou ATA;
- idade, força e condição física;
- contrato e valor;
- características;
- **nota média** da temporada, com o número de jogos.

As colunas são ordenáveis. Quem ainda não tem nota fica por último ao ordenar pela nota.

**Características** (com ícones):

| Característica | Efeito no jogo |
|---|---|
| Artilheiro | Converte mais finalizações em gol. |
| Muralha | Na defesa, bloqueia mais finalizações; no gol, defende mais. |
| Cobrador de falta | É escolhido para bater faltas e pênaltis e converte mais. |
| Cabeceio | É escolhido nas cabeçadas e converte mais; na defesa, atrapalha as cabeçadas do adversário. |
| Velocidade | É escolhido nos contra-ataques, mas cansa um pouco mais rápido. |
| Armador | Dá mais assistências. |

Ao clicar num jogador, abre o **detalhe**. Ele mostra os atributos, a evolução, as estatísticas da
temporada (gols, assistências, cartões, passes, desarmes, interceptações) e a nota média. Pelo
detalhe dá para **vender na hora** (quando há um clube interessado) ou **rescindir** o contrato,
pagando uma multa pelos meses restantes. A rescisão fica bloqueada com a temporada encerrada.

### Base

A aba **Base** do Elenco mostra os jovens da categoria de base do clube (sub-20). A carreira já
começa com **10 jovens** na base do seu clube, e a cada virada chega uma safra nova, com 16 a 18
anos. Para cada jovem aparecem a posição, a idade, a força, as características e o ano em que ele
precisa sair da base. Quem sai na próxima virada fica marcado como **último ano**.

No topo da aba fica a **academia**, com nível de 1 a 5:
- o nível decide quantos jovens chegam por safra, a qualidade deles (modesta, boa, muito boa,
  excelente ou de elite), o quanto evoluem na base e as **vagas** (15 até o nível 3, 20 no nível 4
  e 25 no nível 5);
- a academia custa uma **manutenção mensal**, que aparece em Finanças como "Academia";
- **Melhorar** paga a obra na hora (é preciso ter o dinheiro em caixa), e o nível sobe na virada
  da temporada, já valendo para a safra dela;
- **Baixar** vale na virada e corta a manutenção. Nada do que foi investido volta, mas dá para
  cancelar a redução antes da virada;
- uma mudança por vez; a comparação mostra o nível da academia dos clubes da divisão.

Uma academia forte pode render vendas de crias da base, mas o retorno leva algumas temporadas.

O **potencial** de cada jovem continua escondido, mas a coluna **Potencial** mostra uma
**estimativa** em faixa (por exemplo, "68–84"). O valor de verdade está sempre dentro dela:
- a faixa fica mais estreita a cada virada que o jovem passa na base e é mais estreita numa
  academia melhor (no nível 1, um recém-chegado tem uma faixa de uns 20 pontos; no nível 5, com dois
  anos de base, de uns 6);
- a faixa nunca se alarga e nunca começa abaixo da força atual;
- dá para ordenar a tabela pela faixa e filtrar por posição;
- quem é promovido leva a última faixa conhecida para o detalhe ("Potencial estimado na
  promoção"), mesmo depois de vendido.

A faixa é só informação: não muda nenhum resultado do jogo.

- **Promover:** leva o jovem ao elenco profissional, com o contrato inicial (o salário e a duração
  aparecem antes de confirmar). Dá para promover a qualquer momento, menos durante uma partida, e
  só com vaga no elenco.
- **Dispensar:** o jovem deixa o clube e vira **jogador livre** no mercado. Não dá para desfazer.
- Os jovens da base não jogam, não recebem salário e não contam no limite do elenco. Eles evoluem
  como quem joga pouco.
- **Idade-limite:** na virada, quem chega aos 20 anos sai da base. Se você não o promoveu, ele vira
  jogador livre. O jogo avisa quando abre a última janela de transferências e antes do último jogo
  da temporada.

O jogo **não completa o elenco sozinho**. Se o elenco ficar abaixo do mínimo (por exemplo, com
contratos que venceram na virada) ou se a base passar das 15 vagas, a próxima partida fica
impedida até você promover, dispensar ou contratar. A Início mostra o que falta, com o caminho para
a base e para o mercado. Se não houver nenhum candidato (ninguém da posição na base, nenhum livre
da posição e a compra impossível, com a janela fechada ou o caixa negativo), a aba Base oferece
**Subir jovem de emergência**: um jovem novo sobe na hora, para o jogo nunca travar. Os clubes do
computador seguem as mesmas regras.

Quem subiu da base aparece como **cria da base** no detalhe do jogador. As crias do seu clube viram
notícia na **estreia** pelo profissional, no **primeiro gol** e quando você as **vende**. Em
Histórico → Clubes, o card **Crias da base** mostra quantas o clube promoveu e as maiores revelações,
pela força máxima que atingiram, mesmo as que já saíram ou se aposentaram.

## 5. Escalação

- **Esquema:**
  - 4-4-2, 4-3-3, 3-5-2, 4-5-1, 5-3-2, 4-2-3-1, 3-4-3, 4-1-4-1, 4-1-2-1-2, 5-4-1 e 4-2-2-2;
  - o volante fica mais recuado que os meias no campo.
- **Postura:** defensiva, equilibrada ou ofensiva.
- **Campo e listas:**
  - arraste um jogador para uma vaga, ou para cima de outro para trocar os dois;
  - pelo teclado: selecione com Enter ou Espaço e escolha o destino;
  - **A** escala automaticamente; **I** abre o detalhe do jogador em foco.
- **Adequação:** jogar fora da posição natural reduz a força do jogador naquela vaga.
- **Problemas da escalação:** a tela avisa sobre titulares lesionados ou suspensos, goleiro
  ausente, banco incompleto, jogadores cansados e pendurados (a um cartão de suspensão na
  competição do próximo jogo).

Se um titular se machucar ou for suspenso, o jogo ajusta a escalação sozinho antes da partida e
avisa na Início ("Escalação ajustada").

## 6. Rodada ao vivo e simulação direta

**Simular direto** calcula a rodada inteira na hora. **Jogar rodada** abre a rodada ao vivo. Os
dois modos usam o mesmo motor e dão exatamente o mesmo resultado para as mesmas decisões.

Na rodada ao vivo:
- **Meu jogo:** o placar, o relógio, o feed de lances e as estatísticas (posse, finalizações, no
  gol, escanteios, faltas, cartões).
- **Pressão ao longo do jogo:** um gráfico com a chance de cada time criar uma finalização a cada
  minuto, somada às finalizações que de fato aconteceram.
- **Meu time:**
  - os jogadores em campo e os que já saíram, com a condição física e a **nota parcial**;
  - substituições, mudança de esquema, postura e posição;
  - o número de trocas restantes.
- **Outros jogos:** os placares da rodada.
- **Velocidade:** lenta, normal ou rápida (+ e -). **Espaço** pausa e retoma, e **F** termina a
  rodada na hora.
- **Pausas automáticas:**
  - a rodada para sozinha no intervalo do seu jogo (e no da prorrogação), e o segundo tempo só
    começa quando você retoma;
  - opcionalmente, ela também para quando o seu time tem uma lesão ou uma expulsão.
- **Fim da rodada:** os resultados de todos os jogos e o **resumo da partida**, com:
  - os lances principais e as estatísticas;
  - a tabela de jogadas de cada time (passes, passes certos, passes decisivos, desarmes,
    interceptações, finalizações e defesas);
  - a **nota de cada jogador** e o **melhor em campo**.

**Nota do jogador:** vai de 0 a 10, com uma casa decimal; 6,0 é uma atuação comum. Ela considera:
- gols, assistências, finalizações e passes certos;
- passes decisivos, desarmes e interceptações;
- defesas e gols sofridos com o jogador em campo;
- cartões e o resultado do time.

Os pesos dependem da vaga: zagueiros e volantes ganham mais com desarmes, meias com passes, e
atacantes com gols. Quem joga menos de 10 minutos fica sem nota. A nota só informa: não muda nada
no jogo. Partidas sem jogadas (ligas de outros países, partidas antigas) têm uma **nota
simplificada**, marcada como tal.

## 7. Competição

- **Classificação:** a tabela de cada divisão, com as zonas de acesso, rebaixamento e vagas em
  outras competições. Nas competições em fases, os grupos e a fase atual.
- **Resultados:** todos os jogos, rodada a rodada.
- **Artilharia:** os goleadores da competição.
- **Chaveamento:** nas copas em mata-mata, o chaveamento com a ida, a volta, o agregado, a
  prorrogação e os pênaltis.

O jogo pode ter, conforme o banco de dados:
- **liga nacional** com divisões, acesso e rebaixamento;
- **copa nacional** em mata-mata;
- **estaduais** (competições regionais);
- **competições continentais**, com vagas conquistadas pela posição nas competições do país.

## 8. Calendário

O calendário é mensal e mostra os jogos do clube em cada dia: a competição, o adversário, o mando
e o resultado. Os clássicos são marcados. A marca **hoje** fica no último dia de jogos já
disputado; antes do primeiro jogo, ela fica no início da temporada.

## 9. Finanças

| Aba | Conteúdo |
|---|---|
| Visão geral | Saldo, receitas e despesas da temporada e **previsão de caixa** até o fim da temporada. |
| Receitas e despesas | As receitas e as despesas da temporada, conta por conta. |
| Bilheteria | O **preço do ingresso**, com o público e a renda estimados para o próximo jogo em casa. |
| Estádio | A capacidade e as obras de ampliação: cada opção mostra os lugares a mais, o custo e quantas rodadas a obra leva. |
| Crédito | **Empréstimo bancário**: o limite, o uso, os juros, a amortização e a quitação. |
| Histórico | O saldo final de cada temporada. |
| Revendas | As **cláusulas de revenda** a receber e a pagar, o que já foi recebido (com o total) e as que acabaram sem pagamento. |

Caixa negativo por várias rodadas seguidas gera **crise financeira**, que a diretoria cobra.

## 10. Mercado de transferências

O mercado só negocia **dentro das janelas de transferência**. A Início mostra quando a janela
abre e quando fecha.

| Aba | O que faz |
|---|---|
| Buscar | Filtros por posição, idade, força, valor e clube; inclui os jogadores livres. |
| Negociações | As propostas que você fez, com contrapropostas do clube e a resposta do jogador (salário e tempo de contrato). |
| Propostas recebidas | Ofertas de outros clubes pelos seus jogadores: aceitar, recusar ou negociar. |
| Contratos | Renovações e os contratos que terminam nesta temporada. |
| Observação | O departamento de olheiros e os jogadores em observação, com o andamento de cada relatório. |
| Resumo da janela | O que entrou e saiu do seu clube e as maiores transferências do mundo. |

Também há **empréstimos** e **rescisão** de contrato. A IA monta os elencos dos outros clubes,
compra, vende e renova durante as janelas.

### Cláusula de revenda

Ao vender um jogador (numa proposta recebida, numa contraproposta ou na venda imediata), você pode
pedir uma **cláusula de revenda**: um percentual da próxima venda dele, de 5% a 50% em passos de 5%.
Em troca, o comprador paga menos agora: cada ponto de cláusula tira 1% do valor, e a IA aceita até
30%. A tela mostra o valor, o desconto e o valor final antes de confirmar.

- A cláusula vale **uma vez**, na próxima venda definitiva do jogador, por qualquer clube, inclusive
  de outro país. A parte combinada sai do valor recebido pelo vendedor e entra no seu caixa, em
  **Revendas**. Uma revenda alta vira manchete.
- Empréstimo, rescisão e saída como livre não pagam e não acabam com a cláusula.
- Se você comprar o jogador de volta, a cláusula acaba sem pagamento.
- A IA também pede cláusula: ao vender a você um jogador de até 21 anos, o clube pede 20% de revenda
  e mostra o valor com e sem ela. Você aceita ou recusa na etapa do contrato.
- O detalhe do jogador mostra a cláusula ativa ("20% de revenda para o X"), e Finanças → Revendas
  lista as suas.

### Olheiros

O potencial, o temperamento e a propensão a lesões dos jogadores são escondidos. Os **olheiros**
ajudam a conhecê-los antes de contratar:
- O **departamento** começa fechado e sem custo. Na aba Observação, abra-o num nível de 1 a 5:
  - o nível decide as **vagas** (3 a 16 jogadores observados ao mesmo tempo), a **precisão** e o
    **custo mensal**, que aparece em Finanças como "Olheiros";
  - mudar de nível ou fechar vale na hora, e o custo novo vale a partir da próxima cobrança.
- Para mandar observar, use **Observar** no detalhe de um jogador de outro clube ou de um livre.
  O relatório avança a cada rodada da liga do país dele:
  - **potencial estimado:** uma faixa (por exemplo, "62–78") que estreita até a observação ficar
    completa. O valor de verdade está sempre dentro dela;
  - **temperamento e lesões:** depois de metade das etapas, em texto (tranquilo, normal ou
    esquentado; resistente, normal ou propenso a lesões);
  - a **confiança** (inicial, parcial ou completa) e a data da última atualização.
- Cancelar libera a vaga e guarda o relatório. Os relatórios ficam com você mesmo se você trocar de
  clube.
- Os jogadores do **seu elenco** ganham relatório sozinhos com o tempo, sem gastar vagas, mesmo com
  o departamento fechado. As crias da base partem da faixa que tinham na promoção.
- Na busca, as colunas **Observado** e **Potencial** e o filtro **Só observados** mostram os
  relatórios; dá para ordenar pela faixa.

Os relatórios são só informação: não mudam nenhum resultado do jogo. Os clubes do computador não
usam olheiros.

#### Captação de jovens

Com o departamento aberto, a aba Observação também tem a **captação de jovens**:
- **Região:** escolha o estado do clube, outro estado, o país inteiro ou outro país; a troca vale
  a partir da próxima rodada.
- **Indicações:** na abertura de cada janela de transferências, os olheiros indicam jovens de 15 a
  17 anos da região (1 a 3 por janela, pelo nível; menos num estado), com:
  - a faixa de potencial;
  - o temperamento e as lesões em texto (nos níveis 4 e 5);
  - o custo de registro e o prazo (o fim da janela).
- **Trazer:** paga o registro (em "Olheiros") e o jovem entra na base como **captado**, com a região.
  Precisa de vaga na base, de caixa e, para um estrangeiro, de estar abaixo do limite de
  estrangeiros do país. Um captado estrangeiro também respeita esse limite ao ser promovido.
- **Indicações que você não traz somem:** ao recusar, ao vencer o prazo, ao fechar o departamento ou
  ao trocar de clube, nenhum jogador fica no mundo.
- **Na carreira do captado:** promovido, ele aparece nas manchetes de estreia, gol e venda com a
  menção de onde foi captado, e o histórico do clube conta os captados à parte.

## 11. Carreira: diretoria, propostas, técnicos e torcida

- **Diretoria:**
  - as **metas da temporada**: esportiva (posição mínima), financeira e, quando valem, a
    continental e a estadual, cada uma com o estado (no caminho, em risco, cumprida, perdida);
  - a **confiança**, com os motivos de cada mudança;
  - a reputação do técnico.

  Com a confiança baixa, a diretoria pode demitir o técnico, a não ser que a carreira seja sem
  demissão.
- **Propostas:** outros clubes podem convidar o técnico, conforme a reputação. Aceitar troca de
  clube; recusar mantém tudo.
- **Técnicos:** os técnicos de todos os clubes, com as demissões e as contratações da IA.
- **Histórico:** os clubes que o técnico dirigiu, com o período e a saída de cada um.
- **Torcida:**
  - o humor, com a faixa (de revoltada a eufórica), a tendência e os motivos;
  - os **rivais** do clube, com a intensidade de cada rivalidade;
  - os ídolos.

  Os clássicos pesam mais no humor.

O técnico **desempregado** vê, na Início, a reputação, as propostas (com aceitar e recusar), as
ações da rodada e as manchetes. O mundo continua jogando enquanto ele espera uma proposta.

## 12. Notícias

As manchetes de cada rodada, geradas pelo que aconteceu no mundo:
- resultados, goleadas, viradas, zebras e clássicos;
- sequências e recordes;
- técnicos demitidos e contratados e grandes transferências;
- títulos, acessos e rebaixamentos;
- copas, continentais e estaduais;
- a base: a revelação da safra na virada e a estreia, o primeiro gol e a venda das crias do seu
  clube.

Há filtros por competição e pelas notícias do seu clube, e as setas navegam entre as rodadas.

## 13. Histórico

| Aba | Conteúdo |
|---|---|
| Temporadas | Uma linha por temporada do seu clube, com o detalhe de cada uma. |
| Títulos | Os campeões de cada competição. |
| Artilheiros | Os artilheiros de cada temporada. |
| Recordes | Maiores goleadas, mais gols num jogo, mais pontos e mais vitórias seguidas, da liga e do clube. |
| Clubes | O retrospecto de cada clube. |
| Copas, Continental, Estaduais | O histórico de cada tipo de competição. |

## 14. Fim de temporada

Quando a temporada acaba, a tela de fim de temporada mostra:
- a classificação final, os campeões, os acessos e os rebaixamentos;
- os artilheiros e os prêmios;
- o bloco **Base**: quem chegou à base do seu clube, quem foi promovido e quem saiu (dispensado ou
  por idade na virada), com a faixa de potencial de quem chegou;
- a **avaliação da diretoria**;
- o resumo financeiro.

Ao começar a **próxima temporada**, o mundo se renova:
- os jogadores evoluem ou declinam com a idade;
- alguns se aposentam, e chegam jovens à base (aba Base do Elenco);
- as faixas de potencial dos jovens que ficam na base ficam mais estreitas;
- sai a manchete da **revelação da safra**: o jovem mais forte da safra que chegou um ano antes, no
  seu clube e na sua divisão;
- quem chegou aos 20 anos sai da base (promova antes para não perdê-lo);
- os contratos vencem;
- as metas da diretoria são refeitas.

Um aviso na Início resume as mudanças do seu elenco.

## 15. Saves, mods e configurações

- **Carreiras:** a lista das carreiras salvas no navegador, para continuar, exportar ou apagar.
  **Exportar** gera um arquivo `.blsave`, que pode ser importado em outro navegador ou computador.
  Se já existir uma carreira com a mesma identificação, o jogo pergunta se deve substituí-la ou
  importar como cópia.
  Saves de versões antigas continuam abrindo: o jogo atualiza o formato sozinho.
- **Mods:** carregar um pacote `.zip` com outro banco de dados de clubes, jogadores e competições.
  O jogo valida o pacote e lista todos os erros. Cada carreira guarda a própria cópia do banco,
  então trocar de mod não estraga carreiras antigas. Veja [mod-format.md](mod-format.md).
- **Configurações:**
  - velocidade padrão da rodada ao vivo e pausa automática por lesão ou expulsão;
  - tema (claro, escuro ou o do sistema) e idioma;
  - mostrar as dicas de novo.
- **Notas de versão:** o que mudou em cada versão. As novidades desde a última visita aparecem
  marcadas como novas.
- **Atualização:** quando sai uma versão nova, o jogo avisa e oferece recarregar.

Os saves ficam só no seu navegador (IndexedDB). Apagar os dados do site apaga as carreiras, então
exporte as que quiser guardar.

## 16. Atalhos de teclado

**?** mostra os atalhos da tela atual.

| Tecla | Onde | Ação |
|---|---|---|
| `?` | Todas | Mostrar a ajuda de atalhos |
| `,` | Todas | Abrir as configurações |
| `Esc` | Diálogos | Fechar |
| `1` a `6` | Jogo | Início, Elenco, Escalação, Competição, Calendário, Finanças |
| `H`, `M`, `C`, `J` | Jogo | Histórico, Mercado, Carreira, Notícias |
| `S` | Jogo | Jogar a rodada no modo preferido |
| `D` | Jogo | Simular a rodada direto |
| `Espaço` | Rodada ao vivo | Pausar ou retomar |
| `+` / `-` | Rodada ao vivo | Mais rápido ou mais lento |
| `F` | Rodada ao vivo | Terminar a rodada agora |
| `A` | Escalação | Escalar automaticamente |
| `I` | Escalação | Detalhe do jogador em foco |
| `Enter` / `Espaço` | Escalação | Selecionar jogador ou lugar |
| `N` | Fim de temporada | Começar a próxima temporada |

## 17. Acessibilidade

- Contraste mínimo de 4,5:1 nos temas claro e escuro.
- Foco visível e uso completo só com o teclado.
- Leitor de tela: regiões e títulos nomeados, barras com o valor em texto, e resultados e notas
  sempre em texto (a cor nunca é a única informação).
- Respeita a preferência de movimento reduzido do sistema.
- Telas sem rolagem horizontal da página do celular (360 px) ao monitor grande; as tabelas largas
  rolam por dentro.

## 18. Perguntas frequentes

**A rodada ao vivo dá resultado diferente do "Simular direto"?** Não. Com as mesmas decisões, o
resultado é o mesmo. As substituições e as mudanças táticas feitas ao vivo são decisões novas, e
por isso mudam o jogo a partir daquele minuto.

**Posso jogar sem internet?** Sim, depois do primeiro acesso. O jogo fica guardado no navegador
pelo service worker.

**Como levo minha carreira para outro computador?** Em **Carreiras**, exporte o arquivo `.blsave`
e importe-o no outro navegador.

**Os nomes são de clubes reais?** Não. O mundo padrão é fictício. Mods da comunidade podem trazer
outros bancos de dados.

**O que é a seed?** É a semente do mundo. Duas carreiras com a mesma seed e as mesmas decisões
são idênticas, o que é útil para desafios e para reproduzir um problema.
