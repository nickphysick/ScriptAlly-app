/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v153.1 (design-refs/query-centre-v153-1.html) — the pure half of the page's new header and slips.
 *
 *  · THE STAGE RING ("Where they are"): five buckets that partition every status, the ring's arcs, and the toggle a
 *    segment or a legend row applies. The toggle writes the SAME field the rail's "Where it stands" rows write
 *    (`f.stages`), so the ring and the rail cannot disagree about what is on.
 *  · THEIR POLICY: the contact's reply policy in words, from the agent record (never stored on the query).
 *  · MATERIALS: the chips under a slip's facts — what went with the query, and what the agent asked for since.
 *
 * ⚠️ NO NEW FIELDS. Everything here reads what the query and its agent already carry.
 */
import { QueryStatus, type Agent } from "../types";
import type { Qc138Filters } from "./qc138";
import { SLIP_TONE_FILL } from "./qc153";

/* ── the stage ring ───────────────────────────────────────────────────────────────────────────────────────────── */

export type RingKey = "wait" | "partial" | "full" | "offer" | "closed";
export interface RingBucket {
  key: RingKey;
  label: string;
  statuses: readonly QueryStatus[];
  /** the segment and swatch fill — the slip headers' own colours; the closed bucket is hatched instead */
  fill: string;
  /** the count's ink on the segment */
  ink: string;
}

/** the hatch drawn for "Passed or closed": 45° stripes on a pale ground */
export const RING_HATCH = { stripe: "#d8d1c7", ground: "#f1eee9" } as const;
/** the empty track */
export const RING_TRACK = "#f1eee9";

/** ⚠️ IN THIS ORDER, clockwise from 12 o'clock. Every status lands in exactly one (locked in qc1531.test.ts). */
export const RING_BUCKETS: readonly RingBucket[] = [
  { key: "wait", label: "Waiting to hear", statuses: [QueryStatus.QUERIED], fill: SLIP_TONE_FILL.sand, ink: "#6f5c45" },
  { key: "partial", label: "Partial requested", statuses: [QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT], fill: SLIP_TONE_FILL.rose, ink: "#9a4a32" },
  { key: "full", label: "Full requested", statuses: [QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT, QueryStatus.RESUBMITTED], fill: SLIP_TONE_FILL.blue, ink: "#34506e" },
  { key: "offer", label: "Offer", statuses: [QueryStatus.OFFER, QueryStatus.SIGNED], fill: SLIP_TONE_FILL.heather, ink: "#7a4f68" },
  { key: "closed", label: "Passed or closed", statuses: [QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN], fill: RING_HATCH.ground, ink: "#8a837a" },
];

export function bucketOf(status: QueryStatus | string): RingKey | null {
  return RING_BUCKETS.find((b) => b.statuses.includes(status as QueryStatus))?.key ?? null;
}

export type RingCounts = Record<RingKey, number>;
export function ringCounts(statuses: readonly (QueryStatus | string)[]): RingCounts {
  const c: RingCounts = { wait: 0, partial: 0, full: 0, offer: 0, closed: 0 };
  for (const s of statuses) { const k = bucketOf(s); if (k) c[k] += 1; }
  return c;
}
export const ringTotal = (c: RingCounts): number => RING_BUCKETS.reduce((n, b) => n + c[b.key], 0);
/** "N still in play": everything not passed or closed */
export const ringInPlay = (c: RingCounts): number => ringTotal(c) - c.closed;

/** a bucket is on when every one of its statuses is in the rail's stage set (the rule `standOn` uses) */
export const ringOn = (f: Qc138Filters, key: RingKey): boolean => {
  const b = RING_BUCKETS.find((x) => x.key === key)!;
  return b.statuses.every((s) => f.stages.includes(s));
};
/** the ring's click: the bucket's statuses in or out of the rail's stage set, nothing else touched */
export const toggleRing = (f: Qc138Filters, key: RingKey): Qc138Filters => {
  const b = RING_BUCKETS.find((x) => x.key === key)!;
  const rest = f.stages.filter((s) => !b.statuses.includes(s));
  return { ...f, stages: ringOn(f, key) ? rest : [...rest, ...b.statuses] };
};

