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
import {
  COMPOSE, COMPOSE_NOTE, DONT_CHIPS, IDLE, RANK_NAMES, SEND_FAILED, canSend, celebrateTier, celebrationCopy, composeFor,
  idLine, sentCopy, type ComposeKey,
} from "../../../lib/foundingCard";
import { EggNest, HatchScene, ICONS, INFO_ICON, QUERYHAWK_MARK, headFor } from "./foundingArt";
import { Dash105How } from "./Dash105How";
import { founderSwap } from "../../../lib/dashHover";
import "../v116/dash116Tilt.css";

export interface Dash105FoundingProps {
  loading: boolean;
  uid: string | null;
  /** the writer's display name (the strip's name; the first word thanks them) */
  name: string | null;
  /** `users.foundingSeenTier`: the rank last celebrated */
  seenTier?: number | null;
  /** records a celebrated rank. Absent (the onboarding ghost) → the card never celebrates and never writes. */
  onSeen?: (tier: number) => void | Promise<void>;
  /** Dashboard feed v1: the ranks strip's line in this card's place; absent → `IDLE.ranks` (every other mount) */
  ranksLine?: string;
}

type Mode = "idle" | "write" | "sent";

type Aid = { __SA_FOUNDING_SEEN?: unknown; __SA_FOUNDING_SEEN_WRITTEN?: number; __SA_FOUNDING_WRITE?: unknown };
/**
 * ⚠️ DEV REVIEW AID: `window.__SA_FOUNDING_SEEN = n` stands in for the stored seen-rank and records the "seen" write in
 * `window.__SA_FOUNDING_SEEN_WRITTEN` instead of writing the account, so the report's shots can play every celebration
 * without changing anything. Dead in a production build: `MODE` is replaced statically.
 */
function seenAid(): { seen: number } | null {
  if (import.meta.env.MODE === "production" || typeof window === "undefined" || !("__SA_FOUNDING_SEEN" in window)) return null;
  const v = (window as unknown as Aid).__SA_FOUNDING_SEEN;
  return { seen: typeof v === "number" ? v : 0 };
}

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

