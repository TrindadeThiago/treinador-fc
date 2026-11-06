# Quickstart: validar a reformulação da Início (035)

## Pré-requisitos

```bash
pnpm install
pnpm --filter @brasfoot-like/web build   # gera apps/web/out, usado pelo e2e
```

## Testes automáticos

```bash
pnpm vitest run apps/web/test/ui/home    # seletor matchPreview, categorias, goalSummary e a página
pnpm test:e2e home-layout                  # 1440×900 sem rolagem; 390 e 360 px sem rolagem horizontal
pnpm test:e2e a11y layout responsive
pnpm test                                 # suíte inteira: motor e save sem mudança
pnpm lint
pnpm check-release                        # versão 1.8.0 e notas
```

**Esperado**: tudo verde. Nenhuma linha de base do motor regravada.

## Verificação manual

1. Abra uma carreira no meio da temporada numa janela de 1440×900 e vá à Início. Confira:
   - sem rolar, aparecem o cabeçalho, o próximo jogo com os dois escudos e os três indicadores, a posição, a torcida e diretoria, e as manchetes;
   - o estado da janela está à direita do cabeçalho;
   - a lista de resultados da rodada não aparece.
2. Compare os indicadores com as outras telas:
   - **Desfalques**: igual ao número de indisponíveis da Escalação.
   - **Condição física**: perto da média da Escalação.
   - **Força**: troque um titular por um reserva fraco na Escalação e volte. A força do meu time cai.
3. Com um aviso de mercado e uma escalação ajustada (jogue uma rodada com um titular lesionado), os avisos aparecem lado a lado. Dispensar um tira só ele.
4. Na posição: cinco resultados, com a letra V/E/D em texto e o placar colorido. "Ver tabela" abre a Competição. Não aparece o caixa.
5. Nas manchetes: no máximo três, cada uma com uma etiqueta, e "Todas as notícias" abre as Notícias.
6. Reduza a janela para 390 px. Os blocos ficam um embaixo do outro, na ordem do contrato, sem rolagem horizontal.
7. Seja demitido (ou use um save de desempregado). A Início mostra "Sem clube", a reputação, as propostas e as ações, sem os resultados da rodada.
8. Com a temporada encerrada, o cartão do próximo jogo mostra o fim da temporada e "Próxima temporada".

O contrato da tela está em [contracts/home-screen.md](./contracts/home-screen.md), e os dados derivados em [data-model.md](./data-model.md).
