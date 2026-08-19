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

export type SaveState = "idle" | "saving" | "dirty";

let inFlight = 0;
/**
 * ⚠️ A SET OF KEYS, NOT A BOOLEAN — for the same reason `inFlight` is a counter. Two dirty fields
 * and a flag would go clean when the first of them was saved, and the bar would claim "all changes
 * saved" over the second one's unsaved text. Keys also make the state self-healing: a component
 * clears its own key on unmount, so a page cannot strand the bar as dirty by navigating away.
 */
const dirtyFields = new Set<string>();
const listeners = new Set<(s: SaveState) => void>();

/**
 * ⚠️ SAVING OUTRANKS DIRTY, AND BOTH OUTRANK IDLE. With a write in the air and another field
 * still being typed into, both "Saving…" and "Unsaved changes" are true; the in-flight write is
 * the fact that resolves in a moment, so it goes first and the bar settles to "Unsaved changes"
 * afterwards. What matters is the rule neither ordering breaks: the bar must never say saved
 * while something is not.
 */
const state = (): SaveState => (inFlight > 0 ? "saving" : dirtyFields.size > 0 ? "dirty" : "idle");

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

/**
 * Register a field as holding unsaved edits. The key names the field, not the page — see the note
 * on `dirtyFields`. Idempotent: marking twice is one dirty field.
 *
 * ⚠️ THIS IS NOT AN ERROR CHANNEL, and the "no third string" rule above still holds against one.
 * The whisper's own law is that it must never show a false "saved"; a field the writer has typed
 * into and not committed is exactly that case, so this closes the rule rather than widening it.
 * A FAILED write remains the failing flow's business to report.
 */
export function markDirty(key: string): void {
  if (dirtyFields.has(key)) return;
  dirtyFields.add(key);
  if (inFlight === 0 && dirtyFields.size === 1) notify();
}

/** Drop a field's unsaved-edits registration — on save, on discard, and on unmount. */
export function clearDirty(key: string): void {
  if (!dirtyFields.delete(key)) return;
  if (inFlight === 0 && dirtyFields.size === 0) notify();
}

/** The fields currently holding unsaved edits. Read by the leave-warning, never by the bar. */
export function dirtyFieldKeys(): string[] {
  return [...dirtyFields];
}

/** Test seam — resets the counter between specs. Never called by app code. */
export function __resetSaveSignal(): void {
  inFlight = 0;
  dirtyFields.clear();
  listeners.clear();
}
