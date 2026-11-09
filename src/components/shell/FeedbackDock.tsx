/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The feedback pop-up (Help system v1, Part E; restyled by Your notes v1 Part D — design-refs/your-notes-v1, its "Pop-up"
 * state). It opens from the sidebar's Give feedback, the Help menu's, the beta strip, the founding band's three buttons and
 * Your notes' "+ Tell us something"; there is one panel, mounted once by AppShell.
 *
 *   frame    the founding band's: white, radius 22, padding 7, the striped blush top with "Founding writer" and the
 *            founding number (the band's own tag), the round close
 *   head     the feedback hawk (60, rose ring), "Tell us something", "It goes straight to our founder. We read every word."
 *   choice   three tiles — Like · Don't like · Idea (`COMPOSE`); once one is picked they tuck into a row of pills and the
 *            question appears: COMPOSE's question and placeholder, the two chips for Don't like (`DONT_CHIPS`, broken
 *            first), the text, and the "Sent with it" line
 *   foot     blush: the writer's rank (`foundingStats`, the server's), "{n} more notes to {next}" and a thin bar; "Your
 *            notes" with "{k} new"; the navy Send
 *   sent     the hawk, "Thank you, {first name}." (`sentCopy`), a card for the note with "Not read yet", and the rank,
 *            "Send another" and "See your notes"
 *
 * ⚠️ ITS JOB IS UNCHANGED: one panel, the one send path (`lib/sendFeedback`), the kept draft, Escape, ⌘↵, and the
 *    placement beside the sidebar's button. Severity is no longer asked (the callable accepts none). The reply switch is
 *    gone and every note asks for a reply: it can now be answered on Your notes.
 * ⚠️ IT CAPTURES CONTEXT AND SAYS SO — and NEVER page content, form values, or a line of anyone's manuscript. The page
 *    name and the button it opens beside are REGISTERED with `lib/feedbackStore` by the shell; this file reads nothing
 *    off the page.
 * ⚠️ THE DRAFT IS KEPT when the panel closes for any reason but a send. A failed send keeps it too, and says so.
 * ⚠️ THE EMAIL AND THE UID ARE THE SERVER'S TO READ from the verified token.
 * ⚠️ THE BAND'S CLASSES ARE SCOPED TO `.d58.d2`, so the frame carries both (feedbackPop.css undoes `.d58`'s height).
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./betaChrome.css";
import "./feedbackPanel.css";
import "./feedbackPop.css";
import { AnchoredPortal } from "./useAnchoredPopover";
import {
  BETA_MODE, FEEDBACK_CLOSE_LABEL, FEEDBACK_MAX, FEEDBACK_SENDING, FEEDBACK_SENT_TITLE, FEEDBACK_SHOT_MAX, type FeedbackKind,
  appVersionLabel, describeBrowser, takesScreenshot,
} from "../../lib/beta";
import { clearFeedbackDraft, feedbackAnchor, feedbackDraft, feedbackPage, setFeedbackDraft, type FeedbackDraft } from "../../lib/feedbackStore";
import { sendFeedback } from "../../lib/sendFeedback";
import { DONT_CHIPS, composeFor, sentCopy, type ComposeKey } from "../../lib/foundingCard";
import { TIERS, cardTier, useFoundingStats } from "../../lib/foundingStats";
import { composeKeyOf, kindWords, rowTitle } from "../../lib/yourNotes";
import { EggNest, ICONS, headFor } from "../dashboard/v105/foundingArt";

declare const __QH_BUILD_DATE__: string | undefined;
const BUILD = typeof __QH_BUILD_DATE__ !== "undefined" ? __QH_BUILD_DATE__ : undefined;
export const FEEDBACK_HAWK = "/images/feedback-hawk.png";

/* the pop-up's words (design-refs/your-notes-v1, the Pop-up state) */
export const POP_TITLE = "Tell us something";
export const POP_SUB = "It goes straight to our founder. We read every word.";
export const POP_TILES: readonly { key: ComposeKey; label: string; line: string }[] = [
  { key: "like", label: "Like", line: "Something that’s working" },
  { key: "dont", label: "Don’t like", line: "Broken, or hard to follow" },
  { key: "idea", label: "Idea", line: "Something you’d add" },
];
export const POP_SEND = "Send";
export const POP_NOTES = "Your notes";
export const sentWithLine = (page: string): string =>
  `Sent with it: the page${page ? ` (${page})` : ""}, your browser and your account. Never anything you’ve written in QueryHawk.`;

const X = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;

