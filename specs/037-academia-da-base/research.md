# Research: Academia e investimento na base (037)

Parte da 036 (1.9.0): `RenewalState.academy` guarda a base de todos os clubes, fora de
`world.players`. A safra (`generateYouth`) usa `youthCount(reputação)` (1 a 3 jovens) e
`createYouth` (força pela reputação e pelo regulador). A IA promove da base só até 22 jogadores
(036 I7). A economia é sensível: na 036, mudar a safra afetou o caixa dos clubes só de estadual e
a correlação vagas × títulos da continental.

## R1. Onde fica a academia

**Decisão:** `AcademyState.clubs: Record<clubId, AcademyClub>`, com `AcademyClub = { level, pending? }`.
`pending` é `{ kind: "upgrade"; cost }` ou `{ kind: "downgrade" }`. O registro vive em
`RenewalState.academy`, junto da base: viaja pelo dia e pela virada sem campos novos no save.

**Alternativa:** guardar em `FinanceState.clubs` (como a obra do estádio). Rejeitada: o nível
decide a safra e a evolução, que são renovação; só a manutenção é finança, e ela lê o nível.

## R2. Regras e formato de mod

**Decisão:** `ACADEMY_LEVELS` (padrão no motor) com 5 entradas, e `economy.academy` opcional na
competição principal do país (mesmo lugar das regras econômicas, 020), validado por Zod.

| Nível | Reputação inicial | Vagas | Jovens por safra | Força (ajuste) | Margem de potencial (bônus) | Bônus de evolução | Manutenção (% da folha mensal) | Obra para chegar (folhas mensais) |
|---|---|---|---|---|---|---|---|---|
| 1 | < 30 | 15 | 1 | −3 | +0 | 0,00 | 2% | — |
| 2 | 30–44 | 15 | 1 | −1 | +2 | 0,10 | 4% | 2 |
| 3 | 45–64 | 15 | 2 | +1 | +4 | 0,20 | 6% | 3 |
| 4 | 65–79 | 20 | 3 | +3 | +6 | 0,30 | 8% | 4,5 |
| 5 | ≥ 80 | 25 | 4 | +5 | +8 | 0,40 | 10% | 6 |

- **Força:** `base + perReputation × rep + ajuste do nível + regulador`. O peso da reputação cai
  de 0,12 para 0,06, e a base sobe para manter a média do mundo (a calibragem fecha o número).
- **Bônus de evolução:** entra como participação mínima na `evolutionDelta` dos jovens da base
  (hoje 0). Com o fator `0,5 + participação`, o nível 5 faz um jovem evoluir como quem joga 40%
  dos minutos.
- **Quantidade:** as faixas de reputação deixam a média da IA perto de hoje (1,7 jovem por clube).
  Os níveis 4 e 5 são raros na IA (reputação ≥ 65); o técnico chega a eles investindo.

Valores iniciais. A calibragem (R9) pode mudá-los e registra o resultado aqui.

## R3. Folha de referência e custos

**Decisão:** a folha mensal de referência é `22 × deriveWage(jogador típico) × fator do país`,
onde o jogador típico tem força `50 + 0,15 × reputação`. É uma função do clube (reputação) e do
país (`wageFactorPct`, ou o fator regional), sem depender do elenco do dia. Por isso não muda a
cada contratação (spec FR-011).

- **Obra:** `custo = folhas[nível de destino] × folha de referência`, arredondado a 1 000.
- **Manutenção anual:** `12 × pct[nível] × folha de referência`. É cobrada por rodada como a folha
  (`wageInstalment`), na categoria nova `academy` do livro-caixa, para os clubes da liga e para os
  só regionais, nos mesmos laços da folha (`finance/round.ts`).
- **Mudança de nível:** na virada, a manutenção da temporada que começa usa o nível novo.

**Alternativa:** usar a folha real do clube. Rejeitada pela spec (o custo mudaria a cada
contratação e o técnico poderia "baratear" a obra vendendo jogadores).

## R4. Investimento do técnico

**Decisão:** comandos do motor `upgradeAcademy` e `downgradeAcademy`, e o cancelamento
`cancelAcademyChange` (só da redução).
- Melhorar exige nível < 5, nenhuma mudança pendente e `caixa ≥ custo`, como a obra do estádio.
  O custo sai na hora (`post(... "academy", -custo)`), e o pendente guarda o custo pago.
- Baixar exige nível > 1 e nenhuma pendente.
- Desempregado: nada.
- No save: `upgradeYouthAcademy`, `downgradeYouthAcademy` e `cancelYouthAcademyChange`.

