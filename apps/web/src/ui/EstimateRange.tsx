"use client";

import type { PotentialEstimate } from "@brasfoot-like/engine";
import { useT } from "../i18n";

/**
 * Faixa de potencial estimado (038): o texto "low–high" na tela e a frase por extenso para o leitor
 * de tela. Sem cor: a faixa nunca é sinalizada só por cor (FR-019).
 */
export function EstimateRange({
  estimate,
  promotion = false,
}: {
  estimate: PotentialEstimate;
  /** Faixa congelada na promoção (detalhe do jogador). */
  promotion?: boolean;
}) {
  const t = useT();
  const params = { low: estimate.low, high: estimate.high };
  return (
    <>
      <span aria-hidden="true">{t("academy.estimate.range", params)}</span>
      <span className="visually-hidden">
        {t(promotion ? "academy.estimate.ariaPromotion" : "academy.estimate.aria", params)}
      </span>
    </>
  );
}
