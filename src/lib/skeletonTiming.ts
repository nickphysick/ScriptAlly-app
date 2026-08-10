/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * skeletonTiming — when the dashboard's loading skeleton is on screen, and how it leaves.
 *
 * ⚠️⚠️ THE SKELETON COVERS FROM THE FIRST FRAME. THE 200ms "no skeleton under a fast load" DELAY
 * IS DELETED, AND ITS DELETION IS THE FIX (Nick's call, 10 Aug, superseding the audit pack's
 * fast-path rule — stated twice, after three attempts that changed nothing he could see).
 *
 * Why the delay was not merely unnecessary but the actual fault: the dashboard has a SECOND,
 * older skeleton system — the per-card `.isload` bars (§8) — which mounts INSTANTLY at t=0 with
 * no delay and no minimum. A warm Firestore load resolves from the IndexedDB cache in well under
 * 200ms, so on a normal dev refresh the sequence was: per-card bars flash at t=0 → data lands
 * ~100–150ms → this overlay's 200ms timer is CANCELLED and it never mounts → every card's
 * content snaps from opacity 0 to 1 in a single frame. That snap was the reported blink — and
 * because it happened entirely OUTSIDE this overlay, three successive fixes to the overlay's
 * reveal produced no visible difference whatsoever. A fix that lives in a path that never runs
 * is not a fix.
 *
 * With the cover on the first paint, the per-card bars are never seen (they still render, harmless,
 * beneath it), there is no two-skeletons pop at 200ms, and every load — however fast — resolves the
 * same way: one calm surface, held briefly, dissolving onto a page that is already settled.
 *
 *   · SKELETON_MIN_MS  — how long the cover stays once seen. ~half a second: long enough to read
 *     as a deliberate state rather than a flicker, short enough not to feel like a wait.
 *   · SKELETON_FADE_MS — the dissolve. The element must NOT unmount on the frame it finishes:
 *     swapping a full-page shell for the page in one frame is a hard cut, and a hard cut reads as
 *     a glitch however well the blocks line up.
 *
 * ⚠️ THE COST IS STATED, NOT HIDDEN: on a 50ms cache load the user now waits ~750ms for content
 * they could have had sooner. The audit pack rejected exactly this trade; Nick, watching the
 * alternative, chose it. One consistent arrival beats a faster twitchy one.
 */
import { useEffect, useRef, useState } from "react";

/** Once on screen, the cover stays at least this long. */
export const SKELETON_MIN_MS = 500;
/**
 * ⚠️ THE SETTLE BEAT — the cover always outlives `loading` by at least this, EVEN when the
 * minimum is already served. Found by measurement, not taste: with the fade starting in the same
 * breath as the data, the populated page's own arrival work (chart draw-in, count-ups, first
 * layout of the real content) landed a ~200ms main-thread stall in the MIDDLE of the dissolve —
 * the frame trace read `1 → 0.95 → 0.848 → [208ms of nothing] → unmounted`. The same fade with
 * the heavy render 400ms behind it ran sixteen clean frames to zero. So the heavy work is made to
 * happen UNDER the opaque cover, where jank is invisible, and the dissolve begins on a quiet
 * thread. Dissolving onto a page that is still laying itself out is "revealed mid-arrival" — the
 * exact fault this module exists to remove — arrived at by a third route.
 */
export const SKELETON_SETTLE_MS = 200;
/** How long the dissolve takes. ⚠️ Must match `.os-skelpage`'s transition — locked together. */
export const SKELETON_FADE_MS = 250;

/** `off` — not rendered · `on` — covering the page · `out` — dissolving, content live beneath. */
export type SkeletonPhase = "off" | "on" | "out";

export interface SkeletonState {
  phase: SkeletonPhase;
  /**
   * Did a cover appear during this page's life? Sticky once true.
   *
   * ⚠️ THIS IS WHAT STOPS THE PAGE ARRIVING TWICE. The dashboard's entrance stagger and this
   * skeleton are two answers to the same question — "the page is arriving" — and running both
   * means it arrives twice. The dashboard reads this to skip the stagger; the dissolve IS the
   * arrival whenever a cover was seen.
   */
  wasShown: boolean;
}

/** How much of the minimum is still owed, `shownFor` ms after the cover appeared. */
export function skeletonHold(shownFor: number): number {
  return Math.max(0, SKELETON_MIN_MS - shownFor);
}

/**
 * The driver.
 *
 * ⚠️ THE PHASE IS ONE PIECE OF STATE, INITIALISED FROM THE PROP — both halves matter.
 *
 * ONE state: an earlier version derived the phase from two booleans (`shown` + a `leaving` set by
 * a follow-up effect), and between the first flipping and the second being set React rendered the
 * derived value as `"off"` — the element unmounted for a frame, re-mounted already transparent,
 * and the "fade" was invisible. One state has no intermediate render to get wrong: "on" → "out"
 * is a single update, so the element is still mounted, still opaque, when its class changes and
 * the browser has something to transition.
 *
 * INITIALISED from `loading`, never raised by an effect: an effect runs after the first paint, so
 * a cover it raises arrives a frame late — one frame of the per-card bars, which is exactly the
 * flash this module exists to remove. `useState(loading ? "on" : "off")` puts the cover in the
 * FIRST render's output.
 *
 * ⚠️ `shownAt` IS A REF — it is read inside a timeout to compute what is still owed; as state it
 * would re-arm the timer on every tick.
 *
 * ⚠️ A LATER `loading` SPELL RAISES THE COVER AGAIN (with its own minimum), but `wasShown` stays
 * true from the first — the stagger must not return on a refetch.
 */
export function useSkeleton(loading: boolean): SkeletonState {
  const [phase, setPhase] = useState<SkeletonPhase>(loading ? "on" : "off");
  const everShown = useRef(loading);
  const shownAt = useRef<number | null>(loading ? Date.now() : null);

  useEffect(() => {
    if (loading) {
      // A refetch after the first life: raise the cover again. (On mount this branch is a no-op —
      // the initialiser already raised it, at paint rather than a frame later.)
      if (phase !== "on") {
        shownAt.current = Date.now();
        everShown.current = true;
        setPhase("on");
      }
      return;
    }
    if (phase !== "on") return; // off stays off; a fade in flight completes via its own timer
    /* ⚠️ ALWAYS A TIMER, NEVER AN IMMEDIATE "out" — the settle beat is a floor, not a fallback.
       The populated render happens on this very update; the beat is what keeps its jank under the
       opaque cover. And "out" is reached from "on" in ONE state change, so the element is still
       mounted, still opaque, on the render that adds the fade class. */
    const owed = Math.max(
      SKELETON_SETTLE_MS,
      skeletonHold(shownAt.current === null ? 0 : Date.now() - shownAt.current),
    );
    const id = window.setTimeout(() => setPhase("out"), owed);
    return () => window.clearTimeout(id);
  }, [loading, phase]);

  /* The dissolve's own clock. React cannot transition an unmounting node, so the element outlives
     the decision by exactly one fade. */
  useEffect(() => {
    if (phase !== "out") return;
    const id = window.setTimeout(() => setPhase("off"), SKELETON_FADE_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  return { phase, wasShown: everShown.current };
}
