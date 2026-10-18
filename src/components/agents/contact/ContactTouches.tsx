/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CONTACT LIST'S TOUCHES (v14 §7): the live count, the A–Z rail, and the bar's density toggle and key sheet.
 * The other touches live where they act — the dead end on the page (AgentList), the arrival on the rows, the search mark and
 * the keyboard focus ring on the rows (ContactRows), the lifting labels on the shared table (shell/listTable).
 *
 * ⚠️ EVERY MOTION HERE IS OFF UNDER REDUCED MOTION, read at the moment it would run, never cached.
 */
import React, { useEffect, useRef, useState } from "react";

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
/* ⚠️ RETIRED (Contact list v19 §H): `useReflow`, §7.2's gentle reflow (the first 14 rows rising 8px, 22ms apart, on a
   filter, group, sort or Find change). The list's one arrival in ContactRows (`arrival`) replaces it for every change,
   the load and the pin included. */
