/**
 * BandHeader — the full-width section break: a mono eyebrow, a heading, and an ECG trace running
 * behind them (design ref: design-refs/scriptally-landing-v8.html).
 *
 * ⚠️ THE HEADING PAINTS NO BACKGROUND, AND THAT IS THE POINT OF THIS FILE. It used to clear itself
 * space by painting a parchment rectangle over the trace. A rectangle is always wider and taller
 * than the letterforms it covers, so it reads as a visible block — and it only ever "worked" while
 * the band behind it happened to be the same colour. The moment the page became two surfaces it
 * became a pale slab straight across the section. The trace is MASKED instead: it dissolves as it
 * approaches the words and resumes beyond them, so nothing is painted over anything and the
 * treatment no longer depends on what colour is behind it.
 *
 * ⚠️ THE TRACE SPANS THE VIEWPORT, THE WORDS DO NOT. The section is full-bleed and the SVG is
 * absolutely positioned across it; the eyebrow and heading stay in the normal content gutters.
 *
 * ⚠️ AND THE TRACE IS HIDDEN BELOW 900px ENTIRELY. The mask is an ellipse sized in percentages of
 * the trace box, so it cannot follow a heading that wraps — and at 390 the heading is three lines.
 * There is no version of the hole that works for both; the eyebrow and the vertical space carry
 * the break on mobile. Do not try to grow the ellipse.
 */

import React, { useEffect, useRef, useState } from "react";
import { PULSE_HEADING, SECTION_EYEBROW } from "./landingCopy";

/** viewBox units. `preserveAspectRatio="none"` stretches these to the viewport's width. */
const VIEW_W = 1600;
const VIEW_H = 190;
/** The two dials. */
const CYCLE = 320;
const AMP = 62;

export function ecgPath(w: number, h: number, cycle: number, amp: number): string {
  const mid = h / 2;
  let d = "";
  for (let x = 0; x < w + cycle; x += cycle) {
    d += (x === 0 ? `M${x} ${mid}` : `L${x} ${mid}`);
    d += `L${x + cycle * 0.30} ${mid}`;
    d += `Q${x + cycle * 0.34} ${mid - amp * 0.22} ${x + cycle * 0.38} ${mid}`;   // P
    d += `L${x + cycle * 0.43} ${mid}`;
    d += `L${x + cycle * 0.455} ${mid + amp * 0.28}`;                             // Q
    d += `L${x + cycle * 0.50} ${mid - amp}`;                                     // R
    d += `L${x + cycle * 0.545} ${mid + amp * 0.52}`;                             // S
    d += `L${x + cycle * 0.58} ${mid}`;
    d += `Q${x + cycle * 0.66} ${mid - amp * 0.34} ${x + cycle * 0.74} ${mid}`;   // T
    d += `L${x + cycle} ${mid}`;
  }
  return d;
}

const TRACE = ecgPath(VIEW_W, VIEW_H, CYCLE, AMP);

export const BandHeader: React.FC = () => {
  /**
   * ⚠️ THE OBSERVER MOVED HERE WITH THE TRACE, deliberately. It used to sit on the features band
   * because the header lived inside it; the header is its own section now, and a gate that stayed
   * behind would be watching the wrong element. The fallback is "running", not "paused" — the CSS
   * default is paused, so a browser without the API would otherwise get a dead line with no way
   * back, which is worse than an animation nobody sees.
   */
  const sectRef = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = sectRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => setInView(e.isIntersecting)),
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className={"mk-sect" + (inView ? " mk-inview" : "")} id="pulse" ref={sectRef}>
      <div className="mk-ecg" aria-hidden="true">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none">
          <path className="mk-ecg-base" d={TRACE} />
          <path className="mk-ecg-live" d={TRACE} />
        </svg>
      </div>
      <div className="mk-sectinner">
        <p className="mk-seyebrow">{SECTION_EYEBROW}</p>
        <h2>{PULSE_HEADING}</h2>
      </div>
    </section>
  );
};
