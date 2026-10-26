/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v77 — THE FOUNDING WRITER CARD, REBUILT AROUND FEEDBACK
 * (refs design-refs/dashboard-v77/founding-card-v76.html for content and states, dashboard-v77.html in place).
 *
 * A white card, a burgundy hairline, a navy band and a pink body. The four kinds of feedback are the only way in:
 * pick one and the card asks the kind's question; "Tell us" sends it through the one send path
 * (`lib/sendFeedback`, the sidebar dock's own). Under them, the writer's record: what their feedback changed,
 * read live from their own `betaFeedback` docs (`lib/feedbackRecord`).
 *
 *   idle  — the heading, the four pills, and the stats line (and, on a big card, the record)
 *   write — the kind's question in the textarea's placeholder, "Cancel" and "Tell us"
 *   sent  — thanks; the new note heads the record as Sent, at once, before the snapshot carries it
 *
 * ⚠️ THE VARIANT IS THE CARD'S OWN HEIGHT, NEVER THE WINDOW'S. Both layouts are rendered and a size container
 *    on the card shows one (dash77.css): Big ≥300px tall (4 rows from 380, else 3), Laptop 160–299, Compact
 *    under 160 (no art, no stats line). The hidden layout is `display: none`, so it is out of the
 *    accessibility tree and out of every measurement.
 * ⚠️ NO GREEN, NO NATIVE `title`. A row's "Your idea, 2 Oct → Shipped 20 Oct" is a drawn tooltip on hover, with
 *    the same words visually hidden for screen readers.
 * ⚠️ THE WEEKLY PULSE IS GONE FROM THE DASHBOARD. `lib/weeklyPulse*`, the `sendWeeklyPulse` function and the
 *    `betaPulse` rules are left as they were; this card never calls them.
 */
import React, { useId, useMemo, useRef, useState } from "react";
import { FEEDBACK_KINDS, FEEDBACK_QUESTION, type FeedbackKind } from "../../../lib/beta";
import { mergePending, recordOf, sameNote, useFeedbackRecord, type FeedbackDoc, type FeedbackRow } from "../../../lib/feedbackRecord";
import { feedbackContext, sendFeedback } from "../../../lib/sendFeedback";

export const FOUNDING_ART = "/images/founding-writers.png";

/** The copy table (the pack's, exact). */
export const FW77 = {
  band: "You’re a QueryHawk founding writer",
  heading: "We’d love to hear your feedback.",
  sentBig: "Thank you. We read all feedback.",
  sentSmall: "Thank you.",
  sentLine: "We read all feedback.",
  again: "Tell us something else",
  failed: "That didn't send. Try again?",
  record: "WHAT YOUR FEEDBACK CHANGED",
  cancel: "Cancel",
  change: "Change",
  send: "Tell us",
  sending: "Sending…",
  kindsLabel: "Tell us about",
} as const;

export const MAX_MESSAGE = 4000;
/** Big shows at most four rows (three under 380px of card, by container query). */
const MAX_ROWS = 4;

export type Fw77State = "idle" | "write" | "sent";

/** "4 sent · 2 changed QueryHawk", "4 sent", or nothing at all. */
const Stats: React.FC<{ sent: number; changed: number; className: string }> = ({ sent, changed, className }) =>
  sent === 0 ? null : (
    <p className={className} data-d77="stats">
      <span className="d77-ns" data-d77="stats-sent">{sent}</span> sent
      {changed > 0 && <> · <b data-d77="stats-changed">{changed}</b> changed QueryHawk</>}
    </p>
  );

const Pills: React.FC<{ kind: FeedbackKind | null; onPick: (k: FeedbackKind) => void; scope: string }> = ({ kind, onPick, scope }) => {
  const ref = useRef<HTMLDivElement>(null);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = FEEDBACK_KINDS.length;
    const go = e.key === "ArrowRight" || e.key === "ArrowDown" ? (i + 1) % n : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (i - 1 + n) % n : -1;
    if (go < 0) return;
    e.preventDefault();
    onPick(FEEDBACK_KINDS[go]);
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>(`[data-k="${FEEDBACK_KINDS[go]}"]`)?.focus());
  };
  return (
    <div className="d77-kinds" role="radiogroup" aria-label={FW77.kindsLabel} data-d77="kinds" data-scope={scope} ref={ref}>
      {FEEDBACK_KINDS.map((k, i) => (
        <button
          key={k} type="button" role="radio" aria-checked={kind === k} data-d77="kind" data-k={k}
          tabIndex={kind ? (kind === k ? 0 : -1) : i === 0 ? 0 : -1}
          onKeyDown={(e) => onKey(e, i)} onClick={() => onPick(k)}
        >{k}</button>
      ))}
    </div>
  );
};

