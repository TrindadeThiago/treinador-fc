# Documentação do Treinador FC

O Treinador FC é um jogo de técnico de futebol no navegador. Ele é gratuito, sem anúncios e sem
cadastro, funciona offline e roda sobre um motor determinístico em TypeScript.

**Jogar:** https://treinador-fc.vercel.app · **Código:** este repositório · **Versão publicada:**
[`version.json`](https://treinador-fc.vercel.app/version.json)

## Por onde começar

| Quero… | Leia |
|---|---|
| Aprender a jogar, tela por tela | [Guia do jogador](guia-do-jogador.md) |
| Entender como o código se organiza | [Arquitetura](arquitetura.md) |
| Rodar, testar, especificar uma feature e publicar | [Desenvolvimento](desenvolvimento.md) |
| Criar um mod com outros clubes e competições | [Formato de mods](mod-format.md) |
| Saber como o mundo padrão é gerado | [Mundo padrão](mundo-completo.md) |
| Conhecer a visão e as regras de projeto do jogo | [Documento de design](design.md) |
| Escrever textos da interface no tom certo | [Glossário de textos](glossario.md) |
| Ver a origem visual da interface | [Nova interface](interface-nova.md) e os [mockups](interface-nova/README.md) |

## Todos os documentos

### Para quem joga
- [**Guia do jogador**](guia-do-jogador.md): como começar uma carreira e o que cada tela faz:
  Início, Elenco, Escalação, rodada ao vivo, Competição, Calendário, Finanças, Mercado, Carreira,
  Notícias, Histórico e fim de temporada. Também cobre saves, mods, configurações, atalhos,
  acessibilidade e perguntas frequentes.
- [Notas de versão](https://treinador-fc.vercel.app/notas-de-versao/): o que mudou em cada versão,
  dentro do próprio jogo.

### Para quem cria mods
- [**Formato de mods**](mod-format.md): estrutura do pacote `.zip`, todos os campos (países,
  competições, clubes, jogadores, rivalidades), escudos, CSV, vários países, competições
  continentais e estaduais, e as mensagens de erro.
- [**Mundo padrão**](mundo-completo.md): o que vem no mundo padrão, como gerá-lo como mod e como
  trocar os nomes por uma planilha.

### Para quem desenvolve
- [**Arquitetura**](arquitetura.md): os pacotes, os módulos do motor, o determinismo, o caminho
  de uma rodada até o save, o formato do save e as migrações, os mods, os textos, a interface, o
  modo offline e as ferramentas.
- [**Desenvolvimento**](desenvolvimento.md): ambiente, comandos, testes, o fluxo do Spec Kit,
  convenções (versão e notas no mesmo PR), CI, release e o checklist de um PR.
- [Constituição](../.specify/memory/constitution.md): os nove princípios que todo plano verifica.
- [Especificações](../specs/): spec, plano, pesquisa e tarefas de cada feature (`001` a `035`).
- [Prompts do Spec Kit](speckit-prompts/README.md): os prompts que deram origem às features, por
  marco.

### Projeto e design
- [**Documento de design**](design.md): a visão, as regras do jogo (mundo, jogadores, partidas,
  carreira, finanças, mercado, drama), o modding, a persistência e o roadmap por marcos.
- [Glossário de textos](glossario.md): o tom, os termos e os formatos de número usados na
  interface.
- [Nova interface](interface-nova.md): a origem e a linguagem visual da interface do lançamento
  1.0.0 e a paridade com os mockups ([`interface-nova/`](interface-nova/README.md)).
- [Auditoria da v1.0.0](../AUDITORIA-v1.0.0.md): a revisão feita antes do lançamento oficial.

## Mapa rápido do repositório

```text
apps/web/            interface (Next.js static export) e e2e
packages/engine/     motor do jogo (regras puras, determinístico)
packages/save/       formato do save, migrações e .blsave
packages/modkit/     leitura de mods (.zip, CSV, imagens)
packages/i18n/       textos pt-BR e notas de versão
tools/               geração de bancos, simulações e release
mods/                banco de testes e mod de exemplo
specs/               uma pasta por feature (Spec Kit)
docs/                esta documentação
```
