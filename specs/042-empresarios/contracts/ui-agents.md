# Contrato: interface — empresários (042)

A web só lê e dispara. A comissão de referência, a mínima, o teto e o salário com a comissão vêm do motor (`commissionQuote`, `wageWithCommission`).

## Ações do save (`packages/save/src/market.ts`)

- `proposeManagerContract(save, id, { wage, years, acceptResale?, commission? })`
- `agentsViewOf(market, world, careerSeed, clubId)` (motor), lido pela web a partir do save: os empresários com quem o clube negociou (relação, faixa, ganância, influência, carteira e último negócio).

## Telas

| Onde | O que muda |
|---|---|
| **Detalhe do jogador** (`PlayerDetails`, `PlayerModal`, `MarketPlayerModal`) | A linha "Empresário: Nome · Relação: boa (68)". |
| **Negociação, etapa do contrato** (`NegotiationDialog`) | O empresário e a relação. O campo "Comissão" (`MoneyInput`), preenchido com a referência. Abaixo, em `aria-live`, o salário pedido com a comissão, ou "sem interesse: o empresário leva a proposta adiante com uma comissão de X", ou "sem interesse, mesmo com comissão". O aviso do teto. |
| **Mercado, aba nova "Empresários"** (`ui/market/AgentsTab.tsx`) | A tabela dos empresários com quem o clube negociou (nome, país, relação em texto e número, ganância, influência, jogadores na carteira, último negócio). Ao escolher um, a carteira com links para o detalhe. A aba só aparece com o técnico empregado. |
| **Livro-caixa** (`FinanceSummary`, `finance-series`) | A categoria `commission` ("Comissões"), em despesas. |
| **Notícias** | As manchetes `agentBroke` e `agentBigDeal`. |

## Faixas da relação (texto, nunca só cor)

| Faixa | Valores | Texto |
|---|---|---|
| `broken` | 0 | "rompida" |
| `bad` | 1–24 | "ruim" |
| `cold` | 25–44 | "fria" |
| `neutral` | 45–55 | "neutra" |
| `good` | 56–79 | "boa" |
| `great` | 80–100 | "ótima" |

Ganância e influência em texto: "baixa", "moderada", "média", "alta" e "muito alta", de 1 a 5.

## i18n (`ui.json`, `market-errors.json`)

- **Categoria:** `finance.category.commission`: "Comissões".
- **Textos da aba e da negociação:** `agents.*` (com plural na carteira e no último negócio) e `market.commission.*` (campo, efeito, mínimo, teto).
- **Manchetes:** `news.agentBroke.N` e `news.agentBigDeal.N` (3 variações cada).
- **Erro:** a falta de caixa continua `market.insufficient_cash`, com `needed` = taxa + comissão.

## Acessibilidade

O campo de comissão tem rótulo e dica. O efeito no salário fica em `aria-live="polite"`. A tabela tem cabeçalho. A relação e os atributos aparecem em texto.
