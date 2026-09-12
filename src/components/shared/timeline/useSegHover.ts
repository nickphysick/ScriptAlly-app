/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE BOARD'S HOVER PAIRING, ONCE (four-fixes §4) ═══════════════════════════════════════════
 *
 * v65 §B: the reveal follows the BAR's hover, not the row's. CSS cannot match one sibling's state
 * to another's, so the page names the hovered segment and hands the name down; `TimelineBoard`
 * gives the matching action mark its `on` class. Two delegated handlers on the scroller do it —
 * entering a bar's box names its segment, leaving it for anything that is not the same bar clears.
 *
 * ⚠️ IT LIVES HERE BECAUSE TWO HOSTS MOUNT THIS BOARD AND ONLY ONE OF THEM HAD IT. To-do wired the
 * pair; the Query Centre's Calendar passed `() => {}` for both and set the hover state from
 * `pickSeg` instead — so on that page the caveat label and its button opened on a CLICK, and the
 * click also opened the query, which is two different answers to one gesture. Measured before the
 * fix, at 1440: marks carrying `on` were 0 at rest, 0 after hovering a bar, 1 after clicking it;
 * To-do went 0 → 1 on the hover. A second implementation in the Queries host would have fixed the
 * page and left the two hosts free to drift; this is the one the board already had, lifted.
 *
 * ⚠️ AND THE GRACE IS WHAT STOPS THE FLICKER. Without it, a pointer crossing a lane names and
 * un-names every bar it passes over, so labels appear and vanish in the corner of the reader's eye
 * for bars they are only travelling across. One delay serves both directions: an intent has to
 * survive `SEG_HOVER_DELAY_MS` before it becomes the state, so a bar merely passed over never
 * arrives and a gap crossed between two bars never clears.
 *
 * ⚠️ ONE PENDING INTENT, NOT A QUEUE. Each new intent replaces the last — the pointer's most
 * recent position is the only one that can still be true — and an intent equal to what is already
 * showing is dropped outright, so a pointer moving WITHIN one bar never schedules anything.
 */
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The grace, in and out. ⚠️ EXPORTED so a measurement waits longer than the delay rather than
 * guessing at it — a lock that polls for 150ms against a 120ms grace is 30ms from being flaky, and
 * a number nobody can read is how that happens.
 */
export const SEG_HOVER_DELAY_MS = 120;

/** the bar under a pointer event's target, by the key the board publishes on it */
export function segOf(t: EventTarget | null): string | null {
  const bar = t instanceof Element ? (t.closest(".tl-p, .tl-jc") as HTMLElement | null) : null;
  return bar?.dataset.seg ?? null;
}

export interface SegHover {
  /** the segment key the marks should be `on` for, or `null` */
  seg: string | null;
  onRowsOver: (e: React.MouseEvent) => void;
  onRowsOut: (e: React.MouseEvent) => void;
}

export function useSegHover(delayMs: number = SEG_HOVER_DELAY_MS): SegHover {
  const [seg, setSeg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* ⚠️ THE SHOWING VALUE IN A REF AS WELL AS IN STATE. The handlers are delegated and fire far more
     often than React re-renders them; reading `seg` from the closure would compare against whatever
     it was when the handler was last built, which is how a debounce comes to schedule work it has
     already done. */
  const showing = useRef<string | null>(null);

  const intend = useCallback((next: string | null) => {
    if (next === showing.current) {
      /* already what the reader can see — drop any pending change to something else */
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      showing.current = next;
      setSeg(next);
    }, delayMs);
  }, [delayMs]);

  /* ⚠️ THE TIMER IS CLEARED ON UNMOUNT. A board that leaves the screen mid-grace would otherwise
     set state on a component that no longer exists — and on this app's display-toggling shell a
     page can go while the pointer is still over it. */
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onRowsOver = useCallback((e: React.MouseEvent) => { intend(segOf(e.target)); }, [intend]);
  const onRowsOut = useCallback((e: React.MouseEvent) => {
    const from = segOf(e.target);
    const to = segOf(e.relatedTarget);
    if (from && from !== to) intend(to);
  }, [intend]);

  return { seg, onRowsOver, onRowsOut };
}
