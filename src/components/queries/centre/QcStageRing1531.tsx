/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v153.1 (design-refs/query-centre-v153-1.html) — THE STAGE RING, "Where they are": the ring of five
 * buckets and its legend.
 *
 * v153.2 (design-refs/query-centre-v153-2.html): OPEN. No card, no navy bar and no artwork; the ring and the legend sit
 * on the page's own ground. The middle is a soft disc holding the number still in play; the legend has a heading,
 * "Where they are" over a 2px navy rule, with "M sent" (or "Nothing sent yet") at its right.
 *
 * ⚠️ THE RING IS THE RAIL'S STAGE FILTER. A segment or a legend row toggles `toggleRing`, which writes the same
 *    `stages` field the rail's "Where it stands" rows write, so the rail shows it on and the list narrows.
 * ⚠️ THE SVG IS `aria-hidden`; THE LEGEND IS ITS TEXT. Each legend row is a button named "Partial requested, 5 of 26";
 *    the segments are the same buttons for a pointer (no tab stop of their own, so nothing is reachable twice).
 */
import React, { useRef, useState } from "react";
import type { Qc138Filters } from "../../../lib/qc138";
import {
  RING_BUCKETS, RING_GEO, RING_HATCH, RING_TRACK, ringArcs, ringInPlay, ringOn, ringShare, ringTotal, toggleRing,
  type RingCounts, type RingKey,
} from "../../../lib/qc1531";

/** v153.2 — the middle disc: the ground softened behind the number */
const MID_DISC = "rgba(255,255,255,.55)";
const VIEW = 210;
const SIZE = 214;

export interface QcStageRingProps {
  /** null while loading: the track, no figures */
  counts: RingCounts | null;
  filters: Qc138Filters;
  onFilters: (f: Qc138Filters) => void;
}

