import { describe, expect, it } from "vitest";
import { buildClubTheme, contrast, type ThemeMode } from "../../src/ui/club-theme";

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

  it("cores inválidas não geram tema", () => {
    expect(buildClubTheme({ primary: "vermelho", secondary: "#fff" }, "dark")).toBeUndefined();
  });

  it("não mexe nas cores semânticas", () => {
    const theme = buildClubTheme(CLUBS.verde, "dark");
    expect(Object.keys(theme ?? {})).not.toContain("--color-loss");
    expect(Object.keys(theme ?? {})).not.toContain("--color-win");
  });
});
