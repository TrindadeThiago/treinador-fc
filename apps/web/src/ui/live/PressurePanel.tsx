"use client";

import type { LiveMatch, Side } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useId, useState } from "react";
import { type PressureTick, pressureView, RECENT, SMOOTH } from "../../game/pressure-view";
import { useT } from "../../i18n";
import { Card } from "../Card";
import { ChartFigure } from "../charts/ChartFigure";
import chart from "../charts/chart.module.css";
import { scaleLinear } from "../charts/scale";
import { minuteText } from "../event-text";
import styles from "./PressurePanel.module.css";

// Desenho na largura da coluna lateral da rodada (~420px), para o texto ficar no tamanho real.
const WIDTH = 420;
const HEIGHT = 190;
const PAD = { top: 12, right: 10, bottom: 24, left: 40 };
/** Meia altura mínima do eixo em volta de 50%: a pressão costuma oscilar entre 35% e 65%. */
const MIN_HALF_RANGE = 30;

const label = (tick: PressureTick) => minuteText(tick);

/**
 * Pressão do meu jogo ao vivo: quem está criando mais perigo nos últimos minutos (barra e
 * veredito em texto) e a linha da partida inteira, acima do meio quando meu time pressiona.
 * O valor é a chance de finalizar de cada lado em cada minuto, que o motor já calcula: muda com
 * substituições, postura, expulsões, cansaço e placar.
 */
