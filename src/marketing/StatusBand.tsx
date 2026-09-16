/**
 * StatusBand — the section break between the hero and the feature rows: an eyebrow, a heading, and
 * a carousel walking the six states a query passes through.
 *
 * ⚠️ IT REPLACED A STATIC ROW OF SIX GLYPHS, which in turn replaced an ECG trace. The glyphs said
 * "there is a pipeline" and stopped there; the carousel says what each state MEANS, which is the
 * thing a reader who has never queried does not know. The row survives as the carousel's own
 * navigation rather than as decoration.
 *
 * ⚠️ IT KEEPS `id="pulse"`, AND THAT IS LOAD-BEARING. The hero's "See how it works" is an in-page
 * jump to `#pulse`; the id has moved section twice now and losing it silently breaks that link.
 * The `scroll-margin-top` in the CSS is what keeps this heading clear of the sticky nav.
 *
 * ⚠️ THE GLYPHS ARE THIS PAGE'S OWN, NOT `StatusDot`'s. The app's dot draws a tinted disc with a
 * ring and a plane/chevron/star inside it — a different vocabulary from this outline → half-disc →
 * full-disc progression. Nothing was reused because there was nothing to reuse, and `StatusDot` is
 * deliberately untouched.
 *
 * ⚠️ THE ADVANCE STOPS WHEN THE SECTION IS OUT OF VIEW. A timer that runs down the whole page means
 * a reader who scrolls back finds the carousel somewhere they never left it, and it burns a render
 * every 4.5 seconds for a section nobody is looking at.
 */

import React, { useEffect, useRef, useState } from "react";
import { BAND_EYEBROW, BAND_HEADING, STATUS_STEPS } from "./landingCopy";

/** How long each state holds before the carousel moves on. */
const DWELL_MS = 4500;

/**
 * The six marks, in pipeline order. `currentColor` throughout rather than the literal ink, so the
 * colour is set once on the row in CSS — and so the active mark can take a different one without
 * eleven hexes having to follow it.
 */
const GLYPHS: React.ReactNode[] = [
  <circle cx={12} cy={12} r={10} key="g" />,
  <>
    <circle cx={12} cy={12} r={10} strokeDasharray="6 4" />
    <path d="M12 12L12 5.5A6.5 6.5 0 0 1 12 18.5Z" fill="currentColor" stroke="none" />
  </>,
  <>
    <circle cx={12} cy={12} r={10} />
    <path d="M12 12L12 5.5A6.5 6.5 0 0 1 12 18.5Z" fill="currentColor" stroke="none" />
  </>,
  <>
    <circle cx={12} cy={12} r={10} strokeDasharray="6 4" />
    <circle cx={12} cy={12} r={6.5} fill="currentColor" stroke="none" />
  </>,
  <>
    <circle cx={12} cy={12} r={10} />
    <circle cx={12} cy={12} r={6.5} fill="currentColor" stroke="none" />
  </>,
  <>
    <path d="M5.5 2.5h9l4.5 4.5v14.5h-13.5z" strokeLinejoin="round" />
    <path d="M14 2.5V7.5h5" strokeLinejoin="round" />
    <path d="M8.5 12h7M8.5 15.5h7" strokeLinecap="round" />
    <path d="M8.5 18.8c1.5-1.6 2.6 1.4 4-.2 1-1.1 2 .6 3 .2" strokeWidth={1.7} strokeLinecap="round" />
  </>,
];

export const StatusBand: React.FC = () => {
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  /**
   * Bumped on every click so the dwell timer restarts even when the reader taps the state that is
   * already showing. Without it, clicking the active glyph changes nothing and the carousel moves
   * on a moment later as though the click had been ignored.
   */
  const [restart, setRestart] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  /**
   * ⚠️ REDUCED MOTION STOPS THE ADVANCE, IT DOES NOT ONLY SHORTEN THE FADE. An auto-rotating
   * carousel IS motion for the readers who ask for less of it — the CSS can kill the transitions
   * and still leave the page changing under them every four and a half seconds. It stays fully
   * clickable, so nothing becomes unreachable; it simply waits to be asked.
   * Read once, at mount: a reader who changes the OS setting mid-page is not a case worth a
   * listener, and `matchMedia` is absent in the node test environment.
   */
  const [reduced] = useState(
    () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const el = rootRef.current;
    /* No observer means no way to know — so run, rather than sit silently paused forever. */
    if (!el || typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const io = new IntersectionObserver(
      (entries) => setInView(entries.some((e) => e.isIntersecting)),
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || reduced) return;
    const id = window.setTimeout(
      () => setActive((i) => (i + 1) % STATUS_STEPS.length),
      DWELL_MS,
    );
    return () => window.clearTimeout(id);
    /* `active` is a dependency on purpose: every change restarts the dwell, so a click gets a full
       turn rather than whatever was left of the previous one. */
  }, [inView, active, restart, reduced]);

  const step = STATUS_STEPS[active];

  return (
    <section className="mk-statband" id="pulse">
      <p className="mk-stateyebrow">{BAND_EYEBROW}</p>
      <h2 className="mk-stattitle">{BAND_HEADING}</h2>

      <div className="mk-carousel" ref={rootRef}>
        {/* ⚠️ REAL BUTTONS, NOT DECORATED DIVS. Each one jumps to its state, so each one is a
            control — reachable by keyboard, announced by name, and telling a screen reader which
            of the six is showing via `aria-current`. The glyph itself stays `aria-hidden`: it
            illustrates a word the button already carries. */}
        <div className="mk-carglyphs" role="tablist" aria-label="Query states">
          {STATUS_STEPS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-current={i === active ? "true" : undefined}
              className={"mk-carglyph" + (i === active ? " mk-carglyph--on" : "")}
              onClick={() => { setActive(i); setRestart((n) => n + 1); }}
            >
              <span className="mk-sr">{s.title}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                {GLYPHS[i]}
              </svg>
            </button>
          ))}
        </div>

        {/* ⚠️ KEYED ON THE ACTIVE STEP SO THE FADE ACTUALLY RUNS. Without the key React updates the
            text in place, the CSS animation never restarts, and the copy swaps hard while
            everything around it eases. The live region is polite rather than assertive: this is
            ambient content, and it must not interrupt whatever a reader is doing. */}
        <div className="mk-carcopy" role="status" aria-live="polite">
          <div key={step.key} className="mk-carcopyin">
            <p className="mk-cartitle">{step.title}</p>
            <p className="mk-carbody">{step.body}</p>
          </div>
        </div>

        {/* Decorative in full: the dashes restate the position the tablist above already carries. */}
        <div className="mk-cardashes" aria-hidden="true">
          {STATUS_STEPS.map((s, i) => (
            <span key={s.key} className={"mk-cardash" + (i === active ? " mk-cardash--on" : "")} />
          ))}
        </div>
      </div>
    </section>
  );
};
