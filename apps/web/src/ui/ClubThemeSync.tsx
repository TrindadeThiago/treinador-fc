"use client";

import { useEffect, useState } from "react";
import { usePreferences } from "../storage/usePreferences";
import { buildClubTheme, CLUB_THEME_VARS, type ThemeMode } from "./club-theme";

function currentMode(): ThemeMode {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/**
 * Aplica as cores do clube escolhido à interface do jogo (só variáveis CSS na `<html>`).
 * Sai junto com a tela do jogo: o menu e as demais telas voltam ao tema padrão.
 */
export function ClubThemeSync({
  colors,
}: {
  colors?: { primary: string; secondary: string } | undefined;
}) {
  const enabled = usePreferences().clubColors ?? true;
  const [mode, setMode] = useState<ThemeMode>("dark");
  const primary = colors?.primary;
  const secondary = colors?.secondary;

  // Acompanha o `data-theme` (preferência ou sistema), que o ThemeSync mantém em dia.
  useEffect(() => {
    setMode(currentMode());
    const observer = new MutationObserver(() => setMode(currentMode()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const clear = () => {
      for (const name of CLUB_THEME_VARS) root.style.removeProperty(name);
    };
    if (!enabled || !primary || !secondary) {
      clear();
      return;
    }
    const theme = buildClubTheme({ primary, secondary }, mode);
    if (!theme) {
      clear();
      return;
    }
    for (const [name, value] of Object.entries(theme)) root.style.setProperty(name, value);
    return clear;
  }, [enabled, primary, secondary, mode]);

  return null;
}
