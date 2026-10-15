/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CONTACT LIST'S TOUCHES (v14 §7): the live count, the A–Z rail, and the bar's density toggle and key sheet.
 * The other touches live where they act — the reflow and the dead end on the page (AgentList), the search mark and
 * the keyboard focus ring on the rows (ContactRows), the lifting labels on the shared table (shell/listTable).
 *
 * ⚠️ EVERY MOTION HERE IS OFF UNDER REDUCED MOTION, read at the moment it would run, never cached.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * §7.1 — THE LIVE COUNT: "Showing n of N" counts to its new value over about 380ms whenever it changes (an ease-out
 * cubic, the mock's own), instant under reduced motion and on first paint. While it counts it takes the slate ink.
 */
export const CountTo: React.FC<{ value: number }> = ({ value }) => {
  const [shown, setShown] = useState(value);
  const [ticking, setTicking] = useState(false);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (start === value) return undefined;
    if (reducedMotion()) { setShown(value); return undefined; }
    let raf = 0;
    const t0 = performance.now();
    setTicking(true);
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 380);
      setShown(Math.round(start + (value - start) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
      else window.setTimeout(() => setTicking(false), 300);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={ticking ? "cl14-ticking" : undefined} data-cl14-count={value}>{shown}</span>;
};

/* ⚠️ RETIRED (Contact list v16 baked decision 6): `ContactAzRail`, the A–Z rail down the sheet's right edge. */

/* ⚠️ RETIRED (Contact list v18 §B): the density pill and the key sheet (`ContactBarExtras`). The list header's density
   buttons replace the first; the key sheet has no place in the slate header. */
/** §7.2 — THE GENTLE REFLOW: the first 14 rows fade and rise 8px, staggered 22ms. Never on first load; off under
 *  reduced motion. The Web Animations API, so no keyframe has to read a custom property. */
export function useReflow(container: React.RefObject<HTMLElement | null>, key: string): void {
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reducedMotion()) return;
    const rows = container.current ? [...container.current.querySelectorAll<HTMLElement>('[data-clv="row"]')].slice(0, 14) : [];
    rows.forEach((r, i) => {
      if (typeof r.animate !== "function") return;
      r.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }],
        { duration: 420, delay: i * 22, easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" });
    });
  }, [key]);
}
