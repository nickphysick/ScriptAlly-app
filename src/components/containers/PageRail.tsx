/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ PageRail — a page's side panel, below the full header's rule (page-anatomy-v2 §3) ═══════════
 *
 * A 340px white card with 14px corners and the soft lift, sticky INSIDE the scroller at `top: 16px`
 * (the Contact list's pattern), with a blush tray head and a scrolling body. The page supplies the
 * tray's contents and the body; the card, the stickiness and the height are this component's.
 *
 * ⚠️ IT EXISTS BECAUSE THE SECOND COPY WAS ABOUT TO BE WRITTEN. `ContactRail` and `QcRail` each
 * style their own; Comparable titles would have been the third, and Submission packages the fourth.
 * Both are MIGRATION CANDIDATES, deliberately not migrated in the run that built this (G2): their
 * trays differ (ContactRail's is inset 8px in a 20px card) and moving them is its own pass.
 *
 * ⚠️ THE HEIGHT IS THE HEIGHT IT HAS WHEN STUCK, derived from the SCROLLER'S measured top — never
 * `100vh` minus a constant (the house viewport law). It is a `max-height`, so a rail whose contents
 * are shorter than the room hugs them, and it does not change as the page scrolls: at rest the card
 * may run past the fold exactly as the mock's does, and it is the whole card once it sticks.
 * (`ContactRail` sets a HEIGHT from its CURRENT top, so its card grows as the page scrolls — a
 * deliberate difference, and one of the two things a migration would have to reconcile.)
 * `railHeight` owns the clamp (360 ↔ 860) and refuses a pre-layout reading; the previous value
 * stands until a real one arrives.
 */
import React, { useLayoutEffect, useRef } from "react";
import { RAIL_TOP_GAP, railHeight } from "../../lib/contactList";
import "./pageRail.css";

export interface PageRailProps {
  /** The rail's accessible name. */
  label: string;
  /** The tray head's contents — title, tags, peek art. The tray clips them. */
  tray: React.ReactNode;
  /** Extra class on the tray (a page's own min-height and padding). */
  trayClassName?: string;
  /** The scrolling body. */
  children?: React.ReactNode;
  /** A page class on the card, for its grid placement. */
  className?: string;
  /** Probe hooks the page's measurements read. */
  dataAttrs?: Record<string, string>;
  trayDataAttrs?: Record<string, string>;
  /**
   * ADDITIVE (Analytics v2a, 29 Sep) — the card FILLS the room from its CURRENT top to the fold,
   * rather than capping at the height it has when stuck. At rest a stuck-height card runs past the
   * fold by the header's height; a page whose rail must be whole on load (the story rail) asks for
   * this instead, and the card grows as the page scrolls until it sticks. Off by default, so every
   * existing rail renders exactly as before.
   */
  fill?: boolean;
  /** ADDITIVE — a pinned foot below the scrolling body (the story rail's closing line). */
  foot?: React.ReactNode;
}

export const PageRail: React.FC<PageRailProps> = ({ label, tray, trayClassName, children, className, dataAttrs, trayDataAttrs, fill = false, foot }) => {
  const ref = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const scroller = el.closest(".wpg-scroll") as HTMLElement | null;
    const put = () => {
      raf = 0;
      const top = scroller?.getBoundingClientRect().top ?? NaN;
      /* ⚠️ A ZERO TOP IS THE PAGE BEFORE LAYOUT (or hidden under a mounted sibling route), not a
         scroller at the top of the window — the bar is always above it. Refuse it. */
      if (!(top > 0)) return;
      const h = railHeight(top + RAIL_TOP_GAP, window.innerHeight);
      if (h != null) el.style.maxHeight = `${h}px`;
      if (fill) {
        /* from the card's own top while it sits below the header; the stuck top once it has stuck */
        const own = el.getBoundingClientRect().top;
        const f = railHeight(Math.max(own, top + RAIL_TOP_GAP), window.innerHeight);
        if (f != null) el.style.height = `${f}px`;
      }
    };
    const ask = () => { if (!raf) raf = requestAnimationFrame(put); };
    put();
    window.addEventListener("resize", ask);
    /* the fill height follows the card's own top, which moves as the page scrolls */
    if (fill) scroller?.addEventListener("scroll", ask, { passive: true });
    const ro = new ResizeObserver(ask);
    ro.observe(document.documentElement);
    return () => {
      window.removeEventListener("resize", ask);
      if (fill) scroller?.removeEventListener("scroll", ask);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [fill]);

  return (
    <aside ref={ref} className={`sa-prail${className ? ` ${className}` : ""}`} aria-label={label} {...dataAttrs}>
      <div className={`sa-prail-tray${trayClassName ? ` ${trayClassName}` : ""}`} {...trayDataAttrs}>{tray}</div>
      <div className="sa-prail-body">{children}</div>
      {foot != null && <div className="sa-prail-foot">{foot}</div>}
    </aside>
  );
};
