/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v156 (design-refs/query-centre-v156.html) — the launch look's two models.
 *
 *   §2 THE "THIS WEEK" LINE: one line of weekly sent counts (the twenty weeks `weekGoal154` already builds, oldest on
 *      the left), straight segments, a soft fill beneath, a dot on this week and the goal as a dotted level. The ref's
 *      own path is reproduced point for point (qc156.test.ts): a 380 × 74 box, the baseline 4px up from its foot, the
 *      top 6px down, and the scale 10% above the larger of the goal and the busiest week, so neither ever touches the
 *      top. An all-zero series lies flat along the baseline; the goal line still shows.
 *
 *   §6 THE VIEWS PANEL'S MODEL: retired in List filters v1 (see the foot of this file).
 */
import { MONTHS_SHORT } from "./dates";
import type { GoalWeek154 } from "./qc154goal";

/* ── §2 the line ─────────────────────────────────────────────────────────────────────────────────────────────── */

export const LINE_W = 380;
export const LINE_H = 74;
const BASE = LINE_H - 4;
const TOP = 6;
const HEAD = 1.1;
const f1 = (n: number): string => n.toFixed(1);

export interface LineGeometry {
  points: { x: number; y: number }[];
  /** the stroke: M then L for every week — straight segments, no smoothing */
  line: string;
  /** the fill beneath: the line closed along the box's foot */
  area: string;
  goalY: number;
  /** this week's point (the last), where the dot sits */
  now: { x: number; y: number };
}

export function lineGeometry(counts: readonly number[], goal: number): LineGeometry {
  const n = counts.length;
  const mx = Math.max(1, goal, ...counts) * HEAD;
  const y = (v: number) => BASE - (BASE - TOP) * v / mx;
  const step = n > 1 ? LINE_W / (n - 1) : 0;
  const points = counts.map((c, i) => ({ x: n > 1 ? i * step : LINE_W, y: y(c) }));
  const line = points.map((p, i) => `${i ? "L" : "M"}${f1(p.x)} ${f1(p.y)}`).join(" ");
  const last = points[points.length - 1] ?? { x: LINE_W, y: BASE };
  return { points, line, area: `${line} L${LINE_W} ${LINE_H} L0 ${LINE_H} Z`, goalY: y(goal), now: { x: last.x, y: last.y } };
}

export const SENT_THIS_WEEK = "sent this week";
export const lineAlt = (m: { now: number; goal: number; weeks: readonly Pick<GoalWeek154, "count">[] }): string =>
  `Queries sent per week over the last ${m.weeks.length} weeks. This week: ${m.now} of ${m.goal}.`;
export const lineMonths = (w: readonly { start: string }[]): { first: string; last: string } => {
  const m = (d: string | undefined) => (d ? MONTHS_SHORT[Number(d.slice(5, 7)) - 1] : "");
  return { first: m(w[0]?.start), last: m(w[w.length - 1]?.start) };
};

/* §6 THE VIEWS PANEL'S MODEL retired with the panel (List filters v1 Phase 2): the Queries list's Filter panel is
   queries/centre/QcViews156 over shell/FilterPanel, its quick tiles write lib/qc153Rail `pickQuick`. */
