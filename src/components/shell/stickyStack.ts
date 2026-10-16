/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * v138.6 §B — THE STICKY STACK's ONE WRITER, for a list whose navy header is its sticky row (the Query Centre and the
 * Contact list). Two heights, measured, never polled:
 *   - `--pin-cover` on `.ws-window`: the sheet lip's cover (the pinned-row fix's `usePinCover`), which the navy header
 *     sticks under;
 *   - `--stk-head-h` on the page's scroller (`.wpg-scroll`): the navy header's own height, read whenever it resizes
 *     (a title that wraps, a narrower sheet), which the headings and the current group band stick under.
 * Written on the scroller rather than the page so the scroller's own `--wpg-scroll-pad` can read it too.
 *
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED: the writer runs only while its page is on screen (`on`), and a header
 *    measured at 0 (a page hidden by the shell) is never written.
 */
import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { usePinCover } from "./PinnedRow";

export function useStickyStack(head: RefObject<HTMLElement | null>, on: boolean): void {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => { setHost(on ? head.current?.closest<HTMLElement>(".ws-window") ?? null : null); }, [head, on]);
  usePinCover(on ? host : null);
  useLayoutEffect(() => {
    const h = head.current;
    const sc = h?.closest<HTMLElement>(".wpg-scroll");
    if (!on || !h || !sc) return undefined;
    const write = () => { const v = h.offsetHeight; if (v > 0) sc.style.setProperty("--stk-head-h", `${v}px`); };
    write();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(write);
    ro.observe(h);
    return () => ro.disconnect();
  }, [head, on]);
}
