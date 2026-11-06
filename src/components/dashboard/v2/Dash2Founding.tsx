/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard v2.2 · the founding writer band (Parts C–E; ref design-refs/dashboard-v2-2, screens/01, 03–08).
 *
 * A full-width band under the navy header (v2.1's card in the middle column is retired). A striped top strip ("Founding
 * writer", the No. pill, the prize line with How it works, the fold button), then a three-column body:
 *   the rank  — the badge (the rank's art in a rose-ringed disc), "You're a/an", the rank;
 *   the road  — the five birds, Fledgling to QueryHawk: future birds greyed, reached ones in colour with a tick, the next
 *               one tagged, and a rose fill from Fledgling's centre showing how far along the writer is;
 *   the ask   — one line and three pills (Like · Don't like · Idea), each opening FeedbackDock with its kind chosen;
 * and, once the writer has sent a note, "Your last note" with what became of it.
 *
 * Part D: on a load where the rank is above the one last celebrated (`users.foundingSeenTier`, v105's field — the
 * pack's `celebratedRank`), the rank-up plays once and the field is written. Absent → written silently.
 * Part E: the fold (`todoPrefs.dash.foundingFolded`) is a 62px strip. A rank-up load shows the band unfolded without
 * changing the stored fold.
 *
 * ⚠️ EVERY FIGURE IS THE BUILT FOUNDING DATA: `useFoundingStats` (the server's tiers), `useLatestNote` (`betaFeedback`),
 * v105's art and How it works. The words and the fill are lib/foundingBand, over `TIERS`. Nothing here sets a threshold.
 * ⚠️ NO HEADINGS: brand.tsx forces a face on bare h1–h3; the band's names are spans.
 */
import React, { useEffect, useRef, useState } from "react";
import "./dash2Founding.css";
import { cardTier, useFoundingStats } from "../../../lib/foundingStats";
import { composeFor, RANK_NAMES, type ComposeKey } from "../../../lib/foundingCard";
import { feedbackDraft, openFeedback, setFeedbackDraft } from "../../../lib/feedbackStore";
import { useLatestNote } from "../../../lib/foundingNotes";
import { askLine, BIRDS, birdHover, birdState, birdSub, firstLine, foldStatus, outcomeDone, rankUpDecision, roadFill, seenRank, TOP_TIER } from "../../../lib/foundingBand";
import { EggNest, ICONS, headFor } from "../v105/foundingArt";
import { Dash105How } from "../v105/Dash105How";

export const PRIZE_LINE = "Top contributors win a weekly prize";
export const HOW_LINK = "How it works";
export const LAST_NOTE = "Your last note";
const TILES: readonly { key: ComposeKey; label: string }[] = [
  { key: "like", label: "Like" }, { key: "dont", label: "Don’t like" }, { key: "idea", label: "Idea" },
];
/* the eight sparks of the rank-up, from the ref */
const SPARKS: readonly [number, number][] = [[-44, -30], [40, -36], [50, 14], [-48, 18], [-10, -52], [14, 50], [-30, 46], [34, 40]];

const Chevron: React.FC<{ up: boolean }> = ({ up }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="d22-gl"><path d={up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} /></svg>
);
const TICK = <svg viewBox="0 0 24 24" aria-hidden="true" className="d22-tki"><path d="M5 12.5l4.5 4.5L19 7" /></svg>;

/** a rank's art: the bird's head, or the egg */
const Art: React.FC<{ tier: number }> = ({ tier }) => {
  const h = headFor(tier);
  return h ? <img src={h} alt="" draggable={false} /> : <EggNest className="d105-nest d22-egg" />;
};

const Tell: React.FC<{ small?: boolean }> = ({ small }) => {
  const tell = (k: ComposeKey) => { setFeedbackDraft({ ...feedbackDraft(), kind: composeFor(k).kind }); openFeedback(); };
  return (
    <div className={`d22-tell${small ? " d22-tell--sm" : ""}`}>
      {TILES.map((t) => (
        <button key={t.key} type="button" data-d2="fw-tell" data-key={t.key} onClick={() => tell(t.key)}>
          <span className="d22-ti">{ICONS[t.key]}</span><span>{t.label}</span>
        </button>
      ))}
    </div>
  );
};

type Aid = { __SA_FOUNDING_STATS?: { seen?: unknown } | null };

export const Dash2Founding: React.FC<{
  loading: boolean;
  uid: string | null;
  /** `users.foundingSeenTier`: the rank last celebrated; undefined = never stored */
  seenTier?: number | null;
  /** stores the rank celebrated; absent (the onboarding ghost, the example) → no rank-up and no write */
  onSeen?: (tier: number) => void | Promise<void>;
  /** the stored fold */
  folded: boolean;
  /** stores the fold; absent → the fold is this view's only */
  onFold?: (folded: boolean) => void | Promise<void>;
}> = ({ loading, uid, seenTier, onSeen, folded, onFold }) => {
  const { loading: sLoading, error: sError, stats, aided } = useFoundingStats(uid);
  const notes = useLatestNote(uid);
  const [howOpen, setHowOpen] = useState(false);
  const howRef = useRef<HTMLButtonElement | null>(null);
  const busy = loading || sLoading;
  const tier = cardTier(stats);
  const done = stats.contributions;
  const top = tier >= TOP_TIER;
  const rank = RANK_NAMES[tier];

  /* ── Part D · the rank-up: decided whenever the rank OR the stored rank changes, played and written once per rank.
     ⚠️ KEYED ON BOTH: the user doc can arrive first from Firestore's persistent cache and then from the server, so a
     decision taken on the cached value alone could miss a rank-up the server's value calls for. ── */
  const [up, setUp] = useState<{ from: number; to: number } | null>(null);
  const handled = useRef<string | null>(null);
  const played = useRef<number | null>(null);
  useEffect(() => {
    if (busy || sError) return;
    const aidSeen = aided && typeof window !== "undefined" ? (window as unknown as Aid).__SA_FOUNDING_STATS?.seen : undefined;
    const seen = aided ? (typeof aidSeen === "number" ? aidSeen : undefined) : seenTier;
    if (!aided && !onSeen) return;
    const key = `${tier}|${seenRank(seen) ?? "-"}`;
    if (handled.current === key) return;
    handled.current = key;
    const d = rankUpDecision(tier, seen);
    if (d === "none") return;
    if (d === "play") {
      if (played.current === tier) return;
      played.current = tier;
      setUp({ from: tier - 1, to: tier });
    }
    /* the aid's stats are not the writer's: nothing derived from them is written (v105) */
    if (!aided) void onSeen?.(tier);
  }, [busy, sError, aided, tier, seenTier, onSeen]);

  /* the eight sparks burst outward ~50px at 1.45s and fade (0.8s). By the Web Animations API, because each spark's
     offset is its own and a var() inside @keyframes fails silently in this setup. Nothing under reduced motion. */
  const badgeRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const el = badgeRef.current;
    if (!up || !el || typeof el.animate !== "function") return undefined;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const anims = Array.from(el.querySelectorAll<HTMLElement>(".d22-sp")).map((sp) => sp.animate(
      [{ opacity: 1, transform: "translate(0, 0)" }, { opacity: 0, transform: `translate(${sp.dataset.dx}px, ${sp.dataset.dy}px)` }],
      { duration: 800, delay: 1450, easing: "ease-out", fill: "forwards" },
    ));
    return () => anims.forEach((a) => a.cancel());
  }, [up]);

  /* ── Part E · the fold: the stored value, held locally so the click answers at once ── */
  const [foldNow, setFoldNow] = useState<boolean | null>(null);
  const storedFold = foldNow ?? folded;
  const showFolded = storedFold && !up;
  const toggleFold = () => {
    const next = !showFolded;
    setFoldNow(next);
    if (up) setUp(null);
    void onFold?.(next);
  };

  const prefix = busy ? " " : firstLine(tier, !!up);
  const ask = askLine(tier, done, !!up);
  const fill = busy ? null : roadFill(tier, done);
  const no = stats.foundingNo;
  const tag = (
    <span className="d22-tag" data-d2="fw-tag">Founding writer{no ? <i data-d2="fw-no">No. {no}</i> : null}</span>
  );
  const foldBtn = (
    <button type="button" className="d22-fold" data-d2="fw-fold" aria-expanded={!showFolded}
      aria-label={showFolded ? "Show founding writer" : "Fold founding writer"} onClick={toggleFold}>
      <Chevron up={!showFolded} />
    </button>
  );
  const common = {
    role: "group", "aria-label": "Founding writer", "data-d2-card": "founding", "data-loading": busy ? "1" : "0",
    "data-tier": busy ? undefined : tier, "data-done": busy ? undefined : done,
  } as const;

  if (showFolded) {
    const fs = foldStatus(tier, done);
    return (
      <section {...common} className="d22-fw is-folded" data-folded="1">
        <div className="d22-strip">
          <span className="d22-fbadge" aria-hidden="true">{busy ? null : <Art tier={tier} />}</span>
          {tag}
          <span className="d22-fstat" data-d2="fw-fstat">
            <b className="d22-frank">{busy ? " " : rank}</b>
            {!busy && <> <em>{fs.bold}</em>{fs.rest}</>}
          </span>
          <Tell small />
          {foldBtn}
        </div>
      </section>
    );
  }

  return (
    <section {...common} className={`d22-fw${top ? " is-top" : ""}`} data-folded="0" data-up={up ? "1" : undefined}>
      <div className="d22-top">
        {tag}
        <span className="d22-prize">
          {ICONS.idea}
          <span>{PRIZE_LINE} · </span>
          <button ref={howRef} type="button" className="d22-how" data-d2="fw-how" aria-haspopup="dialog" aria-expanded={howOpen} onClick={() => setHowOpen(true)}>{HOW_LINK}</button>
        </span>
        {foldBtn}
      </div>
      <div className="d22-body">
        <div className="d22-me" data-d2="fw-top">
          <span ref={badgeRef} className={`d22-badge${up ? " is-hatch" : ""}`} data-d2="fw-badge" aria-hidden="true">
            {busy ? null : up ? (
              <>
                <span className="d22-prev"><Art tier={up.from} /></span>
                <span className="d22-new"><Art tier={up.to} /></span>
                {SPARKS.map(([x, y], k) => <i key={k} className="d22-sp" data-dx={x} data-dy={y} />)}
              </>
            ) : <Art tier={tier} />}
          </span>
          <span className={`d22-metx${up ? " is-up" : ""}`}>
            <small data-d2="fw-pre">{prefix}</small>
            <b className="d22-rank" data-d2="fw-rank">{busy ? " " : rank}</b>
          </span>
        </div>
        <ol className="d22-road" data-d2="fw-road" aria-label="The road to QueryHawk">
          {fill !== null && <span className="d22-fill" data-d2="fw-fill" data-steps={fill.toFixed(4)} style={{ width: `calc((100% - 70px) * ${fill / (BIRDS.length - 1)})` }} />}
          {BIRDS.map((b) => {
            const st = busy ? "future" : birdState(b.tier, tier);
            const isNew = !!up && b.tier === up.to;
            const tipId = `d22-tip-${b.tier}`;
            return (
              <li key={b.name} className={`is-${st}${isNew ? " is-new" : ""}`} data-d2="fw-step" data-state={st} data-tier={b.tier}
                tabIndex={st === "reached" || busy ? undefined : 0} aria-describedby={st === "reached" || busy ? undefined : tipId}>
                <span className="d22-avw">
                  <span className="d22-av"><img src={headFor(b.tier) ?? ""} alt="" draggable={false} /></span>
                  {st === "reached" && <span className="d22-tk" data-d2="fw-tick">{TICK}</span>}
                </span>
                <b>{b.name}</b>
                <small data-d2="fw-sub">{busy ? " " : birdSub(b.tier, tier)}</small>
                {st !== "reached" && !busy && (
                  <span className="d22-tip" id={tipId} role="tooltip" data-d2="fw-tip">
                    <span className="d22-tn">{b.name}</span>
                    <span className="d22-tc">{birdHover(b.tier, done)}</span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <div className="d22-ask" data-d2="fw-ask">
          <p data-d2="fw-next">{busy ? " " : <><b>{ask.bold}</b>{ask.rest}</>}</p>
          <Tell />
        </div>
        {!busy && !notes.loading && !notes.error && notes.note && (
          <div className="d22-last" data-d2="fw-note">
            <span className="d22-lt">{LAST_NOTE}</span>
            <em data-d2="fw-quote">“{notes.note.text}”</em>
            <i className={outcomeDone(notes.note.outcome) ? "is-done" : undefined} data-d2="fw-outcome">{outcomeDone(notes.note.outcome) && TICK}{notes.note.outcome}</i>
          </div>
        )}
      </div>
      <Dash105How open={howOpen} onClose={() => { setHowOpen(false); requestAnimationFrame(() => howRef.current?.focus()); }} />
    </section>
  );
};
