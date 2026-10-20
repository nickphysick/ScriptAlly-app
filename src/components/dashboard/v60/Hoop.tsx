/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v60 — THE HOOP: an SVG donut, new, and deliberately NOT the Archivist's ring.
 *
 * A 9-unit stroke on a 100 viewBox (r 42) over a `#ece8e1` track, segments in the order given,
 * starting at 12 o'clock, with a 1.2-unit gap between non-zero segments. A zero segment draws nothing
 * and takes no gap. Whatever sits in the middle (the Archivist, or "3 of 9 queried") is `children`.
 *
 * ⚠️ THE DRAW-IN IS THE WEB ANIMATIONS API WITH LITERAL VALUES, never a `var()` inside `@keyframes`
 * (which fails silently in this setup). It runs only when `play` is true — the page's first paint —
 * and never under reduced motion.
 */
import React, { useLayoutEffect, useRef } from "react";

export interface HoopSeg { key: string; n: number; color: string }

const R = 42;
const GAP = 1.2;
/** the arc lengths are in `pathLength` units (100 = the whole circle), so the gap is restated in them */
const GAP_PL = (GAP / (2 * Math.PI * R)) * 100;

export function hoopArcs(segs: readonly HoopSeg[]): { key: string; color: string; len: number; at: number }[] {
  const total = segs.reduce((s, x) => s + Math.max(0, x.n), 0);
  if (!total) return [];
  const live = segs.filter((s) => s.n > 0).length;
  let at = 0;
  const out: { key: string; color: string; len: number; at: number }[] = [];
  for (const s of segs) {
    if (s.n <= 0) continue;
    const share = (s.n / total) * 100;
    out.push({ key: s.key, color: s.color, len: Math.max(0, share - (live > 1 ? GAP_PL : 0)), at });
    at += share;
  }
  return out;
}

export const Hoop: React.FC<{ segs: readonly HoopSeg[]; play?: boolean; label: string; className?: string; children?: React.ReactNode }> = ({ segs, play, label, className, children }) => {
  const arcs = hoopArcs(segs);
  const ref = useRef<SVGSVGElement>(null);
  useLayoutEffect(() => {
    if (!play || !ref.current) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const els = [...ref.current.querySelectorAll<SVGCircleElement>("[data-d60='arc']")];
    const anims = els.map((el) => {
      const len = Number(el.dataset.len ?? 0);
      /* with the chart's line: 700ms from 250ms, the same curve */
      return el.animate?.([{ strokeDasharray: `0 100` }, { strokeDasharray: `${len} ${100 - len}` }],
        { duration: 700, delay: 250, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "backwards" });
    });
    return () => { for (const a of anims) a?.cancel(); };
  }, [play]);
  return (
    <div className={`d60-hoop${className ? ` ${className}` : ""}`} data-d60="hoop" role="img" aria-label={label}>
      <svg ref={ref} viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={R} fill="none" stroke="#ece8e1" strokeWidth="9" />
        {arcs.map((a) => (
          <circle
            key={a.key} data-d60="arc" data-seg={a.key} data-len={a.len.toFixed(3)}
            /* `style`, not the attribute: a token (the pale slate) resolves in a style, not a presentation attribute */
            cx="50" cy="50" r={R} fill="none" style={{ stroke: a.color }} strokeWidth="9" pathLength={100}
            strokeDasharray={`${a.len.toFixed(3)} ${(100 - a.len).toFixed(3)}`} strokeDashoffset={(-a.at).toFixed(3)}
            transform="rotate(-90 50 50)"
          />
        ))}
      </svg>
      <div className="d60-hin">{children}</div>
    </div>
  );
};
