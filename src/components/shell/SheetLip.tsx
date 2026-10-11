/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SheetLip — a 12px sticky lip at the top of the page sheet's scroller (Query Centre v137 §E), on every page.
 *
 * It is the first child of the scroller, in the folder tab's own colour, so content scrolling up passes under a
 * clean edge instead of meeting the bar. Once the scroller has moved it draws a hairline and a soft shadow.
 *
 * ⚠️ IT TAKES NO SPACE: 12px tall with a -12px bottom margin, laid over the top air every page already has
 *    (no scroller here has top padding of its own — measured). Nothing moves at scroll 0.
 * ⚠️ SCROLLED IS DERIVED FROM `scrollTop` ON EVERY SCROLL, never an observer.
 */
import React, { useEffect, useRef } from "react";
import "./sheetLip.css";

export const SheetLip: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const sc = el?.parentElement;
    if (!el || !sc) return undefined;
    const read = () => { if (sc.scrollTop > 2) el.setAttribute("data-scrolled", "true"); else el.removeAttribute("data-scrolled"); };
    read();
    sc.addEventListener("scroll", read, { passive: true });
    return () => sc.removeEventListener("scroll", read);
  }, []);
  return <div ref={ref} className="sheet-lip" data-sheet-lip="" aria-hidden="true" />;
};
