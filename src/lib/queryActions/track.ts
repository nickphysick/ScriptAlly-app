/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The plan timeline's layout (design-refs/query-actions-v11.html §3.8): dated points on a line,
 * merged when two fall within two days of each other, positioned as a share of the span, with each
 * label taking the first of three rows it fits in.
 *
 * ⚠️ LABEL WIDTHS ARE ESTIMATED FROM CHARACTER COUNTS, AS THE MOCK DOES, against the track's real
 * width passed in. The estimate only decides which ROW a label sits on — it never positions ink —
 * so the worst an error can do is drop a label a row lower than it needed to go.
 */
import { dayDiff, up } from "./dates";

export type PointKind = "done" | "fut" | "nudge" | "close" | "today" | "";
export interface TrackPoint { l: string; d: Date; c?: PointKind; s?: string }
export type LabelRow = "hi" | "lo" | "lo2";
export interface LaidPoint extends TrackPoint { x: number; row: LabelRow; anchor: "start" | "middle" | "end" }
export interface TrackLayout { points: LaidPoint[]; today: number | null; deep: boolean }

export function mergePoints(pts: TrackPoint[]): TrackPoint[] {
  const out: TrackPoint[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && Math.abs(dayDiff(p.d, last.d)) <= 2) {
      last.l = `${last.l} · ${p.l.toLowerCase()}`;
      last.c = p.c;
      last.s = p.s || last.s;
    } else out.push({ ...p });
  }
  return out;
}

export function layoutTrack(input: TrackPoint[], today: Date, width = 400): TrackLayout {
  const sorted = [...input].sort((a, b) => a.d.getTime() - b.d.getTime());
  const points = mergePoints(sorted);
  if (!points.length) return { points: [], today: null, deep: false };
  const t0 = points[0].d;
  const t1 = points[points.length - 1].d;
  const span = Math.max(1, dayDiff(t1, t0));
  const pos = (d: Date) => Math.max(0, Math.min(100, (dayDiff(d, t0) / span) * 100));
  let tp: number | null = dayDiff(today, t0) >= 0 && dayDiff(today, t1) <= 0 ? pos(today) : null;
  if (tp !== null && !(tp > 2 && tp < 98)) tp = null;
  const ends: Record<LabelRow, number> = { hi: -1e9, lo: -1e9, lo2: -1e9 };
  let deep = false;
  const laid = points.map((p) => {
    const x = pos(p.d);
    const sub = up(p.d) + (p.s ? ` · ${p.s}` : "");
    const w = Math.max(p.l.length * 7.4, sub.length * 5.6) + 10;
    const px = (x / 100) * width;
    const l0 = x < 8 ? px - w * 0.14 : x > 92 ? px - w * 0.86 : px - w / 2;
    const row: LabelRow = l0 >= ends.hi ? "hi" : l0 >= ends.lo ? "lo" : "lo2";
    if (row === "lo2") deep = true;
    ends[row] = l0 + w;
    const anchor: LaidPoint["anchor"] = x < 8 ? "start" : x > 92 ? "end" : "middle";
    return { ...p, x, row, anchor };
  });
  return { points: laid, today: tp, deep };
}
