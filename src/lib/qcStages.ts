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
 * ⚠️ AN UNDATED STAGE IS REPORTED AS UNDATED, NEVER GIVEN A DATE. Where neither the query document nor
 * the feed dates the stage a query stands at, `currentStartMs` is null and `dated` is false. The
 * gauge then draws a dashed track and the calendar draws no bar — a bar placed by guesswork is a
 * statement about when something happened, made by nobody.
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

/**
 * The date the QUERY DOCUMENT gives for a stage — written by `recomputeQuery` from the query's own
 * (authoritative) log, and null for a provisional rung. Queried is the send itself.
 */
function docDate(q: Query, status: QueryStatus): number | null {
  switch (status) {
    case QueryStatus.QUERIED: return anyToMs(q.dateSent);
    case QueryStatus.PARTIAL_REQUESTED: return anyToMs(q.partialRequestedDate);
    case QueryStatus.PARTIAL_SENT: return anyToMs(q.partialSentDate);
    case QueryStatus.FULL_REQUESTED: return anyToMs(q.fullRequestedDate);
    case QueryStatus.FULL_SENT: return anyToMs(q.fullSentDate);
    case QueryStatus.OFFER: return anyToMs(q.offerDate);
    case QueryStatus.REJECTED: return anyToMs(q.rejectedDate);
    default: return null;
  }
}
const DOC_DATED: readonly QueryStatus[] = [
  QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT,
];

/**
 * ⚠️ THE QUERY DOCUMENT IS THE AUTHORITY; THE FEED IS A WITNESS THAT CAN BE WRONG.
 *
 * The first cut walked the global feed's rungs and trusted where they ended. Measured on the harness
 * account: the feed held `Partial Sent` rungs for a query whose document says `Partial Requested` —
 * residue of sends that were recorded and then undone (historical writers minted different ids for
 * the two stores, so an undo could miss the projection) — and a Queried row sent in March read
 * "0 days waiting". The document is what `recomputeQuery` derives from the query's OWN log; the feed
 * is a projection of it. So:
 *
 *   - where the query STANDS is `q.status`, always;
 *   - WHEN IT GOT THERE is the document's own date for that stage, or `lastStatusChange` where that
 *     is later (a resubmission re-enters Full sent; the pipeline date is the FIRST time). Queried is
 *     the send. Only where the document dates nothing does the feed answer — with its latest rung
 *     OF THAT STATUS — and if that is absent too the stage is UNDATED;
 *   - the PAST is the document's dated stages, plus feed rungs for stages the document does not date
 *     (R&R, an offer, a close), and ONLY those that fall before the current stage began. A rung dated
 *     after it that names another stage is residue or a disagreement, and the document wins.
 */
export function stageHistory(q: Query, log: readonly DerivableActivity[] | undefined): StageHistory {
  const status = q.status as QueryStatus;
  const rungs = orderedStatusBearing([...(log ?? [])]).filter((r) => !r.provisional && Number.isFinite(r.time) && r.time > 0);

  /* when it entered the stage it stands at */
  let start: number | null;
  if (status === QueryStatus.QUERIED) start = anyToMs(q.dateSent);
  else {
    const own = docDate(q, status), last = anyToMs(q.lastStatusChange);
    start = own != null && last != null ? Math.max(own, last) : own ?? last;
    if (start == null) { const mine = rungs.filter((r) => r.status === status); start = mine.length ? mine[mine.length - 1].time : null; }
  }
  if (start == null) return { spans: [], currentStartMs: null, dated: false };
  /* a stage cannot begin before the query was sent; a rung that says so is a clock or an import fault */
  const sentMs = anyToMs(q.dateSent);
  if (sentMs != null && start < sentMs) start = sentMs;

  /* what came before it */
  const events: { status: QueryStatus; time: number }[] = [];
  for (const s of DOC_DATED) { const t = docDate(q, s); if (t != null) events.push({ status: s, time: t }); }
  for (const r of rungs) if (docDate(q, r.status) == null) events.push({ status: r.status, time: r.time });
  /* nothing precedes the send: an earlier rung is clamped to it, and Queried sorts first on a tie */
  if (sentMs != null) for (const e of events) if (e.time < sentMs) e.time = sentMs;
  const rank = (st: QueryStatus) => (st === QueryStatus.QUERIED ? 0 : 1);
  const before = events.filter((e) => (e.time < start! || (e.time === start && e.status !== status)) && !isClosedStatus(e.status)).sort((a, b) => a.time - b.time || rank(a.status) - rank(b.status));

  const spans: StageSpan[] = [];
  for (const e of before) {
    const last = spans[spans.length - 1];
    if (last && last.status === e.status) continue;
    if (last) last.endMs = e.time;
    spans.push({ status: e.status, startMs: e.time, endMs: null, current: false });
  }
  const last = spans[spans.length - 1];
  if (last && last.status === status) {
    /* the feed and the document date the same entry differently — one stage, the earlier start */
    last.current = true;
    if (isClosedStatus(status)) last.endMs = last.startMs;
    return { spans, currentStartMs: last.startMs, dated: true };
  }
  if (last) last.endMs = start;
  spans.push({ status, startMs: start, endMs: isClosedStatus(status) ? start : null, current: true });
  return { spans, currentStartMs: start, dated: true };
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
