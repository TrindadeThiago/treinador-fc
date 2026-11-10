# 040 — Captação de jovens

Marco 12 — Olheiros

`/speckit-specify`

```text
Regiões de captação: os olheiros do clube do técnico indicam jovens de fora para a base, além da safra da academia (ver docs/design.md §5 e §14; AUDITORIA-v1.0.0.md, ideia 5; depende da 039 e da 037).

Objetivo: dar ao técnico um segundo caminho para reforçar a base, que depende de onde ele procura e de quanto investe nos olheiros, e não só do nível da academia. Hoje os jovens só chegam pela safra da virada.

Histórias de usuário:
- Como técnico, quero escolher uma região de captação (meu estado, meu país ou outro país) para os olheiros procurarem jovens.
- Como técnico, quero receber indicações de jovens com uma faixa de potencial e decidir se os trago para a base, pagando o custo de registro.
- Como técnico, quero que a região escolhida mude o perfil das indicações (quantidade, qualidade e o limite de estrangeiros).

Escopo:
- Região de captação do departamento de olheiros: o estado do clube, outro estado do país, o país inteiro ou outro país do banco. Trocar de região vale a partir da rodada seguinte.
- Indicações: ao longo da temporada (em datas declaradas, ex.: a cada janela de transferências), os olheiros indicam jovens de 15 a 17 anos da região. A quantidade e a qualidade dependem do nível do departamento (039) e da força do país da região. Cada indicação vem com a faixa de potencial (mecanismo da 038) e os atributos em texto (039).
- Os jovens indicados são novos e ficam numa lista de indicações. Só entram no mundo se o técnico os trouxer; uma indicação recusada ou que expira some sem deixar jogador no mundo. O jogo continua sem criar jogadores direto no elenco: quem é trazido entra na base, ocupando vaga, com a origem "captado" e a região.
- Trazer um indicado tem custo de registro, pago na hora, na categoria "Olheiros", e respeita as vagas da base (037) e o limite de estrangeiros do país.
- Nomes dos indicados pelo banco de nomes do país de origem (Princípio IV).
- Manchete quando um captado estreia ou se destaca, ao lado das manchetes de cria da base (038). O histórico do clube conta os captados separado das crias da safra.
- Mods: regiões, frequência, quantidade e qualidade por nível e o custo de registro como regras com valores padrão, opcionais e documentadas.
- Save: formato novo com a região, as indicações abertas e a origem dos captados; a migração começa sem região e sem indicações.

Requisitos:
- Equilíbrio: a captação vale só para o clube do técnico e não pode fazer da base uma fonte infinita de talento. Medir em carreiras de 10 temporadas que o melhor uso da captação melhora a base sem passar da academia nível 5 sozinha, e que a população do mundo e as faixas de força, craques e promessas continuam dentro dos limites (critérios da 036).
- Sem captação, a mesma seed dá a mesma carreira da versão anterior; as linhas de base existentes não são regravadas.
- Determinismo: as indicações vêm de uma semente própria por data e região.
- Textos, plural e formatos pelo i18n.
- Nota de versão e subida de versão (minor) no mesmo PR.

Fora de escopo: clubes da IA captando, peneiras e testes presenciais, contratos de formação e compensação ao clube de origem.

Critérios de aceite:
- Escolho outro país como região, recebo indicações com faixa de potencial, trago um jovem para a base e ele aparece como captado, com a região.
- Recusar ou deixar expirar uma indicação não deixa nenhum jogador novo no mundo.
- Em 30 temporadas sem interação, o mundo continua dentro das faixas; em 10 temporadas com captação máxima, a base melhora dentro do limite medido.
- Um save da versão anterior abre, migra e continua a carreira.
```
