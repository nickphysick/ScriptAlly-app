/**
 * The phone nav's founding pill (landing hero on phones, 23 Oct; ref
 * design-refs/landing-hero-mobile-v1.html `.m-join`, option 2): "Become a founding writer" over ten
 * small segments and "{left} places left" in rust. It goes where the nav's CTA goes — `/founders`.
 *
 * ⚠️ THE FIGURES ARE THE STORE'S, NEVER THE REF'S. The ref shows 36 of 50; the cap is the server's
 * (`count.cap`) and so is the number claimed. Segments filled = round(claimed / cap × 10); left =
 * cap − claimed. With no count yet, or the store `down`, only the first line renders — no segments,
 * no number, no zero (the live-or-absent rule every founding counter keeps).
 *
 * The number counts DOWN from the cap to the places left (v2 P4, the ref's `data-from`) and the
 * segments fill, ONCE: ease-out over 1.4s, starting 0.6s after mount — or the moment the count
 * arrives, if that is later. Under reduced motion the final figures, at once.
 */
import React, { useEffect, useRef, useState } from "react";
import { useFounding, ensureCount } from "./foundingStore";
import { HERO_CTA, navPlacesLeft } from "./landingCopy";

const SEGMENTS = 10, DELAY = 600, DUR = 1400;

const reduce = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const FoundingNavPill: React.FC<{ onGo: () => void }> = ({ onGo }) => {
  useEffect(ensureCount, []);
  const { count, state } = useFounding();
  const born = useRef(typeof performance !== "undefined" ? performance.now() : 0);
  const [e, setE] = useState(() => (reduce() ? 1 : 0));
  const live = !!count && state !== "down";

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

  const cap = count?.cap ?? 0, claimed = count?.claimed ?? 0;
  const filled = live && cap > 0 ? Math.round((Math.min(claimed, cap) / cap) * SEGMENTS) : 0;
  const left = Math.max(0, cap - claimed);
  const on = Math.round(filled * e);

  return (
    <button type="button" className="mk-navpill" onClick={onGo} data-live={live ? "1" : undefined}>
      <span className="mk-navpill-t">{HERO_CTA}</span>
      {live && (
        <span className="mk-navpill-c">
          <i aria-hidden="true">
            {Array.from({ length: SEGMENTS }, (_, k) => <b key={k} className={k < on ? "mk-on" : undefined} />)}
          </i>
          {/* The number a reader hears is the final one; the count-up is for the eye. */}
          <em aria-hidden="true">{navPlacesLeft(Math.round(cap + (left - cap) * e))}</em>
          <span className="mk-sr">{navPlacesLeft(left)}</span>
        </span>
      )}
    </button>
  );
};
