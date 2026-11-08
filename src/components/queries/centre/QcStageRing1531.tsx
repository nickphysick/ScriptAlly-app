/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v153.1 (design-refs/query-centre-v153-1.html) — THE STAGE RING CARD, "Where they are": a navy header
 * bar over the ring (five buckets, the post pile in the middle) and its legend.
 *
 * ⚠️ THE RING IS THE RAIL'S STAGE FILTER. A segment or a legend row toggles `toggleRing`, which writes the same
 *    `stages` field the rail's "Where it stands" rows write, so the rail shows it on and the list narrows.
 * ⚠️ THE SVG IS `aria-hidden`; THE LEGEND IS ITS TEXT. Each legend row is a button named "Partial requested, 5 of 26";
 *    the segments are the same buttons for a pointer (no tab stop of their own, so nothing is reachable twice).
 */
import React, { useRef, useState } from "react";
import type { Qc138Filters } from "../../../lib/qc138";
import {
  RING_BUCKETS, RING_DISC, RING_GEO, RING_HATCH, RING_TRACK, ringArcs, ringInPlay, ringOn, ringShare, ringTotal, toggleRing,
  type RingCounts, type RingKey,
} from "../../../lib/qc1531";

export const POST_PILE = "/images/qc/qc-post-pile.webp?v=1";
const VIEW = 210;
const SIZE = 214;

export interface QcStageRingProps {
  /** null while loading: the track and the pile, no figures */
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
  const head = !counts ? " " : total === 0 ? "Nothing sent yet" : `${ringInPlay(counts)} still in play · ${total} sent`;

  return (
    <section className="qc1531-ring" ref={card} aria-label="Where they are" data-qc1531="ring-card">
      <header className="qc1531-rh">
        <h2>Where they are</h2>
        <small data-qc1531="ring-sum">{head}</small>
      </header>
      <div className={`qc1531-rb${hv ? " is-hv" : ""}`}>
        <div className="qc1531-rsvg" data-qc1531="ring">
          <svg viewBox={`0 0 ${VIEW} ${VIEW}`} width={SIZE} height={SIZE} aria-hidden="true" focusable="false">
            <defs>
              <pattern id="qc1531-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="7" height="7" fill={RING_HATCH.ground} />
                <line x1="0" y1="0" x2="0" y2="7" stroke={RING_HATCH.stripe} strokeWidth="2.5" />
              </pattern>
              <linearGradient id="qc1531-pf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0" />
                <stop offset=".14" stopColor="#fff" stopOpacity="1" />
              </linearGradient>
              <mask id="qc1531-pm"><rect x="28" y="18" width="154" height="155" fill="url(#qc1531-pf)" /></mask>
            </defs>
            <circle cx={RING_GEO.c} cy={RING_GEO.c} r={RING_GEO.disc} fill={RING_DISC} />
            {!arcs.length ? (
              <circle cx={RING_GEO.c} cy={RING_GEO.c} r={RING_GEO.r} fill="none" stroke={RING_TRACK} strokeWidth={RING_GEO.w} data-qc1531="track" />
            ) : null}
            {arcs.map((a) => {
              const b = RING_BUCKETS.find((x) => x.key === a.key)!;
              const stroke = a.key === "closed" ? "url(#qc1531-hatch)" : b.fill;
              const cls = `qc1531-seg${hv === a.key ? " is-on" : ""}${ringOn(filters, a.key) ? " is-pick" : ""}`;
              const ev = { onMouseEnter: (e: React.MouseEvent) => enter(a.key, e), onMouseMove: (e: React.MouseEvent) => place(e.clientX, e.clientY), onMouseLeave: leave, onClick: () => toggle(a.key) };
              return a.full
                ? <circle key={a.key} className={cls} data-qc1531="seg" data-k={a.key} cx={RING_GEO.c} cy={RING_GEO.c} r={RING_GEO.r} fill="none" stroke={stroke} strokeWidth={RING_GEO.w} {...ev} />
                : <path key={a.key} className={cls} data-qc1531="seg" data-k={a.key} d={a.d} fill="none" stroke={stroke} strokeWidth={RING_GEO.w} {...ev} />;
            })}
            {/* the pile after the segments, so it sits on the ring; masked so the cut-off leg fades rather than ends in an edge */}
            <image className="qc1531-pile" href={POST_PILE} x="28" y="18" width="154" height="155" mask="url(#qc1531-pm)" data-qc1531="pile" />
            {/* the counts over the pile, so a number at the ring's side is never under its overhang */}
            {arcs.map((a) => {
              if (!a.label) return null;
              const b = RING_BUCKETS.find((x) => x.key === a.key)!;
              return (
                <text key={`t-${a.key}`} className={`qc1531-segn${hv === a.key ? " is-on" : ""}`} data-qc1531="seg-n" data-k={a.key}
                  x={a.label.x} y={a.label.y} textAnchor="middle" fill={b.ink}>{n(a.key)}</text>
              );
            })}
          </svg>
        </div>
        <ul className="qc1531-lg" data-qc1531="legend">
          {RING_BUCKETS.map((b) => {
            const on = ringOn(filters, b.key);
            return (
              <li key={b.key}>
                <button type="button" className={`${hv === b.key ? "is-on " : ""}${on ? "is-pick" : ""}`.trim() || undefined}
                  data-qc1531="legend-row" data-k={b.key} aria-pressed={on} disabled={!counts}
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
      {hvBucket && counts && at ? (
        <div className={`qc1531-tip${at.flip ? " is-flip" : ""}`} role="presentation" data-qc1531="tip" style={{ left: `${at.x}px`, top: `${at.y}px` }}>
          <b>{hvBucket.label}</b> — {counts[hvBucket.key]} of {total} queries
        </div>
      ) : null}
    </section>
  );
};
