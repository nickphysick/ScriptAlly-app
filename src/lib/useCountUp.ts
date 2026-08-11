/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useCountUp — a figure that counts to its value once, on first paint.
 *
 * ⚠️ ONE IMPLEMENTATION (audit P6). It began inside `OneScreenChart` for the headline; the header
 * counters needed the same behaviour, and a second copy is how two figures on one screen end up
 * animating at different speeds for no stated reason.
 *
 * ⚠️ ONCE, THEN NEVER AGAIN. Later data changes land INSTANTLY — a number that re-animates every
 * time Firestore pushes an update is a number that draws the eye to nothing. The `ran` ref is
 * what makes it once-per-mount rather than once-per-value.
 *
 * ⚠️ REDUCED MOTION SHOWS THE VALUE, not a faster count. The point of the setting is no motion.
 */
import { useEffect, useRef, useState } from "react";

export const useCountUp = (to: number, ms = 700): number => {
  const [shown, setShown] = useState(to);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) { setShown(to); return; }
    ran.current = true;
    if (typeof window === "undefined"
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches
      || to === 0) { setShown(to); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setShown(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return shown;
};
