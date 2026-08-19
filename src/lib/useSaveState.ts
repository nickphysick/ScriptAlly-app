/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useSaveState — the React subscription to `saveSignal`'s in-flight counter.
 *
 * Split from the counter itself so the counter stays a plain module: db.tsx instruments its
 * firestore imports with it, and the unit suite exercises it without React.
 */
import { useEffect, useSyncExternalStore } from "react";
import { SaveState, saveState, subscribeSave, markDirty, clearDirty } from "./saveSignal";

/**
 * ⚠️ `useSyncExternalStore` rather than an effect + useState, because the counter changes DURING
 * renders and commits — an effect-based subscription can miss a write that starts and finishes
 * inside one commit, and would then report "saved" for a state it never observed.
 *
 * The server snapshot is `idle`: nothing is in flight during SSR, and the specs render through
 * `renderToStaticMarkup`, so this is also what they see.
 */
export function useSaveState(): SaveState {
  return useSyncExternalStore(subscribeSave, saveState, () => "idle" as const);
}

/**
 * The whisper's words. Uppercasing is the stylesheet's job — this returns the sentence, so a
 * caller reading it aloud (or a test) gets the real copy.
 *
 * ⚠️ THERE IS NO THIRD STRING. The bar reports whether a write is outstanding and nothing else;
 * a failed write is the failing flow's business to report, and those flows already do it. An
 * error word here would be a second, quieter error surface that nobody would think to check.
 */
export function saveWhisper(s: SaveState): string {
  if (s === "saving") return "Saving…";
  if (s === "dirty") return "Unsaved changes";
  return "All changes saved";
}

/**
 * Register this component's field as dirty for as long as `isDirty` holds.
 *
 * ⚠️ THE CLEANUP IS THE POINT. The effect clears the key on unmount and whenever the key changes,
 * so leaving a page mid-edit cannot leave the bar reading "Unsaved changes" over a form that is
 * no longer on screen — a stuck warning is worse than none, because the next real one is ignored.
 */
export function useDirtyField(key: string, isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) { clearDirty(key); return; }
    markDirty(key);
    return () => clearDirty(key);
  }, [key, isDirty]);
}
