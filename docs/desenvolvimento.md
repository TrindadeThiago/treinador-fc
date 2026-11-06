# Desenvolvimento

Como preparar o ambiente, testar, especificar uma feature e publicar. A estrutura do código está
em [arquitetura.md](arquitetura.md). Os comandos básicos também estão no [README](../README.md).

## Sumário

1. [Ambiente](#1-ambiente)
2. [Comandos do dia a dia](#2-comandos-do-dia-a-dia)
3. [Testes](#3-testes)
4. [Fluxo de uma feature (Spec Kit)](#4-fluxo-de-uma-feature-spec-kit)
5. [Convenções](#5-convenções)
6. [CI](#6-ci)
7. [Release e publicação](#7-release-e-publicação)
8. [Checklist de um PR](#8-checklist-de-um-pr)

---

## 1. Ambiente

- Node.js 22.13 ou mais novo e pnpm (a versão fica em `packageManager`, no `package.json`).
- `pnpm install` na raiz instala todos os pacotes do monorepo.
- Para o e2e, instale o Chromium uma vez:
  `pnpm --filter @brasfoot-like/web exec playwright install chromium`.
- Opcional: `pnpm hooks:install` liga o gancho de pré-push (`.githooks/pre-push`). Ele roda as
  simulações longas (`pnpm sim:gates`) quando o push muda o motor, o save, o modkit ou as
  ferramentas. Para pular de propósito: `SKIP_SIMS=1 git push`.

## 2. Comandos do dia a dia

| Comando | Faz |
|---|---|
| `pnpm dev:web` | Servidor de desenvolvimento da interface. |
| `pnpm build:web` | Build estático em `apps/web/out` (inclui o mundo público, o manifest e o precache). |
| `pnpm preview:web` | Serve o build em http://localhost:4173. |
| `pnpm typecheck` | Tipos de todos os pacotes. |
| `pnpm lint` / `pnpm format` | Biome: verificar / formatar. |
| `pnpm test` | Todos os testes unitários (Vitest), do motor à interface. |
| `pnpm vitest run <caminho>` | Só alguns arquivos de teste. |
| `pnpm test:e2e [filtro]` | Playwright sobre o build (rode `pnpm build:web` antes). |
| `pnpm sim:matches` | Milhares de partidas: faixas de gols, jogadas e notas. |
| `pnpm sim:gates` | As simulações de release: mundo padrão em 10 temporadas e mundo grande em 30. |
| `pnpm sim:size` | Tamanho do save em cenários longos. |
| `pnpm check-release` | Versão, notas, capturas, textos e tamanho do pacote (depois do build). |

A lista completa de scripts (geração de bancos e mods, capturas) está no [README](../README.md).

## 3. Testes

| Onde | O que cobre |
|---|---|
| `packages/engine/test/` | Regras do motor, por módulo. Inclui as **linhas de base** (resultado fixo de carreiras por seed), o **realismo** (faixas de gols, jogadas e notas em amostras grandes), testes de **propriedade** (`properties/`) e o teste de **arquitetura** (o motor não usa APIs proibidas, e `rating/` não é importado pela simulação). |
| `packages/save/test/` | Formato, migrações (uma fixture por versão antiga), `.blsave` e consultas da carreira. |
| `packages/modkit/test/`, `packages/i18n/test/` | Leitura de mods; cobertura das mensagens de erro e das notas de versão. |
| `apps/web/test/game/` | Visões derivadas, testadas sem renderizar (`home-view`, `board-view`, `forecast`…). |
| `apps/web/test/ui/` | Componentes e telas com Testing Library (inclui a estrutura de títulos e regiões e a auditoria de estilos). |
| `apps/web/test/flows/` | Fluxos completos pela interface: nova carreira, rodada, mercado, virada de temporada e outros. |
| `apps/web/test/i18n/` | Nenhum texto fixo no código e toda chave de `ui.json` usada. |
| `apps/web/e2e/` | Playwright no navegador: telas, layout sem rolagem horizontal em várias larguras, a11y (axe), teclado, offline, temas e a Início em 1440×900. |

Ajudantes úteis:
- `apps/web/test/helpers/career.ts`: `storedCareer(rodada, editar?)` cria uma carreira já
  avançada.
- `apps/web/test/helpers/round.ts`: `roundPlayed(n)` espera a rodada aparecer como jogada na
  Início.
- `apps/web/test/helpers/live.ts`: `elapseResuming` avança a rodada ao vivo retomando as pausas
  do intervalo.
- `apps/web/e2e/helpers.ts`: `createCareer`, `simulate`, `resumeWhenPaused`,
  `expectNoHorizontalScroll`, `setTheme`.

Dicas:
- A suíte inteira é pesada. Rodar o build ou outro processo ao mesmo tempo pode estourar o tempo
  de alguns testes; nesse caso, rode os arquivos que falharam de novo, sozinhos.
- Uma mudança que altere resultados de partidas precisa ser intencional e regravar as linhas de
  base.

## 4. Fluxo de uma feature (Spec Kit)

As features seguem o [Spec Kit](https://github.com/github/spec-kit). Cada uma tem uma pasta em
`specs/NNN-nome-curto/` (numeração sequencial). Os comandos ficam em `.claude/skills/speckit-*`,
e os ganchos em `.specify/extensions.yml`.

1. **`/speckit-specify <descrição>`:**
   - o gancho obrigatório cria a branch `NNN-nome-curto` a partir do HEAD;
   - o comando escreve `spec.md` (histórias de usuário com prioridade, requisitos, critérios de
     sucesso e premissas) e `checklists/requirements.md`;
   - `.specify/feature.json` aponta a feature ativa.
2. **`/speckit-clarify`** (opcional): perguntas para fechar pontos em aberto da spec.
3. **`/speckit-plan`:** escreve `plan.md` (contexto técnico e verificação da constituição),
   `research.md` (decisões e alternativas), `data-model.md`, `contracts/` e `quickstart.md`.
4. **`/speckit-tasks`:** escreve `tasks.md`, com as tarefas por história, no formato
   `- [ ] T001 [P] [US1] descrição com caminho`.
5. **`/speckit-implement`:** executa as tarefas por fase, com os testes antes do código no motor
   (Princípio IX), e marca cada uma como `[X]`.
6. **`/speckit-analyze`** (opcional): confere a coerência entre spec, plano e tarefas.

Os ganchos de commit automático (`speckit.git.commit`) são opcionais. A
[constituição](../.specify/memory/constitution.md) define os princípios que todo plano verifica:
1. motor separado;
2. determinismo;
3. dados, não código;
4. nenhum conteúdo protegido;
5. balanceamento verificável;
6. saves versionados;
7. i18n;
8. offline e gratuito;
9. testes primeiro.

Os prompts usados nas features anteriores estão em [speckit-prompts/](speckit-prompts/README.md).

## 5. Convenções

- **Idioma:** código em inglês; comentários, textos, commits, specs e documentação em pt-BR. Os
  termos e o tom da interface estão no [glossário](glossario.md).
- **Commits:** no estilo convencional, com escopo em português, por exemplo
  `feat(inicio): …`, `fix(calendario): …`, `docs: …`, `chore(release): 1.8.1`.
- **Branches:** `NNN-nome-curto` para features do Spec Kit; `feat/…`, `fix/…` e `docs/…` para
  mudanças menores.
- **Versão e notas no mesmo PR:** todo PR que muda o site sobe a versão no `package.json` da raiz e
  acrescenta a entrada em `packages/i18n/locales/pt-BR/release-notes.json`, num commit separado
  `chore(release): X.Y.Z`. Não há PR só de release.
  - **SemVer:** feature nova sobe o minor; ajuste ou correção sobe o patch.
  - **Data das notas:** o dia no horário de Brasília (`TZ=America/Sao_Paulo date +%F`).
  - **Texto das notas:** escrito para quem joga, e termina dizendo se algo mudou nas partidas e se
    os saves e mods continuam compatíveis.
- **Saves:** mudar o formato exige subir `SAVE_FORMAT_VERSION`, escrever a migração e uma fixture
  da versão anterior (Princípio VI).
- **Textos:** todo texto visível vai em `ui.json` como frase completa (ICU). Chaves sem uso quebram
  um teste.
- **Estilos:** CSS Modules com os tokens de `apps/web/src/styles/tokens.css`. Não use cor literal
  nem espaçamento fora dos tokens, e não deixe classe sem uso.

## 6. CI

O workflow `ci` (`.github/workflows/ci.yml`) roda só em pull request:

| Job | Faz | Quando |
|---|---|---|
| `scope` | Decide se o e2e roda. | Sempre (fora de rascunho). |
| `checks` | `pnpm typecheck` e `pnpm lint`. | Sempre. |
| `unit (1)`, `unit (2)` | `pnpm test` dividido em dois shards. | Sempre. |
| `e2e` | Build e `pnpm test:e2e`; o relatório do Playwright fica como artefato se falhar. | PR para a `main`, rótulo `e2e` ou mudança em `apps/web/e2e/`. |

Para economizar minutos de Actions:
- PR em rascunho não roda;
- mudanças só de documentação (`docs/`, `specs/`, `.specify/`, `.claude/`, `.github/` e arquivos
  `.md`) não rodam o CI;
- as simulações longas rodam só localmente (`pnpm sim:gates`).

## 7. Release e publicação

1. O PR traz a versão nova e as notas (seção 5) e passa no CI.
2. O merge na `main` dispara o workflow `release` (`.github/workflows/release.yml`):
   - **version:** confere se a versão do `package.json` já tem tag. Se tem, nada é publicado.
   - **build:** tipos, lint, `pnpm build:web` e `pnpm check-release`.
   - **deploy:** publica `apps/web/out` na Vercel (produção) e cria a tag `vX.Y.Z` e o Release do
     GitHub com as notas da versão.
3. Não é preciso criar a tag à mão.
4. Depois do merge, confira:
   - o workflow pela aba Actions ou com `gh run watch`;
   - https://treinador-fc.vercel.app/version.json com a versão nova;
   - a página de notas de versão com a entrada nova.

As versões 1.0.0 a 1.10.0 da fase beta têm tags `beta-vX.Y.Z`. A numeração recomeçou no lançamento
oficial 1.0.0 (a interface nova). Ver [interface-nova.md](interface-nova.md), seção 6.

## 8. Checklist de um PR

O mesmo checklist vem no [template de pull request](../.github/pull_request_template.md), que o
GitHub preenche ao abrir um PR.

- [ ] `pnpm typecheck`, `pnpm lint` e os testes da área mudada passam localmente.
- [ ] Mudou a interface: e2e da área (e de layout, se mexeu em CSS) rodados sobre um build novo.
- [ ] Mudou o motor, o save ou o modkit: `pnpm sim:gates` (ou o gancho de pré-push).
- [ ] Mudou o formato do save: migração, fixture e `SAVE_FORMAT_VERSION`.
- [ ] Textos novos em `ui.json`; nenhuma chave órfã.
- [ ] Mudou o site: versão e notas no mesmo PR, com a data de Brasília, e `pnpm check-release`
      depois do build.
- [ ] Feature do Spec Kit: `tasks.md` com tudo marcado e as decisões tomadas durante a
      implementação registradas em `research.md`.
