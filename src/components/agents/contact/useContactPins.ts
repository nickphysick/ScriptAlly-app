/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v16 §D — THE LIST'S CONTROLS PIN, as Query Centre v137's do. The ink bar, the filter row and the
 * column headings are `position: sticky` inside the list (contactV16.css), so they release at its end; this hook
 * says WHEN they are pinned (`data-pinned` on the list) and how tall each layer is, so each pins under the one
 * before it.
 *
 * ⚠️ PINNED IS DECIDED FROM A ZERO-HEIGHT SENTINEL AT THE LIST'S TOP, NEVER FROM THE BAR'S OWN BOX: pinning makes
 *    the bar and the filter row shorter, so a reading of either would move with the answer. The sentinel is above
 *    everything that changes size. The hysteresis (pin at 12 or less, unpin only above 36 — the Query Centre's own
 *    `nextPinned`, one definition) and `overflow-anchor: none` on the scroller and the list are the rest of it.
 * ⚠️ DERIVED ON EVERY SCROLL, never an IntersectionObserver: a missed event would be permanent.
 * ⚠️ THE HEIGHTS ARE MEASURED, AND RE-MEASURED when pinning changes, on resize, and whenever a layer's own box
 *    changes (the filter row folds; the headings arrive with the data).
 *
 * A lift candidate: the Query Centre's `usePinnedControls` (centre/QcCentre.tsx) is this hook over its own
 * selectors. Listed in the report; not shared here, because that file is the Query Centre's.
 */
import { useLayoutEffect } from "react";
import { PIN_AT, nextPinned } from "../../queries/centre/QcCentre";

export function useContactPins(list: React.RefObject<HTMLElement | null>, on: boolean, key: unknown): void {
  useLayoutEffect(() => {
    const el = list.current;
    const sc = el?.closest<HTMLElement>(".wpg-scroll");
    const sentinel = el?.querySelector<HTMLElement>('[data-cl16="pin-sentinel"]');
    if (!on || !el || !sc || !sentinel) return undefined;
    let pinned = el.getAttribute("data-pinned") === "true";
    const layers = () => ({
      bar: el.querySelector<HTMLElement>('[data-cl16="bar-pin"]'),
      frow: el.querySelector<HTMLElement>('[data-cl16="frow"]'),
      labels: el.querySelector<HTMLElement>(".lt-labels"),
    });
    const measure = () => {
      const { bar, frow, labels } = layers();
      const b = bar ? bar.offsetHeight : 0, f = frow ? frow.offsetHeight : 0, l = labels ? labels.offsetHeight : 0;
      el.style.setProperty("--cl16-bar-h", `${b}px`);
      el.style.setProperty("--cl16-frow-h", `${f}px`);
      /* a row brought into view by the keyboard lands BELOW the pinned controls, not under them */
      sc.style.setProperty("--wpg-scroll-pad", `${PIN_AT + b + f + l + 8}px`);
    };
    const read = () => {
      const top = sc.getBoundingClientRect().top;
      const next = nextPinned(pinned, sentinel.getBoundingClientRect().top - top, el.getBoundingClientRect().bottom - top);
      if (next !== pinned) {
        pinned = next;
        if (next) el.setAttribute("data-pinned", "true"); else el.removeAttribute("data-pinned");
        measure();
      }
    };
    measure();
    read();
    sc.addEventListener("scroll", read, { passive: true });
    const onResize = () => { measure(); read(); };
    window.addEventListener("resize", onResize);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    const { bar, frow } = layers();
    if (bar) ro?.observe(bar);
    if (frow) ro?.observe(frow);
    return () => {
      sc.removeEventListener("scroll", read);
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
      el.removeAttribute("data-pinned");
      sc.style.removeProperty("--wpg-scroll-pad");
    };
  }, [list, on, key]);
}
