/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * qcStages — a query's journey as DATED STAGES (Query Centre v11). One span per stage it has stood
 * at, from the day it entered to the day it left; the last span is the stage it stands at now.
 *
 * Derived, never stored. The rungs come from `orderedStatusBearing` over the global activity feed —
 * the same primitive `dashWeekMix` and `recomputeQuery`'s pure half read — so this page and those
 * cannot disagree about the order of events.
 *
 * ⚠️ AN UNDATED STAGE IS REPORTED AS UNDATED, NEVER GIVEN A DATE. An imported query's provisional
 * rungs are absent from the global feed (the import writes them to the query's own log only), so
 * the feed can end at a stage the query has since left. Where that happens the recompute-written
 * pipeline date for the CURRENT status is the fallback; where that is absent too, `currentStartMs`
 * is null and `dated` is false. The gauge then draws a dashed track and the calendar draws no bar —
 * a bar placed by guesswork is a statement about when something happened, made by nobody.
 */
import { Query, QueryStatus } from "../types";
import { orderedStatusBearing, type DerivableActivity } from "./queryDerivation";

const DAY = 86_400_000;

/** Strings, Firestore Timestamps, Dates and epoch numbers all occur on `Query`'s `any` date fields. */
export function anyToMs(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") { const t = new Date(v).getTime(); return Number.isNaN(t) ? null : t; }
  if (v instanceof Date) { const t = v.getTime(); return Number.isNaN(t) ? null : t; }
  const d = (v as { toDate?: () => Date }).toDate?.();
  if (d instanceof Date) { const t = d.getTime(); return Number.isNaN(t) ? null : t; }
  const s = (v as { seconds?: number }).seconds;
  return typeof s === "number" ? s * 1000 : null;
}

export const CLOSED_STATUSES: readonly QueryStatus[] = [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE];
export const isClosedStatus = (s: QueryStatus): boolean => CLOSED_STATUSES.includes(s);

export interface StageSpan {
  status: QueryStatus;
  startMs: number;
  /** The day it left this stage. `null` on the last span of a LIVE query: it has not left. */
  endMs: number | null;
  current: boolean;
}
export interface StageHistory {
  spans: StageSpan[];
  /** When the query entered the stage it stands at now — null when nothing dates it. */
  currentStartMs: number | null;
  /** False when the current stage has no dated entry. Spans then hold only what IS dated. */
  dated: boolean;
}

/** The recompute-written date for a status, where the query doc carries one. */
function pipelineDate(q: Query, status: QueryStatus): number | null {
  switch (status) {
    case QueryStatus.QUERIED: return anyToMs(q.dateSent);
    case QueryStatus.PARTIAL_REQUESTED: return anyToMs(q.partialRequestedDate);
    case QueryStatus.PARTIAL_SENT: return anyToMs(q.partialSentDate);
    case QueryStatus.FULL_REQUESTED: return anyToMs(q.fullRequestedDate);
    case QueryStatus.FULL_SENT: return anyToMs(q.fullSentDate);
    case QueryStatus.OFFER: return anyToMs(q.offerDate) ?? anyToMs(q.lastStatusChange);
    case QueryStatus.REJECTED: return anyToMs(q.rejectedDate) ?? anyToMs(q.lastStatusChange);
    default: return anyToMs(q.lastStatusChange);
  }
}

export function stageHistory(q: Query, log: readonly DerivableActivity[] | undefined): StageHistory {
  const status = q.status as QueryStatus;
  const sentMs = anyToMs(q.dateSent);
  const rungs = orderedStatusBearing([...(log ?? [])]).filter((r) => !r.provisional && Number.isFinite(r.time) && r.time > 0);

  /* the walk: a rung that names a different stage closes the span before it and opens the next */
  const spans: StageSpan[] = [];
  if (sentMs != null) spans.push({ status: QueryStatus.QUERIED, startMs: sentMs, endMs: null, current: false });
  for (const r of rungs) {
    const last = spans[spans.length - 1];
    if (!last) { spans.push({ status: r.status, startMs: r.time, endMs: null, current: false }); continue; }
    if (r.status === last.status) continue;
    /* a rung dated before the span it closes (a correction, an import) cannot end it earlier than it began */
    const at = Math.max(r.time, last.startMs);
    last.endMs = at;
    spans.push({ status: r.status, startMs: at, endMs: null, current: false });
  }

  let last = spans[spans.length - 1];
  if (!last || last.status !== status) {
    /* the feed stops short of where the query stands — the pipeline date is the only other witness */
    const at = pipelineDate(q, status);
    if (at == null || (last && at < last.startMs)) {
      /* ⚠️ what is dated stays; the last known span is NOT run forward to today, because the query
         is known to have left it and nobody recorded when */
      if (last) spans.pop();
      return { spans: spans.map((s) => ({ ...s })), currentStartMs: null, dated: false };
    }
    if (last) last.endMs = at;
    spans.push({ status, startMs: at, endMs: null, current: false });
    last = spans[spans.length - 1];
  }
  last.current = true;
  if (isClosedStatus(status)) last.endMs = last.startMs; /* a close is a moment; the view gives it a width */
  return { spans, currentStartMs: last.startMs, dated: true };
}

/** Whole days from a to b, never negative. */
export const daysBetween = (a: number, b: number): number => Math.max(0, Math.round((b - a) / DAY));

/**
 * "Day N": days since the query was sent; for a closed query, days until it closed. Null — and the
 * label omitted — when either end is undated. Never zero by default: a closed query with no close
 * date would otherwise read "Day 0", a confident figure about an unrecorded event.
 */
export function dayN(q: Query, history: StageHistory, nowMs: number): number | null {
  const sentMs = anyToMs(q.dateSent);
  if (sentMs == null) return null;
  if (!isClosedStatus(q.status as QueryStatus)) return daysBetween(sentMs, nowMs);
  return history.dated && history.currentStartMs != null ? daysBetween(sentMs, history.currentStartMs) : null;
}
