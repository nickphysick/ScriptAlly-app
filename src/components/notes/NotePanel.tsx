/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * YOUR NOTES v1 — ONE NOTE'S PANEL, from the right (560 wide, the band-headed card frame). The note in full, what was
 * sent with it, the timeline (`statusLog`, or derived), our founder's reply and the thread, and a reply box.
 *
 * ⚠️ OPENING IT CALLS `markFeedbackSeen` (the seen-mark, nothing else). SENDING CALLS `addFeedbackNote`; on a built or
 *    fixed "What I don't" note the box asks whether it is still happening, and a send opens the note again.
 * ⚠️ A FAILED SEND KEEPS THE WORDS and says so.
 * ⚠️ IT PORTALS TO `document.body`, so its wrapper carries `.d58.d2` (the card frame is scoped to them) and the page's
 *    own `yn-layer`.
 * ⚠️ ESCAPE IS A LAYER ON THE ONE STACK (`ESC_LEVEL.pageDrawer`), so it never reaches the page's own handler.
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../lib/escapeStack";
import { SEND_FAILED } from "../../lib/foundingCard";
import { CONTEXT_LINE, canReopen, kindWords, shortDate, stamp, timeline, type YourNote } from "../../lib/yourNotes";
import { addFeedbackNote, markFeedbackSeen, useThread } from "../../lib/yourNotesStore";
import { FEEDBACK_HAWK } from "../shell/FeedbackDock";
import { iconFor } from "./notesParts";

const X = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
export const NOTE_MAX = 2000;
const initials = (name: string) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "Me";

export const NotePanel: React.FC<{ note: YourNote; onClose: () => void; userName: string }> = ({ note: n, onClose, userName }) => {
  const [on, setOn] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const thread = useThread(n.id, true);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const opener = useRef<HTMLElement | null>(typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null);
  const reopen = canReopen(n);

  useEscapeLayer(true, onClose, ESC_LEVEL.pageDrawer);
  /* in, focus inside; and the note is seen (fire and forget: a failed mark costs only the badge) */
  useEffect(() => {
    const f = requestAnimationFrame(() => { setOn(true); panelRef.current?.querySelector<HTMLElement>("[data-yn='panel-close']")?.focus({ preventScroll: true }); });
    void markFeedbackSeen(n.id).catch(() => undefined);
    const back = opener.current;
    return () => { cancelAnimationFrame(f); back?.focus?.({ preventScroll: true }); };
  }, [n.id]);

  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true); setFailed(false);
    try {
      await addFeedbackNote(n.id, t, reopen);
      setText("");
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const steps = timeline(n);
  const hasThread = !!n.reply || thread.messages.length > 0;

  return createPortal(
    <div className={`yn-layer d58 d2${on ? " is-on" : ""}`} data-yn="panel-layer">
      <div className="yn-scrim" onClick={onClose} aria-hidden="true" />
      <div className="yn-panel" ref={panelRef} role="dialog" aria-modal="true" aria-label={n.title || kindWords(n.kind)} data-yn="panel">
        <section className="os-card d2-card yn-pcard">
          <div className="os-frame">
            <div className="os-band d2-tone--sand">
              <div className="os-bandrow">
                <span className="yn-nk" aria-hidden="true">{iconFor(n.kind)}</span>
                <h2 className="os-cardttl d2-cardttl">{kindWords(n.kind)}</h2>
                <button type="button" className="yn-dx" aria-label="Close" data-yn="panel-close" onClick={onClose}>{X}</button>
              </div>
            </div>
            <div className="yn-db">
              <p className="yn-dk">What you sent{n.createdAt != null ? ` · ${shortDate(n.createdAt)}` : ""}{n.pageName ? ` · from ${n.pageName}` : ""}</p>
              <div className="yn-dnote" data-yn="panel-note">{n.message}</div>
              <p className="yn-dctx">{CONTEXT_LINE}</p>
              <ol className="yn-dtl" data-yn="timeline">
                {steps.map((s, i) => (
                  <li key={i} className={s.todo ? "todo" : undefined} data-todo={s.todo ? "1" : undefined}>
                    <i aria-hidden="true" />
                    <span><b>{s.label}</b>{s.note ? <small>{s.note}</small> : null}</span>
                    <time>{s.at != null ? stamp(s.at) : ""}</time>
                  </li>
                ))}
              </ol>
              {n.reply ? (
                <div className="yn-dmsg" data-yn="founder-reply">
                  <img src={FEEDBACK_HAWK} alt="" />
                  <div className="yn-bub">{n.reply.text}<span className="yn-sig">— our founder</span>{n.reply.at != null ? <span className="yn-when">{stamp(n.reply.at)}</span> : null}</div>
                </div>
              ) : null}
              {thread.messages.map((m) => (
                m.from === "founder" ? (
                  <div key={m.id} className="yn-dmsg" data-yn="thread-founder">
                    <img src={FEEDBACK_HAWK} alt="" />
                    <div className="yn-bub">{m.text}<span className="yn-sig">— our founder</span>{m.at != null ? <span className="yn-when">{stamp(m.at)}</span> : null}</div>
                  </div>
                ) : (
                  <div key={m.id} className="yn-dmsg me" data-yn="thread-writer">
                    <span className="yn-disc" aria-hidden="true">{initials(userName)}</span>
                    <div className="yn-bub">{m.text}{m.at != null ? <span className="yn-when">{stamp(m.at)}</span> : null}</div>
                  </div>
                )
              ))}
              {!hasThread && !thread.loading ? (
                <p className="yn-dctx" data-yn="no-reply">{n.status ? "No reply yet. If one comes, it’ll be here." : "Not read yet. You’ll see it here the moment it is."}</p>
              ) : null}
            </div>
            <div className="yn-df">
              <textarea className="yn-ta" data-yn="reply-box" aria-label={reopen ? "Still happening?" : "Add to this note"} maxLength={NOTE_MAX} value={text}
                placeholder={reopen ? "Still happening? Tell us what you’re seeing." : "Add to this note…"}
                onChange={(e) => { setText(e.target.value); if (failed) setFailed(false); }}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send(); } }} />
              {failed ? <p className="yn-err" role="alert" data-yn="send-failed">{SEND_FAILED}</p> : null}
              <div className="yn-dfr">
                <span>{reopen ? "Say it’s still happening and it opens again." : "Goes straight to us, with this note."}</span>
                <button type="button" className="yn-btn" onClick={onClose}>Close</button>
                <button type="button" className="yn-btn pri" data-yn="send" disabled={!text.trim() || busy} onClick={() => void send()}>{busy ? "Sending…" : "Send"}</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
};
