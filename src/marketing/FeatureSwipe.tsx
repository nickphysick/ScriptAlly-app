/**
 * FeatureSwipe — the six features on phones (≤760px; landing on phones v1, 26 Oct; ref
 * design-refs/landing-mobile-v1.html `.swipe`, `.rail`, `.fc`, `.dots`). One horizontal strip of
 * 300px cards that snap to the centre, the next card peeking in, with "Six things it does" and a
 * "1 / 6" count above and dots below that follow the card in view. It replaces the six stacked rows
 * on a phone; the desktop rows (`FeatureRows`) are unchanged.
 *
 * ⚠️ THE PICTURES ARE THE ROWS' PICTURES. Each card names its row by `key`, and the file, its pixel
 * size and its version come from `FeatureRows`' own table — so a picture replaced there is replaced
 * here, and the version check in the smoke test covers both.
 *
 * ⚠️ THE CARD IN VIEW IS DERIVED FROM THE SCROLL POSITION, NOT KEPT AS A COUNTER: whichever card's
 * centre is nearest the strip's centre (the ref's own rule), read on every scroll. A swipe, a key, a
 * trackpad and a deep scroll all land on the same answer.
 *
 * Keyboard: the strip is focusable, and ← / → move one card. Under reduced motion that move jumps
 * rather than glides; the strip never declares `scroll-behavior: smooth` itself.
 */
import React, { useCallback, useRef, useState } from "react";
import { FEATURE_ROWS, FEATURE_SWIPE, FEATURE_SWIPE_LABEL, FEATURE_SWIPE_ARIA, featureSwipeCount, BAND_HEADING } from "./landingCopy";
import { ILLUSTRATIONS } from "./FeatureRows";

const reduce = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const FeatureSwipe: React.FC = () => {
  const rail = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);

  const cards = () => Array.from(rail.current?.children ?? []) as HTMLElement[];

  const onScroll = useCallback(() => {
    const r = rail.current; if (!r) return;
    const mid = r.scrollLeft + r.clientWidth / 2;
    let k = 0, best = Infinity;
    cards().forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < best) { best = d; k = i; } });
    setAt((was) => (was === k ? was : k));
  }, []);

  const go = (k: number) => {
    const r = rail.current, c = cards()[k]; if (!r || !c) return;
    r.scrollTo({ left: c.offsetLeft - (r.clientWidth - c.offsetWidth) / 2, behavior: reduce() ? "auto" : "smooth" });
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(Math.min(FEATURE_SWIPE.length - 1, at + 1)); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(Math.max(0, at - 1)); }
  };

  return (
    <section className="mk-swipeband" id="mk-features" aria-label={BAND_HEADING}>
      <div className="mk-swipehead">
        <span>{FEATURE_SWIPE_LABEL}</span>
        <span className="mk-swipecnt">{featureSwipeCount(at + 1, FEATURE_SWIPE.length)}</span>
      </div>
      <div className="mk-rail" ref={rail} onScroll={onScroll} onKeyDown={onKey}
           tabIndex={0} role="region" aria-label={FEATURE_SWIPE_ARIA}>
        {FEATURE_SWIPE.map((card) => {
          const row = FEATURE_ROWS.find((r) => r.key === card.key)!;
          const art = ILLUSTRATIONS[row.image];
          return (
            <div className="mk-fc" key={card.key}>
              <img src={row.image + "?v=" + art.version} alt={row.alt} width={art.width} height={art.height} loading="lazy" />
              <div className="mk-fcbody">
                <h3 className="mk-fch3">{card.heading}</h3>
                <p>{card.body}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mk-dots" aria-hidden="true">
        {FEATURE_SWIPE.map((card, i) => <i key={card.key} className={i === at ? "mk-on" : undefined} />)}
      </div>
    </section>
  );
};