/** The rank in the foot: the bird (or the egg), its name, the distance to the next and a thin bar — all the server's. */
const RankFoot: React.FC<{ read: ReturnType<typeof useFoundingStats> }> = ({ read: { loading, error, stats } }) => {
  if (loading || error) return <div className="fb3-rk" aria-hidden="true" />;
  const tier = cardTier(stats);
  const name = tier === 0 ? "Egg" : TIERS[tier - 1].name;
  const next = stats.nextTier ? TIERS.find((t) => t.key === stats.nextTier) ?? null : null;
  const from = tier === 0 ? 0 : TIERS[tier - 1].min;
  const into = next ? Math.max(0, Math.min(1, (stats.contributions - from) / (next.min - from))) : 1;
  const head = headFor(tier);
  return (
    <div className="fb3-rk" data-fb="rank">
      <span className="fb3-rkav" aria-hidden="true">{head ? <img src={head} alt="" /> : <EggNest className="d105-nest fb3-egg" />}</span>
      <div className="fb3-rkt">
        <b>{name}</b>
        <span>{next && stats.toNext != null ? `${stats.toNext} more ${stats.toNext === 1 ? "note" : "notes"} to ${next.name}` : "Top of the flock"}</span>
        <i className="fb3-bar" aria-hidden="true"><em style={{ width: `${Math.max(6, Math.round(into * 100))}%` }} /></i>
      </div>
    </div>
  );
};

/** The founding band's tag: "Founding writer" and, where the waitlist proves one, the number. */
const Tag: React.FC<{ foundingNo: number | null }> = ({ foundingNo }) => ( <span className="d22-tag" data-fb="tag">Founding writer{foundingNo ? <i>No. {foundingNo}</i> : null}</span>
);

