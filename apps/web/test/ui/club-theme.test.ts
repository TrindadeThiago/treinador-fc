import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildClubTheme, CLUB_THEME_BASE, contrast, type ThemeMode } from "../../src/ui/club-theme";

const TOKENS = readFileSync(join(import.meta.dirname, "../../src/styles/tokens.css"), "utf8");
const TOKEN_NAMES = {
  bg: "--color-bg",
  sidebar: "--color-sidebar",
  surface: "--color-surface",
  surface2: "--color-surface-2",
  border: "--color-border",
} as const;

/** Valor de `name` no primeiro bloco cujo seletor é `selector`. */
function tokenOf(selector: string, name: string): string | undefined {
  const start = TOKENS.indexOf(`${selector} {`);
  const block = TOKENS.slice(start, TOKENS.indexOf("}", start));
  return new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, "i").exec(block)?.[1]?.toLowerCase();
}

const SURFACE: Record<ThemeMode, string> = { dark: "#121922", light: "#ffffff" };
const CLUBS = {
  amarelo: { primary: "#FFD100", secondary: "#9EA2A2" },
  verde: { primary: "#006B3F", secondary: "#C8102E" },
  branco: { primary: "#FFFFFF", secondary: "#7A1F3D" },
  cinza: { primary: "#9EA2A2", secondary: "#0033A0" },
  preto: { primary: "#000000", secondary: "#C8102E" },
  semCor: { primary: "#808080", secondary: "#404040" },
};

describe("tema do clube", () => {
  for (const mode of ["dark", "light"] as const) {
    for (const [name, colors] of Object.entries(CLUBS)) {
      it(`${name} (${mode}): destaque legível e texto sobre o destaque`, () => {
        const theme = buildClubTheme(colors, mode);
        expect(theme).toBeDefined();
        if (!theme) return;
        expect(contrast(theme["--color-accent"], SURFACE[mode])).toBeGreaterThanOrEqual(4.5);
        expect(
          contrast(theme["--color-on-accent"], theme["--color-accent"]),
        ).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it("as superfícies base são as mesmas do tokens.css", () => {
    const selectors: Record<ThemeMode, string> = {
      dark: ":root",
      light: ':root[data-theme="light"]',
    };
    for (const mode of ["dark", "light"] as const) {
      for (const [key, name] of Object.entries(TOKEN_NAMES)) {
        expect(CLUB_THEME_BASE[mode][key as keyof typeof TOKEN_NAMES], `${mode} ${name}`).toBe(
          tokenOf(selectors[mode], name),
        );
      }
    }
  });

  it("texto sobre o destaque forte (hover dos botões) também é legível", () => {
    for (const mode of ["dark", "light"] as const) {
      for (const colors of Object.values(CLUBS)) {
        const theme = buildClubTheme(colors, mode);
        if (!theme) continue;
        expect(
          contrast(theme["--color-on-accent"], theme["--color-accent-strong"]),
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("cores inválidas não geram tema", () => {
    expect(buildClubTheme({ primary: "vermelho", secondary: "#fff" }, "dark")).toBeUndefined();
  });

  it("não mexe nas cores semânticas", () => {
    const theme = buildClubTheme(CLUBS.verde, "dark");
    expect(Object.keys(theme ?? {})).not.toContain("--color-loss");
    expect(Object.keys(theme ?? {})).not.toContain("--color-win");
  });
});
