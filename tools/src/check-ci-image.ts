// Confere se a imagem do Playwright do e2e no CI acompanha o @playwright/test do lockfile.
// Uso: pnpm --filter @brasfoot-like/tools check-ci-image
// A imagem traz os navegadores de uma versão exata do Playwright: com outra versão instalada, o
// e2e procura um navegador que não está na imagem e falha.
import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { REPO_ROOT } from "./fs-bank";

const IMAGE = /mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)(?:-[a-z0-9]+)?/g;
const LOCKED = /^ {2}'?@playwright\/test@(\d+\.\d+\.\d+)'?:/m;

/** Problema entre as imagens do workflow e a versão travada no lockfile, ou nada. */
export function playwrightImageProblem(workflow: string, lockfile: string): string | undefined {
  const locked = LOCKED.exec(lockfile)?.[1];
  if (!locked) return "o pnpm-lock.yaml não tem o @playwright/test";
  const images = [...workflow.matchAll(IMAGE)].map((match) => match[1]);
  if (images.length === 0) return "o workflow não usa a imagem do Playwright";
  const wrong = images.filter((version) => version !== locked);
  if (wrong.length > 0) {
    return `imagem do Playwright v${wrong.join(", v")} no CI, mas o lockfile tem o @playwright/test ${locked}`;
  }
  return undefined;
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const problem = playwrightImageProblem(
    readFileSync(join(REPO_ROOT, ".github/workflows/ci.yml"), "utf8"),
    readFileSync(join(REPO_ROOT, "pnpm-lock.yaml"), "utf8"),
  );
  if (problem) {
    console.error(`✗ ${problem}`);
    process.exit(1);
  }
  console.log("✓ a imagem do Playwright do CI acompanha o lockfile");
}
