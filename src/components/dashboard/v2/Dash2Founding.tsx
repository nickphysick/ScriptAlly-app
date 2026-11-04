/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard v2 · the founding writer card (Part D; ref design-refs/dashboard-v2, screens/02).
 *
 * Under Active queries, in the same frame: the rank (art, name, what is next, a bar and "{done} of {needed} notes"),
 * "Tell us something" with Like / Don't like / Idea (each opens FeedbackDock with that kind chosen), the road to
 * QueryHawk, the writer's latest note and what became of it, and the prize line.
 *
 * ⚠️ EVERY FIGURE IS THE BUILT FOUNDING DATA: the rank and counts are `useFoundingStats` (the server's own tiers,
 * `TIERS` in lib/foundingStats), the next-step sentence is `nextStep`, the art is v105's, the kind each button presets
 * is `COMPOSE`'s, and How it works is v105's dialog. Nothing here invents a threshold.
 */
import React, { useRef, useState } from "react";
import "./dash2Founding.css";
import { TIERS, cardTier, useFoundingStats } from "../../../lib/foundingStats";
import { composeFor, nextStep, RANK_NAMES, type ComposeKey } from "../../../lib/foundingCard";
import { feedbackDraft, openFeedback, setFeedbackDraft } from "../../../lib/feedbackStore";
import { NO_NOTES, useLatestNote } from "../../../lib/foundingNotes";
import { MONTHS_SHORT } from "../../../lib/dates";
import { EggNest, ICONS, headFor } from "../v105/foundingArt";
import { Dash105How } from "../v105/Dash105How";

export const TELL_TITLE = "Tell us something";
export const TELL_LINE = "What works, what doesn’t, what you’d add. We read every one.";
export const ROAD_TITLE = "The road to QueryHawk";
export const NOTES_TITLE = "Your notes";
export const PRIZE_LINE = "Top contributors win a weekly prize.";
export const HOW_LINK = "How it works";
const TILES: readonly { key: ComposeKey; label: string }[] = [
  { key: "like", label: "Like" }, { key: "dont", label: "Don’t like" }, { key: "idea", label: "Idea" },
];
/** each rank's notes: Egg is the start, then the server's own tier thresholds */
export const RANK_MIN: readonly number[] = [0, ...TIERS.map((t) => t.min)];

const dayMonth = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };

export const Dash2Founding: React.FC<{ loading: boolean; uid: string | null }> = ({ loading, uid }) => {
  const { loading: sLoading, stats } = useFoundingStats(uid);
  const notes = useLatestNote(uid);
  const [howOpen, setHowOpen] = useState(false);
  const howRef = useRef<HTMLButtonElement | null>(null);
  const busy = loading || sLoading;
  const tier = cardTier(stats); // 0 = Egg … 5 = QueryHawk
  const head = headFor(tier);
  const done = stats.contributions;
  const needed = tier < RANK_MIN.length - 1 ? RANK_MIN[tier + 1] : RANK_MIN[RANK_MIN.length - 1];
  const pct = needed > 0 ? Math.min(100, Math.round((done / needed) * 100)) : 100;
  const tell = (k: ComposeKey) => { setFeedbackDraft({ ...feedbackDraft(), kind: composeFor(k).kind }); openFeedback(); };

  return (
    <section className="os-card d2-card d2-fw" role="group" aria-label="Founding writer" data-d2-card="founding" data-loading={busy ? "1" : "0"}
      data-tier={busy ? undefined : tier} data-done={busy ? undefined : done} data-needed={busy ? undefined : needed}>
      <div className="os-frame d2-fwframe">
        <div className="d2-fwtop" data-d2="fw-top">
          <div className="d2-fwtags">
            <span className="d2-fwno" data-d2="fw-no">{stats.foundingNo ? `Founding writer · No. ${stats.foundingNo}` : "Founding writer"}</span>
            <button ref={howRef} type="button" className="d2-fwhow" data-d2="fw-how" aria-haspopup="dialog" aria-expanded={howOpen} onClick={() => setHowOpen(true)}>{HOW_LINK}</button>
          </div>
          <div className="d2-fwrank">
            <div className="d2-fwart" aria-hidden="true">{head ? <img src={head} alt="" draggable={false} /> : <EggNest className="d105-nest d2-nest" />}</div>
            <div className="d2-fwtx">
              <h3 className="d2-fwname" data-d2="fw-rank">{busy ? " " : RANK_NAMES[tier]}</h3>
              <p data-d2="fw-next">{busy ? " " : nextStep(stats)}</p>
              <div className="d2-fwbar" aria-hidden="true"><i style={{ width: busy ? 0 : `${pct}%` }} /></div>
              <small data-d2="fw-count">{busy ? " " : `${done} of ${needed} notes`}</small>
            </div>
          </div>
        </div>
        <div className="d2-fwb">
          <h3 className="d2-fwh">{TELL_TITLE}</h3>
          <p className="d2-fwp">{TELL_LINE}</p>
          <div className="d2-fwbtns">
            {TILES.map((t) => (
              <button key={t.key} type="button" data-d2="fw-tell" data-key={t.key} onClick={() => tell(t.key)}>{ICONS[t.key]}<span>{t.label}</span></button>
            ))}
          </div>
        </div>
        <div className="d2-fwb d2-fwb--road">
          <h3 className="d2-fwh">{ROAD_TITLE}</h3>
          <ol className="d2-road" data-d2="fw-road">
            {RANK_NAMES.map((name, i) => {
              const h = headFor(i);
              const on = !busy && i === tier;
              return (
                <li key={name} className={on ? "is-on" : undefined} data-d2="fw-step" data-on={on ? "1" : undefined}>
                  <span className="d2-dt" aria-hidden="true">{h ? <img src={h} alt="" draggable={false} /> : <EggNest className="d105-hnest d2-hnest" />}</span>
                  <b>{name}</b>
                  <small>{on ? "now" : i === 0 ? "" : `${RANK_MIN[i]} notes`}</small>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="d2-fwb">
          <h3 className="d2-fwh">{NOTES_TITLE}</h3>
          {notes.loading || notes.error ? null : notes.note ? (
            <div className="d2-fwnote" data-d2="fw-note">
              <span className="d2-fwtg">{notes.note.tag}</span>{notes.note.text}
              <small>{notes.note.sentMs != null ? `Sent ${dayMonth(notes.note.sentMs)} · ` : ""}<b data-d2="fw-outcome">{notes.note.outcome}</b></small>
            </div>
          ) : <p className="d2-fwp" data-d2="fw-none">{NO_NOTES}</p>}
        </div>
        <div className="d2-fwf" data-d2="fw-foot">{PRIZE_LINE}</div>
      </div>
      <Dash105How open={howOpen} onClose={() => { setHowOpen(false); requestAnimationFrame(() => howRef.current?.focus()); }} />
    </section>
  );
};
