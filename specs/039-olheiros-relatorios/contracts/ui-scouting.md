# Contrato: interface — olheiros (039)

Todos os textos ficam em `packages/i18n/locales/pt-BR/ui.json`, com plural e formatos pelo i18n.

## Mercado (`apps/web/src/app/jogo/mercado/page.tsx`)

**Aba nova "Observação" (`market.tab.scouting`), com o painel do departamento:**
- nível ("Fechado" ou "Nível N de 5");
- vagas usadas ("3 de 8 vagas");
- custo mensal;
- ações **Abrir**, **Mudar nível** e **Fechar**, com um diálogo que mostra:
  - o custo novo e as vagas novas;
  - quantas observações serão canceladas, quando houver;
  - que o custo vale a partir da próxima cobrança.

**Tabela dos observados:**
- nome, clube, posição e força;
- faixa de potencial (`EstimateRange`, 038);
- confiança em texto;
- andamento ("4 de 10 etapas");
- ação **Cancelar**.

**Estado vazio:** a explicação do que os olheiros fazem.

## Busca do mercado (`ui/market/MarketTable.tsx`, `MarketFilters.tsx`)

**Coluna "Observado":** "Sim", "Em observação" ou vazio, sempre em texto.

**Coluna "Potencial":** a faixa por extenso para o leitor de tela. É ordenável pelo valor central e, no empate, pelo limite superior; quem não tem relatório vai para o fim nos dois sentidos.

**Filtro "Só observados":** um checkbox, que combina com o filtro de posição que já existe.

**Ação "Observar"** na linha ou no detalhe (`MarketPlayerModal`):
- fica desabilitada, com o motivo, quando o departamento está fechado, sem vaga ou com o jogador já em observação;
- some para os jogadores do próprio elenco.

## Detalhe do jogador (`PlayerDetails`, `PlayerModal`, `MarketPlayerModal`)

**Bloco "Relatório do olheiro":**
- faixa;
- temperamento e propensão em texto, ou "ainda não avaliado";
- confiança;
- "Atualizado na rodada R de AAAA".

Quem tem relatório automático e também a faixa da promoção (038) mostra só o relatório, que já parte daquela faixa.

## Finanças

A categoria "Olheiros" (`finance.category.scouting`) aparece nas tabelas, na previsão e no resumo.

## Acessibilidade

- Os graus e a confiança são sempre texto.
- Os diálogos e a tabela funcionam pelo teclado.
- O `a11y.spec.ts` e o layout de 768 px cobrem a aba Observação.
