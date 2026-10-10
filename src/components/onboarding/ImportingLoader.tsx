/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The importing loader (onboarding v5, part 2; ref design-refs/onboarding/import-flow-v1.html and
 * onboarding-journey-v5.html #importing) — shown the instant "Import and get started" is pressed.
 *
 * It fills the set-up frame's sheet: the dashboard's own loading page behind (`DashGhost`), one
 * white card in front. Purely presentational: it commits nothing and knows no real progress. The
 * host (BranchB) runs the commit and its 5-second floor and flips `complete` when it is safe to
 * route; the cycling lines are reassurance, not stages.
 *
 * ⚠️ EVERY TIMING IS THE ONE IT ALWAYS HAD (lock R1): a new line every 950ms; on `complete`,
 * "You're all set" and "Opening your dashboard…"; the card starts to lift at +600ms; `onProceed`
 * at +1300ms. `onLift` fires with the lift, so the frame can become the app's in the same 700ms.
 *
 * ⚠️ NO SAGE. The rings, the track and the finished disc are navy; the finished mark is a cream
 * tick.
 */
import React, { useEffect, useRef, useState } from "react";
import "./importFlow.css";
import { DashGhost } from "./DashGhost";

// Reassurance only — NOT wired to real commit stages, no fake percentage.
export const IMPORTING_MESSAGES = [
  "Filing your agents…",
  "Lining up your queries…",
  "Building your pipeline…",
  "Sorting your submissions…",
  "Tidying the desk…",
  "Almost ready…",
];
export const IMPORTING_HEAD = { working: "Setting up your dashboard", done: "You're all set" } as const;
export const IMPORTING_DONE_LINE = "Opening your dashboard…";

/** The loader's beats, named for lock R1 and for nothing else: messages turn every 950ms; on
 *  completion the card starts to lift at +600ms and the host is called at +1300ms. */
export const IMPORTING_TIMINGS = { MESSAGE_INTERVAL_MS: 950, LIFT_AT_MS: 600, PROCEED_AT_MS: 1300 } as const;

export interface ImportingLoaderProps {
  /** Flip to the completion state (rings stop, the disc turns navy, book → tick), then proceed. */
  complete: boolean;
  /** Called once, 1300ms after `complete` turns true — the host routes to the dashboard. */
  onProceed: () => void;
  /** Called once, 600ms after `complete` turns true, as the card starts to lift. */
  onLift?: () => void;
}

export const ImportingLoader: React.FC<ImportingLoaderProps> = ({ complete, onProceed, onLift }) => {
  const [msgIndex, setMsgIndex] = useState(0);
  // Once complete, a brief "all set" beat, then the card lifts away to show the dashboard's loading
  // page that has been behind it all along — the page the app opens on.
  const [revealing, setRevealing] = useState(false);

  // Cycle the lines while loading; stop the moment we're complete.
  useEffect(() => {
    if (complete) return;
    const id = setInterval(() => setMsgIndex((i) => (i + 1) % IMPORTING_MESSAGES.length), IMPORTING_TIMINGS.MESSAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [complete]);

  // On completion: hold the "all set" beat, lift the card, then route.
  const proceedRef = useRef(onProceed); proceedRef.current = onProceed;
  const liftRef = useRef(onLift); liftRef.current = onLift;
  useEffect(() => {
    if (!complete) { setRevealing(false); return; }
    const fade = setTimeout(() => { setRevealing(true); liftRef.current?.(); }, IMPORTING_TIMINGS.LIFT_AT_MS);
    const go = setTimeout(() => proceedRef.current(), IMPORTING_TIMINGS.PROCEED_AT_MS);
    return () => { clearTimeout(fade); clearTimeout(go); };
  }, [complete]);

  return (
    <div className="im-bare im-ldr" data-im="importing" data-im-state={revealing ? "lifting" : complete ? "done" : "work"}>
      {/* The dashboard building itself behind the card: the page the writer is about to land on. */}
      <DashGhost />

      <div className={`im-ldrcard${complete ? " is-done" : ""}${revealing ? " is-lifting" : ""}`} role="status" data-im="loader-card">
        <div className="im-ldremblem">
          {!complete && (<><span className="im-ldrring" /><span className="im-ldrring r2" /></>)}
          <div className="im-ldrdisc" data-im="loader-disc">
            {complete ? (
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4 10-11" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 6.5C10.5 5 8 4.5 5 5v13c3-.5 5.5 0 7 1.5" /><path d="M12 6.5C13.5 5 16 4.5 19 5v13c-3-.5-5.5 0-7 1.5" /><path d="M12 6.5v14" /></svg>
            )}
          </div>
        </div>
        <h1 className="im-ldrh">{complete ? IMPORTING_HEAD.done : IMPORTING_HEAD.working}</h1>
        <p key={complete ? "done" : msgIndex} className="im-ldrmsg" data-im="loader-msg">{complete ? IMPORTING_DONE_LINE : IMPORTING_MESSAGES[msgIndex]}</p>
        <div className="im-ldrtrack" data-im="loader-track"><span /></div>
      </div>
    </div>
  );
};