export const QcStageRing1531: React.FC<QcStageRingProps> = ({ counts, filters, onFilters }) => {
  const [hv, setHv] = useState<RingKey | null>(null);
  /* the tooltip follows the pointer, as the ref's does; a keyboard focus puts it at the row's right end */
  const [at, setAt] = useState<{ x: number; y: number; flip: boolean } | null>(null);
  const card = useRef<HTMLElement>(null);
  const place = (cx: number, cy: number) => {
    const r = card.current?.getBoundingClientRect();
    /* past the card's middle it hangs to the pointer's left, so it never runs off the card */
    if (r) { const x = cx - r.left, flip = x > r.width / 2; setAt({ x: flip ? x - 14 : x + 14, y: cy - r.top + 14, flip }); }
  };
  const enter = (k: RingKey, e: React.MouseEvent) => { setHv(k); place(e.clientX, e.clientY); };
  const leave = () => { setHv(null); setAt(null); };
  const total = counts ? ringTotal(counts) : 0;
  const arcs = counts ? ringArcs(counts) : [];
  const toggle = (k: RingKey) => onFilters(toggleRing(filters, k));
  const n = (k: RingKey) => (counts ? counts[k] : 0);
  const hvBucket = hv ? RING_BUCKETS.find((b) => b.key === hv)! : null;
  const sent = !counts ? " " : total === 0 ? "Nothing sent yet" : `${total} sent`;
  const inPlay = counts ? ringInPlay(counts) : null;

  return (
    <section className="qc1531-ring" ref={card} aria-label="Where they are" data-qc1531="ring-card">
      <div className={`qc1531-rb${hv ? " is-hv" : ""}`}>
        <div className="qc1531-rsvg" data-qc1531="ring">
          <svg viewBox={`0 0 ${VIEW} ${VIEW}`} width={SIZE} height={SIZE} aria-hidden="true" focusable="false">
            <defs>
              <pattern id="qc1531-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="7" height="7" fill={RING_HATCH.ground} />
                <line x1="0" y1="0" x2="0" y2="7" stroke={RING_HATCH.stripe} strokeWidth="2.5" />
              </pattern>
            </defs>
            <circle cx={RING_GEO.c} cy={RING_GEO.c} r={RING_GEO.disc} fill={MID_DISC} />
            {!arcs.length ? (
              <circle cx={RING_GEO.c} cy={RING_GEO.c} r={RING_GEO.r} fill="none" stroke={RING_TRACK} strokeWidth={RING_GEO.w} data-qc1531="track" />
            ) : null}
            {arcs.map((a) => {
              const b = RING_BUCKETS.find((x) => x.key === a.key)!;
              const stroke = a.key === "closed" ? "url(#qc1531-hatch)" : b.fill;
              const cls = `qc1531-seg${hv === a.key ? " is-on" : ""}${ringOn(filters, a.key) ? " is-pick" : ""}`;
              /* a zero bucket draws no segment, so only the legend row needs disabling (as the rail's zero rows are) */
              const ev = { onMouseEnter: (e: React.MouseEvent) => enter(a.key, e), onMouseMove: (e: React.MouseEvent) => place(e.clientX, e.clientY), onMouseLeave: leave, onClick: () => toggle(a.key) };
              return a.full
                ? <circle key={a.key} className={cls} data-qc1531="seg" data-k={a.key} cx={RING_GEO.c} cy={RING_GEO.c} r={RING_GEO.r} fill="none" stroke={stroke} strokeWidth={RING_GEO.w} {...ev} />
                : <path key={a.key} className={cls} data-qc1531="seg" data-k={a.key} d={a.d} fill="none" stroke={stroke} strokeWidth={RING_GEO.w} {...ev} />;
            })}
            {/* the counts on the segments */}
            {arcs.map((a) => {
              if (!a.label) return null;
              const b = RING_BUCKETS.find((x) => x.key === a.key)!;
              return (
                <text key={`t-${a.key}`} className={`qc1531-segn${hv === a.key ? " is-on" : ""}`} data-qc1531="seg-n" data-k={a.key}
                  x={a.label.x} y={a.label.y} textAnchor="middle" fill={b.ink}>{n(a.key)}</text>
              );
            })}
            {/* the middle: the number still in play */}
            <text className="qc1531-midn" data-qc1531="mid" x="105" y="112" textAnchor="middle">{inPlay ?? ""}</text>
            <text className="qc1531-midl" x="105" y="134" textAnchor="middle">still in play</text>
          </svg>
        </div>
        <div className="qc1531-lgw">
        <div className="qc1531-lgh" data-qc1531="lg-head">
          <h2>Where they are</h2>
          <small data-qc1531="ring-sum">{sent}</small>
          {inPlay != null ? <span className="sr-only">, {inPlay} still in play</span> : null}
        </div>
        <ul className="qc1531-lg" data-qc1531="legend">
          {RING_BUCKETS.map((b) => {
            const on = ringOn(filters, b.key);
            return (
              <li key={b.key}>
                <button type="button" className={`${hv === b.key ? "is-on " : ""}${on ? "is-pick" : ""}`.trim() || undefined}
                  data-qc1531="legend-row" data-k={b.key} aria-pressed={on} disabled={!counts || (!on && n(b.key) === 0)}
                  aria-label={`${b.label}, ${n(b.key)} of ${total}`}
                  onMouseEnter={(e) => enter(b.key, e)} onMouseMove={(e) => place(e.clientX, e.clientY)} onMouseLeave={leave}
                  onFocus={(e) => { setHv(b.key); const r = e.currentTarget.getBoundingClientRect(); place(r.right - 150, r.bottom - 4); }} onBlur={leave}
                  onClick={() => toggle(b.key)}>
                  <i className={`qc1531-sw${b.key === "closed" ? " is-hatch" : ""}`} style={b.key === "closed" ? undefined : { background: b.fill }} aria-hidden="true" />
                  <span className="qc1531-lbl">{b.label}</span>
                  <b>{counts ? n(b.key) : ""}</b>
                  <em>{counts ? ringShare(n(b.key), total) : ""}</em>
                </button>
              </li>
            );
          })}
        </ul>
        </div>
      </div>
      {hvBucket && counts && at ? (
        <div className={`qc1531-tip${at.flip ? " is-flip" : ""}`} role="presentation" data-qc1531="tip" style={{ left: `${at.x}px`, top: `${at.y}px` }}>
          <b>{hvBucket.label}</b> — {counts[hvBucket.key]} of {total} queries
        </div>
      ) : null}
    </section>
  );
};