export const Dash105Founding: React.FC<Dash105FoundingProps> = ({ loading, uid, name, seenTier, onSeen, ranksLine }) => {
  const { loading: statsLoading, error, stats, aided } = useFoundingStats(uid);
  const [mode, setMode] = useState<Mode>("idle");
  const [kind, setKind] = useState<ComposeKey>("like");
  const [chip, setChip] = useState<FeedbackKind>(DONT_CHIPS[0].kind);
  const [drafts, setDrafts] = useState<Record<ComposeKey, string>>({ like: "", dont: "", idea: "" });
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sentTier, setSentTier] = useState(0);
  const [celebrating, setCelebrating] = useState<number | null>(null);
  const [howOpen, setHowOpen] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const infoRef = useRef<HTMLButtonElement>(null);
  const recorded = useRef(false);
  const [aid] = useState(seenAid);

  const tier = cardTier(stats);
  const ready = !loading && !statsLoading;

  /* ── the celebration: once the live stats are in, when the shown rank is above the rank last celebrated. Never over
     a note being written: it waits until the writer is back at idle or the thank-you. */
  const seen = aid ? aid.seen : seenTier;
  /* no writer (the onboarding ghost): no celebration, aid or not.
     ⚠️ A RANK WORKED OUT FROM AID-SUPPLIED STATS IS NOT THE WRITER'S, so it is recorded in the page and never written to
     the account — unless the page asks for the real write (`__SA_FOUNDING_WRITE`, DB105 C1). Measured: without this, a
     suite seeding a tier through the stats aid wrote that rank to the harness account. */
  const realWrite = !aided || (window as unknown as Aid).__SA_FOUNDING_WRITE === true;
  const record = !onSeen ? undefined : aid || !realWrite ? (t: number) => { (window as unknown as Aid).__SA_FOUNDING_SEEN_WRITTEN = t; } : onSeen;
  const want = ready && !error ? celebrateTier(tier, seen, !!record) : null;
  useEffect(() => {
    if (want != null && celebrating == null && !recorded.current && mode !== "write") setCelebrating(want);
  }, [want, celebrating, mode]);
  /* ⚠️ SEEN AS SOON AS IT RENDERS, so a reload never replays it — and once per mount, whatever the write's outcome. */
  useEffect(() => {
    if (celebrating == null || recorded.current) return;
    recorded.current = true;
    void Promise.resolve(record?.(celebrating)).catch(() => undefined);
  }, [celebrating, record]);


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
      <section className="d105-fw d116-tilt is-loading d58-skcard" data-sk="card" data-d58="panel" data-d71="fw" data-loading="1" aria-hidden="true">
        {/* the strip keeps its line while the stats load (hidden, as every loading card's contents are), so the card is
            the same box before and after, and the page's smoke can name it */}
        <div className="d105-frame"><div className="d105-strip"><div className="d105-id"><em className="d105-no">{idLine(null)}</em></div></div><div className="d105-body" /></div>
      </section>
    );
  }

  const state = celebrating != null ? "celebrate" : mode;
  const sent = sentCopy(sentTier, name);
  const cel = celebrating != null ? celebrationCopy(stats) : null;
  const head = headFor(tier);

  return (
    <section
      className="d105-fw d116-tilt" data-d58="panel" data-d71="fw" data-d105="card" data-loading="0" data-tier={tier} data-waiting={stats.waiting}
      data-state={state} aria-label="Founding writer"
    >
      <div className="d105-frame">
        {/* ── the ID strip ── */}
        <header className="d105-strip" data-d105="strip">
          <img className="d105-mark" src={QUERYHAWK_MARK} alt="" draggable={false} data-d105="mark" />
          <i className="d105-shead" aria-hidden="true" data-d105="strip-head">{head ? <img src={head} alt="" draggable={false} /> : <EggNest className="d105-hnest" />}</i>
          <div className="d105-id">
            <b className="d105-name" data-d105="name" title={name ?? undefined}>{name}</b>
            {/* ⚠️ DASHBOARD v116 — THE HEADER SWAP: on hover or focus-within, the ID line lifts out and the
                contributions line rises in. Both are laid out in one grid cell, so the strip never reflows. */}
            <em className="d105-no d105-swap">
              <span className="d105-swa" data-d105="no">{idLine(stats.foundingNo)}</span>
              <span className="d105-swb" data-d105="swap" aria-hidden="true">{founderSwap(stats)}</span>
            </em>
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
              <p className="d105-note" data-d105="note">{ranksLine ?? IDLE.ranks}</p>
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

        {/* ── the celebration ── */}
        {state === "celebrate" && cel && (
          <div className={`d105-body d105-cel ${celebrating === 1 ? "is-hatch" : "is-rankup"}`} data-d105="celebrate" data-tier={celebrating}>
            <div className={`d105-hx ${celebrating === 1 ? "is-hatch" : "is-rankup"}`}><HatchScene bird={headFor(celebrating ?? 1)} /></div>
            <div className="d105-st d105-ct" role="status">
              <p className="d105-kick" data-d105="cel-kicker">{cel.kicker}</p>
              <p className="d105-h" data-d105="cel-title">{cel.title}</p>
              <p className="d105-p d105-celbody" data-d105="cel-body">{cel.body}</p>
              <div className="d105-sa"><button type="button" className="d105-give" data-d105="give-more" onClick={() => { setCelebrating(null); setMode("idle"); }}>{cel.button}</button></div>
            </div>
          </div>
        )}
      </div>
      <Dash105How open={howOpen} onClose={() => { setHowOpen(false); requestAnimationFrame(() => infoRef.current?.focus()); }} />
    </section>
  );
};
