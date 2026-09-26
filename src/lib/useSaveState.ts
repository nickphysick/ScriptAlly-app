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

/* ⚠️ `saveWhisper` IS RETIRED (app shell v3, 26 Sep, D5) — its one caller was the shell's "All changes
   saved", removed from every route. It could never report a failure (`SaveState` has no error value),
   so nothing is lost; `useSaveState` stays as the read a real failure surface would take. */

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
