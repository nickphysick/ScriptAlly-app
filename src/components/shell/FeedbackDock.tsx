/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The feedback panel (Help system v1, Part E — design-refs/help-system-v1, screens 08 to 11). It opens from the
 * sidebar's Give feedback, from the Help menu's, and from the beta strip; there is one panel, mounted once by AppShell.
 *
 *   header    blush: the hawk, "Tell us what you found", "Every message reaches Nick, the founder.", ✕ (the draft is kept)
 *   kind      four tiles in a radio group; nothing below shows until one is chosen, and the question follows the kind
 *   broken    "How much is it in your way?" — three optional pills
 *   broken or confusing   a screenshot: add, drop or paste one image (5 MB), sent only if added
 *   reply     "Reply to {email} if it needs one", on by default
 *   context   "Sent with it: …", closed by default: the page's name, the browser in plain words, the window, the version,
 *             the account — and, in sage, what is never sent
 *   foot      "⌘ ↵ to send" and Send to Nick (navy), disabled until there is a kind and a message
 *   sent      the hawk again, "Got it, thank you", where any reply will come from, "— Nick, founder"
 *
 * ⚠️ IT CAPTURES CONTEXT AND SHOWS THE WRITER EXACTLY WHAT IT CAPTURED — and NEVER page content, form values, or a line
 *    of anyone's manuscript. The page name and the button it opens beside are REGISTERED with `lib/feedbackStore` by the
 *    shell; this file reads nothing off the page.
 * ⚠️ THE DRAFT IS KEPT when the panel closes for any reason but a send (module state in `lib/feedbackStore`: it lasts
 *    the session, not a reload). A failed send keeps it too, and says so.
 * ⚠️ THE EMAIL AND THE UID ARE THE SERVER'S TO READ from the verified token; the panel shows the account's address only
 *    so the writer knows where a reply would go.
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "./betaChrome.css";
import "./feedbackPanel.css";
import { AnchoredPortal } from "./useAnchoredPopover";
import {
  BETA_MODE, FEEDBACK_ACCOUNT_LINE, FEEDBACK_CLOSE_LABEL, FEEDBACK_CONTEXT_SUMMARY, FEEDBACK_HEADING, FEEDBACK_KINDS,
  FEEDBACK_KIND_LABEL, FEEDBACK_MAX, FEEDBACK_NEVER, FEEDBACK_QUESTION, FEEDBACK_SEND, FEEDBACK_SENDING, FEEDBACK_SENT_TITLE,
  FEEDBACK_SEVERITIES, FEEDBACK_SEVERITY_LABEL, FEEDBACK_SHOT_MAX, FEEDBACK_SIGNATURE, FEEDBACK_SUBHEAD, type FeedbackKind,
  appVersionLabel, describeBrowser, feedbackSentLines, takesScreenshot,
} from "../../lib/beta";
import { clearFeedbackDraft, feedbackAnchor, feedbackDraft, feedbackPage, setFeedbackDraft, type FeedbackDraft } from "../../lib/feedbackStore";
import { sendFeedback } from "../../lib/sendFeedback";

declare const __QH_BUILD_DATE__: string | undefined;
const BUILD = typeof __QH_BUILD_DATE__ !== "undefined" ? __QH_BUILD_DATE__ : undefined;
export const FEEDBACK_HAWK = "/images/feedback-hawk.png";

const KIND_ICON: Record<FeedbackKind, string> = {
  "Something's broken": "!",
  "Something's confusing": "?",
  "An idea": "✦",
  "Something I liked": "♥",
};

const isMac = () => typeof navigator !== "undefined" && /Mac|iP(hone|ad|od)/.test(navigator.platform ?? navigator.userAgent ?? "");

