/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v54, D1 (design-refs/todo-list-v54/todo-desk-v15.html, `.bigh`) — THE PAGE HEADER'S FIGURES: the ring's
 * three segments ("{n} need you" = agents waiting + nudges due + gone quiet) and the "What needs doing" legend.
 *
 * ⚠️ EVERY COUNT IS THE TRAY'S. The legend reads `breakdownOf` over the category sections the tray draws — the same
 *    numbers as the tray's own bar — so the header and the tray cannot disagree. Housekeeping is in the legend and not
 *    in the ring.
 * ⚠️ THE RING'S GEOMETRY IS THE QUERY CENTRE'S (`RING_GEO`, lib/qc1531), read rather than restated; only the buckets
 *    differ, so the arcs are drawn here over the To-do's own four keys.
 */
import { RING_GEO } from "./qc1531";
import { daysWaiting, type Breakdown, type WsSection } from "./todoWs";

export type NeedKey = "wait" | "nudge" | "quiet" | "house";

/** the tray's group colours (todoWs.css: --tw-rose, --tw-sand, --tw-stone; housekeeping's pale blue) */
export const NEED_FILL: Record<NeedKey, string> = { wait: "#ecd6d2", nudge: "#efe7da", quiet: "#e3dbcf", house: "#e4ebf1" };
export const NEED_LABEL: Record<NeedKey, string> = { wait: "Agents waiting", nudge: "Nudges due", quiet: "Gone quiet", house: "Housekeeping" };

export interface NeedRow { key: NeedKey; label: string; n: number; note: string; late: boolean }

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** the legend's four rows, in the tray's order */
export function needRows(sections: readonly WsSection[], bd: Breakdown, nowMs: number): NeedRow[] {
  const tasks = (id: string) => sections.find((s) => s.id === id)?.tasks ?? [];
  /* v55 (D7): the same figure the rows show (`daysWaiting`); a row with no date on record adds none */
  const waited = tasks("wait").map((t) => daysWaiting(t, nowMs)).filter((d): d is number => d != null);
  const longest = waited.length ? Math.max(...waited) : 0;
  const lateBy = tasks("nudge").filter((t) => t.dueDays != null && t.dueDays < 0).map((t) => -(t.dueDays as number));
  const latest = lateBy.length ? Math.max(...lateBy) : 0;
  return [
    { key: "wait", label: NEED_LABEL.wait, n: bd.wait, note: bd.wait && longest ? plural(longest, "day", "days") : "", late: false },
    { key: "nudge", label: NEED_LABEL.nudge, n: bd.nudge, note: latest ? `${latest} late` : "", late: latest > 0 },
    { key: "quiet", label: NEED_LABEL.quiet, n: bd.quiet, note: bd.quiet ? "close or nudge" : "", late: false },
    { key: "house", label: NEED_LABEL.house, n: bd.house, note: bd.house ? "when you have a moment" : "", late: false },
  ];
}

/** "{n} need you": waiting + nudges + quiet (the ring's three segments) */
export const needYou = (bd: Breakdown): number => bd.wait + bd.nudge + bd.quiet;

export interface NeedArc { key: NeedKey; d: string; full: boolean; label: { x: number; y: number } | null }
const pt = (a: number, r: number = RING_GEO.r) => ({ x: RING_GEO.c + r * Math.sin(a), y: RING_GEO.c - r * Math.cos(a) });

/** the ring's arcs, clockwise from 12 o'clock: waiting, nudges, quiet; a zero draws nothing */
export function needArcs(bd: Breakdown): NeedArc[] {
  const live = (["wait", "nudge", "quiet"] as const).map((k) => ({ k, n: bd[k] })).filter((x) => x.n > 0);
  const total = live.reduce((s, x) => s + x.n, 0);
  if (!total) return [];
  if (live.length === 1) return [{ key: live[0].k, d: "", full: true, label: pt(0) }];
  const out: NeedArc[] = [];
  let a = 0;
  for (const x of live) {
    const span = (x.n / total) * Math.PI * 2;
    const g = RING_GEO.gap;
    const a0 = a + g / 2, a1 = a + span - g / 2;
    const p0 = pt(a0), p1 = pt(a1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const d = `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${RING_GEO.r} ${RING_GEO.r} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
    const arcLen = (a1 - a0) * RING_GEO.r;
    out.push({ key: x.k, d, full: false, label: arcLen >= 12 ? pt(a + span / 2) : null });
    a += span;
  }
  return out;
}
