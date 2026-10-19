/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help system v1 — THE GUIDE'S RING: a white track and a rust arc from twelve o'clock, n of N. The pill draws it at 24px,
 * the Help menu at 40px; both with a 4px stroke and a round cap (the mock's `rg()`).
 *
 * ⚠️ THE ARC SWEEPS BY TRANSITION, NOT BY KEYFRAMES. `stroke-dasharray` is set as a style, and the sheet transitions it
 *    over 700ms, so a rising `n` animates from the value already drawn. Under reduced motion the transition is none and
 *    the arc simply lands.
 */
import React from "react";

export const GuideRing: React.FC<{
  n: number;
  total: number;
  size: number;
  stroke?: number;
  colour?: string;
  track?: string;
  className?: string;
}> = ({ n, total, size, stroke = 4, colour = "#a2452a", track = "#ffffff", className }) => {
  const r = size / 2 - stroke / 2 - 1;
  const c = 2 * Math.PI * r;
  const d = total > 0 ? (c * Math.min(n, total)) / total : 0;
  return (
    <svg className={`gr-ring${className ? ` ${className}` : ""}`} width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" data-guide="ring">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle className="gr-arc" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colour} strokeWidth={stroke} strokeLinecap="round"
        style={{ strokeDasharray: `${d} ${c}` }} transform={`rotate(-90 ${size / 2} ${size / 2})`} data-n={n} data-total={total} />
    </svg>
  );
};
