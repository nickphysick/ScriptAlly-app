/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The feedback dock — a one-click route from "that's broken" to a record of it (ref:
 * design-refs/scriptally-beta-pack.html, exhibit 03).
 *
 * ⚠️ A BETA WITHOUT ONE PRODUCES SILENCE, AND SILENCE READS AS "IT'S FINE" right up until people
 * stop signing in. That is the whole argument for building it before anything else on that page.
 *
 * ⚠️ IT CAPTURES CONTEXT AND SHOWS THE WRITER EXACTLY WHAT IT CAPTURED. Route, viewport, browser
 * and the account's uid — and NEVER page content, form values, or a line of anyone's manuscript.
 * The panel prints the block and states the limit in words, because a context block a writer
 * cannot inspect is one they have to take on trust.
 *
 * ⚠️ THE RECEIPT GOES THROUGH THE APP'S OWN TOAST. `useTodoToast` already owns the timing, the
 * placement and the reduced-motion behaviour of a confirmation in this app; a bespoke one here
 * would be a second toast that drifts from the first.
 *
 * ⚠️ IT NO LONGER CARRIES ITS OWN BUTTON. The floating FAB moved into the workspace top bar as a
 * labelled pill (feedback pack) — a control every page already looks at, rather than a puck that
 * hovers over the reader's work. What opens the panel is unchanged: the bar's pill and the beta
 * strip's "tell us when you find one" both toggle the same `feedbackOpen` state in `AppShell`,
 * which arrives here as `open`. This component is now the PANEL and nothing else.
 *
 * ⚠️ AND IT RENDERS NOTHING WHEN CLOSED. With the button gone the wrapper had no reason to sit on
 * every page as an empty fixed box; an element that exists only to be measured by nobody is the
 * kind of thing a later stacking-order bug gets blamed on.
 *
 * ⚠️ THE PANEL KEPT ITS POSITION, DELIBERATELY. It still opens at the foot of the window rather
 * than under its new trigger. Re-anchoring it to the bar is a design decision the pack did not
 * make, and `.sa-fbdock`'s inset is shared with the mobile step at 767px — so it is flagged in the
 * run report rather than guessed at here.
 *
 * ⚠️ RULES CHANGED, NOT DEPLOYED. `betaFeedback` is admin-read and no-client-write; the write goes
 * through a callable that has not been deployed either. Until both land, Send reports the failure
 * honestly and keeps the writer's words.
 */

import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import "./betaChrome.css";
import {
  BETA_MODE, FEEDBACK_HEADING, FEEDBACK_KINDS, FEEDBACK_KIND_LABEL,
  FEEDBACK_MESSAGE_LABEL, FEEDBACK_PLACEHOLDER, FEEDBACK_PRIVACY_NOTE, FEEDBACK_SEND,
  FEEDBACK_SENT_BODY, FEEDBACK_SENT_TITLE, FeedbackKind, feedbackContextLines,
} from "../../lib/beta";

export const FeedbackDock: React.FC<{
  /** The signed-in account, when there is one. Never a name or an address — only the uid travels. */
  uid?: string;
  /** Held open by the beta strip's "tell us when you find one". */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The app's own confirmation toast. */
  onReceipt: (message: string) => void;
}> = ({ uid, open, onOpenChange, onReceipt }) => {
  const location = useLocation();
  const [kind, setKind] = useState<FeedbackKind>(FEEDBACK_KINDS[0]);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [error, setError] = useState("");

  if (!BETA_MODE) return null;

  const context = {
    route: location.pathname,
    viewport: typeof window === "undefined" ? "" : `${window.innerWidth}×${window.innerHeight}`,
    browser: typeof navigator === "undefined" ? "" : navigator.userAgent,
    uid,
  };

  const close = () => {
    onOpenChange(false);
    // The form resets on close, but only after a successful send — a failed one keeps the words.
    if (state === "sent") { setMessage(""); setState("idle"); }
  };

  const send = async () => {
    if (!message.trim()) { setError("Tell us what happened and we'll look at it."); setState("failed"); return; }
    setState("sending");
    setError("");
    try {
      const { getFunctions, httpsCallable } = await import("firebase/functions");
      const call = httpsCallable(getFunctions(undefined, "europe-west2"), "sendBetaFeedback");
      await call({ kind, message: message.trim(), ...context });
      setState("sent");
      onReceipt(FEEDBACK_SENT_TITLE);
    } catch (e) {
      /* ⚠️ A FAILURE SAYS SO AND KEEPS THE WORDS. Reporting success on a write that did not land is
         how a beta hears nothing and believes everything is fine. */
      setState("failed");
      setError(
        (e as { message?: string })?.message ||
        "That didn't send. Nothing's lost — try again, or email us.",
      );
    }
  };

  if (!open) return null;

  return (
    <div className="sa-fbdock">
      <div className="sa-fbpanel" role="dialog" aria-label={FEEDBACK_HEADING}>
        <div className="sa-fbhead">
          <strong>{FEEDBACK_HEADING}</strong>
          <button type="button" onClick={close} aria-label="Close">×</button>
        </div>

        {state === "sent" ? (
          <div className="sa-fbsent">
            <strong>{FEEDBACK_SENT_TITLE}</strong>
            <span>{FEEDBACK_SENT_BODY}</span>
          </div>
        ) : (
          <div className="sa-fbbody">
            <div className="sa-fbfield">
              <label htmlFor="sa-fb-kind">{FEEDBACK_KIND_LABEL}</label>
              <select id="sa-fb-kind" value={kind} onChange={(e) => setKind(e.target.value as FeedbackKind)}>
                {FEEDBACK_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            <div className="sa-fbfield">
              <label htmlFor="sa-fb-msg">{FEEDBACK_MESSAGE_LABEL}</label>
              <textarea
                id="sa-fb-msg"
                placeholder={FEEDBACK_PLACEHOLDER}
                value={message}
                onChange={(e) => { setMessage(e.target.value); if (state === "failed") setState("idle"); }}
              />
            </div>

            {/* Printed in full: the writer sees precisely what travels with their report. */}
            <div className="sa-fbctx">
              {feedbackContextLines(context).map((line) => <div key={line}>{line}</div>)}
            </div>
            <p className="sa-fbnote">{FEEDBACK_PRIVACY_NOTE}</p>

            {state === "failed" && error && <p className="sa-fberr" role="alert">{error}</p>}

            <button type="button" className="sa-fbsend" onClick={send} disabled={state === "sending"}>
              {state === "sending" ? "Sending…" : FEEDBACK_SEND}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
