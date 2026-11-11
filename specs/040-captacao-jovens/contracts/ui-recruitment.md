# Contrato: interface — captação (040)

Todos os textos ficam em `packages/i18n/locales/pt-BR/ui.json`, com plural e formatos pelo i18n.

## Mercado → Observação (`apps/web/src/ui/market/ScoutingTab.tsx`)

Um bloco novo, **"Captação de jovens"** (`recruitment.title`), abaixo do painel do departamento.

**Com o departamento fechado:** o texto `recruitment.closed`, que explica que é preciso abrir o departamento.

**Região:**
- um `select` com "Nenhuma", os estados do país do clube, o país do clube e os outros países;
- abaixo dele, a região em vigor e a pendente ("vale a partir da próxima rodada").

**Próxima data:** "Próximas indicações na abertura da janela, na rodada R" ou "na pré-temporada".

**Tabela das indicações abertas**, com estas colunas:
- nome, idade, posição e força;
- nacionalidade (sigla do país);
- faixa (`EstimateRange`);
- temperamento e lesões, em texto ou "ainda não avaliado";
- custo de registro;
- prazo ("até a rodada R");
- ações **Trazer** e **Recusar**.

**Ação Trazer:**
- desabilitada, com o motivo em texto, quando: sem vaga na base, caixa insuficiente ("faltam X") ou limite de estrangeiros;
- abre a confirmação com o custo e o caixa depois.

**Estado vazio:** a explicação de quando chegam as indicações.

## Aba Base do Elenco (`AcademyTab.tsx`)

Coluna ou marca **"Origem"**: "Safra" ou "Captado (região)", em texto.

## Detalhe do jogador

A origem aparece como "Captado em {região} ({ano})", ao lado de "Cria da base".

## Histórico do clube (`ClubHistory`)

- **Card "Crias da base":** "N crias promovidas, das quais M captadas" (com plural). Na lista das maiores revelações, a marca "captado".

## Manchetes

As variações de `news.academyDebut`, `news.academyFirstGoal` e `news.academySale` ganham um `select` em `scouted`:
- `yes`: "…, captado em {regionName}, …";
- `other`: o texto atual.

## Acessibilidade

- Os motivos e a origem são sempre texto.
- A tabela e a confirmação funcionam pelo teclado.
- A tela de Observação já está no `a11y.spec.ts` e no layout (039).
