/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TallyMarks — a count, as gates of five (v33, 18 Sep; ref design-refs/dashboard-v33.html `.tally`).
 *
 * Each gate is a 20-unit-tall drawing at 12px: four strokes 8 units apart, each leaning very slightly
 * (from (x,2) to (x+1,18)), and a diagonal from (-2,16) to (31,4) for the fifth. A part gate is just
 * its strokes, in a box only as wide as they are. Gates sit 6px apart, right-aligned, and WRAP inside
 * their row when there are many (51 is ten gates and one, over two lines).
 *
 * ⚠️ THE NUMBER IS STATED TO A SCREEN READER AND ON HOVER, AND NOWHERE ELSE. `role="img"` with the
 * figure as its label; the key shows no numerals by design.
 */
import React from "react";
import { tallyGates } from "../../lib/dashClosed";

const H_UNITS = 20, PX_PER_UNIT = 12 / H_UNITS;

const Gate: React.FC<{ n: number }> = ({ n }) => {
  const strokes = Math.min(4, n);
  /* the box is as wide as its strokes: 8 units each, 3 of air either side (the ref's -3 0 38 20) */
  const w = strokes * 8 + 6;
  return (
    <svg className="os-tg" viewBox={`-3 0 ${w} ${H_UNITS}`} width={(w * PX_PER_UNIT).toFixed(1)} height={12} fill="none" stroke="#1c130f" strokeWidth={2.3} strokeLinecap="round" aria-hidden="true">
      {Array.from({ length: strokes }, (_, i) => <line key={i} x1={2 + i * 8} y1={2} x2={3 + i * 8} y2={18} />)}
      {n >= 5 && <line x1={-2} y1={16} x2={31} y2={4} />}
    </svg>
  );
};

export const TallyMarks: React.FC<{ count: number }> = ({ count }) => {
  const label = count.toLocaleString("en-GB");
  return (
    <span className="os-tally" role="img" aria-label={label} title={label} data-probe="tally" data-count={count}>
      {tallyGates(count).map((n, i) => <Gate key={i} n={n} />)}
    </span>
  );
};