export const FeedbackDock: React.FC<{
  /** The signed-in account, when there is one. Only the uid's presence decides "Linked"; the server reads the token. */
  uid?: string;
  /** The account's address. Never sent: the server reads its own. */
  email?: string | null;
  /** The writer's name, for "Thank you, {first name}." */
  name?: string | null;
  /** Replies on Your notes the writer has not seen (the "{k} new" pill) */
  newReplies?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The app's own confirmation toast. */
  onReceipt: (message: string) => void;
}> = ({ uid, name, newReplies = 0, open, onOpenChange, onReceipt }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [d, setD] = useState<FeedbackDraft>(() => feedbackDraft());
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [error, setError] = useState("");
  const [shotError, setShotError] = useState("");
  const [sent, setSent] = useState<{ kind: string; message: string; page: string } | null>(null);
  const [over, setOver] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const msgRef = useRef<HTMLTextAreaElement | null>(null);
  const [place, setPlace] = useState<React.CSSProperties>({ visibility: "hidden" });
  /* one read of the writer's founding stats, while the panel is open: the tag's number, the foot's rank, the thank-you */
  const statsRead = useFoundingStats(open ? uid : null);
  const { stats } = statsRead;

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

  /* focus: the chosen kind's question, else the first tile; the sent state's "See your notes" */
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      const p = panelRef.current;
      if (!p) return;
      const target = state === "sent" ? p.querySelector<HTMLElement>("[data-fb='see-notes']")
        : feedbackDraft().kind ? msgRef.current : p.querySelector<HTMLElement>("[data-fb='kind']");
      target?.focus({ preventScroll: true });
    });
  }, [open, state]);

  if (!BETA_MODE || !open) return null;

  const kind = d.kind as FeedbackKind | null;
  const key = kind ? composeKeyOf(kind) : null;
  const spec = key ? composeFor(key) : null;
  const ready = !!kind && d.message.trim().length > 0;
  const browserName = typeof navigator === "undefined" ? "" : describeBrowser(navigator.userAgent);
  const viewport = typeof window === "undefined" ? "" : `${window.innerWidth} × ${window.innerHeight}`;
  const version = appVersionLabel(BUILD);
  const pageName = feedbackPage() ?? "";

  const pick = (k: ComposeKey) => {
    /* "Don't like" keeps a chip already chosen; broken is the default */
    const nextKind = k === "dont" && (kind === "Something's broken" || kind === "Something's confusing") ? kind : composeFor(k).kind;
    update({ kind: nextKind });
    requestAnimationFrame(() => msgRef.current?.focus());
  };

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
      /* Dashboard v77: the call lives in lib/sendFeedback (the one send path). Your notes v1: severity is no longer asked,
         and every note asks for a reply — it can be answered on Your notes. */
      await sendFeedback({
        kind, message: d.message.trim(), severity: "", wantsReply: true, pageName, route: location.pathname, viewport,
        browser: typeof navigator === "undefined" ? "" : navigator.userAgent, browserName, appVersion: version,
        screenshotPath,
      });
      setSent({ kind, message: d.message.trim(), page: pageName });
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
    const n = POP_TILES.length;
    const go = e.key === "ArrowRight" || e.key === "ArrowDown" ? (i + 1) % n : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (i - 1 + n) % n : -1;
    if (go < 0) return;
    e.preventDefault();
    pick(POP_TILES[go].key);
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>(`[data-fb='kind'][data-key="${POP_TILES[go].key}"]`)?.focus());
  };

  const seeNotes = () => { close(); navigate("/your-notes"); };
  const notesLink = (
    <button type="button" className="fb3-notes" data-fb="your-notes" onClick={seeNotes}>
      {POP_NOTES}{newReplies > 0 ? <i data-fb="new-replies">{newReplies} new</i> : null}
    </button>
  );
  const copy = sentCopy(cardTier(stats), name);

  const top = (
    <div className="d22-top fb3-top">
      <Tag foundingNo={stats.foundingNo} />
      <button type="button" className="fb3-x" aria-label={FEEDBACK_CLOSE_LABEL} data-fb="close" onClick={close}>{X}</button>
    </div>
  );

  const body = state === "sent" && sent ? (
    <>
      <div className="fb3-b fb3-done" data-fb="sent">
        <span className="fb3-hawk"><img src={FEEDBACK_HAWK} alt="" /></span>
        <h3 id="fb-t">{copy.title}</h3>
        <p className="fb3-lead">{copy.body}</p>
        <div className="fb3-sent" data-fb="sent-note">
          <span className="fb3-nk" aria-hidden="true">{ICONS[composeKeyOf(sent.kind) ?? "dont"]}</span>
          <div><b>{rowTitle({ title: null, message: sent.message })}</b><span>{kindWords(sent.kind)}{sent.page ? ` · from ${sent.page}` : ""}</span></div>
          <i className="fb3-oc">Not read yet</i>
        </div>
      </div>
      <div className="fb3-f">
        <RankFoot read={statsRead} />
        <button type="button" className="fb3-notes" data-fb="again" onClick={() => { setState("idle"); setSent(null); }}>Send another</button>
        <button type="button" className="fb3-btn" data-fb="see-notes" onClick={seeNotes}>See your notes</button>
      </div>
    </>
  ) : (
    <>
      <div className="fb3-b">
        <div className="fb3-h">
          <span className="fb3-hawk"><img src={FEEDBACK_HAWK} alt="" /></span>
          <div><h3 id="fb-t">{POP_TITLE}</h3><p>{POP_SUB}</p></div>
        </div>
        <div className={`fb3-ks${key ? " picked" : ""}`} role="radiogroup" aria-label="What kind of note" data-fb="kinds">
          {POP_TILES.map((t, i) => (
            <button key={t.key} type="button" role="radio" aria-checked={key === t.key} className="fb3-k" data-fb="kind" data-key={t.key}
              data-k={t.key === "dont" && key === "dont" && kind ? kind : composeFor(t.key).kind}
              tabIndex={key ? (key === t.key ? 0 : -1) : i === 0 ? 0 : -1}
              onKeyDown={(e) => onKindKey(e, i)} onClick={() => pick(t.key)}>
              <span className="fb3-ki" aria-hidden="true">{ICONS[t.key]}</span><b>{t.label}</b><small>{t.line}</small>
            </button>
          ))}
        </div>
        {spec && kind ? (
          <div className="fb3-w">
            <label className="fb3-q" htmlFor="fb-msg" data-fb="question">{spec.question}</label>
            {key === "dont" ? (
              <div className="fb3-chips" role="radiogroup" aria-label="Which is it?" data-fb="chips">
                {DONT_CHIPS.map((c) => (
                  <button key={c.kind} type="button" role="radio" aria-checked={kind === c.kind} data-fb="chip" data-k={c.kind}
                    onClick={() => { update({ kind: c.kind }); requestAnimationFrame(() => msgRef.current?.focus()); }}>{c.label}</button>
                ))}
              </div>
            ) : null}
            <textarea id="fb-msg" ref={msgRef} className="fb3-ta" placeholder={spec.placeholder} maxLength={FEEDBACK_MAX} value={d.message} data-fb="message"
              onChange={(e) => { update({ message: e.target.value }); if (state === "failed") setState("idle"); }}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send(); } }} />
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
            <p className="fb3-ctx" data-fb="context">{sentWithLine(pageName)}</p>
          </div>
        ) : null}
      </div>
      {state === "failed" && error ? <p className="fb-err fb-err--send" role="alert" data-fb="error">{error}</p> : null}
      <div className="fb3-f">
        <RankFoot read={statsRead} />
        {notesLink}
        <button type="button" className="fb3-btn" data-fb="send" disabled={!ready || state === "sending"} onClick={() => void send()}>
          {state === "sending" ? FEEDBACK_SENDING : POP_SEND}
        </button>
      </div>
    </>
  );

  return (
    <AnchoredPortal>
      <div ref={panelRef} className="fb-panel fb3" role="dialog" aria-labelledby="fb-t" data-fb="panel" style={place}
        onPaste={(e) => {
          if (!takesScreenshot(kind) || !uid) return;
          const f = [...(e.clipboardData?.files ?? [])][0];
          if (f) { e.preventDefault(); takeFile(f); }
        }}>
        <div className="fb3-frame d58 d2">
          {top}
          {body}
        </div>
      </div>
    </AnchoredPortal>
  );
};
