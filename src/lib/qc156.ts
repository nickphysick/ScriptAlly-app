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
 *   §6 THE VIEWS PANEL'S MODEL: the five views are the existing quick filters ("Most used"), now picked one at a time,
 *      with "All queries" as no quick filter at all. ⚠️ A VIEW IS THE SAME FIELD THE QUICK FILTER WROTE (`you`, `past`,
 *      `waiting`, `offers` on `Qc138Filters`), never a second state: Overdue is `past`, which is also the Dates group's
 *      "Past their reply date" box — one field, two doors, exactly as the rail's Overdue pick and More switch were.
 */
import { MONTHS_SHORT } from "./dates";
import type { Qc138Filters } from "./qc138";
import type { GoalWeek154 } from "./qc154goal";
import { QUICK_PICKS, STAND_ROWS, standOn, type QuickKey, type StandRow } from "./qc140";

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

/* ── §6 the Views panel ──────────────────────────────────────────────────────────────────────────────────────── */

export type ViewKey156 = "all" | QuickKey;
export type ViewIcon156 = "list" | "you" | "clock" | "plane" | "doc";
const ICON: Record<QuickKey, ViewIcon156> = { you: "you", over: "clock", wait: "plane", offers: "doc" };
/** All queries, then the quick filters in their order and with their labels (never renamed) */
export const VIEWS_156: readonly { key: ViewKey156; label: string; icon: ViewIcon156; line?: string }[] = [
  { key: "all", label: "All queries", icon: "list" },
  ...QUICK_PICKS.map((p) => ({ key: p.key, label: p.title, icon: ICON[p.key], line: p.line })),
];
const QUICK_FIELDS = ["you", "past", "waiting", "offers"] as const;

/** the view the filters hold: the first quick field on, in the quick filters' order; none is All queries */
export function viewOf156(f: Qc138Filters): ViewKey156 {
  for (const p of QUICK_PICKS) if (f[p.field]) return p.key;
  return "all";
}
/** a view replaces any other; All queries clears every quick field. Nothing else in the filters changes. */
export function selectView156(f: Qc138Filters, k: ViewKey156): Qc138Filters {
  const cleared: Qc138Filters = { ...f };
  for (const x of QUICK_FIELDS) cleared[x] = false;
  if (k === "all") return cleared;
  const p = QUICK_PICKS.find((x) => x.key === k);
  if (!p) return cleared;
  return { ...cleared, [p.field]: true };
}

/** Refine's Status rows: the stage rows with a count in this view, or ticked */
export function statusRows156(stand: Record<string, number>, f: Qc138Filters): { row: StandRow; n: number; on: boolean }[] {
  return STAND_ROWS.map((row) => ({ row, n: stand[row.key] ?? 0, on: standOn(f, row) })).filter((x) => x.n > 0 || x.on);
}

/** a filter behind "More filters" is set: a round, a date filter, or Past their reply date under a view other than Overdue */
export const moreActive156 = (f: Qc138Filters): boolean =>
  f.sent.length > 0 || f.dueWeek || f.missing || f.overYear || (f.past && viewOf156(f) !== "over");
