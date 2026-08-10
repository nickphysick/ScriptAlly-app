/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * skeletonTiming — WHEN a loading skeleton is on screen, as a pure rule plus the hook that drives
 * it (ref design-refs/dashboard-audit.html, `.skel`).
 *
 * ⚠️ THE HARD PART IS NOT THE PICTURE, IT IS THE TIMING. A skeleton exists to say "we do not know
 * yet"; shown for 90ms it says nothing and costs a flash, and a flash reads as a fault in the app
 * rather than as a wait. So there are two independent thresholds and they answer different
 * questions:
 *
 *   · SKELETON_DELAY_MS — how long we are willing to show NOTHING before admitting to a wait.
 *     Under it, the data arrives and the page simply appears. The skeleton never existed.
 *   · SKELETON_MIN_MS  — once it HAS appeared, the shortest life it is allowed. Data landing 30ms
 *     later must not snatch it away, because that is the flash we just paid the delay to avoid.
 *
 * ⚠️ AND THERE IS NO THIRD NUMBER. A longer artificial hold was considered and rejected in the
 * pack: it makes the app measurably slower in exchange for nothing a user wants. Past the
 * minimum, the skeleton leaves the instant the data is ready.
 */
import { useEffect, useRef, useState } from "react";

/** Nothing on screen below this — a wait this short is not worth naming. */
export const SKELETON_DELAY_MS = 200;
/** Having appeared, it stays at least this long. */
export const SKELETON_MIN_MS = 400;

export interface SkeletonMoment {
  /** Is the data still resolving? */
  loading: boolean;
  /** ms since the wait began. */
  waited: number;
  /** ms since the skeleton appeared — `null` while it never has. */
  shownFor: number | null;
}

/**
 * The whole rule, in one expression.
 *
 * ⚠️ THE TWO BRANCHES ARE NOT SYMMETRICAL, and that asymmetry IS the behaviour. Before it has
 * appeared, only `loading` past the delay can raise it. After it has appeared, `waited` is
 * irrelevant — what keeps it up is either the data still being out, or the minimum not yet served.
 */
export function skeletonShows({ loading, waited, shownFor }: SkeletonMoment): boolean {
  if (shownFor === null) return loading && waited >= SKELETON_DELAY_MS;
  return loading || shownFor < SKELETON_MIN_MS;
}

/** How much of the minimum is still owed — 0 once it is served. */
export function skeletonHold(shownFor: number): number {
  return Math.max(0, SKELETON_MIN_MS - shownFor);
}

/**
 * The driver. Returns whether the skeleton should be rendered right now.
 *
 * ⚠️ `shown` IS STATE AND `shownAt` IS A REF, deliberately. The moment it appeared is read inside
 * a timeout to compute what is still owed; as state it would put a changing value in the effect's
 * deps and re-arm the timer on every tick. The same reason the dashboard's entrance guard is a
 * ref — see OneScreenDashboard.
 *
 * ⚠️ A SECOND `loading` SPELL DOES NOT RESTART THE CLOCK. If the data goes out again while the
 * skeleton is still up, it simply stays up; `shownAt` keeps its original stamp so the minimum is
 * measured from when the user first saw it, which is the only moment they can perceive.
 */
export function useSkeleton(loading: boolean): boolean {
  const [shown, setShown] = useState(false);
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    if (loading) {
      if (shown) return; // already up — it stays up while the data is out
      const id = window.setTimeout(() => {
        shownAt.current = Date.now();
        setShown(true);
      }, SKELETON_DELAY_MS);
      return () => window.clearTimeout(id);
    }
    // Data has landed. If it never appeared, it never will for this wait.
    if (!shown) return;
    const owed = skeletonHold(shownAt.current === null ? SKELETON_MIN_MS : Date.now() - shownAt.current);
    if (owed === 0) {
      setShown(false);
      return;
    }
    const id = window.setTimeout(() => setShown(false), owed);
    return () => window.clearTimeout(id);
  }, [loading, shown]);

  return shown;
}
