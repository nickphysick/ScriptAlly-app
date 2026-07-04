/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Focus-slot state machine (v37 dashboard). The greeting row is a grid `1fr 0px ↔ 1fr 380px`;
 * the right track hosts ONE panel at a time (the To-do card or a focused stat). Hand-off is the
 * locked Flip: outgoing rotateY(-68°) 240ms cubic-bezier(.5,0,.8,.4) forwards; incoming from
 * rotateY(68°) 340ms cubic-bezier(.22,.8,.3,1) both. Sequencing (TIMING): swap = out 230ms →
 * switch → in ~350ms; close = out 240ms → track folds; open = track slides + panel arrives.
 * An `animating` guard ignores requests mid-flight. Reduced motion collapses every transition
 * to an instant state change.
 *
 * The reducer is PURE (unit-tested); useFocusSlot drives the phase timeouts.
 */
import { useEffect, useReducer } from "react";

export type FocusKey = "todo" | "queriesSent" | "active" | "agents" | "responses";

export type FocusPhase = "idle" | "opening" | "closing" | "swap-out" | "swap-in";

export interface FocusState {
  phase: FocusPhase;
  /** The logical focus — drives the grid `.split` class (kept during `closing` so the track
   *  folds only after the panel has flipped out). */
  focus: FocusKey | null;
  /** The panel present in the track. */
  shown: FocusKey | null;
  leaving: FocusKey | null;
  arriving: FocusKey | null;
  /** Swap target held between swap-out and swap-in. */
  pending: FocusKey | null;
}

export type FocusEvent =
  | { type: "request"; target: FocusKey | null; reducedMotion?: boolean }
  | { type: "switch" }
  | { type: "settle" };

/** Locked Flip sequencing (mockup TIMING.d). */
export const FLIP_TIMING = {
  switchAt: 230,
  inMs: 350,
  outMs: 240,
} as const;

/** Delay before the next lifecycle event, per phase. */
export const PHASE_DELAY: Record<Exclude<FocusPhase, "idle">, number> = {
  opening: FLIP_TIMING.inMs + 60,
  closing: FLIP_TIMING.outMs,
  "swap-out": FLIP_TIMING.switchAt,
  "swap-in": FLIP_TIMING.inMs + 30,
};

export const FOCUS_IDLE: FocusState = {
  phase: "idle",
  focus: null,
  shown: null,
  leaving: null,
  arriving: null,
  pending: null,
};

export const focusReducer = (state: FocusState, ev: FocusEvent): FocusState => {
  switch (ev.type) {
    case "request": {
      // The animating guard: requests mid-flight are ignored entirely.
      if (state.phase !== "idle") return state;
      const v = ev.target;
      if (v === state.focus) return state;
      if (ev.reducedMotion) {
        return { ...FOCUS_IDLE, focus: v, shown: v };
      }
      if (state.focus === null && v !== null) {
        return { phase: "opening", focus: v, shown: v, leaving: null, arriving: v, pending: null };
      }
      if (state.focus !== null && v === null) {
        return { phase: "closing", focus: state.focus, shown: state.shown, leaving: state.shown, arriving: null, pending: null };
      }
      // swap — the slot is exclusive; the new focus evicts the old
      return { phase: "swap-out", focus: state.focus, shown: state.shown, leaving: state.shown, arriving: null, pending: v };
    }
    case "switch": {
      if (state.phase !== "swap-out") return state;
      const v = state.pending;
      return { phase: "swap-in", focus: v, shown: v, leaving: null, arriving: v, pending: null };
    }
    case "settle": {
      switch (state.phase) {
        case "opening":
        case "swap-in":
          return { ...state, phase: "idle", arriving: null };
        case "closing":
          return { ...FOCUS_IDLE };
        default:
          return state;
      }
    }
  }
};

export interface FocusSlot extends FocusState {
  /** True while a hand-off is in flight (clicks are ignored). */
  animating: boolean;
  request: (target: FocusKey | null) => void;
}

export const useFocusSlot = (reducedMotion: boolean): FocusSlot => {
  const [state, dispatch] = useReducer(focusReducer, FOCUS_IDLE);

  useEffect(() => {
    if (state.phase === "idle") return;
    const ev: FocusEvent = state.phase === "swap-out" ? { type: "switch" } : { type: "settle" };
    const id = window.setTimeout(() => dispatch(ev), PHASE_DELAY[state.phase]);
    return () => window.clearTimeout(id);
  }, [state.phase]);

  return {
    ...state,
    animating: state.phase !== "idle",
    request: (target) => dispatch({ type: "request", target, reducedMotion }),
  };
};
