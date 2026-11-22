/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE OPEN HEADER'S RING (Your notes v1, extracted from Query Centre v153.1's `QcStageRing1531`): a ring of buckets
 * beside its legend, on the page's own ground. The buckets, the counts, the middle and what a press does are the
 * caller's; the drawing is this one component, so the Query Centre and Your notes cannot draw it two ways.
 *
 * ⚠️ IT RENDERS THE QUERY CENTRE'S OWN CLASSES (`qc1531-*`, queries/centre/qcv1531.css). Most of those rules are scoped
 *    under the Query Centre page's `.qc151`, so a page that mounts this carries that class on a wrapper (as To-do v54
 *    does). `QcStageRing1531` renders through this, and openHeaderShared.test.tsx holds its markup byte-identical to the
 *    pre-extraction capture.
 * ⚠️ THE SVG IS `aria-hidden`; THE LEGEND IS ITS TEXT. Each legend row is a button named "{label}, {n} of {total}"; the
 *    segments are the same buttons for a pointer (no tab stop of their own, so nothing is reachable twice).
 * ⚠️ THE HATCH'S `id` IS A PROP: every workspace page stays mounted, so two rings on one document with one id would
 *    point the second at the first's pattern — inside a page hidden with `display: none`, which paints nothing.
 */
import React, { useRef, useState } from "react";
import { RING_GEO, RING_HATCH, RING_TRACK, ringArcsFor, ringShare } from "../../lib/qc1531";
import "../queries/centre/qcv1531.css";

/** v153.2 — the middle disc: the ground softened behind the number */
const MID_DISC = "rgba(255,255,255,.55)";
const VIEW = 210;
const SIZE = 214;

export interface OpenRingBucket<K extends string = string> {
  key: K;
  label: string;
  /** the segment and swatch fill (ignored when `hatch`) */
  fill: string;
  /** the count's ink on the segment */
  ink: string;
  /** drawn in the ring's 45° hatch instead of a fill */
  hatch?: boolean;
}

export interface OpenRingProps<K extends string = string> {
  buckets: readonly OpenRingBucket<K>[];
  /** null while loading: the track, no figures */
  counts: Record<K, number> | null;
  isOn: (k: K) => boolean;
  onPick: (k: K) => void;
  /** the number in the middle (null: nothing drawn) and the italic line under it */
  mid: { n: number | null; label: string };
  /** the screen-reader sentence after the heading's summary (", 19 still in play"), or null */
  srMid?: string | null;
  heading: string;
  /** "26 sent" / "Nothing sent yet" (a single space while loading) */
  sum: string;
  ariaLabel: string;
  /** what the tooltip counts: "… — 5 of 26 queries" */
  tipNoun: string;
  hatchId: string;
  /** the probe attribute's name: `data-{probe}` carries "ring-card", "ring", "seg", "legend-row" … */
  probe: string;
  className?: string;
}

