/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v105 — THE FOUNDING CARD IS A PRESS ID (ref design-refs/dashboard-v105/founding-flow-v104.html, normative).
 *
 * The ID strip (the QueryHawk mark, the writer's name, "FOUNDING WRITER · No. 023", an ⓘ that opens How it works), then
 * a body that is one of four things, in place:
 *   idle       the photo box (the egg, the cracked egg, or the tier's head), "Your feedback shapes QueryHawk", three
 *              feedback buttons, and the ranks strip (six heads and the prize-draw note)
 *   write      the kind's question, a textarea and Send — feedback is composed IN the card (lib/sendFeedback)
 *   sent       the thank-you; at tier 0 the egg cracks
 *   celebrate  the hatch (tier 1) or a rank-up (2–5), once per new rank (`users.foundingSeenTier`)
 * The sidebar's Give feedback (FeedbackDock) is unchanged, and the Compact card opens it, preset to the kind.
 *
 * ⚠️ THE CARD STEPS BY ITS OWN SIZE, NEVER THE WINDOW'S (a size container, dash105.css): width ≥460 is the ref; 330–459
 *    narrows the photo and grids the buttons; <330 drops the photo (a head joins the strip); height <230 folds the ranks
 *    note; <150 is the Compact row. Bodies that differ by variant are both in the DOM; CSS shows one.
 * ⚠️ THE NUMBER IS THE WAITLIST'S OR NONE: "FOUNDING WRITER" alone where no place is proven (Nick, 27 Oct).
 * ⚠️ NO GREEN, AND NO "NICK": "us", "we" or "our founder".
 */
import React, { useEffect, useRef, useState } from "react";
import { FEEDBACK_MAX, type FeedbackKind } from "../../../lib/beta";
import { feedbackDraft, feedbackPage, openFeedback, setFeedbackDraft } from "../../../lib/feedbackStore";
import { feedbackContext, sendFeedback } from "../../../lib/sendFeedback";
import { cardTier, useFoundingStats } from "../../../lib/foundingStats";
/* ⚠️ PART B: the ⓘ opens v93's panel until Part D's slides replace it. */
import { HowPanel } from "../v93/Dash93Founding";
import {
  COMPOSE, COMPOSE_NOTE, DONT_CHIPS, IDLE, RANK_NAMES, SEND_FAILED, canSend, composeFor, idLine, sentCopy, type ComposeKey,
} from "../../../lib/foundingCard";
import { EggNest, HatchScene, ICONS, INFO_ICON, QUERYHAWK_MARK, headFor } from "./foundingArt";

export interface Dash105FoundingProps {
  loading: boolean;
  uid: string | null;
  /** the writer's display name (the strip's name; the first word thanks them) */
  name: string | null;
  /** `users.foundingSeenTier`: the rank last celebrated */
  seenTier?: number | null;
  /** records a celebrated rank. Absent (the onboarding ghost) → the card never celebrates and never writes. */
  onSeen?: (tier: number) => void | Promise<void>;
}

type Mode = "idle" | "write" | "sent";

/** The photo box (idle): the egg, the cracked egg while a note waits, or the tier's head. */
const Photo: React.FC<{ tier: number; waiting: number }> = ({ tier, waiting }) => {
  const hatching = tier === 0 && waiting > 0;
  const head = headFor(tier);
  const label = tier === 0 ? (hatching ? "HATCHING" : "EGG") : RANK_NAMES[tier].toUpperCase();
  return (
    <div className={`d105-photo${hatching ? " is-hatching" : ""}`} data-d105="photo" data-photo={head ? "head" : hatching ? "hatching" : "egg"}>
      {head ? <img className="d105-phead" src={head} alt="" draggable={false} /> : hatching ? <div className="d105-phx"><HatchScene bird={null} /></div> : <EggNest />}
      <small data-d105="photo-label">{label}</small>
    </div>
  );
};

/** The six rank heads: the passed and current in colour, the current ringed in ink, the future grey. */
const Ranks: React.FC<{ tier: number }> = ({ tier }) => (
  <ol className="d105-heads" data-d105="heads" aria-label="Ranks">
    {RANK_NAMES.map((n, i) => {
      const st = i < tier ? "done" : i === tier ? "you" : "future";
      const head = headFor(i);
      return (
        <li key={n} className={`d105-hd is-${st}`} data-d105="head" data-state={st} title={n} aria-current={st === "you" ? "step" : undefined}>
          {head ? <img src={head} alt={n} draggable={false} /> : <><EggNest className="d105-hnest" /><span className="d105-sr">{n}</span></>}
        </li>
      );
    })}
  </ol>
);

export const Dash105Founding: React.FC<Dash105FoundingProps> = ({ loading, uid, name, seenTier, onSeen }) => {
  const { loading: statsLoading, error, stats } = useFoundingStats(uid);
  const [mode, setMode] = useState<Mode>("idle");
  const [kind, setKind] = useState<ComposeKey>("like");
  const [chip, setChip] = useState<FeedbackKind>(DONT_CHIPS[0].kind);
  const [drafts, setDrafts] = useState<Record<ComposeKey, string>>({ like: "", dont: "", idea: "" });
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sentTier, setSentTier] = useState(0);
  const [howOpen, setHowOpen] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const infoRef = useRef<HTMLButtonElement>(null);

  const tier = cardTier(stats);
  const ready = !loading && !statsLoading;
  void error; void seenTier; void onSeen;


  useEffect(() => { if (mode === "write") requestAnimationFrame(() => textRef.current?.focus()); }, [mode, kind]);

  const open = (k: ComposeKey) => { setKind(k); setFailed(false); setMode("write"); };
  /** Compact: the sidebar's panel, preset to the kind (its own draft text is kept). */
  const openDock = (k: ComposeKey) => {
    const spec = composeFor(k);
    setFeedbackDraft({ ...feedbackDraft(), kind: spec.kind });
    openFeedback();
  };
  const spec = composeFor(kind);
  const text = drafts[kind];
  const send = async () => {
    if (!canSend(text) || sending) return;
    setSending(true);
    setFailed(false);
    try {
      await sendFeedback({
        kind: kind === "dont" ? chip : spec.kind, message: text.trim(), severity: "", wantsReply: true,
        pageName: feedbackPage() ?? "Dashboard", screenshotPath: "", ...feedbackContext(),
      });
      setDrafts((d) => ({ ...d, [kind]: "" }));
      setSentTier(tier);
      setMode("sent");
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  };

  if (!ready) {
    return (
      <section className="d105-fw is-loading d58-skcard" data-sk="card" data-d58="panel" data-d71="fw" data-loading="1" aria-hidden="true">
        {/* the strip keeps its line while the stats load (hidden, as every loading card's contents are), so the card is
            the same box before and after, and the page's smoke can name it */}
        <div className="d105-frame"><div className="d105-strip"><div className="d105-id"><em className="d105-no">{idLine(null)}</em></div></div><div className="d105-body" /></div>
      </section>
    );
  }

  const state: Mode = mode;
  const sent = sentCopy(sentTier, name);
  const head = headFor(tier);

  return (
    <section
      className="d105-fw" data-d58="panel" data-d71="fw" data-d105="card" data-loading="0" data-tier={tier} data-waiting={stats.waiting}
      data-state={state} aria-label="Founding writer"
    >
      <div className="d105-frame">
        {/* ── the ID strip ── */}
        <header className="d105-strip" data-d105="strip">
          <img className="d105-mark" src={QUERYHAWK_MARK} alt="" draggable={false} data-d105="mark" />
          <i className="d105-shead" aria-hidden="true" data-d105="strip-head">{head ? <img src={head} alt="" draggable={false} /> : <EggNest className="d105-hnest" />}</i>
          <div className="d105-id">
            <b className="d105-name" data-d105="name" title={name ?? undefined}>{name}</b>
            <em className="d105-no" data-d105="no">{idLine(stats.foundingNo)}</em>
          </div>
          <button
            ref={infoRef} type="button" className="d105-info" data-d105="info" aria-label="How it works" aria-haspopup="dialog"
            aria-expanded={howOpen} title="How it works" onClick={() => setHowOpen(true)}
          >{INFO_ICON}</button>
        </header>

        {/* ── idle (Full and Medium) ── */}
        {state === "idle" && (
          <div className="d105-body d105-idle" data-d105="idle">
            <div className="d105-pv">
              <Photo tier={tier} waiting={stats.waiting} />
              <div className="d105-pvr">
                <p className="d105-h" data-d105="title">{IDLE.title}</p>
                <p className="d105-p" data-d105="line">{IDLE.line}</p>
                <div className="d105-btns" data-d105="buttons">
                  {COMPOSE.map((c) => (
                    <button key={c.key} type="button" className="d105-btn" data-d105="kind" data-k={c.key} onClick={() => open(c.key)}>
                      <i aria-hidden="true">{ICONS[c.key]}</i><span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="d105-ranks" data-d105="ranks">
              <Ranks tier={tier} />
              <p className="d105-note" data-d105="note">{IDLE.ranks}</p>
            </div>
          </div>
        )}

        {/* ── idle, Compact (under 150px of card): three round buttons that open the sidebar's panel ── */}
        {state === "idle" && (
          <div className="d105-compact" data-d105="compact">
            {COMPOSE.map((c) => (
              <button key={c.key} type="button" className="d105-cbtn" data-d105="ckind" data-k={c.key} aria-label={c.label} title={c.label} onClick={() => openDock(c.key)}>
                {ICONS[c.key]}
              </button>
            ))}
            <span className="d105-cline" data-d105="compact-line">{IDLE.title}</span>
          </div>
        )}

        {/* ── write ── */}
        {state === "write" && (
          <div className="d105-body d105-write" data-d105="write" data-k={kind}>
            <div className="d105-wh">
              <i className="d105-wic" aria-hidden="true">{ICONS[kind]}</i>
              <p className="d105-wq" id="d105-wq" data-d105="question">{spec.question}</p>
              <button type="button" className="d105-wx" data-d105="cancel" aria-label="Cancel" onClick={() => { setFailed(false); setMode("idle"); }}>✕</button>
            </div>
            {kind === "dont" && (
              <div className="d105-chips" role="radiogroup" aria-label="What kind of problem" data-d105="chips">
                {DONT_CHIPS.map((c) => (
                  <button key={c.kind} type="button" role="radio" aria-checked={chip === c.kind} className={`d105-chip${chip === c.kind ? " on" : ""}`} data-d105="chip" data-kind={c.kind} onClick={() => setChip(c.kind)}>{c.label}</button>
                ))}
              </div>
            )}
            <div className="d105-wrow">
              <textarea
                ref={textRef} className="d105-ta" data-d105="text" aria-labelledby="d105-wq" placeholder={spec.placeholder} maxLength={FEEDBACK_MAX}
                value={text} onChange={(e) => setDrafts((d) => ({ ...d, [kind]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send(); } }}
              />
              <button type="button" className="d105-send d105-send--side" data-d105="send-side" disabled={!canSend(text) || sending} onClick={() => void send()}>{sending ? "Sending…" : "Send"}</button>
            </div>
            <div className="d105-wf">
              <p className={`d105-wn${failed ? " is-err" : ""}`} data-d105="note" role={failed ? "alert" : undefined}>{failed ? SEND_FAILED : COMPOSE_NOTE}</p>
              <button type="button" className="d105-send" data-d105="send" disabled={!canSend(text) || sending} onClick={() => void send()}>{sending ? "Sending…" : "Send"}</button>
            </div>
          </div>
        )}

        {/* ── sent ── */}
        {state === "sent" && (
          <div className="d105-body d105-sent" data-d105="sent" data-tier={sentTier}>
            {sentTier === 0
              ? <div className="d105-hx is-sent"><HatchScene bird={null} /></div>
              : <div className="d105-hx is-headsent"><img className="d105-hxhead" src={headFor(sentTier) ?? ""} alt="" draggable={false} /><i className="d105-tick" aria-hidden="true">✓</i></div>}
            <div className="d105-st" role="status">
              <p className="d105-h" data-d105="sent-title">{sent.title}</p>
              <p className="d105-p" data-d105="sent-body">{sent.body}</p>
              <div className="d105-sa"><button type="button" className="d105-lnk" data-d105="again" onClick={() => setMode("idle")}>Send another</button></div>
            </div>
          </div>
        )}

      </div>
      <HowPanel open={howOpen} onClose={() => { setHowOpen(false); requestAnimationFrame(() => infoRef.current?.focus()); }} id="d105-how" titleId="d105-how-h" />
    </section>
  );
};
