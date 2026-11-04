"use client";

import {
  adequacy,
  type CompletedPlayer,
  FORMATIONS,
  type Lineup,
  type Place,
  type Unavailability,
} from "@brasfoot-like/engine";
import { label, useT } from "../i18n";
import { FitnessMeter } from "./FitnessMeter";
import styles from "./Pitch.module.css";
import { Condition, HangingBadge } from "./PlayerCondition";
import { PITCH_LAYOUT } from "./pitch-layout";
import { TraitIcons } from "./TraitIcons";
import type { LineupDrag } from "./useLineupDrag";

interface PitchProps {
  lineup: Lineup;
  players: ReadonlyMap<string, CompletedPlayer>;
  unavailable: ReadonlyMap<string, Unavailability>;
  /** Pendurados: a um amarelo de suspensão. */
  hanging?: ReadonlySet<string>;
  /** Condição física (0–100) de cada jogador na data do próximo jogo. */
  fitness?: (playerId: string) => number;
  selected?: Place | undefined;
  onSelect(place: Place): void;
  onFocusPlayer(playerId: string | undefined): void;
  /** Arrastar e soltar entre os lugares; sem ele, só o clique em dois lugares. */
  drag?: LineupDrag | undefined;
}

/**
 * Campo da escalação: as 11 vagas do esquema no desenho do gramado (ataque no alto, volantes atrás
 * dos meias, gol embaixo). Cada vaga é um botão com a força efetiva no círculo, o nome e a condição
 * física; posição natural, força e rendimento fora de posição também vão em texto.
 */
export function Pitch({
  lineup,
  players,
  unavailable,
  hanging,
  fitness,
  selected,
  onSelect,
  onFocusPlayer,
  drag,
}: PitchProps) {
  const t = useT();
  const slots = FORMATIONS[lineup.formation].slots;
  const layout = PITCH_LAYOUT[lineup.formation];
  return (
    <section aria-label={t("lineup.pitch")} className={styles.pitch}>
      <div className={styles.field}>
        <div aria-hidden="true" className={styles.markings}>
          <span className={styles.halfway} />
          <span className={styles.circle} />
          <span className={`${styles.box} ${styles.boxTop}`} />
          <span className={`${styles.box} ${styles.boxBottom}`} />
          <span className={`${styles.goalArea} ${styles.goalTop}`} />
          <span className={`${styles.goalArea} ${styles.goalBottom}`} />
        </div>
        {slots.map((slot) => {
          const playerId = lineup.starters[slot.id];
          const player = playerId ? players.get(playerId) : undefined;
          const place: Place = { kind: "slot", slotId: slot.id };
          const isSelected = selected?.kind === "slot" && selected.slotId === slot.id;
          const factor = player ? adequacy(player.position, slot.position) : 1;
          const point = layout[slot.id] ?? { x: 50, y: 50 };
          const position = label(`position.${slot.position}`);
          const dragProps = player
            ? drag?.source(place, player.displayName, { touch: true })
            : drag?.target(place);
          return (
            <button
              key={slot.id}
              type="button"
              aria-pressed={isSelected}
              className={`${styles.slot} ${isSelected ? styles.selected : ""} ${
                player ? "" : styles.empty
              } ${factor < 1 ? styles.off : ""}`}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              onClick={() => onSelect(place)}
              onFocus={() => onFocusPlayer(playerId)}
              {...dragProps}
            >
              <span className={styles.badge}>
                <span className={styles.ring}>
                  {player ? Math.round(player.strength * factor) : "+"}
                </span>
                <span className={styles.position}>{position}</span>
              </span>
              <span className={styles.name}>{player?.displayName ?? t("lineup.emptySlot")}</span>
              {player ? (
                <span className="visually-hidden">
                  {t("lineup.naturalShort", { position: label(`position.${player.position}`) })}
                  {" · "}
                  {t("lineup.effective", { value: Math.round(player.strength * factor) })}
                </span>
              ) : null}
              {player && factor < 1 ? (
                <span className={styles.warning}>
                  {t("lineup.offShort", {
                    position: label(`position.${player.position}`),
                    percent: Math.round(factor * 100),
                  })}
                  <span className="visually-hidden">
                    {` · ${t("lineup.outOfPosition", { percent: Math.round(factor * 100) })}`}
                  </span>
                </span>
              ) : null}
              {playerId && fitness ? (
                <span className={styles.fitness}>
                  <FitnessMeter value={fitness(playerId)} compact />
                </span>
              ) : null}
              {player && player.traits.length > 0 ? (
                <span className={styles.traits}>
                  <TraitIcons traits={player.traits} />
                </span>
              ) : null}
              {playerId ? <Condition entry={unavailable.get(playerId)} hideAvailable /> : null}
              {playerId ? <HangingBadge hanging={hanging?.has(playerId) ?? false} /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
