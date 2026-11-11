# Implementation Plan: Cláusula de revenda

**Branch**: `041-clausula-revenda` | **Date**: 2026-11-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/041-clausula-revenda/spec.md`

## Summary

**Onde mora:** a cláusula fica no mercado, em `MarketState.resale?`, com as cláusulas ativas (uma por jogador), o histórico de encerradas e um contador. O campo ausente quer dizer nenhuma cláusula (R1).

**Pagamento num ponto só:** toda transferência definitiva passa por `completeTransfer`, seja do técnico, da IA, entre países ou nas ligas de fora. É ali que a cláusula ativa é paga (do vendedor ao credor, na categoria nova `resale`) ou encerrada sem pagamento, se o comprador é o credor. Depois disso nasce a cláusula nova, se houver (R2, R3).

**Negociação:** o desconto é `fee × (1 − pct × 1%)`, com o teto da IA em 30% (R4). O que muda em cada fluxo:
- **proposta recebida e contraproposta:** ganham `resalePct`;
- **venda imediata:** ganha `resalePct`, mantendo o comprador da cotação;
- **compra do técnico:** a IA pede 20% em quem tem até 21 anos, por comparação de idade (sem sorte), e o técnico aceita ou recusa no contrato;
- **IA × IA:** nunca cria cláusula (R5).

**Arbitragem:** com o desconto limitado a 1% por ponto, o piso do A2 vale sobre o líquido. A prova é feita por enumeração, como no A2: conservação em cada transferência e ciclos com cláusula nunca melhores que sem (R6).

**Neutralidade e equilíbrio:** sem cláusula criada, nada muda, e as linhas de base passam sem regravar. O cenário `resale` do `sim:economy` mede os ciclos e 30 temporadas com um técnico automático (R7).

**Telas e narrativa:** o seletor nas propostas e na venda imediata, a cláusula pedida na compra, a linha no detalhe do jogador, a aba Revendas em Finanças e a manchete `resaleReceived` (R9).

**Save e versão:** save v26 (R10) e versão 1.14.0.

## Technical Context

**Language/Version**: TypeScript 5 (`strict`), Node 22

**Primary Dependencies**: motor próprio, Zod 4, Next.js 16 (static export) e React 19; nenhuma dependência nova (sem `fast-check`: as propriedades são enumerações determinísticas, como no A2)

**Storage**: save v25 → v26:
- `market.resale` opcional;
- `resale: 0` nos resumos de temporada;
- `resaleAsk` opcional nas negociações.

**Testing**: Vitest (motor, save, web), Playwright, `sim:economy` (cenário novo `resale`), `sim:gates`; as linhas de base existentes como prova de neutralidade

**Target Platform**: navegador (PWA offline)

**Project Type**: monorepo pnpm (`packages/engine`, `packages/save`, `packages/i18n`, `apps/web`, `tools`)

**Performance Goals**: uma busca por `playerId` nas cláusulas ativas a cada transferência; a lista é pequena (só nasce de negócios do técnico)

**Constraints**:
- conservação exata do dinheiro;
- determinismo, com a IA pedindo cláusula sem PRNG;
- sem cláusula, nada muda;
- tetos do save (`receipts` ≤ 200).

**Scale/Scope**:
- **motor:** 1 arquivo novo (`market/resale.ts`) e ajustes em `effects`, `incoming`, `disposal`, `negotiation`, `rules`, `types`, `errors`, `finance/types`, `model/schemas` e `news`;
- **save:** v26, as ações com os parâmetros novos e a limpeza na virada;
- **web:** o seletor, o bloco da cláusula pedida, a linha no detalhe, a aba Revendas, a categoria do livro-caixa e os textos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Motor separado:** desconto, teto, pedido da IA, pagamento e listas ficam no motor (`market/resale.ts`). A web só lê e dispara.
- [x] **II. Determinismo:** o pedido da IA é uma comparação de idade, sem PRNG. A ordem de criação e encerramento é fixa (encerra, depois cria). Sem cláusula, a carreira é idêntica (linhas de base intactas).
- [x] **III. Dados, não código:** faixa, passo, desconto, teto, pedido, idade e limiar da manchete são regras em `market.resale`, opcionais no mod e validadas por Zod.
- [x] **IV. Sem conteúdo protegido:** nada novo de conteúdo.
- [x] **V. Balanceamento verificável:** o cenário `resale` do `sim:economy` tem limites declarados (ciclos com cláusula ≤ sem; caixa da IA e faixas do mundo em 30 temporadas). A conservação é provada por enumeração.
- [x] **VI. Saves versionados:** v26 com migração e fixture `saveV25`.
- [x] **VII. i18n:** textos, manchete e erros com plural, `select` e formatos de dinheiro e percentual.
- [x] **VIII. Offline e gratuito:** sem rede.
- [x] **IX. Testes primeiro no motor:** regras, pagamento, recompra, saídas que não pagam, conservação e arbitragem antes do código.

**Re-check após o design**: mantido. O limite `discountPerPointPct ≤ 1` no schema é o que preserva o piso do A2 no líquido (R6). Sem ele, um mod poderia reabrir a arbitragem.

## Project Structure

### Documentation (this feature)

```text
specs/041-clausula-revenda/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── engine-resale.md
│   └── ui-resale.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/market/resale.ts                                # novo: regras, desconto, cláusula ativa, pedido da IA, visão do clube, limpeza
packages/engine/src/market/{types,errors,rules,effects,incoming,disposal,negotiation}.ts
packages/engine/src/finance/types.ts                                # categoria resale
packages/engine/src/model/schemas.ts                                # market.resale (Zod)
packages/engine/src/news/{round,resale}.ts                          # manchete resaleReceived
packages/engine/test/market/{resale,resale-property}.test.ts        # novos
packages/engine/test/news/resale.test.ts                            # novo
packages/save/src/{format,migrate,market,career,scale-limits}.ts    # v26, ações, limpeza na virada
packages/save/test/{migrate-v26.test.ts,fixtures.ts}                # saveV25
apps/web/src/ui/market/{IncomingOffers,NegotiationDialog,MarketPlayerModal}.tsx
apps/web/src/ui/{DisposalDialog,PlayerDetails,FinanceSummary}.tsx
apps/web/src/ui/finance/ResaleTab.tsx                               # novo
apps/web/src/game/{finance-series.ts,GameProvider.tsx}
apps/web/test/ui/resale.test.tsx, apps/web/e2e/resale.spec.ts
packages/i18n/locales/pt-BR/{ui,market-errors,release-notes}.json   # manchetes ficam em ui.json
tools/src/simulate-economy.ts                                       # cenário resale
docs/{guia-do-jogador,mod-format,glossario,arquitetura}.md
package.json                                                        # 1.14.0
```

**Structure Decision**: a cláusula é parte do módulo `market/`. O ponto único de pagamento é `completeTransfer`, sem caminho paralelo para a IA ou para as ligas de fora.

## Fases (para o /speckit-tasks)

1. **Fundação:**
   - tipos, erros e regras com o schema;
   - a categoria `resale`;
   - `market/resale.ts` (funções puras);
   - save v26 e a migração.
2. **US1 (vender com cláusula):**
   - `completeTransfer` cria a cláusula;
   - `resalePct` na proposta recebida, na contraproposta e na venda imediata;
   - o seletor na UI.
3. **US2 (receber):**
   - o pagamento e a recompra em `completeTransfer`;
   - os testes de empréstimo, rescisão e livre;
   - a conservação e os ciclos por enumeração;
   - a limpeza na virada;
   - a manchete.
4. **US3 (comprar com cláusula pedida):** `resaleAsk` em `startNegotiation`/`answerClubCounter`, `acceptResale` em `proposeContract`, o aviso de cláusula ativa e a linha no detalhe.
5. **US4 (Finanças):** `clubResaleView` e a aba Revendas.
6. **Equilíbrio:** o cenário `resale` do `sim:economy` (ciclos e 30 temporadas) e as linhas de base intactas.
7. **Fechamento:**
   - e2e e a11y;
   - documentação (`mod-format.md`, guia, glossário);
   - `sim:gates`;
   - suíte completa sozinha;
   - 1.14.0 e a nota de versão.

## Riscos

- **Arbitragem por mod:** um `discountPerPointPct` acima de 1 reabre o ciclo comprar com cláusula e vender. Mitigação: o schema limita o valor e o teste de propriedade cobre o limite.
- **Venda de valor 0 e arredondamento:** arredondar ao milhar mais próximo poderia dar uma vantagem de até mil num valor pequeno. Mitigação: o valor com desconto e a fatia arredondam para cima (a fatia limitada a `fee`), sempre contra quem usa a cláusula; o teste enumera taxas pequenas.
- **Resumos de temporada antigos sem `resale`:** tipos e UI esperam a chave. Mitigação: a migração preenche 0, e a leitura trata a chave ausente como 0.
- **Equilíbrio de 30 temporadas sem técnico:** o mundo sozinho não cria cláusulas, então a medição exige um técnico automático. Mitigação: o cenário `resale` simula o técnico vendendo com cláusula e comprando jovens; os limites ficam declarados nele.
- **Troca de clube do técnico:** as cláusulas do clube antigo continuam ativas e pagáveis; a aba mostra só as do clube atual. Coberto por teste no save.

## Complexity Tracking

Sem violações da constituição.
