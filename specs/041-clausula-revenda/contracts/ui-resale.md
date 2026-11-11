# Contrato: interface — cláusula de revenda (041)

A web só lê o estado e dispara as ações. Todo cálculo (desconto, teto, fatia) vem do motor (`feeWithResale`, `resaleShare`, `clubResaleView`).

## Ações do save (`packages/save/src/market.ts`)

- `answerIncoming(save, offerId, { kind: "accept", resalePct? } | { kind: "counter", fee, resalePct? } | { kind: "refuse" })`
- `quoteSale(save, playerId, resalePct?)`, `sellNow(save, playerId, resalePct?)`
- `proposeContract(save, negotiationId, wage, years, { acceptResale? })`

## Telas

| Onde | O que muda |
|---|---|
| **Propostas recebidas** (`ui/market/IncomingOffers.tsx`) | Um seletor "Cláusula de revenda" com "Sem cláusula" e os passos de `resaleSteps`. Mostra o valor da proposta, o desconto e o valor final. Os passos acima do teto ficam desabilitados, com o texto "o comprador aceita até X%". |
| **Venda imediata** (`ui/DisposalDialog.tsx`) | O mesmo seletor; a cotação mostra o comprador, o valor, o desconto e o valor final. |
| **Negociação de compra** (`ui/market/NegotiationDialog.tsx`) | Com `resaleAsk`, um bloco "O clube pede X% de revenda", com o valor com e sem a cláusula e a escolha (aceitar / recusar a cláusula) na etapa do contrato. Uma cláusula ativa a favor de outro clube aparece como aviso. |
| **Detalhe do jogador** (`ui/PlayerDetails.tsx`, `MarketPlayerModal.tsx`) | A linha "X% de revenda para o clube Y", quando houver. |
| **Finanças** (`ui/finance/`, aba nova `ResaleTab.tsx`) | Listas "A receber" e "A pagar" (jogador, clube atual, %, data da venda, valor de mercado atual; o clube atual de um jogador livre aparece como "Livre"), "Recebidas" (só as pagas: jogador, comprador, valor da venda, valor recebido, data; total) e "Encerradas sem pagamento" (recompra ou aposentadoria, com o motivo em texto). "A receber" e "A pagar" têm rótulo de texto, além de qualquer cor. A aba só aparece com o técnico empregado. |
| **Livro-caixa** (`FinanceSummary.tsx`, `game/finance-series.ts`) | A categoria `resale` ("Revendas"). |
| **Notícias** | A manchete `resaleReceived`. |

## i18n (`packages/i18n/locales/pt-BR/ui.json` e `market-errors.json`)

- `finance.category.resale`: "Revendas".
- `market.resale.*`:
  - seletor, desconto, valor final e teto;
  - a cláusula pedida e o aviso de cláusula ativa;
  - a linha do detalhe, com `{pct, number, percent}` e o dinheiro pelo formatador.
- `finance.resale.*`: as abas, as colunas, os vazios e o total, com plural.
- a manchete `resaleReceived` em `ui.json`, junto de `academySale`: frase completa com `select` de `cria`.
- `market.resale_invalid_pct` e `market.resale_above_ceiling` em `market-errors.json`.
- "A receber" e "a pagar" vêm com texto, além de qualquer cor.

## Acessibilidade

O seletor é um `<select>` com rótulo. O valor final fica num `aria-live="polite"`. As listas são tabelas com cabeçalho.
