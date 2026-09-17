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
import { sentAt } from "./oneScreen";

export type ClosedBucketKey = "letter" | "partial" | "full" | "quiet";

export interface ClosedBucketSpec {
  key: ClosedBucketKey;
  label: string;
  /** which state token fills the pill */
  tone: "queried" | "you" | "agent" | "closed";
  /** whose glyph the pill wears */
  glyph: QueryStatus;
}

/* ⚠️ THE BARS' FILLS ARE IN THE STYLESHEET (`.os-clfill--<key>`), NOT HERE — one home for a colour. */

export const CLOSED_BUCKETS: readonly ClosedBucketSpec[] = [
  { key: "letter", label: "Queried", tone: "queried", glyph: QueryStatus.QUERIED },
  { key: "partial", label: "Partial", tone: "you", glyph: QueryStatus.PARTIAL_REQUESTED },
  { key: "full", label: "Full", tone: "agent", glyph: QueryStatus.FULL_REQUESTED },
  { key: "quiet", label: "No reply", tone: "closed", glyph: QueryStatus.NO_RESPONSE },
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
}

export const closedTile = (queries: readonly Query[], activities: readonly Activity[]): ClosedTile => {
  const closed = queries.filter((q) => CLOSED_STATUSES.includes(q.status) && sentAt(q) !== null);
  const rows = buildRows([...closed], [...activities], [], 0);
  const counts: Record<ClosedBucketKey, number> = { letter: 0, partial: 0, full: 0, quiet: 0 };
  for (const r of rows) {
    const key: ClosedBucketKey = r.status === QueryStatus.NO_RESPONSE ? "quiet"
      : r.reachedFull ? "full"
      : r.reachedRequest ? "partial"
      : "letter";
    counts[key] += 1;
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
  };
};
