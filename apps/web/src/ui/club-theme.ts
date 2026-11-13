/**
 * Tema do clube: deriva as cores da interface das cores do escudo (só apresentação).
 *
 * Regras: o destaque sai de uma cor cromática do clube, ajustada até 4,5:1 de contraste contra
 * a superfície; fundos e bordas recebem só uma pitada da cor; as cores semânticas (vitória,
 * derrota, aviso) nunca mudam.
 */

export type ThemeMode = "dark" | "light";

type Rgb = readonly [number, number, number];

/**
 * Cores padrão das superfícies, iguais às de `apps/web/src/styles/tokens.css` (escuro em `:root`,
 * claro em `[data-theme="light"]`). Um teste garante que os dois continuam iguais.
 */
export const CLUB_THEME_BASE: Record<
  ThemeMode,
  Record<"bg" | "sidebar" | "surface" | "surface2" | "border", string>
> = {
  dark: {
    bg: "#0a0e13",
    sidebar: "#0f151c",
    surface: "#121922",
    surface2: "#16222c",
    border: "#2e3a47",
  },
  light: {
    bg: "#eef1f5",
    sidebar: "#f7f9fb",
    surface: "#ffffff",
    surface2: "#e6ebf1",
    border: "#d3dae3",
  },
};

/** Quanto da cor do clube entra em cada superfície (0 a 1). */
const TINT: Record<ThemeMode, Record<keyof (typeof CLUB_THEME_BASE)["dark"], number>> = {
  dark: { bg: 0.05, sidebar: 0.06, surface: 0.05, surface2: 0.08, border: 0.12 },
  light: { bg: 0.04, sidebar: 0.03, surface: 0, surface2: 0.05, border: 0.1 },
};

const MIN_CONTRAST = 4.5;
const DARK_INK = "#0a0e13";
const LIGHT_INK = "#ffffff";

function toRgb(hex: string): Rgb | undefined {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match?.[1]) return undefined;
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex(rgb: Rgb): string {
  return `#${rgb
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex) ?? [0, 0, 0];
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contraste WCAG entre duas cores #rrggbb. */
export function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function mix(a: string, b: string, amount: number): string {
  const from = toRgb(a) ?? [0, 0, 0];
  const to = toRgb(b) ?? [0, 0, 0];
  return toHex(
    [0, 1, 2].map(
      (i) => (from[i] ?? 0) + ((to[i] ?? 0) - (from[i] ?? 0)) * amount,
    ) as unknown as Rgb,
  );
}

function saturation(hex: string): number {
  const [r, g, b] = toRgb(hex) ?? [0, 0, 0];
  const max = Math.max(r, g, b);
  return max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = toRgb(hex) ?? [0, 0, 0];
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Aproxima `color` de `toward` até atingir o contraste mínimo contra `against`. */
function fit(color: string, against: string, toward: string): string {
  let result = color;
  for (let step = 1; step <= 25 && contrast(result, against) < MIN_CONTRAST; step++) {
    result = mix(color, toward, step * 0.04);
  }
  return result;
}

/** Variáveis CSS que o tema do clube sobrescreve (as demais ficam como estão). */
export const CLUB_THEME_VARS = [
  "--color-bg",
  "--color-sidebar",
  "--color-surface",
  "--color-surface-2",
  "--color-border",
  "--color-accent",
  "--color-accent-strong",
  "--color-highlight",
  "--color-on-accent",
] as const;

export type ClubThemeVar = (typeof CLUB_THEME_VARS)[number];

/**
 * Variáveis do tema do clube para o modo dado, ou `undefined` se as cores forem inválidas
 * (a interface fica com o tema padrão).
 */
export function buildClubTheme(
  colors: { primary: string; secondary: string },
  mode: ThemeMode,
): Record<ClubThemeVar, string> | undefined {
  if (!toRgb(colors.primary) || !toRgb(colors.secondary)) return undefined;
  const base = CLUB_THEME_BASE[mode];
  const tint = TINT[mode];
  const dark = mode === "dark";

  const chromatic = [colors.primary, colors.secondary].filter(
    (color) => saturation(color) > 0.35 && luminance(color) > 0.02,
  );
  const candidates = chromatic.length > 0 ? chromatic : [colors.primary];
  const source =
    candidates.find((c) => contrast(c, base.surface) >= MIN_CONTRAST) ??
    candidates[0] ??
    colors.primary;
  const brand = candidates[0] ?? colors.primary;
  const accent = fit(source, base.surface, dark ? "#ffffff" : "#000000");
  const strong = fit(
    mix(accent, "#000000", dark ? 0.18 : 0.25),
    base.surface,
    dark ? "#ffffff" : "#000000",
  );
  const onAccent = contrast(accent, DARK_INK) >= contrast(accent, LIGHT_INK) ? DARK_INK : LIGHT_INK;

  return {
    "--color-bg": mix(base.bg, brand, tint.bg),
    "--color-sidebar": mix(base.sidebar, brand, tint.sidebar),
    "--color-surface": mix(base.surface, brand, tint.surface),
    "--color-surface-2": mix(base.surface2, brand, tint.surface2),
    "--color-border": mix(base.border, brand, tint.border),
    "--color-accent": accent,
    "--color-accent-strong": strong,
    "--color-highlight": rgba(accent, dark ? 0.16 : 0.12),
    "--color-on-accent": onAccent,
  };
}
