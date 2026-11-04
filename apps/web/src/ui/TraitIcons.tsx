import type { Trait } from "@brasfoot-like/engine";
import type { ReactNode } from "react";
import { label } from "../i18n";
import styles from "./TraitIcons.module.css";

/**
 * Desenho de cada característica: ícones do Tabler Icons 3.50.0 (https://tabler.io/icons),
 * copiados aqui para não depender de pacote nem de requisição externa.
 * Licença MIT, Copyright (c) 2020-2026 Paweł Kuna.
 */
const ICON: Record<Trait, ReactNode> = {
  // target-arrow
  finisher: (
    <>
      <path d="M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <path d="M12 7a5 5 0 1 0 5 5" />
      <path d="M13 3.055a9 9 0 1 0 7.941 7.945" />
      <path d="M15 6v3h3l3 -3h-3v-3l-3 3" />
      <path d="M15 9l-3 3" />
    </>
  ),
  // wall
  wall: (
    <>
      <path d="M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12" />
      <path d="M4 8h16" />
      <path d="M20 12h-16" />
      <path d="M4 16h16" />
      <path d="M9 4v4" />
      <path d="M14 8v4" />
      <path d="M8 12v4" />
      <path d="M16 12v4" />
      <path d="M11 16v4" />
    </>
  ),
  // shoe
  "free-kick": (
    <>
      <path d="M4 6h5.426a1 1 0 0 1 .863 .496l1.064 1.823a3 3 0 0 0 1.896 1.407l4.677 1.114a4 4 0 0 1 3.074 3.89v2.27a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-10a1 1 0 0 1 1 -1" />
      <path d="M14 13l1 -2" />
      <path d="M8 18v-1a4 4 0 0 0 -4 -4h-1" />
      <path d="M10 12l1.5 -3" />
    </>
  ),
  // user-up
  heading: (
    <>
      <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
      <path d="M6 21v-2a4 4 0 0 1 4 -4h4" />
      <path d="M19 22v-6" />
      <path d="M22 19l-3 -3l-3 3" />
    </>
  ),
  // run-sprint
  pace: (
    <>
      <path d="M14.007 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
      <path d="M7 17l5 1l.75 -1.5" />
      <path d="M18 21v-4l-4 -3l1 -6" />
      <path d="M10 12v-3l5 -1l3 3l3 1" />
      <path d="M10 5h-4" />
      <path d="M6 10h-4" />
    </>
  ),
  // route
  playmaker: (
    <>
      <path d="M3 19a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
      <path d="M19 7a2 2 0 1 0 0 -4a2 2 0 0 0 0 4" />
      <path d="M11 19h5.5a3.5 3.5 0 0 0 0 -7h-8a3.5 3.5 0 0 1 0 -7h4.5" />
    </>
  ),
};

/** Ícones das características do jogador, cada um com o nome no texto alternativo e na dica. */
export function TraitIcons({ traits }: { traits: readonly Trait[] }) {
  if (traits.length === 0) return null;
  return (
    <span className={styles.traits}>
      {traits.map((trait) => {
        const name = label(`trait.${trait}`);
        return (
          <span key={trait} role="img" aria-label={name} title={name} className={styles.trait}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              {ICON[trait]}
            </svg>
          </span>
        );
      })}
    </span>
  );
}
