/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * saveSignal — the app's in-flight-write counter, and the bar's status whisper reads it.
 *
 * ⚠️ THE APP EXPOSED NO SAVE STATE, so this is a minimal hook rather than a wiring. The
 * refinement pass is explicit that the whisper must never show a false "saved"; the only honest
 * way to satisfy that is to know when a write is actually outstanding.
 *
 * ⚠️ IT COUNTS, IT DOES NOT FLAG. Two overlapping writes and a boolean would settle on the first
 * one's completion and claim "saved" while the second was still in the air. A counter cannot: it
 * reaches zero only when every outstanding write has finished.
 *
 * ⚠️ A FAILED WRITE STILL DECREMENTS. `trackWrite` settles the counter in a `finally`, so a
 * rejection cannot strand the app on "SAVING…" forever. The whisper reports whether anything is
 * in flight — it is not an error surface, and it must not become one: a write that fails is the
 * failing flow's business to report, and that flow already does it.
 *
 * ⚠️ NO REACT IMPORTS HERE. The counter is a plain module so it can be instrumented at the
 * firestore-import boundary in db.tsx, and so it is testable in the node environment. The hook
 * that subscribes to it lives beside it in `useSaveState.ts`.
 */

export type SaveState = "idle" | "saving";

let inFlight = 0;
const listeners = new Set<(s: SaveState) => void>();

const state = (): SaveState => (inFlight > 0 ? "saving" : "idle");

function notify(): void {
  const s = state();
  for (const fn of listeners) fn(s);
}

export function saveState(): SaveState {
  return state();
}

export function subscribeSave(fn: (s: SaveState) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function beginWrite(): void {
  inFlight += 1;
  if (inFlight === 1) notify();
}

export function endWrite(): void {
  // Clamped at zero: an unbalanced end must not drive the counter negative, which would then need
  // two extra writes before "saving" could ever show again.
  inFlight = Math.max(0, inFlight - 1);
  if (inFlight === 0) notify();
}

/** Wrap a promise so the counter brackets it. Settles in `finally` — rejection included. */
export function trackWrite<T>(p: Promise<T>): Promise<T> {
  beginWrite();
  return p.finally(endWrite);
}

/**
 * Wrap a write FUNCTION so every existing call site is instrumented without being edited.
 * This is what lets db.tsx track ~a hundred writes by aliasing its firestore imports once.
 */
export function tracked<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return (...args: A) => trackWrite(fn(...args));
}

/** Test seam — resets the counter between specs. Never called by app code. */
export function __resetSaveSignal(): void {
  inFlight = 0;
  listeners.clear();
}
