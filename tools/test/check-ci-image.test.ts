import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { playwrightImageProblem } from "../src/check-ci-image";
import { REPO_ROOT } from "../src/fs-bank";

const LOCK = "packages:\n\n  '@playwright/test@1.64.1':\n    resolution: {}\n";
const workflow = (tag: string) =>
  `jobs:\n  e2e:\n    container:\n      image: mcr.microsoft.com/playwright:${tag}\n`;

describe("imagem do Playwright no CI", () => {
  it("aceita a mesma versão do lockfile, com ou sem o sufixo do Ubuntu", () => {
    expect(playwrightImageProblem(workflow("v1.64.1-resolute"), LOCK)).toBeUndefined();
    expect(playwrightImageProblem(workflow("v1.64.1"), LOCK)).toBeUndefined();
  });

  it("aponta versão diferente, imagem ausente e lockfile sem o Playwright", () => {
    expect(playwrightImageProblem(workflow("v1.63.0-noble"), LOCK)).toContain("v1.63.0");
    expect(playwrightImageProblem("jobs: {}", LOCK)).toContain("não usa a imagem");
    expect(playwrightImageProblem(workflow("v1.64.1"), "packages:\n")).toContain("pnpm-lock.yaml");
  });

  it("o workflow do repositório acompanha o lockfile", () => {
    const problem = playwrightImageProblem(
      readFileSync(join(REPO_ROOT, ".github/workflows/ci.yml"), "utf8"),
      readFileSync(join(REPO_ROOT, "pnpm-lock.yaml"), "utf8"),
    );
    expect(problem).toBeUndefined();
  });
});
