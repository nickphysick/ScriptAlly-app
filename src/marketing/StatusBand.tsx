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
 * ⚠️ THE GLYPHS ARE THE MARKETING TIER'S OWN, NOT `StatusDot`'s, and they live in `marketingMarks`
 * since the footer drew them too (17 Sep). The app's dot is a tinted disc with a plane, chevron or
 * star inside — a different vocabulary from this outline → half-disc → full-disc progression.
 *
 * ⚠️ THE ADVANCE STOPS WHEN THE SECTION IS OUT OF VIEW. A timer that runs down the whole page means
 * a reader who scrolls back finds the carousel somewhere they never left it, and it burns a render
 * every 4.5 seconds for a section nobody is looking at.
 */

import React, { useEffect, useRef, useState } from "react";
import { BAND_EYEBROW, BAND_HEADING, STATUS_STEPS } from "./landingCopy";
import { StatusGlyph } from "./marketingMarks";

/** How long each state holds before the carousel moves on. */
const DWELL_MS = 4500;

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
              <StatusGlyph index={i} />
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
