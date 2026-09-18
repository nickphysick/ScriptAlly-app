/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenTour — the spotlight tour (spec §12; ref design-refs/dashboard-spotlight-tour.html).
 *
 * ⚠️ THE SPOTLIGHT IS A HOLE, NOT AN OVERLAY: a positioned div whose 9999px box-shadow is the
 * scrim, so the spotlit card stays live in the page and the shadow eases between targets. The
 * card lands beside the hole — right of main-column targets, left of rail targets — clamped to
 * the viewport; the final step shrinks the hole away and centres the card.
 *
 * ⚠️ SKIPPING COUNTS AS COMPLETING for auto-run purposes (§12): both roads write
 * `tourCompletedAt`, so the tour never auto-runs twice; `tourDismissed` records which road it
 * was. The 7-day chip is DERIVED from the auth account's creation time, never stored.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./oneScreenTour.css";

export interface TourStep {
  /** Selector inside the dashboard root; null centres the closing card. */
  sel: string | null;
  title: string;
  body: string;
}

/**
 * The six steps, retargeted for v16 (18 Sep). Every `sel` is a card the page renders today — the
 * breakdown, the manuscript tile, the goals card and the activity rail the older steps pointed at are
 * all retired, and a tour that highlights nothing teaches a reader that the app is broken.
 *
 * ⚠️ `.os-goal` WAS ALREADY TARGETLESS BEFORE THIS PASS — the goals card left the page with the rail's
 * rebuild and its step went on pointing at it. That is the failure this list is now checked against.
 */
export const TOUR_STEPS: TourStep[] = [
  { sel: ".os-qa", title: "Three things you do most", body: "Log a query, record a response, add an agent. Each one opens the same form you would reach from the sidebar." },
  { sel: ".os-lead", title: "Your queries, charted", body: "Active queries over the last eight weeks. The dots mark each request that came in and each query that was passed on; the ticks beneath show the weeks a request landed." },
  { sel: ".os-cl", title: "Where each one stopped", body: "Every closed query, by how far it got. No reply is its own slice — silence is not the same as a pass." },
  { sel: ".os-feed", title: "The record", body: "Everything that has happened, in order. Anything logged since you last looked carries a rust rule in the margin." },
  { sel: ".os-todo", title: "What needs you", body: "Anything waiting on you, with how long it has been waiting. Open a row to act on it here." },
  { sel: null, title: "That's your desk", body: "You can take this tour again from the button beside the greeting, any time in your first week." },
];

export const TOUR_BREAKPOINT = 1024;
const CARD_W = 270;

export const OneScreenTour: React.FC<{
  /** The dashboard root — targets are resolved inside it, never document-wide. */
  rootRef: React.RefObject<HTMLElement | null>;
  /** Finish or skip — the caller stamps tourCompletedAt (+ tourDismissed on skip). */
  onEnd: (skipped: boolean) => void;
}> = ({ rootRef, onEnd }) => {
  const [step, setStep] = useState(0);
  const [, bump] = useState(0); // repositions on resize
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const holeStyle = useRef<React.CSSProperties>({});
  const cardStyle = useRef<React.CSSProperties>({});

  const s = TOUR_STEPS[step];
  const last = step === TOUR_STEPS.length - 1;

  /* Measure the target and place hole + card. Runs on step change and on resize (§12). */
  useLayoutEffect(() => {
    const target = s.sel ? rootRef.current?.querySelector(s.sel) : null;
    if (target) {
      const r = target.getBoundingClientRect();
      holeStyle.current = { left: r.left - 6, top: r.top - 6, width: r.width + 12, height: r.height + 12 };
      const ch = cardRef.current?.offsetHeight || 190;
      const railSide = r.left > window.innerWidth * 0.55;
      let cx = railSide ? r.left - CARD_W - 18 : r.right + 18;
      if (cx < 10) cx = 10;
      if (cx + CARD_W > window.innerWidth - 10) cx = r.left + 16;
      const cy = Math.max(14, Math.min(r.top + 8, window.innerHeight - ch - 14));
      cardStyle.current = { left: cx, top: cy };
    } else {
      /* the closing step: the hole shrinks away, the card centres */
      holeStyle.current = { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
      const ch = cardRef.current?.offsetHeight || 190;
      cardStyle.current = { left: window.innerWidth / 2 - CARD_W / 2, top: window.innerHeight / 2 - ch / 2 };
    }
    bump((n) => n + 1);
    // focus rides the walk (§12) — and returns to the launcher via onEnd's caller
    nextRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, s.sel]);

  useEffect(() => {
    const onResize = () => bump((n) => n + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const advance = useCallback(() => (last ? onEnd(false) : setStep((n) => n + 1)), [last, onEnd]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEnd(true);
      else if (e.key === "ArrowRight" && step < TOUR_STEPS.length - 1) setStep(step + 1);
      else if (e.key === "ArrowLeft" && step > 0) setStep(step - 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step, onEnd]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <div className="os-tourhole" style={holeStyle.current} aria-hidden="true" />
      <div className="os-tourcard" style={cardStyle.current} ref={cardRef} role="dialog" aria-label={`Tour step ${step + 1} of ${TOUR_STEPS.length}: ${s.title}`}>
        <div className="frame2">
          <div className="thdr">
            <span className="stp2">Step {step + 1} of {TOUR_STEPS.length}</span>
            <span className="dots2" aria-hidden="true">
              {TOUR_STEPS.map((_, i) => <i key={i} className={i <= step ? "on" : undefined} />)}
            </span>
          </div>
          <div className="tbd">
            <h3>{s.title}</h3>
            <p>{s.body}</p>
            <div className="tft">
              <button type="button" className="skip" onClick={() => onEnd(true)}>Skip the tour</button>
              {step > 0 && <button type="button" className="tbtn back" onClick={() => setStep(step - 1)}>Back</button>}
              <button type="button" className="tbtn next" ref={nextRef} onClick={advance}>{last ? "Finish" : "Next"}</button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
};