export function OpenRing<K extends string>({
  buckets, counts, isOn, onPick, mid, srMid = null, heading, sum, ariaLabel, tipNoun, hatchId, probe, className,
}: OpenRingProps<K>): React.ReactElement {
  const [hv, setHv] = useState<K | null>(null);
  /* the tooltip follows the pointer, as the ref's does; a keyboard focus puts it at the row's right end */
  const [at, setAt] = useState<{ x: number; y: number; flip: boolean } | null>(null);
  const card = useRef<HTMLElement>(null);
  const P = (v: string) => ({ [`data-${probe}`]: v });
  const place = (cx: number, cy: number) => {
    const r = card.current?.getBoundingClientRect();
    /* past the card's middle it hangs to the pointer's left, so it never runs off the card */
    if (r) { const x = cx - r.left, flip = x > r.width / 2; setAt({ x: flip ? x - 14 : x + 14, y: cy - r.top + 14, flip }); }
  };
  const enter = (k: K, e: React.MouseEvent) => { setHv(k); place(e.clientX, e.clientY); };
  const leave = () => { setHv(null); setAt(null); };
  const n = (k: K) => (counts ? counts[k] : 0);
  const total = counts ? buckets.reduce((s, b) => s + counts[b.key], 0) : 0;
  const arcs = counts ? ringArcsFor(buckets.map((b) => ({ key: b.key, n: counts[b.key] }))) : [];
  const hvBucket = hv ? buckets.find((b) => b.key === hv)! : null;

  return (
    <section className={`qc1531-ring${className ? ` ${className}` : ""}`} ref={card} aria-label={ariaLabel} {...P("ring-card")}>
      <div className={`qc1531-rb${hv ? " is-hv" : ""}`}>
        <div className="qc1531-rsvg" {...P("ring")}>
          <svg viewBox={`0 0 ${VIEW} ${VIEW}`} width={SIZE} height={SIZE} aria-hidden="true" focusable="false">
            <defs>
              <pattern id={hatchId} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="7" height="7" fill={RING_HATCH.ground} />
                <line x1="0" y1="0" x2="0" y2="7" stroke={RING_HATCH.stripe} strokeWidth="2.5" />
              </pattern>
            </defs>
            <circle cx={RING_GEO.c} cy={RING_GEO.c} r={RING_GEO.disc} fill={MID_DISC} />
            {!arcs.length ? (
              <circle cx={RING_GEO.c} cy={RING_GEO.c} r={RING_GEO.r} fill="none" stroke={RING_TRACK} strokeWidth={RING_GEO.w} {...P("track")} />
            ) : null}
            {arcs.map((a) => {
              const b = buckets.find((x) => x.key === a.key)!;
              const stroke = b.hatch ? `url(#${hatchId})` : b.fill;
              const cls = `qc1531-seg${hv === a.key ? " is-on" : ""}${isOn(a.key) ? " is-pick" : ""}`;
              /* a zero bucket draws no segment, so only the legend row needs disabling (as the rail's zero rows are) */
              const ev = { onMouseEnter: (e: React.MouseEvent) => enter(a.key, e), onMouseMove: (e: React.MouseEvent) => place(e.clientX, e.clientY), onMouseLeave: leave, onClick: () => onPick(a.key) };
              return a.full
                ? <circle key={a.key} className={cls} {...P("seg")} data-k={a.key} cx={RING_GEO.c} cy={RING_GEO.c} r={RING_GEO.r} fill="none" stroke={stroke} strokeWidth={RING_GEO.w} {...ev} />
                : <path key={a.key} className={cls} {...P("seg")} data-k={a.key} d={a.d} fill="none" stroke={stroke} strokeWidth={RING_GEO.w} {...ev} />;
            })}
            {/* the counts on the segments */}
            {arcs.map((a) => {
              if (!a.label) return null;
              const b = buckets.find((x) => x.key === a.key)!;
              return (
                <text key={`t-${a.key}`} className={`qc1531-segn${hv === a.key ? " is-on" : ""}`} {...P("seg-n")} data-k={a.key}
                  x={a.label.x} y={a.label.y} textAnchor="middle" fill={b.ink}>{n(a.key)}</text>
              );
            })}
            {/* the middle */}
            <text className="qc1531-midn" {...P("mid")} x="105" y="112" textAnchor="middle">{mid.n ?? ""}</text>
            <text className="qc1531-midl" x="105" y="134" textAnchor="middle">{mid.label}</text>
          </svg>
        </div>
        <div className="qc1531-lgw">
        <div className="qc1531-lgh" {...P("lg-head")}>
          <h2>{heading}</h2>
          <small {...P("ring-sum")}>{sum}</small>
          {srMid ? <span className="sr-only">{srMid}</span> : null}
        </div>
        <ul className="qc1531-lg" {...P("legend")}>
          {buckets.map((b) => {
            const on = isOn(b.key);
            return (
              <li key={b.key}>
                <button type="button" className={`${hv === b.key ? "is-on " : ""}${on ? "is-pick" : ""}`.trim() || undefined}
                  {...P("legend-row")} data-k={b.key} aria-pressed={on} disabled={!counts || (!on && n(b.key) === 0)}
                  aria-label={`${b.label}, ${n(b.key)} of ${total}`}
                  onMouseEnter={(e) => enter(b.key, e)} onMouseMove={(e) => place(e.clientX, e.clientY)} onMouseLeave={leave}
                  onFocus={(e) => { setHv(b.key); const r = e.currentTarget.getBoundingClientRect(); place(r.right - 150, r.bottom - 4); }} onBlur={leave}
                  onClick={() => onPick(b.key)}>
                  <i className={`qc1531-sw${b.hatch ? " is-hatch" : ""}`} style={b.hatch ? undefined : { background: b.fill }} aria-hidden="true" />
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
        <div className={`qc1531-tip${at.flip ? " is-flip" : ""}`} role="presentation" {...P("tip")} style={{ left: `${at.x}px`, top: `${at.y}px` }}>
          <b>{hvBucket.label}</b> — {counts[hvBucket.key]} of {total} {tipNoun}
        </div>
      ) : null}
    </section>
  );
}
