/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v156 §2 (design-refs/query-centre-v156.html) — "THIS WEEK" AS A LINE, straight on the navy header in
 * its third column, no card. It replaces v154's bar chart (QcGoal154, deleted with it).
 *
 *   "2 of 3" (typewriter 44) and "sent this week" (italic 17) on one baseline
 *   the line: twenty weeks of sends, oldest left (lib/qc156 `lineGeometry`), its soft fill, this week's dot, the goal
 *   as a dotted level; the first month left, "your goal · 3 a week" centred, this month right
 *   a rule, then the streak (hidden at 0) and the encouragement line
 *
 * ⚠️ THE COPY AND THE MATHS ARE v154's (lib/qc154goal): the streak, `goalNudge`'s four sentences, the goal's words.
 * ⚠️ LOADING HOLDS THE BOXES: with no model yet the same rows render at their final height with their text hidden, so
 *    the header does not grow when the data lands (v155 §3).
 */
import React from "react";
import { goalLineWords, goalNudge, streakWords, type WeekGoal154 } from "../../../lib/qc154goal";
import { LINE_H, LINE_W, SENT_THIS_WEEK, lineAlt, lineGeometry, lineMonths } from "../../../lib/qc156";
import "./qcv156.css";

export const FLAME_156 = <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 1.8c.6 2.4 3.6 3.6 3.6 7a3.6 3.6 0 0 1-7.2 0c0-1.6.8-2.6 1.6-3.3.2 1.2.8 1.8 1.5 2 .2-2.2-.4-4.1.5-5.7z" /></svg>;

export const QcLine156: React.FC<{ m: WeekGoal154 | null }> = ({ m }) => {
  if (!m) return (
    <div className="qc156-wk" data-qc156="week" data-qc155="goal-hold" aria-busy="true">
      <div className="qc156-big" aria-hidden="true"><b>{" "}</b></div>
      <svg className="qc156-ln" viewBox={`0 0 ${LINE_W} ${LINE_H}`} preserveAspectRatio="none" aria-hidden="true" />
      <div className="qc156-cap" aria-hidden="true"><span>{" "}</span></div>
      <div className="qc156-ft" aria-hidden="true"><em>{" "}</em></div>
    </div>
  );
  const g = lineGeometry(m.weeks.map((w) => w.count), m.goal);
  const mo = lineMonths(m.weeks);
  return (
    <div className="qc156-wk" data-qc156="week" data-goal-from-writer={m.goalFromWriter ? "" : undefined}>
      <div className="qc156-big" data-qc156="week-headline"><b>{m.now} of {m.goal}</b><small>{SENT_THIS_WEEK}</small></div>
      <svg className="qc156-ln" data-qc156="line" viewBox={`0 0 ${LINE_W} ${LINE_H}`} preserveAspectRatio="none" role="img" aria-label={lineAlt(m)}>
        <line x1="0" x2={LINE_W} y1={g.goalY} y2={g.goalY} stroke="rgba(244,238,229,.45)" strokeDasharray="2 5" vectorEffect="non-scaling-stroke" data-qc156="goal" />
        <path d={g.area} fill="rgba(244,238,229,.1)" data-qc156="fill" />
        <path d={g.line} fill="none" stroke="#f4eee5" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" data-qc156="stroke" />
        <circle cx={g.now.x} cy={g.now.y} r="4.5" fill="#f4eee5" data-qc156="now" />
      </svg>
      <div className="qc156-cap" data-qc156="caption"><span>{mo.first}</span><span>{goalLineWords(m.goal)}</span><span>{mo.last}</span></div>
      <div className="qc156-ft" data-qc156="week-foot">
        {/* v154.1: no streak item without a streak — never "0-week streak" */}
        {!m.empty && m.streak > 0 ? <b data-qc156="streak">{FLAME_156}{streakWords(m.streak)}</b> : null}
        <em data-qc156="nudge">{goalNudge(m.left, m.streak)}</em>
      </div>
    </div>
  );
};
