/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.2 Part A — the row's shared pieces, each ONE component used by every surface that shows it:
 *
 *   GenrePills   the book's matching genres first (powder, ticked), the rest on paper, at most three, then "+n" — the
 *                List rows, the agent card, the wide card and Cards all draw this one
 *   QueryPill    the StatusDot glyph and the stage on #efeae2 — the row and the agent card's header share it
 *   Track        sent · partial · full · offer; the current step is the stage's own StatusDot (lib/queryTrack)
 *   Tally        five bars for your rating, as the Getting started pill draws them; clickable on the cards
 *   NIB          the Contact list doodle tile's nib, redrawn as a 14px icon: the wishlist line's lead-in
 *
 * ⚠️ A STATUS IS DRAWN ONLY BY StatusDot, in ink: the track's current node is a StatusDot laid over the line drawing,
 *    never a circle drawn to look like one.
 */
import React from "react";
import { StatusDot } from "../StatusDot";
import { QueryStatus } from "../../types";
import { STAGE_NAME } from "../../lib/qcSummary";
import { queryTrack, type TrackDates } from "../../lib/queryTrack";
import "./agentRowParts.css";

/* ── genre pills ─────────────────────────────────────────────────────────────────────────────────────────────── */

export const GenrePills: React.FC<{
  genres: readonly string[];
  hit: (raw: string) => boolean;
  word: (raw: string) => string;
  max?: number;
  /** what an empty list says; null draws nothing */
  empty?: React.ReactNode;
  className?: string;
}> = ({ genres, hit, word, max = 3, empty = "No genres yet", className }) => {
  const ordered = [...genres.filter((g) => hit(g)), ...genres.filter((g) => !hit(g))];
  const shown = ordered.slice(0, max);
  if (!shown.length) return empty == null ? null : <em className="cl252-none" data-cl252="pills-none">{empty}</em>;
  return (
    <span className={`cl252-pills${className ? ` ${className}` : ""}`} data-cl252="pills" data-total={genres.length} data-shown={shown.length}>
      {shown.map((g) => (
        <span key={g} className={`cl252-pill${hit(g) ? " hit" : ""}`} data-cl252="pill" data-hit={hit(g) ? "" : undefined}>
          {hit(g) ? "✓ " : null}{word(g)}
        </span>
      ))}
      {genres.length > shown.length ? <em className="cl252-more" data-cl252="pill-more" data-n={genres.length - shown.length}>+{genres.length - shown.length}</em> : null}
    </span>
  );
};

/* ── the status pill ─────────────────────────────────────────────────────────────────────────────────────────── */

export const QueryPill: React.FC<{ status: QueryStatus | string; data?: Record<string, string> }> = ({ status, data }) => (
  <span className="cl252-qpill" data-cl252="qpill" data-status={String(status)} {...data}>
    <StatusDot status={status as QueryStatus} overrideSize={15} decorative />
    <span>{STAGE_NAME[status as keyof typeof STAGE_NAME] ?? String(status)}</span>
  </span>
);

/* ── the track ───────────────────────────────────────────────────────────────────────────────────────────────── */

const TX = [5, 27, 49, 71];

export const Track: React.FC<{ status: QueryStatus | string; dates?: TrackDates | null }> = ({ status, dates }) => {
  const t = queryTrack(status, dates);
  return (
    <span className="cl252-track" data-cl252="track" data-index={t.index} data-closed={t.closed ? "" : undefined}
      data-past={t.steps.filter((s) => s.state === "past").length} aria-hidden="true">
      <svg viewBox="0 0 78 12" width="78" height="12">
        {t.lines.map((l, k) => (
          <line key={`l${k}`} x1={TX[k] + 4} y1="6" x2={TX[k + 1] - 4} y2="6" stroke={l === "on" ? "#2a3a52" : "#d8d1c7"} strokeWidth="1.6" />
        ))}
        {t.steps.map((s, k) => s.state === "past"
          ? <circle key={k} data-cl252="track-past" cx={TX[k]} cy="6" r="3.4" fill="#2a3a52" />
          : s.state === "future" ? <circle key={k} data-cl252="track-future" cx={TX[k]} cy="6" r="3.2" fill="#fff" stroke="#cfc7bc" strokeWidth="1.4" />
          : null)}
      </svg>
      {/* the current step: the stage's own glyph, 12px (its ring is r 5) */}
      <span className="cl252-tnode" data-cl252="track-node" style={{ left: TX[t.index] - 6 }}>
        <StatusDot status={status as QueryStatus} overrideSize={12} decorative />
      </span>
    </span>
  );
};

/* ── the tally bars ──────────────────────────────────────────────────────────────────────────────────────────── */

export const Tally: React.FC<{ n: number | null | undefined; onSet?: (n: 1 | 2 | 3 | 4 | 5) => void; label?: boolean }> = ({ n, onSet, label = true }) => {
  const v = typeof n === "number" && n > 0 ? Math.min(5, Math.round(n)) : 0;
  return (
    <span className={`cl252-tally${onSet ? " set" : ""}`} data-cl252="tally" data-n={v} role={onSet ? "radiogroup" : undefined}
      aria-label={v ? `Your rating: ${v} of 5` : "Not rated"}>
      <span className="cl252-bars">
        {[1, 2, 3, 4, 5].map((k) => onSet ? (
          <button key={k} type="button" role="radio" aria-checked={k === v} aria-label={`${k} of 5`} data-cl252="bar" data-k={k}
            className={k <= v ? "on" : undefined} onClick={(e) => { e.stopPropagation(); onSet(k as 1 | 2 | 3 | 4 | 5); }} />
        ) : <i key={k} data-cl252="bar" data-k={k} className={k <= v ? "on" : undefined} />)}
      </span>
      {label ? <b data-cl252="tally-label" className={v ? undefined : "nr"}>{v ? `${v}/5` : "—"}</b> : null}
    </span>
  );
};

/* ── the nib ─────────────────────────────────────────────────────────────────────────────────────────────────── */

export const NIB = (
  <svg className="cl252-nib" data-cl252="nib" viewBox="-26 -26 52 52" width="14" height="14" aria-hidden="true">
    <g transform="rotate(40)" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M0 -24 L10 2 L0 22 L-10 2 Z" /><path d="M0 -4 V22" />
    </g>
  </svg>
);
