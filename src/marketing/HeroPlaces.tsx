/**
 * HeroPlaces — the places counter under the desktop hero's actions (landing hero v4.1, ref
 * design-refs/landing-hero-v4-1.html `.places`): a 4px track with a rust fill for the share of
 * founding places taken, and "N PLACES LEFT" beneath it.
 *
 * ⚠️ ONE SOURCE. It reads the same `foundingStore` reading as the nav's pill and the Pricing page's
 * panel, so the three can never state different numbers. The ref's 47 is a placeholder.
 *
 * ⚠️ LIVE OR ABSENT, like every founding counter: with no count from the endpoint nothing is SHOWN —
 * never a zero, never an empty bar (its box is held, invisible, so the copy does not move).
 *
 * On load the number counts DOWN from the cap to the places left and the fill grows to match: 1100ms,
 * ease-out, from 700ms after mount (or from when the count arrives, if that is later) — the ref's
 * count-down script. Under reduced motion the final figures, at once. The number a reader hears is
 * the final one; the count-down is for the eye.
 */
import React, { useEffect, useRef, useState } from "react";
import { useFounding, ensureCount } from "./foundingStore";
import { HERO_PLACES_REST, heroPlacesLabel } from "./landingCopy";

const DELAY = 700, DUR = 1100;

const reduce = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const HeroPlaces: React.FC = () => {
  const { count } = useFounding();
  useEffect(ensureCount, []);
  const born = useRef(typeof performance !== "undefined" ? performance.now() : 0);
  const [e, setE] = useState(() => (reduce() ? 1 : 0));
  const live = !!count;

  useEffect(() => {
    if (!live || reduce()) { if (live) setE(1); return; }
    let raf = 0;
    const t0 = Math.max(born.current + DELAY, performance.now());
    const tick = (now: number) => {
      const p = Math.max(0, Math.min(1, (now - t0) / DUR));
      setE(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [live]);

  /* ⚠️ THE BOX IS RESERVED BEFORE THE COUNT ARRIVES. `size()` centres the copy block in the card from
     its measured height, and the count comes from the endpoint after first paint; a counter that
     mounted late would move the copy. So the same markup holds its place, invisible and silent —
     no number and no bar are shown (live or absent still holds for the reader). */
  if (!count) return (
    <div className="mk-places mk-places--wait" aria-hidden="true">
      <div className="mk-places-bar" /><span><b>00</b>{HERO_PLACES_REST}</span>
    </div>
  );
  const { cap, claimed } = count;
  const left = Math.max(0, cap - claimed);
  const pct = Math.min(100, (Math.min(claimed, cap) / cap) * 100);
  return (
    <div className="mk-places" role="img" aria-label={heroPlacesLabel(left, cap)} data-left={left} data-cap={cap}>
      <div className="mk-places-bar" aria-hidden="true"><i style={{ width: pct * e + "%" }} /></div>
      <span aria-hidden="true"><b>{Math.round(cap + (left - cap) * e)}</b>{HERO_PLACES_REST}</span>
    </div>
  );
};
