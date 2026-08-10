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
 * What to DO next, given where we are. The hook is a dispatcher over this and nothing else.
 *
 * ⚠️ THIS EXISTS SO THE THREE TIMING PATHS CAN BE TESTED RATHER THAN ASSERTED AT SOURCE. This
 * repo's vitest runs in `node` with no jsdom and no testing-library, so a hook cannot be rendered
 * here — which left the DRIVER covered only by "it mentions the right constants". Pulling the
 * decision out makes the sequence itself provable against a stubbed clock: a test can step a
 * timeline through `wait → show → hold → hide` and watch it happen.
 */
export type SkeletonAction =
  /** Nothing on screen yet: arm the delay, and show only if we are still waiting when it fires. */
  | { kind: "wait"; ms: number }
  /** Up, and staying up — the data is still out. */
  | { kind: "stay" }
  /** Data has landed but the minimum is not served: hide in `ms`. */
  | { kind: "hold"; ms: number }
  /** Down, now. */
  | { kind: "hide" }
  /** Never appeared and never will for this wait. */
  | { kind: "idle" };

export function skeletonStep(s: {
  loading: boolean;
  shown: boolean;
  /** ms since it appeared; null while it never has. */
  shownFor: number | null;
}): SkeletonAction {
  if (s.loading) return s.shown ? { kind: "stay" } : { kind: "wait", ms: SKELETON_DELAY_MS };
  if (!s.shown) return { kind: "idle" };
  const owed = skeletonHold(s.shownFor ?? SKELETON_MIN_MS);
  return owed === 0 ? { kind: "hide" } : { kind: "hold", ms: owed };
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
    const step = skeletonStep({
      loading,
      shown,
      shownFor: shownAt.current === null ? null : Date.now() - shownAt.current,
    });
    switch (step.kind) {
      case "wait": {
        const id = window.setTimeout(() => {
          shownAt.current = Date.now();
          setShown(true);
        }, step.ms);
        // ⚠️ THE CLEANUP IS WHAT MAKES THE FAST PATH WORK. Data landing inside the delay changes
        // `loading`, which re-runs this effect — and the cleanup cancels the pending show first,
        // so the skeleton never appears at all rather than appearing and being torn down.
        return () => window.clearTimeout(id);
      }
      case "hold": {
        const id = window.setTimeout(() => setShown(false), step.ms);
        return () => window.clearTimeout(id);
      }
      case "hide":
        setShown(false);
        return;
      default:
        return; // "stay" and "idle" both mean: leave it exactly as it is
    }
  }, [loading, shown]);

  return shown;
}
