/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashClosed — the dashboard's Closed tile (stage 3, 17 Sep).
 *
 * ⚠️ FOUR BUCKETS, MUTUALLY EXCLUSIVE, AND THEY SUM TO THE TOTAL. Each closed query lands in exactly
 * one, decided in this order:
 *   · it went quiet (No Response)          → No reply — whatever it reached first
 *   · it was passed on after a full request → Full
 *   · …after a partial request             → Partial
 *   · …at the letter                       → Queried
 * The labels say how far a query got. They are never a verdict, and the word for a pass does not
 * appear on this tile.
 *
 * ⚠️ WHAT IS NOT CLOSED HERE. A withdrawal is the writer's decision rather than an outcome, so it is
 * left out entirely (Nick, 17 Sep); an offer is live. So the closed set is exactly the passes and the
 * silences — and, like every other figure on the page, only queries that are on the board (sent).
 *
 * ⚠️ "HOW FAR IT GOT" IS `analytics.buildRows`'S, IMPORTED. Analytics and the manuscript Journey read
 * the same flags, so this tile cannot come to disagree with them about what "reached a full" means.
 */
import { Activity, Query, QueryStatus } from "../types";
import { buildRows } from "./analytics";
import { closedAt, sentAt } from "./oneScreen";

export type ClosedBucketKey = "quiet" | "letter" | "partial" | "full";

export interface ClosedBucketSpec {
  key: ClosedBucketKey;
  /** how far it got, never what was decided — see the file's header */
  label: string;
}

/**
 * ⚠️ THE ORDER IS THE DONUT'S, FROM 12 O'CLOCK, AND THE KEY READS IT TOO (v16, 18 Sep). One array,
 * so the ring and the key beneath it cannot disagree about which slice is which.
 *
 * ⚠️ THE FILLS ARE IN THE STYLESHEET (`.os-dnarc--<key>` and `.os-dnsw--<key>`), NOT HERE. One home
 * for a colour: the arc and its swatch must be the same value, and a hex in this file would be a
 * second place to change it.
 */
export const CLOSED_BUCKETS: readonly ClosedBucketSpec[] = [
  { key: "quiet", label: "No reply" },
  { key: "letter", label: "Passed on query" },
  { key: "partial", label: "Passed on partial" },
  { key: "full", label: "Passed on full" },
];

export const CLOSED_STATUSES: readonly QueryStatus[] = [QueryStatus.REJECTED, QueryStatus.NO_RESPONSE];

export interface ClosedBucket extends ClosedBucketSpec {
  count: number;
  /** the bar's width, as a share of the total closed — 0 when nothing is closed */
  share: number;
}

export interface ClosedTile {
  total: number;
  buckets: ClosedBucket[];
  /** got past the letter — Partial + Full */
  pastLetter: number;
  /** answered — everything but No reply */
  replied: number;
  /** went quiet — No reply */
  quiet: number;
  /**
   * Which queries are in each bucket, most recently closed first (v33) — the popup's "three most
   * recent" and its "See all" read THIS, so the list under a slice is the slice, not a second
   * bucketing that could disagree with the ring about where a query stopped.
   */
  members: Record<ClosedBucketKey, string[]>;
}

export const closedTile = (queries: readonly Query[], activities: readonly Activity[]): ClosedTile => {
  const closed = queries.filter((q) => CLOSED_STATUSES.includes(q.status) && sentAt(q) !== null);
  const rows = buildRows([...closed], [...activities], [], 0);
  const counts: Record<ClosedBucketKey, number> = { letter: 0, partial: 0, full: 0, quiet: 0 };
  const members: Record<ClosedBucketKey, string[]> = { letter: [], partial: [], full: [], quiet: [] };
  const closedMs = new Map(closed.map((q) => [q.id, closedAt(q) ?? 0]));
  for (const r of rows) {
    const key: ClosedBucketKey = r.status === QueryStatus.NO_RESPONSE ? "quiet"
      : r.reachedFull ? "full"
      : r.reachedRequest ? "partial"
      : "letter";
    counts[key] += 1;
    members[key].push(r.id);
  }
  for (const k of Object.keys(members) as ClosedBucketKey[]) {
    members[k].sort((a, b) => (closedMs.get(b) ?? 0) - (closedMs.get(a) ?? 0) || a.localeCompare(b));
  }
  const total = closed.length;
  const sum = counts.letter + counts.partial + counts.full + counts.quiet;
  /* ⚠️ THE INVARIANT IS CHECKED ON EVERY DERIVATION. The loop above cannot drop a query today; this
     is the tripwire for the day a status is added to the closed set and not to the bucketing. */
  if (sum !== total) {
    console.warn(`[dashClosed] the four buckets (${sum}) do not add up to the closed total (${total})`);
  }
  const buckets = CLOSED_BUCKETS.map((b) => ({
    ...b,
    count: counts[b.key],
    share: total > 0 ? counts[b.key] / total : 0,
  }));
  return {
    total,
    buckets,
    pastLetter: counts.partial + counts.full,
    replied: counts.letter + counts.partial + counts.full,
    quiet: counts.quiet,
    members,
  };
};

