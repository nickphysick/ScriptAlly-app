/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do load v1 (design-refs/todo-load-v1/) — WHAT THE TO-DO PAGE SHOWS WHILE ITS TASKS ARRIVE. Pure: the timings, the
 * phase, and the dev-only review switch. `components/todo/ws/WsLoading.tsx` runs the clock and draws it.
 *
 *   · blank   — before 150ms: the frame (header, panels, tabs, the desk's navy bar) with nothing in it;
 *   · outline — from 150ms: one still bar where each real thing will land; from 3s, one line "Still loading your tasks.";
 *   · failed  — a listener error, or 5s with nothing: "Your tasks didn't load." and "Try again";
 *   · loaded  — the tasks are in. Wins over everything: tasks that arrive after the failed state still load the page.
 * ⚠️ THREE STATES, NEVER MIXED: an empty state ("Nothing to do yet", "Nothing snoozed.") renders only when loaded.
 */

/** the load's timings, in one place (R3, R5, R6, R7) */
export const TODO_LOAD = {
  /** tasks inside this never show an outline */
  outlineAfterMs: 150,
  /** the outline's own fade in, and the loaded page's fade over it */
  outlineFadeMs: 150,
  fadeInMs: 220,
  /** "Still loading your tasks." */
  stillAfterMs: 3000,
  /** nothing by now: the failed state */
  failAfterMs: 5000,
} as const;

export type TodoLoadPhase = "blank" | "outline" | "failed" | "loaded";
export interface TodoLoadState { phase: TodoLoadPhase; still: boolean }

/** PURE — what to show, given whether the tasks are in, whether a read failed, and the time since the page mounted */
export function todoLoadPhase(s: { ready: boolean; failed: boolean; sinceMs: number }, t: typeof TODO_LOAD = TODO_LOAD): TodoLoadState {
  if (s.ready) return { phase: "loaded", still: false };
  if (s.failed || s.sinceMs >= t.failAfterMs) return { phase: "failed", still: false };
  if (s.sinceMs >= t.outlineAfterMs) return { phase: "outline", still: s.sinceMs >= t.stillAfterMs };
  return { phase: "blank", still: false };
}

/**
 * B5 — A REVIEW AID: `/todo?load=fast|normal|slow|fail` holds the page in its loading state for 110ms, 900ms, 4.5s, or
 * until it fails. ⚠️ NEVER ON PROD: a production build answers null whatever the URL says (and the call site is gated
 * on the same build constant, so the branch is compiled out).
 */
export const LOAD_HOLDS = { fast: 110, normal: 900, slow: 4500, fail: Infinity } as const;
export type LoadHold = keyof typeof LOAD_HOLDS;
export function loadHoldFor(search: string, mode: string): number | null {
  if (mode === "production") return null;
  const m = /[?&]load=(fast|normal|slow|fail)\b/.exec(search);
  return m ? LOAD_HOLDS[m[1] as LoadHold] : null;
}

/**
 * THE CLOCK — the phase over time, as a plain object so it runs (and is tested with fake timers) without React. It wakes
 * only at the moments the answer can change on its own (150ms, 3s, 5s, the end of a review hold) and calls `onChange`
 * when the phase or the "still loading" line changes. `restart` begins again from now ("Try again").
 */
export interface TodoLoadClock {
  get(): TodoLoadState;
  setReady(ready: boolean): void;
  setFailed(failed: boolean): void;
  restart(): void;
  dispose(): void;
}
export function todoLoadClock(onChange: (s: TodoLoadState) => void, opts: { ready?: boolean; failed?: boolean; hold?: number | null; now?: () => number } = {}): TodoLoadClock {
  const now = opts.now ?? (() => Date.now());
  let start = now();
  let ready = !!opts.ready;
  let failed = !!opts.failed;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const hold = opts.hold ?? null;
  const read = (): TodoLoadState => {
    const since = now() - start;
    const held = hold != null && since < hold;
    return todoLoadPhase({ ready: ready && !held, failed, sinceMs: since });
  };
  let last = read();
  const schedule = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (last.phase === "loaded") return;
    const since = now() - start;
    const marks = [TODO_LOAD.outlineAfterMs, TODO_LOAD.stillAfterMs, TODO_LOAD.failAfterMs, hold ?? 0].filter((m) => Number.isFinite(m) && m > since);
    if (!marks.length) return;
    timer = setTimeout(tick, Math.min(...marks) - since);
  };
  function tick() {
    const s = read();
    if (s.phase !== last.phase || s.still !== last.still) { last = s; onChange(s); }
    schedule();
  }
  schedule();
  return {
    get: () => last,
    setReady: (r) => { ready = r; tick(); },
    setFailed: (f) => { failed = f; tick(); },
    restart: () => { start = now(); failed = false; tick(); },
    dispose: () => { if (timer) clearTimeout(timer); timer = null; },
  };
}
