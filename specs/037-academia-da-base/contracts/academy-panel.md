# Contrato: painel da academia (037)

O painel fica no topo da aba Base do Elenco (`AcademyPanel`), antes da lista de jovens.

| Elemento | Conteúdo |
|---|---|
| Título | "Academia" |
| Nível | "Nível {n} de 5", com um `Meter` acessível (o rótulo diz o número; a cor não é o único sinal) |
| Custo mensal | "Manutenção: {valor} por mês" |
| Efeito | "{min}–{max} jovens por safra · qualidade {rótulo}" e, ao lado, "Próximo nível: …" (ausente no 5) |
| Vagas | o contador da base da 036 passa a usar o limite do nível ("Base: {n} de {limite} vagas") |
| Pendente | "Obra em andamento: nível {n+1} na virada" ou "Redução para o nível {n−1} na virada", com o botão "Cancelar redução" |
| Ações | **Melhorar** e **Baixar**. Ficam desabilitadas, com explicação em `aria-describedby`, no nível máximo ou mínimo, com mudança pendente, sem caixa ("Faltam {valor}") ou com o técnico desempregado (o painel fica só para leitura) |
| Comparação | `details` com "Academias da divisão": uma lista ordenada pelo nível, com o próprio clube marcado como "(seu clube)" |

## Diálogo Melhorar

- Título: "Melhorar a academia para o nível {n+1}?"
- Texto:
  - "Obra: {custo}, pago agora. Caixa depois: {caixa}."
  - "Manutenção: {atual} → {nova} por mês."
  - "Fica pronta na virada da temporada."
- Botões: Melhorar e Cancelar.

## Diálogo Baixar

- Título: "Baixar a academia para o nível {n−1}?"
- Texto:
  - "Vale na virada da temporada. Manutenção: {atual} → {nova} por mês."
  - "Nenhum dinheiro investido volta."
  - Se as vagas caírem abaixo da base atual: "A base terá {limite} vagas; promova ou dispense até lá."
- Botões: Baixar e Cancelar.

## Finanças

A categoria `academy` aparece como "Academia" no extrato, nas tabelas, no resumo e na previsão.

## i18n e acessibilidade

- As chaves ficam em `ui.json`: `academy.panel.*`, `academy.quality.1-5`, `finance.category.academy` e `academy.error.*`, com plural ICU.
- O painel entra no a11y (`a11y.spec.ts`) e no layout em 768 px.
