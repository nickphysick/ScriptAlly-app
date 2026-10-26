/**
 * Vision — "Our vision is simple.": a white band between the feature rows and the founding-writers
 * band (ref design-refs/landing-v6.html). A heading, three illustrated points, and one way out to
 * /about. Pure presentation over `VISION_POINTS` in landingCopy.ts.
 *
 * ⚠️ IT IS THE THIRD BAND INSIDE `.mk-lower` THAT PAINTS ITS OWN GROUND, and that is a decision
 * rather than a drift. The two-surface rule exists because a retired parchment band repainted by
 * accident over its whole height and flattened the cards on it; a BOUNDED band whose edges are
 * declared is a section, an unbounded repaint is a seam. This one states both edges with hairlines
 * and is white — the one value on the page that reads as a page turn rather than as another tint.
 * `marketingTokens.test.ts` asserts the SET of three, so a fourth has to be argued for.
 *
 * ⚠️ THE THREE PICTURES SHARE A BASELINE BECAUSE THEY SHARE A HEIGHT, NOT BECAUSE THEY WERE LINED
 * UP. Each PNG is trimmed to its own alpha bounding box and exported at the same 440px height, so
 * inside a fixed-height `figure` that ends at `flex-end` all three stand on the same line whatever
 * their widths. Replace one with a differently-proportioned export and the row still holds; replace
 * one with a padded export and it floats, silently.
 *
 * ⚠️ "Read our story" IS A BUTTON, NOT AN ANCHOR. Marketing routes are driven by `onNavigate`; an
 * `<a href>` would reload the app to reach a page it can already render. The ref draws an anchor
 * because it is a standalone document with nowhere to navigate to.
 */

import React, { useCallback, useRef, useState } from "react";
import {
  VISION_HEADING, VISION_POINTS, VISION_LINK, VISION_NAVY, VISION_NAVY_LABEL, VISION_NAVY_ARIA, VISION_NAVY_LINK,
} from "./landingCopy";
import { usePhone } from "./usePhone";

/* Each plate's own facts, keyed by file. The SIZE is the file's pixel size, so a point reserves its
   box before the picture arrives rather than jumping when it does; CSS sizes it to the figure.
   ⚠️ THE VERSION IS THE FIRST EIGHT HEX DIGITS OF THE FILE'S OWN MD5, AND IT RIDES THE URL. Nothing
   under public/ is fingerprinted by the build and prod hosting lets a browser keep a file for an
   hour, so a picture replaced under the same filename would otherwise be served stale — which is
   exactly what happens the day the commissioned artwork lands. Replace a file, change its version;
   a smoke test reads every PNG's header against the size and its hash against the version. */
const PLATES: Record<string, { width: number; height: number; version: string }> = {
  "/images/get-good-stories-told.png": { width: 482, height: 440, version: "8baf6c8a" },
  "/images/make-querying-simple.png": { width: 456, height: 440, version: "be581a5e" },
  "/images/let-writers-write.png": { width: 347, height: 440, version: "d481eb31" },
};

/**
 * On phones (≤760px; landing on phones v2, 26 Oct; ref design-refs/landing-mobile-v2.html
 * `.vwrap.navy`, `.vn`, `.dots`): the page's one swipe carousel, on navy. The label in pink mono,
 * then the three points — each the picture on a cream tile, the heading in white Special Elite and the
 * body in white at 78% — with the next card peeking, snapping to centre, three dots beneath (the
 * active one pink), and "Read our story →" to /about. Text on navy is always white; labels are pink.
 *
 * ⚠️ THE CARD IN VIEW IS DERIVED FROM THE SCROLL POSITION (whichever card's centre is nearest the
 * strip's), never kept as a counter. ← / → move one card; under reduced motion the move jumps.
 */
const reduce = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const VisionNavy: React.FC<{ onNavigate: (tab: string, subPageName?: string) => void }> = ({ onNavigate }) => {
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
    if (e.key === "ArrowRight") { e.preventDefault(); go(Math.min(VISION_POINTS.length - 1, at + 1)); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(Math.max(0, at - 1)); }
  };
  return (
    <section className="mk-vision mk-vision--navy" aria-labelledby="mk-vision-h">
      <h2 id="mk-vision-h" className="mk-vk">{VISION_NAVY_LABEL}</h2>
      <div className="mk-vrail" ref={rail} onScroll={onScroll} onKeyDown={onKey}
           tabIndex={0} role="region" aria-label={VISION_NAVY_ARIA}>
        {VISION_POINTS.map((point) => {
          const plate = PLATES[point.image];
          return (
            <div className="mk-vn" key={point.key}>
              <img src={point.image + "?v=" + plate.version} alt="" width={plate.width} height={plate.height} loading="lazy" />
              <h3 className="mk-vnh3">{point.heading}</h3>
              <p>{VISION_NAVY[point.key]}</p>
            </div>
          );
        })}
      </div>
      <div className="mk-vdots" aria-hidden="true">
        {VISION_POINTS.map((p, i) => <i key={p.key} className={i === at ? "mk-on" : undefined} />)}
      </div>
      <a className="mk-vlink" href="/about" onClick={(e) => { e.preventDefault(); onNavigate("about"); }}>{VISION_NAVY_LINK}</a>
    </section>
  );
};

export const Vision: React.FC<{ onNavigate: (tab: string, subPageName?: string) => void }> = ({ onNavigate }) => {
  const phone = usePhone();
  return phone ? <VisionNavy onNavigate={onNavigate} /> : (
  <section className="mk-vision" aria-labelledby="mk-vision-h">
    <div className="mk-visionin">
      <h2 id="mk-vision-h" className="mk-visionh2">{VISION_HEADING}</h2>
      <div className="mk-visionpoints">
        {VISION_POINTS.map((point) => {
          const plate = PLATES[point.image];
          return (
            <div className="mk-vpoint" key={point.key}>
              {/* Decorative: the heading beside it says what the point is, and an alt text here
                  would state it twice to a screen reader. */}
              <figure className="mk-vfig">
                <img
                  src={point.image + "?v=" + plate.version}
                  alt=""
                  width={plate.width}
                  height={plate.height}
                  loading="lazy"
                />
              </figure>
              <h3 className="mk-vh3">{point.heading}</h3>
              <p className="mk-vbody">{point.body}</p>
            </div>
          );
        })}
      </div>
      <button type="button" className="mk-visionmore" onClick={() => onNavigate("about")}>
        {VISION_LINK}
      </button>
    </div>
  </section>
  );
};