export function PressurePanel({
  match,
  side,
  save,
}: {
  match: LiveMatch;
  side: Side;
  save: SaveFile;
}) {
  const t = useT();
  const id = useId();
  const [hover, setHover] = useState<number | undefined>();
  const view = pressureView(match.state, side);
  if (!view) return null;
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club.shortName]));
  const mine = clubs.get(match.sides[side]) ?? "";
  const theirs = clubs.get(match.sides[side === "home" ? "away" : "home"]) ?? "";
  const started = view.points.length > 0;

  const x = scaleLinear([0, Math.max(view.span - 1, 1)], [PAD.left, WIDTH - PAD.right]);
  // Eixo simétrico em volta do equilíbrio, de 20% a 80%, que se abre se a pressão passar disso.
  const deviation = Math.max(0, ...view.points.map((point) => Math.abs(point.share - 50)));
  const half = Math.min(50, Math.max(MIN_HALF_RANGE, Math.ceil(deviation / 10) * 10));
  const y = scaleLinear([50 - half, 50 + half], [HEIGHT - PAD.bottom, PAD.top]);
  const mid = y(50);
  const line = view.points
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point.share)}`)
    .join(" ");
  const lastX = x(Math.max(view.points.length - 1, 0));
  const area = started ? `${line} L${lastX},${mid} L${x(0)},${mid} Z` : "";
  const axisTicks = view.points.flatMap((point, index) =>
    point.stoppage === 0 && [1, 45, 90, 105, 120].includes(point.minute)
      ? [{ index, text: point.minute === 1 ? "0'" : `${point.minute}'` }]
      : [],
  );
  // Balão e cruz do minuto sob o mouse; os valores também estão na tabela do leitor de tela.
  const hoverAt = (index: number) => ({
    onMouseEnter: () => setHover(index),
    onMouseLeave: () => setHover(undefined),
  });
  const hovered = hover === undefined ? undefined : view.points[hover];
  const tipOf = (share: number, tick: PressureTick) =>
    t("live.pressure.tip", { minute: label(tick), mine, theirs, share, other: 100 - share });
  const verdict = t(`live.pressure.verdict.${view.verdict}`, { club: mine });
  const step = (WIDTH - PAD.left - PAD.right) / Math.max(view.span, 1);
  const title = t("live.pressure.title");

  return (
    <Card aria-label={title} className={styles.panel}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.now}>
        <p className={styles.verdict}>
          <strong>{started ? verdict : t("live.pressure.waiting")}</strong>
        </p>
        <p className={styles.caption}>{t("live.pressure.recent", { minutes: RECENT })}</p>
        <div className={styles.bar} aria-hidden="true">
          <span className={styles.mine} style={{ width: `${view.recent}%` }} />
          <span className={styles.theirs} style={{ width: `${100 - view.recent}%` }} />
        </div>
        <p className={styles.values}>
          <span>{t("live.pressure.share", { club: mine, share: view.recent })}</span>
          <span>{t("live.pressure.share", { club: theirs, share: 100 - view.recent })}</span>
        </p>
      </div>
      <ChartFigure
        title={t("live.pressure.chart", { minutes: SMOOTH })}
        summary={t("live.pressure.summary", {
          mine,
          theirs,
          recent: view.recent,
          overall: view.overall,
          minutes: RECENT,
        })}
        legend={[
          { label: t("live.pressure.key", { club: mine }), series: 0 },
          { label: t("live.pressure.key", { club: theirs }), series: 1 },
        ]}
        details={view.points
          .filter((_point, index) => index === view.points.length - 1 || (index + 1) % 5 === 0)
          .map((point) => ({ label: label(point), value: tipOf(point.share, point) }))}
      >
        <div className={chart.box}>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className={chart.svg}
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <clipPath id={`${id}-above`}>
                <rect x={0} y={0} width={WIDTH} height={mid} />
              </clipPath>
              <clipPath id={`${id}-below`}>
                <rect x={0} y={mid} width={WIDTH} height={HEIGHT - mid} />
              </clipPath>
            </defs>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={mid}
              y2={mid}
              className={styles.midline}
            />
            {[50 - half, 50 + half].map((value) => (
              <line
                key={value}
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={y(value)}
                y2={y(value)}
                className={chart.grid}
              />
            ))}
            {[50 - half, 50, 50 + half].map((value) => (
              <text
                key={value}
                x={PAD.left - 6}
                y={y(value) + 4}
                textAnchor="end"
                className={chart.axis}
              >
                {t("chart.percent", { value })}
              </text>
            ))}
            <text
              x={WIDTH - PAD.right - 4}
              y={PAD.top + 12}
              textAnchor="end"
              className={chart.axis}
            >
              {t("live.pressure.side", { club: mine })}
            </text>
            <text
              x={WIDTH - PAD.right - 4}
              y={HEIGHT - PAD.bottom - 6}
              textAnchor="end"
              className={chart.axis}
            >
              {t("live.pressure.side", { club: theirs })}
            </text>
            {view.halfTimeIndex !== undefined ? (
              <g>
                <line
                  x1={x(view.halfTimeIndex)}
                  x2={x(view.halfTimeIndex)}
                  y1={PAD.top}
                  y2={HEIGHT - PAD.bottom}
                  className={styles.half}
                />
              </g>
            ) : null}
            {started ? (
              <>
                <path d={area} clipPath={`url(#${id}-above)`} className={styles.areaMine} />
                <path d={area} clipPath={`url(#${id}-below)`} className={styles.areaTheirs} />
                <path d={line} className={styles.line} fill="none" />
              </>
            ) : null}
            {axisTicks.map((tick) => (
              <text
                key={tick.index}
                x={x(tick.index)}
                y={HEIGHT - 8}
                textAnchor="middle"
                className={chart.axis}
              >
                {tick.text}
              </text>
            ))}
            {hovered && hover !== undefined ? (
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.top}
                y2={HEIGHT - PAD.bottom}
                className={styles.crosshair}
              />
            ) : null}
            {view.goals.map((goal) => (
              <circle
                key={`${goal.index}-${goal.mine}`}
                cx={x(goal.index)}
                cy={goal.mine ? PAD.top + 2 : HEIGHT - PAD.bottom - 2}
                r={5}
                className={goal.mine ? styles.goalMine : styles.goalTheirs}
              />
            ))}
            {view.points.map((point, index) => (
              <rect
                key={`${point.half}-${point.minute}-${point.stoppage}`}
                x={x(index) - step / 2}
                y={PAD.top}
                width={step}
                height={HEIGHT - PAD.top - PAD.bottom}
                className={chart.hit}
                {...hoverAt(index)}
              />
            ))}
          </svg>
          {hovered && hover !== undefined ? (
            <div
              aria-hidden="true"
              className={chart.tip}
              style={{
                left: `${Math.min(85, Math.max(15, (x(hover) / WIDTH) * 100))}%`,
                top: `${(y(hovered.share) / HEIGHT) * 100}%`,
              }}
            >
              {tipOf(hovered.share, hovered)}
              {view.goals
                .filter((goal) => goal.index === hover)
                .map((goal) => `\n${t("live.pressure.goal", { club: goal.mine ? mine : theirs })}`)
                .join("")}
            </div>
          ) : null}
        </div>
      </ChartFigure>
      <p className={styles.note}>{t("live.pressure.note")}</p>
    </Card>
  );
}
