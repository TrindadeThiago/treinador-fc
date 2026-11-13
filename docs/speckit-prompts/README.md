# Prompts para Spec Kit

Prompts prontos para o fluxo Spec-Driven Development com o Spec Kit, derivados de
[`../design.md`](../design.md). Cada marco do roadmap foi dividido em features menores;
cada prompt vira uma pasta `specs/NNN-*` via `/speckit-specify`. A numeração dos
prompts é global e corresponde à numeração das specs.

## Como usar

1. Rodar **uma vez** o prompt de [`constituicao.md`](constituicao.md) com `/speckit-constitution`.
2. Para cada prompt, na ordem:
   `/speckit-specify <prompt>` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`.
3. Só avançar de marco quando o critério "Pronto quando…" do marco (ver `design.md` §13) for atingido.

Os prompts de specify descrevem **o quê e por quê**. Decisões de stack e arquitetura
ficam na constituição e entram no `/speckit-plan`.

## Estrutura

| Marco | Prompt | Feature | Depende de |
|---|---|---|---|
| M1 — Motor | [001](marco1/prompt001.md) | Modelo de dados e banco fictício | — |
| | [002](marco1/prompt002.md) | Motor de partida | 001 |
| | [003](marco1/prompt003.md) | Temporada de pontos corridos | 002 |
| M2 — Temporada jogável | [004](marco2/prompt004.md) | Aplicação web, novo jogo e saves | 003 |
| | [005](marco2/prompt005.md) | Escalação e táticas | 004 |
| | [006](marco2/prompt006.md) | Rodada ao vivo e telas da competição | 005 |
| M3 — Carreira | [007](marco3/prompt007.md) | Múltiplas divisões e virada de temporada | 006 |
| | [008](marco3/prompt008.md) | Finanças do clube | 007 |
| | [009](marco3/prompt009.md) | Evolução, aposentadoria e renovação do mundo | 007 |
| M4 — Mercado | [010](marco4/prompt010.md) | Contratos e mercado de transferências | 008, 009 |
| | [011](marco4/prompt011.md) | IA de transferências | 010 |
| M5 — Drama | [012](marco5/prompt012.md) | Carreira do técnico e diretoria | 008 |
| | [013](marco5/prompt013.md) | Torcida e rivalidades | 012 |
| | [014](marco5/prompt014.md) | Manchetes e histórico | 013 |
| M6 — Lançamento | [015](marco6/prompt015.md) | Saves portáteis e formato de mod | 014 |
| | [016](marco6/prompt016.md) | Polimento e publicação | 015 |
| M7 — Copas | [017](marco7/prompt017.md) | Calendário multi-competição | 016 |
| | [018](marco7/prompt018.md) | Mata-mata e copa nacional | 017 |
| | [019](marco7/prompt019.md) | Fase de grupos e competições em fases | 018 |
| M8 — Mundo | [020](marco8/prompt020.md) | Vários países e simulação em escala | 017 |
| | [021](marco8/prompt021.md) | Classificação entre competições | 018, 020 |
| M9 — Futebol sul-americano | [022](marco9/prompt022.md) | Competições continentais | 019, 021 |
| | [023](marco9/prompt023.md) | Estaduais | 019, 021 |
| | [024](marco9/prompt024.md) | Mod do futebol sul-americano | 022, 023 |
| M10 — Nova interface | [025](marco10/prompt025.md) | Fundação visual e estrutura do jogo | 016 |
| | [026](marco10/prompt026.md) | Telas do clube: Início, Elenco e Escalação | 025 |
| | [027](marco10/prompt027.md) | Competição, calendário e histórico | 025 |
| | [028](marco10/prompt028.md) | Mercado e finanças | 025 |
| | [029](marco10/prompt029.md) | Carreira, diretoria e notícias | 025 |
| | [030](marco10/prompt030.md) | Rodada ao vivo e fim de temporada | 025, 026 |
| | [031](marco10/prompt031.md) | Telas de entrada e configuração | 025 |
| | [032](marco10/prompt032.md) | Telas estreitas, acessibilidade e fechamento do marco | 026 a 031 |
| M11 — Categorias de base | [036](marco11/prompt036.md) | Elenco de base | 009, 032 |
| | [037](marco11/prompt037.md) | Academia e investimento na base | 008, 036 |
| | [038](marco11/prompt038.md) | Potencial estimado e revelações | 014, 037 |
| M12 — Olheiros | [039](marco12/prompt039.md) | Olheiros e relatórios de jogadores | 028, 038 |
| | [040](marco12/prompt040.md) | Captação de jovens | 037, 039 |
| M13 — Mercado: cláusulas e empresários | [041](marco13/prompt041.md) | Cláusula de revenda | 011, 036 |
| | [042](marco13/prompt042.md) | Empresários | 011, 041 |
| M14 — Sócio-torcedor (adiado) | [043](marco14/prompt043.md) | Programa de sócio-torcedor | 008, 013 |
| | [044](marco14/prompt044.md) | Sócios na vida do clube | 012, 014, 043 |

O marco 10 é uma refatoração só visual: não muda motor, regras nem saves. As decisões de design que
os prompts 025 a 032 compartilham estão em [`../interface-nova.md`](../interface-nova.md). Cada
feature que muda o que o jogador vê termina com a nota de versão e a subida de versão no mesmo PR,
**exceto no marco 10**, que segue o fluxo abaixo.

As features 033 a 035 (estatísticas de jogadas, nota do jogador e reformulação do Início) vieram de
pedidos avulsos, sem prompt de marco. O marco 11 volta ao fluxo normal: cada feature sai de uma
branch própria da `main`, e o PR leva a nota de versão e a subida de versão (minor).

Os marcos 12 a 14 vêm das ideias de feature da [`AUDITORIA-v1.0.0.md`](../../AUDITORIA-v1.0.0.md)
(a ideia 3, academia, foi o marco 11) e seguem o mesmo fluxo do marco 11. Ordem sugerida:
- **M12 — Olheiros** (ideia 5) continua a faixa de potencial da 038: relatórios de jogadores de outros
  clubes e captação de jovens para a base;
- **M13 — Mercado** (ideias 2 e 1): cláusula de revenda e empresários, que mexem na mesma
  negociação; a cláusula vem antes porque não muda a IA entre clubes e combina com as crias;
- **M14 — Sócio-torcedor** (ideia 4): a receita nova e, depois, a meta da diretoria, as campanhas,
  as manchetes e o histórico. **Adiado** por decisão (2026-11-13): fica para o futuro, e os prompts
  043 e 044 continuam guardados para quando ele voltar.

Os marcos são independentes entre si; a ordem pode mudar sem retrabalho.

**Fluxo do marco 10.** O marco é desenvolvido na branch `release/v1.0.0`, cortada da `main` depois do
PR de documentação. Cada feature (025 a 031) sai de uma branch própria dessa branch e volta para ela
por um PR com `release/v1.0.0` como base; esses merges não publicam nada, porque o release só
dispara na `main`, que fica congelada durante o marco. A versão do jogo vai para **1.0.0 já na 025**
(as versões 1.0.0 a 1.10.0 viram a fase beta, com tags `beta-vX.Y.Z`) e as features só enriquecem a
nota única do 1.0.0. A 032 fecha o marco e o lançamento é um PR de `release/v1.0.0` para a `main`,
com merge commit. Detalhes em [`../interface-nova.md`](../interface-nova.md), seção 6.
