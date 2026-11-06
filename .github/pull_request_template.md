## Resumo

<!-- O que muda e por quê, para quem joga ou para quem desenvolve. Cite a issue: "Fecha #123". -->

## Tipo

- [ ] Feature (sobe o minor)
- [ ] Correção ou ajuste (sobe o patch)
- [ ] Documentação, CI ou ferramentas (sem versão nova)

**Spec:** <!-- specs/NNN-nome, se for uma feature do Spec Kit; senão, apague esta linha -->

## Como testar

<!-- Passos para conferir a mudança no jogo e os comandos rodados localmente. -->

## Capturas

<!-- Mudanças de interface: antes e depois, de preferência em 1440×900 e numa tela estreita. Apague se não se aplica. -->

## Checklist

- [ ] `pnpm typecheck`, `pnpm lint` e os testes da área mudada passam localmente.
- [ ] Mudou a interface: e2e da área (e de layout, se mexeu em CSS) rodados sobre um build novo.
- [ ] Mudou o motor, o save ou o modkit: `pnpm sim:gates` (ou o gancho de pré-push).
- [ ] Mudou o formato do save: migração, fixture e `SAVE_FORMAT_VERSION`.
- [ ] Textos novos em `ui.json`, sem chave órfã.
- [ ] Mudou o site: versão e notas no mesmo PR (commit `chore(release): X.Y.Z`), com a data de Brasília (`TZ=America/Sao_Paulo date +%F`), e `pnpm check-release` depois do build.
- [ ] Feature do Spec Kit: `tasks.md` com tudo marcado e as decisões da implementação registradas em `research.md`.

<!-- Convenções completas em docs/desenvolvimento.md. -->