/* ── the donut ─────────────────────────────────────────────────────────────────────────────────── */

/**
 * The ring's geometry, stated once and shared by the renderer and its test (the ref's values).
 * `R` is the radius the arcs are stroked on, `STROKE` their width; `C` is the circumference every
 * dash length is a fraction of.
 */
export const DONUT = { r: 60, stroke: 20, hover: 25, gap: 3, box: 160 } as const;
export const DONUT_C = 2 * Math.PI * DONUT.r;

export interface DonutArc {
  key: ClosedBucketKey;
  /** the dash length — the share of the ring this bucket owns */
  len: number;
  /** where the arc starts, as SVG's negative dash offset */
  offset: number;
}

/**
 * The four arcs, in the buckets' own order, laid end to end from 12 o'clock.
 *
 * ⚠️ A ZERO BUCKET DRAWS NOTHING AND STILL TAKES ITS TURN. It is dropped from the list rather than
 * drawn at length 0 — a zero-length dash with a round cap paints a dot, which would put a slice on
 * the ring for a bucket that has nothing in it — but the running offset still passes through it, so
 * the arcs that follow start where they would have.
 *
 * ⚠️ AND THE LENGTHS ARE COMPUTED FROM THE COUNTS, NOT FROM `share`. Rounding four shares and
 * multiplying gives four arcs that do not quite meet; a running total of `count / total` closes on
 * the circumference exactly, which is what `closedDonut(...).reduce` asserts in the test.
 */
export const closedDonut = (tile: Pick<ClosedTile, "total" | "buckets">): DonutArc[] => {
  const out: DonutArc[] = [];
  if (tile.total <= 0) return out;
  let done = 0;
  for (const b of CLOSED_BUCKETS) {
    const count = tile.buckets.find((x) => x.key === b.key)?.count ?? 0;
    const len = (count / tile.total) * DONUT_C;
    if (len > 0) out.push({ key: b.key, len, offset: -(done / tile.total) * DONUT_C });
    done += count;
  }
  return out;
};

/** The dash actually stroked: the arc, less the hairline gap that separates it from the next. */
export const arcDash = (a: DonutArc): number => Math.max(0.01, a.len - DONUT.gap);

/**
 * ⚠️ THE RING IS TURNED SO ITS LARGEST SLICE IS CENTRED AT 12 O'CLOCK (v33). The Archivist's head
 * covers about 65° at the top of the ring; centring the largest slice beneath it guarantees he never
 * hides a small one — and the small ones, the partial and full requests, are what a writer most
 * wants to see. A tie goes to the earlier bucket, so the ring does not flip between two equals.
 *
 * Returned in degrees, to be added to the arcs' own `rotate(-90)` start.
 */
export const donutRotation = (tile: Pick<ClosedTile, "total" | "buckets">): number => {
  if (tile.total <= 0) return 0;
  let done = 0, best = -1, centre = 0;
  for (const b of CLOSED_BUCKETS) {
    const count = tile.buckets.find((x) => x.key === b.key)?.count ?? 0;
    if (count > best) { best = count; centre = ((done + count / 2) / tile.total) * 360; }
    done += count;
  }
  return -centre;
};

/**
 * What each slice's popup says under its name — what happened, and nothing the code does not do.
 * ⚠️ "No reply" IS THE WRITER'S OWN CLOSE. The app closes nothing by itself and counts no days, so
 * the line states the outcome and no threshold.
 */
export const CLOSED_NOTE: Record<ClosedBucketKey, string> = {
  quiet: "Closed with no reply from the agent",
  /* ⚠️ NOT "read … and passed" (the mockup's). The buckets are `reachedRequest` / `reachedFull` —
     the log records that a request was MADE, never that anything was read, and a pass can land
     between a request and the send. These say what the log says. */
  letter: "The agent passed on the query",
  partial: "The agent asked for a partial, then passed",
  full: "The agent asked for the full manuscript, then passed",
};

/** Tallies: gates of five. `[5, 5, 4]` for 14 — full gates, then the part gate if any. */
export const tallyGates = (n: number): number[] => {
  const out: number[] = [];
  for (let left = Math.max(0, Math.floor(n)); left > 0; left -= 5) out.push(Math.min(5, left));
  return out;
};
