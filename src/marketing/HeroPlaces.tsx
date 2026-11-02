/**
 * HeroPlaces — the founding places counter under each sign-up on the waiting-list page (waitlist v1,
 * 31 Oct; refs design-refs/landing-mobile-v7.html `.places` and landing-desktop-v5.html `.qh-places`):
 * a short track with a rust fill for the share of founding places taken, and "N of M founding places
 * left" beside it. The desktop hero's stacked shape ("bar over N PLACES LEFT", landing hero v4.1) is
 * RETIRED with that hero; `variant` survives as the one value the callers name.
 *
 * ⚠️ ONE SOURCE. It reads the same `foundingStore` reading as every other founding counter, so they can
 * never state different numbers.
 *
 * ⚠️ LIVE OR ABSENT, like every founding counter: with no count from the endpoint nothing is SHOWN —
 * never a zero, never an empty bar (its box is held, invisible, so the form above does not move).
 *
 * The number counts DOWN from the cap to the places left and the fill grows to match: 1100ms, ease-out,
 * from 700ms after mount (or from when the count arrives, if that is later). Under reduced motion the
 * final figures, at once. The number a reader hears is the final one; the count-down is for the eye.
 */
import React, { useEffect, useRef, useState } from "react";
import { useFounding, ensureCount } from "./foundingStore";
import { heroPlacesLabel, placesLeftLabel, placesLeftRest } from "./landingCopy";

const DELAY = 700, DUR = 1100;

const reduce = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* `hero` (waitlist clarity v1, 2 Nov): the bar under each hero's "Join the waitlist" button, full width
   with the words on the right, "N of 50 places left" with N bold. Same count, same hold, same count-down. */
export const HeroPlaces: React.FC<{ variant: "line" | "hero" }> = ({ variant }) => {
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

  /* ⚠️ THE BOX IS RESERVED BEFORE THE COUNT ARRIVES: the count comes from the endpoint after first
     paint, and a counter that mounted late would move what is below it. Held, invisible and silent. */
  const hero = variant === "hero";
  const cls = "mk-places mk-places--" + variant;
  if (!count) return hero ? (
    <div className={cls + " mk-places--wait"} aria-hidden="true">
      <span className="mk-places-bar" /><span>{placesLeftRest(0).replace(/\d+/g, "··")}</span>
    </div>
  ) : (
    <div className="mk-places mk-places--line mk-places--wait" aria-hidden="true">
      {/* No digits, not even invisible ones: the live-or-absent law is about the markup, not the paint. */}
      <span className="mk-places-bar" /><span>{heroPlacesLabel(0, 0).replace(/\d+/g, "··")}</span>
    </div>
  );
  const { cap, claimed } = count;
  const left = Math.max(0, cap - claimed);
  const pct = Math.min(100, (Math.min(claimed, cap) / cap) * 100);
  if (hero) return (
    <div className={cls} role="img" aria-label={placesLeftLabel(left, cap)} data-left={left} data-cap={cap}>
      <span className="mk-places-bar" aria-hidden="true"><i style={{ width: pct * e + "%" }} /></span>
      <span aria-hidden="true"><b>{Math.round(cap + (left - cap) * e)}</b>{placesLeftRest(cap)}</span>
    </div>
  );
  return (
    <div className="mk-places mk-places--line" role="img" aria-label={heroPlacesLabel(left, cap)} data-left={left} data-cap={cap}>
      <span className="mk-places-bar" aria-hidden="true"><i style={{ width: pct * e + "%" }} /></span>
      <span aria-hidden="true">{heroPlacesLabel(Math.round(cap + (left - cap) * e), cap)}</span>
    </div>
  );
};
