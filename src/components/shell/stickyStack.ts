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

/* ── the lip's cover (moved here from the retired PinnedRow, the pinned-row fix of 15 Oct). The sheet's sticky lip
   (`SheetLip`, 12px, z 19, `pointer-events: none`) is painted over the sheet's top strip; `--pin-cover` is its
   measured height on `.ws-window`, read on mount, whenever the sheet or a lip resizes, and 340ms after (once the
   sidebar's transition has settled). ── */
/** the cover's height: the lowest bottom edge of the sheet lips lying along the sheet's top edge, else 0 */
export function readPinCover(host: HTMLElement): number {
  const top = host.getBoundingClientRect().top;
  const lips = [...host.querySelectorAll<HTMLElement>("[data-sheet-lip]")]
    .map((l) => l.getBoundingClientRect())
    .filter((r) => r.height > 0 && Math.abs(r.top - top) < 1);
  return lips.length ? Math.max(...lips.map((r) => r.bottom - top)) : 0;
}

export function usePinCover(host: HTMLElement | null): void {
  useLayoutEffect(() => {
    if (!host) return undefined;
    let timer: number | undefined;
    const read = () => host.style.setProperty("--pin-cover", `${Math.round(readPinCover(host) * 100) / 100}px`);
    const later = () => { read(); window.clearTimeout(timer); timer = window.setTimeout(read, 340); };
    read();
    window.addEventListener("resize", later);
    if (typeof ResizeObserver === "undefined") return () => { window.removeEventListener("resize", later); window.clearTimeout(timer); };
    const ro = new ResizeObserver(later);
    ro.observe(host);
    host.querySelectorAll<HTMLElement>("[data-sheet-lip]").forEach((l) => ro.observe(l));
    return () => { ro.disconnect(); window.removeEventListener("resize", later); window.clearTimeout(timer); };
  }, [host]);
}


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
