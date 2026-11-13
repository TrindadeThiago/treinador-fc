import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildClubTheme,
  CLUB_THEME_BASE,
  contrast,
  HIGHLIGHT_ALPHA,
  type ThemeMode,
} from "../../src/ui/club-theme";

const TOKENS = readFileSync(join(import.meta.dirname, "../../src/styles/tokens.css"), "utf8");
const TOKEN_NAMES = {
  bg: "--color-bg",
  sidebar: "--color-sidebar",
  surface: "--color-surface",
  surface2: "--color-surface-2",
  border: "--color-border",
} as const;

const MODS = join(import.meta.dirname, "../../../../mods");
/** Cores de todos os clubes dos mods do repositório. */
const MOD_CLUBS = readdirSync(MODS).flatMap((dir) => {
  let raw: string;
  try {
    raw = readFileSync(join(MODS, dir, "clubs.json"), "utf8");
  } catch {
    return [];
  }
  const parsed = JSON.parse(raw) as
    | { colors?: { primary: string; secondary: string } }[]
    | { clubs: { colors?: { primary: string; secondary: string } }[] };
  const list = Array.isArray(parsed) ? parsed : parsed.clubs;
  return list.flatMap((club) => (club.colors ? [club.colors] : []));
});

/** Cor que aparece com `hex` translúcido (opacidade `alpha`) sobre `bg`. */
function over(hex: string, alpha: number, bg: string): string {
  const channel = (color: string, i: number) =>
    Number.parseInt(color.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2]
    .map((i) =>
      Math.round(channel(bg, i) + (channel(hex, i) - channel(bg, i)) * alpha)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

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

  it("o destaque é legível em todos os fundos e sob o realce, para todo clube dos mods", () => {
    expect(MOD_CLUBS.length).toBeGreaterThan(100);
    const failures: string[] = [];
    for (const mode of ["dark", "light"] as const) {
      for (const colors of MOD_CLUBS) {
        const theme = buildClubTheme(colors, mode);
        if (!theme) continue;
        const accent = theme["--color-accent"];
        const surfaces = [
          theme["--color-bg"],
          theme["--color-sidebar"],
          theme["--color-surface"],
          theme["--color-surface-2"],
        ];
        const backgrounds = [
          ...surfaces,
          ...surfaces.map((bg) => over(accent, HIGHLIGHT_ALPHA, bg)),
        ];
        for (const bg of backgrounds) {
          if (contrast(accent, bg) < 4.5)
            failures.push(`${mode} ${JSON.stringify(colors)} sobre ${bg}`);
        }
        if (contrast(theme["--color-on-accent"], theme["--color-accent-strong"]) < 4.5) {
          failures.push(`${mode} ${JSON.stringify(colors)}: texto sobre o destaque forte`);
        }
      }
    }
    expect(failures).toEqual([]);
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