export const FeedbackDock: React.FC<{
  /** The signed-in account, when there is one. Only the uid's presence decides "Linked"; the server reads the token. */
  uid?: string;
  /** The account's address, shown where a reply would go. Never sent: the server reads its own. */
  email?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The app's own confirmation toast. */
  onReceipt: (message: string) => void;
}> = ({ uid, email, open, onOpenChange, onReceipt }) => {
  const location = useLocation();
  const [d, setD] = useState<FeedbackDraft>(() => feedbackDraft());
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [error, setError] = useState("");
  const [shotError, setShotError] = useState("");
  const [sent, setSent] = useState<{ wantsReply: boolean; broken: boolean } | null>(null);
  const [over, setOver] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const msgRef = useRef<HTMLTextAreaElement | null>(null);
  const [place, setPlace] = useState<React.CSSProperties>({ visibility: "hidden" });

  /* every change goes to the module draft as well, so a close keeps it */
  const update = useCallback((patch: Partial<FeedbackDraft>) => {
    setD((prev) => { const next = { ...prev, ...patch }; setFeedbackDraft(next); return next; });
  }, []);
  /* opening reads the kept draft back; a panel reopened after a send starts fresh */
  useEffect(() => {
    if (!open) return;
    setD(feedbackDraft());
    setState((s) => (s === "sent" ? "idle" : s));
  }, [open]);

  /* beside the sidebar's button, its foot level with the button's foot, capped at the window and scrolling inside */
  const placeIt = useCallback(() => {
    const p = panelRef.current;
    if (!p) return;
    const vh = window.innerHeight, vw = window.innerWidth;
    const maxH = vh - 16;
    const h = Math.min(p.scrollHeight, maxH);
    const a = feedbackAnchor();
    if (!a) { setPlace({ left: Math.max(8, Math.min(16, vw - 8 - p.offsetWidth)), bottom: 16, maxHeight: maxH }); return; }
    const r = a.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.right + 12, vw - 8 - p.offsetWidth));
    const top = Math.max(8, Math.min(r.bottom - h, vh - 8 - h));
    setPlace({ left, top, maxHeight: maxH });
  }, []);
  useLayoutEffect(() => {
    if (!open) return undefined;
    placeIt();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => placeIt()) : null;
    const frame = panelRef.current?.firstElementChild;
    if (ro && frame) ro.observe(frame);
    window.addEventListener("resize", placeIt);
    return () => { ro?.disconnect(); window.removeEventListener("resize", placeIt); };
  }, [open, placeIt, state, d.kind, d.shot]);

  const close = useCallback(() => { onOpenChange(false); }, [onOpenChange]);

  /* Escape closes it (the draft is kept) */
  useEffect(() => {
    if (!open) return undefined;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); close(); } };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, close]);

  /* focus: the chosen kind's question, else the first tile; the sent state's Close */
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      const p = panelRef.current;
      if (!p) return;
      const target = state === "sent" ? p.querySelector<HTMLElement>("[data-fb='close2']")
        : feedbackDraft().kind ? msgRef.current : p.querySelector<HTMLElement>("[data-fb='kind']");
      target?.focus({ preventScroll: true });
    });
  }, [open, state]);

  if (!BETA_MODE || !open) return null;

  const kind = d.kind as FeedbackKind | null;
  const q = kind ? FEEDBACK_QUESTION[kind] : null;
  const ready = !!kind && d.message.trim().length > 0;
  const browserName = typeof navigator === "undefined" ? "" : describeBrowser(navigator.userAgent);
  const viewport = typeof window === "undefined" ? "" : `${window.innerWidth} × ${window.innerHeight}`;
  const version = appVersionLabel(BUILD);
  const pageName = feedbackPage() ?? "";

  const takeFile = (f: File | null | undefined) => {
    setShotError("");
    if (!f) return;
    if (!/^image\//.test(f.type)) { setShotError("That isn't an image. A screenshot is a picture: PNG, JPG and the like."); return; }
    if (f.size > FEEDBACK_SHOT_MAX) { setShotError("That image is over 5 MB. A smaller one will do."); return; }
    if (d.shot) { try { URL.revokeObjectURL(d.shot.url); } catch { /* none */ } }
    update({ shot: { file: f, url: URL.createObjectURL(f), name: f.name || "Pasted image" } });
  };

  const send = async () => {
    if (!ready || state === "sending" || !kind) return;
    setState("sending");
    setError("");
    try {
      let screenshotPath = "";
      if (d.shot && takesScreenshot(kind) && uid) {
        const ext = (d.shot.file.type.split("/")[1] || "png").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "png";
        screenshotPath = `betaFeedback/${uid}/${Date.now()}.${ext}`;
        const [{ getStorage, ref, uploadBytes }, { app }] = await Promise.all([import("firebase/storage"), import("../../lib/firebase")]);
        await uploadBytes(ref(getStorage(app), screenshotPath), d.shot.file, { contentType: d.shot.file.type });
      }
      /* Dashboard v77: the call lives in lib/sendFeedback (the founding writer card posts through it too) */
      await sendFeedback({
        kind, message: d.message.trim(),
        severity: kind === "Something's broken" ? d.severity ?? "" : "",
        wantsReply: d.reply, pageName, route: location.pathname, viewport,
        browser: typeof navigator === "undefined" ? "" : navigator.userAgent, browserName, appVersion: version,
        screenshotPath,
      });
      setSent({ wantsReply: d.reply, broken: kind === "Something's broken" });
      clearFeedbackDraft();
      setD(feedbackDraft());
      setState("sent");
      onReceipt(FEEDBACK_SENT_TITLE);
    } catch (e) {
      /* ⚠️ A FAILURE SAYS SO AND KEEPS THE WORDS. Reporting success on a write that did not land is how a beta hears
         nothing and believes everything is fine. */
      setState("failed");
      setError((e as { message?: string })?.message || "That didn't send. Nothing's lost — try again, or email us.");
    }
  };

  const onKindKey = (e: React.KeyboardEvent, i: number) => {
    const n = FEEDBACK_KINDS.length;
    const go = e.key === "ArrowRight" || e.key === "ArrowDown" ? (i + 1) % n : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (i - 1 + n) % n : -1;
    if (go < 0) return;
    e.preventDefault();
    update({ kind: FEEDBACK_KINDS[go] });
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>(`[data-fb='kind'][data-k="${FEEDBACK_KINDS[go]}"]`)?.focus());
  };

  const lines = sent ? feedbackSentLines({ wantsReply: sent.wantsReply, email: email ?? null, broken: sent.broken }) : null;

  const body = state === "sent" && lines ? (
    <div className="fb-done" data-fb="sent">
      <img className="fb-face fb-face--sent" src={FEEDBACK_HAWK} alt="" width={56} height={56} />
      <h3 id="fb-t">{FEEDBACK_SENT_TITLE}</h3>
      <p>{lines.lead}{lines.email ? <b>{lines.email}</b> : null}{lines.tail}</p>
      <p className="fb-sig">{FEEDBACK_SIGNATURE}</p>
      <div className="fb-done-b">
        <button type="button" className="fb-ghost" data-fb="again" onClick={() => { setState("idle"); setSent(null); }}>Send another</button>
        <button type="button" className="fb-send" data-fb="close2" onClick={close}>Close</button>
      </div>
    </div>
  ) : (
    <>
      <div className="fb-b">
        <div>
          <span className="fb-fl" id="fb-kl">{FEEDBACK_KIND_LABEL}</span>
          <div className="fb-kinds" role="radiogroup" aria-labelledby="fb-kl" data-fb="kinds">
            {FEEDBACK_KINDS.map((k, i) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} className="fb-kind" data-fb="kind" data-k={k}
                tabIndex={kind ? (kind === k ? 0 : -1) : i === 0 ? 0 : -1}
                onKeyDown={(e) => onKindKey(e, i)}
                onClick={() => { update({ kind: k }); requestAnimationFrame(() => msgRef.current?.focus()); }}>
                <span className="fb-ki" aria-hidden="true">{KIND_ICON[k]}</span>{k}
              </button>
            ))}
          </div>
        </div>
        {kind && q ? (
          <>
            <div>
              <label className="fb-fl" htmlFor="fb-msg" data-fb="question">{q.label}</label>
              <textarea id="fb-msg" ref={msgRef} placeholder={q.placeholder} maxLength={FEEDBACK_MAX} value={d.message} data-fb="message"
                onChange={(e) => { update({ message: e.target.value }); if (state === "failed") setState("idle"); }}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send(); } }} />
              <div className="fb-count" data-fb="count">{d.message.length} / {FEEDBACK_MAX}</div>
            </div>
            {kind === "Something's broken" ? (
              <div>
                <span className="fb-fl" id="fb-sl">{FEEDBACK_SEVERITY_LABEL}</span>
                <div className="fb-sev" role="radiogroup" aria-labelledby="fb-sl" data-fb="severity">
                  {FEEDBACK_SEVERITIES.map((s) => (
                    <button key={s} type="button" role="radio" aria-checked={d.severity === s}
                      onClick={() => update({ severity: d.severity === s ? null : s })}>{s}</button>
                  ))}
                </div>
              </div>
            ) : null}
            {takesScreenshot(kind) && uid ? (
              d.shot ? (
                <div className="fb-thumb" data-fb="thumb">
                  <img alt="Your screenshot" src={d.shot.url} />
                  <span>{d.shot.name}</span>
                  <button type="button" onClick={() => { if (d.shot) { try { URL.revokeObjectURL(d.shot.url); } catch { /* none */ } } update({ shot: null }); }}>Remove</button>
                </div>
              ) : (
                <div className={`fb-drop${over ? " over" : ""}`} data-fb="drop"
                  onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
                  onDrop={(e) => { e.preventDefault(); setOver(false); takeFile(e.dataTransfer.files?.[0]); }}>
                  <span aria-hidden="true">⧉</span>
                  <span>A screenshot helps. <label htmlFor="fb-file">Add one</label>, drop it here, or paste it. Only sent if you add it.</span>
                  <input id="fb-file" type="file" accept="image/*" onChange={(e) => { takeFile(e.target.files?.[0]); e.target.value = ""; }} />
                </div>
              )
            ) : null}
            {shotError ? <p className="fb-err" role="alert">{shotError}</p> : null}
            {email ? (
              <div className="fb-reply">
                <button type="button" className="fb-sw" role="switch" aria-checked={d.reply} aria-labelledby="fb-reply-l" data-fb="reply"
                  onClick={() => update({ reply: !d.reply })} />
                <span id="fb-reply-l">Reply to <b>{email}</b> if it needs one</span>
              </div>
            ) : null}
            <details className="fb-ctx" data-fb="context">
              <summary>{FEEDBACK_CONTEXT_SUMMARY}</summary>
              <dl>
                <dt>PAGE</dt><dd>{pageName || "This page"}</dd>
                <dt>BROWSER</dt><dd>{browserName}</dd>
                <dt>WINDOW</dt><dd>{viewport}</dd>
                <dt>VERSION</dt><dd>{version}</dd>
                <dt>ACCOUNT</dt><dd>{uid ? FEEDBACK_ACCOUNT_LINE : "Not signed in"}</dd>
              </dl>
              <p className="fb-never">{FEEDBACK_NEVER}</p>
            </details>
          </>
        ) : null}
      </div>
      {state === "failed" && error ? <p className="fb-err fb-err--send" role="alert" data-fb="error">{error}</p> : null}
      <div className="fb-f">
        <span className="fb-k">{isMac() ? "⌘" : "Ctrl"} ↵ to send</span>
        <button type="button" className="fb-send" data-fb="send" disabled={!ready || state === "sending"} onClick={() => void send()}>
          {state === "sending" ? FEEDBACK_SENDING : FEEDBACK_SEND}
        </button>
      </div>
    </>
  );

  return (
    <AnchoredPortal>
      <div ref={panelRef} className="fb-panel" role="dialog" aria-labelledby="fb-t" data-fb="panel" style={place}
        onPaste={(e) => {
          if (!takesScreenshot(kind) || !uid) return;
          const f = [...(e.clipboardData?.files ?? [])][0];
          if (f) { e.preventDefault(); takeFile(f); }
        }}>
        <div className="fb-frame">
          {state === "sent" ? null : (
            <div className="fb-h">
              <img className="fb-face" src={FEEDBACK_HAWK} alt="" width={48} height={48} />
              <div><h3 id="fb-t">{FEEDBACK_HEADING}</h3><p>{FEEDBACK_SUBHEAD}</p></div>
              <button type="button" className="fb-x" aria-label={FEEDBACK_CLOSE_LABEL} data-fb="close" onClick={close}>×</button>
            </div>
          )}
          {body}
        </div>
      </div>
    </AnchoredPortal>
  );
};
