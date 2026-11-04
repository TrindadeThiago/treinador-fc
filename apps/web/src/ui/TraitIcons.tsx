import type { Trait } from "@brasfoot-like/engine";
import type { ReactNode } from "react";
import { label } from "../i18n";
import styles from "./TraitIcons.module.css";

/** Desenho de cada característica, em traço de 16×16 na cor do texto. */
const ICON: Record<Trait, ReactNode> = {
  // Alvo: quem finaliza bem.
  finisher: (
    <>
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 0.5v3M8 12.5v3M0.5 8h3M12.5 8h3" />
    </>
  ),
  // Tijolos: a muralha.
  wall: (
    <>
      <rect x="1.5" y="3" width="13" height="10" rx="1" />
      <path d="M1.5 6.3h13M1.5 9.7h13M6 3v3.3M10 6.3v3.4M6 9.7V13" />
    </>
  ),
  // Bola com a curva da cobrança.
  "free-kick": (
    <>
      <circle cx="4" cy="12" r="2.5" />
      <path d="M6.5 10.5C9 5 12 3.5 14.5 3" />
      <path d="M11.5 1.8l3 1.2-1.6 2.8" />
    </>
  ),
  // Cabeça e a bola chegando.
  heading: (
    <>
      <circle cx="6" cy="10.5" r="4" />
      <circle cx="12.5" cy="3" r="2" />
      <path d="M10.8 5.2L8.8 7.2" />
    </>
  ),
  // Raio: velocidade.
  pace: <path d="M9.5 1L3 9h4.5L6.5 15 13 7H8.5z" />,
  // Passe: três pontos ligados.
  playmaker: (
    <>
      <circle cx="3" cy="12.5" r="1.8" />
      <circle cx="8" cy="3.5" r="1.8" />
      <circle cx="13" cy="11" r="1.8" />
      <path d="M4 11l3.2-5.8M9.2 5l3 4.4M4.8 12.3l6.4-1" />
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
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              {ICON[trait]}
            </svg>
          </span>
        );
      })}
    </span>
  );
}
