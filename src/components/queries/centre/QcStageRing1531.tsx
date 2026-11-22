/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v153.1 (design-refs/query-centre-v153-1.html) — THE STAGE RING, "Where they are": the ring of five
 * buckets.
 *
 * v153.2 (design-refs/query-centre-v153-2.html): OPEN. No card, no navy bar and no artwork; the ring sits on the page's
 * own ground. The middle is a soft disc holding the number still in play.
 *
 * v153.4 (design-refs/query-centre-v153-4.html): THE RING ALONE. The legend, its heading, the counts on the segments
 * and the floating tooltip are gone. Hovering or focusing a segment fades the others and shows that segment's
 * annotation, and only that one, outside the ring: a dot on the ring's outer edge at the segment's middle, a leader
 * running out and then 10 across, the count and a short name.
 *
 * ⚠️ THE RING IS THE RAIL'S STAGE FILTER. A segment toggles `toggleRing`, which writes the same `stages` field the
 *    rail's "Where it stands" rows write, so the rail shows it on and the list narrows.
 * ⚠️ THE SEGMENTS ARE THE BUTTONS NOW. With the legend gone each segment takes focus (role "button", named "Partial
 *    requested, 5 of 26", pressed when its stage is on); Enter and Space toggle it. A zero bucket draws no segment.
 * ⚠️ THE VIEWBOX IS MEASURED FROM THE ANNOTATIONS, every one of them (hidden ones still have a box), so the longest
 *    label on either side fits whatever the counts are; the ring keeps the ref's scale (214px for 222 units).
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import type { Qc138Filters } from "../../../lib/qc138";
import {
  RING_BUCKETS, RING_GEO, RING_HATCH, RING_TRACK, ringArcs, ringInPlay, ringOn, ringTotal, toggleRing,
  type RingCounts, type RingKey,
} from "../../../lib/qc1531";

/** v153.2 — the middle disc: the ground softened behind the number */
const MID_DISC = "rgba(255,255,255,.55)";
/** the ref's frame: 222 units tall drawn at 214px; the ring's own box runs 4..206 */
const VB_Y = -6, VB_H = 222, SIZE = 214;
const RING_X0 = 4, RING_X1 = 206;
/** v153.4 — the soft track under the segments (the ref's) */
const UNDER_TRACK = "rgba(28,19,15,.05)";
/** the annotation's short names */
export const RING_SHORT: Record<RingKey, string> = { wait: "Waiting", partial: "Partial", full: "Full", offer: "Offer", closed: "Passed or closed" };

export interface RingAnn { key: RingKey; right: boolean; dot: { x: number; y: number }; elbow: { x: number; y: number }; end: { x: number; y: number }; text: { x: number; y: number } }

/** The annotation for each drawn arc: the ref's geometry (dot at r + 18, elbow at r + 30, then 10 across; labels on one
 *  side kept 18 apart), with the label held inside the frame's height so it never runs past the top or foot. */
export function ringAnnotations(arcs: ReturnType<typeof ringArcs>): RingAnn[] {
  const { c, r } = RING_GEO, r1 = r + 18, r2 = r + 30;
  const used: { right: boolean; y: number }[] = [];
  return arcs.map((a) => {
    const m = Math.atan2(a.mid.y - c, a.mid.x - c);
    const right = Math.cos(m) >= -1e-9;
    let y2 = c + r2 * Math.sin(m);
    for (const u of used) if (u.right === right && Math.abs(u.y - y2) < 18) y2 = u.y + (y2 < u.y ? -18 : 18);
    y2 = Math.max(VB_Y + 14, Math.min(VB_Y + VB_H - 12, y2));
    used.push({ right, y: y2 });
    const x2 = c + r2 * Math.cos(m), x3 = x2 + (right ? 10 : -10);
    return { key: a.key, right, dot: { x: c + r1 * Math.cos(m), y: c + r1 * Math.sin(m) }, elbow: { x: x2, y: y2 }, end: { x: x3, y: y2 }, text: { x: x3 + (right ? 5 : -5), y: y2 + 4.5 } };
  });
}

export interface QcStageRingProps {
  /** null while loading: the track, no figures */
  counts: RingCounts | null;
  filters: Qc138Filters;
  onFilters: (f: Qc138Filters) => void;
}

export const QcStageRing1531: React.FC<QcStageRingProps> = ({ counts, filters, onFilters }) => {
  const [hv, setHv] = useState<RingKey | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  /* the frame's left and right, from the annotations' measured boxes; the ref's -92..302 until measured */
  const [vx, setVx] = useState<[number, number]>([-92, 302]);
  const total = counts ? ringTotal(counts) : 0;
  const arcs = counts ? ringArcs(counts) : [];
  const anns = ringAnnotations(arcs);
  const sig = arcs.map((a) => `${a.key}${counts?.[a.key]}`).join(",");
  useLayoutEffect(() => {
    const fit = () => {
      const s = svg.current; if (!s) return;
      let x0 = RING_X0, x1 = RING_X1;
      s.querySelectorAll<SVGGElement>("[data-qc1534='ann']").forEach((g) => { const b = g.getBBox(); if (b.width > 0) { x0 = Math.min(x0, b.x); x1 = Math.max(x1, b.x + b.width); } });
      const next: [number, number] = [Math.floor(x0 - 4), Math.ceil(x1 + 4)];
      setVx((v) => (v[0] === next[0] && v[1] === next[1] ? v : next));
    };
    fit();
    let live = true;
    document.fonts?.ready.then(() => { if (live) fit(); });
    return () => { live = false; };
  }, [sig]);
  const toggle = (k: RingKey) => onFilters(toggleRing(filters, k));
  const inPlay = counts ? ringInPlay(counts) : null;
  const vw = vx[1] - vx[0];
  const name = !counts ? "Where they are" : total === 0 ? "Where they are. Nothing sent yet" : `Where they are: ${inPlay} still in play of ${total} sent`;

  return (
    <section className="qc1531-ring qc1534-ring" aria-label={name} data-qc1531="ring-card">
      <div className={`qc1531-rb${hv ? " is-hv" : ""}`}>
        <div className="qc1531-rsvg" data-qc1531="ring" style={{ width: `${(SIZE * vw) / VB_H}px` }}>
          <svg ref={svg} viewBox={`${vx[0]} ${VB_Y} ${vw} ${VB_H}`} width={(SIZE * vw) / VB_H} height={SIZE}>
            <defs>
              <pattern id="qc1531-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="7" height="7" fill={RING_HATCH.ground} />
                <line x1="0" y1="0" x2="0" y2="7" stroke={RING_HATCH.stripe} strokeWidth="2.5" />
              </pattern>
            </defs>
            <circle cx={RING_GEO.c} cy={RING_GEO.c} r={RING_GEO.r} fill="none" stroke={UNDER_TRACK} strokeWidth={RING_GEO.w + 4} aria-hidden="true" />
            <circle cx={RING_GEO.c} cy={RING_GEO.c} r={RING_GEO.disc} fill={MID_DISC} aria-hidden="true" />
            {!arcs.length ? (
              <circle cx={RING_GEO.c} cy={RING_GEO.c} r={RING_GEO.r} fill="none" stroke={RING_TRACK} strokeWidth={RING_GEO.w} data-qc1531="track" aria-hidden="true" />
            ) : null}
            {arcs.map((a) => {
              const b = RING_BUCKETS.find((x) => x.key === a.key)!;
              const stroke = a.key === "closed" ? "url(#qc1531-hatch)" : b.fill;
              const on = ringOn(filters, a.key);
              const cls = `qc1531-seg${hv === a.key ? " is-on" : ""}${on ? " is-pick" : ""}`;
              const ev = {
                role: "button", tabIndex: 0, "aria-pressed": on, "aria-label": `${b.label}, ${counts![a.key]} of ${total}`,
                onMouseEnter: () => setHv(a.key), onMouseLeave: () => setHv(null),
                onFocus: () => setHv(a.key), onBlur: () => setHv(null),
                onClick: () => toggle(a.key),
                onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(a.key); } },
              };
              return a.full
                ? <circle key={a.key} className={cls} data-qc1531="seg" data-k={a.key} cx={RING_GEO.c} cy={RING_GEO.c} r={RING_GEO.r} fill="none" stroke={stroke} strokeWidth={RING_GEO.w} {...ev} />
                : <path key={a.key} className={cls} data-qc1531="seg" data-k={a.key} d={a.d} fill="none" stroke={stroke} strokeWidth={RING_GEO.w} {...ev} />;
            })}
            {/* the middle: the number still in play */}
            <text className="qc1531-midn" data-qc1531="mid" x="105" y="112" textAnchor="middle" aria-hidden="true">{inPlay ?? ""}</text>
            <text className="qc1531-midl" x="105" y="134" textAnchor="middle" aria-hidden="true">still in play</text>
            {/* the annotations: every one drawn (so the frame can be measured), only the hovered one shown */}
            {anns.map((n) => (
              <g key={`a-${n.key}`} className={`qc1534-ann${hv === n.key ? " is-on" : ""}`} data-qc1534="ann" data-k={n.key} aria-hidden="true">
                <polyline points={`${n.dot.x},${n.dot.y} ${n.elbow.x},${n.elbow.y} ${n.end.x},${n.end.y}`} fill="none" stroke="#cfc6ba" strokeWidth="1" />
                <circle cx={n.dot.x} cy={n.dot.y} r="2" fill="#b9ae9f" />
                <text x={n.text.x} y={n.text.y} textAnchor={n.right ? "start" : "end"}>
                  {n.right
                    ? <><tspan className="qc1534-an">{counts![n.key]}</tspan><tspan className="qc1534-al" dx="5">{RING_SHORT[n.key]}</tspan></>
                    : <><tspan className="qc1534-al">{RING_SHORT[n.key]}</tspan><tspan className="qc1534-an" dx="5">{counts![n.key]}</tspan></>}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
};
