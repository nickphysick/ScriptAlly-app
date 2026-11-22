/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v156 §2, as v156.1 §1 leads it with the streak (design-refs/query-centre-v156-1.html) — THE NAVY
 * HEADER'S TOP RIGHT, straight on the navy in its third column, no card:
 *
 *   a filled flame (rust and peach; none without a streak), "6 week streak" (typewriter 32), and one plain line beneath
 *   (italic 15.5) — lib/qc1561 `streakLead`, which also counts the streak (this week counts once its target is met)
 *   6px under it, v156's line of twenty weeks unchanged (lib/qc156 `lineGeometry`): soft fill, the dotted target, the
 *   month caption "your target · 3 a week"; this week's dot is rust beside the flame, cream without one, an HTML disc
 *   over the drawing so it stays round however the line is stretched
 *
 * ⚠️ LOADING HOLDS THE BOXES: with no model yet the same rows render at their final height with their text hidden, so
 *    the header does not grow when the data lands (v155 §3).
 */
import React from "react";
import type { WeekGoal154 } from "../../../lib/qc154goal";
import { LINE_H, LINE_W, lineGeometry, lineMonths } from "../../../lib/qc156";
import { streakLead, targetLineWords } from "../../../lib/qc1561";
import "./qcv156.css";
import "./qcv1561.css";

/** the ref's filled flame (24 × 30): the rust outer flame and the peach inner one */
export const FLAME_1561: React.FC<{ className?: string; width: number; height: number }> = ({ className, width, height }) => (
  <svg className={className} viewBox="0 0 24 30" width={width} height={height} aria-hidden="true" focusable="false">
    <path d="M12.4 1c.9 5.2 7.1 7.6 7.1 15.2A7.3 7.3 0 0 1 12.2 23.6 7.3 7.3 0 0 1 4.9 16.2c0-3.6 1.6-5.8 3.3-7.2.3 2.5 1.4 3.7 2.8 4.1.5-4.5-.6-8.3 1.4-12.1z" fill="#dd7446" />
    <path d="M12.3 13.4c.5 2.1 2.7 3 2.7 5.8a2.8 2.8 0 0 1-5.6 0c0-1.5.7-2.3 1.4-3 .1 1 .5 1.5 1 1.7.2-1.7-.1-3.1.5-4.5z" fill="#f6c39d" />
  </svg>
);

export const QcLine156: React.FC<{ m: WeekGoal154 | null }> = ({ m }) => {
  if (!m) return (
    <div className="qc156-wk qc1561-wk" data-qc156="week" data-qc155="goal-hold" aria-busy="true">
      <div className="qc1561-hd" aria-hidden="true"><span className="qc1561-fl" /><div><div className="qc1561-st">{" "}</div><div className="qc1561-sl">{" "}</div></div></div>
      <div className="qc1561-gr" aria-hidden="true"><svg className="qc156-ln" viewBox={`0 0 ${LINE_W} ${LINE_H}`} preserveAspectRatio="none" /></div>
      <div className="qc156-cap" aria-hidden="true"><span>{" "}</span></div>
    </div>
  );
  const s = streakLead(m);
  const g = lineGeometry(m.weeks.map((w) => w.count), m.goal);
  const mo = lineMonths(m.weeks);
  return (
    <div className="qc156-wk qc1561-wk" data-qc156="week" data-flame={s.flame ? "" : undefined} data-goal-from-writer={m.goalFromWriter ? "" : undefined}>
      <div className="qc1561-hd" data-qc1561="lead">
        {s.flame ? <FLAME_1561 className="qc1561-fl" width={38} height={48} /> : null}
        <div>
          <div className="qc1561-st" data-qc1561="streak">{s.title}</div>
          <div className="qc1561-sl" data-qc1561="line">{s.line}</div>
        </div>
      </div>
      <div className="qc1561-gr">
        <svg className="qc156-ln" data-qc156="line" viewBox={`0 0 ${LINE_W} ${LINE_H}`} preserveAspectRatio="none" role="img" aria-label={s.alt}>
          <line x1="0" x2={LINE_W} y1={g.goalY} y2={g.goalY} stroke="rgba(244,238,229,.45)" strokeDasharray="2 5" vectorEffect="non-scaling-stroke" data-qc156="goal" />
          <path d={g.area} fill="rgba(244,238,229,.1)" data-qc156="fill" />
          <path d={g.line} fill="none" stroke="#f4eee5" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" data-qc156="stroke" />
        </svg>
        <i className="qc1561-dot" data-qc156="now" aria-hidden="true" style={{ left: `${(g.now.x / LINE_W) * 100}%`, top: `${g.now.y}px` }} />
      </div>
      <div className="qc156-cap" data-qc156="caption"><span>{mo.first}</span><span>{targetLineWords(m.goal)}</span><span>{mo.last}</span></div>
    </div>
  );
};
