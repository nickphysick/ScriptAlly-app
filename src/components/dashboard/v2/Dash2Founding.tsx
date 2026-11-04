/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard v2.1 · the founding writer card (Part C; ref design-refs/dashboard-v2-1, screens/01 and 02).
 *
 * The same frame as the other cards, on a rose band ("Founding writer", then "No. {n} · How it works"). Under it:
 *   the hero  — a badge (a progress ring round the rank's art) beside "You're a/an", the rank, the next-step line and a
 *               compact road of six markers, "Egg" and "QueryHawk" at its ends;
 *   the ask   — one line and three pills (Like · Don't like · Idea), each opening FeedbackDock with its kind chosen;
 *   the note  — one line: "Your last note", the note, what became of it;
 *   the foot  — the prize line.
 *
 * ⚠️ EVERY FIGURE IS THE BUILT FOUNDING DATA, as v2's was: the rank and counts are `useFoundingStats` (the server's own
 * tiers, `TIERS`), the latest note is `useLatestNote` (`betaFeedback`), the art is v105's, the kind each pill presets is
 * `COMPOSE`'s, and How it works is v105's dialog. Nothing here sets a threshold.
 */
import React, { useRef, useState } from "react";
import "./dash2Founding.css";
import { TIERS, cardTier, useFoundingStats } from "../../../lib/foundingStats";
import { article, composeFor, RANK_NAMES, type ComposeKey } from "../../../lib/foundingCard";
import { feedbackDraft, openFeedback, setFeedbackDraft } from "../../../lib/feedbackStore";
import { noNotesLine, useLatestNote } from "../../../lib/foundingNotes";
import { EggNest, ICONS, headFor } from "../v105/foundingArt";
import { Dash105How } from "../v105/Dash105How";
import { Frame } from "./Frame";

export const ASK_LINE = "Tell us what works, what doesn’t and what you’d add.";
export const LAST_NOTE = "Your last note";
export const PRIZE_LINE = "Top contributors win a weekly prize.";
export const HOW_LINK = "How it works";
export const TOP_LINE = "You’ve reached QueryHawk. Thank you.";
const TILES: readonly { key: ComposeKey; label: string }[] = [
  { key: "like", label: "Like" }, { key: "dont", label: "Don’t like" }, { key: "idea", label: "Idea" },
];
/** each rank's notes: Egg is the start, then the server's own tier thresholds */
export const RANK_MIN: readonly number[] = [0, ...TIERS.map((t) => t.min)];

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
/** "One more note…", "Two more notes…": a small number is a word (as `nextStep` writes it), a large one a numeral */
const count = (n: number) => (n >= 0 && n <= 10 ? WORDS[n] : String(n));

/** The badge's ring: notes counted out of notes needed for the next rank; full at the top rank. */
export function ringRatio(tier: number, done: number): number {
  if (tier >= RANK_MIN.length - 1) return 1;
  const needed = RANK_MIN[tier + 1];
  return needed > 0 ? Math.max(0, Math.min(1, done / needed)) : 1;
}

/** The hero's line, in parts so the next rank can be set in rose. "hatch into" is the Egg's alone. */
export function heroLine(tier: number, done: number): { lead: string; rank: string | null; tail: string } {
  if (tier >= RANK_MIN.length - 1) return { lead: TOP_LINE, rank: null, tail: "" };
  const next = RANK_NAMES[tier + 1];
  const left = Math.max(1, RANK_MIN[tier + 1] - done);
  const notes = `${count(left)} more ${left === 1 ? "note" : "notes"}`;
  return { lead: `${notes} and you ${tier === 0 ? "hatch into" : "become"} ${article(next)} `, rank: next, tail: "." };
}

/* the ring: r 54 in a 120 box, so its length is fixed whatever size the badge is drawn at */
const R = 54;
const C = 2 * Math.PI * R;

const Marker: React.FC<{ i: number }> = ({ i }) => {
  const h = headFor(i);
  return h ? <img src={h} alt="" draggable={false} /> : <EggNest className="d105-hnest d2-hnest" />;
};

export const Dash2Founding: React.FC<{ loading: boolean; uid: string | null }> = ({ loading, uid }) => {
  const { loading: sLoading, stats } = useFoundingStats(uid);
  const notes = useLatestNote(uid);
  const [howOpen, setHowOpen] = useState(false);
  const howRef = useRef<HTMLButtonElement | null>(null);
  const busy = loading || sLoading;
  const tier = cardTier(stats); // 0 = Egg … 5 = QueryHawk
  const top = tier >= RANK_MIN.length - 1;
  const done = stats.contributions;
  const needed = top ? RANK_MIN[RANK_MIN.length - 1] : RANK_MIN[tier + 1];
  const ratio = ringRatio(tier, done);
  const line = heroLine(tier, done);
  const rank = RANK_NAMES[tier];
  const nextRank = top ? null : RANK_NAMES[tier + 1];
  const tell = (k: ComposeKey) => { setFeedbackDraft({ ...feedbackDraft(), kind: composeFor(k).kind }); openFeedback(); };
  const head = headFor(tier);

  return (
    <Frame tone="rose" label="Founding writer" probe="founding" loading={busy} className="d2-fw"
      data={{ tier: busy ? undefined : tier, done: busy ? undefined : done, needed: busy ? undefined : needed }}
      title="Founding writer"
      meta={
        <span className="d2-fwmeta">
          {stats.foundingNo ? <span data-d2="fw-no">No. {stats.foundingNo} · </span> : null}
          <button ref={howRef} type="button" className="d2-link" data-d2="fw-how" aria-haspopup="dialog" aria-expanded={howOpen} onClick={() => setHowOpen(true)}>{HOW_LINK}</button>
        </span>
      }>
      <div className="d2-fwbody">
        <div className="d2-fwhero" data-d2="fw-top">
          <div className="d2-fwbadge" data-d2="fw-badge">
            <svg className="d2-fwring" viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r={R} fill="none" stroke="#ecd6cd" strokeWidth="5" />
              {!busy && ratio > 0 && (
                <circle cx="60" cy="60" r={R} fill="none" stroke="#a0675a" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={`${(ratio * C).toFixed(2)} ${C.toFixed(2)}`} transform="rotate(-90 60 60)"
                  data-d2="fw-arc" data-ratio={ratio.toFixed(4)} />
              )}
            </svg>
            <div className="d2-fwart" aria-hidden="true">{head ? <img src={head} alt="" draggable={false} /> : <EggNest className="d105-nest d2-nest" />}</div>
          </div>
          <div className="d2-fwtx">
            <small data-d2="fw-pre">{busy ? " " : `You’re ${article(rank)}`}</small>
            <h3 className="d2-fwname" data-d2="fw-rank">{busy ? " " : rank}</h3>
            <p data-d2="fw-next">
              {busy ? " " : <>{line.lead}{line.rank && <b data-d2="fw-nextrank">{line.rank}</b>}{line.tail}</>}
            </p>
          </div>
          <div className="d2-fwroadw">
            <ol className="d2-road" data-d2="fw-road" aria-label="The road to QueryHawk">
              {RANK_NAMES.map((name, i) => {
                const on = !busy && i === tier;
                const next = !busy && i === tier + 1;
                return (
                  <li key={name} className={on ? "is-on" : next ? "is-next" : undefined} data-d2="fw-step" data-on={on ? "1" : undefined} data-next={next ? "1" : undefined}
                    title={name} aria-label={on ? `${name}, your rank` : name}>
                    <span className="d2-dt"><Marker i={i} /></span>
                  </li>
                );
              })}
            </ol>
            <div className="d2-roadends" aria-hidden="true"><span>{RANK_NAMES[0]}</span><span>{RANK_NAMES[RANK_NAMES.length - 1]}</span></div>
          </div>
        </div>
        <div className="d2-fwask">
          <p>{ASK_LINE}</p>
          <div className="d2-fwbtns">
            {TILES.map((t) => (
              <button key={t.key} type="button" data-d2="fw-tell" data-key={t.key} onClick={() => tell(t.key)}>{ICONS[t.key]}<span>{t.label}</span></button>
            ))}
          </div>
        </div>
        {!busy && !notes.loading && !notes.error && (
          notes.note ? (
            <div className="d2-fwnote" data-d2="fw-note">
              <span className="d2-fwtg">{LAST_NOTE}</span>
              <span className="d2-fwq" data-d2="fw-quote">“{notes.note.text}”</span>
              <span className={`d2-fwst${/in the app|fixed/i.test(notes.note.outcome) ? " is-done" : ""}`} data-d2="fw-outcome">{notes.note.outcome}</span>
            </div>
          ) : nextRank ? (
            <div className="d2-fwnote" data-d2="fw-none"><span className="d2-fwq d2-fwq--plain">{noNotesLine(nextRank)}</span></div>
          ) : null
        )}
        <div className="d2-fwf" data-d2="fw-foot">{PRIZE_LINE}</div>
      </div>
      <Dash105How open={howOpen} onClose={() => { setHowOpen(false); requestAnimationFrame(() => howRef.current?.focus()); }} />
    </Frame>
  );
};
