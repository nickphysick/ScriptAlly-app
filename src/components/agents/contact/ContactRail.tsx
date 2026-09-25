/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ContactRail — the Housekeeping column's card (v11 §9). Phase 1 ships the SHELL: the sticky
 * geometry, the tray head's chrome (title + the peek art) and the scrolling body. The counts
 * line, the grouping toggle and the gap sections arrive with the Housekeeping phase — nothing
 * here states a number it cannot yet derive, and no control renders before it does something.
 *
 * ⚠️ THE HEIGHT IS DERIVED FROM THE RAIL'S OWN MEASURED TOP, never `100vh` minus a constant —
 * the house viewport law. `railHeight` (lib/contactList.ts) owns the clamp; a sentinel reading
 * (pre-layout, or hidden under a cover) is refused and the previous height stands.
 *
 * ⚠️ THE PEEK ART IS A SLOT. `/images/qc/be-hawk-head.png` is the Birds-eye hawk head standing
 * in until Housekeeping's own illustration is drawn (the brief ships the same file under a
 * housekeeping name; the app already serves this copy, so referencing it adds no duplicate).
 * The replacement lands at the same size and position.
 */
import React, { useLayoutEffect, useRef } from "react";
import { RAIL_TOP_GAP, railHeight } from "../../../lib/contactList";

export const ContactRail: React.FC<{
  children?: React.ReactNode;
  /** the counts line (§9.2, at 20,74) — the gap count renders bold, so it arrives split */
  counts?: { gaps: string; rest: string };
}> = ({ children, counts }) => {
  const ref = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const put = () => {
      raf = 0;
      const top = Math.max(RAIL_TOP_GAP, el.getBoundingClientRect().top);
      const h = railHeight(top, window.innerHeight);
      if (h != null) el.style.height = `${h}px`;
    };
    const ask = () => {
      if (!raf) raf = requestAnimationFrame(put);
    };
    put();
    /* the page scrolls in the workspace grid's own scroller, not the window — listen there;
       resize still arrives on the window, and a ResizeObserver catches the column reflowing */
    const scroller = el.closest(".wpg-scroll");
    scroller?.addEventListener("scroll", ask, { passive: true });
    window.addEventListener("resize", ask);
    const ro = new ResizeObserver(ask);
    ro.observe(document.documentElement);
    return () => {
      scroller?.removeEventListener("scroll", ask);
      window.removeEventListener("resize", ask);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <aside className="clv-rail" aria-label="Housekeeping" data-clv="rail" ref={ref}>
      <div className="clv-hkrail">
        <div className="clv-tray" data-clv="tray">
          <img className="clv-peek" src="/images/qc/be-hawk-head.png" alt="" aria-hidden="true" />
          <h2 className="clv-tray-t">Housekeeping</h2>
          {counts && (
            <p className="clv-tray-c" data-clv="hk-counts">
              <b>{counts.gaps}</b>{counts.rest}
            </p>
          )}
        </div>
        <div className="clv-railbody" data-clv="railbody">{children}</div>
      </div>
    </aside>
  );
};