/** the ring's geometry, on a 210 viewBox */
export const RING_GEO = { c: 105, r: 84, w: 30, gap: 0.05, disc: 66 } as const;
export interface RingArc { key: RingKey; d: string; full: boolean; label: { x: number; y: number } | null; mid: { x: number; y: number } }

const pt = (a: number, r = RING_GEO.r) => ({ x: RING_GEO.c + r * Math.sin(a), y: RING_GEO.c - r * Math.cos(a) });
/** an arc shorter than this (in viewBox units, along the ring) is too short to hold its count */
export const RING_LABEL_MIN = 12;

export function ringArcs(c: RingCounts): RingArc[] {
  return ringArcsFor(RING_BUCKETS.map((b) => ({ key: b.key, n: c[b.key] }))) as RingArc[];
}

/** One arc of a ring whose buckets are the caller's own (Your notes v1 shares the ring: `shell/OpenRing`). */
export interface RingArcOf<K extends string = string> { key: K; d: string; full: boolean; label: { x: number; y: number } | null; mid: { x: number; y: number } }
/**
 * THE RING'S ARCS OVER ANY BUCKETS, in the order given, clockwise from 12 o'clock. `ringArcs` is this over the Query
 * Centre's five (qc1531.test.ts holds its output); the Your notes page passes its four.
 */
export function ringArcsFor<K extends string>(entries: readonly { key: K; n: number }[]): RingArcOf<K>[] {
  const total = entries.reduce((s, e) => s + e.n, 0);
  if (!total) return [];
  const live = entries.filter((e) => e.n > 0);
  const out: RingArcOf<K>[] = [];
  let a = 0;
  for (const b of live) {
    const span = (b.n / total) * Math.PI * 2;
    const midA = a + span / 2;
    const mid = pt(midA);
    if (live.length === 1) {
      /* one bucket is the whole ring: a full circle, no gap */
      out.push({ key: b.key, d: "", full: true, label: { x: mid.x, y: mid.y + 4.5 }, mid });
    } else {
      const g = Math.min(RING_GEO.gap, span / 3);
      const s = pt(a + g / 2), e = pt(a + span - g / 2);
      const large = span - g > Math.PI ? 1 : 0;
      const d = `M${s.x} ${s.y}A${RING_GEO.r} ${RING_GEO.r} 0 ${large} 1 ${e.x} ${e.y}`;
      const len = (span - g) * RING_GEO.r;
      out.push({ key: b.key, d, full: false, label: len >= RING_LABEL_MIN ? { x: mid.x, y: mid.y + 4.5 } : null, mid });
    }
    a += span;
  }
  return out;
}

/** the share, as the legend writes it ("46%") */
export const ringShare = (n: number, total: number): string => (total ? `${Math.round((n / total) * 100)}%` : "0%");

/* ── their policy ─────────────────────────────────────────────────────────────────────────────────────────────── */

export interface PolicyWords { value: string; line: string | null }
const weeks = (n: number) => `${n} week${n === 1 ? "" : "s"}`;
/**
 * The contact's reply policy. `noResponseMeansNo` decides the value; `responseTimeWeeks` adds the line under it.
 * No stated policy (no agent, or `noResponseMeansNo` never recorded) is a dash with no line — never a guess.
 */
export function policyWords(a: Pick<Agent, "noResponseMeansNo" | "responseTimeWeeks"> | null | undefined): PolicyWords {
  if (!a || typeof a.noResponseMeansNo !== "boolean") return { value: "—", line: null };
  const w = typeof a.responseTimeWeeks === "number" && Number.isFinite(a.responseTimeWeeks) && a.responseTimeWeeks > 0 ? Math.round(a.responseTimeWeeks) : null;
  return a.noResponseMeansNo
    ? { value: "No reply means no", line: w ? `silence after ${weeks(w)}` : null }
    : { value: "Replies to everyone", line: w ? `usually within ${weeks(w)}` : null };
}

/* ── materials: v153.3 moved them to the paperclip tab (lib/qc1533 `materialGroups`) ── */
