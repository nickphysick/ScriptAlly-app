/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v5, Phase G — THE FEEDBACK SHEET (design-refs/phone-app-v5/phone-feedback-v1.html, section 1: "Say it" and
 * "Sent"). Below 768px, in the overlay layer (v3Store `{ type: "feedback", about, kind? }`), opened by the speech-bubble
 * buttons on Today (the header's and the slim bar's) and by the founding writer card's three buttons on Profile.
 *   - "Tell us what you think", "About: {screen}" (lib/phoneV5 `feedbackAbout`, from where it was opened), the three
 *     kinds (I like · I don't like · An idea — `FB_KINDS`; opens on "An idea" unless a door names one), the note, the
 *     rank line for founding writers (`nextStep`, the founding card's own derivation; hidden for everyone else) and Send.
 *   - ⚠️ ONE SEND PATH: lib/sendFeedback `sendFeedback`, with the fields the desktop founding card sends (Dash105Founding)
 *     and the panel sends (FeedbackDock): the callable's own kind string (COMPOSE), severity "", wantsReply true, no
 *     screenshot, `feedbackContext()` for the route, viewport and browser — and the screen it was opened over as the
 *     page's name. THIS SHEET WRITES NOTHING ELSE.
 *   - A failed send says so in a plain line and keeps the note. Sent: the stamp ("Sent", today), "Thank you.", the line
 *     about Your notes (true: Your notes shows Not read yet · Read · Planned · Now in the app), Done and "See your notes".
 * Escape closes it (the layer's own Escape); Tab stays inside the sheet while it is open.
 */
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { closeV3, openV3 } from "../v3/v3Store";
import { Stamp } from "../v4/V4Parts";
import { useScriptAllyDb } from "../../../lib/db";
import { useFoundingStats } from "../../../lib/foundingStats";
import { SEND_FAILED, composeFor, nextStep, type ComposeKey } from "../../../lib/foundingCard";
import { FEEDBACK_MAX, FEEDBACK_SENDING } from "../../../lib/beta";
import { feedbackContext, sendFeedback } from "../../../lib/sendFeedback";
import { notifyFeedbackSent } from "../../../lib/feedbackStore";
import { dayMonth } from "../../../lib/dates";
import {
  FB_FIRST, FB_KINDS, FB_SENT_LINE, MAT_TAB_KEY, TODAY_TAB_KEY, YOUR_NOTES_PATH, fbKindFor, fbReady, feedbackAbout, isMatTab, isTodayTab, readTab,
} from "../../../lib/phoneV5";
import "../v4/phoneV4.css";
import "./phoneV5.css";

/** open the sheet over the screen it names, on a kind or on "An idea" */
export const openFeedbackSheet = (about: string, kind?: ComposeKey): void => openV3({ type: "feedback", about, ...(kind ? { kind } : {}) });
/** the slim bar's door: the page it is on and, on Today or Materials, the tab chosen there this session (the same
 *  remembered tab those pages open on) */
export const openFeedbackHere = (pathname: string): void => openFeedbackSheet(feedbackAbout(pathname, {
  today: readTab(TODAY_TAB_KEY, isTodayTab, "queries"), materials: readTab(MAT_TAB_KEY, isMatTab, "packages"),
}));

/** the sheet once sent: the stamp, "Thank you.", the line about Your notes, Done and "See your notes" */
export const FbSentV5: React.FC<{ date: string; doneRef?: React.Ref<HTMLButtonElement>; onDone: () => void; onNotes: () => void }> = ({ date, doneRef, onDone, onNotes }) => (
  <div className="pa5-fb-sent" data-pa5="fb-sent">
    <div className="pa5-fb-stamp"><Stamp word="Sent" date={date} style={{ position: "relative", right: "auto", top: "auto" }} /></div>
    <h2 id="pa5-fb-t" className="pa4-h pa5-fb-ty">Thank you.</h2>
    <p className="pa4-b pa4-body pa5-fb-line">{FB_SENT_LINE}</p>
    <button ref={doneRef} type="button" className="pa4-cta" data-pa5="fb-done" onClick={onDone}>Done</button>
    <button type="button" className="pa4-link" data-pa5="fb-notes-link" onClick={onNotes}>See your notes</button>
  </div>
);

const FOCUSABLE = 'button:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export const FeedbackSheetV5: React.FC<{ about: string; kind: ComposeKey | null }> = ({ about, kind: preset }) => {
  const navigate = useNavigate();
  const { currentUser } = useScriptAllyDb();
  const founding = useFoundingStats(currentUser?.id ?? null);
  const [key, setKey] = useState<ComposeKey>(preset ?? FB_FIRST);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "failed" | "sent">("idle");
  const [sentOn, setSentOn] = useState("");
  const ready = fbReady(note, state === "sending");
  const rank = !founding.loading && founding.stats.foundingNo != null ? nextStep(founding.stats) : null;

  const send = async () => {
    if (!ready) return;
    setState("sending");
    try {
      await sendFeedback({
        kind: fbKindFor(key), message: note.trim(), severity: "", wantsReply: true,
        pageName: about, screenshotPath: "", ...feedbackContext(),
      });
      setSentOn(dayMonth(Date.now()));
      setNote("");
      setState("sent");
      notifyFeedbackSent();
    } catch {
      /* the words are kept; the line says it did not go */
      setState("failed");
    }
  };

  /* focus: the title on open, Done once sent; Tab kept inside the sheet */
  const ref = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { (state === "sent" ? doneRef.current : headRef.current)?.focus({ preventScroll: true }); }, [state === "sent"]); // eslint-disable-line react-hooks/exhaustive-deps
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !ref.current) return;
    const els = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const spec = composeFor(key);
  return (
    <div ref={ref} className="pa4-sheet pa5-fb" role="dialog" aria-modal="true" aria-labelledby="pa5-fb-t" onKeyDown={onKey}
      data-pa5="fb-sheet" data-about={about} data-state={state}>
      <div className="pa4-grab" />
      {state === "sent" ? (
        <FbSentV5 date={sentOn} doneRef={doneRef} onDone={closeV3} onNotes={() => { closeV3(); navigate(YOUR_NOTES_PATH); }} />
      ) : (<>
        <h2 id="pa5-fb-t" ref={headRef} tabIndex={-1} className="pa4-h pa5-fb-h">Tell us what you think</h2>
        <div className="pa4-s pa5-fb-about" data-pa5="fb-about">About: {about}</div>
        <div className="pa5-fb-kinds" role="group" aria-label="What kind of note">
          {FB_KINDS.map((k) => (
            <button key={k.key} type="button" className={key === k.key ? "on" : ""} aria-pressed={key === k.key}
              data-pa5="fb-kind" data-k={k.key} data-kind={fbKindFor(k.key)} onClick={() => setKey(k.key)}>{k.label}</button>
          ))}
        </div>
        <textarea className="pa5-fb-ta" data-pa5="fb-note" aria-label={spec.question} placeholder={spec.placeholder} maxLength={FEEDBACK_MAX}
          value={note} onChange={(e) => { setNote(e.target.value); if (state === "failed") setState("idle"); }} />
        {state === "failed" ? <p className="pa4-s pa5-fb-err" role="alert" data-pa5="fb-error">{SEND_FAILED}</p> : null}
        {rank ? <div className="pa4-s pa5-fb-rank" data-pa5="fb-rank">{rank}</div> : null}
        <button type="button" className="pa4-cta" style={{ marginTop: 16 }} data-pa5="fb-send" disabled={!ready} onClick={() => void send()}>
          {state === "sending" ? FEEDBACK_SENDING : "Send"}
        </button>
      </>)}
    </div>
  );
};
