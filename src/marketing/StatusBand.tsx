/**
 * StatusBand — the section break between the hero and the feature rows: one centred heading and the
 * six status marks a query passes through, and nothing else.
 *
 * ⚠️ IT REPLACED `BandHeader` WHOLESALE. That section carried a mono eyebrow, the heading "A finger
 * on the pulse of your querying journey", and an ECG trace running behind the words with its own
 * IntersectionObserver, radial mask and sweep animation. All of it is gone — the glyph row says
 * what the trace was gesturing at, in the product's own vocabulary.
 *
 * ⚠️ THE CLASS IS `mk-statband`, NOT `mk-band`, AND THAT IS NOT A STYLE CHOICE. `.mk-band` is
 * ALREADY TAKEN by About's vision bands — same 1180px cap, its own two-column grid, and a
 * `.mk-band + .mk-band` rule that draws a hairline between adjacent bands. Reusing the name would
 * have inherited a grid this section does not want and risked an extra rule across it. A prefix
 * that already exists is not a free name.
 *
 * ⚠️ IT KEEPS `id="pulse"`, AND THAT IS LOAD-BEARING RATHER THAN INHERITED. The hero's "See how it
 * works" is an in-page jump to `#pulse`; the id left with the section that used to carry it, so
 * moving it here is what stops that link going nowhere. A smoke test asserts the href, and the
 * `scroll-margin-top` in the CSS is what keeps this heading clear of the sticky nav when it lands.
 *
 * ⚠️ THE GLYPHS ARE THIS PAGE'S OWN, NOT `StatusDot`'s. The app's dot draws a tinted disc with a
 * ring and a 24×24 glyph inside it — plane, chevrons, loop, star, cross — which is a different
 * vocabulary from the outline / half-disc / full-disc progression these six draw. Nothing was
 * reused because there was nothing to reuse, and `StatusDot` is deliberately untouched.
 *
 * ⚠️ AND THEY ARE DECORATIVE. `aria-hidden` on every one: they illustrate a progression the heading
 * already states, and six unlabelled marks read out in sequence would be noise rather than content.
 */

import React, { useEffect, useRef, useState } from "react";
import { BAND_HEADING } from "./landingCopy";

/**
 * The six marks, in pipeline order: queried, partial requested, partial sent, full requested, full
 * sent, offer. `currentColor` throughout rather than the literal ink, so the one colour is set once
 * on the row in CSS — it resolves to the specified #1c130f through `--mk-nearblack`, and a hex
 * repeated eleven times is eleven places to miss when the ink moves.
 */
const GLYPHS: Array<{ key: string; paths: React.ReactNode }> = [
  {
    key: "queried",
    paths: <circle cx={12} cy={12} r={10} />,
  },
  {
    key: "partial-requested",
    paths: (
      <>
        <circle cx={12} cy={12} r={10} strokeDasharray="6 4" />
        <path d="M12 12L12 5.5A6.5 6.5 0 0 1 12 18.5Z" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    key: "partial-sent",
    paths: (
      <>
        <circle cx={12} cy={12} r={10} />
        <path d="M12 12L12 5.5A6.5 6.5 0 0 1 12 18.5Z" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    key: "full-requested",
    paths: (
      <>
        <circle cx={12} cy={12} r={10} strokeDasharray="6 4" />
        <circle cx={12} cy={12} r={6.5} fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    key: "full-sent",
    paths: (
      <>
        <circle cx={12} cy={12} r={10} />
        <circle cx={12} cy={12} r={6.5} fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    key: "offer",
    paths: (
      <>
        <path d="M5.5 2.5h9l4.5 4.5v14.5h-13.5z" strokeLinejoin="round" />
        <path d="M14 2.5V7.5h5" strokeLinejoin="round" />
        <path d="M8.5 12h7M8.5 15.5h7" strokeLinecap="round" />
        <path d="M8.5 18.8c1.5-1.6 2.6 1.4 4-.2 1-1.1 2 .6 3 .2" strokeWidth={1.7} strokeLinecap="round" />
      </>
    ),
  },
];

/**
 * The row's three postures, and the order matters more than the names.
 *
 * `rest`  — no animation machinery at all: the glyphs are simply there. This is what a browser
 *           WITHOUT `IntersectionObserver` gets, and what `renderToStaticMarkup` produces.
 * `armed` — hidden and offset, waiting to be scrolled to.
 * `in`    — running, once, and never re-armed.
 */
type GlyphPhase = "rest" | "armed" | "in";

export const StatusBand: React.FC = () => {
  const rowRef = useRef<HTMLDivElement>(null);
  /**
   * ⚠️ THE FALLBACK IS "SHOWN", NOT "HIDDEN", AND THAT IS THE WHOLE RISK OF THIS FEATURE. The CSS
   * start state is `opacity: 0` — so anything that stops the observer from ever firing leaves six
   * invisible marks under a heading that introduces them, permanently, with no way back. The ECG
   * trace this section replaced carried the same rule from the other end (its play-state default
   * was "running", not "paused") for exactly this reason.
   *
   * ⚠️ AND IT IS DECIDED DURING THE FIRST RENDER, NOT IN AN EFFECT. Arming from `useEffect` would
   * paint the glyphs, then hide them, then animate them in — a visible flash on every load. A
   * lazy `useState` initialiser runs while rendering, so the browser's first paint is already
   * armed and node's is already at rest. `typeof` is what makes the reference safe where the
   * global does not exist.
   */
  const [phase, setPhase] = useState<GlyphPhase>(
    () => (typeof IntersectionObserver === "undefined" ? "rest" : "armed"),
  );

  useEffect(() => {
    const el = rowRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        /* Once. The row does not re-animate on the way back up, because a mark that replays every
           time it is scrolled past stops reading as an arrival and starts reading as a fault. */
        setPhase("in");
        io.disconnect();
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="mk-statband" id="pulse">
      <h2 className="mk-stattitle">{BAND_HEADING}</h2>
      <div
        ref={rowRef}
        className={phase === "rest" ? "mk-statglyphs" : `mk-statglyphs mk-statglyphs--${phase}`}
      >
        {GLYPHS.map((g) => (
          <svg
            key={g.key}
            className="mk-statglyph"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            {g.paths}
          </svg>
        ))}
      </div>
    </section>
  );
};
