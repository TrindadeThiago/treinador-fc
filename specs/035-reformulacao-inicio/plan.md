# Implementation Plan: Reformulação da página Início

**Branch**: `035-reformulacao-inicio` | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/035-reformulacao-inicio/spec.md`

## Summary

A Início deixa de ser uma coluna longa (~2.700 px) e vira um painel em grade, que numa janela de 1440×900 sem avisos cabe na altura da tela. A página passa a ter:
- um cabeçalho com o clube e o estado da janela;
- o próximo jogo e a posição lado a lado;
- uma faixa de avisos compactos, quando houver;
- a torcida e a diretoria num cartão só, ao lado das manchetes.

A lista de resultados da rodada sai da Início.

O cartão do próximo jogo ganha três indicadores, todos calculados por funções que já existem, sem dado novo (research R1–R4):
- a força dos dois times, com `teamStrength`;
- a condição física média, com `fitnessAt`;
- os desfalques, com `upcomingUnavailability`.

Também ganha a forma do adversário.

Só a interface muda: o motor, o save e os mods ficam iguais.

## Technical Context

**Language/Version**: TypeScript 5 (`strict`), Node 22

**Primary Dependencies**: Next.js 16 em static export, React 19, CSS Modules e o motor próprio. Nenhuma dependência nova.

**Storage**: nenhuma mudança. O save continua na v20 e nada novo é guardado.

**Testing**: Vitest com Testing Library (`apps/web/test`) e Playwright (`apps/web/e2e`), incluindo os testes de layout, responsivo, a11y e telas estreitas

**Target Platform**: navegador (PWA offline)

**Project Type**: monorepo pnpm. Esta feature só toca `apps/web` e `packages/i18n`.

**Performance Goals**: a Início continua abrindo sem demora perceptível. Os indicadores fazem, por render:
- uma `lineupForMatch` do adversário;
- duas `teamStrength`;
- uma média de 11 condições;
- uma `lastResults` a mais.

Tudo fica dentro de `useMemo` por save.

**Constraints**:
- sem avisos, a altura fica em no máximo 900 px numa janela de 1440×900 (SC-001);
- sem rolagem horizontal em nenhuma largura já testada (SC-003);
- cor nunca é a única informação (FR-021).

**Scale/Scope**: uma página, cinco componentes novos (`HomeHeader`, `MatchPreview`, `NoticeStrip`, `TablePositionCard`, `ClubMoodCard`), a versão compacta de `NewsCard` e de quatro avisos, e um seletor novo (`matchPreview`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Motor separado:** a interface só lê funções que o motor já exporta (`teamStrength`, `lineupForMatch`, `preferredFormation`, `upcomingUnavailability`). Não entra regra de jogo nova na interface.
- [x] **II. Determinismo:** os indicadores são funções puras do save, sem sorteio. A força do adversário usa a mesma escalação que a temporada daria.
- [x] **III. Dados, não código:** nada muda no banco nem nos mods.
- [x] **IV. Sem conteúdo protegido:** não se aplica. O layout segue o artefato do próprio projeto.
- [x] **V. Balanceamento verificável:** nenhum número do jogo muda, e as linhas de base passam sem regravar.
- [x] **VI. Saves versionados:** o formato não muda.
- [x] **VII. i18n:** todo texto novo vai para `ui.json`: categorias de manchete, indicadores, metas, cabeçalho e "sem jogos".
- [x] **VIII. Offline e gratuito:** sem rede.
- [x] **IX. Testes primeiro:** os testes do seletor `matchPreview`, do mapa de categorias e da altura em 1440×900 são escritos antes ou junto do código.

**Re-check após o design (Phase 1)**: mantido. Nenhuma entidade guardada e nenhuma regra nova.

## Project Structure

### Documentation (this feature)

```text
specs/035-reformulacao-inicio/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── home-screen.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/src/app/jogo/
├── page.tsx                 # nova grade; sem RoundResults; Unemployed no mesmo estilo
└── page.module.css          # áreas header/next/table/notices/mood/news; quebras em 1200 e 720 px
apps/web/src/game/
├── home-view.ts             # matchPreview(save), goalSummary(save), headlineCategory(type)
└── selectors.ts             # (sem mudança de assinatura; lastResults já serve ao adversário)
apps/web/src/ui/home/
├── HomeHeader.tsx(.module.css)        # clube, divisão · posição · temporada, WindowStatus
├── MatchPreview.tsx(.module.css)      # substitui NextMatchCard: frente a frente, forma, indicadores, ações
├── NoticeStrip.tsx(.module.css)       # faixa de avisos compactos
├── TablePositionCard.tsx(.module.css) # posição, Ver tabela, últimos cinco resultados coloridos
└── ClubMoodCard.tsx(.module.css)      # torcida + diretoria + metas numa linha
apps/web/src/ui/news/NewsCard.tsx      # variante compacta: três itens com categoria e subtítulo
apps/web/src/ui/{LineupNotice,MarketNotice,SquadChangeNotice}.tsx, ui/board/BoardNotice.tsx
                                        # prop `compact`: título, uma linha, uma ação
apps/web/src/ui/NextMatchCard.tsx      # removido (substituído por MatchPreview), se nada mais o usar
packages/i18n/locales/pt-BR/ui.json    # textos novos
apps/web/test/ui/home.test.tsx, test/ui/home-view.test.ts
apps/web/e2e/home-layout.spec.ts       # altura ≤ 900 em 1440×900; 390 e 360 px sem rolagem horizontal
```

**Structure Decision**: monorepo existente. Os componentes novos ficam em `apps/web/src/ui/home/`, e a lógica derivada fica em `apps/web/src/game/home-view.ts`, que pode ser testada sem renderizar.

## Complexity Tracking

Sem violações da constituição.
