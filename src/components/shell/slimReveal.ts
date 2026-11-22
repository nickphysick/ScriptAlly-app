/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE SLIM PINNED ROW'S ONE READER, shared by the Contact list (ContactSlimRow, header v2) and the Query Centre
 * (QcSlim156, v156 §3). Extracted from ContactSlimRow unchanged: the same reader, the same moment, the same offset.
 *
 *   SHOWN once the page's header has gone under the row's line (the scroller's top + the row's sticky top + its
 *   height), read on every scroll and resize of the page's scroller (`.wpg-scroll`), never by an observer of the header.
 *   THE OFFSET: while shown, the row writes `--pin-cover` on the element the page's pinned rows read it from (`cover`)
 *   as its own measured bottom (its sticky top + its height + `extra`), and removes it the moment it hides, so they
 *   return to the value they inherit. ⚠️ Never written where the row itself reads `--pin-cover`: it would feed back.
 */
import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from "react";

export interface SlimRevealOpts {
  /** the header the row stands in for, found from the row */
  header: (row: HTMLElement) => HTMLElement | null | undefined;
  /** where the pinned rows below read `--pin-cover`, found from the row */
  cover: (row: HTMLElement) => HTMLElement | null | undefined;
  /** added to the row's bottom in the offset it writes (the Query Centre's toolbar strip carries the lip's 12px) */
  extra?: number;
}

export function useSlimReveal(ref: RefObject<HTMLElement | null>, opts: SlimRevealOpts): boolean {
  const [shown, setShown] = useState(false);
  const { header, cover, extra = 0 } = opts;

  /* ONE READER: has the header gone under the row's line (the row's sticky top plus its height) */
  const read = useCallback(() => {
    const row = ref.current;
    const sc = row?.closest<HTMLElement>(".wpg-scroll");
    const hd = row ? header(row) : null;
    if (!row || !sc || !hd || hd.offsetHeight === 0) return;
    const line = sc.getBoundingClientRect().top + (parseFloat(getComputedStyle(row).top) || 0) + row.offsetHeight;
    setShown(hd.getBoundingClientRect().bottom <= line);
  }, [ref, header]);
  useEffect(() => {
    const row = ref.current;
    const sc = row?.closest<HTMLElement>(".wpg-scroll");
    if (!sc) return undefined;
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(read); };
    read();
    sc.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(on);
    ro?.observe(sc);
    return () => { cancelAnimationFrame(raf); sc.removeEventListener("scroll", on); window.removeEventListener("resize", on); ro?.disconnect(); };
  }, [ref, read]);

  /* the offset the pinned rows below sit under, while the row shows */
  useLayoutEffect(() => {
    const row = ref.current;
    const el = row ? cover(row) : null;
    if (!row || !el) return undefined;
    if (shown) el.style.setProperty("--pin-cover", `${(parseFloat(getComputedStyle(row).top) || 0) + row.offsetHeight + extra}px`);
    else el.style.removeProperty("--pin-cover");
    return () => { el.style.removeProperty("--pin-cover"); };
  }, [ref, cover, extra, shown]);

  return shown;
}