const Record: React.FC<{ rows: FeedbackRow[] }> = ({ rows }) => (
  <div className="d77-recw" data-d77="record">
    <div className="d77-rh" data-d77="record-head">{FW77.record}</div>
    <ol className="d77-rec">
      {rows.slice(0, MAX_ROWS).map((r) => (
        <li key={r.id} className={`d77-row is-${r.status}`} data-d77="row" data-status={r.status}>
          <span className="d77-rt" data-d77="row-title">{r.title}</span>
          <span className="d77-pill" data-d77="row-pill">{r.statusLabel}</span>
          <span className="d77-tip" aria-hidden="true" data-d77="row-tip">{r.tooltip}</span>
          <span className="d77-vh">{r.tooltip}</span>
        </li>
      ))}
    </ol>
  </div>
);

export interface Dash77FoundingProps {
  loading: boolean;
  /** the signed-in writer; the record reads their own feedback */
  uid: string | null;
  /** where the note was written (the dock sends the same field) */
  pageName?: string;
}

export const Dash77Founding: React.FC<Dash77FoundingProps> = ({ loading, uid, pageName = "Dashboard" }) => {
  const rec = useFeedbackRecord(uid);
  const [pending, setPending] = useState<FeedbackDoc[]>([]);
  const [state, setState] = useState<Fw77State>("idle");
  /* the note just sent heads the record while the card says thank you */
  const [justSent, setJustSent] = useState<FeedbackDoc | null>(null);
  const record = useMemo(
    () => recordOf(mergePending(rec.docs, pending), state === "sent" && justSent ? (d) => sameNote(d, justSent) : undefined),
    [rec.docs, pending, state, justSent],
  );

  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const id = useId();
  const smArea = useRef<HTMLTextAreaElement>(null);
  const lgArea = useRef<HTMLTextAreaElement>(null);

  const focusArea = () => requestAnimationFrame(() => {
    for (const a of [lgArea.current, smArea.current]) if (a && a.offsetParent !== null) { a.focus(); return; }
  });
  const pick = (k: FeedbackKind) => { setKind(k); setFailed(false); setState("write"); focusArea(); };
  const cancel = () => { setText(""); setFailed(false); setState("idle"); };
  const change = () => { setFailed(false); setState("idle"); };
  const again = () => { setKind(null); setText(""); setFailed(false); setState("idle"); };
  const ready = !!kind && text.trim().length > 0 && !sending;

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!kind || !ready) return;
    const message = text.trim().slice(0, MAX_MESSAGE);
    setSending(true);
    setFailed(false);
    try {
      await sendFeedback({ kind, message, severity: "", wantsReply: true, pageName, ...feedbackContext(), screenshotPath: "" });
      const note: FeedbackDoc = { id: `pending-${Date.now()}`, kind, message, createdAt: Date.now() };
      setPending((p) => [...p, note]);
      setJustSent(note);
      setText("");
      setState("sent");
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <section className="d77-fw is-loading d58-skcard" data-sk="card" data-d58="panel" data-d71="fw" data-loading="1" aria-hidden="true">
        <div className="d77-fwframe">
          <div className="d77-fwband"><span>{FW77.band}</span></div>
          <div className="d77-fwbody d77-sk"><div className="d77-skart" /><div className="d77-sktxt" /></div>
        </div>
      </section>
    );
  }

  const q = kind ? FEEDBACK_QUESTION[kind].label : "";
  const form = (scope: "sm" | "lg", ref: React.Ref<HTMLTextAreaElement>) => (
    <form className="d77-fx" noValidate onSubmit={send} data-d77="form" data-scope={scope}>
      <textarea
        ref={ref} id={`${id}-${scope}-msg`} data-d77="message" value={text} maxLength={MAX_MESSAGE}
        placeholder={q} aria-label={q} disabled={sending}
        onChange={(e) => { setText(e.target.value); if (failed) setFailed(false); }}
      />
      {failed && <p className="d77-fail" role="status" data-d77="failed">{FW77.failed}</p>}
      <div className="d77-fb">
        <button type="button" className="d77-lnk" data-d77="cancel" onClick={cancel}>{FW77.cancel}</button>
        <button type="submit" className="d77-tellus" data-d77="send" disabled={!ready}>{sending ? FW77.sending : FW77.send}</button>
      </div>
    </form>
  );

  const hasRecord = record.sent > 0;
  const bandId = `${id}-band`;
  return (
    <section
      className="d77-fw" data-d58="panel" data-d71="fw" data-loading="0" data-state={state}
      data-sent={record.sent} data-changed={record.changed} data-record={hasRecord ? "1" : "0"}
      aria-labelledby={bandId}
    >
      <div className="d77-fwframe">
        <div className="d77-fwband" data-d77="band"><span id={bandId} data-d77="band-title">{FW77.band}</span></div>

        {/* ── Laptop and Compact (under 300px of card) ── */}
        <div className="d77-fwbody d77-sm" data-d77="sm">
          <img className="d77-art" data-d77="art" src={FOUNDING_ART} alt="" draggable={false} />
          <div className="d77-tx">
            {state === "idle" && (
              <div className="d77-v" data-d77="idle">
                <h3 className="d77-h" data-d77="heading">{FW77.heading}</h3>
                <Pills kind={null} onPick={pick} scope="sm" />
                <Stats sent={record.sent} changed={record.changed} className="d77-so" />
              </div>
            )}
            {state === "write" && (
              <div className="d77-v d77-v--write" data-d77="write">
                <div className="d77-chosen">
                  <span className="d77-ck" data-d77="chosen">{kind}</span>
                  <button type="button" className="d77-lnk" data-d77="change" onClick={change}>{FW77.change}</button>
                </div>
                {form("sm", smArea)}
              </div>
            )}
            {state === "sent" && (
              <div className="d77-v" data-d77="sent">
                <h3 className="d77-h d77-thx" data-d77="heading">{FW77.sentSmall}</h3>
                <p className="d77-line" data-d77="sent-line">{FW77.sentLine}</p>
                <button type="button" className="d77-lnk d77-again" data-d77="again" onClick={again}>{FW77.again}</button>
              </div>
            )}
          </div>
        </div>

        {/* ── Big (300px of card and over) ── */}
        <div className={`d77-fwbody d77-lg${hasRecord ? "" : " is-bare"}`} data-d77="lg">
          <div className="d77-hero">
            <img className="d77-art" data-d77="art" src={FOUNDING_ART} alt="" draggable={false} />
            <div className="d77-htx">
              <h3 className="d77-h" data-d77="heading">{state === "sent" ? FW77.sentBig : FW77.heading}</h3>
              <Stats sent={record.sent} changed={record.changed} className="d77-so" />
            </div>
          </div>
          <Pills kind={state === "write" ? kind : null} onPick={pick} scope="lg" />
          {state === "write" ? (
            <div className="d77-lgwrite" data-d77="write">{form("lg", lgArea)}</div>
          ) : hasRecord ? (
            <Record rows={record.rows} />
          ) : null}
        </div>
      </div>
    </section>
  );
};
