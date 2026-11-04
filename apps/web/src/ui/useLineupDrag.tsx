"use client";

import type { Place } from "@brasfoot-like/engine";
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "./useLineupDrag.module.css";

/** Quanto o ponteiro anda antes de virar arraste (abaixo disso é um clique). */
const THRESHOLD = 6;
/** Faixa perto da borda da janela que rola a página durante o arraste. */
const EDGE = 64;
const SCROLL_STEP = 14;

const keyOf = (place: Place) => JSON.stringify(place);

interface Pending {
  place: Place;
  label: string;
  pointerId: number;
  x: number;
  y: number;
  started: boolean;
}

export interface LineupDrag {
  /** Props de quem pode ser arrastado. `touch`: aceita toque no próprio elemento (no campo). */
  source(
    place: Place,
    label: string,
    options?: { touch?: boolean },
  ): {
    "data-drop": string;
    "data-drop-over"?: "true";
    "data-dragging"?: "true";
    onPointerDown(event: ReactPointerEvent<HTMLElement>): void;
    onClickCapture(event: ReactMouseEvent<HTMLElement>): void;
  };
  /** Props de um lugar que só recebe (a vaga livre do banco). */
  target(place: Place): { "data-drop": string; "data-drop-over"?: "true" };
  /** Balão com o nome que segue o ponteiro durante o arraste. */
  ghost: ReactNode;
}

/**
 * Arrastar jogadores na escalação (Pointer Events, sem biblioteca): solto sobre outro lugar, chama
 * `onMove(origem, destino)`, o mesmo caminho do clique em dois lugares. Sem mover o ponteiro, o
 * clique segue normal; Esc cancela. No toque, só arrasta onde `touch` permite ou pela alça
 * (`data-drag-handle`), para a página continuar rolando com o dedo.
 */
export function useLineupDrag(onMove: (from: Place, to: Place) => void): LineupDrag {
  const pending = useRef<Pending | undefined>(undefined);
  const suppressClick = useRef(false);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const [dragging, setDragging] = useState<{ key: string; label: string } | undefined>();
  const [pointer, setPointer] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [over, setOver] = useState<string | undefined>();

  const targetAt = useCallback((x: number, y: number): string | undefined => {
    const element = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-drop]");
    return element?.dataset.drop;
  }, []);

  const stop = useCallback(() => {
    pending.current = undefined;
    setDragging(undefined);
    setOver(undefined);
    document.body.classList.remove(styles.dragging as string);
  }, []);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const current = pending.current;
      if (!current || event.pointerId !== current.pointerId) return;
      if (!current.started) {
        if (Math.hypot(event.clientX - current.x, event.clientY - current.y) < THRESHOLD) return;
        current.started = true;
        setDragging({ key: keyOf(current.place), label: current.label });
        document.body.classList.add(styles.dragging as string);
      }
      event.preventDefault();
      setPointer({ x: event.clientX, y: event.clientY });
      setOver(targetAt(event.clientX, event.clientY));
      if (event.clientY < EDGE) window.scrollBy(0, -SCROLL_STEP);
      else if (event.clientY > window.innerHeight - EDGE) window.scrollBy(0, SCROLL_STEP);
    };
    const up = (event: PointerEvent) => {
      const current = pending.current;
      if (!current || event.pointerId !== current.pointerId) return;
      if (current.started) {
        // O soltar dispara um clique no elemento de origem: ele não deve virar seleção.
        suppressClick.current = true;
        setTimeout(() => {
          suppressClick.current = false;
        }, 0);
        const key = targetAt(event.clientX, event.clientY);
        if (key && key !== keyOf(current.place)) {
          onMoveRef.current(current.place, JSON.parse(key) as Place);
        }
      }
      stop();
    };
    const cancel = (event: PointerEvent) => {
      if (pending.current && event.pointerId === pending.current.pointerId) stop();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && pending.current?.started) {
        event.stopPropagation();
        stop();
      }
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key, true);
      document.body.classList.remove(styles.dragging as string);
    };
  }, [stop, targetAt]);

  const marks = (key: string) => ({
    "data-drop": key,
    ...(over === key && dragging?.key !== key ? { "data-drop-over": "true" as const } : {}),
  });

  return {
    source(place, label, options = {}) {
      const key = keyOf(place);
      return {
        ...marks(key),
        ...(dragging?.key === key ? { "data-dragging": "true" as const } : {}),
        onPointerDown(event) {
          if (event.button !== 0) return;
          const handle = (event.target as HTMLElement).closest("[data-drag-handle]");
          if (event.pointerType === "touch" && !options.touch && !handle) return;
          pending.current = {
            place,
            label,
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            started: false,
          };
        },
        onClickCapture(event) {
          if (!suppressClick.current) return;
          event.preventDefault();
          event.stopPropagation();
        },
      };
    },
    target(place) {
      return marks(keyOf(place));
    },
    ghost: dragging ? (
      <div aria-hidden="true" className={styles.ghost} style={{ left: pointer.x, top: pointer.y }}>
        {dragging.label}
      </div>
    ) : null,
  };
}
