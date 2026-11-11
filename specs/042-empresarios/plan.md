# Implementation Plan: Empresários

**Branch**: `042-empresarios` | **Date**: 2026-11-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/042-empresarios/spec.md`

## Summary

**Empresários derivados:** os empresários de cada país e a carteira de cada jogador são funções puras da seed da carreira e do banco do save, com semente própria. Um hash do id do jogador escolhe o empresário do país de nacionalidade. Todo jogador que surge já tem empresário, e o save não cresce. O save guarda só as relações com os clubes do técnico e os últimos negócios, em `MarketState.agents` (R1, R4).

**Comissão:** a de referência sai do salário pedido, da ganância e da relação; no rompimento, vai ao teto. A falta de interesse pode ser coberta até um limite dado pela influência, com uma comissão mínima. O excedente da comissão baixa o salário pedido, e o salário economizado nunca passa de 80% do excedente (R2, FR-010).

**Ponto de pagamento:** os efeitos de assinatura (`completeTransfer`, `completeSigning`, `completeRenewal`) ganham `commission`, lançada na categoria nova `commission` sem contrapartida: o dinheiro sai do mundo. A IA paga a comissão de referência, com relação neutra, nas compras, nos livres e nas renovações da virada (R3).

**Relações:** sobem com contratações e renovações; caem com rescisão, salário recusado e negociação abandonada; voltam ao neutro na virada. Chegar a 0 é o rompimento, com manchete (R4, R6).

**Equilíbrio:** `refMonths` é calibrado pelo `sim:economy`, pelas 30 temporadas e pela continental em 3 seeds. As linhas de base são regravadas de propósito (R7). As propriedades de dinheiro são provadas por enumeração (R8).

**Save e versão:** save v27, com `market.agents` opcional, e versão 1.15.0.

## Technical Context

**Language/Version**: TypeScript 5 (`strict`), Node 22

**Primary Dependencies**: motor próprio, Zod 4, Next.js 16 (static export) e React 19; nenhuma dependência nova

**Storage**: save v26 → v27:
- `market.agents` opcional;
- `Negotiation.commission?`;
- `TransferRecord.commission?` e `agentId?`;
- os empresários e as carteiras são derivados, não guardados.

**Testing**: Vitest (motor, save, web), Playwright, `sim:economy`, `sim:gates`, `sim:world --continental` (3 seeds); linhas de base regravadas no mesmo PR

**Target Platform**: navegador (PWA offline)

**Project Type**: monorepo pnpm

**Performance Goals**: as metas da 020 (dia ≤ 600 ms, virada ≤ 6 s, save) no mundo padrão e no grande; custo constante por assinatura

**Constraints**:
- dinheiro: a comissão só sai, nunca volta;
- a troca por salário nunca é vantajosa;
- determinismo, com semente própria para os empresários;
- a relação só com os clubes do técnico.

**Scale/Scope**:
- **motor:** o módulo novo `agents/` (regras, empresários, relações, comissão) e ajustes em `market/effects`, `player-response`, `negotiation`, `disposal`, `ai/round`, `turnover`, `types`, `finance/types`, `model/schemas` e `news`;
- **save:** v27 e o parâmetro de comissão na proposta;
- **web:** o campo de comissão na negociação, a linha do empresário no detalhe, a aba Empresários no Mercado, a categoria no livro-caixa e as manchetes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Motor separado:** os empresários, a comissão, a relação e as manchetes ficam no motor; a web só mostra e dispara.
- [x] **II. Determinismo:** os empresários e as carteiras vêm de sementes próprias (`${seed}:agent:*`) e de hash, sem consumir o PRNG do jogo. A mesma seed dá a mesma carreira (a equivalência é regravada e repetida).
- [x] **III. Dados, não código:** o número por país, os pesos, os tetos e os valores da relação ficam em `market.agents`, opcional no mod e validado por Zod. `perCountry = 0` desliga os empresários.
- [x] **IV. Sem conteúdo protegido:** os nomes vêm dos bancos de nomes fictícios dos países.
- [x] **V. Balanceamento verificável:** as 30 temporadas, o `sim:economy`, o `sim:gates` e a continental em 3 seeds, com os limites atuais. As linhas de base mudam de propósito, registradas no PR.
- [x] **VI. Saves versionados:** v27 com migração e a fixture `saveV26`.
- [x] **VII. i18n:** os textos, as faixas da relação, a ganância e a influência em texto, as manchetes com plural e `select`.
- [x] **VIII. Offline e gratuito:** sem rede.
- [x] **IX. Testes primeiro no motor:** a derivação, a comissão, a troca, a relação, a IA e as propriedades de dinheiro, antes do código.

**Re-check após o design**: mantido. Derivar os empresários (R1) evita mexer no schema do jogador e dispensa ganchos em todos os pontos de criação de jogadores.

## Project Structure

### Documentation (this feature)

```text
specs/042-empresarios/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── engine-agents.md
│   └── ui-agents.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/agents/{rules,roster,relations,commission,index}.ts   # novo
packages/engine/src/market/{effects,player-response,negotiation,disposal,turnover,types}.ts
packages/engine/src/market/ai/round.ts
packages/engine/src/finance/types.ts, model/schemas.ts
packages/engine/src/news/{agents,round,types,rules}.ts
packages/engine/test/agents/*.test.ts                                       # novos
packages/engine/test/market/commission*.test.ts, test/properties/commission.test.ts
packages/save/src/{format,migrate,market}.ts
packages/save/test/{migrate-v27.test.ts,fixtures.ts,equivalence-baseline.json}
apps/web/src/ui/market/{NegotiationDialog,AgentsTab}.tsx, ui/{PlayerDetails,PlayerModal,FinanceSummary}.tsx
apps/web/src/game/{agents-view,finance-series,news-view,home-view}.ts, ui/news/headline-vars.ts
apps/web/test/ui/agents.test.tsx, apps/web/e2e/agents.spec.ts
packages/i18n/locales/pt-BR/{ui,release-notes}.json
tools/src/simulate-economy.ts
docs/{guia-do-jogador,mod-format,glossario,arquitetura}.md, apps/web/public/docs/mod-format.md
package.json                                                                # 1.15.0
```

**Structure Decision**: `agents/` é um módulo próprio do motor, como `scouting/`. O mercado só chama a comissão e a relação nos efeitos e nas etapas da negociação.

## Fases (para o /speckit-tasks)

1. **Fundação:**
   - regras e schema;
   - `agents/roster` (derivação), `relations` e `commission`;
   - a categoria `commission`;
   - os tipos;
   - save v27.
2. **US1 (comissão):**
   - os efeitos com `commission`;
   - `respondToContract` com a comissão;
   - `proposeContract` e `conclude`;
   - o campo na negociação.
3. **US2 (ver):** a linha no detalhe e na negociação; a aba Empresários.
4. **US3 (relação):** os eventos na negociação e na rescisão, o retorno ao neutro na virada e o rompimento.
5. **US4 (IA):** a comissão nas compras, nos livres e nas renovações da IA; a calibração e as linhas de base regravadas.
6. **US5 (manchetes):** `agentBroke` e `agentBigDeal`.
7. **Fechamento:**
   - as propriedades de dinheiro;
   - `sim:economy`, `sim:gates` e a continental em 3 seeds;
   - e2e e a11y;
   - a documentação;
   - a suíte completa;
   - 1.15.0.

## Riscos

- **Economia da IA:** as comissões tiram dinheiro de todos os clubes. Mitigação: calibrar `refMonths` (e, se preciso, a reserva da IA) pelo `sim:economy` e pela continental em 3 seeds, registrando a calibração no research, como na 037.
- **Exploração pela troca por salário:** mitigada pela regra de `tradePct ≤ 100` (padrão 80) e pela propriedade enumerada.
- **Linhas de base:** mudam em tudo depois da primeira assinatura da IA. Mitigação: regravar no mesmo PR, registrar a partir de quando muda e repetir a equivalência para provar o determinismo.
- **Ordem da virada:** as renovações da IA pagam a comissão depois de `close-finance-season`. Mitigação: seguir o padrão da manutenção da academia, para o livro-caixa continuar batendo com o caixa (`cash = seasonStartCash + Σ ledger`).
- **Desempenho:** `agentsOf` com memo. Mitigação: medir no `sim:gates`.

## Complexity Tracking

Sem violações da constituição.
