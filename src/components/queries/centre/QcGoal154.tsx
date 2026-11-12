/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v154 (design-refs/query-centre-v154.html) — the weekly goal chart in the header's third column, in
 * place of the stage ring: "[n] of [goal] this week" over a 2px navy rule, the streak pill (only with a streak, v154.1),
 * one line of encouragement,
 * and the last twenty weeks as navy bars on one baseline with a dashed goal line. The maths is lib/qc154goal's.
 *
 * ⚠️ NO CARD AND NO FILTERING: the chart sits on the page; filtering by stage is the rail's (it always was).
 * ⚠️ THE SAME 380 × 128 DRAWING AS THE REF, so the header row (sized by the hawk and the title block) does not grow.
 */
import React, { useState } from "react";
import { barTip, goalHeadline, goalLineWords, goalNudge, monthLabels, streakWords, type WeekGoal154 } from "../../../lib/qc154goal";
import "./qcv154.css";

const W = 380, H = 128, TOP = 8, BASE = H - 20;
const NAVY = "#2a3a52", SLATE = "#9aa6b6";
const FLAME = <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 1.8c.6 2.4 3.6 3.6 3.6 7a3.6 3.6 0 0 1-7.2 0c0-1.6.8-2.6 1.6-3.3.2 1.2.8 1.8 1.5 2 .2-2.2-.4-4.1.5-5.7z" /></svg>;

/** a bar with a rounded top on the baseline */
const barPath = (x: number, y: number, w: number): string => {
  const h = BASE - y, r = Math.min(4, h);
  return `M${x},${BASE}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${BASE}Z`;
};

export const QcGoal154: React.FC<{ m: WeekGoal154 | null }> = ({ m }) => {
  const [on, setOn] = useState<number | null>(null);
  /* v155 §3 — while loading, the chart's own boxes at their final size, hidden: the header does not grow when it lands */
  if (!m) return (
    <div className="qc154-wkc" data-qc154="goal" data-qc155="goal-hold" aria-busy="true">
      <div className="qc154-wkh" aria-hidden="true"><span className="qc154-wkt"><b>0 of 0</b> this week</span></div>
      <p className="qc154-wkn" aria-hidden="true">{"\u00a0"}</p>
      <div className="qc154-wkp" aria-hidden="true"><svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} /></div>
    </div>
  );
  const n = m.weeks.length;
  const mx = Math.max(5, m.goal + 2, ...m.weeks.map((w) => w.count));
  const Y = (v: number) => BASE - (BASE - TOP) * v / mx;
  const bw = W / n, barw = Math.max(6, bw - 6);
  const gy = Y(m.goal);
  const labs = monthLabels(m.weeks);
  return (
    <div className="qc154-wkc" data-qc154="goal" data-goal-from-writer={m.goalFromWriter ? "" : undefined}>
      <div className="qc154-wkh" data-qc154="goal-head">
        <span className="qc154-wkt" data-qc154="goal-headline"><b>{m.now} of {m.goal}</b> this week</span>
        {/* v154.1: no pill without a streak — never "0-week streak" */}
        {!m.empty && m.streak > 0 ? <span className="qc154-stk" data-qc154="streak">{FLAME}{streakWords(m.streak)}</span> : null}
      </div>
      <p className="qc154-wkn" data-qc154="goal-line">{goalNudge(m.left, m.streak)}</p>
      <div className="qc154-wkp">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={on != null ? "is-hv" : undefined} role="img"
          aria-label={`${goalHeadline(m)}. Queries sent in each of the last ${n} weeks.`}>
          <line x1="0" x2={W} y1={gy} y2={gy} stroke={NAVY} strokeOpacity=".35" strokeDasharray="2 4" />
          <line x1="0" x2={W} y1={BASE} y2={BASE} stroke="rgba(28,19,15,.18)" />
          {m.weeks.map((w, i) => {
            const x = i * bw + (bw - barw) / 2;
            return (
              <g key={w.start} className={`qc154-wb${on === i ? " is-on" : ""}`} data-qc154="bar" data-start={w.start} data-count={w.count}
                data-kind={w.current ? "now" : w.count === 0 ? "empty" : w.met ? "met" : "short"}
                onPointerEnter={() => setOn(i)} onPointerLeave={() => setOn((c) => (c === i ? null : c))}>
                {w.current ? <>
                  <path d={barPath(x, gy, barw)} fill="none" stroke={NAVY} strokeWidth="1.5" strokeDasharray="3 3" />
                  {w.count ? <path d={barPath(x, Y(w.count), barw)} fill={NAVY} /> : null}
                </> : w.count
                  ? <path d={barPath(x, Y(w.count), barw)} fill={w.met ? NAVY : SLATE} />
                  : <rect x={x} y={BASE - 2} width={barw} height="2" rx="1" fill="rgba(42,58,82,.18)" />}
                <rect x={i * bw} y="0" width={bw} height={BASE} fill="transparent" />
              </g>
            );
          })}
          {/* the goal's words over the bars, haloed in the page's ground, so a tall week never hides them */}
          <text className="qc154-wkg" x="0" y={gy - 5}>{goalLineWords(m.goal)}</text>
          {labs.map((l) => <text key={l.i} className="qc154-wkm" x={l.i * bw + bw / 2} y={BASE + 15} textAnchor="middle">{l.label}</text>)}
        </svg>
        <span className="qc154-wktip" data-qc154="goal-tip" aria-hidden="true"
          style={on != null ? {
            left: `${on * bw + bw / 2}px`, opacity: 1,
            /* the end weeks anchor the tooltip inward, so it never runs past the chart's edge */
            transform: `translate(${on < 3 ? "-8px" : on > n - 4 ? "calc(-100% + 8px)" : "-50%"}, -100%)`,
          } : undefined}>{on != null ? barTip(m.weeks[on]) : ""}</span>
      </div>
    </div>
  );
};
