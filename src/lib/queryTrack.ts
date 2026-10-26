/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.2 A5 — THE QUERY TRACK: four steps (sent · partial · full · offer) drawn beside a query's status
 * pill. One function decides where a query stands on it, so the row, the cards and the locks cannot disagree.
 *
 *   past steps     navy dots, and navy lines between them
 *   current step   the stage's own StatusDot glyph, in ink (the house law: a status is drawn ONLY by StatusDot)
 *   future steps   hollow, with grey lines
 *   a closed query every line grey; its node sits on the furthest step the query REACHED (from its dated rungs),
 *                  so a pass after a full reads as a pass at the full, never as a pass at the query
 */
import { QueryStatus } from "../types";

export const TRACK_STEPS = ["sent", "partial", "full", "offer"] as const;
export type TrackStepKey = (typeof TRACK_STEPS)[number];

const STAGE: Record<string, number> = {
  [QueryStatus.QUERIED]: 0,
  [QueryStatus.PARTIAL_REQUESTED]: 1,
  [QueryStatus.PARTIAL_SENT]: 1,
  [QueryStatus.FULL_REQUESTED]: 2,
  [QueryStatus.FULL_SENT]: 2,
  [QueryStatus.REVISE_RESUBMIT]: 2,
  [QueryStatus.RESUBMITTED]: 2,
  [QueryStatus.OFFER]: 3,
  [QueryStatus.SIGNED]: 3,
};
const CLOSED = new Set<string>([QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN]);

/** The dated rungs a closed query may carry, read for how far it got. */
export interface TrackDates {
  partialRequestedDate?: unknown;
  partialSentDate?: unknown;
  fullRequestedDate?: unknown;
  fullSentDate?: unknown;
  offerDate?: unknown;
}

/** The furthest step a query's dated rungs show it reached — 0 (sent) when it holds none. */
export function furthestReached(q: TrackDates | null | undefined): number {
  if (!q) return 0;
  if (q.offerDate) return 3;
  if (q.fullRequestedDate || q.fullSentDate) return 2;
  if (q.partialRequestedDate || q.partialSentDate) return 1;
  return 0;
}

export interface QueryTrack {
  /** the step the query is at (0–3) */
  index: number;
  /** true for a closed query: every line grey */
  closed: boolean;
  /** each step's state, in order */
  steps: { key: TrackStepKey; state: "past" | "current" | "future" }[];
  /** the three lines between the steps: navy between past steps, grey otherwise */
  lines: ("on" | "off")[];
}

export function queryTrack(status: QueryStatus | string, dates?: TrackDates | null): QueryTrack {
  const closed = CLOSED.has(String(status));
  const index = closed ? furthestReached(dates) : STAGE[String(status)] ?? 0;
  return {
    index,
    closed,
    steps: TRACK_STEPS.map((key, k) => ({ key, state: k < index ? "past" : k === index ? "current" : "future" })),
    lines: [0, 1, 2].map((k) => (!closed && k < index ? "on" : "off")),
  };
}

/** Days since the query was first sent, whole days, never negative; null without a send date. */
export function daysSinceSent(sentMs: number | null | undefined, nowMs: number): number | null {
  if (sentMs == null || !Number.isFinite(sentMs)) return null;
  return Math.max(0, Math.floor((nowMs - sentMs) / 86_400_000));
}
