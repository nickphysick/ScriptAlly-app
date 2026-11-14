/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TALL-PANEL RULE (Query Centre v154 §6, extracted from QcPage151 unchanged for Contact list — Query Centre layout
 * v1): the filter column's card (`.qc153-rail`) sticks 14px under the toolbar's top; when it is taller than the room the
 * scrollport leaves under that, it carries `data-qc154-tall` and scrolls with the page (qcv154.css: `position: relative`).
 * Re-read when the card or the scrollport resizes, and on window resize.
 *
 * `root` is the element whose `--pin-cover` applies (the Query Centre's page; the Contact list's `.clv-main`).
 */
import { useEffect, type RefObject } from "react";

export function useTallRail(rootRef: RefObject<HTMLElement | null>, dep: unknown): void {
  useEffect(() => {
    const root = rootRef.current;
    const rail = root?.querySelector<HTMLElement>(".qc153-rail");
    if (!root || !rail) return undefined;
    const port = root.closest<HTMLElement>(".wpg-scroll");
    const fit = () => {
      const room = (port?.clientHeight ?? window.innerHeight) - 14 - (parseFloat(getComputedStyle(root).getPropertyValue("--pin-cover")) || 12);
      rail.toggleAttribute("data-qc154-tall", rail.offsetHeight > room);
    };
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    ro?.observe(rail); if (port) ro?.observe(port);
    window.addEventListener("resize", fit);
    fit();
    return () => { ro?.disconnect(); window.removeEventListener("resize", fit); };
  }, [rootRef, dep]);
}