## R5. Virada

Nova etapa `academy-levels`, por país, logo depois de `academy-open` e antes de
`regulate-world`:
1. **Clube do técnico:** aplica o pendente (obra: nível +1; redução: nível −1).
2. **Clube sem técnico:** a obra paga termina, a redução é cancelada, e daí em diante segue a IA
   (spec, esclarecimento 3).
3. **IA:** o nível anda um degrau na direção do nível que a reputação dá, sem custo de obra.
4. **Excesso de vagas** (o nível caiu): na IA, os de menor utilidade saem como livres; no técnico,
   fica o bloqueio da 036 (`rosterIssues` usa o limite do nível).

`generateYouth` passa a usar `levelOf(club)` para a quantidade, a força e o potencial, e o limite
de vagas (`academyLimit(level)`) troca o `ACADEMY_RULES.maxPlayers` fixo da 036. `evolveAcademy`
recebe o bônus do nível.

## R6. Base inicial cheia

**Decisão:** `seedAcademies(world, renewal, careerSeed, date)` completa a base de cada clube até
15 jovens.
- Idades distribuídas: 3 jovens de cada idade de 15 a 19 (faltando menos de 15, a distribuição
  começa pelas idades menores).
- Qualidade pelo nível da academia do clube, e posição pela carência de elenco mais base.
- Seed: `${careerSeed}:academy-seed:${clubId}`.

Usada:
- na criação da carreira (`createSave`), depois de `initialRenewal`;
- na migração v21 → v22, que só completa: quem já está na base fica.

**Efeito esperado:** cerca de 15 jovens por clube (no mundo padrão de 440 clubes, perto de 6 600
registros, cerca de 1,3 MB a mais no save; o teto do mundo grande é 42 MB). Nas primeiras viradas,
saem por idade cerca de 3 jovens por clube por virada (os de 19 anos). A IA promove todos eles, e o
reequilíbrio libera quem passa do máximo. Por isso o número de livres e a população sobem no
começo. O limite de livres do teste de 30 temporadas (`MAX_FREE_AGENTS = 150`) e o critério de
população da 036 (variação a partir da temporada 5) são medidos e revistos com justificativa se
for preciso.

## R7. Interface

Painel da academia no topo da aba Base (`AcademyPanel`):
- nível (texto "Nível 3 de 5" e o `Meter` acessível);
- custo mensal (`formatMoney`);
- efeito (quantidade em número, qualidade na escala de texto, e o próximo nível ao lado);
- mudança pendente;
- ações Melhorar e Baixar (`Dialog`), com o custo, a manutenção nova, "na virada" e o caixa depois;
- cancelar a redução;
- comparação com a divisão (lista de clubes e níveis, o próprio marcado em texto).

A escala de qualidade é um rótulo por nível (`academy.quality.1` a `.5`). A categoria `academy`
entra nas tabelas e gráficos das finanças (`FinanceTables`, `finance-series`) e no resumo.

## R8. Save v22

`SAVE_FORMAT_VERSION` 21 → 22. A migração cria `academy.clubs` com o nível da reputação e sem
pendente, e chama `seedAcademies` (completa até 15). A validação confere níveis de 1 a 5, pendente
coerente (obra com nível < 5, redução com nível > 1) e clubes existentes. Teste
`migrate-v22.test.ts` com a fixture `saveV21`.

## R9. Equilíbrio e medidas

O teste de 30 temporadas e o `sim:world` ganham:
- o nível médio da IA;
- a manutenção sobre a receita (para limites, ver a tabela);
- clubes em crise.

Os critérios da 036 continuam. O `sim:economy` ganha um cenário de 10 temporadas com um clube
pequeno nos níveis 1 e 5, que mede:
- jovens por safra;
- força e potencial médios;
- receita de venda das crias;
- custo da academia.

Limites declarados:
- SC-002: o nível 5 traz pelo menos 1,5× os jovens do nível 1;
- SC-003: no clube pequeno, as vendas das crias ficam abaixo do custo do nível 5;
- SC-004: fração em crise dentro dos limites atuais.

A continental completa roda em 3 seeds (`padrão`, `var-a`, `var-b`), comparando as médias com as
da 1.9.0: 0,13 na correlação e 16,4% nos prêmios.

## R10. Versão e documentação

Versão 1.10.0, com a nota do dia. Documentação a atualizar:
- `docs/guia-do-jogador.md`: academia;
- `docs/mod-format.md`: `economy.academy`;
- `docs/glossario.md`: academia, nível da academia;
- `docs/arquitetura.md`.
