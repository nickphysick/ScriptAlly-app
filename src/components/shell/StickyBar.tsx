/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StickyBar + useStuckPast — the slim bar that takes over once a page's banner has scrolled off
 * (Contact list v13, ruling Q1; the v126 sticky bar's construction, lifted).
 *
 * ⚠️ THE STATE IS DERIVED FROM THE BOXES ON EVERY SCROLL, NEVER AN IntersectionObserver (the house
 * law: an observer only fires on a CHANGE, so a missed event is permanent). It reads the page's
 * scroller (`.wpg-scroll`, the workspace grid's), rAF-throttled, capture-phase.
 * ⚠️ THE BAR TAKES NO FLOW SPACE: a zero-height sticky row whose inner panel slides down from above, so
 * showing it never moves the list. While hidden it is inert and out of the accessibility tree.
 */
import React, { useEffect, useState } from "react";
import "./stickyBar.css";

/**
 * True once `banner`'s bottom has passed the scroller's top (+20) and `section`'s bottom is still below
 * it (+80) — the bar shows over the section and leaves when the section has gone.
 */
export function useStuckPast(
  banner: React.RefObject<HTMLElement | null>, section: React.RefObject<HTMLElement | null>,
  /* ⚠️ re-bind when the banner arrives: a page that renders it only once its data has landed would
     otherwise bind once, at mount, to nothing — and never again (found on the first measured run) */
  ready = true,
): boolean {
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const b = banner.current;
    const sc = b?.closest<HTMLElement>(".wpg-scroll");
    if (!ready || !b || !sc) { setStuck(false); return; }
    let raf = 0;
    const read = () => {
      raf = 0;
      const top = sc.getBoundingClientRect().top;
      const bb = banner.current?.getBoundingClientRect();
      const sb = section.current?.getBoundingClientRect();
      const next = !!bb && bb.height > 0 && bb.bottom < top + 20 && (!sb || sb.bottom > top + 80);
      setStuck((cur) => (cur === next ? cur : next));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    sc.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    read();
    return () => { sc.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [banner, section, ready]);
  return stuck;
}

export const StickyBar: React.FC<{ stuck: boolean; tray?: string; probe?: string; children: React.ReactNode }> = ({ stuck, tray, probe, children }) => (
  <div className={`sbar${stuck ? " on" : ""}`} data-sbar={probe ?? "bar"} data-stuck={stuck || undefined}>
    <div className="sbar-in" style={tray ? ({ "--sbar-tray": tray } as React.CSSProperties) : undefined}
      aria-hidden={!stuck || undefined} inert={!stuck}>
      <div className="sbar-row">{children}</div>
    </div>
  </div>
);
