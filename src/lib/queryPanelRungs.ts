/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * queryPanelRungs — the panel's tracking rail, derived from the activity log. Pure.
 *
 * ⚠️ IT READS THE SAME `activity` SUBCOLLECTION THE RECORD VIEW READS, in the same order, so the
 * two surfaces cannot disagree about what happened to a query. That parity is the thing the panel
 * has to earn before the record view can be deleted, and it is asserted rather than assumed.
 *
 * ⚠️ THE WAITING RUNG IS DERIVED AND HAS NO ID. It records nothing — it is a projection of "the
 * last send, and the date somebody expects a reply by" — so it carries no ⋯ menu and cannot be
 * corrected or deleted. A rung you can delete must correspond to a document.
 */
import { QueryStatus } from "../types";

/** One row of the per-query `activity` subcollection, as the page already holds it. */
export interface RawRung {
  id: string;
  type?: string;
  resultingStatus?: string;
  createdAt?: string | { seconds?: number; toDate?: () => Date };
  note?: string;
}

export interface RungFact {
  id: string;
  status: QueryStatus;
  event: string;
  detail?: string;
  ms: number | null;
}

const asMs = (v: RawRung["createdAt"]): number | null => {
  if (!v) return null;
  if (typeof v === "string") { const t = new Date(v).getTime(); return Number.isNaN(t) ? null : t; }
  if (typeof v === "object") {
    if (typeof v.toDate === "function") return v.toDate().getTime();
    if (typeof v.seconds === "number") return v.seconds * 1000;
  }
  return null;
};

/**
 * ⚠️ THE EVENT'S NAME IS ITS OWN `type`, NOT ITS STATUS. `logNudge`, `holdingReply` and
 * `offerDecision` all write rows whose `type` is free text and whose `resultingStatus` is absent —
 * that is the documented contract (`firestore.rules`: "the enum belongs on `resultingStatus`,
 * which those shapes correctly omit"). Reading the status for a label would blank every one of
 * them, which is exactly what the rules comment warns happens if you constrain `type`.
 */
export function rungFacts(rows: readonly RawRung[]): RungFact[] {
  return rows
    .map((r) => {
      const status = (r.resultingStatus as QueryStatus | undefined) ?? null;
      const event = (r.type ?? "").trim() || status || "Recorded";
      return {
        id: r.id,
        /* the node's dot needs A status; an unrecognised row shows the quiet one rather than none */
        status: (status ?? QueryStatus.NO_RESPONSE) as QueryStatus,
        event,
        ms: asMs(r.createdAt),
      };
    })
    /* ⚠️ OLDEST FIRST, matching the record view's `orderBy("createdAt", "asc")`. A rail that ran
       the other way would tell the story backwards while agreeing on every row. */
    .sort((a, b) => (a.ms ?? 0) - (b.ms ?? 0));
}

/**
 * How far through the wait we are, as a percentage.
 *
 * ⚠️ CLAMPED AT BOTH ENDS AND NEVER `NaN`. A query sent today with an expected date of today gives
 * a zero-length window; an unclamped division puts `Infinity` into a `width` and the bar fills the
 * panel. `null` where there is nothing to measure — the caller draws no bar rather than a full one.
 */
export function waitProgress(sentMs: number | null, expectedMs: number | null, nowMs: number): { pct: number; past: boolean } | null {
  if (sentMs == null || expectedMs == null) return null;
  const span = expectedMs - sentMs;
  if (span <= 0) return { pct: 100, past: nowMs > expectedMs };
  const pct = Math.max(0, Math.min(100, Math.round((100 * (nowMs - sentMs)) / span)));
  return { pct, past: nowMs > expectedMs };
}
